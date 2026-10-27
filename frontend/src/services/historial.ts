/*
 * SERVICIO DE HISTORIAL (con cuenta)
 * Funciones que llaman al backend (backend/app/rutas/historial.py). Tienen la misma forma
 * que el almacén del navegador (lib/historial.ts), así las pantallas usan cualquiera de los dos.
 */
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → hace una petición al backend con el token de la sesión
import { api } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/historial.ts:
//     AlmacenHistorial → tipo: funciones que debe tener un almacén de historial
//     RegistroHistorial / ResumenHistorial → tipos de los registros
import type { AlmacenHistorial, RegistroHistorial, ResumenHistorial } from '../lib/historial'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Pagina → tipo: resultado paginado
import type { Pagina } from '../lib/tipos'

export const almacenServidor: AlmacenHistorial = {
  listar: ({ buscar = '', tipo = '', pagina = 1, porPagina = 10 }) => {
    const params = new URLSearchParams({ buscar, pagina: String(pagina), por_pagina: String(porPagina) })
    if (tipo) params.set('tipo', tipo)
    return api<Pagina<ResumenHistorial>>(`/historial?${params}`)
  },
  obtener: (id) => api<RegistroHistorial>(`/historial/${encodeURIComponent(id)}`),
  crear: (datos) => api<RegistroHistorial>('/historial', { metodo: 'POST', cuerpo: datos }),
  actualizar: (id, datos) => api<RegistroHistorial>(`/historial/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos }),
  eliminar: (id) => api<void>(`/historial/${encodeURIComponent(id)}`, { metodo: 'DELETE' }),
  eliminarTodo: () => api<void>('/historial', { metodo: 'DELETE' }),
}
