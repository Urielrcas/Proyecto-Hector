/**
 * AYUDA DE MANI AL PRACTICAR UNA LETRA
 *
 * Junta todo lo que la IA sabe de cómo te va con una letra y lo convierte en una lista de
 * «globos» cortos que Mani dice uno por uno (en lugar de una lista larga debajo de la cámara):
 *   1. El resumen de tus fallos y el dedo que más falla (consejoDedos.ts).
 *   2. Un globo por cada consejo de dedos y por la confusión con otra letra.
 *   3. Los consejos del motor de recomendaciones que no repiten lo anterior (repaso, mejorando...).
 *   4. La predicción de tu próximo intento (red neuronal de la práctica 27), para cerrar con ánimo.
 */
import type { Animo } from '../../components/Mascota'
import type { Expediente } from '../../services/intentos'
import type { Letra } from './alfabeto'
import { consejoDedos } from './consejoDedos'

export interface Globo {
  texto: string
  animo: Animo
  /** Si el consejo es de otra letra, para poner el enlace a practicarla. */
  letra?: string
}

export function globosDeAyuda(letra: Letra, expediente: Expediente | null, letras: Letra[]): Globo[] {
  const info = expediente?.letras.find((l) => l.letra === letra.letra)
  const globos: Globo[] = []
  const personal = info ? consejoDedos(letra, info, letras) : null

  if (personal) {
    globos.push({ texto: personal.resumen, animo: 'pensando' })
    for (const c of personal.consejos) globos.push({ texto: c, animo: 'atento' })
  }

  // Del motor de consejos: si ya hubo consejo por dedos, se omiten los de «difícil» y «confusión» (dicen lo mismo).
  const delMotor = (expediente?.recomendaciones ?? []).filter(
    (c) => c.letra === letra.letra && c.tipo !== 'siguiente' && !(personal && (c.tipo === 'dificil' || c.tipo === 'confusion')),
  )
  for (const c of delMotor) globos.push({ texto: c.mensaje, animo: c.tipo === 'mejorando' ? 'feliz' : 'atento' })

  if (info?.prediccion) globos.push({ texto: info.prediccion.mensaje, animo: info.prediccion.puntaje >= 60 ? 'feliz' : 'atento' })

  // Si no hay nada de esta letra, el consejo más importante en general (de otra letra).
  if (!globos.length) {
    const general = expediente?.recomendaciones.find((c) => c.tipo !== 'siguiente' && c.letra !== letra.letra)
    if (general) globos.push({ texto: general.mensaje, animo: 'atento', letra: general.letra ?? undefined })
  }
  return globos
}
