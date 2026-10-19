/*
 * HERRAMIENTAS PARA DIBUJAR LA MANO (SVG)
 * Lo que comparten la vista de frente/dorso (ManoIlustrada.tsx) y la de perfil (manoPerfil.ts):
 *   - figura(): convierte el eje de un dedo (puntos + ancho) en una silueta suave que se adelgaza,
 *   - pliegue(): una arruguita de la piel en una articulación,
 *   - LienzoMano: pinta todas las piezas en orden (silueta, lo que va encima, el pulgar) con
 *     volumen (degradados) y sombra suave.
 *
 * Truco de la silueta: la palma y los dedos que salen de ella se pintan dos veces, primero el
 * borde grueso y luego la piel encima; así se funden en una sola mano.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useId → genera un identificador único (para unir una etiqueta con su campo)
import { useId, type ReactNode } from 'react'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     EstadoDedo → tipo: 'estirado' | 'curvo' | 'doblado'
import type { EstadoDedo } from '../lib/aprendizaje/forma'

export type Tono = 'objetivo' | 'ok' | 'mal'
export type P = { x: number; y: number }
/** Punto del eje de un dedo con el ancho que tiene ahí. */
export type Nodo = P & { w: number }
export type Piel = 'piel' | 'sombra' | 'ok' | 'mal'
export type Una = { c: P; rx: number; ry: number; giro: number }
export type Figura = { cerrado: string; borde: string; g1: P; g2: P }
/** Una parte de la mano que se dibuja junta (un dedo, el pulgar, la punta doblada de un dedo...). */
export type Pieza = {
  clave: string
  figura: Figura
  borde: string
  grosor: number
  piel: Piel
  unas: Una[]
  pliegues: string[]
  /** Relleno fijo en lugar del degradado: el de la palma (monte del pulgar) o piel lisa (dedos curvos de perfil). */
  relleno?: 'palma' | 'liso'
}

// Estilo de lámina ilustrada: piel clara y pareja con un contorno café delgado.
export const PIEL = { borde: '#9c654b', pliegue: '#d19a7e', una: '#fff4ec', bordeUna: '#c99a83' }
// Degradado de cada tipo de piel: lado iluminado → centro → lado en sombra.
const DEGRADADOS: Record<Piel, [string, string, string]> = {
  piel: ['#fff0e4', '#fde3cf', '#f5cfb4'],
  sombra: ['#fbe2cf', '#f5d3ba', '#ebc0a2'],
  ok: ['#e9f9f1', '#cdeedd', '#a3d9bf'],
  mal: ['#fff0ee', '#fbd3cd', '#efa79c'],
}

/**
 * Color del borde de un dedo: café normal en el dibujo de la seña; al compararlo con la cámara,
 * verde si está bien y rojo si hay que corregirlo.
 */
export const COLORES: Record<EstadoDedo, Record<Tono, string>> = {
  estirado: { objetivo: PIEL.borde, ok: '#10b981', mal: '#ef4444' },
  curvo: { objetivo: PIEL.borde, ok: '#10b981', mal: '#ef4444' },
  doblado: { objetivo: PIEL.borde, ok: '#10b981', mal: '#ef4444' },
}
export const pielDe = (t: Tono, normal: Piel = 'piel'): Piel => (t === 'objetivo' ? normal : t)
export const grosorDe = (_estado: EstadoDedo, t: Tono) => (t === 'objetivo' ? 1.6 : 3)

export const suma = (a: P, b: P, k = 1): P => ({ x: a.x + b.x * k, y: a.y + b.y * k })
export const unitario = (dx: number, dy: number): P => {
  const n = Math.hypot(dx, dy) || 1
  return { x: dx / n, y: dy / n }
}
const f = (q: P) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`
/** Grados para girar una uña según la dirección `u` del dedo. */
export const giroDe = (u: P) => (Math.atan2(-u.x, u.y) * 180) / Math.PI

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier). */
function suave(pts: P[]) {
  let d = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const [p1, p2] = [pts[i], pts[i + 1]]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`
  }
  return d
}

