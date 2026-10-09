/*
 * COMPONENTE: LISTA DESPLEGABLE
 * Un <select> con etiqueta y estilo de la app. Ej.: tipo de usuario, lengua de señas.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ChevronDown (flechita ▾)
import { ChevronDown } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useId → genera un identificador único (para unir una etiqueta con su campo)
//     SelectHTMLAttributes → tipo: las propiedades normales de un <select>
import { useId, type SelectHTMLAttributes } from 'react'

// Además de lo normal de un <select> (value, onChange, disabled...), recibe:
interface CampoSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string // texto en negritas arriba
  opciones: { valor: string; texto: string }[] // valor = lo que se guarda; texto = lo que ve el usuario
  error?: string | null // mensaje rojo debajo (opcional)
}

export function CampoSelect({ etiqueta, opciones, error, className = '', ...props }: CampoSelectProps) {
  const id = useId() // une la etiqueta con la lista
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-bold text-stone-800">
        {etiqueta}
      </label>
      <div className="relative">
        {/* La lista. "appearance-none" quita la flecha del navegador para poner la nuestra (ChevronDown). */}
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-h-12 w-full appearance-none rounded-xl border-2 bg-white py-3 pr-11 pl-4 text-base text-stone-900 focus:outline-none ${
            error ? 'border-red-600' : 'border-stone-300 focus:border-marca-600'
          }`}
          {...props}
        >
          {/* Una <option> por cada opción recibida */}
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        {/* Flechita ▾ a la derecha (pointer-events-none: los clics pasan a la lista) */}
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
