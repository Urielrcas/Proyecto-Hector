# ============================================================
# PRACTICA 2 - PARTE E (adaptada a nuestro proyecto)
# PREPARAR LAS VARIABLES DE ENTRADA Y EL OBJETIVO
# ============================================================
#
# X = las 57 medidas de la mano (dónde están sus puntos, cuánto se doblan los dedos,
#     qué tan lejos está el pulgar de los otros dedos)
# y = la letra
#
# Igual que en clase, todavía no entrenamos: solo dejamos lista la forma de los datos.

from pathlib import Path

import pandas as pd

AQUI = Path(__file__).parent
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")

# ------------------------------------------------------------
# 1. VARIABLES DE ENTRADA (X)
# ------------------------------------------------------------
# No usamos "origen", "giro", "id" ni lo que dijeron las reglas: eso no lo sabría la app
# frente a una mano nueva. Solo lo que se puede medir de la mano.
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]

# ------------------------------------------------------------
# 2. VARIABLE OBJETIVO (y)
# ------------------------------------------------------------
y = df["letra"]

# ------------------------------------------------------------
# 3. MOSTRAR
# ------------------------------------------------------------
print("=== VARIABLES DE ENTRADA: X ===")
print(X.iloc[:5, :8], "\n... y", X.shape[1] - 8, "columnas más")
print("\n=== VARIABLE OBJETIVO: y ===")
print(y.head())
print("\nDimensiones de X:", X.shape)
print("Dimensiones de y:", y.shape)
print("Letras distintas (clases):", y.nunique(), "→", " ".join(sorted(y.unique())))

# ------------------------------------------------------------
# 4. COMPROBAR QUE X E y ESTÁN ALINEADOS
# ------------------------------------------------------------
assert len(X) == len(y), "X e y tienen diferente cantidad de filas"
assert not X.isnull().any().any(), "Quedaron valores vacíos en X"
print("\nLas entradas y el objetivo están alineados y sin valores vacíos.")

# I/J, N/Ñ y K/P aparecen como una sola clase: tienen la misma forma de mano y solo
# cambian por el movimiento, que con la foto de una mano no se puede ver.
