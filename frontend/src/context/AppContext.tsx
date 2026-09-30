import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ErrorApi, registrarAlExpirarSesion } from '../lib/api'
import { borrar, guardar, leer } from '../lib/almacenamiento'
import { cumple } from '../lib/logica/reglas'
import type { Lengua, Sesion, Usuario } from '../lib/tipos'
import { obtenerUsuarioActual } from '../services/auth'

interface Estado {
  onboardingVisto: boolean
  lengua: Lengua | null
  sesion: Sesion | null
  invitado: boolean
}

interface AppContextValor extends Estado {
  usuario: Usuario | null
  esAdmin: boolean
  /** Regla «acceso a las funciones»: c ∨ i */
  tieneSesion: boolean
  /** Regla «administrar usuarios»: c ∧ a */
  puedeAdministrarUsuarios: boolean
  completarOnboarding: () => void
  elegirLengua: (lengua: Lengua) => void
  entrar: (sesion: Sesion) => void
  entrarComoInvitado: () => void
  salir: () => void
}

const AppContext = createContext<AppContextValor | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(() => ({
    onboardingVisto: leer('onboardingVisto', false),
    lengua: leer<Lengua | null>('lengua', null),
    sesion: leer<Sesion | null>('sesion', null),
    invitado: leer('invitado', false),
  }))

  const actualizar = (cambios: Partial<Estado>) => {
    setEstado((prev) => ({ ...prev, ...cambios }))
    for (const [clave, valor] of Object.entries(cambios)) guardar(clave, valor)
  }

  const salir = () => {
    setEstado((prev) => ({ ...prev, sesion: null, invitado: false }))
    borrar('sesion')
    borrar('invitado')
  }

  useEffect(() => {
    registrarAlExpirarSesion(salir)
    // Al abrir la app, confirmar que la sesión guardada sigue siendo válida
    // y traer los datos actualizados (rol, nombre…) por si un admin los cambió.
    const token = estado.sesion?.token
    if (!token) return
    obtenerUsuarioActual()
      .then((usuario) => actualizar({ sesion: { token, usuario } }))
      .catch((e) => {
        if (e instanceof ErrorApi && e.estado === 401) salir()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usuario = estado.sesion?.usuario ?? null
  const valor: AppContextValor = {
    ...estado,
    usuario,
    esAdmin: usuario?.rol === 'admin',
    // Permisos decididos con las reglas de lógica proposicional (lib/logica/reglas.ts).
    tieneSesion: cumple('accesoModulos', { c: usuario !== null, i: estado.invitado }),
    puedeAdministrarUsuarios: cumple('accesoUsuarios', { c: usuario !== null, a: usuario?.rol === 'admin' }),
    completarOnboarding: () => actualizar({ onboardingVisto: true }),
    elegirLengua: (lengua) => actualizar({ lengua }),
    entrar: (sesion) => actualizar({ sesion, invitado: false, lengua: sesion.usuario.lengua }),
    entrarComoInvitado: () => actualizar({ sesion: null, invitado: true }),
    salir,
  }

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
