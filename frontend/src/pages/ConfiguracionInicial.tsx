/*
 * PANTALLA: LENGUA DE SEÑAS Y PERMISOS
 * El usuario elige LSM o ASL y da permiso a la cámara y al micrófono.
 * pedirPermiso() solicita el permiso al navegador y apaga el dispositivo de inmediato
 * (solo queremos el permiso, no grabar). Al continuar va al login (o al inicio si ya hay sesión).
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     motion → versiones animables de las etiquetas (motion.div, motion.li...)
import { motion } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowRight (flecha →), Camera (cámara), Check (palomita ✓), CircleAlert (círculo con !), Mic (micrófono), LucideIcon (tipo: cualquier ícono de Lucide)
import { ArrowRight, Camera, Check, CircleAlert, Mic, type LucideIcon } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     useNavigate → función para cambiar de pantalla desde el código
import { useNavigate } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../components/Boton'
// ▸ Desde nuestro proyecto: src/components/Logo.tsx:
//     Logo → logo de la app (ícono + nombre)
import { Logo } from '../components/Logo'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     LENGUAS → nombres y regiones de LSM y ASL
//     Lengua → tipo: 'LSM' o 'ASL'
import { LENGUAS, type Lengua } from '../lib/tipos'

// Estados posibles de cada permiso (cámara o micrófono).
type EstadoPermiso = 'pendiente' | 'solicitando' | 'concedido' | 'denegado' | 'no-disponible'

// Pide un permiso al navegador. El navegador muestra su propio aviso "¿Permitir…?".
async function pedirPermiso(tipo: 'camara' | 'microfono'): Promise<EstadoPermiso> {
  if (!navigator.mediaDevices?.getUserMedia) return 'no-disponible' // navegador sin soporte
  try {
    // getUserMedia enciende la cámara ({ video: true }) o el micrófono ({ audio: true }).
    const flujo = await navigator.mediaDevices.getUserMedia(tipo === 'camara' ? { video: true } : { audio: true })
    // Solo queríamos el permiso: apagar el dispositivo de inmediato.
    flujo.getTracks().forEach((t) => t.stop())
    return 'concedido'
  } catch (e) {
    // NotFoundError = no hay cámara/micrófono; cualquier otro error = el usuario lo bloqueó.
    return e instanceof DOMException && e.name === 'NotFoundError' ? 'no-disponible' : 'denegado'
  }
}

// Texto del botón según el estado del permiso.
const TEXTO_ESTADO: Record<EstadoPermiso, string> = {
  pendiente: 'Permitir',
  solicitando: 'Esperando…',
  concedido: 'Permitido',
  denegado: 'Reintentar',
  'no-disponible': 'No encontrado',
}

// Tarjeta de un permiso: ícono, título, descripción y botón "Permitir".
// Al concederse, el ícono cambia a una palomita verde.
function TarjetaPermiso({
  icono: Icono,
  titulo,
  descripcion,
  estado,
  onPedir,
}: {
  icono: LucideIcon
  titulo: string
  descripcion: string
  estado: EstadoPermiso
  onPedir: () => void
}) {
  const concedido = estado === 'concedido'
  return (
    <div className="rounded-2xl border-2 border-stone-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${concedido ? 'bg-marca-100 text-marca-800' : 'bg-stone-100 text-stone-700'}`}>
          {concedido ? <Check className="size-6" aria-hidden /> : <Icono className="size-6" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{titulo}</h3>
          <p className="text-sm text-stone-600">{descripcion}</p>
        </div>
        <Boton
          variante={concedido ? 'fantasma' : 'secundario'}
          className="shrink-0 px-4!"
          onClick={onPedir}
          disabled={concedido || estado === 'no-disponible'}
          cargando={estado === 'solicitando'}
        >
          {TEXTO_ESTADO[estado]}
        </Boton>
      </div>
      {/* Si lo bloqueó, explicar cómo desbloquearlo */}
      {estado === 'denegado' && (
        <p role="alert" className="mt-3 flex gap-2 text-sm text-red-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          El permiso fue bloqueado. Actívalo desde el ícono del candado en la barra de direcciones del navegador y vuelve a intentarlo.
        </p>
      )}
    </div>
  )
}

