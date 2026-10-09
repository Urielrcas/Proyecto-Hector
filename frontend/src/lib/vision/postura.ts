/**
 * Lectura de la forma de la mano a partir de los 21 puntos de MediaPipe y comparación
 * con la forma esperada de cada letra.
 *
 * Es una evaluación geométrica aproximada; más adelante la reemplazará un modelo entrenado.
 *
 * Índices de MediaPipe: 0 muñeca · 1-4 pulgar · 5-8 índice · 9-12 medio · 13-16 anular · 17-20 meñique
 * (en cada dedo: base/MCP, PIP, DIP, punta).
 *
 * Las medidas se toman en un "marco de la mano" para no depender de cómo esté girada:
 *  - v: altura a lo largo de la mano (0 = muñeca, 1 = nudillo del medio)
 *  - u: posición a lo ancho (0 = nudillo del índice, positivo hacia el meñique)
 * Ambas en unidades de "palma" (distancia muñeca → nudillo del medio).
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     EstadoDedo → tipo: 'estirado' | 'curvo' | 'doblado'
//     FormaMano → tipo: descripción de la forma de la mano
//     Movimiento → tipo: el movimiento de una letra (j, z, arriba, lados, frente)
//     PosicionPulgar → tipo: dónde está el pulgar
import type { EstadoDedo, FormaMano, Movimiento, PosicionPulgar } from '../aprendizaje/forma'
// ▸ Desde nuestro proyecto: src/lib/logica/proposicional.ts:
//     evaluar → evalúa (en postura: la seña de la mano; en proposicional: una fórmula lógica)
//     no → conectivo ¬ (negación)
//     o → conectivo ∨ (disyunción)
//     variable → crea una proposición (p, q, indice_estirado...)
//     y → conectivo ∧ (conjunción)
//     Formula → tipo: una fórmula de lógica proposicional
//     Valuacion → tipo: valores V/F de cada proposición
import { evaluar as evaluarFormula, no, o, variable, y, type Formula, type Valuacion } from '../logica/proposicional'

export interface Punto {
  x: number
  y: number
}

export type Dedo = 'pulgar' | 'indice' | 'medio' | 'anular' | 'menique'
export type DedoLargo = Exclude<Dedo, 'pulgar'>
export const DEDOS: Dedo[] = ['pulgar', 'indice', 'medio', 'anular', 'menique']
export const DEDOS_LARGOS: DedoLargo[] = ['indice', 'medio', 'anular', 'menique']
export const NOMBRE_DEDO: Record<Dedo, string> = {
  pulgar: 'pulgar',
  indice: 'índice',
  medio: 'medio',
  anular: 'anular',
  menique: 'meñique',
}

export type PulgarLeido = Exclude<PosicionPulgar, 'curvo'>
export type Orientacion = 'arriba' | 'lado' | 'abajo'

/** Lo que la cámara "ve" de la mano. */
export interface Lectura {
  dedos: Record<DedoLargo, EstadoDedo>
  pulgar: PulgarLeido
  /** Con pulgar 'entre': 1 = índice-medio, 2 = medio-anular, 3 = anular-meñique. */
  entre?: 1 | 2 | 3
  separados: boolean
  cruzados: boolean
  orientacion: Orientacion
}

/** Lo que se espera ver para una letra (con las variantes aceptadas). */
export interface Objetivo {
  dedos: Record<DedoLargo, EstadoDedo[]>
  pulgar: PulgarLeido[]
  entre?: 1 | 2 | 3
  separacion?: 'juntos' | 'separados'
  cruzados?: boolean
  orientacion?: Orientacion[]
  movimiento?: Movimiento
}

export interface Evaluacion {
  /** La forma de la mano es la correcta (el movimiento se evalúa aparte). */
  correcto: boolean
  dedosOk: Record<Dedo, boolean>
  consejos: string[]
}

const FALANGES: Record<DedoLargo, [mcp: number, pip: number, dip: number, punta: number]> = {
  indice: [5, 6, 7, 8],
  medio: [9, 10, 11, 12],
  anular: [13, 14, 15, 16],
  menique: [17, 18, 19, 20],
}

const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y)

