/**
 * Motor de lógica proposicional: fórmulas, evaluación y tablas de verdad.
 *
 * Conectivos (con sus formas alternativas para escribirlos con teclado):
 *   ¬  negación      (~  !)
 *   ∧  conjunción    (&  ^)
 *   ∨  disyunción    (|)
 *   →  condicional   (->  =>)
 *   ↔  bicondicional (<->  <=>)
 *   ⊤ / ⊥  verdadero / falso  (1 / 0)
 *
 * Precedencia, de mayor a menor: ¬, ∧, ∨, →, ↔. El condicional agrupa a la derecha
 * (p → q → r = p → (q → r)); los demás, a la izquierda.
 */

export type Binario = 'y' | 'o' | 'implica' | 'bicondicional'

export type Formula =
  | { tipo: 'var'; nombre: string }
  | { tipo: 'const'; valor: boolean }
  | { tipo: 'no'; f: Formula }
  | { tipo: Binario; izq: Formula; der: Formula }

export type Valuacion = Record<string, boolean>

export const SIMBOLO: Record<Binario | 'no', string> = { no: '¬', y: '∧', o: '∨', implica: '→', bicondicional: '↔' }

// ── Constructores ──────────────────────────────────────────────────────────

export const variable = (nombre: string): Formula => ({ tipo: 'var', nombre })
export const constante = (valor: boolean): Formula => ({ tipo: 'const', valor })
export const no = (f: Formula): Formula => ({ tipo: 'no', f })
export const implica = (izq: Formula, der: Formula): Formula => ({ tipo: 'implica', izq, der })
export const bicondicional = (izq: Formula, der: Formula): Formula => ({ tipo: 'bicondicional', izq, der })

const encadenar = (tipo: 'y' | 'o', fs: Formula[]): Formula => {
  if (fs.length === 0) return constante(tipo === 'y') // conjunción vacía = ⊤, disyunción vacía = ⊥
  return fs.reduce((izq, der) => ({ tipo, izq, der }))
}
export const y = (...fs: Formula[]) => encadenar('y', fs)
export const o = (...fs: Formula[]) => encadenar('o', fs)

// ── Análisis sintáctico ────────────────────────────────────────────────────

export class ErrorSintaxis extends Error {
  readonly posicion: number
  constructor(mensaje: string, posicion: number) {
    super(mensaje)
    this.posicion = posicion
  }
}

type Token = { tipo: 'var'; nombre: string; pos: number } | { tipo: 'const'; valor: boolean; pos: number } | { tipo: 'op'; op: string; pos: number }

const OPERADORES: [string, string][] = [
  ['<->', '↔'],
  ['<=>', '↔'],
  ['->', '→'],
  ['=>', '→'],
  ['↔', '↔'],
  ['→', '→'],
  ['¬', '¬'],
  ['~', '¬'],
  ['!', '¬'],
  ['∧', '∧'],
  ['&', '∧'],
  ['^', '∧'],
  ['∨', '∨'],
  ['|', '∨'],
  ['(', '('],
  [')', ')'],
]
const IDENTIFICADOR = /[A-Za-zÁÉÍÓÚáéíóúÑñ_][A-Za-z0-9ÁÉÍÓÚáéíóúÑñ_]*/y

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < texto.length) {
    if (/\s/.test(texto[i])) {
      i++
      continue
    }
    const op = OPERADORES.find(([s]) => texto.startsWith(s, i))
    if (op) {
      tokens.push({ tipo: 'op', op: op[1], pos: i })
      i += op[0].length
      continue
    }
    if ('⊤1'.includes(texto[i]) || '⊥0'.includes(texto[i])) {
      tokens.push({ tipo: 'const', valor: '⊤1'.includes(texto[i]), pos: i })
      i++
      continue
    }
    IDENTIFICADOR.lastIndex = i
    const m = IDENTIFICADOR.exec(texto)
    if (!m) throw new ErrorSintaxis(`Símbolo no reconocido: «${texto[i]}»`, i)
    tokens.push({ tipo: 'var', nombre: m[0], pos: i })
    i += m[0].length
  }
  return tokens
}

