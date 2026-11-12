# ============================================================
# PRACTICAS 03, 04 y 05 (adaptadas a nuestro proyecto)
# MACHINE LEARNING PARA RECONOCER LETRAS DE LSM
# ============================================================
#
# Pregunta: ¿qué reconoce mejor las letras, las reglas que escribimos a mano
# (una por letra, en frontend/src/lib/vision/postura.ts) o un modelo que aprende
# de ejemplos? ¿Y cuál modelo conviene?
#
# Etapas:
#   1. Datos (manos_limpias.csv, de la práctica 2)
#   2. Separar entrenamiento (60 %), validación (20 %) y prueba (20 %)        ← práctica 04
#   3. Elegir la profundidad del árbol con la validación (sobreajuste/subajuste) ← práctica 04
#   4. Comparar Árbol, Random Forest y KNN y elegir el mejor por F1             ← práctica 05
#   5. Experimentos A, B y C (vecinos, árboles del bosque, profundidad)         ← práctica 05
#   6. Reentrenar con entrenamiento + validación y examinar con la prueba       ← prácticas 04 y 05
#   7. Validación cruzada del ganador                                           ← prácticas 04 y 05
#   8. Comparar con las reglas fijas, matrices de confusión, caso real
#   9. Exportar el árbol y el KNN para que la app los use
#
# Los datos de entrenamiento salen de la mano 3D de la app en miles de posiciones. Con
# grabaciones reales (calibración) el modelo se volvería a entrenar con este mismo programa.

import base64
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
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


def metricas_de(real, pred):
    """Exactitud y, como son 25 letras, precision/recall/F1 promediados por letra (macro)."""
    return {
        "exactitud": accuracy_score(real, pred),
        "precision": precision_score(real, pred, average="macro", zero_division=0),
        "recall": recall_score(real, pred, average="macro", zero_division=0),
        "f1": f1_score(real, pred, average="macro", zero_division=0),
    }


# ------------------------------------------------------------
# 1. DATOS
# ------------------------------------------------------------
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
y = df["letra"]
titulo("1. DATOS")
print("Manos:", len(df), "| medidas por mano:", len(COLUMNAS_X), "| letras:", y.nunique())

# ------------------------------------------------------------
# 2. ENTRENAMIENTO, VALIDACIÓN Y PRUEBA (práctica 04)
# ------------------------------------------------------------
# Entrenamiento: para aprender. Validación: para escoger la configuración y el algoritmo.
# Prueba: el examen final, no se toca hasta el final.
# stratify: que las tres partes tengan la misma proporción de cada letra.
X_tmp, X_pru, y_tmp, y_pru = train_test_split(X, y, test_size=0.20, random_state=SEMILLA, stratify=y)
X_ent, X_val, y_ent, y_val = train_test_split(X_tmp, y_tmp, test_size=0.25, random_state=SEMILLA, stratify=y_tmp)
titulo("2. DIVISIÓN DE LOS DATOS (60 / 20 / 20)")
print("Entrenamiento:", len(X_ent))
print("Validación:   ", len(X_val))
print("Prueba:       ", len(X_pru))

# ------------------------------------------------------------
# 3. ¿QUÉ PROFUNDIDAD DEL ÁRBOL? (práctica 04 y experimento C de la 05)
# ------------------------------------------------------------
# Un árbol muy chico no alcanza a aprender (subajuste); uno muy profundo se aprende los datos
# de memoria y falla con manos nuevas (sobreajuste). Lo decide la validación, no nosotros.
PROFUNDIDADES = [2, 3, 5, 8, 12, 16, None]
profundidades = []
for prof in PROFUNDIDADES:
    a = DecisionTreeClassifier(max_depth=prof, min_samples_leaf=3, random_state=SEMILLA).fit(X_ent, y_ent)
    ent = accuracy_score(y_ent, a.predict(X_ent))
    val = accuracy_score(y_val, a.predict(X_val))
    brecha = ent - val
    # Indicadores de clase (no una prueba definitiva). Con 25 letras, adivinar al azar da 4 %.
    if ent < 0.75 and val < 0.75:
        diagnostico = "subajuste"
    elif brecha > 0.10:
        diagnostico = "sobreajuste"
    else:
        diagnostico = "buen ajuste"
    profundidades.append({"profundidad": "Sin límite" if prof is None else str(prof), "valor": prof, "profundidadReal": int(a.get_depth()),
                          "entrenamiento": ent, "validacion": val, "brecha": brecha, "diagnostico": diagnostico})

