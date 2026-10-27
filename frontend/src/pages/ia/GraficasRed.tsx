/*
 * DIBUJOS DE LA RED NEURONAL (pantalla «Mi IA»)
 *   - DiagramaRed: las capas de la red como bloques, de la imagen a la letra.
 *   - CurvaEntrenamiento: cómo baja el error y sube la precisión en cada época (SVG propio).
 *   - ImagenRed: dibuja una imagen de la red (28×28) en un <canvas> agrandado y pixelado.
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde React:
import { useEffect, useRef } from 'react'
// ▸ Desde nuestro proyecto:
import type { ProgresoEpoca } from '../../lib/ia/cnn/datos'
import { ARQUITECTURA_BASE } from '../../lib/ia/cnn/red'

/* ── Diagrama de capas ── */

export function DiagramaRed({ clases, activa }: { clases: number; activa: boolean }) {
  const { lado: L, filtros1, filtros2, ocultas } = ARQUITECTURA_BASE
  const capas = [
    { nombre: 'Imagen', forma: `1 × ${L}×${L}`, que: 'Esqueleto de tu mano' },
    { nombre: 'Convolución', forma: `${filtros1} × ${L}×${L}`, que: `${filtros1} filtros 3×3 + ReLU: detectan trazos` },
    { nombre: 'Max-pooling', forma: `${filtros1} × ${L / 2}×${L / 2}`, que: 'Resume cada zona de 2×2' },
    { nombre: 'Convolución', forma: `${filtros2} × ${L / 2}×${L / 2}`, que: `${filtros2} filtros: combinan trazos en dedos` },
    { nombre: 'Max-pooling', forma: `${filtros2} × ${L / 4}×${L / 4}`, que: `${filtros2 * (L / 4) * (L / 4)} números` },
    { nombre: 'Densa', forma: `${ocultas}`, que: 'Combina todo' },
    { nombre: 'Softmax', forma: `${clases}`, que: 'Probabilidad de cada forma' },
  ]
  return (
    <ol className="flex flex-wrap items-stretch gap-2" aria-label="Capas de la red neuronal">
      {capas.map((c, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-2"
        >
          <motion.div
            className={`w-32 rounded-xl border-2 p-2 text-center ${i === 0 || i === capas.length - 1 ? 'border-marca-600 bg-marca-50' : 'border-stone-200 bg-white'}`}
            // Mientras entrena, una «onda» recorre las capas.
            animate={activa ? { borderColor: ['#e7e5e4', '#148372', '#e7e5e4'] } : undefined}
            transition={activa ? { duration: 1.4, repeat: Infinity, delay: i * 0.2 } : undefined}
          >
            <p className="text-sm font-bold">{c.nombre}</p>
            <p className="font-mono text-xs text-marca-800">{c.forma}</p>
            <p className="mt-1 text-xs leading-tight text-stone-600">{c.que}</p>
          </motion.div>
          {i < capas.length - 1 && (
            <span className="text-stone-400" aria-hidden>
              →
            </span>
          )}
        </motion.li>
      ))}
    </ol>
  )
}

/* ── Curva de entrenamiento ── */

export function CurvaEntrenamiento({ historia, epocas }: { historia: ProgresoEpoca[]; epocas: number }) {
  const W = 520
  const H = 200
  const M = { izq: 40, der: 16, arr: 14, aba: 30 }
  const ancho = W - M.izq - M.der
  const alto = H - M.arr - M.aba
  const total = Math.max(epocas, historia.length, 2)
  const x = (e: number) => M.izq + ((e - 1) / (total - 1)) * ancho
  const y = (v: number) => M.arr + (1 - v) * alto
  const maxPerdida = Math.max(...historia.map((h) => h.perdida), 0.01)
  const linea = (valores: number[]) => valores.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Curva de aprendizaje de la red">
        {/* Cuadrícula y eje Y (0 % a 100 %) */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={M.izq} x2={W - M.der} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeDasharray="3 3" />
            <text x={M.izq - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#78716c">
              {v * 100}%
            </text>
          </g>
        ))}
        {/* Eje X: épocas */}
        {Array.from({ length: total }, (_, i) => (
          <text key={i} x={x(i + 1)} y={H - 10} textAnchor="middle" fontSize="10" fill="#78716c">
            {i + 1}
          </text>
        ))}
        <text x={M.izq + ancho / 2} y={H} textAnchor="middle" fontSize="10" fill="#57534e">
          Época
        </text>
        {historia.length > 0 && (
          <>
            {/* Error (pérdida), escalado a su máximo */}
            <path d={linea(historia.map((h) => h.perdida / maxPerdida))} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Precisión con datos que no vio */}
            <path d={linea(historia.map((h) => h.validacion))} fill="none" stroke="#148372" strokeWidth="3" strokeLinejoin="round" />
            {historia.map((h, i) => (
              <circle key={i} cx={x(i + 1)} cy={y(h.validacion)} r="4" fill="#148372" stroke="white" strokeWidth="1.5">
                <title>{`Época ${h.epoca}: precisión ${Math.round(h.validacion * 100)} %`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-sm text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-5 rounded bg-marca-600" aria-hidden /> Precisión con manos que no vio
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-5 rounded bg-amber-500" aria-hidden /> Error (baja mientras aprende)
        </span>
      </figcaption>
    </figure>
  )
}

/* ── Imagen de la red agrandada ── */

export function ImagenRed({ datos, lado = 28, tamano = 168, etiqueta }: { datos: Float32Array | null; lado?: number; tamano?: number; etiqueta: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(lado, lado)
    const max = datos ? Math.max(...datos, 1e-6) : 1
    for (let i = 0; i < lado * lado; i++) {
      const v = datos ? Math.min(1, datos[i] / max) : 0
      // Fondo oscuro y trazos en teal claro.
      img.data[i * 4] = 12 + v * 97
      img.data[i * 4 + 1] = 40 + v * 194
      img.data[i * 4 + 2] = 36 + v * 157
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [datos, lado])
  return (
    <canvas
      ref={lienzo}
      width={lado}
      height={lado}
      role="img"
      aria-label={etiqueta}
      className="rounded-lg"
      style={{ width: tamano, height: tamano, imageRendering: 'pixelated' }}
    />
  )
}
