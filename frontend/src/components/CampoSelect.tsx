import { ChevronDown } from 'lucide-react'
import { useId, type SelectHTMLAttributes } from 'react'

interface CampoSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string
  opciones: { valor: string; texto: string }[]
  error?: string | null
}

export function CampoSelect({ etiqueta, opciones, error, className = '', ...props }: CampoSelectProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-bold text-stone-800">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-h-12 w-full appearance-none rounded-xl border-2 bg-white py-3 pr-11 pl-4 text-base text-stone-900 focus:outline-none ${
            error ? 'border-red-600' : 'border-stone-300 focus:border-marca-600'
          }`}
          {...props}
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
