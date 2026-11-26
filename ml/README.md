# Machine learning del traductor (prácticas de clase adaptadas)

Aquí están las prácticas de la materia aplicadas a nuestro proyecto. El resultado final es un
**árbol de decisión** que reconoce las letras de LSM y que la app usa en el traductor de señas.

## Qué hace cada archivo

| Archivo | Práctica | Qué hace |
|---|---|---|
| `p01a_bfs_letras.py` | 1 · BFS | Busca el camino más corto entre dos letras (cambiando un dedo a la vez) y ordena el camino de niveles. |
| `p01b_regla_fija.py` | 1 · Regla fija | Una regla escrita a mano para la A y por qué falla (confunde la E con la A). |
| `p02a_crear_datos.py` | 2A | Carga la tabla de manos (una fila por mano, 57 medidas + la letra). |
| `p02b_explorar_datos.py` | 2B | Explora los datos: tipos, cuántas manos hay por letra, gráfica del ángulo del índice. |
| `p02c_calidad_datos.py` | 2C | Busca errores: manos sin medidas, detecciones falsas en los dibujos, duplicados, rangos. |
| `p02d_limpieza_datos.py` | 2D | Separa las manos válidas y guarda las demás con el motivo en `manos_revision.csv`. |
| `p02e_variables.py` | 2E | Prepara X (las 57 medidas) y y (la letra). |
| `p03_modelo.py` | 3, 4 y 5 | Divide 60/20/20, elige la profundidad del árbol con la validación (sobreajuste/subajuste), compara Árbol, Random Forest y KNN por F1, hace los experimentos A/B/C y la validación cruzada, examina con la prueba y exporta el árbol y el KNN a la app. |
| `p06_hiperparametros.py` | 6 | GridSearchCV y RandomizedSearchCV (validación cruzada de 5 partes) para Árbol, Random Forest y KNN; compara con la configuración de la p03 en la misma prueba. |
| `p07_kmeans_manos.py` | 7 | K-Means **sin usar la letra**: método del codo y silueta para elegir K, qué letras quedaron en cada grupo y cómo están los dedos. |
| `p08_analisis_clusters.py` | 8 | K-Means++ contra random, StandardScaler contra MinMaxScaler, estabilidad con ARI, distancias entre centroides, silueta por grupo y manos atípicas. Exporta el reporte para MongoDB. |
| `p08b_familias_senas.py` | 8b | Agrupamiento jerárquico (Ward) de las 25 letras: dendrograma y grupos de 2 a 9 (la X ya no queda sola). **Los 4 grupos de la app** (el profe pidió menos grupos), con nombre y **el PCA de cada grupo**; las 4 letras más parecidas a cada una y cómo se reparten sus manos entre los grupos de K-Means. |
| `p09_pca_manos.py` | 9 | PCA: varianza explicada, cuántas componentes hacen falta, cargas, mapas 2D/3D con los grupos, error de reconstrucción y exportación de coordenadas. |
| `p16_consultas_intentos.py` | 16 | Consultas a MongoDB sobre los **intentos de práctica** de la app: `find`, `$match`, `$group`, `$sort`, `$facet`. Letras más difíciles, confusiones, quién necesita ayuda. `--demo` usa intentos simulados. |
| *(en la app)* | 17 | El tablero: en **Estadísticas → Tablero de práctica** (filtros, gráficas, CSV y expediente de cada persona), en lugar de Streamlit. |
| *(en la app)* | 18 y 19 | Expediente y motor de consejos: `backend/app/recomendaciones.py` y **Aprender → Mi expediente** / «Consejos de tu IA» al practicar. |
| `demo_100_personas.py` | Demo | 100 personas simuladas practicando: cuántas dominan cada letra (Estadísticas) y cuántas confunden cada par (Señas parecidas). La app las muestra siempre como «Demostración». |
| `p20_generar_manos_masivas.py` | 20 | 50,000 manos del avatar (2,000 por forma) con errores de cámara metidos a propósito. |
| `p21_spark_manos.py` | 21 | PySpark: esquema, validación, duplicados, transformación, estadísticas distribuidas y Parquet. |
| `p22_spark_mongo.py` | 22 | Spark → MongoDB por particiones, lotes de 1,000 con *upsert*, índices y validación (colección `manos_masivas`). |
| `p23_preparar_cnn1d.py` | 23 | La mano como secuencia (3 canales × 21 puntos), misma prueba que p03, normalización solo con entrenamiento. |
| `p24_entrenar_cnn1d.py` (+ `p24_red.py`) | 24 | CNN 1D con PyTorch, Early Stopping; exporta la red a la app (`frontend/src/lib/ia/cnn1d/modelo.json`). |
| `p25_comparar_modelos.py` | 25 | CNN 1D contra Random Forest y los modelos de la app, con las mismas manos. |
| `p26_preparar_prediccion.py` | 26 | Ventanas de 3 intentos (simulados con `simulacion_intentos.py`, `--mongo` suma los reales), división por persona. |
| `p27_entrenar_prediccion.py` | 27 | CNN 1D de regresión: puntaje del siguiente intento; se exporta al backend (`backend/app/datos/prediccion_intentos.json`). |
| `p28_perfiles_usuarios.py` | 28 | **Perfiles de aprendizaje (clusters):** K-Means agrupa a las personas por cómo aprenden (aciertos, puntaje, intentos por letra, letras, mejora, rapidez); K de 3 a 5 por silueta (salen 3: «Necesita apoyo», «Va mejorando», «Avanza rápido») y PCA para el mapa de perfiles. Se exporta al backend y a la app (Mi expediente). |
| `p29_knn_usuarios.py` | 29 | **KNN para el usuario:** compara a cada persona con las más parecidas (su nivel en las letras que ambas practicaron) para recomendarle qué letras le saldrán fácil y cuáles le pueden costar. Validación escondiendo una letra: k = 60 tiene 17 % menos error que adivinar con el promedio. |

