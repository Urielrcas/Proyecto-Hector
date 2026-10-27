/**
 * RED NEURONAL CONVOLUCIONAL (CNN) — escrita desde cero, sin librerías.
 *
 * Arquitectura (la imagen es de 28×28, como las de dígitos MNIST):
 *
 *   entrada 1×28×28  (imagen del esqueleto de la mano, ver imagen.ts)
 *     → Convolución 6 filtros 3×3 + ReLU     → 6×28×28   (detecta trazos: bordes, líneas, puntas)
 *     → Max-pooling 2×2                      → 6×14×14   (se queda con lo más fuerte de cada zona)
 *     → Convolución 12 filtros 3×3 + ReLU    → 12×14×14  (combina trazos: dedos, ángulos)
 *     → Max-pooling 2×2                      → 12×7×7 = 588 números
 *     → Densa 588 → 48 + ReLU                (combina todo)
 *     → Densa 48 → N clases + Softmax        (probabilidad de cada letra; suman 1)
 *
 * Entrenamiento: retropropagación (backpropagation) con entropía cruzada y el optimizador Adam.
 * Cada «capa» guarda lo que necesita para calcular sus gradientes (qué tanto cambiar cada peso).
 * Los tensores son Float32Array en orden canal × fila × columna.
 */

export interface Arquitectura {
  lado: number // tamaño de la imagen (28)
  filtros1: number
  filtros2: number
  ocultas: number
  clases: number
}

export const ARQUITECTURA_BASE: Omit<Arquitectura, 'clases'> = { lado: 28, filtros1: 6, filtros2: 12, ocultas: 48 }

