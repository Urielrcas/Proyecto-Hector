import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function EncabezadoPagina({
  titulo,
  descripcion,
  icono: Icono,
  volverA,
  acciones,
}: {
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  volverA?: string
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
      <div className="flex min-w-0 items-center gap-3">
        {volverA && (
          <Link to={volverA} className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-700 hover:bg-stone-200" aria-label="Volver">
            <ArrowLeft className="size-6" />
          </Link>
        )}
        {Icono && !volverA && (
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-800">
            <Icono className="size-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="text-stone-600">{descripcion}</p>}
        </div>
      </div>
      {acciones}
    </div>
  )
}
