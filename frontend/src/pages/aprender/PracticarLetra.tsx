/*
 * PANTALLA: PRACTICAR UNA LETRA
 * Izquierda: selector de letra, dibujo de la mano, pasos a seguir y fuente.
 * Derecha: la cámara y la evaluación en vivo.
 * alDetectar() se ejecuta en CADA CUADRO del video:
 *   1) evalúa la forma de la mano (postura.ts → fórmula lógica de la letra),
 *   2) si la letra lleva movimiento, sigue la mano (movimiento.ts),
 *   3) aplica la regla "letra lograda": f ∧ (m → d), y si se cumple marca la letra como lograda.
 * IA: al lograrla, el modelo del estudiante sube el dominio de la letra y la red neuronal
 * guarda algunas posturas reales de tu mano para aprender cómo la haces TÚ.
 * Forma personal: si te cuesta hacerla como en el dibujo (ej.: tu A con los dedos un poco distintos),
 * la IA puede RECORDAR tu forma; desde entonces cuenta como correcta (regla g ∨ (p ∧ c ∧ u)).
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     AnimatePresence → permite animar elementos cuando aparecen y desaparecen
//     motion → versiones animables de las etiquetas (motion.div, motion.li...)
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), ArrowRight (flecha →), Check (palomita ✓), PartyPopper (confeti), X (tache ✕)
import { ArrowLeft, ArrowRight, Check, PartyPopper, X } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useRef → guarda un valor o un elemento de la página SIN volver a dibujar la pantalla
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useRef, useState } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Navigate → redirige automáticamente a otra dirección
//     useNavigate → función para cambiar de pantalla desde el código
//     useParams → lee los valores variables de la dirección (por ejemplo el :id o la :letra)
import { Navigate, useNavigate, useParams } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     BotonEnlace → botón que lleva a otra pantalla (como un enlace)
import { BotonEnlace } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CamaraManos.tsx:
//     CamaraManos → recuadro de la cámara con la mano dibujada
import { CamaraManos } from '../../components/CamaraManos'
// ▸ Desde nuestro proyecto: src/components/CampoSelect.tsx:
//     CampoSelect → lista desplegable con etiqueta
import { CampoSelect } from '../../components/CampoSelect'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/components/ManoIlustrada.tsx:
//     ManoIlustrada → dibujo de la mano de una letra
import { ManoIlustrada } from '../../components/ManoIlustrada'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useProgresoAprendizaje.ts:
//     useProgresoAprendizaje → hook con las letras logradas por el usuario
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
// ▸ Desde nuestro proyecto: src/hooks/useModeloIA.ts:
//     useModeloIA → la IA del usuario (dominio por letra y muestras para la red neuronal)
import { useModeloIA } from '../../hooks/useModeloIA'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → devuelve las letras de LSM o ASL con sus pasos y forma
//     FUENTE_ASL → nombre de la fuente de ASL
//     FUENTE_LSM → nombre del diccionario de LSM (para citar la fuente)
import { alfabeto, FUENTE_ASL, FUENTE_LSM } from '../../lib/aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/lib/ia/memoria.ts:
//     compararConLetra → ¿tu mano es TU forma recordada de esta letra?
//     pareceOtraLetra → avisa si la forma que vas a guardar se parece mucho a otra letra
import { compararConLetra, pareceOtraLetra } from '../../lib/ia/memoria'
// ▸ Desde nuestro proyecto: src/components/ia/PanelFormaPersonal.tsx:
//     PanelFormaPersonal → «¿Haces esta letra a tu manera? La IA la puede recordar»
import { PanelFormaPersonal } from '../../components/ia/PanelFormaPersonal'
// ▸ Desde nuestro proyecto: src/lib/vision/movimiento.ts:
//     DetectorMovimiento → sigue la mano unos segundos y reconoce movimientos (J, Z, Ñ...)
//     INSTRUCCION_MOVIMIENTO → textos como "Ahora dibuja una Z en el aire"
import { DetectorMovimiento, INSTRUCCION_MOVIMIENTO } from '../../lib/vision/movimiento'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     DEDOS → lista de los 5 dedos
//     NOMBRE_DEDO → nombre en español de cada dedo
//     evaluar → evalúa (en postura: la seña de la mano; en proposicional: una fórmula lógica)
//     Evaluacion → tipo: resultado de evaluar una seña (correcto, dedos, consejos)
//     Punto → tipo: un punto de la mano (x, y)
import { DEDOS, NOMBRE_DEDO, evaluar, type Evaluacion, type Punto } from '../../lib/vision/postura'

/** Cuadros seguidos con la postura correcta para darla por lograda (~0.6 s). */
const CUADROS_PARA_LOGRAR = 18
/** Cuadros intentando sin lograrla (mano visible) para ofrecer recordar tu forma (~6 s). */
const CUADROS_PARA_OFRECER = 180
/** Segundos que se graba tu forma personal. */
const SEGUNDOS_GRABAR = 3

