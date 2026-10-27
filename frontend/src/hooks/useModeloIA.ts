/*
 * HOOK: LA IA DEL USUARIO
 * Une las tres IAs y las pone a disposición de cualquier pantalla:
 *   const ia = useModeloIA()
 *   ia.observar('R', true, 'camara')      → el modelo del estudiante aprende de un intento
 *   ia.agregarMuestras('R', [puntos…])    → la red guarda ejemplos de tu mano
 *   ia.clasificar(puntos)                 → la red convolucional dice qué forma ve
 *   ia.recordarForma('A', [puntos…])      → recuerda TU forma de hacer la A (memoria.ts)
 *   ia.memoria                            → para comparar la mano con tus formas recordadas
 *   ia.recomendaciones                    → qué letras practicar y por qué
 * Con cuenta, el modelo se sincroniza con el servidor (gana el más reciente).
 * La red se reentrena SOLA cuando hay suficientes muestras nuevas (regla ¬e ∧ (n ∨ m)).
 */

// ▸ Desde React:
import { useEffect, useMemo, useSyncExternalStore } from 'react'
// ▸ Desde nuestro proyecto:
import { useApp } from '../context/AppContext'
import { alfabeto } from '../lib/aprendizaje/alfabeto'
import { crearClasificador } from '../lib/ia/cnn/clasificador'
import { comprimirPuntos } from '../lib/ia/cnn/imagen'
import { actualizar, dominioPromedio, recomendar, type Fuente } from '../lib/ia/dominio'
import { crearMemoria, MAX_PERSONALES } from '../lib/ia/memoria'
import { entrenarRed, errorEntrenamiento, estadoEntrenamiento, suscribirEntrenamiento } from '../lib/ia/entrenamiento'
import {
  cambiarModelo,
  conMuestras,
  conPersonales,
  leerModelo,
  muestrasNuevas,
  MUESTRAS_PARA_REENTRENAR,
  reemplazarModelo,
  registrarSincronizador,
  suscribirModelo,
  type ModeloIA,
} from '../lib/ia/modeloIA'
import { cumple } from '../lib/logica/reglas'
import type { Lengua } from '../lib/tipos'
import type { Punto } from '../lib/vision/postura'
import { guardarModeloIA, obtenerModeloIA } from '../services/ia'

/* ── Subida al servidor: 4 s después del último cambio ── */
const pendientes = new Map<string, ReturnType<typeof setTimeout>>()
function programarSubida(clave: string, modelo: ModeloIA) {
  const [idUsuario, lengua] = clave.split('.')
  if (idUsuario === 'invitado') return
  clearTimeout(pendientes.get(clave))
  pendientes.set(
    clave,
    setTimeout(() => {
      pendientes.delete(clave)
      guardarModeloIA(lengua as Lengua, modelo).catch(() => {
        // Sin conexión: se queda en el navegador y se sube en el siguiente cambio.
      })
    }, 4000),
  )
}

