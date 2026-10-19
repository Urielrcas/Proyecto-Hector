/*
 * HOOK: RECONOCIMIENTO DE VOZ (voz → texto)
 * Usa el reconocimiento de voz del propio navegador (Web Speech API, sin librerías).
 * Funciona en Chrome y Edge; en esos navegadores el audio se procesa con su servicio en línea.
 * Uso:  const voz = useReconocimientoVoz('es-MX', (texto) => ...)
 *       voz.iniciar() / voz.detener() · voz.escuchando · voz.parcial (lo que va entendiendo) · voz.error
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useRef → guarda un valor que NO redibuja la pantalla al cambiar (el reconocedor del navegador)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useRef, useState } from 'react'

export type ErrorVoz = 'sin-soporte' | 'sin-permiso' | 'sin-voz' | 'sin-red' | 'otro'

// Lo mínimo que usamos del reconocimiento de voz del navegador (TypeScript no trae su clase).
interface ResultadoVoz {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ResultadoVoz> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

// Chrome y Edge lo ofrecen con el prefijo «webkit».
type ClaseReconocimiento = new () => SpeechRecognition
const ventana = (typeof window === 'undefined' ? {} : window) as { SpeechRecognition?: ClaseReconocimiento; webkitSpeechRecognition?: ClaseReconocimiento }
const Reconocimiento: ClaseReconocimiento | undefined = ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition

export function useReconocimientoVoz(idioma: 'es-MX' | 'en-US', alTerminar: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false)
  const [parcial, setParcial] = useState('') // lo que va entendiendo mientras hablas
  const [error, setError] = useState<ErrorVoz | null>(Reconocimiento ? null : 'sin-soporte')
  const reconocedor = useRef<SpeechRecognition | null>(null)

  // Guardar la última función recibida sin reiniciar el reconocimiento.
  const alTerminarRef = useRef(alTerminar)
  useEffect(() => {
    alTerminarRef.current = alTerminar
  })

  // Al salir de la pantalla, apagar el micrófono.
  useEffect(() => () => reconocedor.current?.abort(), [])

  const iniciar = () => {
    if (!Reconocimiento) return
    reconocedor.current?.abort()
    const r = new Reconocimiento()
    r.lang = idioma
    r.interimResults = true // ir mostrando lo que entiende
    r.continuous = false // termina solo cuando dejas de hablar
    let final = ''
    r.onresult = (e) => {
      let provisional = ''
      final = ''
      for (const resultado of Array.from(e.results)) {
        if (resultado.isFinal) final += resultado[0].transcript
        else provisional += resultado[0].transcript
      }
      setParcial((final + provisional).trim())
    }
    r.onerror = (e) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'sin-permiso'
          : e.error === 'no-speech'
            ? 'sin-voz'
            : e.error === 'network'
              ? 'sin-red'
              : e.error === 'aborted'
                ? null
                : 'otro',
      )
    }
    r.onend = () => {
      setEscuchando(false)
      if (final.trim()) alTerminarRef.current(final.trim())
    }
    reconocedor.current = r
    setError(null)
    setParcial('')
    setEscuchando(true)
    r.start()
  }

  // Dejar de escuchar: entrega lo entendido hasta ese momento.
  const detener = () => reconocedor.current?.stop()

  return { soportado: !!Reconocimiento, escuchando, parcial, error, iniciar, detener }
}
