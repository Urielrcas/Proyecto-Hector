import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { diferencias } from '../aprendizaje/grafoLetras'
import { cumple } from '../logica/reglas'
import {
  agregarPartida,
  barajar,
  crearPalabras,
  crearPreguntas,
  crearReto,
  distractores,
  letrasDePalabra,
  letrasParaRepasar,
  MAX_PARTIDAS,
  mejorPuntaje,
  PALABRAS,
  puntosLetra,
  type Partida,
} from './juegos'

// Azar repetible para que las pruebas den siempre lo mismo.
function azarFijo(semilla = 1) {
  let s = semilla
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const LSM = alfabeto('LSM')
const ASL = alfabeto('ASL')

describe('barajar', () => {
  it('conserva los mismos elementos y no modifica la original', () => {
    const lista = [1, 2, 3, 4, 5]
    const mezclada = barajar(lista, azarFijo())
    expect([...mezclada].sort()).toEqual(lista)
    expect(lista).toEqual([1, 2, 3, 4, 5])
  })
})

describe('distractores', () => {
  it('da 3 letras distintas a la correcta, todas con forma diferente', () => {
    for (const correcta of LSM) {
      const d = distractores(LSM, correcta, 3, azarFijo())
      expect(d).toHaveLength(3)
      expect(new Set(d.map((l) => l.letra)).size).toBe(3)
      for (const l of d) {
        expect(l.letra).not.toBe(correcta.letra)
        expect(diferencias(correcta.forma, l.forma).length).toBeGreaterThan(0)
      }
    }
  })

  it('elige letras parecidas, no cualquiera', () => {
    const u = LSM.find((l) => l.letra === 'U')!
    const promedioTodas = LSM.filter((l) => l !== u).reduce((t, l) => t + diferencias(u.forma, l.forma).length, 0) / (LSM.length - 1)
    const elegidas = distractores(LSM, u, 3, azarFijo())
    for (const l of elegidas) expect(diferencias(u.forma, l.forma).length).toBeLessThanOrEqual(promedioTodas)
  })
})

describe('crearPreguntas', () => {
  it('arma 10 preguntas con 4 opciones que incluyen la correcta', () => {
    const preguntas = crearPreguntas(LSM, LSM, 10, azarFijo())
    expect(preguntas).toHaveLength(10)
    for (const p of preguntas) {
      expect(p.opciones).toHaveLength(4)
      expect(p.opciones.map((o) => o.letra)).toContain(p.correcta.letra)
    }
    expect(preguntas.map((p) => p.tipo)).toContain('dibujo')
    expect(preguntas.map((p) => p.tipo)).toContain('letra')
  })

  it('solo pregunta por las letras elegidas (ej.: las vocales)', () => {
    const vocales = LSM.filter((l) => 'AEIOU'.includes(l.letra))
    const preguntas = crearPreguntas(vocales, LSM, 10, azarFijo())
    expect(preguntas).toHaveLength(10)
    for (const p of preguntas) expect('AEIOU').toContain(p.correcta.letra)
  })
})

describe('crearReto', () => {
  it('no repite la misma letra dos veces seguidas aunque haya pocas', () => {
    const dos = LSM.filter((l) => l.letra === 'A' || l.letra === 'B')
    const reto = crearReto(dos, 8, azarFijo())
    expect(reto).toHaveLength(8)
    for (let i = 1; i < reto.length; i++) expect(reto[i].letra).not.toBe(reto[i - 1].letra)
  })

  it('con una sola letra la repite', () => {
    const o = LSM.filter((l) => l.letra === 'O')
    expect(crearReto(o, 3, azarFijo()).map((l) => l.letra)).toEqual(['O', 'O', 'O'])
  })

  it('sin letras no hay reto', () => {
    expect(crearReto([], 5)).toEqual([])
  })
})

describe('puntosLetra', () => {
  it('10 + segundos sobrantes; la mitad con pista', () => {
    expect(puntosLetra(6, false)).toBe(16)
    expect(puntosLetra(6, true)).toBe(8)
    expect(puntosLetra(-1, false)).toBe(10)
  })
})

describe('palabras', () => {
  it('todas las palabras se pueden deletrear en LSM y en ASL', () => {
    for (const p of PALABRAS) {
      expect(letrasDePalabra(p, LSM)).toHaveLength(p.length)
      expect(letrasDePalabra(p, ASL)).toHaveLength(p.length)
    }
  })

  it('ninguna palabra tiene la misma letra dos veces seguidas', () => {
    for (const p of PALABRAS) expect(p).not.toMatch(/(.)\1/)
  })

  it('crearPalabras da palabras distintas', () => {
    const ps = crearPalabras(LSM, 3, azarFijo())
    expect(new Set(ps).size).toBe(3)
  })
})

describe('registro de partidas', () => {
  const partida = (juego: Partida['juego'], puntos: number, falladas: string[] = []): Partida => ({
    juego,
    puntos,
    aciertos: 0,
    total: 8,
    fecha: puntos,
    falladas,
  })

  it('guarda la más reciente primero y no pasa del máximo', () => {
    let r: Partida[] = []
    for (let i = 0; i < MAX_PARTIDAS + 5; i++) r = agregarPartida(r, partida('reto', i))
    expect(r).toHaveLength(MAX_PARTIDAS)
    expect(r[0].puntos).toBe(MAX_PARTIDAS + 4)
  })

  it('mejor puntaje por juego', () => {
    const r = [partida('reto', 50), partida('adivina', 90), partida('reto', 70)]
    expect(mejorPuntaje(r, 'reto')).toBe(70)
    expect(mejorPuntaje(r, 'palabra')).toBe(0)
  })

  it('letras para repasar: primero las más falladas', () => {
    const r = [partida('reto', 1, ['R', 'T']), partida('reto', 2, ['R']), partida('adivina', 3, ['R', 'S'])]
    expect(letrasParaRepasar(r)[0]).toBe('R')
  })
})

describe('regla aciertoReto: f ∧ (m → d) ∧ t', () => {
  it('acierta con la forma correcta y tiempo', () => {
    expect(cumple('aciertoReto', { f: true, m: false, d: false, t: true })).toBe(true)
  })
  it('falla si se acabó el tiempo aunque la forma sea correcta', () => {
    expect(cumple('aciertoReto', { f: true, m: false, d: false, t: false })).toBe(false)
  })
  it('letra con movimiento: falta el movimiento → no cuenta', () => {
    expect(cumple('aciertoReto', { f: true, m: true, d: false, t: true })).toBe(false)
    expect(cumple('aciertoReto', { f: true, m: true, d: true, t: true })).toBe(true)
  })
})
