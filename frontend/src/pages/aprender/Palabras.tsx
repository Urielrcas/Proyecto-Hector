/*
 * PANTALLA: PALABRAS Y FRASES (/aprender/palabras)
 * Las señas de palabras completas por tema (saludos, necesidades, emergencias), sacadas de los
 * diccionarios (lib/aprendizaje/palabras.ts). Al tocar una se abre /aprender/palabras/ID.
 * Abajo, «Ponte a prueba»: Mani lee los pasos de una seña y tú adivinas qué palabra es.
 * Se puede abrir directo en un tema: /aprender/palabras?tema=emergencias
 */

import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Hand, HandHelping, HeartHandshake, MessageCircle, Siren, Sparkles, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { Acompanante, type Animo } from '../../components/Mascota'
import { useApp } from '../../context/AppContext'
import { useProgresoPalabras } from '../../hooks/useProgresoPalabras'
import { CATEGORIAS, FUENTE_PALABRAS, opcionesPrueba, palabrasDe, type Categoria, type Palabra } from '../../lib/aprendizaje/palabras'
import { sonidos } from '../../lib/juegos/sonidos'
import { vibrar } from '../../lib/tacto'
import { tieneSena } from '../../lib/vision/senas'

const ICONOS: Record<Categoria, LucideIcon> = { saludos: MessageCircle, necesidades: HeartHandshake, emergencias: Siren }
const ORDEN: Categoria[] = ['saludos', 'necesidades', 'emergencias']

