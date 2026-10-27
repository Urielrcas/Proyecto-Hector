/*
 * COMPONENTE: RESULTADO DE UNA PARTIDA
 * La «celebración» al terminar:
 *   - 0 a 3 estrellas que aparecen una por una y los puntos contando hacia arriba,
 *   - confeti y fanfarria si fue récord o sacó 2 o más estrellas,
 *   - barra de nivel que se llena con la experiencia ganada («¡Subiste a nivel 3!»),
 *   - insignias nuevas desbloqueadas,
 *   - letras falladas (cada una lleva a practicarla).
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { ArrowUp, RotateCcw } from 'lucide-react'
// ▸ Desde React:
import { useEffect, useState } from 'react'
// ▸ Desde React Router:
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { Boton, BotonEnlace } from '../../components/Boton'
import { Confeti } from '../../components/juegos/Confeti'
import { ContadorAnimado, Estrellas } from '../../components/juegos/PiezasJuego'
import type { Recompensa } from '../../hooks/useRegistroJuegos'
import { sonidos } from '../../lib/juegos/sonidos'

const MENSAJES = ['¡Sigue practicando!', '¡Buen intento!', '¡Muy bien!', '¡Increíble!']

export function ResultadoJuego({
  puntos,
  estrellas,
  datos,
  mejorAnterior,
  recompensa,
  falladas,
  alRepetir,
}: {
  puntos: number
  estrellas: number
  datos: { etiqueta: string; valor: string }[] // ej.: [{ etiqueta: 'Aciertos', valor: '7 de 10' }]
  mejorAnterior: number
  recompensa: Recompensa | null
  falladas: string[]
  alRepetir: () => void
}) {
  const record = puntos > mejorAnterior && puntos > 0
  const celebrar = record || estrellas >= 2
  const [confeti, setConfeti] = useState(0)
  const subioNivel = recompensa && recompensa.nivelDespues.nivel > recompensa.nivelAntes.nivel
  const nivel = recompensa?.nivelDespues

  // Al aparecer: fanfarria, confeti y brillo por cada insignia nueva.
  useEffect(() => {
    if (celebrar) {
      sonidos.victoria()
      const t = setTimeout(() => setConfeti((n) => n + 1), 300)
      return () => clearTimeout(t)
    }
    sonidos.cuenta()
  }, [celebrar])
  useEffect(() => {
    if (!recompensa?.logros.length && !subioNivel) return
    const t = setTimeout(() => {
      sonidos.brillo()
      setConfeti((n) => n + 1)
    }, 1600)
    return () => clearTimeout(t)
  }, [recompensa, subioNivel])

  return (
    <>
      <Confeti disparo={confeti} cantidad={160} />
      <motion.section
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        aria-labelledby="titulo-resultado"
        className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-stone-200 bg-white text-center shadow-sm"
      >
        {/* Cabecera con estrellas */}
        <div className="bg-linear-to-b from-marca-50 to-white px-6 pt-8 pb-4">
          <Estrellas cantidad={estrellas} />
          <motion.h2
            id="titulo-resultado"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mt-4 text-3xl font-bold"
          >
            {MENSAJES[estrellas]}
          </motion.h2>
          <p className="mt-2 text-5xl font-bold text-marca-800 tabular-nums">
            <ContadorAnimado valor={puntos} /> <span className="text-xl text-stone-500">puntos</span>
          </p>
          {record ? (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ delay: 1.3, duration: 0.5 }}
              className="mt-3 inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800"
              role="status"
            >
              🏆 ¡Nuevo récord!
            </motion.p>
          ) : (
            <p className="mt-3 text-stone-600">Tu récord: {mejorAnterior}</p>
          )}
        </div>

        <div className="px-6 pb-8">
          {/* Datos de la partida */}
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {datos.map((d) => (
              <div key={d.etiqueta} className="rounded-2xl bg-stone-50 p-3">
                <dt className="text-sm text-stone-600">{d.etiqueta}</dt>
                <dd className="text-xl font-bold">{d.valor}</dd>
              </div>
            ))}
          </dl>

          {/* Nivel: la barra se llena con la XP ganada */}
          {nivel && recompensa && (
            <div className="mt-6 rounded-2xl border border-marca-200 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">
                  Nivel {nivel.nivel} · {nivel.nombre}
                </p>
                <p className="text-sm font-bold text-marca-800">+{puntos} XP</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-marca-500 to-marca-700"
                  initial={{ width: `${subioNivel ? 0 : recompensa.nivelAntes.progreso * 100}%` }}
                  animate={{ width: `${nivel.progreso * 100}%` }}
                  transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {nivel.hasta - nivel.xp} XP para el nivel {nivel.nivel + 1}
              </p>
              {subioNivel && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6, type: 'spring' }}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-marca-700 py-2 font-bold text-white"
                  role="status"
                >
                  <ArrowUp className="size-5" aria-hidden /> ¡Subiste a nivel {nivel.nivel}!
                </motion.p>
              )}
            </div>
          )}

          {/* Insignias nuevas */}
          {recompensa && recompensa.logros.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold">¡Insignia nueva!</h3>
              <ul className="mt-3 flex flex-wrap justify-center gap-3">
                {recompensa.logros.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 1.6 + i * 0.2, type: 'spring', stiffness: 260, damping: 12 }}
                    className="flex w-36 flex-col items-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-3"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-amber-400 text-white shadow">
                      <l.icono className="size-6" aria-hidden />
                    </span>
                    <span className="mt-2 font-bold">{l.titulo}</span>
                    <span className="text-xs text-stone-600">{l.descripcion}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {falladas.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="font-bold">Letras para repasar</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {falladas.map((l) => (
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
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Boton onClick={alRepetir} autoFocus>
              <RotateCcw className="size-5" aria-hidden />
              Jugar otra vez
            </Boton>
            <BotonEnlace to="/aprender/juegos" variante="secundario">
              Otros juegos
            </BotonEnlace>
          </div>
        </div>
      </motion.section>
    </>
  )
}
