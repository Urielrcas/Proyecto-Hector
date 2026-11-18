# ============================================================
# PRACTICA 06 (adaptada a nuestro proyecto)
# OPTIMIZACION DE HIPERPARAMETROS
# ============================================================
#
# Pregunta: en la práctica 03-05 escogimos a mano algunas configuraciones (profundidad del árbol,
# 5 vecinos en el KNN, 200 árboles en el bosque). ¿Hay combinaciones mejores?
#
# Parámetro      → lo aprende el modelo solo al entrenar (por ejemplo, los umbrales del árbol).
# Hiperparámetro → lo decidimos NOSOTROS antes de entrenar (por ejemplo, cuántos vecinos mira el KNN).
#
# Etapas:
#   1. Datos (manos_limpias.csv) y la misma división que p03 (80 % para buscar, 20 % de prueba)
#   2. Validación cruzada estratificada de 5 partes (StratifiedKFold)
#   3. GridSearchCV: prueba TODAS las combinaciones de Árbol, Random Forest y KNN
#   4. RandomizedSearchCV: prueba solo algunas al azar (más rápido) y lo comparamos con GridSearch
#   5. Examen final con la prueba: configuración original (p03) contra la optimizada
#   6. Reporte, matriz de confusión y exportar los resultados a la app
#
# Se corre DESPUÉS de p03_modelo.py (usa sus resultados para comparar «antes y después»).

import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # para que la consola de Windows muestre acentos y flechas

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import randint
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "arbol"
SEMILLA = 42


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. DATOS (la misma división que p03, para que la comparación sea justa)
# ------------------------------------------------------------
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
y = df["letra"]
# Mismo random_state y misma proporción que p03 → exactamente las mismas manos de prueba.
X_bus, X_pru, y_bus, y_pru = train_test_split(X, y, test_size=0.20, random_state=SEMILLA, stratify=y)
titulo("1. DATOS")
print("Manos para buscar (entrenamiento + validación):", len(X_bus))
print("Manos de prueba (no se tocan hasta el final):  ", len(X_pru))

# ------------------------------------------------------------
# 2. VALIDACIÓN CRUZADA
# ------------------------------------------------------------
# Cada combinación se entrena 5 veces: cada vez una parte distinta sirve de validación.
# Estratificada = cada parte tiene la misma proporción de cada letra.
CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMILLA)

# ------------------------------------------------------------
# 3. LOS ALGORITMOS Y LOS HIPERPARÁMETROS QUE VAMOS A PROBAR
# ------------------------------------------------------------
# El KNN va dentro de un Pipeline con StandardScaler: así la escala se aprende solo con la parte de
# entrenamiento de cada vuelta (si escaláramos antes, la validación «se filtraría» al entrenamiento).
ALGORITMOS = {
    "arbol": {
        "nombre": "Árbol de decisión",
        "modelo": DecisionTreeClassifier(random_state=SEMILLA),
        "grid": {
            "max_depth": [8, 12, 16, 20, None],      # cuántas preguntas seguidas puede hacer
            "min_samples_split": [2, 5, 10],         # manos mínimas en un nodo para poder dividirlo
            "min_samples_leaf": [1, 3, 5],           # manos mínimas que debe tener cada hoja
            "criterion": ["gini", "entropy"],        # cómo mide qué tan «revuelto» está un nodo
        },
        "azar": {
            "max_depth": randint(6, 30),
            "min_samples_split": randint(2, 20),
            "min_samples_leaf": randint(1, 10),
            "criterion": ["gini", "entropy"],
        },
    },
    "bosque": {
        "nombre": "Random Forest",
        "modelo": RandomForestClassifier(n_jobs=-1, random_state=SEMILLA),
        "grid": {
            "n_estimators": [100, 200],              # cuántos árboles votan
            "max_depth": [20, None],
            "min_samples_leaf": [1, 2],
            "max_features": ["sqrt", "log2"],        # cuántas medidas mira cada árbol al dividir
        },
        "azar": {
            "n_estimators": randint(50, 300),
            "max_depth": [10, 20, 30, None],
            "min_samples_leaf": randint(1, 5),
            "max_features": ["sqrt", "log2"],
        },
    },
    "knn": {
        "nombre": "K vecinos (KNN)",
        "modelo": Pipeline([("escala", StandardScaler()), ("knn", KNeighborsClassifier())]),
        "grid": {
            "knn__n_neighbors": [1, 3, 5, 7, 9, 11, 15],  # cuántos vecinos votan
            "knn__weights": ["uniform", "distance"],      # todos valen igual o pesan más los cercanos
            "knn__metric": ["euclidean", "manhattan"],    # cómo se mide la distancia entre manos
        },
        "azar": {
            "knn__n_neighbors": randint(1, 25),
            "knn__weights": ["uniform", "distance"],
            "knn__metric": ["euclidean", "manhattan"],
        },
    },
}
ITERACIONES_AZAR = 15