/** Ángulo en grados formado en `b` por los segmentos b→a y b→c (180 = recto). */
function angulo(a: Punto, b: Punto, c: Punto) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const coseno = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, coseno))) * 180) / Math.PI
}

function marcoDeMano(p: Punto[]) {
  const palma = distancia(p[0], p[9]) || 1
  const arriba = { x: (p[9].x - p[0].x) / palma, y: (p[9].y - p[0].y) / palma }
  let ancho = { x: -arriba.y, y: arriba.x }
  // Orientar "ancho" del índice hacia el meñique.
  if ((p[17].x - p[5].x) * ancho.x + (p[17].y - p[5].y) * ancho.y < 0) ancho = { x: -ancho.x, y: -ancho.y }
  return {
    palma,
    arriba,
    v: (q: Punto) => ((q.x - p[0].x) * arriba.x + (q.y - p[0].y) * arriba.y) / palma,
    u: (q: Punto) => ((q.x - p[5].x) * ancho.x + (q.y - p[5].y) * ancho.y) / palma,
  }
}

export function leerMano(p: Punto[]): Lectura {
  const m = marcoDeMano(p)

  const dedos = {} as Record<DedoLargo, EstadoDedo>
  for (const d of DEDOS_LARGOS) {
    const [mcp, pip, dip, punta] = FALANGES[d]
    const recto = angulo(p[mcp], p[pip], p[dip]) > 150 && angulo(p[pip], p[dip], p[punta]) > 140
    if (recto && distancia(p[0], p[punta]) > distancia(p[0], p[pip])) dedos[d] = 'estirado'
    // Punta a la altura de los nudillos o más abajo: dedo metido en la palma.
    else if (m.v(p[punta]) < m.v(p[mcp]) + 0.25) dedos[d] = 'doblado'
    else dedos[d] = 'curvo'
  }

  // Pulgar
  const t = p[4]
  const tocaUnDedo = DEDOS_LARGOS.some((d) => {
    const punta = p[FALANGES[d][3]]
    return dedos[d] === 'curvo' && distancia(t, punta) < m.palma * 0.3
  })
  let pulgar: PulgarLeido
  let entre: 1 | 2 | 3 | undefined
  if (tocaUnDedo) pulgar = 'toca'
  else if (distancia(t, p[5]) > m.palma * 0.6 && angulo(p[2], p[3], t) > 140) pulgar = 'estirado'
  else if (m.u(t) < 0.02) pulgar = 'lado' // pegado al costado del índice
  else if (m.v(t) > 1.05) {
    pulgar = 'entre' // asoma entre los dedos
    entre = m.u(t) < 0.2 ? 1 : m.u(t) < 0.4 ? 2 : 3
  } else if (m.v(t) >= 0.75) pulgar = 'sobre'
  else pulgar = 'doblado'

  const orientacion: Orientacion = -m.arriba.y > 0.64 ? 'arriba' : m.arriba.y > 0.64 ? 'abajo' : 'lado'

  return {
    dedos,
    pulgar,
    entre,
    separados: distancia(p[8], p[12]) > m.palma * 0.35,
    cruzados: m.u(p[8]) > m.u(p[12]) + 0.03,
    orientacion,
  }
}

