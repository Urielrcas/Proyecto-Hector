import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { cumple } from '../logica/reglas'
import { corregir, costoCambio, distanciaSenas, formasDe, vocabularioCon } from './corrector'
import { actualizar, dominioEfectivo, nivelLetra, P_INICIAL, recomendar, UMBRAL_DOMINIO, type Dominio } from './dominio'
import { conMuestras, MAX_MUESTRAS_LETRA, MODELO_VACIO, muestrasNuevas, precisionCorrector } from './modeloIA'
import { VOCABULARIO } from './vocabulario'

const LSM = alfabeto('LSM')
const DIA = 24 * 60 * 60 * 1000
const AHORA = Date.UTC(2026, 9, 27)

describe('modelo del estudiante (Bayesian Knowledge Tracing)', () => {
  it('el ejemplo del comentario: la R pasa de 0.10 a ≈0.70 con un acierto en cámara', () => {
    const e = actualizar(undefined, true, 'camara', AHORA)
    expect(e.p).toBeCloseTo(0.7, 1)
    expect(e).toMatchObject({ intentos: 1, aciertos: 1 })
  })
  it('acertar sube, fallar baja', () => {
    const base = actualizar(undefined, true, 'camara', AHORA)
    expect(actualizar(base, true, 'camara', AHORA).p).toBeGreaterThan(base.p)
    expect(actualizar(base, false, 'camara', AHORA).p).toBeLessThan(base.p)
  })
  it('acertar en opción múltiple pesa menos que con la cámara (se puede atinar por suerte)', () => {
    expect(actualizar(undefined, true, 'opcion', AHORA).p).toBeLessThan(actualizar(undefined, true, 'camara', AHORA).p)
  })
  it('varios aciertos seguidos la dan por dominada', () => {
    let e = actualizar(undefined, true, 'camara', AHORA)
    e = actualizar(e, true, 'camara', AHORA)
    e = actualizar(e, true, 'camara', AHORA)
    expect(nivelLetra(e, AHORA)).toBe('dominada')
    expect(e.p).toBeGreaterThanOrEqual(UMBRAL_DOMINIO)
  })
  it('se olvida con el tiempo: a los 21 días el dominio efectivo es la mitad', () => {
    const e = { p: 0.9, intentos: 3, aciertos: 3, ultima: AHORA }
    expect(dominioEfectivo(e, AHORA + 21 * DIA)).toBeCloseTo(0.45, 2)
    expect(nivelLetra(e, AHORA + 21 * DIA)).toBe('repasar')
  })
  it('recomienda primero lo que cuesta, luego repasar y luego nuevas parecidas a las dominadas', () => {
    const dominio: Dominio = {
      A: { p: 0.95, intentos: 4, aciertos: 4, ultima: AHORA },
      R: { p: 0.2, intentos: 5, aciertos: 1, ultima: AHORA },
      B: { p: 0.95, intentos: 4, aciertos: 4, ultima: AHORA - 40 * DIA },
    }
    const r = recomendar(dominio, LSM, 6, AHORA)
    expect(r[0].letra).toBe('R')
    expect(r[0].motivo).toContain('fallaste 4 de 5')
    expect(r.map((x) => x.letra)).toContain('B')
    expect(r.find((x) => x.letra === 'B')!.motivo).toContain('repasar')
    expect(r.map((x) => x.letra)).not.toContain('A') // dominada
    expect(r.some((x) => x.motivo.includes('se parece a la'))).toBe(true)
  })
  it('sin datos, todo es «nueva»', () => {
    expect(recomendar({}, LSM, 3, AHORA).every((r) => r.motivo.startsWith('Nueva'))).toBe(true)
    expect(P_INICIAL).toBe(0.1)
  })
})

describe('autocorrector', () => {
  const formas = formasDe(LSM)
  const vocab = vocabularioCon(VOCABULARIO.LSM, {})

  it('cambiar letras de forma parecida cuesta menos que letras muy distintas', () => {
    expect(costoCambio('U', 'V', formas)).toBeLessThan(costoCambio('A', 'L', formas))
    expect(costoCambio('A', 'A', formas)).toBe(0)
  })
  it('una letra repetida que faltó cuesta poco («CALE» → «CALLE»)', () => {
    expect(distanciaSenas('CALE', 'CALLE', formas)).toBe(0.5)
  })
  it('corrige solo cuando está seguro', () => {
    const c = corregir('HOLS', vocab, formas)!
    expect(c.sugerida).toBe('HOLA')
    expect(c.automatica).toBe(true)
    expect(corregir('GRACIAZ', vocab, formas)?.sugerida).toBe('GRACIAS')
  })
  it('no toca palabras que ya existen ni palabras muy lejanas', () => {
    expect(corregir('HOLA', vocab, formas)).toBeNull()
    expect(corregir('XQZWT', vocab, formas)).toBeNull()
  })
  it('aprende: una palabra del usuario ya no se corrige', () => {
    const conPropia = vocabularioCon(VOCABULARIO.LSM, { HOLS: 3 })
    expect(corregir('HOLS', conPropia, formas)).toBeNull()
  })
  it('apagado, solo sugiere', () => {
    expect(corregir('HOLS', vocab, formas, false)?.automatica).toBe(false)
  })
  it('regla autocorregir: a ∧ ¬v ∧ c ∧ u', () => {
    expect(cumple('autocorregir', { a: true, v: false, c: true, u: true })).toBe(true)
    expect(cumple('autocorregir', { a: true, v: true, c: true, u: true })).toBe(false)
    expect(cumple('autocorregir', { a: true, v: false, c: true, u: false })).toBe(false)
  })
})

describe('modelo de IA del usuario', () => {
  it('guarda como máximo 25 posturas por letra (las más recientes)', () => {
    let m = MODELO_VACIO
    for (let i = 0; i < 30; i++) m = conMuestras(m, 'A', [[i]])
    expect(m.muestras.A).toHaveLength(MAX_MUESTRAS_LETRA)
    expect(m.muestras.A.at(-1)).toEqual([29])
    expect(muestrasNuevas(m)).toBe(25)
  })
  it('precisión del autocorrector = correcciones no deshechas', () => {
    expect(precisionCorrector(MODELO_VACIO)).toBeNull()
    expect(precisionCorrector({ ...MODELO_VACIO, corrector: { aplicadas: 4, deshechas: 1, palabras: {} } })).toBe(0.75)
  })
  it('regla reentrenar: ¬e ∧ (n ∨ m)', () => {
    expect(cumple('reentrenarRed', { e: false, n: true, m: false })).toBe(true)
    expect(cumple('reentrenarRed', { e: false, n: false, m: true })).toBe(true)
    expect(cumple('reentrenarRed', { e: true, n: true, m: true })).toBe(false)
    expect(cumple('reentrenarRed', { e: false, n: false, m: false })).toBe(false)
  })
})
