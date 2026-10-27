/**
 * DATOS PARA ENTRENAR LA RED CONVOLUCIONAL
 *
 *  - Clases: cada FORMA de mano distinta es una clase. Letras con la misma forma que solo
 *    cambian por el movimiento (I/J, N/Ñ, K/P) comparten clase; el movimiento lo decide otro
 *    módulo (movimiento.ts). Ej.: la clase «I/J».
 *  - Datos sintéticos: manos generadas por computadora (manoSintetica.ts) para cada letra,
 *    con «aumento de datos» (pequeños giros, escalas y temblores al azar) para que la red
 *    aprenda la idea de la forma y no una sola posición exacta.
 *  - Muestras del usuario: manos REALES guardadas cuando el usuario hizo bien una letra.
 *    Pesan más que las sintéticas: así la red se adapta a la mano de cada persona.
 *  - entrenar(): recorre los datos varias veces (épocas) en lotes pequeños y reporta el avance.
 */
// ▸ Desde nuestro proyecto:
import type { Letra } from '../../aprendizaje/alfabeto'
import { girar, manoSintetica } from '../../vision/manoSintetica'
import type { Punto } from '../../vision/postura'
import { descomprimirPuntos, imagenDeMano } from './imagen'
import { indiceMayor, type RedConvolucional } from './red'

export interface Clase {
  /** Letras que comparten la forma. La primera es la que no lleva movimiento (si hay). */
  letras: string[]
  nombre: string // «I/J»
}

/** Agrupa las letras por forma de mano (sin contar el movimiento). */
export function clasesDe(letras: Letra[]): Clase[] {
  const grupos = new Map<string, string[]>()
  for (const l of letras) {
    const { movimiento: _m, ...forma } = l.forma
    const clave = JSON.stringify(forma)
    grupos.set(clave, [...(grupos.get(clave) ?? []), l.letra])
  }
  return [...grupos.values()].map((ls) => {
    const ordenadas = [...ls].sort((a, b) => {
      const ma = letras.find((l) => l.letra === a)?.movimiento ? 1 : 0
      const mb = letras.find((l) => l.letra === b)?.movimiento ? 1 : 0
      return ma - mb
    })
    return { letras: ordenadas, nombre: ordenadas.join('/') }
  })
}

/** Índice de la clase de una letra (o −1). */
export const claseDeLetra = (clases: Clase[], letra: string) => clases.findIndex((c) => c.letras.includes(letra))

/** Normal estándar (para los temblores). */
function normal(azar: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(azar(), 1e-12))) * Math.cos(2 * Math.PI * azar())
}

/**
 * Aumento de datos: la misma mano, un poco distinta cada vez.
 * Gira hasta ±12°, la estira o encoge hasta un 10 % y mueve cada punto un poquito.
 */
export function aumentar(puntos: Punto[], azar: () => number, intensidad = 1): Punto[] {
  const giro = (azar() - 0.5) * 24 * intensidad
  const ex = 1 + (azar() - 0.5) * 0.2 * intensidad
  const ey = 1 + (azar() - 0.5) * 0.2 * intensidad
  const muneca = puntos[0]
  const girados = girarAlrededor(puntos, muneca, giro)
  return girados.map((p) => ({
    x: muneca.x + (p.x - muneca.x) * ex + normal(azar) * 0.008 * intensidad,
    y: muneca.y + (p.y - muneca.y) * ey + normal(azar) * 0.008 * intensidad,
  }))
}

function girarAlrededor(puntos: Punto[], centro: Punto, grados: number): Punto[] {
  const r = (grados * Math.PI) / 180
  const [c, s] = [Math.cos(r), Math.sin(r)]
  return puntos.map((p) => {
    const dx = p.x - centro.x
    const dy = p.y - centro.y
    return { x: centro.x + dx * c - dy * s, y: centro.y + dx * s + dy * c }
  })
}

export interface Conjunto {
  imagenes: Float32Array[]
  etiquetas: number[]
  /** Peso de cada ejemplo en el entrenamiento (las muestras reales pesan más). */
  pesos: number[]
}

