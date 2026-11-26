/*
 * JUEGOS → LO QUE DICEN TUS PARTIDAS (información útil para el usuario)
 *   - ¿Vas mejorando?: la precisión (aciertos / total) de tus últimas partidas en una gráfica, y si las
 *     últimas 5 van mejor o peor que las 5 anteriores.
 *   - Cada juego: partidas, mejor puntaje y precisión promedio.
 *   - En qué GRUPO de letras fallas más (los 4 grupos de letras parecidas, práctica 08b).
 *   - Con cuenta: letras que la IA te recomienda probar, según las personas que aprenden como tú (KNN, práctica 29).
 * También exporta LoQueDiceTuIA, el recuadro de la pantalla de resultado de cada partida.
 */
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useExpediente } from '../../hooks/useExpediente'
import { claseDeLetra, COLORES_FAMILIA, familiaDeLetra, GRUPOS } from '../../lib/ia/grupos/grupos'
import type { NombreJuego, Partida } from '../../lib/juegos/juegos'

const N_GRUPOS = GRUPOS.familias.defecto
const NOMBRE_JUEGO: Record<NombreJuego, string> = { adivina: 'Adivina la seña', reto: 'Reto contra reloj', palabra: 'Deletrea la palabra', memorama: 'Memorama' }
const precision = (p: Partida) => (p.total ? p.aciertos / p.total : 0)
const pct = (v: number) => `${Math.round(v * 100)} %`
const promedio = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0)

/** Cuántas veces se falló cada grupo de letras (los 4 de la app), del que más al que menos. */
function fallosPorGrupo(partidas: Partida[]) {
  const conteo = new Map<number, { veces: number; letras: Map<string, number> }>()
  for (const p of partidas)
    for (const l of p.falladas) {
      const g = familiaDeLetra(claseDeLetra(l), N_GRUPOS)
      if (g < 0) continue
      const c = conteo.get(g) ?? { veces: 0, letras: new Map() }
      c.veces++
      c.letras.set(l, (c.letras.get(l) ?? 0) + 1)
      conteo.set(g, c)
    }
  return [...conteo.entries()]
    .map(([g, c]) => ({ grupo: g, veces: c.veces, letras: [...c.letras.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l) }))
    .sort((a, b) => b.veces - a.veces)
}

