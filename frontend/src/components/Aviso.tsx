import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

export function Aviso({ tipo, children }: { tipo: 'error' | 'exito'; children: ReactNode }) {
  const Icono = tipo === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border-2 p-4 ${
        tipo === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-marca-200 bg-marca-50 text-marca-900'
      }`}
    >
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
