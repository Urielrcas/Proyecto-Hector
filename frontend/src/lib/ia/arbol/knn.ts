/**
 * K VECINOS MÁS CERCANOS (KNN) EN LA APP (entrenado en ml/p03_modelo.py)
 *
 * El KNN no hace preguntas como el árbol: guarda las manos de entrenamiento y, ante una mano nueva,
 * busca las 5 más parecidas y las pone a votar. Si 4 de las 5 son B, dice «B, 80 %».
 * Antes de comparar, cada medida se pasa a la misma escala (como el StandardScaler de Python);
 * sin eso los ángulos (0 a 180) pesaban muchísimo más que las posiciones (0 a 1).
 * Las manos vienen empacadas en knn.json: cada medida como un entero de -127 a 127.
 */
import type { Punto } from '../../vision/postura'
import { caracteristicas, NOMBRES_CARACTERISTICAS } from './caracteristicas'
import knnJson from './knn.json'

interface DatosKnn {
  medidas: string[]
  k: number
  pasos: number
  medias: number[]
  escalas: number[]
  clases: string[]
  etiquetas: number[]
  manos: string
}

const datos = knnJson as DatosKnn
const D = datos.medidas.length
if (datos.medidas.join() !== NOMBRES_CARACTERISTICAS.join()) {
  console.warn('El KNN se entrenó con otras medidas: vuelve a correr ml/p03_modelo.py')
}

// Desempacar las manos una sola vez (base64 → enteros con signo).
const manos = (() => {
  const texto = atob(datos.manos)
  const bytes = new Int8Array(texto.length)
  for (let i = 0; i < texto.length; i++) bytes[i] = (texto.charCodeAt(i) << 24) >> 24
  return bytes
})()
const N = datos.etiquetas.length

export interface PrediccionKnn {
  nombre: string
  letras: string[]
  /** Fracción de los vecinos que votaron por esa letra (0 a 1). */
  seguridad: number
}

export function predecirConKnn(puntos: Punto[]): PrediccionKnn {
  const x = caracteristicas(puntos)
  // La mano nueva, en la misma escala y con los mismos pasos que las guardadas.
  const z = x.map((v, j) => ((v - datos.medias[j]) / datos.escalas[j]) * datos.pasos)
  // Las k manos más cercanas (distancia al cuadrado), guardadas de menor a mayor.
  const k = datos.k
  const mejores: { d: number; i: number }[] = []
  for (let i = 0; i < N; i++) {
    let d = 0
    const base = i * D
    for (let j = 0; j < D; j++) {
      const t = manos[base + j] - z[j]
      d += t * t
    }
    if (mejores.length < k || d < mejores[mejores.length - 1].d) {
      mejores.push({ d, i })
      mejores.sort((a, b) => a.d - b.d)
      if (mejores.length > k) mejores.pop()
    }
  }
  // Votación: gana la clase con más vecinos; si empatan, la del vecino más cercano.
  const votos = new Map<number, number>()
  for (const m of mejores) {
    const c = datos.etiquetas[m.i]
    votos.set(c, (votos.get(c) ?? 0) + 1)
  }
  let ganadora = datos.etiquetas[mejores[0].i]
  for (const [c, v] of votos) if (v > (votos.get(ganadora) ?? 0)) ganadora = c
  const nombre = datos.clases[ganadora]
  return { nombre, letras: nombre.split('/'), seguridad: (votos.get(ganadora) ?? 0) / mejores.length }
}
