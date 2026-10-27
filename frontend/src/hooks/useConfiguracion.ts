/*
 * HOOK: CONFIGURACIÓN
 * Da la configuración actual y la función para cambiarla; la pantalla se redibuja sola al cambiar.
 *   const { config, cambiar } = useConfiguracion()
 *   cambiar({ altoContraste: true })
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useSyncExternalStore → lee un dato que vive fuera de React y redibuja cuando cambia
import { useSyncExternalStore } from 'react'
// ▸ Desde nuestro proyecto: src/lib/configuracion.ts:
//     cambiarConfiguracion → cambia una o varias preferencias
//     leerConfiguracion → la configuración actual
//     suscribirse → avisa cuando cambia
import { cambiarConfiguracion, leerConfiguracion, suscribirse } from '../lib/configuracion'

export function useConfiguracion() {
  const config = useSyncExternalStore(suscribirse, leerConfiguracion)
  return { config, cambiar: cambiarConfiguracion }
}
