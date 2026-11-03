/*
 * COMPONENTE: MANI, LA MASCOTA DE LA APP
 * Una manita teal con cara que acompaña al usuario: saluda, pone atención, piensa y celebra.
 *   <Mascota animo="hola" />                       → solo la manita
 *   <Acompanante animo="fiesta" mensaje="¡Bien!" /> → la manita con un globo de diálogo
 * Todo es un dibujo SVG hecho aquí (sin imágenes ni librerías de personajes).
 * Las animaciones usan Framer Motion y se apagan solas con «Reducir movimiento».
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     AnimatePresence → anima el globo cuando cambia el mensaje
//     motion → versiones animables de las etiquetas (motion.g, motion.div...)
import { AnimatePresence, motion, type TargetAndTransition } from 'framer-motion'
import type { ReactNode } from 'react'

/** Cómo se siente Mani en este momento. */
export type Animo = 'hola' | 'atento' | 'pensando' | 'feliz' | 'fiesta'

export const NOMBRE_MASCOTA = 'Mani'

// Movimiento de todo el cuerpo según el ánimo.
const CUERPO: Record<Animo, TargetAndTransition> = {
  hola: { rotate: [0, -14, 10, -14, 10, 0], transition: { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 } },
  atento: { y: [0, -4, 0], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  pensando: { rotate: -8, y: [0, -2, 0], transition: { y: { duration: 1.6, repeat: Infinity }, rotate: { duration: 0.3 } } },
  feliz: { y: [0, -8, 0], transition: { duration: 0.9, repeat: Infinity, ease: 'easeOut' } },
  fiesta: { y: [0, -22, 0], scale: [1, 1.08, 1], rotate: [0, 6, -6, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.15 } },
}

// Boca según el ánimo (dibujada con trazos SVG).
const BOCA: Record<Animo, string> = {
  hola: 'M52 100 Q63 111 74 100',
  atento: 'M55 102 Q63 107 71 102',
  pensando: 'M58 104 Q63 101 68 104',
  feliz: 'M50 99 Q63 114 76 99',
  fiesta: 'M49 98 Q63 120 77 98 Z',
}

/** La manita: palma, cuatro dedos, pulgar y una cara en la palma. */
export function Mascota({ animo = 'atento', className = 'size-24' }: { animo?: Animo; className?: string }) {
  const dedosArriba = animo === 'fiesta' || animo === 'hola'
  return (
    <motion.svg
      viewBox="0 0 126 140"
      className={`${className} shrink-0 overflow-visible`}
      role="img"
      aria-label={`${NOMBRE_MASCOTA}, la mascota`}
      animate={CUERPO[animo]}
      style={{ originX: 0.5, originY: 0.9 }}
    >
      {/* Sombra en el piso */}
      <ellipse cx="63" cy="136" rx="30" ry="4" className="fill-marca-900/10" />

      <g className="fill-marca-500 stroke-marca-700" strokeWidth="3" strokeLinejoin="round">
        {/* Dedos: índice, medio, anular y meñique (más largos cuando celebra) */}
        {[
          { x: 26, alto: dedosArriba ? 50 : 40 },
          { x: 46, alto: dedosArriba ? 60 : 48 },
          { x: 66, alto: dedosArriba ? 56 : 45 },
          { x: 86, alto: dedosArriba ? 44 : 36 },
        ].map((d, i) => (
          <motion.rect
            key={i}
            width="17"
            rx="8.5"
            initial={false}
            animate={{ x: d.x, y: 62 - d.alto, height: d.alto + 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: i * 0.03 }}
          />
        ))}
        {/* Pulgar: sale del lado izquierdo de la palma, más levantado cuando saluda o celebra */}
        <rect x="2" y="72" width="44" height="18" rx="9" transform={`rotate(${dedosArriba ? -38 : -18} 40 81)`} />
        {/* Palma (encima de los dedos para que se vea como una sola mano) */}
        <rect x="20" y="52" width="88" height="76" rx="34" />
      </g>
      {/* Tapa las uniones de los dedos con la palma */}
      <rect x="24" y="56" width="80" height="20" rx="10" className="fill-marca-500" />

      {/* Cara */}
      <g>
        <ellipse cx="45" cy="98" rx="6" ry="4" className="fill-marca-300/70" />
        <ellipse cx="81" cy="98" rx="6" ry="4" className="fill-marca-300/70" />
        {[52, 74].map((cx) =>
          animo === 'feliz' || animo === 'fiesta' ? (
            // Ojos cerrados de alegría: ^ ^
            <path key={cx} d={`M${cx - 6} 88 Q${cx} 80 ${cx + 6} 88`} className="fill-none stroke-marca-950" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <motion.ellipse
              key={cx}
              cx={cx + (animo === 'pensando' ? 2 : 0)}
              cy={animo === 'pensando' ? 84 : 86}
              rx="4.5"
              ry="6.5"
              className="fill-marca-950"
              animate={{ scaleY: [1, 1, 0.1, 1] }}
              transition={{ duration: 3.5, times: [0, 0.92, 0.96, 1], repeat: Infinity }}
              style={{ transformBox: 'fill-box', originY: 0.5 }}
            />
          ),
        )}
        <path
          d={BOCA[animo]}
          className={animo === 'fiesta' ? 'fill-marca-950 stroke-marca-950' : 'fill-none stroke-marca-950'}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Destellos cuando celebra */}
      {animo === 'fiesta' &&
        [
          [8, 22],
          [116, 14],
          [120, 64],
        ].map(([x, y], i) => (
          <motion.path
            key={i}
            d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
            className="fill-amber-400"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.25 }}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
          />
        ))}
    </motion.svg>
  )
}

/** Mani con un globo de diálogo. El globo se anima cada vez que cambia el mensaje. */
export function Acompanante({
  animo,
  mensaje,
  tamano = 'size-24',
  lado = 'derecha',
  children,
}: {
  animo: Animo
  mensaje: ReactNode
  tamano?: string
  /** De qué lado de Mani sale el globo. */
  lado?: 'derecha' | 'arriba'
  children?: ReactNode
}) {
  const clave = typeof mensaje === 'string' ? mensaje : animo
  return (
    <div className={`flex gap-3 ${lado === 'arriba' ? 'flex-col-reverse items-center text-center' : 'items-end'}`}>
      <Mascota animo={animo} className={tamano} />
      <div className="min-w-0 flex-1" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={clave}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            style={{ originX: lado === 'arriba' ? 0.5 : 0, originY: 1 }}
            className={`relative inline-block max-w-full rounded-2xl border-2 border-marca-200 bg-white px-4 py-3 text-left font-bold text-stone-800 shadow-sm ${
              lado === 'arriba' ? 'mb-1' : 'mb-6'
            }`}
          >
            {mensaje}
            {children}
            {/* Piquito del globo apuntando a Mani */}
            <span
              aria-hidden
              className={`absolute size-3 rotate-45 border-marca-200 bg-white ${
                lado === 'arriba' ? '-bottom-[7px] left-1/2 -ml-1.5 border-r-2 border-b-2' : 'bottom-3 -left-[7px] border-b-2 border-l-2'
              }`}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
