/*
 * IA POR DENTRO → OPTIMIZACIÓN DE HIPERPARÁMETROS (práctica 06)
 * Lo que calcula ml/p06_hiperparametros.py:
 *   1. GridSearchCV: prueba todas las combinaciones de hiperparámetros de Árbol, Random Forest y KNN
 *      con validación cruzada de 5 partes, y se queda con la de mejor F1.
 *   2. RandomizedSearchCV: prueba solo unas cuantas al azar; se compara en F1 y en tiempo.
 *   3. Examen con la prueba: la configuración que elegimos a mano en la práctica 05 contra la optimizada.
 */
import hiperJson from '../../lib/ia/arbol/hiperparametros.json'
import type { NombreModelo } from '../../lib/ia/arbol/arbol'

type Valor = string | number | null
interface Busqueda {
  modelo: NombreModelo
  grid: Record<string, Valor[]>
  combinaciones: number
  mejores: Record<string, Valor>
  f1: number
  segundos: number
  top: { params: Record<string, Valor>; f1: number; desviacion: number }[]
  azar: { iteraciones: number; mejores: Record<string, Valor>; f1: number; segundos: number }
}
// «as unknown as»: el JSON lo escribe Python (cada algoritmo tiene hiperparámetros distintos).
const H = hiperJson as unknown as {
  fecha: string
  manos: { busqueda: number; prueba: number }
  particiones: number
  busquedas: Busqueda[]
  examen: { modelo: NombreModelo; antes: { exactitud: number; f1: number }; despues: { exactitud: number; f1: number } }[]
  ganador: NombreModelo
  particionesGanador: number[]
}

const NOMBRES: Record<NombreModelo, string> = { arbol: 'Árbol de decisión', bosque: 'Random Forest', knn: 'K vecinos (KNN)' }

