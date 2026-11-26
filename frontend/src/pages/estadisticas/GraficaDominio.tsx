/*
 * ESTADÍSTICAS → ¿CUÁNTAS PERSONAS DOMINAN CADA LETRA?
 * El promedio de una letra puede engañar: 50 % puede ser «todos a la mitad» o «la mitad la domina y la otra
 * mitad no puede». Esta gráfica muestra, para cada letra, cuántas personas hay en cada nivel:
 *   0–20 %, 20–40 %, 40–60 %, 60–80 % y 80–100 %.
 * El nivel de una persona en una letra es el promedio de sus últimos 5 intentos (lo calcula el servidor,
 * GET /api/intentos/tablero → «dominio»).
 * Como la base real todavía tiene pocos intentos, se puede cambiar a la demostración de 100 personas
 * simuladas (ml/demo_100_personas.py), siempre marcada como tal.
 */
import { useState } from 'react'
import { DEMO, ETIQUETA_DEMO } from '../../lib/ia/demo/demo'
import type { Lengua } from '../../lib/tipos'
import type { DominioLetra } from '../../services/intentos'

const RANGOS = ['0–20 %', '20–40 %', '40–60 %', '60–80 %', '80–100 %']
const NOMBRES_RANGO = ['casi no le sale', 'le cuesta', 'a medias', 'casi la domina', 'la domina']
// Del rojo (no le sale) al color de la marca (la domina).
const COLORES = ['bg-red-400', 'bg-orange-300', 'bg-amber-200', 'bg-lime-300', 'bg-marca-600']
const TEXTO = ['text-red-950', 'text-orange-950', 'text-amber-950', 'text-lime-950', 'text-white']

type Orden = 'alfabeto' | 'dificil' | 'facil'
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

export function GraficaDominio({ real, lengua }: { real: DominioLetra[] | null; lengua: Lengua }) {
  const hayReales = !!real?.some((d) => d.personas > 0)
  const puedeDemo = lengua === 'LSM'
  const [fuente, setFuente] = useState<'real' | 'demo'>(hayReales || !puedeDemo ? 'real' : 'demo')
  const [orden, setOrden] = useState<Orden>('alfabeto')
  const [elegida, setElegida] = useState<string | null>(null)

  const datos = (fuente === 'demo' ? DEMO.dominio : (real ?? [])).filter((d) => d.personas > 0)
  const ordenados = [...datos].sort((a, b) => (orden === 'dificil' ? a.promedio - b.promedio : orden === 'facil' ? b.promedio - a.promedio : 0))
  const detalle = datos.find((d) => d.letra === elegida) ?? null
  const totalPersonas = datos.reduce((s, d) => s + d.personas, 0)
  const dominan = datos.reduce((s, d) => s + d.rangos[4], 0)
  const noLeSale = datos.reduce((s, d) => s + d.rangos[0] + d.rangos[1], 0)

  return (
    <figure className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <figcaption className="font-bold">¿Cuántas personas dominan cada letra?</figcaption>
          <p className="mt-1 text-sm text-stone-600">
            Cada barra es una letra, dividida según el nivel de cada persona (el promedio de sus últimos 5 intentos). Toca una letra para ver el detalle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {puedeDemo && (
            <div role="group" aria-label="Datos" className="flex rounded-xl border-2 border-stone-200 p-0.5">
              {(['real', 'demo'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={fuente === f}
                  onClick={() => (setFuente(f), setElegida(null))}
                  className={`min-h-9 rounded-lg px-3 font-bold ${fuente === f ? 'bg-marca-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                  {f === 'real' ? 'Datos reales' : 'Demostración'}
                </button>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2">
            <span className="font-bold">Ordenar</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="min-h-9 rounded-xl border-2 border-stone-200 px-2">
              <option value="alfabeto">Por letra</option>
              <option value="dificil">Más difíciles primero</option>
              <option value="facil">Más fáciles primero</option>
            </select>
          </label>
        </div>
      </div>

      {fuente === 'demo' && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <b>{ETIQUETA_DEMO}.</b> No son personas reales: sirven para ver cómo se lee la gráfica mientras se juntan intentos reales.
        </p>
      )}

      {/* Leyenda */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {RANGOS.map((r, i) => (
          <li key={r} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded ${COLORES[i]}`} aria-hidden />
            {r} · {NOMBRES_RANGO[i]}
          </li>
        ))}
      </ul>

      {datos.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          Todavía no hay intentos reales en {lengua}.{puedeDemo ? ' Cambia a «Demostración» para ver un ejemplo.' : ''}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5">
            {ordenados.map((d) => (
              <li key={d.letra}>
                <button
                  type="button"
                  onClick={() => setElegida(elegida === d.letra ? null : d.letra)}
                  aria-pressed={elegida === d.letra}
                  aria-label={`${d.letra}: ${d.personas} personas. ${d.rangos.map((n, i) => `${n} en ${RANGOS[i]}`).join(', ')}. Promedio ${Math.round(d.promedio)} %`}
                  className={`grid w-full grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2 rounded-lg px-1 py-0.5 text-left sm:grid-cols-[2.5rem_1fr_9rem] ${elegida === d.letra ? 'bg-marca-50 ring-2 ring-marca-600' : 'hover:bg-stone-50'}`}
                >
                  <span className="text-center text-lg font-bold">{d.letra}</span>
                  <span className="flex h-6 overflow-hidden rounded-md bg-stone-100" aria-hidden>
                    {d.rangos.map((n, i) =>
                      n ? (
                        <span
                          key={i}
                          title={`${RANGOS[i]}: ${n} ${n === 1 ? 'persona' : 'personas'} (${pct(n, d.personas)} %)`}
                          className={`grid place-items-center text-[11px] font-bold tabular-nums ${COLORES[i]} ${TEXTO[i]}`}
                          style={{ width: `${(n / d.personas) * 100}%` }}
                        >
                          {n / d.personas >= 0.08 ? n : ''}
                        </span>
                      ) : null,
                    )}
                  </span>
                  <span className="text-right text-xs leading-tight whitespace-nowrap tabular-nums text-stone-600">
                    <b className="text-stone-800">{d.personas}</b> pers.
                    <span className="hidden sm:inline"> · prom. {Math.round(d.promedio)} %</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {detalle ? (
            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
              <p>
                De las <b>{detalle.personas}</b> personas que practicaron la <b>{detalle.letra}</b> (promedio {Math.round(detalle.promedio)} %):
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {[...detalle.rangos.keys()].reverse().map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`inline-block size-3 shrink-0 rounded ${COLORES[i]}`} aria-hidden />
                    <span>
                      <b className="tabular-nums">{detalle.rangos[i]}</b> ({pct(detalle.rangos[i], detalle.personas)} %) están en {RANGOS[i]}: {NOMBRES_RANGO[i]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-600">
              Sumando todas las letras: en el <b>{pct(dominan, totalPersonas)} %</b> de los casos la persona ya domina la letra (80–100 %), y en el{' '}
              <b>{pct(noLeSale, totalPersonas)} %</b> todavía le cuesta mucho (menos de 40 %).
            </p>
          )}
        </>
      )}
    </figure>
  )
}