/** Traduce la forma dibujada de una letra en lo que la cámara debe reconocer. */
export function objetivoDesdeForma(forma: FormaMano): Objetivo {
  const puno = DEDOS_LARGOS.every((d) => forma.dedos[d] !== 'estirado')
  const todosCurvos = DEDOS_LARGOS.every((d) => forma.dedos[d] === 'curvo')

  const dedos = {} as Record<DedoLargo, EstadoDedo[]>
  for (const d of DEDOS_LARGOS) {
    const e = forma.dedos[d]
    // Junto a un dedo estirado (D, F), un dedo "curvo" también puede verse doblado.
    // En C, O, Q y X la curva es justo lo que distingue la letra: se exige.
    dedos[d] = e === 'curvo' && !puno ? ['curvo', 'doblado'] : [e]
  }

  // En puño (A, E, S, T…) el pulgar es lo único que distingue la letra: se exige exacto.
  const PULGAR: Record<PosicionPulgar, PulgarLeido[]> = {
    estirado: ['estirado'],
    // Pulgar paralelo a un dedo estirado (G y Q de ASL): según el ángulo puede leerse como estirado.
    lado: puno ? ['lado'] : ['lado', 'estirado'],
    toca: ['toca'],
    entre: ['entre'],
    sobre: puno ? ['sobre'] : ['sobre', 'doblado'],
    doblado: puno ? ['doblado'] : ['doblado', 'sobre'],
    curvo: todosCurvos ? ['estirado', 'lado'] : ['estirado', 'lado', 'toca'],
  }

  const indiceYMedio = forma.dedos.indice === 'estirado' && forma.dedos.medio === 'estirado'
  const giro = ((forma.giro ?? 0) % 360 + 360) % 360

  return {
    dedos,
    pulgar: PULGAR[forma.pulgar],
    entre: forma.pulgar === 'entre' && puno ? (forma.entre ?? 1) : undefined,
    separacion: indiceYMedio && !forma.cruzados ? (forma.separados ? 'separados' : 'juntos') : undefined,
    cruzados: indiceYMedio ? !!forma.cruzados : undefined,
    orientacion: forma.orientacionLibre
      ? undefined
      : giro === 0
        ? ['arriba']
        : giro === 180
          ? ['abajo']
          : giro === 90 || giro === 270
            ? ['lado']
            : ['lado', 'abajo'],
    movimiento: forma.movimiento,
  }
}

const CONSEJO_DEDO: Record<EstadoDedo, (nombre: string) => string> = {
  estirado: (n) => `Estira el ${n}.`,
  curvo: (n) => `Curva el ${n}, sin cerrarlo del todo.`,
  doblado: (n) => `Dobla el ${n}.`,
}

const CONSEJO_PULGAR: Record<PulgarLeido, string> = {
  estirado: 'Estira el pulgar hacia afuera.',
  lado: 'Pega el pulgar al costado del índice.',
  toca: 'Junta la punta del pulgar con la de tus dedos.',
  entre: 'Pon el pulgar entre los dedos doblados.',
  sobre: 'Cruza el pulgar por encima de tus dedos doblados.',
  doblado: 'Dobla el pulgar hacia la palma.',
}

const CONSEJO_ORIENTACION: Record<Orientacion, string> = {
  arriba: 'Apunta los dedos hacia arriba.',
  lado: 'Gira la mano: los dedos deben apuntar hacia un lado.',
  abajo: 'Apunta los dedos hacia abajo.',
}

// ── Evaluación con lógica proposicional ────────────────────────────────────
//
// Lo que la cámara lee se traduce en proposiciones atómicas (verdaderas o falsas):
//   indice_estirado, indice_curvo, indice_doblado, … (una por cada dedo largo y estado)
//   pulgar_estirado, pulgar_lado, pulgar_toca, pulgar_entre, pulgar_sobre, pulgar_doblado
//   pulgar_entre_1, pulgar_entre_2, pulgar_entre_3   (entre qué dedos asoma el pulgar)
//   separados, cruzados                             (índice y medio)
//   apunta_arriba, apunta_lado, apunta_abajo
//
// Cada letra es una fórmula: la conjunción de sus condiciones, y cada condición admite
// variantes con disyunciones. Ej. la D:
//   apunta_arriba ∧ indice_estirado ∧ (medio_curvo ∨ medio_doblado) ∧ … ∧ pulgar_toca
// La seña es correcta si la fórmula es verdadera con la valuación leída de la cámara.

/** Valuación de las proposiciones atómicas a partir de la lectura de la mano. */
export function proposicionesDeLectura(l: Lectura): Valuacion {
  const v: Valuacion = {}
  for (const d of DEDOS_LARGOS) for (const e of ['estirado', 'curvo', 'doblado'] as const) v[`${d}_${e}`] = l.dedos[d] === e
  for (const x of ['estirado', 'lado', 'toca', 'entre', 'sobre', 'doblado'] as const) v[`pulgar_${x}`] = l.pulgar === x
  for (const n of [1, 2, 3] as const) v[`pulgar_entre_${n}`] = l.entre === n
  for (const o of ['arriba', 'lado', 'abajo'] as const) v[`apunta_${o}`] = l.orientacion === o
  v.separados = l.separados
  v.cruzados = l.cruzados
  return v
}