/**
 * Figura de un dedo a partir de su eje (de la base a la punta) y el ancho en cada punto.
 * La punta siempre es redonda; la base solo si `baseRedonda` (si no, queda abierta para
 * fundirse con la palma y su borde no se dibuja).
 */
export function figura(eje: Nodo[], baseRedonda = false): Figura {
  const n = eje.length
  const dir = eje.map((_, i) => {
    const a = eje[Math.max(0, i - 1)]
    const b = eje[Math.min(n - 1, i + 1)]
    return unitario(b.x - a.x, b.y - a.y)
  })
  const normal = dir.map((u) => ({ x: -u.y, y: u.x }))
  const A = eje.map((q, i) => suma(q, normal[i], q.w / 2))
  const B = eje.map((q, i) => suma(q, normal[i], -q.w / 2))
  const kp = eje[n - 1].w * 0.66
  const arcoPunta = ` C${f(suma(A[n - 1], dir[n - 1], kp))} ${f(suma(B[n - 1], dir[n - 1], kp))} ${f(B[n - 1])}`
  const lados = `M${f(A[0])}${suave(A)}${arcoPunta}${suave([...B].reverse())}`
  const kb = eje[0].w * 0.66
  const arcoBase = ` C${f(suma(B[0], dir[0], -kb))} ${f(suma(A[0], dir[0], -kb))} ${f(A[0])} Z`
  const cerrado = baseRedonda ? lados + arcoBase : `${lados} Z`

  // Degradado de lado a lado en la mitad del dedo; el lado claro mira arriba-izquierda (la luz).
  const m = Math.floor(n / 2)
  let g1 = A[m]
  let g2 = B[m]
  if (g1.x + g1.y > g2.x + g2.y) [g1, g2] = [g2, g1]
  return { cerrado, borde: baseRedonda ? cerrado : lados, g1, g2 }
}

/** Pliegue de la piel atravesado al dedo en `c` (dirección del dedo `u`), un poco curvo. */
export function pliegue(c: P, u: P, w: number) {
  const n = { x: -u.y, y: u.x }
  const a = suma(c, n, w * 0.3)
  const b = suma(c, n, -w * 0.3)
  return `M${f(a)} Q${f(suma(c, u, -1.8))} ${f(b)}`
}

