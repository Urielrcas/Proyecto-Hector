/**
 * EL AVATAR HACIENDO LA SEÑA DE UNA PALABRA
 *
 * Las señas de palabras ya están descritas para la cámara (lib/vision/senas.ts): forma de la mano,
 * lugar, movimiento y, a veces, varias partes. Aquí esa misma descripción se convierte en algo que el
 * avatar sabe hacer: una forma de mano (FormaMano) con el movimiento más parecido de los que tiene.
 * Así la seña que muestra el avatar es la misma que la cámara reconoce.
 *
 * Límites: el avatar es una sola mano y no tiene cuerpo, así que no puede mostrar el lugar
 * (barbilla, pecho…) ni la segunda mano; eso se dice con texto junto al avatar.
 */
import { alfabeto } from '../aprendizaje/alfabeto'
import { mano, type FormaMano, type Movimiento } from '../aprendizaje/forma'
import type { Palabra } from '../aprendizaje/palabras'
import type { Lengua } from '../tipos'
import { SENAS, type Forma, type MovSena } from '../vision/senas'

/** Las formas generales de las señas, como formas que el avatar sabe dibujar. */
const FORMAS_AVATAR: Record<string, FormaMano> = {
  abierta: mano('EEEE', 'estirado'),
  puno: mano('DDDD', 'sobre'),
  indice: mano('EDDD', 'doblado'),
  indiceEstirado: mano('EDDD', 'doblado'),
  menique: mano('DDDE', 'doblado'),
  capullo: mano('CCCC', 'toca'),
  garra: mano('CCCC', 'curvo', { separados: true }),
  cuatro: mano('EEEE', 'doblado'),
  cualquiera: mano('EEEE', 'estirado'),
}

/** El movimiento del avatar que más se parece al de la seña (el avatar tiene cinco). */
const MOVIMIENTO_AVATAR: Partial<Record<MovSena, Movimiento>> = {
  lado: 'lados',
  'lado-a-lado': 'lados',
  'al-frente': 'frente',
  'adelante-atras': 'frente',
  golpecitos: 'frente',
  arriba: 'arriba',
  'arriba-abajo': 'arriba',
  circulo: 'z',
}

function formaDe(f: Forma, lengua: Lengua): FormaMano | null {
  if ('forma' in f) return FORMAS_AVATAR[f.forma] ?? null
  return alfabeto(lengua).find((l) => l.letra === f.letra)?.forma ?? null
}

/** La forma (con movimiento) que hace el avatar en una parte de la seña de una palabra; null = reposo. */
export function formaAvatarDePalabra(entrada: Palabra, lengua: Lengua, parte: number): FormaMano | null {
  const sena = SENAS[entrada.id]?.[parte]
  if (sena) {
    const forma = formaDe(sena.forma, lengua)
    if (!forma) return null
    const movimiento = sena.movimiento ? MOVIMIENTO_AVATAR[sena.movimiento] : undefined
    return { ...forma, movimiento }
  }
  // Sin seña descrita para la cámara: la forma de la primera letra que usa, si hay.
  const letra = entrada.letras[parte] ?? entrada.letras[0]
  return letra ? (alfabeto(lengua).find((l) => l.letra === letra)?.forma ?? null) : null
}

/** Lo que el avatar no puede mostrar y conviene decir con texto: dónde va la mano y si usa las dos. */
export function notaDePalabra(entrada: Palabra, parte: number): string | null {
  const sena = SENAS[entrada.id]?.[parte]
  const partes: string[] = []
  if (sena?.lugar?.length) partes.push(`en ${LUGAR[sena.lugar[0]] ?? sena.lugar[0]}`)
  if (entrada.dosManos) partes.push('con las dos manos')
  return partes.length ? partes.join(', ') : null
}

const LUGAR: Record<string, string> = {
  cabeza: 'la cabeza',
  frente: 'la frente',
  mejilla: 'la mejilla',
  boca: 'la boca',
  barbilla: 'la barbilla',
  cuello: 'el cuello',
  pecho: 'el pecho',
  estomago: 'el estómago',
}
