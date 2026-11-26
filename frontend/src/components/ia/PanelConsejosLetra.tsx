/*
 * COMPONENTE: CONSEJOS DE LA IA PARA LA LETRA QUE SE PRACTICA (en «Practicar letra»)
 * Con los intentos que guarda la app (prácticas 18 y 19) muestra, para ESTA letra:
 *   - cuántos intentos lleva y cuántos logró,
 *   - la predicción de su próximo intento (red neuronal de la práctica 27),
 *   - los consejos del motor de recomendaciones para esta letra (o el más importante en general),
 *   - con qué letra la confunde la IA y el dedo que más falla,
 *   - un consejo personal por dedos: «Llevas 20 intentos fallidos con la E. En el 60 % de ellos falló tu
 *     pulgar. Te aconsejo: …» (lib/aprendizaje/consejoDedos.ts).
 * Los invitados no tienen expediente: se les invita a iniciar sesión.
 */
import { Brain, Hand, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { consejoDedos } from '../../lib/aprendizaje/consejoDedos'
import { NOMBRE_DEDO_CORTO, type Expediente } from '../../services/intentos'
import { Consejo } from './VistaExpediente'

export function PanelConsejosLetra({ letra, expediente, conCuenta }: { letra: string; expediente: Expediente | null; conCuenta: boolean }) {
  const info = expediente?.letras.find((l) => l.letra === letra)
  const deLetra = expediente?.recomendaciones.filter((c) => c.letra === letra && c.tipo !== 'siguiente') ?? []
  const general = expediente?.recomendaciones.find((c) => c.tipo !== 'siguiente' && c.letra !== letra)
  const consejos = deLetra.length ? deLetra : general ? [general] : []
  const lengua = expediente?.lengua
  const personal = useMemo(() => {
    if (!lengua || !info) return null
    const letras = alfabeto(lengua)
    const esta = letras.find((l) => l.letra === letra)
    return esta ? consejoDedos(esta, info, letras) : null
  }, [lengua, info, letra])

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
          {personal && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-stone-800">
              <p className="flex items-start gap-2 font-bold">
                <Hand className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                {personal.resumen}
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-9">
                {personal.consejos.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
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
