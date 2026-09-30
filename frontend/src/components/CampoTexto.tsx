import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  error?: string | null
  ayuda?: string
  icono?: LucideIcon
}

export function CampoTexto({ etiqueta, error, ayuda, icono: Icono, type = 'text', className = '', ...props }: CampoTextoProps) {
  const id = useId()
  const [mostrar, setMostrar] = useState(false)
  const esContrasena = type === 'password'
  const idDescripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-bold text-stone-800">
        {etiqueta}
      </label>
      <div className="relative">
        {Icono && (
          <Icono className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
        )}
        <input
          id={id}
          type={esContrasena && mostrar ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={idDescripcion}
          className={`min-h-12 w-full rounded-xl border-2 bg-white py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none ${
            Icono ? 'pl-11' : 'pl-4'
          } ${esContrasena ? 'pr-12' : 'pr-4'} ${
            error ? 'border-red-600 focus:border-red-700' : 'border-stone-300 focus:border-marca-600'
          }`}
          {...props}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setMostrar((m) => !m)}
            className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-stone-600 hover:bg-stone-100"
            aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={mostrar}
          >
            {mostrar ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1.5 text-sm text-stone-600">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}