/** Convierte un texto como "(p → q) ∧ ¬r" en una fórmula. */
export function analizar(texto: string): Formula {
  const tokens = tokenizar(texto)
  let i = 0
  const actual = () => tokens[i]
  const esOp = (op: string) => actual()?.tipo === 'op' && (actual() as { op: string }).op === op
  const fin = () => (tokens.length ? tokens[tokens.length - 1].pos + 1 : 0)

  const bicond = (): Formula => {
    let f = impl()
    while (esOp('↔')) {
      i++
      f = bicondicional(f, impl())
    }
    return f
  }
  const impl = (): Formula => {
    const f = disy()
    if (esOp('→')) {
      i++
      return implica(f, impl())
    }
    return f
  }
  const disy = (): Formula => {
    let f = conj()
    while (esOp('∨')) {
      i++
      f = { tipo: 'o', izq: f, der: conj() }
    }
    return f
  }
  const conj = (): Formula => {
    let f = neg()
    while (esOp('∧')) {
      i++
      f = { tipo: 'y', izq: f, der: neg() }
    }
    return f
  }
  const neg = (): Formula => {
    if (esOp('¬')) {
      i++
      return no(neg())
    }
    return atomo()
  }
  const atomo = (): Formula => {
    const t = actual()
    if (!t) throw new ErrorSintaxis('La fórmula está incompleta: falta una proposición al final.', fin())
    if (t.tipo === 'var') {
      i++
      return variable(t.nombre)
    }
    if (t.tipo === 'const') {
      i++
      return constante(t.valor)
    }
    if (t.op === '(') {
      i++
      const f = bicond()
      if (!esOp(')')) throw new ErrorSintaxis('Falta cerrar un paréntesis.', actual()?.pos ?? fin())
      i++
      return f
    }
    throw new ErrorSintaxis(`Se esperaba una proposición y se encontró «${t.op}».`, t.pos)
  }

  if (tokens.length === 0) throw new ErrorSintaxis('Escribe una fórmula.', 0)
  const f = bicond()
  if (i < tokens.length) {
    const t = tokens[i]
    throw new ErrorSintaxis(
      t.tipo === 'op' && t.op === ')' ? 'Hay un paréntesis de cierre de más.' : 'Falta un conectivo entre dos proposiciones.',
      t.pos,
    )
  }
  return f
}

// ── Escritura ──────────────────────────────────────────────────────────────

const PRECEDENCIA: Record<Formula['tipo'], number> = { bicondicional: 1, implica: 2, o: 3, y: 4, no: 5, var: 6, const: 6 }

/**
 * Escribe la fórmula como se acostumbra en clase: cada conectivo binario dentro de otro
 * va entre paréntesis, salvo en cadenas del mismo conectivo asociativo (p ∧ q ∧ r).
 */
export function aTexto(f: Formula): string {
  switch (f.tipo) {
    case 'var':
      return f.nombre
    case 'const':
      return f.valor ? '⊤' : '⊥'
    case 'no': {
      const interior = aTexto(f.f)
      return PRECEDENCIA[f.f.tipo] < PRECEDENCIA.no ? `¬(${interior})` : `¬${interior}`
    }
    default: {
      const envolver = (g: Formula) => {
        const binaria = PRECEDENCIA[g.tipo] < PRECEDENCIA.no
        const cadenaAsociativa = g.tipo === f.tipo && (f.tipo === 'y' || f.tipo === 'o')
        return binaria && !cadenaAsociativa ? `(${aTexto(g)})` : aTexto(g)
      }
      return `${envolver(f.izq)} ${SIMBOLO[f.tipo]} ${envolver(f.der)}`
    }
  }
}

// ── Semántica ──────────────────────────────────────────────────────────────

