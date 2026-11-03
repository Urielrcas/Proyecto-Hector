/*
 * COMPONENTE: MANI SIEMPRE A LA MANO (botón flotante en todas las pantallas)
 * Un botón redondo con Mani en la esquina; al tocarlo se abre la plática (PanelMani.tsx).
 * En el celular queda arriba de la barra inferior. El panel se descarga solo la primera vez que se abre.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { vibrar } from '../lib/tacto'
import { Mascota, NOMBRE_MASCOTA } from './Mascota'

const PanelMani = lazy(() => import('./PanelMani'))

export function AsistenteMani() {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])

  return (
    <>
      <AnimatePresence>
        {!abierto && (
          <motion.button
            key="boton-mani"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            onClick={() => {
              vibrar('toque')
              setAbierto(true)
            }}
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 grid size-16 place-items-center rounded-full border-2 border-marca-200 bg-white shadow-lg shadow-marca-900/20 lg:right-6 lg:bottom-6"
            aria-label={`Abrir a ${NOMBRE_MASCOTA}, tu asistente`}
            title={`${NOMBRE_MASCOTA}: pregúntame o pídeme algo`}
          >
            <Mascota animo="atento" className="size-12" />
          </motion.button>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AnimatePresence>{abierto && <PanelMani key="panel-mani" alCerrar={cerrar} />}</AnimatePresence>
      </Suspense>
    </>
  )
}
