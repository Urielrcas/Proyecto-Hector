# ============================================================
# PRÁCTICA 24 · ENTRENAMIENTO DE UNA CNN 1D
# (adaptación de p24entrenamiento_cnn1d.py de SmartAcademy)
#
# Entrena con PyTorch una red convolucional 1D que reconoce la letra a partir de los
# 21 puntos de la mano (preparados en la práctica 23).
#
# La red (CNN 1D):
#   entrada (3 canales × 21 puntos)
#   → Conv1D 32 filtros (ventana de 3 puntos) + ReLU
#   → Conv1D 32 filtros + ReLU → MaxPool (21 → 10)
#   → Conv1D 64 filtros + ReLU → MaxPool (10 → 5)
#   → aplanar (64 × 5 = 320) → Densa 64 + ReLU + Dropout 30 %
#   → Densa 25 (una salida por forma de letra)
#
# Como en la práctica:
#   - Dataset y DataLoader de PyTorch (lotes de 128 manos, revueltos).
#   - GPU (CUDA) si hay; si no, el procesador.
#   - Early Stopping: si la validación no mejora en 8 épocas, se para y se queda el mejor modelo.
#   - La PRUEBA no se toca durante el entrenamiento ni para elegir el modelo.
#
# Además exporta la red a la app (frontend/src/lib/ia/cnn1d/modelo.json): la app la corre
# en el navegador con el mismo cálculo (cnn1d.ts), y trae una mano de ejemplo con lo que
# debe responder, para comprobar en las pruebas que el navegador calcula lo mismo que PyTorch.
#
# Entrada: resultados_cnn1d/datos.npz · Salida: resultados_cnn1d/modelo.pt, resultados/p24_*.png
# Requisitos: pip install torch
# ============================================================

import base64
import copy
import json
import random
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score  # noqa: E402
from torch.utils.data import DataLoader, TensorDataset  # noqa: E402

from app_json import actualizar  # noqa: E402
from p24_red import CNN1DManos  # noqa: E402

AQUI = Path(__file__).parent
DATOS = AQUI / "resultados_cnn1d"
RESULTADOS = AQUI / "resultados"
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "cnn1d"
SEMILLA = 42
LOTE = 128
EPOCAS_MAX = 80
PACIENCIA = 8
APRENDIZAJE = 1e-3


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


# ------------------------------------------------------------
# 1. SEMILLAS Y DISPOSITIVO
# ------------------------------------------------------------
titulo("1. SEMILLAS Y DISPOSITIVO")
random.seed(SEMILLA)
np.random.seed(SEMILLA)
torch.manual_seed(SEMILLA)
dispositivo = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Dispositivo:", dispositivo, f"({torch.cuda.get_device_name(0)})" if dispositivo.type == "cuda" else "(no hay GPU CUDA: se usa el procesador)")

# ------------------------------------------------------------
# 2. DATOS Y DATALOADERS
# ------------------------------------------------------------
titulo("2. DATOS")
d = np.load(DATOS / "datos.npz")
meta = json.loads((DATOS / "meta.json").read_text(encoding="utf-8"))
CLASES = meta["clases"]
tensores = {k: torch.from_numpy(d[k]) for k in ["X_ent", "y_ent", "X_val", "y_val", "X_pru", "y_pru"]}
ent = DataLoader(TensorDataset(tensores["X_ent"], tensores["y_ent"]), batch_size=LOTE, shuffle=True)
val = DataLoader(TensorDataset(tensores["X_val"], tensores["y_val"]), batch_size=512)
pru = DataLoader(TensorDataset(tensores["X_pru"], tensores["y_pru"]), batch_size=512)
print(f"Entrenamiento {len(ent.dataset):,} · validación {len(val.dataset):,} · prueba {len(pru.dataset):,} · lotes de {LOTE}")


