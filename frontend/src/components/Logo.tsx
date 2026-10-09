/*
 * COMPONENTE: LOGO
 * Ícono de la mano + nombre de la aplicación.
 * Para cambiar el nombre que aparece en toda la app, cambia NOMBRE_APP.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Hand (mano)
import { Hand } from 'lucide-react'

// Nombre de la aplicación. Se usa en el logo de todas las pantallas: cámbialo aquí y cambia en todas.
export const NOMBRE_APP = 'Intérprete de Señas'

/** `textoSoloEscritorio`: en pantallas pequeñas muestra solo el ícono. */
export function Logo({ textoSoloEscritorio = false }: { textoSoloEscritorio?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Cuadro verde (bg-marca-700) con el ícono de la mano en blanco */}
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-700 text-white shadow-sm">
        <Hand className="size-6" aria-hidden />
      </span>
      {/* Nombre de la app en verde oscuro (text-marca-900). "max-sm:sr-only" lo oculta en celular
          pero los lectores de pantalla lo siguen leyendo. */}
      <span
        className={`text-lg font-bold tracking-tight whitespace-nowrap text-marca-900 ${textoSoloEscritorio ? 'max-sm:sr-only' : ''}`}
      >
        {NOMBRE_APP}
      </span>
    </div>
  )
}
