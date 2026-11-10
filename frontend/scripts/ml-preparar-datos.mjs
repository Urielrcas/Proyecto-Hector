// ARMAR LA TABLA PARA EL MACHINE LEARNING (ml/datos/manos_crudas.csv)
//
// Junta manos de tres orígenes:
//   - «avatar3d»: la mano 3D del avatar haciendo cada letra en miles de posiciones (girada, inclinada,
//     con los dedos un poco distintos y proporciones distintas), como muchas personas frente a la cámara.
//     Son los datos de entrenamiento: cada mano trae su letra correcta y sus 21 puntos bien puestos.
//   - «dibujo»: los dibujos de LSM del equipo pasados por MediaPipe. Sirven para la revisión de calidad:
//     MediaPipe no lee bien dibujos y casi todas sus «detecciones» son falsas (se descartan en ml/p02c).
//   - «real»: grabaciones de manos reales (botón «¿Se equivocó de letra?» y calibración).
// Con el mismo código de la app calcula para cada mano:
//   - sus medidas (lib/ia/arbol/caracteristicas.ts), que serán las columnas X del modelo,
//   - lo que dicen las REGLAS FIJAS de la app (lib/vision/postura.ts), para compararlas con el modelo.
// Se usa Vite para cargar el código TypeScript de la app sin compilarlo aparte.
//
// Uso (desde frontend/):  node scripts/ml-preparar-datos.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const RAIZ = path.resolve(import.meta.dirname, '..', '..')
const DATOS = path.join(RAIZ, 'ml', 'datos')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { normalizarMano, evaluar } = await vite.ssrLoadModule('/src/lib/vision/postura.ts')
const { alfabeto } = await vite.ssrLoadModule('/src/lib/aprendizaje/alfabeto.ts')
const { caracteristicas, NOMBRES_CARACTERISTICAS } = await vite.ssrLoadModule('/src/lib/ia/arbol/caracteristicas.ts')
const { clasesDe } = await vite.ssrLoadModule('/src/lib/ia/cnn/datos.ts')
const { esqueleto, giroDeForma, poseDeForma, rotar } = await vite.ssrLoadModule('/src/lib/avatar/mano3d.ts')
const { grafoLetras } = await vite.ssrLoadModule('/src/lib/aprendizaje/grafoLetras.ts')
const letras = alfabeto('LSM')
// Letras con la misma forma que solo cambian por el movimiento (I/J, N/Ñ, K/P) son una sola clase:
// con una foto de la mano no se pueden distinguir.
const clases = clasesDe(letras)
const claseDe = (letra) => clases.find((c) => c.letras.includes(letra))?.nombre ?? letra

/** Las letras que reconocen las reglas fijas para esta mano. */
function reglas(puntos) {
  return letras.filter((l) => evaluar(puntos, l.objetivo).correcto).map((l) => l.letra)
}

// Números al azar repetibles (los datos salen iguales cada vez).
let semilla = 2026
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296)
const normal = () => Math.sqrt(-2 * Math.log(Math.max(azar(), 1e-12))) * Math.cos(2 * Math.PI * azar())
const entre = (a, b) => a + (b - a) * azar()

/** Una mano del avatar haciendo la letra, con variaciones de persona y de posición. */
function manoDelAvatar(forma) {
  const pose = structuredClone(poseDeForma(forma))
  for (const d of Object.values(pose.dedos)) {
    d.mcp = Math.max(0, d.mcp + normal() * 8)
    d.pip = Math.max(0, d.pip + normal() * 8)
    d.dip = Math.max(0, d.dip + normal() * 6)
    d.abre += normal() * 3
  }
  pose.pulgar = { x: pose.pulgar.x + normal() * 0.05, y: pose.pulgar.y + normal() * 0.05, z: pose.pulgar.z + normal() * 0.05 }
  pose.curvaPulgar = Math.max(0, pose.curvaPulgar + normal() * 0.05)
  const vista = { x: entre(-25, 25), y: entre(-35, 35), z: entre(-15, 15) } // inclinar, voltear, girar
  const ancho = entre(0.88, 1.12) // manos más anchas o más angostas
  const alto = entre(0.9, 1.1)
  const tamano = entre(0.18, 0.3) // qué tan cerca de la cámara
  const base = giroDeForma(forma)
  const puntos = esqueleto(pose).map((p) => {
    const q = rotar(rotar({ x: p.x * ancho, y: p.y * alto, z: p.z }, base), vista)
    return { x: 0.5 - q.x * tamano + normal() * 0.003, y: 0.6 - q.y * tamano + normal() * 0.003, z: -q.z * tamano }
  })
  return { puntos, vista }
}

