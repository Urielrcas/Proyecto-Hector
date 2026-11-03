/*
 * HOOK: GRABAR LA MANO PARA REVISAR UN ERROR
 * Cuando la app confunde una letra (haces la O y escribe A), se graban 3 segundos de la mano:
 * los 21 puntos de cada cuadro, lo que la app leyó de cada dedo y qué letras creyó ver.
 * Se descarga un archivo .json (queda en «Descargas») para revisar las reglas con datos reales.
 * No se guarda ninguna imagen: solo los números de los puntos.
 *   const g = useGrabadoraMano(lengua)
 *   <CamaraManos alDetectar={g.conGrabacion(d.alDetectar)} />
 *   g.grabar('O') · g.estado ('lista' | 'contando' | 'grabando' | 'guardada') · g.cuenta (3, 2, 1)
 * Antes de grabar cuenta 3 segundos: así da tiempo de formar la letra después de tocar el botón.
 */

import { useEffect, useRef, useState } from 'react'
import { alfabeto } from '../lib/aprendizaje/alfabeto'
import { evaluar as evaluarFormula } from '../lib/logica/proposicional'
import type { Lengua } from '../lib/tipos'
import { evaluar, formulaDeObjetivo, leerMano, proposicionesDeLectura, type Punto } from '../lib/vision/postura'

const MS_GRABACION = 3000

export function useGrabadoraMano(lengua: Lengua) {
  const [estado, setEstado] = useState<'lista' | 'contando' | 'grabando' | 'guardada'>('lista')
  const [cuenta, setCuenta] = useState(0)
  const letraPendiente = useRef('')
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [archivo, setArchivo] = useState('')
  const grabacion = useRef<{ letra: string; inicio: number; cuadros: unknown[] } | null>(null)

  const terminar = () => {
    const g = grabacion.current
    grabacion.current = null
    if (!g) return
    const nombre = `mano-${lengua}-${g.letra}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    const datos = { letraHecha: g.letra, lengua, fecha: new Date().toISOString(), cuadros: g.cuadros }
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: 'application/json' }))
    enlace.download = nombre
    enlace.click()
    URL.revokeObjectURL(enlace.href)
    setArchivo(nombre)
    setEstado('guardada')
  }

  /** Envuelve el alDetectar de la cámara: mientras se graba, guarda cada cuadro. */
  const conGrabacion = (alDetectar: (p: Punto[] | null, tiempo: number) => void) => (p: Punto[] | null, tiempo: number) => {
    const g = grabacion.current
    if (g) {
      if (p) {
        const lectura = leerMano(p)
        const valuacion = proposicionesDeLectura(lectura)
        const letras = alfabeto(lengua)
        const objetivo = letras.find((l) => l.letra === g.letra)
        g.cuadros.push({
          t: Math.round(tiempo - g.inicio),
          puntos: p.map((q) => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4), z: q.z === undefined ? undefined : +q.z.toFixed(4) })),
          lectura,
          cumplen: letras.filter((l) => evaluarFormula(formulaDeObjetivo(l.objetivo), valuacion)).map((l) => l.letra),
          faltaParaLaHecha: objetivo ? evaluar(p, objetivo.objetivo).consejos : null,
        })
      }
      if (tiempo - g.inicio >= MS_GRABACION) terminar()
    }
    alDetectar(p, tiempo)
  }

  // Cuenta regresiva: 3, 2, 1 y entonces empieza a grabar.
  useEffect(() => {
    if (estado !== 'contando') return
    temporizador.current = setTimeout(() => {
      if (cuenta > 1) return setCuenta(cuenta - 1)
      grabacion.current = { letra: letraPendiente.current, inicio: performance.now(), cuadros: [] }
      setEstado('grabando')
    }, 1000)
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [estado, cuenta])

  const grabar = (letra: string) => {
    letraPendiente.current = letra.toUpperCase()
    setCuenta(3)
    setEstado('contando')
  }

  return { estado, cuenta, archivo, conGrabacion, grabar, otraVez: () => setEstado('lista') }
}
