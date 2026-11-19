# ============================================================
# PRÁCTICA 27 · CNN 1D PARA REGRESIÓN (predecir el siguiente intento)
# (adaptación de p27entrenamiento_prediccion_cnn.py de SmartAcademy)
#
# Problema de REGRESIÓN: la salida no es una clase sino un número (el puntaje 0 a 100 del
# siguiente intento), a partir de los dos intentos anteriores (práctica 26).
#
# La red:  entrada (3 canales × 2 intentos)
#          → Conv1D 16 filtros (ventana de 2: mira los dos intentos juntos) + ReLU
#          → Densa 16 + ReLU → Densa 1 (el puntaje)
# Pérdida: error cuadrático medio (MSE). Early Stopping con la validación.
#
# Métricas (como en la práctica): MAE (error promedio en puntos), RMSE y R².
# Se compara contra dos «adivinanzas sencillas» para saber si la red sirve de algo:
#   - repetir el puntaje del último intento,
#   - el promedio de los dos intentos.
#
# El modelo se exporta al BACKEND (backend/app/datos/prediccion_intentos.json): el servidor
# lo usa en el expediente de cada usuario para decirle cómo le irá en su próximo intento.
#
# Entrada: resultados_prediccion/datos.npz · Salida: resultados/p27_*.png
# ============================================================

import base64
import copy
import json
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score  # noqa: E402
from torch.utils.data import DataLoader, Dataset  # noqa: E402

from app_json import actualizar  # noqa: E402

AQUI = Path(__file__).parent
DATOS = AQUI / "resultados_prediccion"
RESULTADOS = AQUI / "resultados"
DESTINO_BACKEND = AQUI.parent / "backend" / "app" / "datos" / "prediccion_intentos.json"
SEMILLA = 27
PACIENCIA = 6
torch.manual_seed(SEMILLA)
np.random.seed(SEMILLA)


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


class DatasetIntentos(Dataset):
    """Cada ejemplo: dos intentos (3 × 2) y el puntaje del siguiente, de 0 a 1."""

    def __init__(self, X, y):
        self.X = torch.from_numpy(X)
        self.y = torch.from_numpy(y / 100).unsqueeze(1)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, i):
        return self.X[i], self.y[i]


class CNNRegresionIntentos(nn.Module):
    def __init__(self):
        super().__init__()
        self.red = nn.Sequential(nn.Conv1d(3, 16, kernel_size=2), nn.ReLU(), nn.Flatten(), nn.Linear(16, 16), nn.ReLU(), nn.Linear(16, 1))

    def forward(self, x):
        return self.red(x)


titulo("1. DATOS")
d = np.load(DATOS / "datos.npz")
ent = DataLoader(DatasetIntentos(d["X_ent"], d["y_ent"]), batch_size=256, shuffle=True)
val = DataLoader(DatasetIntentos(d["X_val"], d["y_val"]), batch_size=2048)
print(f"Entrenamiento {len(ent.dataset):,} · validación {len(val.dataset):,} · prueba {len(d['y_pru']):,}")

titulo("2. ENTRENAMIENTO")
modelo = CNNRegresionIntentos()
print(modelo)
print("Pesos que aprende:", sum(p.numel() for p in modelo.parameters()))
optimizador = torch.optim.Adam(modelo.parameters(), lr=3e-3)
mse = nn.MSELoss()
historia, mejor, mejor_estado, sin_mejorar, inicio = [], float("inf"), None, 0, time.time()
for epoca in range(1, 61):
    modelo.train()
    suma = 0.0
    for xb, yb in ent:
        optimizador.zero_grad()
        perdida = mse(modelo(xb), yb)
        perdida.backward()
        optimizador.step()
        suma += perdida.item() * len(yb)
    modelo.eval()
    with torch.no_grad():
        p_val = sum(mse(modelo(xb), yb).item() * len(yb) for xb, yb in val) / len(val.dataset)
    historia.append({"epoca": epoca, "perdida": round(suma / len(ent.dataset), 5), "perdidaVal": round(p_val, 5)})
    marca = ""
    if p_val < mejor - 1e-5:
        mejor, mejor_estado, sin_mejorar, marca = p_val, copy.deepcopy(modelo.state_dict()), 0, "  ← mejor"
    else:
        sin_mejorar += 1
    print(f"Época {epoca:>2} | MSE {suma / len(ent.dataset):.4f} | validación {p_val:.4f}{marca}")
    if sin_mejorar >= PACIENCIA:
        print(f"Early Stopping: {PACIENCIA} épocas sin mejorar.")
        break
