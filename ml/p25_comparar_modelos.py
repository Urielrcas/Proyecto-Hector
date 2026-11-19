# ============================================================
# PRÁCTICA 25 · COMPARACIÓN DE MODELOS DE IA
# (adaptación de p25comparacion_modelos.py de SmartAcademy)
#
# Compara la CNN 1D (PyTorch, práctica 24) contra un Random Forest (scikit-learn) usando
# EXACTAMENTE los mismos conjuntos de entrenamiento, validación y prueba.
#   - CNN 1D: ve la mano como secuencia de 21 puntos.
#   - Random Forest: ve las 57 medidas de siempre (posiciones, ángulos y distancias),
#     con los mejores hiperparámetros de la práctica 06 (200 árboles, log2).
# Además pone a su lado lo que ya usa la app (árbol, KNN, reglas y su votación),
# examinados en p03 con las MISMAS manos de prueba.
#
# Mide: exactitud, precisión, recall, F1, tiempo de entrenamiento, tiempo por mano y
# qué tan bien le va a cada uno con manos muy giradas.
#
# Entrada: resultados_cnn1d/ · Salida: resultados/p25_comparacion.png y .csv
# ============================================================

import json
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import torch  # noqa: E402
from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score  # noqa: E402

from app_json import actualizar  # noqa: E402
from p24_red import CNN1DManos  # noqa: E402

AQUI = Path(__file__).parent
DATOS = AQUI / "resultados_cnn1d"
RESULTADOS = AQUI / "resultados"
METRICAS_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "arbol" / "metricas.json"
SEMILLA = 42


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


def metricas(real, pred):
    return {
        "exactitud": accuracy_score(real, pred),
        "precision": precision_score(real, pred, average="macro", zero_division=0),
        "recall": recall_score(real, pred, average="macro", zero_division=0),
        "f1": f1_score(real, pred, average="macro", zero_division=0),
    }


titulo("1. LOS MISMOS DATOS PARA LOS DOS")
d = np.load(DATOS / "datos.npz")
meta = json.loads((DATOS / "meta.json").read_text(encoding="utf-8"))
print(f"Entrenamiento {len(d['y_ent']):,} · validación {len(d['y_val']):,} · prueba {len(d['y_pru']):,}")

titulo("2. CNN 1D (ya entrenada en la práctica 24)")
red = CNN1DManos(len(meta["clases"]))
red.load_state_dict(torch.load(DATOS / "modelo.pt"))
red.eval()
historia = json.loads((AQUI.parent / "frontend" / "src" / "lib" / "ia" / "cnn1d" / "practicas.json").read_text(encoding="utf-8"))["entrenamiento"]
inicio = time.perf_counter()
with torch.no_grad():
    pred_cnn = red(torch.from_numpy(d["X_pru"])).argmax(1).numpy()
ms_cnn = (time.perf_counter() - inicio) / len(pred_cnn) * 1000
with torch.no_grad():
    val_cnn = metricas(d["y_val"], red(torch.from_numpy(d["X_val"])).argmax(1).numpy())
res = {"cnn1d": {**metricas(d["y_pru"], pred_cnn), "validacion": val_cnn["f1"], "segundosEntrenar": historia["segundos"], "msPorMano": ms_cnn, "parametros": historia["parametros"]}}
print(f"F1 prueba {res['cnn1d']['f1']:.1%}")

titulo("3. RANDOM FOREST (mismas manos, 57 medidas)")
bosque = RandomForestClassifier(n_estimators=200, max_features="log2", min_samples_leaf=1, n_jobs=-1, random_state=SEMILLA)
inicio = time.perf_counter()
bosque.fit(d["F_ent"], d["y_ent"])
seg_rf = time.perf_counter() - inicio
inicio = time.perf_counter()
pred_rf = bosque.predict(d["F_pru"])
ms_rf = (time.perf_counter() - inicio) / len(pred_rf) * 1000
nodos = sum(a.tree_.node_count for a in bosque.estimators_)
res["bosque"] = {**metricas(d["y_pru"], pred_rf), "validacion": metricas(d["y_val"], bosque.predict(d["F_val"]))["f1"], "segundosEntrenar": seg_rf, "msPorMano": ms_rf, "parametros": nodos}
print(f"F1 prueba {res['bosque']['f1']:.1%} · {seg_rf:.1f} s para entrenar · {nodos:,} nodos")

titulo("4. LO QUE YA USA LA APP (examinado en p03 con las mismas manos de prueba)")
app = json.loads(METRICAS_APP.read_text(encoding="utf-8"))["examen"]
for nombre in ["votacion", "arbol", "knn", "reglas"]:
    print(f"{nombre:<9} F1 {app[nombre]['f1']:.1%}")

titulo("5. ¿CON MANOS MUY GIRADAS?")
giro = d["giro_pru"]
tramos = [("0-10°", (giro >= 0) & (giro < 10)), ("10-20°", (giro >= 10) & (giro < 20)), ("20-35°", giro >= 20)]
por_giro = []
for nombre, m in tramos:
    fila = {"tramo": nombre, "manos": int(m.sum()), "cnn1d": float((pred_cnn[m] == d["y_pru"][m]).mean()), "bosque": float((pred_rf[m] == d["y_pru"][m]).mean())}
    por_giro.append(fila)
    print(f"{nombre:<7} {fila['manos']:>4} manos · CNN 1D {fila['cnn1d']:.1%} · Random Forest {fila['bosque']:.1%}")

titulo("6. RESULTADO")
tabla = pd.DataFrame(
    [{"modelo": "CNN 1D", **{k: res["cnn1d"][k] for k in ["exactitud", "precision", "recall", "f1"]}},
     {"modelo": "Random Forest", **{k: res["bosque"][k] for k in ["exactitud", "precision", "recall", "f1"]}},
     *[{"modelo": f"App: {n}", **app[n]} for n in ["votacion", "arbol", "knn", "reglas"]]]
)
print(tabla.round(3).to_string(index=False))
ganador = "cnn1d" if res["cnn1d"]["f1"] >= res["bosque"]["f1"] else "bosque"
supera_app = res["cnn1d"]["f1"] > app["votacion"]["f1"]
print(f"\nGana: {'CNN 1D' if ganador == 'cnn1d' else 'Random Forest'}.",
      "La CNN 1D supera a la votación de la app: se agrega al traductor." if supera_app else "La CNN 1D no supera a la votación de la app.")
RESULTADOS.mkdir(exist_ok=True)
tabla.to_csv(RESULTADOS / "p25_comparacion.csv", index=False)

fig, eje = plt.subplots(figsize=(9, 4.5))
x = np.arange(len(tabla))
for i, (k, color) in enumerate([("exactitud", "#0f766e"), ("f1", "#f59e0b")]):
    eje.bar(x + (i - 0.5) * 0.38, tabla[k], 0.38, label=k.capitalize(), color=color)
eje.set_xticks(x, tabla["modelo"], rotation=15)
eje.set_ylim(0.5, 1)
eje.set_title("CNN 1D contra Random Forest y los modelos de la app (mismas manos de prueba)")
eje.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p25_comparacion.png", dpi=110)
print("resultados/p25_comparacion.png y .csv")

redondear = lambda m: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items()}  # noqa: E731
actualizar("comparacion", {
    "modelos": {"cnn1d": redondear(res["cnn1d"]), "bosque": redondear(res["bosque"])},
    "app": {n: redondear(app[n]) for n in ["votacion", "arbol", "knn", "reglas"]},
    "porGiro": [redondear(f) for f in por_giro],
    "ganador": ganador,
    "superaApp": bool(supera_app),
})
