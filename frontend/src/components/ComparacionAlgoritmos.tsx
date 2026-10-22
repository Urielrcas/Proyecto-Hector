/*
 * COMPONENTE: COMPARACIÓN DE LOS 5 ALGORITMOS DE BÚSQUEDA (BFS, DFS, UCS, Greedy y A*)
 * Basado en la práctica p30algoritmosbusquedacompara.py, aplicado a la ruta de aprendizaje:
 *   - costo de un paso = cuántos detalles de la mano cambian entre dos letras,
 *   - heurística h(n) = qué tan lejos está la letra de la meta, medido con distancia Manhattan
 *     (|x| + |y|, cuadro por cuadro) o Euclidiana (√(x² + y²), en línea recta), con la letra en el
 *     punto (x, y) de un plano cartesiano y la meta en el origen (0, 0).
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
//     distanciaEuclidiana, distanciaManhattan → las dos fórmulas de distancia
//     MAX_EJE → tamaño del plano cartesiano (cuántos detalles caben en cada eje)
//     Distancia → tipo: 'manhattan' | 'euclidiana'
import { distanciaEuclidiana, distanciaManhattan, MAX_EJE, type Distancia } from '../lib/aprendizaje/grafoLetras'
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

/**
 * Plano cartesiano (SVG sin librerías) con la letra de inicio en (x, y) y la meta en el origen (0, 0):
 *   - Manhattan: el camino en «L», cuadro por cuadro (primero los dedos, luego los demás detalles).
 *   - Euclidiana: la línea recta de A a B.
 * La distancia elegida en las tarjetas se dibuja más gruesa y oscura.
 */
