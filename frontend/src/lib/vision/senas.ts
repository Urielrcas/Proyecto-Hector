/**
 * RECONOCER SEÑAS DE PALABRAS (una o dos manos)
 *
 * Cada seña se describe con las mismas piezas que da el diccionario (lib/aprendizaje/palabras.ts):
 *   - FORMA de la mano principal: una letra del alfabeto («una letra B») o una forma general
 *     (mano abierta, puño, solo el índice…).
 *   - LUGAR: dónde se pone (barbilla, pecho, frente…), con los puntos del cuerpo (escena.ts).
 *   - OTRA MANO (si usa las dos): su forma y cómo se relaciona con la principal (juntas, encima…).
 *   - MOVIMIENTO: al frente, abajo, de lado a lado, en círculo, abrir y cerrar la mano…
 * Algunas señas tienen varias PARTES seguidas: «Buenos días» = B al frente y luego D de lado.
 *
 * En cada cuadro se revisa cada pieza, y la parte se reconoce con la regla de lógica proposicional
 * senaReconocida: f ∧ l ∧ (d → p) ∧ (m → v)   (lib/logica/reglas.ts).
 * Si algo falta, se da UN consejo, en orden: forma → lugar → otra mano → movimiento.
 */
import { alfabeto } from '../aprendizaje/alfabeto'
import { cumple } from '../logica/reglas'
import type { Lengua } from '../tipos'
import { centroPalma, cuerpoDesdePose, CONSEJO_RELACION, cumpleRelacion, estaEn, NOMBRE_LUGAR, tamanoPalma, type Escena, type Lugar, type Relacion } from './escena'
import { cambiosDeSentido } from './movimiento'
import { DEDOS_LARGOS, evaluar, leerMano, type DedoLargo, type Objetivo, type Punto } from './postura'

export { cuerpoDesdePose }

// ── Formas de la mano ────────────────────────────────────────────────────

type Estado = 'estirado' | 'curvo' | 'doblado'
const CUALQUIER_DEDO: Estado[] = ['estirado', 'curvo', 'doblado']
const CERRADO: Estado[] = ['curvo', 'doblado']
const CUALQUIER_PULGAR: Objetivo['pulgar'] = ['estirado', 'lado', 'toca', 'entre', 'sobre', 'doblado']
const dedos = (indice: Estado[], medio: Estado[], anular: Estado[], menique: Estado[]): Record<DedoLargo, Estado[]> => ({ indice, medio, anular, menique })

/** Formas generales (las que el diccionario describe sin letra). */
const FORMAS_GENERALES = {
  abierta: { nombre: 'la mano abierta', objetivo: { dedos: dedos(['estirado'], ['estirado'], ['estirado'], ['estirado']), pulgar: CUALQUIER_PULGAR } },
  puno: { nombre: 'la mano cerrada (puño)', objetivo: { dedos: dedos(CERRADO, CERRADO, CERRADO, CERRADO), pulgar: CUALQUIER_PULGAR } },
  indice: { nombre: 'solo el índice', objetivo: { dedos: dedos(CUALQUIER_DEDO, CERRADO, CERRADO, CERRADO), pulgar: CUALQUIER_PULGAR } },
  indiceEstirado: { nombre: 'el índice estirado', objetivo: { dedos: dedos(['estirado'], CERRADO, CERRADO, CERRADO), pulgar: CUALQUIER_PULGAR } },
  menique: { nombre: 'una I (puño con el meñique)', objetivo: { dedos: dedos(CERRADO, CERRADO, CERRADO, CUALQUIER_DEDO), pulgar: CUALQUIER_PULGAR } },
  capullo: { nombre: 'un capullo (las puntas de los dedos juntas)', objetivo: { dedos: dedos(['curvo', 'estirado'], ['curvo', 'estirado'], ['curvo', 'estirado'], CUALQUIER_DEDO), pulgar: ['toca'] } },
  garra: { nombre: 'la mano en garra', objetivo: { dedos: dedos(['curvo'], ['curvo'], ['curvo'], ['curvo']), pulgar: CUALQUIER_PULGAR } },
  cuatro: { nombre: 'un 4 (cuatro dedos estirados)', objetivo: { dedos: dedos(['estirado'], ['estirado'], ['estirado'], ['estirado']), pulgar: ['doblado', 'lado', 'entre'] } },
  cualquiera: { nombre: 'la mano', objetivo: { dedos: dedos(CUALQUIER_DEDO, CUALQUIER_DEDO, CUALQUIER_DEDO, CUALQUIER_DEDO), pulgar: CUALQUIER_PULGAR } },
} satisfies Record<string, { nombre: string; objetivo: Objetivo }>

