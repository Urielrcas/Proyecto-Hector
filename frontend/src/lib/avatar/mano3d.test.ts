import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { evaluar } from '../vision/postura'
import { esqueleto, giroDeForma, mezclarPoses, movimientoEn, poseDeForma, POSE_REPOSO, proyectar, rotar } from './mano3d'

/** La mano del avatar vista de frente, como la vería la cámara (coordenadas de MediaPipe). */
function comoLaVeLaCamara(forma: Parameters<typeof poseDeForma>[0]) {
  const g = giroDeForma(forma)
  return esqueleto(poseDeForma(forma))
    .map((p) => rotar(p, g))
    .map((p) => ({ x: 0.5 - p.x * 0.25, y: 0.75 - p.y * 0.25, z: -p.z * 0.25 }))
}

describe('avatar 3D', () => {
  it('el evaluador de la cámara reconoce casi todas las letras que hace el avatar', () => {
    for (const [lengua, minimo] of [['LSM', 25], ['ASL', 23]] as const) {
      const bien = alfabeto(lengua).filter((l) => evaluar(comoLaVeLaCamara(l.forma), l.objetivo).correcto)
      expect(bien.length, lengua).toBeGreaterThanOrEqual(minimo)
    }
  })

  it('la mano tiene 21 puntos y los dedos miden lo mismo en cualquier pose', () => {
    const largo = (a: { x: number; y: number; z: number }, b: typeof a) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
    const abierta = esqueleto(poseDeForma(alfabeto('LSM').find((l) => l.letra === 'B')!.forma))
    const puno = esqueleto(poseDeForma(alfabeto('LSM').find((l) => l.letra === 'A')!.forma))
    expect(abierta).toHaveLength(21)
    expect(largo(abierta[9], abierta[10])).toBeCloseTo(largo(puno[9], puno[10]), 5)
  })

  it('pasa suave de una pose a otra y el movimiento regresa a su lugar', () => {
    const b = poseDeForma(alfabeto('LSM').find((l) => l.letra === 'B')!.forma)
    expect(mezclarPoses(POSE_REPOSO, b, 0)).toEqual(POSE_REPOSO)
    expect(mezclarPoses(POSE_REPOSO, b, 1).dedos.indice.mcp).toBeCloseTo(b.dedos.indice.mcp)
    const { mover } = movimientoEn('frente', 1)
    expect(Math.abs(mover.z)).toBeLessThan(1e-9)
  })

  it('en la proyección, lo que está más cerca se ve más grande', () => {
    const c = { distancia: 5, escala: 100, centro: { x: 0, y: 0 } }
    expect(proyectar({ x: 1, y: 0, z: 1 }, c).x).toBeGreaterThan(proyectar({ x: 1, y: 0, z: -1 }, c).x)
  })
})
