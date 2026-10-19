/*
 * PROGRESO DE APRENDIZAJE
 * Recuerda qué letras ya logró el usuario, separado por usuario y por lengua.
 *   - Con cuenta: se guarda en el servidor (MongoDB, colección "progreso"), así el administrador
 *     lo ve en «Estadísticas» y el usuario lo conserva en cualquier equipo.
 *   - Como invitado: solo en este navegador (localStorage).
 * En ambos casos se guarda también una copia en el navegador para mostrarlo al instante
 * y para no perder letras si no hay conexión: se suben la próxima vez que se abra la pantalla.
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from '../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/services/progreso.ts:
//     guardarProgreso → manda letras logradas al servidor
//     obtenerProgreso → pide al servidor las letras logradas
import { guardarProgreso, obtenerProgreso } from '../services/progreso'

/** Letras que el usuario ya logró hacer correctamente, por usuario y lengua. */
export function useProgresoAprendizaje() {
  const { usuario, lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const idUsuario = usuario?.id // undefined = invitado
  // Clave en localStorage, distinta por usuario y lengua. Ej.: "aprendizaje.66f1a2….LSM"
  const clave = `aprendizaje.${idUsuario ?? 'invitado'}.${lengua}`
  // logradas = lista de letras logradas, por ejemplo ['A', 'B', 'L']
  const [estado, setEstado] = useState(() => ({ clave, logradas: leer<string[]>(clave, []) }))

  // Si cambia el usuario o la lengua, cargar su progreso guardado en el navegador.
  let logradas = estado.logradas
  if (estado.clave !== clave) {
    logradas = leer<string[]>(clave, [])
    setEstado({ clave, logradas })
  }

  // Con cuenta: sincronizar con el servidor al abrir la pantalla (o al cambiar de usuario/lengua).
  useEffect(() => {
    if (!idUsuario) return // invitado: solo navegador
    let vigente = true // evita usar una respuesta vieja si el usuario ya cambió de lengua
    const locales = leer<string[]>(clave, [])
    obtenerProgreso(lengua)
      .then((servidor) => {
        // Letras logradas en este navegador que el servidor aún no tiene (p. ej. sin conexión): subirlas.
        const faltantes = locales.filter((l) => !servidor.includes(l))
        return faltantes.length ? guardarProgreso(lengua, faltantes) : servidor
      })
      .then((todas) => {
        if (!vigente) return
        guardar(clave, todas)
        setEstado({ clave, logradas: todas })
      })
      .catch(() => {
        // Sin conexión: se queda con lo guardado en el navegador.
      })
    return () => {
      vigente = false
    }
  }, [clave, idUsuario, lengua])

  // Agrega una letra a las logradas (si ya estaba, no hace nada).
  const marcarLograda = (letra: string) => {
    if (logradas.includes(letra)) return
    const nuevas = [...logradas, letra]
    guardar(clave, nuevas) // al instante en el navegador...
    setEstado({ clave, logradas: nuevas })
    // ...y, con cuenta, también en el servidor. Si falla, se sube en la siguiente sincronización.
    if (idUsuario) guardarProgreso(lengua, [letra]).catch(() => {})
  }

  // Lo que reciben las pantallas: const { logradas, marcarLograda } = useProgresoAprendizaje()
  return { logradas, marcarLograda }
}
