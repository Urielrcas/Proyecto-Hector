import { api } from '../lib/api'
import type { Lengua, Sesion, Usuario } from '../lib/tipos'

export function iniciarSesion(correo: string, contrasena: string) {
  return api<Sesion>('/auth/login', { metodo: 'POST', cuerpo: { correo: correo.trim(), contrasena } })
}

export function registrar(datos: { nombre: string; correo: string; contrasena: string; lengua: Lengua }) {
  return api<Sesion>('/auth/registro', {
    metodo: 'POST',
    cuerpo: { nombre: datos.nombre.trim(), correo: datos.correo.trim(), contrasena: datos.contrasena, lengua: datos.lengua },
  })
}

export function obtenerUsuarioActual() {
  return api<Usuario>('/auth/yo')
}

export async function solicitarRecuperacion(correo: string) {
  await api('/auth/recuperar', { metodo: 'POST', cuerpo: { correo: correo.trim() } })
}
