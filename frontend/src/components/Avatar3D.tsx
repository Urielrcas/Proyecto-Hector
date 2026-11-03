/*
 * COMPONENTE: AVATAR 3D (una mano con antebrazo que hace las señas)
 * Dibuja en SVG la mano 3D de lib/avatar/mano3d.ts. En cada cuadro de animación:
 *   1. mezcla la pose anterior con la nueva (la mano pasa suave de una letra a otra),
 *   2. aplica el movimiento de la letra (J, Z, K…),
 *   3. gira la mano según la letra y la vista (se puede girar arrastrando),
 *   4. proyecta los puntos con perspectiva y dibuja de lo más lejano a lo más cercano
 *      (así un dedo que pasa por delante tapa al de atrás).
 * Sin librerías 3D: todo son cuentas sobre los 21 puntos de la mano.
 * Uso: <Avatar3D forma={letra.forma} clave={posicion} msMovimiento={1500} />
 */

import { useEffect, useState, type PointerEvent } from 'react'
import type { FormaMano } from '../lib/aprendizaje/forma'
import {
  esqueleto,
  giroDeForma,
  mezclarPoses,
  movimientoEn,
  poseDeForma,
  POSE_REPOSO,
  proyectar,
  rotar,
  type Giro,
  type Pose,
  type V3,
} from '../lib/avatar/mano3d'
import { tonoMarca } from '../lib/colores'
import { leerConfiguracion } from '../lib/configuracion'

/** Cuánto tarda la mano en pasar de una letra a otra (ms). */
const MS_TRANSICION = 280
/** Vista de tres cuartos: así se nota que la mano es 3D. */
const VISTA: Giro = { x: -8, y: -18, z: 0 }
const ANCHO = 300
const ALTO = 340
const CAMARA = { distancia: 6, escala: 80, centro: { x: ANCHO / 2, y: 196 } }

const PIEL = { base: [241, 199, 163], borde: '#b9805a', una: '#f8e2d2' }

interface Animacion {
  clave: string | number
  desde: Pose
  hacia: Pose
  giroDesde: Giro
  giroHacia: Giro
  forma: FormaMano | null
  inicio: number
}

const suave = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
const mezclarGiro = (a: Giro, b: Giro, t: number): Giro => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })
const sumarGiro = (a: Giro, b: Giro): Giro => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })

/** Color de la piel un poco más claro en lo que está cerca y más oscuro en lo lejano. */
function piel(z: number) {
  const luz = Math.max(-0.12, Math.min(0.12, z * 0.08))
  const [r, g, b] = PIEL.base.map((c) => Math.round(luz > 0 ? c + (255 - c) * luz : c * (1 + luz)))
  return `rgb(${r},${g},${b})`
}

