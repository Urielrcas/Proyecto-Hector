/*
 * COMPONENTE: CONSEJOS DE LA IA PARA LA LETRA QUE SE PRACTICA (en «Practicar letra»)
 * Con los intentos que guarda la app (prácticas 18 y 19) muestra, para ESTA letra:
 *   - cuántos intentos lleva y cuántos logró,
 *   - la predicción de su próximo intento (red neuronal de la práctica 27),
 *   - los consejos del motor de recomendaciones para esta letra (o el más importante en general),
 *   - con qué letra la confunde la IA y el dedo que más falla.
 * Los invitados no tienen expediente: se les invita a iniciar sesión.
 */
import { Brain, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NOMBRE_DEDO_CORTO, type Expediente } from '../../services/intentos'
import { Consejo } from './VistaExpediente'

export function PanelConsejosLetra({ letra, expediente, conCuenta }: { letra: string; expediente: Expediente | null; conCuenta: boolean }) {
  const info = expediente?.letras.find((l) => l.letra === letra)
  const deLetra = expediente?.recomendaciones.filter((c) => c.letra === letra && c.tipo !== 'siguiente') ?? []
  const general = expediente?.recomendaciones.find((c) => c.tipo !== 'siguiente' && c.letra !== letra)
  const consejos = deLetra.length ? deLetra : general ? [general] : []

  return (
    <section aria-labelledby="titulo-consejos-letra" className="mt-4 rounded-2xl border border-marca-200 bg-marca-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-consejos-letra" className="flex items-center gap-2 font-bold">
          <Brain className="size-5 text-marca-700" aria-hidden /> Consejos de tu IA
        </h3>
        {conCuenta && (
          <Link to="/aprender/expediente" className="text-sm font-bold text-marca-800 hover:underline">
            Ver mi expediente →
          </Link>
        )}
      </div>

      {!conCuenta ? (
        <p className="mt-2 text-sm text-stone-700">
          <Link to="/login" className="font-bold text-marca-800 hover:underline">
            Inicia sesión
          </Link>{' '}
          para que la IA recuerde tus intentos y te dé consejos personalizados.
        </p>
      ) : !info || info.intentos === 0 ? (
        <p className="mt-2 text-sm text-stone-700">Haz tu primer intento: la IA irá anotando cómo te va para darte consejos.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone-700">
            Llevas <strong>{info.intentos}</strong> {info.intentos === 1 ? 'intento' : 'intentos'} con la {letra} y la lograste{' '}
            <strong>{info.aciertos}</strong> {info.aciertos === 1 ? 'vez' : 'veces'} · último puntaje <strong>{info.ultimo_puntaje} %</strong>
            {info.confundida_con[0] && (
              <>
                {' '}
                · la IA la confunde con la <strong>{info.confundida_con[0].letra}</strong>
              </>
            )}
            {info.dedo_mas_fallado && (
              <>
                {' '}
                · dedo que más fallas: <strong>{NOMBRE_DEDO_CORTO[info.dedo_mas_fallado].toLowerCase()}</strong>
              </>
            )}
            .
          </p>
          {info.prediccion && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-stone-800">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-marca-700" aria-hidden />
              {info.prediccion.mensaje}
            </p>
          )}
        </>
      )}

      {conCuenta && consejos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {consejos.slice(0, 2).map((c, i) => (
            <Consejo key={i} consejo={c} conEnlace={c.letra !== letra} />
          ))}
        </ul>
      )}
    </section>
  )
}
