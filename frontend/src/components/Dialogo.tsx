/*
 * COMPONENTE: VENTANA EMERGENTE (MODAL)
 * Ventana que aparece encima de la pantalla (p. ej. "¿Estás seguro de eliminar...?").
 * Se cierra con la tecla Esc o haciendo clic fuera de ella.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useRef → guarda un valor o un elemento de la página SIN volver a dibujar la pantalla
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Ventana modal accesible basada en <dialog>: atrapa el foco, se cierra con Esc
 * y devuelve el foco al elemento que la abrió.
 */
// Props: abierto = mostrar u ocultar; onCerrar = qué hacer al cerrar; titulo = nombre para lectores de pantalla;
// children = el contenido de la ventana.
export function Dialogo({ abierto, onCerrar, titulo, children }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null) // referencia al elemento <dialog> de la página

  // Cuando cambia "abierto", abrir (showModal) o cerrar (close) la ventana del navegador.
  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    // <dialog> es la ventana emergente nativa del navegador. "backdrop:" pinta el fondo oscuro detrás.
    <dialog
      ref={ref}
      onClose={onCerrar} // se ejecuta al cerrar con Esc
      onClick={(e) => e.target === ref.current && onCerrar()} // clic fuera del contenido
      aria-label={titulo}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">{children}</div>
    </dialog>
  )
}
