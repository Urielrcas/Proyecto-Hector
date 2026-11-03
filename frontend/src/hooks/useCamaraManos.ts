/*
 * HOOK DE LA CÁMARA + DETECCIÓN DE MANOS
 * Enciende la cámara frontal y, en cada cuadro del video:
 *   1) le pasa la imagen a MediaPipe, que devuelve los 21 puntos de la mano,
 *   2) dibuja esos puntos y sus líneas sobre el video (función dibujarMano),
 *   3) entrega los puntos a quien lo usa (la pantalla de práctica los evalúa).
 * Si no hay permiso o no hay cámara, informa el problema en "estado".
 *
 * Modo «señas» (opciones.senas): busca DOS manos y los puntos del cuerpo (cara y hombros),
 * entrega la escena completa (lib/vision/escena.ts) y dibuja la zona donde debe ir la mano.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useRef → guarda un valor o un elemento de la página SIN volver a dibujar la pantalla
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useRef, useState } from 'react'
// ▸ Desde nuestro proyecto: src/lib/vision/detectorManos.ts:
//     CONEXIONES_MANO → qué puntos de la mano se unen con líneas al dibujarla
//     obtenerDetectorManos → carga (una sola vez) el detector de manos de MediaPipe
// ▸ Desde nuestro proyecto: src/lib/colores.ts:
//     tonoMarca → el color de la app ya aplicado (el canvas no entiende var(--…))
import { tonoMarca } from '../lib/colores'
import { CONEXIONES_MANO, obtenerDetectorCuerpo, obtenerDetectorManos } from '../lib/vision/detectorManos'
// ▸ Desde nuestro proyecto: src/lib/vision/escena.ts: la escena (manos + cuerpo) y las zonas del cuerpo
import { cuerpoDesdePose, zonaDe, type Cuerpo, type Escena, type Lugar } from '../lib/vision/escena'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     normalizarMano → deja derecha e izquierda como la misma mano (para leer frente / dorso)
//     Punto → tipo: un punto de la mano (x, y)
import { normalizarMano, type Punto } from '../lib/vision/postura'

export type EstadoCamara = 'iniciando' | 'activa' | 'sin-permiso' | 'sin-camara' | 'error'

/** Opciones del modo «señas de palabras». */
export interface OpcionesSenas {
  alVerEscena: (escena: Escena, tiempo: number) => void
  /** Lugar del cuerpo que se resalta en la imagen (dónde debe ir la mano). */
  lugarRef?: { current: Lugar | null }
}

function dibujarMano(canvas: HTMLCanvasElement, video: HTMLVideoElement, puntos: Punto[] | null, limpiar = true) {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (limpiar) ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!puntos) return

  const escala = canvas.width / 640
  const a = (p: Punto) => [p.x * canvas.width, p.y * canvas.height] as const

  ctx.lineWidth = 4 * escala
  ctx.lineCap = 'round'
  const claro = tonoMarca(400)
  const fuerte = tonoMarca(700)
  ctx.strokeStyle = claro
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
    ctx.strokeStyle = fuerte
    ctx.stroke()
  }
}

