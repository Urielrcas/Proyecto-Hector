/*
 * COMPONENTE: AVISO
 * Mensaje destacado: verde para éxito ("Se creó el usuario...") o rojo para error.
 * Uso:  <Aviso tipo="error">Correo o contraseña incorrectos.</Aviso>
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: CircleAlert (círculo con !), CircleCheck (círculo con ✓)
import { CircleAlert, CircleCheck } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     ReactNode → tipo: cualquier cosa que React puede dibujar (texto, componentes...)
import type { ReactNode } from 'react'

// Props: tipo = 'error' (rojo) o 'exito' (verde); children = el texto que va dentro.
export function Aviso({ tipo, children }: { tipo: 'error' | 'exito'; children: ReactNode }) {
  // Ícono según el tipo: círculo con "!" para error, círculo con "✓" para éxito.
  const Icono = tipo === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      // role="alert" hace que los lectores de pantalla (para personas ciegas) lean el error de inmediato.
      role={tipo === 'error' ? 'alert' : 'status'}
      // Colores: rojo para error (bg-red-50, borde red-200) y verde de la marca para éxito.
      className={`flex items-start gap-3 rounded-xl border-2 p-4 ${
        tipo === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-marca-200 bg-marca-50 text-marca-900'
      }`}
    >
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden />
      {/* El texto del mensaje */}
      <div>{children}</div>
    </div>
  )
}
