/**
 * CLASIFICADOR EN VIVO
 * Con una red ya entrenada, recibe los 21 puntos de la mano y responde qué forma ve,
 * con su probabilidad. Ej.: { clase: «I/J», letras: ['I', 'J'], probabilidad: 0.94 }.
 */
// ▸ Desde nuestro proyecto:
import type { Letra } from '../../aprendizaje/alfabeto'
import type { Punto } from '../../vision/postura'
import type { RedGuardada } from '../modeloIA'
import { clasesDe, type Clase } from './datos'
import { imagenDeMano } from './imagen'
import { ARQUITECTURA_BASE, indiceMayor, RedConvolucional } from './red'

export interface Prediccion {
  clase: Clase
  probabilidad: number
  /** Las 3 clases más probables (para mostrarlas en barras). */
  top: { nombre: string; probabilidad: number }[]
  /** La imagen 28×28 que vio la red (para mostrarla en pantalla). */
  imagen: Float32Array
  /** Lo que detectó cada filtro de la primera convolución (6 mapas de 28×28), si se pidió. */
  mapas?: Float32Array
}

export type Clasificar = (puntos: Punto[], conMapas?: boolean) => Prediccion

/** Crea el clasificador. Devuelve null si la red guardada no corresponde a este alfabeto. */
export function crearClasificador(guardada: RedGuardada, letras: Letra[]): Clasificar | null {
  const clases = clasesDe(letras)
  if (clases.map((c) => c.nombre).join() !== guardada.clases.join()) return null
  const red = new RedConvolucional({ ...ARQUITECTURA_BASE, clases: clases.length })
  if (!red.importar(guardada.pesos)) return null
  return (puntos, conMapas = false) => {
    const imagen = imagenDeMano(puntos)
    const mapas = conMapas ? red.mapasPrimeraCapa(imagen) : undefined
    const prob = red.predecir(imagen)
    const i = indiceMayor(prob)
    const top = Array.from(prob, (p, k) => ({ nombre: clases[k].nombre, probabilidad: p }))
      .sort((a, b) => b.probabilidad - a.probabilidad)
      .slice(0, 3)
    return { clase: clases[i], probabilidad: prob[i], top, imagen, mapas }
  }
}