export function useModeloIA() {
  const { usuario, lengua: lenguaApp } = useApp()
  const lengua = lenguaApp ?? 'LSM'
  const clave = `${usuario?.id ?? 'invitado'}.${lengua}`
  const letras = useMemo(() => alfabeto(lengua), [lengua])

  const modelo = useSyncExternalStore(suscribirModelo, () => leerModelo(clave))
  const entrenamiento = useSyncExternalStore(suscribirEntrenamiento, estadoEntrenamiento)
  const error = useSyncExternalStore(suscribirEntrenamiento, errorEntrenamiento)

  // Con cuenta: subir los cambios y traer el modelo del servidor al abrir.
  useEffect(() => {
    registrarSincronizador(programarSubida)
    if (!usuario) return
    let vigente = true
    obtenerModeloIA(lengua)
      .then((servidor) => {
        if (!vigente) return
        const local = leerModelo(clave)
        if (servidor && servidor.actualizadoEn > local.actualizadoEn) reemplazarModelo(clave, servidor)
        else if (local.actualizadoEn > (servidor?.actualizadoEn ?? 0)) programarSubida(clave, local)
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [clave, lengua, usuario])

  // Clasificador de la red convolucional (se rehace solo cuando cambian los pesos).
  const pesos = modelo.red?.pesos
  const clasificar = useMemo(() => (modelo.red && pesos ? crearClasificador(modelo.red, letras) : null), [pesos, letras]) // eslint-disable-line react-hooks/exhaustive-deps

  // Memoria de las formas personales (se rehace solo cuando cambian).
  const personales = modelo.personales
  const memoria = useMemo(() => crearMemoria(letras, personales ?? {}), [letras, personales])

  const entrenandoEsta = entrenamiento?.clave === clave

  /** Regla «reentrenar la red»: ¬e ∧ (n ∨ m). */
  const revisarReentrenamiento = (m: ModeloIA) => {
    const e = estadoEntrenamiento() !== null
    const n = !m.red
    const hayNuevas = muestrasNuevas(m) >= MUESTRAS_PARA_REENTRENAR
    if (cumple('reentrenarRed', { e, n, m: hayNuevas })) entrenarRed(clave, lengua)
  }

  return {
    modelo,
    letras,
    clasificar,
    memoria,
    entrenamiento: entrenandoEsta ? entrenamiento : null,
    errorEntrenamiento: error,
    recomendaciones: recomendar(modelo.dominio, letras),
    dominioPromedio: dominioPromedio(modelo.dominio, letras),

    /** El modelo del estudiante aprende de un intento. */
    observar: (letra: string, acierto: boolean, fuente: Fuente) =>
      cambiarModelo(clave, (m) => ({ ...m, dominio: { ...m.dominio, [letra]: actualizar(m.dominio[letra], acierto, fuente) } })),

    /** Guarda ejemplos reales de la mano y, si ya hay suficientes nuevos, reentrena la red sola. */
    agregarMuestras: (letra: string, manos: Punto[][]) => {
      if (!manos.length) return
      cambiarModelo(clave, (m) => conMuestras(m, letra, manos.map(comprimirPuntos)))
      revisarReentrenamiento(leerModelo(clave))
    },

    /**
     * Recuerda TU forma de hacer una letra (por ejemplo, una A con los dedos un poco distintos).
     * Se guarda en la memoria (funciona al instante) y también como muestras para la red neuronal.
     */
    recordarForma: (letra: string, manos: Punto[][]) => {
      if (!manos.length) return
      const comprimidas = manos.map(comprimirPuntos)
      cambiarModelo(clave, (m) => conMuestras(conPersonales(m, letra, comprimidas, MAX_PERSONALES), letra, comprimidas.filter((_, i) => i % 2 === 0)))
      revisarReentrenamiento(leerModelo(clave))
    },

    /** Olvida tu forma personal de una letra (vuelve a pedirse como en el dibujo). */
    olvidarForma: (letra: string) =>
      cambiarModelo(clave, (m) => {
        const { [letra]: _quitada, ...resto } = m.personales ?? {}
        return { ...m, personales: resto }
      }),

    borrarMuestras: (letra?: string) =>
      cambiarModelo(clave, (m) => {
        if (!letra) return { ...m, muestras: {} }
        const { [letra]: _quitada, ...resto } = m.muestras
        return { ...m, muestras: resto }
      }),

    /** Entrena ya (o desde cero). */
    entrenar: (desdeCero = false) => entrenarRed(clave, lengua, { desdeCero }),

    /** Si la red nunca se ha entrenado, la entrena en segundo plano (la llaman las pantallas con cámara). */
    asegurarRed: () => revisarReentrenamiento(leerModelo(clave)),

    olvidarRed: () => cambiarModelo(clave, (m) => ({ ...m, red: null })),

    /** El corrector aprende: «aplicada» = corrigió y el usuario la dejó; «deshecha» = la deshizo. */
    registrarCorreccion: (tipo: 'aplicada' | 'deshecha', original: string) =>
      cambiarModelo(clave, (m) => ({
        ...m,
        corrector: {
          aplicadas: m.corrector.aplicadas + (tipo === 'aplicada' ? 1 : 0),
          deshechas: m.corrector.deshechas + (tipo === 'deshecha' ? 1 : 0),
          // Si la deshizo, la palabra original es «suya»: se aprende con fuerza.
          palabras: tipo === 'deshecha' ? { ...m.corrector.palabras, [original]: (m.corrector.palabras[original] ?? 0) + 3 } : m.corrector.palabras,
        },
      })),

    /** Cada palabra que el usuario deletrea suma a su vocabulario personal. */
    aprenderPalabra: (palabra: string) =>
      palabra.length >= 2 &&
      cambiarModelo(clave, (m) => ({
        ...m,
        corrector: { ...m.corrector, palabras: { ...m.corrector.palabras, [palabra]: (m.corrector.palabras[palabra] ?? 0) + 1 } },
      })),

    olvidarPalabras: () => cambiarModelo(clave, (m) => ({ ...m, corrector: { aplicadas: 0, deshechas: 0, palabras: {} } })),
    reiniciarDominio: () => cambiarModelo(clave, (m) => ({ ...m, dominio: {} })),
  }
}
