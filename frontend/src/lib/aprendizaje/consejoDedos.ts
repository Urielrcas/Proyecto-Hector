/**
 * CONSEJO PERSONAL POR DEDOS (en «Practicar letra» → «Consejos de tu IA»)
 *
 * Con los intentos guardados de la persona arma un consejo concreto, por ejemplo:
 *   «Llevas 20 intentos fallidos con la E. En el 60 % de ellos falló tu pulgar.
 *    Te aconsejo: cruza el pulgar por encima de tus dedos doblados.»
 *
 *   1. Dedo que más falla: en qué porcentaje de los intentos fallidos falló cada dedo (lo calcula el
 *      servidor) y qué hacer con ese dedo EN ESTA LETRA (el consejo sale de la forma de la letra,
 *      lib/vision/postura.ts, el mismo que se da en vivo con la cámara).
 *   2. Segundo dedo, si también falla seguido (30 % de los fallos o más).
 *   3. Confusión: si al fallar la IA casi siempre ve otra letra, qué dedos distinguen una de la otra.
 */
import type { LetraExpediente } from '../../services/intentos'
import { condicionesDeObjetivo, type Dedo, type Objetivo } from '../vision/postura'
import type { Letra } from './alfabeto'

/** Cuántos fallos hacen falta para dar el consejo (con menos, el porcentaje no dice mucho). */
export const MIN_FALLIDOS_CONSEJO = 3
/** El segundo dedo se menciona si falló en al menos esta parte de los fallos. */
export const MIN_SEGUNDO_DEDO = 0.3

const TU_DEDO: Record<Dedo, string> = { pulgar: 'pulgar', indice: 'índice', medio: 'dedo medio', anular: 'anular', menique: 'meñique' }

export interface ConsejoDedos {
  /** «Llevas 20 intentos fallidos con la E. En el 60 % de ellos falló tu pulgar.» */
  resumen: string
  /** Qué hacer, del más importante al menos. */
  consejos: string[]
  /** Dedo principal (para resaltarlo). */
  dedo: Dedo | null
}

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const pct = (v: number) => `${Math.round(v * 100)} %`

/** El consejo de la letra para ese dedo («Estira el índice.», «Pega el pulgar al costado del índice.»). */
export function consejoDelDedo(objetivo: Objetivo, dedo: Dedo): string | null {
  return condicionesDeObjetivo(objetivo).find((c) => c.dedo === dedo)?.consejo ?? null
}

/** Dedos que se ponen distinto en una letra y en otra (lo que las distingue). */
export function dedosDistintos(a: Objetivo, b: Objetivo): Dedo[] {
  const cruza = (x: readonly string[], y: readonly string[]) => x.some((v) => y.includes(v))
  const distintos: Dedo[] = []
  if (!cruza(a.pulgar, b.pulgar)) distintos.push('pulgar')
  for (const d of ['indice', 'medio', 'anular', 'menique'] as const) if (!cruza(a.dedos[d], b.dedos[d])) distintos.push(d)
  return distintos
}

export function consejoDedos(letra: Letra, info: LetraExpediente, letras: Letra[]): ConsejoDedos | null {
  if (info.fallidos < MIN_FALLIDOS_CONSEJO) return null
  const consejos: string[] = []
  let resumen = `Llevas ${info.fallidos} intentos fallidos con la ${letra.letra}.`
  const [primero, segundo] = info.dedos_fallados
  const mencionados: Dedo[] = []

  if (primero && primero.veces >= 2) {
    resumen += ` En el ${pct(primero.porcentaje)} de ellos falló tu ${TU_DEDO[primero.dedo]}.`
    const c = consejoDelDedo(letra.objetivo, primero.dedo)
    if (c) {
      consejos.push(`Te aconsejo: ${minuscula(c)}`)
      mencionados.push(primero.dedo)
    }
    if (segundo && segundo.porcentaje >= MIN_SEGUNDO_DEDO) {
      const c2 = consejoDelDedo(letra.objetivo, segundo.dedo)
      if (c2) {
        consejos.push(`También revisa tu ${TU_DEDO[segundo.dedo]} (falló en el ${pct(segundo.porcentaje)}): ${minuscula(c2)}`)
        mencionados.push(segundo.dedo)
      }
    }
  }

  const confusion = info.confundida_con[0]
  const otra = confusion && confusion.veces >= 2 ? letras.find((l) => l.letra === confusion.letra) : undefined
  if (otra) {
    const distintos = dedosDistintos(letra.objetivo, otra.objetivo)
    const nuevos = distintos.filter((d) => !mencionados.includes(d))
    const yaDichos = distintos.filter((d) => mencionados.includes(d))
    const que = nuevos.map((d) => consejoDelDedo(letra.objetivo, d)).filter((c): c is string => !!c)
    const inicio = `Cuando fallas, la IA ve una ${otra.letra} (${confusion.veces} veces).`
    if (que.length) consejos.push(`${inicio} Para que no se confundan: ${que.map(minuscula).join(' ')}`)
    else if (yaDichos.length)
      consejos.push(`${inicio} Justo tu ${yaDichos.map((d) => TU_DEDO[d]).join(' y tu ')} es lo que la distingue de la ${otra.letra}: si lo corriges, la IA dejará de confundirlas.`)
    else consejos.push(`${inicio} Se parecen mucho: cuida la posición de toda la mano.`)
  }

  if (!consejos.length) return null
  return { resumen, consejos, dedo: primero && primero.veces >= 2 ? primero.dedo : null }
}
