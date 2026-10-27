/*
 * JUEGO: ¿QUÉ LETRA ES? (sin cámara)
 * 10 preguntas rápidas que alternan dos tipos:
 *   - se ve el DIBUJO de la mano → elegir la letra;
 *   - se ve la LETRA → elegir el dibujo correcto.
 * Lo que lo hace emocionante:
 *   - 8 segundos por pregunta (reloj circular): mientras más rápido, más puntos;
 *   - racha: 3 aciertos seguidos = ×2, 5 seguidos = ×3 (con llama y confeti);
 *   - 3 vidas: cada error o tiempo agotado quita una; sin vidas se acaba;
 *   - se responde también con las teclas 1, 2, 3 y 4.
 * Las opciones incorrectas son las letras más parecidas (ej.: para la U salen V, R, H)
 * y al fallar se explica en qué se diferencian.
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { ArrowRight, Check, X } from 'lucide-react'
// ▸ Desde React:
import { useEffect, useRef, useState, type ReactNode } from 'react'
// ▸ Desde nuestro proyecto: componentes
import { Boton } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { Confeti } from '../../components/juegos/Confeti'
import { CuentaRegresiva, Marcador, PuntosFlotantes, RelojCircular } from '../../components/juegos/PiezasJuego'
import { ManoIlustrada } from '../../components/ManoIlustrada'
// ▸ Desde nuestro proyecto: estado, hooks y lógica
import { useApp } from '../../context/AppContext'
import { useFlotantes } from '../../hooks/useFlotantes'
import { useModeloIA } from '../../hooks/useModeloIA'
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
import { useRegistroJuegos, type Recompensa } from '../../hooks/useRegistroJuegos'
import { alfabeto, type Letra } from '../../lib/aprendizaje/alfabeto'
import { diferencias } from '../../lib/aprendizaje/grafoLetras'
import { crearPreguntas, estrellas, mejorPuntaje, puntosRespuesta, SEGUNDOS_PREGUNTA, VIDAS, type Pregunta } from '../../lib/juegos/juegos'
import { sonidos } from '../../lib/juegos/sonidos'
import { ResultadoJuego } from './ResultadoJuego'
import { SelectorLetras } from './SelectorLetras'

/** Tras un acierto se pasa sola a la siguiente pregunta. */
const MS_SIGUIENTE = 1100

type Fase = 'elegir' | 'cuenta' | 'jugando' | 'fin'

