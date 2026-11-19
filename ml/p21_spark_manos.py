# ============================================================
# PRÁCTICA 21 · PROCESAMIENTO MASIVO CON APACHE SPARK
# (adaptación de p21carga_masiva_spark.py de SmartAcademy)
#
# Lee las 50,500 manos de la práctica 20 con PySpark y las deja listas para entrenar:
#   1. Lectura del CSV con un esquema definido (cada columna con su tipo).
#   2. Validación: manos sin medidas y medidas imposibles (ángulos > 180°, puntos lejísimos).
#   3. Duplicados: la misma mano mandada dos veces (mismas medidas, distinto id).
#   4. Transformación: columnas nuevas útiles (dedos estirados, tramo de giro, número de clase).
#   5. Estadísticas distribuidas: por letra y por qué tan girada estaba la mano.
#   6. Exportación a Parquet (formato por columnas, mucho más ligero y rápido que el CSV).
#
# Spark reparte el trabajo en «particiones» y las procesa en paralelo (aquí, con los núcleos
# de la computadora; en un clúster serían varias computadoras).
#
# Entrada: datos/manos_masivas.csv
# Salida:  datos/spark_manos/ (Parquet), resultados/p21_*.csv
#
# Requisitos: pip install pyspark  (y Java 17 o más nuevo)
# ============================================================

import os
import shutil
import sys
import time
from pathlib import Path

# Spark lanza procesos de Python aparte: que usen este mismo Python.
os.environ.setdefault("PYSPARK_PYTHON", sys.executable)
os.environ.setdefault("PYSPARK_DRIVER_PYTHON", sys.executable)

from pyspark.sql import SparkSession  # noqa: E402
from pyspark.sql import functions as F  # noqa: E402
from pyspark.sql.types import DoubleType, LongType, StringType, StructField, StructType  # noqa: E402

from app_json import actualizar  # noqa: E402

AQUI = Path(__file__).parent
ENTRADA = AQUI / "datos" / "manos_masivas.csv"
SALIDA = AQUI / "datos" / "spark_manos"
RESULTADOS = AQUI / "resultados"
RESULTADOS.mkdir(exist_ok=True)


def titulo(texto):
    print("\n" + "=" * 60)
    print(texto)
    print("=" * 60)


# ------------------------------------------------------------
# 1. SESIÓN DE SPARK Y LECTURA CON ESQUEMA
# ------------------------------------------------------------
titulo("1. SESIÓN DE SPARK Y LECTURA DEL CSV")
inicio = time.time()
spark = (
    SparkSession.builder.appName("TraductorSenas-ManosMasivas")
    .master("local[*]")  # todos los núcleos de esta computadora
    .config("spark.sql.shuffle.partitions", "8")
    .config("spark.driver.memory", "2g")
    .getOrCreate()
)
spark.sparkContext.setLogLevel("ERROR")
print("Spark", spark.version, "| núcleos:", spark.sparkContext.defaultParallelism)

# Los nombres de las medidas salen del encabezado del CSV (las mismas 57 de la app).
encabezado = ENTRADA.open(encoding="utf-8").readline().strip().split(",")
TEXTO = {"origen", "letra", "prediccion_reglas", "reglas_todas"}
ENTEROS = {"id", "variacion", "detectada"}
esquema = StructType(
    [StructField(c, StringType() if c in TEXTO else LongType() if c in ENTEROS else DoubleType(), True) for c in encabezado]
)
MEDIDAS = [c for c in encabezado if c.startswith(("p", "angulo_", "pulgar_", "punta_")) and c != "prediccion_reglas"]
ANGULOS = [c for c in MEDIDAS if c.startswith("angulo_")]
POSICIONES = [c for c in MEDIDAS if c.endswith(("_u", "_v"))]
DISTANCIAS = [c for c in MEDIDAS if c.startswith(("pulgar_a", "punta_"))]

df = spark.read.csv(str(ENTRADA), header=True, schema=esquema)
total = df.count()
print(f"Manos leídas: {total:,} | columnas: {len(df.columns)} | particiones: {df.rdd.getNumPartitions()}")
df.select("id", "letra", "giro", "angulo_indice_medio", "pulgar_a_indice").show(5)

# ------------------------------------------------------------
# 2. VALIDACIÓN
# ------------------------------------------------------------
titulo("2. VALIDACIÓN DE LOS DATOS")
sin_medidas = F.greatest(*[F.col(c).isNull().cast("int") for c in MEDIDAS]) == 1
fuera_de_rango = (
    F.greatest(*[((F.col(c) < 0) | (F.col(c) > 180)).cast("int") for c in ANGULOS]) == 1
) | (
    F.greatest(*[(F.abs(F.col(c)) > 5).cast("int") for c in POSICIONES]) == 1
) | (
    F.greatest(*[((F.col(c) < 0) | (F.col(c) > 5)).cast("int") for c in DISTANCIAS]) == 1
)
df = df.withColumn(
    "motivo",
    F.when(sin_medidas, F.lit("sin medidas")).when(fuera_de_rango, F.lit("fuera de rango")).otherwise(F.lit(None)),
)
rechazadas = df.filter(F.col("motivo").isNotNull())
conteo_motivos = {r["motivo"]: r["count"] for r in rechazadas.groupBy("motivo").count().collect()}
for motivo, veces in conteo_motivos.items():
    print(f"  {motivo:<16} {veces:>6,}")
rechazadas.select("id", "letra", "motivo", "angulo_indice_medio", "p8_v").toPandas().to_csv(RESULTADOS / "p21_rechazadas.csv", index=False)
validas = df.filter(F.col("motivo").isNull()).drop("motivo")

