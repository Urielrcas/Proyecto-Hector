# PERFILES DE APRENDIZAJE (clusters) Y PERSONAS PARECIDAS A TI (KNN)  ·  prácticas 28 y 29
#
# El profe pidió que el KNN y el PCA sirvan al usuario, y agrupar con clusters. Con los intentos de
# práctica de una persona se calcula:
#
#   1. Sus rasgos de aprendizaje (caracteristicas_usuario): qué tanto acierta, su puntaje, cuántos
#      intentos hace por letra, cuántas letras ha practicado, cuánto mejora y qué tan rápido es.
#   2. Su PERFIL (perfil_de): el cluster de K-Means más cercano. Los clusters se entrenan en Python
#      (ml/p28_perfiles_usuarios.py) y llegan en app/datos/perfiles_usuarios.json, con el PCA para
#      ponerla en el mapa de perfiles («tú estás aquí»).
#   3. Sus VECINOS (vecinos_de, KNN): las k personas de referencia que aprenden más parecido (comparando
#      su nivel en las letras que ambas practicaron). Con lo que les pasó a ellas se le recomienda qué
#      letras le saldrán fácil y cuáles le pueden costar (ml/p29_knn_usuarios.py, app/datos/knn_usuarios.json).
#
# Las mismas funciones las usa Python para entrenar (ml/p28 y ml/p29 importan este archivo), así que las
# cuentas son idénticas en el entrenamiento y en el servidor. Solo usa numpy.

# ▸ Desde Python:
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# ▸ Desde numpy (cálculo con matrices)
import numpy as np

DATOS = Path(__file__).parent / "datos"
ARCHIVO_PERFILES = DATOS / "perfiles_usuarios.json"
ARCHIVO_KNN = DATOS / "knn_usuarios.json"

CARACTERISTICAS = ["tasa", "puntaje", "intentos_por_letra", "letras", "mejora", "segundos"]
# Con menos intentos todavía no se sabe cómo aprende la persona.
MIN_INTENTOS_PERFIL = 8
MIN_LETRAS_VECINOS = 2
# Nivel en una letra: el promedio de los últimos intentos (igual que la gráfica de dominio del tablero).
INTENTOS_NIVEL = 5
# Mínimo de letras en común para comparar a dos personas, y de vecinos con dato para opinar de una letra.
MIN_COMUNES = 2
MIN_VECINOS_LETRA = 3


