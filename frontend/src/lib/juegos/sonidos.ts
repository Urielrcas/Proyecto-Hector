/**
 * SONIDOS DE LOS JUEGOS
 * Se generan en el momento con el audio del navegador (Web Audio API): no hay archivos de sonido.
 * Cada sonido es una o varias notas (frecuencia en Hz, cuándo empieza y cuánto dura).
 *   acierto  → dos notas que suben (más agudas mientras más larga es la racha)
 *   error    → dos notas graves que bajan
 *   tic      → «tic» corto para los últimos 3 segundos
 *   victoria → arpegio de cuatro notas
 * Se pueden apagar en Configuración o con el botón de la bocina en cada juego.
 */
// ▸ Desde nuestro proyecto: src/lib/configuracion.ts:
//     leerConfiguracion → ¿están activados los sonidos?
import { leerConfiguracion } from '../configuracion'

let contexto: AudioContext | null = null

function audio(): AudioContext | null {
  if (!leerConfiguracion().sonidosJuegos) return null
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  contexto ??= new AudioContext()
  if (contexto.state === 'suspended') void contexto.resume()
  return contexto
}

/** Toca una nota: frecuencia (Hz), cuándo empieza (s desde ahora), duración (s), forma de onda y volumen. */
function nota(frecuencia: number, inicio: number, duracion: number, forma: OscillatorType = 'sine', volumen = 0.12) {
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + inicio
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()
  osc.type = forma
  osc.frequency.setValueAtTime(frecuencia, t)
  // Sube rápido y se apaga suave (sin «clics»).
  vol.gain.setValueAtTime(0, t)
  vol.gain.linearRampToValueAtTime(volumen, t + 0.01)
  vol.gain.exponentialRampToValueAtTime(0.0001, t + duracion)
  osc.connect(vol).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duracion + 0.02)
}

// Notas de la escala (Hz).
const DO = 523.25
const MI = 659.25
const SOL = 783.99
const DO2 = 1046.5

export const sonidos = {
  /** Acierto: más agudo con la racha (hasta 5). */
  acierto(racha = 0) {
    const subida = Math.pow(2, Math.min(racha, 5) / 12) // un semitono más por cada acierto seguido
    nota(MI * subida, 0, 0.12, 'triangle')
    nota(SOL * subida, 0.08, 0.22, 'triangle')
  },
  error() {
    nota(220, 0, 0.15, 'square', 0.06)
    nota(165, 0.12, 0.28, 'square', 0.06)
  },
  tic() {
    nota(1200, 0, 0.05, 'square', 0.04)
  },
  /** Bips de la cuenta regresiva: grave para 3-2-1 y agudo para «¡Ya!». */
  cuenta(final = false) {
    nota(final ? DO2 : DO, 0, final ? 0.35 : 0.15, 'triangle', 0.1)
  },
  carta() {
    nota(880, 0, 0.06, 'sine', 0.06)
  },
  /** Par encontrado / insignia. */
  brillo() {
    nota(SOL, 0, 0.1, 'sine')
    nota(DO2, 0.07, 0.25, 'sine')
  },
  victoria() {
    ;[DO, MI, SOL, DO2].forEach((f, i) => nota(f, i * 0.11, i === 3 ? 0.5 : 0.18, 'triangle'))
  },
}
