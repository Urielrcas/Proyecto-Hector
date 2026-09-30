import { Hand } from 'lucide-react'

export const NOMBRE_APP = 'Intérprete de Señas'

/** `textoSoloEscritorio`: en pantallas pequeñas muestra solo el ícono. */
export function Logo({ textoSoloEscritorio = false }: { textoSoloEscritorio?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-700 text-white shadow-sm">
        <Hand className="size-6" aria-hidden />
      </span>
      <span
        className={`text-lg font-bold tracking-tight whitespace-nowrap text-marca-900 ${textoSoloEscritorio ? 'max-sm:sr-only' : ''}`}
      >
        {NOMBRE_APP}
      </span>
    </div>
  )
}
