/*
 * PANTALLA: INICIO
 *   1. Saludo con tu nivel y tus letras logradas.
 *   2. ESPEJO VIVO: la cámara al centro. Haces una letra y Mani te dice cuál es (components/EspejoVivo.tsx).
 *      Mientras no se enciende, una mano dibujada muestra letras para invitar a probar.
 *      Si la enciendes, la próxima vez se enciende sola (se recuerda en el navegador).
 *   3. «Sigue tu camino»: el siguiente nivel del camino de Aprender.
 *   4. Modos: Traducir, Conversar y Jugar.
 *   5. Emergencia y accesos pequeños a lo demás.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Camera, ChevronRight, Gamepad2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ManoIlustrada } from '../components/ManoIlustrada'
import { Acompanante } from '../components/Mascota'
import { useApp } from '../context/AppContext'
import { useProgresoAprendizaje } from '../hooks/useProgresoAprendizaje'
import { useRegistroJuegos } from '../hooks/useRegistroJuegos'
import { guardar, leer } from '../lib/almacenamiento'
import { alfabeto } from '../lib/aprendizaje/alfabeto'
import { armarCamino } from '../lib/aprendizaje/camino'
import {
  AYUDA,
  CONFIGURACION,
  CONVERSACION,
  EMERGENCIA,
  ESTADISTICAS,
  HISTORIAL,
  MI_IA,
  SENAS_TEXTO,
  USUARIOS,
  VOZ_SENAS,
  type Seccion,
} from '../lib/navegacion'
import { vibrar } from '../lib/tacto'

// La cámara (y MediaPipe) solo se descargan si el usuario la enciende.
const EspejoVivo = lazy(() => import('../components/EspejoVivo'))

// Accesos pequeños al final (Usuarios y Estadísticas solo para administradores).
const OTRAS: Seccion[] = [HISTORIAL, MI_IA, CONFIGURACION, AYUDA, USUARIOS, ESTADISTICAS]

const CLAVE_CAMARA = 'inicio.camaraEncendida'

// Aparición escalonada de los bloques.
const aparecer = {
  oculto: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: 'spring' as const, stiffness: 260, damping: 24 } }),
}

/** Mano dibujada que va cambiando de letra (invita a encender la cámara). */
function ManoQueDeletrea({ letras }: { letras: ReturnType<typeof alfabeto> }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % letras.length), 1800)
    return () => clearInterval(t)
  }, [letras.length])
  const l = letras[i % letras.length]
  return (
    <div className="relative mx-auto aspect-square w-full max-w-52 sm:max-w-72">
      {/* Círculos de fondo que respiran */}
      <motion.div
        className="absolute inset-4 rounded-full bg-marca-100"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <div className="absolute inset-12 rounded-full bg-white/80" aria-hidden />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={l.letra}
          className="absolute inset-10"
          initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <ManoIlustrada forma={l.forma} etiqueta={`Mano haciendo la letra ${l.letra}`} />
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={l.letra}
          className="absolute right-2 bottom-4 grid size-16 place-items-center rounded-2xl bg-marca-700 text-4xl font-bold text-white shadow-lg shadow-marca-900/25"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16, delay: 0.15 }}
          aria-hidden
        >
          {l.letra}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export default function Inicio() {
  const { usuario, invitado, lengua: lenguaElegida, puedeAdministrarUsuarios, salir } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const nombre = usuario?.nombre.split(' ')[0] // solo el primer nombre: "Hola, María"
  const otras = OTRAS.filter((s) => !s.soloAdmin || puedeAdministrarUsuarios)

  const { logradas } = useProgresoAprendizaje()
  const { nivel } = useRegistroJuegos()
  const letras = alfabeto(lengua)
  const logradasAqui = letras.filter((l) => logradas.includes(l.letra)).length

  // Siguiente parada del camino de Aprender.
  const camino = armarCamino(lengua, logradas)
  const siguiente = camino.find((p) => p.estado === 'actual')
  const nivelesHechos = camino.filter((p) => p.tipo === 'nivel' && p.estado === 'hecho').length
  const totalNiveles = camino.filter((p) => p.tipo === 'nivel').length

  // Cámara del Inicio: se recuerda si el usuario la dejó encendida.
  const [camara, setCamara] = useState(() => leer<boolean>(CLAVE_CAMARA, false))
  const cambiarCamara = (encender: boolean) => {
    vibrar('toque')
    setCamara(encender)
    guardar(CLAVE_CAMARA, encender)
  }

  // Letras que muestra la mano dibujada: las del siguiente nivel (o las primeras del alfabeto).
  const letrasMuestra =
    siguiente?.tipo === 'nivel' ? letras.filter((l) => siguiente.letras.includes(l.letra)) : letras.slice(0, 5)

  return (
    <>
      {/* ── 1. Saludo ── */}
      <motion.header custom={0} variants={aparecer} initial="oculto" animate="visible" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{nombre ? `Hola, ${nombre}` : 'Hola'}</h1>
          <p className="mt-1 text-lg text-stone-600">¿Qué letra hacemos hoy?</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-marca-200 bg-white px-3 py-1.5 text-marca-800">
            <Sparkles className="size-4" aria-hidden /> Nivel {nivel.nivel} · {nivel.nombre}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-stone-700">
            {logradasAqui}/{letras.length} letras de {lengua}
          </span>
        </div>
      </motion.header>

      {invitado && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-marca-200 bg-marca-50 p-4">
          <p className="text-marca-900">Estás como invitado. Crea una cuenta para guardar tu avance en la nube.</p>
          <Link to="/registro" onClick={salir} className="font-bold text-marca-800 underline underline-offset-4">
            Crear cuenta
          </Link>
        </div>
      )}

      {/* ── 2. Espejo vivo: la cámara al centro ── */}
      <motion.section
        custom={1}
        variants={aparecer}
        initial="oculto"
        animate="visible"
        aria-label="Prueba tu mano"
        className="relative mt-6 overflow-hidden rounded-[2rem] border border-marca-100 bg-gradient-to-br from-marca-50 via-white to-white p-5 shadow-sm sm:p-8"
      >
        {/* Adorno: círculo teal difuminado en la esquina */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-marca-200/40 blur-3xl" aria-hidden />

        {camara ? (
          <Suspense
            fallback={
              <div className="grid min-h-72 place-items-center text-marca-700" role="status">
                <LoaderCircle className="size-9 animate-spin" aria-label="Preparando la cámara" />
              </div>
            }
          >
            <EspejoVivo alApagar={() => cambiarCamara(false)} />
          </Suspense>
        ) : (
          <div className="relative grid items-center gap-6 md:grid-cols-2">
            <div>
              <Acompanante animo="hola" mensaje="¡Hola! Soy Mani. Haz una letra frente a la cámara y te digo cuál es." tamano="size-24 sm:size-28" />
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Tu mano habla. Pruébalo.</h2>
              <p className="mt-2 text-stone-600">Las letras que hagas saldrán volando de tu mano y formarán palabras.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => cambiarCamara(true)}
                className="mt-5 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-marca-700 px-6 text-lg font-bold text-white shadow-lg shadow-marca-900/20 hover:bg-marca-800"
              >
                <Camera className="size-6" aria-hidden /> Encender mi cámara
              </motion.button>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-stone-500">
                <ShieldCheck className="size-4" aria-hidden /> La imagen se analiza en tu equipo; no se envía a ningún lado.
              </p>
            </div>
            <ManoQueDeletrea letras={letrasMuestra} />
          </div>
        )}
      </motion.section>

      {/* ── 3 y 4. Camino + modos ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Sigue tu camino */}
        <motion.div custom={2} variants={aparecer} initial="oculto" animate="visible" className="lg:col-span-2">
          <Link
            to="/aprender"
            className="group flex h-full flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-marca-300 sm:p-6"
          >
            <span className="text-sm font-bold text-marca-700">Sigue tu camino</span>
            <span className="mt-1 text-xl font-bold">
              {siguiente?.tipo === 'nivel' ? `Nivel ${siguiente.numero} · ${siguiente.titulo}` : (siguiente?.titulo ?? '¡Camino completo!')}
            </span>
            {siguiente?.tipo === 'nivel' && (
              <span className="mt-4 flex gap-2" aria-label={`Letras: ${siguiente.letras.join(', ')}`}>
                {siguiente.letras.map((l, i) => (
                  <motion.span
                    key={l}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
                    className={`grid size-12 place-items-center rounded-xl border-2 text-xl font-bold ${
                      logradas.includes(l) ? 'border-marca-300 bg-marca-50 text-marca-800' : 'border-stone-200 text-stone-800'
                    }`}
                  >
                    {l}
                  </motion.span>
                ))}
              </span>
            )}
            <span className="mt-auto pt-5">
              <span className="flex justify-between text-sm text-stone-600">
                <span>
                  {nivelesHechos} de {totalNiveles} niveles
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-marca-800">
                  Continuar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </span>
              <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                <motion.span
                  className="block h-full rounded-full bg-marca-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(nivelesHechos / totalNiveles) * 100}%` }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                />
              </span>
            </span>
          </Link>
        </motion.div>

        {/* Modos */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          <motion.div custom={3} variants={aparecer} initial="oculto" animate="visible" className="sm:col-span-2">
            <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-marca-700 p-5 text-white shadow-lg shadow-marca-900/15 sm:p-6">
              <SENAS_TEXTO.icono className="absolute -right-4 -bottom-6 size-36 rotate-[-15deg] text-white/10 transition-transform duration-500 group-hover:rotate-0" aria-hidden />
              <span className="text-sm font-bold text-marca-100">Traducir</span>
              <span className="mt-1 text-2xl font-bold">Señas, voz y texto</span>
              <span className="mt-1 max-w-md text-marca-100">Elige hacia dónde quieres traducir.</span>
              <span className="relative mt-4 flex flex-wrap gap-2">
                {[SENAS_TEXTO, VOZ_SENAS].map((s) => (
                  <Link
                    key={s.ruta}
                    to={s.ruta}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 font-bold backdrop-blur transition-colors hover:bg-white hover:text-marca-800"
                  >
                    <s.icono className="size-5" aria-hidden /> {s.titulo}
                  </Link>
                ))}
              </span>
            </div>
          </motion.div>
          {[
            { s: CONVERSACION, titulo: 'Conversar', texto: 'Pantalla dividida para platicar con alguien.', Icono: CONVERSACION.icono },
            { s: { ruta: '/aprender/juegos' }, titulo: 'Jugar', texto: 'Retos contra reloj, memorama y más.', Icono: Gamepad2 },
          ].map(({ s, titulo, texto, Icono }, i) => (
            <motion.div key={s.ruta} custom={4 + i} variants={aparecer} initial="oculto" animate="visible" whileHover={{ y: -3 }}>
              <Link
                to={s.ruta}
                className="group flex h-full items-center gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-marca-300"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-marca-100 text-marca-800 transition-transform group-hover:scale-110 group-hover:-rotate-6">
                  <Icono className="size-7" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold">{titulo}</span>
                  <span className="block text-sm text-stone-600">{texto}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── 5. Emergencia y lo demás ── */}
      <motion.div custom={6} variants={aparecer} initial="oculto" animate="visible" className="mt-4">
        <Link to={EMERGENCIA.ruta} className="flex items-center gap-4 rounded-3xl bg-red-700 p-4 text-white transition-colors hover:bg-red-800 sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">
            <EMERGENCIA.icono className="size-6" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold">Frases rápidas y emergencia</span>
            <span className="block text-sm text-red-100">Pide ayuda, indica dolor o comparte tu dirección.</span>
          </span>
          <ChevronRight className="size-6 shrink-0" aria-hidden />
        </Link>
      </motion.div>

      <motion.nav custom={7} variants={aparecer} initial="oculto" animate="visible" aria-label="Más secciones" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {otras.map((s) => (
            <li key={s.ruta}>
              <Link
                to={s.ruta}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 font-bold text-stone-700 transition-colors hover:border-marca-300 hover:text-marca-800"
              >
                <s.icono className="size-5 text-marca-700" aria-hidden /> {s.titulo}
              </Link>
            </li>
          ))}
        </ul>
      </motion.nav>
    </>
  )
}
