/**
 * EL CUERPO DEL AVATAR (cálculos, sin dibujar)
 *
 * El avatar de cuerpo completo que hace las señas (components/AvatarCuerpo.tsx). Aquí está todo lo que
 * se puede calcular y probar sin pantalla:
 *   1. MEDIDAS del cuerpo (en «palmas», la misma unidad de la mano 3D de mano3d.ts).
 *   2. LUGARES del cuerpo donde se hacen las señas (pecho, barbilla, frente…).
 *   3. PASOS: cada seña se convierte en lo que hace cada mano (forma, lugar, hacia dónde mira la palma
 *      y movimiento). Las letras salen del alfabeto; las palabras, de su descripción para la cámara
 *      (lib/vision/senas.ts), así la seña que hace el avatar es la misma que la cámara reconoce.
 *   4. CINEMÁTICA INVERSA de dos huesos: dado a dónde debe llegar la muñeca, se calcula dónde queda el
 *      codo (el brazo se dobla solo para alcanzar el lugar).
 *   5. La mano en cada instante: su pose (dedos) y sus 21 puntos ya colocados en el mundo.
 *
 * Ejes del mundo: x hacia la derecha de quien mira, y hacia arriba, z hacia quien mira.
 * El avatar mira hacia quien lo ve: su mano DERECHA queda del lado izquierdo de la pantalla (x < 0).
 */
import { alfabeto } from '../aprendizaje/alfabeto'
import { mano, type FormaMano, type Movimiento } from '../aprendizaje/forma'
import type { Palabra } from '../aprendizaje/palabras'
import type { Sena } from '../traduccion/deletreo'
import type { Lengua } from '../tipos'
import type { Lugar, Relacion } from '../vision/escena'
import { SENAS, type Forma, type MovSena } from '../vision/senas'
import { esqueleto, giroDeForma, mezclarPoses, movimientoEn, poseDeForma, POSE_REPOSO, rotar, type Giro, type Pose, type V3 } from './mano3d'

// ── Vectores ──
export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z })
const suma = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z)
const resta = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z)
const por = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k)
const punto = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const largo = (a: V3) => Math.hypot(a.x, a.y, a.z)
const unitario = (a: V3) => por(a, 1 / (largo(a) || 1))
export const mezclarV = (a: V3, b: V3, t: number): V3 => suma(a, por(resta(b, a), t))

/** −1 = mano derecha del avatar (lado izquierdo de la pantalla); +1 = mano izquierda. */
export type Lado = -1 | 1

// ── 1. Medidas (palmas) ──────────────────────────────────────────────────
export const CUERPO = {
  cadera: 5.6,
  hombroY: 9.05,
  hombroX: 1.85,
  cuelloY: 9.5,
  cabeza: v3(0, 11.05, 0.05),
  radioCabeza: 1.45,
  brazo: 2.55, // hombro → codo
  antebrazo: 2.35, // codo → muñeca
  piernaX: 0.72,
  tobilloY: 0.45,
}
export const hombro = (lado: Lado): V3 => v3(lado * CUERPO.hombroX, CUERPO.hombroY, 0)

// ── 2. Lugares ───────────────────────────────────────────────────────────
/** Lugares del cuerpo (los de la cámara) más los del deletreo y el reposo. */
export type LugarAvatar = Lugar | 'neutro' | 'letra' | 'reposo'

/** Dónde queda el CENTRO de la mano en cada lugar (para la mano derecha; la izquierda se refleja). */
const LUGARES: Record<LugarAvatar, V3> = {
  letra: v3(-1.25, 9.25, 2.5), // a la altura del hombro, al frente: se ve bien el deletreo
  neutro: v3(-0.95, 8.2, 2.5),
  pecho: v3(0.55, 8.45, 1.35), // sobre el corazón (lado izquierdo del avatar)
  estomago: v3(-0.1, 6.95, 1.45),
  cuello: v3(0, 9.6, 1.25),
  barbilla: v3(0, 9.95, 1.75),
  boca: v3(0, 10.45, 1.85),
  mejilla: v3(-1.05, 10.75, 1.45),
  frente: v3(0, 11.95, 1.8),
  cabeza: v3(-1.65, 11.7, 0.55),
  reposo: v3(-2.3, 4.75, 0.4), // colgando junto a la pierna
}

/** El lugar para una mano: la izquierda va reflejada (lugares a un lado) o al lado de la derecha. */
export function lugarDe(l: LugarAvatar, lado: Lado): V3 {
  const p = LUGARES[l]
  return lado === -1 ? p : v3(-p.x, p.y, p.z)
}