interface Condicion {
  formula: Formula
  consejo: string
  /** Dedo al que se refiere (para marcarlo en pantalla). */
  dedo?: Dedo
  /** Las condiciones del par índice-medio solo se aconsejan si ambos dedos ya están bien. */
  delParIndiceMedio?: boolean
}

const cacheCondiciones = new WeakMap<Objetivo, Condicion[]>()

/** Descompone la forma esperada de una letra en condiciones (fórmulas) con su consejo. */
export function condicionesDeObjetivo(objetivo: Objetivo): Condicion[] {
  const guardadas = cacheCondiciones.get(objetivo)
  if (guardadas) return guardadas

  const c: Condicion[] = []
  if (objetivo.orientacion) {
    c.push({
      formula: o(...objetivo.orientacion.map((x) => variable(`apunta_${x}`))),
      consejo: CONSEJO_ORIENTACION[objetivo.orientacion[0]],
    })
  }
  for (const d of DEDOS_LARGOS) {
    c.push({
      formula: o(...objetivo.dedos[d].map((e) => variable(`${d}_${e}`))),
      consejo: CONSEJO_DEDO[objetivo.dedos[d][0]](NOMBRE_DEDO[d]),
      dedo: d,
    })
  }
  const pulgar = o(...objetivo.pulgar.map((x) => variable(`pulgar_${x}`)))
  c.push({
    formula: objetivo.entre ? y(pulgar, variable(`pulgar_entre_${objetivo.entre}`)) : pulgar,
    consejo: CONSEJO_PULGAR[objetivo.pulgar[0]],
    dedo: 'pulgar',
  })
  if (objetivo.cruzados !== undefined) {
    c.push({
      formula: objetivo.cruzados ? variable('cruzados') : no(variable('cruzados')),
      consejo: objetivo.cruzados ? 'Cruza el medio por encima del índice.' : 'Descruza el índice y el medio.',
      delParIndiceMedio: true,
    })
  }
  if (objetivo.separacion) {
    c.push({
      formula: objetivo.separacion === 'separados' ? variable('separados') : no(variable('separados')),
      consejo: objetivo.separacion === 'juntos' ? 'Junta el índice y el medio.' : 'Separa el índice y el medio.',
      delParIndiceMedio: true,
    })
  }

  cacheCondiciones.set(objetivo, c)
  return c
}

const cacheFormulas = new WeakMap<Objetivo, Formula>()

/** Fórmula completa de la letra: la conjunción de todas sus condiciones. */
export function formulaDeObjetivo(objetivo: Objetivo): Formula {
  let f = cacheFormulas.get(objetivo)
  if (!f) {
    f = y(...condicionesDeObjetivo(objetivo).map((c) => c.formula))
    cacheFormulas.set(objetivo, f)
  }
  return f
}

export function evaluar(p: Punto[], objetivo: Objetivo): Evaluacion {
  const valuacion = proposicionesDeLectura(leerMano(p))
  const condiciones = condicionesDeObjetivo(objetivo)
  const cumplidas = condiciones.map((c) => evaluarFormula(c.formula, valuacion))

  const dedosOk = Object.fromEntries(DEDOS.map((d) => [d, true])) as Record<Dedo, boolean>
  condiciones.forEach((c, i) => {
    if (c.dedo) dedosOk[c.dedo] = cumplidas[i]
  })

  // Consejos: las condiciones falsas. Las del par índice-medio solo si ambos dedos ya están bien,
  // y de ellas solo la primera (primero cruzar/descruzar, después juntar/separar).
  const consejos = condiciones.filter((c, i) => !cumplidas[i] && !c.delParIndiceMedio).map((c) => c.consejo)
  if (dedosOk.indice && dedosOk.medio) {
    const par = condiciones.find((c, i) => c.delParIndiceMedio && !cumplidas[i])
    if (par) consejos.push(par.consejo)
  }

  return { correcto: evaluarFormula(formulaDeObjetivo(objetivo), valuacion), dedosOk, consejos }
}
