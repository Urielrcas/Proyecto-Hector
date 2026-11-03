/*
 * VIBRACIÓN (respuesta al tacto en el celular)
 * Hace vibrar el teléfono un instante al acertar una letra o al lograr algo.
 * En computadora (o si el navegador no lo permite) simplemente no hace nada.
 * Respeta «Reducir movimiento» de Configuración.
 */
import { leerConfiguracion } from './configuracion'

const PATRONES = {
  toque: 12, // un golpecito: al tocar un botón importante
  acierto: 30, // al reconocer una letra
  logro: [40, 60, 40], // dos pulsos: al completar un nivel
} as const

export function vibrar(tipo: keyof typeof PATRONES = 'toque') {
  if (leerConfiguracion().reducirMovimiento) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(PATRONES[tipo] as number | number[])
  } catch {
    // Algunos navegadores bloquean la vibración sin un toque previo: se ignora.
  }
}
