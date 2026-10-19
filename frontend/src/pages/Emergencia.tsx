/*
 * PANTALLA: FRASES DE EMERGENCIA
 * Frases rápidas que se muestran en pantalla completa y se leen en voz alta.
 *   - PRINCIPALES y OTRAS: listas de frases (título, subtítulo, mensaje, ícono y color).
 *   - hablar() (lib/voz.ts): lee el mensaje con la voz del navegador en español de México.
 * Disponible siempre, incluso sin iniciar sesión.
 */

// ▸ Desde Framer Motion (librería de animaciones):
//     AnimatePresence → permite animar elementos cuando aparecen y desaparecen
//     motion → versiones animables de las etiquetas (motion.div, motion.li...)
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), ChevronDown (flechita ▾), ChevronRight (flechita ›), Ear (oreja), HeartPulse (corazón con pulso), LifeBuoy (salvavidas), MapPin (pin de mapa), MessageSquareText (mensaje de texto), Phone (teléfono), Pill (pastilla), Siren (sirena), Volume2 (bocina), X (tache ✕), LucideIcon (tipo: cualquier ícono de Lucide)
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Ear,
  HeartPulse,
  LifeBuoy,
  MapPin,
  MessageSquareText,
  Phone,
  Pill,
  Siren,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../components/Boton'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/voz.ts:
//     callar → detiene la voz
//     hablar → lee un texto en voz alta (voz sintética del navegador)
import { callar, hablar } from '../lib/voz'

// Datos de cada frase.
interface Frase {
  titulo: string // texto grande en la lista
  subtitulo: string // texto pequeño en la lista
  /** Lo que se muestra en grande y se lee en voz alta. */
  mensaje: string
  icono: LucideIcon // ícono de lucide-react
  color: string // color del cuadrito del ícono y del fondo de la pantalla completa
}

// Frases principales (siempre visibles). Para agregar una, copia una línea y cambia sus datos.
const PRINCIPALES: Frase[] = [
  { titulo: 'Llamar ayuda', subtitulo: 'Necesito asistencia inmediata', mensaje: 'Necesito ayuda urgente. Por favor, llame al 911.', icono: Phone, color: 'bg-red-600' },
  { titulo: 'Tengo dolor', subtitulo: 'Me siento mal', mensaje: 'Tengo dolor y me siento mal. Necesito atención médica.', icono: HeartPulse, color: 'bg-orange-600' },
  { titulo: 'Necesito ayuda', subtitulo: 'Por favor, ayúdame', mensaje: 'Por favor, ayúdeme.', icono: LifeBuoy, color: 'bg-emerald-700' },
  { titulo: 'Dirección', subtitulo: '¿Dónde está…?', mensaje: 'Estoy perdido. ¿Me puede indicar dónde estoy o cómo llegar?', icono: MapPin, color: 'bg-blue-600' },
]

// Frases que aparecen al abrir "Otras frases".
const OTRAS: Frase[] = [
  { titulo: 'Soy sordo', subtitulo: 'No puedo oír', mensaje: 'Soy una persona sorda. No puedo oírle. Por favor, escríbame o hable despacio de frente.', icono: Ear, color: 'bg-violet-600' },
  { titulo: 'Necesito un intérprete', subtitulo: 'Lengua de señas', mensaje: 'Necesito un intérprete de lengua de señas.', icono: MessageSquareText, color: 'bg-violet-600' },
  { titulo: 'Soy alérgico', subtitulo: 'Medicamentos', mensaje: 'Soy alérgico a algunos medicamentos. Por favor, pregúnteme antes de darme alguno.', icono: Pill, color: 'bg-violet-600' },
  { titulo: 'Llame a una ambulancia', subtitulo: 'Urgencia médica', mensaje: 'Por favor, llame a una ambulancia.', icono: Siren, color: 'bg-violet-600' },
]

