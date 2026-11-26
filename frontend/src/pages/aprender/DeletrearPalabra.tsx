/*
 * PÁGINA: DELETREAR UNA PALABRA (por ejemplo, TU NOMBRE) LETRA POR LETRA
 * Ruta: /aprender/deletrear?palabra=SOFIA  (sin palabra, propone tu primer nombre)
 * Llega aquí desde Aprendizaje o cuando le dices a Mani «quiero aprender a deletrear mi nombre».
 *
 *   1. Arriba se ve la palabra en fichas: las hechas en verde, la que toca resaltada.
 *   2. A la izquierda, el dibujo y los pasos de la letra que toca.
 *   3. A la derecha, la cámara. En cada cuadro se evalúa la forma de tu mano contra ESA letra
 *      (la misma evaluación por dedos de «Practicar letra», lib/vision/postura.ts), y si lleva
 *      movimiento (J, K, Ñ, Q, X, Z) también se sigue el movimiento (lib/vision/movimiento.ts).
 *      Si la IA recuerda tu forma personal de la letra, también cuenta.
 *   4. Si te atoras unos segundos, Mani te dice qué corregir (arriba de la cámara, sin taparla).
 *   5. Al terminar: confeti y la opción de repetir o deletrear otra palabra.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, SkipForward, SpellCheck } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boton } from '../../components/Boton'
import { CamaraManos } from '../../components/CamaraManos'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { Confeti } from '../../components/juegos/Confeti'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { Acompanante, type Animo } from '../../components/Mascota'
import { useApp } from '../../context/AppContext'
import { useModeloIA } from '../../hooks/useModeloIA'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { limpiarPalabra, pasosDeletreo, primerNombre } from '../../lib/aprendizaje/deletreoGuiado'
import { compararConLetra } from '../../lib/ia/memoria'
import { sonidos } from '../../lib/juegos/sonidos'
import { cumple } from '../../lib/logica/reglas'
import { DetectorMovimiento, INSTRUCCION_MOVIMIENTO } from '../../lib/vision/movimiento'
import { evaluar, type Punto } from '../../lib/vision/postura'

/** Cuadros seguidos con la forma correcta para darla por buena (≈ 0.4 s). */
const CUADROS_PARA_ACERTAR = 12
/** Después de cuánto tiempo sin lograr la letra Mani empieza a dar pistas. */
const MS_PARA_AYUDAR = 2500
/** Pausa con el «¡Bien!» antes de pasar a la siguiente letra. */
const MS_SIGUIENTE = 700

