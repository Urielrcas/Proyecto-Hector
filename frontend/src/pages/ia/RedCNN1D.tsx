/*
 * IA POR DENTRO → DATOS MASIVOS Y RED NEURONAL 1D (prácticas 20 a 25)
 *   1. Datos masivos: 50,000 manos del avatar (p20), limpiadas con Apache Spark (p21) y guardadas
 *      en MongoDB por particiones y lotes (p22).
 *   2. La red CNN 1D: lee los 21 puntos de la mano como una secuencia (p23) y se entrena con PyTorch
 *      con Early Stopping (p24).
 *   3. Comparación con Random Forest y con lo que ya usaba la app, con las mismas manos de prueba (p25).
 * Los números salen de lib/ia/cnn1d/practicas.json (lo escribe Python).
 */
import { ArrowRight } from 'lucide-react'
import { PRACTICAS } from '../../lib/ia/cnn1d/practicas'
import { pct } from './Tarjeta'

const { spark, mongo, preparacion, entrenamiento, comparacion } = PRACTICAS
const miles = (n: number) => n.toLocaleString('es-MX')
const pct1 = (v: number) => `${(v * 100).toFixed(1)} %`

function Paso({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-3">
      <p className="text-sm font-bold text-stone-600">{titulo}</p>
      <p className="text-xl font-bold">{valor}</p>
      <p className="text-xs text-stone-500">{detalle}</p>
    </div>
  )
}