titulo("3. PROFUNDIDAD DEL ÁRBOL: ENTRENAMIENTO VS VALIDACIÓN")
for p in profundidades:
    print(f"Profundidad {p['profundidad']:>10}: entrenamiento {p['entrenamiento']:.1%} | validación {p['validacion']:.1%} | brecha {p['brecha']:+.1%} → {p['diagnostico']}")

# Gana la mejor validación. Si otra más chica queda a menos de medio punto, preferimos la chica:
# acierta lo mismo, pesa menos en la app y se memoriza menos los datos.
mejor_val = max(p["validacion"] for p in profundidades)
elegida = next(p for p in profundidades if p["validacion"] >= mejor_val - 0.005)
MEJOR_PROF = elegida["valor"]
print(f"\nProfundidad elegida: {elegida['profundidad']} (validación {elegida['validacion']:.1%})")

fig, ax = plt.subplots(figsize=(9, 5), dpi=120)
xs = range(len(profundidades))
ax.plot(xs, [p["entrenamiento"] for p in profundidades], marker="o", linewidth=2, label="Entrenamiento")
ax.plot(xs, [p["validacion"] for p in profundidades], marker="s", linewidth=2, label="Validación")
ax.set_xticks(list(xs), [p["profundidad"] for p in profundidades])
ax.set_xlabel("Profundidad del árbol")
ax.set_ylabel("Exactitud")
ax.set_ylim(0, 1.05)
ax.grid(True, linestyle="--", alpha=0.5)
ax.set_title("Árbol de decisión: ¿dónde empieza a memorizar?", loc="left")
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "profundidad_entrenamiento_vs_validacion.png")
plt.close(fig)

# ------------------------------------------------------------
# 4. COMPARAR TRES ALGORITMOS CON LA VALIDACIÓN (práctica 05)
# ------------------------------------------------------------
# KNN mide distancias: sin escalar, los ángulos (0 a 180) se comían a las posiciones (0 a 1).
# El Pipeline escala con lo que aprende del entrenamiento y luego aplica KNN.
MODELOS = {
    "arbol": DecisionTreeClassifier(max_depth=MEJOR_PROF, min_samples_leaf=3, random_state=SEMILLA),
    "bosque": RandomForestClassifier(n_estimators=200, min_samples_leaf=2, n_jobs=-1, random_state=SEMILLA),
    "knn": Pipeline([("escala", StandardScaler()), ("knn", KNeighborsClassifier(n_neighbors=5))]),
}
NOMBRES = {"arbol": "Árbol de decisión", "bosque": "Random Forest", "knn": "K vecinos (KNN)"}

comparacion_val = []
for nombre, m in MODELOS.items():
    m.fit(X_ent, y_ent)
    comparacion_val.append({"modelo": nombre} | metricas_de(y_val, m.predict(X_val)))
comparacion_val.sort(key=lambda r: r["f1"], reverse=True)
GANADOR = comparacion_val[0]["modelo"]

titulo("4. COMPARACIÓN DE ALGORITMOS (validación)")
for r in comparacion_val:
    print(f"{NOMBRES[r['modelo']]:<18} exactitud {r['exactitud']:.1%} | precision {r['precision']:.1%} | recall {r['recall']:.1%} | F1 {r['f1']:.1%}")
print(f"\nGanador por F1: {NOMBRES[GANADOR]}")

