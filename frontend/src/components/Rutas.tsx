/*
 * COMPONENTES "GUARDIA" DE LAS RUTAS
 * Deciden si se puede ver una pantalla o hay que redirigir a otra:
 *   - RutaRaiz:       al abrir la app, lleva a bienvenida, configuración, login o inicio.
 *   - RequiereSesion: exige cuenta o invitado (regla c ∨ i); si no, manda al login.
 *   - RequiereAdmin:  exige administrador (regla c ∧ a); si no, manda al inicio.
 *   - SoloSinSesion:  login y registro; si ya hay sesión, manda al inicio.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import type { ReactNode } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Navigate → redirige automáticamente a otra dirección
import { Navigate } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'

/** Decide a dónde llevar al usuario al abrir la app. */
export function RutaRaiz() {
  const { onboardingVisto, lengua, tieneSesion } = useApp()
  // Se revisa en orden; la primera condición que se cumple decide a dónde ir.
  // "replace" reemplaza la dirección actual (el botón "atrás" no regresa aquí).
  if (!onboardingVisto) return <Navigate to="/bienvenida" replace /> // 1) primera vez → bienvenida
  if (!lengua) return <Navigate to="/configuracion-inicial" replace /> // 2) sin lengua → elegir LSM/ASL
  if (!tieneSesion) return <Navigate to="/login" replace /> // 3) sin sesión → login
  return <Navigate to="/inicio" replace /> // 4) todo listo → inicio
}

/** Pantallas que requieren sesión (regla «acceso a las funciones»: c ∨ i). */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { tieneSesion } = useApp()
  // Si tiene sesión, muestra la pantalla (children); si no, lo manda al login.
  return tieneSesion ? children : <Navigate to="/login" replace />
}

/** Pantallas solo para administradores (regla «administrar usuarios»: c ∧ a). */
export function RequiereAdmin({ children }: { children: ReactNode }) {
  const { puedeAdministrarUsuarios } = useApp()
  // Si es administrador, muestra la pantalla; si no, lo regresa al inicio.
  return puedeAdministrarUsuarios ? children : <Navigate to="/inicio" replace />
}

/** Login y registro: si ya hay sesión, ir directo al inicio. */
export function SoloSinSesion({ children }: { children: ReactNode }) {
  const { tieneSesion } = useApp()
  // Al revés que RequiereSesion: si YA tiene sesión, no tiene sentido ver el login → al inicio.
  return tieneSesion ? <Navigate to="/inicio" replace /> : children
}