export function evaluar(f: Formula, v: Valuacion): boolean {
  switch (f.tipo) {
    case 'var':
      if (!(f.nombre in v)) throw new Error(`Falta el valor de la proposición «${f.nombre}»`)
      return v[f.nombre]
    case 'const':
      return f.valor
    case 'no':
      return !evaluar(f.f, v)
    case 'y':
      return evaluar(f.izq, v) && evaluar(f.der, v)
    case 'o':
      return evaluar(f.izq, v) || evaluar(f.der, v)
    case 'implica':
      return !evaluar(f.izq, v) || evaluar(f.der, v)
    case 'bicondicional':
      return evaluar(f.izq, v) === evaluar(f.der, v)
  }
}

/** Proposiciones de la fórmula, en el orden en que aparecen. */
export function variables(f: Formula): string[] {
  const vistas: string[] = []
  const recorrer = (g: Formula) => {
    if (g.tipo === 'var') {
      if (!vistas.includes(g.nombre)) vistas.push(g.nombre)
    } else if (g.tipo === 'no') recorrer(g.f)
    else if (g.tipo !== 'const') {
      recorrer(g.izq)
      recorrer(g.der)
    }
  }
  recorrer(f)
  return vistas
}

/** Subfórmulas compuestas, de las más simples a la fórmula completa (sin repetir). */
export function subformulas(f: Formula): Formula[] {
  const lista: Formula[] = []
  const textos = new Set<string>()
  const recorrer = (g: Formula) => {
    if (g.tipo === 'var' || g.tipo === 'const') return
    if (g.tipo === 'no') recorrer(g.f)
    else {
      recorrer(g.izq)
      recorrer(g.der)
    }
    const t = aTexto(g)
    if (!textos.has(t)) {
      textos.add(t)
      lista.push(g)
    }
  }
  recorrer(f)
  return lista
}

export const MAX_VARIABLES = 8

export interface TablaDeVerdad {
  variables: string[]
  /** Encabezados de las columnas calculadas; la última es la fórmula completa. */
  columnas: string[]
  filas: { valores: boolean[]; resultados: boolean[] }[]
}

/**
 * Tabla de verdad con columnas intermedias. Las filas van de "todo verdadero"
 * a "todo falso", como es costumbre en los cursos de lógica.
 */
export function tablaDeVerdad(f: Formula): TablaDeVerdad {
  const vars = variables(f)
  if (vars.length > MAX_VARIABLES) throw new Error(`La tabla tendría 2^${vars.length} filas; usa como máximo ${MAX_VARIABLES} proposiciones.`)
  const subs = subformulas(f)
  const columnas = subs.map(aTexto)
  // Una fórmula que es solo una proposición o constante también lleva su columna.
  if (subs.length === 0) {
    subs.push(f)
    columnas.push(aTexto(f))
  }
  const filas = []
  for (let k = 0; k < 2 ** vars.length; k++) {
    const valores = vars.map((_, j) => ((k >> (vars.length - 1 - j)) & 1) === 0)
    const v = Object.fromEntries(vars.map((nombre, j) => [nombre, valores[j]]))
    filas.push({ valores, resultados: subs.map((s) => evaluar(s, v)) })
  }
  return { variables: vars, columnas, filas }
}

export type Clasificacion = 'tautologia' | 'contradiccion' | 'contingencia'

export function clasificar(f: Formula): Clasificacion {
  const resultados = tablaDeVerdad(f).filas.map((fila) => fila.resultados[fila.resultados.length - 1])
  if (resultados.every(Boolean)) return 'tautologia'
  if (!resultados.some(Boolean)) return 'contradiccion'
  return 'contingencia'
}

/** Dos fórmulas son equivalentes si su bicondicional es una tautología. */
export function equivalentes(a: Formula, b: Formula): boolean {
  return clasificar(bicondicional(a, b)) === 'tautologia'
}
