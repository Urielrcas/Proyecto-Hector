/*
 * SERVICIO DE PROGRESO DE APRENDIZAJE
 * Funciones que llaman al backend (backend/app/rutas/progreso.py) para leer y guardar
 * las letras que logró el usuario de la sesión. Las usa el hook useProgresoAprendizaje.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
import { api } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../lib/tipos'

// Lo que responde el servidor: las letras logradas en esa lengua, en orden del alfabeto.
interface Progreso {
  lengua: Lengua
  letras: string[]
}

// GET /api/progreso?lengua=LSM → letras logradas
export async function obtenerProgreso(lengua: Lengua): Promise<string[]> {
  return (await api<Progreso>(`/progreso?lengua=${lengua}`)).letras
}

// POST /api/progreso → agrega letras logradas y devuelve todas las logradas
export async function guardarProgreso(lengua: Lengua, letras: string[]): Promise<string[]> {
  return (await api<Progreso>('/progreso', { metodo: 'POST', cuerpo: { lengua, letras } })).letras
}
