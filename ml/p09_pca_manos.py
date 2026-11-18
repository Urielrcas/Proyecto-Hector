# ============================================================
# PRACTICA 09 (adaptada a nuestro proyecto)
# REDUCCION DE DIMENSIONALIDAD MEDIANTE PCA
# (Principal Component Analysis / Análisis de Componentes Principales)
# ============================================================
#
# Cada mano tiene 57 medidas → vive en un espacio de 57 dimensiones, imposible de dibujar.
# PCA busca nuevas «direcciones» (componentes) que resumen las medidas: la primera es la dirección
# en la que las manos varían más, la segunda la siguiente (perpendicular a la primera), etc.
# Con las dos primeras podemos dibujar cada mano como un punto y ver los grupos de la práctica 07.
#
# Etapas:
#   1. Datos y grupos de la práctica 07
#   2. Estandarizar (sin esto los ángulos dominarían a las posiciones)
#   3. PCA y varianza explicada (individual y acumulada)
#   4. ¿Cuántas componentes hacen falta? (80 %, 90 %, 95 %)
#   5. Cargas: qué medidas forman cada componente
#   6. Gráficas en 2D y 3D, y comparación con dos medidas originales
#   7. Error de reconstrucción
#   8. Exportar coordenadas, datos reconstruidos y los puntos para la app

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding="utf-8")  # para que la consola de Windows muestre acentos

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "grupos"
SEMILLA = 42
PUNTOS_APP = 1200  # cuántas manos se mandan a la app para la gráfica (todas pesarían de más)
COLORES = ["#15803d", "#7c3aed", "#0369a1", "#a8a29e", "#b91c1c", "#d97706", "#0d9488", "#db2777", "#4d7c0f", "#6366f1", "#78716c", "#0891b2"]


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. DATOS Y GRUPOS DE LA PRÁCTICA 07
# ------------------------------------------------------------
archivo_grupos = AQUI / "datos" / "manos_grupos.csv"
if not archivo_grupos.exists():
    sys.exit("Primero corre p07_kmeans_manos.py (crea datos/manos_grupos.csv).")
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
grupos = pd.read_csv(archivo_grupos).set_index("id").loc[df["id"], "grupo"].to_numpy()
P07 = json.loads((DESTINO_APP / "grupos.json").read_text(encoding="utf-8"))
NOMBRES_GRUPO = {g["id"]: g["nombre"] for g in P07["grupos"]}
K = P07["k"]
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
titulo("1. DATOS")
print("Manos:", len(df), "| dimensiones originales:", len(COLUMNAS_X), "| grupos de K-Means:", K)

# ------------------------------------------------------------
# 2. ESTANDARIZAR
# ------------------------------------------------------------
# PCA busca dónde hay más varianza. Sin estandarizar, los ángulos (varían decenas de grados)
# acapararían las componentes y las posiciones (varían décimas) no contarían.
escala = StandardScaler()
Z = escala.fit_transform(X)
sin_escalar = PCA().fit(X)
titulo("2. ¿POR QUÉ ESTANDARIZAR?")
print(f"Sin estandarizar, la 1.ª componente explica {sin_escalar.explained_variance_ratio_[0]:.0%} "
      f"y está hecha casi solo de ángulos: {', '.join(pd.Series(np.abs(sin_escalar.components_[0]), index=COLUMNAS_X).nlargest(3).index)}")

# ------------------------------------------------------------
# 3. PCA Y VARIANZA EXPLICADA
# ------------------------------------------------------------
pca = PCA(random_state=SEMILLA).fit(Z)
var = pca.explained_variance_ratio_
acum = np.cumsum(var)
titulo("3. VARIANZA EXPLICADA")
for i in range(10):
    print(f"CP{i + 1:<2} {var[i]:6.1%}   acumulada {acum[i]:6.1%}")

# ------------------------------------------------------------
# 4. ¿CUÁNTAS COMPONENTES HACEN FALTA?
# ------------------------------------------------------------
necesarias = {p: int(np.argmax(acum >= p / 100) + 1) for p in (80, 90, 95)}
titulo("4. COMPONENTES NECESARIAS")
for p, n in necesarias.items():
    print(f"Para conservar el {p} % de la información: {n} componentes (de {len(COLUMNAS_X)})")
