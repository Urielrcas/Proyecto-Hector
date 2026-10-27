/*
 * JUEGO: MEMORAMA (sin cámara)
 * Cartas boca abajo: la mitad tienen una LETRA y la otra mitad el DIBUJO de su seña.
 * Se voltean de dos en dos; si la letra y su dibujo coinciden, se quedan descubiertas.
 *   - Fácil: 4 pares · Normal: 6 pares · Difícil: 8 pares de letras PARECIDAS (U, V, R, H…).
 *   - Puntos: 20 por par, −5 por movimiento de más, y bono por terminar rápido.
 *   - Estrellas según los movimientos (perfecto = un movimiento por par).
 * Las cartas giran en 3D al voltearse y brillan al formar un par.
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, Hand, Play, Timer } from 'lucide-react'
// ▸ Desde React:
import { useEffect, useRef, useState } from 'react'
// ▸ Desde nuestro proyecto:
import { Boton } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { Confeti } from '../../components/juegos/Confeti'
import { CuentaRegresiva, Marcador } from '../../components/juegos/PiezasJuego'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { useApp } from '../../context/AppContext'
import { useModeloIA } from '../../hooks/useModeloIA'
import { useRegistroJuegos, type Recompensa } from '../../hooks/useRegistroJuegos'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import {
  crearMemorama,
  estrellasMemorama,
  mejorPuntaje,
  PARES,
  puntosMemorama,
  type Carta,
  type Dificultad,
} from '../../lib/juegos/juegos'
import { sonidos } from '../../lib/juegos/sonidos'
import { ResultadoJuego } from './ResultadoJuego'

/** Cuánto se ven dos cartas que no coinciden antes de voltearse otra vez. */
const MS_VER_ERROR = 900

const DIFICULTADES: { valor: Dificultad; nombre: string; texto: string }[] = [
  { valor: 'facil', nombre: 'Fácil', texto: `${PARES.facil} pares` },
  { valor: 'normal', nombre: 'Normal', texto: `${PARES.normal} pares` },
  { valor: 'dificil', nombre: 'Difícil', texto: `${PARES.dificil} pares de letras parecidas` },
]

type Fase = 'elegir' | 'cuenta' | 'jugando' | 'fin'

