/*
 * COMPONENTE: LETRAS QUE SALEN DE LA MANO
 * Se pone encima de la cámara. Cada vez que el texto deletreado crece con una letra nueva,
 * esa letra aparece grande en el centro, «sale volando» hacia arriba y se desvanece.
 * Además suena una nota y vibra el celular (si están activados).
 *   <div className="relative"><CamaraManos …/><LetrasQueSalen texto={texto} /></div>
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sonidos } from '../lib/juegos/sonidos'
import { vibrar } from '../lib/tacto'

interface Volando {
  id: number
  letra: string
  /** Pequeño desvío a izquierda o derecha para que no salgan todas igual. */
  desvio: number
}

let siguienteId = 1

export function LetrasQueSalen({ texto, conSonido = true }: { texto: string; conSonido?: boolean }) {
  const [anterior, setAnterior] = useState(texto)
  const [volando, setVolando] = useState<Volando[]>([])
  const [racha, setRacha] = useState(0)

  // Si el texto creció con una letra (no un espacio), lanzarla. Se calcula al dibujar, sin efectos.
  if (texto !== anterior) {
    setAnterior(texto)
    const ultima = texto.at(-1)
    if (texto.length > anterior.length && ultima && ultima !== ' ') {
      setVolando((v) => [...v.slice(-3), { id: siguienteId++, letra: ultima, desvio: (Math.random() - 0.5) * 80 }])
      setRacha((r) => r + 1)
    } else if (ultima === ' ' || !texto) {
      setRacha(0)
    }
  }

  // Sonido y vibración cuando sale una letra nueva (después de dibujar).
  // (Al terminar de volar una letra la lista se acorta: por eso se recuerda la última que ya sonó.)
  const ultimaId = volando.at(-1)?.id ?? 0
  const sonada = useRef(0)
  useEffect(() => {
    if (ultimaId <= sonada.current) return
    sonada.current = ultimaId
    if (conSonido) sonidos.acierto(racha - 1)
    vibrar('acierto')
  }, [ultimaId, conSonido, racha])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {volando.map((v) => (
          <motion.span
            key={v.id}
            className="absolute top-1/2 left-1/2 -mt-12 -ml-12 grid size-24 place-items-center rounded-3xl bg-white text-6xl font-bold text-marca-800 shadow-2xl shadow-marca-900/30"
            initial={{ scale: 0.3, opacity: 0, y: 40, x: 0, rotate: 0 }}
            animate={{
              scale: [0.3, 1.25, 1, 0.6],
              opacity: [0, 1, 1, 0],
              y: [40, 0, -30, -220],
              x: [0, 0, v.desvio * 0.3, v.desvio],
              rotate: [0, 0, v.desvio / 10, v.desvio / 5],
            }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.45, 1], ease: 'easeOut' }}
            onAnimationComplete={() => setVolando((lista) => lista.filter((x) => x.id !== v.id))}
          >
            {v.letra}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
