/*
 * IA POR DENTRO → VALIDACIÓN Y COMPARACIÓN DE MODELOS (prácticas 04 y 05)
 * Lo que calcula ml/p03_modelo.py:
 *   1. Los datos se dividen en entrenamiento (60 %), validación (20 %) y prueba (20 %).
 *   2. Práctica 04: árboles de varias profundidades, entrenamiento vs validación → sobreajuste/subajuste.
 *   3. Práctica 05: Árbol, Random Forest y KNN comparados por F1 en validación, y los experimentos A, B y C.
 *   4. Examen final con la prueba y validación cruzada del ganador.
 */
import { METRICAS_ARBOL as M, type NombreModelo } from '../../lib/ia/arbol/arbol'

const pct = (v: number) => `${Math.round(v * 100)} %`
const pct1 = (v: number) => `${(v * 100).toFixed(1)} %`

const NOMBRES: Record<NombreModelo | 'reglas' | 'votacion', string> = {
  arbol: 'Árbol de decisión',
  bosque: 'Random Forest',
  knn: 'K vecinos (KNN)',
  reglas: 'Reglas fijas',
  votacion: 'Votación de la app',
}

const COLOR_DIAGNOSTICO = {
  subajuste: 'bg-amber-100 text-amber-900',
  sobreajuste: 'bg-red-100 text-red-800',
  'buen ajuste': 'bg-marca-100 text-marca-800',
}

