# ============================================================
# PRÁCTICA 29 · KNN PARA EL USUARIO: PERSONAS QUE APRENDEN COMO TÚ
# ============================================================
#
# El profe pidió que el KNN sirva al usuario. Antes el KNN comparaba MANOS para reconocer letras;
# aquí compara PERSONAS: cada una es un vector con su nivel (0 a 100) en cada letra que practicó.
# Para un usuario se buscan las k personas más parecidas (solo en las letras que ambos practicaron)
# y con lo que les pasó a ellas se le dice:
#   - qué letras que todavía no practica le van a salir fácil,
#   - cuáles le pueden costar (a sus vecinos les costaron),
#   - en cuáles va por debajo de quienes aprenden como él.
# Las cuentas están en backend/app/perfiles.py (las mismas que usa el servidor).
#
#   1. Población de referencia: 600 personas simuladas (simulacion_intentos.py).
#   2. Validación: con otras 400 personas se esconde una letra que sí practicaron y se predice su
#      nivel con sus vecinos. Se prueba k de 3 a 80 y se compara con una «adivinanza
#      sencilla» (el nivel promedio de esa letra en toda la población). Gana el k con menor error.
#
# Salida: backend/app/datos/knn_usuarios.json, resultados/p29_knn_k.png
# Uso:    python p29_knn_usuarios.py
# ============================================================

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from simulacion_intentos import LETRAS_LSM, simular  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent / "backend"))
from app.perfiles import niveles_por_letra, predecir_niveles, vecinos_mas_parecidos  # noqa: E402

RESULTADOS = AQUI / "resultados"
DESTINO = AQUI.parent / "backend" / "app" / "datos" / "knn_usuarios.json"
POBLACION = 600
PRUEBA = 400
VALORES_K = [3, 5, 10, 20, 40, 60, 80]
COLUMNAS = list(LETRAS_LSM)


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


def matriz_de(intentos):
    """Una fila por persona con su nivel en cada letra (NaN = no la practicó)."""
    filas = []
    for _, g in intentos.sort_values("fecha").groupby("usuario"):
        niveles = niveles_por_letra(g.to_dict("records"))
        filas.append([niveles.get(l, np.nan) for l in COLUMNAS])
    return np.array(filas, dtype=float)


# ------------------------------------------------------------
# 1. POBLACIÓN DE REFERENCIA Y PERSONAS DE PRUEBA
# ------------------------------------------------------------
titulo("1. POBLACIÓN DE REFERENCIA Y PERSONAS DE PRUEBA")
referencia = matriz_de(simular(usuarios=POBLACION, semilla=29))
prueba = matriz_de(simular(usuarios=PRUEBA, semilla=2929))
print(f"Referencia: {len(referencia)} personas · prueba: {len(prueba)} personas · {len(COLUMNAS)} letras")
print(f"En promedio cada persona practicó {np.mean((~np.isnan(referencia)).sum(axis=1)):.1f} letras")

# ------------------------------------------------------------
# 2. VALIDACIÓN: ¿CUÁNTOS VECINOS?
# ------------------------------------------------------------
titulo("2. VALIDACIÓN: ESCONDER UNA LETRA Y PREDECIRLA")
promedio_letra = np.nanmean(referencia, axis=0)
azar = np.random.default_rng(29)
casos = []
for fila in prueba:
    practicadas = np.where(~np.isnan(fila))[0]
    if len(practicadas) < 3:
        continue
    j = int(azar.choice(practicadas))  # la letra que se esconde
    niveles = {COLUMNAS[c]: fila[c] for c in practicadas if c != j}
    casos.append((niveles, j, fila[j]))
print(f"Casos de prueba: {len(casos)}")

errores = {}
for k in VALORES_K:
    e = []
    for niveles, j, real in casos:
        vecinos = vecinos_mas_parecidos(niveles, COLUMNAS, referencia, k)
        pred = predecir_niveles(vecinos, referencia)[j] if vecinos else np.nan
        e.append(abs((promedio_letra[j] if np.isnan(pred) else pred) - real))
    errores[k] = float(np.mean(e))
    print(f"k = {k:>2}: error promedio {errores[k]:.1f} puntos")
error_base = float(np.mean([abs(promedio_letra[j] - real) for _, j, real in casos]))
# Si varios k empatan (diferencia de menos de 0.3 puntos), el más chico: los vecinos se parecen más a ti.
K = min(k for k in VALORES_K if errores[k] <= min(errores.values()) + 0.3)
print(f"Adivinanza sencilla (promedio de la letra): {error_base:.1f} puntos")
print(f"\nGana k = {K}: {errores[K]:.1f} puntos ({(1 - errores[K] / error_base):.0%} menos error que adivinar con el promedio)")

fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(VALORES_K, [errores[k] for k in VALORES_K], marker="o", color="#0f766e", label="KNN")
ax.axhline(error_base, color="#be123c", linestyle="--", label="Promedio de la letra")
ax.set_xlabel("k (vecinos)")
ax.set_ylabel("Error promedio (puntos)")
ax.set_title("¿Cuántas personas parecidas usar?")
ax.legend()
fig.tight_layout()
RESULTADOS.mkdir(exist_ok=True)
fig.savefig(RESULTADOS / "p29_knn_k.png", dpi=130)
plt.close(fig)

# ------------------------------------------------------------
# 3. EXPORTAR
# ------------------------------------------------------------
DESTINO.write_text(json.dumps({
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "lengua": "LSM",
    "origen": "simulada",
    "letras": COLUMNAS,
    "k": K,
    "errores": {str(k): round(v, 2) for k, v in errores.items()},
    "errorBase": round(error_base, 2),
    "poblacion": [[None if np.isnan(v) else round(float(v), 1) for v in fila] for fila in referencia],
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
titulo("3. EXPORTADO")
print(f"backend/app/datos/knn_usuarios.json ({DESTINO.stat().st_size / 1024:.0f} KB)")
print("resultados/p29_knn_k.png")
