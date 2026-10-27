/*
 * PANTALLA: AYUDA Y ACERCA DE
 * Preguntas frecuentes agrupadas por tema, con un buscador que filtra mientras se escribe
 * (busca en la pregunta y en la respuesta, sin importar acentos ni mayúsculas).
 * Al final, «Acerca de»: qué es la app, fuentes del alfabeto, privacidad y tecnologías.
 */

// ▸ Desde Lucide (librería de íconos):
import { CircleHelp, Gamepad2, Info, Rocket, Search } from 'lucide-react'
// ▸ Desde React:
//     useState → guarda lo que se escribe en el buscador
import { useState } from 'react'
// ▸ Desde React Router:
//     Link → enlace a otra pantalla
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { FUENTE_ASL, FUENTE_LSM } from '../../lib/aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/ayuda.ts:
//     filtrarTemas → busca en las preguntas;  TEMAS → todas las preguntas por tema
import { filtrarTemas, TEMAS } from '../../lib/ayuda'

export default function Ayuda() {
  const [busqueda, setBusqueda] = useState('')
  const temas = filtrarTemas(TEMAS, busqueda)

  return (
    <>
      <EncabezadoPagina titulo="Ayuda" descripcion="Cómo usar la aplicación y respuestas a dudas comunes." icono={CircleHelp} />

      <div className="relative">
        <label htmlFor="buscar-ayuda" className="sr-only">
          Buscar en la ayuda
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
        <input
          id="buscar-ayuda"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="¿Qué necesitas? Ej.: cámara, voz, historial…"
          className="min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-white py-3 pr-4 pl-12 text-lg focus:border-marca-600 focus:outline-none"
        />
      </div>

      {/* Índice de temas (solo sin búsqueda) */}
      {!busqueda.trim() && (
        <nav aria-label="Temas" className="mt-4 flex flex-wrap gap-2">
          {TEMAS.map((t) => (
            <a key={t.id} href={`#tema-${t.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-700 hover:border-marca-300 hover:bg-marca-50">
              <t.icono className="size-4 text-marca-700" aria-hidden />
              {t.titulo}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2" aria-live="polite">
        {temas.length === 0 ? (
          <p className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-stone-600 lg:col-span-2">
            No encontramos nada sobre «{busqueda.trim()}». Prueba con otra palabra, como «cámara» o «voz».
          </p>
        ) : (
          temas.map((t) => (
            <section key={t.id} id={`tema-${t.id}`} aria-labelledby={`titulo-${t.id}`} className="scroll-mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={`titulo-${t.id}`} className="flex items-center gap-3 text-lg font-bold">
                  <span className="grid size-10 place-items-center rounded-xl bg-marca-100 text-marca-800">
                    <t.icono className="size-5" aria-hidden />
                  </span>
                  {t.titulo}
                </h2>
                {t.ruta && (
                  <Link to={t.ruta} className="text-sm font-bold text-marca-800 hover:underline">
                    Ir a la pantalla →
                  </Link>
                )}
              </div>
              <div className="mt-4 divide-y divide-stone-100">
                {t.preguntas.map((p) => (
                  <details key={p.pregunta} className="group py-3" open={!!busqueda.trim()}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                      {p.pregunta}
                      <span className="text-xl text-marca-700 transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-stone-700">{p.respuesta}</p>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Acerca de */}
      <section aria-labelledby="titulo-acerca" className="mt-6 rounded-3xl border border-marca-200 bg-marca-50/60 p-5 sm:p-7">
        <h2 id="titulo-acerca" className="flex items-center gap-3 text-xl font-bold">
          <Info className="size-6 text-marca-800" aria-hidden />
          Acerca de
        </h2>
        <p className="mt-3 text-stone-700">
          <strong>Traductor e Intérprete Asistivo de Lengua de Señas</strong> — versión 0.1 (prototipo). Traduce el alfabeto dactilológico
          de LSM y ASL a texto y voz, y del español a señas.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-bold">Fuentes del alfabeto</dt>
            <dd className="mt-1 text-stone-700">
              LSM: {FUENTE_LSM}.<br />
              ASL: {FUENTE_ASL}.
            </dd>
          </div>
          <div>
            <dt className="font-bold">Privacidad</dt>
            <dd className="mt-1 text-stone-700">El video no sale de tu equipo. Tu historial es privado y puedes borrarlo cuando quieras.</dd>
          </div>
          <div>
            <dt className="font-bold">Cómo funciona</dt>
            <dd className="mt-1 text-stone-700">
              La cámara detecta 21 puntos de la mano; reglas de lógica proposicional deciden qué letra es. Las búsquedas de rutas usan BFS,
              DFS, costo uniforme, voraz y A*.
            </dd>
          </div>
          <div>
            <dt className="font-bold">Limitaciones</dt>
            <dd className="mt-1 text-stone-700">
              Por ahora solo reconoce el alfabeto (deletreo). Las palabras completas y el avatar 3D llegarán más adelante.
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
          <Link to="/bienvenida" className="inline-flex items-center gap-1.5 text-marca-800 hover:underline">
            <Rocket className="size-4" aria-hidden /> Ver la bienvenida otra vez
          </Link>
          <Link to="/aprender/juegos" className="inline-flex items-center gap-1.5 text-marca-800 hover:underline">
            <Gamepad2 className="size-4" aria-hidden /> Practicar con juegos
          </Link>
        </div>
      </section>
    </>
  )
}
