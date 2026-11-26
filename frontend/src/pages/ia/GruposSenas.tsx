/*
 * IA POR DENTRO → SEÑAS PARECIDAS (prácticas 07, 08, 08b y 09)
 *   1. Práctica 07 · K-Means: agrupa las manos SIN decirle la letra; método del codo y silueta para elegir K;
 *      qué letras cayeron en cada grupo y cómo están los dedos.
 *   2. Práctica 08b · Familias: agrupamiento jerárquico de las letras (dendrograma) para juntar los grupos en
 *      familias más grandes; detalle de cada letra y cuántas personas confunden cada par (FamiliasSenas.tsx).
 *   3. Práctica 09 · PCA: las 57 medidas resumidas en 2 para dibujar cada mano como un punto, con el nombre de
 *      cada letra, color por grupo o por familia y qué mide cada eje.
 *   4. Práctica 08 · Análisis: estabilidad (ARI), K-Means++ contra random, escaladores y manos atípicas.
 * Los datos salen de ml/p07_kmeans_manos.py, ml/p08_analisis_clusters.py, ml/p08b_familias_senas.py y ml/p09_pca_manos.py.
 */
import { useEffect, useMemo, useState } from 'react'
import { DEMO } from '../../lib/ia/demo/demo'
import { claseDeLetra, COLORES_FAMILIA, COLORES_GRUPO, describirMedida, familiaDeLetra, familiasDe, GRUPOS as G, PCA } from '../../lib/ia/grupos/grupos'
import { obtenerConfusiones, type ConfusionesPersonas } from '../../services/intentos'
import { DetalleLetra, Dendrograma, ListaFamilias, PcaPorGrupo, SelectorFuente, TablaConfusiones } from './FamiliasSenas'

const pct = (v: number) => `${Math.round(v * 100)} %`
const color = (g: number) => COLORES_GRUPO[g % COLORES_GRUPO.length]
const colorFamilia = (f: number) => COLORES_FAMILIA[f % COLORES_FAMILIA.length]

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

type ColorPor = 'grupo' | 'familia'

/**
 * Mapa PCA detallado: cada punto es una mano y cada círculo con letra es el centro de las manos de esa letra.
 * Se colorea por grupo de K-Means o por familia; al elegir una letra se resaltan sus manos.
 * Pasa el cursor (o toca) un punto o una letra para ver de qué es.
 */
