import { useId } from 'react'
import type { EstadoDedo, FormaMano, Movimiento } from '../lib/aprendizaje/forma'
import type { Dedo } from '../lib/vision/postura'

type Tono = 'objetivo' | 'ok' | 'mal'

const COLORES: Record<EstadoDedo, Record<Tono, string>> = {
  estirado: { objetivo: '#148372', ok: '#10b981', mal: '#ef4444' },
  curvo: { objetivo: '#3bbfa6', ok: '#6ee7b7', mal: '#fca5a5' },
  doblado: { objetivo: '#c7c2bd', ok: '#a7f3d0', mal: '#fecaca' },
}

// Base y punta (estirado) de cada dedo, con la mano vertical y la palma al frente.
const DEDOS: { dedo: Exclude<Dedo, 'pulgar'>; x: number; punta: number; ancho: number }[] = [
  { dedo: 'indice', x: 61, punta: 52, ancho: 22 },
  { dedo: 'medio', x: 88, punta: 34, ancho: 22 },
  { dedo: 'anular', x: 115, punta: 44, ancho: 22 },
  { dedo: 'menique', x: 141, punta: 68, ancho: 19 },
]
const BASE_Y = 140
const BASE_PULGAR = { x: 58, y: 190 }

const ABIERTOS: Record<string, number> = { indice: -14, medio: 8, anular: 16 }
const CRUZADOS: Record<string, number> = { indice: 26, medio: -26 }
const HUECOS_ENTRE = { 1: { x: 75, y: 112 }, 2: { x: 102, y: 108 }, 3: { x: 128, y: 114 } }

function puntaDedo(d: (typeof DEDOS)[number], forma: FormaMano) {
  const estado = forma.dedos[d.dedo]
  const desvio = estado === 'estirado' ? ((forma.cruzados ? CRUZADOS : forma.separados ? ABIERTOS : {})[d.dedo] ?? 0) : 0
  const y = estado === 'estirado' ? d.punta : estado === 'curvo' ? BASE_Y - (BASE_Y - d.punta) * 0.55 : 110
  return { x: d.x + desvio, y }
}

function puntaPulgar(forma: FormaMano) {
  switch (forma.pulgar) {
    case 'doblado':
      return { x: 112, y: 160 }
    case 'sobre':
      return { x: 122, y: 124 }
    case 'lado':
      return { x: 38, y: 122 }
    case 'estirado':
      return { x: 4, y: 122 }
    case 'curvo':
      return { x: 36, y: 132 }
    case 'entre':
      return HUECOS_ENTRE[forma.entre ?? 1]
    case 'toca': {
      // Se junta con la punta del primer dedo curvo (O, D, F).
      const d = DEDOS.find((x) => forma.dedos[x.dedo] === 'curvo') ?? DEDOS[0]
      const p = puntaDedo(d, forma)
      return { x: p.x - 6, y: p.y + 14 }
    }
  }
}

const FLECHAS: Record<Movimiento, { d: string; dobles?: boolean }> = {
  j: { d: 'M172 58 V160 Q172 196 142 190' },
  z: { d: 'M108 6 H170 L108 46 H170' },
  arriba: { d: 'M178 128 Q190 42 124 16' },
  lados: { d: 'M36 26 Q100 0 164 26', dobles: true },
  frente: { d: 'M112 18 H186', dobles: true },
}

/**
 * Ilustración esquemática de una seña: dedos estirados (verde oscuro), curvos (verde claro)
 * y doblados (gris); el pulgar en su posición; flechas si la seña lleva movimiento.
 * `tonos` colorea cada dedo como correcto o incorrecto al comparar con el intento del usuario.
 */
export function ManoIlustrada({ forma, tonos, etiqueta }: { forma: FormaMano; tonos?: Partial<Record<Dedo, Tono>>; etiqueta: string }) {
  const idFlecha = useId()
  const tono = (d: Dedo): Tono => tonos?.[d] ?? 'objetivo'
  const estadoPulgar: EstadoDedo = forma.pulgar === 'doblado' ? 'doblado' : forma.pulgar === 'curvo' ? 'curvo' : 'estirado'
  const pulgar = puntaPulgar(forma)
  // En "cruzados" el medio se dibuja al final para que pase por encima del índice.
  const orden = forma.cruzados ? [DEDOS[0], DEDOS[2], DEDOS[3], DEDOS[1]] : DEDOS
  const flecha = forma.movimiento && FLECHAS[forma.movimiento]

  const trazo = (x1: number, y1: number, x2: number, y2: number, ancho: number, color: string, clave: string, curva?: string) => (
    <g key={clave}>
      {curva ? (
        <>
          <path d={curva} fill="none" stroke="#78716c" strokeOpacity={0.35} strokeWidth={ancho + 4} strokeLinecap="round" />
          <path d={curva} fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78716c" strokeOpacity={0.35} strokeWidth={ancho + 4} strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={ancho} strokeLinecap="round" />
        </>
      )}
    </g>
  )

  return (
    <svg viewBox="-20 -10 240 265" role="img" aria-label={etiqueta} className="h-full w-full">
      <defs>
        <marker id={idFlecha} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#d97706" />
        </marker>
      </defs>

      <g transform={forma.giro ? `rotate(${forma.giro} 100 140)` : undefined}>
        {orden.map((d) => {
          const p = puntaDedo(d, forma)
          const estado = forma.dedos[d.dedo]
          return trazo(d.x, estado === 'doblado' ? 128 : BASE_Y, p.x, p.y, d.ancho, COLORES[estado][tono(d.dedo)], d.dedo)
        })}

        {/* Palma */}
        <rect x={46} y={116} width={108} height={104} rx={32} fill="#f5f5f4" stroke="#a8a29e" strokeWidth={2} />

        {/* Pulgar */}
        {forma.pulgar === 'curvo'
          ? trazo(0, 0, 0, 0, 23, COLORES.curvo[tono('pulgar')], 'pulgar', `M${BASE_PULGAR.x} ${BASE_PULGAR.y} Q14 176 ${pulgar.x} ${pulgar.y}`)
          : trazo(BASE_PULGAR.x, BASE_PULGAR.y, pulgar.x, pulgar.y, 23, COLORES[estadoPulgar][tono('pulgar')], 'pulgar')}
      </g>

      {flecha && (
        <path
          d={flecha.d}
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