segundos = time.time() - inicio
modelo.load_state_dict(mejor_estado)

titulo("3. EXAMEN CON LA PRUEBA (personas que la red nunca vio)")
modelo.eval()
with torch.no_grad():
    pred = np.clip(modelo(torch.from_numpy(d["X_pru"])).numpy().ravel() * 100, 0, 100)
real = d["y_pru"]
promedio2 = (d["X_pru"][:, 0, 0] + d["X_pru"][:, 0, 1]) / 2 * 100


def medir(p):
    return {"mae": float(mean_absolute_error(real, p)), "rmse": float(np.sqrt(mean_squared_error(real, p))), "r2": float(r2_score(real, p))}


examen = {"cnn": medir(pred), "ultimo": medir(d["ultimo_pru"]), "promedio": medir(promedio2)}
for nombre, etiqueta in [("cnn", "CNN 1D"), ("ultimo", "Repetir el último"), ("promedio", "Promedio de los 2")]:
    m = examen[nombre]
    print(f"{etiqueta:<18} MAE {m['mae']:5.1f} puntos · RMSE {m['rmse']:5.1f} · R² {m['r2']:.3f}")

titulo("4. GRÁFICAS Y EXPORTACIÓN")
RESULTADOS.mkdir(exist_ok=True)
fig, ejes = plt.subplots(1, 2, figsize=(11, 4))
ejes[0].plot([h["perdida"] for h in historia], label="entrenamiento")
ejes[0].plot([h["perdidaVal"] for h in historia], label="validación")
ejes[0].set_title("MSE por época")
ejes[0].legend()
# Puntaje real contra predicho (promedio por puntaje real, con su dispersión).
niveles = sorted(set(real))
ejes[1].boxplot([pred[real == n] for n in niveles], positions=niveles, widths=8)
ejes[1].plot([0, 100], [0, 100], "--", color="gray")
ejes[1].set_xlabel("Puntaje real del siguiente intento")
ejes[1].set_ylabel("Puntaje que predijo la red")
ejes[1].set_title(f"Predicción (MAE {examen['cnn']['mae']:.1f} puntos)")
fig.tight_layout()
fig.savefig(RESULTADOS / "p27_prediccion_intentos.png", dpi=110)
print("resultados/p27_prediccion_intentos.png")

# Exportar al backend: pesos en base64 (float32) y un ejemplo para comprobar el cálculo en Python puro.
DESTINO_BACKEND.parent.mkdir(parents=True, exist_ok=True)
capas = {nombre: {"forma": list(t.shape), "datos": base64.b64encode(t.numpy().astype("<f4").tobytes()).decode()} for nombre, t in mejor_estado.items()}
ejemplo = d["X_pru"][0]
with torch.no_grad():
    salida = float(modelo(torch.from_numpy(ejemplo[None])).item() * 100)
meta = json.loads((DATOS / "meta.json").read_text(encoding="utf-8"))
DESTINO_BACKEND.write_text(json.dumps({
    "descripcion": "CNN 1D de regresión (ml/p27_entrenar_prediccion.py): puntaje del siguiente intento a partir de los dos anteriores.",
    "canales": meta["canales"], "maxSegundos": meta["maxSegundos"], "mae": round(examen["cnn"]["mae"], 2),
    "capas": capas,
    "prueba": {"entrada": ejemplo.tolist(), "salida": round(salida, 4)},
}, indent=1), encoding="utf-8")
print("Backend: backend/app/datos/prediccion_intentos.json")

actualizar("prediccion", {
    "epocas": len(historia), "segundos": round(segundos, 1),
    "parametros": sum(p.numel() for p in modelo.parameters()),
    "historia": historia,
    "examen": {k: {m: round(v, 3) for m, v in e.items()} for k, e in examen.items()},
    "ejemplos": [{"intento1": int(round(float(d["X_pru"][i, 0, 0]) * 100)), "intento2": int(round(float(d["X_pru"][i, 0, 1]) * 100)),
                  "real": int(real[i]), "predicho": round(float(pred[i]))} for i in range(0, 600, 75)],
})
