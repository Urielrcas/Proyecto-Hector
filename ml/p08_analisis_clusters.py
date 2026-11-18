# ============================================================
# PRACTICA 08 (adaptada a nuestro proyecto)
# ANALISIS AVANZADO Y OPTIMIZACION DE LOS GRUPOS DE SEÑAS
# ============================================================
#
# Continúa la práctica 07. Ya encontramos grupos de letras parecidas; ahora queremos saber
# qué tan CONFIABLES son esos grupos y qué manos se salen de lo normal.
#
# Etapas:
#   1. Datos y el K de la práctica 07
#   2. Comparar inicializaciones: K-Means++ contra random
#   3. Comparar escaladores: StandardScaler contra MinMaxScaler
#   4. Estabilidad con el Adjusted Rand Index (ARI) usando varias semillas
#   5. Modelo final, centroides y distancias entre grupos
#   6. Silueta de cada mano (silhouette_samples)
#   7. Manos atípicas: las que están lejísimos del centro de su grupo (percentil 95)
#   8. Exportar el reporte (CSV y JSON listo para MongoDB) y los resultados para la app
#
# Para guardar también los segmentos en MongoDB (la base del backend):
#     python p08_analisis_clusters.py --mongo
# Usa MONGODB_URI y MONGODB_DB de backend/.env y escribe en la colección «segmentos_manos».

import json
import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_samples, silhouette_score
from sklearn.preprocessing import MinMaxScaler, StandardScaler

sys.stdout.reconfigure(encoding="utf-8")  # para que la consola de Windows muestre acentos

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "grupos"
SEMILLA = 42
N_INIT = 10
SEMILLAS = [10, 20, 30, 40, 50, 42]
PERCENTIL_ATIPICO = 95


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. DATOS Y EL K DE LA PRÁCTICA 07
# ------------------------------------------------------------
archivo_grupos = DESTINO_APP / "grupos.json"
if not archivo_grupos.exists():
    sys.exit("Primero corre p07_kmeans_manos.py (crea grupos.json).")
P07 = json.loads(archivo_grupos.read_text(encoding="utf-8"))
K = P07["k"]
NOMBRES_GRUPO = {g["id"]: g["nombre"] for g in P07["grupos"]}

df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
escala = StandardScaler()
Z = escala.fit_transform(X)
titulo("1. DATOS")
print("Manos:", len(df), "| K de la práctica 07:", K)

# ------------------------------------------------------------
# 2. K-MEANS++ CONTRA RANDOM
# ------------------------------------------------------------
# random: escoge los K centros iniciales totalmente al azar (pueden caer juntos).
# k-means++: el primero al azar y los siguientes lejos de los que ya hay → suele converger
# más rápido y a una mejor solución.
# Con n_init=1 (un solo intento) se nota la diferencia; lo repetimos con varias semillas.
titulo("2. INICIALIZACIÓN: K-MEANS++ CONTRA RANDOM (un intento por semilla)")
inicializaciones = []
for init in ["k-means++", "random"]:
    inercias, iteraciones, siluetas = [], [], []
    inicio = time.perf_counter()
    for s in SEMILLAS:
        m = KMeans(n_clusters=K, init=init, n_init=1, random_state=s).fit(Z)
        inercias.append(m.inertia_)
        iteraciones.append(m.n_iter_)
        siluetas.append(silhouette_score(Z, m.labels_))
    segundos = time.perf_counter() - inicio
    inicializaciones.append({
        "init": init,
        "inerciaPromedio": float(np.mean(inercias)),
        "inerciaMejor": float(np.min(inercias)),
        "inerciaDesviacion": float(np.std(inercias)),
        "iteraciones": float(np.mean(iteraciones)),
        "silueta": float(np.mean(siluetas)),
        "segundos": segundos,
    })
    print(f"{init:<10} inercia promedio {np.mean(inercias):>8.0f} (± {np.std(inercias):>5.0f}) | "
          f"iteraciones {np.mean(iteraciones):5.1f} | silueta {np.mean(siluetas):.3f}")
