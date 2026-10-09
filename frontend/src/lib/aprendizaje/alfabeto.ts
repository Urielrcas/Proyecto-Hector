/*
 * CONTENIDO DEL ALFABETO (LSM y ASL)
 *   - LSM: textos del Diccionario de Lengua de Señas Mexicana «Manos con Voz».
 *   - ASL: tabla del alfabeto manual de «American Sign Language For Dummies».
 *   - FORMAS_LSM / FORMAS_ASL: la forma de la mano de cada letra (para dibujarla y evaluarla).
 * alfabeto('LSM') devuelve la lista de letras con sus pasos, forma y objetivo de evaluación.
 * Para cambiar la descripción de una letra, edita sus "pasos".
 */

// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     objetivoDesdeForma → convierte la forma de una letra en lo que la cámara debe reconocer
//     Objetivo → tipo: lo que se espera ver para una letra
import { objetivoDesdeForma, type Objetivo } from '../vision/postura'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     mano → atajo para describir la forma de una mano: mano('EDDD', 'estirado')
//     FormaMano → tipo: descripción de la forma de la mano
import { mano, type FormaMano } from './forma'

export interface Letra {
  letra: string
  /** Instrucciones para formar la seña. */
  pasos: string[]
  /** Lo que la cámara debe reconocer (se obtiene del dibujo). */
  objetivo: Objetivo
  /** La seña lleva movimiento: además de la forma, la cámara sigue el movimiento. */
  movimiento?: boolean
  /** Dibujo esquemático de la seña. */
  forma: FormaMano
}

type Guia = Omit<Letra, 'letra' | 'objetivo' | 'forma'>

export const FUENTE_LSM = 'Diccionario de Lengua de Señas Mexicana «Manos con Voz»'

/**
 * Alfabeto LSM según el Diccionario de Lengua de Señas Mexicana «Manos con Voz» (abecedario, págs. 15-19).
 * Descripciones adaptadas a segunda persona; el contenido sigue al diccionario.
 */
const LSM: Record<string, Guia> = {
  A: { pasos: ['Cierra la mano y muestra las uñas.', 'Estira el pulgar hacia un lado.', 'La palma mira al frente.'] },
  B: { pasos: ['Estira los dedos índice, medio, anular y meñique bien unidos.', 'Dobla el pulgar hacia la palma.', 'La palma mira al frente.'] },
  C: {
    pasos: [
      'Mantén los dedos índice, medio, anular y meñique bien unidos y en posición cóncava.',
      'Pon el pulgar también en esa posición.',
      'La palma mira a un lado.',
    ],
  },
  D: { pasos: ['Une por las puntas los dedos medio, anular, meñique y pulgar.', 'Estira el índice.', 'La palma mira al frente.'] },
  E: { pasos: ['Dobla los dedos completamente y muestra las uñas.', 'La palma mira al frente.'] },
  F: {
    pasos: ['Con la mano abierta y los dedos bien unidos, dobla el índice hasta que su parte lateral toque la yema del pulgar.', 'La palma mira a un lado.'],
  },
  G: { pasos: ['Cierra la mano y estira los dedos índice y pulgar.', 'La palma mira hacia ti.'] },
  H: {
    pasos: ['Cierra la mano y estira los dedos índice y medio, bien unidos.', 'Extiende el pulgar señalando hacia arriba.', 'La palma mira hacia ti.'],
  },
  I: { pasos: ['Cierra la mano y estira el meñique señalando hacia arriba.', 'La palma se pone de lado.'] },
  J: {
    pasos: ['Cierra la mano y estira bien el meñique señalando hacia arriba.', 'Con la palma a un lado, dibuja una J en el aire.'],
    movimiento: true,
  },
  K: {
    pasos: ['Cierra la mano con los dedos índice, medio y pulgar estirados.', 'Pon la yema del pulgar entre el índice y el medio.', 'Mueve la muñeca hacia arriba.'],
    movimiento: true,
  },
  L: { pasos: ['Cierra la mano y estira los dedos índice y pulgar, formando una L.', 'La palma mira al frente.'] },
  M: { pasos: ['Cierra la mano y pon los dedos índice, medio y anular sobre el pulgar.', 'Los dedos quedan apuntando hacia abajo.'] },
  N: { pasos: ['Cierra la mano y pon los dedos índice y medio sobre el pulgar.', 'Los dedos quedan apuntando hacia abajo.'] },
  Ñ: { pasos: ['Cierra la mano y pon los dedos índice y medio sobre el pulgar.', 'Mueve la muñeca a los lados.'], movimiento: true },
  O: { pasos: ['Forma una letra O con la mano.', 'Todos los dedos se tocan por las puntas.'] },
  P: { pasos: ['Cierra la mano con los dedos índice, medio y pulgar estirados.', 'Pon la yema del pulgar entre el índice y el medio.'] },
  Q: {
    pasos: ['Cierra la mano y pon los dedos índice y pulgar en posición de garra.', 'La palma mira hacia abajo.', 'Mueve la muñeca hacia los lados.'],
    movimiento: true,
  },
  R: { pasos: ['Cierra la mano y estira los dedos índice y medio, entrelazados.', 'La palma mira al frente.'] },
  S: { pasos: ['Cierra la mano y pon el pulgar sobre los otros dedos.', 'La palma mira al frente.'] },
  T: { pasos: ['Cierra la mano y pon el pulgar entre el índice y el medio.', 'La palma mira al frente.'] },
  U: { pasos: ['Cierra la mano y estira los dedos índice y medio, unidos.', 'La palma mira al frente.'] },
  V: { pasos: ['Cierra la mano y estira los dedos índice y medio, separados.', 'La palma mira al frente.'] },
  W: { pasos: ['Cierra la mano y estira los dedos índice, medio y anular, separados.', 'La palma mira al frente.'] },
  X: {
    pasos: ['Cierra la mano y pon el índice y el pulgar en posición de garra.', 'Con la palma dirigida a un lado, mueve la mano al frente y de regreso.'],
    movimiento: true,
  },
  Y: { pasos: ['Cierra la mano y estira el meñique y el pulgar.', 'La palma mira hacia ti.'] },
  Z: { pasos: ['Cierra la mano y estira el dedo índice.', 'Con la palma al frente, dibuja una letra Z en el aire.'], movimiento: true },
}

