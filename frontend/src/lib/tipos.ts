/*
 * TIPOS DE DATOS COMPARTIDOS
 * Describen la forma de los datos que usa la app (TypeScript avisa si se usan mal):
 * Usuario, Sesion, Pagina (resultado paginado), Lengua, Rol y EstadoUsuario.
 * También los textos que se muestran para cada valor (p. ej. rol "admin" → "Administrador").
 */

// "type X = 'a' | 'b'" significa que X solo puede valer 'a' o 'b' (cualquier otro valor da error).
export type Lengua = 'LSM' | 'ASL'
export type Rol = 'admin' | 'usuario'
export type EstadoUsuario = 'activo' | 'inactivo'

// Un usuario tal como lo devuelve el backend (UsuarioPublico en backend/app/modelos.py).
// Nunca trae la contraseña.
export interface Usuario {
  id: string // identificador de MongoDB (_id)
  nombre: string
  correo: string
  lengua: Lengua
  rol: Rol
  estado: EstadoUsuario
  creado_en: string // fecha de creación
}

// Lo que devuelve el servidor al iniciar sesión o registrarse.
export interface Sesion {
  token: string // credencial JWT que se manda en cada petición
  usuario: Usuario
}

// Resultado de una lista paginada. <T> es el tipo de cada elemento (por ejemplo Pagina<Usuario>).
export interface Pagina<T> {
  items: T[] // los elementos de esta página
  total: number // cuántos hay en total
  pagina: number // número de página actual
  por_pagina: number // cuántos caben por página
}

// Nombre y región de cada lengua de señas (se muestran en la configuración inicial y en los formularios).
export const LENGUAS: Record<Lengua, { nombre: string; region: string }> = {
  LSM: { nombre: 'Lengua de Señas Mexicana', region: 'México' },
  ASL: { nombre: 'American Sign Language', region: 'Estados Unidos y Canadá' },
}

// Texto que se muestra para cada valor interno (en la tabla de usuarios, formularios, etc.).
export const ROLES: Record<Rol, string> = { admin: 'Administrador', usuario: 'Usuario' }
export const ESTADOS: Record<EstadoUsuario, string> = { activo: 'Activo', inactivo: 'Inactivo' }
