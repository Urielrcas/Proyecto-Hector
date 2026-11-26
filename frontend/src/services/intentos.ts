/*
 * SERVICIO DE INTENTOS, EXPEDIENTE Y TABLERO (backend/app/rutas/intentos.py)
 *   - registrarIntento: guarda cada intento de «Practicar letra» (también los fallidos).
 *   - obtenerExpediente: el expediente de aprendizaje con los consejos de la IA (prácticas 18 y 19)
 *     y la predicción del siguiente intento (prácticas 26 y 27). Con usuarioId lo pide un administrador.
 *   - obtenerTablero: las consultas del tablero del administrador (práctica 16).
 */

import { api } from '../lib/api'
import type { Lengua } from '../lib/tipos'

export type Dedo = 'pulgar' | 'indice' | 'medio' | 'anular' | 'menique'

export const NOMBRE_DEDO_CORTO: Record<Dedo, string> = { pulgar: 'Pulgar', indice: 'Índice', medio: 'Medio', anular: 'Anular', menique: 'Meñique' }

export interface IntentoNuevo {
  lengua: Lengua
  letra: string
  acierto: boolean
  /** Qué tanto de la seña estuvo bien en su mejor momento: dedos correctos × 20 (0 a 100). */
  puntaje: number
  segundos: number
  /** Si falló: con qué letra la confundió la IA (solo LSM). */
  letra_detectada: string | null
  dedos_fallados: Dedo[]
}

export type EstadoLetra = 'dominada' | 'en progreso' | 'difícil' | 'sin practicar'

export interface LetraExpediente {
  letra: string
  intentos: number
  aciertos: number
  tasa: number
  puntaje_promedio: number
  ultimo_puntaje: number
  lograda: boolean
  estado: EstadoLetra
  tendencia: 'mejorando' | 'estable' | 'bajando'
  confundida_con: { letra: string; veces: number }[]
  dedo_mas_fallado: Dedo | null
  /** Intentos sin lograrla. */
  fallidos: number
  /** En qué parte de los intentos fallidos falló cada dedo (porcentaje de 0 a 1), del que más al que menos. */
  dedos_fallados: { dedo: Dedo; veces: number; porcentaje: number }[]
  ultima_vez: string | null
  prediccion: { puntaje: number; mensaje: string } | null
}

export interface Recomendacion {
  tipo: 'dificil' | 'confusion' | 'grupo' | 'repaso' | 'mejorando' | 'siguiente' | 'inactividad' | 'inicio'
  prioridad: number
  letra: string | null
  mensaje: string
}

export interface Expediente {
  usuario_id: string
  nombre: string
  lengua: Lengua
  resumen: {
    intentos: number
    aciertos: number
    tasa: number
    puntaje_promedio: number
    letras_practicadas: number
    letras_logradas: number
    total_letras: number
    dias_practicados: number
    ultima_practica: string | null
  }
  letras: LetraExpediente[]
  recomendaciones: Recomendacion[]
  siguiente: string | null
  /** Tu perfil de aprendizaje (cluster, práctica 28); null si todavía tienes pocos intentos. */
  perfil: PerfilAprendizaje | null
  /** Personas que aprenden como tú (KNN, práctica 29); null si todavía no hay con quién compararte. */
  vecinos: Vecinos | null
}

export interface PerfilAprendizaje {
  id: number
  nombre: string
  descripcion: string
  consejo: string
  /** Tu lugar en el mapa PCA de perfiles. */
  x: number
  y: number
  rasgos: Record<'tasa' | 'puntaje' | 'intentos_por_letra' | 'letras' | 'mejora' | 'segundos', number>
}

export interface Vecinos {
  k: number
  poblacion: number
  /** «simulada» mientras no haya suficientes usuarios reales. */
  origen: string
  /** Qué tanto se parecen a ti (0 a 100). */
  parecido: number
  faciles: { letra: string; nivel: number }[]
  dificiles: { letra: string; nivel: number }[]
  por_debajo: { letra: string; nivel: number; tuyo: number | null }[]
  por_letra: Record<string, { nivel_vecinos: number; vecinos_con_dato: number; les_costo: number }>
}

export interface Tablero {
  intentos: number
  aciertos: number
  tasa: number
  puntaje: number
  personas: number
  necesitan_ayuda: number
  letras: { letra: string; intentos: number; aciertos: number; tasa: number; puntaje: number; personas: number }[]
  confusiones: { letra: string; confundida_con: string; veces: number }[]
  personas_detalle: {
    usuario_id: string
    nombre: string
    correo: string
    intentos: number
    aciertos: number
    tasa: number
    puntaje: number
    letras: number
    ultima_vez: string | null
    necesita_ayuda: boolean
  }[]
  grupos: { grupo: string; letras: string[]; intentos: number; tasa: number }[]
  por_dia: { fecha: string; intentos: number; aciertos: number }[]
  dedos: { dedo: Dedo; veces: number }[]
  /** Cuántas personas hay en cada nivel de cada letra (promedio de sus últimos 5 intentos). */
  dominio: DominioLetra[]
}

/** Personas por nivel en una letra: rangos = [0–20, 20–40, 40–60, 60–80, 80–100 %]. */
export interface DominioLetra {
  letra: string
  personas: number
  rangos: number[]
  promedio: number
}

/** Con qué letra se confunde cada una y cuántas personas distintas la confundieron así. */
export interface ConfusionesPersonas {
  personas: number
  /** Letra → personas que la practicaron. */
  practicaron: Record<string, number>
  pares: { letra: string; con: string; veces: number; personas: number }[]
}

export async function registrarIntento(intento: IntentoNuevo): Promise<void> {
  await api('/intentos', { metodo: 'POST', cuerpo: intento })
}

export async function obtenerExpediente(lengua: Lengua, usuarioId?: string): Promise<Expediente> {
  const ruta = usuarioId ? `/intentos/expediente/${usuarioId}` : '/intentos/expediente'
  return api<Expediente>(`${ruta}?lengua=${lengua}`)
}

export async function obtenerTablero(lengua: Lengua, desde?: string, hasta?: string): Promise<Tablero> {
  const params = new URLSearchParams({ lengua })
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  return api<Tablero>(`/intentos/tablero?${params}`)
}

export async function obtenerConfusiones(lengua: Lengua): Promise<ConfusionesPersonas> {
  return api<ConfusionesPersonas>(`/intentos/confusiones?lengua=${lengua}`)
}
