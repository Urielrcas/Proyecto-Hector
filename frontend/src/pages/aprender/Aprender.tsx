import { BookOpen, Check, HeartHandshake, MessageCircle, Move, Siren, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useApp } from '../../context/AppContext'
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
import { alfabeto, FUENTE_ASL, FUENTE_LSM } from '../../lib/aprendizaje/alfabeto'

const PROXIMOS: { titulo: string; descripcion: string; icono: LucideIcon }[] = [
  { titulo: 'Saludos', descripcion: 'Hola, gracias, por favor…', icono: MessageCircle },
  { titulo: 'Necesidades básicas', descripcion: 'Agua, baño, comer…', icono: HeartHandshake },
  { titulo: 'Emergencias', descripcion: 'Ayuda, dolor, doctor…', icono: Siren },
]

export default function Aprender() {
  const { lengua } = useApp()
  const { logradas } = useProgresoAprendizaje()
  const letras = alfabeto(lengua ?? 'LSM')
  const logradasAqui = letras.filter((l) => logradas.includes(l.letra)).length
  const porcentaje = Math.round((logradasAqui / letras.length) * 100)

  return (
    <>
      <EncabezadoPagina titulo="Aprendizaje" descripcion="Practica la lengua de señas con tu cámara." icono={BookOpen} />

      <section aria-labelledby="titulo-alfabeto" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="titulo-alfabeto" className="text-xl font-bold">
              Alfabeto dactilológico · {lengua}
            </h2>
            <p className="mt-1 text-stone-600">Elige una letra, mira cómo se hace y practícala: la cámara te dice si la hiciste bien.</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-sm">
              <span className="font-bold">Tu progreso</span>
              <span className="text-stone-600">
                {logradasAqui} de {letras.length} letras
              </span>
            </div>
            <div
              className="mt-1.5 h-3 overflow-hidden rounded-full bg-stone-200"
              role="progressbar"
              aria-valuenow={porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso del alfabeto"
            >
              <div className="h-full rounded-full bg-marca-600 transition-all" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-8 xl:grid-cols-10">
          {letras.map((l) => {
            const lograda = logradas.includes(l.letra)
            const descripcion = [
              lograda && 'lograda',
              l.movimiento && 'con movimiento',
            ]
              .filter(Boolean)
              .join(', ')
            return (
              <li key={l.letra}>
                <Link
                  to={`/aprender/${encodeURIComponent(l.letra)}`}
                  className={`relative grid aspect-square place-items-center rounded-2xl border-2 text-2xl font-bold transition-colors sm:text-3xl ${
                    lograda
                      ? 'border-marca-300 bg-marca-50 text-marca-800 hover:bg-marca-100'
                      : 'border-stone-200 bg-white text-stone-900 hover:border-marca-300 hover:bg-marca-50/50'
                  }`}
                  aria-label={`Letra ${l.letra}${descripcion ? `: ${descripcion}` : ''}`}
                  title={descripcion || undefined}
                >
                  {l.letra}
                  {lograda && (
                    <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-marca-600 text-white">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                  {l.movimiento && <Move className="absolute bottom-1.5 size-4 text-stone-400" aria-hidden />}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-2">
            <Move className="size-4 text-stone-400" aria-hidden /> Con movimiento
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-4 rounded-md border-2 border-marca-300 bg-marca-50" aria-hidden /> Lograda
          </span>
        </div>

        <p className="mt-4 text-sm text-stone-500">Fuente de las descripciones: {lengua === 'ASL' ? FUENTE_ASL : FUENTE_LSM}.</p>
      </section>

      <section aria-labelledby="titulo-proximos" className="mt-8">
        <h2 id="titulo-proximos" className="text-xl font-bold">
          Palabras y frases
        </h2>
        <p className="mt-1 text-stone-600">Llegarán cuando el modelo de señas con movimiento esté entrenado.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PROXIMOS.map((m) => (
            <li key={m.titulo} className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-stone-200 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500">
                <m.icono className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-stone-700">{m.titulo}</span>
                <span className="block text-sm text-stone-500">{m.descripcion}</span>
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">Próximamente</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