// ── 3. Pasos ─────────────────────────────────────────────────────────────
/** Hacia dónde mira la palma (además del giro propio de cada letra). */
export type Palma = 'frente' | 'dorso' | 'lado' | 'cuerpo' | 'abajo' | 'arriba'
export type Cara = 'neutra' | 'sonrisa' | 'pregunta' | 'seria'

export interface ManoPaso {
  forma: FormaMano
  lugar: LugarAvatar
  palma: Palma
  /** Giro extra en el plano de la pantalla (grados; + gira los dedos hacia el pulgar). */
  giro?: number
  /** Movimiento de una seña de palabra. */
  mov?: MovSena
  /** Movimiento de una letra (J, Z, K…): el mismo trazo que la mano 3D. */
  movLetra?: Movimiento
  /** Desplazamiento extra (palmas) para juntar las manos o ponerlas una sobre otra. */
  ajuste?: V3
}

export interface PasoAvatar {
  derecha: ManoPaso
  izquierda: ManoPaso
  cara: Cara
}

/** Formas de mano de las señas de palabras (las mismas que reconoce la cámara). */
const FORMAS: Record<string, FormaMano> = {
  abierta: mano('EEEE', 'estirado'),
  puno: mano('DDDD', 'sobre'),
  indice: mano('EDDD', 'doblado'),
  indiceEstirado: mano('EDDD', 'doblado'),
  menique: mano('DDDE', 'doblado'),
  capullo: mano('CCCC', 'toca'),
  garra: mano('CCCC', 'curvo', { separados: true }),
  cuatro: mano('EEEE', 'doblado'),
  cualquiera: mano('EEEE', 'lado'),
}
const PUNO = FORMAS.puno
const REPOSO_MANO: ManoPaso = { forma: mano('CCCC', 'lado'), lugar: 'reposo', palma: 'lado', giro: 0 }

function formaDe(f: Forma, lengua: Lengua): FormaMano {
  if ('forma' in f) return FORMAS[f.forma] ?? FORMAS.abierta
  return alfabeto(lengua).find((l) => l.letra === f.letra)?.forma ?? FORMAS.abierta
}

/** La palma de una letra del alfabeto según su dibujo (de frente, de dorso o de lado). */
const palmaDeLetra = (f: FormaMano): Palma => (f.palma === 'dorso' ? 'dorso' : f.palma === 'lado' ? 'lado' : 'frente')

/** Ajustes de la palma y el giro para que cada lugar se vea natural (la mano se apoya en el cuerpo). */
function orientacionEnLugar(lugar: LugarAvatar): Pick<ManoPaso, 'palma' | 'giro'> {
  switch (lugar) {
    case 'pecho':
    case 'estomago':
      return { palma: 'cuerpo', giro: -70 } // la palma sobre el cuerpo, dedos hacia el otro lado
    case 'barbilla':
    case 'boca':
    case 'cuello':
      return { palma: 'cuerpo', giro: -20 }
    case 'mejilla':
    case 'cabeza':
      return { palma: 'lado', giro: 0 }
    case 'frente':
      return { palma: 'cuerpo', giro: -60 }
    default:
      return { palma: 'lado', giro: 0 }
  }
}

/** Cómo se pone la otra mano según la relación con la principal (en lugar y ajuste). */
function otraMano(relacion: Relacion, forma: FormaMano, lugar: LugarAvatar): ManoPaso {
  switch (relacion) {
    case 'juntas':
      // Palma con palma al centro (se acerca hacia la otra mano).
      return { forma, lugar, palma: 'lado', giro: 0, ajuste: v3(0.72, 0, 0) }
    case 'yemas-unidas':
      // Las puntas de los dedos se tocan formando un techo.
      return { forma, lugar, palma: 'lado', giro: -32, ajuste: v3(0.5, 0, 0) }
    case 'sobre-palma':
      // La otra mano, abierta con la palma hacia arriba, abajo de la principal.
      return { forma, lugar: 'neutro', palma: 'arriba', giro: 0, ajuste: v3(-0.9, -1.0, 0.1) }
    case 'lado-a-lado':
      return { forma, lugar, palma: 'lado', giro: 0 }
    case 'puntas-cerca':
      return { forma, lugar, palma: 'lado', giro: 0, ajuste: v3(0.45, 0, 0) }
  }
}

