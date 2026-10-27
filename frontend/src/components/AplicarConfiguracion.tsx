/*
 * COMPONENTE: APLICAR LA CONFIGURACIÓN A TODA LA PÁGINA
 * No dibuja nada: cada vez que cambia la configuración, ajusta la etiqueta <html>:
 *   - tamaño de letra (font-size en %, todo lo demás crece parejo),
 *   - clase «alto-contraste» y clase «reducir-movimiento» (estilos en index.css).
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar
import { useEffect } from 'react'
// ▸ Desde nuestro proyecto: src/hooks/useConfiguracion.ts:
//     useConfiguracion → la configuración actual
import { useConfiguracion } from '../hooks/useConfiguracion'
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
  }, [config.tamanoTexto, config.altoContraste, config.reducirMovimiento])
  return null
}
