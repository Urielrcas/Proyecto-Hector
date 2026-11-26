/**
 * GRUPOS DE SEÑAS PARECIDAS (prácticas 07, 08 y 09, calculadas en Python)
 *
 *   - grupos.json ← ml/p07_kmeans_manos.py (K-Means: qué letras tienen una forma de mano parecida)
 *                   + ml/p08_analisis_clusters.py (sección «analisis»: estabilidad, escaladores, atípicas)
 *                   + ml/p08b_familias_senas.py (sección «familias»: agrupamiento jerárquico de las letras,
 *                     letras más parecidas y cómo se reparten sus manos entre los grupos)
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
  familias: Familias
}

/** Agrupamiento jerárquico (Ward) de las letras: de cada letra sola hasta todas juntas. */
export interface Familias {
  metodo: string
  /** Cuántas familias se muestran al abrir. */
  defecto: number
  /** Las 25 formas de letra, en el orden de «niveles» y de las hojas del árbol (0 a 24). */
  letras: string[]
  /** Cada unión del árbol: nodos a y b (0-24 = letras; 25 en adelante = la unión número n-25) y su distancia. */
  uniones: { a: number; b: number; distancia: number }[]
  /** «4» → la familia de cada letra (en el orden de «letras») si se corta el árbol en 4 familias. */
  niveles: Record<string, number[]>
  /** Las 4 letras más parecidas a cada letra (parecido de 0 a 100). */
  parecidas: Record<string, { letra: string; distancia: number; parecido: number }[]>
  /** En qué grupos de K-Means quedaron las manos de cada letra (≥ 5 %). */
  reparto: Record<string, { grupo: number; porcentaje: number }[]>
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

/** Colores de las familias (distintos de los de los grupos para no confundirlos). */
export const COLORES_FAMILIA = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#1d4ed8', '#4d7c0f', '#a21caf', '#0e7490', '#57534e']

/** La forma (clase) de una letra: I y J comparten forma («I/J»), igual que N y Ñ. */
export function claseDeLetra(letra: string): string {
  return letra === 'I' || letra === 'J' ? 'I/J' : letra === 'N' || letra === 'Ñ' ? 'N/Ñ' : letra
}

export interface Familia {
  id: number
  letras: string[]
  nombre: string
}

/** Las familias al cortar el árbol en n (con un nombre sacado del grupo de K-Means que más letras aporta). */
export function familiasDe(n: number): Familia[] {
  const F = GRUPOS.familias
  const nivel = F.niveles[String(n)] ?? F.niveles[String(F.defecto)]
  const familias: Familia[] = []
  F.letras.forEach((letra, i) => {
    const f = nivel[i]
    familias[f] ??= { id: f, letras: [], nombre: '' }
    familias[f].letras.push(letra)
  })
  for (const f of familias) {
    const cuenta = new Map<number, number>()
    for (const l of f.letras) {
      const g = GRUPOS.letras[l]?.grupo
      if (g !== undefined) cuenta.set(g, (cuenta.get(g) ?? 0) + 1)
    }
    const [principal] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])
    const nombre = principal ? GRUPOS.grupos.find((g) => g.id === principal[0])?.nombre ?? '' : ''
    f.nombre = f.letras.length === 1 ? `Sola: ${f.letras[0]}` : cuenta.size > 1 ? `${nombre} y parecidas` : nombre
  }
  return familias
}

/** Familia de una letra (forma «I/J», «N/Ñ» o letra suelta) al cortar en n. */
export function familiaDeLetra(letra: string, n: number): number {
  const F = GRUPOS.familias
  const i = F.letras.indexOf(claseDeLetra(letra))
  return i < 0 ? -1 : (F.niveles[String(n)] ?? F.niveles[String(F.defecto)])[i]
}

const PARTES_DEDO = ['de la base', 'del nudillo central', 'del nudillo de arriba', 'de la punta']
const DEDOS_PUNTOS = ['pulgar', 'índice', 'medio', 'anular', 'meñique']

/** Una medida de la tabla en palabras: «p12_v» → «altura de la punta del medio». */
export function describirMedida(medida: string): string {
  const punto = /^p(\d+)_([uv])$/.exec(medida)
  if (punto) {
    const n = Number(punto[1]) - 1
    return `${punto[2] === 'v' ? 'altura' : 'posición a lo ancho'} ${PARTES_DEDO[n % 4]} del ${DEDOS_PUNTOS[Math.floor(n / 4)]}`
  }
  const angulo = /^angulo_(\w+?)(?:_(medio|punta))?$/.exec(medida)
  if (angulo) {
    const dedo = angulo[1] === 'menique' ? 'meñique' : angulo[1] === 'indice' ? 'índice' : angulo[1]
    return `qué tan doblado está el ${dedo}${angulo[2] === 'punta' ? ' (en la punta)' : ''}`
  }
  const palma = /^punta_(\w+)_a_palma$/.exec(medida)
  if (palma) return `qué tan estirado está el ${palma[1] === 'menique' ? 'meñique' : palma[1] === 'indice' ? 'índice' : palma[1]}`
  const pulgar = /^pulgar_a_(\w+)$/.exec(medida)
  if (pulgar) return `distancia del pulgar al ${pulgar[1].replace('nudillo_indice', 'nudillo del índice').replace('menique', 'meñique').replace('indice', 'índice')}`
  return medida
}
