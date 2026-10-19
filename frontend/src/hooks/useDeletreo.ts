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
  } = {},
) {
  const [texto, setTexto] = useState('') // lo que se ha deletreado (en mayúsculas, con espacios)
  const [estado, setEstado] = useState<EstadoReconocedor | null>(null) // lo que se muestra (se actualiza solo si cambia)
  const [resaltada, setResaltada] = useState<Letra | null>(null) // letra recién escrita (se ve en verde un momento)

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

  // Se ejecuta en CADA CUADRO de la cámara con los 21 puntos de la mano (o null si no hay mano).
  const alDetectar = (puntos: Punto[] | null, tiempo: number) => {
    // Un reconocedor por lengua (si cambia la lengua en el menú, se crea uno nuevo).
    if (reconocedor.current?.lengua !== lengua) reconocedor.current = { lengua, rec: new ReconocedorDeletreo(lengua) }
    const e = reconocedor.current.rec.procesar(puntos, tiempo)
    let t = actual.current.texto

    if (e.letraNueva) {
      t += e.letraNueva
      setResaltada(e.candidata)
    }
    if (e.espacio && t && !t.endsWith(' ')) {
      actual.current.opciones.alTerminarPalabra?.(t.split(' ').pop() ?? '')
      t += ' '
    }
    if (t !== actual.current.texto) {
      actual.current.texto = t // para que el siguiente cuadro ya lo vea, antes de redibujar
      setTexto(t)
    }
    actual.current.opciones.alCadaCuadro?.(e, t)

    // Redibujar solo cuando cambia lo que se ve (no 30 veces por segundo).
    const clave = `${e.aviso}|${e.candidata?.letra}|${Math.round(e.confianza * 10)}|${e.gemelaConMovimiento?.letra}|${e.letraNueva}`
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
    agregarEspacio: () => texto && !texto.endsWith(' ') && cambiar(texto + ' '),
    borrar: () => cambiar(texto.slice(0, -1)),
    limpiar: () => cambiar(''),
  }
}
