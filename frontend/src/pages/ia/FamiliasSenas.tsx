/*
 * IA POR DENTRO → SEÑAS PARECIDAS: FAMILIAS Y CONFUSIONES (práctica 08b)
 *   - Dendrograma: el agrupamiento jerárquico (Ward) de las 25 letras. Se va juntando lo más parecido
 *     hasta que todo queda junto; al «cortar» el árbol salen las familias (de 2 a 9, con el control).
 *     Así ninguna letra queda sola sin explicación (la X se une con las de puño cerrado).
 *   - Detalle de una letra: su familia, sus letras más parecidas, en qué grupos de K-Means cayeron
 *     sus manos y CUÁNTAS PERSONAS la confundieron con cada letra.
 *   - Tabla de confusiones por personas: de las personas que practicaron una letra, cuántas la confundieron.
 * Las confusiones reales vienen del servidor (GET /api/intentos/confusiones); como todavía hay pocas,
 * se puede ver la demostración de 100 personas simuladas (ml/demo_100_personas.py), siempre marcada.
 */
import { ETIQUETA_DEMO } from '../../lib/ia/demo/demo'
import { claseDeLetra, COLORES_FAMILIA, COLORES_GRUPO, familiaDeLetra, familiasDe, GRUPOS as G } from '../../lib/ia/grupos/grupos'
import type { ConfusionesPersonas } from '../../services/intentos'

const F = G.familias
const colorFamilia = (f: number) => COLORES_FAMILIA[f % COLORES_FAMILIA.length]
const colorGrupo = (g: number) => COLORES_GRUPO[g % COLORES_GRUPO.length]
const porcentaje = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

