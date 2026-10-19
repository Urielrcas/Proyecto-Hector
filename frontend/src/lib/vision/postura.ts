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
//     Palma → tipo: hacia dónde mira la palma (frente, dorso, lado)
//     PosicionPulgar → tipo: dónde está el pulgar
import type { EstadoDedo, FormaMano, Movimiento, Palma, PosicionPulgar } from '../aprendizaje/forma'
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
  /** Profundidad que da MediaPipe (más negativo = más cerca de la cámara). Puede faltar. */
  z?: number
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
  /** Hacia dónde mira la palma; `undefined` si las pistas no coinciden (no se puede saber). */
  palma?: Palma
}

/** Lo que se espera ver para una letra (con las variantes aceptadas). */
export interface Objetivo {
  dedos: Record<DedoLargo, EstadoDedo[]>
  pulgar: PulgarLeido[]
  entre?: 1 | 2 | 3
  separacion?: 'juntos' | 'separados'
  cruzados?: boolean
  orientacion?: Orientacion[]
  palma?: Palma[]
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

/**
 * ¿El pulgar asoma ENTRE los dedos (T, M, N) o va cruzado POR ENCIMA de ellos (S)?
 * Con la mano real la punta del pulgar queda a la misma altura en los dos casos, así que
 * se juntan tres pistas y gana la mayoría:
 *   1. Altura: la punta llega a los nudillos de los dedos doblados → "entre".
 *   2. Dirección: la última falange apunta hacia arriba → "entre"; acostada a lo ancho → "encima".
 *   3. Profundidad (si MediaPipe la da): la punta queda detrás de los dedos → "entre"; delante → "encima".
 */
function pulgarAsomaEntreDedos(p: Punto[], m: ReturnType<typeof marcoDeMano>, dedos: Record<DedoLargo, EstadoDedo>) {
  const t = p[4]
  const alta = m.v(t) > 1.05
  const subida = m.v(t) - m.v(p[3])
  const ancho = Math.abs(m.u(t) - m.u(p[3]))
  const haciaArriba = subida > ancho

  // Nudillo doblado (PIP) más cercano a la punta del pulgar, para comparar profundidad.
  const pips = DEDOS_LARGOS.filter((d) => dedos[d] !== 'estirado').map((d) => p[FALANGES[d][1]])
  const pip = pips.sort((a, b) => distancia(a, t) - distancia(b, t))[0]
  const detras = t.z !== undefined && pip?.z !== undefined ? t.z > pip.z : undefined

  const votos = [alta, haciaArriba, detras].filter((x) => x !== undefined)
  const aFavor = votos.filter(Boolean).length
  return aFavor * 2 > votos.length // mayoría (sin profundidad: hacen falta las dos pistas)
}

/**
 * Deja todas las manos "como la misma mano" antes de leerlas: la mano derecha se refleja como en
 * un espejo, así una derecha y una izquierda con la palma al frente dan los mismos puntos y la
 * lectura de frente / dorso funciona para diestros y zurdos.
 * `etiqueta` es lo que dice MediaPipe. Ojo: MediaPipe supone que la imagen viene en espejo; como
 * le pasamos el video tal cual sale de la cámara, a una mano derecha la llama "Left".
 */
export function normalizarMano(puntos: Punto[], etiqueta: string | undefined): Punto[] {
  const esDerecha = etiqueta === ETIQUETA_MANO_DERECHA
  return esDerecha ? puntos.map((q) => ({ ...q, x: 1 - q.x })) : puntos
}
/** Cómo llama MediaPipe a la mano derecha cuando el video NO viene en espejo. */
const ETIQUETA_MANO_DERECHA = 'Left'

/**
 * Frente o dorso según la profundidad (z) que da MediaPipe: ¿los dedos doblados y el pulgar quedan
 * más cerca de la cámara que los nudillos (palma al frente) o más lejos (dorso)?
 * Devuelve `undefined` si no hay profundidad o la diferencia es muy pequeña para decidir.
 */
function palmaPorProfundidad(p: Punto[], dedos: Record<DedoLargo, EstadoDedo>): Palma | undefined {
  const nudillos = [5, 9, 13, 17].map((i) => p[i].z)
  if (nudillos.some((z) => z === undefined) || p[4].z === undefined) return undefined
  const zNudillos = (nudillos as number[]).reduce((s, z) => s + z, 0) / 4
  const puntas = [p[4], ...DEDOS_LARGOS.filter((d) => dedos[d] !== 'estirado').map((d) => p[FALANGES[d][3]])]
  const zPuntas = puntas.reduce((s, q) => s + (q.z ?? 0), 0) / puntas.length
  const diferencia = (zPuntas - zNudillos) / (distancia(p[0], p[9]) || 1)
  return diferencia < -0.08 ? 'frente' : diferencia > 0.08 ? 'dorso' : undefined
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
  // Toca: la punta del pulgar junto a la punta de un dedo curvo. En la O real los dedos bajan tanto
  // que se leen "doblados", pero su punta queda lejos de la palma (en un puño queda pegada a ella).
  const tocaUnDedo = DEDOS_LARGOS.some((d) => {
    const punta = p[FALANGES[d][3]]
    const cerrandoLaO = dedos[d] === 'doblado' && distancia(punta, p[0]) > m.palma
    return (dedos[d] === 'curvo' || cerrandoLaO) && distancia(t, punta) < m.palma * 0.3
  })
  let pulgar: PulgarLeido
  let entre: 1 | 2 | 3 | undefined
  if (tocaUnDedo) pulgar = 'toca'
  // Estirado: lejos del índice, recto y POR FUERA de la mano (si cruza la palma no cuenta, como en la S).
  else if (distancia(t, p[5]) > m.palma * 0.6 && angulo(p[2], p[3], t) > 140 && m.u(t) < -0.15) pulgar = 'estirado'
  else if (m.u(t) < 0.02) pulgar = 'lado' // pegado al costado del índice
  else if (m.v(t) >= 0.75 && pulgarAsomaEntreDedos(p, m, dedos)) {
    pulgar = 'entre' // asoma entre los dedos (T, M, N)
    entre = m.u(t) < 0.2 ? 1 : m.u(t) < 0.4 ? 2 : 3
  } else if (m.v(t) >= 0.75) pulgar = 'sobre'
  else pulgar = 'doblado'

  const orientacion: Orientacion = -m.arriba.y > 0.64 ? 'arriba' : m.arriba.y > 0.64 ? 'abajo' : 'lado'

  // Hacia dónde mira la palma: se mira el triángulo muñeca → nudillo del índice → nudillo del meñique.
  // De frente se ve "abierto" en un sentido, de dorso en el sentido contrario, y de lado casi se
  // aplana (los nudillos quedan uno detrás del otro). `giroTriangulo` va de -1 a 1.
  const a = { x: p[5].x - p[0].x, y: p[5].y - p[0].y }
  const b = { x: p[17].x - p[0].x, y: p[17].y - p[0].y }
  const giroTriangulo = (a.x * b.y - a.y * b.x) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1)
  const porTriangulo: Palma = giroTriangulo > 0.2 ? 'frente' : giroTriangulo < -0.2 ? 'dorso' : 'lado'
  // Segunda pista, la profundidad: con la palma al frente los dedos doblados y el pulgar vienen hacia
  // la cámara; de dorso se alejan. Solo se decide "frente" o "dorso" si las dos pistas coinciden;
  // si no, no se sabe (y no se le exige nada al usuario: mejor no marcar un error que no es).
  const porProfundidad = palmaPorProfundidad(p, dedos)
  const palma: Palma | undefined =
    porTriangulo === 'lado' || porProfundidad === undefined || porProfundidad === porTriangulo ? porTriangulo : undefined

