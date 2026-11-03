/*
 * COMPONENTE: APLICAR LA CONFIGURACIÓN A TODA LA PÁGINA
 * No dibuja nada: cada vez que cambia la configuración, ajusta la etiqueta <html>:
 *   - tamaño de letra (font-size en %, todo lo demás crece parejo),
 *   - clase «alto-contraste» y clase «reducir-movimiento» (estilos en index.css),
 *   - color principal: reemplaza las variables --color-marca-* con la paleta elegida (lib/colores.ts).
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar
import { useEffect } from 'react'
// ▸ Desde nuestro proyecto: src/hooks/useConfiguracion.ts:
//     useConfiguracion → la configuración actual
import { useConfiguracion } from '../hooks/useConfiguracion'
// ▸ Desde nuestro proyecto: src/lib/colores.ts:
//     PALETAS → los tonos de cada color · TONOS → 50, 100… 950 · variablesDePaleta → las variables de CSS
import { PALETAS, TONOS, variablesDePaleta } from '../lib/colores'
// ▸ Desde nuestro proyecto: src/lib/configuracion.ts:
//     ESCALA_TEXTO → porcentaje de cada tamaño de letra
import { ESCALA_TEXTO } from '../lib/configuracion'

export function AplicarConfiguracion() {
  const { config } = useConfiguracion()
  useEffect(() => {
    const html = document.documentElement
    html.style.fontSize = `${ESCALA_TEXTO[config.tamanoTexto].porcentaje}%`
    html.classList.toggle('alto-contraste', config.altoContraste)
    html.classList.toggle('reducir-movimiento', config.reducirMovimiento)

    // El verde azulado ya está en index.css (con su versión de alto contraste): solo se quitan los cambios.
    const color = config.colorPrincipal in PALETAS ? config.colorPrincipal : 'teal'
    if (color === 'teal') {
      for (const t of TONOS) html.style.removeProperty(`--color-marca-${t}`)
    } else {
      for (const [variable, valor] of Object.entries(variablesDePaleta(color, config.altoContraste))) html.style.setProperty(variable, valor)
    }
    // Color de la barra del navegador en el celular.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETAS[color].tonos[7])
  }, [config.tamanoTexto, config.altoContraste, config.reducirMovimiento, config.colorPrincipal])
  return null
}
