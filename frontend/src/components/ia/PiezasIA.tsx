/*
 * PIEZAS VISUALES DE LA IA EN LOS TRADUCTORES
 *   - AvisoCorreccion: «✨ Corregí HOLS → HOLA · Deshacer», o una sugerencia «¿Quisiste decir…?».
 *   - LoQueVeLaIA: etiqueta pequeña con lo que cree la red neuronal («Red neuronal: R · 93 %»)
 *     o «Entrenando tu red… 3/8» mientras aprende.
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, Hand, Sparkles, Undo2, X } from 'lucide-react'
// ▸ Desde nuestro proyecto:
import type { CorreccionMostrada } from '../../hooks/useDeletreo'
import type { EstadoEntrenamiento } from '../../lib/ia/entrenamiento'

export function AvisoCorreccion({
  correccion,
  alDeshacer,
  alAceptar,
  alCerrar,
}: {
  correccion: CorreccionMostrada | null
  alDeshacer: () => void
  alAceptar: (palabra: string) => void
  alCerrar: () => void
}) {
  return (
    <AnimatePresence>
      {correccion && (
        <motion.div
          key={`${correccion.inicio}-${correccion.original}`}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          role="status"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-marca-200 bg-marca-50 px-4 py-3"
        >
          <Sparkles className="size-5 shrink-0 text-marca-700" aria-hidden />
          {correccion.aplicada ? (
            <>
              <span className="flex-1">
                La IA corrigió <s className="text-stone-500">{correccion.original}</s> → <strong>{correccion.sugerida}</strong>
              </span>
              <button onClick={alDeshacer} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-marca-800 hover:bg-marca-100">
                <Undo2 className="size-4" aria-hidden /> Deshacer
              </button>
            </>
          ) : (
            <>
              <span>¿Quisiste decir</span>
              {[correccion.sugerida, ...correccion.alternativas].map((p) => (
                <button key={p} onClick={() => alAceptar(p)} className="rounded-full border border-marca-300 bg-white px-3 py-1 font-bold text-marca-800 hover:bg-marca-100">
                  {p}
                </button>
              ))}
              <span>?</span>
            </>
          )}
          <button onClick={alCerrar} className="ml-auto grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-marca-100" aria-label="Cerrar aviso de la IA">
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function LoQueVeLaIA({
  ia,
  personal,
  entrenando,
  activa,
}: {
  ia: { nombre: string; probabilidad: number } | null | undefined
  personal?: string | null
  entrenando: EstadoEntrenamiento | null
  activa: boolean
}) {
  if (personal)
    return (
      <p className="mt-2 flex items-center gap-2 text-sm font-bold text-marca-800" aria-live="polite">
        <Hand className="size-4" aria-hidden /> Reconocí tu forma personal de la {personal}
      </p>
    )
  if (!activa) return null
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600" aria-live="polite">
      <Brain className="size-4 text-marca-700" aria-hidden />
      {entrenando ? (
        <span>
          Tu red neuronal está aprendiendo… época {entrenando.progreso.length} de {entrenando.epocas}
        </span>
      ) : ia ? (
        <span>
          Red neuronal: <strong className="text-stone-900">{ia.nombre}</strong> · {Math.round(ia.probabilidad * 100)} %
        </span>
      ) : (
        <span>Red neuronal lista.</span>
      )}
    </p>
  )
}
