# ============================================================
# PRACTICA 2 - PARTE B (adaptada a nuestro proyecto)
# EXPLORACION DEL CONJUNTO DE DATOS
# ============================================================
#
# Antes de entrenar hay que conocer los datos: qué tipos tienen, cómo se reparten
# las letras y si las medidas tienen sentido. Por ejemplo, esperamos que en la B
# (dedos estirados) el ángulo del índice sea cercano a 180° y en la A (puño) mucho menor.

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

AQUI = Path(__file__).parent
df = pd.read_csv(AQUI / "datos" / "manos.csv")

# ------------------------------------------------------------
# 1. PRIMEROS Y ÚLTIMOS REGISTROS
# ------------------------------------------------------------
columnas = ["origen", "letra", "angulo_indice_medio", "pulgar_a_indice", "tamano_mano"]
print("=== PRIMEROS REGISTROS ===")
print(df[columnas].head())
print("\n=== ÚLTIMOS REGISTROS ===")
print(df[columnas].tail())

# ------------------------------------------------------------
# 2. TIPOS DE DATOS E INFORMACIÓN GENERAL
# ------------------------------------------------------------
print("\n=== TIPOS DE DATOS (algunas columnas) ===")
print(df[columnas + ["prediccion_reglas"]].dtypes)
print("\n=== INFORMACIÓN GENERAL ===")
df[columnas].info()

# ------------------------------------------------------------
# 3. ESTADÍSTICAS DESCRIPTIVAS
# ------------------------------------------------------------
print("\n=== ESTADÍSTICAS DE ALGUNAS MEDIDAS ===")
print(df[["angulo_indice_medio", "angulo_pulgar", "pulgar_a_indice", "punta_indice_a_palma"]].describe().round(2))

# ------------------------------------------------------------
# 4. ¿CUÁNTAS MANOS HAY DE CADA LETRA?
# ------------------------------------------------------------
# Si una letra tuviera muy pocos ejemplos, el modelo la aprendería mal.
print("\n=== MANOS POR LETRA (avatar 3D) ===")
print(df[df["origen"] == "avatar3d"]["letra"].value_counts().sort_index().to_string())
print("\n=== MANOS POR LETRA (dibujos que MediaPipe dijo detectar) ===")
print(df[(df["origen"] == "dibujo") & (df["detectada"] == 1)]["letra"].value_counts().sort_index().to_string())

# ------------------------------------------------------------
# 5. ¿TIENEN SENTIDO LAS MEDIDAS? PROMEDIO POR LETRA
# ------------------------------------------------------------
avatar = df[df["origen"] == "avatar3d"]
promedios = avatar.groupby("letra")["angulo_indice_medio"].mean().sort_values()
print("\n=== ÁNGULO DEL ÍNDICE (promedio, 180 = recto) ===")
print(promedios.round(1).to_string())

fig, ax = plt.subplots(figsize=(11, 4), dpi=120)
ax.bar(promedios.index, promedios.values, color="#1fa38c")
ax.axhline(promedios.mean(), color="#ea580c", linestyle="--", label="promedio")
ax.set_title("¿Qué tan estirado está el índice en cada letra?", loc="left")
ax.set_ylabel("Ángulo del índice (grados)")
ax.legend()
fig.tight_layout()
(AQUI / "resultados").mkdir(exist_ok=True)
fig.savefig(AQUI / "resultados" / "angulo_indice_por_letra.png")
print("\nGráfica guardada en resultados/angulo_indice_por_letra.png")

# Ojo: que las letras con el índice estirado (B, D, L, U…) tengan un ángulo más alto
# es lo que esperábamos, pero con esto solo describimos los datos; no prueba nada todavía.
