/*
 * DE TEXTO A SEÑAS (deletreo) — lo usa el traductor Voz / Texto → Señas
 * Convierte un texto en la secuencia de señas que se muestran una tras otra:
 *   - cada letra se busca en el alfabeto de la lengua (LSM o ASL) para mostrar su dibujo;
 *   - las vocales con acento se deletrean sin acento (á → A); la Ü como U;
 *   - en ASL no existe la Ñ: se deletrea como N;
 *   - los números y signos que no tienen seña en el alfabeto se muestran como texto («sin seña»);
 *   - entre palabras hay una pausa.
 * También calcula cuánto dura cada seña según la velocidad elegida.
 * Más adelante, las palabras que tengan seña propia (HOLA, GRACIAS...) se mostrarán completas.
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → letras de LSM o ASL con su forma (para el dibujo)
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import { alfabeto, type Letra } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'

/** Una seña de la secuencia. */
export type Sena =
  | { tipo: 'letra'; letra: Letra; original: string; palabra: number } // original: el carácter tal como se escribió (á)
  | { tipo: 'sin-sena'; texto: string; palabra: number } // números o símbolos sin seña en el alfabeto
  | { tipo: 'pausa'; palabra: number } // entre palabras

/** Duración base de una letra a velocidad 1× (ms). */
export const MS_LETRA = 1000
/** Las letras con movimiento duran más, para que se vea el trazo. */
export const FACTOR_MOVIMIENTO = 1.5
export const MS_PAUSA = 700
export const MS_SIN_SENA = 800

// Letras que se deletrean igual que otra (acentos y diéresis).
const SIN_ACENTO: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U' }

/** Convierte un texto en la secuencia de señas de la lengua elegida. */
export function textoASenas(texto: string, lengua: Lengua): Sena[] {
  const letras = new Map(alfabeto(lengua).map((l) => [l.letra, l]))
  const senas: Sena[] = []
  const palabras = texto.split(/\s+/).filter(Boolean)
  palabras.forEach((palabra, i) => {
    if (i > 0) senas.push({ tipo: 'pausa', palabra: i })
    for (const caracter of palabra) {
      let clave = caracter.toLocaleUpperCase('es')
      clave = SIN_ACENTO[clave] ?? clave
      if (lengua === 'ASL' && clave === 'Ñ') clave = 'N'
      const letra = letras.get(clave)
      if (letra) senas.push({ tipo: 'letra', letra, original: caracter, palabra: i })
      else if (/[\p{L}\p{N}]/u.test(caracter)) senas.push({ tipo: 'sin-sena', texto: caracter, palabra: i })
      // Los signos de puntuación (¿?¡!,.) no se señan en el deletreo: se omiten.
    }
  })
  // Quitar pausas que quedaron solas (palabras hechas solo de signos).
  return senas.filter((s, i) => s.tipo !== 'pausa' || (i > 0 && senas[i - 1].tipo !== 'pausa' && i < senas.length - 1))
}

/** Cuánto se muestra cada seña (ms) a la velocidad elegida (0.5× a 2×). */
export function duracion(sena: Sena, velocidad: number): number {
  const base =
    sena.tipo === 'pausa' ? MS_PAUSA : sena.tipo === 'sin-sena' ? MS_SIN_SENA : sena.letra.movimiento ? MS_LETRA * FACTOR_MOVIMIENTO : MS_LETRA
  return Math.round(base / velocidad)
}
