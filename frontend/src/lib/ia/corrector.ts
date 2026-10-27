/**
 * IA 3 · AUTOCORRECTOR QUE APRENDE
 *
 * Al terminar de deletrear una palabra, busca la palabra del vocabulario más «cercana».
 * La cercanía se mide con la distancia de edición de Damerau-Levenshtein (cuántas letras
 * hay que cambiar, agregar, quitar o intercambiar), pero con costos pensados para SEÑAS:
 *
 *   - Cambiar una letra por otra de forma PARECIDA cuesta poco (la cámara las confunde fácil).
 *     Ej.: U↔V (solo se separan los dedos) cuesta ~0.5; A↔L cuesta 1.
 *   - Faltar una letra repetida cuesta 0.5 (para repetir una letra hay que bajar la mano,
 *     y a veces no se registra): «CALE» → «CALLE».
 *   - Intercambiar dos letras seguidas cuesta 0.8: «HLOA» → «HOLA».
 *
 * Aprende del usuario:
 *   - Cada palabra que deletrea suma a su vocabulario personal (las más usadas ganan en empates).
 *   - Si DESHACE una corrección, la palabra original se aprende con fuerza y no se vuelve a corregir.
 *
 * Regla «autocorregir»: a ∧ ¬v ∧ c ∧ u
 *   a = autocorrección activada, v = la palabra ya existe en el vocabulario,
 *   c = hay una palabra cercana, u = esa palabra es claramente la mejor (sin empate).
 */
// ▸ Desde nuestro proyecto:
import type { Letra } from '../aprendizaje/alfabeto'
import { diferencias } from '../aprendizaje/grafoLetras'
import { cumple } from '../logica/reglas'

/** Costo de cambiar la letra a por la b según qué tan parecidas son sus formas de mano. */
export function costoCambio(a: string, b: string, formas: Map<string, Letra['forma']>): number {
  if (a === b) return 0
  const fa = formas.get(a)
  const fb = formas.get(b)
  if (!fa || !fb) return 1
  const n = diferencias(fa, fb).length // 1 = casi iguales, 4+ = muy distintas
  return 0.35 + 0.65 * Math.min(1, n / 4)
}

/** Distancia de edición con costos de señas (Damerau-Levenshtein restringida, programación dinámica). */
export function distanciaSenas(a: string, b: string, formas: Map<string, Letra['forma']>): number {
  const n = a.length
  const m = b.length
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i++) d[i][0] = i
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // Quitar una letra de «a»: barato si es repetición de la anterior («HOOLA»).
      const quitar = d[i - 1][j] + (i > 1 && a[i - 1] === a[i - 2] ? 0.5 : 1)
      // Agregar una letra de «b»: barato si es repetición («CALE» → «CALLE»).
      const agregar = d[i][j - 1] + (j > 1 && b[j - 1] === b[j - 2] ? 0.5 : 1)
      const cambiar = d[i - 1][j - 1] + costoCambio(a[i - 1], b[j - 1], formas)
      let mejor = Math.min(quitar, agregar, cambiar)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) mejor = Math.min(mejor, d[i - 2][j - 2] + 0.8)
      d[i][j] = mejor
    }
  }
  return d[n][m]
}

/** Qué tan lejos puede estar una palabra para corregirla, según su largo. */
export const umbralPara = (largo: number) => (largo <= 3 ? 0.8 : largo <= 6 ? 1.3 : 1.8)

/** Diferencia mínima entre la mejor y la segunda opción para corregir sin preguntar. */
export const MARGEN = 0.25

export interface Correccion {
  original: string
  sugerida: string
  /** true = se corrige sola; false = solo se sugiere (había empate). */
  automatica: boolean
  distancia: number
  alternativas: string[]
}

/**
 * Busca la corrección de una palabra.
 * vocabulario: palabra → frecuencia (las del usuario tienen más frecuencia).
 */
export function corregir(
  palabra: string,
  vocabulario: Map<string, number>,
  formas: Map<string, Letra['forma']>,
  activada = true,
): Correccion | null {
  const p = palabra.toUpperCase()
  if (p.length < 2) return null
  const v = vocabulario.has(p) // v: ya existe
  if (v) return null

  // Puntaje: distancia menos un pequeño premio por frecuencia (las palabras comunes ganan los empates).
  const candidatos: { palabra: string; distancia: number; puntaje: number }[] = []
  const umbral = umbralPara(p.length)
  for (const [w, frecuencia] of vocabulario) {
    if (Math.abs(w.length - p.length) > 2) continue
    const distancia = distanciaSenas(p, w, formas)
    if (distancia <= umbral) candidatos.push({ palabra: w, distancia, puntaje: distancia - 0.1 * Math.log10(1 + frecuencia) })
  }
  candidatos.sort((x, y) => x.puntaje - y.puntaje)
  const c = candidatos.length > 0 // c: hay una palabra cercana
  if (!c) return null
  const [mejor, segunda] = candidatos
  const u = !segunda || segunda.puntaje - mejor.puntaje >= MARGEN // u: es claramente la mejor
  return {
    original: p,
    sugerida: mejor.palabra,
    automatica: cumple('autocorregir', { a: activada, v, c, u }),
    distancia: mejor.distancia,
    alternativas: candidatos.slice(1, 4).map((x) => x.palabra),
  }
}

/** Vocabulario completo: el base (frecuencia 1) más el aprendido del usuario (frecuencia ×5). */
export function vocabularioCon(base: string[], aprendidas: Record<string, number>): Map<string, number> {
  const v = new Map<string, number>(base.map((w) => [w, 1]))
  for (const [w, n] of Object.entries(aprendidas)) v.set(w, (v.get(w) ?? 0) + n * 5)
  return v
}

/** Formas de mano por letra (para los costos de cambio). */
export const formasDe = (letras: Letra[]) => new Map(letras.map((l) => [l.letra, l.forma]))