mejor_init = min(inicializaciones, key=lambda r: r["inerciaPromedio"])["init"]
diferencia = abs(inicializaciones[0]["inerciaPromedio"] - inicializaciones[1]["inerciaPromedio"])
if diferencia < min(r["inerciaDesviacion"] for r in inicializaciones):
    print(f"Prácticamente empatan: la diferencia ({diferencia:.0f}) es menor que lo que varía cada una entre semillas.")
    print("Por eso K-Means se corre con n_init=10: repetir varias veces importa más que cómo se empieza.")
else:
    print(f"Mejor (menor inercia promedio): {mejor_init}")

# ------------------------------------------------------------
# 3. STANDARDSCALER CONTRA MINMAXSCALER
# ------------------------------------------------------------
# StandardScaler: promedio 0 y desviación 1. MinMaxScaler: todo entre 0 y 1.
# Las siluetas NO se comparan directamente (cada una está en su propio espacio); lo importante es
# si los dos encuentran los mismos grupos → ARI entre ambos agrupamientos.
titulo("3. ESCALAMIENTO: STANDARDSCALER CONTRA MINMAXSCALER")
etiquetas_escala = {}
escaladores = []
for nombre, esc in [("StandardScaler", StandardScaler()), ("MinMaxScaler", MinMaxScaler())]:
    Zs = esc.fit_transform(X)
    m = KMeans(n_clusters=K, init="k-means++", n_init=N_INIT, random_state=SEMILLA).fit(Zs)
    etiquetas_escala[nombre] = m.labels_
    tabla = pd.crosstab(df["letra"], m.labels_, normalize="index")
    escaladores.append({
        "escalador": nombre,
        "silueta": float(silhouette_score(Zs, m.labels_)),
        "arLetras": float(adjusted_rand_score(df["letra"], m.labels_)),
        "pureza": float(tabla.max(axis=1).mean()),  # qué tanto se queda cada letra en un solo grupo
    })
    print(f"{nombre:<15} silueta {escaladores[-1]['silueta']:.3f} | cada letra queda en promedio {escaladores[-1]['pureza']:.0%} en un solo grupo")
ari_escalas = float(adjusted_rand_score(etiquetas_escala["StandardScaler"], etiquetas_escala["MinMaxScaler"]))
print(f"ARI entre los dos agrupamientos: {ari_escalas:.3f} (1 = idénticos, 0 = como al azar)")

# ------------------------------------------------------------
# 4. ESTABILIDAD CON EL ADJUSTED RAND INDEX
# ------------------------------------------------------------
# Si cambiamos la semilla, ¿salen los mismos grupos? El ARI compara dos agrupamientos sin importar
# el número que le tocó a cada grupo (el «grupo 3» de una corrida puede ser el «grupo 7» de otra).
titulo("4. ESTABILIDAD (ARI ENTRE SEMILLAS)")
corridas = {s: KMeans(n_clusters=K, init="k-means++", n_init=N_INIT, random_state=s).fit(Z).labels_ for s in SEMILLAS}
matriz_ari = np.eye(len(SEMILLAS))
pares = []
for i, a in enumerate(SEMILLAS):
    for j in range(i + 1, len(SEMILLAS)):
        b = SEMILLAS[j]
        v = adjusted_rand_score(corridas[a], corridas[b])
        matriz_ari[i, j] = matriz_ari[j, i] = v
        pares.append(v)
print(f"ARI promedio {np.mean(pares):.3f} | mínimo {np.min(pares):.3f} | máximo {np.max(pares):.3f}")
if np.mean(pares) >= 0.9:
    veredicto = "muy estables"
elif np.mean(pares) >= 0.75:
    veredicto = "estables"
else:
    veredicto = "poco estables"
print(f"Los grupos son {veredicto}: cambiar la semilla casi no cambia el resultado." if veredicto != "poco estables"
      else "Los grupos cambian bastante con la semilla: hay que tomarlos con cuidado.")

