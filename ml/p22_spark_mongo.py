# ============================================================
# PRÁCTICA 22 · PERSISTENCIA MASIVA CON SPARK Y MONGODB
# (adaptación de p22persistencia_spark_atlas.py de SmartAcademy)
#
# Guarda en MongoDB las manos que limpió la práctica 21:
#   - Lee el Parquet con Spark.
#   - Cada partición de Spark se inserta por su cuenta, en lotes de 1,000 (en paralelo).
#   - «Upsert»: si la mano ya estaba (mismo id), se actualiza en lugar de duplicarse;
#     así se puede correr las veces que sea sin repetir datos.
#   - Crea índices para buscar rápido por letra y por tramo de giro.
#   - Al final valida que estén todas y cuenta por letra con una agregación.
#
# Usa una colección APARTE («manos_masivas»), para no mezclar las manos sintéticas del
# avatar con las grabaciones reales de los usuarios.
# La conexión sale de backend/.env (MONGODB_URI y MONGODB_DB), igual que la app.
#
# Entrada: datos/spark_manos/  ·  Salida: colección manos_masivas en MongoDB
# ============================================================

import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

os.environ.setdefault("PYSPARK_PYTHON", sys.executable)
os.environ.setdefault("PYSPARK_DRIVER_PYTHON", sys.executable)

from pymongo import ASCENDING, MongoClient, UpdateOne  # noqa: E402
from pyspark.sql import SparkSession  # noqa: E402

from app_json import actualizar  # noqa: E402

AQUI = Path(__file__).parent
ENTRADA = AQUI / "datos" / "spark_manos"
COLECCION = "manos_masivas"
LOTE = 1000


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


def leer_entorno():
    """MONGODB_URI y MONGODB_DB de backend/.env (las mismas que usa el backend)."""
    entorno = {}
    archivo = AQUI.parent / "backend" / ".env"
    if archivo.exists():
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.lstrip().startswith("#"):
                clave, valor = linea.split("=", 1)
                entorno[clave.strip()] = valor.strip()
    return entorno.get("MONGODB_URI", "mongodb://localhost:27017"), entorno.get("MONGODB_DB", "traductor_senas")


# Esta función corre DENTRO de cada partición de Spark (en otro proceso):
# por eso abre su propia conexión a MongoDB.
def insertar_particion(filas, uri, nombre_db):
    cliente = MongoClient(uri, serverSelectionTimeoutMS=10000)
    coleccion = cliente[nombre_db][COLECCION]
    ahora = datetime.now(UTC)
    lote, insertadas, actualizadas = [], 0, 0

    def mandar():
        nonlocal insertadas, actualizadas
        r = coleccion.bulk_write(lote, ordered=False)
        insertadas += r.upserted_count
        actualizadas += r.modified_count
        lote.clear()

    for fila in filas:
        doc = fila.asDict()
        doc["cargado_en"] = ahora
        lote.append(UpdateOne({"_id": int(doc.pop("id"))}, {"$set": doc}, upsert=True))
        if len(lote) >= LOTE:
            mandar()
    if lote:
        mandar()
    cliente.close()
    yield (insertadas, actualizadas)


titulo("1. CONEXIÓN CON MONGODB")
URI, NOMBRE_DB = leer_entorno()
cliente = MongoClient(URI, serverSelectionTimeoutMS=5000)
cliente.admin.command("ping")
coleccion = cliente[NOMBRE_DB][COLECCION]
print(f"Conectado. Base «{NOMBRE_DB}», colección «{COLECCION}» (ya tenía {coleccion.estimated_document_count():,} manos)")

titulo("2. LEER EL PARQUET CON SPARK")
inicio = time.time()
spark = SparkSession.builder.appName("TraductorSenas-Mongo").master("local[*]").getOrCreate()
spark.sparkContext.setLogLevel("ERROR")
try:
    df = spark.read.parquet(str(ENTRADA))
    total = df.count()
except Exception as error:  # En Windows, Spark necesita winutils.exe/hadoop.dll para leer del disco.
    import pandas as pd

    print("Spark no pudo leer del disco (en Windows le falta winutils.exe de Hadoop):", type(error).__name__)
    print("Se lee con pyarrow y se le pasa a Spark en 4 particiones.")
    spark.conf.set("spark.sql.execution.arrow.pyspark.enabled", "true")
    df = spark.createDataFrame(pd.read_parquet(ENTRADA)).repartition(4)
    total = df.count()
particiones = df.rdd.getNumPartitions()
print(f"Manos: {total:,} | particiones: {particiones}")

titulo("3. INSERCIÓN MASIVA POR PARTICIONES (upsert en lotes)")
resultados = df.rdd.mapPartitions(lambda filas: insertar_particion(filas, URI, NOMBRE_DB)).collect()
insertadas = sum(r[0] for r in resultados)
actualizadas = sum(r[1] for r in resultados)
print(f"Nuevas: {insertadas:,} | actualizadas: {actualizadas:,} | lotes de {LOTE:,}")

titulo("4. ÍNDICES")
coleccion.create_index([("letra", ASCENDING)])
coleccion.create_index([("tramo_giro", ASCENDING), ("letra", ASCENDING)])
print("Índices:", ", ".join(coleccion.index_information()))

titulo("5. VALIDACIÓN FINAL")
en_mongo = coleccion.count_documents({})
print(f"En MongoDB: {en_mongo:,} · en el Parquet: {total:,} → {'✓ coinciden' if en_mongo >= total else '✗ faltan manos'}")
por_letra = list(coleccion.aggregate([{"$group": {"_id": "$letra", "manos": {"$sum": 1}}}, {"$sort": {"_id": 1}}]))
print("Manos por letra:", ", ".join(f"{d['_id']}={d['manos']}" for d in por_letra[:8]), "…")
ejemplo = coleccion.find_one({"letra": "B"}, {"_id": 1, "letra": 1, "dedos_estirados": 1, "tramo_giro": 1})
print("Ejemplo:", ejemplo)
segundos = time.time() - inicio

actualizar(
    "mongo",
    {
        "coleccion": COLECCION,
        "documentos": en_mongo,
        "nuevas": insertadas,
        "actualizadas": actualizadas,
        "particiones": particiones,
        "lote": LOTE,
        "segundos": round(segundos, 1),
    },
)
spark.stop()
cliente.close()
print("\nSiguiente paso: python p23_preparar_cnn1d.py")
