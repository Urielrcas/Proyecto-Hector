/**
 * DELETREO GUIADO: aprender a deletrear una palabra (por ejemplo, tu nombre) letra por letra
 *
 * Lo usan la pantalla «Deletrear una palabra» (pages/aprender/DeletrearPalabra.tsx) y Mani
 * («quiero aprender a deletrear mi nombre»).
 *   - limpiarPalabra: «Sofía López» → «SOFIA LOPEZ» (sin acentos ni signos; respeta la Ñ).
 *   - pasosDeletreo: cada letra de la palabra con su forma de la lengua (los espacios se saltan).
 *   - primerNombre: de «Ana María Pérez» toma «Ana».
 */
import type { Letra } from './alfabeto'

/** Máximo de letras para practicar de una vez (un nombre o una frase corta). */
export const MAX_LETRAS_DELETREO = 24

/** Mayúsculas, sin acentos ni signos; respeta la Ñ y deja un solo espacio entre palabras. */
export function limpiarPalabra(texto: string): string {
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/N\u0303/g, 'Ñ') // la Ñ se separa en N + tilde: se vuelve a juntar antes de quitar los acentos
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-ZÑ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LETRAS_DELETREO)
    .trim()
}

export interface PasoDeletreo {
  /** Posición dentro del texto limpio (para saber qué letra va). */
  indice: number
  letra: Letra
}

/** Las letras de la palabra, en orden, con su forma en la lengua elegida. Se saltan los espacios y lo que no existe. */
export function pasosDeletreo(palabra: string, letras: Letra[]): PasoDeletreo[] {
  const limpia = limpiarPalabra(palabra)
  const pasos: PasoDeletreo[] = []
  ;[...limpia].forEach((c, indice) => {
    const letra = letras.find((l) => l.letra === c)
    if (letra) pasos.push({ indice, letra })
  })
  return pasos
}

/** El primer nombre de una persona («Ana María Pérez» → «Ana»), o null si no hay. */
export function primerNombre(nombre: string | null | undefined): string | null {
  const primero = (nombre ?? '').trim().split(/\s+/)[0]
  return primero ? primero : null
}