## De dónde salen los datos

1. **Avatar 3D** (lo que se usa para entrenar): la mano 3D de la app hace cada letra 150 veces con
   variaciones (dedos un poco distintos, mano girada hasta 35°, más ancha o más chica).
2. **Dibujos de LSM del equipo**: los pasamos por MediaPipe para sacar sus puntos, pero casi todas las
   «manos» que encontró eran falsas (diminutas). Se quedan como ejemplo de revisión de calidad (2C y 2D).
   Los dibujos ahora son las imágenes de las letras en la app.
3. **Grabaciones reales** (`datos/reales/`): las que se guardan desde la app al grabar o calibrar.

## Cómo correrlo

```bash
pip install pandas scikit-learn matplotlib

# 1) Generar la tabla de manos (usa el mismo código de la app)
cd frontend
node scripts/ml-preparar-datos.mjs
cd ../ml

# 2) Las prácticas, en orden
python p01a_bfs_letras.py
python p01b_regla_fija.py
python p02a_crear_datos.py
python p02b_explorar_datos.py
python p02c_calidad_datos.py
python p02d_limpieza_datos.py
python p02e_variables.py
python p03_modelo.py
python p06_hiperparametros.py      # después de p03 (compara contra sus resultados)
python p07_kmeans_manos.py
python p08_analisis_clusters.py    # después de p07 (usa su K)
python p09_pca_manos.py            # después de p07 (usa sus grupos)
python p08b_familias_senas.py      # después de p07, p08 y p09 (familias de letras)
python demo_100_personas.py        # después de p08b (datos de demostración para la app)
python p28_perfiles_usuarios.py    # perfiles de aprendizaje (clusters de personas)
python p29_knn_usuarios.py         # KNN de personas parecidas
```

Para guardar también los segmentos de la práctica 8 en MongoDB (usa `MONGODB_URI` y `MONGODB_DB` de
`backend/.env`, colección `segmentos_manos`):

```bash
python p08_analisis_clusters.py --mongo
```

`p03_modelo.py` escribe `frontend/src/lib/ia/arbol/modelo.json` (el árbol), `knn.json` (el KNN) y
`metricas.json` (el examen), que la app lee en el traductor y en **IA por dentro** (tarjetas «Árbol de
decisión» y «Validación y comparación de algoritmos»).

## Prácticas 04 y 05 en resumen

- **Profundidad del árbol** (validación): 2, 3 y 5 → subajuste (16–62 %); 8 en adelante → buen ajuste
  (~87–89 %). Se eligió **16** (la de mejor validación).
- **Comparación por F1** (validación): Random Forest 93.6 % · KNN 89.8 % · Árbol 88.5 %.
- **Experimentos:** A) KNN mejora un poco con más vecinos (90.3 % con 3 → 90.8 % con 9 y 15).
  B) el bosque sube de 50 a 100 árboles y luego casi no cambia. C) es la tabla de profundidades.
