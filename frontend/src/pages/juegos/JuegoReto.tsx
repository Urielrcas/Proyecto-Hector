/*
 * JUEGOS CON CÁMARA: «RETO CONTRA RELOJ» y «DELETREA LA PALABRA»
 * Aparece una letra (SIN dibujo) y hay que hacerla con la mano antes de que se acabe el tiempo.
 *   - Reto: 8 letras al azar de las que el usuario eligió (ej.: las que cree que ya sabe).
 *   - Palabra: 3 palabras cortas (HOLA, SOL, CASA…) que se deletrean letra por letra.
 * Lo que lo hace emocionante: cuenta regresiva, reloj circular que late al final, racha con
 * multiplicador (×2, ×3), puntos que salen volando, confeti y sonidos.
 * Si no se acuerda, puede pedir una PISTA (ver el dibujo), pero la letra vale la mitad.
 *
 * alDetectar() se ejecuta en cada cuadro del video:
 *   1) evalúa la forma de la mano contra la letra que toca (postura.ts),
 *   2) si la letra lleva movimiento, sigue la mano (movimiento.ts),
 *   3) aplica la regla «acierto del reto»: f ∧ (m → d) ∧ t  (t = todavía queda tiempo).
 * Acertar sin pista también marca la letra como lograda en Aprendizaje.
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, motion, useAnimate } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Check, Lightbulb, SkipForward, X } from 'lucide-react'
// ▸ Desde React:
import { useEffect, useRef, useState } from 'react'
// ▸ Desde nuestro proyecto: componentes
import { Boton } from '../../components/Boton'
import { CamaraManos } from '../../components/CamaraManos'
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
import {
  crearPalabras,
  crearReto,
  estrellas,
  letrasDePalabra,
  mejorPuntaje,
  puntosLetra,
  segundosPara,
} from '../../lib/juegos/juegos'
import { sonidos } from '../../lib/juegos/sonidos'
import { compararConLetra } from '../../lib/ia/memoria'
import { cumple } from '../../lib/logica/reglas'
import { DetectorMovimiento, INSTRUCCION_MOVIMIENTO } from '../../lib/vision/movimiento'
import { evaluar, type Punto } from '../../lib/vision/postura'
import { ResultadoJuego } from './ResultadoJuego'
import { SelectorLetras } from './SelectorLetras'

/** Cuadros seguidos con la forma correcta para contarla (≈ 0.4 s). */
const CUADROS_PARA_ACERTAR = 12
/** Cuánto se muestra el «¡Bien!» o «Se acabó el tiempo» antes de pasar a la siguiente letra. */
const MS_AVISO = 1300

/** Una letra de la partida. En «palabra» se sabe a qué palabra pertenece y en qué posición va. */
interface Turno {
  letra: Letra
  palabra?: string
  posicion?: number
}

interface ResultadoTurno {
  acierto: boolean
  puntos: number
  pista: boolean
  motivo: 'acierto' | 'tiempo' | 'saltada'
}

type Modo = 'reto' | 'palabra'
type Fase = 'elegir' | 'cuenta' | 'jugando' | 'fin'

const TEXTOS: Record<Modo, { titulo: string; descripcion: string }> = {
  reto: { titulo: 'Reto contra reloj', descripcion: 'Haz cada letra antes de que se acabe el tiempo.' },
  palabra: { titulo: 'Deletrea la palabra', descripcion: 'Deletrea palabras completas con tu mano.' },
}

