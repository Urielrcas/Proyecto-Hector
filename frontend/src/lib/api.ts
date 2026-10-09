/*
 * CLIENTE DE LA API (todas las peticiones al backend pasan por aquí)
 * api('/usuarios') hace la petición a /api/usuarios, agrega el token de sesión,
 * convierte la respuesta de JSON y, si hay error, lanza un ErrorApi con un mensaje
 * en español listo para mostrar. Si el servidor responde 401 (sesión vencida), cierra la sesión.
 */

// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     leer → lee un dato guardado en el navegador (localStorage)
import { leer } from './almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Sesion → tipo: token + usuario
import type { Sesion } from './tipos'

/** Error devuelto por el backend, con el mensaje listo para mostrar. */
// Ej.: new ErrorApi(409, 'Ya existe un usuario con ese correo.')
// Las pantallas lo atrapan con try/catch y muestran err.message; con err.estado saben qué pasó.
export class ErrorApi extends Error {
  readonly estado: number // código HTTP: 401 sin sesión, 403 sin permiso, 404 no existe, 409 duplicado, 0 sin conexión
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

// Elige el mensaje de error que verá el usuario.
function mensajeDeError(estado: number, cuerpo: unknown): string {
  // FastAPI manda los errores como { "detail": "mensaje" }; si viene un mensaje, se usa tal cual.
  const detalle = (cuerpo as { detail?: unknown } | null)?.detail
  if (typeof detalle === 'string') return detalle
  // Si no, un mensaje genérico según el código.
  if (estado === 422) return 'Algunos datos no son válidos. Revisa el formulario.'
  if (estado >= 500) return 'Ocurrió un error en el servidor. Inténtalo más tarde.'
  return 'No se pudo completar la solicitud.'
}

/** Llama a la API del backend (Vite redirige /api a FastAPI en desarrollo). */
// Ejemplo de uso:  await api<Usuario>('/usuarios', { metodo: 'POST', cuerpo: { nombre: 'Ana', ... } })
//   ruta    → parte final de la dirección ('/usuarios' → se pide a '/api/usuarios')
//   metodo  → 'GET' (consultar, por defecto), 'POST' (crear), 'PUT' (modificar), 'DELETE' (borrar)
//   cuerpo  → los datos a enviar (se convierten a JSON)
//   <T>     → el tipo de dato que se espera recibir
export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  // El token de la sesión guardada (si hay), para que el servidor sepa quién hace la petición.
  const token = leer<Sesion | null>('sesion', null)?.token
  let respuesta: Response
  try {
    // fetch() es la función del navegador para hacer peticiones por internet.
    respuesta = await fetch(`/api${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        // Si se envían datos, avisar que van en formato JSON.
        ...(opciones.cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        // Si hay sesión, mandar el token: "Authorization: Bearer <token>".
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    // fetch solo falla así cuando no se pudo conectar (backend apagado, sin internet).
    throw new ErrorApi(0, 'No hay conexión con el servidor. Verifica que el backend esté encendido.')
  }

  // 204 = "todo bien, sin contenido" (por ejemplo al eliminar): no hay nada que leer.
  if (respuesta.status === 204) return undefined as T
  // Convertir la respuesta de JSON a objeto (si falla, null).
  const cuerpo = await respuesta.json().catch(() => null)
  // respuesta.ok es true para los códigos 200-299 (éxito).
  if (!respuesta.ok) {
    // 401 con token = la sesión venció o es inválida → cerrar la sesión automáticamente.
    if (respuesta.status === 401 && token) alExpirarSesion()
    throw new ErrorApi(respuesta.status, mensajeDeError(respuesta.status, cuerpo))
  }
  return cuerpo as T
}
