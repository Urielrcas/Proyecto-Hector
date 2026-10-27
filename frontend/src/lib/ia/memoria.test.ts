import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { cumple } from '../logica/reglas'
import { manoSintetica } from '../vision/manoSintetica'
import { evaluar } from '../vision/postura'
import { aumentar } from './cnn/datos'
import { comprimirPuntos } from './cnn/imagen'
import { generadorAzar } from './cnn/red'
import { compararConLetra, crearMemoria, distancia, pareceOtraLetra, reconocerPersonal, vectorDeMano } from './memoria'

const LSM = alfabeto('LSM')
const A = LSM.find((l) => l.letra === 'A')!

// «Mi A»: a la persona le cuesta doblar el índice, le queda curvo (no como en el dibujo).
const formaRara = { ...A.forma, dedos: { ...A.forma.dedos, indice: 'curvo' as const } }
const manoRara = manoSintetica(formaRara)

describe('vector de la mano', () => {
  it('no depende de dónde esté la mano ni de qué tan lejos', () => {
    const lejos = manoRara.map((p) => ({ x: 0.1 + p.x * 0.5, y: 0.2 + p.y * 0.5 }))
    expect(distancia(vectorDeMano(manoRara), vectorDeMano(lejos))).toBeLessThan(1e-9)
  })
})

describe('memoria de tus señas', () => {
  const azar = generadorAzar(11)
  // La persona enseña su forma: 10 posturas con un poco de variación natural.
  const enseñadas = Array.from({ length: 10 }, () => comprimirPuntos(aumentar(manoRara, azar, 0.35)))
  const memoria = crearMemoria(LSM, { A: enseñadas })

  it('(premisa) las reglas generales no aceptan esa A', () => {
    expect(evaluar(manoRara, A.objetivo).correcto).toBe(false)
  })

  it('sin memoria, tampoco la acepta la IA', () => {
    expect(compararConLetra(manoRara, 'A', crearMemoria(LSM, {})).aceptada).toBe(false)
  })

  it('después de enseñarla, la acepta aunque la haga un poco distinta cada vez', () => {
    let aceptadas = 0
    for (let i = 0; i < 20; i++) if (compararConLetra(aumentar(manoRara, azar, 0.35), 'A', memoria).aceptada) aceptadas++
    expect(aceptadas).toBeGreaterThanOrEqual(18)
  })

  it('SEGURIDAD: ninguna otra letra hecha como en el dibujo se acepta como «tu A»', () => {
    for (const l of LSM) {
      if (l.letra === 'A') continue
      const c = compararConLetra(manoSintetica(l.forma), 'A', memoria)
      expect(c.aceptada, `la ${l.letra} no debe contar como A`).toBe(false)
    }
  })

  it('en el traductor (sin saber la letra) reconoce tu A', () => {
    expect(reconocerPersonal(aumentar(manoRara, azar, 0.3), memoria)?.letra).toBe('A')
    expect(reconocerPersonal(manoSintetica(LSM.find((l) => l.letra === 'L')!.forma), memoria)).toBeNull()
  })

  it('avisa si lo que vas a enseñar como A es en realidad otra letra', () => {
    const B = LSM.find((l) => l.letra === 'B')!
    const posturasDeB = Array.from({ length: 6 }, () => aumentar(manoSintetica(B.forma), azar, 0.2))
    expect(pareceOtraLetra(posturasDeB, 'A', memoria)).toBe('B')
    expect(pareceOtraLetra([manoRara, manoRara], 'A', memoria)).toBeNull()
  })
})

describe('reglas de la forma personal', () => {
  it('formaPersonal: p ∧ c ∧ u', () => {
    expect(cumple('formaPersonal', { p: true, c: true, u: true })).toBe(true)
    expect(cumple('formaPersonal', { p: true, c: true, u: false })).toBe(false) // se parece igual a otra letra
    expect(cumple('formaPersonal', { p: false, c: true, u: true })).toBe(false)
  })
  it('formaAceptada: g ∨ (p ∧ c ∧ u)', () => {
    expect(cumple('formaAceptada', { g: true, p: false, c: false, u: false })).toBe(true) // como el dibujo
    expect(cumple('formaAceptada', { g: false, p: true, c: true, u: true })).toBe(true) // tu forma
    expect(cumple('formaAceptada', { g: false, p: true, c: false, u: true })).toBe(false)
  })
})
