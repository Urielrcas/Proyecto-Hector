/*
 * COMPONENTE: EXPEDIENTE DE APRENDIZAJE (prácticas 18 y 19)
 * Muestra el expediente que arma el servidor (backend/app/recomendaciones.py):
 *   1. Resumen: intentos, aciertos, letras logradas y días de práctica.
 *   2. Consejos de la IA, del más importante al menos.
 *   3. Mapa del alfabeto: cada letra con su estado (dominada, en progreso, difícil, sin practicar).
 *   4. Detalle de las letras practicadas: puntaje, con qué letra la confunde la IA, el dedo que más
 *      falla y la predicción de su próximo intento (red de la práctica 27).
 * Lo usan «Mi expediente» (el usuario) y el tablero de «Estadísticas» (el administrador, con conEnlaces=false).
 */
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Lightbulb, Minus, PartyPopper, Repeat, Shapes, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NOMBRE_DEDO_CORTO, type EstadoLetra, type Expediente, type Recomendacion } from '../../services/intentos'

const pct = (v: number) => `${Math.round(v * 100)} %`

const ESTILO_ESTADO: Record<EstadoLetra, { fondo: string; texto: string; nombre: string }> = {
  dominada: { fondo: 'bg-emerald-100 border-emerald-300', texto: 'text-emerald-900', nombre: 'Dominada' },
  'en progreso': { fondo: 'bg-amber-50 border-amber-300', texto: 'text-amber-900', nombre: 'En progreso' },
  difícil: { fondo: 'bg-red-50 border-red-300', texto: 'text-red-900', nombre: 'Te cuesta' },
  'sin practicar': { fondo: 'bg-white border-stone-200', texto: 'text-stone-500', nombre: 'Sin practicar' },
}

const ICONO_CONSEJO: Record<Recomendacion['tipo'], LucideIcon> = {
  dificil: AlertTriangle,
  confusion: Shapes,
  grupo: Target,
  repaso: Repeat,
  mejorando: PartyPopper,
  siguiente: ArrowRight,
  inactividad: CalendarClock,
  inicio: Sparkles,
}

export function Consejo({ consejo, conEnlace }: { consejo: Recomendacion; conEnlace: boolean }) {
  const Icono = ICONO_CONSEJO[consejo.tipo]
  const alerta = consejo.tipo === 'dificil' || consejo.tipo === 'confusion'
  return (
    <li className={`flex items-start gap-3 rounded-2xl border p-3 ${alerta ? 'border-amber-200 bg-amber-50/70' : 'border-stone-200 bg-white'}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${alerta ? 'bg-amber-100 text-amber-800' : 'bg-marca-100 text-marca-800'}`}>
        <Icono className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-stone-800">{consejo.mensaje}</p>
        {conEnlace && consejo.letra && (
          <Link to={`/aprender/${encodeURIComponent(consejo.letra)}`} className="mt-1 inline-block text-sm font-bold text-marca-800 hover:underline">
            Practicar la {consejo.letra} →
          </Link>
        )}
      </div>
    </li>
  )
}

const Tendencia = ({ t }: { t: 'mejorando' | 'estable' | 'bajando' }) =>
  t === 'mejorando' ? (
    <ArrowUpRight className="size-4 text-emerald-700" aria-label="mejorando" />
  ) : t === 'bajando' ? (
    <ArrowDownRight className="size-4 text-red-700" aria-label="bajando" />
  ) : (
    <Minus className="size-4 text-stone-400" aria-label="estable" />
  )