export default function PracticarLetra() {
  const { letra: parametro = '' } = useParams() // la letra de la dirección: /aprender/L → "L"
  const { lengua } = useApp()
  const navegar = useNavigate()
  const { logradas, marcarLograda } = useProgresoAprendizaje()
  const ia = useModeloIA()

  // Buscar la letra en el alfabeto de la lengua elegida, y sus vecinas (para "Letra anterior/siguiente").
  const letras = alfabeto(lengua ?? 'LSM')
  const indice = letras.findIndex((l) => l.letra === parametro.toUpperCase())
  const letra = letras[indice]
  const anterior = letras[indice - 1]
  const siguiente = letras[indice + 1]

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null) // resultado que se muestra (dedos y consejo)
  const [logradaAhora, setLogradaAhora] = useState(false) // muestra el mensaje "¡Muy bien!"
  // Seguimiento cuadro a cuadro. Es un useRef porque cambia 30 veces por segundo
  // y no debe redibujar la pantalla cada vez.
  const seguimiento = useRef({
    letra: '',
    cuadrosCorrectos: 0,
    cuadrosFallidos: 0,
    ultimaClave: '',
    lograda: false,
    detector: null as DetectorMovimiento | null,
    posturas: [] as Punto[][], // últimas posturas correctas (muestras para la red neuronal)
    intentosFallidos: 0, // cuadros con la mano visible sin lograrla
    porMemoria: false, // la última forma correcta la reconoció tu memoria personal (no las reglas)
    grabacion: null as { hasta: number; posturas: Punto[][]; cuadro: number } | null,
  })
  // Forma personal: ofrecer recordarla, grabarla y avisar.
  const [ofrecer, setOfrecer] = useState(false)
  const [grabando, setGrabando] = useState(0) // segundos que faltan (0 = no está grabando)
  const [conflicto, setConflicto] = useState<{ otra: string; posturas: Punto[][] } | null>(null)
  const [avisoForma, setAvisoForma] = useState<string | null>(null)
  const [porMemoria, setPorMemoria] = useState(false)

  // Reiniciar la práctica al cambiar de letra.
  const [letraAnterior, setLetraAnterior] = useState(parametro)
  if (letraAnterior !== parametro) {
    setLetraAnterior(parametro)
    setEvaluacion(null)
    setLogradaAhora(false)
    setOfrecer(false)
    setConflicto(null)
    setAvisoForma(null)
    setPorMemoria(false)
  }

  // Cuenta regresiva mientras se graba tu forma personal.
  useEffect(() => {
    if (!grabando) return
    const t = setTimeout(() => setGrabando((g) => Math.max(0, g - 1)), 1000)
    return () => clearTimeout(t)
  }, [grabando])

  if (!letra) return <Navigate to="/aprender" replace /> // letra inexistente → regresar a la lista
  const objetivo = letra.objetivo // lo que la cámara debe reconocer para esta letra

  // Marca la letra como lograda (guarda el progreso y muestra el mensaje de felicitación).
  const lograr = () => {
    seguimiento.current.lograda = true
    setLogradaAhora(true)
    marcarLograda(letra.letra)
    // IA: un acierto con cámara y unas cuantas posturas reales (una de cada 3 cuadros).
    ia.observar(letra.letra, true, 'camara')
    ia.agregarMuestras(letra.letra, seguimiento.current.posturas.filter((_, i) => i % 3 === 0).slice(-6))
  }

  const tieneForma = ia.memoria.personales.has(letra.letra)

  // Guarda tu forma personal (y la usa desde ya).
  const guardarForma = (posturas: Punto[][]) => {
    ia.recordarForma(letra.letra, posturas)
    setConflicto(null)
    setOfrecer(false)
    setAvisoForma(`¡Listo! La IA recordará tu forma de la ${letra.letra}. Hazla otra vez para comprobarlo.`)
  }

  // Termina la grabación: revisa que no se parezca demasiado a otra letra y la guarda.
  const terminarGrabacion = (posturas: Punto[][]) => {
    setGrabando(0)
    if (posturas.length < 4) {
      setAvisoForma('No se vio bien tu mano. Ponla frente a la cámara e inténtalo otra vez.')
      return
    }
    const otra = pareceOtraLetra(posturas, letra.letra, ia.memoria)
    if (otra) setConflicto({ otra, posturas })
    else guardarForma(posturas)
  }

  const empezarGrabacion = () => {
    setAvisoForma(null)
    setConflicto(null)
    seguimiento.current.grabacion = { hasta: Date.now() + SEGUNDOS_GRABAR * 1000, posturas: [], cuadro: 0 }
    setGrabando(SEGUNDOS_GRABAR)
  }

  // Se ejecuta en CADA CUADRO del video (unas 30 veces por segundo) con los 21 puntos de la mano
  // (o null si no hay mano).
  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    const s = seguimiento.current
    // Si cambió la letra, empezar de cero (y preparar el detector si la letra lleva movimiento).
    if (s.letra !== letra.letra) {
      Object.assign(s, {
        letra: letra.letra,
        cuadrosCorrectos: 0,
        cuadrosFallidos: 0,
        ultimaClave: '',
        lograda: false,
        detector: objetivo.movimiento ? new DetectorMovimiento(objetivo.movimiento) : null,
        posturas: [],
        intentosFallidos: 0,
        porMemoria: false,
        grabacion: null,
      })
    }

    // 0) Grabando tu forma personal: solo se guardan posturas (una de cada 3 cuadros).
    const grab = s.grabacion
    if (grab) {
      if (puntos && grab.cuadro++ % 3 === 0) grab.posturas.push(puntos)
      if (Date.now() >= grab.hasta) {
        s.grabacion = null
        terminarGrabacion(grab.posturas)
      }
      return
    }

    // 1) Evaluar la forma de la mano: la fórmula lógica de la letra (postura.ts)…
    const r = puntos ? evaluar(puntos, objetivo) : null
    // …y, si la IA recuerda tu forma de esta letra, compararla también (memoria.ts).
    const personal = puntos && tieneForma ? compararConLetra(puntos, letra.letra, ia.memoria) : null
    const g = !!r?.correcto
    // Regla «forma aceptada»: g ∨ (p ∧ c ∧ u)
    const correcto = !!puntos && cumple('formaAceptada', { g, p: !!personal?.p, c: !!personal?.c, u: !!personal?.u })
    const conMemoria = correcto && !g

    // ¿Lleva rato intentando sin lograrla? → ofrecer recordar su forma.
    if (puntos && !correcto && !s.lograda) {
      if (++s.intentosFallidos === CUADROS_PARA_OFRECER) setOfrecer(true)
    } else if (correcto) s.intentosFallidos = 0

    // 2) Contar cuántos cuadros seguidos lleva correcta (para las letras sin movimiento).
    s.cuadrosCorrectos = correcto ? s.cuadrosCorrectos + 1 : 0
    if (correcto && puntos) s.posturas = [...s.posturas, puntos].slice(-20)
    if (s.detector) {
      // Letra con movimiento: se sigue la mano mientras mantiene la forma correcta.
      if (correcto && puntos) {
        s.cuadrosFallidos = 0
        s.detector.agregar(puntos, tiempo)
      } else if (++s.cuadrosFallidos > 10) {
        s.detector.reiniciar() // perdió la forma: empezar el movimiento de nuevo
      }
    }

    // 3) Regla «letra lograda»: f ∧ (m → d)
    const f = s.detector ? correcto : s.cuadrosCorrectos >= CUADROS_PARA_LOGRAR // forma correcta (sostenida)
    const m = s.detector !== null // ¿la letra lleva movimiento?
    const d = s.detector?.detectado() ?? false // ¿se detectó el movimiento?
    if (!s.lograda && cumple('letraLograda', { f, m, d })) lograr()

    // 4) Actualizar la pantalla solo cuando cambia el resultado, no en cada cuadro.
    const clave = r ? `${r.correcto}|${r.consejos.join()}|${conMemoria}` : 'sin-mano'
    if (clave !== s.ultimaClave) {
      s.ultimaClave = clave
      setEvaluacion(r)
      if (conMemoria !== s.porMemoria) {
        s.porMemoria = conMemoria
        setPorMemoria(conMemoria)
      }
    }
  }

  // Color de cada dedo en el dibujo de comparación: verde si está bien, rojo si no.
  const tonos = evaluacion ? Object.fromEntries(DEDOS.map((d) => [d, evaluacion.dedosOk[d] ? 'ok' : 'mal'])) : undefined

  return (
    <>
      <EncabezadoPagina titulo={`Letra ${letra.letra}`} descripcion={`Alfabeto dactilológico · ${lengua}`} volverA="/aprender" />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Columna izquierda: la referencia (selector, dibujo, pasos, fuente y botones anterior/siguiente) ── */}
        <section aria-labelledby="titulo-referencia" className="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <CampoSelect
            etiqueta="Selecciona una letra"
            opciones={letras.map((l) => ({ valor: l.letra, texto: `${l.letra}${logradas.includes(l.letra) ? '  ✓' : ''}` }))}
            value={letra.letra}
            onChange={(e) => navegar(`/aprender/${encodeURIComponent(e.target.value)}`)}
          />

          <h2 id="titulo-referencia" className="mt-6 font-bold">
            Mira la seña correcta
          </h2>
          <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-marca-50/60 p-4 sm:gap-6">
            <div className="grid size-28 place-items-center sm:size-36">
              <ManoIlustrada forma={letra.forma} etiqueta={`Dibujo de la letra ${letra.letra}`} />
            </div>
            <ol className="space-y-2">
              {letra.pasos.map((paso, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-marca-700 text-sm font-bold text-white">{i + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-3 text-sm text-stone-600">
            El dibujo es tu mano derecha como la ve quien te mira:{' '}
            <strong>
              {letra.forma.palma === 'dorso'
                ? 'se ve el dorso de la mano'
                : letra.forma.palma === 'lado'
                  ? 'la mano va de lado'
                  : 'la palma va al frente'}
            </strong>
            .
            {letra.movimiento && (
              <>
                {' '}
                La <strong className="text-amber-700">flecha</strong> indica el movimiento.
              </>
            )}
          </p>
          <p className="mt-3 text-sm text-stone-500">Fuente: {lengua === 'ASL' ? FUENTE_ASL : FUENTE_LSM}.</p>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            {anterior ? (
              <BotonEnlace to={`/aprender/${encodeURIComponent(anterior.letra)}`} variante="secundario">
                <ArrowLeft className="size-5" aria-hidden />
                Letra {anterior.letra}
              </BotonEnlace>
            ) : (
              <span />
            )}
            {siguiente && (
              <BotonEnlace to={`/aprender/${encodeURIComponent(siguiente.letra)}`} variante="secundario">
                Letra {siguiente.letra}
                <ArrowRight className="size-5" aria-hidden />
              </BotonEnlace>
            )}
          </div>
        </section>

        {/* ── Columna derecha: el intento del usuario (cámara, estado de cada dedo, consejo y felicitación) ── */}
        <section aria-labelledby="titulo-intento" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="titulo-intento" className="font-bold">
            Tu intento
          </h2>
          <div className="mt-3">
            <CamaraManos alDetectar={alDetectar} borde={evaluacion?.correcto || porMemoria || grabando ? 'exito' : 'neutro'} />
          </div>

          <div className="mt-4" aria-live="polite">
              {/* Etiquetas de cada dedo: verde con ✓ si está bien, roja con ✗ si hay que corregirlo */}
              <ul className="flex flex-wrap gap-2" aria-label="Estado de cada dedo">
                {DEDOS.map((d) => {
                  const ok = evaluacion?.dedosOk[d]
                  return (
                    <li
                      key={d}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold capitalize ${
                        !evaluacion ? 'bg-stone-100 text-stone-500' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {evaluacion && (ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />)}
                      {NOMBRE_DEDO[d]}
                      <span className="sr-only">{!evaluacion ? '' : ok ? ': correcto' : ': corregir'}</span>
                    </li>
                  )
                })}
              </ul>

              {/* Dibujo coloreado según tus dedos + el consejo principal */}
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-stone-50 p-4">
                <div className="size-16 shrink-0">
                  <ManoIlustrada forma={letra.forma} tonos={tonos} etiqueta="Comparación de tus dedos con la seña" />
                </div>
                <p className="text-lg font-bold">
                  {grabando
                    ? `Haz tu ${letra.letra} como siempre la haces… ${grabando}`
                    : !evaluacion
                    ? 'Haz la seña frente a la cámara.'
                    : porMemoria
                      ? `¡Reconocí tu forma de la ${letra.letra}! Mantén la posición…`
                    : !evaluacion.correcto
                      ? evaluacion.consejos[0]
                      : objetivo.movimiento
                        ? `¡Buena forma! ${INSTRUCCION_MOVIMIENTO[objetivo.movimiento]}`
                        : '¡Así es! Mantén la posición…'}
                </p>
              </div>
            </div>

          {/* Mensaje "¡Muy bien! Lograste la letra X" con botón a la siguiente */}
          <AnimatePresence>
            {logradaAhora && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-900"
              >
                <PartyPopper className="size-7 shrink-0" aria-hidden />
                <p className="flex-1 font-bold">¡Muy bien! Lograste la letra {letra.letra}.</p>
                {siguiente && (
                  <BotonEnlace to={`/aprender/${encodeURIComponent(siguiente.letra)}`}>
                    Siguiente: {siguiente.letra}
                    <ArrowRight className="size-5" aria-hidden />
                  </BotonEnlace>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <PanelFormaPersonal
            letra={letra.letra}
            tieneForma={tieneForma}
            ofrecer={ofrecer && !logradaAhora}
            grabando={grabando}
            conflicto={conflicto?.otra ?? null}
            aviso={avisoForma}
            alGrabar={empezarGrabacion}
            alConfirmar={() => conflicto && guardarForma(conflicto.posturas)}
            alCancelar={() => setConflicto(null)}
            alOlvidar={() => {
              ia.olvidarForma(letra.letra)
              setAvisoForma(`La IA olvidó tu forma de la ${letra.letra}: ahora se pide como en el dibujo.`)
            }}
          />

          <p className="mt-4 text-sm text-stone-500">
            Evaluación aproximada según la posición de tus dedos{letra.movimiento ? ' y el movimiento de tu mano' : ''}. Más adelante
            la hará un modelo entrenado.
          </p>
        </section>
      </div>
    </>
  )
}
