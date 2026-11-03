/**
 * LA ESCENA: LAS DOS MANOS Y EL CUERPO
 *
 * Para las señas de palabras no basta la forma de la mano: importa DÓNDE está (en la barbilla,
 * en el pecho…) y, si son dos manos, cómo se tocan. Aquí se juntan:
 *   - las manos que ve MediaPipe (hasta dos), con sus 21 puntos,
 *   - unos puntos del cuerpo (PoseLandmarker): ojos, nariz, boca, orejas y hombros.
 *
 * Todas las coordenadas vienen «sin estirar»: x se multiplica por el ancho/alto del video, así una
 * distancia mide lo mismo en horizontal y en vertical. Las distancias de las reglas se miden en
 * «palmas» (muñeca → nudillo del medio) o en «caras» (ojos → boca): no importa qué tan cerca estés.
 */
import type { Punto } from './postura'

export interface ManoVista {
  /** Los 21 puntos en la imagen (x ya corregida por el ancho del video). */
  puntos: Punto[]
  /** Los mismos puntos como los usa la evaluación de letras (normalizarMano). */
  normal: Punto[]
}

export interface Cuerpo {
  nariz: Punto
  ojos: Punto
  boca: Punto
  /** Altura de los hombros y ancho entre ellos (estimados si no se ven). */
  hombros: Punto
  anchoHombros: number
}

export interface Escena {
  manos: ManoVista[]
  cuerpo: Cuerpo | null
}

export type Lugar = 'cabeza' | 'frente' | 'mejilla' | 'boca' | 'barbilla' | 'cuello' | 'pecho' | 'estomago'

export const NOMBRE_LUGAR: Record<Lugar, string> = {
  cabeza: 'encima de la cabeza',
  frente: 'la frente',
  mejilla: 'un lado de la cara',
  boca: 'la boca',
  barbilla: 'la barbilla',
  cuello: 'el cuello',
  pecho: 'el pecho',
  estomago: 'el estómago',
}

export const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y)
export const promedio = (ps: Punto[]): Punto => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length })

/** Tamaño de la palma: muñeca → nudillo del dedo medio. */
export const tamanoPalma = (m: Punto[]) => distancia(m[0], m[9]) || 0.0001
/** Centro de la palma: muñeca y los cuatro nudillos. */
export const centroPalma = (m: Punto[]) => promedio([m[0], m[5], m[9], m[13], m[17]])

/**
 * Arma el cuerpo con los puntos de PoseLandmarker (índices de MediaPipe: 0 nariz, 2 y 5 ojos,
 * 9 y 10 comisuras de la boca, 11 y 12 hombros). Si los hombros no se ven bien, se estiman
 * a partir de la cara (la cámara suele cortar el cuerpo).
 */
export function cuerpoDesdePose(p: (Punto & { visibility?: number })[]): Cuerpo | null {
  if (p.length < 13) return null
  const ojos = promedio([p[2], p[5]])
  const boca = promedio([p[9], p[10]])
  const cara = boca.y - ojos.y
  if (cara <= 0) return null
  const seVen = (p[11].visibility ?? 1) > 0.5 && (p[12].visibility ?? 1) > 0.5
  const hombros = seVen ? promedio([p[11], p[12]]) : { x: p[0].x, y: boca.y + cara * 2.6 }
  const anchoHombros = seVen ? Math.abs(p[11].x - p[12].x) : cara * 5
  return { nariz: p[0], ojos, boca, hombros, anchoHombros }
}

