// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un resultado sea el esperado
//     it → define una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → devuelve las letras de LSM o ASL con sus pasos y forma
import { alfabeto } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     mano → atajo para describir la forma de una mano: mano('EDDD', 'estirado')
import { mano } from '../aprendizaje/forma'
// ▸ Desde nuestro proyecto: src/lib/vision/manoSintetica.ts:
//     manoSintetica → crea una mano falsa (solo para pruebas)
import { manoSintetica } from './manoSintetica'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     evaluar → evalúa (en postura: la seña de la mano; en proposicional: una fórmula lógica)
//     leerMano → convierte los 21 puntos en: dedos estirados/curvos/doblados, pulgar, orientación
import { evaluar, leerMano } from './postura'

describe('leerMano', () => {
  it('reconoce dedos estirados, curvos y doblados', () => {
    const l = leerMano(manoSintetica(mano('ECDE', 'sobre')))
    expect(l.dedos).toEqual({ indice: 'estirado', medio: 'curvo', anular: 'doblado', menique: 'estirado' })
  })

  it('reconoce cada posición del pulgar', () => {
    for (const pulgar of ['estirado', 'lado', 'sobre', 'doblado', 'entre'] as const) {
      expect(leerMano(manoSintetica(mano('DDDD', pulgar))).pulgar).toBe(pulgar)
    }
    expect(leerMano(manoSintetica(mano('CCCC', 'toca'))).pulgar).toBe('toca')
  })

  it('distingue entre qué dedos asoma el pulgar', () => {
    for (const entre of [1, 2, 3] as const) expect(leerMano(manoSintetica(mano('DDDD', 'entre', { entre }))).entre).toBe(entre)
  })

  it('reconoce hacia dónde apunta la mano', () => {
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado'))).orientacion).toBe('arriba')
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado', { giro: 90 }))).orientacion).toBe('lado')
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado', { giro: -90 }))).orientacion).toBe('lado')
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado', { giro: 180 }))).orientacion).toBe('abajo')
  })

  it('reconoce dedos juntos, separados y cruzados', () => {
    const juntos = leerMano(manoSintetica(mano('EEDD', 'sobre')))
    expect([juntos.separados, juntos.cruzados]).toEqual([false, false])
    expect(leerMano(manoSintetica(mano('EEDD', 'sobre', { separados: true }))).separados).toBe(true)
    expect(leerMano(manoSintetica(mano('EEDD', 'sobre', { cruzados: true }))).cruzados).toBe(true)
  })
})

describe('alfabeto', () => {
  it('LSM tiene las 27 letras del diccionario y ASL sus 26 letras', () => {
    expect(alfabeto('LSM')).toHaveLength(27)
    expect(alfabeto('ASL')).toHaveLength(26)
    for (const l of [...alfabeto('LSM'), ...alfabeto('ASL')]) expect(l.pasos.length).toBeGreaterThan(0)
  })

  it('las letras con movimiento tienen flecha en el dibujo y movimiento que evaluar', () => {
    for (const l of alfabeto('LSM').filter((x) => x.movimiento)) {
      expect(l.forma.movimiento, l.letra).toBeDefined()
      expect(l.objetivo.movimiento, l.letra).toBe(l.forma.movimiento)
    }
  })
})

/** Letras que comparten la forma de la mano y solo se distinguen por el movimiento. */
const MISMA_FORMA: Record<string, string[]> = {
  LSM: ['I J', 'N Ñ', 'K P'],
  ASL: ['I J'],
}

describe.each(['LSM', 'ASL'] as const)('evaluación de todas las letras (%s)', (lengua) => {
  const letras = alfabeto(lengua)
  const gemelas = (a: string) => MISMA_FORMA[lengua].find((g) => g.split(' ').includes(a))?.split(' ') ?? [a]

  it.each(letras.map((l) => [l.letra, l] as const))('%s se reconoce con su propia forma', (_, letra) => {
    const r = evaluar(manoSintetica(letra.forma), letra.objetivo)
    expect(r.consejos).toEqual([])
    expect(r.correcto).toBe(true)
  })

  it('ninguna letra se confunde con otra', () => {
    for (const a of letras) {
      const coincide = letras.filter((b) => evaluar(manoSintetica(a.forma), b.objetivo).correcto).map((b) => b.letra)
      expect(coincide.sort(), `la forma de ${a.letra}`).toEqual(gemelas(a.letra).sort())
    }
  })
})

describe('consejos', () => {
  const lsm = Object.fromEntries(alfabeto('LSM').map((l) => [l.letra, l]))

  it('pide separar cuando se hace U en lugar de V', () => {
    expect(evaluar(manoSintetica(lsm.U.forma), lsm.V.objetivo).consejos).toEqual(['Separa el índice y el medio.'])
  })

  it('pide estirar el pulgar cuando falta en la L', () => {
    expect(evaluar(manoSintetica(mano('EDDD', 'sobre')), lsm.L.objetivo).consejos).toEqual(['Estira el pulgar hacia afuera.'])
  })

  it('pide girar la mano cuando la G se hace hacia arriba', () => {
    expect(evaluar(manoSintetica(mano('EDDD', 'estirado')), lsm.G.objetivo).consejos).toContain(
      'Gira la mano: los dedos deben apuntar hacia un lado.',
    )
  })

  it('pide cruzar los dedos en la R', () => {
    expect(evaluar(manoSintetica(lsm.U.forma), lsm.R.objetivo).consejos).toEqual(['Cruza el medio por encima del índice.'])
  })

  it('pide curvar los dedos en la C cuando están estirados', () => {
    expect(evaluar(manoSintetica(mano('EEEE', 'lado')), lsm.C.objetivo).consejos).toContain('Curva el índice, sin cerrarlo del todo.')
  })
})
