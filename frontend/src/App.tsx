/*
 * RUTAS DE LA APLICACIÓN (qué pantalla se muestra en cada dirección)
 *   - Rutas públicas: bienvenida, configuración inicial, login, registro, recuperar.
 *   - Rutas con menú lateral (dentro de <DisenoApp />): requieren sesión (cuenta o invitado).
 *   - /usuarios... y /estadisticas: además requieren ser administrador (<RequiereAdmin>).
 *   - /emergencia: siempre disponible, con o sin sesión.
 * Para agregar una pantalla nueva: créala en pages/ y agrega aquí su <Route path="..." />.
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     MotionConfig → configuración general de las animaciones
import { MotionConfig } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: LoaderCircle (círculo de carga)
import { LoaderCircle } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     lazy → carga una pantalla solo cuando se necesita (la app abre más rápido)
//     Suspense → muestra algo mientras se carga una pantalla con lazy
import { lazy, Suspense } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     BrowserRouter → activa la navegación por direcciones en toda la app
//     Navigate → redirige automáticamente a otra dirección
//     Route → una ruta: qué pantalla mostrar en cada dirección
//     Routes → contenedor de todas las rutas
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/AplicarConfiguracion.tsx:
//     AplicarConfiguracion → aplica tamaño de letra, alto contraste y movimiento a toda la página
import { AplicarConfiguracion } from './components/AplicarConfiguracion'
// ▸ Desde nuestro proyecto: src/components/DisenoApp.tsx:
//     DisenoApp → diseño de las pantallas internas (menú lateral)
import { DisenoApp } from './components/DisenoApp'
// ▸ Desde nuestro proyecto: src/components/Rutas.tsx:
//     RequiereAdmin → protege pantallas solo para administradores (regla c ∧ a)
//     RequiereSesion → protege pantallas que necesitan cuenta o invitado (regla c ∨ i)
//     RutaRaiz → decide a dónde ir al abrir la app
//     SoloSinSesion → login/registro: si ya hay sesión, manda al inicio
import { RequiereAdmin, RequiereSesion, RutaRaiz, SoloSinSesion } from './components/Rutas'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     AppProvider → envuelve la app para compartir el estado global
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { AppProvider, useApp } from './context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useConfiguracion.ts:
//     useConfiguracion → preferencias de la pantalla Configuración
import { useConfiguracion } from './hooks/useConfiguracion'
// ▸ Desde nuestro proyecto: src/lib/navegacion.ts:
//     AYUDA → sección del menú «Ayuda» (ruta, título, descripción e ícono)
//     CONFIGURACION → sección del menú «Configuración» (ruta, título, descripción e ícono)
//     CONVERSACION → sección del menú «Modo conversación» (ruta, título, descripción e ícono)
//     HISTORIAL → sección del menú «Historial» (ruta, título, descripción e ícono)
//     SENAS_TEXTO → sección del menú «Señas → Texto» (ruta, título, descripción e ícono)
//     VOZ_SENAS → sección del menú «Voz → Señas» (ruta, título, descripción e ícono)
import { AYUDA, CONFIGURACION, CONVERSACION, HISTORIAL, MI_IA, SENAS_TEXTO, VOZ_SENAS } from './lib/navegacion'
// ▸ Desde nuestro proyecto: src/pages/Bienvenida.tsx:
//     Bienvenida → pantalla de bienvenida
import Bienvenida from './pages/Bienvenida'
// ▸ Desde nuestro proyecto: src/pages/ConfiguracionInicial.tsx:
//     ConfiguracionInicial → pantalla de lengua y permisos
import ConfiguracionInicial from './pages/ConfiguracionInicial'
// ▸ Desde nuestro proyecto: src/pages/Emergencia.tsx:
//     Emergencia → pantalla de frases de emergencia
import Emergencia from './pages/Emergencia'
// ▸ Desde nuestro proyecto: src/pages/estadisticas/Estadisticas.tsx:
//     Estadisticas → pantalla de gráficas para el administrador
import Estadisticas from './pages/estadisticas/Estadisticas'
// ▸ Desde nuestro proyecto: src/pages/Inicio.tsx:
//     Inicio → pantalla de inicio
import Inicio from './pages/Inicio'
// ▸ Desde nuestro proyecto: src/pages/Login.tsx:
//     Login → pantalla de iniciar sesión
import Login from './pages/Login'
// ▸ Desde nuestro proyecto: src/pages/RecuperarContrasena.tsx:
//     RecuperarContrasena → pantalla de recuperar contraseña
import RecuperarContrasena from './pages/RecuperarContrasena'
// ▸ Desde nuestro proyecto: src/pages/Registro.tsx:
//     Registro → pantalla de crear cuenta
import Registro from './pages/Registro'
// ▸ Desde nuestro proyecto: src/pages/usuarios/FormularioUsuario.tsx:
//     FormularioUsuario → pantalla para crear/editar usuarios
import FormularioUsuario from './pages/usuarios/FormularioUsuario'
// ▸ Desde nuestro proyecto: src/pages/usuarios/ListaUsuarios.tsx:
//     ListaUsuarios → pantalla con la tabla de usuarios
import ListaUsuarios from './pages/usuarios/ListaUsuarios'

// Carga diferida: MediaPipe solo se descarga al entrar a Aprendizaje.
const Aprender = lazy(() => import('./pages/aprender/Aprender'))
const PracticarLetra = lazy(() => import('./pages/aprender/PracticarLetra'))
const RutaAprendizaje = lazy(() => import('./pages/aprender/RutaAprendizaje'))
// Juegos para poner a prueba lo aprendido (dos de ellos usan la cámara).
const Juegos = lazy(() => import('./pages/juegos/Juegos'))
const JuegoAdivina = lazy(() => import('./pages/juegos/JuegoAdivina'))
const JuegoReto = lazy(() => import('./pages/juegos/JuegoReto'))
const JuegoMemorama = lazy(() => import('./pages/juegos/JuegoMemorama'))
// Historial, Configuración y Ayuda.
const Historial = lazy(() => import('./pages/historial/Historial'))
const DetalleHistorial = lazy(() => import('./pages/historial/DetalleHistorial'))
const Configuracion = lazy(() => import('./pages/configuracion/Configuracion'))
const Ayuda = lazy(() => import('./pages/ayuda/Ayuda'))
// La IA del usuario: modelo del estudiante, red neuronal convolucional y autocorrector.
const MiIA = lazy(() => import('./pages/ia/MiIA'))
// El traductor también usa la cámara y MediaPipe: se carga solo al abrirlo.
const SenasTexto = lazy(() => import('./pages/traductor/SenasTexto'))
const VozSenas = lazy(() => import('./pages/traductor/VozSenas'))
const Conversacion = lazy(() => import('./pages/conversacion/Conversacion'))

// Círculo girando que se muestra mientras se descarga una pantalla con carga diferida.
function Cargando() {
  return (
    <div className="grid place-items-center py-24 text-stone-500" role="status">
      <LoaderCircle className="size-8 animate-spin" aria-label="Cargando" />
    </div>
  )
}

function Rutas() {
  const { tieneSesion } = useApp()
  return (
    <Routes>
      {/* "/" decide a dónde ir: bienvenida, configuración, login o inicio */}
      <Route path="/" element={<RutaRaiz />} />

      {/* ── Pantallas públicas (sin menú lateral) ── */}
      <Route path="/bienvenida" element={<Bienvenida />} />
      <Route path="/configuracion-inicial" element={<ConfiguracionInicial />} />
      <Route path="/login" element={<SoloSinSesion><Login /></SoloSinSesion>} />
      <Route path="/registro" element={<SoloSinSesion><Registro /></SoloSinSesion>} />
      <Route path="/recuperar" element={<RecuperarContrasena />} />

      {/* Emergencia no requiere sesión: sin sesión se muestra fuera del menú */}
      {!tieneSesion && <Route path="/emergencia" element={<Emergencia />} />}

      {/* ── Pantallas internas: requieren sesión y se muestran dentro del menú (DisenoApp) ── */}
      <Route element={<RequiereSesion><DisenoApp /></RequiereSesion>}>
        <Route path="/inicio" element={<Inicio />} />
        <Route path={SENAS_TEXTO.ruta} element={<Suspense fallback={<Cargando />}><SenasTexto /></Suspense>} />
        <Route path={VOZ_SENAS.ruta} element={<Suspense fallback={<Cargando />}><VozSenas /></Suspense>} />
        <Route path={CONVERSACION.ruta} element={<Suspense fallback={<Cargando />}><Conversacion /></Suspense>} />
        <Route path="/emergencia" element={<Emergencia />} />
        <Route path="/aprender" element={<Suspense fallback={<Cargando />}><Aprender /></Suspense>} />
        {/* "/aprender/ruta" y "/aprender/juegos" van antes que "/aprender/:letra" para que no se lean como una letra */}
        <Route path="/aprender/ruta" element={<Suspense fallback={<Cargando />}><RutaAprendizaje /></Suspense>} />
        <Route path="/aprender/juegos" element={<Suspense fallback={<Cargando />}><Juegos /></Suspense>} />
        <Route path="/aprender/juegos/adivina" element={<Suspense fallback={<Cargando />}><JuegoAdivina /></Suspense>} />
        <Route path="/aprender/juegos/reto" element={<Suspense fallback={<Cargando />}><JuegoReto key="reto" modo="reto" /></Suspense>} />
        <Route path="/aprender/juegos/memorama" element={<Suspense fallback={<Cargando />}><JuegoMemorama /></Suspense>} />
        <Route path="/aprender/juegos/palabra" element={<Suspense fallback={<Cargando />}><JuegoReto key="palabra" modo="palabra" /></Suspense>} />
        <Route path="/aprender/:letra" element={<Suspense fallback={<Cargando />}><PracticarLetra /></Suspense>} />

        {/* Solo administradores */}
        <Route path="/usuarios" element={<RequiereAdmin><ListaUsuarios /></RequiereAdmin>} />
        <Route path="/usuarios/nuevo" element={<RequiereAdmin><FormularioUsuario /></RequiereAdmin>} />
        <Route path="/usuarios/:id/editar" element={<RequiereAdmin><FormularioUsuario /></RequiereAdmin>} />
        <Route path="/estadisticas" element={<RequiereAdmin><Estadisticas /></RequiereAdmin>} />

        {/* Historial, Configuración y Ayuda */}
        <Route path={HISTORIAL.ruta} element={<Suspense fallback={<Cargando />}><Historial /></Suspense>} />
        <Route path={`${HISTORIAL.ruta}/:id`} element={<Suspense fallback={<Cargando />}><DetalleHistorial /></Suspense>} />
        <Route path={CONFIGURACION.ruta} element={<Suspense fallback={<Cargando />}><Configuracion /></Suspense>} />
        <Route path={MI_IA.ruta} element={<Suspense fallback={<Cargando />}><MiIA /></Suspense>} />
        <Route path={AYUDA.ruta} element={<Suspense fallback={<Cargando />}><Ayuda /></Suspense>} />
      </Route>

      {/* Cualquier otra dirección que no exista regresa al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Componente raíz: envuelve todo con las animaciones, el estado global (AppProvider) y el enrutador.
export default function App() {
  const { config } = useConfiguracion()
  return (
    // Respeta la preferencia del sistema de "reducir movimiento" (o la de Configuración, si se activó ahí).
    <MotionConfig reducedMotion={config.reducirMovimiento ? 'always' : 'user'}>
      <AplicarConfiguracion />
      <AppProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
  )
}
