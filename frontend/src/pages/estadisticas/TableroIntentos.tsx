/*
 * ESTADÍSTICAS → TABLERO DE PRÁCTICA (prácticas 16 y 17)
 * Lo que antes no se podía ver: con cada intento guardado (también los fallidos), el servidor hace
 * consultas con aggregate ($match, $group, $sort, $lookup, $facet) y aquí se muestran:
 *   - filtros por fechas y exportación a CSV (Excel),
 *   - totales: intentos, % de aciertos, personas que practicaron y cuántas necesitan ayuda,
 *   - letras más difíciles, confusiones más comunes, grupos de señas parecidas (K-Means) y dedos que más fallan,
 *   - intentos por día,
 *   - la lista de personas (primero las que necesitan ayuda) y el expediente de la que se elija.
 * En la práctica era una página aparte con Streamlit; aquí va dentro de la misma app.
 */
import { Download, UserRoundSearch, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Aviso } from '../../components/Aviso'
import { Boton } from '../../components/Boton'
import { VistaExpediente } from '../../components/ia/VistaExpediente'
import { useExpediente } from '../../hooks/useExpediente'
import type { Lengua } from '../../lib/tipos'
import { NOMBRE_DEDO_CORTO, obtenerTablero, type Tablero } from '../../services/intentos'

const pct = (v: number) => `${Math.round(v * 100)} %`

