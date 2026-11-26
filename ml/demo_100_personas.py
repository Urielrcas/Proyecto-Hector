# ============================================================
# DATOS DE DEMOSTRACIÓN: 100 PERSONAS SIMULADAS
# ============================================================
#
# La base real todavía tiene muy pocos intentos de práctica, así que las gráficas «por personas»
# saldrían casi vacías. Este programa simula 100 personas practicando (simulacion_intentos.py)
# y calcula EXACTAMENTE lo mismo que el backend calcula con los datos reales:
#
#   1. Dominio por letra (Estadísticas → «¿Cuántas personas dominan cada letra?»):
#      el nivel de cada persona en cada letra es el promedio de sus últimos 5 intentos, y se
#      cuenta cuántas quedan en 0–20, 20–40, 40–60, 60–80 y 80–100 %.
#      (igual que GET /api/intentos/tablero, sección «dominio»)
#   2. Confusiones por personas (IA por dentro → «Señas parecidas»):
#      con qué letra se confundió cada una y cuántas personas DISTINTAS la confundieron así.
#      (igual que GET /api/intentos/confusiones)
#
# Cuando una persona simulada falla, la letra que «vio» la IA sale de las letras más parecidas
# a la que intentaba (práctica 08b: distancia entre los centros de las letras), con más
# probabilidad mientras más parecida sea. Así la X se confunde con la E, la Q, la S o la A.
#
# La app muestra estos datos SOLO con la etiqueta «Demostración (100 personas simuladas)».
# No son de ninguna persona real.
#
# Entrada: frontend/src/lib/ia/grupos/grupos.json (sección «familias», de p08b_familias_senas.py)
# Salida:  frontend/src/lib/ia/demo/demo_personas.json, resultados/demo_*.csv
#
# Uso:  python demo_100_personas.py
# ============================================================

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from simulacion_intentos import simular

sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).parent
RAIZ = AQUI.parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)
ARCHIVO_GRUPOS = RAIZ / "frontend" / "src" / "lib" / "ia" / "grupos" / "grupos.json"
SALIDA = RAIZ / "frontend" / "src" / "lib" / "ia" / "demo" / "demo_personas.json"
PERSONAS = 100
SEMILLA = 100
INTENTOS_NIVEL = 5  # igual que el backend (app/rutas/intentos.py)
PROB_DETECTADA = 0.7  # al fallar, qué tan seguido la IA «ve» otra letra
LETRAS_LSM = list("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ")


def titulo(texto):
    print("\n========================================")
    print(texto)
    print("========================================")


def clase_de(letra):
    return "I/J" if letra in ("I", "J") else "N/Ñ" if letra in ("N", "Ñ") else letra


def rango_de(nivel):
    return min(4, int(nivel // 20))


# ------------------------------------------------------------
# 1. SIMULAR 100 PERSONAS
# ------------------------------------------------------------
titulo(f"1. SIMULAR {PERSONAS} PERSONAS")
grupos = json.loads(ARCHIVO_GRUPOS.read_text(encoding="utf-8"))
if "familias" not in grupos:
    sys.exit("Primero corre p08b_familias_senas.py (calcula las letras parecidas).")
parecidas = grupos["familias"]["parecidas"]

intentos = simular(usuarios=PERSONAS, semilla=SEMILLA)
azar = np.random.default_rng(SEMILLA)
detectadas = []
for fila in intentos.itertuples():
    if fila.acierto or azar.random() > PROB_DETECTADA:
        detectadas.append(None)
        continue
    opciones = parecidas[clase_de(fila.letra)]
    peso = np.array([p["parecido"] for p in opciones], dtype=float) ** 2
    elegida = opciones[azar.choice(len(opciones), p=peso / peso.sum())]["letra"]
    detectadas.append(elegida.split("/")[0])  # «I/J» → I, como la guardaría la app
intentos["letra_detectada"] = detectadas
print(f"Intentos: {len(intentos):,} | personas: {intentos['usuario'].nunique()} | letras: {intentos['letra'].nunique()}")

# ------------------------------------------------------------
# 2. DOMINIO POR LETRA
# ------------------------------------------------------------
titulo("2. ¿CUÁNTAS PERSONAS DOMINAN CADA LETRA?")
intentos = intentos.sort_values("fecha")
niveles = intentos.groupby(["usuario", "letra"])["puntaje"].apply(lambda p: p.tail(INTENTOS_NIVEL).mean()).reset_index(name="nivel")
dominio = []
for letra in LETRAS_LSM:
    n = niveles[niveles["letra"] == letra]["nivel"]
    if n.empty:
        continue
    rangos = [0] * 5
    for v in n:
        rangos[rango_de(v)] += 1
    dominio.append({"letra": letra, "personas": int(len(n)), "rangos": rangos, "promedio": round(float(n.mean()), 1)})
pd.DataFrame([{**d, **{f"r{i}": v for i, v in enumerate(d.pop("rangos"))}} for d in [dict(x) for x in dominio]]).to_csv(
    RESULTADOS / "demo_dominio.csv", index=False)
print("letra  personas   0-20  20-40  40-60  60-80  80-100  promedio")
for d in dominio[:8]:
    print(f"{d['letra']:<6} {d['personas']:>8}  " + "  ".join(f"{v:>5}" for v in d["rangos"]) + f"  {d['promedio']:>7}")

# ------------------------------------------------------------
# 3. CONFUSIONES POR PERSONAS
# ------------------------------------------------------------
titulo("3. ¿CUÁNTAS PERSONAS CONFUNDIERON CADA LETRA?")
practicaron = intentos.groupby("letra")["usuario"].nunique()
fallos = intentos.dropna(subset=["letra_detectada"])
fallos = fallos[fallos["letra"] != fallos["letra_detectada"]]
pares = (fallos.groupby(["letra", "letra_detectada"])
         .agg(veces=("usuario", "size"), personas=("usuario", "nunique"))
         .reset_index().sort_values(["personas", "veces"], ascending=False))
pares.to_csv(RESULTADOS / "demo_confusiones.csv", index=False)
for r in pares.head(8).itertuples():
    print(f"  {r.letra} → {r.letra_detectada}: {r.personas} de {practicaron[r.letra]} personas ({r.veces} veces)")

# ------------------------------------------------------------
# 4. EXPORTAR PARA LA APP
# ------------------------------------------------------------
SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(json.dumps({
    "fecha": date.today().isoformat(),
    "descripcion": f"Demostración: {PERSONAS} personas simuladas (ml/demo_100_personas.py). No son personas reales.",
    "personas": PERSONAS,
    "intentos": int(len(intentos)),
    "dominio": dominio,
    "confusiones": {
        "personas": PERSONAS,
        "practicaron": {l: int(n) for l, n in practicaron.items()},
        "pares": [{"letra": r.letra, "con": r.letra_detectada, "veces": int(r.veces), "personas": int(r.personas)} for r in pares.itertuples()],
    },
}, ensure_ascii=False, indent=1), encoding="utf-8")
titulo("4. EXPORTADO")
print("frontend/src/lib/ia/demo/demo_personas.json")
print("resultados/demo_dominio.csv, resultados/demo_confusiones.csv")
