// Copia los archivos WebAssembly de MediaPipe a public/ y descarga el modelo de manos,
// para que la detección funcione sin depender de CDNs externos.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'

const DESTINO = 'public/mediapipe'
const MODELO = `${DESTINO}/hand_landmarker.task`
const URL_MODELO =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// Se copia archivo por archivo: fs.cpSync falla en Windows con rutas que tienen "ñ".
const ORIGEN_WASM = 'node_modules/@mediapipe/tasks-vision/wasm'
mkdirSync(`${DESTINO}/wasm`, { recursive: true })
for (const archivo of readdirSync(ORIGEN_WASM)) {
  copyFileSync(`${ORIGEN_WASM}/${archivo}`, `${DESTINO}/wasm/${archivo}`)
}
console.log('MediaPipe: archivos wasm copiados')

if (!existsSync(MODELO)) {
  const respuesta = await fetch(URL_MODELO)
  if (!respuesta.ok) throw new Error(`No se pudo descargar el modelo (${respuesta.status})`)
  writeFileSync(MODELO, Buffer.from(await respuesta.arrayBuffer()))
  console.log('MediaPipe: modelo de manos descargado')
}