# ------------------------------------------------------------
# 3. LA RED (definida en p24_red.py)
# ------------------------------------------------------------
titulo("3. LA RED")
modelo = CNN1DManos(len(CLASES)).to(dispositivo)
parametros = sum(p.numel() for p in modelo.parameters())
print(modelo)
print(f"Pesos que aprende: {parametros:,}")
perdida_fn = nn.CrossEntropyLoss()
optimizador = torch.optim.Adam(modelo.parameters(), lr=APRENDIZAJE)


def evaluar_perdida(cargador):
    modelo.eval()
    total, aciertos, n = 0.0, 0, 0
    with torch.no_grad():
        for xb, yb in cargador:
            xb, yb = xb.to(dispositivo), yb.to(dispositivo)
            salida = modelo(xb)
            total += perdida_fn(salida, yb).item() * len(yb)
            aciertos += (salida.argmax(1) == yb).sum().item()
            n += len(yb)
    return total / n, aciertos / n


# ------------------------------------------------------------
# 4. ENTRENAMIENTO CON EARLY STOPPING
# ------------------------------------------------------------
titulo("4. ENTRENAMIENTO (Early Stopping)")
historia, mejor, mejor_estado, sin_mejorar, inicio = [], float("inf"), None, 0, time.time()
for epoca in range(1, EPOCAS_MAX + 1):
    modelo.train()
    suma, aciertos, n = 0.0, 0, 0
    for xb, yb in ent:
        xb, yb = xb.to(dispositivo), yb.to(dispositivo)
        optimizador.zero_grad()
        salida = modelo(xb)
        perdida = perdida_fn(salida, yb)
        perdida.backward()
        optimizador.step()
        suma += perdida.item() * len(yb)
        aciertos += (salida.argmax(1) == yb).sum().item()
        n += len(yb)
    p_val, a_val = evaluar_perdida(val)
    historia.append({"epoca": epoca, "perdida": round(suma / n, 4), "exactitud": round(aciertos / n, 4), "perdidaVal": round(p_val, 4), "exactitudVal": round(a_val, 4)})
    marca = ""
    if p_val < mejor - 1e-4:
        mejor, mejor_estado, sin_mejorar, marca = p_val, copy.deepcopy(modelo.state_dict()), 0, "  ← mejor"
    else:
        sin_mejorar += 1
    print(f"Época {epoca:>2} | pérdida {suma / n:.4f} | exactitud {aciertos / n:.1%} | validación: pérdida {p_val:.4f}, exactitud {a_val:.1%}{marca}")
    if sin_mejorar >= PACIENCIA:
        print(f"Early Stopping: {PACIENCIA} épocas sin mejorar. Se queda la época {epoca - PACIENCIA}.")
        break
segundos = time.time() - inicio
modelo.load_state_dict(mejor_estado)
epoca_mejor = min(historia, key=lambda h: h["perdidaVal"])["epoca"]

# ------------------------------------------------------------
# 5. EXAMEN CON LA PRUEBA
# ------------------------------------------------------------
titulo("5. EXAMEN CON LA PRUEBA (manos que la red nunca vio)")
modelo.eval()
with torch.no_grad():
    pred = modelo(tensores["X_pru"].to(dispositivo)).argmax(1).cpu().numpy()
real = d["y_pru"]
examen = {
    "exactitud": accuracy_score(real, pred),
    "precision": precision_score(real, pred, average="macro", zero_division=0),
    "recall": recall_score(real, pred, average="macro", zero_division=0),
    "f1": f1_score(real, pred, average="macro", zero_division=0),
}
for k, v in examen.items():
    print(f"{k:<10} {v:.1%}")
matriz = confusion_matrix(real, pred, labels=range(len(CLASES)))
errores = [{"real": CLASES[i], "dijo": CLASES[j], "veces": int(matriz[i, j])} for i in range(len(CLASES)) for j in range(len(CLASES)) if i != j and matriz[i, j]]
errores.sort(key=lambda e: -e["veces"])
print("Confusiones más comunes:", ", ".join(f"{e['real']}→{e['dijo']} ({e['veces']})" for e in errores[:5]))

