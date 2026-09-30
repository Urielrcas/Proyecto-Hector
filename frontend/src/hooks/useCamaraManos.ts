import { useEffect, useRef, useState } from 'react'
import { CONEXIONES_MANO, obtenerDetectorManos } from '../lib/vision/detectorManos'
import type { Punto } from '../lib/vision/postura'

export type EstadoCamara = 'iniciando' | 'activa' | 'sin-permiso' | 'sin-camara' | 'error'

function dibujarMano(canvas: HTMLCanvasElement, video: HTMLVideoElement, puntos: Punto[] | null) {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!puntos) return

  const escala = canvas.width / 640
  const a = (p: Punto) => [p.x * canvas.width, p.y * canvas.height] as const

  ctx.lineWidth = 4 * escala
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#3bbfa6'
  for (const { start, end } of CONEXIONES_MANO) {
    ctx.beginPath()
    ctx.moveTo(...a(puntos[start]))
    ctx.lineTo(...a(puntos[end]))
    ctx.stroke()
  }
  for (const p of puntos) {
    ctx.beginPath()
    ctx.arc(...a(p), 5 * escala, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2.5 * escala
    ctx.strokeStyle = '#13695d'
    ctx.stroke()
  }
}

/**
 * Enciende la cámara frontal, detecta una mano en cada cuadro con MediaPipe,
 * la dibuja sobre el video y entrega sus 21 puntos (o null si no hay mano) con la hora del cuadro en ms.
 */
export function useCamaraManos(alDetectar: (puntos: Punto[] | null, tiempo: number) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [estado, setEstado] = useState<EstadoCamara>('iniciando')
  const [intento, setIntento] = useState(0)

  // Guardar la última función recibida sin reiniciar la cámara cuando cambie.
  const alDetectarRef = useRef(alDetectar)
  useEffect(() => {
    alDetectarRef.current = alDetectar
  })

  useEffect(() => {
    let cancelado = false
    let flujo: MediaStream | null = null
    let cuadro = 0

    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('', 'NotFoundError')
        const [detector, stream] = await Promise.all([
          obtenerDetectorManos(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }),
        ])
        flujo = stream
        const video = videoRef.current
        if (cancelado || !video) return
        video.srcObject = stream
        await video.play()
        if (cancelado) return
        setEstado('activa')

        let ultimoTiempo = -1
        const procesar = () => {
          if (cancelado) return
          if (video.readyState >= 2 && video.currentTime !== ultimoTiempo) {
            ultimoTiempo = video.currentTime
            const tiempo = performance.now()
            const resultado = detector.detectForVideo(video, tiempo)
            const puntos = resultado.landmarks[0] ?? null
            if (canvasRef.current) dibujarMano(canvasRef.current, video, puntos)
            alDetectarRef.current(puntos, tiempo)
          }
          cuadro = requestAnimationFrame(procesar)
        }
        procesar()
      } catch (e) {
        if (cancelado) return
        const nombre = e instanceof DOMException ? e.name : ''
        if (nombre === 'NotAllowedError' || nombre === 'SecurityError') setEstado('sin-permiso')
        else if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') setEstado('sin-camara')
        else {
          console.error('No se pudo iniciar la detección de manos', e)
          setEstado('error')
        }
      }
    }

    iniciar()
    return () => {
      cancelado = true
      cancelAnimationFrame(cuadro)
      flujo?.getTracks().forEach((t) => t.stop())
    }
  }, [intento])

  const reintentar = () => {
    setEstado('iniciando')
    setIntento((n) => n + 1)
  }

  return { videoRef, canvasRef, estado, reintentar }
}
