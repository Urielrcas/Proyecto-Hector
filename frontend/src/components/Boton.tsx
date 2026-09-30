import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variantes: Record<Variante, string> = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 active:bg-marca-900',
  secundario: 'border-2 border-marca-700 bg-white text-marca-800 hover:bg-marca-50',
  fantasma: 'text-marca-800 hover:bg-marca-100/60',
  peligro: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
}

function claseBoton(variante: Variante = 'primario', extra = '') {
  return `${base} ${variantes[variante]} ${extra}`
}

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  cargando?: boolean
}

export function Boton({ variante = 'primario', cargando, className = '', children, disabled, ...props }: BotonProps) {
  return (
    <button className={claseBoton(variante, className)} disabled={disabled || cargando} aria-busy={cargando} {...props}>
      {cargando && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

interface BotonEnlaceProps extends LinkProps {
  variante?: Variante
}

export function BotonEnlace({ variante = 'primario', className = '', ...props }: BotonEnlaceProps) {
  return <Link className={claseBoton(variante, className)} {...props} />
}
