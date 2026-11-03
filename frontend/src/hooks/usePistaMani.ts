/*
 * HOOK: PISTAS DE MANI MIENTRAS DELETREAS
 * Si la cámara ve tu mano unos segundos pero no reconoce ninguna letra, Mani adivina cuál
 * intentas (la más cercana, lib/asistente/pista.ts) y te dice qué corregir: «¿La U? Junta los dedos».
 * Uso (junto con useDeletreo):
 *   const pista = usePistaMani(letras)
 *   const d = useDeletreo(lengua, { alCadaCuadro: pista.alCadaCuadro })
 *   <CamaraManos alDetectar={pista.conPuntos(d.alDetectar)} />
 *   pista.actual → { letra, consejos } o null
 */

import { useRef, useState } from 'react'
import type { Letra } from '../lib/aprendizaje/alfabeto'
import { letraMasCercana, type Pista } from '../lib/asistente/pista'
import type { Punto } from '../lib/vision/postura'
import type { EstadoReconocedor } from '../lib/vision/reconocedor'

/** Cuánto tiempo sin reconocer nada antes de ayudar. */
const MS_ATORADO = 3000
/** Cada cuánto se vuelve a buscar la letra más cercana (no hace falta en cada cuadro). */
const MS_ENTRE_BUSQUEDAS = 800

export function usePistaMani(letras: Letra[]) {
  const [actual, setActual] = useState<Pista | null>(null)
  const puntos = useRef<Punto[] | null>(null)
  const atoradoDesde = useRef<number | null>(null)
  const ultimaBusqueda = useRef(0)
  const ultimaClave = useRef('')

  const poner = (p: Pista | null) => {
    const clave = p ? `${p.letra}|${p.consejos[0]}` : ''
    if (clave === ultimaClave.current) return
    ultimaClave.current = clave
    setActual(p)
  }

  /** Envuelve el alDetectar de la cámara para guardar los puntos de la mano de cada cuadro. */
  const conPuntos = (alDetectar: (p: Punto[] | null, tiempo: number) => void) => (p: Punto[] | null, tiempo: number) => {
    puntos.current = p
    alDetectar(p, tiempo)
  }

  /** Se llama en cada cuadro con lo que vio el reconocedor. */
  const alCadaCuadro = (e: EstadoReconocedor) => {
    const atorado = e.hayMano && !e.candidata && e.aviso === 'buscando'
    if (!atorado || !puntos.current) {
      atoradoDesde.current = null
      poner(null)
      return
    }
    const ahora = performance.now()
    atoradoDesde.current ??= ahora
    if (ahora - atoradoDesde.current < MS_ATORADO || ahora - ultimaBusqueda.current < MS_ENTRE_BUSQUEDAS) return
    ultimaBusqueda.current = ahora
    const p = letraMasCercana(puntos.current, letras)
    poner(p && p.consejos.length ? p : null)
  }

  return { actual, conPuntos, alCadaCuadro }
}
