# ============================================================
# PRÁCTICA 23 · PREPARACIÓN DE DATOS PARA UNA CNN 1D
# (adaptación de p23preparacion_datos_cnn.py de SmartAcademy)
#
# En la práctica, cada alumno era una SECUENCIA: parcial 1 → parcial 2 → parcial 3.
# Aquí cada mano también es una secuencia: sus 21 puntos EN ORDEN, de la muñeca a la punta
# de cada dedo (muñeca, pulgar ×4, índice ×4, medio ×4, anular ×4, meñique ×4).
# Una red convolucional 1D «recorre» esa secuencia con filtros pequeños, como si leyera
# la mano dedo por dedo, y aprende qué patrones distinguen cada letra.
#
# Cada punto tiene 3 «canales» (como los colores de una foto):
#   u = a lo ancho de la mano, v = a lo alto, r = distancia a la muñeca.
# Forma del tensor: (manos, 3 canales, 21 puntos).
#
# División (IMPORTANTE para comparar justo en la práctica 25):
#   - Prueba y validación: EXACTAMENTE las mismas manos que usó ml/p03_modelo.py
#     (misma semilla y misma división 60/20/20). Así la red y la votación de la app se
#     examinan con las mismas manos.
#   - Entrenamiento: el 60 % de p03 + las manos masivas de las prácticas 20 y 21
#     (son manos nuevas del avatar, con otra semilla: ninguna está en la prueba).
# Normalización: media y desviación calculadas SOLO con entrenamiento.
#
# Entrada: datos/manos_limpias.csv, datos/spark_manos/ (opcional)
# Salida:  resultados_cnn1d/datos.npz y resultados_cnn1d/meta.json
# ============================================================

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from app_json import actualizar

AQUI = Path(__file__).parent
SALIDA = AQUI / "resultados_cnn1d"
SALIDA.mkdir(exist_ok=True)
SEMILLA = 42  # la misma de p03_modelo.py


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


