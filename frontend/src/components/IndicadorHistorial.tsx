/*
 * COMPONENTE: INDICADOR DEL HISTORIAL
 * Línea pequeña que dice si lo que se está traduciendo ya se guardó en el Historial.
 *   «✓ Guardado en tu historial» · «Guardando…» · «Historial desactivado» · «No se pudo guardar»
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Check (palomita ✓), CircleAlert (círculo con !), History (reloj de historial), LoaderCircle (círculo de carga)
import { Check, CircleAlert, History, LoaderCircle } from 'lucide-react'
// ▸ Desde React Router:
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/hooks/useHistorial.ts:
//     EstadoGuardado → tipo: en qué va el guardado
import type { EstadoGuardado } from '../hooks/useHistorial'

export function IndicadorHistorial({ estado }: { estado: EstadoGuardado }) {
  const contenido = {
    vacio: { icono: History, texto: 'Lo que traduzcas se guardará en tu historial.', clase: 'text-stone-500' },
    pendiente: { icono: LoaderCircle, texto: 'Guardando en tu historial…', clase: 'text-stone-500' },
    guardado: { icono: Check, texto: 'Guardado en tu historial.', clase: 'text-marca-800' },
    error: { icono: CircleAlert, texto: 'No se pudo guardar en el historial. Se reintentará.', clase: 'text-red-700' },
    desactivado: { icono: History, texto: 'El historial está desactivado.', clase: 'text-stone-500' },
  }[estado]
  const Icono = contenido.icono
  return (
    <p className={`flex flex-wrap items-center gap-1.5 text-sm ${contenido.clase}`} role="status">
      <Icono className={`size-4 ${estado === 'pendiente' ? 'animate-spin' : ''}`} aria-hidden />
      {contenido.texto}
      {estado === 'desactivado' ? (
        <Link to="/configuracion" className="font-bold underline">
          Activarlo
        </Link>
      ) : (
        estado !== 'vacio' && (
          <Link to="/historial" className="font-bold underline">
            Ver historial
          </Link>
        )
      )}
    </p>
  )
}
