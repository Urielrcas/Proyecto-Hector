/*
 * VOZ SINTÉTICA (Web Speech API del navegador)
 * Lee un texto en voz alta. La usan Frases de emergencia y el traductor Señas → Texto.
 * No necesita internet ni librerías: la voz la pone el propio navegador.
 */

/** ¿El navegador puede leer en voz alta? */
export const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Lee el texto en voz alta (detiene lo que se estuviera leyendo).
 * idioma: 'es-MX' (español de México, por defecto) o 'en-US' (para palabras deletreadas en ASL).
 */
export function hablar(texto: string, idioma: 'es-MX' | 'en-US' = 'es-MX') {
  if (!hayVoz() || !texto.trim()) return
  speechSynthesis.cancel()
  const voz = new SpeechSynthesisUtterance(texto)
  voz.lang = idioma
  voz.rate = 0.95 // velocidad (1 = normal)
  speechSynthesis.speak(voz)
}

/** Detiene la lectura. */
export function callar() {
  if (hayVoz()) speechSynthesis.cancel()
}