def limpiar(params):
    """Quita el prefijo «knn__» del Pipeline y convierte None/numpy en algo que se pueda guardar en JSON."""
    return {k.split("__")[-1]: (v.item() if hasattr(v, "item") else v) for k, v in params.items()}


def combinaciones(grid):
    return int(np.prod([len(v) for v in grid.values()]))


# ------------------------------------------------------------
# 4. GRIDSEARCHCV (todas las combinaciones)
# ------------------------------------------------------------
titulo("3. GRIDSEARCHCV: TODAS LAS COMBINACIONES")
grid = {}
for clave, a in ALGORITMOS.items():
    inicio = time.perf_counter()
    busqueda = GridSearchCV(a["modelo"], param_grid=a["grid"], cv=CV, scoring="f1_macro", n_jobs=-1)
    busqueda.fit(X_bus, y_bus)
    segundos = time.perf_counter() - inicio
    grid[clave] = {"busqueda": busqueda, "segundos": segundos}
    print(f"{a['nombre']:<18} {combinaciones(a['grid']):>3} combinaciones × 5 partes = {combinaciones(a['grid']) * 5:>3} entrenamientos | {segundos:5.1f} s")
    print(f"{'':<18} mejor F1 (validación cruzada): {busqueda.best_score_:.1%}")
    print(f"{'':<18} mejores hiperparámetros: {limpiar(busqueda.best_params_)}")

# ------------------------------------------------------------
# 5. RANDOMIZEDSEARCHCV (solo algunas al azar)
# ------------------------------------------------------------
titulo(f"4. RANDOMIZEDSEARCHCV: {ITERACIONES_AZAR} COMBINACIONES AL AZAR")
azar = {}
for clave, a in ALGORITMOS.items():
    inicio = time.perf_counter()
    busqueda = RandomizedSearchCV(a["modelo"], param_distributions=a["azar"], n_iter=ITERACIONES_AZAR, cv=CV,
                                  scoring="f1_macro", n_jobs=-1, random_state=SEMILLA)
    busqueda.fit(X_bus, y_bus)
    segundos = time.perf_counter() - inicio
    azar[clave] = {"busqueda": busqueda, "segundos": segundos}
    g = grid[clave]
    print(f"{a['nombre']:<18} Grid {g['busqueda'].best_score_:.1%} en {g['segundos']:5.1f} s | Random {busqueda.best_score_:.1%} en {segundos:5.1f} s")
    print(f"{'':<18} Random eligió: {limpiar(busqueda.best_params_)}")

# ------------------------------------------------------------
# 6. EL MEJOR ALGORITMO Y EL EXAMEN FINAL
# ------------------------------------------------------------
# GridSearchCV ya reentrenó cada modelo con TODO el 80 % usando sus mejores hiperparámetros (refit).
GANADOR = max(grid, key=lambda k: grid[k]["busqueda"].best_score_)
titulo("5. EXAMEN FINAL CON LA PRUEBA: ANTES (p03) Y DESPUÉS (optimizado)")

# «Antes» = el examen que guardó p03_modelo.py con sus configuraciones elegidas a mano.
METRICAS_P03 = json.loads((DESTINO_APP / "metricas.json").read_text(encoding="utf-8"))
examen = []
for clave, a in ALGORITMOS.items():
    pred = grid[clave]["busqueda"].predict(X_pru)
    antes = METRICAS_P03["examen"][clave]
    despues = {"exactitud": accuracy_score(y_pru, pred), "f1": f1_score(y_pru, pred, average="macro")}
    examen.append({"modelo": clave, "antes": antes, "despues": despues})
    print(f"{a['nombre']:<18} antes: exactitud {antes['exactitud']:.1%} F1 {antes['f1']:.1%}  →  "
          f"después: exactitud {despues['exactitud']:.1%} F1 {despues['f1']:.1%}  ({despues['f1'] - antes['f1']:+.1%})"
          + ("   ← ganador" if clave == GANADOR else ""))

# ¿Qué tan seguro es el ganador? Su F1 en cada una de las 5 partes.
res = grid[GANADOR]["busqueda"].cv_results_
i_mejor = grid[GANADOR]["busqueda"].best_index_
particiones = [float(res[f"split{i}_test_score"][i_mejor]) for i in range(5)]
print(f"\nGanador: {ALGORITMOS[GANADOR]['nombre']} · F1 por partición: {np.round(particiones, 3)} "
      f"(promedio {np.mean(particiones):.1%} ± {np.std(particiones):.1%})")

# ------------------------------------------------------------
# 7. REPORTE Y MATRIZ DE CONFUSIÓN DEL GANADOR
# ------------------------------------------------------------
pred_ganador = grid[GANADOR]["busqueda"].predict(X_pru)
titulo(f"6. REPORTE DE CLASIFICACIÓN ({ALGORITMOS[GANADOR]['nombre']} optimizado)")
print(classification_report(y_pru, pred_ganador, zero_division=0))

