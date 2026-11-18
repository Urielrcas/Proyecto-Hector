# ============================================================
# PRACTICA 07 (adaptada a nuestro proyecto)
# SEGMENTACION DE SEÑAS MEDIANTE K-MEANS
# ============================================================
#
# En la práctica de clase se agrupaban ESTUDIANTES sin usar la columna «aprueba».
# Aquí agrupamos MANOS sin usar la columna «letra»: el algoritmo no sabe qué letra es cada mano,
# solo ve sus 57 medidas (posiciones, ángulos de los dedos y distancias).
#
# Pregunta: ¿qué letras tienen una forma de mano tan parecida que el algoritmo las junta?
# Eso le sirve a la app para avisar al usuario: «cuidado, la M se parece a la N».
#
# K-Means:
#   1. Inicialización: escoge K centros (centroides).
#   2. Asignación: cada mano se va con el centro más cercano.
#   3. Actualización: cada centro se mueve al promedio de sus manos.
#   4. Convergencia: repite 2 y 3 hasta que los grupos ya no cambian.
#
# Etapas:
#   1. Datos y escalamiento (StandardScaler)
#   2. Método del codo (inercia)
#   3. Coeficiente de silueta
#   4. Modelo final con el K elegido
#   5. Interpretar los grupos: qué letras cayeron en cada uno y cómo están los dedos
#   6. Gráficas y exportar (CSV para las prácticas 8 y 9, JSON para la app)

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding="utf-8")  # para que la consola de Windows muestre acentos

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
DESTINO_APP = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "grupos"
DESTINO_APP.mkdir(parents=True, exist_ok=True)
SEMILLA = 42
N_INIT = 10          # K-Means se repite 10 veces con centros iniciales distintos y se queda con la mejor
RANGO_K = range(2, 13)
# Con 25 letras, 2 o 3 grupos dicen muy poco («dedos estirados / doblados») y más de 10 dejan
# grupos de una sola letra. Elegimos K dentro de este rango útil.
K_UTIL = range(4, 11)

DEDOS = ["indice", "medio", "anular", "menique"]
NOMBRE_DEDO = {"indice": "índice", "medio": "medio", "anular": "anular", "menique": "meñique"}


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


# ------------------------------------------------------------
# 1. DATOS Y ESCALAMIENTO
# ------------------------------------------------------------
df = pd.read_csv(AQUI / "datos" / "manos_limpias.csv")
COLUMNAS_X = [c for c in df.columns if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
X = df[COLUMNAS_X]
titulo("1. DATOS")
print("Manos:", len(df), "| medidas:", len(COLUMNAS_X))
print("La columna «letra» NO se usa para agrupar; solo al final, para interpretar.")

# K-Means mide distancias: sin escalar, los ángulos (0 a 180) pesarían muchísimo más que las
# posiciones (0 a 1). StandardScaler deja cada medida con promedio 0 y desviación 1.
escala = StandardScaler()
Z = escala.fit_transform(X)

# ------------------------------------------------------------
# 2. MÉTODO DEL CODO
# ------------------------------------------------------------
# Inercia = suma de distancias (al cuadrado) de cada mano a su centro. Siempre baja al subir K;
# buscamos el «codo», donde deja de bajar mucho.
# ------------------------------------------------------------
# 3. COEFICIENTE DE SILUETA
# ------------------------------------------------------------
# Para cada mano compara qué tan cerca está de su grupo contra el grupo vecino:
#   cerca de 1 → bien separada · cerca de 0 → en la frontera · negativo → probablemente mal asignada.
titulo("2 y 3. MÉTODO DEL CODO Y SILUETA")
codo = []
for k in RANGO_K:
    m = KMeans(n_clusters=k, init="k-means++", n_init=N_INIT, random_state=SEMILLA).fit(Z)
    sil = silhouette_score(Z, m.labels_)
    codo.append({"k": k, "inercia": float(m.inertia_), "silueta": float(sil)})
    print(f"K={k:>2}  inercia {m.inertia_:>9.0f}  silueta {sil:.3f}")

utiles = [c for c in codo if c["k"] in K_UTIL]
K = max(utiles, key=lambda c: c["silueta"])["k"]
print(f"\nK elegido: {K} (la mejor silueta entre {K_UTIL.start} y {K_UTIL.stop - 1})")
print("Ojo: la silueta es baja (~0.2) porque las letras no forman islas separadas: hay manos")
print("giradas, más chicas o más anchas que quedan entre dos grupos. Es normal en datos reales.")

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=120)
ax.plot([c["k"] for c in codo], [c["inercia"] for c in codo], marker="o", linewidth=2)
ax.axvline(K, color="#15803d", linestyle="--", label=f"K elegido = {K}")
ax.set_xlabel("Número de grupos (K)")
ax.set_ylabel("Inercia")
ax.set_title("Método del codo", loc="left")
ax.grid(True, linestyle="--", alpha=0.5)
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p07_metodo_del_codo.png")
plt.close(fig)

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=120)
ax.plot([c["k"] for c in codo], [c["silueta"] for c in codo], marker="s", linewidth=2, color="#7c3aed")
ax.axvline(K, color="#15803d", linestyle="--", label=f"K elegido = {K}")
ax.set_xlabel("Número de grupos (K)")
ax.set_ylabel("Coeficiente de silueta")
ax.set_title("Silueta según K (más alto = grupos mejor separados)", loc="left")
ax.grid(True, linestyle="--", alpha=0.5)
ax.legend()
fig.tight_layout()
fig.savefig(RESULTADOS / "p07_silueta.png")
plt.close(fig)

