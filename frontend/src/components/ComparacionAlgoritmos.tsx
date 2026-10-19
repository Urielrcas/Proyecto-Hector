/*
 * COMPONENTE: COMPARACIÓN DE LOS 5 ALGORITMOS DE BÚSQUEDA (BFS, DFS, UCS, Greedy y A*)
 * Basado en la práctica p30algoritmosbusquedacompara.py, aplicado a la ruta de aprendizaje:
 *   - costo de un paso = cuántos detalles de la mano cambian entre dos letras,
 *   - heurística h(n) = cuántos detalles le faltan a la letra para ser la meta.
 * Muestra:
 *   1. Tabla comparativa: ruta, pasos, costo y letras expandidas de cada algoritmo.
 *   2. Dos gráficas de barras (SVG propio): letras expandidas y costo de la ruta.
 *   3. El algoritmo elegido en detalle: su ruta en el grafo y cada expansión con g, h y f.
 *   4. Una interpretación escrita a partir de los resultados.
 * Se usa en la pantalla «Ruta de aprendizaje» (pages/aprender/RutaAprendizaje.tsx).
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: CircleCheck (círculo con palomita), Star (estrella)
import { CircleCheck, Star } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from './Aviso'
// ▸ Desde nuestro proyecto: src/components/GrafoBusqueda.tsx:
//     GrafoBusqueda → dibujo del grafo de letras con el recorrido de la búsqueda
import { GrafoBusqueda } from './GrafoBusqueda'
// ▸ Desde nuestro proyecto: src/services/busqueda.ts:
//     ClaveAlgoritmo → tipo: 'bfs' | 'dfs' | 'ucs' | 'greedy' | 'astar'
//     Comparacion → tipo: resultado de los 5 algoritmos
//     ResultadoBusqueda → tipo: lo que dibuja GrafoBusqueda
//     ResultadoComparado → tipo: resultado de un algoritmo
import type { ClaveAlgoritmo, Comparacion, ResultadoBusqueda, ResultadoComparado } from '../services/busqueda'

// Con qué decide cada algoritmo qué letra revisar después (como la «interpretación didáctica» de la práctica).
const DECIDE_CON: Record<ClaveAlgoritmo, string> = {
  bfs: 'Menos pasos',
  dfs: 'Lo más profundo primero',
  ucs: 'Menor costo g(n)',
  greedy: 'Menor heurística h(n)',
  astar: 'Menor f(n) = g(n) + h(n)',
}

const flechas = (letras: string[] | null) => (letras ? letras.join(' → ') : 'Sin ruta')

/** Gráfica de barras horizontales hecha con SVG (sin librerías). */
function Barras({
  titulo,
  subtitulo,
  datos,
  seleccionado,
}: {
  titulo: string
  subtitulo: string
  datos: { clave: ClaveAlgoritmo; nombre: string; valor: number | null; mejor: boolean }[]
  seleccionado: ClaveAlgoritmo
}) {
  const ANCHO = 360
  const FILA = 34
  const IZQ = 64 // espacio para el nombre del algoritmo
  const DER = 44 // espacio para el valor
  const maximo = Math.max(1, ...datos.map((d) => d.valor ?? 0))
  return (
    <figure className="rounded-2xl border border-stone-200 p-4">
      <figcaption>
        <span className="block font-bold">{titulo}</span>
        <span className="block text-sm text-stone-600">{subtitulo}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${ANCHO} ${datos.length * FILA + 8}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`${titulo}: ${datos.map((d) => `${d.nombre} ${d.valor ?? 'sin ruta'}`).join(', ')}`}
      >
        {datos.map((d, i) => {
          const y = i * FILA + 4
          const largo = d.valor === null ? 0 : ((ANCHO - IZQ - DER) * d.valor) / maximo
          const elegido = d.clave === seleccionado
          return (
            <g key={d.clave}>
              <text x={IZQ - 10} y={y + 15} textAnchor="end" fontSize={13} fontWeight={elegido ? 700 : 400} fill="#1c1917">
                {d.nombre}
              </text>
              {/* Riel gris y barra: oscura si es el algoritmo elegido, clara si no (sin barra si no hay valor) */}
              <rect x={IZQ} y={y + 3} width={ANCHO - IZQ - DER} height={22} rx={5} fill="#f5f5f4" />
              {d.valor !== null && <rect x={IZQ} y={y + 3} width={Math.max(largo, 2)} height={22} rx={5} fill={elegido ? '#13695d' : '#6dd8c1'} />}
              <text x={IZQ + largo + 6} y={y + 19} fontSize={13} fontWeight={700} fill={d.mejor ? '#c2410c' : '#1c1917'}>
                {d.valor ?? '—'}
                {d.mejor ? ' ★' : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

export function ComparacionAlgoritmos({
  comparacion,
  letras,
  grafo,
  inicio,
  objetivo,
}: {
  comparacion: Comparacion
  letras: string[]
  grafo: Record<string, string[]>
  inicio: string
  objetivo: string
}) {
  const [seleccionado, setSeleccionado] = useState<ClaveAlgoritmo>('astar')
  const { resultados } = comparacion
  const por = Object.fromEntries(resultados.map((r) => [r.algoritmo, r])) as Record<ClaveAlgoritmo, ResultadoComparado>
  const elegido = por[seleccionado]
  const hayRuta = resultados.some((r) => r.camino)

  // Los mejores valores: ruta más barata y menos letras expandidas (entre las que sí encontraron ruta).
  const costoMinimo = Math.min(...resultados.map((r) => r.costo ?? Infinity))
  const pasosMinimos = Math.min(...resultados.filter((r) => r.camino).map((r) => r.pasos))
  const expandidosMinimos = Math.min(...resultados.filter((r) => r.costo === costoMinimo).map((r) => r.expandidos.length))

  // GrafoBusqueda dibuja un ResultadoBusqueda: se arma uno con las letras expandidas y la ruta del algoritmo elegido.
  const paraDibujo: ResultadoBusqueda = {
    algoritmo: 'bfs',
    inicio,
    objetivo,
    limite: null,
    orden_exploracion: elegido.expandidos.map((e) => ({ nodo: e.nodo, profundidad: 0 })),
    visitados: elegido.expandidos.map((e) => e.nodo),
    rutas: elegido.camino ? [elegido.camino] : [],
    ciclos_evitados: [],
    repetidos_evitados: 0,
    cortes_por_limite: [],
    ramas_cortadas: 0,
    truncado: false,
  }

  // Qué columnas tiene la tabla de expansión según el algoritmo.
  const columnas: { titulo: string; valor: (i: number) => string }[] =
    seleccionado === 'bfs' || seleccionado === 'dfs'
      ? [{ titulo: 'Profundidad', valor: (i) => String(elegido.expandidos[i].profundidad) }]
      : [
          ...(seleccionado !== 'greedy' ? [{ titulo: 'g (costo)', valor: (i: number) => String(elegido.expandidos[i].g) }] : []),
          ...(seleccionado !== 'ucs' ? [{ titulo: 'h (falta)', valor: (i: number) => String(elegido.expandidos[i].h) }] : []),
          ...(seleccionado === 'astar' ? [{ titulo: 'f = g + h', valor: (i: number) => String(elegido.expandidos[i].f) }] : []),
        ]

  // Interpretación escrita a partir de los resultados.
  const { bfs, dfs, ucs, greedy, astar } = por
  const interpretacion: string[] = hayRuta
    ? [
        `BFS buscó la ruta con menos pasos (${bfs.pasos}): ${flechas(bfs.camino)}, que cuesta ${bfs.costo} cambios de la mano.`,
        `UCS y A* buscaron la ruta más barata: ${flechas(astar.camino)}, con ${astar.costo} cambios${
          astar.costo === bfs.costo ? ', igual que BFS en este caso' : `; ${(bfs.costo ?? 0) - (astar.costo ?? 0)} menos que la de BFS`
        }.`,
        astar.expandidos.length < ucs.expandidos.length
          ? `A* revisó ${astar.expandidos.length} letras y UCS ${ucs.expandidos.length}: la heurística le ahorró ${ucs.expandidos.length - astar.expandidos.length} letras sin perder la mejor ruta.`
          : `A* y UCS revisaron casi las mismas letras (${astar.expandidos.length} y ${ucs.expandidos.length}): aquí la heurística ayudó poco.`,
        greedy.costo === costoMinimo
          ? `Greedy solo siguió la heurística, revisó ${greedy.expandidos.length} letras y esta vez también dio una ruta de costo mínimo.`
          : `Greedy solo siguió la heurística: revisó ${greedy.expandidos.length} letras, pero su ruta cuesta ${greedy.costo} (no es la más barata).`,
        `DFS devolvió la primera ruta que encontró al profundizar: ${flechas(dfs.camino)} (${dfs.pasos} pasos, costo ${dfs.costo}).`,
      ]
    : []

  return (
    <section aria-labelledby="titulo-comparacion" className="mt-8 space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="titulo-comparacion" className="text-lg font-bold">
          Comparación de algoritmos: {inicio} → {objetivo}
        </h2>
        <p className="text-stone-600">
          Los cinco algoritmos buscan con el mismo grafo. El <strong>costo</strong> de un paso es cuántos detalles de la mano cambian; la{' '}
          <strong>heurística h(n)</strong> es cuántos detalles le faltan a una letra para ser {objetivo}.
        </p>
        {comparacion.heuristica_consistente && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-marca-50 px-3 py-1 text-sm font-bold text-marca-800">
            <CircleCheck className="size-4" aria-hidden /> Heurística consistente: nunca sobreestima, así que A* garantiza la ruta más barata.
          </p>
        )}

        {!hayRuta && (
          <div className="mt-4">
            <Aviso tipo="error">Ningún algoritmo encontró ruta: estas letras están en grupos distintos del grafo.</Aviso>
          </div>
        )}

        {/* ── 1. Tabla comparativa ── */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b-2 border-stone-200 text-sm text-stone-600">
                <th className="py-2 pr-3">Algoritmo</th>
                <th className="py-2 pr-3">Decide con</th>
                <th className="py-2 pr-3">Ruta</th>
                <th className="py-2 pr-3 text-right">Pasos</th>
                <th className="py-2 pr-3 text-right">Costo</th>
                <th className="py-2 text-right">Letras expandidas</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => {
                const elegidoAqui = r.algoritmo === seleccionado
                return (
                  <tr key={r.algoritmo} className={`border-b border-stone-100 ${elegidoAqui ? 'bg-marca-50' : ''}`}>
                    <td className="py-2 pr-3">
                      {/* El nombre es un botón: elige el algoritmo que se ve en detalle abajo */}
                      <button
                        type="button"
                        onClick={() => setSeleccionado(r.algoritmo)}
                        aria-pressed={elegidoAqui}
                        className={`min-h-10 rounded-lg px-3 font-bold ${elegidoAqui ? 'bg-marca-700 text-white' : 'border-2 border-stone-200 hover:bg-stone-100'}`}
                      >
                        {r.nombre}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-sm text-stone-600">{DECIDE_CON[r.algoritmo]}</td>
                    <td className="py-2 pr-3 font-bold">{flechas(r.camino)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${r.camino && r.pasos === pasosMinimos ? 'font-bold' : ''}`}>{r.camino ? r.pasos : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.costo ?? '—'}
                      {r.costo === costoMinimo && <Star className="ml-1 inline size-4 fill-orange-600 text-orange-600" aria-label="ruta más barata" />}
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.expandidos.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          <Star className="mr-1 inline size-4 fill-orange-600 text-orange-600" aria-hidden />
          Ruta más barata (menos cambios de la mano en total). Toca el nombre de un algoritmo para verlo en detalle.
        </p>

        {/* ── 2. Gráficas ── */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Barras
            titulo="Letras expandidas"
            subtitulo="¿Cuánto trabajo hizo cada algoritmo? Menos es mejor."
            seleccionado={seleccionado}
            datos={resultados.map((r) => ({
              clave: r.algoritmo,
              nombre: r.nombre,
              valor: r.expandidos.length,
              mejor: hayRuta && r.costo === costoMinimo && r.expandidos.length === expandidosMinimos,
            }))}
          />
          <Barras
            titulo="Costo de la ruta"
            subtitulo="¿Cuántos cambios de la mano hay en total? Menos es más fácil."
            seleccionado={seleccionado}
            datos={resultados.map((r) => ({ clave: r.algoritmo, nombre: r.nombre, valor: r.costo, mejor: r.costo === costoMinimo }))}
          />
        </div>
        <p className="mt-2 text-sm text-stone-600">★ en «Letras expandidas»: el que encontró la ruta más barata revisando menos letras.</p>
      </div>

      {/* ── 3. El algoritmo elegido en detalle ── */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-bold">
          {elegido.nombre}: {flechas(elegido.camino)}
        </h3>
        <p className="text-stone-600">
          {DECIDE_CON[seleccionado]} · {elegido.camino ? `${elegido.pasos} pasos, costo ${elegido.costo}` : 'sin ruta'} · {elegido.expandidos.length} letras
          expandidas
        </p>
        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="mx-auto w-full max-w-md">
            <GrafoBusqueda letras={letras} grafo={grafo} resultado={paraDibujo} paso={paraDibujo.orden_exploracion.length} rutaFinal={elegido.camino} />
            <p className="mt-2 text-center text-sm text-stone-600">Verde claro: letras expandidas · verde oscuro: la ruta.</p>
          </div>
          <div>
            <h4 className="font-bold">Orden de expansión</h4>
            <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-stone-100">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Letra</th>
                    {columnas.map((c) => (
                      <th key={c.titulo} className="px-3 py-2 text-right">
                        {c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {elegido.expandidos.map((e, i) => (
                    <tr key={i} className={`border-t border-stone-100 ${elegido.camino?.includes(e.nodo) ? 'font-bold text-marca-900' : ''}`}>
                      <td className="px-3 py-1.5 text-stone-500">{i + 1}</td>
                      <td className="px-3 py-1.5">{e.nodo}</td>
                      {columnas.map((c) => (
                        <td key={c.titulo} className="px-3 py-1.5 text-right tabular-nums">
                          {c.valor(i)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-stone-600">En negritas, las letras que forman parte de la ruta.</p>
          </div>
        </div>
      </div>

      {/* ── 4. Interpretación ── */}
      {hayRuta && (
        <div className="rounded-3xl border border-marca-200 bg-marca-50/60 p-5 sm:p-6">
          <h3 className="text-lg font-bold">¿Qué nos dice la comparación?</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-800">
            {interpretacion.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