fig, ax = plt.subplots(figsize=(10, 5), dpi=120)
ancho = 0.2
for i, met in enumerate(["exactitud", "precision", "recall", "f1"]):
    ax.bar(np.arange(len(comparacion_val)) + (i - 1.5) * ancho, [r[met] for r in comparacion_val], width=ancho, label=met.capitalize())
ax.set_xticks(range(len(comparacion_val)), [NOMBRES[r["modelo"]] for r in comparacion_val])
ax.set_ylim(0, 1.05)
ax.grid(axis="y", alpha=0.3)
ax.set_title("Comparación de algoritmos (validación)", loc="left")
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "comparacion_algoritmos.png")
plt.close(fig)

# ------------------------------------------------------------
# 5. EXPERIMENTOS A, B y C (práctica 05)
# ------------------------------------------------------------
titulo("5. EXPERIMENTOS (validación)")
exp_knn = []
for k in [3, 5, 7, 9, 15]:
    m = Pipeline([("escala", StandardScaler()), ("knn", KNeighborsClassifier(n_neighbors=k))]).fit(X_ent, y_ent)
    exp_knn.append({"valor": k} | metricas_de(y_val, m.predict(X_val)))
exp_bosque = []
for n in [50, 100, 200, 500]:
    m = RandomForestClassifier(n_estimators=n, min_samples_leaf=2, n_jobs=-1, random_state=SEMILLA).fit(X_ent, y_ent)
    exp_bosque.append({"valor": n} | metricas_de(y_val, m.predict(X_val)))
# El experimento C (profundidad del árbol) ya se hizo en el paso 3.
exp_arbol = [{"valor": p["profundidad"], "exactitud": p["validacion"], "entrenamiento": p["entrenamiento"]} for p in profundidades]

print("A) KNN, número de vecinos:")
for r in exp_knn:
    print(f"   k={r['valor']:<3} exactitud {r['exactitud']:.1%} | F1 {r['f1']:.1%}")
print("B) Random Forest, número de árboles:")
for r in exp_bosque:
    print(f"   {r['valor']:<4} árboles: exactitud {r['exactitud']:.1%} | F1 {r['f1']:.1%}")
print("C) Árbol, profundidad: ver el paso 3.")

# ------------------------------------------------------------
# 6. REENTRENAR CON ENTRENAMIENTO + VALIDACIÓN Y EXAMEN FINAL
# ------------------------------------------------------------
# Ya escogimos todo, así que aprovechamos también la validación para aprender (80 % de los datos).
# La prueba sigue sin usarse hasta este momento.
finales = {nombre: clone(m).fit(X_tmp, y_tmp) for nombre, m in MODELOS.items()}
pred = {nombre: m.predict(X_pru) for nombre, m in finales.items()}
reglas_pru = df.loc[X_pru.index, "prediccion_reglas"].fillna("ninguna")


# Votación de árbol, KNN y reglas (los tres que corren en la app): gana la letra que digan
# al menos dos. Si los tres dicen algo distinto, se queda la del árbol.
def votar(reglas, arbol, vecinos):
    if arbol == vecinos or arbol == reglas:
        return arbol
    if vecinos == reglas:
        return vecinos
    return arbol


pred["reglas"] = reglas_pru.to_numpy()
pred["votacion"] = np.array([votar(r, a, k) for r, a, k in zip(reglas_pru, pred["arbol"], pred["knn"])])
examen = {nombre: metricas_de(y_pru, p) for nombre, p in pred.items()}
exactitud = {nombre: m["exactitud"] for nombre, m in examen.items()}

titulo("6. EXAMEN FINAL (prueba: manos que nadie vio)")
for nombre in ["reglas", "arbol", "bosque", "knn", "votacion"]:
    e = examen[nombre]
    etiqueta = {"reglas": "Reglas fijas", "votacion": "Votación (app)"}.get(nombre, NOMBRES.get(nombre))
    print(f"{etiqueta:<18} exactitud {e['exactitud']:.1%} | F1 {e['f1']:.1%}" + ("   ← ganador en validación" if nombre == GANADOR else ""))

