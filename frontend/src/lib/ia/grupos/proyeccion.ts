/**
 * PONER UNA MANO EN EL MAPA PCA (Mi IA → «Tu mano en el mapa»)
 * Las mismas cuentas que hizo Python (ml/p09_pca_manos.py) con las 57 medidas de una mano:
 *   z = (medida − media) / escala   →   coordenadas = z · componentes
 */
import type { Punto } from '../../vision/postura'
import { caracteristicas, NOMBRES_CARACTERISTICAS } from '../arbol/caracteristicas'
import { PCA } from './grupos'

/** Las 2 coordenadas PCA de una mano (null si falta alguna medida). */
export function proyectarMano(puntos: Punto[]): [number, number] | null {
  const valores = caracteristicas(puntos)
  const porNombre = new Map(NOMBRES_CARACTERISTICAS.map((n, i) => [n, valores[i]]))
  const { medidas, media, escala, componentes } = PCA.proyeccion
  const z = medidas.map((m, i) => ((porNombre.get(m) ?? NaN) - media[i]) / escala[i])
  if (z.some((v) => !Number.isFinite(v))) return null
  return [componentes[0].reduce((s, c, i) => s + c * z[i], 0), componentes[1].reduce((s, c, i) => s + c * z[i], 0)]
}

/** El centro de cada letra en el mapa (promedio de sus manos de muestra). */
export function centrosDeLetras(): { letra: string; x: number; y: number }[] {
  const { x, y, letra } = PCA.puntos
  return PCA.letras.map((l, li) => {
    const idx = letra.map((v, i) => (v === li ? i : -1)).filter((i) => i >= 0)
    return { letra: l, x: idx.reduce((s, i) => s + x[i], 0) / idx.length, y: idx.reduce((s, i) => s + y[i], 0) / idx.length }
  })
}

/** Rango del dibujo sin las manos más extremas (2 % de cada lado), con un margen. */
export function rangoSinExtremos(v: number[]): [number, number] {
  const orden = [...v].sort((a, b) => a - b)
  const lo = orden[Math.floor(orden.length * 0.02)]
  const hi = orden[Math.ceil(orden.length * 0.98) - 1]
  const margen = (hi - lo) * 0.12 || 1
  return [lo - margen, hi + margen]
}
