/*
 * COMPONENTE: ENCABEZADO DE PÁGINA
 * Título grande con descripción, un ícono o una flecha para regresar (volverA)
 * y, opcionalmente, botones a la derecha (acciones). Ej.: "Usuarios" + "Nuevo usuario".
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), LucideIcon (tipo: cualquier ícono de Lucide)
import { ArrowLeft, type LucideIcon } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import type { ReactNode } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'

export function EncabezadoPagina({
  titulo,
  descripcion,
  icono: Icono,
  volverA,
  acciones,
}: {
  titulo: string // texto grande, p. ej. "Usuarios"
  descripcion?: string // texto gris debajo del título
  icono?: LucideIcon // ícono en un cuadro verde claro a la izquierda
  volverA?: string // si se pasa una ruta, muestra una flecha ← que lleva ahí (en lugar del ícono)
  acciones?: ReactNode // botones a la derecha, p. ej. <BotonEnlace>Nuevo usuario</BotonEnlace>
}) {
  return (
    // "justify-between" separa el título (izquierda) de las acciones (derecha).
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
      <div className="flex min-w-0 items-center gap-3">
        {/* Flecha para regresar (solo si se indicó volverA) */}
        {volverA && (
          <Link to={volverA} className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-700 hover:bg-stone-200" aria-label="Volver">
            <ArrowLeft className="size-6" />
          </Link>
        )}
        {/* Ícono (solo si no hay flecha de regreso) */}
        {Icono && !volverA && (
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-100 text-marca-800">
            <Icono className="size-6" aria-hidden />
          </span>
        )}
        {/* Título y descripción */}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="text-stone-600">{descripcion}</p>}
        </div>
      </div>
      {/* Botones de la derecha (si se pasaron) */}
      {acciones}
    </div>
  )
}
