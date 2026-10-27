/*
 * REGISTRO DE PARTIDAS DE LOS JUEGOS
 * Guarda en el navegador, por usuario y lengua:
 *   - las últimas partidas (puntos, aciertos, racha, estrellas y letras falladas),
 *   - la experiencia acumulada (XP) y las insignias ganadas (no se pierden aunque
 *     las partidas viejas se descarten).
 * Con cuenta, cada partida también se manda al servidor (para las estadísticas del administrador).
 */

// ▸ Desde React:
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → usuario y lengua
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar / leer → datos en el navegador (localStorage)
import { guardar, leer } from '../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/juegos/juegos.ts:
//     agregarPartida → agrega una partida al registro;  Partida → tipo
import { agregarPartida, type Partida } from '../lib/juegos/juegos'
// ▸ Desde nuestro proyecto: src/lib/juegos/logros.ts:
//     logrosDesbloqueados / logrosNuevos → insignias;  nivelDe / xpTotal → nivel y experiencia
import { logrosDesbloqueados, logrosNuevos, nivelDe, xpTotal, type Logro, type Nivel } from '../lib/juegos/logros'
// ▸ Desde nuestro proyecto: src/services/juegos.ts:
//     enviarPartida → manda la partida al servidor
import { enviarPartida } from '../services/juegos'

/** Lo que pasó al registrar una partida (para la pantalla de resultado). */
export interface Recompensa {
  logros: Logro[]
  nivelAntes: Nivel
  nivelDespues: Nivel
}

interface Guardado {
  partidas: Partida[]
  xp: number
  logros: string[]
}

function cargar(clave: string): Guardado {
  const partidas = leer<Partida[]>(clave, [])
  // Si es un registro de antes (sin XP guardada), la XP sale de sus partidas.
  const xp = leer<number | null>(`${clave}.xp`, null) ?? xpTotal(partidas)
  return { partidas, xp, logros: leer<string[]>(`${clave}.logros`, []) }
}

export function useRegistroJuegos() {
  const { usuario, lengua } = useApp()
  // Clave distinta por usuario y lengua. Ej.: "juegos.66f1a2….LSM"
  const clave = `juegos.${usuario?.id ?? 'invitado'}.${lengua ?? 'LSM'}`
  const [estado, setEstado] = useState(() => ({ clave, ...cargar(clave) }))

  // Si cambia el usuario o la lengua, cargar su registro.
  let actual = estado
  if (estado.clave !== clave) {
    actual = { clave, ...cargar(clave) }
    setEstado(actual)
  }

  /** Guarda la partida y devuelve las insignias nuevas y el nivel antes y después. */
  const registrar = (partida: Partida): Recompensa => {
    const antes = cargar(clave)
    const partidas = agregarPartida(antes.partidas, partida)
    const xp = antes.xp + partida.puntos
    const logrosAntes = logrosDesbloqueados(antes.partidas, antes.xp, antes.logros)
    const logrosDespues = logrosDesbloqueados(partidas, xp, antes.logros)
    const logros = logrosDespues.map((l) => l.id)
    guardar(clave, partidas)
    guardar(`${clave}.xp`, xp)
    guardar(`${clave}.logros`, logros)
    setEstado({ clave, partidas, xp, logros })
    if (usuario) enviarPartida(lengua ?? 'LSM', partida).catch(() => {}) // sin conexión: queda solo en el navegador
    return { logros: logrosNuevos(logrosAntes, logrosDespues), nivelAntes: nivelDe(antes.xp), nivelDespues: nivelDe(xp) }
  }

  return {
    partidas: actual.partidas,
    xp: actual.xp,
    nivel: nivelDe(actual.xp),
    logros: logrosDesbloqueados(actual.partidas, actual.xp, actual.logros),
    registrar,
  }
}
