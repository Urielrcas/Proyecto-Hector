/*
 * PALABRAS Y FRASES (LSM y ASL)
 * Señas de palabras completas, en tres temas: saludos, necesidades básicas y emergencias.
 *   - LSM: textos del Diccionario de Lengua de Señas Mexicana «Manos con Voz» (página impresa).
 *   - ASL: descritas a partir de los dibujos de «American Sign Language For Dummies» (página del PDF).
 * No se inventa ninguna seña: si una palabra no está en el libro, no se agrega.
 *
 * Cada palabra guarda los pasos para hacerla, las letras del alfabeto cuya forma de mano usa
 * (para mostrar su dibujo) y cómo se deletrea (para practicarla con la cámara).
 * Para agregar una palabra: agrégala a LSM o ASL con su fuente.
 */

// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'

export type Categoria = 'saludos' | 'necesidades' | 'emergencias'

export const CATEGORIAS: Record<Categoria, { titulo: string; corto: string; descripcion: string }> = {
  saludos: { titulo: 'Saludos', corto: 'Saludos', descripcion: 'Para empezar y terminar una plática.' },
  necesidades: { titulo: 'Necesidades básicas', corto: 'Necesidades', descripcion: 'Agua, comida, baño…' },
  emergencias: { titulo: 'Emergencias', corto: 'Emergencias', descripcion: 'Para pedir ayuda rápido.' },
}

export interface Palabra {
  /** Identificador para la dirección: /aprender/palabras/lsm-agua */
  id: string
  /** La palabra en español. */
  palabra: string
  /** En ASL: cómo se escribe en inglés (la glosa del libro). */
  glosa?: string
  categoria: Categoria
  pasos: string[]
  /** Letras del alfabeto cuya forma de mano se usa en la seña (se muestran sus dibujos). */
  letras: string[]
  /** La seña se hace con las dos manos. */
  dosManos?: boolean
  /** Página del libro de donde se tomó. */
  pagina: number
}

export const FUENTE_PALABRAS: Record<Lengua, string> = {
  LSM: 'Diccionario de Lengua de Señas Mexicana «Manos con Voz»',
  ASL: '«American Sign Language For Dummies» (dibujos del libro)',
}

type Datos = Omit<Palabra, 'id'>