type NombreForma = keyof typeof FORMAS_GENERALES
/** Una forma: una letra del alfabeto o una forma general. */
export type Forma = { letra: string } | { forma: NombreForma }

interface FormaLista {
  nombre: string
  objetivo: Objetivo
}

/**
 * La forma lista para evaluar. Para las letras se toma su objetivo SIN orientación ni palma:
 * en «una B sobre la barbilla» la mano puede estar girada distinto que en el alfabeto.
 */
function prepararForma(f: Forma, lengua: Lengua): FormaLista {
  if ('forma' in f) return FORMAS_GENERALES[f.forma]
  const letra = alfabeto(lengua).find((l) => l.letra === f.letra)
  if (!letra) throw new Error(`La letra ${f.letra} no existe en ${lengua}`)
  const { dedos, pulgar, entre, separacion, cruzados } = letra.objetivo
  return { nombre: `una letra ${f.letra}`, objetivo: { dedos, pulgar, entre, separacion, cruzados } }
}

// ── Movimientos ──────────────────────────────────────────────────────────

export type MovSena =
  | 'quieta'
  | 'al-frente'
  | 'adelante-atras'
  | 'abajo'
  | 'arriba'
  | 'lado'
  | 'lado-a-lado'
  | 'arriba-abajo'
  | 'golpecitos'
  | 'circulo'
  | 'cerrar'
  | 'abrir-cerrar'
  | 'indice-encoge'
  | 'menique-encoge'
  | 'cualquiera'

export const INSTRUCCION_MOV: Record<MovSena, string> = {
  quieta: 'Mantén la mano quieta un momento.',
  'al-frente': 'Ahora mueve la mano hacia el frente.',
  'adelante-atras': 'Ahora mueve la mano al frente y de regreso.',
  abajo: 'Ahora baja la mano.',
  arriba: 'Ahora sube la mano.',
  lado: 'Ahora mueve la mano hacia un lado.',
  'lado-a-lado': 'Ahora mueve la mano de un lado a otro.',
  'arriba-abajo': 'Ahora mueve la mano de arriba a abajo, varias veces.',
  golpecitos: 'Ahora da golpecitos suaves, dos veces.',
  circulo: 'Ahora haz círculos con la mano.',
  cerrar: 'Ahora dobla los dedos (cierra la mano).',
  'abrir-cerrar': 'Ahora abre y cierra la mano varias veces.',
  'indice-encoge': 'Ahora encoge y estira el índice, dos veces.',
  'menique-encoge': 'Ahora encoge y estira el meñique, dos veces.',
  cualquiera: 'Ahora haz el movimiento de la seña.',
}

/** Lo que se guarda de cada cuadro para juzgar el movimiento. */
interface Cuadro {
  t: number
  forma: boolean
  lugar: boolean
  otra: boolean
  x: number
  y: number
  /** Tamaño de la palma: si crece, la mano se acerca a la cámara (va «al frente»). */
  s: number
  estirados: number
  indice: boolean
  menique: boolean
}

/** ¿Hay dos cuadros i < j con valor[j] − valor[i] > umbral? (un avance en un sentido) */
function avanza(serie: number[], umbral: number): boolean {
  let minimo = Infinity
  for (const v of serie) {
    if (v - minimo > umbral) return true
    minimo = Math.min(minimo, v)
  }
  return false
}

/** Veces que algo pasa de verdadero a falso o al revés. */
const cambios = (serie: boolean[]) => serie.reduce((n, v, i) => (i > 0 && v !== serie[i - 1] ? n + 1 : n), 0)

