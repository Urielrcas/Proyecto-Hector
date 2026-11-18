/**
 * GRUPOS DE SEÑAS PARECIDAS (prácticas 07, 08 y 09, calculadas en Python)
 *
 *   - grupos.json ← ml/p07_kmeans_manos.py (K-Means: qué letras tienen una forma de mano parecida)
 *                   + ml/p08_analisis_clusters.py (sección «analisis»: estabilidad, escaladores, atípicas)
 *   - pca.json    ← ml/p09_pca_manos.py (las manos resumidas en 2 dimensiones para dibujarlas)
 *
 * La app los usa en «IA por dentro» (gráficas) y al practicar una letra («se parece a…»).
 * Los grupos salieron de manos de LSM, así que el aviso solo se muestra en LSM.
 */
import gruposJson from './grupos.json'
import pcaJson from './pca.json'

export type EstadoDedo = 'estirado' | 'curvo' | 'doblado'

export interface Grupo {
  id: number
  nombre: string
  descripcion: string
  dedos: Record<'indice' | 'medio' | 'anular' | 'menique', EstadoDedo>
  manos: number
  giroPromedio: number
  /** Las letras cuya mayoría de manos cayó en este grupo, y qué porcentaje. */
  letras: { letra: string; porcentaje: number }[]
}

// «as unknown as»: el JSON lo escribe Python; aquí solo le decimos a TypeScript su forma.
export const GRUPOS = gruposJson as unknown as {
  fecha: string
  manos: number
  medidas: number
  k: number
  kUtil: [number, number]
  codo: { k: number; inercia: number; silueta: number }[]
  silueta: number
  grupos: Grupo[]
  letras: Record<string, { grupo: number; porcentaje: number; parecidas: string[] }>
  divididas: string[]
  analisis: {
    inicializaciones: { init: string; inerciaPromedio: number; inerciaDesviacion: number; iteraciones: number; silueta: number }[]
    empateInicializacion: boolean
    escaladores: { escalador: string; silueta: number; pureza: number }[]
    ariEscaladores: number
    estabilidad: { semillas: number[]; promedio: number; minimo: number; veredicto: string }
    parecidos: { a: number; b: number; distancia: number }[]
    siluetaGrupo: { grupo: number; silueta: number; negativas: number }[]
    atipicas: { percentil: number; umbral: number; total: number; giroAtipicas: number; giroNormales: number; porLetra: { letra: string; manos: number }[] }
  }
}

export const PCA = pcaJson as {
  fecha: string
  dimensiones: number
  varianza: number[]
  acumulada: number[]
  necesarias: Record<'80' | '90' | '95', number>
  sinEscalarCP1: number
  cargas: Record<'CP1' | 'CP2', { medida: string; carga: number }[]>
  reconstruccion: { componentes: number; error: number; varianza: number }[]
  letras: string[]
  puntos: { x: number[]; y: number[]; grupo: number[]; letra: number[] }
  centros: { grupo: number; x: number; y: number }[]
}

/** Un color por grupo (los mismos que las gráficas de Python). */
export const COLORES_GRUPO = ['#15803d', '#7c3aed', '#0369a1', '#a8a29e', '#b91c1c', '#d97706', '#0d9488', '#db2777', '#4d7c0f', '#6366f1', '#78716c', '#0891b2']

/**
 * Las letras con forma de mano parecida a esta (las que K-Means puso en su mismo grupo).
 * En los datos algunas letras comparten forma y vienen juntas («I/J», «N/Ñ»): se buscan por partes.
 */
export function letrasParecidas(letra: string): string[] {
  const clave = Object.keys(GRUPOS.letras).find((k) => k.split('/').includes(letra))
  if (!clave) return []
  const gemelas = clave.split('/').filter((l) => l !== letra)
  return [...gemelas, ...GRUPOS.letras[clave].parecidas]
}
