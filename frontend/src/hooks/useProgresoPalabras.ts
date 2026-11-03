/*
 * HOOK: PROGRESO DE «PALABRAS Y FRASES»
 * Recuerda, por usuario y lengua, qué palabras ya viste y cuáles ya deletreaste con la cámara.
 * Se guarda en este navegador (localStorage).
 *   const p = useProgresoPalabras()
 *   p.vistas · p.practicadas · p.marcarVista(id) · p.marcarPracticada(id)
 */

import { useSyncExternalStore } from 'react'
import { useApp } from '../context/AppContext'
import { guardar, leer } from '../lib/almacenamiento'

interface Progreso {
  vistas: string[]
  practicadas: string[]
}

const VACIO: Progreso = { vistas: [], practicadas: [] }

// Almacén compartido: así todas las pantallas se enteran al instante de un cambio.
const cache = new Map<string, Progreso>()
const oyentes = new Set<() => void>()

function leerProgreso(clave: string): Progreso {
  let p = cache.get(clave)
  if (!p) {
    p = { ...VACIO, ...leer<Partial<Progreso>>(clave, {}) }
    cache.set(clave, p)
  }
  return p
}

function agregar(clave: string, campo: keyof Progreso, id: string) {
  const p = leerProgreso(clave)
  if (p[campo].includes(id)) return
  const nuevo = { ...p, [campo]: [...p[campo], id] }
  cache.set(clave, nuevo)
  guardar(clave, nuevo)
  for (const avisar of oyentes) avisar()
}

function suscribirse(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function useProgresoPalabras() {
  const { usuario, lengua: lenguaElegida } = useApp()
  const clave = `palabras.${usuario?.id ?? 'invitado'}.${lenguaElegida ?? 'LSM'}`
  const progreso = useSyncExternalStore(suscribirse, () => leerProgreso(clave))
  return {
    ...progreso,
    marcarVista: (id: string) => agregar(clave, 'vistas', id),
    marcarPracticada: (id: string) => {
      agregar(clave, 'vistas', id)
      agregar(clave, 'practicadas', id)
    },
  }
}
