/**
 * LA MANO 3D DEL AVATAR (cálculos, sin dibujar)
 *
 * Convierte la forma de una letra (lib/aprendizaje/forma.ts) en una mano en tres dimensiones:
 *   1. POSE: cuánto se dobla cada articulación de cada dedo y a dónde va la punta del pulgar.
 *   2. ESQUELETO: con la pose se calculan los 21 puntos de la mano en 3D (cinemática directa:
 *      cada falange sale de la anterior, girada lo que se dobla esa articulación). Los puntos
 *      siguen el mismo orden que MediaPipe, así que se pueden evaluar con postura.ts.
 *   3. ORIENTACIÓN: la mano se gira según hacia dónde mira la palma y el giro de la letra.
 *   4. PROYECCIÓN: los puntos 3D se pasan a la pantalla con perspectiva (lo lejano se ve más chico).
 *
 * Unidades: la palma (muñeca → nudillo del medio) mide 1. Ejes de la mano: x hacia el pulgar,
 * y hacia los dedos, z hacia quien mira (la palma «de frente» mira hacia +z).
 */
import type { EstadoDedo, FormaMano, Movimiento, PosicionPulgar } from '../aprendizaje/forma'

export interface V3 {
  x: number
  y: number
  z: number
}

const v = (x: number, y: number, z: number): V3 => ({ x, y, z })
const suma = (a: V3, b: V3): V3 => v(a.x + b.x, a.y + b.y, a.z + b.z)
const resta = (a: V3, b: V3): V3 => v(a.x - b.x, a.y - b.y, a.z - b.z)
const por = (a: V3, k: number): V3 => v(a.x * k, a.y * k, a.z * k)
const largo = (a: V3) => Math.hypot(a.x, a.y, a.z)
const mezclar = (a: V3, b: V3, t: number): V3 => suma(a, por(resta(b, a), t))
const rad = (g: number) => (g * Math.PI) / 180

type DedoLargo = 'indice' | 'medio' | 'anular' | 'menique'
export const DEDOS: DedoLargo[] = ['indice', 'medio', 'anular', 'menique']

/** Ángulos de un dedo largo, en grados: separación lateral y lo que se dobla cada articulación. */
export interface AngulosDedo {
  abre: number
  mcp: number
  pip: number
  dip: number
  /** Adelante (+) o atrás (−) para cruzar el medio sobre el índice. */
  adelante: number
}

export interface Pose {
  dedos: Record<DedoLargo, AngulosDedo>
  /** Punta del pulgar (en coordenadas de la mano) y qué tanto se curva su camino. */
  pulgar: V3
  curvaPulgar: number
}

// ── Medidas de la mano (en palmas) ──
const NUDILLO: Record<DedoLargo, V3> = {
  indice: v(0.3, 0.96, 0),
  medio: v(0.08, 1, 0),
  anular: v(-0.14, 0.95, 0),
  menique: v(-0.34, 0.86, 0),
}
const FALANGES: Record<DedoLargo, [number, number, number]> = {
  indice: [0.44, 0.27, 0.21],
  medio: [0.5, 0.3, 0.22],
  anular: [0.46, 0.28, 0.21],
  menique: [0.36, 0.21, 0.18],
}
/** Separación natural de cada dedo (grados; + hacia el pulgar). */
const ABRE_NATURAL: Record<DedoLargo, number> = { indice: 3, medio: 0, anular: -3, menique: -7 }
const BASE_PULGAR = v(0.3, 0.22, 0.04)
const LARGO_PULGAR: [number, number, number] = [0.4, 0.3, 0.25]

const ANGULOS: Record<EstadoDedo, Pick<AngulosDedo, 'mcp' | 'pip' | 'dip'>> = {
  estirado: { mcp: 4, pip: 4, dip: 2 },
  curvo: { mcp: 30, pip: 45, dip: 30 },
  doblado: { mcp: 88, pip: 100, dip: 55 },
}

/** Mano en reposo (relajada, un poco curva). */
export const POSE_REPOSO: Pose = {
  dedos: Object.fromEntries(DEDOS.map((d) => [d, { abre: ABRE_NATURAL[d] * 1.5, mcp: 14, pip: 18, dip: 10, adelante: 0 }])) as Record<DedoLargo, AngulosDedo>,
  pulgar: v(0.72, 0.62, 0.18),
  curvaPulgar: 0.15,
}

/** Puntas de los dedos de una pose (para que el pulgar pueda ir a tocarlas). */
function puntaDedo(d: DedoLargo, a: AngulosDedo): V3 {
  return cadenaDedo(d, a)[3]
}

