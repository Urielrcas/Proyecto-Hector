/**
 * ENTRENADOR EN SEGUNDO PLANO (Web Worker)
 * Entrenar la red tarda varios segundos; si se hiciera en la página, la pantalla se congelaría.
 * Un «worker» es un hilo aparte del navegador: recibe los datos, entrena y avisa su avance.
 *
 *   Recibe:  { lengua, muestras, pesos?, epocas, porClase }
 *   Envía:   { tipo: 'progreso', progreso }  después de cada época
 *            { tipo: 'fin', red }             con los pesos entrenados
 *            { tipo: 'error', mensaje }
 */
import { alfabeto } from '../../aprendizaje/alfabeto'
import type { Lengua } from '../../tipos'
import type { RedGuardada } from '../modeloIA'
import { clasesDe, datosDelUsuario, datosSinteticos, entrenar, unir } from './datos'
import { ARQUITECTURA_BASE, generadorAzar, RedConvolucional } from './red'

export interface PedidoEntrenamiento {
  lengua: Lengua
  muestras: Record<string, number[][]>
  /** Pesos para continuar el entrenamiento (afinar); si no hay, empieza de cero. */
  pesos?: string
  epocas: number
  porClase: number
}

/** Enviar un mensaje a la página (en un worker, «self» es el propio worker). */
const enviar = (mensaje: unknown) => (self as unknown as { postMessage: (m: unknown) => void }).postMessage(mensaje)

self.onmessage = (evento: MessageEvent<PedidoEntrenamiento>) => {
  try {
    const { lengua, muestras, pesos, epocas, porClase } = evento.data
    const letras = alfabeto(lengua)
    const clases = clasesDe(letras)
    const azar = generadorAzar(Date.now() % 100000)
    const red = new RedConvolucional({ ...ARQUITECTURA_BASE, clases: clases.length }, 7)
    if (pesos) red.importar(pesos) // si no corresponden (cambió el alfabeto), empieza de cero

    // Una de cada 5 muestras reales se aparta para medir la precisión con datos que la red no vio.
    const paraEntrenar: Record<string, number[][]> = {}
    const paraValidar: Record<string, number[][]> = {}
    for (const [letra, lista] of Object.entries(muestras)) {
      paraEntrenar[letra] = lista.filter((_, i) => i % 5 !== 4)
      paraValidar[letra] = lista.filter((_, i) => i % 5 === 4)
    }
    const datos = unir(datosSinteticos(letras, clases, porClase, azar), datosDelUsuario(paraEntrenar, clases, azar))
    const validacion = unir(datosSinteticos(letras, clases, 5, azar), datosDelUsuario(paraValidar, clases, azar, 1, 1))

    const historia = entrenar(red, datos, validacion, {
      epocas,
      azar,
      tasa: pesos ? 0.001 : 0.002, // al afinar, pasos más finos para no olvidar lo aprendido
      alProgreso: (progreso) => enviar({ tipo: 'progreso', progreso }),
    })
    const resultado: RedGuardada = {
      pesos: red.exportar(),
      clases: clases.map((c) => c.nombre),
      precision: historia.at(-1)?.validacion ?? 0,
      historia,
      entrenadaEn: Date.now(),
      muestrasUsadas: Object.values(muestras).reduce((t, l) => t + l.length, 0),
      parametros: red.totalParametros,
    }
    enviar({ tipo: 'fin', red: resultado })
  } catch (e) {
    enviar({ tipo: 'error', mensaje: e instanceof Error ? e.message : 'Error al entrenar.' })
  }
}