def _por_letra(intentos: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    salida: dict[str, list[dict[str, Any]]] = {}
    for i in intentos:
        salida.setdefault(i["letra"], []).append(i)
    return salida


def caracteristicas_usuario(intentos: list[dict[str, Any]]) -> list[float] | None:
    """Rasgos de aprendizaje (en el orden de CARACTERISTICAS). `intentos` del más viejo al más nuevo."""
    if len(intentos) < MIN_INTENTOS_PERFIL:
        return None
    por_letra = _por_letra(intentos)
    n = len(intentos)
    mejoras = [ls[-1]["puntaje"] - ls[0]["puntaje"] for ls in por_letra.values() if len(ls) >= 2]
    return [
        sum(1 for i in intentos if i["acierto"]) / n,
        sum(i["puntaje"] for i in intentos) / n,
        n / len(por_letra),
        float(len(por_letra)),
        sum(mejoras) / len(mejoras) if mejoras else 0.0,
        sum(float(i.get("segundos", 0)) for i in intentos) / n,
    ]


def niveles_por_letra(intentos: list[dict[str, Any]]) -> dict[str, float]:
    """Nivel (0 a 100) en cada letra practicada: promedio de sus últimos intentos."""
    return {letra: sum(i["puntaje"] for i in ls[-INTENTOS_NIVEL:]) / len(ls[-INTENTOS_NIVEL:]) for letra, ls in _por_letra(intentos).items()}


# ── Perfil (cluster) ─────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _modelo_perfiles() -> dict[str, Any] | None:
    if not ARCHIVO_PERFILES.exists():
        return None
    return json.loads(ARCHIVO_PERFILES.read_text(encoding="utf-8"))


def asignar_perfil(rasgos: list[float], modelo: dict[str, Any]) -> tuple[int, list[float]]:
    """El cluster más cercano y las coordenadas en el mapa PCA de perfiles."""
    z = (np.array(rasgos) - np.array(modelo["media"])) / np.array(modelo["escala"])
    distancias = np.linalg.norm(np.array(modelo["centros"]) - z, axis=1)
    pca = modelo["pca"]
    xy = (z - np.array(pca["media"])) @ np.array(pca["componentes"]).T
    return int(np.argmin(distancias)), [round(float(v), 3) for v in xy]


def perfil_de(intentos: list[dict[str, Any]]) -> dict[str, Any] | None:
    modelo = _modelo_perfiles()
    rasgos = caracteristicas_usuario(intentos)
    if modelo is None or rasgos is None:
        return None
    k, (x, y) = asignar_perfil(rasgos, modelo)
    p = modelo["perfiles"][k]
    return {
        "id": k,
        "nombre": p["nombre"],
        "descripcion": p["descripcion"],
        "consejo": p["consejo"],
        "x": x,
        "y": y,
        "rasgos": {c: round(v, 3) for c, v in zip(CARACTERISTICAS, rasgos)},
    }


# ── Vecinos (KNN) ────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _modelo_knn() -> dict[str, Any] | None:
    if not ARCHIVO_KNN.exists():
        return None
    datos = json.loads(ARCHIVO_KNN.read_text(encoding="utf-8"))
    # La población viene como listas con null en las letras no practicadas: se pasa a matriz con NaN.
    datos["matriz"] = np.array([[np.nan if v is None else v for v in fila] for fila in datos["poblacion"]], dtype=float)
    return datos


def vecinos_mas_parecidos(niveles: dict[str, float], letras: list[str], matriz: np.ndarray, k: int) -> list[tuple[int, float]]:
    """Las k personas más parecidas: (fila, distancia), comparando solo las letras que ambas practicaron."""
    yo = np.array([niveles.get(l, np.nan) for l in letras], dtype=float)
    comunes = ~np.isnan(matriz) & ~np.isnan(yo)
    cuantas = comunes.sum(axis=1)
    dif = np.where(comunes, matriz - yo, 0.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        dist = np.sqrt((dif**2).sum(axis=1) / cuantas)
    dist[cuantas < MIN_COMUNES] = np.inf
    orden = [int(i) for i in np.argsort(dist) if np.isfinite(dist[i])][:k]
    return [(i, float(dist[i])) for i in orden]


def predecir_niveles(vecinos: list[tuple[int, float]], matriz: np.ndarray) -> np.ndarray:
    """Para cada letra, el nivel promedio de los vecinos que la practicaron (NaN si son muy pocos)."""
    filas = matriz[[i for i, _ in vecinos]]
    con_dato = (~np.isnan(filas)).sum(axis=0)
    suma = np.nansum(filas, axis=0)
    return np.where(con_dato >= MIN_VECINOS_LETRA, suma / np.maximum(con_dato, 1), np.nan)


def vecinos_de(intentos: list[dict[str, Any]], lengua: str) -> dict[str, Any] | None:
    modelo = _modelo_knn()
    if modelo is None or lengua != modelo["lengua"]:
        return None
    niveles = niveles_por_letra(intentos)
    if len(niveles) < MIN_LETRAS_VECINOS:
        return None
    letras, matriz, k = modelo["letras"], modelo["matriz"], modelo["k"]
    vecinos = vecinos_mas_parecidos(niveles, letras, matriz, k)
    if len(vecinos) < MIN_VECINOS_LETRA:
        return None
    prediccion = predecir_niveles(vecinos, matriz)
    filas = matriz[[i for i, _ in vecinos]]

    por_letra = {}
    for j, letra in enumerate(letras):
        if np.isnan(prediccion[j]):
            continue
        con_dato = filas[~np.isnan(filas[:, j]), j]
        por_letra[letra] = {"nivel_vecinos": round(float(prediccion[j]), 1), "vecinos_con_dato": int(len(con_dato)),
                            "les_costo": int((con_dato < 60).sum())}

    no_dominadas = [l for l in letras if niveles.get(l, 0) < 80 and l in por_letra]
    faciles = sorted((l for l in no_dominadas if l not in niveles and por_letra[l]["nivel_vecinos"] >= 75),
                     key=lambda l: -por_letra[l]["nivel_vecinos"])[:3]
    dificiles = sorted((l for l in no_dominadas if por_letra[l]["nivel_vecinos"] < 60), key=lambda l: por_letra[l]["nivel_vecinos"])[:3]
    # Letras que ya practicas y en las que vas por debajo de quienes aprenden como tú.
    abajo = sorted((l for l in niveles if l in por_letra and por_letra[l]["nivel_vecinos"] - niveles[l] >= 15),
                   key=lambda l: niveles[l] - por_letra[l]["nivel_vecinos"])[:3]
    distancia_media = sum(d for _, d in vecinos) / len(vecinos)
    return {
        "k": len(vecinos),
        "poblacion": int(len(matriz)),
        "origen": modelo["origen"],
        "parecido": round(max(0.0, 100 - distancia_media), 1),
        "faciles": [{"letra": l, "nivel": por_letra[l]["nivel_vecinos"]} for l in faciles],
        "dificiles": [{"letra": l, "nivel": por_letra[l]["nivel_vecinos"]} for l in dificiles],
        "por_debajo": [{"letra": l, "tuyo": round(niveles[l], 1), "nivel": por_letra[l]["nivel_vecinos"]} for l in abajo],
        "por_letra": por_letra,
    }
