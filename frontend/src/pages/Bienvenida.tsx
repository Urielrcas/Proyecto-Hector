/*
 * PANTALLA: BIENVENIDA
 * Presentación de 3 pasos que se muestra la primera vez. Los textos e íconos están en PASOS.
 * Botones: Saltar, Siguiente/Comenzar y regresar. Al terminar va a /configuracion-inicial.
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     AnimatePresence → permite animar elementos cuando aparecen y desaparecen
//     motion → versiones animables de las etiquetas (motion.div, motion.li...)
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), ArrowRight (flecha →), AudioLines (ondas de audio), Hand (mano), Mic (micrófono), MessageSquareText (mensaje de texto), Users (dos personas), LucideIcon (tipo: cualquier ícono de Lucide)
import { ArrowLeft, ArrowRight, AudioLines, Hand, Mic, MessageSquareText, Users, type LucideIcon } from 'lucide-react'
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

// Datos de cada paso de la bienvenida.
interface Paso {
  titulo: string // título grande
  texto: string // explicación debajo
  desde: LucideIcon // ícono grande de la izquierda (lo que entra)
  hacia: LucideIcon[] // íconos de la derecha (lo que sale)
}

// Los 3 pasos. Para cambiar los textos o agregar un paso, edita esta lista.
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

// Dibujo de cada paso: [ícono grande verde] → [íconos blancos].
function Ilustracion({ paso }: { paso: Paso }) {
  const Desde = paso.desde // se pasa a mayúscula para poder usarlo como componente: <Desde />
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
  const [indice, setIndice] = useState(0) // paso actual (0, 1 o 2)
  const [direccion, setDireccion] = useState(1) // 1 = avanzar, -1 = regresar (para animar hacia el lado correcto)
  const { completarOnboarding } = useApp()
  const navegar = useNavigate()
  const ultimo = indice === PASOS.length - 1 // ¿es el último paso?
  const paso = PASOS[indice]

  // Ir a otro paso (adelante o atrás).
  const ir = (nuevo: number) => {
    setDireccion(nuevo > indice ? 1 : -1)
    setIndice(nuevo)
  }

  // "Saltar" o "Comenzar": recordar que ya vio la bienvenida e ir a elegir la lengua.
  const terminar = () => {
    completarOnboarding()
    navegar('/configuracion-inicial')
  }

  return (
    // Fondo con degradado verde claro → gris claro. Las flechas ← → del teclado también cambian de paso.
    <div
      className="flex min-h-dvh flex-col bg-gradient-to-b from-marca-50 via-stone-50 to-stone-50"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && !ultimo) ir(indice + 1)
        if (e.key === 'ArrowLeft' && indice > 0) ir(indice - 1)
      }}
    >
      {/* Arriba: logo y botón "Saltar" (no aparece en el último paso) */}
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

        {/* Contenido del paso con animación: sale hacia un lado y entra el siguiente desde el otro */}
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

        {/* Puntitos de progreso: el del paso actual es más largo y verde. Al tocarlos se salta a ese paso. */}
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

      {/* Abajo: botón ← (desde el paso 2) y botón "Siguiente" / "Comenzar" (en el último paso) */}
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