/** Lo que hace el avatar en una parte de la seña de una palabra. */
export function pasoDePalabra(entrada: Palabra, parte: number, lengua: Lengua): PasoAvatar {
  const sena = SENAS[entrada.id]?.[parte]
  if (!sena) {
    // Sin descripción: la forma de su primera letra frente al cuerpo, con un movimiento suave.
    const letra = alfabeto(lengua).find((l) => l.letra === (entrada.letras[parte] ?? entrada.letras[0]))
    const forma = letra?.forma ?? FORMAS.abierta
    return { derecha: { forma, lugar: 'neutro', palma: palmaDeLetra(forma), mov: 'cualquiera' }, izquierda: REPOSO_MANO, cara: 'neutra' }
  }
  const forma = formaDe(sena.forma, lengua)
  const lugar: LugarAvatar = sena.lugar?.[0] ?? 'neutro'
  const derecha: ManoPaso = { forma, lugar, ...orientacionEnLugar(lugar), mov: sena.movimiento }
  if (lugar === 'neutro' && !('forma' in sena.forma)) {
    // Una letra frente al cuerpo: como en el alfabeto.
    derecha.palma = palmaDeLetra(forma)
    derecha.giro = 0
  }
  let izquierda = REPOSO_MANO
  if (sena.otra) {
    izquierda = { ...otraMano(sena.otra.relacion, formaDe(sena.otra.forma, lengua), lugar), mov: sena.movimiento }
    if (sena.otra.relacion === 'juntas' || sena.otra.relacion === 'yemas-unidas' || sena.otra.relacion === 'lado-a-lado' || sena.otra.relacion === 'puntas-cerca') {
      // Las dos manos se juntan al frente: la derecha igual que la otra (de lado, acercándose al centro).
      derecha.palma = 'lado'
      derecha.giro = izquierda.giro
      derecha.ajuste = izquierda.ajuste
    }
  }
  const cara: Cara = /bien|gusto|amigo|buen/i.test(entrada.palabra) ? 'sonrisa' : /mal|dolor|urgente|sangre|cuidado|emergencia/i.test(entrada.palabra) ? 'seria' : 'neutra'
  return { derecha, izquierda, cara }
}

/** El paso del avatar para una seña de la secuencia (letra, palabra, pausa…). */
export function pasoDeSena(sena: Sena | undefined, lengua: Lengua): PasoAvatar {
  if (!sena || sena.tipo === 'pausa' || sena.tipo === 'sin-sena') return { derecha: REPOSO_MANO, izquierda: REPOSO_MANO, cara: 'neutra' }
  if (sena.tipo === 'palabra') return pasoDePalabra(sena.entrada, sena.parte, lengua)
  const forma = sena.letra.forma
  return { derecha: { forma, lugar: 'letra', palma: palmaDeLetra(forma), movLetra: forma.movimiento }, izquierda: REPOSO_MANO, cara: 'neutra' }
}

// ── 4. Cinemática inversa (dos huesos) ───────────────────────────────────
/**
 * Dónde queda el codo para que la muñeca llegue a `objetivo` desde el hombro, con un brazo de largo `a`
 * y un antebrazo de largo `b`. El codo se dobla hacia `polo` (abajo, atrás y hacia afuera).
 * Si el objetivo está demasiado lejos, el brazo se estira hacia él (la muñeca queda lo más cerca posible).
 */
export function codoPorIK(hombroP: V3, objetivo: V3, a: number, b: number, polo: V3): { codo: V3; muneca: V3 } {
  const haciaObjetivo = resta(objetivo, hombroP)
  const d = Math.min(Math.max(largo(haciaObjetivo), Math.abs(a - b) + 1e-3), a + b - 1e-3)
  const u = unitario(haciaObjetivo)
  // Dirección del codo: el polo sin su parte a lo largo del brazo.
  let n = resta(polo, por(u, punto(polo, u)))
  if (largo(n) < 1e-6) n = v3(0, -1, 0)
  n = unitario(n)
  const cos = (a * a + d * d - b * b) / (2 * a * d)
  const sen = Math.sqrt(Math.max(0, 1 - cos * cos))
  const codo = suma(hombroP, suma(por(u, a * cos), por(n, a * sen)))
  const muneca = suma(hombroP, por(u, d))
  return { codo, muneca }
}

// ── 5. La mano en cada instante ──────────────────────────────────────────
/** Giro de la mano para cada palma (para la mano derecha; ejes de mano3d: x pulgar, y dedos, z palma). */
function giroDePalma(palma: Palma, giro: number, forma: FormaMano): Giro {
  switch (palma) {
    case 'frente':
      return { x: -8, y: 8, z: giroDeForma(forma).z + giro }
    case 'dorso':
      return { x: -8, y: 180, z: giroDeForma(forma).z + giro }
    case 'lado':
      return { x: -5, y: 80, z: giroDeForma(forma).z + giro }
    case 'cuerpo':
      return { x: 0, y: 180, z: giro }
    case 'abajo':
      return { x: 90, y: 0, z: giro }
    case 'arriba':
      return { x: -90, y: 180, z: giro }
  }
}