# ------------------------------------------------------------
# 1. CARGAR LOS DATOS
# ------------------------------------------------------------
titulo("1. CARGAR LOS DATOS")
limpias = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
MEDIDAS = [c for c in limpias.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
POSICIONES = [f"p{i}_{e}" for i in range(1, 21) for e in ("u", "v")]
print("Manos limpias (p02d):", len(limpias))

carpeta_spark = AQUI / "datos" / "spark_manos"
if carpeta_spark.exists():
    masivas = pd.read_parquet(carpeta_spark)  # pyarrow lee las partes que dejó Spark
    print("Manos masivas (p21, Parquet):", f"{len(masivas):,}")
else:
    masivas = limpias.iloc[0:0]
    print("No hay manos masivas (corre p20 y p21 para tener 50,000 más). Se sigue solo con las limpias.")

# ------------------------------------------------------------
# 2. VALIDAR
# ------------------------------------------------------------
titulo("2. VALIDAR")
for nombre, tabla in [("limpias", limpias), ("masivas", masivas)]:
    nulos = int(tabla[MEDIDAS].isna().sum().sum()) if len(tabla) else 0
    print(f"{nombre:<8} nulos en las medidas: {nulos}")
    assert nulos == 0, "Hay medidas vacías: revisa p02d / p21"
CLASES = sorted(limpias["letra"].unique())
assert set(masivas["letra"].unique()) <= set(CLASES), "Las masivas traen letras que no están en las limpias"
print("Clases:", len(CLASES), "→", " ".join(CLASES))

# ------------------------------------------------------------
# 3. LA MISMA DIVISIÓN DE p03 (60 / 20 / 20)
# ------------------------------------------------------------
titulo("3. DIVISIÓN (la misma de p03_modelo.py)")
X = limpias[MEDIDAS]
y = limpias["letra"]
X_tmp, X_pru, y_tmp, y_pru = train_test_split(X, y, test_size=0.20, random_state=SEMILLA, stratify=y)
X_ent, X_val, y_ent, y_val = train_test_split(X_tmp, y_tmp, test_size=0.25, random_state=SEMILLA, stratify=y_tmp)
ent = pd.concat([limpias.loc[X_ent.index], masivas], ignore_index=True)
val = limpias.loc[X_val.index]
pru = limpias.loc[X_pru.index]
print(f"Entrenamiento: {len(ent):,} ({len(X_ent):,} de p03 + {len(masivas):,} masivas)")
print(f"Validación:    {len(val):,}")
print(f"Prueba:        {len(pru):,}")


# ------------------------------------------------------------
# 4. CONVERTIR A TENSORES (manos, canales, puntos)
# ------------------------------------------------------------
def a_secuencia(tabla):
    """De las 40 posiciones (p1_u … p20_v) a un tensor (manos, 3, 21) con la muñeca al inicio."""
    uv = tabla[POSICIONES].to_numpy(np.float32).reshape(-1, 20, 2)
    uv = np.concatenate([np.zeros((len(uv), 1, 2), np.float32), uv], axis=1)  # la muñeca es el origen (0, 0)
    r = np.linalg.norm(uv, axis=2, keepdims=True)
    return np.concatenate([uv, r], axis=2).transpose(0, 2, 1)  # → (manos, 3, 21)


titulo("4. TENSORES")
indice = {letra: i for i, letra in enumerate(CLASES)}
S_ent, S_val, S_pru = a_secuencia(ent), a_secuencia(val), a_secuencia(pru)
y_ent_i = ent["letra"].map(indice).to_numpy(np.int64)
y_val_i = val["letra"].map(indice).to_numpy(np.int64)
y_pru_i = pru["letra"].map(indice).to_numpy(np.int64)
print("Forma del tensor de entrenamiento:", S_ent.shape, "(manos, canales, puntos)")

# ------------------------------------------------------------
# 5. NORMALIZAR (solo con entrenamiento)
# ------------------------------------------------------------
titulo("5. NORMALIZAR")
medias = S_ent.mean(axis=(0, 2))
escalas = S_ent.std(axis=(0, 2)) + 1e-6
normalizar = lambda S: ((S - medias[None, :, None]) / escalas[None, :, None]).astype(np.float32)  # noqa: E731
for canal, m, e in zip("uvr", medias, escalas):
    print(f"Canal {canal}: media {m:+.3f}, desviación {e:.3f}")

# ------------------------------------------------------------
# 6. DISTRIBUCIÓN DE CLASES
# ------------------------------------------------------------
titulo("6. DISTRIBUCIÓN DE CLASES")
for nombre, yy in [("entrenamiento", y_ent_i), ("validación", y_val_i), ("prueba", y_pru_i)]:
    conteo = np.bincount(yy, minlength=len(CLASES))
    print(f"{nombre:<14} mín {conteo.min():>5} · máx {conteo.max():>5} por letra")
    assert conteo.min() > 0, f"Falta alguna letra en {nombre}"

# ------------------------------------------------------------
# 7. GUARDAR
# ------------------------------------------------------------
titulo("7. GUARDAR")
np.savez_compressed(
    SALIDA / "datos.npz",
    X_ent=normalizar(S_ent), y_ent=y_ent_i,
    X_val=normalizar(S_val), y_val=y_val_i,
    X_pru=normalizar(S_pru), y_pru=y_pru_i,
    # Las 57 medidas de siempre, para que la práctica 25 entrene el Random Forest con las mismas manos.
    F_ent=ent[MEDIDAS].to_numpy(np.float32), F_val=val[MEDIDAS].to_numpy(np.float32), F_pru=pru[MEDIDAS].to_numpy(np.float32),
    giro_pru=pru["giro"].fillna(-1).to_numpy(np.float32),
)
meta = {"clases": CLASES, "canales": ["u", "v", "r"], "puntos": 21, "medias": medias.tolist(), "escalas": escalas.tolist(), "medidas": MEDIDAS,
        "manos": {"entrenamiento": len(ent), "deP03": len(X_ent), "masivas": len(masivas), "validacion": len(val), "prueba": len(pru)}}
(SALIDA / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
print("resultados_cnn1d/datos.npz y meta.json")
actualizar("preparacion", {"manos": meta["manos"], "forma": [3, 21], "canales": meta["canales"], "clases": len(CLASES)})
print("\nSiguiente paso: python p24_entrenar_cnn1d.py")
