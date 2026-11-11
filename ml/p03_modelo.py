# ============================================================
# PRACTICA 03 (adaptada a nuestro proyecto)
# PRIMER MODELO DE MACHINE LEARNING PARA RECONOCER LETRAS
# COMPARACION: REGLAS FIJAS DE LA APP VS ARBOL DE DECISION
# ============================================================
#
# Pregunta: ¿qué reconoce mejor las letras, las reglas que escribimos a mano
# (una por letra, en frontend/src/lib/vision/postura.ts) o un modelo que aprende
# de ejemplos?
#
# Etapas, igual que en clase:
#   1. Datos (manos_limpias.csv, de la práctica 2)
#   2. Separar entrenamiento (70 %) y prueba (30 %)
#   3. Entrenar el árbol de decisión
#   4. Predecir manos que el árbol no vio
#   5. Evaluar y comparar con las reglas (exactitud, precision, recall, F1, matriz de confusión)
#   6. Probar un caso nuevo (la grabación real de una mano)
#   7. Exportar el árbol para que la app lo use
#
# Los datos de entrenamiento salen de la mano 3D de la app en miles de posiciones. Con
# grabaciones reales (calibración) el modelo se volvería a entrenar con este mismo programa.

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "arbol"

# ------------------------------------------------------------
# 1. DATOS
# ------------------------------------------------------------
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
y = df["letra"]
print("========================================")
print("1. DATOS")
print("========================================")
print("Manos:", len(df), "| medidas por mano:", len(COLUMNAS_X), "| letras:", y.nunique())

# ------------------------------------------------------------
# 2. ENTRENAMIENTO Y PRUEBA
# ------------------------------------------------------------
# stratify=y: que las dos partes tengan la misma proporción de cada letra.
X_ent, X_pru, y_ent, y_pru = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
print("\n========================================")
print("2. DIVISIÓN DE LOS DATOS")
print("========================================")
print("Manos para entrenar:", len(X_ent))
print("Manos para el examen:", len(X_pru))

# ------------------------------------------------------------
# 3. EL SISTEMA DE REGLAS FIJAS (ya viene calculado por la app)
# ------------------------------------------------------------
# En la columna prediccion_reglas está la letra que dijeron las reglas de la app
# para cada mano ("ninguna" si no reconocieron nada). No aprende: lo escribimos nosotros.
reglas_pru = df.loc[X_pru.index, "prediccion_reglas"].fillna("ninguna")

# ------------------------------------------------------------
# 4. ENTRENAR EL ÁRBOL DE DECISIÓN
# ------------------------------------------------------------
# max_depth=12: un límite para que el árbol no se aprenda los datos de memoria
# y para que quepa en la app. min_samples_leaf=3: cada hoja decide con al menos 3 manos.
modelo = DecisionTreeClassifier(max_depth=12, min_samples_leaf=3, random_state=42)
modelo.fit(X_ent, y_ent)
print("\n========================================")
print("3. MODELO ENTRENADO")
print("========================================")
print("Profundidad del árbol:", modelo.get_depth(), "| hojas:", modelo.get_n_leaves())

# Segundo modelo: K vecinos más cercanos (KNN). Busca las 5 manos de entrenamiento más
# parecidas y vota. Primero lo probamos tal cual y sacó muy poco: compara medidas en escalas
# distintas (los ángulos van de 0 a 180 y las posiciones de 0 a 1), así que los ángulos
# se comían todo. Con StandardScaler cada medida queda en la misma escala y ya compara parejo.
knn_sin_escala = KNeighborsClassifier(n_neighbors=5).fit(X_ent, y_ent)
escala = StandardScaler().fit(X_ent)
knn = KNeighborsClassifier(n_neighbors=5).fit(escala.transform(X_ent), y_ent)

# ------------------------------------------------------------
# 5. PREDECIR Y COMPARAR
# ------------------------------------------------------------
pred_arbol = modelo.predict(X_pru)
pred_knn = knn.predict(escala.transform(X_pru))
pred_knn_sin_escala = knn_sin_escala.predict(X_pru)