comparacion = pd.DataFrame({"real": y_pru, "reglas": reglas_pru, "arbol": pred["arbol"], "bosque": pred["bosque"], "knn": pred["knn"], "votacion": pred["votacion"]}).sort_index()
print("\nPrimeras 10 predicciones:")
print(comparacion.head(10).to_string())

# ¿Dónde falla cada uno? Por qué tan girada estaba la mano.
MODELOS_GIRO = ("reglas", "arbol", "bosque", "knn", "votacion")
giro = df.loc[X_pru.index, "giro"].astype(float)
tramos = pd.cut(giro, bins=[-1, 10, 20, 30, 40], labels=["0-10°", "10-20°", "20-30°", "30-35°"])
por_giro = comparacion.assign(tramo=tramos).groupby("tramo", observed=True)[list(comparacion.columns)].apply(
    lambda g: pd.Series({m: (g[m] == g["real"]).mean() for m in MODELOS_GIRO} | {"manos": len(g)})
)
print("\nExactitud según qué tan girada está la mano:")
print(por_giro.to_string(formatters={m: "{:.0%}".format for m in MODELOS_GIRO} | {"manos": "{:.0f}".format}))

# ------------------------------------------------------------
# 7. VALIDACIÓN CRUZADA DEL GANADOR
# ------------------------------------------------------------
# 5 particiones del 80 % (entrenamiento + validación); la prueba no participa.
# StratifiedKFold conserva la proporción de letras en cada partición.
cv = cross_val_score(clone(MODELOS[GANADOR]), X_tmp, y_tmp, cv=StratifiedKFold(5, shuffle=True, random_state=SEMILLA), scoring="f1_macro", n_jobs=-1)
titulo(f"7. VALIDACIÓN CRUZADA ({NOMBRES[GANADOR]})")
print("F1 por partición:", np.round(cv, 3))
print(f"Promedio: {cv.mean():.1%} | desviación: {cv.std():.1%}")

# ------------------------------------------------------------
# 8. REPORTE Y MATRICES DE CONFUSIÓN
# ------------------------------------------------------------
titulo("8. REPORTE DE CLASIFICACIÓN DEL ÁRBOL (el que usa la app)")
print(classification_report(y_pru, pred["arbol"], zero_division=0))

letras = sorted(y.unique())
mc_arbol = confusion_matrix(y_pru, pred["arbol"], labels=letras)
mc_knn = confusion_matrix(y_pru, pred["knn"], labels=letras)
mc_bosque = confusion_matrix(y_pru, pred["bosque"], labels=letras)
# Para las reglas se agrega la columna "ninguna" (no reconocieron nada).
mc_reglas = confusion_matrix(y_pru, reglas_pru, labels=letras + ["ninguna"])[: len(letras)]


def dibujar(matriz, columnas, texto, archivo):
    fig, ax = plt.subplots(figsize=(10, 8.5), dpi=120)
    ax.imshow(matriz, cmap="Greens")
    ax.set_xticks(range(len(columnas)), columnas, rotation=90, fontsize=8)
    ax.set_yticks(range(len(letras)), letras, fontsize=8)
    ax.set_xlabel("Lo que dijo el sistema")
    ax.set_ylabel("La letra real")
    ax.set_title(texto, loc="left")
    for i in range(matriz.shape[0]):
        for j in range(matriz.shape[1]):
            if matriz[i, j]:
                ax.text(j, i, matriz[i, j], ha="center", va="center", fontsize=6, color="white" if matriz[i, j] > matriz.max() / 2 else "#1c1917")
    fig.tight_layout()
    fig.savefig(RESULTADOS / archivo)
    plt.close(fig)


