# ============================================================
# PRÁCTICA 16 · CONSULTAS INTELIGENTES Y ANÁLISIS ESTADÍSTICO
# (adaptación de p16consultasinteligentes.py de SmartAcademy)
#
# En la práctica se consultaban los análisis de los alumnos para encontrar a los que
# estaban en riesgo y sacar promedios por perfil. Aquí se consultan los INTENTOS de
# práctica que guarda la app (colección «intentos» de MongoDB, ver backend/app/rutas/intentos.py):
#
#   Operación   Técnica MongoDB        Para qué
#     1         find()                 Traer el historial de intentos
#     2         $match                 Intentos fallidos (y con qué letra se confundió)
#     3         $group por letra       Qué letras cuestan más (tasa de acierto, puntaje)
#     4         $group por persona     Quién practica mucho pero no avanza («necesita ayuda»)
#     5         $sort                  Ordenar del más difícil al más fácil
#     6         aggregate() + $facet   Estadísticas generales y por grupo de K-Means
#
# Las mismas consultas las hace el backend para el tablero del administrador
# (rutas/estadisticas.py → /api/estadisticas/intentos).
#
# Uso:
#   python p16_consultas_intentos.py          → con los intentos reales de la app
#   python p16_consultas_intentos.py --demo   → carga intentos SIMULADOS en «intentos_demo»
#                                                (simulacion_intentos.py) y consulta esa colección
# Salida: resultados/p16_historial.csv, p16_fallidos.csv, p16_letras.csv, p16_personas.csv,
#         p16_generales.csv
# ============================================================

import json
import sys
from pathlib import Path

import pandas as pd
from pymongo import MongoClient

AQUI = Path(__file__).parent
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)

# Reglas para decir que alguien «necesita ayuda» (las mismas del backend).
MIN_INTENTOS_AYUDA = 10
MAX_TASA_AYUDA = 0.15


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


def conectar():
    """La base de datos de la app (MONGODB_URI y MONGODB_DB de backend/.env)."""
    entorno = {}
    archivo = AQUI.parent / "backend" / ".env"
    if archivo.exists():
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.lstrip().startswith("#"):
                clave, valor = linea.split("=", 1)
                entorno[clave.strip()] = valor.strip()
    cliente = MongoClient(entorno.get("MONGODB_URI", "mongodb://localhost:27017"), serverSelectionTimeoutMS=8000)
    cliente.admin.command("ping")
    return cliente[entorno.get("MONGODB_DB", "traductor_senas")]


def grupo_de_letra():
    """Letra → nombre de su grupo de K-Means (práctica 07)."""
    archivo = AQUI.parent / "frontend" / "src" / "lib" / "ia" / "grupos" / "grupos.json"
    g = json.loads(archivo.read_text(encoding="utf-8"))
    nombres = {x["id"]: x["nombre"] for x in g["grupos"]}
    return {letra: nombres[info["grupo"]] for clase, info in g["letras"].items() for letra in clase.split("/")}


