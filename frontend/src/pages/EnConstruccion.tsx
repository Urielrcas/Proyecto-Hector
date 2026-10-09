/*
 * PANTALLA: MÓDULO EN DESARROLLO
 * Se muestra en los módulos que todavía no están hechos (traductores, historial, etc.).
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), Construction (señal de obra)
import { ArrowLeft, Construction } from 'lucide-react'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     BotonEnlace → botón que lleva a otra pantalla (como un enlace)
import { BotonEnlace } from '../components/Boton'

/** Pantalla temporal para los módulos que aún no se desarrollan. */
export default function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-marca-100 text-marca-800">
        <Construction className="size-10" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{titulo}</h1>
      <p className="mt-2 max-w-sm text-stone-600">Este módulo está en desarrollo.</p>
      <BotonEnlace to="/inicio" variante="secundario" className="mt-8">
        <ArrowLeft className="size-5" aria-hidden />
        Volver al inicio
      </BotonEnlace>
    </div>
  )
}
