/*
 * TUS SEÑAS PERSONALES (pantalla «Mi IA»)
 * Las letras que la IA recuerda «a tu manera»: el dibujo de tu forma (con los 21 puntos guardados),
 * cuántas posturas recuerda y un botón para olvidarla.
 */

// ▸ Desde Lucide (íconos):
import { Trash2 } from 'lucide-react'
// ▸ Desde React Router:
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { useModeloIA } from '../../hooks/useModeloIA'
import { descomprimirPuntos } from '../../lib/ia/cnn/imagen'

/** Huesos de la mano (pares de puntos de MediaPipe). */
const HUESOS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

/** Dibuja el esqueleto de una mano guardada (SVG propio). Se ve en espejo, como frente a la cámara. */
export function EsqueletoMano({ datos, etiqueta }: { datos: number[]; etiqueta: string }) {
  const p = descomprimirPuntos(datos)
  const xs = p.map((q) => q.x)
  const ys = p.map((q) => q.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const escala = 80 / Math.max(maxX - minX, maxY - minY, 1e-6)
  const a = (i: number) => ({ x: 50 - ((p[i].x - (minX + maxX) / 2) * escala), y: 50 + (p[i].y - (minY + maxY) / 2) * escala })
  return (
    <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label={etiqueta}>
      {HUESOS.map(([i, j]) => (
        <line key={`${i}-${j}`} x1={a(i).x} y1={a(i).y} x2={a(j).x} y2={a(j).y} stroke="#148372" strokeWidth="3.5" strokeLinecap="round" />
      ))}
      {p.map((_, i) => (
        <circle key={i} cx={a(i).x} cy={a(i).y} r={[4, 8, 12, 16, 20].includes(i) ? 3.5 : 2.2} fill={i === 4 ? '#f59e0b' : '#13544b'} />
      ))}
    </svg>
  )
}

export function SenasPersonales() {
  const ia = useModeloIA()
  const personales = Object.entries(ia.modelo.personales ?? {}).filter(([, lista]) => lista.length)

  if (!personales.length) {
    return (
      <p className="rounded-2xl bg-stone-50 p-4 text-stone-600">
        Todavía no le enseñas ninguna. Si haces una letra a tu manera (por ejemplo, tu A con los dedos un poco distintos), ve a practicarla y
        toca «Enséñale tu forma a la IA», o usa «Enséñale» en el laboratorio de abajo.
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {personales.map(([letra, lista]) => (
        <li key={letra} className="rounded-2xl border border-marca-200 bg-marca-50/50 p-3 text-center">
          <Link to={`/aprender/${encodeURIComponent(letra)}`} className="block" title={`Practicar la ${letra}`}>
            <span className="mx-auto block size-20">
              <EsqueletoMano datos={lista.at(-1)!} etiqueta={`Tu forma de la letra ${letra}`} />
            </span>
            <span className="mt-1 block text-2xl font-bold text-marca-900">{letra}</span>
          </Link>
          <span className="block text-xs text-stone-600">{lista.length} posturas recordadas</span>
          <button onClick={() => ia.olvidarForma(letra)} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-red-700 hover:underline">
            <Trash2 className="size-4" aria-hidden /> Olvidar
          </button>
        </li>
      ))}
    </ul>
  )
}
