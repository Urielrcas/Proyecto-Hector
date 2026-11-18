/*
 * IA POR DENTRO → SEÑAS PARECIDAS (prácticas 07, 08 y 09)
 *   1. Práctica 07 · K-Means: agrupa las manos SIN decirle la letra; método del codo y silueta para elegir K;
 *      qué letras cayeron en cada grupo y cómo están los dedos.
 *   2. Práctica 09 · PCA: las 57 medidas resumidas en 2 para dibujar cada mano como un punto.
 *   3. Práctica 08 · Análisis: estabilidad (ARI), K-Means++ contra random, escaladores y manos atípicas.
 * Los datos salen de ml/p07_kmeans_manos.py, ml/p08_analisis_clusters.py y ml/p09_pca_manos.py.
 */
import { useState } from 'react'
import { COLORES_GRUPO, GRUPOS as G, PCA } from '../../lib/ia/grupos/grupos'

const pct = (v: number) => `${Math.round(v * 100)} %`
const color = (g: number) => COLORES_GRUPO[g % COLORES_GRUPO.length]

/** Silueta según K: la línea y el K elegido resaltado. */
function GraficaSilueta() {
  const datos = G.codo
  const W = 420
  const H = 190
  const izq = 40
  const abajo = 28
  const max = Math.max(...datos.map((d) => d.silueta)) * 1.15
  const x = (i: number) => izq + 10 + (i * (W - izq - 20)) / Math.max(1, datos.length - 1)
  const y = (v: number) => 8 + (1 - v / max) * (H - abajo - 8)
  const elegida = datos.findIndex((d) => d.k === G.k)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Coeficiente de silueta según el número de grupos; se eligió K = ${G.k}`}>
      {[0, max / 2, max].map((v) => (
        <g key={v}>
          <line x1={izq} x2={W - 6} y1={y(v)} y2={y(v)} className="stroke-stone-200" strokeDasharray="3 3" />
          <text x={izq - 6} y={y(v) + 4} textAnchor="end" className="fill-stone-500 text-[10px]">
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      {elegida >= 0 && <rect x={x(elegida) - 12} y={4} width={24} height={H - abajo} rx={6} className="fill-marca-50" />}
      <path d={datos.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.silueta)}`).join(' ')} fill="none" strokeWidth={2.5} className="stroke-marca-600" />
      {datos.map((d, i) => (
        <g key={d.k}>
          <circle cx={x(i)} cy={y(d.silueta)} r={i === elegida ? 5 : 3.5} className={i === elegida ? 'fill-marca-800' : 'fill-marca-600'} />
          <text x={x(i)} y={H - 8} textAnchor="middle" className={`text-[10px] ${i === elegida ? 'fill-marca-800 font-bold' : 'fill-stone-500'}`}>
            {d.k}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Mapa PCA: cada punto es una mano; el color es su grupo de K-Means. */
function MapaPCA({ activo }: { activo: number | null }) {
  const { x: xs, y: ys, grupo } = PCA.puntos
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const W = 560
  const H = 380
  const m = 14
  const px = (v: number) => m + ((v - minX) / (maxX - minX)) * (W - 2 * m)
  const py = (v: number) => H - m - ((v - minY) / (maxY - minY)) * (H - 2 * m)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-stone-50" role="img" aria-label="Mapa de las manos en dos dimensiones, coloreadas por grupo">
      {xs.map((v, i) => {
        const fuera = activo !== null && grupo[i] !== activo
        return <circle key={i} cx={px(v)} cy={py(ys[i])} r={fuera ? 1.6 : 2.4} fill={fuera ? '#d6d3d1' : color(grupo[i])} opacity={fuera ? 0.5 : 0.7} />
      })}
      {PCA.centros.map((c) =>
        activo === null || activo === c.grupo ? (
          <g key={c.grupo}>
            <circle cx={px(c.x)} cy={py(c.y)} r={11} fill={color(c.grupo)} stroke="white" strokeWidth={2.5} />
            <text x={px(c.x)} y={py(c.y) + 4} textAnchor="middle" className="fill-white text-[11px] font-bold">
              {c.grupo + 1}
            </text>
          </g>
        ) : null,
      )}
      <text x={W - m} y={H - 4} textAnchor="end" className="fill-stone-500 text-[10px]">
        CP1 → ({pct(PCA.varianza[0])} de la información)
      </text>
      <text x={m} y={12} className="fill-stone-500 text-[10px]">
        ↑ CP2 ({pct(PCA.varianza[1])})
      </text>
    </svg>
  )
}

/** Barras de varianza explicada por componente, con la acumulada. */
function BarrasVarianza() {
  const n = 12
  return (
    <div>
      <div className="flex h-28 items-end gap-1 border-b border-stone-200">
        {PCA.varianza.slice(0, n).map((v, i) => (
          <div key={i} className="relative flex h-full flex-1 items-end" title={`CP${i + 1}: ${pct(v)} (acumulada ${pct(PCA.acumulada[i])})`}>
            <div className="w-full rounded-t bg-marca-500" style={{ height: `${(v / PCA.varianza[0]) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-center text-[10px] text-stone-500 tabular-nums">
        {PCA.acumulada.slice(0, n).map((a, i) => (
          <div key={i} className="flex-1">
            {Math.round(a * 100)}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-stone-500">Barras: lo que guarda cada componente · números: % acumulado.</p>
    </div>
  )
}

export function GruposSenas() {
  const [activo, setActivo] = useState<number | null>(null)
  const A = G.analisis
  const reconstruccion90 = PCA.reconstruccion.find((r) => r.componentes === PCA.necesarias['90'])
  const xAtipicas = A.atipicas.porLetra[0]

  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        En clase se agrupaban estudiantes sin usar la columna «aprueba». Aquí agrupamos las {G.manos.toLocaleString('es-MX')} manos{' '}
        <b>sin decirle a la computadora qué letra es cada una</b>: solo ve sus {G.medidas} medidas. <b>K-Means</b> junta las que se parecen, y
        después revisamos qué letras quedaron juntas. Así sabemos qué señas se confunden fácilmente.
      </p>

      {/* Práctica 07: elegir K */}
      <div className="grid gap-5 lg:grid-cols-[2fr_3fr] [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">¿Cuántos grupos? (práctica 07)</h3>
          <p className="mt-1 text-sm text-stone-600">
            El <b>coeficiente de silueta</b> mide qué tan separados quedan los grupos (más alto = mejor). Entre {G.kUtil[0]} y {G.kUtil[1]} grupos
            ganó <b className="text-marca-800">K = {G.k}</b>.
          </p>
          <GraficaSilueta />
          <p className="text-xs text-stone-500">
            La silueta es baja (~{G.silueta.toFixed(2)}) porque las letras no forman islas separadas: las manos giradas o más chicas quedan entre dos
            grupos.
          </p>
        </div>

        {/* Los grupos */}
        <div>
          <h3 className="font-bold">Los {G.k} grupos que encontró</h3>
          <p className="mt-1 text-sm text-stone-600">Toca un grupo para resaltarlo en el mapa.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {G.grupos.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setActivo(activo === g.id ? null : g.id)}
                  aria-pressed={activo === g.id}
                  className={`w-full rounded-2xl border-2 p-3 text-left transition-colors ${activo === g.id ? 'border-marca-600 bg-marca-50' : 'border-transparent bg-stone-50 hover:bg-stone-100'}`}
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs text-white" style={{ background: color(g.id) }}>
                      {g.id + 1}
                    </span>
                    <span className="min-w-0 truncate">{g.nombre}</span>
                  </span>
                  <span className="mt-1 block text-xs text-stone-600">{g.descripcion}</span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {g.letras.length ? (
                      g.letras.map((l) => (
                        <span key={l.letra} className="rounded-md bg-white px-1.5 py-0.5 text-sm font-bold" title={`${pct(l.porcentaje)} de sus manos`}>
                          {l.letra}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-500">Ninguna letra mayoritaria ({g.manos} manos sueltas)</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Práctica 09: PCA */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">El mapa de las manos (PCA, práctica 09)</h3>
          <p className="mt-1 mb-3 text-sm text-stone-600">
            {PCA.dimensiones} medidas no se pueden dibujar. <b>PCA</b> las resume en 2 «componentes» que guardan lo más posible de la información.
            Cada punto es una mano ({PCA.puntos.x.length.toLocaleString('es-MX')} de muestra) y el círculo grande es el centro de su grupo.
          </p>
          <MapaPCA activo={activo} />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-stone-50 p-4">
            <h4 className="font-bold">¿Cuánta información guarda?</h4>
            <BarrasVarianza />
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                Con <b>2</b> componentes (el mapa): {pct(PCA.acumulada[1])}
              </li>
              {(['80', '90', '95'] as const).map((p) => (
                <li key={p}>
                  Para el {p} %: <b>{PCA.necesarias[p]}</b> componentes de {PCA.dimensiones}
                </li>
              ))}
            </ul>
            {reconstruccion90 && (
              <p className="mt-2 text-xs text-stone-600">
                Reconstruyendo las manos con {reconstruccion90.componentes} componentes, el error es de solo {reconstruccion90.error.toFixed(3)}.
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-stone-50 p-4 text-sm">
            <h4 className="font-bold">¿Por qué estandarizar antes?</h4>
            <p className="mt-1 text-stone-600">
              Sin estandarizar, la primera componente se queda con el {pct(PCA.sinEscalarCP1)} y está hecha casi solo de ángulos (miden decenas de
              grados), mientras que las posiciones (décimas) casi no cuentan.
            </p>
          </div>
        </div>
      </div>

      {/* Práctica 08: análisis */}
      <div>
        <h3 className="font-bold">¿Qué tan confiables son los grupos? (práctica 08)</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-stone-50 p-4">
            <h4 className="font-bold">Estabilidad</h4>
            <p className="mt-1 text-3xl font-bold text-marca-800 tabular-nums">{A.estabilidad.promedio.toFixed(2)}</p>
            <p className="text-sm text-stone-600">
              ARI promedio con {A.estabilidad.semillas.length} semillas distintas (1 = idénticos). Los grupos son <b>{A.estabilidad.veredicto}</b>.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <h4 className="font-bold">K-Means++ contra random</h4>
            <table className="mt-2 w-full text-sm tabular-nums">
              <tbody>
                {A.inicializaciones.map((r) => (
                  <tr key={r.init} className="border-t border-stone-200 first:border-0">
                    <td className="py-1">{r.init}</td>
                    <td className="text-right">{Math.round(r.inerciaPromedio).toLocaleString('es-MX')}</td>
                    <td className="text-right text-stone-500">{r.iteraciones.toFixed(0)} it.</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-stone-600">
              {A.empateInicializacion
                ? 'Inercia casi igual: empatan. Repetir varias veces (n_init) importa más que cómo se empieza.'
                : 'La de menor inercia encuentra grupos más compactos.'}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <h4 className="font-bold">Standard contra MinMax</h4>
            <p className="mt-1 text-3xl font-bold text-marca-800 tabular-nums">{A.ariEscaladores.toFixed(2)}</p>
            <p className="text-sm text-stone-600">
              ARI entre los grupos de los dos escaladores. {A.ariEscaladores >= 0.8 ? 'Encuentran casi los mismos grupos.' : 'Cambian bastante los grupos.'}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <h4 className="font-bold">Manos atípicas</h4>
            <p className="mt-1 text-3xl font-bold text-red-700 tabular-nums">{A.atipicas.total}</p>
            <p className="text-sm text-stone-600">
              Muy lejos del centro de su grupo (más allá del percentil {A.atipicas.percentil}).
              {xAtipicas && (
                <>
                  {' '}
                  La mayoría son <b>{xAtipicas.letra}</b> ({xAtipicas.manos}): es la letra cuyas manos varían más.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <p className="rounded-2xl bg-marca-50/60 p-4 text-sm text-stone-700">
        <b>¿Para qué le sirve a la app?</b> Al practicar una letra se avisa con cuáles se puede confundir (las de su mismo grupo). Por ejemplo,
        la <b>M</b> está con {G.letras.M?.parecidas.join(' y ') || '—'}. Y las manos atípicas quedan en <code>ml/datos/manos_atipicas.csv</code>{' '}
        para revisarlas a mano.
      </p>
    </div>
  )
}
