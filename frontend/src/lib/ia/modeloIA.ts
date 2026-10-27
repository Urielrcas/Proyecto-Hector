/**
 * EL MODELO DE IA DE CADA USUARIO (lo que la IA ha aprendido de él), por lengua:
 *   - dominio:   qué tanto domina cada letra (modelo del estudiante, dominio.ts).
 *   - muestras:  ejemplos REALES de su mano por letra (21 puntos comprimidos), máx. 25 por letra.
 *   - personales: SU forma de hacer ciertas letras, que pidió recordar (memoria.ts), máx. 30 por letra.
 *   - red:       los pesos de su red convolucional entrenada, con su precisión y su curva de aprendizaje.
 *   - corrector: palabras que usa y cuántas correcciones aceptó o deshizo.
 *
 * Funciona como un almacén: se guarda en el navegador al instante y avisa a las pantallas
 * cuando cambia; con cuenta, además se sube al servidor unos segundos después (ver useModeloIA).
 */
// ▸ Desde nuestro proyecto:
import { guardar, leer } from '../almacenamiento'
import type { ProgresoEpoca } from './cnn/datos'
import type { Dominio } from './dominio'

export interface RedGuardada {
  pesos: string // base64
  clases: string[] // nombres de las clases («A», «I/J»…)
  precision: number // en datos que no vio al entrenar (0 a 1)
  historia: ProgresoEpoca[]
  entrenadaEn: number
  muestrasUsadas: number // muestras del usuario con las que se entrenó
  parametros: number
}

export interface ModeloIA {
  dominio: Dominio
  muestras: Record<string, number[][]>
  personales: Record<string, number[][]>
  red: RedGuardada | null
  corrector: { aplicadas: number; deshechas: number; palabras: Record<string, number> }
  actualizadoEn: number
}

export const MODELO_VACIO: ModeloIA = {
  dominio: {},
  muestras: {},
  personales: {},
  red: null,
  corrector: { aplicadas: 0, deshechas: 0, palabras: {} },
  actualizadoEn: 0,
}

/** Muestras que se guardan por letra (las más viejas se descartan). */
export const MAX_MUESTRAS_LETRA = 25
/** Muestras nuevas necesarias para que la red se reentrene sola. */
export const MUESTRAS_PARA_REENTRENAR = 15

export const totalMuestras = (m: ModeloIA) => Object.values(m.muestras).reduce((t, l) => t + l.length, 0)
export const muestrasNuevas = (m: ModeloIA) => Math.max(0, totalMuestras(m) - (m.red?.muestrasUsadas ?? 0))

/** Precisión del autocorrector: correcciones que el usuario NO deshizo. */
export function precisionCorrector(m: ModeloIA): number | null {
  const { aplicadas, deshechas } = m.corrector
  return aplicadas ? (aplicadas - deshechas) / aplicadas : null
}

/* ── Almacén (uno por usuario y lengua) ── */

const cache = new Map<string, ModeloIA>()
const oyentes = new Set<() => void>()
let alCambiar: ((clave: string, modelo: ModeloIA) => void) | null = null

/** Lo llama useModeloIA para subir los cambios al servidor. */
export function registrarSincronizador(fn: ((clave: string, modelo: ModeloIA) => void) | null) {
  alCambiar = fn
}

export function leerModelo(clave: string): ModeloIA {
  let m = cache.get(clave)
  if (!m) {
    m = { ...MODELO_VACIO, ...leer<Partial<ModeloIA>>(`ia.${clave}`, {}) }
    cache.set(clave, m)
  }
  return m
}

/** Cambia el modelo (función que recibe el anterior y devuelve el nuevo). */
export function cambiarModelo(clave: string, cambio: (m: ModeloIA) => ModeloIA, subir = true) {
  const nuevo = { ...cambio(leerModelo(clave)), actualizadoEn: Date.now() }
  cache.set(clave, nuevo)
  guardar(`ia.${clave}`, nuevo)
  for (const o of oyentes) o()
  if (subir) alCambiar?.(clave, nuevo)
}

/** Reemplaza el modelo con el del servidor (sin volver a subirlo). */
export function reemplazarModelo(clave: string, modelo: ModeloIA) {
  const completo = { ...MODELO_VACIO, ...modelo }
  cache.set(clave, completo)
  guardar(`ia.${clave}`, completo)
  for (const o of oyentes) o()
}

export function suscribirModelo(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

/** Agrega formas personales de una letra (quedan las 30 más recientes). */
export function conPersonales(m: ModeloIA, letra: string, nuevas: number[][], maximo = 30): ModeloIA {
  const lista = [...(m.personales?.[letra] ?? []), ...nuevas].slice(-maximo)
  return { ...m, personales: { ...m.personales, [letra]: lista } }
}

/** Agrega muestras de una letra sin pasar del máximo (quedan las más recientes). */
export function conMuestras(m: ModeloIA, letra: string, nuevas: number[][]): ModeloIA {
  const lista = [...(m.muestras[letra] ?? []), ...nuevas].slice(-MAX_MUESTRAS_LETRA)
  return { ...m, muestras: { ...m.muestras, [letra]: lista } }
}
