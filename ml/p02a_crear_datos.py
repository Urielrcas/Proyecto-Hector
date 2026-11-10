# ============================================================
# PRACTICA 2 - PARTE A (adaptada a nuestro proyecto)
# CREACION DEL CONJUNTO DE DATOS
# ============================================================
#
# En clase cada fila era un estudiante. Aquí cada fila es UNA MANO haciendo una letra.
#
# ¿De dónde salen las manos? La app las junta con frontend/scripts/ml-preparar-datos.mjs:
#   - avatar3d: la mano 3D del avatar de la app haciendo cada letra en 150 posiciones distintas
#     (girada, inclinada, con los dedos un poco distintos, manos más anchas o más angostas).
#     Es como tener a muchas personas haciendo la misma letra frente a la cámara.
#   - dibujo:   los dibujos de LSM del equipo (carpeta Señas-image) pasados por MediaPipe,
#     el mismo detector de manos que usa la cámara. Ya veremos en la parte C que salió mal.
#   - real:     una grabación de una mano real (la O), hecha con el botón "¿Se equivocó de letra?".
#
# Cada mano trae 57 medidas: dónde está cada uno de sus 21 puntos, qué tanto se dobla
# cada dedo y qué tan lejos está el pulgar de los otros dedos. Además trae lo que dijeron
# las REGLAS FIJAS de la app, para compararlas con el modelo en la práctica 3.

from pathlib import Path

import pandas as pd

AQUI = Path(__file__).parent

# ------------------------------------------------------------
# PASO 1. CARGAR LOS DATOS QUE ARMÓ LA APP
# ------------------------------------------------------------
df = pd.read_csv(AQUI / "datos" / "manos_crudas.csv")

# ------------------------------------------------------------
# PASO 2. MOSTRAR LA TABLA (solo algunas columnas, son 70)
# ------------------------------------------------------------
print("=== CONJUNTO DE DATOS ===")
print(df[["id", "origen", "letra", "prediccion_reglas", "angulo_indice_medio", "pulgar_a_indice", "punta_indice_a_palma"]].head(10))

# ------------------------------------------------------------
# PASO 3. TAMAÑO DE LA TABLA
# ------------------------------------------------------------
print("\nDimensiones de la tabla:", df.shape)
print("Número de manos:", df.shape[0])
print("Número de columnas:", df.shape[1])

print("\nManos por origen:")
print(df["origen"].value_counts())

# ------------------------------------------------------------
# PASO 4. GUARDAR UNA COPIA DE TRABAJO
# ------------------------------------------------------------
# Trabajamos sobre una copia; manos_crudas.csv se queda como salió de la app.
df.to_csv(AQUI / "datos" / "manos.csv", index=False, encoding="utf-8")
print("\nArchivo datos/manos.csv creado correctamente.")