function PlanoCartesiano({ punto, inicio, objetivo, distancia }: { punto: [number, number]; inicio: string; objetivo: string; distancia: Distancia }) {
  const [x, y] = punto
  const CUADRO = 44 // tamaño de cada cuadro: igual en ambos ejes para que la diagonal sea real
  const IZQ = 84 // deja lugar a la etiqueta de la meta, a la izquierda del origen
  const ARRIBA = 30 // lugar para la etiqueta de una letra en la fila de hasta arriba
  const ABAJO = 52
  const DER = 34
  const ancho = IZQ + MAX_EJE.x * CUADRO + DER
  const alto = ARRIBA + MAX_EJE.y * CUADRO + ABAJO
  // Coordenadas del plano → pixeles del dibujo (en SVG la y crece hacia abajo).
  const px = (cx: number) => IZQ + cx * CUADRO
  const py = (cy: number) => ARRIBA + (MAX_EJE.y - cy) * CUADRO
  const manhattan = distanciaManhattan(punto, [0, 0])
  const euclidiana = Math.round(distanciaEuclidiana(punto, [0, 0]) * 100) / 100
  const fuerte = { color: '#13695d', grosor: 3.5 } // la distancia elegida
  const suave = { color: '#5fb3a3', grosor: 2 }
  const estiloM = distancia === 'manhattan' ? fuerte : suave
  const estiloE = distancia === 'euclidiana' ? fuerte : suave
  // Puntitos en cada cuadro del camino Manhattan, para contarlo «cuadro por cuadro».
  const pasos = [...Array.from({ length: y }, (_, i) => [x, y - i - 1]), ...Array.from({ length: x }, (_, i) => [x - i - 1, 0])].slice(0, -1)

  return (
    <figure className="rounded-2xl border border-stone-200 p-4">
      <figcaption>
        <span className="block font-bold">Plano cartesiano: de {inicio} a {objetivo}</span>
        <span className="block text-sm text-stone-600">
          La letra {inicio} está en ({x}, {y}) y la meta, {objetivo}, en el origen (0, 0)
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="mx-auto mt-3 h-auto w-full max-w-sm"
        role="img"
        aria-label={`Plano cartesiano. La letra ${inicio} está en (${x}, ${y}) y la meta ${objetivo} en (0, 0). Distancia Manhattan ${manhattan}, distancia Euclidiana ${euclidiana}.`}
      >
        <defs>
          <marker id="plano-flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#78716c" />
          </marker>
        </defs>

        {/* Cuadrícula y números de cada eje */}
        {Array.from({ length: MAX_EJE.x + 1 }, (_, i) => (
          <g key={`x${i}`}>
            <line x1={px(i)} y1={py(0)} x2={px(i)} y2={py(MAX_EJE.y)} stroke="#e7e5e4" />
            <text x={px(i)} y={py(0) + 18} textAnchor="middle" fontSize={12} fill="#57534e">
              {i}
            </text>
          </g>
        ))}
        {Array.from({ length: MAX_EJE.y + 1 }, (_, i) => (
          <g key={`y${i}`}>
            <line x1={px(0)} y1={py(i)} x2={px(MAX_EJE.x)} y2={py(i)} stroke="#e7e5e4" />
            {i > 0 && (
              <text x={px(0) - 10} y={py(i) + 4} textAnchor="end" fontSize={12} fill="#57534e">
                {i}
              </text>
            )}
          </g>
        ))}

        {/* Ejes con flecha */}
        <line x1={px(0)} y1={py(0)} x2={px(MAX_EJE.x) + 20} y2={py(0)} stroke="#78716c" strokeWidth={1.5} markerEnd="url(#plano-flecha)" />
        <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(MAX_EJE.y) - 14} stroke="#78716c" strokeWidth={1.5} markerEnd="url(#plano-flecha)" />
        <text x={px(MAX_EJE.x / 2)} y={alto - 8} textAnchor="middle" fontSize={12} fill="#44403c">
          x: dedos que faltan
        </text>
        <text x={14} y={py(MAX_EJE.y / 2)} textAnchor="middle" fontSize={12} fill="#44403c" transform={`rotate(-90 14 ${py(MAX_EJE.y / 2)})`}>
          y: otros detalles que faltan
        </text>

        {/* Manhattan: la «L» (baja por y, luego avanza por x) */}
        <polyline
          points={`${px(x)},${py(y)} ${px(x)},${py(0)} ${px(0)},${py(0)}`}
          fill="none"
          stroke={estiloM.color}
          strokeWidth={estiloM.grosor}
          strokeLinejoin="round"
        >
          <title>{`Manhattan: |${x}| + |${y}| = ${manhattan}`}</title>
        </polyline>
        {pasos.map(([cx, cy]) => (
          <circle key={`${cx},${cy}`} cx={px(cx)} cy={py(cy)} r={3.5} fill="#fff" stroke={estiloM.color} strokeWidth={2} />
        ))}

        {/* Euclidiana: la línea recta, punteada */}
        <line x1={px(x)} y1={py(y)} x2={px(0)} y2={py(0)} stroke={estiloE.color} strokeWidth={estiloE.grosor} strokeDasharray="9 6" strokeLinecap="round">
          <title>{`Euclidiana: √(${x}² + ${y}²) = ${euclidiana}`}</title>
        </line>

        {/* Los dos puntos: A (inicio) y B (meta) */}
        <circle cx={px(0)} cy={py(0)} r={8} fill="#13695d" stroke="#fff" strokeWidth={2}>
          <title>{`${objetivo}, la meta, en (0, 0)`}</title>
        </circle>
        <circle cx={px(x)} cy={py(y)} r={8} fill="#fff" stroke="#13695d" strokeWidth={3}>
          <title>{`${inicio}, la letra de inicio, en (${x}, ${y})`}</title>
        </circle>
        {/* Etiquetas: la de inicio arriba de su punto y la de la meta a la izquierda del origen, para que no se encimen */}
        <text x={px(x)} y={py(y) - 16} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1c1917">
          {inicio} · inicio
        </text>
        <text x={px(0) - 12} y={py(0) - 12} textAnchor="end" fontSize={14} fontWeight={700} fill="#1c1917">
          {objetivo} · meta
        </text>
      </svg>

      {/* Leyenda con las dos fórmulas ya resueltas */}
      <ul className="mt-3 space-y-1.5 text-sm text-stone-800">
        <li className="flex items-center gap-3">
          <svg width="34" height="10" aria-hidden>
            <line x1="2" y1="5" x2="32" y2="5" stroke={estiloM.color} strokeWidth={estiloM.grosor} />
          </svg>
          <span>
            <strong>Manhattan</strong> (cuadro por cuadro): |{x}| + |{y}| = <strong className="tabular-nums">{manhattan}</strong>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <svg width="34" height="10" aria-hidden>
            <line x1="2" y1="5" x2="32" y2="5" stroke={estiloE.color} strokeWidth={estiloE.grosor} strokeDasharray="9 6" />
          </svg>
          <span>
            <strong>Euclidiana</strong> (línea recta): √({x}² + {y}²) = <strong className="tabular-nums">{euclidiana}</strong>
          </span>
        </li>
      </ul>
      {(x === 0 || y === 0) && (
        <p className="mt-2 text-sm text-stone-600">Aquí la letra y la meta quedan en la misma línea, así que los dos caminos coinciden y miden lo mismo.</p>
      )}
    </figure>
  )
}

export function ComparacionAlgoritmos({
  comparaciones,
  punto,
  letras,
  grafo,
  inicio,
  objetivo,
}: {
  comparaciones: Record<Distancia, Comparacion> // la misma comparación con cada distancia
  punto: [number, number] // la letra de inicio en el plano, con la meta en (0, 0)
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
          <strong>heurística h(n)</strong> es qué tan lejos está una letra de {objetivo} en un plano cartesiano: x = dedos que le faltan cambiar,
          y = otros detalles que le faltan; la meta queda en (0, 0).
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
        <div className="mt-4">
          <PlanoCartesiano punto={punto} inicio={inicio} objetivo={objetivo} distancia={distancia} />
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
