/**
 * MANI · ¿QUÉ LETRA INTENTAS HACER?
 *
 * Cuando la cámara ve tu mano pero no reconoce ninguna letra, Mani busca la letra MÁS CERCANA:
 * compara tu mano con todas las letras del alfabeto (con la misma evaluación por dedos que usa
 * la práctica, lib/vision/postura.ts) y se queda con la que tiene menos cosas por corregir.
 * Ej.: si haces casi la U pero con los dedos separados → «¿Intentas la U? Junta los dedos».
 *
 * Si a la más cercana le faltan muchas cosas, no adivina (sería un consejo confuso).
 */
// ▸ Desde nuestro proyecto:
import type { Letra } from '../aprendizaje/alfabeto'
import { evaluar, type Punto } from '../vision/postura'

export interface Pista {
  letra: string
  /** Lo que falta corregir, del más importante al menos (vacío = ya está bien). */
  consejos: string[]
}

/** Máximo de correcciones para que Mani se anime a adivinar la letra. */
export const MAX_CONSEJOS_PISTA = 2

export function letraMasCercana(puntos: Punto[], letras: Letra[]): Pista | null {
  let mejor: Pista | null = null
  for (const l of letras) {
    const { consejos } = evaluar(puntos, l.objetivo)
    if (!mejor || consejos.length < mejor.consejos.length) mejor = { letra: l.letra, consejos }
    if (mejor.consejos.length === 0) break
  }
  return mejor && mejor.consejos.length <= MAX_CONSEJOS_PISTA ? mejor : null
}
