import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { guardar, leer } from '../lib/almacenamiento'

/**
 * Letras que el usuario ya logró hacer correctamente, por usuario y lengua.
 * Por ahora se guarda en este dispositivo; más adelante se sincronizará con el backend.
 */
export function useProgresoAprendizaje() {
  const { usuario, lengua } = useApp()
  const clave = `aprendizaje.${usuario?.id ?? 'invitado'}.${lengua ?? 'LSM'}`
  const [estado, setEstado] = useState(() => ({ clave, logradas: leer<string[]>(clave, []) }))

  // Si cambia el usuario o la lengua, cargar su progreso.
  let logradas = estado.logradas
  if (estado.clave !== clave) {
    logradas = leer<string[]>(clave, [])
    setEstado({ clave, logradas })
  }

  const marcarLograda = (letra: string) => {
    if (logradas.includes(letra)) return
    const nuevas = [...logradas, letra]
    guardar(clave, nuevas)
    setEstado({ clave, logradas: nuevas })
  }

  return { logradas, marcarLograda }
}