/** Las 4 articulaciones de un dedo largo: nudillo, PIP, DIP y punta. */
function cadenaDedo(d: DedoLargo, a: AngulosDedo): V3[] {
  const abre = rad(a.abre)
  const puntos = [suma(NUDILLO[d], v(0, 0, a.adelante))]
  let flexion = 0
  const angulos = [a.mcp, a.pip, a.dip]
  for (let i = 0; i < 3; i++) {
    flexion += rad(angulos[i])
    // Doblar = girar la dirección del dedo desde +y hacia +z (hacia la palma, que mira a +z).
    const dir = v(Math.sin(abre) * Math.cos(flexion), Math.cos(abre) * Math.cos(flexion), Math.sin(flexion))
    puntos.push(suma(puntos[i], por(dir, FALANGES[d][i])))
  }
  return puntos
}

/** A dónde va la punta del pulgar en cada posición (coordenadas de la mano). */
function destinoPulgar(p: PosicionPulgar, dedos: Record<DedoLargo, AngulosDedo>, entre: 1 | 2 | 3 | undefined): { punta: V3; curva: number } {
  switch (p) {
    case 'estirado':
      return { punta: v(0.95, 0.72, 0.08), curva: 0.05 }
    case 'lado':
      return { punta: v(0.42, 0.95, 0.12), curva: 0.1 }
    case 'curvo':
      return { punta: v(0.5, 0.82, 0.62), curva: 0.4 }
    case 'doblado':
      return { punta: v(-0.02, 0.62, 0.3), curva: 0.25 }
    case 'sobre':
      // Cruza por delante de los dedos doblados, a la altura de sus nudillos medios.
      return { punta: v(-0.18, 0.8, 0.62), curva: 0.1 }
    case 'entre': {
      const par: [DedoLargo, DedoLargo] = entre === 3 ? ['anular', 'menique'] : entre === 2 ? ['medio', 'anular'] : ['indice', 'medio']
      const medio = mezclar(NUDILLO[par[0]], NUDILLO[par[1]], 0.5)
      return { punta: v(medio.x, medio.y + 0.12, 0.28), curva: 0.25 }
    }
    case 'toca': {
      // La punta del pulgar va a juntarse con las puntas de los dedos que NO están estirados
      // (en la D el índice va arriba y el pulgar toca al medio; en la O, a todos).
      const cerrados = DEDOS.filter((d) => dedos[d].mcp + dedos[d].pip > 20).slice(0, 2)
      const usar = cerrados.length ? cerrados : (['indice', 'medio'] as DedoLargo[])
      const punta = usar.map((d) => puntaDedo(d, dedos[d])).reduce((a, b) => mezclar(a, b, 0.5))
      return { punta: suma(punta, v(0.03, -0.03, 0.02)), curva: 0.35 }
    }
  }
}

/** La pose de una letra. */
export function poseDeForma(f: FormaMano): Pose {
  const dedos = {} as Record<DedoLargo, AngulosDedo>
  for (const d of DEDOS) {
    const abre = f.separados && f.dedos.indice === 'estirado' && f.dedos.medio === 'estirado' ? ABRE_NATURAL[d] * 4 : ABRE_NATURAL[d]
    dedos[d] = { abre, adelante: 0, ...ANGULOS[f.dedos[d]] }
  }
  if (f.separados) {
    dedos.indice.abre = 12
    dedos.medio.abre = -8
  }
  if (f.cruzados) {
    // El medio cruza por delante del índice.
    dedos.medio.abre = 13
    dedos.medio.adelante = 0.07
    dedos.indice.abre = -4
  }
  // Con el pulgar «entre» los dedos o «sobre» ellos, los dedos doblados lo rodean un poco menos.
  const { punta, curva } = destinoPulgar(f.pulgar, dedos, f.entre)
  return { dedos, pulgar: punta, curvaPulgar: curva }
}

/** Mezcla dos poses (t = 0 → a, t = 1 → b). Sirve para pasar suave de una letra a otra. */
export function mezclarPoses(a: Pose, b: Pose, t: number): Pose {
  const n = (x: number, y: number) => x + (y - x) * t
  const dedos = {} as Record<DedoLargo, AngulosDedo>
  for (const d of DEDOS) {
    const [x, y] = [a.dedos[d], b.dedos[d]]
    dedos[d] = { abre: n(x.abre, y.abre), mcp: n(x.mcp, y.mcp), pip: n(x.pip, y.pip), dip: n(x.dip, y.dip), adelante: n(x.adelante, y.adelante) }
  }
  return { dedos, pulgar: mezclar(a.pulgar, b.pulgar, t), curvaPulgar: n(a.curvaPulgar, b.curvaPulgar) }
}

/**
 * Los 21 puntos de la mano en 3D (orden de MediaPipe): 0 muñeca, 1–4 pulgar, 5–8 índice,
 * 9–12 medio, 13–16 anular, 17–20 meñique.
 */
