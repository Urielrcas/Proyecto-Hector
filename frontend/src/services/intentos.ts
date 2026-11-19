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
