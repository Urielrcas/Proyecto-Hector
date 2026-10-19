/*
 * HOOK: NIVEL DEL MICRÓFONO (las «ondas» que se mueven mientras hablas)
 * Mientras `activo` sea verdadero, abre el micrófono y mide qué tan fuerte es el sonido con la
 * Web Audio API del navegador (sin librerías). Devuelve los últimos niveles, de 0 a 1.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'

/** Cuántas barras se dibujan. */
export const BARRAS = 28
const MS_ENTRE_MEDIDAS = 60 // ≈ 16 medidas por segundo

export function useNivelMicrofono(activo: boolean): number[] {
  const [niveles, setNiveles] = useState<number[]>(() => Array(BARRAS).fill(0))

  useEffect(() => {
    if (!activo || !navigator.mediaDevices?.getUserMedia) return
    let cancelado = false
    let flujo: MediaStream | null = null
    let contexto: AudioContext | null = null
    let temporizador = 0

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((f) => {
        if (cancelado) return f.getTracks().forEach((t) => t.stop())
        flujo = f
        contexto = new AudioContext()
        const analizador = contexto.createAnalyser()
        analizador.fftSize = 512
        contexto.createMediaStreamSource(f).connect(analizador)
        const muestras = new Uint8Array(analizador.fftSize)
        temporizador = window.setInterval(() => {
          analizador.getByteTimeDomainData(muestras)
          // Volumen = raíz del promedio de los cuadrados (RMS) de la onda, centrada en 128.
          let suma = 0
          for (const m of muestras) suma += ((m - 128) / 128) ** 2
          const nivel = Math.min(1, Math.sqrt(suma / muestras.length) * 4)
          setNiveles((anteriores) => [...anteriores.slice(1), nivel])
        }, MS_ENTRE_MEDIDAS)
      })
      .catch(() => {
        // Sin permiso o sin micrófono: las barras se quedan quietas (el reconocimiento avisa del error).
      })

    return () => {
      cancelado = true
      clearInterval(temporizador)
      flujo?.getTracks().forEach((t) => t.stop())
      contexto?.close()
      setNiveles(Array(BARRAS).fill(0))
    }
  }, [activo])

  return niveles
}