# Votación de los tres: gana la letra que digan al menos dos. Si los tres dicen algo distinto,
# se queda la del árbol (el que mejor salió por separado).
def votar(reglas, arbol, vecinos):
    if arbol == vecinos or arbol == reglas:
        return arbol
    if vecinos == reglas:
        return vecinos
    return arbol


pred_votacion = np.array([votar(r, a, k) for r, a, k in zip(reglas_pru, pred_arbol, pred_knn)])
comparacion = pd.DataFrame({"real": y_pru, "reglas": reglas_pru, "arbol": pred_arbol, "knn": pred_knn, "votacion": pred_votacion}).sort_index()
print("\n========================================")
print("4. COMPARACIÓN DE PREDICCIONES (primeras 15)")
print("========================================")
print(comparacion.head(15).to_string())

exactitud = {
    "reglas": accuracy_score(y_pru, reglas_pru),
    "arbol": accuracy_score(y_pru, pred_arbol),
    "knn": accuracy_score(y_pru, pred_knn),
    "knnSinEscala": accuracy_score(y_pru, pred_knn_sin_escala),
    "votacion": accuracy_score(y_pru, pred_votacion),
}
print("\n========================================")
print("5. EXACTITUD (manos que ningún sistema vio al prepararse)")
print("========================================")
print(f"Reglas fijas de la app:  {exactitud['reglas']:.1%}")
print(f"Árbol de decisión (ML):  {exactitud['arbol']:.1%}")
print(f"K vecinos sin escalar:   {exactitud['knnSinEscala']:.1%}  (comparaba medidas en escalas distintas)")
print(f"K vecinos con escala:    {exactitud['knn']:.1%}")
print(f"Votación de los tres:    {exactitud['votacion']:.1%}")

# ¿Dónde falla cada uno? Por qué tan girada estaba la mano.
giro = df.loc[X_pru.index, "giro"].astype(float)
tramos = pd.cut(giro, bins=[-1, 10, 20, 30, 40], labels=["0-10°", "10-20°", "20-30°", "30-35°"])
por_giro = comparacion.assign(tramo=tramos).groupby("tramo", observed=True).apply(
    lambda g: pd.Series({m: (g[m] == g["real"]).mean() for m in ("reglas", "arbol", "knn", "votacion")} | {"manos": len(g)})
)
print("\nExactitud según qué tan girada está la mano:")
print(por_giro.to_string(formatters={m: "{:.0%}".format for m in ("reglas", "arbol", "knn", "votacion")} | {"manos": "{:.0f}".format}))

# ------------------------------------------------------------
# 6. PRECISION, RECALL Y F1 DEL ÁRBOL
# ------------------------------------------------------------
print("\n========================================")
print("6. REPORTE DE CLASIFICACIÓN DEL ÁRBOL")
print("========================================")
print(classification_report(y_pru, pred_arbol, zero_division=0))

# ------------------------------------------------------------
# 7. MATRIZ DE CONFUSIÓN (reglas y árbol)
# ------------------------------------------------------------
letras = sorted(y.unique())
mc_arbol = confusion_matrix(y_pru, pred_arbol, labels=letras)
mc_knn = confusion_matrix(y_pru, pred_knn, labels=letras)
# Para las reglas se agrega la columna "ninguna" (no reconocieron nada).
mc_reglas = confusion_matrix(y_pru, reglas_pru, labels=letras + ["ninguna"])[: len(letras)]


def dibujar(matriz, columnas, titulo, archivo):
    fig, ax = plt.subplots(figsize=(10, 8.5), dpi=120)
    ax.imshow(matriz, cmap="Greens")
    ax.set_xticks(range(len(columnas)), columnas, rotation=90, fontsize=8)
    ax.set_yticks(range(len(letras)), letras, fontsize=8)
    ax.set_xlabel("Lo que dijo el sistema")
    ax.set_ylabel("La letra real")
    ax.set_title(titulo, loc="left")
    for i in range(matriz.shape[0]):
        for j in range(matriz.shape[1]):
            if matriz[i, j]:
                ax.text(j, i, matriz[i, j], ha="center", va="center", fontsize=6, color="white" if matriz[i, j] > matriz.max() / 2 else "#1c1917")
    fig.tight_layout()
    fig.savefig(RESULTADOS / archivo)
    plt.close(fig)