export function esqueleto(pose: Pose): V3[] {
  const p: V3[] = new Array(21)
  p[0] = v(0, 0, 0)
  DEDOS.forEach((d, i) => {
    cadenaDedo(d, pose.dedos[d]).forEach((q, j) => (p[5 + i * 4 + j] = q))
  })
  // Pulgar: una curva desde su base hasta la punta elegida, abombada hacia afuera de la palma.
  const base = BASE_PULGAR
  const fin = pose.pulgar
  const recta = resta(fin, base)
  const afuera = v(0.55, -0.1, 0.35)
  const control = suma(mezclar(base, fin, 0.45), por(afuera, pose.curvaPulgar * Math.max(0.6, largo(recta))))
  const curva = (t: number) => suma(suma(por(base, (1 - t) * (1 - t)), por(control, 2 * t * (1 - t))), por(fin, t * t))
  const total = LARGO_PULGAR[0] + LARGO_PULGAR[1] + LARGO_PULGAR[2]
  p[1] = base
  p[2] = curva(LARGO_PULGAR[0] / total)
  p[3] = curva((LARGO_PULGAR[0] + LARGO_PULGAR[1]) / total)
  p[4] = fin
  return p
}

// ── Orientación y movimiento ──

export interface Giro {
  /** Grados alrededor de x (inclinar adelante/atrás), y (voltear) y z (en el plano de la pantalla). */
  x: number
  y: number
  z: number
}

/** Hacia dónde mira la mano en una letra: palma, dorso o de lado, y su giro. */
export function giroDeForma(f: FormaMano): Giro {
  const voltear = f.palma === 'dorso' ? 180 : f.palma === 'lado' ? 80 : 0
  return { x: 0, y: voltear, z: -(f.giro ?? 0) }
}

export function rotar(p: V3, g: Giro): V3 {
  const [cx, sx] = [Math.cos(rad(g.x)), Math.sin(rad(g.x))]
  const [cy, sy] = [Math.cos(rad(g.y)), Math.sin(rad(g.y))]
  const [cz, sz] = [Math.cos(rad(g.z)), Math.sin(rad(g.z))]
  // z (pantalla), luego y (voltear), luego x (inclinar)
  let q = v(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z)
  q = v(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy)
  return v(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx)
}

/**
 * Desplazamiento y giro extra de la mano para las letras con movimiento, en el instante t (0 a 1).
 * Las trayectorias imitan las instrucciones del alfabeto: J (gancho), Z (zigzag), arriba, a los lados y al frente.
 */
export function movimientoEn(m: Movimiento | undefined, t: number): { mover: V3; giro: Giro } {
  const nada = { mover: v(0, 0, 0), giro: { x: 0, y: 0, z: 0 } }
  if (!m) return nada
  const s = Math.sin(t * Math.PI) // va y regresa
  switch (m) {
    case 'j': {
      // Baja y hace el gancho hacia el lado del pulgar, girando la muñeca.
      const k = Math.min(1, t * 1.25)
      return { mover: v(0.35 * Math.sin(k * Math.PI * 0.9), -0.55 * Math.min(1, k * 1.6), 0), giro: { x: 0, y: 0, z: 70 * k } }
    }
    case 'z': {
      // Tres trazos: derecha, diagonal abajo-izquierda, derecha.
      const tramo = Math.min(2, Math.floor(t * 3))
      const u = t * 3 - tramo
      const puntos = [v(-0.35, 0.3, 0), v(0.35, 0.3, 0), v(-0.35, -0.3, 0), v(0.35, -0.3, 0)]
      return { mover: mezclar(puntos[tramo], puntos[tramo + 1], u), giro: nada.giro }
    }
    case 'arriba':
      return { mover: v(0, 0.25 * s, 0), giro: { x: -35 * s, y: 0, z: 0 } }
    case 'lados':
      return { mover: v(0.3 * Math.sin(t * Math.PI * 2), 0, 0), giro: nada.giro }
    case 'frente':
      return { mover: v(0, 0, 0.6 * s), giro: nada.giro }
  }
}

// ── Proyección a la pantalla ──

export interface Camara {
  /** Distancia de la cámara al centro de la mano (en palmas). */
  distancia: number
  /** Píxeles por palma a esa distancia. */
  escala: number
  centro: { x: number; y: number }
}

/** Pasa un punto 3D a la pantalla (x a la derecha, y hacia abajo) y devuelve su profundidad. */
export function proyectar(p: V3, c: Camara): { x: number; y: number; z: number; k: number } {
  const k = c.distancia / Math.max(0.5, c.distancia - p.z) // más cerca → más grande
  return { x: c.centro.x + p.x * c.escala * k, y: c.centro.y - p.y * c.escala * k, z: p.z, k }
}
