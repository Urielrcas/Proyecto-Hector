# ============================================================
# PRÁCTICA 28 · PERFILES DE APRENDIZAJE CON CLUSTERS (K-Means + PCA)
# ============================================================
#
# El profe pidió usar clusters y que el PCA sirva al usuario. Aquí no se agrupan manos sino
# PERSONAS, según cómo aprenden. Cada persona es una fila con 6 rasgos (los calcula
# backend/app/perfiles.py, el mismo código que usa el servidor):
#   tasa de aciertos · puntaje promedio · intentos por letra · letras practicadas ·
#   cuánto mejora de su primer a su último intento · segundos por intento
#
#   1. Personas: 2,000 simuladas (simulacion_intentos.py) mientras no haya suficientes reales.
#   2. StandardScaler y K-Means: K de 3 a 5, se elige por silueta (pocos grupos, como pidió el profe).
#   3. Nombre de cada perfil según su centro: el que más acierta «Avanza rápido», el que menos
#      «Necesita apoyo», etc., con una descripción y un consejo para la persona.
#   4. PCA de 2 componentes para dibujar a las personas en un mapa de perfiles; la app pone ahí
#      a cada usuario («tú estás aquí»).
#
# Salida: backend/app/datos/perfiles_usuarios.json (el servidor asigna el perfil),
#         frontend/src/lib/ia/perfiles/perfiles.json (el mapa para la app),
#         resultados/p28_*.png
# Uso:    python p28_perfiles_usuarios.py
# ============================================================

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.cluster import KMeans  # noqa: E402
from sklearn.decomposition import PCA  # noqa: E402
from sklearn.metrics import silhouette_score  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from simulacion_intentos import simular  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent / "backend"))
from app.perfiles import CARACTERISTICAS, MIN_INTENTOS_PERFIL, caracteristicas_usuario  # noqa: E402

RESULTADOS = AQUI / "resultados"
DESTINO_BACKEND = AQUI.parent / "backend" / "app" / "datos" / "perfiles_usuarios.json"
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "perfiles" / "perfiles.json"
PERSONAS = 2000
SEMILLA = 28
RANGO_K = range(3, 6)
PUNTOS_APP = 400
COLORES = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8"]
NOMBRES_RASGO = {"tasa": "aciertos", "puntaje": "puntaje", "intentos_por_letra": "intentos por letra", "letras": "letras practicadas",
                 "mejora": "mejora", "segundos": "segundos por intento"}


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. PERSONAS Y SUS RASGOS
# ------------------------------------------------------------
titulo(f"1. RASGOS DE APRENDIZAJE DE {PERSONAS:,} PERSONAS SIMULADAS")
intentos = simular(usuarios=PERSONAS, semilla=SEMILLA).sort_values("fecha")
filas = []
for usuario, grupo in intentos.groupby("usuario"):
    rasgos = caracteristicas_usuario(grupo.to_dict("records"))
    if rasgos is not None:
        filas.append([usuario, *rasgos])
tabla = pd.DataFrame(filas, columns=["usuario", *CARACTERISTICAS])
print(f"Personas con al menos {MIN_INTENTOS_PERFIL} intentos: {len(tabla):,}")
print(tabla[CARACTERISTICAS].describe().round(2).to_string())

# ------------------------------------------------------------
# 2. K-MEANS: ¿CUÁNTOS PERFILES?
# ------------------------------------------------------------
titulo("2. K-MEANS: ¿CUÁNTOS PERFILES? (silueta)")
escala = StandardScaler().fit(tabla[CARACTERISTICAS])
Z = escala.transform(tabla[CARACTERISTICAS])
siluetas = {}
for k in RANGO_K:
    m = KMeans(n_clusters=k, n_init=10, random_state=SEMILLA).fit(Z)
    siluetas[k] = float(silhouette_score(Z, m.labels_, sample_size=1500, random_state=0))
    print(f"K = {k}: silueta {siluetas[k]:.3f}")
K = max(siluetas, key=siluetas.get)
modelo = KMeans(n_clusters=K, n_init=20, random_state=SEMILLA).fit(Z)
tabla["perfil"] = modelo.labels_
print(f"\nK elegido: {K}")

# ------------------------------------------------------------
# 3. NOMBRE DE CADA PERFIL
# ------------------------------------------------------------
titulo("3. ¿CÓMO ES CADA PERFIL?")
centros = pd.DataFrame(escala.inverse_transform(modelo.cluster_centers_), columns=CARACTERISTICAS)
orden_tasa = centros["tasa"].sort_values().index.tolist()  # del que menos acierta al que más
nombres = {}
nombres[orden_tasa[-1]] = ("Avanza rápido", "Aciertas casi siempre y con pocos intentos por letra.",
                           "Ve por letras nuevas y prueba los juegos contra reloj: ya estás listo para retos.")
nombres[orden_tasa[0]] = ("Necesita apoyo", "Las letras te están costando: varios intentos sin lograrlas todavía.",
                          "Practica pocas letras a la vez, mira el dibujo con calma y pídele ayuda a Mani: te dice qué dedo corregir.")
