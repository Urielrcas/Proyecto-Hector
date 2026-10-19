/*
 * SERVICIO DE ESTADÍSTICAS (solo administradores)
 * Funciones que llaman al backend (backend/app/rutas/estadisticas.py):
 * el resumen con los números de las tarjetas y las gráficas PNG hechas con matplotlib.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
//     apiArchivo → descarga un archivo (la imagen de la gráfica) con el token de la sesión
import { api, apiArchivo } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../lib/tipos'

// Números de las tarjetas (ResumenEstadisticas en backend/app/modelos.py).
export interface ResumenEstadisticas {
  usuarios: number
  activos: number
  inactivos: number
  por_lengua: Record<Lengua, number>
  letras_logradas: number
  avance_promedio: Record<Lengua, number> // porcentaje (0 a 100)
}

// Las 4 gráficas que dibuja el backend.
export type NombreGrafica = 'registros' | 'usuarios' | 'letras' | 'avance'

// GET /api/estadisticas/resumen
export function obtenerResumen() {
  return api<ResumenEstadisticas>('/estadisticas/resumen')
}

// GET /api/estadisticas/graficas/NOMBRE.png?lengua=LSM → imagen como Blob
// La lengua solo se manda en "letras" y "avance"; "registros" y "usuarios" no dependen de ella.
export function obtenerGrafica(nombre: NombreGrafica, lengua?: Lengua) {
  return apiArchivo(`/estadisticas/graficas/${nombre}.png${lengua ? `?lengua=${lengua}` : ''}`)
}