/** Gráfica de líneas: exactitud en entrenamiento y en validación según la profundidad. */
function GraficaProfundidad() {
  const datos = M.profundidades
  const W = 520
  const H = 240
  const izq = 40
  const abajo = 30
  const x = (i: number) => izq + 12 + (i * (W - izq - 24)) / Math.max(1, datos.length - 1)
  const y = (v: number) => 10 + (1 - v) * (H - abajo - 10)
  const linea = (k: 'entrenamiento' | 'validacion') => datos.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join(' ')
  const elegida = datos.findIndex((d) => d.profundidad === M.profundidadElegida)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Exactitud en entrenamiento y validación según la profundidad del árbol">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={izq} x2={W - 8} y1={y(v)} y2={y(v)} className="stroke-stone-200" strokeDasharray="3 3" />
          <text x={izq - 6} y={y(v) + 4} textAnchor="end" className="fill-stone-500 text-[10px]">
            {v * 100}%
          </text>
        </g>
      ))}
      {elegida >= 0 && <rect x={x(elegida) - 14} y={6} width={28} height={H - abajo - 2} rx={6} className="fill-marca-50" />}
      <path d={linea('entrenamiento')} fill="none" strokeWidth={2.5} className="stroke-stone-400" />
      <path d={linea('validacion')} fill="none" strokeWidth={2.5} className="stroke-marca-600" />
      {datos.map((d, i) => (
        <g key={d.profundidad}>
          <circle cx={x(i)} cy={y(d.entrenamiento)} r={3.5} className="fill-stone-400" />
          <circle cx={x(i)} cy={y(d.validacion)} r={4} className="fill-marca-600" />
          <text x={x(i)} y={H - 10} textAnchor="middle" className={`text-[10px] ${i === elegida ? 'fill-marca-800 font-bold' : 'fill-stone-500'}`}>
            {d.profundidad === 'Sin límite' ? '∞' : d.profundidad}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Barras agrupadas: exactitud, precision, recall y F1 de cada algoritmo. */
function BarrasAlgoritmos() {
  const metricas = ['exactitud', 'precision', 'recall', 'f1'] as const
  const tonos = ['bg-stone-300', 'bg-stone-400', 'bg-marca-400', 'bg-marca-700']
  return (
    <div>
      <div className="flex h-44 items-end gap-4 border-b border-stone-200 px-1">
        {M.comparacion.map((r) => (
          <div key={r.modelo} className="flex h-full flex-1 items-end justify-center gap-1">
            {metricas.map((m, i) => (
              <div key={m} title={`${NOMBRES[r.modelo]} · ${m}: ${pct1(r[m])}`} className={`w-full max-w-5 rounded-t ${tonos[i]}`} style={{ height: `${r[m] * 100}%` }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-4 px-1">
        {M.comparacion.map((r) => (
          <div key={r.modelo} className="flex-1 text-center text-xs">
            <div className={r.modelo === M.ganador ? 'font-bold text-marca-800' : 'text-stone-600'}>{NOMBRES[r.modelo]}</div>
            <div className="tabular-nums text-stone-500">F1 {pct1(r.f1)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-stone-600">
        {metricas.map((m, i) => (
          <span key={m} className="flex items-center gap-1">
            <span className={`size-3 rounded-sm ${tonos[i]}`} /> {m === 'f1' ? 'F1' : m[0].toUpperCase() + m.slice(1)}
          </span>
        ))}
      </div>
    </div>
  )
}

function TablaExperimento({ titulo, columna, filas }: { titulo: string; columna: string; filas: { valor: number | string; exactitud: number; f1?: number }[] }) {
  const mejor = Math.max(...filas.map((f) => f.f1 ?? f.exactitud))
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <h4 className="font-bold">{titulo}</h4>
      <table className="mt-2 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-stone-500">
            <th className="font-normal">{columna}</th>
            <th className="font-normal">Exactitud</th>
            {filas[0]?.f1 !== undefined && <th className="font-normal">F1</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.valor} className={`border-t border-stone-200 ${(f.f1 ?? f.exactitud) === mejor ? 'font-bold text-marca-800' : ''}`}>
              <td className="py-1">{f.valor}</td>
              <td>{pct1(f.exactitud)}</td>
              {f.f1 !== undefined && <td>{pct1(f.f1)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ValidacionModelos() {
  const ganador = M.ganador
  const cv = M.validacionCruzada
  const total = M.manos.total
  const examen = (['bosque', 'votacion', 'knn', 'arbol', 'reglas'] as const).map((k) => ({ k, ...M.examen[k] }))
  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        Para no hacernos trampa, las {total.toLocaleString('es-MX')} manos se dividen en tres partes que no se mezclan. Con la de{' '}
        <b>entrenamiento</b> los modelos aprenden, con la de <b>validación</b> escogemos la mejor configuración y el mejor algoritmo, y la de{' '}
        <b>prueba</b> se guarda para el examen final.
      </p>

      <div className="flex h-9 overflow-hidden rounded-xl text-sm font-bold text-white">
        <div className="grid place-items-center bg-stone-500" style={{ width: `${(M.manos.entrenamiento / total) * 100}%` }}>
          Entrenamiento · {M.manos.entrenamiento.toLocaleString('es-MX')}
        </div>
        <div className="grid place-items-center bg-marca-500" style={{ width: `${(M.manos.validacion / total) * 100}%` }}>
          Validación · {M.manos.validacion}
        </div>
        <div className="grid place-items-center bg-marca-800" style={{ width: `${(M.manos.prueba / total) * 100}%` }}>
          Prueba · {M.manos.prueba}
        </div>
      </div>

      {/* Práctica 04 */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">¿Qué tan grande debe ser el árbol?</h3>
          <p className="mt-1 text-sm text-stone-600">
            <span className="font-bold text-stone-500">Gris:</span> entrenamiento · <span className="font-bold text-marca-700">Verde:</span>{' '}
            validación. Cuando las líneas se separan, el árbol empieza a memorizar.
          </p>
          <GraficaProfundidad />
        </div>
        <div className="rounded-2xl bg-stone-50 p-4">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="font-normal">Prof.</th>
                <th className="font-normal">Entren.</th>
                <th className="font-normal">Valid.</th>
                <th className="font-normal" />
              </tr>
            </thead>
            <tbody>
              {M.profundidades.map((p) => (
                <tr key={p.profundidad} className={`border-t border-stone-200 ${p.profundidad === M.profundidadElegida ? 'font-bold' : ''}`}>
                  <td className="py-1">{p.profundidad}</td>
                  <td>{pct(p.entrenamiento)}</td>
                  <td>{pct(p.validacion)}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${COLOR_DIAGNOSTICO[p.diagnostico]}`}>{p.diagnostico}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-stone-600">
            Elegida: <b>{M.profundidadElegida}</b>, la de mejor validación. Los árboles chicos no alcanzan a distinguir las 25 letras
            (subajuste). Que un árbol saque casi 100 % en entrenamiento no lo hace el mejor: importa cómo le va con manos nuevas.
          </p>
        </div>
      </div>

      {/* Práctica 05 */}
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">Tres algoritmos, misma validación</h3>
          <p className="mt-1 mb-3 text-sm text-stone-600">
            Se escoge por F1 (equilibra aciertos y errores en cada letra). Ganó <b className="text-marca-800">{NOMBRES[ganador]}</b>.
          </p>
          <BarrasAlgoritmos />
        </div>
        <div className="rounded-2xl bg-stone-50 p-4">
          <h3 className="font-bold">Examen final con la prueba</h3>
          <p className="mt-1 text-sm text-stone-600">Antes del examen, cada modelo se reentrenó con entrenamiento + validación.</p>
          <ul className="mt-3 space-y-2">
            {examen.map((e) => (
              <li key={e.k}>
                <div className="flex justify-between text-sm">
                  <span className={e.k === ganador ? 'font-bold' : 'text-stone-600'}>{NOMBRES[e.k]}</span>
                  <span className="font-bold tabular-nums">{pct1(e.exactitud)}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-200">
                  <div className={`h-full rounded-full ${e.k === ganador ? 'bg-marca-600' : 'bg-stone-400'}`} style={{ width: `${e.exactitud * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-600">
            <b>Validación cruzada</b> ({NOMBRES[cv.modelo]}, 5 partes): F1 promedio {pct1(cv.promedio)} ± {pct1(cv.desviacion)}. Varía poco, así que el
            resultado es estable.
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-bold">Experimentos (validación)</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <TablaExperimento titulo="A · Vecinos del KNN" columna="Vecinos" filas={M.experimentos.knn} />
          <TablaExperimento titulo="B · Árboles del bosque" columna="Árboles" filas={M.experimentos.bosque} />
          <TablaExperimento titulo="C · Profundidad del árbol" columna="Profundidad" filas={M.profundidades.map((p) => ({ valor: p.profundidad, exactitud: p.validacion }))} />
        </div>
      </div>

      <p className="rounded-2xl bg-marca-50/60 p-4 text-sm text-stone-700">
        <b>¿Por qué la app no usa el Random Forest si ganó?</b> Son cientos de árboles: pesaría varios MB y sería lento en el celular. La app
        traduce con la votación del árbol, el KNN y las reglas, que en el examen queda muy cerca ({pct1(M.examen.votacion.exactitud)} contra{' '}
        {pct1(M.examen.bosque.exactitud)}).
      </p>
    </div>
  )
}
