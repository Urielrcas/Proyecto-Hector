/**
 * EL ÁRBOL DE DECISIÓN EN LA APP (machine learning entrenado en ml/p03_modelo.py)
 *
 * El árbol se entrenó en Python con scikit-learn y se exportó a modelo.json: una lista de nodos.
 * Cada nodo hace una pregunta de sí o no sobre una medida de la mano («¿pulgar_a_medio ≤ 0.43?»)
 * y manda a otro nodo; las hojas dicen la letra y qué tan segura está.
 * Aquí solo se recorre ese árbol: las medidas se calculan con el mismo código con que se armó
 * la tabla de entrenamiento (caracteristicas.ts), así el árbol ve lo mismo que vio al aprender.
 */
import type { Punto } from '../../vision/postura'
import { caracteristicas, NOMBRES_CARACTERISTICAS } from './caracteristicas'
import modelo from './modelo.json'
import metricasJson from './metricas.json'

type Nodo = { medida: number; umbral: number; si: number; no: number } | { hoja: string; seguridad: number }

interface Modelo {
  medidas: string[]
  clases: string[]
  nodos: Nodo[]
}

const arbol = modelo as Modelo

// Si alguien cambia las medidas en la app sin reentrenar, el árbol preguntaría por otras columnas.
if (arbol.medidas.join() !== NOMBRES_CARACTERISTICAS.join()) {
  console.warn('El árbol de decisión se entrenó con otras medidas: vuelve a correr ml/p03_modelo.py')
}

export interface PrediccionArbol {
  /** La clase: una letra o un grupo de letras con la misma forma («I/J»). */
  nombre: string
  letras: string[]
  /** Qué proporción de las manos de entrenamiento en esa hoja eran de esa letra (0 a 1). */
  seguridad: number
  /** Cuántas preguntas hizo hasta llegar a la respuesta. */
  preguntas: number
}

/** Recorre el árbol con las medidas de la mano (puntos normalizados, como los de la cámara). */
export function predecirConArbol(puntos: Punto[]): PrediccionArbol {
  const x = caracteristicas(puntos)
  let i = 0
  let preguntas = 0
  for (;;) {
    const nodo = arbol.nodos[i]
    if ('hoja' in nodo) return { nombre: nodo.hoja, letras: nodo.hoja.split('/'), seguridad: nodo.seguridad, preguntas }
    i = x[nodo.medida] <= nodo.umbral ? nodo.si : nodo.no
    preguntas++
  }
}

/** Resultados del examen del modelo (ml/p03_modelo.py), para mostrarlos en Mi IA. */
export const METRICAS_ARBOL = metricasJson as {
  fecha: string
  manos: { entrenamiento: number; prueba: number; total: number }
  exactitud: { reglas: number; arbol: number; knn: number }
  porGiro: { tramo: string; manos: number; reglas: number; arbol: number }[]
  porLetra: Record<string, { precision: number; recall: number; f1: number }>
  confusiones: { reglas: { real: string; dijo: string; veces: number }[]; arbol: { real: string; dijo: string; veces: number }[] }
  matriz: { letras: string[]; arbol: number[][]; reglas: number[][] }
  arbol: { profundidad: number; hojas: number }
  importantes: { medida: string; peso: number }[]
}
