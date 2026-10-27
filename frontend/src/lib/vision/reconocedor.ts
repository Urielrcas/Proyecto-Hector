/**
 * RECONOCEDOR DE DELETREO (traductor Señas → Texto)
 * Recibe los 21 puntos de la mano en cada cuadro de la cámara y decide qué letra se está haciendo,
 * sin saberla de antemano (a diferencia de la práctica de Aprendizaje, donde la letra es conocida).
 *
 * Cómo decide:
 *   1. En cada cuadro evalúa la fórmula lógica de TODAS las letras de la lengua (postura.ts)
 *      y anota cuáles se cumplen.
 *   2. La «candidata» es la letra que más se cumplió en los últimos cuadros; la confianza es
 *      la fracción de esos cuadros en que se cumplió.
 *   3. Regla «letra reconocida»: f ∧ (m → d) ∧ (¬m → q)
 *        - letras sin movimiento: la forma se sostiene y la mano está quieta;
 *        - letras con movimiento: la forma se sostiene y se detecta su movimiento (movimiento.ts).
 *      Así se distinguen las gemelas que solo cambian por el movimiento (I/J, N/Ñ, K/P):
 *      mientras la mano se mueve no se acepta la estática, y si el movimiento se completa gana la otra.
 *   4. Después de aceptar una letra, esa forma queda bloqueada hasta que la mano cambie de forma
 *      (para no escribir «LLLL» por sostenerla). Para repetir una letra, se cambia la forma y se vuelve.
 *   5. Regla «espacio de palabra»: s ∧ u — si la mano desaparece 1.5 s después de deletrear, termina la palabra.
 *   6. IA: si hay una red neuronal convolucional entrenada (lib/ia/cnn) y está muy segura (≥ 90 %)
 *      de la forma que ve, esa forma también cuenta como «cumplida», aunque las reglas no la vean
 *      (la red aprendió cómo hace las letras ESTA persona).
 *   7. Memoria de tus señas: si la mano coincide con la forma PERSONAL que el usuario le enseñó
 *      a la IA (ej.: su A con los dedos un poco distintos), esa letra también cuenta (lib/ia/memoria.ts).
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → letras de LSM o ASL con su forma y lo que la cámara debe reconocer
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import { alfabeto, type Letra } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/logica/proposicional.ts:
//     evaluar → evalúa una fórmula lógica con los valores V/F de sus proposiciones
import { evaluar as evaluarFormula } from '../logica/proposicional'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../logica/reglas'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'
// ▸ Desde nuestro proyecto: src/lib/vision/movimiento.ts:
//     DetectorMovimiento → sigue la mano para saber si hizo el movimiento de la letra
import { DetectorMovimiento } from './movimiento'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     formulaDeObjetivo → fórmula lógica de una letra
//     leerMano → convierte los 21 puntos en la forma de la mano (dedos, pulgar, orientación)
//     proposicionesDeLectura → convierte esa forma en proposiciones V/F
//     Punto → tipo: un punto de la mano (x, y)
import { formulaDeObjetivo, leerMano, proposicionesDeLectura, type Punto } from './postura'
// ▸ Desde nuestro proyecto: src/lib/ia/cnn/clasificador.ts:
//     Clasificar → tipo: función de la red neuronal que dice qué forma ve
import type { Clasificar } from '../ia/cnn/clasificador'
// ▸ Desde nuestro proyecto: src/lib/ia/memoria.ts:
//     reconocerPersonal → ¿la mano es una forma personal recordada?;  Memoria → tipo
import { reconocerPersonal, type Memoria } from '../ia/memoria'

/** Probabilidad mínima de la red neuronal para sumar su opinión a las reglas. */
export const UMBRAL_IA = 0.9

/** Cuadros que se recuerdan para decidir (≈ 0.5 s a 30 cuadros por segundo). */
export const VENTANA = 15
/** En cuántos de esos cuadros debe cumplirse la forma para considerarla sostenida. */
export const CUADROS_SOSTENIDA = 12
/**
 * Si la forma también es la de una letra con movimiento (I/J, N/Ñ, K/P), la estática debe sostenerse
 * quieta más tiempo (≈ 1 s), para dar tiempo a empezar el movimiento de la otra.
 */
export const CUADROS_SOSTENIDA_GEMELA = 30
/** Cuadros que se miran para saber si la mano está quieta. */
const CUADROS_QUIETA = 8
/** Cuánto puede moverse el centro de la mano (en palmas) y seguir contando como quieta. */
const UMBRAL_QUIETA = 0.12
/** Cuadros seguidos sin la forma bloqueada para volver a permitirla. */
const CUADROS_LIBERAR = 8
/** Tiempo sin mano para cerrar la palabra. */
export const MS_ESPACIO = 1500

export type Aviso = 'sin-mano' | 'buscando' | 'mantener' | 'mover' | 'aceptada' | 'cambia-forma'

