/*
 * MI IA → TU MANO EN EL MAPA (PCA para el usuario)
 * El mapa PCA de la práctica 09 resume las 57 medidas de una mano en 2 números. Aquí la app hace las
 * mismas cuentas con TU mano en vivo (z = (medida − media) / escala → coordenadas = z · componentes) y la
 * dibuja como un punto que se mueve entre las letras: si tu punto cae junto a la E, tu mano se parece a la E.
 * Los colores son los 4 grupos de letras parecidas (práctica 08b).
 * La cámara se prende solo al tocar «Prender la cámara» (MediaPipe se descarga aparte).
 */
import { Camera, CameraOff } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Boton } from '../../components/Boton'
import { claseDeLetra, COLORES_FAMILIA, familiaDeLetra, familiasDe, GRUPOS, PCA } from '../../lib/ia/grupos/grupos'
import { centrosDeLetras, proyectarMano, rangoSinExtremos } from '../../lib/ia/grupos/proyeccion'
import type { Punto } from '../../lib/vision/postura'

const CamaraManos = lazy(() => import('../../components/CamaraManos').then((m) => ({ default: m.CamaraManos })))

const N_GRUPOS = GRUPOS.familias.defecto
/** Cuántas posiciones recientes se dibujan como «estela» del punto. */
const ESTELA = 12

export function MapaDeMiMano() {
  const [encendida, setEncendida] = useState(false)
  const [estela, setEstela] = useState<[number, number][]>([])
  const ultimo = useRef(0)

  // Centro de cada letra en el mapa (promedio de sus manos de muestra).
  const centros = useMemo(() => centrosDeLetras(), [])

  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    if (tiempo - ultimo.current < 80) return // ~12 veces por segundo es suficiente para el mapa
    ultimo.current = tiempo
    const p = puntos ? proyectarMano(puntos) : null
    setEstela((e) => (p ? [...e, p].slice(-ESTELA) : e.length ? [] : e))
  }

  const actual = estela.at(-1) ?? null
  const cercanas = actual
    ? [...centros].sort((a, b) => Math.hypot(a.x - actual[0], a.y - actual[1]) - Math.hypot(b.x - actual[0], b.y - actual[1])).slice(0, 3)
    : []
  const grupo = cercanas[0] ? familiasDe(N_GRUPOS)[familiaDeLetra(cercanas[0].letra, N_GRUPOS)] : null

  // Escala del dibujo: la de las manos de muestra.
  const { x: xs, y: ys } = PCA.puntos
  // Sin las manos más extremas (casi todas X), para que las letras no queden apretadas en el centro.
  const [[minX, maxX], [minY, maxY]] = [rangoSinExtremos(xs), rangoSinExtremos(ys)]
  const W = 520
  const H = 360
  const m = 18
  const px = (v: number) => m + ((Math.min(maxX, Math.max(minX, v)) - minX) / (maxX - minX)) * (W - 2 * m)
  const py = (v: number) => H - m - ((Math.min(maxY, Math.max(minY, v)) - minY) / (maxY - minY)) * (H - 2 * m)

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_3fr] [&>*]:min-w-0">
      <div>
        {encendida ? (
          <Suspense fallback={<div className="grid aspect-[4/3] place-items-center rounded-2xl bg-stone-900 text-white">Preparando la cámara…</div>}>
            <CamaraManos alDetectar={alDetectar} />
          </Suspense>
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-stone-100 p-4 text-center text-stone-600">
            <p>Prende la cámara y haz cualquier letra: verás tu mano moverse por el mapa.</p>
          </div>
        )}
        <Boton className="mt-3" variante={encendida ? 'secundario' : 'primario'} onClick={() => (setEncendida(!encendida), setEstela([]))}>
          {encendida ? <CameraOff className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
          {encendida ? 'Apagar la cámara' : 'Prender la cámara'}
        </Boton>
        <div className="mt-4 rounded-2xl bg-marca-50/70 p-4" aria-live="polite">
          {actual && cercanas.length ? (
            <>
              <p className="text-sm text-stone-600">Tu mano se parece más a</p>
              <p className="mt-1 flex gap-2">
                {cercanas.map((c, i) => (
                  <span
                    key={c.letra}
                    className={`grid place-items-center rounded-xl font-bold text-white ${i === 0 ? 'size-14 text-2xl' : 'size-10 text-lg opacity-80'}`}
                    style={{ background: COLORES_FAMILIA[familiaDeLetra(c.letra, N_GRUPOS) % COLORES_FAMILIA.length] }}
                  >
                    {c.letra}
                  </span>
                ))}
              </p>
              {grupo && <p className="mt-2 text-sm text-stone-700">Grupo: <b>{grupo.nombre}</b></p>}
            </>
          ) : (
            <p className="text-sm text-stone-600">{encendida ? 'Pon tu mano frente a la cámara.' : 'Aquí verás a qué letras se parece tu mano.'}</p>
          )}
        </div>
      </div>

      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-stone-50" role="img" aria-label="Mapa de las letras con tu mano como un punto">
          {/* Manos de muestra, muy tenues */}
          {xs.map((v, i) => (
            <circle key={i} cx={px(v)} cy={py(ys[i])} r={1.6} fill={COLORES_FAMILIA[familiaDeLetra(PCA.letras[PCA.puntos.letra[i]], N_GRUPOS) % COLORES_FAMILIA.length]} opacity={0.18} />
          ))}
          {/* Letras */}
          {centros.map((c) => {
            const destacada = cercanas[0]?.letra === c.letra
            return (
              <g key={c.letra}>
                <circle cx={px(c.x)} cy={py(c.y)} r={destacada ? 13 : 10} fill={COLORES_FAMILIA[familiaDeLetra(claseDeLetra(c.letra), N_GRUPOS) % COLORES_FAMILIA.length]} stroke="white" strokeWidth={2} />
                <text x={px(c.x)} y={py(c.y) + 3.5} textAnchor="middle" className="fill-white text-[9px] font-bold">
                  {c.letra}
                </text>
              </g>
            )
          })}
          {/* Tu mano: estela y punto */}
          {estela.length > 1 && (
            <polyline points={estela.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} fill="none" stroke="#1c1917" strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round" />
          )}
          {actual && (
            <g>
              <circle cx={px(actual[0])} cy={py(actual[1])} r={11} fill="#1c1917" stroke="white" strokeWidth={3} />
              <text x={px(actual[0])} y={py(actual[1]) + 3.5} textAnchor="middle" className="fill-white text-[9px] font-bold">
                Tú
              </text>
            </g>
          )}
        </svg>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          {familiasDe(N_GRUPOS).map((f) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full" style={{ background: COLORES_FAMILIA[f.id % COLORES_FAMILIA.length] }} aria-hidden />
              {GRUPOS.familias.grupos[f.id]?.nombre ?? f.nombre}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          El mapa es un PCA: resume las 57 medidas de una mano en 2. Letras cerca = señas parecidas. Tu punto se calcula con las mismas cuentas, en
          tu propio navegador.
        </p>
      </div>
    </div>
  )
}