export function EstadisticasJuegos({ partidas }: { partidas: Partida[] }) {
  const { usuario, lengua } = useApp()
  const { expediente } = useExpediente()
  if (partidas.length < 2) return null

  const ultimas = [...partidas.slice(0, 15)].reverse() // de la más vieja a la más nueva
  const recientes = promedio(partidas.slice(0, 5).map(precision))
  const anteriores = promedio(partidas.slice(5, 10).map(precision))
  const hayComparacion = partidas.length >= 6
  const mejora = recientes - anteriores
  const juegos = (Object.keys(NOMBRE_JUEGO) as NombreJuego[])
    .map((j) => ({ j, ps: partidas.filter((p) => p.juego === j) }))
    .filter((x) => x.ps.length)
  const grupos = lengua === 'LSM' ? fallosPorGrupo(partidas.slice(0, 20)) : []
  const totalFallos = grupos.reduce((s, g) => s + g.veces, 0)
  const vecinos = usuario ? expediente?.vecinos : null

  // Gráfica de precisión de las últimas partidas.
  const W = 420
  const H = 130
  const x = (i: number) => 14 + (i * (W - 50)) / Math.max(1, ultimas.length - 1)
  const y = (v: number) => 10 + (1 - v) * (H - 30)

  return (
    <section aria-labelledby="titulo-estadisticas-juegos" className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 id="titulo-estadisticas-juegos" className="text-xl font-bold">
        Lo que dicen tus partidas
      </h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* ¿Vas mejorando? */}
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            {hayComparacion && mejora < -0.05 ? <TrendingDown className="size-5 text-amber-700" aria-hidden /> : <TrendingUp className="size-5 text-marca-700" aria-hidden />}
            ¿Vas mejorando?
          </h3>
          <p className="mt-1 text-sm text-stone-700">
            {!hayComparacion
              ? `Tu precisión en tus últimas partidas: ${pct(recientes)}. Juega unas más para ver si vas mejorando.`
              : mejora > 0.05
                ? `¡Sí! En tus últimas 5 partidas aciertas ${pct(recientes)}, contra ${pct(anteriores)} en las 5 anteriores.`
                : mejora < -0.05
                  ? `Tus últimas 5 partidas (${pct(recientes)}) van un poco peor que las anteriores (${pct(anteriores)}). Repasa las letras que fallas.`
                  : `Vas parejo: aciertas cerca de ${pct(recientes)} en tus últimas partidas.`}
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Precisión de tus últimas partidas">
            {[0, 0.5, 1].map((v) => (
              <g key={v}>
                <line x1={14} x2={W - 36} y1={y(v)} y2={y(v)} className="stroke-stone-200" strokeDasharray="3 3" />
                <text x={W - 32} y={y(v) + 3} className="fill-stone-400 text-[9px]">
                  {Math.round(v * 100)}%
                </text>
              </g>
            ))}
            <polyline points={ultimas.map((p, i) => `${x(i)},${y(precision(p))}`).join(' ')} fill="none" strokeWidth={2.5} className="stroke-marca-600" />
            {ultimas.map((p, i) => (
              <circle key={p.fecha} cx={x(i)} cy={y(precision(p))} r={3.5} className="fill-marca-700">
                <title>{`${NOMBRE_JUEGO[p.juego]}: ${p.aciertos} de ${p.total} (${pct(precision(p))})`}</title>
              </circle>
            ))}
            <text x={14} y={H - 4} className="fill-stone-500 text-[9px]">
              más antigua
            </text>
            <text x={W - 36} y={H - 4} textAnchor="end" className="fill-stone-500 text-[9px]">
              más reciente
            </text>
          </svg>
        </div>

        {/* Cada juego */}
        <div>
          <h3 className="font-bold">Cada juego</h3>
          <ul className="mt-2 space-y-2">
            {juegos.map(({ j, ps }) => {
              const prec = promedio(ps.map(precision))
              return (
                <li key={j} className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-bold" title={NOMBRE_JUEGO[j]}>
                    {NOMBRE_JUEGO[j]}
                  </span>
                  <span className="h-3 rounded-full bg-stone-100" aria-hidden>
                    <span className="block h-3 rounded-full bg-marca-600" style={{ width: `${Math.max(3, prec * 100)}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-stone-700">
                    {pct(prec)}
                    <span className="block text-xs text-stone-500">
                      {ps.length} {ps.length === 1 ? 'partida' : 'partidas'} · récord {Math.max(...ps.map((p) => p.puntos))}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Fallos por grupo */}
        {grupos.length > 0 && (
          <div>
            <h3 className="font-bold">¿En qué tipo de señas fallas más?</h3>
            <p className="mt-1 text-sm text-stone-700">
              El <b>{pct(grupos[0].veces / totalFallos)}</b> de tus fallos recientes son del grupo «{GRUPOS.familias.grupos[grupos[0].grupo]?.nombre}»: se parecen entre sí y por eso
              se confunden.
            </p>
            <ul className="mt-2 space-y-2">
              {grupos.map((g) => (
                <li key={g.grupo} className="text-sm">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="inline-block size-3 rounded-full" style={{ background: COLORES_FAMILIA[g.grupo % COLORES_FAMILIA.length] }} aria-hidden />
                      {GRUPOS.familias.grupos[g.grupo]?.nombre}
                    </span>
                    <span className="tabular-nums text-stone-600">{g.veces} {g.veces === 1 ? 'fallo' : 'fallos'}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {g.letras.slice(0, 6).map((l) => (
                      <Link key={l} to={`/aprender/${encodeURIComponent(l)}`} className="rounded-md bg-stone-100 px-1.5 py-0.5 font-bold hover:bg-stone-200">
                        {l}
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendación por KNN */}
        {vecinos && (vecinos.faciles.length > 0 || vecinos.dificiles.length > 0) && (
          <div>
            <h3 className="font-bold">Según personas que aprenden como tú</h3>
            <p className="mt-1 text-sm text-stone-700">
              La IA te comparó con las {vecinos.k} personas más parecidas a ti{vecinos.origen === 'simulada' ? ' (de referencia, simuladas)' : ''}.
            </p>
            {vecinos.faciles.length > 0 && (
              <p className="mt-2 text-sm">
                <b className="text-emerald-800">Pruébalas en el Reto, te van a salir:</b>{' '}
                {vecinos.faciles.map((f) => (
                  <Link key={f.letra} to={`/aprender/${encodeURIComponent(f.letra)}`} className="mr-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-900 hover:bg-emerald-100">
                    {f.letra}
                  </Link>
                ))}
              </p>
            )}
            {vecinos.dificiles.length > 0 && (
              <p className="mt-2 text-sm">
                <b className="text-amber-800">Les costaron, practícalas antes:</b>{' '}
                {vecinos.dificiles.map((f) => (
                  <Link key={f.letra} to={`/aprender/${encodeURIComponent(f.letra)}`} className="mr-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-bold text-amber-900 hover:bg-amber-100">
                    {f.letra}
                  </Link>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** En la pantalla de resultado: cómo te fue contra tu promedio y de qué grupo son las letras que fallaste. */
export function LoQueDiceTuIA({ partidas, falladas }: { partidas: Partida[]; falladas: string[] }) {
  const { lengua } = useApp()
  const actual = partidas[0]
  if (!actual) return null
  const anteriores = partidas.slice(1).filter((p) => p.juego === actual.juego)
  const media = promedio(anteriores.slice(0, 10).map(precision))
  const dif = precision(actual) - media
  const grupos = lengua === 'LSM' ? fallosPorGrupo([{ ...actual, falladas }]) : []
  return (
    <div className="mt-5 rounded-2xl border border-marca-200 bg-marca-50/60 p-4 text-left text-sm text-stone-800">
      <p className="font-bold text-marca-900">Lo que dice tu IA</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>
          Acertaste el <b>{pct(precision(actual))}</b>
          {anteriores.length
            ? dif > 0.05
              ? `, mejor que tu promedio en este juego (${pct(media)}). ¡Vas subiendo!`
              : dif < -0.05
                ? `, abajo de tu promedio en este juego (${pct(media)}). Respira y vuelve a intentarlo.`
                : `, igual que tu promedio en este juego (${pct(media)}).`
            : '. Es tu primera partida de este juego: la siguiente ya la podrás comparar.'}
        </li>
        {grupos[0] && (
          <li>
            Tus fallos fueron sobre todo del grupo «{GRUPOS.familias.grupos[grupos[0].grupo]?.nombre}» ({grupos[0].letras.join(', ')}): letras que se parecen
            entre sí. Practícalas juntas fijándote en lo que las hace distintas.
          </li>
        )}
      </ul>
    </div>
  )
}
