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
