/*
 * DE TEXTO A SEÑAS (deletreo) — lo usa el traductor Voz / Texto → Señas
 * Convierte un texto en la secuencia de señas que se muestran una tras otra:
 *   - cada letra se busca en el alfabeto de la lengua (LSM o ASL) para mostrar su dibujo;
 *   - las vocales con acento se deletrean sin acento (á → A); la Ü como U;
 *   - en ASL no existe la Ñ: se deletrea como N;
 *   - los números y signos que no tienen seña en el alfabeto se muestran como texto («sin seña»);
 *   - entre palabras hay una pausa.
 * También calcula cuánto dura cada seña según la velocidad elegida.
 *
 * Las palabras que tienen seña propia (Palabras y frases: AGUA, AYUDAR, BUENOS DÍAS…) se muestran
 * con su seña completa en lugar de deletrearse. Se reconocen aunque vengan conjugadas o en plural
 * («necesito» → NECESITAR) y se busca primero la frase más larga («buenas noches» antes que «noches»).
 * Si la seña tiene varias partes (BUENOS DÍAS = B y luego D), cada parte es un paso de la secuencia.
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → letras de LSM o ASL con su forma (para el dibujo)
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import { alfabeto, type Letra } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import { claveDePalabra, diccionarioDe, type Palabra } from '../aprendizaje/palabras'
import type { Lengua } from '../tipos'
import { SENAS } from '../vision/senas'

/** Una seña de la secuencia. */
export type Sena =
  | { tipo: 'letra'; letra: Letra; original: string; palabra: number } // original: el carácter tal como se escribió (á)
  | { tipo: 'sin-sena'; texto: string; palabra: number } // números o símbolos sin seña en el alfabeto
  | { tipo: 'pausa'; palabra: number } // entre palabras
  // Una palabra con seña propia; si su seña tiene varias partes, una entrada por parte.
  | { tipo: 'palabra'; entrada: Palabra; parte: number; partes: number; texto: string; palabra: number }

/** Duración base de una letra a velocidad 1× (ms). */
export const MS_LETRA = 1000
/** Las letras con movimiento duran más, para que se vea el trazo. */
export const FACTOR_MOVIMIENTO = 1.5
export const MS_PAUSA = 700
export const MS_SIN_SENA = 800
/** Cada parte de la seña de una palabra (lleva movimiento y es más larga que una letra). */
export const MS_PARTE_PALABRA = 1800
/** Frases de hasta tantas palabras («buenas noches», «mucho gusto»). */
const MAX_PALABRAS_FRASE = 3

// Letras que se deletrean igual que otra (acentos y diéresis).
const SIN_ACENTO: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U' }

/** Convierte un texto en la secuencia de señas de la lengua elegida. */
export function textoASenas(texto: string, lengua: Lengua): Sena[] {
  const letras = new Map(alfabeto(lengua).map((l) => [l.letra, l]))
  const diccionario = diccionarioDe(lengua)
  const senas: Sena[] = []
  const tokens = texto.split(/\s+/).filter(Boolean)
  let i = 0 // número de palabra en la secuencia (una frase con seña cuenta como una)
  for (let t = 0; t < tokens.length; i++) {
    if (i > 0) senas.push({ tipo: 'pausa', palabra: i })
    // ¿Empieza aquí una palabra o frase con seña? Primero la más larga.
    let encontrada: { entrada: Palabra; largo: number } | null = null
    for (let largo = Math.min(MAX_PALABRAS_FRASE, tokens.length - t); largo > 0 && !encontrada; largo--) {
      const entrada = diccionario.get(claveDePalabra(tokens.slice(t, t + largo).join(' ')))
      if (entrada) encontrada = { entrada, largo }
    }
    if (encontrada) {
      const original = tokens.slice(t, t + encontrada.largo).join(' ')
      const partes = SENAS[encontrada.entrada.id]?.length ?? 1
      for (let parte = 0; parte < partes; parte++) senas.push({ tipo: 'palabra', entrada: encontrada.entrada, parte, partes, texto: original, palabra: i })
      t += encontrada.largo
      continue
    }
    const palabra = tokens[t++]
    for (const caracter of palabra) {
      let clave = caracter.toLocaleUpperCase('es')
      clave = SIN_ACENTO[clave] ?? clave
      if (lengua === 'ASL' && clave === 'Ñ') clave = 'N'
      const letra = letras.get(clave)
      if (letra) senas.push({ tipo: 'letra', letra, original: caracter, palabra: i })
      else if (/[\p{L}\p{N}]/u.test(caracter)) senas.push({ tipo: 'sin-sena', texto: caracter, palabra: i })
      // Los signos de puntuación (¿?¡!,.) no se señan en el deletreo: se omiten.
    }
  }
  // Quitar pausas que quedaron solas (palabras hechas solo de signos).
  return senas.filter((s, i) => s.tipo !== 'pausa' || (i > 0 && senas[i - 1].tipo !== 'pausa' && i < senas.length - 1))
}

/** Cuánto se muestra cada seña (ms) a la velocidad elegida (0.5× a 2×). */
export function duracion(sena: Sena, velocidad: number): number {
  const base =
    sena.tipo === 'pausa'
      ? MS_PAUSA
      : sena.tipo === 'sin-sena'
        ? MS_SIN_SENA
        : sena.tipo === 'palabra'
          ? MS_PARTE_PALABRA
          : sena.letra.movimiento
            ? MS_LETRA * FACTOR_MOVIMIENTO
            : MS_LETRA
  return Math.round(base / velocidad)
}
