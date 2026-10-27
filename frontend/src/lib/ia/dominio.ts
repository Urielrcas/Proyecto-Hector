/**
 * IA 1 · MODELO DEL ESTUDIANTE (cuánto domina el usuario cada letra)
 *
 * Usa «Bayesian Knowledge Tracing» (BKT), un modelo de probabilidad que se usa en tutores
 * inteligentes. Para cada letra guarda p = probabilidad de que el usuario YA la domine.
 * Cada vez que intenta la letra (practicando o jugando) la IA actualiza p con la regla de Bayes:
 *
 *   Si acertó:  p' = p·(1−S) / [p·(1−S) + (1−p)·G]
 *   Si falló:   p' = p·S     / [p·S     + (1−p)·(1−G)]
 *   Y como al intentar también se aprende:  p'' = p' + (1−p')·T
 *
 *   G (guess / adivinar): probabilidad de acertar SIN dominarla (en opción múltiple es alta: 1 de 4).
 *   S (slip / descuido):  probabilidad de fallar AUNQUE la domine.
 *   T (transit / aprender): probabilidad de aprenderla en ese intento.
 *
 * Ejemplo con la letra R: empieza en p = 0.10. Acierta en el reto con cámara (G = 0.05, S = 0.15):
 *   p' = 0.10·0.85 / (0.10·0.85 + 0.90·0.05) = 0.085 / 0.13 = 0.65 → con T: 0.65 + 0.35·0.12 = 0.70.
 *
 * Además la IA supone que se olvida con el tiempo: el dominio «efectivo» baja a la mitad cada
 * 21 días sin practicar. Con todo esto recomienda qué letra practicar y por qué.
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     Letra → tipo: una letra con su forma
import type { Letra } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     diferencias → qué tan distintas son dos formas de mano
import { diferencias } from '../aprendizaje/grafoLetras'

/** De dónde viene la observación (cada fuente tiene distinta probabilidad de «atinarle» sin saber). */
export type Fuente = 'camara' | 'opcion' | 'memorama'

export const PARAMETROS: Record<Fuente, { G: number; S: number; T: number }> = {
  camara: { G: 0.05, S: 0.15, T: 0.12 }, // hacer la seña: casi imposible atinarle por suerte
  opcion: { G: 0.25, S: 0.1, T: 0.08 }, // 4 opciones: 1 de 4 por suerte
  memorama: { G: 0.3, S: 0.1, T: 0.05 }, // voltear cartas: mucha suerte posible
}

/** Probabilidad inicial de dominar una letra que nunca se ha intentado. */
export const P_INICIAL = 0.1
/** A partir de aquí la letra se considera dominada. */
export const UMBRAL_DOMINIO = 0.85
/** Días para que el dominio efectivo baje a la mitad sin practicar. */
export const VIDA_MEDIA_DIAS = 21

const DIA = 24 * 60 * 60 * 1000

export interface EstadoLetra {
  /** Probabilidad de que domine la letra (0 a 1). */
  p: number
  intentos: number
  aciertos: number
  /** Fecha del último intento (ms). */
  ultima: number
}

export type Dominio = Record<string, EstadoLetra>

/** Actualiza el estado de una letra con un intento (regla de Bayes + aprendizaje). */
export function actualizar(estado: EstadoLetra | undefined, acierto: boolean, fuente: Fuente, ahora = Date.now()): EstadoLetra {
  const { G, S, T } = PARAMETROS[fuente]
  const p = estado?.p ?? P_INICIAL
  const posterior = acierto ? (p * (1 - S)) / (p * (1 - S) + (1 - p) * G) : (p * S) / (p * S + (1 - p) * (1 - G))
  const conAprendizaje = posterior + (1 - posterior) * T
  return {
    p: Math.min(0.999, Math.max(0.001, conAprendizaje)),
    intentos: (estado?.intentos ?? 0) + 1,
    aciertos: (estado?.aciertos ?? 0) + (acierto ? 1 : 0),
    ultima: ahora,
  }
}

