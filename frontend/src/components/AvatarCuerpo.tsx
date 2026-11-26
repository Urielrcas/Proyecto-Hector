/*
 * COMPONENTE: AVATAR 3D DE CUERPO COMPLETO
 * Un personaje propio, estilo caricatura (combina con Mani), que hace las señas con las DOS manos:
 *   - Las manos usan la misma mano 3D de lib/avatar/mano3d.ts, así cada letra sale igual que la que
 *     evalúa la cámara.
 *   - Los brazos llegan solos al lugar de la seña (pecho, barbilla, frente…) con cinemática inversa.
 *   - Las palabras (Buenos días, Por favor, Amigo…) se hacen como seña completa, sin deletrear.
 *   - Respira, parpadea, mira hacia su mano y cambia la cara según la seña.
 *   - Vista de cuerpo completo o de cerca, y se puede girar arrastrando.
 * La escena está en lib/avatar/escena3d.ts (Three.js). Este componente solo la crea, le pasa cada seña
 * y la apaga cuando no se ve. Se carga aparte (lazy): Three.js solo se descarga si se usa el avatar.
 * Uso: <AvatarCuerpo paso={pasoDeSena(sena, lengua)} clave={posicion} msMovimiento={1500} />
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { PasoAvatar } from '../lib/avatar/cuerpo'
import { EscenaAvatar, type VistaAvatar } from '../lib/avatar/escena3d'
import { tonoMarca } from '../lib/colores'

/** ¿El navegador puede dibujar en 3D (WebGL)? */
function hayWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function AvatarCuerpo({
  paso,
  clave,
  msMovimiento = 1200,
  className = 'h-80 w-full',
  etiqueta = 'Avatar 3D haciendo la seña',
}: {
  paso: PasoAvatar
  /** Cambia en cada seña (aunque se repita) para volver a empezar su movimiento. */
  clave: string | number
  msMovimiento?: number
  className?: string
  etiqueta?: string
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const escena = useRef<EscenaAvatar | null>(null)
  const [vista, setVista] = useState<VistaAvatar>('cuerpo')
  const [webgl] = useState(hayWebGL)
  const arrastre = useRef<{ x: number; giro: number } | null>(null)
  const regreso = useRef(0)

  // Crear la escena una vez; ajustarla al tamaño del recuadro y pausarla cuando no se ve.
  useEffect(() => {
    if (!webgl || !lienzo.current || !contenedor.current) return
    const e = new EscenaAvatar(lienzo.current, tonoMarca(600), tonoMarca(800))
    escena.current = e
    const caja = contenedor.current
    const medir = () => e.ajustarTamano(caja.clientWidth, caja.clientHeight)
    medir()
    const tamano = new ResizeObserver(medir)
    tamano.observe(caja)
    const visible = new IntersectionObserver(([entrada]) => e.ponerActivo(entrada.isIntersecting && !document.hidden))
    visible.observe(caja)
    const alCambiarPestana = () => e.ponerActivo(!document.hidden)
    document.addEventListener('visibilitychange', alCambiarPestana)
    return () => {
      tamano.disconnect()
      visible.disconnect()
      document.removeEventListener('visibilitychange', alCambiarPestana)
      e.destruir()
      escena.current = null
    }
  }, [webgl])

  // Cada seña nueva (la clave cambia aunque se repita la seña).
  useEffect(() => {
    escena.current?.ponerPaso(paso, msMovimiento)
  }, [paso, clave, msMovimiento, webgl])

  useEffect(() => {
    escena.current?.ponerVista(vista)
  }, [vista])

  const empezar = (ev: PointerEvent<HTMLDivElement>) => {
    if (!escena.current) return
    window.clearTimeout(regreso.current)
    arrastre.current = { x: ev.clientX, giro: escena.current.giroUsuario }
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }
  const mover = (ev: PointerEvent<HTMLDivElement>) => {
    if (arrastre.current && escena.current) escena.current.giroUsuario = Math.max(-1.2, Math.min(1.2, arrastre.current.giro + (ev.clientX - arrastre.current.x) * 0.012))
  }
  const soltar = () => {
    arrastre.current = null
    // Regresa de frente poco a poco.
    regreso.current = window.setTimeout(() => {
      if (escena.current) escena.current.giroUsuario = 0
    }, 1800)
  }

  if (!webgl) {
    return <p className={`grid place-items-center text-center text-sm text-stone-600 ${className}`}>Tu navegador no puede mostrar el avatar 3D. Cambia a «Dibujo».</p>
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div
        ref={contenedor}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={etiqueta}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <canvas ref={lienzo} className="block h-full w-full" />
      </div>
      <div role="radiogroup" aria-label="Vista del avatar" className="absolute bottom-2 left-2 flex rounded-lg bg-white/90 p-0.5 text-xs font-bold shadow-sm">
        {(['cuerpo', 'cerca'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vista === v}
            onClick={() => setVista(v)}
            className={`rounded-md px-2 py-1 ${vista === v ? 'bg-marca-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            {v === 'cuerpo' ? 'Cuerpo completo' : 'De cerca'}
          </button>
        ))}
      </div>
    </div>
  )
}