function MapaPCA({ activo, colorPor, n, elegida, alElegir }: { activo: number | null; colorPor: ColorPor; n: number; elegida: string | null; alElegir: (l: string) => void }) {
  const { x: xs, y: ys, grupo, letra } = PCA.puntos
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const W = 600
  const H = 420
  const m = 30
  const px = (v: number) => m + ((v - minX) / (maxX - minX)) * (W - m - 10)
  const py = (v: number) => H - m - ((v - minY) / (maxY - minY)) * (H - m - 10)
  const familiaDe = (i: number) => familiaDeLetra(PCA.letras[letra[i]], n)
  const colorPunto = (i: number) => (colorPor === 'grupo' ? color(grupo[i]) : colorFamilia(familiaDe(i)))
  // Centro de cada letra en el mapa (promedio de sus manos de muestra).
  const centrosLetra = useMemo(
    () =>
      PCA.letras.map((l, li) => {
        const idx = letra.map((v, i) => (v === li ? i : -1)).filter((i) => i >= 0)
        return { letra: l, x: idx.reduce((s, i) => s + xs[i], 0) / idx.length, y: idx.reduce((s, i) => s + ys[i], 0) / idx.length, manos: idx.length }
      }),
    [letra, xs, ys],
  )
  const marcas = (min: number, max: number) => {
    const paso = Math.max(1, Math.round((max - min) / 5))
    const lista: number[] = []
    for (let v = Math.ceil(min / paso) * paso; v <= max; v += paso) lista.push(v)
    return lista
  }
  const fuera = (i: number) => (elegida !== null && claseDeLetra(PCA.letras[letra[i]]) !== elegida) || (activo !== null && grupo[i] !== activo)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-stone-50" role="img" aria-label="Mapa de las manos en dos dimensiones, con el centro de cada letra">
      {marcas(minX, maxX).map((v) => (
        <g key={`x${v}`}>
          <line x1={px(v)} x2={px(v)} y1={10} y2={H - m} className="stroke-stone-200" strokeDasharray="2 4" />
          <text x={px(v)} y={H - m + 12} textAnchor="middle" className="fill-stone-400 text-[9px]">
            {v}
          </text>
        </g>
      ))}
      {marcas(minY, maxY).map((v) => (
        <g key={`y${v}`}>
          <line x1={m} x2={W - 10} y1={py(v)} y2={py(v)} className="stroke-stone-200" strokeDasharray="2 4" />
          <text x={m - 4} y={py(v) + 3} textAnchor="end" className="fill-stone-400 text-[9px]">
            {v}
          </text>
        </g>
      ))}
      {xs.map((v, i) => {
        const f = fuera(i)
        return (
          <circle key={i} cx={px(v)} cy={py(ys[i])} r={f ? 1.6 : 2.6} fill={f ? '#d6d3d1' : colorPunto(i)} opacity={f ? 0.45 : 0.75}>
            <title>{`Una mano de la ${PCA.letras[letra[i]]} · grupo ${grupo[i] + 1} · familia ${familiaDe(i) + 1}`}</title>
          </circle>
        )
      })}
      {centrosLetra.map((c) => {
        const clase = claseDeLetra(c.letra)
        const activa = elegida === clase
        const apagada = elegida !== null && !activa
        const fam = familiaDeLetra(c.letra, n)
        const g = G.letras[clase]?.grupo ?? 0
        return (
          <g key={c.letra} className="cursor-pointer" opacity={apagada ? 0.35 : 1} onClick={() => alElegir(clase)}>
            <title>{`${c.letra}: familia ${fam + 1}, grupo ${g + 1} (${c.manos} manos en el mapa). Toca para ver su detalle.`}</title>
            <circle cx={px(c.x)} cy={py(c.y)} r={activa ? 14 : 10.5} fill={colorPor === 'grupo' ? color(g) : colorFamilia(fam)} stroke="white" strokeWidth={activa ? 3 : 2} />
            <text x={px(c.x)} y={py(c.y) + (activa ? 4.5 : 3.5)} textAnchor="middle" className={`fill-white font-bold ${activa ? 'text-[12px]' : 'text-[9px]'}`}>
              {c.letra}
            </text>
          </g>
        )
      })}
      <text x={W - 10} y={H - 4} textAnchor="end" className="fill-stone-600 text-[10px] font-bold">
        CP1 → ({pct(PCA.varianza[0])} de la información)
      </text>
      <text x={m} y={9} className="fill-stone-600 text-[10px] font-bold">
        ↑ CP2 ({pct(PCA.varianza[1])})
      </text>
    </svg>
  )
}

