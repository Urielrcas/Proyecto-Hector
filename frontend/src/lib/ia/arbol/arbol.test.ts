import { describe, expect, it } from 'vitest'
import { alfabeto } from '../../aprendizaje/alfabeto'
import { esqueleto, giroDeForma, poseDeForma, rotar } from '../../avatar/mano3d'
import { clasesDe } from '../cnn/datos'
import { METRICAS_ARBOL, predecirConArbol } from './arbol'
import { caracteristicas, NOMBRES_CARACTERISTICAS } from './caracteristicas'
import modelo from './modelo.json'

const letras = alfabeto('LSM')
const clases = clasesDe(letras)

/** La mano del avatar haciendo la letra, de frente y sin variaciones. */
function manoLimpia(letra: string) {
  const forma = letras.find((l) => l.letra === letra)!.forma
  const base = giroDeForma(forma)
  return esqueleto(poseDeForma(forma)).map((p) => {
    const q = rotar(p, base)
    return { x: 0.5 - q.x * 0.25, y: 0.6 - q.y * 0.25, z: -q.z * 0.25 }
  })
}

describe('árbol de decisión', () => {
  it('se entrenó con las mismas medidas que calcula la app', () => {
    expect(modelo.medidas).toEqual(NOMBRES_CARACTERISTICAS)
    expect(caracteristicas(manoLimpia('A'))).toHaveLength(NOMBRES_CARACTERISTICAS.length)
  })

  it('sabe todas las clases de LSM', () => {
    expect([...modelo.clases].sort()).toEqual(clases.map((c) => c.nombre).sort())
  })

  it('reconoce casi todas las letras hechas de frente por el avatar', () => {
    const aciertos = clases.filter((c) => predecirConArbol(manoLimpia(c.letras[0])).nombre === c.nombre)
    expect(aciertos.length / clases.length).toBeGreaterThanOrEqual(0.8)
  })

  it('siempre llega a una hoja con su seguridad', () => {
    const p = predecirConArbol(manoLimpia('B'))
    expect(p.preguntas).toBeGreaterThan(0)
    expect(p.preguntas).toBeLessThanOrEqual(METRICAS_ARBOL.arbol.profundidad)
    expect(p.seguridad).toBeGreaterThan(0)
    expect(p.seguridad).toBeLessThanOrEqual(1)
  })

  it('en el examen le gana a las reglas fijas', () => {
    expect(METRICAS_ARBOL.exactitud.arbol).toBeGreaterThan(METRICAS_ARBOL.exactitud.reglas)
  })

  it('la profundidad se eligió con la validación y el ganador es el de mejor F1 (prácticas 04 y 05)', () => {
    const mejor = Math.max(...METRICAS_ARBOL.profundidades.map((p) => p.validacion))
    const elegida = METRICAS_ARBOL.profundidades.find((p) => p.profundidad === METRICAS_ARBOL.profundidadElegida)!
    expect(elegida.validacion).toBeGreaterThanOrEqual(mejor - 0.005)
    expect(METRICAS_ARBOL.comparacion[0].modelo).toBe(METRICAS_ARBOL.ganador)
    const { entrenamiento, validacion, prueba, total } = METRICAS_ARBOL.manos
    expect(entrenamiento + validacion + prueba).toBe(total)
  })
})
