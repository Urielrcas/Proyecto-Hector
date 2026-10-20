/*
 * PRUEBAS DEL GRAFO DE LETRAS
 * Revisan que el grafo sea simétrico (si A se parece a E, E se parece a A), que no tenga
 * letras conectadas consigo mismas y que los cambios entre letras se describan bien.
 */

// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un valor sea el esperado
//     it → una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     mano → atajo para describir la forma de una mano
import { mano } from './forma'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     alcanzables → letras a las que se llega desde una letra
//     diferencias → qué cambia de una forma a otra
//     distanciaEuclidiana, distanciaManhattan → las dos fórmulas de distancia
//     grafoConCostos → grafo con costos y heurística (para UCS, Greedy y A*)
//     grafoLetras → arma el grafo de una lengua
//     MAX_DIFERENCIAS → máximo de cambios entre letras conectadas
import { alcanzables, diferencias, distanciaEuclidiana, distanciaManhattan, grafoConCostos, grafoLetras, MAX_DIFERENCIAS } from './grafoLetras'

describe('grafoLetras', () => {
  for (const lengua of ['LSM', 'ASL'] as const) {
    it(`${lengua}: es simétrico, sin lazos y con cambios dentro del máximo`, () => {
      const { letras, grafo } = grafoLetras(lengua)
      expect(Object.keys(grafo)).toEqual(letras.map((l) => l.letra))
      const forma = Object.fromEntries(letras.map((l) => [l.letra, l.forma]))
      for (const [a, vecinas] of Object.entries(grafo)) {
        expect(vecinas).not.toContain(a)
        for (const b of vecinas) {
          expect(grafo[b]).toContain(a)
          const cambios = diferencias(forma[a], forma[b]).length
          expect(cambios).toBeGreaterThan(0)
          expect(cambios).toBeLessThanOrEqual(MAX_DIFERENCIAS)
        }
      }
    })
  }

  it('LSM: A, E y S forman un ciclo (se parecen entre sí)', () => {
    const { grafo } = grafoLetras('LSM')
    expect(grafo.A).toEqual(expect.arrayContaining(['E', 'S']))
    expect(grafo.E).toContain('S')
  })
})

describe('alcanzables', () => {
  it('LSM: desde A se llega a U, pero no a D (C, O y D forman un grupo aparte)', () => {
    const { grafo } = grafoLetras('LSM')
    const desdeA = alcanzables(grafo, 'A')
    expect(desdeA.has('U')).toBe(true)
    expect(desdeA.has('D')).toBe(false)
    expect([...alcanzables(grafo, 'C')].sort()).toEqual(['C', 'D', 'O'])
  })
})

describe('grafoConCostos', () => {
  for (const lengua of ['LSM', 'ASL'] as const) {
    for (const distancia of ['manhattan', 'euclidiana'] as const) {
      it(`${lengua} (${distancia}): la heurística es consistente para cualquier meta (A* da la ruta más barata)`, () => {
        const { letras } = grafoLetras(lengua)
        for (const { letra: meta } of letras) {
          const { grafo, heuristica } = grafoConCostos(lengua, meta, distancia)
          expect(heuristica[meta]).toBe(0)
          for (const [n, vecinas] of Object.entries(grafo)) {
            for (const [m, costo] of Object.entries(vecinas)) {
              expect(costo === 1 || costo === 2).toBe(true)
              // Consistencia: h(n) ≤ c(n, m) + h(m)
              expect(heuristica[n]).toBeLessThanOrEqual(costo + heuristica[m])
            }
          }
        }
      })
    }
  }

  it('Euclidiana es la raíz de Manhattan: si faltan 4 detalles, 4 contra 2', () => {
    const manhattan = grafoConCostos('LSM', 'U', 'manhattan').heuristica
    const euclidiana = grafoConCostos('LSM', 'U', 'euclidiana').heuristica
    for (const letra of Object.keys(manhattan)) {
      expect(euclidiana[letra]).toBeCloseTo(Math.sqrt(manhattan[letra]), 2)
      expect(euclidiana[letra]).toBeLessThanOrEqual(manhattan[letra])
    }
  })
})

describe('distancias', () => {
  it('del punto A (1, 2) al punto B (4, 6): Manhattan 3 + 4 = 7, Euclidiana √(9 + 16) = 5', () => {
    expect(distanciaManhattan([1, 2], [4, 6])).toBe(7)
    expect(distanciaEuclidiana([1, 2], [4, 6])).toBe(5)
    // Nunca son negativas, aunque el orden de los puntos cambie.
    expect(distanciaManhattan([4, 6], [1, 2])).toBe(7)
    expect(distanciaEuclidiana([4, 6], [1, 2])).toBe(5)
    expect(distanciaManhattan([3, 3], [3, 3])).toBe(0)
  })
})

describe('diferencias', () => {
  it('describe qué cambiar para pasar de una letra a otra', () => {
    // A → E en LSM: solo cambia el pulgar.
    expect(diferencias(mano('DDDD', 'lado'), mano('DDDD', 'doblado'))).toEqual(['Pulgar: doblado sobre la palma'])
    // L → G en LSM: la mano gira.
    expect(diferencias(mano('EDDD', 'estirado'), mano('EDDD', 'estirado', { giro: 90 }))).toEqual(['Gira la mano 90°'])
    // U → V: se separan índice y medio; V → B: se estiran anular y meñique y el pulgar se dobla.
    expect(diferencias(mano('EEDD', 'sobre'), mano('EEDD', 'sobre', { separados: true }))).toEqual(['Separa índice y medio'])
    expect(diferencias(mano('EEDD', 'sobre'), mano('EEEE', 'doblado'))).toEqual(['Estira el anular', 'Estira el meñique', 'Pulgar: doblado sobre la palma'])
  })
})
