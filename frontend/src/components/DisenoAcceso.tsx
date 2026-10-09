/*
 * COMPONENTE: DISEÑO DE LAS PANTALLAS DE ACCESO
 * Estructura común de Login, Registro y Recuperar contraseña: fondo, logo arriba,
 * botón rojo de Emergencia (disponible sin cuenta) y la tarjeta central con el formulario.
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     motion → versiones animables de las etiquetas (motion.div, motion.li...)
import { motion } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Siren (sirena)
import { Siren } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import type { ReactNode } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Logo.tsx:
//     Logo → logo de la app (ícono + nombre)
import { Logo } from './Logo'

/** Estructura común de Login, Registro y Recuperar contraseña. */
export function DisenoAcceso({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    // Fondo con degradado de verde muy claro (from-marca-50) a gris claro (to-stone-50).
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-marca-50 to-stone-50">
      {/* Barra superior: logo a la izquierda y botón de emergencia a la derecha */}
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Logo />
        {/* Emergencia siempre accesible, incluso sin cuenta */}
        <Link
          to="/emergencia"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-red-700 px-4 font-bold text-white hover:bg-red-800"
        >
          <Siren className="size-5" aria-hidden />
          <span className="max-sm:sr-only">Emergencia</span>
        </Link>
      </header>

      {/* Tarjeta central: aparece con una animación (sube y se hace visible).
          En celular ocupa toda la pantalla; desde "sm:" se ve como tarjeta blanca con sombra. */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md sm:rounded-3xl sm:border sm:border-stone-200 sm:bg-white sm:p-8 sm:shadow-xl sm:shadow-marca-900/5"
        >
          {/* Título ("Iniciar sesión"), subtítulo opcional y el formulario de cada pantalla (children) */}
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-stone-600">{subtitulo}</p>}
          <div className="mt-7">{children}</div>
        </motion.div>
      </main>
    </div>
  )
}