letras = sorted(y.unique())
mc = confusion_matrix(y_pru, pred_ganador, labels=letras)
fig, ax = plt.subplots(figsize=(10, 8.5), dpi=120)
ax.imshow(mc, cmap="Greens")
ax.set_xticks(range(len(letras)), letras, rotation=90, fontsize=8)
ax.set_yticks(range(len(letras)), letras, fontsize=8)
ax.set_xlabel("Lo que dijo el modelo")
ax.set_ylabel("La letra real")
ax.set_title(f"{ALGORITMOS[GANADOR]['nombre']} optimizado · exactitud {accuracy_score(y_pru, pred_ganador):.0%}", loc="left")
for i in range(len(letras)):
    for j in range(len(letras)):
        if mc[i, j]:
            ax.text(j, i, mc[i, j], ha="center", va="center", fontsize=6, color="white" if mc[i, j] > mc.max() / 2 else "#1c1917")
fig.tight_layout()
fig.savefig(RESULTADOS / "p06_matriz_confusion_optimizado.png")
plt.close(fig)

# Gráfica: Grid contra Random (F1 y tiempo) y antes contra después.
nombres = [ALGORITMOS[k]["nombre"] for k in ALGORITMOS]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5), dpi=120)
xs = np.arange(len(nombres))
ax1.bar(xs - 0.2, [grid[k]["busqueda"].best_score_ for k in ALGORITMOS], 0.4, label="GridSearchCV")
ax1.bar(xs + 0.2, [azar[k]["busqueda"].best_score_ for k in ALGORITMOS], 0.4, label="RandomizedSearchCV")
ax1.set_xticks(xs, nombres)
ax1.set_ylim(0.8, 1)
ax1.set_title("Mejor F1 en validación cruzada", loc="left")
ax1.legend()
ax2.bar(xs - 0.2, [e["antes"]["f1"] for e in examen], 0.4, label="Antes (p03)", color="#a8a29e")
ax2.bar(xs + 0.2, [e["despues"]["f1"] for e in examen], 0.4, label="Optimizado (p06)", color="#15803d")
ax2.set_xticks(xs, nombres)
ax2.set_ylim(0.8, 1)
ax2.set_title("F1 en la prueba: antes y después", loc="left")
ax2.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p06_grid_vs_random.png")
plt.close(fig)
print("Gráficas guardadas en resultados/ (p06_grid_vs_random.png y p06_matriz_confusion_optimizado.png)")

# ------------------------------------------------------------
# 8. EXPORTAR PARA LA APP
# ------------------------------------------------------------
r4 = lambda v: round(float(v), 4)  # noqa: E731


def top(busqueda, n=5):
    """Las n mejores combinaciones según la validación cruzada."""
    r = busqueda.cv_results_
    orden = np.argsort(r["rank_test_score"])[:n]
    return [{"params": limpiar(r["params"][i]), "f1": r4(r["mean_test_score"][i]), "desviacion": r4(r["std_test_score"][i])} for i in orden]


salida = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "manos": {"busqueda": len(X_bus), "prueba": len(X_pru)},
    "particiones": 5,
    "busquedas": [
        {
            "modelo": k,
            "grid": {p.split("__")[-1]: v for p, v in a["grid"].items()},
            "combinaciones": combinaciones(a["grid"]),
            "mejores": limpiar(grid[k]["busqueda"].best_params_),
            "f1": r4(grid[k]["busqueda"].best_score_),
            "segundos": round(grid[k]["segundos"], 1),
            "top": top(grid[k]["busqueda"]),
            "azar": {
                "iteraciones": ITERACIONES_AZAR,
                "mejores": limpiar(azar[k]["busqueda"].best_params_),
                "f1": r4(azar[k]["busqueda"].best_score_),
                "segundos": round(azar[k]["segundos"], 1),
            },
        }
        for k, a in ALGORITMOS.items()
    ],
    "examen": [{"modelo": e["modelo"], "antes": {k: r4(e["antes"][k]) for k in ("exactitud", "f1")}, "despues": {k: r4(v) for k, v in e["despues"].items()}} for e in examen],
    "ganador": GANADOR,
    "particionesGanador": [r4(v) for v in particiones],
}
(DESTINO_APP / "hiperparametros.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
titulo("7. EXPORTADO A LA APP")
print("frontend/src/lib/ia/arbol/hiperparametros.json")
print("\nRecuerda: GridSearch garantiza la mejor combinación DE LAS QUE LE DIMOS, no la mejor que existe.")
print("RandomizedSearch es más rápido cuando hay muchas combinaciones y casi siempre queda muy cerca.")