/** Pliegues de la piel y uñas (con un brillo) de una pieza. */
function detalles(p: Pieza) {
  return (
    <g key={`${p.clave}-detalle`}>
      {p.pliegues.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={PIEL.pliegue} strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />
      ))}
      {p.unas.map((u, i) => (
        <g key={`u${i}`} transform={`rotate(${u.giro} ${u.c.x} ${u.c.y})`}>
          <ellipse cx={u.c.x} cy={u.c.y} rx={u.rx} ry={u.ry} fill={PIEL.una} stroke={PIEL.bordeUna} strokeWidth={1.2} />
          <ellipse cx={u.c.x - u.rx * 0.3} cy={u.c.y - u.ry * 0.25} rx={u.rx * 0.28} ry={u.ry * 0.4} fill="#ffffff" opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

/** Todo lo que hace falta para pintar una mano, en el orden en que se pinta. */
export interface EscenaMano {
  /** Contorno de la palma y sus líneas (o, de dorso, los tendones). */
  palma: { d: string; lineas: string[] }
  /** Piezas que quedan detrás de la palma (de perfil, los dedos salen por detrás del borde de los nudillos). */
  detras?: Pieza[]
  /** Piezas que salen de la palma y se funden con ella. */
  silueta: Pieza[]
  /** Piezas que van encima, de la más lejana a la más cercana (con sombra y borde propio). */
  encima: Pieza[]
  /** Trazos libres que se pintan al final, encima de todo (los dedos de perfil). */
  trazos?: ReactNode
  /** Transformación SVG de toda la mano (giro y espejo). */
  transform?: string
  /** Flecha de movimiento (fuera de la mano, no se gira con ella). */
  flecha?: { d: string; dobles?: boolean; transform?: string }
}

/** Pinta una escena de mano como SVG. */
export function LienzoMano({ escena, etiqueta }: { escena: EscenaMano; etiqueta: string }) {
  const uid = useId()
  const idFlecha = `${uid}-flecha`
  const idSombra = `${uid}-sombra`
  const idPalma = `${uid}-palma`
  const idGrad = (p: Pieza) => `${uid}-${p.clave}`
  const relleno = (p: Pieza) =>
    p.relleno === 'palma' ? `url(#${idPalma})` : p.relleno === 'liso' ? DEGRADADOS[p.piel][1] : `url(#${idGrad(p)})`
  const { palma, silueta, encima, flecha, detras = [] } = escena
  const sobrepuesta = (p: Pieza) => (
    <g key={p.clave}>
      <path d={p.figura.cerrado} fill={relleno(p)} filter={`url(#${idSombra})`} />
      <path d={p.figura.borde} fill="none" stroke={p.borde} strokeWidth={p.grosor * 1.2} strokeLinejoin="round" strokeLinecap="round" />
      {detalles(p)}
    </g>
  )

  return (
    <svg viewBox="-20 -10 240 265" role="img" aria-label={etiqueta} className="h-full w-full">
      <defs>
        <marker id={idFlecha} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#d97706" />
        </marker>
        <filter id={idSombra} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.8" dy="1.4" stdDeviation="1.2" floodColor="#8a5236" floodOpacity="0.16" />
        </filter>
        <radialGradient id={idPalma} cx="104" cy="186" r="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff0e4" />
          <stop offset="0.7" stopColor="#fde3cf" />
          <stop offset="1" stopColor="#f7d4ba" />
        </radialGradient>
        {[...detras, ...silueta, ...encima]
          .filter((p) => !p.relleno)
          .map((p) => (
            <linearGradient key={p.clave} id={idGrad(p)} gradientUnits="userSpaceOnUse" x1={p.figura.g1.x} y1={p.figura.g1.y} x2={p.figura.g2.x} y2={p.figura.g2.y}>
              <stop offset="0" stopColor={DEGRADADOS[p.piel][0]} />
              <stop offset="0.45" stopColor={DEGRADADOS[p.piel][1]} />
              <stop offset="1" stopColor={DEGRADADOS[p.piel][2]} />
            </linearGradient>
          ))}
      </defs>

      <g transform={escena.transform}>
        {/* 0. Lo que queda detrás de la palma */}
        {detras.map(sobrepuesta)}

        {/* 1. Silueta: palma + piezas que salen de ella (borde grueso primero, piel después) */}
        <path d={palma.d} fill={PIEL.borde} stroke={PIEL.borde} strokeWidth={3.2} strokeLinejoin="round" />
        {silueta.map((p) => (
          <path key={p.clave} d={p.figura.cerrado} fill={p.borde} stroke={p.borde} strokeWidth={p.grosor * 2} strokeLinejoin="round" />
        ))}
        <path d={palma.d} fill={`url(#${idPalma})`} />
        {silueta.map((p) => (
          <path key={p.clave} d={p.figura.cerrado} fill={relleno(p)} />
        ))}

        {/* 2. Líneas de la palma (o tendones del dorso) y detalles de la silueta */}
        {palma.lineas.map((d) => (
          <path key={d} d={d} fill="none" stroke={PIEL.pliegue} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        ))}
        {silueta.map(detalles)}

        {/* 3. Lo que va encima, de lo más lejano a lo más cercano: sombra suave, piel con volumen y borde */}
        {encima.map(sobrepuesta)}

        {/* 4. Trazos libres (dedos de perfil) */}
        {escena.trazos}
      </g>

      {flecha && (
        <path
          d={flecha.d}
          transform={flecha.transform}
          fill="none"
          stroke="#d97706"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#${idFlecha})`}
          markerStart={flecha.dobles ? `url(#${idFlecha})` : undefined}
        />
      )}
    </svg>
  )
}
