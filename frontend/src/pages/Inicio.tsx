import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  APRENDIZAJE,
  AYUDA,
  CONFIGURACION,
  CONVERSACION,
  EMERGENCIA,
  HISTORIAL,
  SENAS_TEXTO,
  USUARIOS,
  VOZ_SENAS,
  type Seccion,
} from '../lib/navegacion'

const TRADUCTORES: Seccion[] = [SENAS_TEXTO, VOZ_SENAS]
const OTRAS: Seccion[] = [CONVERSACION, APRENDIZAJE, HISTORIAL, USUARIOS, CONFIGURACION, AYUDA]

const aparecer = {
  oculto: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
}

export default function Inicio() {
  const { usuario, invitado, puedeAdministrarUsuarios, salir } = useApp()
  const nombre = usuario?.nombre.split(' ')[0]
  const otras = OTRAS.filter((s) => !s.soloAdmin || puedeAdministrarUsuarios)

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{nombre ? `Hola, ${nombre}` : 'Hola'}</h1>
      <p className="mt-1 text-lg text-stone-600">¿Qué quieres hacer hoy?</p>

      {invitado && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-marca-200 bg-marca-50 p-4">
          <p className="text-marca-900">Estás como invitado. Crea una cuenta para guardar tu historial en la nube.</p>
          <Link to="/registro" onClick={salir} className="font-bold text-marca-800 underline underline-offset-4">
            Crear cuenta
          </Link>
        </div>
      )}

      {/* Traductores: las dos funciones principales */}
      <section aria-label="Traductores" className="mt-8 grid gap-4 md:grid-cols-2">
        {TRADUCTORES.map((s, i) => (
          <motion.div key={s.ruta} custom={i} variants={aparecer} initial="oculto" animate="visible">
            <Link
              to={s.ruta}
              className="group flex h-full flex-col rounded-3xl bg-marca-700 p-6 text-white shadow-lg shadow-marca-900/15 transition-colors hover:bg-marca-800 sm:p-7"
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
                <s.icono className="size-8" aria-hidden />
              </span>
              <span className="mt-6 text-2xl font-bold">{s.titulo}</span>
              <span className="mt-1 text-marca-100">{s.descripcion}</span>
              <span className="mt-6 inline-flex items-center gap-2 font-bold">
                Abrir
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Emergencia: siempre visible y a un toque */}
      <motion.div custom={2} variants={aparecer} initial="oculto" animate="visible" className="mt-4">
        <Link to={EMERGENCIA.ruta} className="flex items-center gap-4 rounded-3xl bg-red-700 p-5 text-white transition-colors hover:bg-red-800">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <EMERGENCIA.icono className="size-7" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-xl font-bold">Frases rápidas y emergencia</span>
            <span className="block text-red-100">Pide ayuda, indica dolor o comparte tu dirección.</span>
          </span>
          <ChevronRight className="size-6 shrink-0" aria-hidden />
        </Link>
      </motion.div>

      <section aria-labelledby="titulo-mas" className="mt-10">
        <h2 id="titulo-mas" className="text-xl font-bold">
          Más funciones
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {otras.map((s, i) => (
            <motion.li key={s.ruta} custom={i + 3} variants={aparecer} initial="oculto" animate="visible">
              <Link
                to={s.ruta}
                className="flex h-full items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-4 transition-colors hover:border-marca-300 hover:bg-marca-50/50"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-800">
                  <s.icono className="size-6" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{s.titulo}</span>
                  <span className="block text-sm text-stone-600">{s.descripcion}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </section>
    </>
  )
}
