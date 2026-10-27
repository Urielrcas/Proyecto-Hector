import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { crearMemorama, estrellas, estrellasMemorama, multiplicador, puntosLetra, puntosMemorama, puntosRespuesta, type Partida } from './juegos'
import { LOGROS, logrosDesbloqueados, logrosNuevos, nivelDe, xpParaNivel, xpTotal } from './logros'

const LSM = alfabeto('LSM')

function azarFijo(semilla = 7) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const partida = (cambios: Partial<Partida> = {}): Partida => ({
  juego: 'adivina',
  puntos: 50,
  aciertos: 5,
  total: 10,
  fecha: Date.UTC(2026, 9, 27),
  falladas: [],
  ...cambios,
})

describe('rachas y puntos', () => {
  it('multiplicador: ×1, ×2 desde 3 seguidos, ×3 desde 5', () => {
    expect([0, 2, 3, 4, 5, 9].map(multiplicador)).toEqual([1, 1, 2, 2, 3, 3])
  })
  it('la racha multiplica los puntos del reto y del cuestionario', () => {
    expect(puntosLetra(6, false, 3)).toBe(32)
    expect(puntosLetra(6, true, 3)).toBe(16)
    expect(puntosRespuesta(5, 0)).toBe(15)
    expect(puntosRespuesta(5, 5)).toBe(45)
  })
  it('estrellas según el porcentaje de aciertos', () => {
    expect([estrellas(10, 10), estrellas(7, 10), estrellas(4, 10), estrellas(1, 10), estrellas(0, 0)]).toEqual([3, 2, 1, 0, 0])
  })
})

describe('memorama', () => {
  it('cada letra aparece dos veces: una como letra y otra como dibujo', () => {
    for (const d of ['facil', 'normal', 'dificil'] as const) {
      const cartas = crearMemorama(LSM, d, azarFijo())
      const porLetra = new Map<string, string[]>()
      for (const c of cartas) porLetra.set(c.letra.letra, [...(porLetra.get(c.letra.letra) ?? []), c.cara])
      for (const caras of porLetra.values()) expect(caras.sort()).toEqual(['dibujo', 'letra'])
      expect(new Set(cartas.map((c) => c.id)).size).toBe(cartas.length)
    }
    expect(crearMemorama(LSM, 'facil', azarFijo())).toHaveLength(8)
    expect(crearMemorama(LSM, 'dificil', azarFijo())).toHaveLength(16)
  })
  it('puntos y estrellas: menos movimientos y menos tiempo es mejor', () => {
    expect(puntosMemorama(6, 8, 40)).toBe(130)
    expect(puntosMemorama(6, 6, 10)).toBeGreaterThan(puntosMemorama(6, 15, 10))
    expect(puntosMemorama(4, 100, 999)).toBe(10)
    expect([estrellasMemorama(6, 6), estrellasMemorama(6, 12), estrellasMemorama(6, 20)]).toEqual([3, 2, 1])
  })
})

describe('niveles', () => {
  it('cada nivel pide 50 XP más que el anterior', () => {
    expect([1, 2, 3, 4, 5].map(xpParaNivel)).toEqual([0, 100, 250, 450, 700])
  })
  it('nivel y avance a partir de la XP', () => {
    expect(nivelDe(0)).toMatchObject({ nivel: 1, progreso: 0 })
    expect(nivelDe(175)).toMatchObject({ nivel: 2, desde: 100, hasta: 250, progreso: 0.5 })
    expect(nivelDe(100000).nombre).toBe('Maestro de señas')
  })
})

describe('insignias', () => {
  it('ids únicos', () => {
    expect(new Set(LOGROS.map((l) => l.id)).size).toBe(LOGROS.length)
  })
  it('se desbloquean según las partidas', () => {
    const ids = (ps: Partida[]) => logrosDesbloqueados(ps, xpTotal(ps)).map((l) => l.id)
    expect(ids([])).toEqual([])
    expect(ids([partida()])).toEqual(['primera'])
    expect(ids([partida({ racha: 5 })])).toEqual(expect.arrayContaining(['racha3', 'racha5']))
    expect(ids([partida({ juego: 'reto', aciertos: 8, total: 8, pistas: 0 })])).toEqual(expect.arrayContaining(['perfecta', 'sinpistas']))
    expect(ids([partida({ juego: 'reto', aciertos: 8, total: 8, pistas: 2 })])).not.toContain('sinpistas')
    expect(ids([partida({ juego: 'memorama', estrellas: 3 })])).toContain('memoria')
  })
  it('las guardadas no se pierden y las nuevas se detectan', () => {
    expect(logrosDesbloqueados([], 0, ['racha5']).map((l) => l.id)).toEqual(['racha5'])
    const antes = logrosDesbloqueados([partida()], 50)
    const despues = logrosDesbloqueados([partida(), partida({ racha: 3 })], 100)
    expect(logrosNuevos(antes, despues).map((l) => l.id)).toEqual(['racha3'])
  })
})
