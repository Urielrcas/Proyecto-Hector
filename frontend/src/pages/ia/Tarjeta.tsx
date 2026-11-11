/*
 * PIEZAS COMPARTIDAS de «Mi IA» y «IA por dentro»
 *   - Tarjeta: el recuadro blanco con ícono, título y botones a la derecha.
 *   - pct: convierte 0.98 en «98 %» (o «—» si no hay dato).
 */

// ▸ Desde Lucide (íconos):
import type { LucideIcon } from 'lucide-react'
// ▸ Desde React:
import type { ReactNode } from 'react'

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)} %`)

export function Tarjeta({ titulo, icono: Icono, children, acciones }: { titulo: string; icono: LucideIcon; children: ReactNode; acciones?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-xl font-bold">
          <span className="grid size-10 place-items-center rounded-xl bg-marca-100 text-marca-800">
            <Icono className="size-5" aria-hidden />
          </span>
          {titulo}
        </h2>
        {acciones}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