/** Números al azar repetibles (para que las pruebas den siempre lo mismo). */
export function generadorAzar(semilla = 42): () => number {
  let s = semilla >>> 0 || 1
  return () => {
    // xorshift32
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/** Número con distribución normal (Box-Muller), para iniciar los pesos. */
function normal(azar: () => number): number {
  const u = Math.max(azar(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * azar())
}

/** Un conjunto de parámetros (pesos o sesgos) con su gradiente y la memoria de Adam. */
class Parametro {
  valor: Float32Array
  grad: Float32Array
  m: Float32Array // promedio de gradientes (momento)
  v: Float32Array // promedio de gradientes al cuadrado
  constructor(n: number) {
    this.valor = new Float32Array(n)
    this.grad = new Float32Array(n)
    this.m = new Float32Array(n)
    this.v = new Float32Array(n)
  }
}

/* ───────────────────────── Capas ───────────────────────── */

/** Convolución 3×3 con relleno (la salida tiene el mismo tamaño) seguida de ReLU. */
class Convolucion {
  readonly w: Parametro
  readonly b: Parametro
  readonly canalesEntrada: number
  readonly filtros: number
  readonly lado: number
  private entrada: Float32Array = new Float32Array(0)
  private salida: Float32Array = new Float32Array(0)
  constructor(canalesEntrada: number, filtros: number, lado: number, azar: () => number) {
    this.canalesEntrada = canalesEntrada
    this.filtros = filtros
    this.lado = lado
    this.w = new Parametro(filtros * canalesEntrada * 9)
    this.b = new Parametro(filtros)
    const escala = Math.sqrt(2 / (canalesEntrada * 9)) // inicialización de He (buena para ReLU)
    for (let i = 0; i < this.w.valor.length; i++) this.w.valor[i] = normal(azar) * escala
  }

  adelante(x: Float32Array): Float32Array {
    const { canalesEntrada: C, filtros: F, lado: L } = this
    const y = new Float32Array(F * L * L)
    const w = this.w.valor
    for (let f = 0; f < F; f++) {
      for (let fila = 0; fila < L; fila++) {
        for (let col = 0; col < L; col++) {
          let suma = this.b.valor[f]
          for (let c = 0; c < C; c++) {
            for (let ky = -1; ky <= 1; ky++) {
              const yy = fila + ky
              if (yy < 0 || yy >= L) continue
              for (let kx = -1; kx <= 1; kx++) {
                const xx = col + kx
                if (xx < 0 || xx >= L) continue
                suma += w[((f * C + c) * 3 + ky + 1) * 3 + kx + 1] * x[(c * L + yy) * L + xx]
              }
            }
          }
          y[(f * L + fila) * L + col] = suma > 0 ? suma : 0 // ReLU
        }
      }
    }
    this.entrada = x
    this.salida = y
    return y
  }

  /** Recibe el gradiente de la salida; acumula el de los pesos y devuelve el de la entrada. */
  atras(dy: Float32Array): Float32Array {
    const { canalesEntrada: C, filtros: F, lado: L } = this
    const x = this.entrada
    const dx = new Float32Array(C * L * L)
    const w = this.w.valor
    const dw = this.w.grad
    for (let f = 0; f < F; f++) {
      for (let fila = 0; fila < L; fila++) {
        for (let col = 0; col < L; col++) {
          const i = (f * L + fila) * L + col
          if (this.salida[i] <= 0) continue // ReLU: donde salió 0, no pasa gradiente
          const g = dy[i]
          if (g === 0) continue
          this.b.grad[f] += g
          for (let c = 0; c < C; c++) {
            for (let ky = -1; ky <= 1; ky++) {
              const yy = fila + ky
              if (yy < 0 || yy >= L) continue
              for (let kx = -1; kx <= 1; kx++) {
                const xx = col + kx
                if (xx < 0 || xx >= L) continue
                const iw = ((f * C + c) * 3 + ky + 1) * 3 + kx + 1
                const ix = (c * L + yy) * L + xx
                dw[iw] += g * x[ix]
                dx[ix] += g * w[iw]
              }
            }
          }
        }
      }
    }
    return dx
  }
}

/** Max-pooling 2×2: de cada cuadrito de 2×2 se queda el valor más alto. */
class MaxPooling {
  private indices = new Int32Array(0)
  private tamEntrada = 0
  readonly canales: number
  readonly lado: number // lado de la ENTRADA
  constructor(canales: number, lado: number) {
    this.canales = canales
    this.lado = lado
  }

  adelante(x: Float32Array): Float32Array {
    const { canales: C, lado: L } = this
    const M = L / 2
    const y = new Float32Array(C * M * M)
    this.indices = new Int32Array(C * M * M)
    this.tamEntrada = x.length
    for (let c = 0; c < C; c++) {
      for (let fila = 0; fila < M; fila++) {
        for (let col = 0; col < M; col++) {
          let mejor = -Infinity
          let donde = 0
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const i = (c * L + fila * 2 + dy) * L + col * 2 + dx
              if (x[i] > mejor) [mejor, donde] = [x[i], i]
            }
          }
          const o = (c * M + fila) * M + col
          y[o] = mejor
          this.indices[o] = donde
        }
      }
    }
    return y
  }

  /** El gradiente solo regresa a la posición que fue la más alta. */
  atras(dy: Float32Array): Float32Array {
    const dx = new Float32Array(this.tamEntrada)
    for (let o = 0; o < dy.length; o++) dx[this.indices[o]] += dy[o]
    return dx
  }
}

/** Capa densa (totalmente conectada): cada salida mira todas las entradas. ReLU opcional. */
class Densa {
  readonly w: Parametro
  readonly b: Parametro
  readonly entradas: number
  readonly salidas: number
  readonly relu: boolean
  private entrada: Float32Array = new Float32Array(0)
  private salida: Float32Array = new Float32Array(0)
  constructor(entradas: number, salidas: number, relu: boolean, azar: () => number) {
    this.entradas = entradas
    this.salidas = salidas
    this.relu = relu
    this.w = new Parametro(entradas * salidas)
    this.b = new Parametro(salidas)
    const escala = Math.sqrt(2 / entradas)
    for (let i = 0; i < this.w.valor.length; i++) this.w.valor[i] = normal(azar) * escala
  }

  adelante(x: Float32Array): Float32Array {
    const y = new Float32Array(this.salidas)
    for (let o = 0; o < this.salidas; o++) {
      let suma = this.b.valor[o]
      const fila = o * this.entradas
      for (let i = 0; i < this.entradas; i++) suma += this.w.valor[fila + i] * x[i]
      y[o] = this.relu && suma < 0 ? 0 : suma
    }
    this.entrada = x
    this.salida = y
    return y
  }

  atras(dy: Float32Array): Float32Array {
    const dx = new Float32Array(this.entradas)
    for (let o = 0; o < this.salidas; o++) {
      if (this.relu && this.salida[o] <= 0) continue
      const g = dy[o]
      if (g === 0) continue
      this.b.grad[o] += g
      const fila = o * this.entradas
      for (let i = 0; i < this.entradas; i++) {
        this.w.grad[fila + i] += g * this.entrada[i]
        dx[i] += g * this.w.valor[fila + i]
      }
    }
    return dx
  }
}

/** Softmax: convierte puntajes en probabilidades que suman 1. */
export function softmax(z: Float32Array): Float32Array {
  const max = Math.max(...z)
  const e = z.map((v) => Math.exp(v - max))
  const suma = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / suma)
}

/* ───────────────────────── La red ───────────────────────── */

export interface ResultadoLote {
  perdida: number
  aciertos: number
}

export class RedConvolucional {
  readonly arq: Arquitectura
  private readonly conv1: Convolucion
  private readonly pool1: MaxPooling
  private readonly conv2: Convolucion
  private readonly pool2: MaxPooling
  private readonly densa1: Densa
  private readonly densa2: Densa
  private pasos = 0 // pasos de Adam (para corregir el sesgo de sus promedios)