/** ¿Se detectó el movimiento en estos cuadros? Distancias en palmas. */
export function detectarMovimiento(mov: MovSena, cs: Cuadro[]): boolean {
  if (cs.length < 6) return false
  const palma = cs.map((c) => c.s).sort((a, b) => a - b)[Math.floor(cs.length / 2)]
  const xs = cs.map((c) => c.x / palma)
  const ys = cs.map((c) => c.y / palma)
  const ss = cs.map((c) => c.s / palma)
  const rango = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  switch (mov) {
    case 'quieta':
      return rango < 0.6
    case 'al-frente':
      return avanza(ss, 0.12) || avanza(ys, 0.7)
    case 'adelante-atras':
      return cambiosDeSentido(ss, 0.07) >= 1 || cambiosDeSentido(ys, 0.35) >= 1
    case 'abajo':
      return avanza(ys, 0.8)
    case 'arriba':
      return avanza(ys.map((v) => -v), 0.8)
    case 'lado':
      return avanza(xs, 0.8) || avanza(xs.map((v) => -v), 0.8)
    case 'lado-a-lado':
      return cambiosDeSentido(xs, 0.25) >= 2
    case 'arriba-abajo':
      return cambiosDeSentido(ys, 0.25) >= 2
    case 'golpecitos':
      return cambiosDeSentido(ys, 0.08) >= 2 || cambiosDeSentido(ss, 0.04) >= 2
    case 'circulo':
      return cambiosDeSentido(xs, 0.2) >= 1 && cambiosDeSentido(ys, 0.2) >= 1
    case 'cerrar':
      return cs.some((c, i) => c.estirados >= 3 && cs.slice(i).some((d) => d.estirados <= 1))
    case 'abrir-cerrar':
      return cambios(cs.map((c) => c.estirados >= 3)) >= 2
    case 'indice-encoge':
      return cambios(cs.map((c) => c.indice)) >= 2
    case 'menique-encoge':
      return cambios(cs.map((c) => c.menique)) >= 2
    case 'cualquiera':
      return rango > 0.5 || cambiosDeSentido(ss, 0.07) >= 1
  }
}

// ── Las señas ────────────────────────────────────────────────────────────

export interface ParteSena {
  forma: Forma
  /** Si no se da, la seña se hace frente al cuerpo (cualquier lugar). */
  lugar?: Lugar[]
  movimiento?: MovSena
  otra?: { forma: Forma; relacion: Relacion }
}

const B = { letra: 'B' }
const abierta: Forma = { forma: 'abierta' }

/**
 * Señas que la cámara sabe reconocer, por id de palabra (lib/aprendizaje/palabras.ts).
 * Las que no están aquí se practican deletreándolas.
 */
