# ============================================================
# PRACTICA 08b (continuación de la 07 y la 08)
# FAMILIAS DE SEÑAS: AGRUPAR LOS GRUPOS Y VER QUIÉN CONFUNDE QUÉ
# ============================================================
#
# En la exposición nos dijeron que los grupos de K-Means no estaban bien explicados:
# por ejemplo, la X quedó SOLA en su grupo y no se veía con qué letras se parece.
# Esta práctica responde eso:
#
#   1. Centro de cada letra: el promedio de las 57 medidas (estandarizadas) de sus manos.
#   2. Agrupamiento JERÁRQUICO (método de Ward) de las 25 letras:
#        empieza con cada letra sola y va juntando, paso a paso, las dos más parecidas,
#        hasta que todas quedan juntas. Se dibuja como un árbol (dendrograma).
#        Al «cortar» el árbol a cierta altura salen las FAMILIAS (de 2 a 9).
#        Así la X ya no queda sola: se une con las letras de puño cerrado (E, Q, S, A...).
#   3. Las letras más parecidas a cada letra (distancia entre sus centros).
#   4. Cómo se reparten las manos de cada letra entre los grupos de K-Means
#      (la X, la C, la O, la P y la Q tienen manos en varios grupos).
#   5. Las confusiones por PERSONAS no salen de aquí: las reales las calcula el backend con los
#      intentos guardados en MongoDB (GET /api/intentos/confusiones) y las de demostración
#      (100 personas simuladas) las arma demo_100_personas.py usando las letras parecidas del paso 3.
#   5. Gráficas: dendrograma y mapa PCA detallado (cada letra con su nombre y su familia).
#
# Entrada: datos/manos_limpias.csv, datos/manos_grupos.csv (p07), resultados/p09_coordenadas_pca.csv (p09)
# Salida:  frontend/src/lib/ia/grupos/grupos.json (sección «familias»),
#          resultados/p08b_dendrograma_letras.png, resultados/p08b_mapa_familias.png,
#          resultados/p08b_letras_parecidas.csv
#
# Uso:  python p08b_familias_senas.py      (después de p07, p08 y p09)
# ============================================================

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage  # noqa: E402
from scipy.spatial.distance import pdist, squareform  # noqa: E402
from sklearn.metrics import silhouette_score  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402


sys.stdout.reconfigure(encoding="utf-8")  # para que la consola de Windows muestre acentos

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
ARCHIVO_GRUPOS = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "grupos" / "grupos.json"
FAMILIAS_DEFECTO = 4  # las que se muestran al abrir la app (se pueden cambiar de 2 a 9)
NIVELES = range(2, 10)
PARECIDAS_POR_LETRA = 4
COLORES = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#a21caf", "#0e7490", "#57534e"]


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. DATOS Y CENTRO DE CADA LETRA
# ------------------------------------------------------------
titulo("1. DATOS Y CENTRO DE CADA LETRA")
if not ARCHIVO_GRUPOS.exists():
    sys.exit("Primero corre p07_kmeans_manos.py y p08_analisis_clusters.py (crean grupos.json).")
P07 = json.loads(ARCHIVO_GRUPOS.read_text(encoding="utf-8"))

df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
Z = StandardScaler().fit_transform(df[COLUMNAS_X])
LETRAS = sorted(df["letra"].unique())
centros = np.array([Z[(df["letra"] == l).to_numpy()].mean(axis=0) for l in LETRAS])
distancias = squareform(pdist(centros))
print(f"Manos: {len(df):,} | letras: {len(LETRAS)} | medidas: {len(COLUMNAS_X)}")

# ------------------------------------------------------------
# 2. AGRUPAMIENTO JERÁRQUICO (WARD)
# ------------------------------------------------------------
titulo("2. AGRUPAMIENTO JERÁRQUICO DE LAS LETRAS (WARD)")
uniones = linkage(centros, method="ward")
niveles = {}
for n in NIVELES:
    etiquetas = fcluster(uniones, n, criterion="maxclust")
    # Numerar las familias por orden de aparición (la primera letra en orden alfabético va en la 0).
    orden = {}
    niveles[n] = [orden.setdefault(int(e), len(orden)) for e in etiquetas]
    por_mano = df["letra"].map(dict(zip(LETRAS, niveles[n])))
    s = silhouette_score(Z, por_mano, sample_size=2000, random_state=0)
    familias = {}
    for letra, f in zip(LETRAS, niveles[n]):
        familias.setdefault(f, []).append(letra)
    print(f"{n} familias (silueta {s:.3f}): " + " | ".join(" ".join(v) for v in familias.values()))

print("\nCómo se van juntando (las primeras 8 uniones):")
nombres_nodo = list(LETRAS)
for a, b, d, tam in uniones[:8]:
    nombres_nodo.append(f"({nombres_nodo[int(a)]}+{nombres_nodo[int(b)]})")
    print(f"  distancia {d:5.2f}: {nombres_nodo[int(a)]} + {nombres_nodo[int(b)]}")
for a, b, d, tam in uniones[8:]:
    nombres_nodo.append(f"({nombres_nodo[int(a)]}+{nombres_nodo[int(b)]})")