# ------------------------------------------------------------
# 4. MODELO FINAL
# ------------------------------------------------------------
modelo = KMeans(n_clusters=K, init="k-means++", n_init=N_INIT, random_state=SEMILLA).fit(Z)
etiquetas = modelo.labels_
titulo(f"4. MODELO FINAL (K={K})")
print("Iteraciones hasta converger:", modelo.n_iter_)
print("Inercia:", round(modelo.inertia_))

# ------------------------------------------------------------
# 5. INTERPRETAR LOS GRUPOS
# ------------------------------------------------------------
# Los centroides están en la escala de StandardScaler; inverse_transform los regresa a grados y
# distancias reales para poder leerlos.
centros = pd.DataFrame(escala.inverse_transform(modelo.cluster_centers_), columns=COLUMNAS_X)


def estado_dedo(angulo):
    """Ángulo de la articulación media: 180 = recto."""
    if angulo >= 155:
        return "estirado"
    if angulo >= 115:
        return "curvo"
    return "doblado"


def describir(fila):
    estados = {d: estado_dedo(fila[f"angulo_{d}_medio"]) for d in DEDOS}
    valores = set(estados.values())
    if valores == {"doblado"}:
        nombre = "Puño cerrado"
    elif valores == {"curvo"}:
        nombre = "Mano curva"
    elif valores == {"estirado"}:
        nombre = "Mano abierta"
    else:
        estirados = [NOMBRE_DEDO[d] for d in DEDOS if estados[d] == "estirado"]
        nombre = ("Estirados: " + ", ".join(estirados)) if estirados else "Dedos en gancho"
    partes = []
    for e in ("estirado", "curvo", "doblado"):
        dedos = [NOMBRE_DEDO[d] for d in DEDOS if estados[d] == e]
        if dedos:
            plural = "s" if len(dedos) > 1 else ""
            partes.append(f"{' y '.join([', '.join(dedos[:-1]), dedos[-1]] if len(dedos) > 1 else dedos)} {e}{plural}")
    return nombre, "; ".join(partes).capitalize(), estados


# Tabla letra × grupo: qué porcentaje de las manos de cada letra cayó en cada grupo.
tabla = pd.crosstab(df["letra"], etiquetas, normalize="index")
grupo_de_letra = tabla.idxmax(axis=1)
giro_total = df["giro"].astype(float).mean()

