import { MotionConfig } from 'framer-motion'
import { LoaderCircle } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DisenoApp } from './components/DisenoApp'
import { RequiereAdmin, RequiereSesion, RutaRaiz, SoloSinSesion } from './components/Rutas'
import { AppProvider, useApp } from './context/AppContext'
import { AYUDA, CONFIGURACION, CONVERSACION, HISTORIAL, SENAS_TEXTO, VOZ_SENAS } from './lib/navegacion'
import Bienvenida from './pages/Bienvenida'
import ConfiguracionInicial from './pages/ConfiguracionInicial'
import Emergencia from './pages/Emergencia'
import EnConstruccion from './pages/EnConstruccion'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import RecuperarContrasena from './pages/RecuperarContrasena'
import Registro from './pages/Registro'
import FormularioUsuario from './pages/usuarios/FormularioUsuario'
import ListaUsuarios from './pages/usuarios/ListaUsuarios'

// Carga diferida: MediaPipe solo se descarga al entrar a Aprendizaje.
const Aprender = lazy(() => import('./pages/aprender/Aprender'))
const PracticarLetra = lazy(() => import('./pages/aprender/PracticarLetra'))

function Cargando() {
  return (
    <div className="grid place-items-center py-24 text-stone-500" role="status">
      <LoaderCircle className="size-8 animate-spin" aria-label="Cargando" />
    </div>
  )
}

// Módulos pendientes: se reemplazan por su pantalla real conforme se desarrollen.
const PENDIENTES = [SENAS_TEXTO, VOZ_SENAS, CONVERSACION, HISTORIAL, CONFIGURACION, AYUDA]

function Rutas() {
  const { tieneSesion } = useApp()
  return (
    <Routes>
      <Route path="/" element={<RutaRaiz />} />
      <Route path="/bienvenida" element={<Bienvenida />} />
      <Route path="/configuracion-inicial" element={<ConfiguracionInicial />} />
      <Route path="/login" element={<SoloSinSesion><Login /></SoloSinSesion>} />
      <Route path="/registro" element={<SoloSinSesion><Registro /></SoloSinSesion>} />
      <Route path="/recuperar" element={<RecuperarContrasena />} />

      {/* Emergencia no requiere sesión: sin sesión se muestra fuera del menú */}
      {!tieneSesion && <Route path="/emergencia" element={<Emergencia />} />}

      <Route element={<RequiereSesion><DisenoApp /></RequiereSesion>}>
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/emergencia" element={<Emergencia />} />
        <Route path="/aprender" element={<Suspense fallback={<Cargando />}><Aprender /></Suspense>} />
        <Route path="/aprender/:letra" element={<Suspense fallback={<Cargando />}><PracticarLetra /></Suspense>} />        <Route path="/usuarios" element={<RequiereAdmin><ListaUsuarios /></RequiereAdmin>} />
        <Route path="/usuarios/nuevo" element={<RequiereAdmin><FormularioUsuario /></RequiereAdmin>} />
        <Route path="/usuarios/:id/editar" element={<RequiereAdmin><FormularioUsuario /></RequiereAdmin>} />
        {PENDIENTES.map(({ ruta, titulo }) => (
          <Route key={ruta} path={ruta} element={<EnConstruccion titulo={titulo} />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    // Respeta la preferencia del sistema de "reducir movimiento".
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
  )
}