const filas = []
const MANOS_POR_LETRA = 150
/** Qué tanto de la imagen ocupa la mano (0 a 1): sirve para descubrir detecciones falsas. */
const tamanoDe = (puntos) => {
  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  return Math.round(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1000) / 1000
}
const agregar = (base, puntos) => {
  if (!puntos) {
    filas.push({ ...base, tamano_mano: '', prediccion_reglas: '', reglas_todas: '', medidas: null })
    return
  }
  const cumplen = reglas(puntos)
  filas.push({
    ...base,
    tamano_mano: tamanoDe(puntos),
    // Si las reglas reconocen varias letras, el traductor se queda con la primera; si ninguna, «ninguna».
    prediccion_reglas: cumplen[0] ? claseDe(cumplen[0]) : 'ninguna',
    reglas_todas: cumplen.join(' '),
    medidas: caracteristicas(puntos),
  })
}

// 1) La mano 3D del avatar: MANOS_POR_LETRA manos de cada letra (las de movimiento comparten clase).
for (const clase of clases) {
  const letra = letras.find((l) => l.letra === clase.letras[0])
  for (let k = 0; k < MANOS_POR_LETRA; k++) {
    const { puntos, vista } = manoDelAvatar(letra.forma)
    agregar(
      { origen: 'avatar3d', letra: clase.nombre, variacion: k, giro: Math.round(Math.max(Math.abs(vista.x), Math.abs(vista.y))), escala: '', espejo: 0, grueso: 0, detectada: 1, confianza: '' },
      puntos,
    )
  }
}

// 2) Los dibujos de LSM pasados por MediaPipe (ml/datos/puntos_dibujos.json)
const dibujos = JSON.parse(fs.readFileSync(path.join(DATOS, 'puntos_dibujos.json'), 'utf8'))
for (const d of dibujos) {
  const puntos = d.puntos && normalizarMano(d.puntos.map(([x, y, z]) => ({ x, y, z })), d.lado)
  agregar(
    { origen: 'dibujo', letra: claseDe(d.letra), variacion: d.variacion, giro: d.giro, escala: d.escala, espejo: d.espejo ? 1 : 0, grueso: d.grueso ? 1 : 0, detectada: d.detectada ? 1 : 0, confianza: d.confianza ?? '' },
    puntos,
  )
}

// 3) Grabaciones reales (botón «¿Se equivocó de letra?» y calibración), ya vienen normalizadas.
const carpetaReales = path.join(DATOS, 'reales')
for (const archivo of fs.existsSync(carpetaReales) ? fs.readdirSync(carpetaReales) : []) {
  const datos = JSON.parse(fs.readFileSync(path.join(carpetaReales, archivo), 'utf8'))
  if (Array.isArray(datos.cuadros)) {
    // Grabación de una letra (mano-LSM-O-….json)
    datos.cuadros.forEach((c, i) =>
      agregar({ origen: 'real', letra: claseDe(datos.letraHecha), variacion: i, giro: '', escala: '', espejo: '', grueso: '', detectada: 1, confianza: '' }, c.puntos),
    )
  } else if (datos.cuadros && typeof datos.cuadros === 'object') {
    // Calibración (calibracion-LSM-….json): { letra: [cuadros] }
    for (const [letra, cuadros] of Object.entries(datos.cuadros)) {
      cuadros.forEach((c, i) => agregar({ origen: 'real', letra: claseDe(letra), variacion: i, giro: '', escala: '', espejo: '', grueso: '', detectada: 1, confianza: '' }, c.puntos))
    }
  }
}

// 4) Escribir el CSV
const columnas = ['id', 'origen', 'letra', 'variacion', 'giro', 'escala', 'espejo', 'grueso', 'detectada', 'confianza', 'tamano_mano', 'prediccion_reglas', 'reglas_todas', ...NOMBRES_CARACTERISTICAS]
const lineas = [columnas.join(',')]
filas.forEach((f, i) => {
  const medidas = f.medidas ?? NOMBRES_CARACTERISTICAS.map(() => '')
  lineas.push([i + 1, f.origen, f.letra, f.variacion, f.giro, f.escala, f.espejo, f.grueso, f.detectada, f.confianza, f.tamano_mano, f.prediccion_reglas, f.reglas_todas, ...medidas].join(','))
})
fs.writeFileSync(path.join(DATOS, 'manos_crudas.csv'), lineas.join('\n') + '\n', 'utf8')
console.log(`Listo: ${filas.length} manos en ml/datos/manos_crudas.csv (${columnas.length} columnas)`)

// 5) El grafo de letras parecidas (práctica 1: BFS)
fs.writeFileSync(path.join(DATOS, 'grafo_letras.json'), JSON.stringify(grafoLetras('LSM').grafo, null, 1), 'utf8')
console.log('Listo: ml/datos/grafo_letras.json')
await vite.close()