dibujar(mc_arbol, letras, f"Árbol de decisión · exactitud {exactitud['arbol']:.0%}", "matriz_confusion_arbol.png")
dibujar(mc_knn, letras, f"K vecinos (con escala) · exactitud {exactitud['knn']:.0%}", "matriz_confusion_knn.png")
dibujar(mc_bosque, letras, f"Random Forest · exactitud {exactitud['bosque']:.0%}", "matriz_confusion_bosque.png")
dibujar(mc_reglas, letras + ["ninguna"], f"Reglas fijas · exactitud {exactitud['reglas']:.0%}", "matriz_confusion_reglas.png")
print("Matrices guardadas en resultados/ (árbol, KNN, bosque y reglas)")


def confusiones(matriz, columnas, n=5):
    pares = [(matriz[i, j], letras[i], columnas[j]) for i in range(len(letras)) for j in range(len(columnas)) if letras[i] != columnas[j] and matriz[i, j]]
    return sorted(pares, reverse=True)[:n]


print("Lo que más confunden las reglas:", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_reglas, letras + ["ninguna"])))
print("Lo que más confunde el árbol:  ", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_arbol, letras)))
print("Lo que más confunde el KNN:    ", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_knn, letras)))

modelo = finales["arbol"]
importancias = pd.Series(modelo.feature_importances_, index=COLUMNAS_X).sort_values(ascending=False)
print("\nLas 8 medidas que más usa el árbol para decidir:")
print(importancias.head(8).round(3).to_string())

# Caso nuevo: la grabación de una mano real.
revision = pd.read_csv(AQUI / "datos" / "manos_revision.csv")
reales = revision[revision["origen"] == "real"]
if len(reales):
    titulo(f"CASO NUEVO: MANO REAL (grabación etiquetada como {reales['letra'].iloc[0]})")
    for nombre in ("arbol", "bosque", "knn"):
        print(f"{NOMBRES[nombre]:<18}", pd.Series(finales[nombre].predict(reales[COLUMNAS_X])).value_counts().to_dict())
    print("Reglas:            ", reales["prediccion_reglas"].value_counts().to_dict())
    print("En esa grabación la mano se movió mucho (parte 2-C): ninguno puede acertar siempre.")

# ------------------------------------------------------------
# 9. EXPORTAR PARA LA APP
# ------------------------------------------------------------
# La app usa el árbol y el KNN (los dos ya reentrenados con el 80 %). El Random Forest se queda
# solo para comparar: 200 árboles pesarían varios MB en el celular.
arbol = modelo.tree_
clases = list(modelo.classes_)
nodos = []
for i in range(arbol.node_count):
    if arbol.children_left[i] == -1:  # hoja
        conteo = arbol.value[i][0]
        k = int(np.argmax(conteo))
        nodos.append({"hoja": clases[k], "seguridad": round(float(conteo[k] / conteo.sum()), 3)})
    else:
        nodos.append({"medida": int(arbol.feature[i]), "umbral": round(float(arbol.threshold[i]), 5), "si": int(arbol.children_left[i]), "no": int(arbol.children_right[i])})
DESTINO_APP.mkdir(parents=True, exist_ok=True)
(DESTINO_APP / "modelo.json").write_text(json.dumps({"medidas": COLUMNAS_X, "clases": clases, "nodos": nodos}, separators=(",", ":")), encoding="utf-8")

