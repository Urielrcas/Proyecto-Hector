/*
 * EXPEDIENTE DE APRENDIZAJE (prácticas 18 y 19)
 * Trae del servidor el expediente del usuario de la sesión (o de otra persona, si lo pide un
 * administrador con usuarioId): cómo le va en cada letra, los consejos de la IA y la predicción
 * de su siguiente intento. Los invitados no tienen expediente (no se guardan sus intentos).
 *   const { expediente, cargando, error, recargar } = useExpediente()
 */
import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { obtenerExpediente, type Expediente } from '../services/intentos'
import type { Lengua } from '../lib/tipos'

export function useExpediente(opciones: { usuarioId?: string; lengua?: Lengua } = {}) {
  const { usuario, lengua: lenguaApp } = useApp()
  const lengua = opciones.lengua ?? lenguaApp ?? 'LSM'
  const conCuenta = !!usuario
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [cargando, setCargando] = useState(conCuenta)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!conCuenta) return
    let vigente = true
    obtenerExpediente(lengua, opciones.usuarioId)
      .then((e) => {
        if (!vigente) return
        setExpediente(e)
        setError(null)
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [conCuenta, lengua, opciones.usuarioId, version])

  // Volver a pedirlo (por ejemplo, después de guardar un intento).
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return { expediente, cargando, error, recargar, conCuenta }
}