export const SENAS: Record<string, ParteSena[]> = {
  // LSM · Diccionario «Manos con Voz»
  'lsm-buenos-dias': [{ forma: B, lugar: ['pecho'], movimiento: 'al-frente' }, { forma: { letra: 'D' }, movimiento: 'lado' }],
  'lsm-buenas-tardes': [{ forma: B, lugar: ['pecho'], movimiento: 'al-frente' }, { forma: { letra: 'T' }, movimiento: 'cualquiera' }],
  'lsm-buenas-noches': [{ forma: B, lugar: ['pecho'], movimiento: 'al-frente' }, { forma: { letra: 'G' }, lugar: ['frente'], movimiento: 'abajo' }],
  'lsm-adios': [{ forma: abierta, movimiento: 'cerrar' }],
  'lsm-amigo': [{ forma: abierta, otra: { forma: abierta, relacion: 'juntas' }, movimiento: 'quieta' }],
  'lsm-bien': [{ forma: B, lugar: ['barbilla'], movimiento: 'al-frente' }],
  'lsm-por-favor': [{ forma: abierta, otra: { forma: abierta, relacion: 'juntas' }, movimiento: 'adelante-atras' }],
  'lsm-si': [{ forma: { forma: 'menique' }, movimiento: 'menique-encoge' }],
  'lsm-agua': [{ forma: { forma: 'indice' }, movimiento: 'indice-encoge' }],
  'lsm-comida': [{ forma: { forma: 'capullo' }, lugar: ['boca'], movimiento: 'adelante-atras' }],
  'lsm-hambre': [{ forma: abierta, lugar: ['estomago'], otra: { forma: abierta, relacion: 'lado-a-lado' }, movimiento: 'cerrar' }],
  'lsm-sed': [{ forma: { letra: 'A' }, lugar: ['cuello'], movimiento: 'abajo' }],
  'lsm-tomar': [{ forma: { letra: 'C' }, lugar: ['barbilla', 'boca'], movimiento: 'arriba' }],
  'lsm-baño': [{ forma: B, lugar: ['pecho'], movimiento: 'arriba-abajo' }],
  'lsm-cama': [{ forma: { letra: 'C' }, lugar: ['mejilla'], movimiento: 'quieta' }],
  'lsm-casa': [{ forma: abierta, otra: { forma: abierta, relacion: 'yemas-unidas' }, movimiento: 'quieta' }],
  'lsm-necesitar': [{ forma: { letra: 'N' }, movimiento: 'lado-a-lado' }],
  'lsm-ayudar': [{ forma: { letra: 'A' }, otra: { forma: abierta, relacion: 'sobre-palma' }, movimiento: 'arriba' }],
  'lsm-urgente': [{ forma: { letra: 'U' }, movimiento: 'lado' }],
  'lsm-cuidado': [{ forma: { letra: 'C' }, otra: { forma: { letra: 'C' }, relacion: 'lado-a-lado' }, movimiento: 'adelante-atras' }],
  'lsm-mal': [{ forma: { letra: 'M' }, lugar: ['barbilla'], movimiento: 'abajo' }],
  'lsm-sangre': [{ forma: { forma: 'puno' }, otra: { forma: { forma: 'puno' }, relacion: 'juntas' }, movimiento: 'circulo' }],
  'lsm-bombero': [{ forma: { forma: 'cuatro' }, lugar: ['cabeza', 'frente'], movimiento: 'cualquiera' }],
  // ASL · «American Sign Language For Dummies»
  'asl-hola': [{ forma: B, lugar: ['frente'], movimiento: 'lado' }],
  'asl-disculpa': [{ forma: abierta, otra: { forma: abierta, relacion: 'sobre-palma' }, movimiento: 'cualquiera' }],
  'asl-por-favor': [{ forma: abierta, lugar: ['pecho'], movimiento: 'circulo' }],
  'asl-adios': [{ forma: abierta, movimiento: 'abrir-cerrar' }],
  'asl-agua': [{ forma: { letra: 'W' }, lugar: ['barbilla', 'boca'], movimiento: 'golpecitos' }],
  'asl-leche': [{ forma: { forma: 'cualquiera' }, movimiento: 'abrir-cerrar' }],
  'asl-comer': [{ forma: { forma: 'capullo' }, lugar: ['boca'], movimiento: 'golpecitos' }],
  'asl-baño': [{ forma: { letra: 'T' }, movimiento: 'lado-a-lado' }],
  'asl-emergencia': [{ forma: { letra: 'E' }, movimiento: 'lado-a-lado' }],
  'asl-doctor': [{ forma: { forma: 'cualquiera' }, otra: { forma: abierta, relacion: 'sobre-palma' }, movimiento: 'golpecitos' }],
  'asl-enfermera': [{ forma: { letra: 'N' }, otra: { forma: abierta, relacion: 'sobre-palma' }, movimiento: 'golpecitos' }],
  'asl-dolor': [{ forma: { forma: 'indiceEstirado' }, otra: { forma: { forma: 'indiceEstirado' }, relacion: 'puntas-cerca' }, movimiento: 'cualquiera' }],
  'asl-medicina': [{ forma: { forma: 'cualquiera' }, otra: { forma: abierta, relacion: 'sobre-palma' }, movimiento: 'circulo' }],
  'asl-ambulancia': [{ forma: { forma: 'garra' }, lugar: ['mejilla', 'frente', 'cabeza'], movimiento: 'cualquiera' }],
  'asl-fuego': [{ forma: abierta, otra: { forma: abierta, relacion: 'lado-a-lado' }, movimiento: 'arriba' }],
}