export const FUENTE_ASL = 'American Sign Language For Dummies (alfabeto manual)'

/** Alfabeto ASL según la tabla del alfabeto manual de «American Sign Language For Dummies». */
const ASL: Record<string, Guia> = {
  A: { pasos: ['Cierra la mano en puño.', 'Deja el pulgar estirado pegado al costado del índice, sin cruzarlo sobre los dedos.', 'La palma mira al frente.'] },
  B: { pasos: ['Estira los cuatro dedos hacia arriba, juntos.', 'Dobla el pulgar sobre la palma.', 'La palma mira al frente.'] },
  C: { pasos: ['Curva todos los dedos juntos y el pulgar, como si sostuvieras un vaso.', 'La palma mira a un lado: vista de frente, la mano forma una C.'] },
  D: { pasos: ['Estira el índice hacia arriba.', 'Curva los otros dedos hasta que sus puntas toquen la del pulgar, formando un círculo.'] },
  E: { pasos: ['Cruza el pulgar sobre la palma.', 'Dobla los cuatro dedos hacia abajo y apoya sus puntas sobre el pulgar.', 'La palma mira al frente.'] },
  F: { pasos: ['Junta las puntas del índice y del pulgar formando un círculo.', 'Estira el medio, el anular y el meñique hacia arriba.'] },
  G: { pasos: ['Estira el índice apuntando hacia un lado.', 'Pon el pulgar paralelo al índice, por debajo, apuntando hacia el mismo lado.', 'Dobla los demás dedos.'] },
  H: { pasos: ['Estira el índice y el medio juntos, apuntando hacia un lado.', 'Dobla el anular y el meñique; el pulgar los sujeta.'] },
  I: { pasos: ['Cierra la mano en puño.', 'Estira solo el meñique hacia arriba.', 'El pulgar queda sobre los dedos doblados.'] },
  J: { pasos: ['Forma la letra I: puño con el meñique estirado.', 'Dibuja una J en el aire con el meñique, girando la muñeca.'], movimiento: true },
  K: { pasos: ['Estira el índice hacia arriba y el medio en diagonal, separados.', 'Apoya la punta del pulgar entre ambos, en el medio.'] },
  L: { pasos: ['Estira el índice hacia arriba y el pulgar hacia un lado, formando una L.', 'Dobla los otros tres dedos.'] },
  M: { pasos: ['Mete el pulgar debajo del índice, el medio y el anular.', 'Dobla esos tres dedos sobre el pulgar.'] },
  N: { pasos: ['Mete el pulgar debajo del índice y el medio.', 'Dobla esos dos dedos sobre el pulgar.'] },
  O: { pasos: ['Curva todos los dedos y junta sus puntas con la del pulgar, formando una O.'] },
  P: { pasos: ['Forma la letra K.', 'Gira la mano hacia abajo: el índice apunta al frente y el medio hacia abajo.'] },
  Q: { pasos: ['Forma la letra G.', 'Gira la mano hacia abajo: el índice y el pulgar apuntan al suelo.'] },
  R: { pasos: ['Estira el índice y el medio hacia arriba.', 'Cruza el medio por encima del índice.'] },
  S: { pasos: ['Cierra la mano en puño.', 'Cruza el pulgar por delante de los dedos doblados.'] },
  T: { pasos: ['Cierra la mano en puño.', 'Mete el pulgar entre el índice y el medio, de modo que asome la punta.'] },
  U: { pasos: ['Estira el índice y el medio hacia arriba, juntos.', 'Dobla el anular y el meñique; el pulgar los sujeta.'] },
  V: { pasos: ['Estira el índice y el medio separados, formando una V.', 'Dobla el anular y el meñique; el pulgar los sujeta.'] },
  W: { pasos: ['Estira el índice, el medio y el anular, separados.', 'El pulgar sujeta al meñique doblado.'] },
  X: { pasos: ['Cierra la mano en puño.', 'Levanta el índice doblado en forma de gancho.', 'El pulgar descansa sobre el medio.'] },
  Y: { pasos: ['Estira el pulgar y el meñique.', 'Dobla el índice, el medio y el anular.'] },
  Z: { pasos: ['Estira solo el índice; los demás dedos quedan doblados.', 'Dibuja una Z en el aire con la punta del índice.'], movimiento: true },
}

