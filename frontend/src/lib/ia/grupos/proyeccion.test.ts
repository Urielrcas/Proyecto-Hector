import { describe, expect, it } from 'vitest'
import { alfabeto } from '../../aprendizaje/alfabeto'
import { esqueleto, giroDeForma, poseDeForma, rotar } from '../../avatar/mano3d'
import type { FormaMano } from '../../aprendizaje/forma'
import type { Punto } from '../../vision/postura'
import { claseDeLetra, familiaDeLetra } from './grupos'
import { centrosDeLetras, proyectarMano } from './proyeccion'

/** Una mano de la mano 3D del avatar haciendo la forma (la misma con la que se entrenó el mapa, sin variaciones). */
function manoDelAvatar(forma: FormaMano): Punto[] {
  const base = giroDeForma(forma)
  return esqueleto(poseDeForma(forma)).map((p) => {
    const q = rotar(p, base)
    return { x: 0.5 - q.x * 0.24, y: 0.6 - q.y * 0.24, z: -q.z * 0.24 }
  })
}

describe('poner una mano en el mapa PCA', () => {
  it('una mano de cada forma cae cerca de letras de su mismo grupo', () => {
    const letras = alfabeto('LSM')
    const centros = centrosDeLetras()
    let aciertos = 0
    const probadas = ['A', 'B', 'C', 'L', 'U', 'Y', 'O', 'W']
    for (const l of probadas) {
      const forma = letras.find((x) => x.letra === l)!.forma
      const p = proyectarMano(manoDelAvatar(forma))
      expect(p).not.toBeNull()
      const cercana = [...centros].sort((a, b) => Math.hypot(a.x - p![0], a.y - p![1]) - Math.hypot(b.x - p![0], b.y - p![1]))[0]
      if (familiaDeLetra(cercana.letra, 4) === familiaDeLetra(claseDeLetra(l), 4)) aciertos++
    }
    // El mapa de 2 dimensiones solo guarda el 37 % de la información: basta con que la mayoría acierte el grupo.
    expect(aciertos).toBeGreaterThanOrEqual(probadas.length - 2)
  })
})
