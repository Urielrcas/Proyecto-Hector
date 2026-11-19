// La red CNN 1D del navegador debe calcular lo mismo que PyTorch (ml/p24_entrenar_cnn1d.py guardó
// una mano de ejemplo con sus probabilidades en modelo.json).
import { describe, expect, it } from 'vitest'
import { manoSintetica } from '../../vision/manoSintetica'
import { alfabeto } from '../../aprendizaje/alfabeto'
import { CLASES_CNN1D, predecirConCnn1d, probabilidadesDesdePosiciones, PRUEBA_CNN1D } from './cnn1d'

describe('CNN 1D en el navegador', () => {
  it('da las mismas probabilidades que PyTorch', () => {
    const prob = probabilidadesDesdePosiciones(PRUEBA_CNN1D.posiciones)
    expect(prob.length).toBe(CLASES_CNN1D.length)
    PRUEBA_CNN1D.probabilidades.forEach((p, i) => expect(prob[i]).toBeCloseTo(p, 4))
  })

  it('las probabilidades suman 1 y responde una clase válida', () => {
    const letra = alfabeto('LSM').find((l) => l.letra === 'B')!
    const r = predecirConCnn1d(manoSintetica(letra.forma))
    expect(CLASES_CNN1D).toContain(r.nombre)
    expect(r.top).toHaveLength(3)
    expect(r.top.reduce((s, t) => s + t.probabilidad, 0)).toBeLessThanOrEqual(1.0001)
    expect(r.probabilidad).toBeGreaterThan(0)
  })
})
