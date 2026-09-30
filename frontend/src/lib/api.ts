import { leer } from './almacenamiento'
import type { Sesion } from './tipos'

/** Error devuelto por el backend, con el mensaje listo para mostrar. */
export class ErrorApi extends Error {
  readonly estado: number
  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.estado = estado
  }
}

// Se registra desde el contexto para cerrar la sesión si el token expira.
let alExpirarSesion: () => void = () => {}
export function registrarAlExpirarSesion(fn: () => void) {
  alExpirarSesion = fn
}

function mensajeDeError(estado: number, cuerpo: unknown): string {
  const detalle = (cuerpo as { detail?: unknown } | null)?.detail
  if (typeof detalle === 'string') return detalle
  if (estado === 422) return 'Algunos datos no son válidos. Revisa el formulario.'
  if (estado >= 500) return 'Ocurrió un error en el servidor. Inténtalo más tarde.'
  return 'No se pudo completar la solicitud.'
}

/** Llama a la API del backend (Vite redirige /api a FastAPI en desarrollo). */
export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const token = leer<Sesion | null>('sesion', null)?.token
  let respuesta: Response
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        ...(opciones.cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Verifica que el backend esté encendido.')
  }

  if (respuesta.status === 204) return undefined as T
  const cuerpo = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) alExpirarSesion()
    throw new ErrorApi(respuesta.status, mensajeDeError(respuesta.status, cuerpo))
  }
  return cuerpo as T
}