/** Curva de exactitud por época (entrenamiento y validación), con la época elegida por Early Stopping. */
function Curva() {
  const h = entrenamiento.historia
  const ANCHO = 520
  const ALTO = 160
  const min = Math.min(...h.flatMap((e) => [e.exactitud, e.exactitudVal])) - 0.02
  const x = (i: number) => (i / Math.max(1, h.length - 1)) * ANCHO
  const y = (v: number) => ALTO - ((v - min) / (1 - min)) * ALTO
  const linea = (k: 'exactitud' | 'exactitudVal') => h.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e[k]).toFixed(1)}`).join(' ')
  const mejor = entrenamiento.epocaMejor - 1
  return (
    <figure className="rounded-2xl border border-stone-200 bg-white p-4">
      <figcaption className="font-bold">Cómo aprendió (exactitud por época)</figcaption>
      <svg viewBox={`-4 -4 ${ANCHO + 8} ${ALTO + 24}`} className="mt-2 h-auto w-full" role="img" aria-label="Curva de exactitud por época">
        <line x1={x(mejor)} x2={x(mejor)} y1={0} y2={ALTO} className="stroke-stone-400" strokeDasharray="4 4" />
        <path d={linea('exactitud')} fill="none" className="stroke-marca-300" strokeWidth={2.5} />
        <path d={linea('exactitudVal')} fill="none" className="stroke-marca-800" strokeWidth={2.5} />
        <text
          x={x(mejor) > ANCHO * 0.6 ? x(mejor) - 4 : x(mejor) + 4}
          y={14}
          textAnchor={x(mejor) > ANCHO * 0.6 ? 'end' : 'start'}
          className="fill-stone-600 text-[11px]"
        >
          época {entrenamiento.epocaMejor} (la mejor)
        </text>
        <text x={0} y={ALTO + 16} className="fill-stone-500 text-[11px]">
          época 1
        </text>
        <text x={ANCHO} y={ALTO + 16} textAnchor="end" className="fill-stone-500 text-[11px]">
          época {h.length}
        </text>
      </svg>
      <p className="mt-1 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <span className="h-1 w-4 rounded bg-marca-300" aria-hidden /> entrenamiento
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1 w-4 rounded bg-marca-800" aria-hidden /> validación
        </span>
        <span>
          Early Stopping: se detuvo tras {entrenamiento.paciencia} épocas sin mejorar y se quedó con la época {entrenamiento.epocaMejor}.
        </span>
      </p>
    </figure>
  )
}

export function RedCNN1D() {
  const rechazadas = Object.values(spark.rechazadas).reduce((a, b) => a + b, 0)
  const filas: { nombre: string; f1: number; exactitud: number; nota: string; fuerte?: boolean }[] = [
    { nombre: 'CNN 1D (nueva)', ...comparacion.modelos.cnn1d, nota: `${miles(comparacion.modelos.cnn1d.parametros)} pesos`, fuerte: true },
    { nombre: 'Random Forest', ...comparacion.modelos.bosque, nota: `${miles(comparacion.modelos.bosque.parametros)} nodos (demasiado pesado para la app)` },
    { nombre: 'Votación de la app (antes)', ...comparacion.app.votacion, nota: 'árbol + KNN + reglas' },
    { nombre: 'Árbol de decisión', ...comparacion.app.arbol, nota: '' },
    { nombre: 'K vecinos (KNN)', ...comparacion.app.knn, nota: '' },
    { nombre: 'Reglas fijas', ...comparacion.app.reglas, nota: '' },
  ]
  return (
    <div className="space-y-8">
      {/* 1. Datos masivos */}
      <section>
        <h3 className="text-lg font-bold">1. Datos masivos con Apache Spark y MongoDB (prácticas 20, 21 y 22)</h3>
        <p className="mt-1 text-stone-600">
          El avatar 3D hizo cada forma de letra 2,000 veces, cada vez un poco distinta. Como pasa con los datos reales, se metieron a propósito
          errores de cámara para que Spark los encontrara. Spark reparte el trabajo en {spark.nucleos} núcleos.
        </p>
        <div className="mt-3 flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          <Paso titulo="Generadas (p20)" valor={miles(spark.leidas)} detalle={`${spark.letras} formas × 2,000 + errores`} />
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-stone-400 lg:rotate-0" aria-hidden />
          <Paso titulo="Rechazadas (p21)" valor={miles(rechazadas)} detalle={Object.entries(spark.rechazadas).map(([k, v]) => `${v} ${k}`).join(' · ')} />
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-stone-400 lg:rotate-0" aria-hidden />
          <Paso titulo="Repetidas (p21)" valor={miles(spark.duplicadas)} detalle="misma mano, otro id" />
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-stone-400 lg:rotate-0" aria-hidden />
          <Paso titulo="Parquet (p21)" valor={miles(spark.finales)} detalle={`CSV ${spark.pesoCsvMB} MB → Parquet ${spark.pesoParquetMB} MB`} />
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-stone-400 lg:rotate-0" aria-hidden />
          <Paso titulo="MongoDB (p22)" valor={miles(mongo.documentos)} detalle={`«${mongo.coleccion}» · ${mongo.particiones} particiones · lotes de ${miles(mongo.lote)}`} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="mb-2 text-left font-bold">¿Qué tan seguido las reglas fijas reconocen la mano? (estadística distribuida de Spark)</caption>
            <thead className="text-stone-600">
              <tr>
                <th className="py-1">Giro de la mano</th>
                <th className="py-1">Manos</th>
                <th className="py-1">Reglas aciertan</th>
              </tr>
            </thead>
            <tbody>
              {spark.porGiro.map((g) => (
                <tr key={g.tramo} className="border-t border-stone-100">
                  <td className="py-1.5 font-bold">{g.tramo}</td>
                  <td className="py-1.5">{miles(g.manos)}</td>
                  <td className="py-1.5">{g.reglas} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-stone-500">
            Más difíciles para las reglas:{' '}
            {[...spark.porLetra]
              .sort((a, b) => a.reglas - b.reglas)
              .slice(0, 4)
              .map((l) => `${l.letra} (${l.reglas} %)`)
              .join(', ')}
            . Por eso hacía falta un modelo que aprenda de los datos.
          </p>
        </div>
      </section>

      {/* 2. La red */}
      <section>
        <h3 className="text-lg font-bold">2. La red neuronal convolucional 1D (prácticas 23 y 24)</h3>
        <p className="mt-1 text-stone-600">
          La red lee la mano como una <b>secuencia de 21 puntos</b> en orden (muñeca → pulgar → índice → medio → anular → meñique). Sus filtros
          miran 3 puntos seguidos a la vez, como si leyera la mano dedo por dedo. Cada punto lleva 3 «canales»: a lo ancho, a lo alto y la
          distancia a la muñeca. Se entrenó con PyTorch en Python y la app hace el mismo cálculo en el navegador.
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-label="Capas de la red">
          {['Entrada 3 × 21', 'Conv1D 32', 'Conv1D 32', 'MaxPool → 10', 'Conv1D 64', 'MaxPool → 5', 'Densa 64', `Salida ${preparacion.clases}`].map((c, i, todas) => (
            <li key={i} className="flex items-center gap-2">
              <span className={`rounded-xl px-3 py-2 font-bold ${i === 0 || i === todas.length - 1 ? 'bg-marca-700 text-white' : 'bg-marca-100 text-marca-900'}`}>{c}</span>
              {i < todas.length - 1 && <ArrowRight className="size-4 text-stone-400" aria-hidden />}
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Curva />
          <dl className="grid grid-cols-2 content-start gap-3">
            {[
              ['Manos para entrenar', miles(preparacion.manos.entrenamiento)],
              ['Prueba (las de p03)', miles(preparacion.manos.prueba)],
              ['Pesos que aprende', miles(entrenamiento.parametros)],
              ['Épocas', `${entrenamiento.epocas} (mejor: ${entrenamiento.epocaMejor})`],
              ['Exactitud en la prueba', pct1(entrenamiento.examen.exactitud)],
              ['F1 en la prueba', pct1(entrenamiento.examen.f1)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-stone-50 p-3">
                <dt className="text-sm text-stone-600">{k}</dt>
                <dd className="text-lg font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {entrenamiento.confusiones.length > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            Donde más se equivoca: {entrenamiento.confusiones.slice(0, 4).map((c) => `${c.real} → ${c.dijo} (${c.veces})`).join(', ')}. La G y la L
            tienen casi la misma forma; las distingue la orientación de la mano.
          </p>
        )}
      </section>

      {/* 3. Comparación */}
      <section>
        <h3 className="text-lg font-bold">3. Comparación con los demás modelos (práctica 25)</h3>
        <p className="mt-1 text-stone-600">Todos se examinaron con las mismas {miles(preparacion.manos.prueba)} manos de prueba, que ninguno vio al aprender.</p>
        <ul className="mt-3 space-y-2">
          {filas.map((f) => (
            <li key={f.nombre} className="grid grid-cols-[minmax(8rem,14rem)_1fr_auto] items-center gap-3 text-sm">
              <span className={f.fuerte ? 'font-bold text-marca-800' : 'font-bold'}>{f.nombre}</span>
              <span className="h-4 rounded-full bg-stone-100" aria-hidden>
                <span className={`block h-4 rounded-full ${f.fuerte ? 'bg-marca-700' : 'bg-stone-400'}`} style={{ width: `${f.f1 * 100}%` }} />
              </span>
              <span className="tabular-nums">
                F1 {pct1(f.f1)}
                {f.nota && <span className="block text-xs text-stone-500">{f.nota}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="mb-2 text-left font-bold">Con manos muy giradas</caption>
            <thead className="text-stone-600">
              <tr>
                <th className="py-1">Giro</th>
                <th className="py-1">Manos</th>
                <th className="py-1">CNN 1D</th>
                <th className="py-1">Random Forest</th>
              </tr>
            </thead>
            <tbody>
              {comparacion.porGiro.map((g) => (
                <tr key={g.tramo} className="border-t border-stone-100">
                  <td className="py-1.5 font-bold">{g.tramo}</td>
                  <td className="py-1.5">{g.manos}</td>
                  <td className="py-1.5">{pct(g.cnn1d)}</td>
                  <td className="py-1.5">{pct(g.bosque)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={`mt-4 rounded-2xl p-4 ${comparacion.superaApp ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-50 text-stone-700'}`}>
          {comparacion.superaApp
            ? `La CNN 1D le gana a la votación que usaba la app (${pct1(comparacion.app.votacion.f1)} → ${pct1(comparacion.modelos.cnn1d.f1)}), así que ahora también vota en el traductor de señas (LSM): cuando está segura (≥ 90 %), confirma letras cuya forma ya casi se cumple. Además, al practicar, la app la usa para saber con qué letra se confundió tu intento.`
            : 'La CNN 1D no superó a la votación de la app, así que solo se muestra aquí.'}
        </p>
      </section>
    </div>
  )
}