# ------------------------------------------------------------
# 3. LAS LETRAS MÁS PARECIDAS A CADA LETRA
# ------------------------------------------------------------
titulo("3. LAS LETRAS MÁS PARECIDAS")
dmax = distancias.max()
parecidas = {}
filas_csv = []
for i, letra in enumerate(LETRAS):
    orden = [j for j in np.argsort(distancias[i]) if j != i][:PARECIDAS_POR_LETRA]
    parecidas[letra] = [{"letra": LETRAS[j], "distancia": round(float(distancias[i, j]), 2),
                         "parecido": round(100 * (1 - distancias[i, j] / dmax))} for j in orden]
    filas_csv += [{"letra": letra, "posicion": k + 1, **p} for k, p in enumerate(parecidas[letra])]
pd.DataFrame(filas_csv).to_csv(RESULTADOS / "p08b_letras_parecidas.csv", index=False)
for letra in ("X", "Y", "C", "M"):
    print(f"{letra}: " + ", ".join(f"{p['letra']} ({p['parecido']} %)" for p in parecidas[letra]))

# ------------------------------------------------------------
# 4. REPARTO DE CADA LETRA ENTRE LOS GRUPOS DE K-MEANS
# ------------------------------------------------------------
titulo("4. ¿EN QUÉ GRUPOS DE K-MEANS QUEDARON LAS MANOS DE CADA LETRA?")
mg = pd.read_csv(AQUI / "datos" / "manos_grupos.csv")
tabla = pd.crosstab(mg["letra"], mg["grupo"], normalize="index")
reparto = {}
for letra in LETRAS:
    fila = tabla.loc[letra].sort_values(ascending=False)
    reparto[letra] = [{"grupo": int(g), "porcentaje": round(float(p), 3)} for g, p in fila.items() if p >= 0.05]
for letra in P07.get("divididas", []):
    print(f"{letra}: " + ", ".join(f"grupo {r['grupo'] + 1} {r['porcentaje']:.0%}" for r in reparto[letra]))

# ------------------------------------------------------------
# 5. GRÁFICAS
# ------------------------------------------------------------
titulo("5. GRÁFICAS")
corte = (uniones[-FAMILIAS_DEFECTO, 2] + uniones[-FAMILIAS_DEFECTO + 1, 2]) / 2
fig, ax = plt.subplots(figsize=(11, 5))
dendrogram(uniones, labels=LETRAS, color_threshold=corte, above_threshold_color="#a8a29e", ax=ax)
ax.axhline(corte, color="#be123c", linestyle="--", linewidth=1)
ax.text(ax.get_xlim()[1], corte, f"  corte: {FAMILIAS_DEFECTO} familias", color="#be123c", va="bottom", ha="right")
ax.set_title("Familias de señas: cómo se van juntando las letras (Ward)")
ax.set_ylabel("Distancia (más alto = menos parecidas)")
fig.tight_layout()
fig.savefig(RESULTADOS / "p08b_dendrograma_letras.png", dpi=130)
plt.close(fig)

coords = pd.read_csv(RESULTADOS / "p09_coordenadas_pca.csv")
familia_de = dict(zip(LETRAS, niveles[FAMILIAS_DEFECTO]))
fig, ax = plt.subplots(figsize=(10, 7))
for f in range(FAMILIAS_DEFECTO):
    sel = coords["letra"].map(familia_de) == f
    ax.scatter(coords.loc[sel, "CP1"], coords.loc[sel, "CP2"], s=6, alpha=0.35, color=COLORES[f],
               label=f"Familia {f + 1}: " + " ".join(l for l in LETRAS if familia_de[l] == f))
for letra, g in coords.groupby("letra"):
    ax.text(g["CP1"].mean(), g["CP2"].mean(), letra, ha="center", va="center", fontsize=11, fontweight="bold",
            color="white", bbox={"boxstyle": "circle,pad=0.3", "fc": COLORES[familia_de[letra]], "ec": "white"})
ax.set_xlabel("CP1")
ax.set_ylabel("CP2")
ax.set_title(f"Mapa PCA: cada punto es una mano; cada círculo, el centro de una letra ({FAMILIAS_DEFECTO} familias)")
ax.legend(fontsize=8, loc="best")
fig.tight_layout()
fig.savefig(RESULTADOS / "p08b_mapa_familias.png", dpi=130)
plt.close(fig)
print("resultados/p08b_dendrograma_letras.png")
print("resultados/p08b_mapa_familias.png")

# ------------------------------------------------------------
# 6. EXPORTAR PARA LA APP
# ------------------------------------------------------------
P07["familias"] = {
    "metodo": "Ward",
    "defecto": FAMILIAS_DEFECTO,
    "letras": LETRAS,
    # Cada unión del árbol: los dos nodos (0-24 = letras; 25 en adelante = uniones anteriores) y su distancia.
    "uniones": [{"a": int(a), "b": int(b), "distancia": round(float(d), 3)} for a, b, d, _ in uniones],
    "niveles": {str(n): v for n, v in niveles.items()},
    "parecidas": parecidas,
    "reparto": reparto,
}
ARCHIVO_GRUPOS.write_text(json.dumps(P07, ensure_ascii=False, indent=1), encoding="utf-8")
titulo("6. EXPORTADO")
print("frontend/src/lib/ia/grupos/grupos.json     (se agregó la sección «familias»)")
print("resultados/p08b_letras_parecidas.csv       (las 4 más parecidas de cada letra)")
print("Siguiente paso (opcional): python demo_100_personas.py")