// Una fila de la lista: cuadrito de color con ícono, título, subtítulo y flecha.
function FilaFrase({ frase, onElegir }: { frase: Frase; onElegir: () => void }) {
  return (
    <li>
      <button
        onClick={onElegir}
        className="flex w-full items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-4 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
      >
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-white ${frase.color}`}>
          <frase.icono className="size-7" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">{frase.titulo}</span>
          <span className="block text-stone-600">{frase.subtitulo}</span>
        </span>
        <ChevronRight className="size-6 shrink-0 text-stone-400" aria-hidden />
      </button>
    </li>
  )
}

export default function Emergencia() {
  const { tieneSesion } = useApp()
  const [elegida, setElegida] = useState<Frase | null>(null) // frase abierta en pantalla completa (null = ninguna)
  const [verOtras, setVerOtras] = useState(false) // ¿está abierta la sección "Otras frases"?

  // Al abrir una frase, leerla en voz alta; al cerrarla, callar.
  useEffect(() => {
    if (elegida) hablar(elegida.mensaje)
    else callar()
  }, [elegida])

  // Cerrar la frase con la tecla Esc.
  useEffect(() => {
    if (!elegida) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setElegida(null)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [elegida])

  // Contenido de la pantalla (lista de frases + número 911 + frase en pantalla completa).
  const contenido = (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        {!tieneSesion && (
          <Link to="/login" className="grid size-11 place-items-center rounded-xl hover:bg-stone-200" aria-label="Volver">
            <ArrowLeft className="size-6" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Frases de emergencia</h1>
          <p className="text-stone-600">Toca una frase para mostrarla en grande y reproducirla en voz alta.</p>
        </div>
      </div>

      <ul className="space-y-3">
        {PRINCIPALES.map((f) => (
          <FilaFrase key={f.titulo} frase={f} onElegir={() => setElegida(f)} />
        ))}
      </ul>

      <button
        onClick={() => setVerOtras((v) => !v)}
        aria-expanded={verOtras}
        className="mt-3 flex w-full items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-4 text-left hover:bg-stone-50"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white">
          <MessageSquareText className="size-7" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">Otras frases</span>
          <span className="block text-stone-600">Ver más frases predefinidas</span>
        </span>
        <ChevronDown className={`size-6 text-stone-400 transition-transform ${verOtras ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {verOtras && (
        <ul className="mt-3 space-y-3 border-l-4 border-violet-200 pl-3">
          {OTRAS.map((f) => (
            <FilaFrase key={f.titulo} frase={f} onElegir={() => setElegida(f)} />
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-900">
        Número de emergencias en México: <strong className="text-xl">911</strong>{' '}
        <a href="tel:911" className="font-bold underline underline-offset-4">
          (llamar)
        </a>
      </p>

      {/* Frase en pantalla completa: fondo del color de la frase, texto enorme y botón para repetir la voz */}
      <AnimatePresence>
        {elegida && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={elegida.titulo}
            className={`fixed inset-0 z-40 flex flex-col p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white sm:p-10 ${elegida.color}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-end">
              <button onClick={() => setElegida(null)} className="grid size-12 place-items-center rounded-xl bg-white/15 hover:bg-white/25" aria-label="Cerrar" autoFocus>
                <X className="size-7" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <p className="max-w-4xl text-center text-4xl leading-tight font-bold text-balance sm:text-6xl">{elegida.mensaje}</p>
            </div>
            <Boton variante="secundario" className="mx-auto w-full max-w-sm border-white! bg-white! text-stone-900!" onClick={() => hablar(elegida.mensaje)}>
              <Volume2 className="size-6" aria-hidden />
              Reproducir voz otra vez
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Sin sesión se muestra fuera del menú, para que sea accesible desde el login.
  return tieneSesion ? contenido : <div className="min-h-dvh bg-stone-100 px-4 py-6 sm:px-8 sm:py-10">{contenido}</div>
}