print(f"Con solo 2 (para dibujar) conservamos el {acum[1]:.0%}: la gráfica es un resumen, no la mano completa.")

# ------------------------------------------------------------
# 5. CARGAS DE LAS COMPONENTES
# ------------------------------------------------------------
# La carga dice cuánto pesa cada medida original en la componente (y con qué signo).
cargas = pd.DataFrame(pca.components_[:3].T, index=COLUMNAS_X, columns=["CP1", "CP2", "CP3"])
cargas.to_csv(RESULTADOS / "p09_cargas_componentes.csv")
titulo("5. QUÉ MEDIDAS FORMAN CADA COMPONENTE")
cargas_top = {}
for cp in ["CP1", "CP2"]:
    top = cargas[cp].abs().nlargest(5).index
    cargas_top[cp] = [{"medida": m, "carga": round(float(cargas.loc[m, cp]), 3)} for m in top]
    print(f"{cp}: " + ", ".join(f"{m} ({cargas.loc[m, cp]:+.2f})" for m in top))

# ------------------------------------------------------------
# 6. GRÁFICAS
# ------------------------------------------------------------
coords = pca.transform(Z)

# 6.1 Varianza explicada
fig, ax = plt.subplots(figsize=(9, 4.5), dpi=120)
n_graf = 20
ax.bar(range(1, n_graf + 1), var[:n_graf], color="#a8a29e", label="Individual")
ax.plot(range(1, n_graf + 1), acum[:n_graf], marker="o", color="#15803d", label="Acumulada")
for p, n in necesarias.items():
    if n <= n_graf:
        ax.axhline(p / 100, linestyle=":", color="#78716c", linewidth=1)
        ax.text(n_graf + 0.3, p / 100, f"{p} %", va="center", fontsize=8)
ax.set_xlabel("Componente principal")
ax.set_ylabel("Varianza explicada")
ax.set_title("¿Cuánta información guarda cada componente?", loc="left")
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p09_varianza_explicada.png")
plt.close(fig)

# 6.2 Mapa 2D con los grupos de K-Means
centros_pca = np.array([coords[grupos == g, :2].mean(axis=0) for g in range(K)])
fig, ax = plt.subplots(figsize=(10, 7), dpi=120)
for g in range(K):
    sel = grupos == g
    ax.scatter(coords[sel, 0], coords[sel, 1], s=6, alpha=0.5, color=COLORES[g % len(COLORES)], label=f"G{g + 1} {NOMBRES_GRUPO[g]}")
    ax.scatter(*centros_pca[g], s=160, marker="X", color=COLORES[g % len(COLORES)], edgecolor="black")
ax.set_xlabel(f"CP1 ({var[0]:.0%} de la información)")
ax.set_ylabel(f"CP2 ({var[1]:.0%} de la información)")
ax.set_title("Las manos en 2 dimensiones (PCA), coloreadas por grupo de K-Means", loc="left")
ax.legend(fontsize=7, markerscale=3, loc="best")
fig.tight_layout()
fig.savefig(RESULTADOS / "p09_pca_2d.png")
plt.close(fig)

# 6.3 Mapa 3D
fig = plt.figure(figsize=(9, 7), dpi=120)
ax = fig.add_subplot(projection="3d")
for g in range(K):
    sel = grupos == g
    ax.scatter(coords[sel, 0], coords[sel, 1], coords[sel, 2], s=4, alpha=0.5, color=COLORES[g % len(COLORES)], label=f"G{g + 1}")
ax.set_xlabel("CP1")
ax.set_ylabel("CP2")
ax.set_zlabel("CP3")
ax.set_title(f"PCA en 3D ({acum[2]:.0%} de la información)", loc="left")
ax.legend(fontsize=7, markerscale=3)
fig.tight_layout()
fig.savefig(RESULTADOS / "p09_pca_3d.png")
plt.close(fig)

# 6.4 Antes y después: dos medidas originales contra las dos componentes
originales = ["angulo_indice_medio", "angulo_menique_medio"]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5), dpi=120)
for g in range(K):
    sel = grupos == g
    ax1.scatter(X.loc[sel, originales[0]], X.loc[sel, originales[1]], s=5, alpha=0.4, color=COLORES[g % len(COLORES)])
    ax2.scatter(coords[sel, 0], coords[sel, 1], s=5, alpha=0.4, color=COLORES[g % len(COLORES)])
