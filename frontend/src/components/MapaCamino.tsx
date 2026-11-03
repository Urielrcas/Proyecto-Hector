/*
 * COMPONENTE: MAPA DEL CAMINO DE APRENDIZAJE
 * Dibuja las paradas de lib/aprendizaje/camino.ts como un sendero que zigzaguea hacia abajo:
 *   - círculo teal con ✓ = nivel o reto hecho
 *   - círculo blanco con aro que «late» y Mani al lado = donde vas
 *   - círculo gris = lo que sigue
 * Al tocar un nivel se abren sus letras (cada una lleva a su práctica); al tocar un reto, al juego.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flag, Gamepad2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Parada } from '../lib/aprendizaje/camino'
import { vibrar } from '../lib/tacto'
import { Mascota } from './Mascota'

// Desplazamiento horizontal (px) de cada parada: dibuja la curva del sendero.
const ZIGZAG = [0, 55, 80, 55, 0, -55, -80, -55]
const ALTO_CONECTOR = 44

function desplazamiento(i: number) {
  return ZIGZAG[i % ZIGZAG.length]
}

/** Tramo del sendero entre dos paradas (una curva punteada). */
function Conector({ desde, hasta, hecho }: { desde: number; hasta: number; hecho: boolean }) {
  const ancho = 320
  const x1 = ancho / 2 + desde
  const x2 = ancho / 2 + hasta
  return (
    <svg viewBox={`0 0 ${ancho} ${ALTO_CONECTOR}`} className="mx-auto block h-11 w-80 max-w-full overflow-visible" aria-hidden>
      <path
        d={`M${x1} 0 C${x1} ${ALTO_CONECTOR / 2}, ${x2} ${ALTO_CONECTOR / 2}, ${x2} ${ALTO_CONECTOR}`}
        className={hecho ? 'stroke-marca-400' : 'stroke-stone-300'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={hecho ? undefined : '2 12'}
        fill="none"
      />
    </svg>
  )
}

function Circulo({ parada }: { parada: Parada }) {
  const { estado } = parada
  const contenido =
    estado === 'hecho' ? (
      <Check className="size-9" strokeWidth={3} />
    ) : parada.tipo === 'reto' ? (
      parada.id === 'final' ? (
        <Flag className="size-8" />
      ) : (
        <Gamepad2 className="size-8" />
      )
    ) : estado === 'pendiente' ? (
      <span className="text-xl font-bold tracking-tight">{parada.letras[0]}</span>
    ) : (
      <span className="text-2xl font-bold tracking-tight">{parada.letras[0]}</span>
    )

  const colores =
    estado === 'hecho'
      ? 'bg-marca-600 text-white shadow-marca-900/25 border-marca-700'
      : estado === 'actual'
        ? 'bg-white text-marca-800 border-marca-500 shadow-marca-900/20'
        : 'bg-stone-100 text-stone-400 border-stone-200 shadow-transparent'

  return (
    <span className={`relative grid size-20 place-items-center rounded-full border-4 shadow-lg ${colores} ${parada.tipo === 'reto' ? 'rounded-[1.75rem]' : ''}`}>
      {/* Aro que late alrededor de la parada actual */}
      {estado === 'actual' && (
        <motion.span
          className="absolute -inset-2 rounded-[inherit] border-4 border-marca-300"
          animate={{ scale: [1, 1.15, 1], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          aria-hidden
        />
      )}
      {contenido}
      {/* Avance del nivel: puntitos debajo del círculo */}
      {parada.tipo === 'nivel' && estado !== 'hecho' && parada.logradas > 0 && (
        <span className="absolute -bottom-2 flex gap-1 rounded-full bg-white px-1.5 py-1 shadow" aria-hidden>
          {parada.letras.map((_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${i < parada.logradas ? 'bg-marca-600' : 'bg-stone-300'}`} />
          ))}
        </span>
      )}
    </span>
  )
}

export function MapaCamino({ paradas, logradas }: { paradas: Parada[]; logradas: readonly string[] }) {
  const actual = paradas.find((p) => p.estado === 'actual')
  const [abierta, setAbierta] = useState<string | null>(actual?.tipo === 'nivel' ? actual.id : null)

  return (
    <ol className="py-2" aria-label="Camino de aprendizaje">
      {paradas.map((p, i) => {
        const x = desplazamiento(i)
        const anteriorHecha = i > 0 && paradas[i - 1].estado === 'hecho'
        const etiqueta =
          p.tipo === 'nivel'
            ? `Nivel ${p.numero}, ${p.titulo}: letras ${p.letras.join(', ')}. ${p.logradas} de ${p.letras.length} logradas.`
            : `${p.titulo}. ${p.descripcion}`
        const esAbierta = abierta === p.id

        return (
          <li key={p.id}>
            {i > 0 && <Conector desde={desplazamiento(i - 1)} hasta={x} hecho={anteriorHecha} />}

            <motion.div
              className="relative mx-auto flex w-80 max-w-full flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <div className="relative flex flex-col items-center" style={{ transform: `translateX(${x}px)` }}>
                {/* Mani acompaña la parada actual, del lado donde hay espacio */}
                {p.estado === 'actual' && (
                  <div className={`absolute top-0 ${x >= 0 ? '-left-24' : '-right-24'} hidden sm:block`}>
                    <Mascota animo="hola" className="size-20" />
                  </div>
                )}

                {p.tipo === 'nivel' ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      vibrar('toque')
                      setAbierta(esAbierta ? null : p.id)
                    }}
                    aria-expanded={esAbierta}
                    aria-label={etiqueta}
                    className="rounded-full"
                  >
                    <Circulo parada={p} />
                  </motion.button>
                ) : p.estado === 'pendiente' ? (
                  <span aria-label={`${etiqueta} (completa los niveles anteriores)`} className="relative">
                    <Circulo parada={p} />
                    <Lock className="absolute -right-1 -bottom-1 size-6 rounded-full bg-white p-1 text-stone-500 shadow" aria-hidden />
                  </span>
                ) : (
                  <motion.div whileTap={{ scale: 0.92 }}>
                    <Link to={p.ruta} aria-label={etiqueta} className="block rounded-[1.75rem]">
                      <Circulo parada={p} />
                    </Link>
                  </motion.div>
                )}

                <p className={`mt-3 text-center text-sm font-bold ${p.estado === 'pendiente' ? 'text-stone-500' : 'text-stone-800'}`} aria-hidden>
                  {p.tipo === 'nivel' ? `Nivel ${p.numero} · ${p.titulo}` : p.titulo}
                </p>
                {p.estado === 'actual' && (
                  <span className="mt-1 rounded-full bg-marca-100 px-2.5 py-0.5 text-xs font-bold text-marca-800" aria-hidden>
                    Aquí vas
                  </span>
                )}
              </div>

              {/* Letras del nivel abierto */}
              <AnimatePresence initial={false}>
                {p.tipo === 'nivel' && esAbierta && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full overflow-hidden"
                  >
                    <ul className="mt-3 flex justify-center gap-2 rounded-2xl border-2 border-marca-100 bg-white p-3 shadow-sm">
                      {p.letras.map((letra, j) => {
                        const lograda = logradas.includes(letra)
                        return (
                          <motion.li key={letra} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * j }}>
                            <Link
                              to={`/aprender/${encodeURIComponent(letra)}`}
                              className={`relative grid size-14 place-items-center rounded-xl border-2 text-2xl font-bold transition-transform hover:-translate-y-0.5 ${
                                lograda ? 'border-marca-300 bg-marca-50 text-marca-800' : 'border-stone-200 bg-white text-stone-900 hover:border-marca-300'
                              }`}
                              aria-label={`Practicar la letra ${letra}${lograda ? ' (lograda)' : ''}`}
                            >
                              {letra}
                              {lograda && (
                                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-marca-600 text-white">
                                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                                </span>
                              )}
                            </Link>
                          </motion.li>
                        )
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </li>
        )
      })}
    </ol>
  )
}