dibujar(mc_arbol, letras, f"Árbol de decisión · exactitud {exactitud['arbol']:.0%}", "matriz_confusion_arbol.png")
dibujar(mc_knn, letras, f"K vecinos (con escala) · exactitud {exactitud['knn']:.0%}", "matriz_confusion_knn.png")
dibujar(mc_reglas, letras + ["ninguna"], f"Reglas fijas · exactitud {exactitud['reglas']:.0%}", "matriz_confusion_reglas.png")
print("\n========================================")
print("7. MATRICES DE CONFUSIÓN")
print("========================================")
print("Guardadas en resultados/: matriz_confusion_arbol.png, matriz_confusion_knn.png y matriz_confusion_reglas.png")

# Las confusiones más comunes de cada sistema.
def confusiones(matriz, columnas, n=5):
    pares = [(matriz[i, j], letras[i], columnas[j]) for i in range(len(letras)) for j in range(len(columnas)) if letras[i] != columnas[j] and matriz[i, j]]
    return sorted(pares, reverse=True)[:n]


print("Lo que más confunden las reglas:", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_reglas, letras + ["ninguna"])))
print("Lo que más confunde el árbol:  ", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_arbol, letras)))
print("Lo que más confunde el KNN:    ", ", ".join(f"{a}→{b} ({n})" for n, a, b in confusiones(mc_knn, letras)))

# ------------------------------------------------------------
# 8. ¿EN QUÉ SE FIJA EL ÁRBOL?
# ------------------------------------------------------------
importancias = pd.Series(modelo.feature_importances_, index=COLUMNAS_X).sort_values(ascending=False)
print("\nLas 8 medidas que más usa el árbol para decidir:")
print(importancias.head(8).round(3).to_string())

# ------------------------------------------------------------
# 9. CASO NUEVO: LA GRABACIÓN DE UNA MANO REAL
# ------------------------------------------------------------
revision = pd.read_csv(AQUI / "datos" / "manos_revision.csv")
reales = revision[revision["origen"] == "real"]
if len(reales):
    pred_real = modelo.predict(reales[COLUMNAS_X])
    print("\n========================================")
    print("8. CASO NUEVO: MANO REAL (grabación etiquetada como", reales["letra"].iloc[0], ")")
    print("========================================")
    print("Lo que dijo el árbol cuadro por cuadro:", pd.Series(pred_real).value_counts().to_dict())
    print("Lo que dijo el KNN cuadro por cuadro:  ", pd.Series(knn.predict(escala.transform(reales[COLUMNAS_X]))).value_counts().to_dict())
    print("Lo que dijeron las reglas:            ", reales["prediccion_reglas"].value_counts().to_dict())
    print("En esa grabación la mano se movió mucho (parte 2-C): ninguno de los dos puede acertar")
    print("siempre. Para medir con manos reales hace falta grabar con calma (Mi IA → Calibrar).")

# ------------------------------------------------------------
# 10. EXPORTAR EL ÁRBOL PARA LA APP
# ------------------------------------------------------------
# El árbol son preguntas de sí o no: "¿la medida X es menor o igual que tal número?".
# Se guarda cada nodo: qué medida pregunta, el número, a dónde ir si sí y si no,
# y en las hojas, qué letra contesta y con qué seguridad.
arbol = modelo.tree_
clases = list(modelo.classes_)
nodos = []
for i in range(arbol.node_count):
    if arbol.children_left[i] == -1:  # hoja
        conteo = arbol.value[i][0]
        k = int(np.argmax(conteo))
        nodos.append({"hoja": clases[k], "seguridad": round(float(conteo[k] / conteo.sum()), 3)})
    else:
        nodos.append({
            "medida": int(arbol.feature[i]),
            "umbral": round(float(arbol.threshold[i]), 5),
            "si": int(arbol.children_left[i]),  # medida <= umbral
            "no": int(arbol.children_right[i]),
        })
