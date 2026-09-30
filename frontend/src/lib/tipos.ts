export type Lengua = 'LSM' | 'ASL'
export type Rol = 'admin' | 'usuario'
export type EstadoUsuario = 'activo' | 'inactivo'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  lengua: Lengua
  rol: Rol
  estado: EstadoUsuario
  creado_en: string
}

export interface Sesion {
  token: string
  usuario: Usuario
}

export interface Pagina<T> {
  items: T[]
  total: number
  pagina: number
  por_pagina: number
}

export const LENGUAS: Record<Lengua, { nombre: string; region: string }> = {
  LSM: { nombre: 'Lengua de Señas Mexicana', region: 'México' },
  ASL: { nombre: 'American Sign Language', region: 'Estados Unidos y Canadá' },
}

export const ROLES: Record<Rol, string> = { admin: 'Administrador', usuario: 'Usuario' }
export const ESTADOS: Record<EstadoUsuario, string> = { activo: 'Activo', inactivo: 'Inactivo' }
