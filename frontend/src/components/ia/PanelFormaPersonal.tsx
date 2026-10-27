/*
 * COMPONENTE: TU FORMA PERSONAL DE UNA LETRA (pantalla de práctica)
 *   - Si la IA ya recuerda tu forma: «La IA recuerda tu forma de la A · Olvidar».
 *   - Si llevas rato sin lograrla: «¿Haces la A a tu manera? La IA la puede recordar» + botón.
 *   - Mientras graba: cuenta regresiva.
 *   - Si tu forma se parece MUCHO a otra letra: pide confirmar (para no confundirlas después).
 * Siempre hay un enlace pequeño para enseñarle tu forma, aunque no te hayas atorado.
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, CircleDot, Hand } from 'lucide-react'
// ▸ Desde nuestro proyecto:
import { Aviso } from '../Aviso'
import { Boton } from '../Boton'

export function PanelFormaPersonal({
  letra,
  tieneForma,
  ofrecer,
  grabando,
  conflicto,
  aviso,
  alGrabar,
  alConfirmar,
  alCancelar,
  alOlvidar,
}: {
  letra: string
  tieneForma: boolean
  ofrecer: boolean
  grabando: number // segundos que faltan (0 = no está grabando)
  conflicto: string | null // letra con la que se confunde
  aviso: string | null
  alGrabar: () => void
  alConfirmar: () => void
  alCancelar: () => void
  alOlvidar: () => void
}) {
  return (
    <div className="mt-4 space-y-3">
      <AnimatePresence mode="popLayout">
        {grabando > 0 ? (
          <motion.div
            key="grabando"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="flex items-center gap-4 rounded-2xl border-2 border-marca-400 bg-marca-50 p-4"
          >
            <motion.span
              className="grid size-12 shrink-0 place-items-center rounded-full bg-marca-700 text-2xl font-bold text-white"
              key={grabando}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              {grabando}
            </motion.span>
            <p className="font-bold">La IA está aprendiendo tu forma de la {letra}. Mantén la mano y muévela un poquito.</p>
          </motion.div>
        ) : conflicto ? (
          <motion.div key="conflicto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="font-bold">Tu forma se parece mucho a la {conflicto}.</p>
            <p className="mt-1 text-sm text-stone-700">
              Si la guardo como tu {letra}, la IA podría confundirlas. ¿La guardo de todos modos?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton onClick={alConfirmar}>Sí, es mi {letra}</Boton>
              <Boton variante="secundario" onClick={alCancelar}>
                Cancelar
              </Boton>
            </div>
          </motion.div>
        ) : ofrecer && !tieneForma ? (
          <motion.div key="ofrecer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-marca-200 bg-white p-4">
            <p className="flex items-center gap-2 font-bold">
              <Brain className="size-5 text-marca-700" aria-hidden /> ¿Se te dificulta? ¿Haces la {letra} a tu manera?
            </p>
            <p className="mt-1 text-sm text-stone-700">
              Si siempre la haces así (por ejemplo, con los dedos un poco distintos), la IA puede recordar tu forma y aceptarla desde ahora en la
              práctica, los juegos y el traductor.
            </p>
            <Boton className="mt-3" onClick={alGrabar}>
              <CircleDot className="size-5" aria-hidden /> Recordar mi forma (3 s)
            </Boton>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {aviso && <Aviso tipo={aviso.startsWith('No se vio') ? 'error' : 'exito'}>{aviso}</Aviso>}

      {/* Estado de la memoria para esta letra (siempre visible, discreto) */}
      {grabando === 0 && !conflicto && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <Hand className="size-4 text-marca-700" aria-hidden />
          {tieneForma ? (
            <>
              La IA recuerda tu forma de la {letra}.
              <button onClick={alGrabar} className="font-bold text-marca-800 hover:underline">
                Enseñarle otra vez
              </button>
              ·
              <button onClick={alOlvidar} className="font-bold text-marca-800 hover:underline">
                Olvidar
              </button>
            </>
          ) : (
            !ofrecer && (
              <button onClick={alGrabar} className="font-bold text-marca-800 hover:underline">
                ¿Haces la {letra} diferente? Enséñale tu forma a la IA
              </button>
            )
          )}
        </p>
      )}
    </div>
  )
}
