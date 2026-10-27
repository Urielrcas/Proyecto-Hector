/**
 * DE LOS 21 PUNTOS DE LA MANO A UNA IMAGEN DE 28×28 (entrada de la red convolucional)
 *
 * En vez de usar la foto de la cámara (que cambia con la luz, el fondo y el color de piel),
 * se dibuja el ESQUELETO de la mano: los huesos son líneas entre los 21 puntos de MediaPipe.
 * Cada dedo se pinta con un tono de gris distinto (pulgar el más claro, meñique el más oscuro),
 * así la red puede distinguir qué dedo es cuál, como si fueran colores.
 *
 * La mano se centra y se escala para ocupar el cuadro, así no importa qué tan lejos esté de la cámara.
 */
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     Punto → tipo: un punto de la mano (x, y)
import type { Punto } from '../../vision/postura'

export const LADO = 28

/** Huesos de la mano (pares de puntos de MediaPipe) y su tono (1 = blanco). */
const HUESOS: [number, number, number][] = [
  // pulgar
  [0, 1, 1],
  [1, 2, 1],
  [2, 3, 1],
  [3, 4, 1],
  // índice
  [5, 6, 0.85],
  [6, 7, 0.85],
  [7, 8, 0.85],
  // medio
  [9, 10, 0.7],
  [10, 11, 0.7],
  [11, 12, 0.7],
  // anular
  [13, 14, 0.55],
  [14, 15, 0.55],
  [15, 16, 0.55],
  // meñique
  [17, 18, 0.42],
  [18, 19, 0.42],
  [19, 20, 0.42],
  // palma
  [0, 5, 0.3],
  [5, 9, 0.3],
  [9, 13, 0.3],
  [13, 17, 0.3],
  [0, 17, 0.3],
]

/** Grosor de los trazos en píxeles. */
const GROSOR = 1.1

/** Distancia de un punto (px, py) al segmento a–b. */
function distanciaSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const largo2 = dx * dx + dy * dy
  const t = largo2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Dibuja el esqueleto de la mano en una imagen de LADO×LADO (valores de 0 a 1). */
export function imagenDeMano(puntos: Punto[], lado = LADO): Float32Array {
  const img = new Float32Array(lado * lado)
  // Centrar y escalar: la parte más larga de la mano ocupa el 82 % del cuadro.
  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const escala = (0.82 * lado) / Math.max(maxX - minX, maxY - minY, 1e-6)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const aPixel = (p: Punto) => [(p.x - cx) * escala + lado / 2, (p.y - cy) * escala + lado / 2] as const

  for (const [a, b, tono] of HUESOS) {
    const [ax, ay] = aPixel(puntos[a])
    const [bx, by] = aPixel(puntos[b])
    // Solo se revisan los píxeles cercanos al hueso.
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - 2))
    const x1 = Math.min(lado - 1, Math.ceil(Math.max(ax, bx) + 2))
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - 2))
    const y1 = Math.min(lado - 1, Math.ceil(Math.max(ay, by) + 2))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = distanciaSegmento(x + 0.5, y + 0.5, ax, ay, bx, by)
        const valor = tono * Math.max(0, 1 - d / GROSOR)
        if (valor > img[y * lado + x]) img[y * lado + x] = valor
      }
    }
  }
  return img
}

/** Los 21 puntos reducidos a lo esencial (para guardar muestras): x, y relativos a la muñeca, con 3 decimales. */
export function comprimirPuntos(puntos: Punto[]): number[] {
  return puntos.flatMap((p) => [Math.round((p.x - puntos[0].x) * 1000) / 1000, Math.round((p.y - puntos[0].y) * 1000) / 1000])
}

export function descomprimirPuntos(datos: number[]): Punto[] {
  const puntos: Punto[] = []
  for (let i = 0; i + 1 < datos.length; i += 2) puntos.push({ x: 0.5 + datos[i], y: 0.5 + datos[i + 1] })
  return puntos
}