/** Dominio «efectivo» hoy: el que se calculó, menos lo que se olvida con los días. */
export function dominioEfectivo(estado: EstadoLetra | undefined, ahora = Date.now()): number {
  if (!estado) return 0
  const dias = Math.max(0, (ahora - estado.ultima) / DIA)
  return estado.p * Math.pow(0.5, dias / VIDA_MEDIA_DIAS)
}

export type Nivel = 'nueva' | 'aprendiendo' | 'dominada' | 'repasar'

/** En qué punto está la letra (para colores y textos). */
export function nivelLetra(estado: EstadoLetra | undefined, ahora = Date.now()): Nivel {
  if (!estado) return 'nueva'
  const efectivo = dominioEfectivo(estado, ahora)
  if (efectivo >= UMBRAL_DOMINIO) return 'dominada'
  if (estado.p >= UMBRAL_DOMINIO) return 'repasar' // la dominaba, pero ya pasó tiempo
  return 'aprendiendo'
}

export interface Recomendacion {
  letra: string
  motivo: string
  /** Mientras más alto, más urgente. */
  prioridad: number
}

/**
 * Qué letras conviene practicar ahora y por qué. Combina tres ideas:
 *   1. Las que le cuestan (dominio bajo después de varios intentos).
 *   2. Las que ya dominaba pero hace mucho no practica (se están olvidando).
 *   3. Letras nuevas que se parecen a otra que ya domina (las más fáciles de aprender después).
 */
export function recomendar(dominio: Dominio, letras: Letra[], cuantas = 6, ahora = Date.now()): Recomendacion[] {
  const dominadas = letras.filter((l) => nivelLetra(dominio[l.letra], ahora) === 'dominada')
  const recomendaciones = letras.map((l): Recomendacion => {
    const e = dominio[l.letra]
    const nivel = nivelLetra(e, ahora)
    const efectivo = dominioEfectivo(e, ahora)
    if (nivel === 'aprendiendo' && e) {
      const fallos = e.intentos - e.aciertos
      return {
        letra: l.letra,
        motivo: fallos > 0 ? `Te cuesta: fallaste ${fallos} de ${e.intentos} intentos.` : `Vas bien: ${Math.round(efectivo * 100)} % de dominio.`,
        prioridad: 2 + (1 - efectivo) + Math.min(fallos, 5) * 0.2,
      }
    }
    if (nivel === 'repasar' && e) {
      const dias = Math.round((ahora - e.ultima) / DIA)
      return { letra: l.letra, motivo: `Para repasar: no la practicas hace ${dias} días.`, prioridad: 1.5 + (1 - efectivo) }
    }
    if (nivel === 'nueva') {
      // La letra dominada más parecida (menos diferencias en la forma de la mano).
      let parecida: Letra | null = null
      let menor = Infinity
      for (const d of dominadas) {
        const n = diferencias(d.forma, l.forma).length
        if (n < menor) [menor, parecida] = [n, d]
      }
      return parecida
        ? { letra: l.letra, motivo: `Nueva: se parece a la ${parecida.letra}, que ya dominas.`, prioridad: 1 + 1 / (1 + menor) }
        : { letra: l.letra, motivo: 'Nueva: todavía no la intentas.', prioridad: 0.5 }
    }
    return { letra: l.letra, motivo: 'Dominada.', prioridad: 0 }
  })
  return recomendaciones
    .filter((r) => r.prioridad > 0)
    .sort((a, b) => b.prioridad - a.prioridad || a.letra.localeCompare(b.letra))
    .slice(0, cuantas)
}

/** Dominio promedio del alfabeto (0 a 1), para mostrar «tu avance según la IA». */
export function dominioPromedio(dominio: Dominio, letras: Letra[], ahora = Date.now()): number {
  if (!letras.length) return 0
  return letras.reduce((t, l) => t + dominioEfectivo(dominio[l.letra], ahora), 0) / letras.length
}
