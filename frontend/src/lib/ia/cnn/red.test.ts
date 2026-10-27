import { describe, expect, it } from 'vitest'
import { alfabeto } from '../../aprendizaje/alfabeto'
import { manoSintetica } from '../../vision/manoSintetica'
import { clasesDe, datosDelUsuario, datosSinteticos, entrenar, evaluarRed } from './datos'
import { comprimirPuntos, imagenDeMano, LADO } from './imagen'
import { ARQUITECTURA_BASE, generadorAzar, indiceMayor, RedConvolucional, softmax } from './red'

describe('imagen del esqueleto', () => {
  it('es de 28×28 con valores entre 0 y 1 y algo dibujado', () => {
    const img = imagenDeMano(manoSintetica(alfabeto('LSM')[0].forma))
    expect(img.length).toBe(LADO * LADO)
    expect(Math.max(...img)).toBeLessThanOrEqual(1)
    expect(img.filter((v) => v > 0.3).length).toBeGreaterThan(30)
  })
  it('no cambia si la mano está más lejos o en otro lugar (se centra y escala)', () => {
    const p = manoSintetica(alfabeto('LSM')[1].forma)
    const lejos = p.map((q) => ({ x: 0.2 + q.x * 0.5, y: 0.1 + q.y * 0.5 }))
    const a = imagenDeMano(p)
    const b = imagenDeMano(lejos)
    const dif = a.reduce((t, v, i) => t + Math.abs(v - b[i]), 0)
    expect(dif).toBeLessThan(1)
  })
})

describe('clases', () => {
  it('las letras que solo cambian por el movimiento comparten clase', () => {
    const clases = clasesDe(alfabeto('LSM'))
    const conI = clases.find((c) => c.letras.includes('I'))!
    expect(conI.letras[0]).toBe('I') // primero la que no lleva movimiento
    expect(clases.flatMap((c) => c.letras).length).toBe(alfabeto('LSM').length)
  })
})

describe('red convolucional', () => {
  it('softmax da probabilidades que suman 1', () => {
    const p = softmax(new Float32Array([1, 2, 3]))
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    expect(indiceMayor(p)).toBe(2)
  })

  it('aprende a reconocer las formas del alfabeto (datos que no vio al entrenar)', () => {
    const letras = alfabeto('LSM')
    const clases = clasesDe(letras)
    const red = new RedConvolucional({ ...ARQUITECTURA_BASE, clases: clases.length }, 7)
    const entrenamiento = datosSinteticos(letras, clases, 24, generadorAzar(1))
    const validacion = datosSinteticos(letras, clases, 6, generadorAzar(99))
    const antes = evaluarRed(red, validacion)
    const historia = entrenar(red, entrenamiento, validacion, { epocas: 6, azar: generadorAzar(3) })
    const despues = historia.at(-1)!.validacion
    expect(historia.at(-1)!.perdida).toBeLessThan(historia[0].perdida)
    expect(despues).toBeGreaterThan(0.85)
    expect(despues).toBeGreaterThan(antes)
  }, 120_000)

  it('guarda y recupera sus pesos', () => {
    const red = new RedConvolucional({ ...ARQUITECTURA_BASE, clases: 5 }, 1)
    const otra = new RedConvolucional({ ...ARQUITECTURA_BASE, clases: 5 }, 2)
    const img = imagenDeMano(manoSintetica(alfabeto('LSM')[2].forma))
    expect(otra.importar(red.exportar())).toBe(true)
    expect(Array.from(otra.predecir(img))).toEqual(Array.from(red.predecir(img)))
    expect(new RedConvolucional({ ...ARQUITECTURA_BASE, clases: 6 }).importar(red.exportar())).toBe(false)
    expect(otra.importar('basura')).toBe(false)
  })

  it('las muestras del usuario pesan más y se aumentan', () => {
    const letras = alfabeto('LSM')
    const clases = clasesDe(letras)
    const muestra = comprimirPuntos(manoSintetica(letras[0].forma))
    const d = datosDelUsuario({ A: [muestra] }, clases, generadorAzar(), 3, 3)
    expect(d.imagenes).toHaveLength(3)
    expect(d.pesos).toEqual([3, 3, 3])
  })
})
