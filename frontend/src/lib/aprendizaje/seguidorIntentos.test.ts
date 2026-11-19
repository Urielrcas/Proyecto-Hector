import { describe, expect, it } from 'vitest'
import type { Dedo } from '../vision/postura'
import { CUADROS_MINIMOS, CUADROS_POR_INTENTO, MS_SIN_MANO, SeguidorIntentos, type ResultadoIntento } from './seguidorIntentos'

const dedos = (mal: Dedo[] = []): Record<Dedo, boolean> => ({
  pulgar: !mal.includes('pulgar'),
  indice: !mal.includes('indice'),
  medio: !mal.includes('medio'),
  anular: !mal.includes('anular'),
  menique: !mal.includes('menique'),
})

function nuevo() {
  const resultados: ResultadoIntento[] = []
  return { seguidor: new SeguidorIntentos((r) => resultados.push(r)), resultados }
}

describe('SeguidorIntentos', () => {
  it('un intento logrado vale 100 y dura lo que tardó', () => {
    const { seguidor, resultados } = nuevo()
    for (let i = 0; i < 30; i++) seguidor.cuadro(dedos(['pulgar']), null, i * 33)
    seguidor.lograda(2000)
    expect(resultados).toEqual([{ acierto: true, puntaje: 100, segundos: 2, letraDetectada: null, dedosFallados: [] }])
  })

  it('después de ~5 s sin lograrla cierra un intento fallido con su mejor momento y la confusión', () => {
    const { seguidor, resultados } = nuevo()
    for (let i = 0; i < CUADROS_POR_INTENTO; i++) {
      const mal: Dedo[] = i === 40 ? ['pulgar'] : ['pulgar', 'indice', 'medio']
      seguidor.cuadro(dedos(mal), i % 2 ? 'A' : i % 5 ? null : 'S', i * 33)
    }
    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({ acierto: false, puntaje: 80, letraDetectada: 'A', dedosFallados: ['pulgar'] })
  })

  it('si la mano se va, cierra el intento; si fue un instante, no cuenta', () => {
    const { seguidor, resultados } = nuevo()
    for (let i = 0; i < 5; i++) seguidor.cuadro(dedos(['medio']), null, i * 33)
    seguidor.cuadro(null, null, 5 * 33 + MS_SIN_MANO + 1)
    expect(resultados).toHaveLength(0) // muy corto

    for (let i = 0; i < CUADROS_MINIMOS; i++) seguidor.cuadro(dedos(['medio']), null, 10000 + i * 33)
    seguidor.cuadro(null, null, 10000 + CUADROS_MINIMOS * 33 + MS_SIN_MANO + 1)
    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({ acierto: false, puntaje: 80, dedosFallados: ['medio'] })
  })

  it('reiniciar olvida el intento en curso', () => {
    const { seguidor, resultados } = nuevo()
    for (let i = 0; i < 60; i++) seguidor.cuadro(dedos(['anular']), null, i * 33)
    seguidor.reiniciar()
    seguidor.cuadro(null, null, 99999)
    expect(resultados).toHaveLength(0)
  })
})
