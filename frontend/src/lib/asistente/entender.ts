/**
 * MANI · ENTENDER LO QUE PIDE EL USUARIO
 *
 * Convierte una frase («pon la app en asul», «¿cómo se hace la Ñ?», «llévame a los juegos»)
 * en una INTENCIÓN: qué quiere hacer y con qué datos. Sin internet y sin modelos externos:
 *
 *   1. Normaliza la frase: minúsculas, sin acentos ni signos (pero respeta la Ñ).
 *   2. La parte en palabras.
 *   3. Busca palabras clave por grupos, en orden de prioridad (emergencia primero).
 *      Las palabras se comparan «al oído»: «asul» = «azul», «boz» = «voz» (z/c/s, v/b, ll/y, h muda),
 *      y aceptan 1 o 2 errores de dedo según su largo (distancia de edición de Damerau-Levenshtein).
 *   4. Si nada coincide, busca la pregunta de Ayuda que más se parece (lib/ayuda.ts).
 *
 * Solo entiende; lo que Mani contesta y hace está en responder.ts.
 */
// ▸ Desde nuestro proyecto:
import { NOMBRES_PALABRAS } from '../aprendizaje/palabras'
import { TEMAS, type Pregunta } from '../ayuda'
import type { ColorPrincipal } from '../colores'
import {
  APRENDIZAJE,
  AYUDA,
  CONFIGURACION,
  CONVERSACION,
  EMERGENCIA,
  HISTORIAL,
  INICIO,
  MI_IA,
  SENAS_TEXTO,
  VOZ_SENAS,
} from '../navegacion'
import type { Lengua } from '../tipos'

export type QueAjuste = 'texto' | 'contraste' | 'movimiento' | 'sonidos' | 'vozVelocidad' | 'vozVolumen' | 'historial' | 'autocorreccion'
/** mas/menos: subir o bajar · activar/desactivar: prender o apagar · normal: volver al valor inicial. */
export type Direccion = 'mas' | 'menos' | 'activar' | 'desactivar' | 'normal'

export interface Destino {
  ruta: string
  titulo: string
}

export interface PreguntaEncontrada extends Pregunta {
  tema: string
  ruta?: string
}

export type Intencion =
  | { tipo: 'color'; color: ColorPrincipal | null; opciones?: ColorPrincipal[]; noDisponible?: string }
  | { tipo: 'modo-oscuro' }
  | { tipo: 'ajuste'; que: QueAjuste; direccion: Direccion }
  | { tipo: 'lengua'; lengua: Lengua | null }
  | { tipo: 'ir'; destino: Destino }
  | { tipo: 'letra'; letra: string; leCuesta: boolean }
  | { tipo: 'palabra'; nombre: string }
  | { tipo: 'practicar' }
  | { tipo: 'deshacer' }
  | { tipo: 'saludo' }
  | { tipo: 'gracias' }
  | { tipo: 'presentacion' }
  | { tipo: 'pregunta'; preguntas: PreguntaEncontrada[] }
  | { tipo: 'no-entendi' }

// ── Herramientas para comparar palabras ───────────────────────────────────

