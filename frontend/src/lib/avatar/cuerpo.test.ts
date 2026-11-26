import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { palabrasDe } from '../aprendizaje/palabras'
import { textoASenas } from '../traduccion/deletreo'
import { CUERPO, codoPorIK, colocarMano, hombro, pasoDePalabra, pasoDeSena, poloCodo, v3 } from './cuerpo'

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('cuerpo del avatar', () => {
  it('cinemática inversa: los huesos miden lo mismo y la muñeca llega al objetivo', () => {
    const s = hombro(-1)
    const objetivo = v3(-0.8, 8.5, 2.3)
    const { codo, muneca } = codoPorIK(s, objetivo, CUERPO.brazo, CUERPO.antebrazo, poloCodo(-1))
    expect(dist(s, codo)).toBeCloseTo(CUERPO.brazo, 5)
    expect(dist(codo, muneca)).toBeCloseTo(CUERPO.antebrazo, 5)
    expect(dist(muneca, objetivo)).toBeLessThan(1e-3)
    expect(codo.y).toBeLessThan(s.y) // el codo cae hacia abajo
  })

  it('si el objetivo está muy lejos, el brazo se estira hacia él', () => {
    const s = hombro(1)
    const { muneca } = codoPorIK(s, v3(10, 9, 10), CUERPO.brazo, CUERPO.antebrazo, poloCodo(1))
    expect(dist(s, muneca)).toBeCloseTo(CUERPO.brazo + CUERPO.antebrazo, 2)
  })

  it('cada letra y cada palabra se convierte en manos con puntos válidos', () => {
    for (const lengua of ['LSM', 'ASL'] as const) {
      for (const l of alfabeto(lengua)) {
        const paso = pasoDeSena({ tipo: 'letra', letra: l, original: l.letra, palabra: 0 }, lengua)
        for (const t of [0, 0.5, 1]) {
          const m = colocarMano(paso.derecha, -1, t)
          expect(m.puntos).toHaveLength(21)
          expect(m.puntos.every((p) => Number.isFinite(p.x + p.y + p.z))).toBe(true)
        }
      }
      for (const palabra of palabrasDe(lengua)) {
        const partes = textoASenas(palabra.palabra, lengua).filter((s) => s.tipo === 'palabra').length || 1
        for (let parte = 0; parte < partes; parte++) {
          const paso = pasoDePalabra(palabra, parte, lengua)
          for (const t of [0, 0.3, 0.7, 1]) {
            for (const [mano, lado] of [[paso.derecha, -1], [paso.izquierda, 1]] as const) {
              const m = colocarMano(mano, lado, t)
              expect(m.puntos.every((p) => Number.isFinite(p.x + p.y + p.z))).toBe(true)
              // Ninguna mano se sale del alcance del brazo (más un margen).
              expect(dist(hombro(lado), m.muneca)).toBeLessThan(CUERPO.brazo + CUERPO.antebrazo + 1.6)
            }
          }
        }
      }
    }
  })

  it('«Buenos días» se hace con señas de palabra, sin deletrear', () => {
    const senas = textoASenas('buenos días', 'LSM')
    expect(senas.every((s) => s.tipo === 'palabra')).toBe(true)
    const [b, d] = senas.map((s) => pasoDeSena(s, 'LSM'))
    expect(b.derecha.lugar).toBe('pecho')
    expect(b.derecha.mov).toBe('al-frente')
    expect(d.derecha.mov).toBe('lado')
  })

  it('la izquierda queda reflejada de la derecha', () => {
    const paso = pasoDeSena(undefined, 'LSM')
    const der = colocarMano(paso.derecha, -1, 0)
    const izq = colocarMano(paso.izquierda, 1, 0)
    expect(der.muneca.x).toBeCloseTo(-izq.muneca.x, 5)
    expect(der.muneca.y).toBeCloseTo(izq.muneca.y, 5)
  })
})