/** Selector «Datos reales / Demostración». */
export function SelectorFuente({ fuente, alCambiar, hayReales }: { fuente: 'real' | 'demo'; alCambiar: (f: 'real' | 'demo') => void; hayReales: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div role="group" aria-label="Datos de personas" className="flex rounded-xl border-2 border-stone-200 p-0.5">
        {(['real', 'demo'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={fuente === f}
            onClick={() => alCambiar(f)}
            className={`min-h-9 rounded-lg px-3 font-bold ${fuente === f ? 'bg-marca-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            {f === 'real' ? 'Datos reales' : 'Demostración'}
          </button>
        ))}
      </div>
      {fuente === 'real' && !hayReales && <span className="text-stone-500">Aún casi no hay intentos reales.</span>}
    </div>
  )
}

/** El árbol de las letras (dendrograma) con el corte en n familias. */
export function Dendrograma({ n, elegida, alElegir }: { n: number; elegida: string | null; alElegir: (letra: string) => void }) {
  const hojas = F.letras.length
  const uniones = F.uniones
  // Orden de las hojas: recorrer el árbol desde la raíz para que las ramas no se crucen.
  const orden: number[] = []
  const recorrer = (nodo: number) => {
    if (nodo < hojas) orden.push(nodo)
    else {
      recorrer(uniones[nodo - hojas].a)
      recorrer(uniones[nodo - hojas].b)
    }
  }
  recorrer(hojas + uniones.length - 1)

  const W = 640
  const H = 260
  const izq = 34
  const abajo = 30
  const arriba = 22
  const maxD = uniones[uniones.length - 1].distancia
  const xHoja = new Map(orden.map((h, i) => [h, izq + 14 + (i * (W - izq - 30)) / (hojas - 1)]))
  const y = (d: number) => arriba + (1 - d / maxD) * (H - abajo - arriba)
  const nivel = F.niveles[String(n)]
  // Con n familias se hacen las primeras (hojas - n) uniones; el corte va entre esa y la siguiente.
  const hechas = hojas - n
  const corte = (uniones[hechas - 1]?.distancia ?? 0) / 2 + (uniones[hechas]?.distancia ?? maxD) / 2

  const xNodo: number[] = []
  const hojaDe: number[] = [] // una hoja cualquiera del nodo (para saber su familia)
  const altura = (nodo: number) => (nodo < hojas ? 0 : uniones[nodo - hojas].distancia)
  const posX = (nodo: number) => (nodo < hojas ? xHoja.get(nodo)! : xNodo[nodo - hojas])
  const hoja = (nodo: number) => (nodo < hojas ? nodo : hojaDe[nodo - hojas])
  uniones.forEach((u, i) => {
    xNodo[i] = (posX(u.a) + posX(u.b)) / 2
    hojaDe[i] = hoja(u.a)
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Árbol de las letras: cómo se juntan hasta formar ${n} familias`}>
      {[0, maxD / 2, maxD].map((d) => (
        <g key={d}>
          <line x1={izq} x2={W - 4} y1={y(d)} y2={y(d)} className="stroke-stone-200" strokeDasharray="3 3" />
          <text x={izq - 4} y={y(d) + 4} textAnchor="end" className="fill-stone-500 text-[10px]">
            {d.toFixed(0)}
          </text>
        </g>
      ))}
      {uniones.map((u, i) => {
        const dentro = i < hechas
        const color = dentro ? colorFamilia(nivel[hojaDe[i]]) : '#a8a29e'
        const xa = posX(u.a)
        const xb = posX(u.b)
        return (
          <g key={i} stroke={color} strokeWidth={dentro ? 2.2 : 1.6} fill="none">
            <title>{`Se juntan a distancia ${u.distancia.toFixed(1)}`}</title>
            <path d={`M${xa},${y(altura(u.a))} V${y(u.distancia)} H${xb} V${y(altura(u.b))}`} />
          </g>
        )
      })}
      <line x1={izq} x2={W - 4} y1={y(corte)} y2={y(corte)} stroke="#be123c" strokeDasharray="6 4" strokeWidth={1.5} />
      <text x={W - 6} y={y(corte) - 5} textAnchor="end" className="fill-red-700 text-[11px] font-bold">
        corte: {n} familias
      </text>
      {orden.map((h) => {
        const letra = F.letras[h]
        const activa = elegida === letra
        return (
          <g key={h} className="cursor-pointer" onClick={() => alElegir(letra)}>
            <title>{`${letra}: familia ${nivel[h] + 1}. Toca para ver su detalle.`}</title>
            <rect x={xHoja.get(h)! - 11} y={H - abajo + 4} width={22} height={22} rx={6} fill={activa ? colorFamilia(nivel[h]) : 'white'} stroke={colorFamilia(nivel[h])} strokeWidth={2} />
            <text x={xHoja.get(h)!} y={H - abajo + 19} textAnchor="middle" className={`text-[10px] font-bold ${activa ? 'fill-white' : 'fill-stone-800'}`}>
              {letra}
            </text>
          </g>
        )
      })}
      <text x={4} y={11} className="fill-stone-500 text-[10px]">
        ↑ distancia (más alto = menos parecidas)
      </text>
    </svg>
  )
}

/** Tarjetas de las familias al corte actual. */
export function ListaFamilias({ n, elegida, alElegir }: { n: number; elegida: string | null; alElegir: (letra: string) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {familiasDe(n).map((f) => {
        const grupos = [...new Set(f.letras.map((l) => G.letras[l]?.grupo).filter((g): g is number => g !== undefined))]
        return (
          <li key={f.id} className="rounded-2xl border-l-4 bg-stone-50 p-3" style={{ borderColor: colorFamilia(f.id) }}>
            <p className="font-bold">
              Familia {f.id + 1}: <span className="font-normal text-stone-700">{f.nombre}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1">
              {f.letras.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => alElegir(l)}
                  aria-pressed={elegida === l}
                  className={`min-h-8 min-w-8 rounded-md px-1.5 text-sm font-bold ${elegida === l ? 'text-white' : 'bg-white hover:bg-stone-100'}`}
                  style={elegida === l ? { background: colorFamilia(f.id) } : undefined}
                >
                  {l}
                </button>
              ))}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Junta {grupos.length === 1 ? '1 grupo' : `${grupos.length} grupos`} de K-Means: {grupos.map((g) => g + 1).join(', ')}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/** Todo lo de una letra: familia, parecidas, reparto entre grupos y personas que la confundieron. */
export function DetalleLetra({ letra, n, datos, fuente }: { letra: string; n: number; datos: ConfusionesPersonas | null; fuente: 'real' | 'demo' }) {
  const fam = familiaDeLetra(letra, n)
  const familia = familiasDe(n)[fam]
  const grupo = G.letras[letra]?.grupo
  const parecidas = F.parecidas[letra] ?? []
  const reparto = F.reparto[letra] ?? []
  const pares = (datos?.pares ?? []).filter((p) => claseDeLetra(p.letra) === letra).sort((a, b) => b.personas - a.personas || b.veces - a.veces)
  const practicaron = letra.split('/').reduce((s, l) => Math.max(s, datos?.practicaron[l] ?? 0), 0)

  return (
    <div className="rounded-2xl border-2 p-4" style={{ borderColor: colorFamilia(fam) }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl text-2xl font-bold text-white" style={{ background: colorFamilia(fam) }}>
          {letra}
        </span>
        <div className="min-w-0 text-sm">
          <p>
            <b>Familia {fam + 1}</b> ({familia?.nombre}): {familia?.letras.filter((l) => l !== letra).join(', ') || 'ninguna más'}
          </p>
          {grupo !== undefined && (
            <p className="text-stone-600">
              Grupo de K-Means: <b>{grupo + 1}</b> · {G.grupos.find((g) => g.id === grupo)?.nombre}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
        <div>
          <h4 className="text-sm font-bold">Letras más parecidas (forma de la mano)</h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {parecidas.map((p) => (
              <li key={p.letra} className="grid grid-cols-[2.5rem_1fr_2.8rem] items-center gap-2">
                <b>{p.letra}</b>
                <span className="h-2.5 rounded-full bg-stone-100" aria-hidden>
                  <span className="block h-2.5 rounded-full" style={{ width: `${p.parecido}%`, background: colorFamilia(familiaDeLetra(p.letra, n)) }} />
                </span>
                <span className="text-right tabular-nums text-stone-600">{p.parecido} %</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-500">100 % = idénticas; se calcula con la distancia entre el centro de las manos de cada letra.</p>
        </div>

        <div>
          <h4 className="text-sm font-bold">¿En qué grupos cayeron sus manos?</h4>
          <div className="mt-2 flex h-5 overflow-hidden rounded-md" aria-hidden>
            {reparto.map((r) => (
              <span key={r.grupo} style={{ width: `${r.porcentaje * 100}%`, background: colorGrupo(r.grupo) }} title={`Grupo ${r.grupo + 1}: ${Math.round(r.porcentaje * 100)} %`} />
            ))}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {reparto.map((r) => (
              <li key={r.grupo} className="flex items-center gap-2">
                <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: colorGrupo(r.grupo) }} aria-hidden />
                <span className="min-w-0">
                  {Math.round(r.porcentaje * 100)} % en el grupo {r.grupo + 1} <span className="text-stone-500">({G.grupos.find((g) => g.id === r.grupo)?.nombre})</span>
                </span>
              </li>
            ))}
          </ul>
          {reparto.length > 1 && <p className="mt-2 text-xs text-stone-500">Sus manos se reparten: por eso es fácil confundirla con las de esos grupos.</p>}
        </div>

        <div>
          <h4 className="text-sm font-bold">Personas que la confundieron {fuente === 'demo' && <span className="font-normal text-amber-800">(demostración)</span>}</h4>
          {pares.length ? (
            <>
              <p className="mt-1 text-xs text-stone-600">De {practicaron} {practicaron === 1 ? 'persona que la practicó' : 'personas que la practicaron'}:</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {pares.slice(0, 5).map((p) => (
                  <li key={`${p.letra}-${p.con}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span>
                        {letra.includes('/') && <>{p.letra} </>}con la <b>{p.con}</b>
                      </span>
                      <span className="tabular-nums">
                        <b>{p.personas}</b> ({porcentaje(p.personas, datos?.practicaron[p.letra] ?? 0)} %)
                      </span>
                    </span>
                    <span className="mt-0.5 block h-2 rounded-full bg-stone-100" aria-hidden>
                      <span className="block h-2 rounded-full bg-red-400" style={{ width: `${porcentaje(p.personas, datos?.practicaron[p.letra] ?? 0)}%` }} />
                    </span>
                    <span className="text-xs text-stone-500">
                      {p.veces} {p.veces === 1 ? 'vez' : 'veces'}
                      {familiaDeLetra(p.con, n) === fam ? ' · misma familia' : ' · otra familia'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-500">Nadie la ha confundido todavía{fuente === 'real' ? ' (con datos reales)' : ''}.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Las confusiones con más personas y qué tanto las explican las familias. */
export function TablaConfusiones({ n, datos, fuente, alElegir }: { n: number; datos: ConfusionesPersonas | null; fuente: 'real' | 'demo'; alElegir: (letra: string) => void }) {
  const pares = datos?.pares ?? []
  if (!datos || !pares.length) {
    return <p className="text-sm text-stone-500">Todavía no hay confusiones guardadas. Cambia a «Demostración» para ver un ejemplo.</p>
  }
  const total = pares.reduce((s, p) => s + p.veces, 0)
  const mismaFamilia = pares.filter((p) => familiaDeLetra(p.letra, n) === familiaDeLetra(p.con, n)).reduce((s, p) => s + p.veces, 0)
  // Para cada letra, la confusión con más personas: en promedio, ¿qué parte de quienes la practican la confunde así?
  const peorPorLetra = new Map<string, number>()
  for (const p of pares) {
    const parte = (datos.practicaron[p.letra] ?? 0) ? p.personas / datos.practicaron[p.letra] : 0
    peorPorLetra.set(p.letra, Math.max(peorPorLetra.get(p.letra) ?? 0, parte))
  }
  const promedio = [...peorPorLetra.values()].reduce((s, v) => s + v, 0) / Math.max(1, peorPorLetra.size)

  return (
    <div>
      {fuente === 'demo' && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <b>{ETIQUETA_DEMO}.</b> No son personas reales: al fallar, la letra que «ve» la IA sale de las letras más parecidas.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-stone-50 p-3">
          <p className="text-2xl font-bold tabular-nums text-marca-800">{datos.personas}</p>
          <p className="text-sm text-stone-600">personas con intentos</p>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <p className="text-2xl font-bold tabular-nums text-marca-800">{Math.round(promedio * 100)} %</p>
          <p className="text-sm text-stone-600">en promedio, de quienes practican una letra, la confunden con su «gemela» más común</p>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <p className="text-2xl font-bold tabular-nums text-marca-800">{porcentaje(mismaFamilia, total)} %</p>
          <p className="text-sm text-stone-600">de las confusiones fueron entre letras de la misma familia (con {n} familias)</p>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="p-2">Intentaba</th>
              <th className="p-2">La IA vio</th>
              <th className="p-2">Personas</th>
              <th className="p-2">Veces</th>
              <th className="p-2">Familia</th>
            </tr>
          </thead>
          <tbody>
            {pares.slice(0, 12).map((p) => {
              const practicaron = datos.practicaron[p.letra] ?? 0
              const misma = familiaDeLetra(p.letra, n) === familiaDeLetra(p.con, n)
              return (
                <tr key={`${p.letra}-${p.con}`} className="border-t border-stone-200">
                  <td className="p-2">
                    <button type="button" onClick={() => alElegir(claseDeLetra(p.letra))} className="font-bold text-marca-800 hover:underline">
                      {p.letra}
                    </button>
                  </td>
                  <td className="p-2 font-bold">{p.con}</td>
                  <td className="p-2 tabular-nums">
                    {p.personas} de {practicaron} <span className="text-stone-500">({porcentaje(p.personas, practicaron)} %)</span>
                  </td>
                  <td className="p-2 tabular-nums">{p.veces}</td>
                  <td className="p-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${misma ? 'bg-marca-100 text-marca-800' : 'bg-stone-100 text-stone-600'}`}>{misma ? 'misma' : 'otra'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
