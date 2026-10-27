/*
 * SERVICIO DE AUTENTICACIÓN
 * Funciones que llaman al backend (backend/app/rutas/auth.py):
 * iniciar sesión, registrarse, obtener el usuario actual y solicitar recuperación de contraseña.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
import { api } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
//     Sesion → tipo: token + usuario
//     Usuario → tipo: datos de un usuario
import type { Lengua, Sesion, Usuario } from '../lib/tipos'

// POST /api/auth/login → si los datos son correctos, devuelve { token, usuario }.
// Si no, lanza un ErrorApi (401 contraseña incorrecta, 403 cuenta desactivada).
export function iniciarSesion(correo: string, contrasena: string) {
  return api<Sesion>('/auth/login', { metodo: 'POST', cuerpo: { correo: correo.trim(), contrasena } })
}

// POST /api/auth/registro → crea la cuenta (rol "usuario") y devuelve { token, usuario } (ya queda la sesión iniciada).
// Si el correo ya existe, lanza un ErrorApi con código 409.
export function registrar(datos: { nombre: string; correo: string; contrasena: string; lengua: Lengua }) {
  return api<Sesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: { nombre: datos.nombre.trim(), correo: datos.correo.trim(), contrasena: datos.contrasena, lengua: datos.lengua },
  })
}

// GET /api/auth/yo → datos actualizados del usuario de la sesión (se usa al abrir la app en AppContext).
export function obtenerUsuarioActual() {
  return api<Usuario>('/auth/yo')
}

// POST /api/auth/recuperar → solicita recuperar la contraseña (el envío del correo está pendiente en el servidor).
/** El usuario cambia su nombre, su lengua o su contraseña (pantalla Configuración; regla n → k en el backend). */
export function actualizarPerfil(datos: { nombre?: string; lengua?: Lengua; contrasena_actual?: string; contrasena_nueva?: string }) {
  return api<Usuario>('/auth/yo', { metodo: 'PUT', cuerpo: datos })
}

export async function solicitarRecuperacion(correo: string) {
  await api('/auth/recuperar', { metodo: 'POST', cuerpo: { correo: correo.trim() } })
}