/** Lo que el reconocedor informa en cada cuadro. */
export interface EstadoReconocedor {
  hayMano: boolean
  /** Letra cuya forma se ve ahora (null si ninguna). */
  candidata: Letra | null
  /** Fracción de los últimos cuadros en que se cumplió la candidata (0 a 1). */
  confianza: number
  aviso: Aviso
  /** Letra gemela con movimiento que podría hacerse con la misma forma (p. ej. J cuando se ve I). */
  gemelaConMovimiento: Letra | null
  /** Letra aceptada en este cuadro (se agrega al texto). */
  letraNueva: string | null
  /** En este cuadro termina la palabra (se agrega un espacio). */
  espacio: boolean
  /** Milisegundos que lleva sin verse la mano (0 si se ve). */
  msSinMano: number
  /** Lo que cree la red neuronal (si hay una entrenada). Ej.: { nombre: 'I/J', probabilidad: 0.94 }. */
  ia: { nombre: string; probabilidad: number } | null
  /** Letra reconocida por la memoria de tus señas (tu forma personal), si hubo. */
  personal: string | null
}

export class ReconocedorDeletreo {
  private readonly letras: Letra[]
  private ventana: Set<string>[] = [] // letras que se cumplieron en cada uno de los últimos cuadros
  private seguidos = new Map<string, number>() // cuadros seguidos en que se cumple cada letra
  private centros: { x: number; y: number; palma: number }[] = []
  private detectores = new Map<string, { detector: DetectorMovimiento; fallos: number }>()
  private bloqueadas = new Set<string>() // formas ya aceptadas que deben cambiar antes de repetirse
  private cuadrosSinBloqueadas = 0
  private sinManoDesde: number | null = null
  private letraDesdeEspacio = false

  private clasificar: Clasificar | null
  private memoria: Memoria | null = null

  constructor(lengua: Lengua, clasificar: Clasificar | null = null) {
    this.letras = alfabeto(lengua)
    this.clasificar = clasificar
  }

  /** Cambia la red neuronal (por ejemplo, después de reentrenarla). */
  usarClasificador(clasificar: Clasificar | null) {
    this.clasificar = clasificar
  }

  /** Cambia la memoria de formas personales del usuario. */
  usarMemoria(memoria: Memoria | null) {
    this.memoria = memoria && memoria.personales.size ? memoria : null
  }

