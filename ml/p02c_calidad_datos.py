# ============================================================
# PRACTICA 2 - PARTE C (adaptada a nuestro proyecto)
# DETECCION DE ERRORES EN LOS DATOS
# ============================================================
#
# Esta parte nos salvó de un error grande. Intentamos sacar los 21 puntos de cada uno de
# los 26 dibujos de LSM del equipo (en 120 variaciones cada uno) pasándolos por MediaPipe.
# MediaPipe dijo que encontró la mano en 887 imágenes... pero al revisar resultó que casi
# todas eran falsas: en los dibujos la mano ocupa más de la mitad de la imagen, y lo que
# "detectó" MediaPipe medía en promedio el 10 %. Se había inventado manitas diminutas
# encima de la letra de abajo o de una uña. MediaPipe aprendió con fotos de manos reales,
# no con dibujos de líneas.
#
# Si hubiéramos entrenado con esas manos sin revisarlas, el modelo habría aprendido basura.

from pathlib import Path

import pandas as pd

AQUI = Path(__file__).parent
df = pd.read_csv(AQUI / "datos" / "manos.csv")
medidas = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c not in ("prediccion_reglas",)]

# ------------------------------------------------------------
# 1. VALORES FALTANTES
# ------------------------------------------------------------
# Las imágenes donde MediaPipe no encontró mano no tienen medidas.
print("=== MANOS SIN MEDIDAS (MediaPipe no encontró la mano) ===")
sin_medidas = df[medidas].isnull().any(axis=1)
print(df[sin_medidas]["origen"].value_counts().to_string())

# ------------------------------------------------------------
# 2. DETECCIONES FALSAS: LA MANO "DETECTADA" ES DIMINUTA
# ------------------------------------------------------------
# En los dibujos la mano ocupa entre el 50 y el 70 % de la imagen. Una "mano" de menos del 25 %
# no puede ser la del dibujo.
dibujos = df[(df["origen"] == "dibujo") & (df["detectada"] == 1)]
print("\n=== TAMAÑO DE LA MANO QUE MEDIAPIPE DIJO ENCONTRAR EN LOS DIBUJOS ===")
print(dibujos["tamano_mano"].describe().round(3).to_string())
falsas = dibujos[dibujos["tamano_mano"] < 0.25]
print(f"\nDetecciones falsas (mano de menos del 25 % de la imagen): {len(falsas)} de {len(dibujos)}")

# Las reglas de la app tampoco reconocen esas "manos": otra señal de que no sirven.
print("Las reglas reconocen la letra correcta en", round((dibujos["prediccion_reglas"] == dibujos["letra"]).mean() * 100, 1), "% de ellas.")

# ------------------------------------------------------------
# 3. REGISTROS DUPLICADOS
# ------------------------------------------------------------
duplicados = df[df.duplicated(subset=medidas) & ~sin_medidas]
print("\n=== MANOS CON LAS MISMAS MEDIDAS EXACTAS ===")
print(len(duplicados))

# ------------------------------------------------------------
# 4. MEDIDAS FUERA DE RANGO
# ------------------------------------------------------------
# Los ángulos deben estar entre 0 y 180. Las distancias, entre 0 y unas 4 palmas.
angulos = [c for c in medidas if c.startswith("angulo_")]
distancias = [c for c in medidas if c.startswith(("pulgar_a", "punta_"))]
fuera = (df[angulos] < 0).any(axis=1) | (df[angulos] > 180).any(axis=1) | (df[distancias] < 0).any(axis=1) | (df[distancias] > 4).any(axis=1)
print("\n=== MANOS CON MEDIDAS FUERA DE RANGO ===")
print(df[fuera]["origen"].value_counts().to_string() or "ninguna")

# ------------------------------------------------------------
# 5. LA GRABACIÓN REAL
# ------------------------------------------------------------
# La grabación real dice "O", pero al revisarla cuadro por cuadro la mano pasó por la mano
# abierta, el puño, la C y la G: se grabó mientras la persona se movía. La etiqueta "O" no es
# confiable para cada cuadro, así que no la usamos para entrenar; la usamos como "caso nuevo".
reales = df[df["origen"] == "real"]
print("\n=== GRABACIÓN REAL (etiquetada como", reales["letra"].iloc[0] if len(reales) else "-", ") ===")
print("Lo que dijeron las reglas en sus", len(reales), "cuadros:")
print(reales["prediccion_reglas"].value_counts().to_string())
