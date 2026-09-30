import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, PartyPopper, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BotonEnlace } from '../../components/Boton'
import { CamaraManos } from '../../components/CamaraManos'
import { CampoSelect } from '../../components/CampoSelect'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { useApp } from '../../context/AppContext'
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
import { alfabeto, FUENTE_ASL, FUENTE_LSM } from '../../lib/aprendizaje/alfabeto'
import { cumple } from '../../lib/logica/reglas'
import { DetectorMovimiento, INSTRUCCION_MOVIMIENTO } from '../../lib/vision/movimiento'
import { DEDOS, NOMBRE_DEDO, evaluar, type Evaluacion, type Punto } from '../../lib/vision/postura'

/** Cuadros seguidos con la postura correcta para darla por lograda (~0.6 s). */
const CUADROS_PARA_LOGRAR = 18

export default function PracticarLetra() {
  const { letra: parametro = '' } = useParams()
  const { lengua } = useApp()
  const navegar = useNavigate()
  const { logradas, marcarLograda } = useProgresoAprendizaje()

  const letras = alfabeto(lengua ?? 'LSM')
  const indice = letras.findIndex((l) => l.letra === parametro.toUpperCase())
  const letra = letras[indice]
  const anterior = letras[indice - 1]
  const siguiente = letras[indice + 1]

  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [logradaAhora, setLogradaAhora] = useState(false)
  // Seguimiento cuadro a cuadro (no provoca renders).
  const seguimiento = useRef({
    letra: '',
    cuadrosCorrectos: 0,
    cuadrosFallidos: 0,
    ultimaClave: '',
    lograda: false,
    detector: null as DetectorMovimiento | null,
  })

  // Reiniciar la práctica al cambiar de letra.
  const [letraAnterior, setLetraAnterior] = useState(parametro)
  if (letraAnterior !== parametro) {
    setLetraAnterior(parametro)
    setEvaluacion(null)
    setLogradaAhora(false)
  }

  if (!letra) return <Navigate to="/aprender" replace />
  const objetivo = letra.objetivo

  const lograr = () => {
    seguimiento.current.lograda = true
    setLogradaAhora(true)
    marcarLograda(letra.letra)
  }

  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    const s = seguimiento.current
    if (s.letra !== letra.letra) {
      Object.assign(s, {
        letra: letra.letra,
        cuadrosCorrectos: 0,
        cuadrosFallidos: 0,
        ultimaClave: '',
        lograda: false,
        detector: objetivo.movimiento ? new DetectorMovimiento(objetivo.movimiento) : null,
      })
    }

    const r = puntos ? evaluar(puntos, objetivo) : null

    s.cuadrosCorrectos = r?.correcto ? s.cuadrosCorrectos + 1 : 0
    if (s.detector) {
      // Letra con movimiento: se sigue la mano mientras mantiene la forma correcta.
      if (r?.correcto && puntos) {
        s.cuadrosFallidos = 0
        s.detector.agregar(puntos, tiempo)
      } else if (++s.cuadrosFallidos > 10) {
        s.detector.reiniciar() // perdió la forma: empezar el movimiento de nuevo
      }
    }

    // Regla «letra lograda»: f ∧ (m → d)
    const f = s.detector ? !!r?.correcto : s.cuadrosCorrectos >= CUADROS_PARA_LOGRAR
    const m = s.detector !== null
    const d = s.detector?.detectado() ?? false
    if (!s.lograda && cumple('letraLograda', { f, m, d })) lograr()
    // Actualizar la pantalla solo cuando cambia el resultado, no en cada cuadro.
    const clave = r ? `${r.correcto}|${r.consejos.join()}` : 'sin-mano'
    if (clave !== s.ultimaClave) {
      s.ultimaClave = clave
      setEvaluacion(r)
    }
  }

  const tonos = evaluacion ? Object.fromEntries(DEDOS.map((d) => [d, evaluacion.dedosOk[d] ? 'ok' : 'mal'])) : undefined

  return (
    <>
      <EncabezadoPagina titulo={`Letra ${letra.letra}`} descripcion={`Alfabeto dactilológico · ${lengua}`} volverA="/aprender" />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Referencia */}
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
            En el dibujo, los dedos <strong className="text-marca-700">verde oscuro</strong> van estirados, los{' '}
            <strong className="text-marca-500">verde claro</strong> curvos y los grises, doblados.
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

        {/* Intento del usuario */}
        <section aria-labelledby="titulo-intento" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="titulo-intento" className="font-bold">
            Tu intento
          </h2>
          <div className="mt-3">
            <CamaraManos alDetectar={alDetectar} borde={evaluacion?.correcto ? 'exito' : 'neutro'} />
          </div>

          <div className="mt-4" aria-live="polite">
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

              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-stone-50 p-4">
                <div className="size-16 shrink-0">
                  <ManoIlustrada forma={letra.forma} tonos={tonos} etiqueta="Comparación de tus dedos con la seña" />
                </div>
                <p className="text-lg font-bold">
                  {!evaluacion
                    ? 'Haz la seña frente a la cámara.'
                    : !evaluacion.correcto
                      ? evaluacion.consejos[0]
                      : objetivo.movimiento
                        ? `¡Buena forma! ${INSTRUCCION_MOVIMIENTO[objetivo.movimiento]}`
                        : '¡Así es! Mantén la posición…'}
                </p>
              </div>
            </div>

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

          <p className="mt-4 text-sm text-stone-500">
            Evaluación aproximada según la posición de tus dedos{letra.movimiento ? ' y el movimiento de tu mano' : ''}. Más adelante
            la hará un modelo entrenado.
          </p>
        </section>
      </div>
    </>
  )
}