  /** Procesa un cuadro de la cámara: los 21 puntos (o null si no hay mano) y el tiempo en ms. */
  procesar(puntos: Punto[] | null, tiempo: number): EstadoReconocedor {
    const vacio = { candidata: null, confianza: 0, gemelaConMovimiento: null, letraNueva: null, ia: null, personal: null }

    // ── Sin mano: reiniciar y, si pasó el tiempo, cerrar la palabra (regla s ∧ u) ──
    if (!puntos) {
      this.ventana = []
      this.seguidos.clear()
      this.centros = []
      this.detectores.clear()
      this.bloqueadas.clear()
      this.sinManoDesde ??= tiempo
      const s = tiempo - this.sinManoDesde >= MS_ESPACIO
      const espacio = cumple('espacioPalabra', { s, u: this.letraDesdeEspacio })
      if (espacio) this.letraDesdeEspacio = false
      return { ...vacio, hayMano: false, aviso: 'sin-mano', espacio, msSinMano: tiempo - this.sinManoDesde }
    }
    this.sinManoDesde = null

    // ── 1. Qué letras se cumplen en este cuadro (la fórmula lógica de cada una) ──
    const valuacion = proposicionesDeLectura(leerMano(puntos))
    const cumplen = new Set(this.letras.filter((l) => evaluarFormula(formulaDeObjetivo(l.objetivo), valuacion)).map((l) => l.letra))
    // IA: la red convolucional suma su opinión si está muy segura.
    let ia: EstadoReconocedor['ia'] = null
    if (this.clasificar) {
      const p = this.clasificar(puntos)
      ia = { nombre: p.clase.nombre, probabilidad: p.probabilidad }
      if (p.probabilidad >= UMBRAL_IA) for (const l of p.clase.letras) cumplen.add(l)
    }
    // Memoria de tus señas: tu forma personal de una letra (y de sus gemelas, que comparten forma).
    let personal: string | null = null
    if (this.memoria) {
      const c = reconocerPersonal(puntos, this.memoria)
      if (c) {
        personal = c.letra
        const grupo = this.memoria.grupos.get(c.letra)
        for (const l of this.letras) if (this.memoria.grupos.get(l.letra) === grupo) cumplen.add(l.letra)
      }
    }
    this.ventana.push(cumplen)
    if (this.ventana.length > VENTANA) this.ventana.shift()
    const votos = (letra: string) => this.ventana.filter((c) => c.has(letra)).length
    for (const l of this.letras) this.seguidos.set(l.letra, cumplen.has(l.letra) ? (this.seguidos.get(l.letra) ?? 0) + 1 : 0)

    // ¿La mano está quieta? (el centro de la mano casi no se movió en los últimos cuadros)
    const palma = Math.hypot(puntos[9].x - puntos[0].x, puntos[9].y - puntos[0].y) || 1
    this.centros.push({ x: puntos[9].x, y: puntos[9].y, palma })
    if (this.centros.length > CUADROS_QUIETA) this.centros.shift()
    const q =
      this.centros.length >= CUADROS_QUIETA &&
      Math.max(...this.centros.map((c) => Math.hypot(c.x - this.centros[0].x, c.y - this.centros[0].y) / palma)) < UMBRAL_QUIETA

    // ── 2. Bloqueo: la forma recién aceptada no cuenta hasta que la mano cambie de forma ──
    if ([...this.bloqueadas].some((l) => cumplen.has(l))) this.cuadrosSinBloqueadas = 0
    else if (++this.cuadrosSinBloqueadas >= CUADROS_LIBERAR) this.bloqueadas.clear()

    // ── 3. Letras con movimiento: seguir la mano mientras se ve su forma ──
    for (const l of this.letras) {
      if (!l.objetivo.movimiento) continue
      let seguimiento = this.detectores.get(l.letra)
      if (cumplen.has(l.letra) && !this.bloqueadas.has(l.letra)) {
        if (!seguimiento) {
          seguimiento = { detector: new DetectorMovimiento(l.objetivo.movimiento), fallos: 0 }
          this.detectores.set(l.letra, seguimiento)
        }
        seguimiento.fallos = 0
        seguimiento.detector.agregar(puntos, tiempo)
      } else if (seguimiento && ++seguimiento.fallos > 10) {
        this.detectores.delete(l.letra) // perdió la forma: empezar el movimiento de nuevo
      }
    }

    // ── 4. Candidata: la letra más votada en los últimos cuadros (en empate, la que no lleva movimiento) ──
    const posibles = this.letras.filter((l) => votos(l.letra) > 0 && !this.bloqueadas.has(l.letra))
    posibles.sort((a, b) => votos(b.letra) - votos(a.letra) || Number(!!a.objetivo.movimiento) - Number(!!b.objetivo.movimiento))
    const candidata = posibles[0] ?? null
    const gemelaConMovimiento =
      candidata && !candidata.objetivo.movimiento ? (posibles.find((l) => l !== candidata && l.objetivo.movimiento && cumplen.has(l.letra)) ?? null) : null

    // ── 5. Regla «letra reconocida»: f ∧ (m → d) ∧ (¬m → q). Primero las que llevan movimiento. ──
    let aceptada: Letra | null = null
    for (const l of [...posibles].sort((a, b) => Number(!!b.objetivo.movimiento) - Number(!!a.objetivo.movimiento))) {
      const m = !!l.objetivo.movimiento
      // ¿Hay una letra con movimiento que comparte esta forma? (la estática espera más)
      const tieneGemela = !m && this.letras.some((g) => g.objetivo.movimiento && cumplen.has(g.letra))
      const f = m
        ? votos(l.letra) >= VENTANA / 2 && cumplen.has(l.letra)
        : votos(l.letra) >= CUADROS_SOSTENIDA && cumplen.has(l.letra) && (!tieneGemela || (this.seguidos.get(l.letra) ?? 0) >= CUADROS_SOSTENIDA_GEMELA)
      const d = this.detectores.get(l.letra)?.detector.detectado() ?? false
      if (cumple('letraReconocida', { f, m, d, q })) {
        aceptada = l
        break
      }
    }

    if (aceptada) {
      // Bloquear todas las formas que se ven ahora (incluida la gemela) y empezar de cero.
      this.bloqueadas = new Set(cumplen)
      this.cuadrosSinBloqueadas = 0
      this.ventana = []
      this.seguidos.clear()
      this.detectores.clear()
      this.letraDesdeEspacio = true
      return { hayMano: true, candidata: aceptada, confianza: 1, aviso: 'aceptada', gemelaConMovimiento: null, letraNueva: aceptada.letra, espacio: false, msSinMano: 0, ia, personal }
    }

    const aviso: Aviso = !candidata
      ? [...this.bloqueadas].some((l) => cumplen.has(l))
        ? 'cambia-forma'
        : 'buscando'
      : candidata.objetivo.movimiento
        ? 'mover'
        : 'mantener'
    return {
      hayMano: true,
      candidata,
      confianza: candidata ? votos(candidata.letra) / VENTANA : 0,
      aviso,
      gemelaConMovimiento,
      letraNueva: null,
      espacio: false,
      msSinMano: 0,
      ia,
      personal,
    }
  }
}