export default function ConfiguracionInicial() {
  const { lengua, elegirLengua, tieneSesion } = useApp()
  const [seleccion, setSeleccion] = useState<Lengua | null>(lengua) // LSM o ASL elegida en la pantalla
  const [camara, setCamara] = useState<EstadoPermiso>('pendiente') // estado del permiso de cámara
  const [microfono, setMicrofono] = useState<EstadoPermiso>('pendiente') // estado del permiso de micrófono
  const navegar = useNavigate()

  // Botón "Permitir" de una tarjeta.
  const solicitar = async (tipo: 'camara' | 'microfono') => {
    const set = tipo === 'camara' ? setCamara : setMicrofono
    set('solicitando')
    set(await pedirPermiso(tipo))
  }

  // Botón "Continuar": guarda la lengua y va al login (o al inicio si ya hay sesión).
  const continuar = () => {
    if (!seleccion) return // sin lengua no se puede continuar (el botón está desactivado)
    elegirLengua(seleccion)
    navegar(tieneSesion ? '/inicio' : '/login')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Logo />
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">Prepara tu experiencia</h1>
        <p className="mt-2 text-stone-600">Puedes cambiar esto más tarde en Perfil y configuración.</p>

        {/* Sección 1: tarjetas LSM y ASL. La elegida tiene borde verde y una palomita. */}
        <section className="mt-8" aria-labelledby="titulo-lengua">
          <h2 id="titulo-lengua" className="text-xl font-bold">
            1. ¿Qué lengua de señas usas?
          </h2>
          <div role="radiogroup" aria-labelledby="titulo-lengua" className="mt-4 grid gap-3 sm:grid-cols-2">
            {(Object.keys(LENGUAS) as Lengua[]).map((clave) => {
              const activa = seleccion === clave
              return (
                <button
                  key={clave}
                  role="radio"
                  aria-checked={activa}
                  onClick={() => setSeleccion(clave)}
                  className={`relative rounded-2xl border-2 p-5 text-left transition-colors ${
                    activa ? 'border-marca-700 bg-marca-50' : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <span className="text-3xl font-bold tracking-tight text-marca-800">{clave}</span>
                  <span className="mt-1 block font-bold">{LENGUAS[clave].nombre}</span>
                  <span className="block text-sm text-stone-600">{LENGUAS[clave].region}</span>
                  {activa && (
                    <span className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-marca-700 text-white">
                      <Check className="size-4" aria-hidden />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Sección 2: tarjetas de permisos de cámara y micrófono */}
        <section className="mt-10" aria-labelledby="titulo-permisos">
          <h2 id="titulo-permisos" className="text-xl font-bold">
            2. Permisos
          </h2>
          <p className="mt-1 text-stone-600">
            El video y el audio se procesan para traducir; no se guardan grabaciones.
          </p>
          <div className="mt-4 space-y-3">
            <TarjetaPermiso
              icono={Camera}
              titulo="Cámara"
              descripcion="Para reconocer tus señas."
              estado={camara}
              onPedir={() => solicitar('camara')}
            />
            <TarjetaPermiso
              icono={Mic}
              titulo="Micrófono"
              descripcion="Para convertir la voz en señas."
              estado={microfono}
              onPedir={() => solicitar('microfono')}
            />
          </div>
        </section>
      </motion.main>

      {/* Botón "Continuar" (desactivado hasta elegir una lengua) */}
      <footer className="mx-auto w-full max-w-xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <Boton className="w-full" onClick={continuar} disabled={!seleccion}>
          Continuar
          <ArrowRight className="size-5" aria-hidden />
        </Boton>
        {!seleccion && <p className="mt-2 text-center text-sm text-stone-600">Elige una lengua de señas para continuar.</p>}
      </footer>
    </div>
  )
}