titulo("5. ¿QUÉ LETRAS JUNTÓ CADA GRUPO?")
grupos = []
for g in range(K):
    nombre, descripcion, estados = describir(centros.iloc[g])
    letras_g = sorted(grupo_de_letra[grupo_de_letra == g].index, key=lambda l: -tabla.loc[l, g])
    manos = int((etiquetas == g).sum())
    giro = float(df.loc[etiquetas == g, "giro"].astype(float).mean())
    if not letras_g:
        # Grupo sin ninguna letra «propia»: lo forman manos de varias letras que comparten algo raro.
        nombre = "Manos muy giradas o deformadas" if giro > giro_total * 1.3 else "Mezcla de letras"
    grupos.append({
        "id": g,
        "nombre": nombre,
        "descripcion": descripcion,
        "dedos": estados,
        "manos": manos,
        "giroPromedio": round(giro, 1),
        "letras": [{"letra": l, "porcentaje": round(float(tabla.loc[l, g]), 3)} for l in letras_g],
    })
    print(f"Grupo {g + 1} · {nombre} ({manos} manos, giro promedio {giro:.0f}°)")
    print(f"   {descripcion}")
    print(f"   Letras: {', '.join(f'{l} ({tabla.loc[l, g]:.0%})' for l in letras_g) or 'ninguna mayoritaria'}")

# Si dos grupos quedaron con el mismo nombre, se distinguen por sus letras («Estirados: índice · X»).
repetidos = {g["nombre"] for g in grupos if sum(o["nombre"] == g["nombre"] for o in grupos) > 1}
for g in grupos:
    if g["nombre"] in repetidos and g["letras"]:
        g["nombre"] += " · " + ", ".join(l["letra"] for l in g["letras"][:3])

# Letras «divididas»: menos del 70 % de sus manos cayeron en su grupo (el giro las cambia de grupo).
divididas = [l for l in tabla.index if tabla.loc[l].max() < 0.70]
print("\nLetras que se reparten entre grupos (menos del 70 % en uno):", ", ".join(divididas) or "ninguna")

# ------------------------------------------------------------
# 6. GRÁFICA Y EXPORTAR
# ------------------------------------------------------------
orden_letras = sorted(tabla.index, key=lambda l: (grupo_de_letra[l], -tabla.loc[l].max()))
fig, ax = plt.subplots(figsize=(7, 9), dpi=120)
ax.imshow(tabla.loc[orden_letras].to_numpy(), cmap="Greens", aspect="auto", vmin=0, vmax=1)
ax.set_xticks(range(K), [f"G{g + 1}" for g in range(K)])
ax.set_yticks(range(len(orden_letras)), orden_letras)
ax.set_xlabel("Grupo encontrado por K-Means")
ax.set_ylabel("Letra (no se usó para agrupar)")
ax.set_title("¿En qué grupo cayeron las manos de cada letra?", loc="left")
for i, l in enumerate(orden_letras):
    for g in range(K):
        v = tabla.loc[l, g]
        if v >= 0.05:
            ax.text(g, i, f"{v:.0%}", ha="center", va="center", fontsize=7, color="white" if v > 0.5 else "#1c1917")
fig.tight_layout()
fig.savefig(RESULTADOS / "p07_letras_por_grupo.png")
plt.close(fig)

# CSV para las prácticas 8 y 9.
(df[["id", "letra", "giro"]].assign(grupo=etiquetas)).to_csv(AQUI / "datos" / "manos_grupos.csv", index=False)

# JSON para la app: los grupos y, para cada letra, con qué otras letras comparte grupo.
parecidas = {l: [o for o in grupo_de_letra.index if o != l and grupo_de_letra[o] == grupo_de_letra[l]] for l in grupo_de_letra.index}
salida = {
    "fecha": pd.Timestamp.now().strftime("%Y-%m-%d"),
    "manos": len(df),
    "medidas": len(COLUMNAS_X),
    "k": K,
    "kUtil": [K_UTIL.start, K_UTIL.stop - 1],
    "codo": [{"k": c["k"], "inercia": round(c["inercia"]), "silueta": round(c["silueta"], 4)} for c in codo],
    "silueta": round(float(silhouette_score(Z, etiquetas)), 4),
    "grupos": grupos,
    "letras": {l: {"grupo": int(grupo_de_letra[l]), "porcentaje": round(float(tabla.loc[l].max()), 3), "parecidas": parecidas[l]} for l in tabla.index},
    "divididas": divididas,
}
(DESTINO_APP / "grupos.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")

titulo("6. EXPORTADO")
print("ml/datos/manos_grupos.csv                (grupo de cada mano, para p08 y p09)")
print("frontend/src/lib/ia/grupos/grupos.json   (para la app)")
print("resultados/p07_metodo_del_codo.png, p07_silueta.png, p07_letras_por_grupo.png")