export function Avatar3D({
  forma,
  clave,
  msMovimiento = 1200,
  className = 'size-56',
  etiqueta = 'Avatar 3D haciendo la seña',
}: {
  /** Forma de la letra; null = mano en reposo. */
  forma: FormaMano | null
  /** Cambia en cada seña (aunque se repita la letra) para volver a animarla. */
  clave: string | number
  msMovimiento?: number
  className?: string
  etiqueta?: string
}) {
  const sinMovimiento = leerConfiguracion().reducirMovimiento
  const objetivo = forma ? poseDeForma(forma) : POSE_REPOSO
  const giroObjetivo = forma ? giroDeForma(forma) : { x: 0, y: 0, z: 0 }

  const [ahora, setAhora] = useState(0)
  const [anim, setAnim] = useState<Animacion>(() => ({ clave, desde: objetivo, hacia: objetivo, giroDesde: giroObjetivo, giroHacia: giroObjetivo, forma, inicio: 0 }))
  const [orbita, setOrbita] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [arrastre, setArrastre] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Lo que se ve en este instante: la mezcla entre la pose anterior y la nueva.
  const avance = sinMovimiento ? 1 : suave((ahora - anim.inicio) / MS_TRANSICION)
  const poseVista = mezclarPoses(anim.desde, anim.hacia, avance)
  const giroVisto = mezclarGiro(anim.giroDesde, anim.giroHacia, avance)

  // Nueva seña: empezar a moverse desde donde está la mano ahora (patrón de «estado anterior» de React).
  if (anim.clave !== clave) {
    setAnim({ clave, desde: poseVista, hacia: objetivo, giroDesde: giroVisto, giroHacia: giroObjetivo, forma, inicio: ahora })
  }

  // Reloj de la animación.
  useEffect(() => {
    let id = 0
    const cuadro = (t: number) => {
      setAhora(t)
      id = requestAnimationFrame(cuadro)
    }
    id = requestAnimationFrame(cuadro)
    return () => cancelAnimationFrame(id)
  }, [])

  // Movimiento de la letra, después de llegar a la forma.
  const tMov = sinMovimiento ? 0 : Math.min(1, Math.max(0, (ahora - anim.inicio - MS_TRANSICION) / Math.max(300, msMovimiento - MS_TRANSICION)))
  const { mover, giro: giroMov } = movimientoEn(anim.forma?.movimiento, tMov)
  // Un vaivén muy leve para que se sienta viva.
  const vaiven = sinMovimiento ? 0 : Math.sin(ahora / 1500) * 3
  const vista = sumarGiro(VISTA, { x: orbita.x, y: orbita.y + vaiven, z: 0 })

  // Puntos 3D: la mano gira alrededor de la MUÑECA (como una persona real) y después se aplica la vista.
  const colocarCon = (giro: Giro) => (p: V3): V3 => {
    const q = rotar(p, giro)
    return rotar({ x: q.x + mover.x, y: q.y + mover.y, z: q.z + mover.z }, vista)
  }
  const colocar = colocarCon(sumarGiro(giroVisto, giroMov))
  const puntos = esqueleto(poseVista).map(colocar)
  // El antebrazo no gira con la letra: solo la acompaña un poco (la que gira es la muñeca).
  const antebrazo = [{ x: 0, y: 0, z: 0 }, { x: 0, y: -1.6, z: -0.05 }].map(colocarCon({ x: 0, y: giroVisto.y * 0.3, z: giroVisto.z * 0.25 + giroMov.z * 0.3 }))
  const munecaPulgar = colocar({ x: 0.26, y: 0.06, z: 0 })
  const munecaMenique = colocar({ x: -0.3, y: 0.06, z: 0 })

  // Piezas a dibujar, con su profundidad para ordenarlas.
  type Pieza = { z: number; dibujo: (k: number) => React.ReactNode }
  const piezas: Pieza[] = []
  const pr = (p: V3) => proyectar(p, CAMARA)
  const manga = tonoMarca(600)
  const mangaBorde = tonoMarca(800)

  // Antebrazo (manga del color de la app)
  {
    const [a, b] = antebrazo.map(pr)
    piezas.push({
      // Siempre detrás de la mano.
      z: -10,
      dibujo: (k) => (
        <g key={k}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={mangaBorde} strokeWidth={0.66 * CAMARA.escala * a.k} strokeLinecap="round" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={manga} strokeWidth={0.6 * CAMARA.escala * a.k} strokeLinecap="round" />
        </g>
      ),
    })
  }

  // Palma
  {
    const contorno = [munecaPulgar, puntos[1], puntos[5], puntos[9], puntos[13], puntos[17], munecaMenique]
    const z = contorno.reduce((s, p) => s + p.z, 0) / contorno.length
    const d = contorno
      .map(pr)
      .map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`)
      .join(' ')
    piezas.push({
      z: z - 0.05,
      dibujo: (k) => <path key={k} d={`${d} Z`} fill={piel(z)} stroke={PIEL.borde} strokeWidth={3} strokeLinejoin="round" />,
    })
  }

  // Falanges de cada dedo (y del pulgar)
  const grosor = (dedo: number, falange: number) => {
    const base = dedo === 0 ? [0.27, 0.23, 0.2] : [0.22, 0.19, 0.165]
    const factor = dedo === 4 ? 0.85 : 1
    return base[falange] * factor
  }
  // ¿La uña de este dedo mira hacia quien ve? (el dorso de la última falange apunta a +z)
  const nombres = ['indice', 'medio', 'anular', 'menique'] as const
  const unaVisible = (dedo: number) => {
    if (dedo === 0) return false
    const a = poseVista.dedos[nombres[dedo - 1]]
    const th = ((a.mcp + a.pip + a.dip) * Math.PI) / 180
    const n = rotar(rotar({ x: 0, y: Math.sin(th), z: -Math.cos(th) }, sumarGiro(giroVisto, giroMov)), vista)
    return n.z > 0.15
  }
  for (let dedo = 0; dedo < 5; dedo++) {
    const conUna = unaVisible(dedo)
    const cadena = dedo === 0 ? [1, 2, 3, 4] : [5, 6, 7, 8].map((i) => i + (dedo - 1) * 4)
    for (let f = 0; f < 3; f++) {
      const a = puntos[cadena[f]]
      const b = puntos[cadena[f + 1]]
      const z = (a.z + b.z) / 2
      const ancho = grosor(dedo, f)
      piezas.push({
        z,
        dibujo: (k) => {
          const [pa, pb] = [pr(a), pr(b)]
          const w = ancho * CAMARA.escala * ((pa.k + pb.k) / 2)
          const esPunta = f === 2 && conUna
          // Uña: un óvalo claro cerca de la punta, del lado de afuera del dedo.
          const ux = pa.x + (pb.x - pa.x) * 0.72
          const uy = pa.y + (pb.y - pa.y) * 0.72
          const ang = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI
          return (
            <g key={k}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={PIEL.borde} strokeWidth={w + 3} strokeLinecap="round" />
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={piel(z)} strokeWidth={w} strokeLinecap="round" />
              {esPunta && <ellipse cx={ux} cy={uy} rx={w * 0.32} ry={w * 0.22} transform={`rotate(${ang} ${ux} ${uy})`} fill={PIEL.una} opacity={0.75} />}
            </g>
          )
        },
      })
    }
  }

  piezas.sort((a, b) => a.z - b.z)

  // Girar arrastrando (doble clic: regresar a la vista normal).
  const alPresionar = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastre({ x: e.clientX, y: e.clientY, ox: orbita.x, oy: orbita.y })
  }
  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    if (!arrastre) return
    setOrbita({ x: Math.max(-60, Math.min(60, arrastre.ox - (e.clientY - arrastre.y) * 0.5)), y: arrastre.oy + (e.clientX - arrastre.x) * 0.6 })
  }

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={`${className} cursor-grab touch-none select-none active:cursor-grabbing`}
      role="img"
      aria-label={etiqueta}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={() => setArrastre(null)}
      onPointerCancel={() => setArrastre(null)}
      onDoubleClick={() => setOrbita({ x: 0, y: 0 })}
    >
      {/* Sombra en el piso */}
      <ellipse cx={ANCHO / 2} cy={ALTO - 14} rx={70} ry={9} fill="#1c1917" opacity={0.08} />
      {piezas.map((p, i) => p.dibujo(i))}
    </svg>
  )
}
