/*
 * SERVICIO DEL CORRECTOR DE FRASES
 * Llama al backend (backend/app/rutas/frase.py), que le pide a Ollama convertir lo deletreado
 * en una frase bien escrita: "HOLACOMO ESTAS" → "Hola, ¿cómo estás?".
 * Lo usa el traductor Señas → Texto y voz.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
import { api } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../lib/tipos'

// Lo que responde el servidor (FraseSalida en backend/app/modelos.py).
export interface FraseCorregida {
  frase: string
  corregida: boolean // false = la propuesta cambiaba demasiadas letras y se dejó el texto original
  modelo: string // modelo de Ollama que se usó (llama3.2)
}

// POST /api/frase/corregir → frase bien escrita (en español para LSM, en inglés para ASL)
export function corregirFrase(texto: string, lengua: Lengua) {
  return api<FraseCorregida>('/frase/corregir', { metodo: 'POST', cuerpo: { texto, lengua } })
}
