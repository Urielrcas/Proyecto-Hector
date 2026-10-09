/*
 * PROGRESO DE APRENDIZAJE
 * Recuerda qué letras ya logró el usuario, separado por usuario y por lengua.
 * Se guarda en el navegador (localStorage), por eso no se comparte entre equipos.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from '../lib/almacenamiento'

/**
 * Letras que el usuario ya logró hacer correctamente, por usuario y lengua.
 * Por ahora se guarda en este dispositivo; más adelante se sincronizará con el backend.
 */
export function useProgresoAprendizaje() {
  const { usuario, lengua } = useApp()
  // Clave en localStorage, distinta por usuario y lengua. Ej.: "aprendizaje.66f1a2….LSM"
  const clave = `aprendizaje.${usuario?.id ?? 'invitado'}.${lengua ?? 'LSM'}`
  // logradas = lista de letras logradas, por ejemplo ['A', 'B', 'L']
  const [estado, setEstado] = useState(() => ({ clave, logradas: leer<string[]>(clave, []) }))

  // Si cambia el usuario o la lengua, cargar su progreso.
  let logradas = estado.logradas
  if (estado.clave !== clave) {
    logradas = leer<string[]>(clave, [])
    setEstado({ clave, logradas })
  }

  // Agrega una letra a las logradas y la guarda en el navegador (si ya estaba, no hace nada).
  const marcarLograda = (letra: string) => {
    if (logradas.includes(letra)) return
    const nuevas = [...logradas, letra]
    guardar(clave, nuevas)
    setEstado({ clave, logradas: nuevas })
  }

  // Lo que reciben las pantallas: const { logradas, marcarLograda } = useProgresoAprendizaje()
  return { logradas, marcarLograda }
}
