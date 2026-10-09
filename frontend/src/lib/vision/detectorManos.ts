/*
 * DETECTOR DE MANOS (MediaPipe de Google)
 * Carga el modelo HandLandmarker, que encuentra 21 puntos de la mano en cada imagen.
 * Se carga una sola vez para toda la app (el modelo pesa ~7 MB). Usa la tarjeta gráfica
 * (GPU) si está disponible; si no, el procesador (CPU).
 * Los archivos del modelo están en public/mediapipe (los descarga "npm install").
 */

// ▸ Desde MediaPipe de Google (detección de manos con inteligencia artificial):
//     FilesetResolver → carga los archivos WebAssembly que necesita MediaPipe
//     HandLandmarker → el detector de los 21 puntos de la mano
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// Archivos servidos desde public/mediapipe (los prepara scripts/preparar-mediapipe.mjs).
const RUTA_WASM = '/mediapipe/wasm'
const RUTA_MODELO = '/mediapipe/hand_landmarker.task'

// Guarda la carga del detector para no cargarlo dos veces (si ya se pidió, se reutiliza).
let promesa: Promise<HandLandmarker> | null = null

/** Crea el detector una sola vez y lo reutiliza en toda la app (el modelo pesa ~7 MB). */
export function obtenerDetectorManos(): Promise<HandLandmarker> {
  // "??=" = solo si todavía no existe, se crea.
  promesa ??= (async () => {
    // 1) Cargar el motor de MediaPipe (WebAssembly: código rápido que corre en el navegador).
    const vision = await FilesetResolver.forVisionTasks(RUTA_WASM)
    // 2) Crear el detector con estas opciones:
    const crear = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: RUTA_MODELO, delegate }, // archivo del modelo y si usa GPU o CPU
        runningMode: 'VIDEO', // procesar video cuadro por cuadro
        numHands: 1, // detectar solo una mano
        minHandDetectionConfidence: 0.6, // qué tan seguro debe estar para decir "hay una mano" (0 a 1)
        minTrackingConfidence: 0.5, // qué tan seguro para seguirla entre cuadros
      })
    // 3) Intentar con la tarjeta gráfica (más rápido); si no se puede, con el procesador.
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

// Pares de puntos que se unen con una línea al dibujar la mano (muñeca→pulgar, nudillo→punta, etc.).
export const CONEXIONES_MANO = HandLandmarker.HAND_CONNECTIONS
