/*
 * COMPONENTE: TU PERFIL DE APRENDIZAJE Y LAS PERSONAS QUE APRENDEN COMO TÚ (en «Mi expediente»)
 *   - Perfil (práctica 28): K-Means agrupó a las personas según cómo aprenden. Se muestra tu perfil, qué
 *     significa, un consejo y el MAPA PCA de perfiles con un punto que dice «Tú».
 *   - Vecinos (práctica 29, KNN): las personas más parecidas a ti (comparando tu nivel en las letras que
 *     ambos practicaron). Con lo que les pasó a ellas: qué letras te saldrán fácil, cuáles te pueden costar
 *     y en cuáles vas por debajo.
 * Mientras no haya suficientes usuarios reales, la población de referencia es simulada y así se dice.
 */
import { Compass, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PERFILES } from '../../lib/ia/perfiles/perfiles'
import type { PerfilAprendizaje, Vecinos } from '../../services/intentos'

const NOMBRE_RASGO: Record<keyof PerfilAprendizaje['rasgos'], (v: number) => string> = {
  tasa: (v) => `${Math.round(v * 100)} % de aciertos`,
  puntaje: (v) => `puntaje promedio ${Math.round(v)} %`,
  intentos_por_letra: (v) => `${v.toFixed(1)} intentos por letra`,
  letras: (v) => `${Math.round(v)} letras practicadas`,
  mejora: (v) => `${v >= 0 ? 'mejoras' : 'bajas'} ${Math.abs(Math.round(v))} puntos de tu primer a tu último intento`,
  segundos: (v) => `${v.toFixed(1)} s por intento`,
}

/** El mapa PCA de perfiles: una muestra de personas (color = perfil) y tú. */
function MapaPerfiles({ yo }: { yo: PerfilAprendizaje }) {
  const { x: xs, y: ys, perfil } = PERFILES.muestra
  const todosX = [...xs, yo.x]
  const todosY = [...ys, yo.y]
  const [minX, maxX, minY, maxY] = [Math.min(...todosX), Math.max(...todosX), Math.min(...todosY), Math.max(...todosY)]
  const W = 420
  const H = 260
  const m = 16
  const px = (v: number) => m + ((v - minX) / (maxX - minX || 1)) * (W - 2 * m)
  const py = (v: number) => H - m - ((v - minY) / (maxY - minY || 1)) * (H - 2 * m)
  const color = (p: number) => PERFILES.perfiles[p]?.color ?? '#78716c'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-stone-50" role="img" aria-label={`Mapa de perfiles: estás en el perfil «${yo.nombre}»`}>
      {xs.map((v, i) => (
        <circle key={i} cx={px(v)} cy={py(ys[i])} r={2.4} fill={color(perfil[i])} opacity={perfil[i] === yo.id ? 0.55 : 0.25} />
      ))}
      <g>
        <circle cx={px(yo.x)} cy={py(yo.y)} r={13} fill="white" stroke={color(yo.id)} strokeWidth={4} />
        <text x={px(yo.x)} y={py(yo.y) + 4} textAnchor="middle" className="fill-stone-900 text-[10px] font-bold">
          Tú
        </text>
      </g>
    </svg>
  )
}

export function PerfilYVecinos({ perfil, vecinos, conEnlaces }: { perfil: PerfilAprendizaje | null; vecinos: Vecinos | null; conEnlaces: boolean }) {
  const enlace = (letra: string) =>
    conEnlaces ? (
      <Link to={`/aprender/${encodeURIComponent(letra)}`} className="rounded-lg bg-white px-2 py-0.5 font-bold text-marca-800 hover:underline">
        {letra}
      </Link>
    ) : (
      <b>{letra}</b>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      {/* Perfil */}
      <section aria-labelledby="titulo-perfil" className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="titulo-perfil" className="flex items-center gap-2 text-lg font-bold">
          <Compass className="size-5 text-marca-700" aria-hidden /> Tu perfil de aprendizaje
        </h2>
        {perfil ? (
          <>
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: PERFILES.perfiles[perfil.id]?.color }}>
                {perfil.nombre}
              </span>
              <span className="text-stone-700">{perfil.descripcion}</span>
            </p>
            <p className="mt-2 rounded-xl bg-marca-50/70 p-3 text-sm text-stone-800">
              <b>Consejo:</b> {perfil.consejo}
            </p>
            <div className="mt-3">
              <MapaPerfiles yo={perfil} />
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              {PERFILES.perfiles.map((p) => (
                <li key={p.id} className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded-full" style={{ background: p.color }} aria-hidden />
                  {p.nombre}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">
              Cómo aprendes: {(Object.keys(NOMBRE_RASGO) as (keyof PerfilAprendizaje['rasgos'])[]).map((r) => NOMBRE_RASGO[r](perfil.rasgos[r])).join(' · ')}.
              Los perfiles salieron de agrupar con K-Means a {PERFILES.origen.split(' (')[0]}; el mapa es un PCA de esos rasgos.
            </p>
          </>
        ) : (
          <p className="mt-2 text-stone-600">Practica unas letras más (al menos 8 intentos) y la IA te dirá cómo aprendes.</p>
        )}
      </section>

      {/* Vecinos (KNN) */}
      <section aria-labelledby="titulo-vecinos" className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 id="titulo-vecinos" className="flex items-center gap-2 text-lg font-bold">
          <Users className="size-5 text-marca-700" aria-hidden /> Personas que aprenden como tú
        </h2>
        {vecinos ? (
          <>
            <p className="mt-2 text-sm text-stone-700">
              La IA (KNN) buscó, entre {vecinos.poblacion} personas de referencia{vecinos.origen === 'simulada' ? ' (simuladas)' : ''}, las{' '}
              <b>{vecinos.k}</b> que van más parecido a ti en las letras que ya practicaste (se parecen un <b>{Math.round(vecinos.parecido)} %</b>).
              Esto es lo que les pasó:
            </p>
            <div className="mt-3 space-y-3 text-sm">
              {vecinos.faciles.length > 0 && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="font-bold text-emerald-900">Te van a salir fácil (aún no las practicas)</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    {vecinos.faciles.map((f) => (
                      <span key={f.letra} className="flex items-center gap-1">
                        {enlace(f.letra)} <span className="text-xs text-emerald-800">≈ {Math.round(f.nivel)} %</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {vecinos.dificiles.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="font-bold text-amber-900">Les costaron: practícalas con calma</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    {vecinos.dificiles.map((f) => (
                      <span key={f.letra} className="flex items-center gap-1">
                        {enlace(f.letra)} <span className="text-xs text-amber-800">≈ {Math.round(f.nivel)} %</span>
                      </span>
                    ))}
                  </p>
                </div>
              )}
              {vecinos.por_debajo.length > 0 && (
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="font-bold">Vas por debajo de ellos en</p>
                  <ul className="mt-1 space-y-1">
                    {vecinos.por_debajo.map((f) => (
                      <li key={f.letra} className="flex flex-wrap items-center gap-2">
                        {enlace(f.letra)} tú ≈ {Math.round(f.tuyo ?? 0)} %, ellos ≈ {Math.round(f.nivel)} %
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!vecinos.faciles.length && !vecinos.dificiles.length && !vecinos.por_debajo.length && (
                <p className="text-stone-600">Vas igual o mejor que ellos en todo. ¡Muy bien!</p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-stone-600">Practica al menos 2 letras distintas y la IA te comparará con personas que aprenden como tú.</p>
        )}
      </section>
    </div>
  )
}