medios = orden_tasa[1:-1]
if medios:
    # Entre los del medio: el que más mejora «Va mejorando»; el que más letras prueba «Explorador»; si no, «Constante».
    restantes = list(medios)
    mejora = max(restantes, key=lambda c: centros.loc[c, "mejora"])
    nombres[mejora] = ("Va mejorando", "Empiezas con trabajo pero subes mucho de un intento a otro.",
                       "Sigue así: repite cada letra unas veces más antes de pasar a la siguiente.")
    restantes.remove(mejora)
    if restantes:
        explorador = max(restantes, key=lambda c: centros.loc[c, "letras"])
        nombres[explorador] = ("Explorador", "Pruebas muchas letras, pero con pocos intentos en cada una.",
                               "Antes de cambiar de letra, quédate en ella hasta lograrla un par de veces.")
        restantes.remove(explorador)
    for c in restantes:
        nombres[c] = ("Constante", "Practicas a un ritmo parejo y vas logrando las letras.",
                      "Practica un poco cada día: la constancia es lo que más ayuda.")
for c in range(K):
    n = (tabla["perfil"] == c).sum()
    print(f"Perfil {c + 1} · {nombres[c][0]:<15} ({n:>4} personas): " +
          ", ".join(f"{NOMBRES_RASGO[r]} {centros.loc[c, r]:.2f}" for r in CARACTERISTICAS))

# ------------------------------------------------------------
# 4. PCA: EL MAPA DE PERFILES
# ------------------------------------------------------------
titulo("4. PCA: EL MAPA DE PERFILES")
pca = PCA(n_components=2, random_state=SEMILLA).fit(Z)
coords = pca.transform(Z)
print(f"Las 2 componentes guardan el {pca.explained_variance_ratio_.sum():.0%} de la información")
for i, comp in enumerate(pca.components_):
    principales = sorted(zip(CARACTERISTICAS, comp), key=lambda t: -abs(t[1]))[:2]
    print(f"CP{i + 1}: " + ", ".join(f"{NOMBRES_RASGO[r]} ({v:+.2f})" for r, v in principales))

fig, ax = plt.subplots(figsize=(8, 6))
for c in range(K):
    sel = tabla["perfil"] == c
    ax.scatter(coords[sel, 0], coords[sel, 1], s=8, alpha=0.45, color=COLORES[c], label=f"{nombres[c][0]} ({sel.sum()})")
centros_pca = pca.transform(modelo.cluster_centers_)
ax.scatter(centros_pca[:, 0], centros_pca[:, 1], s=220, c=COLORES[:K], edgecolors="white", linewidths=2, marker="o")
ax.set_xlabel("CP1")
ax.set_ylabel("CP2")
ax.set_title("Perfiles de aprendizaje (K-Means) en el mapa PCA")
ax.legend()
fig.tight_layout()
RESULTADOS.mkdir(exist_ok=True)
fig.savefig(RESULTADOS / "p28_perfiles_pca.png", dpi=130)
plt.close(fig)

# ------------------------------------------------------------
# 5. EXPORTAR
# ------------------------------------------------------------
r4 = lambda v: round(float(v), 4)  # noqa: E731
azar = np.random.default_rng(SEMILLA)
muestra = np.sort(azar.choice(len(tabla), size=min(PUNTOS_APP, len(tabla)), replace=False))
modelo_json = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "origen": f"{len(tabla)} personas simuladas (ml/p28_perfiles_usuarios.py)",
    "caracteristicas": CARACTERISTICAS,
    "k": K,
    "siluetas": {str(k): r4(v) for k, v in siluetas.items()},
    "media": [r4(v) for v in escala.mean_],
    "escala": [r4(v) for v in escala.scale_],
    "centros": [[r4(v) for v in fila] for fila in modelo.cluster_centers_],
    "perfiles": [{"id": c, "nombre": nombres[c][0], "descripcion": nombres[c][1], "consejo": nombres[c][2], "color": COLORES[c],
                  "personas": int((tabla["perfil"] == c).sum()), "centro": {r: r4(centros.loc[c, r]) for r in CARACTERISTICAS}}
                 for c in range(K)],
    "pca": {"media": [r4(v) for v in pca.mean_], "componentes": [[r4(v) for v in fila] for fila in pca.components_],
            "varianza": [r4(v) for v in pca.explained_variance_ratio_]},
}
DESTINO_BACKEND.write_text(json.dumps(modelo_json, ensure_ascii=False, indent=1), encoding="utf-8")
DESTINO_APP.parent.mkdir(parents=True, exist_ok=True)
DESTINO_APP.write_text(json.dumps({
    **{k: v for k, v in modelo_json.items() if k not in ("media", "escala", "centros")},
    "muestra": {"x": [round(float(v), 2) for v in coords[muestra, 0]], "y": [round(float(v), 2) for v in coords[muestra, 1]],
                "perfil": [int(v) for v in tabla["perfil"].iloc[muestra]]},
    "centrosPca": [{"perfil": c, "x": round(float(x), 2), "y": round(float(y), 2)} for c, (x, y) in enumerate(centros_pca)],
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
titulo("5. EXPORTADO")
print("backend/app/datos/perfiles_usuarios.json")
print("frontend/src/lib/ia/perfiles/perfiles.json")
print("resultados/p28_perfiles_pca.png")
