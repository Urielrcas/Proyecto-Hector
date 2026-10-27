/*
 * PIEZAS VISUALES DE LOS JUEGOS
 *   - CuentaRegresiva: «3, 2, 1, ¡Ya!» grande en el centro, con bip en cada número.
 *   - RelojCircular: anillo que se vacía (teal → ámbar → rojo en los últimos segundos).
 *   - Marcador: puntos, racha con llama y multiplicador (×2, ×3), vidas y botón de sonido.
 *   - PuntosFlotantes: «+16» que sube y se desvanece al acertar (se lanzan con hooks/useFlotantes.ts).
 *   - Estrellas: 0 a 3 estrellas que aparecen una por una.
 *   - ContadorAnimado: número que cuenta hacia arriba (0 → 130).
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Flame, Heart, Star, Volume2, VolumeX } from 'lucide-react'
// ▸ Desde React:
import { useEffect, useState, type ReactNode } from 'react'
// ▸ Desde nuestro proyecto:
import { useConfiguracion } from '../../hooks/useConfiguracion'
import { multiplicador } from '../../lib/juegos/juegos'
import { sonidos } from '../../lib/juegos/sonidos'

/* ── Cuenta regresiva ── */

export function CuentaRegresiva({ alTerminar }: { alTerminar: () => void }) {
  const [n, setN] = useState(3) // 3, 2, 1, 0 (= «¡Ya!»)
  useEffect(() => {
    sonidos.cuenta(n === 0)
    const t = setTimeout(() => (n === 0 ? alTerminar() : setN(n - 1)), n === 0 ? 600 : 750)
    return () => clearTimeout(t)
    // alTerminar se llama una sola vez, al final.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-950/40 backdrop-blur-sm" role="status" aria-live="assertive">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={n}
          initial={{ scale: 2.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="grid size-48 place-items-center rounded-full bg-white text-7xl font-bold text-marca-800 shadow-2xl"
        >
          {n === 0 ? '¡Ya!' : n}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/* ── Reloj circular ── */

export function RelojCircular({
  fraccion,
  segundos,
  tamano = 'size-48',
  children,
}: {
  fraccion: number // 1 = lleno, 0 = se acabó
  segundos: number
  tamano?: string
  children?: ReactNode
}) {
  const R = 54
  const largo = 2 * Math.PI * R
  const color = segundos <= 3 ? '#dc2626' : fraccion < 0.5 ? '#f59e0b' : '#148372'
  return (
    <div className={`relative grid ${tamano} place-items-center`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-200" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - Math.max(0, Math.min(1, fraccion)))}
          style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
        />
      </svg>
      <motion.div
        className="relative grid place-items-center"
        // Late un poco en los últimos 3 segundos.
        animate={segundos <= 3 && fraccion > 0 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, repeat: segundos <= 3 && fraccion > 0 ? Infinity : 0 }}
      >
        {children}
      </motion.div>
      <span className="sr-only" role="timer">
        Quedan {segundos} segundos
      </span>
    </div>
  )
}

/* ── Marcador ── */

export function Marcador({
  puntos,
  racha,
  vidas,
  vidasMax,
  progreso,
}: {
  puntos: number
  racha: number
  vidas?: number
  vidasMax?: number
  progreso: string // «Pregunta 3 de 10»
}) {
  const { config, cambiar } = useConfiguracion()
  const x = multiplicador(racha)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
      <span className="font-bold text-stone-600">{progreso}</span>

      <div className="flex flex-wrap items-center gap-4">
        {/* Vidas: corazones; el que se pierde se encoge */}
        {vidasMax !== undefined && (
          <span className="flex gap-1" aria-label={`${vidas} de ${vidasMax} vidas`}>
            {Array.from({ length: vidasMax }, (_, i) => (
              <motion.span key={i} animate={{ scale: i < (vidas ?? 0) ? 1 : 0.75, opacity: i < (vidas ?? 0) ? 1 : 0.3 }}>
                <Heart className={`size-6 ${i < (vidas ?? 0) ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} aria-hidden />
              </motion.span>
            ))}
          </span>
        )}

        {/* Racha: aparece desde 2 aciertos seguidos */}
        <AnimatePresence>
          {racha >= 2 && (
            <motion.span
              key="racha"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800"
              aria-label={`Racha de ${racha}`}
            >
              <motion.span animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 0.6, repeat: Infinity }}>
                <Flame className="size-5 fill-amber-400 text-amber-600" aria-hidden />
              </motion.span>
              {racha}
              {x > 1 && (
                <motion.span key={x} initial={{ scale: 1.8 }} animate={{ scale: 1 }} className="ml-1 rounded-full bg-amber-500 px-2 text-sm text-white">
                  ×{x}
                </motion.span>
              )}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Puntos: «saltan» cada vez que cambian */}
        <span className="flex items-baseline gap-1">
          <motion.span key={puntos} initial={{ scale: 1.5, color: '#148372' }} animate={{ scale: 1, color: '#1c1917' }} className="text-2xl font-bold tabular-nums">
            {puntos}
          </motion.span>
          <span className="text-sm text-stone-500">pts</span>
        </span>

        <button
          type="button"
          onClick={() => cambiar({ sonidosJuegos: !config.sonidosJuegos })}
          className="grid size-10 place-items-center rounded-xl text-stone-600 hover:bg-stone-100"
          aria-label={config.sonidosJuegos ? 'Silenciar sonidos' : 'Activar sonidos'}
          aria-pressed={config.sonidosJuegos}
        >
          {config.sonidosJuegos ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      </div>
    </div>
  )
}

/* ── Puntos flotantes ── */

export interface Flotante {
  id: number
  texto: string
  bueno: boolean
}

/** Pon este componente dentro de un contenedor con «relative». */
export function PuntosFlotantes({ flotantes }: { flotantes: Flotante[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-visible" aria-hidden>
      <AnimatePresence>
        {flotantes.map((f) => (
          <motion.span
            key={f.id}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -90, opacity: [0, 1, 1, 0], scale: 1.2 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className={`absolute text-4xl font-bold drop-shadow ${f.bueno ? 'text-marca-600' : 'text-red-600'}`}
          >
            {f.texto}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ── Estrellas ── */

export function Estrellas({ cantidad, tamano = 'size-14' }: { cantidad: number; tamano?: string }) {
  return (
    <div className="flex items-end justify-center gap-2" aria-label={`${cantidad} de 3 estrellas`} role="img">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3 + i * 0.25, type: 'spring', stiffness: 260, damping: 14 }}
          className={i === 1 ? '-translate-y-3' : ''}
        >
          <Star className={`${tamano} ${i < cantidad ? 'fill-amber-400 text-amber-500' : 'fill-stone-200 text-stone-300'}`} aria-hidden />
        </motion.span>
      ))}
    </div>
  )
}

/* ── Contador animado ── */

export function ContadorAnimado({ valor, duracion = 1.2 }: { valor: number; duracion?: number }) {
  const actual = useMotionValue(0)
  const redondeado = useTransform(actual, (v) => Math.round(v))
  useEffect(() => {
    const control = animate(actual, valor, { duration: duracion, ease: 'easeOut' })
    return () => control.stop()
  }, [actual, valor, duracion])
  return <motion.span>{redondeado}</motion.span>
}
