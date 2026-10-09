/*
 * COMPONENTE: CAMPO DE TEXTO
 * Campo con etiqueta, ícono opcional, texto de ayuda y mensaje de error en rojo.
 * Si type="password", agrega el botón del ojo para mostrar u ocultar la contraseña.
 * Uso:  <CampoTexto etiqueta="Correo" type="email" value={correo} onChange={...} error={error} />
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Eye (ojo), EyeOff (ojo tachado), LucideIcon (tipo: cualquier ícono de Lucide)
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useId → genera un identificador único (para unir una etiqueta con su campo)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     InputHTMLAttributes → tipo: las propiedades normales de un <input> (value, onChange, placeholder...)
import { useId, useState, type InputHTMLAttributes } from 'react'

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string // texto en negritas arriba del campo ("Correo electrónico")
  error?: string | null // mensaje rojo debajo del campo (si hay error)
  ayuda?: string // texto gris de ayuda debajo del campo (si no hay error)
  icono?: LucideIcon // ícono opcional a la izquierda (sobre, candado, persona...)
}
// Además acepta todo lo de un <input> normal: type, value, onChange, placeholder, autoComplete...

export function CampoTexto({ etiqueta, error, ayuda, icono: Icono, type = 'text', className = '', ...props }: CampoTextoProps) {
  const id = useId() // identificador único para unir la etiqueta con el campo
  const [mostrar, setMostrar] = useState(false) // ¿la contraseña se ve o está oculta con puntos?
  const esContrasena = type === 'password'
  // Le dice a los lectores de pantalla qué texto describe al campo (el error o la ayuda).
  const idDescripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined

  return (
    <div className={className}>
      {/* Etiqueta: al hacer clic en ella, se activa el campo (htmlFor = id del campo) */}
      <label htmlFor={id} className="mb-1.5 block font-bold text-stone-800">
        {etiqueta}
      </label>
      {/* "relative" permite colocar el ícono y el botón del ojo encima del campo */}
      <div className="relative">
        {/* Ícono a la izquierda (solo si se pasó uno) */}
        {Icono && (
          <Icono className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
        )}
        {/* El campo. Si es contraseña y se presionó el ojo, se muestra como texto normal.
            El borde se pone rojo (border-red-600) si hay error; si no, gris (border-stone-300). */}
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
        {/* Botón del ojo (solo en contraseñas): alterna entre mostrar y ocultar.
            type="button" evita que este botón envíe el formulario. */}
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
      {/* Debajo del campo: el error en rojo; si no hay error, el texto de ayuda en gris */}
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
