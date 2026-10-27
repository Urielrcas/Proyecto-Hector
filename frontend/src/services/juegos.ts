/*
 * SERVICIO DE JUEGOS (con cuenta)
 * Manda cada partida terminada al servidor (backend/app/rutas/juegos.py)
 * para las estadísticas del administrador.
 */
import { api } from '../lib/api'
import type { Partida } from '../lib/juegos/juegos'
import type { Lengua } from '../lib/tipos'

export function enviarPartida(lengua: Lengua, p: Partida) {
  return api<void>('/juegos/partidas', {
    metodo: 'POST',
    cuerpo: {
      lengua,
      juego: p.juego,
      puntos: p.puntos,
      aciertos: p.aciertos,
      total: p.total,
      racha: p.racha ?? 0,
      pistas: p.pistas ?? 0,
      estrellas: p.estrellas ?? 0,
      falladas: p.falladas.slice(0, 40),
    },
  })
}
