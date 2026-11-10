/**
 * LAS MEDIDAS DE UNA MANO (las columnas de la tabla para el machine learning)
 *
 * En las prácticas de clase cada estudiante era una fila con «horas de estudio», «asistencia»…
 * Aquí cada MANO es una fila, y estas son sus columnas. Se calculan igual al armar la tabla
 * de entrenamiento (ml/, en Python) y dentro de la app, para que el modelo vea lo mismo en los dos lados.
 *
 *   - 40 posiciones: dónde está cada punto de la mano (u = a lo ancho, v = a lo alto), con la
 *     muñeca como origen y la palma como unidad, así no importa qué tan cerca esté la mano.
 *   - 9 ángulos: qué tanto se dobla cada dedo en sus articulaciones (180 = recto).
 *   - 8 distancias: entre la punta del pulgar y las de los demás dedos, y de las puntas a la palma.
 */
import type { Punto } from '../../vision/postura'

const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y)

function angulo(a: Punto, b: Punto, c: Punto) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

const DEDOS = [
  ['indice', 5],
  ['medio', 9],
  ['anular', 13],
  ['menique', 17],
] as const

/** Los nombres de las columnas, en el orden del vector. */
export const NOMBRES_CARACTERISTICAS: string[] = [
  ...Array.from({ length: 20 }, (_, i) => [`p${i + 1}_u`, `p${i + 1}_v`]).flat(),
  ...DEDOS.flatMap(([d]) => [`angulo_${d}_medio`, `angulo_${d}_punta`]),
  'angulo_pulgar',
  'pulgar_a_indice',
  'pulgar_a_medio',
  'pulgar_a_menique',
  'pulgar_a_nudillo_indice',
  ...DEDOS.map(([d]) => `punta_${d}_a_palma`),
]

/**
 * Las medidas de una mano (puntos ya normalizados con normalizarMano, como los de la cámara).
 * Devuelve números con 4 decimales, en el orden de NOMBRES_CARACTERISTICAS.
 */
export function caracteristicas(p: Punto[]): number[] {
  // Marco de la mano: origen en la muñeca, «arriba» hacia el nudillo del medio, unidad = palma.
  const largo = dist(p[0], p[9]) || 1
  const palma = Math.max(largo, dist(p[5], p[17]) * 1.25)
  const arriba = { x: (p[9].x - p[0].x) / largo, y: (p[9].y - p[0].y) / largo }
  let ancho = { x: -arriba.y, y: arriba.x }
  if ((p[17].x - p[5].x) * ancho.x + (p[17].y - p[5].y) * ancho.y < 0) ancho = { x: -ancho.x, y: -ancho.y }
  const u = (q: Punto) => ((q.x - p[0].x) * ancho.x + (q.y - p[0].y) * ancho.y) / palma
  const v = (q: Punto) => ((q.x - p[0].x) * arriba.x + (q.y - p[0].y) * arriba.y) / palma
  const centro = {
    x: (p[0].x + p[5].x + p[9].x + p[13].x + p[17].x) / 5,
    y: (p[0].y + p[5].y + p[9].y + p[13].y + p[17].y) / 5,
  }

  const valores = [
    ...p.slice(1).flatMap((q) => [u(q), v(q)]),
    ...DEDOS.flatMap(([, m]) => [angulo(p[m], p[m + 1], p[m + 2]), angulo(p[m + 1], p[m + 2], p[m + 3])]),
    angulo(p[2], p[3], p[4]),
    dist(p[4], p[8]) / palma,
    dist(p[4], p[12]) / palma,
    dist(p[4], p[20]) / palma,
    dist(p[4], p[5]) / palma,
    ...DEDOS.map(([, m]) => dist(p[m + 3], centro) / palma),
  ]
  return valores.map((x) => Math.round(x * 10000) / 10000)
}