export const tieneSena = (idPalabra: string) => idPalabra in SENAS

// ── El reconocedor ───────────────────────────────────────────────────────

/** Ventana de tiempo que se mira para decidir (ms). */
const VENTANA_MS = 1600
/** Tiempo para hacer la siguiente parte de una seña compuesta (ms). */
const MS_SIGUIENTE_PARTE = 4000
/** Después de reconocerla, cuánto se espera para volver a intentar (ms). */
const MS_PAUSA = 1500

export interface Revision {
  forma: boolean
  lugar: boolean
  otra: boolean
  movimiento: boolean
}

export interface EstadoSena {
  /** En este cuadro se terminó la seña completa. */
  reconocida: boolean
  /** Parte que se está haciendo (0 = la primera). */
  parte: number
  partes: number
  /** Qué piezas de la parte actual ya están bien. */
  revision: Revision
  consejo: string
  manos: number
  hayCuerpo: boolean
  /** Lugar donde debe ir la mano (para dibujarlo en la cámara). */
  lugarObjetivo: Lugar | null
}

interface ParteLista {
  forma: FormaLista
  lugar?: Lugar[]
  movimiento?: MovSena
  otra?: { forma: FormaLista; relacion: Relacion }
}

export class ReconocedorSena {
  private readonly partes: ParteLista[]
  private parte = 0
  private historia: Cuadro[] = []
  private finParteAnterior = 0
  private pausaHasta = 0

  constructor(idPalabra: string, lengua: Lengua) {
    const partes = SENAS[idPalabra]
    if (!partes) throw new Error(`No hay seña para ${idPalabra}`)
    this.partes = partes.map((p) => ({
      ...p,
      forma: prepararForma(p.forma, lengua),
      otra: p.otra && { relacion: p.otra.relacion, forma: prepararForma(p.otra.forma, lengua) },
    }))
  }

  reiniciar() {
    this.parte = 0
    this.historia = []
  }

