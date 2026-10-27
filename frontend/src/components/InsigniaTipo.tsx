/*
 * COMPONENTE: ETIQUETA DEL TIPO DE REGISTRO DEL HISTORIAL
 * Ej.: [✋ Señas → Texto]  [🎤 Voz / Texto → Señas]  [👥 Conversación]
 */
// ▸ Desde Lucide (librería de íconos):
import { Hand, Mic, Users, type LucideIcon } from 'lucide-react'
// ▸ Desde nuestro proyecto: src/lib/historial.ts:
import { TIPOS_HISTORIAL, type TipoHistorial } from '../lib/historial'

const ICONO_TIPO: Record<TipoHistorial, LucideIcon> = {
  'senas-texto': Hand,
  'voz-senas': Mic,
  conversacion: Users,
}

export function InsigniaTipo({ tipo }: { tipo: TipoHistorial }) {
  const Icono = ICONO_TIPO[tipo]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-2.5 py-1 text-sm font-bold whitespace-nowrap text-marca-800">
      <Icono className="size-4" aria-hidden />
      {TIPOS_HISTORIAL[tipo]}
    </span>
  )
}
