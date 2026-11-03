/**
 * CALIBRACIÓN CON LA MANO REAL
 *
 * Las reglas de cada letra (postura.ts) se escribieron con el diccionario y se probaron con manos
 * simuladas. Con manos reales aparecen diferencias: una C muy cerrada, una E con el pulgar de lado…
 * En la calibración la persona hace cada letra 2 segundos y aquí se decide qué aprender de eso:
 *
 *   - Si las reglas ya reconocen su forma en la mayoría de los cuadros → «bien»: solo se guardan
 *     posturas para entrenar su red neuronal.
 *   - Si no la reconocen y su forma NO se parece a otra letra → «recordar»: la IA guarda su forma
 *     personal (memoria.ts) y desde ese momento la acepta.
 *   - Si no la reconocen y su forma se parece a otra letra → «conflicto»: no se guarda, porque
 *     aceptarla haría que se confundan las dos letras. Se le dice con cuál se confunde.
 */
import type { Letra } from '../aprendizaje/alfabeto'
import { evaluar } from '../vision/postura'
import type { Punto } from '../vision/postura'
import { pareceOtraLetra, type Memoria } from './memoria'

/** Proporción mínima de cuadros reconocidos para decir que la regla funciona con esta mano. */
export const MINIMO_RECONOCIDO = 0.6
/** Las letras que más se confunden entre sí (puño con el pulgar en distintos lugares, y C/O). */
export const LETRAS_CONFUSAS = ['A', 'E', 'S', 'O', 'C', 'T', 'M', 'N']

export type Decision = 'bien' | 'recordar' | 'conflicto' | 'sin-mano'

export interface ResultadoLetra {
  letra: string
  cuadros: number
  /** Proporción de cuadros en que las reglas reconocieron la letra (0 a 1). */
  reconocida: number
  /** La otra letra que las reglas vieron más veces, si hubo. */
  confundidaCon: string | null
  /** El consejo más repetido (qué no le cuadra a la regla). */
  consejo: string | null
  decision: Decision
}

/** Analiza las posturas grabadas de una letra. */
export function analizarLetra(letra: Letra, letras: Letra[], posturas: Punto[][], memoria: Memoria | null): ResultadoLetra {
  const base = { letra: letra.letra, cuadros: posturas.length }
  if (posturas.length < 5) return { ...base, reconocida: 0, confundidaCon: null, consejo: null, decision: 'sin-mano' }

  let bien = 0
  const otras = new Map<string, number>()
  const consejos = new Map<string, number>()
  for (const p of posturas) {
    const r = evaluar(p, letra.objetivo)
    if (r.correcto) bien++
    else if (r.consejos[0]) consejos.set(r.consejos[0], (consejos.get(r.consejos[0]) ?? 0) + 1)
    for (const otra of letras) {
      if (otra.letra !== letra.letra && evaluar(p, otra.objetivo).correcto) otras.set(otra.letra, (otras.get(otra.letra) ?? 0) + 1)
    }
  }
  const masVista = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const reconocida = bien / posturas.length
  const confundidaCon = masVista(otras)
  const consejo = masVista(consejos)

  if (reconocida >= MINIMO_RECONOCIDO) return { ...base, reconocida, confundidaCon, consejo, decision: 'bien' }
  // ¿Su forma se parece a otra letra? Por las reglas (la otra se cumple en la mitad o más) o por la memoria.
  const otraPorReglas = confundidaCon && (otras.get(confundidaCon) ?? 0) >= posturas.length / 2 ? confundidaCon : null
  const otraPorMemoria = memoria ? pareceOtraLetra(posturas, letra.letra, memoria) : null
  const conflicto = otraPorReglas ?? otraPorMemoria
  if (conflicto) return { ...base, reconocida, confundidaCon: conflicto, consejo, decision: 'conflicto' }
  return { ...base, reconocida, confundidaCon, consejo, decision: 'recordar' }
}

/** Escoge pocas posturas repartidas (no todas: los cuadros seguidos se parecen mucho). */
export function repartidas<T>(lista: T[], cuantas: number): T[] {
  if (lista.length <= cuantas) return lista
  return Array.from({ length: cuantas }, (_, i) => lista[Math.floor((i * lista.length) / cuantas)])
}
