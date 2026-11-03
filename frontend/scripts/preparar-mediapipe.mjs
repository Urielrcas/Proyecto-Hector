// Copia los archivos WebAssembly de MediaPipe a public/ y descarga los modelos de manos y del cuerpo,
// para que la detección funcione sin depender de CDNs externos.
// ▸ Desde Node.js, módulo fs (leer y escribir archivos del disco):
//     copyFileSync → copia un archivo
//     existsSync → revisa si un archivo existe
//     mkdirSync → crea una carpeta
//     readdirSync → lista los archivos de una carpeta
//     writeFileSync → escribe un archivo
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

// Modelo del cuerpo (cara y hombros) para las señas de palabras.
const MODELO_CUERPO = `${DESTINO}/pose_landmarker_lite.task`
const URL_MODELO_CUERPO = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
if (!existsSync(MODELO_CUERPO)) {
  const respuesta = await fetch(URL_MODELO_CUERPO)
  if (!respuesta.ok) throw new Error(`No se pudo descargar el modelo del cuerpo (${respuesta.status})`)
  writeFileSync(MODELO_CUERPO, Buffer.from(await respuesta.arrayBuffer()))
  console.log('MediaPipe: modelo del cuerpo descargado')
}

if (!existsSync(MODELO)) {
  const respuesta = await fetch(URL_MODELO)
  if (!respuesta.ok) throw new Error(`No se pudo descargar el modelo (${respuesta.status})`)
  writeFileSync(MODELO, Buffer.from(await respuesta.arrayBuffer()))
  console.log('MediaPipe: modelo de manos descargado')
}