export default function JuegoReto({ modo }: { modo: Modo }) {
  const { lengua } = useApp()
  const { logradas, marcarLograda } = useProgresoAprendizaje()
  const { partidas, registrar } = useRegistroJuegos()
  const ia = useModeloIA()
  const letras = alfabeto(lengua ?? 'LSM')

  const [fase, setFase] = useState<Fase>('elegir')
  const [elegidas, setElegidas] = useState<Letra[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [indice, setIndice] = useState(0)
  const [resultados, setResultados] = useState<ResultadoTurno[]>([])
  // Momento (ms) en que se acaba el tiempo de la letra actual. 0 = el reloj aún no arranca
  // (arranca con el primer cuadro de la cámara, para no perder tiempo mientras carga).
  const [limite, setLimite] = useState(0)
  const [ahora, setAhora] = useState(() => Date.now())
  const [pista, setPista] = useState(false)
  const [aviso, setAviso] = useState<ResultadoTurno | null>(null)
  const [formaOk, setFormaOk] = useState(false) // para el borde verde de la cámara
  const [esperando, setEsperando] = useState(false) // letra repetida: hay que cambiar la mano primero
  const [racha, setRacha] = useState(0)
  const [mejorRacha, setMejorRacha] = useState(0)
  const [mejorAnterior, setMejorAnterior] = useState(0)
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null)
  const [confeti, setConfeti] = useState(0)
  const [palabraLista, setPalabraLista] = useState<string | null>(null) // «¡HOLA!» al completar una palabra
  const { flotantes, lanzar } = useFlotantes()
  const [tarjeta, animarTarjeta] = useAnimate()

  // Seguimiento cuadro a cuadro (cambia 30 veces por segundo: no redibuja la pantalla).
  const seguimiento = useRef({
    indice: -1,
    cuadrosCorrectos: 0,
    cuadrosFallidos: 0,
    resuelto: false,
    detector: null as DetectorMovimiento | null,
    // Si la letra nueva es igual a la anterior (ej.: SOL → LUNA), hay que bajar o cambiar la mano primero.
    esperarCambio: false,
    cuadrosSinForma: 0,
    posturas: [] as Punto[][], // posturas correctas de esta letra (muestras para la red neuronal)
  })

  const turno = turnos[indice]
  const jugando = fase === 'jugando'

  const empezar = (seleccion: Letra[]) => {
    const nuevos: Turno[] =
      modo === 'reto'
        ? crearReto(seleccion).map((letra) => ({ letra }))
        : crearPalabras(letras).flatMap((palabra) => letrasDePalabra(palabra, letras).map((letra, posicion) => ({ letra, palabra, posicion })))
    setElegidas(seleccion)
    setTurnos(nuevos)
    setIndice(0)
    setResultados([])
    setPista(false)
    setAviso(null)
    setRacha(0)
    setMejorRacha(0)
    setRecompensa(null)
    setMejorAnterior(mejorPuntaje(partidas, modo))
    setLimite(0)
    seguimiento.current = { ...seguimiento.current, indice: -1, esperarCambio: false }
    setEsperando(false)
    setFase('cuenta')
  }

  // Cierra la letra actual (acierto o fallo), con sonido, animación y aviso.
  const resolver = (motivo: ResultadoTurno['motivo']) => {
    const s = seguimiento.current
    if (s.resuelto || !turno) return
    s.resuelto = true
    const acierto = motivo === 'acierto'
    const r: ResultadoTurno = { acierto, motivo, pista, puntos: acierto ? puntosLetra((limite - Date.now()) / 1000, pista, racha) : 0 }
    // IA: con pista no cuenta como dominada; las posturas correctas sí enseñan a la red.
    ia.observar(turno.letra.letra, acierto && !pista, 'camara')
    if (acierto) ia.agregarMuestras(turno.letra.letra, s.posturas.filter((_, i) => i % 3 === 0).slice(-4))
    if (acierto) {
      if (!pista) marcarLograda(turno.letra.letra)
      const nueva = racha + 1
      setRacha(nueva)
      setMejorRacha((m) => Math.max(m, nueva))
      sonidos.acierto(nueva)
      lanzar(`+${r.puntos}`)
      if (nueva === 3 || nueva === 5) setConfeti((n) => n + 1)
      // ¿Se completó una palabra sin fallar ninguna letra?
      if (turno.palabra && turno.posicion === turno.palabra.length - 1) {
        const inicio = indice - turno.posicion
        const todas = [...resultados.slice(inicio), r].every((x) => x.acierto)
        if (todas) {
          setPalabraLista(turno.palabra)
          setConfeti((n) => n + 1)
          sonidos.brillo()
        }
      }
    } else {
      setRacha(0)
      sonidos.error()
      if (tarjeta.current) void animarTarjeta(tarjeta.current, { x: [0, -12, 12, -8, 8, 0] }, { duration: 0.4 })
    }
    setResultados((rs) => [...rs, r])
    setAviso(r)
  }

  // Después del aviso, pasar a la siguiente letra o terminar.
  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => {
      setAviso(null)
      setPista(false)
      setPalabraLista(null)
      if (indice + 1 >= turnos.length) {
        setFase('fin')
        return
      }
      const sigue = turnos[indice + 1]
      const repetida = sigue.letra.letra === turnos[indice].letra.letra
      seguimiento.current.esperarCambio = repetida
      setEsperando(repetida)
      setIndice(indice + 1)
      setLimite(0)
    }, palabraLista ? MS_AVISO + 500 : MS_AVISO)
    return () => clearTimeout(id)
  }, [aviso, indice, turnos, palabraLista])

  // Reloj: avanza, hace «tic» en los últimos 3 s y, si se acaba el tiempo (t = falso), cuenta como fallo.
  const resolverActual = useRef(resolver)
  useEffect(() => {
    resolverActual.current = resolver
  })
  useEffect(() => {
    if (!jugando || aviso || !limite) return
    let ultimoTic = 0
    const id = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      const s = Math.ceil((limite - n) / 1000)
      if (s <= 3 && s > 0 && s !== ultimoTic) {
        ultimoTic = s
        sonidos.tic()
      }
      if (n >= limite) resolverActual.current('tiempo')
    }, 100)
    return () => clearInterval(id)
  }, [jugando, aviso, limite])
  const totalMs = turno ? segundosPara(turno.letra) * 1000 : 0
  const restante = limite ? Math.max(0, limite - ahora) : totalMs

  // Al terminar: guardar la partida una sola vez.
  const guardada = useRef(false)
  const registrarActual = useRef(registrar)
  useEffect(() => {
    registrarActual.current = registrar
  })
  useEffect(() => {
    if (fase !== 'fin') {
      guardada.current = false
      return
    }
    if (guardada.current) return
    guardada.current = true
    const aciertos = resultados.filter((r) => r.acierto).length
    setRecompensa(
      registrarActual.current({
        juego: modo,
        puntos: resultados.reduce((t, r) => t + r.puntos, 0),
        aciertos,
        total: turnos.length,
        fecha: Date.now(),
        falladas: [...new Set(turnos.filter((_, i) => !resultados[i]?.acierto).map((t) => t.letra.letra))],
        racha: mejorRacha,
        pistas: resultados.filter((r) => r.pista).length,
        estrellas: estrellas(aciertos, turnos.length),
      }),
    )
  }, [fase, modo, resultados, turnos, mejorRacha])

  // Se ejecuta en CADA CUADRO del video con los 21 puntos de la mano (o null si no hay mano).
  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    if (!jugando || !turno) return
    const s = seguimiento.current
    const objetivo = turno.letra.objetivo
    // Letra nueva: empezar de cero.
    if (s.indice !== indice) {
      Object.assign(s, {
        indice,
        cuadrosCorrectos: 0,
        cuadrosFallidos: 0,
        resuelto: false,
        detector: objetivo.movimiento ? new DetectorMovimiento(objetivo.movimiento) : null,
        cuadrosSinForma: 0,
        posturas: [],
      })
      setFormaOk(false)
      // La cámara ya está mandando cuadros: arranca el reloj de esta letra.
      setLimite(Date.now() + segundosPara(turno.letra) * 1000)
      return
    }
    if (s.resuelto) return

    // 1) Forma de la mano.
    const r = puntos ? evaluar(puntos, objetivo) : null
    // Si la IA recuerda tu forma de esta letra, también cuenta (regla g ∨ (p ∧ c ∧ u)).
    const personal = puntos && ia.memoria.personales.has(turno.letra.letra) ? compararConLetra(puntos, turno.letra.letra, ia.memoria) : null
    const correcto = !!puntos && cumple('formaAceptada', { g: !!r?.correcto, p: !!personal?.p, c: !!personal?.c, u: !!personal?.u })

    // Letra repetida (ej.: la L de SOL y luego la de LUNA): esperar a que la mano cambie de forma.
    if (s.esperarCambio) {
      s.cuadrosSinForma = correcto ? 0 : s.cuadrosSinForma + 1
      if (s.cuadrosSinForma >= 5) {
        s.esperarCambio = false
        setEsperando(false)
      }
      return
    }

    s.cuadrosCorrectos = correcto ? s.cuadrosCorrectos + 1 : 0
    if (correcto && puntos) s.posturas = [...s.posturas, puntos].slice(-15)
    if (correcto !== formaOk) setFormaOk(correcto)

    // 2) Movimiento (solo letras como J, Z, Ñ…).
    if (s.detector) {
      if (correcto && puntos) {
        s.cuadrosFallidos = 0
        s.detector.agregar(puntos, tiempo)
      } else if (++s.cuadrosFallidos > 10) {
        s.detector.reiniciar()
      }
    }

    // 3) Regla «acierto del reto»: f ∧ (m → d) ∧ t
    const f = s.detector ? correcto : s.cuadrosCorrectos >= CUADROS_PARA_ACERTAR
    const m = s.detector !== null
    const d = s.detector?.detectado() ?? false
    const t = limite > 0 && Date.now() < limite
    if (cumple('aciertoReto', { f, m, d, t })) resolver('acierto')
  }

  const encabezado = <EncabezadoPagina titulo={TEXTOS[modo].titulo} descripcion={TEXTOS[modo].descripcion} volverA="/aprender/juegos" />

  // Pantalla inicial: en el reto se eligen las letras; en «palabra» solo se explica y se empieza.
  if (fase === 'elegir') {
    return (
      <>
        {encabezado}
        {modo === 'reto' ? (
          <SelectorLetras letras={letras} logradas={logradas} alEmpezar={empezar} />
        ) : (
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">¿Cómo se juega?</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
              <li>Verás 3 palabras cortas, como HOLA o SOL.</li>
              <li>Haz cada letra con tu mano frente a la cámara; tienes {segundosPara(letras[0])} segundos por letra.</li>
              <li>Aciertos seguidos multiplican tus puntos: ×2 desde 3 y ×3 desde 5.</li>
              <li>Si no te acuerdas, pide una pista: verás el dibujo, pero la letra vale la mitad.</li>
            </ul>
            <Boton className="mt-6" onClick={() => empezar(letras)}>
              Empezar
            </Boton>
          </section>
        )}
      </>
    )
  }

  if (fase === 'fin') {
    const puntos = resultados.reduce((t, r) => t + r.puntos, 0)
    const aciertos = resultados.filter((r) => r.acierto).length
    const falladas = [...new Set(turnos.filter((_, i) => !resultados[i]?.acierto).map((t) => t.letra.letra))]
    return (
      <>
        {encabezado}
        <ResultadoJuego
          puntos={puntos}
          estrellas={estrellas(aciertos, turnos.length)}
          datos={[
            { etiqueta: 'Aciertos', valor: `${aciertos} de ${turnos.length}` },
            { etiqueta: 'Mejor racha', valor: `${mejorRacha} 🔥` },
            { etiqueta: 'Pistas', valor: String(resultados.filter((r) => r.pista).length) },
          ]}
          mejorAnterior={mejorAnterior}
          recompensa={recompensa}
          falladas={falladas}
          alRepetir={() => empezar(elegidas.length ? elegidas : letras)}
        />
      </>
    )
  }

  const segundos = Math.ceil(restante / 1000)
  const fraccion = aviso ? 0 : restante / totalMs
  const puntosHastaAhora = resultados.reduce((t, r) => t + r.puntos, 0)
  // Letras de la palabra actual (para pintar las que ya se hicieron).
  const inicioPalabra = indice - (turno.posicion ?? 0)
  const palabraActual = turno.palabra ? turnos.slice(inicioPalabra, inicioPalabra + turno.palabra.length) : []

  return (
    <>
      {encabezado}
      <Confeti disparo={confeti} cantidad={90} />
      {fase === 'cuenta' && <CuentaRegresiva alTerminar={() => setFase('jugando')} />}

      <div className="mb-4">
        <Marcador puntos={puntosHastaAhora} racha={racha} progreso={`Letra ${indice + 1} de ${turnos.length}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Izquierda: la letra a hacer, el reloj y la pista ── */}
        <section ref={tarjeta} aria-labelledby="titulo-letra" className="relative flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <PuntosFlotantes flotantes={flotantes} />

          {/* Palabra con las letras ya hechas en verde / rojo y la actual resaltada */}
          {turno.palabra && (
            <p className="flex justify-center gap-1.5" aria-label={`Palabra: ${turno.palabra}`}>
              {palabraActual.map((t, i) => {
                const r = resultados[inicioPalabra + i]
                const actual = inicioPalabra + i === indice
                return (
                  <motion.span
                    key={`${inicioPalabra}-${i}`}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: actual ? -4 : 0, opacity: 1, scale: palabraLista ? [1, 1.25, 1] : 1 }}
                    transition={{ delay: palabraLista ? i * 0.08 : i * 0.05 }}
                    className={`grid size-12 place-items-center rounded-xl border-2 text-2xl font-bold ${
                      r
                        ? r.acierto
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                        : actual
                          ? 'border-marca-600 bg-marca-50 text-marca-900 shadow-md'
                          : 'border-stone-200 text-stone-400'
                    }`}
                  >
                    {t.letra.letra}
                  </motion.span>
                )
              })}
            </p>
          )}

          <h2 id="titulo-letra" className="mt-4 text-center text-stone-600">
            Haz la letra
          </h2>
          <div className="mt-2 flex justify-center">
            <RelojCircular fraccion={fraccion} segundos={segundos} tamano="size-52">
              <AnimatePresence mode="wait">
                <motion.span
                  key={indice}
                  initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  className="text-8xl font-bold text-marca-800"
                  aria-live="polite"
                >
                  {turno.letra.letra}
                </motion.span>
              </AnimatePresence>
            </RelojCircular>
          </div>
          <p className="mt-2 text-center font-bold text-stone-500 tabular-nums">{aviso ? '' : limite ? `${segundos} s` : 'El reloj arranca con la cámara'}</p>

          {/* Pista: el dibujo (la letra vale la mitad) */}
          <div className="mt-4 grid min-h-32 place-items-center rounded-2xl bg-stone-50 p-4">
            <AnimatePresence mode="wait">
              {pista ? (
                <motion.div key="pista" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} className="flex items-center gap-4">
                  <div className="size-24">
                    <ManoIlustrada forma={turno.letra.forma} etiqueta={`Pista: dibujo de la letra ${turno.letra.letra}`} />
                  </div>
                  <p className="max-w-48 text-sm text-stone-600">{turno.letra.pasos[0]}</p>
                </motion.div>
              ) : (
                <motion.p key="sin-pista" exit={{ opacity: 0 }} className="text-center text-stone-500">
                  ¿No te acuerdas? Pide una pista (la letra valdrá la mitad).
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
            <Boton variante="secundario" onClick={() => setPista(true)} disabled={pista || !!aviso}>
              <Lightbulb className="size-5" aria-hidden />
              Pista
            </Boton>
            <Boton variante="fantasma" onClick={() => resolver('saltada')} disabled={!!aviso}>
              <SkipForward className="size-5" aria-hidden />
              Saltar
            </Boton>
          </div>
        </section>

        {/* ── Derecha: la cámara y el aviso de acierto/fallo ── */}
        <section aria-label="Tu mano" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="relative">
            <CamaraManos alDetectar={alDetectar} borde={formaOk || aviso?.acierto ? 'exito' : 'neutro'} />
            <AnimatePresence>
              {aviso && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  role="status"
                  className={`absolute inset-x-4 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl p-4 text-xl font-bold text-white shadow-xl ${
                    aviso.acierto ? 'bg-emerald-600/95' : 'bg-red-700/95'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {aviso.acierto ? <Check className="size-7" aria-hidden /> : <X className="size-7" aria-hidden />}
                    {aviso.motivo === 'acierto' ? `¡Bien! +${aviso.puntos}` : aviso.motivo === 'tiempo' ? 'Se acabó el tiempo' : 'Letra saltada'}
                  </span>
                  {palabraLista && <span className="text-3xl">¡{palabraLista}! 🎉</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-4 text-lg font-bold" aria-live="polite">
            {esperando
              ? 'Baja la mano o cambia de forma para repetir la letra.'
              : turno.letra.objetivo.movimiento && formaOk
                ? `¡Buena forma! ${INSTRUCCION_MOVIMIENTO[turno.letra.objetivo.movimiento]}`
                : formaOk
                  ? '¡Así es! Mantén la posición…'
                  : 'Haz la seña frente a la cámara.'}
          </p>
        </section>
      </div>
    </>
  )
}
