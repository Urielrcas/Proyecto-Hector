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
//     normalizarMano → deja derecha e izquierda como la misma mano
import { evaluar, leerMano, normalizarMano } from './postura'

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

  it('la S con el pulgar cruzado alto sobre el puño no se confunde con "entre" ni "estirado"', () => {
    // Como en una mano real: la punta del pulgar queda a la altura de los nudillos, pero acostada a lo ancho.
    const s = manoSintetica(mano('DDDD', 'sobre'))
    s[2] = { x: 0.4, y: 0.74 }
    s[3] = { x: 0.46, y: 0.6 }
    s[4] = { x: 0.6, y: 0.57 }
    expect(leerMano(s).pulgar).toBe('sobre')
    // Con profundidad: el pulgar va por delante de los dedos.
    const conZ = s.map((q, i) => ({ ...q, z: i >= 2 && i <= 4 ? -0.08 : -0.02 }))
    expect(leerMano(conZ).pulgar).toBe('sobre')
  })

  it('la T con el pulgar asomando hacia arriba entre índice y medio sigue siendo "entre"', () => {
    const t = manoSintetica(mano('DDDD', 'entre'))
    const conZ = t.map((q, i) => ({ ...q, z: i === 4 ? 0.01 : -0.03 }))
    expect(leerMano(conZ).pulgar).toBe('entre')
    expect(leerMano(conZ).entre).toBe(1)
  })

  it('reconoce hacia dónde mira la palma: frente, dorso o de lado', () => {
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado'))).palma).toBe('frente')
    expect(leerMano(manoSintetica(mano('EEEE', 'doblado', { palma: 'dorso' }))).palma).toBe('dorso')
    expect(leerMano(manoSintetica(mano('CCCC', 'curvo', { palma: 'lado' }))).palma).toBe('lado')
    // Hacia abajo (M, N) también se distingue el dorso.
    expect(leerMano(manoSintetica(mano('EEED', 'doblado', { giro: 180, palma: 'dorso' }))).palma).toBe('dorso')
  })

  it('si la profundidad contradice al triángulo, no se exige la palma (no se marca un error dudoso)', () => {
    const B = alfabeto('LSM').find((l) => l.letra === 'B')!
    const b = manoSintetica(B.forma)
    // Pulgar alejándose de la cámara (como si fuera el dorso) aunque el triángulo diga "frente".
    const contradice = b.map((q, i) => ({ ...q, z: i === 4 ? 0.06 : 0 }))
    expect(leerMano(contradice).palma).toBeUndefined()
    expect(evaluar(contradice, B.objetivo).correcto).toBe(true)
    // Si las dos pistas coinciden, sí se decide.
    const coincide = b.map((q, i) => ({ ...q, z: i === 4 ? -0.06 : 0 }))
    expect(leerMano(coincide).palma).toBe('frente')
  })

  it('una mano derecha y una izquierda con la palma al frente se leen igual', () => {
    const izquierda = manoSintetica(mano('EEEE', 'doblado'))
    const derecha = izquierda.map((q) => ({ x: 1 - q.x, y: q.y })) // la misma mano, reflejada
    expect(leerMano(normalizarMano(derecha, 'Left')).palma).toBe('frente')
    expect(leerMano(normalizarMano(izquierda, 'Right')).palma).toBe('frente')
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
  LSM: ['I J', 'N Ñ', 'K P'], // K y P: misma forma, la K lleva movimiento
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

  it('reconoce la O real: las puntas bajan a la altura de los nudillos pero quedan lejos de la palma', () => {
    const o = manoSintetica(lsm.O.forma)
    // Cada punta baja a la altura de su nudillo, hacia adelante (como al cerrar la O de verdad).
    for (const base of [5, 9, 13, 17]) {
      o[base + 3] = { x: o[base].x + 0.1, y: o[base].y - 0.02 }
      o[base + 2] = { x: o[base].x + 0.09, y: o[base].y - 0.08 }
    }
    // El pulgar sube a tocar la punta del índice.
    const t = { x: o[8].x - 0.01, y: o[8].y + 0.02 }
    o[4] = t
    o[3] = { x: (o[1].x + t.x * 2) / 3, y: (o[1].y + t.y * 2) / 3 }
    o[2] = { x: (o[1].x * 2 + t.x) / 3, y: (o[1].y * 2 + t.y) / 3 }
    const r = evaluar(o, lsm.O.objetivo)
    expect(r.consejos).toEqual([])
    expect(r.correcto).toBe(true)
  })

  it('un puño (S) sigue leyendo los dedos como doblados', () => {
    expect(leerMano(manoSintetica(lsm.S.forma)).dedos).toEqual({ indice: 'doblado', medio: 'doblado', anular: 'doblado', menique: 'doblado' })
  })

  it('acepta la N de dorso aunque la cámara lea el anular "curvo" y el pulgar escondido al costado', () => {
    // Así la ve la cámara desde atrás: no ve la punta del anular doblado ni el pulgar metido.
    const comoLaVe = mano('EECD', 'lado', { giro: 180, palma: 'dorso' })
    const r = evaluar(manoSintetica(comoLaVe), lsm.N.objetivo)
    expect(r.consejos).toEqual([])
    expect(r.correcto).toBe(true)
  })

  it('pide voltear la mano cuando la M se hace con la palma en lugar del dorso', () => {
    const conLaPalma = { ...lsm.M.forma, palma: 'frente' as const }
    expect(evaluar(manoSintetica(conLaPalma), lsm.M.objetivo).consejos).toEqual(['Voltea la mano: debe verse el dorso (no la palma).'])
  })

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
