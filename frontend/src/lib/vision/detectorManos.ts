import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// Archivos servidos desde public/mediapipe (los prepara scripts/preparar-mediapipe.mjs).
const RUTA_WASM = '/mediapipe/wasm'
const RUTA_MODELO = '/mediapipe/hand_landmarker.task'

let promesa: Promise<HandLandmarker> | null = null

/** Crea el detector una sola vez y lo reutiliza en toda la app (el modelo pesa ~7 MB). */
export function obtenerDetectorManos(): Promise<HandLandmarker> {
  promesa ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(RUTA_WASM)
    const crear = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: RUTA_MODELO, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })
    try {
      return await crear('GPU')
    } catch {
      return await crear('CPU') // equipos sin WebGL
    }
  })()
  promesa.catch(() => {
    promesa = null // permitir reintentar si falló la carga
  })
  return promesa
}

export const CONEXIONES_MANO = HandLandmarker.HAND_CONNECTIONS