/** Minúsculas, sin acentos ni signos, con espacios simples. La Ñ se respeta (Ñ ≠ N en el alfabeto). */
export function normalizarFrase(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFC') // la «ñ» como una sola letra
    .split('ñ')
    .map((parte) => parte.normalize('NFD').replace(/\p{M}/gu, '')) // quita acentos (las marcas sobre las letras)
    .join('ñ')
    .replace(/[^a-zñ0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cómo «suena» una palabra en español: así «asul» y «azul» o «boz» y «voz» quedan iguales. */
export function comoSuena(palabra: string): string {
  return palabra
    .replace(/ll/g, 'y')
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/h/g, '')
    .replace(/ñ/g, 'n')
}

/** Distancia de edición (Damerau-Levenshtein): cuántas letras cambiar, agregar, quitar o intercambiar. */
export function distanciaEdicion(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** Errores de dedo que se perdonan según el largo: las palabras cortas deben coincidir exacto. */
const tolerancia = (largo: number) => (largo <= 4 ? 0 : largo <= 7 ? 1 : 2)

/** ¿La palabra escrita es (o suena como) la palabra clave? */
export function pareceA(escrita: string, clave: string): boolean {
  if (escrita === clave) return true
  const a = comoSuena(escrita)
  const b = comoSuena(clave)
  // Con errores, la primera letra debe coincidir: así «prende» no se confunde con «aprender».
  return a === b || (a[0] === b[0] && distanciaEdicion(a, b) <= tolerancia(b.length))
}

/** Las palabras de la frase, con funciones para buscar claves en ellas. */
class Frase {
  readonly texto: string
  readonly palabras: string[]
  constructor(original: string) {
    this.texto = normalizarFrase(original)
    this.palabras = this.texto ? this.texto.split(' ') : []
  }
  /** ¿Alguna palabra se parece a alguna de las claves? */
  tiene(...claves: string[]) {
    return this.palabras.some((p) => claves.some((c) => pareceA(p, c)))
  }
  /** ¿Alguna palabra empieza con alguno de estos comienzos? («practic» → practico, practicar…) */
  empiezaCon(...comienzos: string[]) {
    return this.palabras.some((p) => comienzos.some((c) => p.startsWith(c)))
  }
  /** ¿La frase contiene alguna de estas frases completas? */
  dice(...frases: string[]) {
    const conEspacios = ` ${this.texto.replace(/ñ/g, 'n')} `
    return frases.some((f) => conEspacios.includes(` ${f} `))
  }
}

// ── Vocabulario de Mani ──────────────────────────────────────────────────

/** «No», «quita», «apaga»…: la frase pide quitar o desactivar algo. */
const NEGACION = ['no', 'sin', 'quita', 'quitar', 'quitale', 'quites', 'desactiva', 'desactivar', 'apaga', 'apagar', 'elimina', 'deja', 'silencia', 'calla', 'nunca']
const esNegativa = (f: Frase) => f.tiene(...NEGACION) || f.empiezaCon('reduc')

const NOMBRES_COLOR: Record<string, ColorPrincipal> = {
  teal: 'teal',
  verde: 'teal',
  turquesa: 'teal',
  aqua: 'teal',
  aguamarina: 'teal',
  azul: 'azul',
  celeste: 'azul',
  marino: 'azul',
  morado: 'morado',
  morada: 'morado',
  violeta: 'morado',
  lila: 'morado',
  purpura: 'morado',
  rosa: 'rosa',
  rosado: 'rosa',
  rosita: 'rosa',
  fucsia: 'rosa',
  naranja: 'naranja',
  anaranjado: 'naranja',
  mandarina: 'naranja',
  negro: 'negro',
  negra: 'negro',
  gris: 'negro',
  carbon: 'negro',
}
/** Colores que la app no ofrece (el rojo está reservado para emergencias). */
const COLORES_NO_DISPONIBLES = ['rojo', 'roja', 'amarillo', 'amarilla', 'cafe', 'blanco', 'blanca', 'dorado', 'cafecito']

const VERBOS_IR = ['llevame', 'lleva', 'llevar', 'ir', 've', 'vamos', 'vete', 'abre', 'abrir', 'abreme', 'entra', 'entrar', 'pasame', 'regresa', 'regresame', 'donde', 'muestrame', 'ensename', 'quiero']

interface DestinoConClaves extends Destino {
  claves: string[]
  frases?: string[]
  /** Claves que ya son una acción («jugar», «conversar»): no necesitan «llévame a…». */
  acciones?: string[]
}

const DESTINOS: DestinoConClaves[] = [
  { ...rutaDe(VOZ_SENAS), claves: [], frases: ['voz a senas', 'texto a senas'] },
  { ...rutaDe(SENAS_TEXTO), claves: ['traductor', 'traducir', 'traduce', 'camara'], frases: ['senas a texto'], acciones: ['traducir', 'traduce'] },
  { ...rutaDe(CONVERSACION), claves: ['conversacion', 'conversar', 'platicar', 'chat'], acciones: ['conversar', 'platicar'] },
  { ruta: '/aprender/juegos', titulo: 'Juegos', claves: ['juego', 'juegos', 'jugar'], acciones: ['jugar'] },
  { ...rutaDe(APRENDIZAJE), claves: ['aprender', 'aprendizaje', 'leccion', 'lecciones', 'camino', 'abecedario', 'alfabeto', 'niveles'], acciones: ['aprender'] },
  { ...rutaDe(HISTORIAL), claves: ['historial'] },
  { ...rutaDe(MI_IA), claves: ['ia', 'inteligencia'], frases: ['mi ia'] },
  { ...rutaDe(CONFIGURACION), claves: ['configuracion', 'ajustes', 'opciones', 'preferencias'] },
  { ...rutaDe(AYUDA), claves: ['ayuda', 'preguntas'] },
  { ...rutaDe(INICIO), claves: ['inicio', 'principal', 'casa'] },
]

function rutaDe(s: { ruta: string; titulo: string }): Destino {
  return { ruta: s.ruta, titulo: s.titulo }
}

// Palabras que no ayudan a encontrar una pregunta de Ayuda.
const VACIAS = new Set(
  'como para que por con una uno unos unas los las del mas esta este esto estos donde cuando puedo hago hacer tengo quiero sirve aplicacion app mis tus muy pero porque cual cuales hay ser son tiene puede debo algo nada todo todos sale salen'.split(
    ' ',
  ),
)

// ── Cada tipo de intención ───────────────────────────────────────────────

// Las palabras largas primero, para que «buenas noches» gane sobre «noches».
const PALABRAS_ORDENADAS = [...NOMBRES_PALABRAS].sort((a, b) => b.length - a.length)

/** «¿Cómo se dice agua?», «la seña de baño»: una palabra de «Palabras y frases». */
function palabraPedida(f: Frase): Intencion | null {
  if (!f.dice('como se dice', 'como digo', 'como se hace', 'como hago', 'sena de', 'seña de', 'ensename', 'muestrame', 'como se senala', 'en senas')) return null
  const conEspacios = ` ${f.texto} `
  const nombre = PALABRAS_ORDENADAS.find((n) => conEspacios.includes(` ${n} `))
  return nombre ? { tipo: 'palabra', nombre } : null
}

function letraPedida(f: Frase): Intencion | null {
  const t = f.texto
  const unaLetra = '([a-zñ])'
  // (?![a-zñ]) en lugar de \b al final: en JavaScript \b no reconoce la Ñ como letra.
  const fin = '(?![a-zñ])'
  const conPalabraLetra = t.match(new RegExp(`\\bletra ${unaLetra}${fin}`))
  const conVerbo = /\b(hace|hago|hacer|haces|forma|sale|cuesta|muestra|muestrame|ensena|ensename|practicar|practico|dibuja|ver|es|seña|sena)(?![a-zñ])/.test(t)
    ? t.match(new RegExp(`\\bla ${unaLetra}${fin}`))
    : null
  const sola = t.match(new RegExp(`^(?:y )?(?:la )?${unaLetra}$`))
  const letra = (conPalabraLetra ?? conVerbo ?? sola)?.[1]
  if (!letra) return null
  const leCuesta = f.dice('no me sale', 'no puedo', 'no me reconoce', 'no la reconoce', 'me cuesta') || f.tiene('dificil')
  return { tipo: 'letra', letra: letra.toUpperCase(), leCuesta }
}

function colorPedido(f: Frase): Intencion | null {
  const encontrados = [...new Set(f.palabras.flatMap((p) => Object.entries(NOMBRES_COLOR).filter(([nombre]) => pareceA(p, nombre)).map(([, c]) => c)))]
  const hablaDeColor = f.tiene('color', 'colores', 'tema', 'pinta', 'pintala', 'pintar')
  const noDisponible = f.palabras.find((p) => COLORES_NO_DISPONIBLES.includes(p))

  if (f.tiene('oscuro', 'oscura', 'noche') && !encontrados.length) return hablaDeColor ? { tipo: 'color', color: 'negro' } : { tipo: 'modo-oscuro' }
  if (hablaDeColor && f.tiene('original', 'normal', 'predeterminado', 'inicial') && !encontrados.length) return { tipo: 'color', color: 'teal' }
  if (encontrados.length > 1) return { tipo: 'color', color: null, opciones: encontrados }
  if (encontrados.length === 1) return { tipo: 'color', color: encontrados[0] }
  if (noDisponible) return { tipo: 'color', color: null, noDisponible }
  if (hablaDeColor) return { tipo: 'color', color: null }
  return null
}

function lenguaPedida(f: Frase): Intencion | null {
  if (f.tiene('asl') || (f.tiene('americana', 'ingles') && f.tiene('lengua', 'senas', 'cambia', 'idioma'))) return { tipo: 'lengua', lengua: 'ASL' }
  if (f.tiene('lsm') || (f.tiene('mexicana', 'mexico') && f.tiene('lengua', 'senas', 'cambia', 'idioma'))) return { tipo: 'lengua', lengua: 'LSM' }
  if (f.tiene('lengua', 'idioma') && f.tiene('cambia', 'cambiar', 'cambiale', 'otra')) return { tipo: 'lengua', lengua: null }
  return null
}

function ajustePedido(f: Frase): Intencion | null {
  const negativa = esNegativa(f)
  const sube = f.tiene('sube', 'subele', 'aumenta', 'mas', 'agranda')
  const baja = f.tiene('baja', 'bajale', 'menos', 'reduce', 'achica')

  if (f.tiene('letra', 'letras', 'texto', 'tamano', 'fuente')) {
    if (f.tiene('normal')) return { tipo: 'ajuste', que: 'texto', direccion: 'normal' }
    if (f.tiene('chica', 'chico', 'chiquita', 'pequena', 'pequeno') || baja) return { tipo: 'ajuste', que: 'texto', direccion: 'menos' }
    if (f.tiene('grande', 'grandes', 'enorme') || sube) return { tipo: 'ajuste', que: 'texto', direccion: 'mas' }
  }
  if (f.tiene('contraste')) return { tipo: 'ajuste', que: 'contraste', direccion: negativa ? 'desactivar' : 'activar' }
  if (f.tiene('animacion', 'animaciones', 'movimiento', 'movimientos')) {
    // «Quita las animaciones» = activar «Reducir movimiento».
    return { tipo: 'ajuste', que: 'movimiento', direccion: negativa ? 'desactivar' : 'activar' }
  }
  if (f.tiene('sonido', 'sonidos', 'ruido', 'ruidos', 'efectos', 'musica')) return { tipo: 'ajuste', que: 'sonidos', direccion: negativa ? 'desactivar' : 'activar' }
  if (f.tiene('volumen') || (f.tiene('voz', 'habla', 'hablas') && f.tiene('fuerte', 'alto', 'bajito', 'quedito', 'bajo'))) {
    const menos = baja || f.tiene('bajito', 'quedito', 'bajo')
    return { tipo: 'ajuste', que: 'vozVolumen', direccion: menos ? 'menos' : 'mas' }
  }
  if (f.tiene('voz', 'habla', 'hablas', 'lee', 'leer', 'hablar')) {
    if (f.tiene('lento', 'lenta', 'despacio', 'pausado')) return { tipo: 'ajuste', que: 'vozVelocidad', direccion: 'menos' }
    if (f.tiene('rapido', 'rapida', 'aprisa', 'veloz')) return { tipo: 'ajuste', que: 'vozVelocidad', direccion: 'mas' }
  }
  if (f.tiene('historial') && f.empiezaCon('guard')) return { tipo: 'ajuste', que: 'historial', direccion: negativa ? 'desactivar' : 'activar' }
  if (f.tiene('autocorrector', 'autocorreccion', 'corrector', 'autocorregir')) return { tipo: 'ajuste', que: 'autocorreccion', direccion: negativa ? 'desactivar' : 'activar' }
  return null
}

function destinoPedido(f: Frase): Intencion | null {
  const conVerbo = f.tiene(...VERBOS_IR)
  for (const d of DESTINOS) {
    const porFrase = d.frases && f.dice(...d.frases)
    const porClave = d.claves.length > 0 && f.tiene(...d.claves)
    if (!porFrase && !porClave) continue
    const esAccion = d.acciones && f.tiene(...d.acciones)
    // Frase corta como «juegos» o «el historial» (pero no «no prende cámara», que es un problema).
    const corta = f.palabras.length <= 3 && !f.tiene('no')
    if (porFrase || conVerbo || esAccion || corta) return { tipo: 'ir', destino: { ruta: d.ruta, titulo: d.titulo } }
  }
  return null
}

// Índice de las preguntas de Ayuda (se arma una sola vez).
const INDICE_AYUDA = TEMAS.flatMap((t) =>
  t.preguntas.map((p) => ({
    encontrada: { ...p, tema: t.titulo, ruta: t.ruta } as PreguntaEncontrada,
    enPregunta: palabrasUtiles(`${t.titulo} ${p.pregunta}`),
    enRespuesta: palabrasUtiles(p.respuesta),
  })),
)

function palabrasUtiles(texto: string): string[] {
  return normalizarFrase(texto)
    .split(' ')
    .filter((p) => p.length >= 3 && !VACIAS.has(p))
}

/** Las preguntas de Ayuda que más se parecen a la frase (máximo 2). */
export function buscarEnAyuda(frase: string): PreguntaEncontrada[] {
  const buscadas = palabrasUtiles(frase)
  if (!buscadas.length) return []
  const coincide = (lista: string[], w: string) => lista.some((p) => pareceA(p, w) || (w.length >= 5 && p.startsWith(w.slice(0, 5))))
  const puntuadas = INDICE_AYUDA.map((e) => ({
    e,
    puntos: buscadas.reduce((s, w) => s + (coincide(e.enPregunta, w) ? 2 : coincide(e.enRespuesta, w) ? 1 : 0), 0),
  }))
    .filter((x) => x.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos)
  if (!puntuadas.length) return []
  const mejor = puntuadas[0].puntos
  return puntuadas
    .filter((x) => x.puntos >= mejor * 0.75)
    .slice(0, 2)
    .map((x) => x.e.encontrada)
}

// ── La función principal ─────────────────────────────────────────────────

export function entender(original: string): Intencion {
  const f = new Frase(original)
  if (!f.palabras.length) return { tipo: 'no-entendi' }

  // 1. Emergencia: siempre primero y sin hacer preguntas.
  if (f.tiene('emergencia', 'auxilio', 'socorro')) return { tipo: 'ir', destino: rutaDe(EMERGENCIA) }

  // 2. Deshacer el último cambio.
  if (f.tiene('deshaz', 'deshacer', 'deshazlo', 'revierte', 'regresalo', 'vuelvelo') || f.dice('como estaba', 'como antes')) return { tipo: 'deshacer' }

  // 3. Una letra del alfabeto («¿cómo se hace la R?») o una palabra («¿cómo se dice agua?»).
  //    La letra va primero: en «¿cómo se hace la A? no me sale», el «no» no es la palabra NO.
  const letra = letraPedida(f)
  if (letra) return letra
  const palabra = palabraPedida(f)
  if (palabra) return palabra

  // 4. Ajustes que Mani puede cambiar.
  const pedido = colorPedido(f) ?? lenguaPedida(f) ?? ajustePedido(f)
  if (pedido) return pedido

  // 5. Qué practicar.
  if (f.empiezaCon('practic', 'recomiend', 'progres', 'estudi') || f.dice('que me falta', 'como voy', 'en que voy', 'que sigue')) return { tipo: 'practicar' }

  // «Ayuda» sola: Mani explica lo que sabe hacer.
  if (f.texto === 'ayuda') return { tipo: 'presentacion' }

  // 6. Ir a una pantalla.
  const destino = destinoPedido(f)
  if (destino) return destino

  // 7. Plática.
  if (f.dice('quien eres', 'como te llamas', 'que eres', 'que puedes hacer', 'que sabes hacer', 'que haces', 'tu nombre') || f.tiene('ayudame')) return { tipo: 'presentacion' }
  if (f.tiene('gracias', 'grax', 'genial', 'excelente')) return { tipo: 'gracias' }
  if (f.palabras.length <= 4 && (f.tiene('hola', 'buenas', 'buenos', 'hey', 'saludos') || f.dice('que onda', 'que tal'))) return { tipo: 'saludo' }

  // 8. Una pregunta de la Ayuda.
  const preguntas = buscarEnAyuda(original)
  if (preguntas.length) return { tipo: 'pregunta', preguntas }

  return { tipo: 'no-entendi' }
}
