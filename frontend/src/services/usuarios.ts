import { api } from '../lib/api'
import type { EstadoUsuario, Lengua, Pagina, Rol, Usuario } from '../lib/tipos'

export interface DatosUsuario {
  nombre: string
  correo: string
  contrasena?: string
  lengua: Lengua
  rol: Rol
  estado: EstadoUsuario
}

export function listarUsuarios(params: { buscar: string; pagina: number; porPagina: number }) {
  const consulta = new URLSearchParams({
    buscar: params.buscar,
    pagina: String(params.pagina),
    por_pagina: String(params.porPagina),
  })
  return api<Pagina<Usuario>>(`/usuarios?${consulta}`)
}

export function obtenerUsuario(id: string) {
  return api<Usuario>(`/usuarios/${id}`)
}

export function crearUsuario(datos: DatosUsuario) {
  return api<Usuario>('/usuarios', { metodo: 'POST', cuerpo: datos })
}

export function actualizarUsuario(id: string, datos: Partial<DatosUsuario>) {
  return api<Usuario>(`/usuarios/${id}`, { metodo: 'PUT', cuerpo: datos })
}

export function eliminarUsuario(id: string) {
  return api<void>(`/usuarios/${id}`, { metodo: 'DELETE' })
}
