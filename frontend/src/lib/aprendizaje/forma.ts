/*
 * FORMA DE LA MANO
 * Describe cómo es una seña: estado de cada dedo (estirado, curvo o doblado), dónde está
 * el pulgar, si índice y medio van separados o cruzados, hacia dónde apunta la mano
 * y si lleva movimiento. Con esta descripción se DIBUJA la mano (ManoIlustrada.tsx)
 * y se EVALÚA con la cámara (postura.ts).
 */

// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     Dedo → tipo: nombre de un dedo
import type { Dedo } from '../vision/postura'

export type EstadoDedo = 'estirado' | 'curvo' | 'doblado'
export type PosicionPulgar = 'doblado' | 'sobre' | 'lado' | 'estirado' | 'curvo' | 'toca' | 'entre'
export type Movimiento = 'j' | 'z' | 'arriba' | 'lados' | 'frente'
/** Qué ve quien te mira: la palma (frente), el dorso de la mano o el canto (de lado). */
export type Palma = 'frente' | 'dorso' | 'lado'

/** Descripción de la forma de la mano, para dibujarla. */
export interface FormaMano {
  dedos: Record<Exclude<Dedo, 'pulgar'>, EstadoDedo>
  pulgar: PosicionPulgar
  /** Con `pulgar: 'entre'`: 1 = entre índice y medio, 2 = medio y anular, 3 = anular y meñique. */
  entre?: 1 | 2 | 3
  separados?: boolean
  cruzados?: boolean
  /** Giro de toda la mano en grados: 90 = dedos hacia un lado, 180 = hacia abajo. */
  giro?: number
  /** Hacia dónde mira la palma. Si no se indica: 'frente' (la palma mira a quien te ve). */
  palma?: Palma
  /** No revisar hacia dónde apunta la mano (p. ej. Y, que se hace vertical u horizontal). */
  orientacionLibre?: boolean
  movimiento?: Movimiento
}

const ESTADOS: Record<string, EstadoDedo> = { E: 'estirado', C: 'curvo', D: 'doblado' }

/**
 * Atajo para escribir formas: `dedos` son 4 letras (índice, medio, anular, meñique)
 * con E = estirado, C = curvo, D = doblado. Ej.: mano('EDDD', 'estirado') es la L.
 */
export function mano(dedos: string, pulgar: PosicionPulgar, extra: Omit<FormaMano, 'dedos' | 'pulgar'> = {}): FormaMano {
  const [indice, medio, anular, menique] = dedos.split('').map((c) => ESTADOS[c])
  return { dedos: { indice, medio, anular, menique }, pulgar, ...extra }
}
