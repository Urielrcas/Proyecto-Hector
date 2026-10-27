/*
 * SERVICIO DE LA IA (con cuenta)
 * Guarda y trae del servidor (backend/app/rutas/ia.py) el modelo de IA del usuario:
 * su dominio por letra, las muestras de su mano, su red entrenada y lo aprendido por el corrector.
 */
// ▸ Desde nuestro proyecto:
import { api } from '../lib/api'
import type { ModeloIA } from '../lib/ia/modeloIA'
import type { Lengua } from '../lib/tipos'

export async function obtenerModeloIA(lengua: Lengua): Promise<ModeloIA | null> {
  const r = await api<{ modelo: ModeloIA | null }>(`/ia/modelo?lengua=${lengua}`)
  return r.modelo
}

export function guardarModeloIA(lengua: Lengua, modelo: ModeloIA) {
  return api<void>('/ia/modelo', { metodo: 'PUT', cuerpo: { lengua, modelo } })
}