/** Qué mide cada eje del mapa: las medidas que más pesan en cada componente, en palabras. */
function QueMideCadaEje() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['CP1', 'CP2'] as const).map((cp, i) => (
        <div key={cp} className="rounded-xl bg-stone-50 p-3 text-sm">
          <p className="font-bold">
            {cp} ({i === 0 ? 'eje horizontal' : 'eje vertical'}) mide sobre todo:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-stone-700">
            {PCA.cargas[cp].slice(0, 3).map((c) => (
              <li key={c.medida}>
                {describirMedida(c.medida)} <span className="text-xs text-stone-500">({c.medida})</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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
  const [n, setN] = useState(G.familias.defecto)
  const [elegida, setElegida] = useState<string | null>('X')
  const [colorPor, setColorPor] = useState<ColorPor>('familia')
  const [reales, setReales] = useState<ConfusionesPersonas | null>(null)
  const [fuente, setFuente] = useState<'real' | 'demo'>('demo')
  const hayReales = !!reales?.pares.length
  const datosPersonas = fuente === 'demo' ? DEMO.confusiones : reales

  useEffect(() => {
    let vigente = true
    obtenerConfusiones('LSM')
      .then((c) => {
        if (!vigente) return
        setReales(c)
        // Si ya hay suficientes datos reales, se muestran primero.
        if (c.personas >= 10 && c.pares.length) setFuente('real')
      })
      .catch(() => vigente && setReales(null))
    return () => {
      vigente = false
    }
  }, [])

  const elegir = (l: string) => {
    setElegida((actual) => (actual === l ? null : l))
    setActivo(null)
  }
  const familiaX = familiaDeLetra('X', n)
  const companerasX = familiasDe(n)[familiaX]?.letras.filter((l) => l !== 'X') ?? []
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
                  onClick={() => (setActivo(activo === g.id ? null : g.id), setElegida(null), setColorPor('grupo'))}
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

      {/* Práctica 08b: familias (agrupamiento jerárquico) */}
      <div className="rounded-2xl border border-stone-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-3xl">
            <h3 className="font-bold">Los {G.familias.defecto} grupos de la app: agrupamiento jerárquico (práctica 08b)</h3>
            <p className="mt-1 text-sm text-stone-600">
              K-Means dejó algunas letras casi solas, como la <b>X</b>. Con el <b>agrupamiento jerárquico</b> (método de Ward) empezamos con cada
              letra sola y vamos juntando, paso a paso, las dos más parecidas, hasta que todas quedan juntas. El árbol muestra ese proceso: entre más
              abajo se unen dos letras, más se parecen. Al <b>cortar</b> el árbol salen los grupos.
            </p>
          </div>
          <label className="flex min-w-48 flex-col text-sm font-bold">
            Número de grupos: {n}
            <input type="range" min={2} max={9} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 accent-marca-700" />
            <span className="flex justify-between text-xs font-normal text-stone-500">
              <span>2 · muy generales</span>
              <span>9 · muy finas</span>
            </span>
          </label>
        </div>
        <div className="mt-3 grid gap-4 xl:grid-cols-[3fr_2fr] [&>*]:min-w-0">
          <Dendrograma n={n} elegida={elegida} alElegir={elegir} />
          <ListaFamilias n={n} elegida={elegida} alElegir={elegir} />
        </div>
        <p className="mt-3 rounded-xl bg-marca-50/60 p-3 text-sm text-stone-700">
          <b>¿Y la X?</b> Es la letra cuyas manos varían más (la mayoría de las manos atípicas son X), por eso K-Means la dejó aparte. En el árbol
          es de las últimas en unirse, y con {n} grupos queda en el grupo {familiaX + 1}
          {companerasX.length ? (
            <>
              {' '}
              junto con <b>{companerasX.join(', ')}</b>
            </>
          ) : (
            ' todavía sola (prueba con menos grupos)'
          )}
          . Sus letras más parecidas son {G.familias.parecidas.X.slice(0, 3).map((p) => p.letra).join(', ')}: dedos doblados como en un puño, con
          el índice en gancho.
        </p>

        {/* El PCA de cada uno de los 4 grupos de la app */}
        <div className="mt-5">
          <h4 className="font-bold">El PCA de cada grupo</h4>
          <p className="mb-3 text-sm text-stone-600">
            La app usa {G.familias.defecto} grupos (antes eran {G.k}). Para cada uno se hizo un PCA solo con sus manos: así se ve qué letras del grupo se
            separan bien y cuáles se enciman (esas son las que más se confunden).
          </p>
          <PcaPorGrupo />
        </div>

        {/* Detalle de la letra elegida */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-bold">Detalle de una letra</h4>
            <SelectorFuente fuente={fuente} alCambiar={setFuente} hayReales={hayReales} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Elegir letra">
            {G.familias.letras.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => elegir(l)}
                aria-pressed={elegida === l}
                className={`min-h-9 min-w-9 rounded-lg border-2 px-1.5 text-sm font-bold ${elegida === l ? 'text-white' : 'bg-white hover:bg-stone-100'}`}
                style={{ borderColor: colorFamilia(familiaDeLetra(l, n)), background: elegida === l ? colorFamilia(familiaDeLetra(l, n)) : undefined }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {elegida ? (
              <DetalleLetra letra={elegida} n={n} datos={datosPersonas} fuente={fuente} />
            ) : (
              <p className="text-sm text-stone-500">Elige una letra para ver con cuáles se parece y cuántas personas la confunden.</p>
            )}
          </div>
        </div>

        {/* Confusiones por personas */}
        <div className="mt-6">
          <h4 className="font-bold">¿Cuántas personas confunden cada letra?</h4>
          <p className="mb-3 text-sm text-stone-600">
            Cada vez que alguien practica y falla, se guarda qué letra vio la IA. Aquí se cuenta cuántas personas <b>distintas</b> confundieron cada par
            de letras, de las que practicaron esa letra. Si la mayoría de las confusiones son dentro del mismo grupo, los grupos sí explican los
            errores.
          </p>
          <TablaConfusiones n={n} datos={datosPersonas} fuente={fuente} alElegir={elegir} />
        </div>
      </div>

      {/* Práctica 09: PCA */}
      <div className="grid gap-5 2xl:grid-cols-[3fr_2fr] [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">El mapa de las manos (PCA, práctica 09)</h3>
          <p className="mt-1 mb-3 text-sm text-stone-600">
            {PCA.dimensiones} medidas no se pueden dibujar. <b>PCA</b> las resume en 2 «componentes» que guardan lo más posible de la información.
            Cada punto es una mano ({PCA.puntos.x.length.toLocaleString('es-MX')} de muestra) y cada círculo con letra es el centro de las manos de esa
            letra: <b>letras cercanas en el mapa = señas parecidas</b>. Pasa el cursor sobre un punto o una letra para ver de qué es, y toca una letra
            para resaltar sus manos.
          </p>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">Colorear por</span>
            <div role="group" aria-label="Colorear por" className="flex rounded-xl border-2 border-stone-200 p-0.5">
              {(['familia', 'grupo'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={colorPor === c}
                  onClick={() => setColorPor(c)}
                  className={`min-h-9 rounded-lg px-3 font-bold ${colorPor === c ? 'bg-marca-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                  {c === 'familia' ? `Grupos (${n})` : `K-Means (${G.k})`}
                </button>
              ))}
            </div>
            {(elegida || activo !== null) && (
              <button type="button" onClick={() => (setElegida(null), setActivo(null))} className="min-h-9 rounded-xl px-3 font-bold text-marca-800 hover:bg-marca-50">
                Ver todas las manos
              </button>
            )}
          </div>
          <MapaPCA activo={activo} colorPor={colorPor} n={n} elegida={elegida} alElegir={elegir} />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {colorPor === 'familia'
              ? familiasDe(n).map((f) => (
                  <li key={f.id} className="flex items-center gap-1.5">
                    <span className="inline-block size-3 rounded-full" style={{ background: colorFamilia(f.id) }} aria-hidden />
                    Grupo {f.id + 1}: {f.letras.join(' ')}
                  </li>
                ))
              : G.grupos.map((g) => (
                  <li key={g.id} className="flex items-center gap-1.5">
                    <span className="inline-block size-3 rounded-full" style={{ background: color(g.id) }} aria-hidden />
                    {g.id + 1}: {g.letras.map((l) => l.letra).join(' ') || 'mezcla'}
                  </li>
                ))}
          </ul>
          <div className="mt-3">
            <QueMideCadaEje />
          </div>
        </div>
        <div className="grid content-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
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