export default function JuegoAdivina() {
  const { lengua } = useApp()
  const { logradas } = useProgresoAprendizaje()
  const { partidas, registrar } = useRegistroJuegos()
  const ia = useModeloIA()
  const letras = alfabeto(lengua ?? 'LSM')

  const [fase, setFase] = useState<Fase>('elegir')
  const [elegidas, setElegidas] = useState<Letra[]>([])
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [indice, setIndice] = useState(0)
  const [respuesta, setRespuesta] = useState<string | null>(null) // letra elegida; '' = se acabó el tiempo
  const [puntos, setPuntos] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [racha, setRacha] = useState(0)
  const [mejorRacha, setMejorRacha] = useState(0)
  const [vidas, setVidas] = useState(VIDAS)
  const [falladas, setFalladas] = useState<string[]>([])
  const [inicioPregunta, setInicioPregunta] = useState(0)
  const [ahora, setAhora] = useState(0)
  const [mejorAnterior, setMejorAnterior] = useState(0)
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null)
  const [confeti, setConfeti] = useState(0)
  const { flotantes, lanzar } = useFlotantes()
  const [tarjeta, animarTarjeta] = useAnimate()

  const pregunta = preguntas[indice]

  const empezar = (seleccion: Letra[]) => {
    setElegidas(seleccion)
    setPreguntas(crearPreguntas(seleccion, letras))
    setIndice(0)
    setRespuesta(null)
    setPuntos(0)
    setAciertos(0)
    setRacha(0)
    setMejorRacha(0)
    setVidas(VIDAS)
    setFalladas([])
    setRecompensa(null)
    setMejorAnterior(mejorPuntaje(partidas, 'adivina'))
    setFase('cuenta')
  }

  const arrancarPregunta = () => {
    const t = Date.now()
    setInicioPregunta(t)
    setAhora(t)
  }

  const terminar = (datos: { puntos: number; aciertos: number; falladas: string[]; mejorRacha: number }) => {
    setFase('fin')
    setRecompensa(
      registrar({
        juego: 'adivina',
        puntos: datos.puntos,
        aciertos: datos.aciertos,
        total: preguntas.length,
        fecha: Date.now(),
        falladas: datos.falladas,
        racha: datos.mejorRacha,
        estrellas: estrellas(datos.aciertos, preguntas.length),
      }),
    )
  }

  const restanteMs = Math.max(0, inicioPregunta + SEGUNDOS_PREGUNTA * 1000 - ahora)
  const segundos = Math.ceil(restanteMs / 1000)

  // Responder (letra = la elegida; null = se acabó el tiempo).
  const responder = (letra: string | null) => {
    if (respuesta !== null || fase !== 'jugando') return
    setRespuesta(letra ?? '')
    ia.observar(pregunta.correcta.letra, letra === pregunta.correcta.letra, 'opcion') // la IA aprende de cada respuesta
    if (letra === pregunta.correcta.letra) {
      const ganados = puntosRespuesta(restanteMs / 1000, racha)
      const nuevaRacha = racha + 1
      setPuntos((p) => p + ganados)
      setAciertos((a) => a + 1)
      setRacha(nuevaRacha)
      setMejorRacha((m) => Math.max(m, nuevaRacha))
      sonidos.acierto(nuevaRacha)
      lanzar(`+${ganados}`)
      if (nuevaRacha === 3 || nuevaRacha === 5 || nuevaRacha % 10 === 0) setConfeti((n) => n + 1)
    } else {
      setRacha(0)
      setVidas((v) => v - 1)
      setFalladas((f) => (f.includes(pregunta.correcta.letra) ? f : [...f, pregunta.correcta.letra]))
      sonidos.error()
      lanzar('−1 ♥', false)
      if (tarjeta.current) void animarTarjeta(tarjeta.current, { x: [0, -14, 14, -10, 10, -4, 0] }, { duration: 0.45 })
    }
  }

  const siguiente = () => {
    const sinVidas = vidas <= 0
    if (sinVidas || indice + 1 >= preguntas.length) {
      terminar({ puntos, aciertos, falladas, mejorRacha })
      return
    }
    setIndice(indice + 1)
    setRespuesta(null)
    arrancarPregunta()
  }

  // Funciones más recientes para los temporizadores y el teclado.
  const ultimo = useRef({ responder, siguiente })
  useEffect(() => {
    ultimo.current = { responder, siguiente }
  })

  // Reloj de la pregunta: avanza, hace «tic» en los últimos 3 segundos y, si llega a cero, cuenta como error.
  useEffect(() => {
    if (fase !== 'jugando' || respuesta !== null) return
    let ultimoTic = 0
    const id = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      const quedan = inicioPregunta + SEGUNDOS_PREGUNTA * 1000 - n
      const s = Math.ceil(quedan / 1000)
      if (s <= 3 && s > 0 && s !== ultimoTic) {
        ultimoTic = s
        sonidos.tic()
      }
      if (quedan <= 0) ultimo.current.responder(null)
    }, 100)
    return () => clearInterval(id)
  }, [fase, respuesta, inicioPregunta])

  // Tras un acierto, pasar sola a la siguiente.
  const acerto = pregunta && respuesta === pregunta.correcta.letra
  useEffect(() => {
    if (!acerto) return
    const t = setTimeout(() => ultimo.current.siguiente(), MS_SIGUIENTE)
    return () => clearTimeout(t)
  }, [acerto, indice])

  // Teclado: 1-4 para responder, Enter para seguir.
  useEffect(() => {
    if (fase !== 'jugando') return
    const alPresionar = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && pregunta) ultimo.current.responder(pregunta.opciones[n - 1]?.letra ?? null)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [fase, pregunta])

  const encabezado = <EncabezadoPagina titulo="¿Qué letra es?" descripcion="¡Rápido! Reconoce las señas antes de que se acabe el tiempo." volverA="/aprender/juegos" />

  if (fase === 'elegir') {
    return (
      <>
        {encabezado}
        <SelectorLetras letras={letras} logradas={logradas} alEmpezar={empezar} />
      </>
    )
  }

  if (fase === 'fin') {
    return (
      <>
        {encabezado}
        <ResultadoJuego
          puntos={puntos}
          estrellas={estrellas(aciertos, preguntas.length)}
          datos={[
            { etiqueta: 'Aciertos', valor: `${aciertos} de ${preguntas.length}` },
            { etiqueta: 'Mejor racha', valor: `${mejorRacha} 🔥` },
            { etiqueta: 'Vidas', valor: `${Math.max(0, vidas)} de ${VIDAS}` },
          ]}
          mejorAnterior={mejorAnterior}
          recompensa={recompensa}
          falladas={falladas}
          alRepetir={() => empezar(elegidas)}
        />
      </>
    )
  }

  const elegida = letras.find((l) => l.letra === respuesta)
  const pistas = elegida && !acerto ? diferencias(elegida.forma, pregunta.correcta.forma) : []
  const fraccion = respuesta !== null ? 0 : restanteMs / (SEGUNDOS_PREGUNTA * 1000)

  return (
    <>
      {encabezado}
      <Confeti disparo={confeti} cantidad={70} />
      {fase === 'cuenta' && (
        <CuentaRegresiva
          alTerminar={() => {
            setFase('jugando')
            arrancarPregunta()
          }}
        />
      )}

      <div className="mx-auto max-w-3xl space-y-4">
        <Marcador puntos={puntos} racha={racha} vidas={vidas} vidasMax={VIDAS} progreso={`Pregunta ${indice + 1} de ${preguntas.length}`} />

        <section ref={tarjeta} aria-labelledby="titulo-pregunta" className="relative rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <PuntosFlotantes flotantes={flotantes} />
          <AnimatePresence mode="wait">
            <motion.div
              key={indice}
              initial={{ opacity: 0, x: 40, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -40, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              {pregunta.tipo === 'dibujo' ? (
                <>
                  <h2 id="titulo-pregunta" className="text-center text-xl font-bold">
                    ¿Qué letra es esta seña?
                  </h2>
                  <div className="mt-4 flex justify-center">
                    <RelojCircular fraccion={fraccion} segundos={segundos} tamano="size-52">
                      <motion.div
                        className="size-36"
                        animate={respuesta === null ? { y: [0, -6, 0] } : { y: 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ManoIlustrada forma={pregunta.correcta.forma} etiqueta="Dibujo de la seña a adivinar" />
                      </motion.div>
                    </RelojCircular>
                  </div>
                  <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {pregunta.opciones.map((o, i) => (
                      <li key={o.letra}>
                        <Opcion numero={i + 1} opcion={o} pregunta={pregunta} respuesta={respuesta} alElegir={responder}>
                          <span className="text-4xl font-bold">{o.letra}</span>
                        </Opcion>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <h2 id="titulo-pregunta" className="sr-only">
                    ¿Cuál es la seña de la letra {pregunta.correcta.letra}?
                  </h2>
                  <div className="flex items-center justify-center gap-4">
                    <RelojCircular fraccion={fraccion} segundos={segundos} tamano="size-32">
                      <span className="text-6xl font-bold text-marca-800">{pregunta.correcta.letra}</span>
                    </RelojCircular>
                    <p className="text-xl font-bold" aria-hidden>
                      ¿Cuál es su seña?
                    </p>
                  </div>
                  <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {pregunta.opciones.map((o, i) => (
                      <li key={o.letra}>
                        <Opcion
                          numero={i + 1}
                          opcion={o}
                          pregunta={pregunta}
                          respuesta={respuesta}
                          alElegir={responder}
                          etiqueta={`Opción ${i + 1}${respuesta !== null ? `: letra ${o.letra}` : ''}`}
                        >
                          <span className="block aspect-square w-full p-1">
                            <ManoIlustrada forma={o.forma} etiqueta="" />
                          </span>
                          {respuesta !== null && <span className="absolute bottom-1.5 left-2.5 text-lg font-bold">{o.letra}</span>}
                        </Opcion>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Retroalimentación */}
          <AnimatePresence>
            {respuesta !== null && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                className={`mt-6 flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4 ${
                  acerto ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">
                    {acerto
                      ? racha >= 3
                        ? `¡${racha} seguidas! Sigue así 🔥`
                        : '¡Correcto!'
                      : respuesta === ''
                        ? `¡Se acabó el tiempo! Era la ${pregunta.correcta.letra}.`
                        : `Era la ${pregunta.correcta.letra}.`}
                  </p>
                  {pistas.length > 0 && (
                    <p className="text-sm">
                      Para pasar de la {respuesta} a la {pregunta.correcta.letra}: {pistas.join(', ').toLowerCase()}.
                    </p>
                  )}
                </div>
                {!acerto && (
                  <Boton onClick={siguiente} autoFocus>
                    {vidas <= 0 ? 'Ver resultado' : indice + 1 < preguntas.length ? 'Siguiente' : 'Ver resultado'}
                    <ArrowRight className="size-5" aria-hidden />
                  </Boton>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <p className="text-center text-sm text-stone-500">Tip: responde con las teclas 1, 2, 3 y 4.</p>
      </div>
    </>
  )
}

/** Botón de una opción: rebota al pasar el mouse, se pone verde/rojo al responder. */
function Opcion({
  numero,
  opcion,
  pregunta,
  respuesta,
  alElegir,
  etiqueta,
  children,
}: {
  numero: number
  opcion: Letra
  pregunta: Pregunta
  respuesta: string | null
  alElegir: (letra: string) => void
  etiqueta?: string
  children: ReactNode
}) {
  const correcta = opcion.letra === pregunta.correcta.letra
  const elegida = opcion.letra === respuesta
  const estilo =
    respuesta === null
      ? 'border-stone-200 bg-white hover:border-marca-400 hover:bg-marca-50'
      : correcta
        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
        : elegida
          ? 'border-red-400 bg-red-50 text-red-900'
          : 'border-stone-200 bg-white opacity-40'
  return (
    <motion.button
      type="button"
      onClick={() => alElegir(opcion.letra)}
      disabled={respuesta !== null}
      aria-label={etiqueta}
      whileHover={respuesta === null ? { y: -4, scale: 1.03 } : undefined}
      whileTap={respuesta === null ? { scale: 0.94 } : undefined}
      animate={respuesta !== null && correcta ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`relative grid min-h-24 w-full place-items-center rounded-2xl border-2 p-2 shadow-sm transition-colors ${estilo}`}
    >
      {children}
      {respuesta === null && (
        <span className="absolute top-1.5 left-2 grid size-6 place-items-center rounded-md bg-stone-100 text-xs font-bold text-stone-500" aria-hidden>
          {numero}
        </span>
      )}
      {respuesta !== null && (correcta || elegida) && (
        <span className={`absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full text-white ${correcta ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {correcta ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <X className="size-4" strokeWidth={3} aria-hidden />}
        </span>
      )}
    </motion.button>
  )
}