  procesar(escena: Escena, t: number): EstadoSena {
    const p = this.partes[this.parte]
    const base = { parte: this.parte, partes: this.partes.length, manos: escena.manos.length, hayCuerpo: !!escena.cuerpo, lugarObjetivo: p.lugar?.[0] ?? null }
    const nada: Revision = { forma: false, lugar: false, otra: false, movimiento: false }

    // Seña compuesta: si tarda mucho en hacer la siguiente parte, vuelve a empezar.
    if (this.parte > 0 && t - this.finParteAnterior > MS_SIGUIENTE_PARTE) {
      this.reiniciar()
      return this.procesar(escena, t)
    }
    if (t < this.pausaHasta) return { ...base, reconocida: false, revision: nada, consejo: '¡Muy bien!' }

    if (!escena.manos.length) {
      this.historia = this.historia.filter((c) => t - c.t < 600)
      return { ...base, reconocida: false, revision: nada, consejo: 'Muestra tu mano frente a la cámara.' }
    }

    // Elegir cuál mano es la principal: la combinación que cumple más cosas.
    const opciones = escena.manos.map((activa, i) => {
      const otra = escena.manos.length > 1 ? escena.manos[1 - i] : null
      const evaluacion = evaluar(activa.normal, p.forma.objetivo)
      const forma = evaluacion.correcto
      const puntosClave = [centroPalma(activa.puntos), activa.puntos[4], activa.puntos[8], activa.puntos[12]]
      const lugar = !p.lugar || (!!escena.cuerpo && p.lugar.some((l) => puntosClave.some((q) => estaEn(l, q, escena.cuerpo!))))
      const otraForma = !!otra && !!p.otra && evaluar(otra.normal, p.otra.forma.objetivo).correcto
      const otraOk = !p.otra || (otraForma && cumpleRelacion(p.otra.relacion, activa.puntos, otra!.puntos))
      return { activa, forma, lugar, otraForma, otraOk, consejoForma: evaluacion.consejos[0], puntaje: +forma * 2 + +lugar + +otraOk }
    })
    const mejor = opciones.reduce((a, b) => (b.puntaje > a.puntaje ? b : a))

    const lectura = leerMano(mejor.activa.normal)
    const centro = centroPalma(mejor.activa.puntos)
    this.historia.push({
      t,
      forma: mejor.forma,
      lugar: mejor.forma && mejor.lugar,
      otra: mejor.otraOk,
      x: centro.x,
      y: centro.y,
      s: tamanoPalma(mejor.activa.puntos),
      estirados: DEDOS_LARGOS.filter((d) => lectura.dedos[d] === 'estirado').length,
      indice: lectura.dedos.indice === 'estirado',
      menique: lectura.dedos.menique === 'estirado',
    })
    this.historia = this.historia.filter((c) => t - c.t <= VENTANA_MS)

    // Revisar cada pieza en la ventana de tiempo.
    const conForma = this.historia.filter((c) => c.forma)
    const proporcion = (n: number) => n / this.historia.length
    // Para los movimientos de los dedos (abrir, encoger) la forma cambia a propósito: se miran todos los cuadros.
    const movDeDedos = p.movimiento === 'cerrar' || p.movimiento === 'abrir-cerrar' || p.movimiento === 'indice-encoge' || p.movimiento === 'menique-encoge'
    const f = proporcion(conForma.length) >= 0.45 && this.historia.length >= 8
    const l = !p.lugar || this.historia.filter((c) => c.lugar).length >= 3
    const d = !!p.otra
    const pOk = !p.otra || proporcion(this.historia.filter((c) => c.otra).length) >= 0.5
    const m = !!p.movimiento
    const v = !p.movimiento || detectarMovimiento(p.movimiento, movDeDedos ? this.historia : conForma)
    const revision: Revision = { forma: f || mejor.forma, lugar: l, otra: pOk, movimiento: v }

    if (cumple('senaReconocida', { f, l, d, p: pOk, m, v })) {
      this.historia = []
      if (this.parte < this.partes.length - 1) {
        this.parte++
        this.finParteAnterior = t
        return { ...base, reconocida: false, revision, consejo: '¡Bien! Ahora la siguiente parte.' }
      }
      this.parte = 0
      this.pausaHasta = t + MS_PAUSA
      return { ...base, reconocida: true, revision, consejo: '¡Muy bien!' }
    }

    return { ...base, reconocida: false, revision, consejo: this.consejo(p, mejor, escena, { f, l, pOk }) }
  }

  private consejo(
    p: ParteLista,
    mejor: { forma: boolean; lugar: boolean; otraForma: boolean; consejoForma?: string },
    escena: Escena,
    ok: { f: boolean; l: boolean; pOk: boolean },
  ): string {
    if (!mejor.forma && !ok.f) return `Haz ${p.forma.nombre}.${mejor.consejoForma ? ` ${mejor.consejoForma}` : ''}`
    if (!ok.l) {
      if (!escena.cuerpo) return 'Aléjate un poco: que se vean tu cara y tus hombros.'
      return `Lleva la mano a ${NOMBRE_LUGAR[p.lugar![0]]}.`
    }
    if (p.otra && !ok.pOk) {
      if (escena.manos.length < 2) return `Usa también la otra mano: haz ${p.otra.forma.nombre}.`
      if (!mejor.otraForma) return `Con la otra mano haz ${p.otra.forma.nombre}.`
      return CONSEJO_RELACION[p.otra.relacion]
    }
    return p.movimiento ? INSTRUCCION_MOV[p.movimiento] : 'Mantén la seña un momento.'
  }
}

/** Para dibujar la mano en la cámara: los puntos crudos de MediaPipe pasados a coordenadas sin estirar. */
export function sinEstirar(puntos: Punto[], aspecto: number): Punto[] {
  return puntos.map((q) => ({ ...q, x: q.x * aspecto }))
}
