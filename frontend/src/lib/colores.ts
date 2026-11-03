/*
 * COLORES PRINCIPALES DE LA APP
 * Toda la app pinta con la familia de colores «marca» (bg-marca-700, text-marca-800...), que vive
 * en variables de CSS (index.css). Para cambiar el color de TODA la app basta con cambiar esas
 * 11 variables: eso hace AplicarConfiguracion con la paleta elegida en Configuración (o pedida a Mani).
 *
 * Cada paleta va del tono más claro (50) al más oscuro (950), igual que en Tailwind.
 */

export type ColorPrincipal = 'teal' | 'azul' | 'morado' | 'rosa' | 'naranja' | 'negro'

export const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export interface Paleta {
  nombre: string
  /** Cómo lo dice Mani: «Ahora soy azul». */
  adjetivo: string
  /** Los 11 tonos, del 50 al 950. */
  tonos: readonly string[]
}

export const PALETAS: Record<ColorPrincipal, Paleta> = {
  teal: {
    nombre: 'Verde azulado',
    adjetivo: 'verde azulado',
    tonos: ['#ecfbf7', '#d0f5eb', '#a4ead8', '#6dd8c1', '#3bbfa6', '#1fa38c', '#148372', '#13695d', '#13544b', '#12463f', '#062824'],
  },
  azul: {
    nombre: 'Azul',
    adjetivo: 'azul',
    tonos: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
  },
  morado: {
    nombre: 'Morado',
    adjetivo: 'morado',
    tonos: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
  },
  rosa: {
    nombre: 'Rosa',
    adjetivo: 'rosa',
    tonos: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
  },
  naranja: {
    nombre: 'Naranja',
    adjetivo: 'naranja',
    tonos: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
  },
  // «Negro» es un gris carbón: con negro puro no se distinguirían los botones de los textos.
  negro: {
    nombre: 'Negro',
    adjetivo: 'negro',
    tonos: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#18181b', '#111113', '#09090b'],
  },
}

export const COLORES_PRINCIPALES = Object.keys(PALETAS) as ColorPrincipal[]

/**
 * Las variables de CSS para una paleta. Con alto contraste, los tonos fuertes (600 a 900)
 * se recorren uno hacia lo oscuro para que el texto se lea mejor.
 */
export function variablesDePaleta(color: ColorPrincipal, altoContraste: boolean): Record<string, string> {
  const t = PALETAS[color].tonos
  return Object.fromEntries(
    TONOS.map((tono, i) => {
      const oscurecer = altoContraste && tono >= 600 && tono <= 900
      return [`--color-marca-${tono}`, t[oscurecer ? i + 1 : i]]
    }),
  )
}

/** Un tono «marca» ya aplicado a la página (para dibujar en <canvas>, que no entiende var(--…)). */
export function tonoMarca(tono: (typeof TONOS)[number]): string {
  if (typeof document === 'undefined') return PALETAS.teal.tonos[TONOS.indexOf(tono)]
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--color-marca-${tono}`).trim()
  return valor || PALETAS.teal.tonos[TONOS.indexOf(tono)]
}
