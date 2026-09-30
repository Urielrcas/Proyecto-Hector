/**
 * Detecta el movimiento de las letras dinámicas (J, K, Ñ, Q, X, Z) siguiendo
 * un punto de la mano durante los últimos segundos.
 *
 * Las distancias se miden en "palmas" (muñeca → nudillo del medio), así que no
 * importa qué tan cerca de la cámara esté la mano.
 */
import type { Movimiento } from '../aprendizaje/forma'
import type { Punto } from './postura'

interface Muestra {
  t: number
  x: number
  y: number
  palma: number
}

/** Punto que se sigue en cada movimiento. */
const PUNTO: Record<Movimiento, number> = {
  j: 20, // punta del meñique
  z: 8, // punta del índice
  arriba: 8, // punta del índice (la muñeca gira hacia arriba)
  lados: 9, // nudillo del medio (la muñeca se mueve a los lados)
  frente: 9, // nudillo del medio (la mano va al frente y regresa)
}

export const INSTRUCCION_MOVIMIENTO: Record<Movimiento, string> = {
  j: 'Ahora dibuja una J en el aire con el meñique.',
  z: 'Ahora dibuja una Z en el aire con el índice.',
  arriba: 'Ahora mueve la muñeca hacia arriba.',
  lados: 'Ahora mueve la muñeca de un lado a otro.',
  frente: 'Ahora mueve la mano al frente y de regreso.',
}

/** Cuántas veces cambia de sentido una serie, ignorando temblores menores que `umbral`. */
export function cambiosDeSentido(serie: number[], umbral: number): number {
  if (serie.length === 0) return 0
  let cambios = 0
  let sentido = 0
  const inicio = serie[0]
  let extremo = serie[0]
  for (const v of serie) {
    if (sentido === 0) {
      if (Math.abs(v - inicio) > umbral) {
        sentido = Math.sign(v - inicio)
        extremo = v
      }
    } else if ((v - extremo) * sentido > 0) {
      extremo = v // sigue en el mismo sentido
    } else if (Math.abs(v - extremo) > umbral) {
      cambios++
      sentido = -sentido
      extremo = v
    }
  }
  return cambios
}

const rango = (s: number[]) => Math.max(...s) - Math.min(...s)

export class DetectorMovimiento {
  private muestras: Muestra[] = []
  private readonly tipo: Movimiento
  private readonly ventanaMs: number

  constructor(tipo: Movimiento, ventanaMs = 2500) {
    this.tipo = tipo
    this.ventanaMs = ventanaMs
  }

  agregar(p: Punto[], t: number) {
    const q = p[PUNTO[this.tipo]]
    this.muestras.push({ t, x: q.x, y: q.y, palma: Math.hypot(p[9].x - p[0].x, p[9].y - p[0].y) })
    while (this.muestras.length && t - this.muestras[0].t > this.ventanaMs) this.muestras.shift()
  }

  reiniciar() {
    this.muestras = []
  }

  detectado(): boolean {
    if (this.muestras.length < 8) return false
    const unidad = this.muestras.reduce((s, m) => s + m.palma, 0) / this.muestras.length || 1
    const xs = this.muestras.map((m) => m.x / unidad)
    const ys = this.muestras.map((m) => m.y / unidad) // y crece hacia abajo
    const palmas = this.muestras.map((m) => m.palma / unidad)

    switch (this.tipo) {
      case 'arriba': {
        // El punto sube (y disminuye) al menos 0.35 palmas.
        let minimoHastaAhora = Infinity
        let subida = 0
        for (let i = ys.length - 1; i >= 0; i--) {
          minimoHastaAhora = Math.min(minimoHastaAhora, ys[i])
          subida = Math.max(subida, ys[i] - minimoHastaAhora)
        }
        return subida > 0.35
      }
      case 'lados':
        return rango(xs) > 0.25 && cambiosDeSentido(xs, 0.1) >= 1
      case 'frente':
        // Al acercarse a la cámara la mano "crece"; o se desplaza y regresa.
        return (
          (rango(palmas) > 0.12 && cambiosDeSentido(palmas, 0.05) >= 1) ||
          (rango(xs) > 0.2 && cambiosDeSentido(xs, 0.08) >= 1) ||
          (rango(ys) > 0.2 && cambiosDeSentido(ys, 0.08) >= 1)
        )
      case 'j': {
        // Baja y, en la parte de abajo del trazo, se curva hacia un lado.
        const alto = Math.min(...ys)
        const bajo = Math.max(...ys)
        const fondo = xs.filter((_, i) => ys[i] > bajo - (bajo - alto) * 0.3)
        return bajo - alto > 0.35 && rango(fondo) > 0.12
      }
      case 'z':
        // Dos cambios de sentido horizontales (→ ↙ →) mientras baja.
        return cambiosDeSentido(xs, 0.12) >= 2 && Math.max(...ys) - ys[0] > 0.2
    }
  }
}