/** Formas para el dibujo de cada letra (LSM, según las fotos del diccionario). */
const FORMAS_LSM: Record<string, FormaMano> = {
  A: mano('DDDD', 'lado'),
  B: mano('EEEE', 'doblado'),
  C: mano('CCCC', 'curvo'),
  D: mano('ECCC', 'toca'),
  E: mano('DDDD', 'doblado'),
  F: mano('CEEE', 'toca'),
  G: mano('EDDD', 'estirado', { giro: 90 }),
  H: mano('EEDD', 'estirado', { giro: 90 }),
  I: mano('DDDE', 'sobre'),
  J: mano('DDDE', 'sobre', { movimiento: 'j' }),
  K: mano('EEDD', 'entre', { separados: true, movimiento: 'arriba' }),
  L: mano('EDDD', 'estirado'),
  M: mano('EEED', 'doblado', { giro: 180 }),
  N: mano('EEDD', 'doblado', { giro: 180 }),
  Ñ: mano('EEDD', 'doblado', { giro: 180, movimiento: 'lados' }),
  O: mano('CCCC', 'toca'),
  P: mano('EEDD', 'entre', { separados: true }),
  Q: mano('CDDD', 'curvo', { giro: 180, movimiento: 'lados' }),
  R: mano('EEDD', 'sobre', { cruzados: true }),
  S: mano('DDDD', 'sobre'),
  T: mano('DDDD', 'entre'),
  U: mano('EEDD', 'sobre'),
  V: mano('EEDD', 'sobre', { separados: true }),
  W: mano('EEED', 'sobre', { separados: true }),
  X: mano('CDDD', 'curvo', { giro: 90, movimiento: 'frente' }),
  Y: mano('DDDE', 'estirado', { orientacionLibre: true }),
  Z: mano('EDDD', 'sobre', { movimiento: 'z' }),
}

/** En ASL cambian las letras con otra configuración; el resto se dibuja igual que en LSM. */
const FORMAS_ASL: Record<string, FormaMano> = {
  ...FORMAS_LSM,
  // G y Q: el pulgar va paralelo al índice ("lado"), no perpendicular como en LSM.
  G: mano('EDDD', 'lado', { giro: 90 }),
  H: mano('EEDD', 'sobre', { giro: 90 }),
  K: mano('EEDD', 'entre', { separados: true }),
  M: mano('DDDD', 'entre', { entre: 3 }),
  N: mano('DDDD', 'entre', { entre: 2 }),
  P: mano('EEDD', 'entre', { separados: true, giro: 135 }),
  Q: mano('EDDD', 'lado', { giro: 180 }),
  X: mano('CDDD', 'sobre'),
}

const GUIAS: Record<Lengua, Record<string, Guia>> = { LSM, ASL }
const FORMAS: Record<Lengua, Record<string, FormaMano>> = { LSM: FORMAS_LSM, ASL: FORMAS_ASL }

export function alfabeto(lengua: Lengua): Letra[] {
  return Object.entries(GUIAS[lengua]).map(([letra, guia]) => {
    const forma = FORMAS[lengua][letra]
    return { letra, ...guia, forma, objetivo: objetivoDesdeForma(forma) }
  })
}

/** Alfabeto LSM completo (para pruebas y búsquedas). */
export const ALFABETO: Letra[] = alfabeto('LSM')
