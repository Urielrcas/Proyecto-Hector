import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { manoSintetica, mover } from '../vision/manoSintetica'
import { crearMemoria } from './memoria'
import { analizarLetra, repartidas } from './calibracion'

const letras = alfabeto('LSM')
const L = (x: string) => letras.find((l) => l.letra === x)!
const memoria = crearMemoria(letras, {})
const variaciones = (forma: ReturnType<typeof manoSintetica>, n = 20) => Array.from({ length: n }, (_, i) => mover(forma, (i % 3) * 0.002, 0, 1 + (i % 4) * 0.01))

describe('calibración', () => {
  it('si las reglas reconocen la letra, solo se guarda para la red', () => {
    const r = analizarLetra(L('B'), letras, variaciones(manoSintetica(L('B').forma)), memoria)
    expect(r.decision).toBe('bien')
    expect(r.reconocida).toBeGreaterThan(0.9)
  })

  it('si la forma es de otra letra, no se aprende y dice con cuál se confunde', () => {
    // La persona dice que hace la E, pero su mano es exactamente una A.
    const r = analizarLetra(L('E'), letras, variaciones(manoSintetica(L('A').forma)), memoria)
    expect(r.decision).toBe('conflicto')
    expect(r.confundidaCon).toBe('A')
  })

  it('sin mano suficiente no decide nada', () => {
    expect(analizarLetra(L('A'), letras, [], memoria).decision).toBe('sin-mano')
  })

  it('reparte las posturas', () => {
    expect(repartidas([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual([1, 3, 5, 7, 9])
    expect(repartidas([1, 2], 5)).toEqual([1, 2])
  })
})
