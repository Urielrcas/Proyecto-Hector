import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Ventana modal accesible basada en <dialog>: atrapa el foco, se cierra con Esc
 * y devuelve el foco al elemento que la abrió.
 */
export function Dialogo({ abierto, onCerrar, titulo, children }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()} // clic fuera del contenido
      aria-label={titulo}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">{children}</div>
    </dialog>
  )
}