if __name__ == "__main__":
    db = conectar()
    demo = "--demo" in sys.argv
    if demo:
        from simulacion_intentos import simular

        titulo("0. CARGAR INTENTOS SIMULADOS (modo demo)")
        tabla = simular(usuarios=300, semilla=16)
        tabla = tabla.rename(columns={"usuario": "usuario_id"}).drop(columns=["intento"])
        db.intentos_demo.drop()
        db.intentos_demo.insert_many(tabla.to_dict("records"))
        print(f"{len(tabla):,} intentos de {tabla['usuario_id'].nunique()} personas en «intentos_demo»")
    coleccion = db.intentos_demo if demo else db.intentos
    print(f"Base «{db.name}», colección «{coleccion.name}»: {coleccion.estimated_document_count():,} intentos")
    if coleccion.estimated_document_count() == 0:
        print("No hay intentos todavía. Practica letras en la app o corre con --demo.")
        sys.exit(0)

    # 1. find(): todo el historial (sin el _id, ordenado por fecha)
    titulo("1. find() · HISTORIAL DE INTENTOS")
    historial = pd.DataFrame(list(coleccion.find({}, {"_id": 0}).sort("fecha", 1)))
    historial["usuario_id"] = historial["usuario_id"].astype(str)
    print(historial[["usuario_id", "letra", "acierto", "puntaje", "segundos", "fecha"]].tail(5).to_string(index=False))

    # 2. $match: los fallidos y con qué letra se confundieron
    titulo("2. $match · INTENTOS FALLIDOS Y CONFUSIONES")
    confusiones = list(coleccion.aggregate([
        {"$match": {"acierto": False, "letra_detectada": {"$ne": None}}},
        {"$group": {"_id": {"letra": "$letra", "dijo": "$letra_detectada"}, "veces": {"$sum": 1}}},
        {"$sort": {"veces": -1}},
        {"$limit": 15},
    ]))
    fallidos = pd.DataFrame([{"letra": c["_id"]["letra"], "confundida_con": c["_id"]["dijo"], "veces": c["veces"]} for c in confusiones])
    print(fallidos.head(8).to_string(index=False))

    # 3. $group por letra + 5. $sort: de la más difícil a la más fácil
    titulo("3 y 5. $group POR LETRA + $sort · LETRAS MÁS DIFÍCILES")
    letras = pd.DataFrame(list(coleccion.aggregate([
        {"$group": {"_id": "$letra", "intentos": {"$sum": 1}, "aciertos": {"$sum": {"$cond": ["$acierto", 1, 0]}},
                    "puntaje": {"$avg": "$puntaje"}, "segundos": {"$avg": "$segundos"}, "personas": {"$addToSet": "$usuario_id"}}},
        {"$project": {"_id": 0, "letra": "$_id", "intentos": 1, "aciertos": 1, "puntaje": {"$round": ["$puntaje", 1]},
                      "segundos": {"$round": ["$segundos", 1]}, "personas": {"$size": "$personas"},
                      "tasa": {"$round": [{"$divide": ["$aciertos", "$intentos"]}, 3]}}},
        {"$sort": {"tasa": 1, "intentos": -1}},
    ])))
    print(letras.head(8).to_string(index=False))

    # 4. $group por persona: quién necesita ayuda
    titulo("4. $group POR PERSONA · ¿QUIÉN NECESITA AYUDA?")
    personas = pd.DataFrame(list(coleccion.aggregate([
        {"$group": {"_id": "$usuario_id", "intentos": {"$sum": 1}, "aciertos": {"$sum": {"$cond": ["$acierto", 1, 0]}},
                    "puntaje": {"$avg": "$puntaje"}, "letras": {"$addToSet": "$letra"}, "ultimo": {"$max": "$fecha"}}},
        {"$project": {"_id": 0, "usuario_id": {"$toString": "$_id"}, "intentos": 1, "aciertos": 1, "puntaje": {"$round": ["$puntaje", 1]},
                      "letras": {"$size": "$letras"}, "ultimo": 1, "tasa": {"$round": [{"$divide": ["$aciertos", "$intentos"]}, 3]}}},
        {"$sort": {"tasa": 1}},
    ])))
    personas["necesita_ayuda"] = (personas["intentos"] >= MIN_INTENTOS_AYUDA) & (personas["tasa"] <= MAX_TASA_AYUDA)
    ayuda = personas[personas["necesita_ayuda"]]
    print(f"Personas: {len(personas)} · necesitan ayuda: {len(ayuda)} (≥ {MIN_INTENTOS_AYUDA} intentos y ≤ {MAX_TASA_AYUDA:.0%} de aciertos)")
    print(ayuda.head(5).to_string(index=False))

    # 6. aggregate() con $facet: estadísticas generales en una sola consulta
    titulo("6. aggregate() + $facet · ESTADÍSTICAS GENERALES")
    facetas = list(coleccion.aggregate([
        {"$facet": {
            "total": [{"$group": {"_id": None, "intentos": {"$sum": 1}, "aciertos": {"$sum": {"$cond": ["$acierto", 1, 0]}},
                                  "puntaje": {"$avg": "$puntaje"}, "segundos": {"$avg": "$segundos"}, "personas": {"$addToSet": "$usuario_id"}}}],
            "porPuntaje": [{"$group": {"_id": "$puntaje", "veces": {"$sum": 1}}}, {"$sort": {"_id": 1}}],
            "dedos": [{"$unwind": "$dedos_fallados"}, {"$group": {"_id": "$dedos_fallados", "veces": {"$sum": 1}}}, {"$sort": {"veces": -1}}],
        }}
    ]))[0]
    t = facetas["total"][0]
    generales = pd.DataFrame([{"intentos": t["intentos"], "aciertos": t["aciertos"], "tasa": round(t["aciertos"] / t["intentos"], 3),
                               "puntaje": round(t["puntaje"], 1), "segundos": round(t["segundos"], 1), "personas": len(t["personas"])}])
    print(generales.to_string(index=False))
    print("Dedo que más se falla:", ", ".join(f"{d['_id']} ({d['veces']:,})" for d in facetas["dedos"][:3]))
    # Por grupo de K-Means (se junta en pandas con el grupo de cada letra)
    letras["grupo"] = letras["letra"].map(grupo_de_letra())
    por_grupo = letras.groupby("grupo").agg(intentos=("intentos", "sum"), aciertos=("aciertos", "sum")).assign(tasa=lambda x: (x["aciertos"] / x["intentos"]).round(3)).sort_values("tasa")
    print("\nPor grupo de señas parecidas (K-Means):")
    print(por_grupo.to_string())

    titulo("REPORTES")
    historial.to_csv(RESULTADOS / "p16_historial.csv", index=False)
    fallidos.to_csv(RESULTADOS / "p16_fallidos.csv", index=False)
    letras.to_csv(RESULTADOS / "p16_letras.csv", index=False)
    personas.to_csv(RESULTADOS / "p16_personas.csv", index=False)
    generales.to_csv(RESULTADOS / "p16_generales.csv", index=False)
    print("resultados/p16_historial.csv · p16_fallidos.csv · p16_letras.csv · p16_personas.csv · p16_generales.csv")
