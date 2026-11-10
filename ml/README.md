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
| `p03_modelo.py` | 3 | Entrena el árbol, lo compara con las reglas y KNN, saca métricas y matriz de confusión y lo exporta a la app. |

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

`p03_modelo.py` escribe `frontend/src/lib/ia/arbol/modelo.json` (el árbol) y `metricas.json` (el
examen), que la app lee en el traductor y en **Mi IA → Árbol de decisión**.

## Resultados (manos que el modelo nunca vio)

| Modelo | Aciertos |
|---|---|
| Árbol de decisión | 88 % |
| Reglas fijas | 66 % |
| Vecino más cercano (KNN) | 40 % |

Las gráficas quedan en `resultados/`.
