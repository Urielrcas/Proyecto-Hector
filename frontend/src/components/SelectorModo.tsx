/*
 * COMPONENTE: SELECTOR DE MODO DE TRADUCCIÓN
 * Barra con los tres modos de «Traducir»: Señas → Texto, Voz → Señas y Conversación.
 * Se pone arriba de cada uno, así se sienten como una sola herramienta con modos.
 * La píldora blanca se desliza al modo elegido (layoutId de Framer Motion).
 */

import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { MODOS_TRADUCIR } from '../lib/navegacion'
import { vibrar } from '../lib/tacto'

const CORTOS: Record<string, string> = {
  '/traductor/senas': 'Señas → Texto',
  '/traductor/voz': 'Voz → Señas',
  '/conversacion': 'Conversación',
}

export function SelectorModo() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Modo de traducción" className="mb-5 sm:mb-6">
      <ul className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1 sm:inline-grid sm:min-w-[32rem]">
        {MODOS_TRADUCIR.map((m) => {
          const activo = pathname === m.ruta
          return (
            <li key={m.ruta} className="relative">
              {activo && (
                <motion.span
                  layoutId="pildora-modo"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  aria-hidden
                />
              )}
              <NavLink
                to={m.ruta}
                onClick={() => vibrar('toque')}
                className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition-colors sm:text-base ${
                  activo ? 'text-marca-800' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <m.icono className="size-5 shrink-0 max-sm:hidden" aria-hidden />
                <span className="truncate">{CORTOS[m.ruta] ?? m.titulo}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