  return {
    dedos,
    pulgar,
    entre,
    separados: distancia(p[8], p[12]) > m.palma * 0.35,
    cruzados: m.u(p[8]) > m.u(p[12]) + 0.03,
    orientacion,
    palma,
  }
}

/**
 * Hacia dónde puede mirar la palma. Lo que se exige es no confundir PALMA con DORSO: entre "de
 * frente" y "de lado" la cámara no siempre distingue (casi todas las señas se hacen de tres cuartos).
 *   - palma al frente o de lado (A, B, C, O…): vale frente o lado, no el dorso,
 *   - dorso (M, N, Ñ, Q, G, H): solo el dorso; si la mano apunta a un lado (G, H) los nudillos
 *     se ven casi alineados y también vale "de lado".
 */
function palmasAceptadas(palma: Palma, giro: number): Palma[] {
  if (palma !== 'dorso') return palma === 'lado' ? ['lado', 'frente'] : ['frente', 'lado']
  return giro === 90 || giro === 270 ? ['dorso', 'lado'] : ['dorso']
}

/** Traduce la forma dibujada de una letra en lo que la cámara debe reconocer. */
export function objetivoDesdeForma(forma: FormaMano): Objetivo {
  const puno = DEDOS_LARGOS.every((d) => forma.dedos[d] !== 'estirado')
  const todosCurvos = DEDOS_LARGOS.every((d) => forma.dedos[d] === 'curvo')
  const dorso = forma.palma === 'dorso'
  // De dorso, un pulgar metido bajo los dedos (doblado, sobre, entre) no se ve: la cámara adivina
  // dónde está y puede leerlo en cualquiera de esas posiciones o pegado al costado.
  const pulgarEscondido = dorso && (forma.pulgar === 'doblado' || forma.pulgar === 'sobre' || forma.pulgar === 'entre')

  const dedos = {} as Record<DedoLargo, EstadoDedo[]>
  for (const d of DEDOS_LARGOS) {
    const e = forma.dedos[d]
    // Junto a un dedo estirado (D, F), un dedo "curvo" también puede verse doblado.
    // En C, O, Q y X la curva es justo lo que distingue la letra: se exige.
    // En la O los dedos se cierran hasta tocar el pulgar: pueden verse doblados (lo que distingue
    // a la O es que el pulgar toca la punta de un dedo curvo).
    dedos[d] = e === 'curvo' && (!puno || forma.pulgar === 'toca') ? ['curvo', 'doblado'] : [e]
    // De dorso (M, N, Ñ, Q) la punta de un dedo doblado queda escondida detrás de la mano y la
    // cámara solo la adivina: a veces lo lee "curvo". Se acepta (lo que separa M de N es cuáles
    // dedos van estirados, no cuánto se doblan los otros).
    if (e === 'doblado' && dorso) dedos[d] = ['doblado', 'curvo']
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
    pulgar: pulgarEscondido ? ['doblado', 'sobre', 'entre', 'lado'] : PULGAR[forma.pulgar],
    entre: forma.pulgar === 'entre' && puno && !pulgarEscondido ? (forma.entre ?? 1) : undefined,
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
    palma: palmasAceptadas(forma.palma ?? 'frente', giro),
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

const CONSEJO_PALMA: Record<Palma, string> = {
  frente: 'Voltea la mano: debe verse la palma, no el dorso.',
  dorso: 'Voltea la mano: debe verse el dorso (no la palma).',
  lado: 'Gira la mano de lado: no enseñes el dorso.',
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
//   palma_frente, palma_dorso, palma_lado            (hacia dónde mira la palma)
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
  // Si no se sabe hacia dónde mira la palma, no se cuenta como error.
  for (const x of ['frente', 'dorso', 'lado'] as const) v[`palma_${x}`] = l.palma === undefined || l.palma === x
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
  if (objetivo.palma) {
    c.push({
      formula: o(...objetivo.palma.map((x) => variable(`palma_${x}`))),
      consejo: CONSEJO_PALMA[objetivo.palma[0]],
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
