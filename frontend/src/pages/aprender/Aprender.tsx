/*
 * PANTALLA: APRENDIZAJE (camino de niveles)
 *   Arriba: el mapa con los niveles (components/MapaCamino.tsx, armado con BFS en lib/aprendizaje/camino.ts)
 *   y Mani con tu progreso. Abajo: todas las letras para ir directo a una.
 * Muestra el alfabeto de la lengua elegida (LSM o ASL) en una cuadrícula, la barra de progreso
 * el acceso a la «Ruta de aprendizaje» (/aprender/ruta, búsqueda DFS/BFS), a «Juegos» (/aprender/juegos) y la sección
 * "Palabras y frases" (/aprender/palabras, por tema). Al tocar una letra abre /aprender/LETRA.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: BookOpen (libro abierto), Brain (cerebro), Check (palomita ✓), Gamepad2 (control de videojuego), HeartHandshake (corazón con manos), MessageCircle (globo de mensaje), Move (flechas de movimiento), Route (ruta), Siren (sirena), LucideIcon (tipo: cualquier ícono de Lucide)
import { BookOpen, Brain, Check, Gamepad2, HeartHandshake, MessageCircle, Move, Route, Siren, type LucideIcon } from 'lucide-react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde Framer Motion (librería de animaciones): motion → etiquetas animables
import { motion } from 'framer-motion'
// ▸ Desde nuestro proyecto: MapaCamino (el sendero de niveles) y Mani (Acompanante, la mascota)
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { MapaCamino } from '../../components/MapaCamino'
import { Acompanante, type Animo } from '../../components/Mascota'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useProgresoAprendizaje.ts:
//     useProgresoAprendizaje → hook con las letras logradas por el usuario
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
// ▸ Desde nuestro proyecto: src/hooks/useModeloIA.ts:
//     useModeloIA → recomendaciones de la IA (qué letra practicar y por qué)
import { useModeloIA } from '../../hooks/useModeloIA'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → devuelve las letras de LSM o ASL con sus pasos y forma
//     FUENTE_ASL → nombre de la fuente de ASL
//     FUENTE_LSM → nombre del diccionario de LSM (para citar la fuente)
import { alfabeto, FUENTE_ASL, FUENTE_LSM } from '../../lib/aprendizaje/alfabeto'
import { armarCamino } from '../../lib/aprendizaje/camino'
// ▸ Desde nuestro proyecto: palabras por tema y el avance en ellas
import { CATEGORIAS, palabrasDe, type Categoria } from '../../lib/aprendizaje/palabras'
import { useProgresoPalabras } from '../../hooks/useProgresoPalabras'

// Temas de "Palabras y frases" (las palabras están en lib/aprendizaje/palabras.ts).
const TEMAS_PALABRAS: { tema: Categoria; icono: LucideIcon }[] = [
  { tema: 'saludos', icono: MessageCircle },
  { tema: 'necesidades', icono: HeartHandshake },
  { tema: 'emergencias', icono: Siren },
]

export default function Aprender() {
  const { lengua } = useApp() // LSM o ASL (se cambia en el menú lateral)
  const { logradas } = useProgresoAprendizaje() // letras ya logradas
  const { recomendaciones } = useModeloIA() // la IA dice qué practicar
  const { practicadas: palabrasPracticadas } = useProgresoPalabras() // palabras ya deletreadas
  const letras = alfabeto(lengua ?? 'LSM') // las 27 letras de LSM o las 26 de ASL
  const logradasAqui = letras.filter((l) => logradas.includes(l.letra)).length // cuántas lleva
  const porcentaje = Math.round((logradasAqui / letras.length) * 100) // para la barra de progreso
  const camino = armarCamino(lengua ?? 'LSM', logradas) // niveles ordenados con BFS (lib/aprendizaje/camino.ts)
  const actual = camino.find((p) => p.estado === 'actual')

  // Lo que dice Mani según el avance.
  const mani: { animo: Animo; mensaje: string } =
    porcentaje === 100
      ? { animo: 'fiesta', mensaje: '¡Completaste todo el alfabeto! Ahora deletrea palabras.' }
      : logradasAqui === 0
        ? { animo: 'hola', mensaje: '¡Empecemos! Toca el nivel 1 y elige una letra.' }
        : actual?.tipo === 'nivel'
          ? { animo: 'feliz', mensaje: `Vas en el nivel ${actual.numero}: te ${actual.letras.length - actual.logradas === 1 ? 'falta 1 letra' : `faltan ${actual.letras.length - actual.logradas} letras`}.` }
          : { animo: 'feliz', mensaje: '¡Toca el reto para poner a prueba lo que sabes!' }

  return (
    <>
      <EncabezadoPagina titulo="Aprendizaje" descripcion="Avanza por el camino: cada nivel junta letras que se parecen." icono={BookOpen} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── El camino de niveles ── */}
        <section aria-labelledby="titulo-camino" className="rounded-3xl border border-stone-200 bg-gradient-to-b from-marca-50/70 to-white p-5 shadow-sm sm:p-7">
          <h2 id="titulo-camino" className="text-xl font-bold">
            Tu camino · {lengua}
          </h2>
          <p className="mt-1 text-stone-600">Toca un nivel para ver sus letras. Cada 2 niveles hay un reto.</p>
          <div className="mt-4">
            <MapaCamino paradas={camino} logradas={logradas} />
          </div>
        </section>

        {/* ── Columna derecha: Mani, progreso, IA, ruta y juegos ── */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <section aria-label="Tu progreso" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-20" />
            <div className="mt-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Tu progreso</span>
                <span className="text-stone-600">
                  {logradasAqui} de {letras.length} letras
                </span>
              </div>
              <div
                className="mt-1.5 h-3 overflow-hidden rounded-full bg-stone-200"
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del alfabeto"
              >
                <motion.div
                  className="h-full rounded-full bg-marca-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentaje}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
          </section>

          {/* Recomendaciones de la IA (modelo del estudiante) */}
          {recomendaciones.length > 0 && (
            <section aria-labelledby="titulo-ia" className="rounded-3xl border border-marca-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-ia" className="flex items-center gap-2 font-bold">
                  <Brain className="size-5 text-marca-700" aria-hidden /> Tu IA te recomienda
                </h2>
                <Link to="/mi-ia" className="text-sm font-bold text-marca-800 hover:underline">
                  ¿Cómo lo sabe? →
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {recomendaciones.slice(0, 3).map((r) => (
                  <li key={r.letra}>
                    <Link
                      to={`/aprender/${encodeURIComponent(r.letra)}`}
                      className="flex items-center gap-3 rounded-2xl border border-stone-200 p-2.5 transition-colors hover:border-marca-300 hover:bg-marca-50"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-100 text-lg font-bold text-marca-800">{r.letra}</span>
                      <span className="text-sm text-stone-700">{r.motivo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Atajos: Ruta de aprendizaje (DFS/BFS hacia una letra) y Juegos */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/aprender/ruta"
              className="group rounded-3xl border border-marca-200 bg-marca-50/60 p-4 transition-colors hover:bg-marca-100/70"
            >
              <Route className="size-7 text-marca-700 transition-transform group-hover:-translate-y-0.5" aria-hidden />
              <span className="mt-2 block font-bold">Ruta a una letra</span>
              <span className="block text-sm text-stone-600">Llega a la letra que quieras paso a paso.</span>
            </Link>
            <Link
              to="/aprender/juegos"
              className="group rounded-3xl border border-marca-200 bg-marca-50/60 p-4 transition-colors hover:bg-marca-100/70"
            >
              <Gamepad2 className="size-7 text-marca-700 transition-transform group-hover:-rotate-12" aria-hidden />
              <span className="mt-2 block font-bold">Juegos</span>
              <span className="block text-sm text-stone-600">Ponte a prueba contra reloj.</span>
            </Link>
          </div>
        </aside>
      </div>

      {/* Todas las letras: para ir directo a cualquiera. Las logradas se ven en verde con ✓. */}
      <section aria-labelledby="titulo-alfabeto" className="mt-8">
        <h2 id="titulo-alfabeto" className="text-xl font-bold">
          Todas las letras
        </h2>
        <p className="mt-1 text-stone-600">¿Quieres saltar a una letra? Tócala para ver cómo se hace y practicarla.</p>
        <ul className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7 sm:gap-3 lg:grid-cols-9 xl:grid-cols-14">
          {letras.map((l, i) => {
            const lograda = logradas.includes(l.letra)
            const descripcion = [lograda && 'lograda', l.movimiento && 'con movimiento'].filter(Boolean).join(', ')
            return (
              <motion.li key={l.letra} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.015 }}>
                <Link
                  to={`/aprender/${encodeURIComponent(l.letra)}`}
                  className={`relative grid aspect-square place-items-center rounded-2xl border-2 text-2xl font-bold transition-all hover:-translate-y-0.5 ${
                    lograda
                      ? 'border-marca-300 bg-marca-50 text-marca-800 hover:bg-marca-100'
                      : 'border-stone-200 bg-white text-stone-900 hover:border-marca-300 hover:bg-marca-50/50'
                  }`}
                  aria-label={`Letra ${l.letra}${descripcion ? `: ${descripcion}` : ''}`}
                  title={descripcion || undefined}
                >
                  {l.letra}
                  {lograda && (
                    <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-marca-600 text-white">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  {l.movimiento && <Move className="absolute bottom-1 size-3.5 text-stone-400" aria-hidden />}
                </Link>
              </motion.li>
            )
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-2">
            <Move className="size-4 text-stone-400" aria-hidden /> Con movimiento
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-4 rounded-md border-2 border-marca-300 bg-marca-50" aria-hidden /> Lograda
          </span>
        </div>
        <p className="mt-3 text-sm text-stone-500">Fuente de las descripciones: {lengua === 'ASL' ? FUENTE_ASL : FUENTE_LSM}.</p>
      </section>

      {/* "Palabras y frases": un tema por tarjeta, con cuántas palabras ya deletreaste */}
      <section aria-labelledby="titulo-palabras" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="titulo-palabras" className="text-xl font-bold">
            Palabras y frases
          </h2>
          <Link to="/aprender/palabras" className="font-bold text-marca-800 hover:underline">
            Ver todas
          </Link>
        </div>
        <p className="mt-1 text-stone-600">Señas de palabras completas, tomadas del diccionario.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TEMAS_PALABRAS.map(({ tema, icono: Icono }) => {
            const delTema = palabrasDe(lengua ?? 'LSM', tema)
            const hechas = delTema.filter((p) => palabrasPracticadas.includes(p.id)).length
            return (
              <li key={tema}>
                <Link
                  to={`/aprender/palabras?tema=${tema}`}
                  className="group flex h-full items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-700 transition-transform group-hover:scale-110">
                    <Icono className="size-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-stone-900">{CATEGORIAS[tema].titulo}</span>
                    <span className="block truncate text-sm text-stone-500">{delTema.slice(0, 3).map((p) => p.palabra).join(', ')}…</span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
                      <span className="block h-full rounded-full bg-marca-500" style={{ width: `${(hechas / delTema.length) * 100}%` }} />
                    </span>
                  </span>
                  <span className="text-sm font-bold text-stone-500">
                    {hechas}/{delTema.length}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
