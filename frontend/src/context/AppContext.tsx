/*
 * ESTADO GLOBAL DE LA APLICACIÓN (la "memoria" compartida)
 * Guarda los datos que necesitan muchas pantallas: si ya vio la bienvenida, la lengua (LSM/ASL),
 * la sesión (token + usuario) y si entró como invitado. También calcula los permisos
 * con las reglas de lógica proposicional (tieneSesion = c ∨ i, puedeAdministrarUsuarios = c ∧ a).
 * Cualquier componente lo usa así:  const { usuario, salir } = useApp()
 * Los datos se guardan en localStorage para no perderlos al recargar la página.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     createContext → crea un contexto (datos compartidos por toda la app)
//     useContext → lee datos compartidos de un contexto
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
//     registrarAlExpirarSesion → indica qué hacer si la sesión vence (cerrar sesión)
import { ErrorApi, registrarAlExpirarSesion } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     borrar → borra un dato del navegador (localStorage)
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { borrar, guardar, leer } from '../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
//     Sesion → tipo: token + usuario
//     Usuario → tipo: datos de un usuario
import type { Lengua, Sesion, Usuario } from '../lib/tipos'
// ▸ Desde nuestro proyecto: src/services/auth.ts:
//     obtenerUsuarioActual → pide al servidor los datos del usuario de la sesión
import { obtenerUsuarioActual } from '../services/auth'

// Datos que se guardan (y se recuerdan al recargar la página).
interface Estado {
  onboardingVisto: boolean // ¿ya vio la pantalla de bienvenida?
  lengua: Lengua | null // 'LSM' o 'ASL' (null si todavía no elige)
  sesion: Sesion | null // token + datos del usuario; null si no ha iniciado sesión
  invitado: boolean // ¿entró con "Continuar como invitado"?
}

// Todo lo que las pantallas pueden leer o usar con useApp().
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

// AppProvider envuelve toda la app (ver App.tsx) para que cualquier pantalla pueda usar useApp().
export function AppProvider({ children }: { children: ReactNode }) {
  // Estado inicial: se lee lo que quedó guardado en el navegador la última vez.
  const [estado, setEstado] = useState<Estado>(() => ({
    onboardingVisto: leer('onboardingVisto', false),
    lengua: leer<Lengua | null>('lengua', null),
    sesion: leer<Sesion | null>('sesion', null),
    invitado: leer('invitado', false),
  }))

  // Cambia uno o varios datos y los guarda en el navegador.
  const actualizar = (cambios: Partial<Estado>) => {
    setEstado((prev) => ({ ...prev, ...cambios }))
    for (const [clave, valor] of Object.entries(cambios)) guardar(clave, valor)
  }

  // Cerrar sesión: borra la sesión y el modo invitado (la lengua elegida se conserva).
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

  // Lo que reciben las pantallas al llamar useApp().
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

// Hook para leer el estado global desde cualquier pantalla: const { usuario } = useApp()
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
