/**
 * SEGUIDOR DE INTENTOS (para el expediente y los consejos: prácticas 16, 18, 19, 26 y 27)
 *
 * Al practicar una letra, la cámara manda ~30 cuadros por segundo. Aquí se decide qué es UN INTENTO:
 *   - Empieza cuando aparece la mano.
 *   - Termina BIEN cuando la app da la letra por lograda (lograda()).
 *   - Termina MAL si pasan ~5 segundos con la mano a la vista sin lograrla, o si la mano se va
 *     más de 1.5 s (siempre que se haya visto al menos ~0.7 s; si fue un instante, no cuenta).
 * De cada intento se guarda:
 *   - puntaje: el mejor momento (cuántos dedos estuvieron bien × 20 → 0, 20, …, 100),
 *   - los dedos que fallaron en ese mejor momento,
 *   - con qué letra lo confundió la IA (la que más vio, si no era la correcta),
 *   - cuánto duró.
 */
import type { Dedo } from '../vision/postura'

/** Cuadros con la mano a la vista para cerrar un intento fallido (~5 s a 30 cuadros por segundo). */
export const CUADROS_POR_INTENTO = 150
/** Cuadros mínimos para que cuente como intento (~0.7 s). */
export const CUADROS_MINIMOS = 20
/** Milisegundos sin mano para dar por terminado el intento. */
export const MS_SIN_MANO = 1500

export interface ResultadoIntento {
  acierto: boolean
  puntaje: number
  segundos: number
  letraDetectada: string | null
  dedosFallados: Dedo[]
}

interface EnCurso {
  inicio: number
  ultimaMano: number
  cuadros: number
  mejor: number
  dedosMejor: Dedo[]
  detectadas: Map<string, number>
}

export class SeguidorIntentos {
  private actual: EnCurso | null = null
  private readonly alTerminar: (r: ResultadoIntento) => void

  constructor(alTerminar: (r: ResultadoIntento) => void) {
    this.alTerminar = alTerminar
  }

  /**
   * Un cuadro de la cámara.
   *   dedosOk: qué dedos están bien (null si no hay mano)
   *   detectada: la letra que cree la IA en este cuadro (null si no se preguntó o es la correcta)
   */
  cuadro(dedosOk: Record<Dedo, boolean> | null, detectada: string | null, tiempo: number) {
    if (!dedosOk) {
      if (this.actual && tiempo - this.actual.ultimaMano > MS_SIN_MANO) this.cerrar(false, this.actual.ultimaMano)
      return
    }
    this.actual ??= { inicio: tiempo, ultimaMano: tiempo, cuadros: 0, mejor: -1, dedosMejor: [], detectadas: new Map() }
    const a = this.actual
    a.ultimaMano = tiempo
    a.cuadros++
    const fallados = (Object.keys(dedosOk) as Dedo[]).filter((d) => !dedosOk[d])
    const bien = 5 - fallados.length
    if (bien > a.mejor) {
      a.mejor = bien
      a.dedosMejor = fallados
    }
    if (detectada) a.detectadas.set(detectada, (a.detectadas.get(detectada) ?? 0) + 1)
    if (a.cuadros >= CUADROS_POR_INTENTO) this.cerrar(false, tiempo)
  }

  /** La app dio la letra por lograda: el intento en curso termina bien. */
  lograda(tiempo: number) {
    this.actual ??= { inicio: tiempo, ultimaMano: tiempo, cuadros: CUADROS_MINIMOS, mejor: 5, dedosMejor: [], detectadas: new Map() }
    this.cerrar(true, tiempo)
  }

  /** Olvida el intento en curso sin guardarlo (por ejemplo, al cambiar de letra). */
  reiniciar() {
    this.actual = null
  }

  private cerrar(acierto: boolean, fin: number) {
    const a = this.actual
    this.actual = null
    if (!a || (!acierto && a.cuadros < CUADROS_MINIMOS)) return
    let letraDetectada: string | null = null
    if (!acierto) {
      let max = 0
      for (const [letra, veces] of a.detectadas) if (veces > max) [letraDetectada, max] = [letra, veces]
    }
    this.alTerminar({
      acierto,
      puntaje: acierto ? 100 : Math.max(0, a.mejor) * 20,
      segundos: Math.round(Math.max(0, fin - a.inicio) / 100) / 10,
      letraDetectada,
      dedosFallados: acierto ? [] : a.dedosMejor,
    })
  }
}
