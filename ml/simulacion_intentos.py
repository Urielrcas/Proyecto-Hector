# SIMULADOR DE INTENTOS DE PRÁCTICA (lo usan las prácticas 16, 26 y 27)
#
# La app guarda cada intento de practicar una letra (colección «intentos» de MongoDB):
#   {usuario_id, lengua, letra, acierto, puntaje, segundos, letra_detectada, dedos_fallados, fecha}
#   - puntaje: qué tanto de la seña estuvo bien en su mejor momento (dedos correctos × 20 → 0, 20, …, 100).
#   - acierto: si la logró (la app la da por lograda al sostenerla bien).
#   - letra_detectada: si falló, con qué letra la confundió la IA (solo LSM).
#
# Mientras no haya muchos usuarios reales, este simulador inventa intentos REALISTAS para
# poder hacer las consultas (p16) y entrenar la predicción (p26 y p27):
#   - cada persona tiene su habilidad; cada letra su dificultad (sale de qué tan seguido las
#     reglas fijas de la app reconocen bien esa letra, práctica 21);
#   - con cada intento la persona mejora un poco (aprende), con altibajos;
#   - al fallar, la IA suele confundirla con una letra de su mismo grupo de K-Means (práctica 07).
# Los datos son sintéticos: no son de ninguna persona real.

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).parent.parent
LETRAS_LSM = list("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ")
DEDOS = ["pulgar", "indice", "medio", "anular", "menique"]


def _dificultades():
    """Dificultad de 0 (fácil) a 1 (difícil) por letra, según qué tanto fallan las reglas fijas (p21)."""
    archivo = RAIZ / "frontend" / "src" / "lib" / "ia" / "cnn1d" / "practicas.json"
    dificultad = {letra: 0.4 for letra in LETRAS_LSM}
    if archivo.exists():
        spark = json.loads(archivo.read_text(encoding="utf-8")).get("spark", {})
        for fila in spark.get("porLetra", []):
            for letra in fila["letra"].split("/"):  # «I/J» → I y J
                dificultad[letra] = round(0.15 + 0.6 * (1 - fila["reglas"] / 100), 3)
    # Las letras con movimiento cuestan un poco más (J, K, Ñ, Q, X, Z).
    for letra in "JKÑQXZ":
        dificultad[letra] = min(1.0, dificultad[letra] + 0.1)
    return dificultad


def _parecidas():
    """Letras del mismo grupo de K-Means (práctica 07): con las que se suele confundir."""
    archivo = RAIZ / "frontend" / "src" / "lib" / "ia" / "grupos" / "grupos.json"
    if not archivo.exists():
        return {}
    letras = json.loads(archivo.read_text(encoding="utf-8"))["letras"]
    salida = {}
    for clase, info in letras.items():
        for letra in clase.split("/"):
            salida[letra] = [p for c in info["parecidas"] for p in c.split("/") if p != letra]
    return salida


def simular(usuarios=2000, semilla=26, hoy=None):
    azar = np.random.default_rng(semilla)
    dificultad = _dificultades()
    parecidas = _parecidas()
    hoy = hoy or datetime.now(UTC)
    filas = []
    for u in range(usuarios):
        habilidad = azar.normal(0, 0.8)
        aprende = azar.uniform(0.15, 0.55)  # cuánto mejora con cada intento
        constancia = azar.uniform(0.3, 1.0)  # qué tanto insiste antes de rendirse
        practicadas = azar.choice(LETRAS_LSM, azar.integers(4, 20), replace=False)
        inicio = hoy - timedelta(days=float(azar.uniform(1, 45)))
        momento = inicio
        for letra in practicadas:
            nivel = habilidad - 2.5 * dificultad[letra] + 1.4
            logro = False
            maximo = int(azar.integers(3, 12))
            for n in range(1, maximo + 1):
                # Probabilidad de tener bien cada dedo: sube con el nivel y con la práctica.
                p = 1 / (1 + np.exp(-(nivel + aprende * (n - 1) + azar.normal(0, 0.6))))
                bien = azar.random(5) < p
                puntaje = int(bien.sum()) * 20
                acierto = puntaje == 100 and azar.random() < 0.9  # además debe sostenerla
                segundos = float(np.clip(azar.normal(3 + 9 * (1 - p), 2), 1.5, 30))
                detectada = None
                if not acierto and parecidas.get(letra) and azar.random() < 0.7:
                    detectada = str(azar.choice(parecidas[letra]))
                momento = momento + timedelta(seconds=segundos + float(azar.uniform(2, 20)))
                filas.append({
                    "usuario": f"demo-{u + 1:04d}", "lengua": "LSM", "letra": letra, "intento": n,
                    "acierto": bool(acierto), "puntaje": puntaje, "segundos": round(segundos, 1),
                    "letra_detectada": detectada, "dedos_fallados": [d for d, ok in zip(DEDOS, bien) if not ok],
                    "fecha": momento,
                })
                if acierto:
                    logro = True
                    # Después de lograrla, a veces la repite un par de veces más.
                    if azar.random() < 0.5:
                        continue
                    break
                if not logro and azar.random() > constancia + 0.15 * n / maximo:
                    break  # se rindió por hoy
            # Entre letras pasa algo de tiempo (a veces días).
            momento = momento + timedelta(hours=float(azar.exponential(10)))
            if momento > hoy:
                momento = hoy - timedelta(minutes=float(azar.uniform(1, 600)))
    return pd.DataFrame(filas)


if __name__ == "__main__":
    tabla = simular(50)
    print(tabla.head(12).to_string())
    print(len(tabla), "intentos de", tabla["usuario"].nunique(), "personas")
