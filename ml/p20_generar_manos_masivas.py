# ============================================================
# PRÁCTICA 20 · GENERACIÓN DE DATOS MASIVOS
# (adaptación de p20generador_datos_masivos.py de SmartAcademy)
#
# En la práctica se inventaban 50,000 registros de alumnos (10,000 alumnos × 5 materias).
# Aquí son 50,000 MANOS: el avatar 3D de la app hace cada una de las 25 formas de letra
# 2,000 veces, cada vez un poco distinta (dedos, giro, tamaño, proporciones).
#
#   25 formas × 2,000 manos = 50,000 registros
#
# Igual que en la práctica, los datos «del mundo real» nunca llegan perfectos. Para que la
# práctica 21 (Spark) tenga algo que revisar, se meten a propósito unos cuantos errores
# típicos de la cámara, siempre los mismos (semilla fija):
#   - manos repetidas (la cámara mandó el mismo cuadro dos veces),
#   - manos sin medidas (se perdió la detección),
#   - medidas fuera de rango (un punto «salió volando»).
#
# Entrada: el código de la app (frontend/scripts/ml-preparar-datos.mjs --masivo 2000)
# Salida:  datos/manos_masivas.csv
#
# Uso:  python p20_generar_manos_masivas.py            (2,000 por letra)
#       python p20_generar_manos_masivas.py 400        (para probar rápido)
# ============================================================

import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

AQUI = Path(__file__).parent
FRONTEND = AQUI.parent / "frontend"
CRUDAS = AQUI / "datos" / "manos_masivas_crudas.csv"
SALIDA = AQUI / "datos" / "manos_masivas.csv"

MANOS_POR_LETRA = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
SEMILLA = 2020

# Cuántos errores se meten (proporción del total).
PROP_REPETIDAS = 0.010  # 1 %
PROP_SIN_MEDIDAS = 0.004  # 0.4 %
PROP_FUERA_DE_RANGO = 0.003  # 0.3 %


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


# ------------------------------------------------------------
# 1. EL AVATAR HACE LAS MANOS (con el mismo código de la app)
# ------------------------------------------------------------
titulo(f"1. GENERAR {MANOS_POR_LETRA:,} MANOS POR LETRA CON EL AVATAR 3D")
# shell=True en Windows para que encuentre «node».
subprocess.run(f"node scripts/ml-preparar-datos.mjs --masivo {MANOS_POR_LETRA}", cwd=FRONTEND, shell=True, check=True)
df = pd.read_csv(CRUDAS)
print("Manos generadas:", f"{len(df):,}", "| formas de letra:", df["letra"].nunique())

# ------------------------------------------------------------
# 2. METER ERRORES TÍPICOS DE LA CÁMARA
# ------------------------------------------------------------
titulo("2. ERRORES A PROPÓSITO (para que Spark los encuentre)")
azar = np.random.default_rng(SEMILLA)
medidas = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
n = len(df)

# a) Repetidas: copias exactas de manos que ya están (con otro id, como pasa al mandar dos veces el mismo cuadro).
repetidas = df.sample(int(n * PROP_REPETIDAS), random_state=SEMILLA).copy()

# b) Sin medidas: la cámara perdió la mano.
sin_medidas = azar.choice(n, int(n * PROP_SIN_MEDIDAS), replace=False)
df.loc[sin_medidas, medidas] = np.nan
df.loc[sin_medidas, "detectada"] = 0

# c) Fuera de rango: un ángulo imposible (más de 180°) o un punto lejísimos de la mano.
libres = np.setdiff1d(np.arange(n), sin_medidas)
fuera = azar.choice(libres, int(n * PROP_FUERA_DE_RANGO), replace=False)
mitad = len(fuera) // 2
df.loc[fuera[:mitad], "angulo_indice_medio"] = azar.uniform(200, 400, mitad)
df.loc[fuera[mitad:], "p8_v"] = azar.uniform(8, 20, len(fuera) - mitad)

df = pd.concat([df, repetidas], ignore_index=True)
df["id"] = np.arange(1, len(df) + 1)  # id único por registro (las repetidas solo cambian el id)
print(f"Repetidas:        {len(repetidas):>6,}")
print(f"Sin medidas:      {len(sin_medidas):>6,}")
print(f"Fuera de rango:   {len(fuera):>6,}")
print(f"Total de filas:   {len(df):>6,}")

# ------------------------------------------------------------
# 3. GUARDAR
# ------------------------------------------------------------
titulo("3. GUARDAR")
df.to_csv(SALIDA, index=False)
CRUDAS.unlink()  # el archivo intermedio ya no hace falta
print("datos/manos_masivas.csv", f"({SALIDA.stat().st_size / 1e6:.1f} MB)")
print("\nResumen por letra (primeras 5):")
print(df["letra"].value_counts().sort_index().head().to_string())
print("\nSiguiente paso: python p21_spark_manos.py")