ax1.set_xlabel(originales[0])
ax1.set_ylabel(originales[1])
ax1.set_title("Dos medidas originales (2 de 57)", loc="left")
ax2.set_xlabel("CP1")
ax2.set_ylabel("CP2")
ax2.set_title(f"Dos componentes PCA (resumen de las 57, {acum[1]:.0%})", loc="left")
fig.tight_layout()
fig.savefig(RESULTADOS / "p09_original_vs_pca.png")
plt.close(fig)

# ------------------------------------------------------------
# 7. ERROR DE RECONSTRUCCIÓN
# ------------------------------------------------------------
# Comprimimos a n componentes y luego regresamos a 57 medidas. Lo que se perdió = error.
titulo("7. ERROR DE RECONSTRUCCIÓN (datos estandarizados)")
reconstruccion = []
for n in sorted({2, 3, 5, 10, necesarias[90], necesarias[95], 30}):
    p = PCA(n_components=n, random_state=SEMILLA).fit(Z)
    error = mean_squared_error(Z, p.inverse_transform(p.transform(Z)))
    reconstruccion.append({"componentes": n, "error": float(error), "varianza": float(acum[n - 1])})
    print(f"{n:>2} componentes → error {error:.3f} (conserva {acum[n - 1]:.0%})")

# ------------------------------------------------------------
# 8. EXPORTAR
# ------------------------------------------------------------
pd.DataFrame(coords[:, :3], columns=["CP1", "CP2", "CP3"]).assign(id=df["id"], letra=df["letra"], grupo=grupos).to_csv(
    RESULTADOS / "p09_coordenadas_pca.csv", index=False)
n90 = necesarias[90]
p90 = PCA(n_components=n90, random_state=SEMILLA).fit(Z)
reconstruidos = pd.DataFrame(escala.inverse_transform(p90.inverse_transform(p90.transform(Z))), columns=COLUMNAS_X).round(4)
reconstruidos.assign(id=df["id"], letra=df["letra"]).to_csv(RESULTADOS / "p09_datos_reconstruidos.csv", index=False)

# Para la app: una muestra de manos (proporcional por grupo) con sus 2 coordenadas.
rng = np.random.default_rng(SEMILLA)
muestra = np.sort(rng.choice(len(df), size=min(PUNTOS_APP, len(df)), replace=False))
letras = sorted(df["letra"].unique())
salida = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "dimensiones": len(COLUMNAS_X),
    "varianza": [round(float(v), 4) for v in var[:15]],
    "acumulada": [round(float(v), 4) for v in acum[:15]],
    "necesarias": {str(p): n for p, n in necesarias.items()},
    "sinEscalarCP1": round(float(sin_escalar.explained_variance_ratio_[0]), 4),
    "cargas": cargas_top,
    "reconstruccion": [{"componentes": r["componentes"], "error": round(r["error"], 4), "varianza": round(r["varianza"], 4)} for r in reconstruccion],
    "letras": letras,
    # Puntos empacados en listas paralelas para que el JSON pese poco.
    "puntos": {
        "x": [round(float(v), 2) for v in coords[muestra, 0]],
        "y": [round(float(v), 2) for v in coords[muestra, 1]],
        "grupo": [int(g) for g in grupos[muestra]],
        "letra": [letras.index(l) for l in df["letra"].iloc[muestra]],
    },
    "centros": [{"grupo": g, "x": round(float(c[0]), 2), "y": round(float(c[1]), 2)} for g, c in enumerate(centros_pca)],
}
(DESTINO_APP / "pca.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

titulo("8. EXPORTADO")
print("resultados/p09_coordenadas_pca.csv        (CP1, CP2, CP3 de cada mano)")
print(f"resultados/p09_datos_reconstruidos.csv    (las manos reconstruidas con {n90} componentes)")
print("resultados/p09_cargas_componentes.csv")
print("resultados/p09_varianza_explicada.png, p09_pca_2d.png, p09_pca_3d.png, p09_original_vs_pca.png")
print(f"frontend/src/lib/ia/grupos/pca.json       ({len(muestra)} manos para la gráfica de la app)")