/** Ejemplos sintéticos: «porClase» imágenes de cada forma de mano. */
export function datosSinteticos(letras: Letra[], clases: Clase[], porClase: number, azar: () => number): Conjunto {
  const c: Conjunto = { imagenes: [], etiquetas: [], pesos: [] }
  clases.forEach((clase, etiqueta) => {
    const letra = letras.find((l) => l.letra === clase.letras[0])!
    const base = manoSintetica(letra.forma)
    for (let i = 0; i < porClase; i++) {
      // Letras como la Y se pueden hacer vertical u horizontal.
      const orientada = letra.forma.orientacionLibre && azar() < 0.5 ? girar(base, 90) : base
      c.imagenes.push(imagenDeMano(aumentar(orientada, azar)))
      c.etiquetas.push(etiqueta)
      c.pesos.push(1)
    }
  })
  return c
}

/** Muestras reales del usuario (con aumento suave, varias copias de cada una). */
export function datosDelUsuario(
  muestras: Record<string, number[][]>,
  clases: Clase[],
  azar: () => number,
  copias = 3,
  peso = 3,
): Conjunto {
  const c: Conjunto = { imagenes: [], etiquetas: [], pesos: [] }
  for (const [letra, lista] of Object.entries(muestras)) {
    const etiqueta = claseDeLetra(clases, letra)
    if (etiqueta < 0) continue
    for (const datos of lista) {
      const puntos = descomprimirPuntos(datos)
      for (let k = 0; k < copias; k++) {
        c.imagenes.push(imagenDeMano(k === 0 ? puntos : aumentar(puntos, azar, 0.5)))
        c.etiquetas.push(etiqueta)
        c.pesos.push(peso)
      }
    }
  }
  return c
}

export function unir(...conjuntos: Conjunto[]): Conjunto {
  return {
    imagenes: conjuntos.flatMap((c) => c.imagenes),
    etiquetas: conjuntos.flatMap((c) => c.etiquetas),
    pesos: conjuntos.flatMap((c) => c.pesos),
  }
}

export interface ProgresoEpoca {
  epoca: number
  perdida: number
  /** Precisión en los datos de entrenamiento (0 a 1). */
  precision: number
  /** Precisión en datos que la red NO vio al entrenar (0 a 1): la medida honesta. */
  validacion: number
}

/** Precisión de la red en un conjunto. */
export function evaluarRed(red: RedConvolucional, c: Conjunto): number {
  if (!c.imagenes.length) return 0
  let bien = 0
  c.imagenes.forEach((img, i) => {
    if (indiceMayor(red.predecir(img)) === c.etiquetas[i]) bien++
  })
  return bien / c.imagenes.length
}

/** Entrena la red: «epocas» vueltas a los datos, en lotes de «lote» ejemplos mezclados al azar. */
export function entrenar(
  red: RedConvolucional,
  datos: Conjunto,
  validacion: Conjunto,
  opciones: { epocas: number; lote?: number; tasa?: number; azar: () => number; alProgreso?: (p: ProgresoEpoca) => void },
): ProgresoEpoca[] {
  const { epocas, lote = 16, tasa = 0.002, azar } = opciones
  const historia: ProgresoEpoca[] = []
  const orden = datos.imagenes.map((_, i) => i)
  for (let e = 1; e <= epocas; e++) {
    // Mezclar (Fisher-Yates) para que cada época vea los ejemplos en otro orden.
    for (let i = orden.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1))
      ;[orden[i], orden[j]] = [orden[j], orden[i]]
    }
    let perdida = 0
    let aciertos = 0
    // La tasa de aprendizaje baja poco a poco (pasos más finos al final).
    const tasaEpoca = tasa * Math.pow(0.85, e - 1)
    for (let i = 0; i < orden.length; i += lote) {
      const idx = orden.slice(i, i + lote)
      const r = red.entrenarLote(
        idx.map((k) => datos.imagenes[k]),
        idx.map((k) => datos.etiquetas[k]),
        tasaEpoca,
        idx.map((k) => datos.pesos[k]),
      )
      perdida += r.perdida * idx.length
      aciertos += r.aciertos
    }
    const p: ProgresoEpoca = {
      epoca: e,
      perdida: perdida / orden.length,
      precision: aciertos / orden.length,
      validacion: evaluarRed(red, validacion),
    }
    historia.push(p)
    opciones.alProgreso?.(p)
  }
  return historia
}