export default function DeletrearPalabra() {
  const { usuario, lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const letras = useMemo(() => alfabeto(lengua), [lengua])
  const ia = useModeloIA()
  const [params, setParams] = useSearchParams()
  const palabra = limpiarPalabra(params.get('palabra') ?? '')
  const pasos = useMemo(() => pasosDeletreo(palabra, letras), [palabra, letras])

  const [escrito, setEscrito] = useState(primerNombre(usuario?.nombre) ?? '')
  const [actual, setActual] = useState(0)
  const [hechas, setHechas] = useState<boolean[]>([])
  const [formaOk, setFormaOk] = useState(false)
  const [mani, setMani] = useState<{ texto: string; animo: Animo } | null>(null)
  const [confeti, setConfeti] = useState(0)

  // Lo que se sigue cuadro a cuadro (sin redibujar 30 veces por segundo).
  const s = useRef({
    paso: -1,
    cuadrosCorrectos: 0,
    detector: null as DetectorMovimiento | null,
    esperarCambio: false,
    cuadrosSinForma: 0,
    desde: 0,
    resuelto: false,
    ultimoMensaje: '',
  })

  const terminado = pasos.length > 0 && actual >= pasos.length
  const paso = pasos[actual]

  const decir = (texto: string, animo: Animo) => {
    if (s.current.ultimoMensaje === texto) return
    s.current.ultimoMensaje = texto
    setMani({ texto, animo })
  }

  const empezar = (texto: string) => {
    const limpia = limpiarPalabra(texto)
    if (!limpia) return
    setParams({ palabra: limpia })
    reiniciar()
  }

  function reiniciar() {
    setActual(0)
    setHechas([])
    setFormaOk(false)
    setMani(null)
    s.current.paso = -1
    s.current.ultimoMensaje = ''
  }

  const avanzar = (logrado: boolean) => {
    setHechas((h) => {
      const n = [...h]
      n[actual] = logrado
      return n
    })
    const siguiente = actual + 1
    setTimeout(() => {
      setActual(siguiente)
      setFormaOk(false)
      if (siguiente >= pasos.length) {
        setConfeti((c) => c + 1)
        sonidos.brillo()
        decir(`¡Ya sabes deletrear ${palabra}! 🎉`, 'fiesta')
      }
    }, logrado ? MS_SIGUIENTE : 0)
  }

  // Se ejecuta en CADA CUADRO de la cámara con los 21 puntos de la mano (o null si no hay mano).
  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    if (!paso || terminado) return
    const st = s.current
    const objetivo = paso.letra.objetivo

    // Letra nueva: empezar de cero (si es igual a la anterior, como la N de ANNA, esperar a que la mano cambie).
    if (st.paso !== actual) {
      const anterior = pasos[actual - 1]?.letra.letra
      Object.assign(st, {
        paso: actual,
        cuadrosCorrectos: 0,
        detector: objetivo.movimiento ? new DetectorMovimiento(objetivo.movimiento) : null,
        esperarCambio: anterior === paso.letra.letra,
        cuadrosSinForma: 0,
        desde: tiempo,
        resuelto: false,
      })
      decir(
        st.esperarCambio ? `Otra ${paso.letra.letra}: baja la mano o cambia de forma y vuelve a hacerla.` : `Ahora la ${paso.letra.letra}.`,
        'atento',
      )
      return
    }
    if (st.resuelto) return

    // 1) Forma de la mano (y tu forma personal, si la IA la recuerda).
    const r = puntos ? evaluar(puntos, objetivo) : null
    const personal = puntos && ia.memoria.personales.has(paso.letra.letra) ? compararConLetra(puntos, paso.letra.letra, ia.memoria) : null
    const correcto = !!puntos && cumple('formaAceptada', { g: !!r?.correcto, p: !!personal?.p, c: !!personal?.c, u: !!personal?.u })

    if (st.esperarCambio) {
      st.cuadrosSinForma = correcto ? 0 : st.cuadrosSinForma + 1
      if (st.cuadrosSinForma >= 5) {
        st.esperarCambio = false
        st.desde = tiempo
        decir(`Ahora sí, haz la ${paso.letra.letra}.`, 'atento')
      }
      return
    }

    st.cuadrosCorrectos = correcto ? st.cuadrosCorrectos + 1 : 0
    if (correcto !== formaOk) setFormaOk(correcto)

    // 2) Movimiento (solo letras como J, Z, Ñ…): se guarda mientras la forma esté bien.
    if (st.detector && puntos) {
      if (correcto) st.detector.agregar(puntos, tiempo)
      else st.detector.reiniciar()
    }

    // 3) ¿Ya está? Forma sostenida y, si lleva movimiento, el movimiento hecho.
    const f = st.detector ? correcto : st.cuadrosCorrectos >= CUADROS_PARA_ACERTAR
    const d = st.detector?.detectado() ?? false
    if (f && (!st.detector || d)) {
      st.resuelto = true
      sonidos.acierto(actual)
      decir(actual + 1 < pasos.length ? `¡Bien, la ${paso.letra.letra}! Sigue la ${pasos[actual + 1].letra.letra}.` : `¡Bien, la ${paso.letra.letra}!`, 'feliz')
      avanzar(true)
      return
    }

    // 4) Pistas de Mani si te atoras.
    if (correcto && st.detector && objetivo.movimiento) decir(`¡La forma está bien! Ahora el movimiento: ${INSTRUCCION_MOVIMIENTO[objetivo.movimiento].toLowerCase()}`, 'atento')
    else if (tiempo - st.desde > MS_PARA_AYUDAR) {
      if (!puntos) decir('No veo tu mano: ponla frente a la cámara.', 'pensando')
      else if (r?.consejos[0]) decir(`Para la ${paso.letra.letra}: ${r.consejos[0].charAt(0).toLowerCase()}${r.consejos[0].slice(1)}`, 'pensando')
    }
  }

  // ── Sin palabra: elegir qué deletrear ──
  if (!pasos.length) {
    return (
      <>
        <EncabezadoPagina titulo="Deletrea una palabra" descripcion="Aprende a deletrear tu nombre (o cualquier palabra) letra por letra." volverA="/aprender" />
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <Acompanante animo="hola" mensaje={palabra ? 'Esa palabra no tiene letras que pueda enseñarte. Prueba con otra.' : '¿Qué quieres aprender a deletrear? Te enseño letra por letra.'} tamano="size-20" />
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              empezar(escrito)
            }}
          >
            <label className="flex min-w-56 flex-1 flex-col text-sm font-bold">
              Palabra o nombre
              <input
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                maxLength={40}
                placeholder="Por ejemplo: Sofía"
                className="mt-1 min-h-12 rounded-xl border-2 border-stone-300 px-3 text-lg font-normal"
              />
            </label>
            <Boton type="submit" disabled={!limpiarPalabra(escrito)}>
              <SpellCheck className="size-5" aria-hidden /> Empezar
            </Boton>
          </form>
        </section>
      </>
    )
  }

  return (
    <>
      <EncabezadoPagina titulo={`Deletrea «${palabra}»`} descripcion="Haz cada letra frente a la cámara. Mani te ayuda si te atoras." volverA="/aprender" />
      <Confeti disparo={confeti} />

      {/* La palabra en fichas */}
      <ol className="mb-5 flex flex-wrap gap-2" aria-label={`Letras de ${palabra}`}>
        {pasos.map((p, i) => {
          const estado = hechas[i] === true ? 'hecha' : hechas[i] === false ? 'saltada' : i === actual ? 'actual' : 'pendiente'
          return (
            <li
              key={p.indice}
              aria-current={estado === 'actual' ? 'step' : undefined}
              className={`grid size-12 place-items-center rounded-xl border-2 text-xl font-bold transition-colors sm:size-14 sm:text-2xl ${
                estado === 'hecha'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : estado === 'saltada'
                    ? 'border-stone-300 bg-stone-100 text-stone-400'
                    : estado === 'actual'
                      ? 'border-marca-700 bg-marca-50 text-marca-900 ring-4 ring-marca-200'
                      : 'border-stone-200 bg-white text-stone-500'
              }`}
            >
              {p.letra.letra}
            </li>
          )
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Izquierda: la letra que toca */}
        <section aria-labelledby="titulo-letra" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          {terminado ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Check className="size-14 rounded-full bg-emerald-100 p-3 text-emerald-700" aria-hidden />
              <h2 id="titulo-letra" className="text-2xl font-bold">
                ¡Deletreaste {palabra}!
              </h2>
              <p className="text-stone-600">
                {hechas.filter((h) => h).length} de {pasos.length} letras logradas
                {hechas.some((h) => h === false) ? ' (algunas las saltaste: puedes repetir para practicarlas).' : '.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Boton onClick={reiniciar}>
                  <RotateCcw className="size-5" aria-hidden /> Otra vez
                </Boton>
                <Boton variante="secundario" onClick={() => (setParams({}), reiniciar())}>
                  Otra palabra
                </Boton>
              </div>
            </div>
          ) : (
            paso && (
              <>
                <h2 id="titulo-letra" className="font-bold">
                  Letra {actual + 1} de {pasos.length}: <span className="text-2xl text-marca-800">{paso.letra.letra}</span>
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-5 rounded-2xl bg-marca-50/60 p-4">
                  <div className="w-32 shrink-0">
                    <ManoIlustrada forma={paso.letra.forma} etiqueta={`Seña de la letra ${paso.letra.letra}`} />
                  </div>
                  <ol className="min-w-48 flex-1 list-decimal space-y-1 pl-5 text-stone-800">
                    {paso.letra.pasos.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ol>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Boton variante="secundario" onClick={() => (sonidos.error(), avanzar(false))}>
                    <SkipForward className="size-5" aria-hidden /> Saltar esta letra
                  </Boton>
                  <Boton variante="secundario" onClick={reiniciar}>
                    <RotateCcw className="size-5" aria-hidden /> Empezar de nuevo
                  </Boton>
                </div>
              </>
            )
          )}
        </section>

        {/* Derecha: Mani arriba y la cámara */}
        <section aria-label="Tu intento" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="min-h-24">
            <AnimatePresence mode="wait">
              {mani && (
                <motion.div key="mani" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Acompanante animo={mani.animo} mensaje={mani.texto} tamano="size-16" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <CamaraManos alDetectar={alDetectar} borde={formaOk ? 'exito' : 'neutro'} />
        </section>
      </div>
    </>
  )
}
