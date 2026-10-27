/*
 * HOOK: DELETREO CON LA CÁMARA
 * Junta el reconocedor de letras (lib/vision/reconocedor.ts) con el texto que se va formando.
 * Lo usan el traductor Señas → Texto y el Modo conversación.
 * Uso:
 *   const d = useDeletreo(lengua, { alTerminarPalabra: (palabra) => ..., alCadaCuadro: (estado) => ... })
 *   <CamaraManos alDetectar={d.alDetectar} />
 *   d.texto · d.estado · d.resaltada · d.agregarCandidata() · d.agregarEspacio() · d.borrar() · d.limpiar()
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (aquí: quitar el resalte verde)
//     useRef → guarda un valor que NO redibuja la pantalla al cambiar (el reconocedor, el último estado)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useRef, useState } from 'react'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import type { Letra } from '../lib/aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../lib/tipos'
// ▸ Desde nuestro proyecto: src/lib/vision/movimiento.ts:
//     INSTRUCCION_MOVIMIENTO → texto que explica el movimiento de cada letra
import { INSTRUCCION_MOVIMIENTO } from '../lib/vision/movimiento'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     Punto → tipo: un punto de la mano (x, y)
import type { Punto } from '../lib/vision/postura'
// ▸ Desde nuestro proyecto: src/lib/vision/reconocedor.ts:
//     ReconocedorDeletreo → decide qué letra se está haciendo en cada cuadro
//     EstadoReconocedor → tipo: lo que informa el reconocedor (candidata, confianza, aviso...)
import { ReconocedorDeletreo, type EstadoReconocedor } from '../lib/vision/reconocedor'
// ▸ Desde nuestro proyecto: IA (red neuronal y autocorrector):
//     Clasificar → tipo: la red neuronal que dice qué forma ve
//     Correccion → tipo: una corrección del autocorrector
//     CorrectorDeletreo → tipo: el autocorrector con lo que aprende del usuario
import type { Clasificar } from '../lib/ia/cnn/clasificador'
import type { Correccion } from '../lib/ia/corrector'
import type { Memoria } from '../lib/ia/memoria'
import type { CorrectorDeletreo } from './useIADeletreo'

/** Corrección de la última palabra (para mostrar «Corregí X → Y · Deshacer»). */
export interface CorreccionMostrada extends Correccion {
  /** Dónde empieza la palabra en el texto. */
  inicio: number
  /** true = ya se aplicó; false = solo es sugerencia. */
  aplicada: boolean
}

/** Cuánto tiempo se resalta en verde la letra recién escrita. */
const MS_RESALTE = 900

/** Texto para el usuario según lo que esté pasando con la mano. */
export function mensajeDeletreo(e: EstadoReconocedor | null): string {
  if (!e || e.aviso === 'sin-mano') return 'Muestra tu mano frente a la cámara.'
  if (e.aviso === 'aceptada') return `¡Listo! Se escribió la ${e.letraNueva}.`
  if (e.aviso === 'cambia-forma') return 'Cambia la forma de la mano para la siguiente letra (o baja la mano para repetirla).'
  if (e.aviso === 'buscando' || !e.candidata) return 'Haz una letra del alfabeto.'
  if (e.aviso === 'mover' && e.candidata.objetivo.movimiento) return INSTRUCCION_MOVIMIENTO[e.candidata.objetivo.movimiento]
  return e.gemelaConMovimiento
    ? `Mantén la mano quieta para escribir ${e.candidata.letra}, o haz el movimiento de la ${e.gemelaConMovimiento.letra}.`
    : 'Mantén la mano quieta un momento…'
}

/** El texto deletreado se guarda en mayúsculas; en pantalla y en la voz se muestra como texto normal. */
export const comoFrase = (texto: string) => texto.trim().toLowerCase().replace(/^\S/, (c) => c.toUpperCase())

