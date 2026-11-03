import { describe, expect, it } from 'vitest'
import { alfabeto } from './alfabeto'
import { armarCamino, LETRAS_POR_NIVEL, ordenBFS } from './camino'

describe('camino de aprendizaje', () => {
  for (const lengua of ['LSM', 'ASL'] as const) {
    it(`el orden BFS de ${lengua} tiene cada letra una sola vez`, () => {
      const orden = ordenBFS(lengua)
      const letras = alfabeto(lengua).map((l) => l.letra)
      expect(orden).toHaveLength(letras.length)
      expect(new Set(orden)).toEqual(new Set(letras))
      expect(orden[0]).toBe(letras[0])
    })
  }

  it('sin progreso, el primer nivel es el actual y lo demás está pendiente', () => {
    const camino = armarCamino('LSM', [])
    expect(camino[0]).toMatchObject({ tipo: 'nivel', estado: 'actual' })
    expect(camino.slice(1).every((p) => p.estado === 'pendiente')).toBe(true)
    expect(camino.at(-1)).toMatchObject({ tipo: 'reto', id: 'final' })
  })

  it('al completar los dos primeros niveles, el reto queda hecho y el nivel 3 es el actual', () => {
    const orden = ordenBFS('LSM')
    const camino = armarCamino('LSM', orden.slice(0, LETRAS_POR_NIVEL * 2))
    expect(camino.slice(0, 3).map((p) => p.estado)).toEqual(['hecho', 'hecho', 'hecho'])
    expect(camino[2].tipo).toBe('reto')
    expect(camino[3]).toMatchObject({ tipo: 'nivel', numero: 3, estado: 'actual' })
  })

  it('con todo logrado, todo el camino está hecho', () => {
    const camino = armarCamino('ASL', ordenBFS('ASL'))
    expect(camino.every((p) => p.estado === 'hecho')).toBe(true)
  })
})
