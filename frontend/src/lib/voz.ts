/*
 * VOZ SINTÉTICA (Web Speech API del navegador)
 * Lee un texto en voz alta. La usan Frases de emergencia, los traductores y el Modo conversación.
 * No necesita internet ni librerías: la voz la pone el propio navegador.
 * La velocidad, el volumen y la voz se toman de la pantalla «Configuración».
 */
// ▸ Desde nuestro proyecto: src/lib/configuracion.ts:
//     leerConfiguracion → preferencias guardadas (velocidad, volumen y voz)
import { leerConfiguracion } from './configuracion'

/** ¿El navegador puede leer en voz alta? */
export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Voces del navegador para un idioma (ej.: 'es' → español de México, España…). */
export function vocesDisponibles(idioma: 'es' | 'en'): SpeechSynthesisVoice[] {
  if (!hayVoz()) return []
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(idioma))
}

/**
 * Lee el texto en voz alta (detiene lo que se estuviera leyendo).
 * idioma: 'es-MX' (español de México, por defecto) o 'en-US' (para palabras deletreadas en ASL).
 */
export function hablar(texto: string, idioma: 'es-MX' | 'en-US' = 'es-MX') {
  if (!hayVoz() || !texto.trim()) return
  const { vozVelocidad, vozVolumen, vozNombre } = leerConfiguracion()
  speechSynthesis.cancel()
  const voz = new SpeechSynthesisUtterance(texto)
  voz.lang = idioma
  voz.rate = vozVelocidad // velocidad (1 = normal)
  voz.volume = vozVolumen
  // La voz elegida solo se usa si es del mismo idioma (no leer inglés con voz en español).
  const elegida = speechSynthesis.getVoices().find((v) => v.name === vozNombre)
  if (elegida && elegida.lang.slice(0, 2) === idioma.slice(0, 2)) voz.voice = elegida
  speechSynthesis.speak(voz)
}

/** Detiene la lectura. */
export function callar() {
  if (hayVoz()) speechSynthesis.cancel()
}