export function useDeletreo(
  lengua: Lengua,
  opciones: {
    /** Se llama al terminar cada palabra (cuando la mano desaparece 1.5 s). */
    alTerminarPalabra?: (palabra: string) => void
    /** Se llama en cada cuadro con el estado del reconocedor y el texto actual. */
    alCadaCuadro?: (estado: EstadoReconocedor, texto: string) => void
    /** IA: red neuronal convolucional que ayuda a reconocer las letras. */
    clasificar?: Clasificar | null
    /** IA: autocorrector de palabras. */
    corrector?: CorrectorDeletreo
    /** IA: memoria de las formas personales del usuario. */
    memoria?: Memoria | null
  } = {},
) {
  const [texto, setTexto] = useState('') // lo que se ha deletreado (en mayúsculas, con espacios)
  const [estado, setEstado] = useState<EstadoReconocedor | null>(null) // lo que se muestra (se actualiza solo si cambia)
  const [resaltada, setResaltada] = useState<Letra | null>(null) // letra recién escrita (se ve en verde un momento)
  const [correccion, setCorreccion] = useState<CorreccionMostrada | null>(null) // última corrección o sugerencia

  // El reconocedor vive en un useRef: procesa 30 cuadros por segundo sin redibujar la pantalla.
  const reconocedor = useRef<{ lengua: string; rec: ReconocedorDeletreo } | null>(null)
  const ultimaClave = useRef('')
  // Copia de los datos que necesita alDetectar (se llama desde la cámara, fuera del ciclo normal de React).
  const actual = useRef({ texto, opciones })
  useEffect(() => {
    actual.current = { texto, opciones }
  })

  // Quitar el resalte verde después de un momento.
  useEffect(() => {
    if (!resaltada) return
    const t = setTimeout(() => setResaltada(null), MS_RESALTE)
    return () => clearTimeout(t)
  }, [resaltada])

  /**
   * Cierra la palabra que se está deletreando: la pasa por el autocorrector (que la corrige sola
   * o solo la sugiere), deja que aprenda la palabra final y agrega el espacio.
   */
  const cerrarPalabra = (t: string): string => {
    const { corrector, alTerminarPalabra } = actual.current.opciones
    const palabra = t.split(' ').pop() ?? ''
    const inicio = t.length - palabra.length
    let final = palabra
    const c = corrector?.corregir(palabra) ?? null
    if (c?.automatica) {
      final = c.sugerida
      corrector?.alAplicar(c)
    }
    setCorreccion(c ? { ...c, inicio, aplicada: c.automatica } : null)
    if (!c?.automatica) corrector?.alTerminar(final) // la palabra corregida no se «aprende»: ya existía
    alTerminarPalabra?.(final)
    return t.slice(0, inicio) + final + ' '
  }

  // Se ejecuta en CADA CUADRO de la cámara con los 21 puntos de la mano (o null si no hay mano).
  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    // Un reconocedor por lengua (si cambia la lengua en el menú, se crea uno nuevo).
    if (reconocedor.current?.lengua !== lengua) reconocedor.current = { lengua, rec: new ReconocedorDeletreo(lengua) }
    reconocedor.current.rec.usarClasificador(actual.current.opciones.clasificar ?? null)
    reconocedor.current.rec.usarMemoria(actual.current.opciones.memoria ?? null)
    const e = reconocedor.current.rec.procesar(puntos, tiempo)
    let t = actual.current.texto

    if (e.letraNueva) {
      t += e.letraNueva
      setResaltada(e.candidata)
    }
    if (e.espacio && t && !t.endsWith(' ')) t = cerrarPalabra(t)
    if (t !== actual.current.texto) {
      actual.current.texto = t // para que el siguiente cuadro ya lo vea, antes de redibujar
      setTexto(t)
    }
    actual.current.opciones.alCadaCuadro?.(e, t)

    // Redibujar solo cuando cambia lo que se ve (no 30 veces por segundo).
    const clave = `${e.aviso}|${e.candidata?.letra}|${Math.round(e.confianza * 10)}|${e.gemelaConMovimiento?.letra}|${e.letraNueva}|${e.ia?.nombre}|${Math.round((e.ia?.probabilidad ?? 0) * 10)}|${e.personal}`
    if (clave !== ultimaClave.current) {
      ultimaClave.current = clave
      setEstado(e)
    }
  }

  // ── Botones para corregir ──
  const candidata = estado?.candidata ?? null
  const cambiar = (nuevo: string) => {
    actual.current.texto = nuevo
    setTexto(nuevo)
    // Si se borró la palabra corregida, la corrección ya no aplica.
    if (correccion && nuevo.length < correccion.inicio + 1) setCorreccion(null)
  }

  /** Reemplaza la palabra de la corrección por otra (si sigue en su lugar). */
  const reemplazarPalabra = (de: string, por: string) => {
    if (!correccion) return false
    const { inicio } = correccion
    if (texto.slice(inicio, inicio + de.length) !== de) return false
    cambiar(texto.slice(0, inicio) + por + texto.slice(inicio + de.length))
    return true
  }

  return {
    texto,
    estado,
    resaltada,
    candidata,
    /** Qué tan estable se ha visto la letra (0 a 100). */
    confianza: Math.round((resaltada ? 1 : (estado?.confianza ?? 0)) * 100),
    alDetectar,
    agregarCandidata: () => candidata && cambiar(texto + candidata.letra),
    agregarEspacio: () => texto && !texto.endsWith(' ') && cambiar(cerrarPalabra(texto)),
    borrar: () => cambiar(texto.slice(0, -1)),
    limpiar: () => {
      cambiar('')
      setCorreccion(null)
    },
    /** Última corrección (aplicada) o sugerencia del autocorrector. */
    correccion,
    /** Deshacer la corrección automática: regresa la palabra original y la IA la aprende. */
    deshacerCorreccion: () => {
      if (!correccion?.aplicada) return
      if (reemplazarPalabra(correccion.sugerida, correccion.original)) actual.current.opciones.corrector?.alDeshacer(correccion)
      setCorreccion(null)
    },
    /** Aceptar una sugerencia (cuando el corrector no estaba seguro). */
    aceptarSugerencia: (palabra: string) => {
      if (!correccion || correccion.aplicada) return
      if (reemplazarPalabra(correccion.original, palabra)) actual.current.opciones.corrector?.alAplicar({ ...correccion, sugerida: palabra })
      setCorreccion(null)
    },
    descartarCorreccion: () => setCorreccion(null),
  }
}
