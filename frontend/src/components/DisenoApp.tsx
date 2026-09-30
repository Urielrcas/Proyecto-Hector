import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, Siren, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { EMERGENCIA, MENU } from '../lib/navegacion'
import type { Lengua } from '../lib/tipos'
import { Logo } from './Logo'

function SelectorLengua() {
  const { lengua, elegirLengua } = useApp()
  return (
    <div role="radiogroup" aria-label="Lengua de señas" className="grid grid-cols-2 rounded-full bg-stone-200/70 p-1">
      {(['LSM', 'ASL'] as Lengua[]).map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={lengua === l}
          onClick={() => elegirLengua(l)}
          className={`min-h-9 rounded-full text-sm font-bold transition-colors ${
            lengua === l ? 'bg-white text-marca-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function MenuLateral() {
  const { usuario, invitado, esAdmin, puedeAdministrarUsuarios, salir } = useApp()
  const navegar = useNavigate()

  const cerrarSesion = () => {
    salir()
    navegar('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col border-r border-stone-200 bg-white">
      <div className="px-5 pt-6 pb-5">
        <Logo />
      </div>

      <div className="mx-5 mb-5">
        <SelectorLengua />
      </div>

      <nav aria-label="Menú principal" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {MENU.filter((s) => !s.soloAdmin || puedeAdministrarUsuarios).map((s) => (
            <li key={s.ruta}>
              <NavLink
                to={s.ruta}
                className={({ isActive }) =>
                  `group relative flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold transition-colors ${
                    isActive ? 'bg-marca-50 text-marca-800' : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-marca-600" aria-hidden />}
                    <s.icono className={`size-5 shrink-0 ${isActive ? 'text-marca-700' : 'text-stone-500 group-hover:text-stone-700'}`} aria-hidden />
                    {s.titulo}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-stone-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <NavLink
          to={EMERGENCIA.ruta}
          className="flex min-h-12 items-center gap-3 rounded-xl bg-red-700 px-3 font-bold text-white hover:bg-red-800"
        >
          <Siren className="size-5" aria-hidden />
          {EMERGENCIA.titulo}
        </NavLink>

        <div className="flex items-center gap-3 rounded-xl p-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-100 font-bold text-marca-800" aria-hidden>
            {usuario ? usuario.nombre.charAt(0).toUpperCase() : '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{usuario?.nombre ?? 'Invitado'}</p>
            <p className="truncate text-sm text-stone-600">{usuario ? (esAdmin ? 'Administrador' : usuario.correo) : 'Sin cuenta'}</p>
          </div>
          <button
            onClick={cerrarSesion}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            aria-label={invitado ? 'Salir del modo invitado' : 'Cerrar sesión'}
            title="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Estructura de las pantallas internas: menú lateral en escritorio, menú desplegable en celular. */
export function DisenoApp() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { pathname } = useLocation()

  // Cerrar el menú de celular al cambiar de pantalla.
  const [rutaAnterior, setRutaAnterior] = useState(pathname)
  if (pathname !== rutaAnterior) {
    setRutaAnterior(pathname)
    setMenuAbierto(false)
  }

  useEffect(() => {
    if (!menuAbierto) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  return (
    <div className="min-h-dvh bg-stone-50 lg:pl-72">
      <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">
        <MenuLateral />
      </aside>

      {/* Barra superior en celular */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <button onClick={() => setMenuAbierto(true)} className="grid size-11 place-items-center rounded-xl text-stone-700 hover:bg-stone-200" aria-label="Abrir menú">
            <Menu className="size-6" />
          </button>
          <Link to="/inicio" aria-label="Ir al inicio">
            <Logo />
          </Link>
          <Link to={EMERGENCIA.ruta} className="grid size-11 place-items-center rounded-xl bg-red-700 text-white hover:bg-red-800" aria-label="Frases de emergencia">
            <Siren className="size-6" />
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {menuAbierto && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-stone-950/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuAbierto(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menú"
              className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <MenuLateral />
              <button
                onClick={() => setMenuAbierto(false)}
                className="absolute top-5 right-3 grid size-10 place-items-center rounded-lg text-stone-600 hover:bg-stone-100"
                aria-label="Cerrar menú"
                autoFocus
              >
                <X className="size-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