  constructor(arq: Arquitectura, semilla = 42) {
    const azar = generadorAzar(semilla)
    const L = arq.lado
    this.arq = arq
    this.conv1 = new Convolucion(1, arq.filtros1, L, azar)
    this.pool1 = new MaxPooling(arq.filtros1, L)
    this.conv2 = new Convolucion(arq.filtros1, arq.filtros2, L / 2, azar)
    this.pool2 = new MaxPooling(arq.filtros2, L / 2)
    this.densa1 = new Densa(arq.filtros2 * (L / 4) * (L / 4), arq.ocultas, true, azar)
    this.densa2 = new Densa(arq.ocultas, arq.clases, false, azar)
  }

  private get parametros(): Parametro[] {
    return [this.conv1.w, this.conv1.b, this.conv2.w, this.conv2.b, this.densa1.w, this.densa1.b, this.densa2.w, this.densa2.b]
  }

  /** Total de pesos que aprende la red. */
  get totalParametros(): number {
    return this.parametros.reduce((t, p) => t + p.valor.length, 0)
  }

  /** Pasa una imagen por la red y devuelve los puntajes (antes de softmax). */
  private adelante(imagen: Float32Array): Float32Array {
    let x = this.conv1.adelante(imagen)
    x = this.pool1.adelante(x)
    x = this.conv2.adelante(x)
    x = this.pool2.adelante(x)
    x = this.densa1.adelante(x)
    return this.densa2.adelante(x)
  }

  /** Probabilidad de cada clase para una imagen. */
  predecir(imagen: Float32Array): Float32Array {
    return softmax(this.adelante(imagen))
  }

  /** Lo que «ve» la primera convolución (para mostrarlo en pantalla). */
  mapasPrimeraCapa(imagen: Float32Array): Float32Array {
    return this.conv1.adelante(imagen)
  }

  /**
   * Entrena con un lote de ejemplos: calcula el error (entropía cruzada), lo propaga hacia atrás
   * y mueve los pesos con Adam. Devuelve la pérdida promedio y cuántos acertó el lote.
   */
  entrenarLote(imagenes: Float32Array[], etiquetas: number[], tasa = 0.002, pesosEjemplo?: number[]): ResultadoLote {
    for (const p of this.parametros) p.grad.fill(0)
    let perdida = 0
    let aciertos = 0
    let pesoTotal = 0
    imagenes.forEach((img, n) => {
      const peso = pesosEjemplo?.[n] ?? 1
      const prob = this.predecir(img)
      const y = etiquetas[n]
      perdida += -Math.log(Math.max(prob[y], 1e-9)) * peso
      pesoTotal += peso
      if (indiceMayor(prob) === y) aciertos++
      // Gradiente de softmax + entropía cruzada: probabilidad − 1 en la clase correcta.
      const d = prob.map((v, i) => (v - (i === y ? 1 : 0)) * peso)
      let g = this.densa2.atras(d)
      g = this.densa1.atras(g)
      g = this.pool2.atras(g)
      g = this.conv2.atras(g)
      g = this.pool1.atras(g)
      this.conv1.atras(g)
    })
    this.pasoAdam(tasa, pesoTotal || 1)
    return { perdida: perdida / (pesoTotal || 1), aciertos }
  }

  /** Optimizador Adam: cada peso tiene su propio «ritmo» según cómo han sido sus gradientes. */
  private pasoAdam(tasa: number, tamLote: number) {
    const b1 = 0.9
    const b2 = 0.999
    this.pasos++
    const c1 = 1 - Math.pow(b1, this.pasos)
    const c2 = 1 - Math.pow(b2, this.pasos)
    for (const p of this.parametros) {
      for (let i = 0; i < p.valor.length; i++) {
        const g = p.grad[i] / tamLote
        p.m[i] = b1 * p.m[i] + (1 - b1) * g
        p.v[i] = b2 * p.v[i] + (1 - b2) * g * g
        p.valor[i] -= (tasa * (p.m[i] / c1)) / (Math.sqrt(p.v[i] / c2) + 1e-8)
      }
    }
  }

  /** Guarda los pesos como texto (base64) para guardarlos en el navegador o en el servidor. */
  exportar(): string {
    const total = this.totalParametros
    const todo = new Float32Array(total)
    let i = 0
    for (const p of this.parametros) {
      todo.set(p.valor, i)
      i += p.valor.length
    }
    return aBase64(todo)
  }

  /** Carga pesos guardados con exportar(). Devuelve false si no corresponden a esta arquitectura. */
  importar(texto: string): boolean {
    const todo = deBase64(texto)
    if (todo.length !== this.totalParametros) return false
    let i = 0
    for (const p of this.parametros) {
      p.valor.set(todo.subarray(i, i + p.valor.length))
      i += p.valor.length
    }
    return true
  }
}

export function indiceMayor(v: ArrayLike<number>): number {
  let mejor = 0
  for (let i = 1; i < v.length; i++) if (v[i] > v[mejor]) mejor = i
  return mejor
}

function aBase64(datos: Float32Array): string {
  const bytes = new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength)
  let texto = ''
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}

function deBase64(texto: string): Float32Array {
  let binario: string
  try {
    binario = atob(texto)
  } catch {
    return new Float32Array(0)
  }
  if (binario.length % 4 !== 0) return new Float32Array(0)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}
