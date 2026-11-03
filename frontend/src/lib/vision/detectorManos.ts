/*
 * DETECTOR DE MANOS (MediaPipe de Google)
 * Carga el modelo HandLandmarker, que encuentra 21 puntos de la mano en cada imagen.
 * Se carga una sola vez para toda la app (el modelo pesa ~7 MB). Usa la tarjeta gráfica
 * (GPU) si está disponible; si no, el procesador (CPU).
 * Los archivos del modelo están en public/mediapipe (los descarga "npm install").
 *
 * Para las señas de palabras hay otro detector que busca DOS manos y uno del cuerpo
 * (PoseLandmarker, ~6 MB): ojos, boca y hombros, para saber dónde está cada mano.
 */

// ▸ Desde MediaPipe de Google (detección de manos con inteligencia artificial):
//     FilesetResolver → carga los archivos WebAssembly que necesita MediaPipe
//     HandLandmarker → el detector de los 21 puntos de la mano
//     PoseLandmarker → los puntos del cuerpo (cara y hombros)
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'

// Archivos servidos desde public/mediapipe (los prepara scripts/preparar-mediapipe.mjs).
const RUTA_WASM = '/mediapipe/wasm'
const RUTA_MODELO = '/mediapipe/hand_landmarker.task'
const RUTA_MODELO_CUERPO = '/mediapipe/pose_landmarker_lite.task'

// El motor de MediaPipe (WebAssembly: código rápido que corre en el navegador), cargado una vez.
let motor: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null
const cargarMotor = () => (motor ??= FilesetResolver.forVisionTasks(RUTA_WASM))

// Guarda la carga de cada detector para no cargarlo dos veces (si ya se pidió, se reutiliza).
const promesas = new Map<number, Promise<HandLandmarker>>()

/**
 * Crea el detector una sola vez y lo reutiliza en toda la app (el modelo pesa ~7 MB).
 * `cantidad`: 1 para deletrear (una mano), 2 para las señas de palabras.
 */
export function obtenerDetectorManos(cantidad: 1 | 2 = 1): Promise<HandLandmarker> {
  const existente = promesas.get(cantidad)
  if (existente) return existente
  const promesa = (async () => {
    // 1) Cargar el motor de MediaPipe.
    const vision = await cargarMotor()
    // 2) Crear el detector con estas opciones:
    const crear = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: RUTA_MODELO, delegate }, // archivo del modelo y si usa GPU o CPU
        runningMode: 'VIDEO', // procesar video cuadro por cuadro
        numHands: cantidad, // cuántas manos buscar
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
  promesas.set(cantidad, promesa)
  promesa.catch(() => {
    promesas.delete(cantidad) // permitir reintentar si falló la carga
  })
  return promesa
}

let promesaCuerpo: Promise<PoseLandmarker> | null = null

/** Detector de los puntos del cuerpo (cara y hombros), para las señas de palabras. */
export function obtenerDetectorCuerpo(): Promise<PoseLandmarker> {
  promesaCuerpo ??= (async () => {
    const vision = await cargarMotor()
    const crear = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: RUTA_MODELO_CUERPO, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    try {
      return await crear('GPU')
    } catch {
      return await crear('CPU')
    }
  })()
  promesaCuerpo.catch(() => {
    promesaCuerpo = null
  })
  return promesaCuerpo
}

// Pares de puntos que se unen con una línea al dibujar la mano (muñeca→pulgar, nudillo→punta, etc.).
export const CONEXIONES_MANO = HandLandmarker.HAND_CONNECTIONS
