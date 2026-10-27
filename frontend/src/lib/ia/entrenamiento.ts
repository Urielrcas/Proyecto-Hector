/**
 * CONTROL DEL ENTRENAMIENTO DE LA RED
 * Arranca el worker (entrenador.worker.ts), guarda su avance para mostrarlo en pantalla
 * (curva de aprendizaje en vivo) y, al terminar, guarda la red en el modelo del usuario.
 * Solo hay un entrenamiento a la vez.
 */
// ▸ Desde nuestro proyecto:
import type { Lengua } from '../tipos'
import type { PedidoEntrenamiento } from './cnn/entrenador.worker'
import type { ProgresoEpoca } from './cnn/datos'
import { cambiarModelo, leerModelo, type RedGuardada } from './modeloIA'

export interface EstadoEntrenamiento {
  clave: string
  epocas: number
  progreso: ProgresoEpoca[]
  /** true = afinando una red que ya existía con las muestras nuevas. */
  afinando: boolean
}

let actual: EstadoEntrenamiento | null = null
let ultimoError: string | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((o) => o())

export const estadoEntrenamiento = () => actual
export const errorEntrenamiento = () => ultimoError
export function suscribirEntrenamiento(o: () => void) {
  oyentes.add(o)
  return () => oyentes.delete(o)
}

/** Entrena (o afina) la red del usuario «clave». No hace nada si ya hay un entrenamiento. */
export function entrenarRed(clave: string, lengua: Lengua, opciones: { desdeCero?: boolean } = {}) {
  if (actual || typeof Worker === 'undefined') return
  const modelo = leerModelo(clave)
  const afinando = !!modelo.red && !opciones.desdeCero
  const pedido: PedidoEntrenamiento = {
    lengua,
    muestras: modelo.muestras,
    pesos: afinando ? modelo.red!.pesos : undefined,
    epocas: afinando ? 4 : 8,
    porClase: afinando ? 14 : 28,
  }
  actual = { clave, epocas: pedido.epocas, progreso: [], afinando }
  ultimoError = null
  avisar()

  const worker = new Worker(new URL('./cnn/entrenador.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<{ tipo: 'progreso'; progreso: ProgresoEpoca } | { tipo: 'fin'; red: RedGuardada } | { tipo: 'error'; mensaje: string }>) => {
    const m = e.data
    if (m.tipo === 'progreso' && actual) {
      actual = { ...actual, progreso: [...actual.progreso, m.progreso] }
      avisar()
      return
    }
    if (m.tipo === 'fin') cambiarModelo(clave, (mod) => ({ ...mod, red: m.red }))
    if (m.tipo === 'error') ultimoError = m.mensaje
    actual = null
    worker.terminate()
    avisar()
  }
  worker.onerror = () => {
    ultimoError = 'No se pudo entrenar la red en este navegador.'
    actual = null
    worker.terminate()
    avisar()
  }
  worker.postMessage(pedido)
}