/** Centro de la mano en sus propias coordenadas (entre la muñeca y los nudillos). */
const CENTRO_MANO = v3(0.02, 0.55, 0.05)

/** Movimiento de una seña de palabra en el instante t (0 a 1): cuánto se desplaza la mano (palmas). */
export function desplazamientoSena(mov: MovSena | undefined, t: number, lado: Lado): V3 {
  const ida = 1 - Math.pow(1 - Math.min(1, t * 1.25), 3) // llega y se queda
  const onda = (veces: number) => Math.sin(t * Math.PI * 2 * veces)
  switch (mov) {
    case 'al-frente':
      return v3(0, 0.15 * ida, 1.7 * ida)
    case 'adelante-atras':
      return v3(0, 0, 0.9 * Math.sin(t * Math.PI * 2) * 0.8)
    case 'abajo':
      return v3(0, -1.9 * ida, 0.2 * ida)
    case 'arriba':
      return v3(0, 1.7 * ida, 0)
    case 'lado':
      return v3(lado * 1.9 * ida, -0.2 * Math.sin(ida * Math.PI), 0.3 * ida)
    case 'lado-a-lado':
      return v3(0.85 * onda(1.5), 0, 0)
    case 'arriba-abajo':
      return v3(0, 0.55 * onda(2), 0)
    case 'golpecitos':
      return v3(0, 0, 0.4 * Math.abs(Math.sin(t * Math.PI * 2)))
    case 'circulo':
      return v3(0.75 * Math.cos(t * Math.PI * 2) - 0.75, 0.75 * Math.sin(t * Math.PI * 2), 0)
    case 'cualquiera':
      return v3(0.4 * onda(1), 0.2 * onda(2), 0)
    default:
      return v3(0, 0, 0)
  }
}

/** La pose de los dedos en el instante t, con los movimientos que cambian la mano (cerrar, encoger…). */
export function poseEn(paso: ManoPaso, t: number): Pose {
  const base = paso.lugar === 'reposo' ? POSE_REPOSO : poseDeForma(paso.forma)
  switch (paso.mov) {
    case 'cerrar':
      return mezclarPoses(base, poseDeForma(PUNO), Math.min(1, Math.max(0, (t - 0.25) * 2)))
    case 'abrir-cerrar':
      return mezclarPoses(base, poseDeForma(PUNO), (1 - Math.cos(t * Math.PI * 4)) / 2)
    case 'indice-encoge':
    case 'menique-encoge': {
      const dedo = paso.mov === 'indice-encoge' ? 'indice' : 'menique'
      const k = (1 - Math.cos(t * Math.PI * 4)) / 2
      const p = structuredClone(base)
      p.dedos[dedo] = { ...p.dedos[dedo], mcp: p.dedos[dedo].mcp + 60 * k, pip: p.dedos[dedo].pip + 70 * k }
      return p
    }
    default:
      return base
  }
}

export interface ManoColocada {
  /** Los 21 puntos de la mano en el mundo (orden de MediaPipe). */
  puntos: V3[]
  /** Dónde debe quedar la muñeca. */
  muneca: V3
}

/**
 * Coloca la mano de un paso en el mundo en el instante t: la pose de los dedos, girada según la palma,
 * reflejada si es la izquierda, y movida a su lugar con su movimiento.
 */
export function colocarMano(paso: ManoPaso, lado: Lado, t: number, pose?: Pose): ManoColocada {
  const p = pose ?? poseEn(paso, t)
  let giro = giroDePalma(paso.palma, paso.giro ?? 0, paso.forma)
  let mover = desplazamientoSena(paso.mov, t, lado)
  if (paso.movLetra) {
    const m = movimientoEn(paso.movLetra, t)
    giro = { x: giro.x + m.giro.x, y: giro.y + m.giro.y, z: giro.z + m.giro.z }
    mover = suma(mover, m.mover)
  }
  // En reposo, los dedos apuntan hacia abajo junto a la pierna.
  if (paso.lugar === 'reposo') giro = { x: 10, y: 90, z: 180 }
  const local = esqueleto(p).map((q) => rotar(q, giro))
  const centro = rotar(CENTRO_MANO, giro)
  const reflejar = (q: V3) => (lado === 1 ? v3(-q.x, q.y, q.z) : q)
  const destino = suma(suma(lugarDe(paso.lugar, lado), reflejar(paso.ajuste ?? v3(0, 0, 0))), mover)
  const puntos = local.map((q) => suma(destino, reflejar(resta(q, centro))))
  return { puntos, muneca: puntos[0] }
}

/** El polo del codo para cada lado: hacia abajo, un poco atrás y hacia afuera. */
export const poloCodo = (lado: Lado): V3 => v3(lado * 0.8, -1, -0.6)
