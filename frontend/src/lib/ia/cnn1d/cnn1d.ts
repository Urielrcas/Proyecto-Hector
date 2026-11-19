/**
 * RED NEURONAL CONVOLUCIONAL 1D EN LA APP (entrenada en Python con PyTorch: ml/p24_entrenar_cnn1d.py)
 *
 * La red ve la mano como una SECUENCIA de 21 puntos en orden (muñeca, pulgar, índice, medio,
 * anular, meñique) y recorre esa secuencia con filtros pequeños de 3 puntos, como si leyera la mano
 * dedo por dedo. Cada punto lleva 3 «canales»: u (a lo ancho), v (a lo alto) y r (distancia a la muñeca).
 *
 *   entrada (3 × 21) → Conv1D 32 + ReLU → Conv1D 32 + ReLU → MaxPool (21 → 10)
 *   → Conv1D 64 + ReLU → MaxPool (10 → 5) → Densa 64 + ReLU → Densa 25 → softmax (probabilidades)
 *
 * Aquí no se entrena: solo se hace el cálculo con los pesos que exportó Python a modelo.json.
 * modelo.json trae además una mano de ejemplo con lo que respondió PyTorch, y la prueba
 * (cnn1d.test.ts) comprueba que este código da lo mismo.
 * En el examen con manos que no vio sacó 96 % (la votación de árbol + KNN + reglas, 92 %).
 */
import type { Punto } from '../../vision/postura'
import { caracteristicas } from '../arbol/caracteristicas'
import modeloJson from './modelo.json'

interface CapaJson {
  nombre: string
  forma: number[]
  datos: string
}
interface ModeloJson {
  clases: string[]
  medias: number[]
  escalas: number[]
  capas: CapaJson[]
  prueba: { posiciones: number[]; probabilidades: number[] }
}

const M = modeloJson as ModeloJson
export const CLASES_CNN1D = M.clases
export const PRUEBA_CNN1D = M.prueba
const PUNTOS = 21

/** base64 → números float32 (así se guardan los pesos, más ligero que una lista de texto). */
function decodificar(texto: string): Float32Array {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

// Los pesos de cada capa, decodificados una sola vez.
const pesos = Object.fromEntries(M.capas.map((c) => [c.nombre, { forma: c.forma, datos: decodificar(c.datos) }]))
const capa = (nombre: string) => pesos[nombre]

/** Convolución 1D con ventana 3 y relleno de 1 (la salida mide lo mismo que la entrada) + ReLU. */
function conv1d(x: Float32Array[], nombre: string): Float32Array[] {
  const W = capa(`${nombre}.weight`)
  const b = capa(`${nombre}.bias`).datos
  const [salidas, entradas, k] = W.forma
  const L = x[0].length
  const y: Float32Array[] = []
  for (let o = 0; o < salidas; o++) {
    const fila = new Float32Array(L)
    for (let t = 0; t < L; t++) {
      let s = b[o]
      for (let i = 0; i < entradas; i++) {
        for (let j = 0; j < k; j++) {
          const pos = t + j - 1
          if (pos >= 0 && pos < L) s += W.datos[(o * entradas + i) * k + j] * x[i][pos]
        }
      }
      fila[t] = s > 0 ? s : 0 // ReLU: los negativos se vuelven 0
    }
    y.push(fila)
  }
  return y
}

/** MaxPool de 2: de cada par de puntos se queda el mayor (la secuencia mide la mitad). */
function maxPool(x: Float32Array[]): Float32Array[] {
  return x.map((fila) => {
    const y = new Float32Array(Math.floor(fila.length / 2))
    for (let t = 0; t < y.length; t++) y[t] = Math.max(fila[2 * t], fila[2 * t + 1])
    return y
  })
}

/** Capa densa: cada salida es una suma ponderada de todas las entradas. */
function densa(x: Float32Array, nombre: string, relu: boolean): Float32Array {
  const W = capa(`${nombre}.weight`)
  const b = capa(`${nombre}.bias`).datos
  const [salidas, entradas] = W.forma
  const y = new Float32Array(salidas)
  for (let o = 0; o < salidas; o++) {
    let s = b[o]
    for (let i = 0; i < entradas; i++) s += W.datos[o * entradas + i] * x[i]
    y[o] = relu && s < 0 ? 0 : s
  }
  return y
}

/** Las 40 posiciones (p1_u, p1_v … p20_v) → probabilidad de cada clase. */
export function probabilidadesDesdePosiciones(posiciones: number[]): Float32Array {
  // Armar la secuencia de 3 canales × 21 puntos (la muñeca es el origen) y normalizarla.
  const x = [0, 1, 2].map(() => new Float32Array(PUNTOS))
  for (let p = 0; p < PUNTOS; p++) {
    const u = p === 0 ? 0 : posiciones[(p - 1) * 2]
    const v = p === 0 ? 0 : posiciones[(p - 1) * 2 + 1]
    const valores = [u, v, Math.hypot(u, v)]
    for (let c = 0; c < 3; c++) x[c][p] = (valores[c] - M.medias[c]) / M.escalas[c]
  }
  let h = conv1d(x, 'convoluciones.0')
  h = maxPool(conv1d(h, 'convoluciones.2'))
  h = maxPool(conv1d(h, 'convoluciones.5'))
  // Aplanar canal por canal (como nn.Flatten de PyTorch).
  const plano = new Float32Array(h.length * h[0].length)
  h.forEach((fila, c) => plano.set(fila, c * fila.length))
  const logits = densa(densa(plano, 'clasificador.1', true), 'clasificador.4', false)
  // Softmax: convierte los puntajes en probabilidades que suman 1.
  const max = Math.max(...logits)
  const exp = logits.map((v) => Math.exp(v - max))
  const suma = exp.reduce((a, b) => a + b, 0)
  return exp.map((v) => v / suma)
}

export interface PrediccionCnn1d {
  /** La clase: una letra o un grupo de letras con la misma forma («I/J»). */
  nombre: string
  letras: string[]
  probabilidad: number
  top: { nombre: string; probabilidad: number }[]
}

/** Qué letra ve la red en una mano (puntos normalizados, como los de la cámara). */
export function predecirConCnn1d(puntos: Punto[]): PrediccionCnn1d {
  const prob = probabilidadesDesdePosiciones(caracteristicas(puntos).slice(0, 40))
  const top = Array.from(prob, (p, i) => ({ nombre: M.clases[i], probabilidad: p }))
    .sort((a, b) => b.probabilidad - a.probabilidad)
    .slice(0, 3)
  return { nombre: top[0].nombre, letras: top[0].nombre.split('/'), probabilidad: top[0].probabilidad, top }
}
