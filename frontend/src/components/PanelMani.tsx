/*
 * COMPONENTE: LA PLÁTICA CON MANI (se abre desde el botón flotante, AsistenteMani.tsx)
 * Escribes o dices algo («pon la app en azul», «¿cómo se hace la Ñ?») y Mani:
 *   1. lo entiende (lib/asistente/entender.ts),
 *   2. decide qué contestar (lib/asistente/responder.ts),
 *   3. lo hace: cambia la configuración o la lengua, te lleva a otra pantalla, te enseña una letra...
 * Cada cambio se puede deshacer. Si le hablaste con el micrófono, también te contesta en voz alta.
 * Se carga aparte (lazy) para no pesar en las pantallas mientras no lo abras.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Mic, MicOff, RotateCcw, SendHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { useModeloIA } from '../hooks/useModeloIA'
import { useReconocimientoVoz } from '../hooks/useReconocimientoVoz'
import { entender } from '../lib/asistente/entender'
import { responder, sugerenciasIniciales, valoresAnteriores, type Respuesta } from '../lib/asistente/responder'
import type { Configuracion } from '../lib/configuracion'
import { vibrar } from '../lib/tacto'
import type { Lengua } from '../lib/tipos'
import { hablar, hayVoz } from '../lib/voz'
import { ManoIlustrada } from './ManoIlustrada'
import { Mascota, NOMBRE_MASCOTA } from './Mascota'

interface Mensaje {
  id: number
  de: 'tu' | 'mani'
  texto: string
  respuesta?: Respuesta
  /** Este mensaje hizo un cambio que se puede deshacer. */
  conCambio?: boolean
}

/** Lo necesario para regresar la app a como estaba antes de un cambio de Mani. */
interface CambioHecho {
  idMensaje: number
  config?: Partial<Configuracion>
  lengua?: Lengua
}

const esPantallaGrande = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches

export default function PanelMani({ alCerrar }: { alCerrar: () => void }) {
  const navegar = useNavigate()
  const { lengua: lenguaElegida, elegirLengua } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const { config, cambiar } = useConfiguracion()
  const ia = useModeloIA()

  const [mensajes, setMensajes] = useState<Mensaje[]>(() => [
    {
      id: 0,
      de: 'mani',
      texto: `¡Hola! Soy ${NOMBRE_MASCOTA}. Pregúntame algo o pídeme que cambie algo de la app.`,
      respuesta: { texto: '', animo: 'hola', sugerencias: sugerenciasIniciales(lengua) },
    },
  ])
  const [escrito, setEscrito] = useState('')
  const [cambios, setCambios] = useState<CambioHecho[]>([])
  const siguienteId = useRef(1)
  const lista = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)

  // Cerrar si la pantalla es chica (el panel tapa la pantalla a la que vamos).
  const alIrAOtraPantalla = () => {
    if (!esPantallaGrande()) alCerrar()
  }

  const enviar = (texto: string, porVoz = false) => {
    const frase = texto.trim()
    if (!frase) return
    const r = responder(entender(frase), { config, lengua, letras: ia.letras, recomendaciones: ia.recomendaciones, puedeDeshacer: cambios.length > 0 })
    const idTu = siguienteId.current++
    const idMani = siguienteId.current++

    // Aplicar lo que Mani decidió hacer.
    let conCambio = false
    if (r.cambios) {
      setCambios((c) => [...c, { idMensaje: idMani, config: valoresAnteriores(config, r.cambios!) }])
      cambiar(r.cambios)
      conCambio = true
    }
    if (r.lengua) {
      setCambios((c) => [...c, { idMensaje: idMani, lengua }])
      elegirLengua(r.lengua)
      conCambio = true
    }
    if (r.deshacer) deshacerUltimo()
    if (conCambio) vibrar('logro')
    else vibrar('toque')
    if (porVoz && hayVoz()) hablar(r.texto, 'es-MX')

    setMensajes((m) => [...m, { id: idTu, de: 'tu', texto: frase }, { id: idMani, de: 'mani', texto: r.texto, respuesta: r, conCambio }])
    setEscrito('')

    if (r.irA) {
      const destino = r.irA.ruta
      // Un momento para que se lea «¡Vamos a…!» antes de cambiar de pantalla.
      setTimeout(() => {
        navegar(destino)
        alIrAOtraPantalla()
      }, 450)
    }
  }

  function deshacerUltimo() {
    const ultimo = cambios.at(-1)
    if (!ultimo) return
    if (ultimo.config) cambiar(ultimo.config)
    if (ultimo.lengua) elegirLengua(ultimo.lengua)
    setCambios((c) => c.slice(0, -1))
  }

  const deshacerDesdeBoton = () => {
    deshacerUltimo()
    vibrar('toque')
    setMensajes((m) => [...m, { id: siguienteId.current++, de: 'mani', texto: 'Listo, lo dejé como estaba.', respuesta: { texto: '', animo: 'feliz' } }])
  }

  const voz = useReconocimientoVoz('es-MX', (t) => enviar(t, true))

  // Bajar hasta el último mensaje.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes.length])

  // Enfocar el campo al abrir y cerrar con Escape.
  useEffect(() => {
    campo.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    enviar(escrito)
  }

  const ultimaMani = [...mensajes].reverse().find((m) => m.de === 'mani')
  const idUltimoCambio = cambios.at(-1)?.idMensaje

  return (
    <motion.section
      role="dialog"
      aria-label={`Platicar con ${NOMBRE_MASCOTA}`}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{ originX: 1, originY: 1 }}
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex max-h-[min(38rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-marca-900/20 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[26rem]"
    >
      {/* Encabezado con Mani */}
      <header className="flex items-center gap-3 bg-gradient-to-br from-marca-50 to-white px-4 py-3">
        <Mascota animo={ultimaMani?.respuesta?.animo ?? 'hola'} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-stone-900">{NOMBRE_MASCOTA}</p>
          <p className="text-sm text-stone-600">Tu asistente · funciona sin internet</p>
        </div>
        <button onClick={alCerrar} className="grid size-10 place-items-center rounded-full text-stone-600 hover:bg-stone-100" aria-label="Cerrar">
          <X className="size-5" />
        </button>
      </header>

      {/* Mensajes */}
      <div ref={lista} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {mensajes.map((m) =>
          m.de === 'tu' ? (
            <motion.p
              key={m.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-marca-700 px-3.5 py-2 text-white"
            >
              {m.texto}
            </motion.p>
          ) : (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} className="max-w-[92%]">
              <div className="rounded-2xl rounded-bl-md bg-stone-100 px-3.5 py-2.5 text-stone-900">
                <p>{m.texto}</p>
                {m.respuesta && <Detalles r={m.respuesta} alIr={alIrAOtraPantalla} />}
              </div>
              {m.conCambio && m.id === idUltimoCambio && (
                <button onClick={deshacerDesdeBoton} className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold text-marca-800 hover:bg-marca-50">
                  <RotateCcw className="size-4" aria-hidden /> Deshacer
                </button>
              )}
              {m.id === ultimaMani?.id && m.respuesta?.sugerencias && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.respuesta.sugerencias.map((s) => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="rounded-full border-2 border-marca-200 bg-white px-3 py-1 text-sm font-bold text-marca-800 transition-colors hover:border-marca-400 hover:bg-marca-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ),
        )}
      </div>

      {/* Lo que va entendiendo el micrófono */}
      <AnimatePresence>
        {voz.escuchando && (
          <motion.p initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-marca-50 px-4 text-sm text-marca-900">
            <span className="block py-2">🎙️ {voz.parcial || 'Te escucho…'}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Escribir o hablar */}
      <form onSubmit={alEnviar} className="flex items-center gap-2 border-t border-stone-200 p-3">
        <input
          ref={campo}
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder="Escribe o pídele algo a Mani…"
          aria-label={`Mensaje para ${NOMBRE_MASCOTA}`}
          className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-stone-200 bg-white px-3 text-base focus:border-marca-500 focus:outline-none"
        />
        {voz.soportado && (
          <button
            type="button"
            onClick={voz.escuchando ? voz.detener : voz.iniciar}
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${voz.escuchando ? 'bg-marca-700 text-white' : 'border-2 border-stone-200 text-stone-700 hover:border-marca-300'}`}
            aria-label={voz.escuchando ? 'Dejar de escuchar' : 'Hablarle a Mani'}
            title={voz.escuchando ? 'Dejar de escuchar' : 'Hablarle a Mani'}
          >
            {voz.escuchando ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
        <button
          type="submit"
          disabled={!escrito.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-700 text-white hover:bg-marca-800 disabled:opacity-40"
          aria-label="Enviar"
        >
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </motion.section>
  )
}

/** Lo que va debajo del texto de Mani: una letra, recomendaciones, preguntas de Ayuda o un enlace. */
function Detalles({ r, alIr }: { r: Respuesta; alIr: () => void }) {
  const enlace = (ruta: string, titulo: string) => (
    <Link to={ruta} onClick={alIr} className="mt-2 inline-flex items-center gap-1 font-bold text-marca-800 hover:underline">
      {titulo} <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
  return (
    <>
      {r.letra && (
        <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl bg-white p-3">
          <div className="grid size-24 place-items-center">
            <ManoIlustrada forma={r.letra.forma} etiqueta={`Dibujo de la letra ${r.letra.letra}`} />
          </div>
          <ol className="space-y-1.5 text-sm">
            {r.letra.pasos.map((paso, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-marca-700 text-xs font-bold text-white">{i + 1}</span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {r.palabra && (
        <ol className="mt-2 space-y-1.5 rounded-xl bg-white p-3 text-sm">
          {r.palabra.pasos.map((paso, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-marca-700 text-xs font-bold text-white">{i + 1}</span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      )}

      {r.recomendaciones && (
        <ul className="mt-2 space-y-1.5">
          {r.recomendaciones.map((rec) => (
            <li key={rec.letra}>
              <Link
                to={`/aprender/${encodeURIComponent(rec.letra)}`}
                onClick={alIr}
                className="flex items-center gap-3 rounded-xl bg-white p-2 transition-colors hover:bg-marca-50"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-marca-100 text-xl font-bold text-marca-800">{rec.letra}</span>
                <span className="text-sm text-stone-700">{rec.motivo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {r.preguntas?.map((p) => (
        <div key={p.pregunta} className="mt-2 rounded-xl bg-white p-3 text-sm">
          <p className="font-bold">{p.pregunta}</p>
          <p className="mt-1 text-stone-700">{p.respuesta}</p>
          {p.ruta && enlace(p.ruta, `Ir a ${p.tema}`)}
        </div>
      ))}

      {r.enlace && enlace(r.enlace.ruta, r.enlace.titulo)}
    </>
  )
}