/** ¿El punto está en ese lugar del cuerpo? Las zonas se traslapan un poco a propósito (es más fácil acertar). */
export function estaEn(lugar: Lugar, q: Punto, c: Cuerpo): boolean {
  const h = c.boca.y - c.ojos.y // «una cara»: de los ojos a la boca
  const dx = Math.abs(q.x - c.nariz.x)
  const { y } = q
  switch (lugar) {
    case 'cabeza':
      return y < c.ojos.y - 1.5 * h && dx < 2 * h
    case 'frente':
      return y > c.ojos.y - 2.2 * h && y < c.ojos.y + 0.3 * h && dx < 1.6 * h
    case 'mejilla':
      return y > c.ojos.y - 0.5 * h && y < c.boca.y + 0.8 * h && dx > 0.4 * h && dx < 2.4 * h
    case 'boca':
      return Math.abs(y - c.boca.y) < 0.7 * h && dx < 1.1 * h
    case 'barbilla':
      return y > c.boca.y - 0.2 * h && y < c.boca.y + 1.5 * h && dx < 1.3 * h
    case 'cuello':
      return y > c.boca.y + 0.8 * h && y < c.hombros.y + 0.4 * h && dx < 1.5 * h
    case 'pecho':
      return y > c.hombros.y - 0.4 * h && y < c.hombros.y + 0.8 * c.anchoHombros && dx < 0.8 * c.anchoHombros
    case 'estomago':
      return y > c.hombros.y + 0.6 * c.anchoHombros && dx < 0.9 * c.anchoHombros
  }
}

/** Dónde dibujar la zona de un lugar (para guiar al usuario en la cámara). Devuelve centro y radio. */
export function zonaDe(lugar: Lugar, c: Cuerpo): { centro: Punto; radio: number } {
  const h = c.boca.y - c.ojos.y
  const x = c.nariz.x
  switch (lugar) {
    case 'cabeza':
      return { centro: { x, y: c.ojos.y - 2.4 * h }, radio: 1.1 * h }
    case 'frente':
      return { centro: { x, y: c.ojos.y - 1 * h }, radio: 0.9 * h }
    case 'mejilla':
      return { centro: { x: x - 1.4 * h, y: (c.ojos.y + c.boca.y) / 2 }, radio: 0.8 * h }
    case 'boca':
      return { centro: c.boca, radio: 0.6 * h }
    case 'barbilla':
      return { centro: { x, y: c.boca.y + 0.7 * h }, radio: 0.7 * h }
    case 'cuello':
      return { centro: { x, y: (c.boca.y + c.hombros.y) / 2 + 0.4 * h }, radio: 0.8 * h }
    case 'pecho':
      return { centro: { x, y: c.hombros.y + 0.35 * c.anchoHombros }, radio: 0.3 * c.anchoHombros }
    case 'estomago':
      return { centro: { x, y: c.hombros.y + 1.1 * c.anchoHombros }, radio: 0.35 * c.anchoHombros }
  }
}

// ── Cómo se relacionan las dos manos ─────────────────────────────────────

export type Relacion = 'juntas' | 'yemas-unidas' | 'sobre-palma' | 'lado-a-lado' | 'puntas-cerca'

export const CONSEJO_RELACION: Record<Relacion, string> = {
  juntas: 'Junta las dos manos.',
  'yemas-unidas': 'Une las puntas de los dedos de las dos manos, con las palmas separadas.',
  'sobre-palma': 'Pon la mano sobre la palma de la otra mano.',
  'lado-a-lado': 'Pon las dos manos una al lado de la otra.',
  'puntas-cerca': 'Apunta los dos índices uno hacia el otro.',
}

/** ¿La mano activa y la otra están en esa relación? (distancias en palmas) */
export function cumpleRelacion(relacion: Relacion, activa: Punto[], otra: Punto[]): boolean {
  const palma = (tamanoPalma(activa) + tamanoPalma(otra)) / 2
  const d = (a: Punto, b: Punto) => distancia(a, b) / palma
  const ca = centroPalma(activa)
  const co = centroPalma(otra)
  switch (relacion) {
    case 'juntas':
      return d(ca, co) < 1.2
    case 'yemas-unidas': {
      const puntasA = promedio([activa[8], activa[12], activa[16]])
      const puntasO = promedio([otra[8], otra[12], otra[16]])
      return d(puntasA, puntasO) < 0.7 && d(activa[0], otra[0]) > 1.2
    }
    case 'sobre-palma':
      return Math.min(...[ca, activa[4], activa[8], activa[12], activa[20]].map((q) => d(q, co))) < 1
    case 'lado-a-lado':
      return d(ca, co) > 0.9 && d(ca, co) < 4.5 && Math.abs(ca.y - co.y) / palma < 1.2
    case 'puntas-cerca':
      return d(activa[8], otra[8]) < 2.2
  }
}
