/*
 * MI IA → ÁRBOL DE DECISIÓN (machine learning)
 * Muestra el examen del modelo entrenado en Python (ml/p03_modelo.py): cuántas letras acierta el
 * árbol contra las reglas fijas, cómo le va cuando la mano está girada, en qué se confunde
 * (matriz de confusión) y qué medidas de la mano le sirvieron más.
 */
import { METRICAS_ARBOL as M } from '../../lib/ia/arbol/arbol'

const pct = (v: number) => `${Math.round(v * 100)} %`

const PARTES = ['muñeca', 'base', 'nudillo', 'medio', 'punta']
const DEDO = ['pulgar', 'índice', 'medio', 'anular', 'meñique']

/** «pulgar_a_medio» → «distancia del pulgar al medio»; «p8_v» → «punta del índice (altura)». */
function nombreAmable(medida: string) {
  const punto = /^p(\d+)_([uv])$/.exec(medida)
  if (punto) {
    const n = Number(punto[1])
    const eje = punto[2] === 'u' ? 'a lo ancho' : 'a lo alto'
    if (n === 0) return `muñeca (${eje})`
    return `${PARTES[((n - 1) % 4) + 1]} del ${DEDO[Math.floor((n - 1) / 4)]} (${eje})`
  }
  if (medida.startsWith('pulgar_a_')) return `distancia del pulgar al ${medida.slice(9).replace('nudillo_indice', 'nudillo del índice').replace('menique', 'meñique').replace('indice', 'índice')}`
  if (medida.startsWith('punta_')) return `punta del ${medida.split('_')[1].replace('menique', 'meñique').replace('indice', 'índice')} a la palma`
  if (medida.startsWith('angulo_')) return `qué tan doblado está el ${medida.split('_')[1].replace('menique', 'meñique').replace('indice', 'índice')}`
  return medida
}

