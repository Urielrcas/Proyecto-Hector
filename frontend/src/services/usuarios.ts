/*
 * SERVICIO DE USUARIOS (CRUD)
 * Funciones que llaman al backend (backend/app/rutas/usuarios.py):
 * listar (con búsqueda y paginación), obtener, crear, actualizar y eliminar usuarios.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
import { api } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     EstadoUsuario → tipo: 'activo' o 'inactivo'
//     Lengua → tipo: 'LSM' o 'ASL'
//     Pagina → tipo: resultado paginado (items, total, página)
//     Rol → tipo: 'admin' o 'usuario'
//     Usuario → tipo: datos de un usuario
import type { EstadoUsuario, Lengua, Pagina, Rol, Usuario } from '../lib/tipos'

// Datos que se envían al crear o modificar un usuario.
export interface DatosUsuario {
  nombre: string
  correo: string
  contrasena?: string // "?" = opcional: al editar se puede omitir para no cambiarla
  lengua: Lengua
  rol: Rol
  estado: EstadoUsuario
}

// READ (lista) → GET /api/usuarios?buscar=...&pagina=...&por_pagina=...
export function listarUsuarios(params: { buscar: string; pagina: number; porPagina: number }) {
  // URLSearchParams arma la parte "?buscar=ana&pagina=1&por_pagina=10" de la dirección.
  const consulta = new URLSearchParams({
    buscar: params.buscar,
    pagina: String(params.pagina),
    por_pagina: String(params.porPagina),
  })
  return api<Pagina<Usuario>>(`/usuarios?${consulta}`)
}

// READ (uno) → GET /api/usuarios/ID
export function obtenerUsuario(id: string) {
  return api<Usuario>(`/usuarios/${id}`)
}

// CREATE → POST /api/usuarios (devuelve el usuario creado)
export function crearUsuario(datos: DatosUsuario) {
  return api<Usuario>('/usuarios', { metodo: 'POST', cuerpo: datos })
}

// UPDATE → PUT /api/usuarios/ID. Partial = se pueden mandar solo algunos campos.
export function actualizarUsuario(id: string, datos: Partial<DatosUsuario>) {
  return api<Usuario>(`/usuarios/${id}`, { metodo: 'PUT', cuerpo: datos })
}

// DELETE → DELETE /api/usuarios/ID (no devuelve nada: código 204)
export function eliminarUsuario(id: string) {
  return api<void>(`/usuarios/${id}`, { metodo: 'DELETE' })
}
