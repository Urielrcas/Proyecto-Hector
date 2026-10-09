// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un resultado sea el esperado
//     it → define una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     mano → atajo para describir la forma de una mano: mano('EDDD', 'estirado')
//     Movimiento → tipo: el movimiento de una letra (j, z, arriba, lados, frente)
import { mano, type Movimiento } from '../aprendizaje/forma'
// ▸ Desde nuestro proyecto: src/lib/vision/manoSintetica.ts:
//     manoSintetica → crea una mano falsa (solo para pruebas)
//     mover → mueve o agranda una mano falsa (solo para pruebas)
import { manoSintetica, mover } from './manoSintetica'
// ▸ Desde nuestro proyecto: src/lib/vision/movimiento.ts:
//     cambiosDeSentido → cuenta cuántas veces cambia de dirección un movimiento
//     DetectorMovimiento → sigue la mano unos segundos y reconoce movimientos (J, Z, Ñ...)
import { cambiosDeSentido, DetectorMovimiento } from './movimiento'

// Una "palma" en las manos sintéticas mide ~0.3 de la imagen.
const P = 0.3

/** Recorre una trayectoria (lista de puntos [dx, dy, escala]) interpolando cuadros a 30 fps. */
function simular(tipo: Movimiento, trayectoria: [number, number, number?][], cuadrosPorTramo = 8) {
  const base = manoSintetica(mano('EEDD', 'sobre'))
  const detector = new DetectorMovimiento(tipo)
  let t = 0
  for (let i = 0; i < trayectoria.length - 1; i++) {
    const [x1, y1, e1 = 1] = trayectoria[i]
    const [x2, y2, e2 = 1] = trayectoria[i + 1]
    for (let k = 0; k < cuadrosPorTramo; k++) {
      const f = k / cuadrosPorTramo
      detector.agregar(mover(base, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, e1 + (e2 - e1) * f), t)
      t += 33
    }
  }
  return detector.detectado()
}

const QUIETA: [number, number][] = [
  [0, 0],
  [0.005, 0.003],
  [-0.004, 0.002],
  [0.003, -0.004],
  [0, 0],
]

describe('cambiosDeSentido', () => {
  it('cuenta vaivenes e ignora temblores', () => {
    expect(cambiosDeSentido([0, 1, 2, 1, 0, 1, 2], 0.5)).toBe(2)
    expect(cambiosDeSentido([0, 0.1, 0, 0.1, 0], 0.5)).toBe(0)
  })
})

describe('DetectorMovimiento', () => {
  it('K: detecta la muñeca hacia arriba', () => {
    expect(simular('arriba', [[0, 0], [0, -0.6 * P]])).toBe(true)
    expect(simular('arriba', [[0, 0], [0, 0.6 * P]])).toBe(false) // hacia abajo no cuenta
  })

  it('Ñ y Q: detecta la muñeca de un lado a otro', () => {
    expect(simular('lados', [[0, 0], [0.2 * P, 0], [-0.2 * P, 0], [0.2 * P, 0]])).toBe(true)
    expect(simular('lados', [[0, 0], [0.4 * P, 0]])).toBe(false) // solo hacia un lado, sin regresar
  })

  it('X: detecta la mano al frente y de regreso', () => {
    expect(simular('frente', [[0, 0, 1], [0, 0, 1.25], [0, 0, 1]])).toBe(true)
  })

  it('J: detecta bajar y curvar', () => {
    expect(simular('j', [[0, 0], [0, 0.5 * P], [-0.25 * P, 0.55 * P]])).toBe(true)
    expect(simular('j', [[0, 0], [0, 0.5 * P]])).toBe(false) // baja pero no se curva
  })

  it('Z: detecta el trazo en zigzag hacia abajo', () => {
    expect(
      simular('z', [
        [0, 0],
        [0.4 * P, 0],
        [0, 0.4 * P],
        [0.4 * P, 0.4 * P],
      ]),
    ).toBe(true)
    expect(simular('z', [[0, 0], [0.4 * P, 0]])).toBe(false) // una sola raya
  })

  it('no detecta nada si la mano está quieta', () => {
    for (const tipo of ['j', 'z', 'arriba', 'lados', 'frente'] as const) expect(simular(tipo, QUIETA), tipo).toBe(false)
  })
})