# ------------------------------------------------------------
# 3. DUPLICADOS
# ------------------------------------------------------------
titulo("3. DETECCIÓN DE DUPLICADOS")
antes = validas.count()
# Misma letra y mismas 57 medidas = la misma mano (el id no cuenta: es lo único que cambia).
unicas = validas.dropDuplicates(["letra", *MEDIDAS])
despues = unicas.count()
duplicadas = antes - despues
print(f"Válidas: {antes:,} → sin repetir: {despues:,} (duplicadas: {duplicadas:,})")

# ------------------------------------------------------------
# 4. TRANSFORMACIÓN
# ------------------------------------------------------------
titulo("4. TRANSFORMACIÓN DE VARIABLES")
# a) Cuántos dedos (sin el pulgar) están estirados: ángulo de la articulación media > 150°.
estirados = sum((F.col(f"angulo_{d}_medio") > 150).cast("int") for d in ["indice", "medio", "anular", "menique"])
# b) Tramo de giro (como en la práctica 03: qué tan girada estaba la mano).
tramo = F.when(F.col("giro") < 10, "0-10°").when(F.col("giro") < 20, "10-20°").otherwise("20-35°")
# c) Número de clase (las letras en orden alfabético → 0, 1, 2…), lo que necesita la red neuronal.
letras = sorted(r["letra"] for r in unicas.select("letra").distinct().collect())
mapa_clase = F.create_map(*[x for i, l in enumerate(letras) for x in (F.lit(l), F.lit(i))])
# d) ¿Las reglas fijas de la app reconocieron bien esta mano?
transformadas = (
    unicas.withColumn("dedos_estirados", estirados)
    .withColumn("tramo_giro", tramo)
    .withColumn("clase", mapa_clase[F.col("letra")])
    .withColumn("reglas_aciertan", (F.col("prediccion_reglas") == F.col("letra")).cast("int"))
    .drop("escala", "espejo", "grueso", "confianza", "reglas_todas", "detectada")
)
transformadas.select("letra", "clase", "dedos_estirados", "tramo_giro", "reglas_aciertan").show(5)

# ------------------------------------------------------------
# 5. ESTADÍSTICAS DISTRIBUIDAS
# ------------------------------------------------------------
titulo("5. ESTADÍSTICAS DISTRIBUIDAS")
por_letra = (
    transformadas.groupBy("letra")
    .agg(
        F.count("*").alias("manos"),
        F.round(F.avg("dedos_estirados"), 2).alias("dedos_estirados"),
        F.round(F.avg("angulo_pulgar"), 1).alias("angulo_pulgar"),
        F.round(F.avg("reglas_aciertan") * 100, 1).alias("reglas_aciertan_pct"),
    )
    .orderBy("letra")
)
por_letra.show(30)
por_giro = transformadas.groupBy("tramo_giro").agg(F.count("*").alias("manos"), F.round(F.avg("reglas_aciertan") * 100, 1).alias("reglas_aciertan_pct")).orderBy("tramo_giro")
por_giro.show()
tabla_letras = por_letra.toPandas()
tabla_giro = por_giro.toPandas()
tabla_letras.to_csv(RESULTADOS / "p21_estadisticas_por_letra.csv", index=False)
tabla_giro.to_csv(RESULTADOS / "p21_estadisticas_por_giro.csv", index=False)

# ------------------------------------------------------------
# 6. EXPORTAR A PARQUET
# ------------------------------------------------------------
titulo("6. EXPORTAR A PARQUET")
if SALIDA.exists():
    shutil.rmtree(SALIDA)
finales = transformadas.count()
try:
    transformadas.repartition(4).write.mode("overwrite").parquet(str(SALIDA))
    forma = "Spark"
except Exception as error:  # En Windows, Spark necesita winutils.exe (Hadoop) para escribir archivos.
    print("Spark no pudo escribir en disco (en Windows le falta winutils.exe de Hadoop):", type(error).__name__)
    print("Se guarda con pyarrow, en 4 partes igual que lo haría Spark.")
    SALIDA.mkdir(parents=True, exist_ok=True)
    tabla = transformadas.toPandas()
    for i in range(4):
        tabla.iloc[i::4].to_parquet(SALIDA / f"part-{i:05d}.parquet", index=False)
    forma = "pyarrow"
peso_csv = ENTRADA.stat().st_size / 1e6
peso_parquet = sum(f.stat().st_size for f in SALIDA.glob("*.parquet")) / 1e6
segundos = time.time() - inicio
print(f"datos/spark_manos/ ({forma}) → {finales:,} manos")
print(f"Peso: CSV {peso_csv:.1f} MB → Parquet {peso_parquet:.1f} MB")
print(f"Tiempo total: {segundos:.1f} s")

actualizar(
    "spark",
    {
        "leidas": total,
        "rechazadas": conteo_motivos,
        "duplicadas": duplicadas,
        "finales": finales,
        "letras": len(letras),
        "nucleos": spark.sparkContext.defaultParallelism,
        "segundos": round(segundos, 1),
        "pesoCsvMB": round(peso_csv, 1),
        "pesoParquetMB": round(peso_parquet, 1),
        "porGiro": tabla_giro.rename(columns={"tramo_giro": "tramo", "reglas_aciertan_pct": "reglas"}).to_dict("records"),
        "porLetra": tabla_letras.rename(columns={"reglas_aciertan_pct": "reglas", "dedos_estirados": "estirados", "angulo_pulgar": "pulgar"}).to_dict("records"),
    },
)
spark.stop()
print("\nSiguiente paso: python p22_spark_mongo.py  (o directo: python p23_preparar_cnn1d.py)")