function Barra({ etiqueta, valor, fuerte }: { etiqueta: string; valor: number; fuerte?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className={fuerte ? 'font-bold' : 'text-stone-600'}>{etiqueta}</span>
        <span className="shrink-0 pl-2 font-bold whitespace-nowrap tabular-nums">{pct(valor)}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${fuerte ? 'bg-marca-600' : 'bg-stone-400'}`} style={{ width: `${valor * 100}%` }} />
      </div>
    </div>
  )
}

function Matriz({ datos, titulo }: { datos: number[][]; titulo: string }) {
  const letras = M.matriz.letras
  // Las reglas traen una columna más al final: «ninguna» (no reconocieron ninguna letra).
  const columnas = datos[0].length > letras.length ? [...letras, '—'] : letras
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 text-sm font-bold">{titulo}</figcaption>
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max gap-px" style={{ gridTemplateColumns: `1.6rem repeat(${columnas.length}, 0.85rem)` }}>
          <span />
          {columnas.map((l) => (
            <span key={l} className="text-center text-[0.5rem] leading-3 text-stone-500">
              {l.split('/')[0]}
            </span>
          ))}
          {datos.map((fila, i) => {
            const total = fila.reduce((a, b) => a + b, 0) || 1
            return [
              <span key={`f${i}`} className="pr-1 text-right text-[0.55rem] leading-[0.85rem] text-stone-500">
                {letras[i]}
              </span>,
              ...fila.map((v, j) => {
                const t = v / total
                const ninguna = j >= letras.length
                const color = v === 0 ? 'transparent' : i === j ? `rgb(31 163 140 / ${0.2 + t * 0.8})` : ninguna ? `rgb(120 113 108 / ${0.25 + t * 0.75})` : `rgb(234 88 12 / ${0.25 + t * 0.75})`
                return (
                  <span
                    key={j}
                    title={ninguna ? `Era ${letras[i]} y no reconoció nada: ${v} veces` : `Era ${letras[i]} y dijo ${letras[j]}: ${v} veces`}
                    className="size-[0.85rem] rounded-[2px] bg-stone-50"
                    style={{ backgroundColor: color }}
                  />
                )
              }),
            ]
          })}
        </div>
      </div>
    </figure>
  )
}

export function ArbolDecision() {
  const importantes = M.importantes.slice(0, 6)
  const maxPeso = importantes[0]?.peso ?? 1
  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        Este modelo lo entrenamos en Python con <b>scikit-learn</b>, siguiendo las prácticas de clase: generamos {M.manos.total.toLocaleString('es-MX')}{' '}
        manos con el avatar 3D (giradas, más anchas, más chicas), las limpiamos con <b>pandas</b> y entrenamos un árbol que aprende solo qué
        preguntas hacer sobre la mano («¿el pulgar está cerca del dedo medio?»). Luego lo examinamos con {M.manos.prueba.toLocaleString('es-MX')} manos
        que nunca vio. En el traductor de señas (LSM) el árbol da su opinión junto con las reglas.
      </p>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
          <h3 className="font-bold">Examen con manos nuevas</h3>
          <Barra etiqueta="Árbol de decisión (aprendió de los datos)" valor={M.exactitud.arbol} fuerte />
          <Barra etiqueta="Reglas fijas (las escribimos a mano)" valor={M.exactitud.reglas} />
          <Barra etiqueta="Vecino más cercano (KNN, para comparar)" valor={M.exactitud.knn} />
        </div>
        <div className="rounded-2xl bg-stone-50 p-4">
          <h3 className="font-bold">¿Y si la mano está girada?</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="font-normal">Giro</th>
                <th className="font-normal">Manos</th>
                <th className="font-normal">Reglas</th>
                <th className="font-normal">Árbol</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {M.porGiro.map((g) => (
                <tr key={g.tramo} className="border-t border-stone-200">
                  <td className="py-1">{g.tramo.replace(/[^\d-]+$/, '°')}</td>
                  <td>{g.manos}</td>
                  <td>{pct(g.reglas)}</td>
                  <td className="font-bold text-marca-800">{pct(g.arbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-stone-600">Mientras más gira la mano, más fallan las reglas; el árbol aguanta mejor.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Matriz datos={M.matriz.arbol} titulo="Matriz de confusión del árbol" />
        <Matriz datos={M.matriz.reglas} titulo="Matriz de confusión de las reglas" />
      </div>
      <p className="-mt-3 text-sm text-stone-600">
        Cada fila es la letra que se hizo y cada columna lo que dijo el modelo. Verde: acertó. Naranja: se confundió (pasa el cursor para ver
        cuántas veces). La última columna gris de las reglas («—») son las manos en que no reconocieron ninguna letra.
      </p>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">Lo que más mira el árbol</h3>
          <ul className="mt-2 space-y-2">
            {importantes.map((m) => (
              <li key={m.medida}>
                <div className="flex justify-between text-sm">
                  <span>{nombreAmable(m.medida)}</span>
                  <span className="tabular-nums text-stone-500">{pct(m.peso)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-marca-500" style={{ width: `${(m.peso / maxPeso) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-stone-600">El pulgar manda: en el puño (A, E, S, T, M, N) es lo único que cambia entre letras.</p>
        </div>
        <div>
          <h3 className="font-bold">En qué se confunde todavía</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {M.confusiones.arbol.slice(0, 5).map((c) => (
              <li key={`${c.real}-${c.dijo}`} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2">
                <span>
                  Era <b>{c.real}</b> y dijo <b>{c.dijo}</b>
                </span>
                <span className="tabular-nums text-stone-500">{c.veces} veces</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['Preguntas máx.', String(M.arbol.profundidad)],
              ['Respuestas', String(M.arbol.hojas)],
              ['Entrenado', new Date(`${M.fecha}T12:00`).toLocaleDateString('es-MX', { dateStyle: 'medium' })],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-stone-50 p-2">
                <dt className="text-xs text-stone-600">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
