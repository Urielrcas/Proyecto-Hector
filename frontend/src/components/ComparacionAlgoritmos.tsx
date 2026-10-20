/*
 * COMPONENTE: COMPARACIÓN DE LOS 5 ALGORITMOS DE BÚSQUEDA (BFS, DFS, UCS, Greedy y A*)
 * Basado en la práctica p30algoritmosbusquedacompara.py, aplicado a la ruta de aprendizaje:
 *   - costo de un paso = cuántos detalles de la mano cambian entre dos letras,
 *   - heurística h(n) = qué tan lejos está la letra de la meta, medido con distancia Manhattan
 *     (cuenta los detalles que faltan) o Euclidiana (línea recta: la raíz de esa cuenta).
 * Muestra:
 *   0. Un selector Manhattan / Euclidiana y cuántas letras revisan A* y Greedy con cada una.
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
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     Distancia → tipo: 'manhattan' | 'euclidiana'
import type { Distancia } from '../lib/aprendizaje/grafoLetras'
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

// Las dos formas de medir la heurística, con su fórmula para mostrarla.
const DISTANCIAS: { valor: Distancia; nombre: string; formula: string }[] = [
  { valor: 'manhattan', nombre: 'Manhattan', formula: '|x1 − x2| + |y1 − y2| + …' },
  { valor: 'euclidiana', nombre: 'Euclidiana', formula: '√((x1 − x2)² + (y1 − y2)² + …)' },
]

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
  comparaciones,
  letras,
  grafo,
  inicio,
  objetivo,
}: {
  comparaciones: Record<Distancia, Comparacion> // la misma comparación con cada distancia
  letras: string[]
  grafo: Record<string, string[]>
  inicio: string
  objetivo: string
}) {
  const [seleccionado, setSeleccionado] = useState<ClaveAlgoritmo>('astar')
  const [distancia, setDistancia] = useState<Distancia>('manhattan')
  const comparacion = comparaciones[distancia]
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
  // Cuántas letras revisó A* con cada distancia.
  const astarCon = (d: Distancia) => comparaciones[d].resultados.find((r) => r.algoritmo === 'astar')!.expandidos.length
  const [conManhattan, conEuclidiana] = [astarCon('manhattan'), astarCon('euclidiana')]
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
        conManhattan < conEuclidiana
          ? `A* con Manhattan revisó ${conManhattan} letras y con Euclidiana ${conEuclidiana}: las dos llegan a la ruta más barata, pero Manhattan da una pista más fuerte (por eso la usa «Armar mi ruta»).`
          : `A* revisó ${conManhattan} letras con Manhattan y ${conEuclidiana} con Euclidiana: con estas letras las dos pistas ayudaron igual.`,
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
          <strong>heurística h(n)</strong> es qué tan lejos está una letra de {objetivo}: cada detalle de la mano es una coordenada (1 si
          todavía es distinto, 0 si ya es igual) y se mide la distancia hasta la meta.
        </p>

        {/* ── 0. Distancia de la heurística: Manhattan o Euclidiana ── */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Distancia para la heurística">
          {DISTANCIAS.map((d) => {
            const activa = d.valor === distancia
            const r = Object.fromEntries(comparaciones[d.valor].resultados.map((x) => [x.algoritmo, x])) as Record<ClaveAlgoritmo, ResultadoComparado>
            return (
              <button
                key={d.valor}
                type="button"
                onClick={() => setDistancia(d.valor)}
                aria-pressed={activa}
                className={`rounded-2xl border-2 p-4 text-left ${activa ? 'border-marca-700 bg-marca-50' : 'border-stone-200 hover:bg-stone-50'}`}
              >
                <span className="block font-bold">{d.nombre}</span>
                <span className="block font-mono text-sm text-stone-600">{d.formula}</span>
                <span className="mt-2 block text-sm text-stone-700">
                  A* revisó <strong className="tabular-nums">{r.astar.expandidos.length}</strong> letras · Greedy{' '}
                  <strong className="tabular-nums">{r.greedy.expandidos.length}</strong>
                </span>
              </button>
            )
          })}
        </div>
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
