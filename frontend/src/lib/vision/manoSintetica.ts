/**
 * Solo para pruebas: genera los 21 puntos de MediaPipe de una mano con la forma pedida,
 * de frente a la cámara (coordenadas normalizadas 0-1, y crece hacia abajo).
 */
import type { FormaMano } from '../aprendizaje/forma'
import { DEDOS_LARGOS, type Punto } from './postura'

const MUNECA = { x: 0.5, y: 0.9 }
const BASES = { indice: 0.42, medio: 0.48, anular: 0.54, menique: 0.6 }
const ABIERTOS = { indice: -0.07, medio: 0.05, anular: 0.09, menique: 0 }
const CRUZADOS = { indice: 0.09, medio: -0.09, anular: 0, menique: 0 }
const HUECOS = { 1: 0.45, 2: 0.51, 3: 0.57 }

export function manoSintetica(forma: FormaMano): Punto[] {
  const p: Punto[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))
  p[0] = { ...MUNECA }

  DEDOS_LARGOS.forEach((d, i) => {
    const base = 5 + i * 4
    const x = BASES[d]
    p[base] = { x, y: 0.6 }
    const estado = forma.dedos[d]
    if (estado === 'estirado') {
      const dx = forma.cruzados ? CRUZADOS[d] : forma.separados ? ABIERTOS[d] : 0
      p[base + 1] = { x: x + dx * 0.4, y: 0.5 }
      p[base + 2] = { x: x + dx * 0.7, y: 0.44 }
      p[base + 3] = { x: x + dx, y: 0.39 }
    } else if (estado === 'curvo') {
      p[base + 1] = { x, y: 0.5 }
      p[base + 2] = { x: x + 0.03, y: 0.46 }
      p[base + 3] = { x: x + 0.06, y: 0.48 }
    } else {
      p[base + 1] = { x, y: 0.52 }
      p[base + 2] = { x, y: 0.58 }
      p[base + 3] = { x, y: 0.63 }
    }
  })

  // Pulgar: base fija y punta según su posición.
  p[1] = { x: 0.4, y: 0.82 }
  let punta: Punto
  switch (forma.pulgar) {
    case 'estirado':
      punta = { x: 0.2, y: 0.68 }
      break
    case 'lado':
    case 'curvo':
      punta = { x: 0.37, y: 0.63 }
      break
    case 'toca': {
      const d = DEDOS_LARGOS.find((x) => forma.dedos[x] === 'curvo') ?? 'indice'
      const t = p[5 + DEDOS_LARGOS.indexOf(d) * 4 + 3]
      punta = { x: t.x - 0.02, y: t.y + 0.02 }
      break
    }
    case 'entre':
      punta = { x: HUECOS[forma.entre ?? 1], y: 0.57 }
      break
    case 'sobre':
      punta = { x: 0.5, y: 0.64 }
      break
    case 'doblado':
      punta = { x: 0.48, y: 0.72 }
      break
  }
  // Articulaciones intermedias en línea recta entre la base y la punta.
  p[2] = { x: p[1].x + (punta.x - p[1].x) / 3, y: p[1].y + (punta.y - p[1].y) / 3 }
  p[3] = { x: p[1].x + ((punta.x - p[1].x) * 2) / 3, y: p[1].y + ((punta.y - p[1].y) * 2) / 3 }
  p[4] = punta

  return girar(p, forma.giro ?? 0)
}

/** Gira la mano `grados` alrededor de la muñeca (sentido horario en pantalla). */
export function girar(p: Punto[], grados: number): Punto[] {
  const r = (grados * Math.PI) / 180
  const [c, s] = [Math.cos(r), Math.sin(r)]
  return p.map((q) => {
    const dx = q.x - MUNECA.x
    const dy = q.y - MUNECA.y
    return { x: MUNECA.x + dx * c - dy * s, y: MUNECA.y + dx * s + dy * c }
  })
}

/** Desplaza y escala una mano (para simular movimiento). */
export function mover(p: Punto[], dx: number, dy: number, escala = 1): Punto[] {
  return p.map((q) => ({ x: MUNECA.x + (q.x - MUNECA.x) * escala + dx, y: MUNECA.y + (q.y - MUNECA.y) * escala + dy }))
}
