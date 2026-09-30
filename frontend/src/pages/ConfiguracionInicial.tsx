import { motion } from 'framer-motion'
import { ArrowRight, Camera, Check, CircleAlert, Mic, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton } from '../components/Boton'
import { Logo } from '../components/Logo'
import { useApp } from '../context/AppContext'
import { LENGUAS, type Lengua } from '../lib/tipos'

type EstadoPermiso = 'pendiente' | 'solicitando' | 'concedido' | 'denegado' | 'no-disponible'

async function pedirPermiso(tipo: 'camara' | 'microfono'): Promise<EstadoPermiso> {
  if (!navigator.mediaDevices?.getUserMedia) return 'no-disponible'
  try {
    const flujo = await navigator.mediaDevices.getUserMedia(tipo === 'camara' ? { video: true } : { audio: true })
    // Solo queríamos el permiso: apagar el dispositivo de inmediato.
    flujo.getTracks().forEach((t) => t.stop())
    return 'concedido'
  } catch (e) {
    return e instanceof DOMException && e.name === 'NotFoundError' ? 'no-disponible' : 'denegado'
  }
}

const TEXTO_ESTADO: Record<EstadoPermiso, string> = {
  pendiente: 'Permitir',
  solicitando: 'Esperando…',
  concedido: 'Permitido',
  denegado: 'Reintentar',
  'no-disponible': 'No encontrado',
}

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
  const [seleccion, setSeleccion] = useState<Lengua | null>(lengua)
  const [camara, setCamara] = useState<EstadoPermiso>('pendiente')
  const [microfono, setMicrofono] = useState<EstadoPermiso>('pendiente')
  const navegar = useNavigate()

  const solicitar = async (tipo: 'camara' | 'microfono') => {
    const set = tipo === 'camara' ? setCamara : setMicrofono
    set('solicitando')
    set(await pedirPermiso(tipo))
  }

  const continuar = () => {
    if (!seleccion) return
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
