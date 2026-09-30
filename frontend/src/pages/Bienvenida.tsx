import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, AudioLines, Hand, Mic, MessageSquareText, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton } from '../components/Boton'
import { Logo } from '../components/Logo'
import { useApp } from '../context/AppContext'

interface Paso {
  titulo: string
  texto: string
  desde: LucideIcon
  hacia: LucideIcon[]
}

const PASOS: Paso[] = [
  {
    titulo: 'Tus señas se vuelven texto y voz',
    texto: 'Haz señas frente a la cámara. La app reconoce tus manos y muestra la traducción en pantalla, también en voz alta.',
    desde: Hand,
    hacia: [MessageSquareText, AudioLines],
  },
  {
    titulo: 'La voz se vuelve señas',
    texto: 'La persona oyente habla o escribe, y un avatar 3D lo representa en lengua de señas para que puedas verlo.',
    desde: Mic,
    hacia: [Hand],
  },
  {
    titulo: 'Conversen frente a frente',
    texto: 'Usen el modo conversación con pantalla dividida, frases rápidas para emergencias y practica para aprender.',
    desde: Users,
    hacia: [MessageSquareText],
  },
]

function Ilustracion({ paso }: { paso: Paso }) {
  const Desde = paso.desde
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <span className="grid size-24 place-items-center rounded-[2rem] bg-marca-700 text-white shadow-lg shadow-marca-900/20 sm:size-28">
        <Desde className="size-12 sm:size-14" strokeWidth={1.75} />
      </span>
      <ArrowRight className="size-8 shrink-0 text-marca-400" strokeWidth={2.5} />
      <div className="flex flex-col gap-3">
        {paso.hacia.map((Icono, i) => (
          <span key={i} className="grid size-16 place-items-center rounded-2xl border-2 border-marca-200 bg-white text-marca-700 sm:size-20">
            <Icono className="size-8 sm:size-9" strokeWidth={1.75} />
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Bienvenida() {
  const [indice, setIndice] = useState(0)
  const [direccion, setDireccion] = useState(1)
  const { completarOnboarding } = useApp()
  const navegar = useNavigate()
  const ultimo = indice === PASOS.length - 1
  const paso = PASOS[indice]

  const ir = (nuevo: number) => {
    setDireccion(nuevo > indice ? 1 : -1)
    setIndice(nuevo)
  }

  const terminar = () => {
    completarOnboarding()
    navegar('/configuracion-inicial')
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-gradient-to-b from-marca-50 via-stone-50 to-stone-50"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && !ultimo) ir(indice + 1)
        if (e.key === 'ArrowLeft' && indice > 0) ir(indice - 1)
      }}
    >
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Logo />
        {!ultimo && (
          <Boton variante="fantasma" onClick={terminar}>
            Saltar
          </Boton>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-8">
        <p className="text-center text-sm font-bold tracking-wide text-marca-700 uppercase">
          Paso {indice + 1} de {PASOS.length}
        </p>

        <div className="relative mt-6 overflow-hidden" aria-live="polite">
          <AnimatePresence mode="wait" custom={direccion} initial={false}>
            <motion.section
              key={indice}
              custom={direccion}
              initial={{ opacity: 0, x: direccion * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direccion * -40 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="text-center"
            >
              <Ilustracion paso={paso} />
              <h1 className="mt-10 text-3xl font-bold tracking-tight text-balance text-stone-900 sm:text-4xl">{paso.titulo}</h1>
              <p className="mx-auto mt-4 max-w-md text-lg text-pretty text-stone-600">{paso.texto}</p>
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-center gap-2" role="tablist" aria-label="Pasos">
          {PASOS.map((p, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === indice}
              aria-label={`Paso ${i + 1}: ${p.titulo}`}
              onClick={() => ir(i)}
              className="grid h-8 place-items-center px-1"
            >
              <span className={`block h-2.5 rounded-full transition-all ${i === indice ? 'w-8 bg-marca-700' : 'w-2.5 bg-stone-300'}`} />
            </button>
          ))}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-xl gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        {indice > 0 && (
          <Boton variante="secundario" onClick={() => ir(indice - 1)} aria-label="Paso anterior">
            <ArrowLeft className="size-5" aria-hidden />
          </Boton>
        )}
        <Boton className="flex-1" onClick={ultimo ? terminar : () => ir(indice + 1)}>
          {ultimo ? 'Comenzar' : 'Siguiente'}
          <ArrowRight className="size-5" aria-hidden />
        </Boton>
      </footer>
    </div>
  )
}
