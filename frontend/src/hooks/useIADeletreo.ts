/*
 * HOOK: LA IA EN LOS TRADUCTORES
 * Junta lo que necesita el deletreo (useDeletreo):
 *   - clasificar: la red neuronal convolucional (si está activada en Configuración y ya está entrenada).
 *     Si nunca se ha entrenado, empieza a entrenarse sola en segundo plano.
 *   - corrector: el autocorrector con el vocabulario base + las palabras que aprendió del usuario.
 */
// ▸ Desde React:
import { useEffect, useMemo } from 'react'
// ▸ Desde nuestro proyecto:
import { corregir, formasDe, vocabularioCon, type Correccion } from '../lib/ia/corrector'
import { VOCABULARIO } from '../lib/ia/vocabulario'
import { useApp } from '../context/AppContext'
import { useConfiguracion } from './useConfiguracion'
import { useModeloIA } from './useModeloIA'

export interface CorrectorDeletreo {
  corregir: (palabra: string) => Correccion | null
  alAplicar: (c: Correccion) => void
  alDeshacer: (c: Correccion) => void
  /** Palabra que quedó escrita (aprende el vocabulario del usuario). */
  alTerminar: (palabra: string) => void
}

export function useIADeletreo() {
  const { lengua: lenguaApp } = useApp()
  const lengua = lenguaApp ?? 'LSM'
  const { config } = useConfiguracion()
  const ia = useModeloIA()
  const palabras = ia.modelo.corrector.palabras

  // Si la red nunca se ha entrenado, que empiece sola (tarda unos segundos, en segundo plano).
  const { asegurarRed } = ia
  useEffect(() => {
    if (config.usarRedNeuronal) asegurarRed()
    // Solo al abrir la pantalla o al activar la opción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.usarRedNeuronal, lengua])

  const vocabulario = useMemo(() => vocabularioCon(VOCABULARIO[lengua], palabras), [lengua, palabras])
  const formas = useMemo(() => formasDe(ia.letras), [ia.letras])

  const corrector: CorrectorDeletreo = {
    corregir: (palabra) => corregir(palabra, vocabulario, formas, config.autocorreccion),
    alAplicar: (c) => ia.registrarCorreccion('aplicada', c.original),
    alDeshacer: (c) => ia.registrarCorreccion('deshecha', c.original),
    alTerminar: (palabra) => ia.aprenderPalabra(palabra),
  }

  return {
    clasificar: config.usarRedNeuronal ? ia.clasificar : null,
    corrector,
    memoria: ia.memoria,
    entrenando: ia.entrenamiento,
    redLista: !!ia.clasificar,
  }
}
