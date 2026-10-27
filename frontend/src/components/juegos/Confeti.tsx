/*
 * COMPONENTE: CONFETI
 * Lanza papelitos de colores sobre toda la pantalla cada vez que cambia «disparo».
 * Hecho a mano con <canvas>: cada papelito tiene posición, velocidad, giro y color;
 * en cada cuadro se mueve, cae por la gravedad y se frena con el aire.
 * No se muestra si está activado «Reducir movimiento».
 *   <Confeti disparo={contador} />          ← súmale 1 al contador para lanzar más
 *   <Confeti disparo={n} cantidad={40} origen={{ x: 0.5, y: 0.4 }} />
 */

// ▸ Desde React:
//     useEffect → arrancar la animación cuando cambia «disparo»
//     useRef → guarda el <canvas> y los papelitos sin redibujar la pantalla
import { useEffect, useRef } from 'react'
// ▸ Desde nuestro proyecto: src/lib/configuracion.ts:
//     leerConfiguracion → ¿está activado «reducir movimiento»?
import { leerConfiguracion } from '../../lib/configuracion'

// Colores: los de la marca (teal) con dorado para la celebración.
const COLORES = ['#13695d', '#1fa38c', '#6dd8c1', '#a4ead8', '#f59e0b', '#fbbf24']

interface Papelito {
  x: number
  y: number
  vx: number
  vy: number
  giro: number
  velGiro: number
  ancho: number
  alto: number
  color: string
  vida: number
}

function sinMovimiento() {
  return leerConfiguracion().reducirMovimiento || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function Confeti({ disparo, cantidad = 120, origen = { x: 0.5, y: 0.35 } }: { disparo: number; cantidad?: number; origen?: { x: number; y: number } }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const papelitos = useRef<Papelito[]>([])
  const animando = useRef(false)

  useEffect(() => {
    const canvas = lienzo.current
    if (!disparo || !canvas || sinMovimiento()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Tamaño real de la pantalla (nítido en pantallas de alta densidad).
    const escala = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * escala
    canvas.height = window.innerHeight * escala
    ctx.setTransform(escala, 0, 0, escala, 0, 0)

    // Nuevos papelitos que salen disparados hacia arriba en abanico.
    const x0 = origen.x * window.innerWidth
    const y0 = origen.y * window.innerHeight
    for (let i = 0; i < cantidad; i++) {
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
      const rapidez = 6 + Math.random() * 9
      papelitos.current.push({
        x: x0,
        y: y0,
        vx: Math.cos(angulo) * rapidez,
        vy: Math.sin(angulo) * rapidez,
        giro: Math.random() * Math.PI,
        velGiro: (Math.random() - 0.5) * 0.4,
        ancho: 6 + Math.random() * 6,
        alto: 8 + Math.random() * 8,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        vida: 1,
      })
    }

    if (animando.current) return // ya hay una animación corriendo: se suman a ella
    animando.current = true
    let cuadro = 0
    const paso = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      for (const p of papelitos.current) {
        p.vy += 0.28 // gravedad
        p.vx *= 0.985 // resistencia del aire
        p.vy *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.giro += p.velGiro
        if (p.vy > 0) p.vida -= 0.006 // se desvanecen al caer
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.vida)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.giro)
        // «Aplastar» el ancho con el giro simula que el papel da vueltas en 3D.
        ctx.scale(Math.cos(p.giro * 1.7), 1)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto)
        ctx.restore()
      }
      papelitos.current = papelitos.current.filter((p) => p.vida > 0 && p.y < window.innerHeight + 40)
      cuadro++
      if (papelitos.current.length && cuadro < 600) requestAnimationFrame(paso) // máximo ~10 s
      else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        papelitos.current = []
        animando.current = false
      }
    }
    requestAnimationFrame(paso)
    // origen y cantidad se leen al disparar; solo «disparo» lanza confeti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disparo])

  return <canvas ref={lienzo} className="pointer-events-none fixed inset-0 z-50 size-full" aria-hidden />
}