- **Validación cruzada** (Random Forest, 5 partes): F1 93.1 % ± 0.8 %.
- La app **no** usa el Random Forest (pesaría varios MB); usa la votación de árbol + KNN + reglas.

## Resultados (prueba: manos que ningún modelo vio)

| Modelo | Aciertos |
|---|---|
| Random Forest (solo para comparar) | 93 % |
| Votación de la app (árbol + KNN + reglas) | 92 % |
| K vecinos (KNN, con escala) | 90 % |
| Árbol de decisión | 89 % |
| Reglas fijas | 66 % |

Las gráficas quedan en `resultados/`.

## Práctica 06 en resumen (optimización de hiperparámetros)

- **GridSearchCV** probó 90 combinaciones del árbol, 16 del bosque y 28 del KNN (5 partes cada una).
  **RandomizedSearchCV** con 15 al azar quedó prácticamente igual y mucho más rápido en el árbol (22 s → 3 s).
- Mejores: árbol `entropy`, profundidad 20 · bosque 200 árboles, `log2` · KNN 15 vecinos, distancia Manhattan, votos por cercanía.
- En la prueba: **KNN 89.6 % → 91.8 %** (F1), Random Forest 93.2 % → 93.8 %, pero el **árbol 89.1 % → 88.6 %**: ganar en la
  validación cruzada no garantiza ganar con manos nuevas. Por eso el árbol de la app se queda como estaba.

## Prácticas 07, 08 y 09 en resumen (señas parecidas)

- **K-Means** (p07) eligió **9 grupos** por silueta. Los grupos tienen sentido: puño cerrado (A, E, S, T), índice y medio
  estirados (H, K, N/Ñ, R, U, V), solo meñique (I/J, Y), tres dedos (B, M, W), mano curva (C, O, P)…
  La app usa esto para avisar «Cuidado, se parece a…» al practicar una letra.
- **Análisis** (p08): los grupos son muy estables (ARI promedio 0.92 entre semillas); K-Means++ y random empatan cuando se
  repite varias veces; StandardScaler y MinMaxScaler encuentran casi los mismos grupos (ARI 0.87). De las 189 manos
  atípicas (percentil 95), **133 son X**: es la letra cuyas manos varían más. Quedan en `datos/manos_atipicas.csv`.
- **PCA** (p09): 2 componentes guardan el 37 % de la información (suficiente para el mapa); hacen falta 8 para el 80 %,
  13 para el 90 % y 18 para el 95 % de las 57 medidas.

Lo ven en la app en **IA por dentro** (tarjetas «Optimización de hiperparámetros» y «Señas parecidas (K-Means y PCA)»).
Archivos para la app: `frontend/src/lib/ia/arbol/hiperparametros.json`, `frontend/src/lib/ia/grupos/grupos.json` y `pca.json`.

## Prácticas 16 a 27 en resumen (intentos, datos masivos y redes 1D)

Requisitos extra: `pip install torch pyspark pyarrow python-dotenv` y Java 17 o más nuevo (para Spark).

```bash
python p20_generar_manos_masivas.py   # 50,500 manos (con errores a propósito)
python p21_spark_manos.py             # Spark: limpia → 49,654 manos en datos/spark_manos/
python p22_spark_mongo.py             # las sube a MongoDB (colección manos_masivas)
python p23_preparar_cnn1d.py
python p24_entrenar_cnn1d.py          # ~5 min en CPU
python p25_comparar_modelos.py
python p26_preparar_prediccion.py
python p27_entrenar_prediccion.py
python p16_consultas_intentos.py --demo
```

- **Spark en Windows**: sin `winutils.exe` de Hadoop, Spark no puede leer ni escribir archivos en disco. Las
  prácticas 21 y 22 lo detectan y usan pyarrow para ese paso (el procesamiento sigue siendo con Spark).
- **CNN 1D** (prueba, las mismas 753 manos de p03): **96.0 %** de exactitud. Random Forest 95.0 %, la votación
  que usaba la app 92.3 %. Como gana, ahora también vota en el traductor (LSM) y sirve para saber con qué letra
  se confundió un intento al practicar.
- **Predicción del siguiente intento**: error promedio de 17 puntos (repetir el último: 21.6; promediar: 20.1).
- Los resultados que muestra la app («IA por dentro») quedan en `frontend/src/lib/ia/cnn1d/practicas.json`.
- Los archivos pesados (`manos_masivas.csv`, `spark_manos/`, `resultados_cnn1d/`…) no se suben a git: se
  regeneran con las prácticas.
