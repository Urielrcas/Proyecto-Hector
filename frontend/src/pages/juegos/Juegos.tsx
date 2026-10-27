/*
 * PANTALLA: JUEGOS (dentro de Aprendizaje)
 *   - Arriba: tu nivel y la barra de experiencia (XP) hacia el siguiente.
 *   - Los 4 juegos en tarjetas animadas, con el récord y las estrellas de cada uno.
 *   - Insignias: las ganadas a color y las que faltan con candado (y cómo ganarlas).
 *   - Tu avance: últimas partidas y letras que más se fallan (para repasarlas).
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, Camera, Lock, Search, SpellCheck, Star, Timer, Trophy, type LucideIcon } from 'lucide-react'
// ▸ Desde React Router:
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { useApp } from '../../context/AppContext'
import { useRegistroJuegos } from '../../hooks/useRegistroJuegos'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { letrasParaRepasar, mejorPuntaje, type NombreJuego } from '../../lib/juegos/juegos'
import { LOGROS } from '../../lib/juegos/logros'

const JUEGOS: {
  id: NombreJuego
  ruta: string
  titulo: string
  descripcion: string
  icono: LucideIcon
  camara: boolean
  letraDibujo: string // letra cuyo dibujo adorna la tarjeta
}[] = [
  {
    id: 'adivina',
    ruta: '/aprender/juegos/adivina',
    titulo: '¿Qué letra es?',
    descripcion: 'Preguntas rápidas contra reloj. Tienes 3 vidas: ¡no las pierdas!',
    icono: Search,
    camara: false,
    letraDibujo: 'B',
  },
  {
    id: 'memorama',
    ruta: '/aprender/juegos/memorama',
    titulo: 'Memorama',
    descripcion: 'Voltea cartas y junta cada letra con el dibujo de su seña.',
    icono: Brain,
    camara: false,
    letraDibujo: 'L',
  },
  {
    id: 'reto',
    ruta: '/aprender/juegos/reto',
    titulo: 'Reto contra reloj',
    descripcion: 'Haz cada letra con tu mano antes de que se acabe el tiempo, sin ver el dibujo.',
    icono: Timer,
    camara: true,
    letraDibujo: 'Y',
  },
  {
    id: 'palabra',
    ruta: '/aprender/juegos/palabra',
    titulo: 'Deletrea la palabra',
    descripcion: 'Deletrea palabras como HOLA o SOL, letra por letra, con tu cámara.',
    icono: SpellCheck,
    camara: true,
    letraDibujo: 'V',
  },
]

const NOMBRE: Record<NombreJuego, string> = Object.fromEntries(JUEGOS.map((j) => [j.id, j.titulo])) as Record<NombreJuego, string>

export default function Juegos() {
  const { lengua } = useApp()
  const { partidas, nivel, logros } = useRegistroJuegos()
  const letras = alfabeto(lengua ?? 'LSM')
  const repasar = letrasParaRepasar(partidas)
  const ganados = new Set(logros.map((l) => l.id))
  const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <EncabezadoPagina titulo="Juegos" descripcion="Pon a prueba lo que ya aprendiste… ¡y diviértete!" volverA="/aprender" />

      {/* Nivel y experiencia */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="Tu nivel"
        className="relative overflow-hidden rounded-3xl bg-linear-to-br from-marca-700 to-marca-900 p-5 text-white shadow-lg sm:p-7"
      >
        {/* Manos decorativas flotando al fondo */}
        <div className="pointer-events-none absolute -top-4 right-4 hidden w-48 gap-2 opacity-20 sm:flex" aria-hidden>
          {['A', 'M', 'O'].map((l, i) => {
            const letra = letras.find((x) => x.letra === l)
            return (
              letra && (
                <motion.div key={l} className="size-20" animate={{ y: [0, -10, 0], rotate: [0, i % 2 ? 6 : -6, 0] }} transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}>
                  <ManoIlustrada forma={letra.forma} etiqueta="" />
                </motion.div>
              )
            )
          })}
        </div>
        <div className="relative flex flex-wrap items-center gap-5">
          <motion.span
            className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white/15 ring-2 ring-white/30"
            animate={{ rotate: [0, -4, 4, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <span className="text-center leading-none">
              <span className="block text-xs font-bold tracking-wide uppercase opacity-80">Nivel</span>
              <span className="text-4xl font-bold">{nivel.nivel}</span>
            </span>
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{nivel.nombre}</p>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-amber-300 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, nivel.progreso * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1 text-sm opacity-90">
              {nivel.xp} XP · faltan {nivel.hasta - nivel.xp} para el nivel {nivel.nivel + 1}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3">
            <Trophy className="size-6 text-amber-300" aria-hidden />
            <span>
              <span className="block text-2xl font-bold">
                {logros.length}/{LOGROS.length}
              </span>
              <span className="text-sm opacity-90">insignias</span>
            </span>
          </div>
        </div>
      </motion.section>

      {/* Los juegos */}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {JUEGOS.map((j, i) => {
          const mejor = mejorPuntaje(partidas, j.id)
          const estrellasMax = Math.max(0, ...partidas.filter((p) => p.juego === j.id).map((p) => p.estrellas ?? 0))
          const letra = letras.find((l) => l.letra === j.letraDibujo)
          return (
            <motion.li key={j.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
              <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="h-full">
                <Link
                  to={j.ruta}
                  className="group relative flex h-full overflow-hidden rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:border-marca-300 hover:shadow-lg"
                >
                  <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                    <span className="grid size-12 place-items-center rounded-xl bg-marca-100 text-marca-800 transition-transform group-hover:scale-110 group-hover:rotate-6">
                      <j.icono className="size-6" aria-hidden />
                    </span>
                    <span className="mt-3 text-xl font-bold">{j.titulo}</span>
                    <span className="mt-1 flex-1 text-stone-600">{j.descripcion}</span>
                    <span className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      {j.camara && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 font-bold text-stone-600">
                          <Camera className="size-4" aria-hidden /> Con cámara
                        </span>
                      )}
                      <span className="flex" aria-label={`Mejor resultado: ${estrellasMax} estrellas`}>
                        {[0, 1, 2].map((s) => (
                          <Star key={s} className={`size-5 ${s < estrellasMax ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} aria-hidden />
                        ))}
                      </span>
                      <span className="font-bold text-marca-800">{mejor ? `Récord: ${mejor}` : '¡Nuevo!'}</span>
                    </span>
                  </div>
                  {/* Dibujo de una mano que se balancea */}
                  {letra && (
                    <motion.div
                      className="pointer-events-none absolute -right-4 -bottom-4 size-32 opacity-15 transition-opacity group-hover:opacity-30"
                      animate={{ rotate: [0, 8, 0, -8, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden
                    >
                      <ManoIlustrada forma={letra.forma} etiqueta="" />
                    </motion.div>
                  )}
                </Link>
              </motion.div>
            </motion.li>
          )
        })}
      </ul>

      {/* Insignias */}
      <section aria-labelledby="titulo-insignias" className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 id="titulo-insignias" className="text-xl font-bold">
          Insignias
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {LOGROS.map((l) => {
            const tiene = ganados.has(l.id)
            return (
              <li
                key={l.id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${tiene ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tiene ? 'bg-amber-400 text-white shadow' : 'bg-stone-200 text-stone-400'}`}>
                  {tiene ? <l.icono className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className={`block font-bold ${tiene ? '' : 'text-stone-500'}`}>{l.titulo}</span>
                  <span className="block text-xs text-stone-600">{l.descripcion}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Avance: últimas partidas y letras para repasar */}
      <section aria-labelledby="titulo-avance" className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 id="titulo-avance" className="text-xl font-bold">
          Tu avance
        </h2>
        {partidas.length === 0 ? (
          <p className="mt-2 text-stone-600">Todavía no has jugado. ¡Elige un juego y gana tu primera insignia!</p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-sm text-stone-500">
                  <tr>
                    <th className="pb-2 font-bold">Fecha</th>
                    <th className="pb-2 font-bold">Juego</th>
                    <th className="pb-2 font-bold">Estrellas</th>
                    <th className="pb-2 text-right font-bold">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {partidas.slice(0, 8).map((p) => (
                    <tr key={p.fecha} className="border-t border-stone-100">
                      <td className="py-2 text-stone-600">{fecha.format(p.fecha)}</td>
                      <td className="py-2">{NOMBRE[p.juego]}</td>
                      <td className="py-2" aria-label={`${p.estrellas ?? 0} estrellas`}>
                        <span className="flex">
                          {[0, 1, 2].map((s) => (
                            <Star key={s} className={`size-4 ${s < (p.estrellas ?? 0) ? 'fill-amber-400 text-amber-500' : 'text-stone-300'}`} aria-hidden />
                          ))}
                        </span>
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">{p.puntos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-bold">Letras para repasar</h3>
              {repasar.length === 0 ? (
                <p className="mt-2 text-stone-600">¡Ninguna! No has fallado letras en tus últimas partidas.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-stone-600">Las que más has fallado. Tócala para practicarla.</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {repasar.map((l) => (
                      <li key={l}>
                        <Link
                          to={`/aprender/${encodeURIComponent(l)}`}
                          className="grid size-12 place-items-center rounded-xl border-2 border-red-200 bg-red-50 text-xl font-bold text-red-800 hover:bg-red-100"
                          aria-label={`Practicar la letra ${l}`}
                        >
                          {l}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