# ------------------------------------------------------------
# 6. GRÁFICAS Y GUARDADO
# ------------------------------------------------------------
titulo("6. GUARDAR")
RESULTADOS.mkdir(exist_ok=True)
fig, ejes = plt.subplots(1, 2, figsize=(11, 4))
ep = [h["epoca"] for h in historia]
ejes[0].plot(ep, [h["perdida"] for h in historia], label="entrenamiento")
ejes[0].plot(ep, [h["perdidaVal"] for h in historia], label="validación")
ejes[0].axvline(epoca_mejor, color="gray", ls="--", label=f"mejor (época {epoca_mejor})")
ejes[0].set_title("Pérdida")
ejes[0].legend()
ejes[1].plot(ep, [h["exactitud"] for h in historia], label="entrenamiento")
ejes[1].plot(ep, [h["exactitudVal"] for h in historia], label="validación")
ejes[1].set_title("Exactitud")
ejes[1].legend()
fig.suptitle("CNN 1D: curvas de entrenamiento")
fig.tight_layout()
fig.savefig(RESULTADOS / "p24_curvas_cnn1d.png", dpi=110)
fig, eje = plt.subplots(figsize=(8, 7))
eje.imshow(matriz, cmap="Blues")
eje.set_xticks(range(len(CLASES)), CLASES, rotation=90, fontsize=7)
eje.set_yticks(range(len(CLASES)), CLASES, fontsize=7)
eje.set_xlabel("La red dijo")
eje.set_ylabel("Letra real")
eje.set_title(f"CNN 1D · matriz de confusión (prueba, exactitud {examen['exactitud']:.1%})")
fig.tight_layout()
fig.savefig(RESULTADOS / "p24_matriz_confusion_cnn1d.png", dpi=110)
torch.save(mejor_estado, DATOS / "modelo.pt")
np.save(DATOS / "pred_pru_cnn1d.npy", pred)
print("resultados_cnn1d/modelo.pt · resultados/p24_curvas_cnn1d.png · resultados/p24_matriz_confusion_cnn1d.png")

# Exportar a la app: cada capa como números float32 en base64 (más ligero que una lista de texto).
capas = []
for nombre, tensor in mejor_estado.items():
    capas.append({"nombre": nombre, "forma": list(tensor.shape), "datos": base64.b64encode(tensor.cpu().numpy().astype("<f4").tobytes()).decode()})
# Mano de ejemplo para comprobar el cálculo del navegador: sus 40 posiciones SIN normalizar y lo que responde PyTorch.
muestra = d["X_pru"][0]
crudo = muestra * np.array(meta["escalas"])[:, None] + np.array(meta["medias"])[:, None]
with torch.no_grad():
    prob = torch.softmax(modelo(torch.from_numpy(muestra[None]).to(dispositivo)), 1)[0].cpu().numpy()
DESTINO_APP.mkdir(parents=True, exist_ok=True)
(DESTINO_APP / "modelo.json").write_text(json.dumps({
    "clases": CLASES,
    "medias": meta["medias"],
    "escalas": meta["escalas"],
    "capas": capas,
    "prueba": {"posiciones": [round(float(v), 6) for v in crudo[:2, 1:].T.reshape(-1)], "probabilidades": [round(float(p), 6) for p in prob]},
}, separators=(",", ":")), encoding="utf-8")
print("App: frontend/src/lib/ia/cnn1d/modelo.json", f"({(DESTINO_APP / 'modelo.json').stat().st_size / 1024:.0f} KB)")

actualizar("entrenamiento", {
    "dispositivo": dispositivo.type,
    "parametros": parametros,
    "epocas": len(historia),
    "epocaMejor": epoca_mejor,
    "paciencia": PACIENCIA,
    "lote": LOTE,
    "segundos": round(segundos, 1),
    "historia": historia,
    "examen": {k: round(v, 4) for k, v in examen.items()},
    "confusiones": errores[:8],
})
print("\nSiguiente paso: python p25_comparar_modelos.py")