export function VistaExpediente({ expediente, conEnlaces = true }: { expediente: Expediente; conEnlaces?: boolean }) {
  const { resumen, letras, recomendaciones } = expediente
  const practicadas = letras.filter((l) => l.intentos > 0).sort((a, b) => a.tasa - b.tasa || b.intentos - a.intentos)
  return (
    <div className="space-y-6">
      {/* 1. Resumen */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Intentos', resumen.intentos.toLocaleString('es-MX'), `${resumen.aciertos} logrados`],
          ['Aciertos', resumen.intentos ? pct(resumen.tasa) : '—', resumen.intentos ? `puntaje promedio ${Math.round(resumen.puntaje_promedio)} %` : 'aún sin intentos'],
          ['Letras logradas', `${resumen.letras_logradas} / ${resumen.total_letras}`, `${resumen.letras_practicadas} practicadas`],
          ['Días de práctica', String(resumen.dias_practicados), resumen.ultima_practica ? `última: ${new Date(resumen.ultima_practica).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}` : '—'],
        ].map(([titulo, valor, detalle]) => (
          <div key={titulo} className="rounded-2xl border border-stone-200 bg-white p-4">
            <dt className="text-sm font-bold text-stone-600">{titulo}</dt>
            <dd className="mt-1 text-2xl font-bold">{valor}</dd>
            <dd className="text-sm text-stone-500">{detalle}</dd>
          </div>
        ))}
      </dl>

      {/* 2. Consejos */}
      <section aria-labelledby="titulo-consejos">
        <h2 id="titulo-consejos" className="flex items-center gap-2 text-lg font-bold">
          <Lightbulb className="size-5 text-marca-700" aria-hidden /> Consejos de la IA
        </h2>
        {recomendaciones.length ? (
          <ul className="mt-3 space-y-2">
            {recomendaciones.map((c, i) => (
              <Consejo key={i} consejo={c} conEnlace={conEnlaces} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-stone-600">Sin consejos por ahora: ¡todo va muy bien!</p>
        )}
      </section>

      {/* 3. Mapa del alfabeto */}
      <section aria-labelledby="titulo-mapa">
        <h2 id="titulo-mapa" className="text-lg font-bold">
          Cómo vas en cada letra
        </h2>
        <ul className="mt-2 flex flex-wrap gap-3 text-sm" aria-label="Significado de los colores">
          {(Object.keys(ESTILO_ESTADO) as EstadoLetra[]).map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className={`size-4 rounded border ${ESTILO_ESTADO[e].fondo}`} aria-hidden />
              {ESTILO_ESTADO[e].nombre}
            </li>
          ))}
        </ul>
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7 lg:grid-cols-9">
          {letras.map((l) => {
            const estilo = ESTILO_ESTADO[l.estado]
            const contenido = (
              <>
                <span className="text-xl font-bold">{l.letra}</span>
                <span className="text-xs">{l.intentos ? pct(l.tasa) : '—'}</span>
                <span className="sr-only">: {estilo.nombre}</span>
              </>
            )
            const clase = `flex aspect-square flex-col items-center justify-center rounded-2xl border-2 ${estilo.fondo} ${estilo.texto}`
            return (
              <li key={l.letra}>
                {conEnlaces ? (
                  <Link to={`/aprender/${encodeURIComponent(l.letra)}`} className={`${clase} transition-transform hover:-translate-y-0.5`}>
                    {contenido}
                  </Link>
                ) : (
                  <div className={clase}>{contenido}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* 4. Detalle de las letras practicadas (de la que más cuesta a la que menos) */}
      {practicadas.length > 0 && (
        <section aria-labelledby="titulo-detalle">
          <h2 id="titulo-detalle" className="text-lg font-bold">
            Letras practicadas
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="p-3">Letra</th>
                  <th className="p-3">Intentos</th>
                  <th className="p-3">Aciertos</th>
                  <th className="p-3">Puntaje</th>
                  <th className="p-3">La IA la confunde con</th>
                  <th className="p-3">Dedo que más falla</th>
                  <th className="p-3">Próximo intento (IA)</th>
                </tr>
              </thead>
              <tbody>
                {practicadas.map((l) => (
                  <tr key={l.letra} className="border-t border-stone-100">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-bold ${ESTILO_ESTADO[l.estado].fondo} ${ESTILO_ESTADO[l.estado].texto}`}>
                        {l.letra} <Tendencia t={l.tendencia} />
                      </span>
                    </td>
                    <td className="p-3">{l.intentos}</td>
                    <td className="p-3">
                      {l.aciertos} ({pct(l.tasa)})
                    </td>
                    <td className="p-3">
                      {Math.round(l.puntaje_promedio)} % <span className="text-stone-500">(último {l.ultimo_puntaje} %)</span>
                    </td>
                    <td className="p-3">{l.confundida_con.length ? l.confundida_con.map((c) => `${c.letra} (${c.veces})`).join(', ') : '—'}</td>
                    <td className="p-3">{l.dedo_mas_fallado ? NOMBRE_DEDO_CORTO[l.dedo_mas_fallado] : '—'}</td>
                    <td className="p-3">{l.prediccion ? `≈ ${l.prediccion.puntaje} %` : l.estado === 'dominada' ? 'Ya la dominas' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            «Próximo intento»: una red neuronal calcula qué tan bien te saldrá la letra la próxima vez, con tus dos últimos intentos.
          </p>
        </section>
      )}
    </div>
  )
}