export default function Palabras() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const { vistas, practicadas } = useProgresoPalabras()
  const [params, setParams] = useSearchParams()
  const tema = (ORDEN as string[]).includes(params.get('tema') ?? '') ? (params.get('tema') as Categoria) : 'saludos'
  const palabras = palabrasDe(lengua, tema)

  return (
    <>
      <EncabezadoPagina titulo="Palabras y frases" descripcion={`Señas de palabras completas · ${lengua}`} volverA="/aprender" />

      {/* Temas */}
      <div role="tablist" aria-label="Temas" className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1 sm:inline-grid sm:min-w-[36rem]">
        {ORDEN.map((c) => {
          const Icono = ICONOS[c]
          const activo = tema === c
          const total = palabrasDe(lengua, c)
          const hechas = total.filter((p) => practicadas.includes(p.id)).length
          return (
            <button
              key={c}
              role="tab"
              aria-selected={activo}
              onClick={() => {
                vibrar('toque')
                setParams({ tema: c }, { replace: true })
              }}
              className="relative flex min-h-14 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-sm font-bold sm:flex-row sm:gap-2 sm:text-base"
            >
              {activo && <motion.span layoutId="pildora-tema" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 36 }} aria-hidden />}
              <Icono className={`relative size-5 ${activo ? 'text-marca-700' : 'text-stone-500'}`} aria-hidden />
              <span className={`relative truncate ${activo ? 'text-marca-800' : 'text-stone-600'}`}>
                <span className="sm:hidden">{CATEGORIAS[c].corto}</span>
                <span className="max-sm:hidden">{CATEGORIAS[c].titulo}</span>
              </span>
              <span className="relative text-xs font-normal text-stone-500 sm:ml-1">
                {hechas}/{total.length}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-stone-600">{CATEGORIAS[tema].descripcion}</p>

      {/* Palabras del tema */}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {palabras.map((p, i) => {
          const practicada = practicadas.includes(p.id)
          const vista = vistas.includes(p.id)
          return (
            <motion.li key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link
                to={`/aprender/palabras/${p.id}`}
                className={`group flex h-full items-center gap-4 rounded-2xl border-2 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  practicada ? 'border-marca-300' : 'border-stone-200 hover:border-marca-300'
                }`}
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${practicada ? 'bg-marca-600 text-white' : 'bg-marca-50 text-marca-700'}`}>
                  {practicada ? <Check className="size-6" strokeWidth={3} aria-hidden /> : p.dosManos ? <HandHelping className="size-6" aria-hidden /> : <Hand className="size-6" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-stone-900">{p.palabra}</span>
                  <span className="block truncate text-sm text-stone-500">
                    {p.glosa ? `${p.glosa} · ` : ''}
                    {p.dosManos ? 'Dos manos' : 'Una mano'}
                    {practicada ? ' · Practicada' : vista ? ' · Vista' : ''}
                  </span>
                </span>
                {tieneSena(p.id) && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-700" title="La cámara reconoce esta seña" aria-label="La cámara reconoce esta seña">
                    <Camera className="size-4" aria-hidden />
                  </span>
                )}
              </Link>
            </motion.li>
          )
        })}
      </ul>

      <PonteAPrueba key={lengua} lengua={lengua} />

      <p className="mt-6 text-sm text-stone-500">
        Fuente: {FUENTE_PALABRAS[lengua]}. Las palabras con <Camera className="inline size-4 align-text-bottom" aria-label="cámara" /> se reconocen con la cámara (las dos
        manos y el lugar del cuerpo); las demás se practican deletreándolas.
      </p>
    </>
  )
}

/** Juego corto: Mani lee los pasos de una seña y tú eliges qué palabra es. */
function PonteAPrueba({ lengua }: { lengua: 'LSM' | 'ASL' }) {
  const nuevaPregunta = () => {
    const todas = palabrasDe(lengua)
    const correcta = todas[Math.floor(Math.random() * todas.length)]
    return { correcta, opciones: opcionesPrueba(lengua, correcta) }
  }
  const [pregunta, setPregunta] = useState(nuevaPregunta)
  const [elegida, setElegida] = useState<Palabra | null>(null)
  const [puntos, setPuntos] = useState({ bien: 0, total: 0 })

  const elegir = (p: Palabra) => {
    if (elegida) return
    setElegida(p)
    const bien = p.id === pregunta.correcta.id
    setPuntos((x) => ({ bien: x.bien + (bien ? 1 : 0), total: x.total + 1 }))
    if (bien) {
      sonidos.acierto()
      vibrar('acierto')
    } else {
      sonidos.error()
    }
  }
  const siguiente = () => {
    setElegida(null)
    setPregunta(nuevaPregunta())
  }

  const acerto = elegida?.id === pregunta.correcta.id
  const mani: { animo: Animo; mensaje: string } = !elegida
    ? { animo: 'pensando', mensaje: '¿Qué palabra se hace así?' }
    : acerto
      ? { animo: 'fiesta', mensaje: '¡Exacto!' }
      : { animo: 'feliz', mensaje: `Casi: era «${pregunta.correcta.palabra}».` }

  return (
    <section aria-labelledby="titulo-prueba" className="mt-8 rounded-3xl border border-stone-200 bg-gradient-to-br from-marca-50 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-prueba" className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="size-5 text-marca-700" aria-hidden /> Ponte a prueba
        </h2>
        {puntos.total > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-marca-800 shadow-sm">
            {puntos.bien} de {puntos.total}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-20" />
          <AnimatePresence mode="wait">
            <motion.ol
              key={pregunta.correcta.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 space-y-2 rounded-2xl bg-white p-4 shadow-sm"
            >
              {pregunta.correcta.pasos.map((paso, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-marca-700 text-sm font-bold text-white">{i + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>

        <div>
          <ul className="grid grid-cols-2 gap-2">
            {pregunta.opciones.map((p) => {
              const esCorrecta = p.id === pregunta.correcta.id
              const estilo = !elegida
                ? 'border-stone-200 bg-white hover:border-marca-400'
                : esCorrecta
                  ? 'border-marca-500 bg-marca-50 text-marca-900'
                  : p.id === elegida.id
                    ? 'border-stone-300 bg-stone-100 text-stone-500 line-through'
                    : 'border-stone-200 bg-white text-stone-400'
              return (
                <li key={p.id}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    animate={elegida && esCorrecta ? { scale: [1, 1.06, 1] } : {}}
                    onClick={() => elegir(p)}
                    disabled={!!elegida}
                    className={`flex min-h-16 w-full items-center justify-center rounded-2xl border-2 px-3 text-center text-lg font-bold transition-colors ${estilo}`}
                  >
                    {p.palabra}
                  </motion.button>
                </li>
              )
            })}
          </ul>
          {elegida && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={siguiente} className="min-h-12 flex-1 rounded-xl bg-marca-700 px-4 font-bold text-white hover:bg-marca-800">
                Otra palabra
              </button>
              <Link
                to={`/aprender/palabras/${pregunta.correcta.id}`}
                className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-200 bg-white px-4 font-bold text-stone-700 hover:border-marca-300"
              >
                Ver «{pregunta.correcta.palabra}»
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