# El KNN no tiene preguntas: "aprender" es guardar las manos. Para que pese poco, cada medida ya
# escalada se guarda como entero de -127 a 127 (pasos de 0.04) y todo se empaca en base64.
PASOS = 25
escala = finales["knn"].named_steps["escala"]
X_guardar = np.clip(np.round(escala.transform(X_tmp) * PASOS), -127, 127).astype(np.int8)
knn_cuantizado = KNeighborsClassifier(n_neighbors=5).fit(X_guardar / PASOS, y_tmp)
print(f"\nKNN con las manos empacadas: {accuracy_score(y_pru, knn_cuantizado.predict(escala.transform(X_pru))):.1%} (debe salir casi igual)")
clases_knn = list(finales["knn"].classes_)
(DESTINO_APP / "knn.json").write_text(json.dumps({
    "medidas": COLUMNAS_X, "k": 5, "pasos": PASOS,
    "medias": [round(float(v), 5) for v in escala.mean_],
    "escalas": [round(float(v), 5) for v in escala.scale_],
    "clases": clases_knn,
    "etiquetas": [clases_knn.index(l) for l in y_tmp],
    "manos": base64.b64encode(X_guardar.tobytes()).decode("ascii"),
}, separators=(",", ":")), encoding="utf-8")

r4 = lambda v: round(float(v), 4)  # noqa: E731
reporte = classification_report(y_pru, pred["arbol"], zero_division=0, output_dict=True)
metricas = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "manos": {"entrenamiento": len(X_ent), "validacion": len(X_val), "prueba": len(X_pru), "total": len(df)},
    "exactitud": {k: r4(v) for k, v in exactitud.items()},
    "porGiro": [{"tramo": str(t), "manos": int(r["manos"])} | {m: r4(r[m]) for m in MODELOS_GIRO} for t, r in por_giro.iterrows()],
    "porLetra": {l: {"precision": round(reporte[l]["precision"], 3), "recall": round(reporte[l]["recall"], 3), "f1": round(reporte[l]["f1-score"], 3)} for l in letras},
    "confusiones": {
        "reglas": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_reglas, letras + ["ninguna"], 6)],
        "arbol": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_arbol, letras, 6)],
        "knn": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_knn, letras, 6)],
    },
    "matriz": {"letras": letras, "arbol": mc_arbol.tolist(), "knn": mc_knn.tolist(), "reglas": mc_reglas.tolist()},
    "knn": {"vecinos": 5, "manosGuardadas": len(X_tmp)},
    "arbol": {"profundidad": int(modelo.get_depth()), "hojas": int(modelo.get_n_leaves())},
    "importantes": [{"medida": m, "peso": round(float(p), 3)} for m, p in importancias.head(8).items()],
    # Prácticas 04 y 05
    "profundidades": [{"profundidad": p["profundidad"], "entrenamiento": r4(p["entrenamiento"]), "validacion": r4(p["validacion"]), "diagnostico": p["diagnostico"]} for p in profundidades],
    "profundidadElegida": elegida["profundidad"],
    "comparacion": [{"modelo": r["modelo"]} | {k: r4(r[k]) for k in ("exactitud", "precision", "recall", "f1")} for r in comparacion_val],
    "ganador": GANADOR,
    "examen": {nombre: {k: r4(v) for k, v in e.items()} for nombre, e in examen.items()},
    "experimentos": {
        "knn": [{"valor": r["valor"], "exactitud": r4(r["exactitud"]), "f1": r4(r["f1"])} for r in exp_knn],
        "bosque": [{"valor": r["valor"], "exactitud": r4(r["exactitud"]), "f1": r4(r["f1"])} for r in exp_bosque],
    },
    "validacionCruzada": {"modelo": GANADOR, "particiones": [r4(v) for v in cv], "promedio": r4(cv.mean()), "desviacion": r4(cv.std())},
}
(DESTINO_APP / "metricas.json").write_text(json.dumps(metricas, ensure_ascii=False, indent=1), encoding="utf-8")
titulo("9. EXPORTADO A LA APP")
print("frontend/src/lib/ia/arbol/modelo.json  (", len(nodos), "nodos )")
print("frontend/src/lib/ia/arbol/knn.json      (", len(X_tmp), "manos guardadas )")
print("frontend/src/lib/ia/arbol/metricas.json")

print("\nRecuerda: 100 % en entrenamiento no significa que sea el mejor modelo. Lo que importa es")
print("cómo le va con datos que no conoce, y para manos reales hay que probar con grabaciones reales.")