// ── LSM: Diccionario «Manos con Voz» ─────────────────────────────────────
const LSM: Datos[] = [
  // Saludos
  { palabra: 'Buenos días', categoria: 'saludos', letras: ['B', 'D'], pagina: 94, pasos: ['Coloca una letra B sobre el corazón y muévela al frente.', 'Luego haz una D y muévela en medio círculo hacia un lado.'] },
  { palabra: 'Buenas tardes', categoria: 'saludos', letras: ['B', 'T'], pagina: 94, pasos: ['Coloca una letra B sobre el corazón y muévela al frente.', 'Luego coloca una T sobre el antebrazo y muévela en línea recta hacia ti.'] },
  { palabra: 'Buenas noches', categoria: 'saludos', letras: ['B', 'G'], pagina: 94, pasos: ['Coloca una letra B sobre el corazón y muévela al frente.', 'Luego coloca una G sobre la frente y muévela hacia abajo.'] },
  { palabra: 'Adiós', categoria: 'saludos', letras: [], pagina: 197, pasos: ['Con la mano abierta, dobla los dedos hacia abajo.'] },
  { palabra: 'Nombre', categoria: 'saludos', letras: ['N'], pagina: 214, pasos: ['Haz una letra N.', 'Gira la muñeca hacia arriba y a un lado.'] },
  { palabra: 'Amigo', categoria: 'saludos', letras: [], dosManos: true, pagina: 136, pasos: ['Coloca la palma de una mano sobre el dorso de la otra.'] },
  { palabra: 'Bien', categoria: 'saludos', letras: ['B'], pagina: 69, pasos: ['Coloca una letra B sobre la barbilla.', 'Muévela al frente.'] },
  { palabra: 'Por favor', categoria: 'saludos', letras: [], dosManos: true, pagina: 208, pasos: ['Junta una palma con la otra.', 'Muévelas juntas al frente y atrás.'] },
  { palabra: 'Sí', categoria: 'saludos', letras: ['I'], pagina: 86, pasos: ['Haz una letra I.', 'Encoge y estira el dedo meñique.'] },
  { palabra: 'No', categoria: 'saludos', letras: [], pagina: 82, pasos: ['Estira los dedos índice, medio y pulgar.', 'Únelos por las yemas.'] },
  // Necesidades básicas
  { palabra: 'Agua', categoria: 'necesidades', letras: [], pagina: 26, pasos: ['Estira el dedo índice.', 'Encógelo y vuelve a estirarlo.'] },
  { palabra: 'Comida', categoria: 'necesidades', letras: [], pagina: 31, pasos: ['Con una mano forma un capullo (las puntas de los dedos juntas).', 'Señala la boca con él y muévelo al frente y de regreso.'] },
  { palabra: 'Hambre', categoria: 'necesidades', letras: [], dosManos: true, pagina: 34, pasos: ['Coloca las manos abiertas a la altura del estómago y tócalo con la punta de los dedos.', 'Muévelas al frente y, al mismo tiempo, ciérralas.'] },
  { palabra: 'Sed', categoria: 'necesidades', letras: ['A'], pagina: 45, pasos: ['Haz una letra A.', 'Toca el cuello con la punta del pulgar y recórrelo hacia abajo.'] },
  { palabra: 'Tomar (beber)', categoria: 'necesidades', letras: ['C'], pagina: 223, pasos: ['Coloca una letra C sobre la barbilla, tocándola con el pulgar.', 'Muévela hacia los labios, como si bebieras agua.'] },
  { palabra: 'Baño', categoria: 'necesidades', letras: ['B'], pagina: 97, pasos: ['Haz una letra B y colócala sobre el pecho.', 'Muévela de arriba a abajo.'] },
  { palabra: 'Cama', categoria: 'necesidades', letras: ['C'], pagina: 99, pasos: ['Haz una letra C y colócala al lado de la cara, tocándola con la punta de los dedos.'] },
  { palabra: 'Casa', categoria: 'necesidades', letras: [], dosManos: true, pagina: 99, pasos: ['Une las manos abiertas por las yemas de los dedos.', 'Mantén las palmas separadas (como un techo).'] },
  { palabra: 'Necesitar', categoria: 'necesidades', letras: ['N'], pagina: 213, pasos: ['Haz una letra N con la palma hacia arriba.', 'Haz un movimiento corto a los lados.'] },
  // Emergencias
  { palabra: 'Ayudar', categoria: 'emergencias', letras: ['A'], dosManos: true, pagina: 199, pasos: ['Coloca una letra A sobre la palma de la otra mano, tocándola con el lado del meñique.', 'Mueve las dos manos en medio círculo hacia arriba y al frente.'] },
  { palabra: 'Urgente', categoria: 'emergencias', letras: ['U'], pagina: 224, pasos: ['Haz una letra U con la palma hacia ti.', 'Muévela a un lado.'] },
  { palabra: 'Cuidado', categoria: 'emergencias', letras: ['C'], dosManos: true, pagina: 203, pasos: ['Haz la letra C con las dos manos, una al lado de la otra.', 'Muévelas al mismo tiempo al frente y hacia ti.'] },
  { palabra: 'Mal', categoria: 'emergencias', letras: ['M'], pagina: 80, pasos: ['Coloca una letra M sobre la barbilla, tocándola con el dorso de los dedos.', 'Muévela en medio círculo al frente y abajo.'] },
  { palabra: 'Sangre', categoria: 'emergencias', letras: [], dosManos: true, pagina: 220, pasos: ['Coloca las manos cerradas una encima de la otra, tocándose por los dorsos.', 'Mueve la de arriba en círculos sin separarlas.'] },
  { palabra: 'Bombero', categoria: 'emergencias', letras: [], pagina: 200, pasos: ['Coloca la mano en forma de número 4 sobre la cabeza, tocándola con la muñeca.', 'Deslízala hacia atrás.'] },
]