fig, ax = plt.subplots(figsize=(6, 5), dpi=120)
ax.imshow(matriz_ari, cmap="Greens", vmin=0, vmax=1)
ax.set_xticks(range(len(SEMILLAS)), SEMILLAS)
ax.set_yticks(range(len(SEMILLAS)), SEMILLAS)
ax.set_xlabel("Semilla")
ax.set_ylabel("Semilla")
ax.set_title("Estabilidad: ARI entre corridas", loc="left")
for i in range(len(SEMILLAS)):
    for j in range(len(SEMILLAS)):
        ax.text(j, i, f"{matriz_ari[i, j]:.2f}", ha="center", va="center", fontsize=8, color="white" if matriz_ari[i, j] > 0.6 else "#1c1917")
fig.tight_layout()
fig.savefig(RESULTADOS / "p08_estabilidad_ari.png")
plt.close(fig)

# ------------------------------------------------------------
# 5. MODELO FINAL, CENTROIDES Y DISTANCIAS ENTRE GRUPOS
# ------------------------------------------------------------
final = KMeans(n_clusters=K, init="k-means++", n_init=N_INIT, random_state=SEMILLA).fit(Z)
etiquetas = final.labels_
centros = final.cluster_centers_
titulo("5. DISTANCIAS ENTRE CENTROIDES")
dist_centros = np.linalg.norm(centros[:, None, :] - centros[None, :, :], axis=2)
pares_cercanos = sorted(((dist_centros[i, j], i, j) for i in range(K) for j in range(i + 1, K)))[:3]
print("Los grupos más parecidos entre sí (centros más cercanos):")
for d, i, j in pares_cercanos:
    print(f"   G{i + 1} ({NOMBRES_GRUPO[i]})  ↔  G{j + 1} ({NOMBRES_GRUPO[j]})   distancia {d:.2f}")

# ------------------------------------------------------------
# 6. SILUETA DE CADA MANO
# ------------------------------------------------------------
sil = silhouette_samples(Z, etiquetas)
titulo("6. SILUETA POR GRUPO")
silueta_grupo = []
for g in range(K):
    s = sil[etiquetas == g]
    silueta_grupo.append({"grupo": g, "silueta": float(s.mean()), "negativas": int((s < 0).sum())})
    print(f"G{g + 1} {NOMBRES_GRUPO[g]:<36} silueta {s.mean():.3f} | manos con silueta negativa: {(s < 0).sum()}")

# ------------------------------------------------------------
# 7. MANOS ATÍPICAS
# ------------------------------------------------------------
# Distancia de cada mano al centro de SU grupo. Las que pasan el percentil 95 son candidatas a
# revisión (mano muy girada, mal detectada o una forma rara). Ojo: lejos no significa «mal hecha».
distancia = np.linalg.norm(Z - centros[etiquetas], axis=1)
umbral = float(np.percentile(distancia, PERCENTIL_ATIPICO))
atipica = distancia > umbral
giro = df["giro"].astype(float)
titulo(f"7. MANOS ATÍPICAS (distancia > percentil {PERCENTIL_ATIPICO} = {umbral:.2f})")
print("Manos atípicas:", int(atipica.sum()), "de", len(df))
print(f"Giro promedio: atípicas {giro[atipica].mean():.0f}° | normales {giro[~atipica].mean():.0f}°")
por_letra = df.loc[atipica, "letra"].value_counts()
print("Letras con más manos atípicas:", ", ".join(f"{l} ({n})" for l, n in por_letra.head(6).items()))

reporte = df[["id", "letra", "giro", "escala"]].assign(
    grupo=etiquetas, nombre_grupo=[NOMBRES_GRUPO[g] for g in etiquetas],
    distancia_centroide=distancia.round(4), silueta=sil.round(4), atipica=atipica,
)
reporte[reporte["atipica"]].sort_values("distancia_centroide", ascending=False).to_csv(AQUI / "datos" / "manos_atipicas.csv", index=False)

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=120)
ax.hist(distancia, bins=50, color="#a8a29e")
ax.axvline(umbral, color="#b91c1c", linestyle="--", label=f"Percentil {PERCENTIL_ATIPICO}")
ax.set_xlabel("Distancia al centro de su grupo")
ax.set_ylabel("Manos")
ax.set_title("¿Qué tan lejos está cada mano de su grupo?", loc="left")
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p08_distancias_atipicas.png")
plt.close(fig)