export default function JuegoMemorama() {
  const { lengua } = useApp()
  const { partidas, registrar } = useRegistroJuegos()
  const ia = useModeloIA()
  const letras = alfabeto(lengua ?? 'LSM')

  const [fase, setFase] = useState<Fase>('elegir')
  const [dificultad, setDificultad] = useState<Dificultad>('normal')
  const [cartas, setCartas] = useState<Carta[]>([])
  const [volteadas, setVolteadas] = useState<number[]>([]) // ids de las 1 o 2 cartas boca arriba
  const [encontradas, setEncontradas] = useState<string[]>([]) // letras ya emparejadas
  const [movimientos, setMovimientos] = useState(0)
  const [racha, setRacha] = useState(0)
  const [mejorRacha, setMejorRacha] = useState(0)
  const [inicio, setInicio] = useState(0)
  const [ahora, setAhora] = useState(0)
  const [error, setError] = useState<number[]>([]) // las dos cartas que no coincidieron (se sacuden)
  const [confeti, setConfeti] = useState(0)
  const [mejorAnterior, setMejorAnterior] = useState(0)
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null)
  const [final, setFinal] = useState({ puntos: 0, estrellas: 0, segundos: 0 })

  const pares = cartas.length / 2
  const segundos = inicio ? Math.floor((ahora - inicio) / 1000) : 0

  const empezar = (d: Dificultad) => {
    setDificultad(d)
    setCartas(crearMemorama(letras, d))
    setVolteadas([])
    setEncontradas([])
    setMovimientos(0)
    setRacha(0)
    setMejorRacha(0)
    setError([])
    setRecompensa(null)
    setMejorAnterior(mejorPuntaje(partidas, 'memorama'))
    setFase('cuenta')
  }

  // Reloj (cuenta hacia arriba).
  useEffect(() => {
    if (fase !== 'jugando') return
    const id = setInterval(() => setAhora(Date.now()), 250)
    return () => clearInterval(id)
  }, [fase])

  const registrarActual = useRef(registrar)
  useEffect(() => {
    registrarActual.current = registrar
  })

  const voltear = (carta: Carta) => {
    if (fase !== 'jugando' || volteadas.length === 2 || volteadas.includes(carta.id) || encontradas.includes(carta.letra.letra)) return
    sonidos.carta()
    const nuevas = [...volteadas, carta.id]
    setVolteadas(nuevas)
    if (nuevas.length < 2) return

    // Dos cartas boca arriba: ¿son la letra y su dibujo?
    const mov = movimientos + 1
    setMovimientos(mov)
    const [a, b] = nuevas.map((id) => cartas.find((c) => c.id === id)!)
    if (a.letra.letra === b.letra.letra) {
      ia.observar(a.letra.letra, true, 'memorama') // la IA aprende: reconoció la letra y su seña
      const nuevasEncontradas = [...encontradas, a.letra.letra]
      const nuevaRacha = racha + 1
      setEncontradas(nuevasEncontradas)
      setVolteadas([])
      setRacha(nuevaRacha)
      setMejorRacha((m) => Math.max(m, nuevaRacha))
      sonidos.brillo()
      if (nuevaRacha >= 3) setConfeti((n) => n + 1)
      // ¿Último par?
      if (nuevasEncontradas.length === pares) {
        const seg = (Date.now() - inicio) / 1000
        const puntos = puntosMemorama(pares, mov, seg)
        const est = estrellasMemorama(pares, mov)
        setFinal({ puntos, estrellas: est, segundos: Math.floor(seg) })
        setTimeout(() => {
          setFase('fin')
          setRecompensa(
            registrarActual.current({
              juego: 'memorama',
              puntos,
              aciertos: pares,
              total: mov,
              fecha: Date.now(),
              falladas: [],
              racha: Math.max(mejorRacha, nuevaRacha),
              estrellas: est,
            }),
          )
        }, 700)
      }
    } else {
      setRacha(0)
      sonidos.error()
      setError(nuevas)
      setTimeout(() => {
        setVolteadas([])
        setError([])
      }, MS_VER_ERROR)
    }
  }

  const encabezado = <EncabezadoPagina titulo="Memorama" descripcion="Junta cada letra con el dibujo de su seña." volverA="/aprender/juegos" />

  if (fase === 'elegir') {
    return (
      <>
        {encabezado}
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold">Elige la dificultad</h2>
          <div role="radiogroup" aria-label="Dificultad" className="mt-4 grid gap-3 sm:grid-cols-3">
            {DIFICULTADES.map((d) => (
              <button
                key={d.valor}
                type="button"
                role="radio"
                aria-checked={dificultad === d.valor}
                onClick={() => setDificultad(d.valor)}
                className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                  dificultad === d.valor ? 'border-marca-600 bg-marca-50' : 'border-stone-200 hover:border-marca-300'
                }`}
              >
                <span className="block font-bold">{d.nombre}</span>
                <span className="block text-sm text-stone-600">{d.texto}</span>
              </button>
            ))}
          </div>
          <Boton className="mt-6" onClick={() => empezar(dificultad)}>
            <Play className="size-5" aria-hidden />
            Empezar
          </Boton>
        </section>
      </>
    )
  }

  if (fase === 'fin') {
    return (
      <>
        {encabezado}
        <ResultadoJuego
          puntos={final.puntos}
          estrellas={final.estrellas}
          datos={[
            { etiqueta: 'Movimientos', valor: `${movimientos} (perfecto: ${pares})` },
            { etiqueta: 'Tiempo', valor: `${final.segundos} s` },
            { etiqueta: 'Mejor racha', valor: `${mejorRacha} 🔥` },
          ]}
          mejorAnterior={mejorAnterior}
          recompensa={recompensa}
          falladas={[]}
          alRepetir={() => empezar(dificultad)}
        />
      </>
    )
  }

  // Cuadrícula: 4 columnas (8 o 12 cartas) o 4×4 (16 cartas).
  return (
    <>
      {encabezado}
      <Confeti disparo={confeti} cantidad={60} />
      {fase === 'cuenta' && (
        <CuentaRegresiva
          alTerminar={() => {
            const t = Date.now()
            setInicio(t)
            setAhora(t)
            setFase('jugando')
          }}
        />
      )}

      <div className="mx-auto max-w-3xl space-y-4">
        <Marcador puntos={encontradas.length * 20} racha={racha} progreso={`Pares: ${encontradas.length} de ${pares}`} />
        <div className="flex justify-center gap-6 text-stone-600">
          <span className="inline-flex items-center gap-1.5 font-bold">
            <Brain className="size-5" aria-hidden /> {movimientos} movimientos
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <Timer className="size-5" aria-hidden /> {segundos} s
          </span>
        </div>

        <ul className="grid grid-cols-4 gap-2 sm:gap-3" style={{ perspective: 900 }}>
          {cartas.map((c, i) => {
            const encontrada = encontradas.includes(c.letra.letra)
            const arriba = encontrada || volteadas.includes(c.id)
            const mal = error.includes(c.id)
            return (
              <motion.li key={c.id} initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <motion.button
                  type="button"
                  onClick={() => voltear(c)}
                  disabled={arriba}
                  aria-label={arriba ? (c.cara === 'letra' ? `Letra ${c.letra.letra}` : `Dibujo de la seña ${c.letra.letra}`) : `Carta ${i + 1}, boca abajo`}
                  className="relative aspect-3/4 w-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: arriba ? 180 : 0, x: mal ? [0, -6, 6, -4, 4, 0] : 0, scale: encontrada ? [1, 1.08, 1] : 1 }}
                  transition={{ rotateY: { type: 'spring', stiffness: 260, damping: 22 }, x: { duration: 0.4 }, scale: { duration: 0.4 } }}
                  whileHover={!arriba ? { y: -4 } : undefined}
                  whileTap={!arriba ? { scale: 0.95 } : undefined}
                >
                  {/* Reverso (boca abajo) */}
                  <span
                    className="absolute inset-0 grid place-items-center rounded-2xl bg-linear-to-br from-marca-600 to-marca-800 text-marca-100 shadow-md"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <Hand className="size-8 opacity-70" aria-hidden />
                  </span>
                  {/* Frente */}
                  <span
                    className={`absolute inset-0 grid place-items-center rounded-2xl border-2 bg-white p-2 shadow-md ${
                      encontrada ? 'border-emerald-400 bg-emerald-50' : mal ? 'border-red-400' : 'border-marca-300'
                    }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {c.cara === 'letra' ? (
                      <span className="text-4xl font-bold text-marca-800 sm:text-5xl">{c.letra.letra}</span>
                    ) : (
                      <span className="block size-full">
                        <ManoIlustrada forma={c.letra.forma} etiqueta="" />
                      </span>
                    )}
                  </span>
                </motion.button>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