// ── ASL: «American Sign Language For Dummies» ────────────────────────────
const ASL: Datos[] = [
  // Saludos
  { palabra: 'Hola', glosa: 'HELLO', categoria: 'saludos', letras: ['B'], pagina: 57, pasos: ['Con la mano abierta y los dedos juntos, toca un lado de la frente.', 'Aléjala hacia afuera, como un saludo militar.'] },
  { palabra: 'Mucho gusto', glosa: 'NICE TO MEET YOU', categoria: 'saludos', letras: [], dosManos: true, pagina: 57, pasos: ['Desliza la palma de una mano sobre la palma de la otra.', 'Luego junta las dos manos con el índice levantado.', 'Por último, señala a la persona.'] },
  { palabra: 'Disculpa', glosa: 'EXCUSE ME', categoria: 'saludos', letras: [], dosManos: true, pagina: 58, pasos: ['Roza la palma de una mano con la punta de los dedos de la otra, hacia afuera.'] },
  { palabra: 'Por favor', glosa: 'PLEASE', categoria: 'saludos', letras: [], pagina: 58, pasos: ['Con la mano abierta, haz círculos sobre el pecho.'] },
  { palabra: 'Adiós', glosa: 'GOODBYE', categoria: 'saludos', letras: [], pagina: 60, pasos: ['Con la mano abierta y la palma al frente, dobla y estira los dedos varias veces.'] },
  { palabra: 'De nada', glosa: 'YOU’RE WELCOME', categoria: 'saludos', letras: [], pagina: 60, pasos: ['Con la mano abierta y la palma hacia arriba, muévela desde afuera hacia tu cuerpo.'] },
  // Necesidades básicas
  { palabra: 'Agua', glosa: 'WATER', categoria: 'necesidades', letras: ['W'], pagina: 185, pasos: ['Haz una letra W.', 'Toca la barbilla con el índice dos veces.'] },
  { palabra: 'Leche', glosa: 'MILK', categoria: 'necesidades', letras: [], pagina: 185, pasos: ['Abre y cierra el puño varias veces, como si ordeñaras.'] },
  { palabra: 'Comer', glosa: 'EAT', categoria: 'necesidades', letras: [], pagina: 18, pasos: ['Junta las puntas de los dedos y llévalas a la boca, como si metieras comida.'] },
  { palabra: 'Baño', glosa: 'BATHROOM', categoria: 'necesidades', letras: ['T'], pagina: 100, pasos: ['Haz una letra T.', 'Muévela de lado a lado.'] },
  // Emergencias
  { palabra: 'Emergencia', glosa: 'EMERGENCY', categoria: 'emergencias', letras: ['E'], pagina: 291, pasos: ['Haz una letra E.', 'Agítala de lado a lado.'] },
  { palabra: 'Doctor', glosa: 'DOCTOR', categoria: 'emergencias', letras: [], dosManos: true, pagina: 275, pasos: ['Pon una mano con la palma hacia arriba.', 'Con la punta de los dedos de la otra, toca la muñeca dos veces.'] },
  { palabra: 'Enfermera', glosa: 'NURSE', categoria: 'emergencias', letras: ['N'], dosManos: true, pagina: 275, pasos: ['Pon una mano con la palma hacia arriba.', 'Con la otra haz una N y toca la muñeca dos veces.'] },
  { palabra: 'Dolor', glosa: 'PAIN', categoria: 'emergencias', letras: [], dosManos: true, pagina: 282, pasos: ['Apunta los dos índices uno hacia el otro.', 'Acércalos con golpecitos, a la altura de donde duele.'] },
  { palabra: 'Medicina', glosa: 'MEDICINE', categoria: 'emergencias', letras: [], dosManos: true, pagina: 284, pasos: ['Pon una mano con la palma hacia arriba.', 'Con el dedo medio de la otra, haz círculos en la palma.'] },
  { palabra: 'Ambulancia', glosa: 'AMBULANCE', categoria: 'emergencias', letras: [], pagina: 291, pasos: ['Con la mano abierta y los dedos en garra junto a la cabeza, gírala como la luz de una sirena.'] },
  { palabra: 'Sangrar', glosa: 'BLEED', categoria: 'emergencias', letras: [], dosManos: true, pagina: 291, pasos: ['Toca los labios con el índice.', 'Luego, con la mano abierta, baja moviendo los dedos sobre el dorso de la otra mano.'] },
  { palabra: 'Fuego', glosa: 'FIRE', categoria: 'emergencias', letras: [], dosManos: true, pagina: 267, pasos: ['Con las dos manos abiertas y las palmas hacia ti, súbelas moviendo los dedos, como llamas.'] },
]