DESTINO_APP.mkdir(parents=True, exist_ok=True)
(DESTINO_APP / "modelo.json").write_text(json.dumps({"medidas": COLUMNAS_X, "clases": clases, "nodos": nodos}, separators=(",", ":")), encoding="utf-8")

# El KNN no tiene preguntas: "aprender" es guardar las manos de entrenamiento. Para que pese
# poco en la app, cada medida ya escalada se guarda como un número entero de -127 a 127
# (multiplicada por 25, o sea con pasos de 0.04) y todo se empaca en base64.
import base64

PASOS = 25
X_guardar = np.clip(np.round(escala.transform(X_ent) * PASOS), -127, 127).astype(np.int8)
knn_cuantizado = KNeighborsClassifier(n_neighbors=5).fit(X_guardar / PASOS, y_ent)
exactitud_guardado = accuracy_score(y_pru, knn_cuantizado.predict(escala.transform(X_pru)))
print(f"KNN con las manos empacadas: {exactitud_guardado:.1%} (debe salir casi igual)")
clases_knn = list(knn.classes_)
(DESTINO_APP / "knn.json").write_text(json.dumps({
    "medidas": COLUMNAS_X,
    "k": 5,
    "pasos": PASOS,
    "medias": [round(float(v), 5) for v in escala.mean_],
    "escalas": [round(float(v), 5) for v in escala.scale_],
    "clases": clases_knn,
    "etiquetas": [clases_knn.index(l) for l in y_ent],
    "manos": base64.b64encode(X_guardar.tobytes()).decode("ascii"),
}, separators=(",", ":")), encoding="utf-8")

reporte = classification_report(y_pru, pred_arbol, zero_division=0, output_dict=True)
metricas = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "manos": {"entrenamiento": len(X_ent), "prueba": len(X_pru), "total": len(df)},
    "exactitud": {k: round(v, 4) for k, v in exactitud.items()},
    "porGiro": [{"tramo": str(t), "manos": int(r["manos"])} | {m: round(r[m], 4) for m in ("reglas", "arbol", "knn", "votacion")} for t, r in por_giro.iterrows()],
    "porLetra": {l: {"precision": round(reporte[l]["precision"], 3), "recall": round(reporte[l]["recall"], 3), "f1": round(reporte[l]["f1-score"], 3)} for l in letras},
    "confusiones": {
        "reglas": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_reglas, letras + ["ninguna"], 6)],
        "arbol": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_arbol, letras, 6)],
        "knn": [{"real": a, "dijo": b, "veces": int(n)} for n, a, b in confusiones(mc_knn, letras, 6)],
    },
    "matriz": {"letras": letras, "arbol": mc_arbol.tolist(), "knn": mc_knn.tolist(), "reglas": mc_reglas.tolist()},
    "knn": {"vecinos": 5, "manosGuardadas": len(X_ent)},
    "arbol": {"profundidad": int(modelo.get_depth()), "hojas": int(modelo.get_n_leaves())},
    "importantes": [{"medida": m, "peso": round(float(p), 3)} for m, p in importancias.head(8).items()],
}
(DESTINO_APP / "metricas.json").write_text(json.dumps(metricas, ensure_ascii=False, indent=1), encoding="utf-8")
print("\n========================================")
print("9. EXPORTADO A LA APP")
print("========================================")
print("frontend/src/lib/ia/arbol/modelo.json  (", len(nodos), "nodos )")
print("frontend/src/lib/ia/arbol/knn.json      (", len(X_ent), "manos guardadas )")
print("frontend/src/lib/ia/arbol/metricas.json")

print("\nRecuerda: fit() entrena, predict() predice. Y una exactitud alta en esta prueba no garantiza")
print("que funcione igual de bien con manos reales; para eso hay que probar con grabaciones reales.")