# ------------------------------------------------------------
# 8. EXPORTAR
# ------------------------------------------------------------
reporte.to_csv(RESULTADOS / "p08_reporte_segmentos.csv", index=False)

# Documentos listos para MongoDB: uno por mano.
documentos = [
    {"mano_id": r.id, "letra": r.letra, "grupo": int(r.grupo), "nombre_grupo": r.nombre_grupo,
     "distancia_centroide": float(r.distancia_centroide), "silueta": float(r.silueta), "atipica": bool(r.atipica)}
    for r in reporte.itertuples()
]
(RESULTADOS / "p08_segmentos_mongo.json").write_text(json.dumps(documentos, ensure_ascii=False), encoding="utf-8")

if "--mongo" in sys.argv:
    from pymongo import MongoClient

    entorno = {}
    for linea in (AQUI.parent / "backend" / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in linea and not linea.lstrip().startswith("#"):
            k, v = linea.split("=", 1)
            entorno[k.strip()] = v.strip().strip('"').strip("'")
    cliente = MongoClient(entorno.get("MONGODB_URI", "mongodb://localhost:27017"))
    coleccion = cliente[entorno.get("MONGODB_DB", "traductor_senas")]["segmentos_manos"]
    coleccion.delete_many({})  # se reemplaza el análisis anterior completo
    coleccion.insert_many([d | {"fecha": pd.Timestamp.now().to_pydatetime()} for d in documentos])
    print(f"\nGuardados {len(documentos)} documentos en MongoDB (colección «segmentos_manos»).")
    cliente.close()

# Para la app: se agrega el análisis al grupos.json de la práctica 07.
r4 = lambda v: round(float(v), 4)  # noqa: E731
P07["analisis"] = {
    "inicializaciones": [{k: (r4(v) if isinstance(v, float) else v) for k, v in r.items()} for r in inicializaciones],
    "empateInicializacion": bool(diferencia < min(r["inerciaDesviacion"] for r in inicializaciones)),
    "escaladores": [{k: (r4(v) if isinstance(v, float) else v) for k, v in r.items()} for r in escaladores],
    "ariEscaladores": r4(ari_escalas),
    "estabilidad": {"semillas": SEMILLAS, "promedio": r4(np.mean(pares)), "minimo": r4(np.min(pares)), "veredicto": veredicto},
    "parecidos": [{"a": int(i), "b": int(j), "distancia": r4(d)} for d, i, j in pares_cercanos],
    "siluetaGrupo": [{"grupo": r["grupo"], "silueta": r4(r["silueta"]), "negativas": r["negativas"]} for r in silueta_grupo],
    "atipicas": {
        "percentil": PERCENTIL_ATIPICO,
        "umbral": r4(umbral),
        "total": int(atipica.sum()),
        "giroAtipicas": round(float(giro[atipica].mean()), 1),
        "giroNormales": round(float(giro[~atipica].mean()), 1),
        "porLetra": [{"letra": l, "manos": int(n)} for l, n in por_letra.head(8).items()],
    },
}
archivo_grupos.write_text(json.dumps(P07, ensure_ascii=False, indent=1), encoding="utf-8")

titulo("8. EXPORTADO")
print("ml/datos/manos_atipicas.csv                (manos para revisar)")
print("resultados/p08_reporte_segmentos.csv       (reporte completo, una fila por mano)")
print("resultados/p08_segmentos_mongo.json        (listo para MongoDB; o corre con --mongo)")
print("frontend/src/lib/ia/grupos/grupos.json     (se agregó la sección «analisis»)")
