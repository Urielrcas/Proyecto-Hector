# ============================================================
# PRACTICA 2 - PARTE D (adaptada a nuestro proyecto)
# LIMPIEZA BASICA Y EXPORTACION
# ============================================================
#
# Estrategia (la misma idea que en clase: no borrar sin dejar rastro):
#   - Quitar las manos sin medidas (MediaPipe no encontró nada).
#   - Quitar las detecciones falsas de los dibujos (mano de menos del 25 % de la imagen).
#   - Quitar duplicados exactos y medidas fuera de rango.
#   - Apartar la grabación real: su etiqueta no es confiable cuadro por cuadro (parte C).
# Todo lo que se quita se guarda en manos_revision.csv con el MOTIVO, para poder revisarlo.

from pathlib import Path

import numpy as np
import pandas as pd

AQUI = Path(__file__).parent
df = pd.read_csv(AQUI / "datos" / "manos.csv")
medidas = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
angulos = [c for c in medidas if c.startswith("angulo_")]
distancias = [c for c in medidas if c.startswith(("pulgar_a", "punta_"))]

# ------------------------------------------------------------
# PASO 1. DECIDIR EL MOTIVO DE CADA MANO QUE NO SIRVE
# ------------------------------------------------------------
motivo = pd.Series("", index=df.index)
sin_medidas = df[medidas].isnull().any(axis=1)
motivo[sin_medidas] = "sin medidas: MediaPipe no encontró la mano"
falsa = (df["origen"] == "dibujo") & ~sin_medidas & (df["tamano_mano"] < 0.25)
motivo[falsa & (motivo == "")] = "detección falsa: la mano encontrada es demasiado chica"
fuera = ~sin_medidas & ((df[angulos] < 0).any(axis=1) | (df[angulos] > 180).any(axis=1) | (df[distancias] < 0).any(axis=1) | (df[distancias] > 4).any(axis=1))
motivo[fuera & (motivo == "")] = "medidas fuera de rango"
duplicada = df.duplicated(subset=medidas) & ~sin_medidas
motivo[duplicada & (motivo == "")] = "duplicada"
motivo[(df["origen"] == "real") & (motivo == "")] = "real: etiqueta no confiable cuadro por cuadro (se usa como caso nuevo)"

valido = motivo == ""

# ------------------------------------------------------------
# PASO 2. SEPARAR
# ------------------------------------------------------------
df_validos = df[valido].copy()
df_revision = df[~valido].copy()
df_revision["motivo"] = motivo[~valido]

print("=== MANOS VÁLIDAS ===")
print(df_validos["origen"].value_counts().to_string())
print("Letras:", df_validos["letra"].nunique())

print("\n=== MANOS EN REVISIÓN (por motivo) ===")
print(df_revision["motivo"].value_counts().to_string())

# ------------------------------------------------------------
# PASO 3. EXPORTAR
# ------------------------------------------------------------
df_validos.to_csv(AQUI / "datos" / "manos_limpias.csv", index=False, encoding="utf-8")
df_revision.to_csv(AQUI / "datos" / "manos_revision.csv", index=False, encoding="utf-8")
print("\nArchivos generados:")
print("- datos/manos_limpias.csv")
print("- datos/manos_revision.csv (con el motivo de cada una)")

# Nota: si algún dibujo quedara válido (una detección de buen tamaño), entra al entrenamiento
# como cualquier otra mano. Si mañana se agregan grabaciones de calibración, también entran aquí.
_ = np  # (numpy se usa en la parte E)
