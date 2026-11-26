/*
 * COMPONENTE: MANI TE AYUDA CON LA LETRA QUE PRACTICAS (en la esquina de la cámara de «Practicar letra»)
 * Va encima de la cámara, en la esquina superior derecha (el contenedor de la cámara debe ser «relative»):
 *   - Cerrado: un botón redondo con Mani y cuántos consejos tiene. Si la letra te está costando, Mani se
 *     asoma solo con un globito: «¿Te ayudo con la E?».
 *   - Abierto: una tarjeta en la esquina con Mani y su globo, un consejo a la vez: «Otro consejo», anterior,
 *     leer en voz alta y «Ya entendí» (o la ✕) para cerrarla.
 * Los consejos salen de los intentos guardados (prácticas 18, 19 y 27) y del consejo por dedos
 * (lib/aprendizaje/ayudaMani.ts y consejoDedos.ts). A los invitados Mani los invita a iniciar sesión.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { globosDeAyuda, type Globo } from '../../lib/aprendizaje/ayudaMani'
import { callar, hablar, hayVoz } from '../../lib/voz'
import type { Expediente } from '../../services/intentos'
import { Mascota, NOMBRE_MASCOTA } from '../Mascota'

export function PanelConsejosLetra({ letra, expediente, conCuenta }: { letra: string; expediente: Expediente | null; conCuenta: boolean }) {
  const info = expediente?.letras.find((l) => l.letra === letra)
  const lengua = expediente?.lengua
  const consejos = useMemo(() => {
    if (!lengua) return []
    const letras = alfabeto(lengua)
    const esta = letras.find((l) => l.letra === letra)
    return esta ? globosDeAyuda(esta, expediente, letras) : []
  }, [lengua, letra, expediente])

  // Sin consejos todavía, Mani igual dice algo útil al tocarlo.
  const globos: Globo[] = !conCuenta
    ? [{ texto: 'Inicia sesión y recordaré tus intentos para darte consejos de esta letra.', animo: 'hola' }]
    : !info || info.intentos === 0
      ? [{ texto: 'Haz tu primer intento: voy a ir viendo cómo te va para darte consejos.', animo: 'atento' }]
      : consejos.length
        ? consejos
        : [{ texto: `Vas bien con la ${letra}. Sigue practicando y te aviso si veo algo que corregir.`, animo: 'feliz' }]
  const hayConsejos = conCuenta && consejos.length > 0
  const leCuesta = !!info && (info.estado === 'difícil' || info.fallidos >= 5) && hayConsejos

  const [abierto, setAbierto] = useState(false)
  const [paso, setPaso] = useState(0)
  const [ofrecio, setOfrecio] = useState(false)
  // Al cambiar de letra se cierra y empieza desde el primer consejo.
  const [deLetra, setDeLetra] = useState(letra)
  if (deLetra !== letra) {
    setDeLetra(letra)
    setAbierto(false)
    setPaso(0)
    setOfrecio(false)
  }
  useEffect(() => () => callar(), [letra])

  const i = Math.min(paso, globos.length - 1)
  const actual = globos[i]
  const ultimo = i >= globos.length - 1
  const abrir = () => {
    setPaso(0)
    setAbierto(true)
    setOfrecio(true)
  }
  const cerrar = () => {
    setAbierto(false)
    callar()
  }

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {abierto ? (
          <motion.section
            key="abierto"
            aria-label={`${NOMBRE_MASCOTA} te ayuda`}
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{ originX: 1, originY: 0 }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border-2 border-marca-200 bg-white/95 p-3 shadow-xl backdrop-blur"
          >
            <div className="flex items-start gap-2">
              <Mascota animo={actual.animo} className="size-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-marca-800">
                  {NOMBRE_MASCOTA}
                  {hayConsejos && info && (
                    <span className="font-normal text-stone-500">
                      {' '}
                      · {info.intentos} {info.intentos === 1 ? 'intento' : 'intentos'}, {info.aciertos} {info.aciertos === 1 ? 'logrado' : 'logrados'}
                    </span>
                  )}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="mt-0.5 text-sm font-bold text-stone-800"
                    aria-live="polite"
                  >
                    {actual.texto}
                  </motion.p>
                </AnimatePresence>
                {actual.letra && (
                  <Link to={`/aprender/${encodeURIComponent(actual.letra)}`} className="mt-1 inline-block text-sm font-bold text-marca-800 hover:underline">
                    Practicar la {actual.letra} →
                  </Link>
                )}
                {!conCuenta && (
                  <Link to="/login" className="mt-1 inline-block text-sm font-bold text-marca-800 hover:underline">
                    Iniciar sesión →
                  </Link>
                )}
              </div>
              <button type="button" onClick={cerrar} aria-label="Cerrar la ayuda" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-xl text-stone-500 hover:bg-stone-100">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <span className="mr-auto text-xs text-stone-500 tabular-nums">{globos.length > 1 ? `Consejo ${i + 1} de ${globos.length}` : ''}</span>
              {hayVoz() && (
                <button type="button" onClick={() => hablar(actual.texto)} aria-label="Leer en voz alta" title="Leer en voz alta" className="grid size-9 place-items-center rounded-xl text-marca-800 hover:bg-marca-100">
                  <Volume2 className="size-5" aria-hidden />
                </button>
              )}
              {i > 0 && (
                <button type="button" onClick={() => (callar(), setPaso(i - 1))} aria-label="Consejo anterior" className="grid size-9 place-items-center rounded-xl text-stone-600 hover:bg-stone-100">
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
              )}
              {ultimo ? (
                <button type="button" onClick={cerrar} className="min-h-9 rounded-xl bg-marca-700 px-3 text-sm font-bold text-white hover:bg-marca-800">
                  ¡Ya entendí!
                </button>
              ) : (
                <button type="button" onClick={() => (callar(), setPaso(i + 1))} className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-marca-700 px-3 text-sm font-bold text-white hover:bg-marca-800">
                  Otro consejo <ChevronRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
            {hayConsejos && (
              <Link to="/aprender/expediente" className="mt-1 inline-block text-xs font-bold text-marca-800 hover:underline">
                Ver mi expediente completo →
              </Link>
            )}
          </motion.section>
        ) : (
          <motion.div key="cerrado" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-start gap-2">
            {/* Si la letra cuesta, Mani se ofrece solo (hasta que lo abras una vez) */}
            {leCuesta && !ofrecio && (
              <motion.button
                type="button"
                onClick={abrir}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="pointer-events-auto relative mt-2 rounded-2xl border-2 border-marca-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-800 shadow-lg hover:bg-marca-50"
              >
                ¿Te ayudo con la {letra}?
                <span aria-hidden className="absolute top-3 -right-[7px] size-3 rotate-45 border-t-2 border-r-2 border-marca-200 bg-white" />
              </motion.button>
            )}
            <button
              type="button"
              onClick={abrir}
              aria-label={hayConsejos ? `Pídele ayuda a ${NOMBRE_MASCOTA}: ${consejos.length} consejos` : `Pídele ayuda a ${NOMBRE_MASCOTA}`}
              title={`Pídele ayuda a ${NOMBRE_MASCOTA}`}
              className="pointer-events-auto relative grid size-14 place-items-center rounded-full border-2 border-marca-200 bg-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Mascota animo={leCuesta ? 'pensando' : 'atento'} className="size-11" />
              {hayConsejos && (
                <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-marca-700 text-xs font-bold text-white ring-2 ring-white" aria-hidden>
                  {consejos.length}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
