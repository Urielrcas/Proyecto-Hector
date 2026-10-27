/*
 * CONFIGURACIÓN DE LA APLICACIÓN (preferencias de este dispositivo)
 * Guarda en el navegador las preferencias de la pantalla «Configuración»:
 * voz, velocidad de las señas, tamaño de letra, alto contraste, movimiento e historial.
 *
 * Funciona como un pequeño "almacén": cualquier archivo puede leerla (leerConfiguracion),
 * cambiarla (cambiarConfiguracion) o enterarse cuando cambia (suscribirse). Las pantallas
 * usan el hook useConfiguracion() para redibujarse solas al cambiar algo.
 */
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from './almacenamiento'

export type TamanoTexto = 'normal' | 'grande' | 'muy-grande'

export interface Configuracion {
  /** Velocidad de la voz (0.5 lenta – 1.5 rápida). */
  vozVelocidad: number
  /** Volumen de la voz (0 – 1). */
  vozVolumen: number
  /** Nombre de la voz del navegador ('' = la que elija el navegador). */
  vozNombre: string
  /** Velocidad con la que se muestran las señas (0.5× – 2×). */
  senasVelocidad: number
  tamanoTexto: TamanoTexto
  altoContraste: boolean
  reducirMovimiento: boolean
  /** Guardar automáticamente las traducciones y conversaciones en el Historial. */
  guardarHistorial: boolean
  /** Sonidos de los juegos (aciertos, errores, cuenta regresiva…). */
  sonidosJuegos: boolean
  /** IA: la red neuronal convolucional ayuda a reconocer las letras en los traductores. */
  usarRedNeuronal: boolean
  /** IA: corregir solas las palabras mal deletreadas. */
  autocorreccion: boolean
}

export const CONFIGURACION_INICIAL: Configuracion = {
  vozVelocidad: 0.95,
  vozVolumen: 1,
  vozNombre: '',
  senasVelocidad: 1,
  tamanoTexto: 'normal',
  altoContraste: false,
  reducirMovimiento: false,
  guardarHistorial: true,
  sonidosJuegos: true,
  usarRedNeuronal: true,
  autocorreccion: true,
}

/** Tamaño de la letra de toda la app (Tailwind mide todo en rem, así que todo crece parejo). */
export const ESCALA_TEXTO: Record<TamanoTexto, { nombre: string; porcentaje: number }> = {
  normal: { nombre: 'Normal', porcentaje: 100 },
  grande: { nombre: 'Grande', porcentaje: 115 },
  'muy-grande': { nombre: 'Muy grande', porcentaje: 130 },
}

/** Velocidades posibles para mostrar las señas (las mismas del control del reproductor). */
export const VELOCIDADES_SENAS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const CLAVE = 'configuracion'

// Se mezcla con los valores iniciales por si se agregan opciones nuevas en otra versión.
let actual: Configuracion = { ...CONFIGURACION_INICIAL, ...leer<Partial<Configuracion>>(CLAVE, {}) }
const oyentes = new Set<() => void>()

export function leerConfiguracion(): Configuracion {
  return actual
}

export function cambiarConfiguracion(cambios: Partial<Configuracion>) {
  actual = { ...actual, ...cambios }
  guardar(CLAVE, actual)
  for (const avisar of oyentes) avisar()
}

export function restablecerConfiguracion() {
  cambiarConfiguracion(CONFIGURACION_INICIAL)
}

/** Avisa cada vez que cambia la configuración. Devuelve la función para dejar de escuchar. */
export function suscribirse(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}
