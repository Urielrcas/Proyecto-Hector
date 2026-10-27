/*
 * HOOKS DEL HISTORIAL
 *   - useAlmacenHistorial(): dónde se guarda (servidor con cuenta, navegador como invitado).
 *   - useGuardadoHistorial(tipo, mensajes): guarda SOLO la traducción o conversación actual
 *     mientras se usa la pantalla. La primera vez crea el registro y después lo va actualizando.
 *     Si la lista de mensajes se vacía (botón «Limpiar» o «Nueva conversación»), lo siguiente
 *     se guarda como un registro nuevo.
 *     Regla «guardar en el historial»: h ∧ t (opción activada en Configuración y hay mensajes).
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar
//     useMemo → recuerda un cálculo mientras no cambien sus datos
//     useRef → guarda un valor SIN volver a dibujar la pantalla
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useMemo, useRef, useState } from 'react'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua…
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/historial.ts:
//     almacenLocal → historial en el navegador (invitados)
//     AlmacenHistorial, DatosHistorial, MensajeHistorial, TipoHistorial → tipos
import { almacenLocal, type AlmacenHistorial, type DatosHistorial, type MensajeHistorial, type TipoHistorial } from '../lib/historial'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/services/historial.ts:
//     almacenServidor → historial en el servidor (con cuenta)
import { almacenServidor } from '../services/historial'
// ▸ Desde nuestro proyecto: src/hooks/useConfiguracion.ts:
//     useConfiguracion → preferencias (¿guardar historial?)
import { useConfiguracion } from './useConfiguracion'

/** Dónde se guarda el historial de quien usa la app. */
export function useAlmacenHistorial(): AlmacenHistorial {
  const { usuario } = useApp()
  return useMemo(() => (usuario ? almacenServidor : almacenLocal()), [usuario])
}

/** Espera tras el último cambio antes de guardar (para no guardar letra por letra). */
const MS_ESPERA = 1500
/** Espera antes de reintentar un guardado que falló. */
const MS_REINTENTO = 10000

export type EstadoGuardado = 'desactivado' | 'vacio' | 'pendiente' | 'guardado' | 'error'

/** Un mensaje de la pantalla; si no trae hora, se usa la hora en que empezó la sesión. */
export interface MensajeParaGuardar {
  autor: MensajeHistorial['autor']
  texto: string
  hora?: Date
}

export function useGuardadoHistorial(tipo: TipoHistorial, mensajes: MensajeParaGuardar[]) {
  const almacen = useAlmacenHistorial()
  const { lengua } = useApp()
  const { config } = useConfiguracion()
  // Resultado del último guardado y para qué mensajes fue (firma).
  const [resultado, setResultado] = useState<{ firma: string; ok: boolean } | null>(null)

  // Lo que cambia con cada guardado vive en un ref (no debe redibujar la pantalla).
  const s = useRef({
    id: null as string | null, // id del registro de esta sesión (null = aún no se crea)
    sesion: 0, // aumenta al vaciar la lista: lo siguiente es un registro nuevo
    inicio: null as Date | null, // hora en que empezó la sesión
    sucio: false, // hay cambios sin guardar
    cadena: Promise.resolve(), // los guardados se hacen uno detrás de otro
    firma: '',
    datos: null as DatosHistorial | null,
  })

  const limpios = mensajes.map((m) => ({ ...m, texto: m.texto.trim() })).filter((m) => m.texto)
  const firma = JSON.stringify(limpios.map((m) => [m.autor, m.texto]))
  const h = config.guardarHistorial // h: guardar historial está activado
  const t = limpios.length > 0 // t: hay al menos un mensaje

  // Encola un guardado: crea el registro la primera vez y luego lo actualiza.
  const guardarAhora = () => {
    const r = s.current
    const { datos, firma: firmaDatos, sesion } = r
    if (!datos) return
    r.sucio = false
    r.cadena = r.cadena.then(async () => {
      try {
        if (r.id && sesion === r.sesion) {
          try {
            await almacen.actualizar(r.id, datos)
          } catch (e) {
            // Lo borraron desde el Historial mientras tanto: se crea de nuevo.
            if ((e as { estado?: number }).estado !== 404) throw e
            r.id = (await almacen.crear(datos)).id
          }
        } else {
          const creado = await almacen.crear(datos)
          if (sesion === r.sesion) r.id = creado.id
        }
        setResultado({ firma: firmaDatos, ok: true })
      } catch {
        // Sin conexión u otro error: se reintenta en unos segundos.
        r.sucio = true
        setResultado({ firma: firmaDatos, ok: false })
        setTimeout(() => r.sucio && sesion === r.sesion && guardarActual.current(), MS_REINTENTO)
      }
    })
  }
  const guardarActual = useRef(guardarAhora)
  useEffect(() => {
    guardarActual.current = guardarAhora
  })

  // Cada vez que cambian los mensajes: esperar un momento y guardar (regla h ∧ t).
  useEffect(() => {
    const r = s.current
    if (!t) {
      // Lista vacía: termina la sesión; lo próximo será un registro nuevo.
      if (r.id || r.inicio) r.sesion++
      Object.assign(r, { id: null, inicio: null, datos: null, sucio: false, firma: '' })
      return
    }
    // Datos listos para guardar (con la hora de cada mensaje).
    r.inicio ??= new Date()
    const inicio = r.inicio
    r.firma = firma
    r.datos = {
      tipo,
      lengua: lengua ?? 'LSM',
      mensajes: limpios
        .map((m) => ({ autor: m.autor, texto: m.texto.slice(0, 500), hora: (m.hora ?? inicio).toISOString() }))
        .slice(-300),
    }
    if (!cumple('guardarHistorial', { h, t })) {
      r.sucio = false
      return
    }
    r.sucio = true
    const espera = setTimeout(() => guardarActual.current(), MS_ESPERA)
    return () => clearTimeout(espera)
    // limpios y lengua se resumen en "firma" (si cambian los textos, cambia la firma).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, h, t, tipo])

  // Al salir de la pantalla: guardar lo que haya quedado pendiente.
  useEffect(
    () => () => {
      if (s.current.sucio) guardarActual.current()
    },
    [],
  )

  // Lo que muestra el indicador de la pantalla.
  const estado: EstadoGuardado = !h
    ? 'desactivado'
    : !t
      ? 'vacio'
      : resultado?.firma === firma
        ? resultado.ok
          ? 'guardado'
          : 'error'
        : 'pendiente'
  return { estado }
}
