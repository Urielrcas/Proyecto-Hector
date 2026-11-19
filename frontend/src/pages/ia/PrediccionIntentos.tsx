/*
 * IA POR DENTRO → PREDICCIÓN DEL SIGUIENTE INTENTO (prácticas 26 y 27)
 * Una CNN 1D de REGRESIÓN (la salida es un número, no una letra): con los dos últimos intentos de
 * una letra (puntaje, segundos y si la logró) estima el puntaje del siguiente.
 * Se entrenó con intentos simulados (ml/simulacion_intentos.py), dividiendo por persona, y se compara
 * contra dos «adivinanzas sencillas». El servidor la usa en el expediente (backend/app/prediccion.py).
 */
import { PRACTICAS } from '../../lib/ia/cnn1d/practicas'

const { prediccion: P, prediccionDatos: D } = PRACTICAS
const miles = (n: number) => n.toLocaleString('es-MX')

export function PrediccionIntentos() {
  const filas = [
    { nombre: 'CNN 1D (la red)', m: P.examen.cnn, fuerte: true },
    { nombre: 'Repetir el último puntaje', m: P.examen.ultimo },
    { nombre: 'Promedio de los dos', m: P.examen.promedio },
  ]
  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        En la práctica de clase se estimaba el tercer parcial con los dos primeros. Aquí se estima <b>qué tan bien te saldrá una letra en tu
        próximo intento</b> con tus dos intentos anteriores de esa letra. La salida es un número de 0 a 100 (regresión). La ves en «Practicar
        letra» y en «Mi expediente».
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Qué recibe y qué responde la red">
        <span className="rounded-xl bg-marca-100 px-3 py-2 font-bold text-marca-900">Intento 1: puntaje · segundos · ¿logrado?</span>
        <span className="rounded-xl bg-marca-100 px-3 py-2 font-bold text-marca-900">Intento 2: puntaje · segundos · ¿logrado?</span>
        <span className="text-stone-500">→ Conv1D 16 → Densa 16 →</span>
        <span className="rounded-xl bg-marca-700 px-3 py-2 font-bold text-white">Puntaje del intento 3</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Intentos simulados', miles(D.intentos)],
          ['Personas', miles(D.personas)],
          ['Ejemplos (ventanas de 3)', miles(D.ejemplos)],
          ['Pesos que aprende', String(P.parametros)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-stone-50 p-3">
            <dt className="text-sm text-stone-600">{k}</dt>
            <dd className="text-lg font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-sm">
          <caption className="mb-2 text-left font-bold">Examen con {miles(D.prueba)} ejemplos de personas que la red nunca vio</caption>
          <thead className="text-stone-600">
            <tr>
              <th className="py-1">Método</th>
              <th className="py-1">Error promedio (MAE)</th>
              <th className="py-1">RMSE</th>
              <th className="py-1">R²</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} className={`border-t border-stone-100 ${f.fuerte ? 'font-bold text-marca-800' : ''}`}>
                <td className="py-1.5">{f.nombre}</td>
                <td className="py-1.5">{f.m.mae.toFixed(1)} puntos</td>
                <td className="py-1.5">{f.m.rmse.toFixed(1)}</td>
                <td className="py-1.5">{f.m.r2.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-stone-600">
          La red se equivoca en promedio por {P.examen.cnn.mae.toFixed(0)} puntos, menos que las adivinanzas sencillas. Predecir a una persona
          es difícil (cada intento tiene su suerte), por eso la app lo dice como una estimación: «calculo que…».
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="mb-2 text-left font-bold">Algunos ejemplos de la prueba</caption>
          <thead className="text-stone-600">
            <tr>
              <th className="py-1">Intento 1</th>
              <th className="py-1">Intento 2</th>
              <th className="py-1">Intento 3 real</th>
              <th className="py-1">La red dijo</th>
            </tr>
          </thead>
          <tbody>
            {P.ejemplos.map((e, i) => (
              <tr key={i} className="border-t border-stone-100">
                <td className="py-1.5">{e.intento1} %</td>
                <td className="py-1.5">{e.intento2} %</td>
                <td className="py-1.5 font-bold">{e.real} %</td>
                <td className="py-1.5">{e.predicho} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-stone-500">
        Los intentos de entrenamiento son simulados (no son de personas reales) mientras se juntan suficientes intentos reales; con{' '}
        <code>python ml/p26_preparar_prediccion.py --mongo</code> se suman los de la app.
      </p>
    </div>
  )
}
