/**
 * IA 4 · MEMORIA DE TUS SEÑAS (cómo haces TÚ cada letra)
 *
 * Si a una persona se le dificulta doblar los dedos como en el dibujo y siempre hace la A
 * «a su manera», puede pedirle a la IA que la recuerde. Desde entonces su forma cuenta como A.
 *
 * Cómo funciona (vecino más cercano):
 *   1. Cada mano se convierte en 42 números: la posición (x, y) de los 21 puntos, tomando la
 *      muñeca como origen y el tamaño de la palma como unidad (no importa qué tan lejos esté).
 *   2. Para reconocer, se mide la distancia entre la mano de ahora y cada postura recordada.
 *   3. Para que una forma «rara» no se confunda con otra letra, también se mide contra la forma
 *      ESTÁNDAR de cada letra (anclas, hechas con manoSintetica).
 *
 * Regla «tu forma personal»: p ∧ c ∧ u
 *   p = hay una forma recordada de esa letra,
 *   c = la mano está CERCA de esa forma (distancia menor que el umbral),
 *   u = está claramente más cerca de esa letra que de cualquier otra.
 * Regla «forma aceptada»: g ∨ (p ∧ c ∧ u)  — la reconocen las reglas generales O tu forma personal.
 */
// ▸ Desde nuestro proyecto:
import type { Letra } from '../aprendizaje/alfabeto'
import { cumple } from '../logica/reglas'
import { manoSintetica } from '../vision/manoSintetica'
import type { Punto } from '../vision/postura'
import { clasesDe } from './cnn/datos'
import { descomprimirPuntos } from './cnn/imagen'

/** Distancia máxima (en «palmas») para decir que la mano se parece a la forma recordada. */
export const UMBRAL_CERCA = 0.7
/** Para ser «claramente» de una letra, su distancia debe ser menor que esta fracción de la de otra. */
export const MARGEN_UNICA = 0.8
/** Formas recordadas por letra (las más recientes). */
export const MAX_PERSONALES = 30

/** La mano como 42 números: muñeca en el origen y la palma (muñeca → nudillo del medio) mide 1. */
export function vectorDeMano(puntos: Punto[]): number[] {
  const m = puntos[0]
  const palma = Math.hypot(puntos[9].x - m.x, puntos[9].y - m.y) || 1
  return puntos.flatMap((p) => [(p.x - m.x) / palma, (p.y - m.y) / palma])
}

export function distancia(a: number[], b: number[]): number {
  let suma = 0
  for (let i = 0; i < a.length; i++) suma += (a[i] - b[i]) ** 2
  return Math.sqrt(suma)
}

/** Grupos de letras con la misma forma (I/J, N/Ñ…): se tratan como una sola al comparar. */
function grupoDe(letras: Letra[]) {
  const grupos = new Map<string, string>()
  for (const c of clasesDe(letras)) for (const l of c.letras) grupos.set(l, c.nombre)
  return grupos
}

export interface Memoria {
  /** Forma estándar de cada letra (como en el dibujo). */
  anclas: Map<string, number[]>
  /** Formas personales recordadas, ya convertidas a vectores. */
  personales: Map<string, number[][]>
  grupos: Map<string, string>
}

/** Prepara la memoria a partir de las formas guardadas (comprimidas) del usuario. */
export function crearMemoria(letras: Letra[], guardadas: Record<string, number[][]>): Memoria {
  return {
    anclas: new Map(letras.map((l) => [l.letra, vectorDeMano(manoSintetica(l.forma))])),
    personales: new Map(Object.entries(guardadas).map(([l, lista]) => [l, lista.map((d) => vectorDeMano(descomprimirPuntos(d)))])),
    grupos: grupoDe(letras),
  }
}

export interface Comparacion {
  letra: string
  /** Distancia a la forma recordada más parecida (∞ si no hay). */
  distancia: number
  /** La otra letra más cercana y su distancia. */
  otra: { letra: string; distancia: number } | null
  p: boolean
  c: boolean
  u: boolean
  /** Regla «tu forma personal»: p ∧ c ∧ u. */
  aceptada: boolean
}

/** ¿Esta mano es TU forma de la letra «letra»? */
export function compararConLetra(puntos: Punto[], letra: string, memoria: Memoria): Comparacion {
  const v = vectorDeMano(puntos)
  const propias = memoria.personales.get(letra) ?? []
  const d = propias.length ? Math.min(...propias.map((x) => distancia(v, x))) : Infinity
  const grupo = memoria.grupos.get(letra)

  // La letra distinta más cercana: contra su forma estándar y contra sus formas personales.
  let otra: Comparacion['otra'] = null
  for (const [l, ancla] of memoria.anclas) {
    if (memoria.grupos.get(l) === grupo) continue
    const candidatas = [ancla, ...(memoria.personales.get(l) ?? [])]
    const dl = Math.min(...candidatas.map((x) => distancia(v, x)))
    if (!otra || dl < otra.distancia) otra = { letra: l, distancia: dl }
  }

  const p = propias.length > 0
  const c = d <= UMBRAL_CERCA
  const u = !otra || d < otra.distancia * MARGEN_UNICA
  return { letra, distancia: d, otra, p, c, u, aceptada: cumple('formaPersonal', { p, c, u }) }
}

/** Para el traductor (no se sabe qué letra es): la letra personal que mejor coincide, si alguna se acepta. */
export function reconocerPersonal(puntos: Punto[], memoria: Memoria): Comparacion | null {
  let mejor: Comparacion | null = null
  for (const letra of memoria.personales.keys()) {
    const c = compararConLetra(puntos, letra, memoria)
    if (c.aceptada && (!mejor || c.distancia < mejor.distancia)) mejor = c
  }
  return mejor
}

/**
 * Antes de recordar una forma: ¿se parece MUCHO a otra letra? (para avisar).
 * Ej.: si al «enseñar la A» la mano está casi igual a la S estándar, conviene revisarlo.
 */
export function pareceOtraLetra(posturas: Punto[][], letra: string, memoria: Memoria): string | null {
  const grupo = memoria.grupos.get(letra)
  const votos = new Map<string, number>()
  for (const p of posturas) {
    const v = vectorDeMano(p)
    let cerca: { letra: string; d: number } | null = null
    for (const [l, ancla] of memoria.anclas) {
      const d = distancia(v, ancla)
      if (!cerca || d < cerca.d) cerca = { letra: l, d }
    }
    if (cerca && memoria.grupos.get(cerca.letra) !== grupo && cerca.d < UMBRAL_CERCA * 0.6) votos.set(cerca.letra, (votos.get(cerca.letra) ?? 0) + 1)
  }
  const [masVotada] = [...votos.entries()].sort((a, b) => b[1] - a[1])
  return masVotada && masVotada[1] >= posturas.length / 2 ? masVotada[0] : null
}
