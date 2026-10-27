/**
 * NIVELES E INSIGNIAS DE LOS JUEGOS
 * Se calcula a partir del registro de partidas y de la experiencia acumulada:
 *   - Experiencia (XP) = la suma de los puntos de todas las partidas que se han jugado.
 *   - Nivel: cada nivel pide un poco más de XP que el anterior (100, 250, 450, 700…).
 *   - Insignias: metas como «Racha de 5» o «Partida perfecta». Cada una es una condición
 *     sobre las partidas; si alguna partida la cumple, la insignia queda desbloqueada.
 */
// ▸ Desde Lucide (librería de íconos):
import { Brain, CalendarCheck, Crown, Flame, Gem, Rocket, Sparkles, SpellCheck, Star, Target, Trophy, Zap, type LucideIcon } from 'lucide-react'
// ▸ Desde nuestro proyecto: src/lib/juegos/juegos.ts:
//     Partida → tipo: resultado de una partida
import type { Partida } from './juegos'

/* ── Niveles ── */

const NOMBRES_NIVEL = ['Principiante', 'Aprendiz', 'Explorador', 'Deletreador', 'Conversador', 'Intérprete', 'Experto', 'Maestro de señas']

/** XP total necesaria para llegar al nivel n (nivel 1 = 0). Ej.: nivel 2 = 100, nivel 3 = 250, nivel 4 = 450. */
export function xpParaNivel(n: number): number {
  // Cada nivel pide 50 XP más que el anterior: 100, 150, 200, 250…
  return n <= 1 ? 0 : 25 * (n - 1) * (n + 2)
}

export interface Nivel {
  nivel: number
  nombre: string
  xp: number
  /** XP con la que empezó este nivel y la que pide el siguiente. */
  desde: number
  hasta: number
  /** Avance dentro del nivel (0 a 1). */
  progreso: number
}

export function nivelDe(xp: number): Nivel {
  let nivel = 1
  while (xp >= xpParaNivel(nivel + 1)) nivel++
  const desde = xpParaNivel(nivel)
  const hasta = xpParaNivel(nivel + 1)
  return {
    nivel,
    nombre: NOMBRES_NIVEL[Math.min(nivel, NOMBRES_NIVEL.length) - 1],
    xp,
    desde,
    hasta,
    progreso: (xp - desde) / (hasta - desde),
  }
}

export const xpTotal = (partidas: Partida[]) => partidas.reduce((t, p) => t + p.puntos, 0)

/* ── Insignias ── */

export interface Logro {
  id: string
  titulo: string
  descripcion: string
  icono: LucideIcon
  /** ¿Se cumple con estas partidas y esta experiencia acumulada? */
  cumple: (partidas: Partida[], xp: number) => boolean
}

const perfecta = (p: Partida) => p.total > 0 && p.aciertos === p.total
const diasDistintos = (partidas: Partida[]) => new Set(partidas.map((p) => new Date(p.fecha).toDateString())).size

export const LOGROS: Logro[] = [
  { id: 'primera', titulo: 'Primer paso', descripcion: 'Juega tu primera partida.', icono: Rocket, cumple: (ps) => ps.length > 0 },
  { id: 'racha3', titulo: 'En llamas', descripcion: 'Logra 3 aciertos seguidos.', icono: Flame, cumple: (ps) => ps.some((p) => (p.racha ?? 0) >= 3) },
  { id: 'racha5', titulo: 'Imparable', descripcion: 'Logra 5 aciertos seguidos.', icono: Zap, cumple: (ps) => ps.some((p) => (p.racha ?? 0) >= 5) },
  { id: 'perfecta', titulo: 'Partida perfecta', descripcion: 'Acierta todo en una partida.', icono: Target, cumple: (ps) => ps.some(perfecta) },
  {
    id: 'sinpistas',
    titulo: 'Sin ayuda',
    descripcion: 'Termina un reto con cámara sin fallar ni pedir pistas.',
    icono: Gem,
    cumple: (ps) => ps.some((p) => (p.juego === 'reto' || p.juego === 'palabra') && perfecta(p) && (p.pistas ?? 1) === 0),
  },
  {
    id: 'palabras',
    titulo: 'Deletreador',
    descripcion: 'Deletrea las 3 palabras sin fallar una letra.',
    icono: SpellCheck,
    cumple: (ps) => ps.some((p) => p.juego === 'palabra' && perfecta(p)),
  },
  {
    id: 'memoria',
    titulo: 'Memoria de elefante',
    descripcion: 'Gana el memorama con 3 estrellas.',
    icono: Brain,
    cumple: (ps) => ps.some((p) => p.juego === 'memorama' && (p.estrellas ?? 0) >= 3),
  },
  {
    id: 'todos',
    titulo: 'Explorador',
    descripcion: 'Juega los 4 juegos.',
    icono: Sparkles,
    cumple: (ps) => new Set(ps.map((p) => p.juego)).size >= 4,
  },
  { id: 'constante', titulo: 'Constante', descripcion: 'Juega en 3 días distintos.', icono: CalendarCheck, cumple: (ps) => diasDistintos(ps) >= 3 },
  { id: 'estrella', titulo: 'Estrella', descripcion: 'Consigue 3 estrellas en 5 partidas.', icono: Star, cumple: (ps) => ps.filter((p) => (p.estrellas ?? 0) >= 3).length >= 5 },
  { id: 'nivel5', titulo: 'Conversador', descripcion: 'Llega al nivel 5.', icono: Trophy, cumple: (_, xp) => nivelDe(xp).nivel >= 5 },
  { id: 'nivel8', titulo: 'Maestro de señas', descripcion: 'Llega al nivel 8.', icono: Crown, cumple: (_, xp) => nivelDe(xp).nivel >= 8 },
]

/** Insignias desbloqueadas: las que ya estaban guardadas y las que se cumplen ahora. */
export function logrosDesbloqueados(partidas: Partida[], xp: number, guardados: string[] = []): Logro[] {
  return LOGROS.filter((l) => guardados.includes(l.id) || l.cumple(partidas, xp))
}

/** Insignias que se ganaron con la última partida (no estaban antes). */
export function logrosNuevos(antes: Logro[], despues: Logro[]): Logro[] {
  const tenia = new Set(antes.map((l) => l.id))
  return despues.filter((l) => !tenia.has(l.id))
}
