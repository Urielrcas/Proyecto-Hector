import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/** Decide a dónde llevar al usuario al abrir la app. */
export function RutaRaiz() {
  const { onboardingVisto, lengua, tieneSesion } = useApp()
  if (!onboardingVisto) return <Navigate to="/bienvenida" replace />
  if (!lengua) return <Navigate to="/configuracion-inicial" replace />
  if (!tieneSesion) return <Navigate to="/login" replace />
  return <Navigate to="/inicio" replace />
}

/** Pantallas que requieren sesión (regla «acceso a las funciones»: c ∨ i). */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { tieneSesion } = useApp()
  return tieneSesion ? children : <Navigate to="/login" replace />
}

/** Pantallas solo para administradores (regla «administrar usuarios»: c ∧ a). */
export function RequiereAdmin({ children }: { children: ReactNode }) {
  const { puedeAdministrarUsuarios } = useApp()
  return puedeAdministrarUsuarios ? children : <Navigate to="/inicio" replace />
}

/** Login y registro: si ya hay sesión, ir directo al inicio. */
export function SoloSinSesion({ children }: { children: ReactNode }) {
  const { tieneSesion } = useApp()
  return tieneSesion ? <Navigate to="/inicio" replace /> : children
}