/** Texto sin acentos, en mayúsculas y sin paréntesis: «Tomar (beber)» → «TOMAR». La Ñ se respeta. */
function paraDeletrear(texto: string): string {
  return texto
    .replace(/\(.*?\)/g, '')
    .toUpperCase()
    .split('Ñ')
    .map((parte) => parte.normalize('NFD').replace(/\p{M}/gu, ''))
    .join('Ñ')
    .replace(/[^A-ZÑ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function conId(lengua: Lengua, d: Datos): Palabra {
  return { ...d, id: `${lengua.toLowerCase()}-${paraDeletrear(d.palabra).toLowerCase().replace(/ /g, '-')}` }
}

const PALABRAS: Record<Lengua, Palabra[]> = {
  LSM: LSM.map((d) => conId('LSM', d)),
  ASL: ASL.map((d) => conId('ASL', d)),
}

export function palabrasDe(lengua: Lengua, categoria?: Categoria): Palabra[] {
  return categoria ? PALABRAS[lengua].filter((p) => p.categoria === categoria) : PALABRAS[lengua]
}

export function buscarPalabra(id: string): { palabra: Palabra; lengua: Lengua } | null {
  for (const lengua of ['LSM', 'ASL'] as Lengua[]) {
    const palabra = PALABRAS[lengua].find((p) => p.id === id)
    if (palabra) return { palabra, lengua }
  }
  return null
}

/** Busca por nombre («agua», «buenos dias») en una lengua. */
export function palabraPorNombre(nombre: string, lengua: Lengua): Palabra | null {
  const buscado = paraDeletrear(nombre)
  return PALABRAS[lengua].find((p) => paraDeletrear(p.palabra) === buscado || (p.glosa && paraDeletrear(p.glosa) === buscado)) ?? null
}

/** Todos los nombres de palabras de las dos lenguas (para que Mani las reconozca). */
export const NOMBRES_PALABRAS: string[] = [...new Set([...LSM, ...ASL].map((d) => paraDeletrear(d.palabra).toLowerCase()))]

/**
 * Lo que se deletrea con la cámara: en LSM, la palabra en español; en ASL, en inglés
 * (como en el traductor, las palabras deletreadas en ASL son en inglés).
 */
export function deletreoDe(p: Palabra, lengua: Lengua): string {
  return paraDeletrear(lengua === 'ASL' && p.glosa ? p.glosa : p.palabra)
}

/**
 * Cuántas letras del objetivo ya se deletrearon, al final de lo escrito (sin contar espacios).
 * Ej.: objetivo AGUA, escrito «XAG» → 2. Así, si te equivocas, vuelves a empezar sin borrar.
 */
export function avanceDeletreo(escrito: string, objetivo: string): number {
  const t = escrito.replace(/ /g, '')
  const o = objetivo.replace(/ /g, '')
  for (let k = o.length; k > 0; k--) if (t.endsWith(o.slice(0, k))) return k
  return 0
}

/** Para «Ponte a prueba»: la palabra correcta y 3 distractores de la misma lengua (al azar). */
export function opcionesPrueba(lengua: Lengua, correcta: Palabra, azar: () => number = Math.random): Palabra[] {
  const otras = PALABRAS[lengua].filter((p) => p.id !== correcta.id)
  // Primero las del mismo tema (más difícil), luego las demás.
  const mezcla = (l: Palabra[]) => l.map((p) => ({ p, k: azar() })).sort((a, b) => a.k - b.k).map((x) => x.p)
  const distractores = [...mezcla(otras.filter((p) => p.categoria === correcta.categoria)), ...mezcla(otras.filter((p) => p.categoria !== correcta.categoria))].slice(0, 3)
  return mezcla([correcta, ...distractores])
}
