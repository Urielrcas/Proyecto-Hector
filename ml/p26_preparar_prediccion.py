# ============================================================
# PRÁCTICA 26 · PREPARACIÓN DE DATOS PARA PREDICCIÓN
# (adaptación de p26preparacion_prediccion_cnn.py de SmartAcademy)
#
# En la práctica se estimaba la calificación del parcial 3 usando SOLO los parciales 1 y 2
# (calificación y asistencia de cada uno).
# Aquí se estima el PUNTAJE DEL SIGUIENTE INTENTO de una letra usando SOLO los dos
# intentos anteriores de esa misma letra:
#
#   intento 1 → (puntaje, segundos, ¿la logró?)
#   intento 2 → (puntaje, segundos, ¿la logró?)      ⟹  puntaje del intento 3 (0 a 100)
#
# Así la app puede decir, por ejemplo: «En tu próximo intento de la R calculo un 80 %:
# ya casi la tienes».
#
# Datos: intentos simulados (simulacion_intentos.py) + los intentos reales de la app
# si se corre con --mongo (colección «intentos»).
# Cada par de intentos seguidos de la misma persona y letra da un ejemplo (ventana deslizante).
# División POR PERSONA (GroupShuffleSplit): nadie aparece en dos conjuntos; si no, la red
# «conocería» a la persona y el examen saldría mejor de lo que es.
#
# Salida: resultados_prediccion/datos.npz, datos/intentos_simulados.csv
# ============================================================

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

from app_json import actualizar
from simulacion_intentos import simular

AQUI = Path(__file__).parent
SALIDA = AQUI / "resultados_prediccion"
SALIDA.mkdir(exist_ok=True)
SEMILLA = 26
MAX_SEGUNDOS = 30  # los segundos se dividen entre esto para quedar de 0 a 1


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


titulo("1. INTENTOS")
intentos = simular(usuarios=2000, semilla=SEMILLA)
intentos.to_csv(AQUI / "datos" / "intentos_simulados.csv", index=False)
print(f"Simulados: {len(intentos):,} intentos de {intentos['usuario'].nunique():,} personas")
if "--mongo" in sys.argv:
    from p16_consultas_intentos import conectar  # misma conexión que la práctica 16

    reales = pd.DataFrame(list(conectar()["intentos"].find({}, {"_id": 0})))
    if len(reales):
        reales["usuario"] = reales["usuario_id"].astype(str)
        intentos = pd.concat([intentos, reales[intentos.columns.intersection(reales.columns)]], ignore_index=True)
        print(f"Reales de la app: {len(reales):,}")

titulo("2. VENTANAS DE 3 INTENTOS SEGUIDOS")
intentos = intentos.sort_values(["usuario", "letra", "fecha"]).reset_index(drop=True)
intentos["logro"] = intentos["acierto"].astype(float)
intentos["puntaje01"] = intentos["puntaje"] / 100
intentos["segundos01"] = np.clip(intentos["segundos"], 0, MAX_SEGUNDOS) / MAX_SEGUNDOS
X, y, grupos, ultimo = [], [], [], []
for (usuario, _letra), g in intentos.groupby(["usuario", "letra"], sort=False):
    v = g[["puntaje01", "segundos01", "logro"]].to_numpy(np.float32)
    p = g["puntaje"].to_numpy(np.float32)
    for i in range(len(g) - 2):
        X.append(v[i : i + 2].T)  # (3 canales, 2 intentos): como (calificación/asistencia, parcial 1/2)
        y.append(p[i + 2])
        grupos.append(usuario)
        ultimo.append(p[i + 1])
X = np.stack(X)
y = np.array(y, np.float32)
grupos = np.array(grupos)
ultimo = np.array(ultimo, np.float32)
print(f"Ejemplos: {len(X):,} · forma {X.shape[1:]} (canales: puntaje, segundos, logro × 2 intentos)")
print(f"Puntaje a predecir: promedio {y.mean():.1f}, de {y.min():.0f} a {y.max():.0f}")

titulo("3. DIVISIÓN POR PERSONA (70 / 15 / 15)")
ent_i, resto = next(GroupShuffleSplit(1, test_size=0.30, random_state=SEMILLA).split(X, y, grupos))
val_r, pru_r = next(GroupShuffleSplit(1, test_size=0.50, random_state=SEMILLA).split(X[resto], y[resto], grupos[resto]))
val_i, pru_i = resto[val_r], resto[pru_r]
assert not set(grupos[ent_i]) & set(grupos[pru_i]), "Una persona quedó en entrenamiento y prueba"
for nombre, idx in [("entrenamiento", ent_i), ("validación", val_i), ("prueba", pru_i)]:
    print(f"{nombre:<14} {len(idx):>6,} ejemplos · {len(set(grupos[idx])):>5,} personas")

titulo("4. GUARDAR")
np.savez_compressed(SALIDA / "datos.npz", X_ent=X[ent_i], y_ent=y[ent_i], X_val=X[val_i], y_val=y[val_i], X_pru=X[pru_i], y_pru=y[pru_i], ultimo_pru=ultimo[pru_i])
(SALIDA / "meta.json").write_text(json.dumps({"canales": ["puntaje", "segundos", "logro"], "maxSegundos": MAX_SEGUNDOS}, indent=1), encoding="utf-8")
print("resultados_prediccion/datos.npz · datos/intentos_simulados.csv")
actualizar("prediccionDatos", {"intentos": len(intentos), "personas": int(intentos["usuario"].nunique()), "ejemplos": len(X),
                                "entrenamiento": len(ent_i), "validacion": len(val_i), "prueba": len(pru_i)})
print("\nSiguiente paso: python p27_entrenar_prediccion.py")