/** Dibuja la zona del cuerpo donde debe ir la mano: un círculo punteado. `cuerpo` viene «sin estirar». */
function dibujarZona(canvas: HTMLCanvasElement, cuerpo: Cuerpo, lugar: Lugar, aspecto: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { centro, radio } = zonaDe(lugar, cuerpo)
  const escala = canvas.width / 640
  ctx.save()
  ctx.beginPath()
  ctx.arc((centro.x / aspecto) * canvas.width, centro.y * canvas.height, radio * canvas.height, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()
  ctx.setLineDash([10 * escala, 8 * escala])
  ctx.lineWidth = 3 * escala
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.restore()
}

/**
 * Enciende la cámara frontal, detecta una mano en cada cuadro con MediaPipe,
 * la dibuja sobre el video y entrega sus 21 puntos (o null si no hay mano) con la hora del cuadro en ms.
 */
export function useCamaraManos(alDetectar: (puntos: Punto[] | null, tiempo: number) => void, senas?: OpcionesSenas) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [estado, setEstado] = useState<EstadoCamara>('iniciando')
  const [intento, setIntento] = useState(0)

  // Guardar la última función recibida sin reiniciar la cámara cuando cambie.
  const alDetectarRef = useRef(alDetectar)
  const senasRef = useRef(senas)
  useEffect(() => {
    alDetectarRef.current = alDetectar
    senasRef.current = senas
  })
  // El modo se decide al encender la cámara (cambiarlo reinicia la cámara).
  const modoSenas = !!senas

  useEffect(() => {
    let cancelado = false
    let flujo: MediaStream | null = null
    let cuadro = 0

    const iniciar = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('', 'NotFoundError')
        // Cargar el modelo de MediaPipe y encender la cámara frontal al mismo tiempo.
        const [detector, cuerpoDetector, stream] = await Promise.all([
          obtenerDetectorManos(modoSenas ? 2 : 1),
          modoSenas ? obtenerDetectorCuerpo() : Promise.resolve(null),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } }),
        ])
        flujo = stream
        const video = videoRef.current
        if (cancelado || !video) return
        video.srcObject = stream
        await video.play()
        if (cancelado) return
        setEstado('activa')

        // Ciclo que se repite en cada cuadro del video:
        let ultimoTiempo = -1
        let numero = 0
        let cuerpo: Cuerpo | null = null
        const procesar = () => {
          if (cancelado) return
          // Solo procesar si hay un cuadro nuevo (no repetir el mismo).
          if (video.readyState >= 2 && video.currentTime !== ultimoTiempo) {
            ultimoTiempo = video.currentTime
            const tiempo = performance.now()
            const resultado = detector.detectForVideo(video, tiempo) // ← MediaPipe busca la mano
            const puntos = resultado.landmarks[0] ?? null // 21 puntos de la primera mano, o null
            const etiqueta = resultado.handedness[0]?.[0]?.categoryName // "Left" / "Right" según MediaPipe

            if (cuerpoDetector) {
              // Señas de palabras: las dos manos y el cuerpo. El cuerpo se mueve poco: se busca cada 2 cuadros.
              const aspecto = video.videoWidth / video.videoHeight || 4 / 3
              const sinEstirar = (ps: Punto[]) => ps.map((q) => ({ ...q, x: q.x * aspecto }))
              if (numero++ % 2 === 0) {
                const pose = cuerpoDetector.detectForVideo(video, tiempo).landmarks[0]
                cuerpo = pose ? cuerpoDesdePose(sinEstirar(pose)) : null
              }
              const escena: Escena = {
                manos: resultado.landmarks.map((m, i) => ({ puntos: sinEstirar(m), normal: normalizarMano(m, resultado.handedness[i]?.[0]?.categoryName) })),
                cuerpo,
              }
              const canvas = canvasRef.current
              if (canvas) {
                dibujarMano(canvas, video, null)
                const lugar = senasRef.current?.lugarRef?.current
                if (cuerpo && lugar) dibujarZona(canvas, cuerpo, lugar, aspecto)
                for (const m of resultado.landmarks) dibujarMano(canvas, video, m, false)
              }
              senasRef.current?.alVerEscena(escena, tiempo)
            } else if (canvasRef.current) {
              dibujarMano(canvasRef.current, video, puntos) // dibujar sobre el video
            }
            alDetectarRef.current(puntos && normalizarMano(puntos, etiqueta), tiempo) // entregar los puntos a la pantalla
          }
          cuadro = requestAnimationFrame(procesar) // volver a ejecutar en el siguiente cuadro
        }
        procesar()
      } catch (e) {
        // Traducir el error del navegador a un estado que la pantalla sabe mostrar.
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
    // Al salir de la pantalla: detener el ciclo y apagar la cámara (se apaga la luz de la cámara).
    return () => {
      cancelado = true
      cancelAnimationFrame(cuadro)
      flujo?.getTracks().forEach((t) => t.stop())
    }
  }, [intento, modoSenas])

  const reintentar = () => {
    setEstado('iniciando')
    setIntento((n) => n + 1)
  }

  return { videoRef, canvasRef, estado, reintentar }
}