/** Nombre entendible de cada hiperparámetro de scikit-learn. */
const PARAMETROS: Record<string, string> = {
  max_depth: 'Profundidad máxima',
  min_samples_split: 'Manos para dividir un nodo',
  min_samples_leaf: 'Manos mínimas por hoja',
  criterion: 'Criterio',
  n_estimators: 'Árboles',
  max_features: 'Medidas por división',
  n_neighbors: 'Vecinos',
  weights: 'Peso de los votos',
  metric: 'Distancia',
}
const VALORES: Record<string, string> = { uniform: 'iguales', distance: 'por cercanía', euclidean: 'euclidiana', manhattan: 'Manhattan', sqrt: '√ medidas', log2: 'log₂ medidas' }
const valor = (v: Valor) => (v === null ? 'Sin límite' : (VALORES[String(v)] ?? String(v)))
const pct1 = (v: number) => `${(v * 100).toFixed(1)} %`
const signo = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}`

export function Hiperparametros() {
  const totalEntrenamientos = H.busquedas.reduce((s, b) => s + b.combinaciones * H.particiones, 0)
  const arbol = H.examen.find((e) => e.modelo === 'arbol')
  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        Los <b>parámetros</b> los aprende el modelo solo (por ejemplo, las preguntas del árbol). Los <b>hiperparámetros</b> los decidimos
        nosotros antes de entrenar: cuántos vecinos mira el KNN, qué tan profundo puede crecer el árbol… En la práctica 05 los escogimos a
        mano; aquí la computadora prueba muchas combinaciones con <b>validación cruzada de {H.particiones} partes</b> (
        {totalEntrenamientos.toLocaleString('es-MX')} entrenamientos en total) y se queda con la de mejor F1.
      </p>

      {/* Lo que probó y lo que ganó, por algoritmo */}
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        {H.busquedas.map((b) => (
          <div key={b.modelo} className={`rounded-2xl p-4 ${b.modelo === H.ganador ? 'bg-marca-50 ring-2 ring-marca-200' : 'bg-stone-50'}`}>
            <h3 className="font-bold">{NOMBRES[b.modelo]}</h3>
            <p className="text-sm text-stone-600">
              {b.combinaciones} combinaciones · {b.segundos} s
            </p>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {Object.entries(b.grid).map(([p, opciones]) => (
                  <tr key={p} className="border-t border-stone-200 align-top">
                    <td className="py-1 pr-2 text-stone-600">{PARAMETROS[p] ?? p}</td>
                    <td className="py-1">
                      <div className="flex flex-wrap gap-1">
                        {opciones.map((o) => (
                          <span
                            key={String(o)}
                            className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${b.mejores[p] === o ? 'bg-marca-700 font-bold text-white' : 'bg-white text-stone-600'}`}
                          >
                            {valor(o)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm">
              Mejor F1 (validación cruzada): <b className="tabular-nums">{pct1(b.f1)}</b>
            </p>
          </div>
        ))}
      </div>

      {/* Grid contra Random */}
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <div>
          <h3 className="font-bold">GridSearchCV contra RandomizedSearchCV</h3>
          <p className="mt-1 mb-3 text-sm text-stone-600">
            Grid prueba <b>todas</b> las combinaciones; Random solo {H.busquedas[0].azar.iteraciones} al azar. Casi siempre queda muy cerca y tarda
            menos cuando hay muchas combinaciones.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="font-normal">Algoritmo</th>
                  <th className="font-normal">Grid F1</th>
                  <th className="font-normal">Random F1</th>
                  <th className="font-normal">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {H.busquedas.map((b) => (
                  <tr key={b.modelo} className="border-t border-stone-200">
                    <td className="py-1.5">{NOMBRES[b.modelo]}</td>
                    <td>{pct1(b.f1)}</td>
                    <td>{pct1(b.azar.f1)}</td>
                    <td className="text-stone-600">
                      {b.segundos} s → {b.azar.segundos} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Antes y después en el examen */}
        <div className="rounded-2xl bg-stone-50 p-4">
          <h3 className="font-bold">Examen con la prueba: antes y después</h3>
          <p className="mt-1 text-sm text-stone-600">Las mismas {H.manos.prueba} manos que nadie vio, con la configuración de la práctica 05 y la optimizada.</p>
          <ul className="mt-3 space-y-3">
            {H.examen.map((e) => {
              const cambio = e.despues.f1 - e.antes.f1
              return (
                <li key={e.modelo}>
                  <div className="flex justify-between text-sm">
                    <span className={e.modelo === H.ganador ? 'font-bold' : 'text-stone-600'}>{NOMBRES[e.modelo]}</span>
                    <span className="tabular-nums">
                      {pct1(e.antes.f1)} → <b>{pct1(e.despues.f1)}</b>{' '}
                      <span className={cambio >= 0 ? 'text-marca-700' : 'text-red-700'}>({signo(cambio)})</span>
                    </span>
                  </div>
                  <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-stone-200">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-stone-400" style={{ width: `${e.antes.f1 * 100}%` }} />
                    <div className={`absolute inset-y-0 left-0 rounded-full ${cambio >= 0 ? 'bg-marca-600' : 'bg-red-400'} opacity-80`} style={{ width: `${e.despues.f1 * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-sm text-stone-600">
            Ganador: <b>{NOMBRES[H.ganador]}</b>. F1 en cada una de las {H.particiones} partes:{' '}
            <span className="tabular-nums">{H.particionesGanador.map((v) => `${Math.round(v * 100)} %`).join(' · ')}</span>.
          </p>
        </div>
      </div>

      <p className="rounded-2xl bg-marca-50/60 p-4 text-sm text-stone-700">
        <b>¿Optimizar siempre mejora?</b> No. Cada búsqueda gana en la validación cruzada, pero en la prueba algunos modelos mejoran y otros
        pueden empeorar un poco: la mejor combinación «en práctica» no siempre es la mejor con manos nuevas. Por eso la app solo cambiaría un
        modelo si mejora en la prueba.{' '}
        {arbol && arbol.despues.f1 < arbol.antes.f1
          ? 'El árbol optimizado salió peor, así que el árbol que usa el traductor se queda como estaba.'
          : 'El árbol optimizado salió igual o mejor: se podría pasar su configuración a ml/p03_modelo.py y volver a exportarlo.'}
      </p>
    </div>
  )
}