/** Barras horizontales sencillas (sin librerías). */
function Barras({ titulo, filas, nota }: { titulo: string; filas: { etiqueta: string; valor: number; texto: string; detalle?: string }[]; nota?: string }) {
  return (
    <figure className="rounded-2xl border border-stone-200 bg-white p-4">
      <figcaption className="font-bold">{titulo}</figcaption>
      {filas.length ? (
        <ul className="mt-3 space-y-2">
          {filas.map((f) => (
            <li key={f.etiqueta} className="grid grid-cols-[minmax(3rem,8rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate font-bold" title={f.etiqueta}>
                {f.etiqueta}
              </span>
              <span className="h-3 rounded-full bg-stone-100" aria-hidden>
                <span className="block h-3 rounded-full bg-marca-600" style={{ width: `${Math.max(2, Math.min(100, f.valor * 100))}%` }} />
              </span>
              <span className="text-right tabular-nums text-stone-700">
                {f.texto}
                {f.detalle && <span className="block text-xs text-stone-500">{f.detalle}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Sin datos en estas fechas.</p>
      )}
      {nota && <p className="mt-3 text-xs text-stone-500">{nota}</p>}
    </figure>
  )
}

/** Intentos y aciertos por día (columnas en SVG). */
function PorDia({ datos }: { datos: Tablero['por_dia'] }) {
  const ultimos = datos.slice(-30)
  const max = Math.max(1, ...ultimos.map((d) => d.intentos))
  const ANCHO = 600
  const ALTO = 140
  const paso = ANCHO / Math.max(1, ultimos.length)
  return (
    <figure className="rounded-2xl border border-stone-200 bg-white p-4">
      <figcaption className="font-bold">Intentos por día</figcaption>
      {ultimos.length ? (
        <>
          <svg viewBox={`0 0 ${ANCHO} ${ALTO + 18}`} className="mt-3 h-auto w-full" role="img" aria-label="Intentos y aciertos por día">
            {ultimos.map((d, i) => {
              const h = (d.intentos / max) * ALTO
              const ha = (d.aciertos / max) * ALTO
              return (
                <g key={d.fecha}>
                  <title>{`${d.fecha}: ${d.intentos} intentos, ${d.aciertos} logrados`}</title>
                  <rect x={i * paso + 2} y={ALTO - h} width={Math.max(2, paso - 4)} height={h} rx={3} className="fill-marca-200" />
                  <rect x={i * paso + 2} y={ALTO - ha} width={Math.max(2, paso - 4)} height={ha} rx={3} className="fill-marca-700" />
                </g>
              )
            })}
            <text x={0} y={ALTO + 14} className="fill-stone-500 text-[11px]">
              {ultimos[0].fecha}
            </text>
            <text x={ANCHO} y={ALTO + 14} textAnchor="end" className="fill-stone-500 text-[11px]">
              {ultimos[ultimos.length - 1].fecha}
            </text>
          </svg>
          <p className="mt-1 flex gap-4 text-xs text-stone-600">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-marca-200" aria-hidden /> intentos
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-marca-700" aria-hidden /> logrados
            </span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Sin datos en estas fechas.</p>
      )}
    </figure>
  )
}

/** El expediente de la persona elegida (se pide al servidor como administrador). */
function ExpedientePersona({ usuarioId, lengua, alCerrar }: { usuarioId: string; lengua: Lengua; alCerrar: () => void }) {
  const { expediente, cargando, error } = useExpediente({ usuarioId, lengua })
  return (
    <section className="mt-6 rounded-3xl border-2 border-marca-200 bg-marca-50/40 p-5" aria-label="Expediente de la persona elegida">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Expediente de {expediente?.nombre ?? '…'}</h3>
        <Boton variante="secundario" onClick={alCerrar}>
          <X className="size-5" aria-hidden /> Cerrar
        </Boton>
      </div>
      {cargando && !expediente && <p className="text-stone-600">Cargando…</p>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {expediente && <VistaExpediente expediente={expediente} conEnlaces={false} />}
    </section>
  )
}

/** Descarga un CSV (se abre en Excel). */
function descargarCsv(nombre: string, filas: Record<string, string | number | boolean | null>[]) {
  if (!filas.length) return
  const columnas = Object.keys(filas[0])
  const celda = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const texto = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\n')
  // La marca BOM (\uFEFF) al inicio hace que Excel lea bien los acentos.
  const url = URL.createObjectURL(new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function TableroIntentos({ lengua, recarga }: { lengua: Lengua; recarga: number }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tablero, setTablero] = useState<Tablero | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    obtenerTablero(lengua, desde || undefined, hasta || undefined)
      .then((t) => {
        if (!vigente) return
        setTablero(t)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [lengua, desde, hasta, recarga])

  const exportar = () => {
    if (!tablero) return
    const sufijo = `${lengua}${desde ? `_desde_${desde}` : ''}${hasta ? `_hasta_${hasta}` : ''}`
    descargarCsv(`letras_${sufijo}.csv`, tablero.letras.map((l) => ({ ...l, tasa: pct(l.tasa) })))
    descargarCsv(
      `personas_${sufijo}.csv`,
      tablero.personas_detalle.map((p) => ({ nombre: p.nombre, correo: p.correo, intentos: p.intentos, aciertos: p.aciertos, tasa: pct(p.tasa), puntaje: p.puntaje, letras: p.letras, necesita_ayuda: p.necesita_ayuda ? 'sí' : 'no', ultima_vez: p.ultima_vez })),
    )
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <label className="flex flex-col text-sm font-bold">
          Desde
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="mt-1 min-h-11 rounded-xl border-2 border-stone-300 px-3 font-normal" />
        </label>
        <label className="flex flex-col text-sm font-bold">
          Hasta
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="mt-1 min-h-11 rounded-xl border-2 border-stone-300 px-3 font-normal" />
        </label>
        {(desde || hasta) && (
          <Boton variante="secundario" onClick={() => (setDesde(''), setHasta(''))}>
            Todas las fechas
          </Boton>
        )}
        <div className="ml-auto">
          <Boton variante="secundario" onClick={exportar} disabled={!tablero?.intentos}>
            <Download className="size-5" aria-hidden /> Exportar CSV
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {tablero && tablero.intentos === 0 ? (
        <p className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 text-stone-600">
          Todavía no hay intentos de práctica en {lengua}
          {desde || hasta ? ' en estas fechas' : ''}. Se guardan cada vez que alguien con cuenta practica una letra con la cámara.
        </p>
      ) : (
        tablero && (
          <>
            {/* Totales */}
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Intentos', tablero.intentos.toLocaleString('es-MX'), `${tablero.aciertos.toLocaleString('es-MX')} logrados`],
                ['Aciertos', pct(tablero.tasa), `puntaje promedio ${Math.round(tablero.puntaje)} %`],
                ['Personas que practicaron', String(tablero.personas), 'con cuenta'],
                ['Necesitan ayuda', String(tablero.necesitan_ayuda), 'practican mucho y casi no logran'],
              ].map(([t, v, d]) => (
                <div key={t} className={`rounded-2xl border p-4 ${t === 'Necesitan ayuda' && tablero.necesitan_ayuda ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                  <p className="text-sm font-bold text-stone-600">{t}</p>
                  <p className="mt-1 text-2xl font-bold">{v}</p>
                  <p className="text-sm text-stone-500">{d}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Barras
                titulo="Letras más difíciles (% de intentos logrados)"
                filas={tablero.letras.slice(0, 10).map((l) => ({ etiqueta: l.letra, valor: l.tasa, texto: pct(l.tasa), detalle: `${l.intentos} ${l.intentos === 1 ? 'intento' : 'intentos'} · ${l.personas} ${l.personas === 1 ? 'persona' : 'personas'}` }))}
              />
              <Barras
                titulo="Confusiones más comunes"
                filas={tablero.confusiones.map((c) => ({ etiqueta: `${c.letra} → ${c.confundida_con}`, valor: c.veces / Math.max(1, tablero.confusiones[0]?.veces ?? 1), texto: `${c.veces} ${c.veces === 1 ? 'vez' : 'veces'}` }))}
                nota="«S → A»: al intentar la S, la red neuronal vio una A."
              />
              {lengua === 'LSM' && (
                <Barras
                  titulo="Grupos de señas parecidas (K-Means)"
                  filas={tablero.grupos.map((g) => ({ etiqueta: g.grupo, valor: g.tasa, texto: pct(g.tasa), detalle: g.letras.join(' ') }))}
                  nota="Los grupos salen de la práctica 07: letras con forma de mano parecida."
                />
              )}
              <Barras
                titulo="Dedo que más se falla"
                filas={tablero.dedos.map((d) => ({ etiqueta: NOMBRE_DEDO_CORTO[d.dedo], valor: d.veces / Math.max(1, tablero.dedos[0]?.veces ?? 1), texto: d.veces.toLocaleString('es-MX') }))}
                nota="En los intentos fallidos, en su mejor momento."
              />
            </div>
            <div className="mt-4">
              <PorDia datos={tablero.por_dia} />
            </div>

            {/* Personas */}
            <h3 className="mt-8 text-lg font-bold">Personas</h3>
            <p className="text-sm text-stone-600">Primero las que necesitan ayuda (10 intentos o más y 15 % de aciertos o menos).</p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="p-3">Persona</th>
                    <th className="p-3">Intentos</th>
                    <th className="p-3">Aciertos</th>
                    <th className="p-3">Puntaje</th>
                    <th className="p-3">Letras</th>
                    <th className="p-3">Última vez</th>
                    <th className="p-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tablero.personas_detalle.map((p) => (
                    <tr key={p.usuario_id} className={`border-t border-stone-100 ${p.necesita_ayuda ? 'bg-amber-50/60' : ''}`}>
                      <td className="p-3">
                        <span className="font-bold">{p.nombre}</span>
                        {p.necesita_ayuda && <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">necesita ayuda</span>}
                        <span className="block text-stone-500">{p.correo}</span>
                      </td>
                      <td className="p-3">{p.intentos}</td>
                      <td className="p-3">
                        {p.aciertos} ({pct(p.tasa)})
                      </td>
                      <td className="p-3">{Math.round(p.puntaje)} %</td>
                      <td className="p-3">{p.letras}</td>
                      <td className="p-3">{p.ultima_vez ? new Date(p.ultima_vez).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setElegido(p.usuario_id)}
                          aria-pressed={elegido === p.usuario_id}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-marca-200 px-3 font-bold text-marca-800 hover:bg-marca-50"
                        >
                          <UserRoundSearch className="size-4" aria-hidden /> Expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {elegido && <ExpedientePersona key={elegido} usuarioId={elegido} lengua={lengua} alCerrar={() => setElegido(null)} />}
          </>
        )
      )}
    </div>
  )
}
