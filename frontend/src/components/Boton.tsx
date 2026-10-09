/*
 * COMPONENTE: BOTÓN
 * Botón reutilizable con 4 estilos (variantes). Los colores de cada estilo están en "variantes".
 *   <Boton onClick={...}>Guardar</Boton>                    → botón que ejecuta algo
 *   <BotonEnlace to="/inicio">Volver</BotonEnlace>           → botón que lleva a otra pantalla
 *   variante: "primario" (verde) | "secundario" (borde) | "fantasma" (solo texto) | "peligro" (rojo)
 *   cargando: muestra un círculo girando y desactiva el botón mientras espera.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: LoaderCircle (círculo de carga)
import { LoaderCircle } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     ButtonHTMLAttributes → tipo: las propiedades normales de un <button> (onClick, type, disabled...)
import type { ButtonHTMLAttributes } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
//     LinkProps → tipo: las propiedades de un Link
import { Link, type LinkProps } from 'react-router-dom'

// Los 4 estilos posibles de botón.
type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

// Estilo común a todos los botones: alto mínimo de 48 px (fácil de tocar), esquinas redondeadas,
// letra en negrita; si está desactivado se ve semitransparente.
const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

// Colores de cada estilo. Cambiando estas clases cambian TODOS los botones de la app.
//   bg- = fondo · text- = letra · border- = borde · hover: = al pasar el mouse · active: = al presionar
const variantes: Record<Variante, string> = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 active:bg-marca-900',
  secundario: 'border-2 border-marca-700 bg-white text-marca-800 hover:bg-marca-50',
  fantasma: 'text-marca-800 hover:bg-marca-100/60',
  peligro: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
}

// Junta las clases: base + las del estilo elegido + las extra que se pasen con className.
function claseBoton(variante: Variante = 'primario', extra = '') {
  return `${base} ${variantes[variante]} ${extra}`
}

// Además de las propiedades normales de un <button> (onClick, type, disabled...), acepta:
interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante // estilo (por defecto "primario")
  cargando?: boolean // muestra un círculo girando y desactiva el botón
}

// Botón que ejecuta una acción:  <Boton onClick={() => ...}>Texto</Boton>
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

// Botón que lleva a otra pantalla:  <BotonEnlace to="/inicio">Volver</BotonEnlace>
export function BotonEnlace({ variante = 'primario', className = '', ...props }: BotonEnlaceProps) {
  return <Link className={claseBoton(variante, className)} {...props} />
}
