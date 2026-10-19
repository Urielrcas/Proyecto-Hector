/*
 * GRAFO DE LETRAS (para la «Ruta de aprendizaje»)
 * Convierte el alfabeto en un grafo donde:
 *   - cada letra es un NODO,
 *   - dos letras están CONECTADAS si su forma de mano cambia en 1 o 2 detalles
 *     (un dedo, la posición del pulgar, separar/cruzar dedos, girar la mano o el movimiento).
 * Así, una ruta A → E → S es una secuencia de letras donde cada una se parece a la anterior.
 * El grafo se manda al backend, que busca las rutas con DFS o BFS (backend/app/busqueda.py).
 *
 * Como "parecerse" va en ambos sentidos (si A se parece a E, E se parece a A), el grafo
 * tiene ciclos: A → E → S → A. Por eso el algoritmo debe recordar qué letras ya visitó.
 */

// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     DEDOS_LARGOS → los 4 dedos que no son el pulgar
//     NOMBRE_DEDO → nombre en español de cada dedo
import { DEDOS_LARGOS, NOMBRE_DEDO } from '../vision/postura'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → devuelve las letras de LSM o ASL con su forma de mano
//     Letra → tipo: una letra con sus pasos y forma
import { alfabeto, type Letra } from './alfabeto'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     EstadoDedo → tipo: 'estirado' | 'curvo' | 'doblado'
//     FormaMano → tipo: descripción de la forma de la mano
//     PosicionPulgar → tipo: dónde va el pulgar
//     Palma → tipo: hacia dónde mira la palma (frente, dorso, lado)
import type { EstadoDedo, FormaMano, Palma, PosicionPulgar } from './forma'

/** Máximo de detalles que pueden cambiar entre dos letras conectadas. */
// Con 1 el grafo queda partido en muchos grupos sueltos; con 2 casi todo el alfabeto queda unido.
export const MAX_DIFERENCIAS = 2

// Textos para explicar cada cambio al usuario ("Dobla el medio", "Pulgar: sobre los dedos"...).
const VERBO_DEDO: Record<EstadoDedo, string> = { estirado: 'Estira', curvo: 'Curva', doblado: 'Dobla' }
const PULGAR: Record<PosicionPulgar, string> = {
  doblado: 'doblado sobre la palma',
  sobre: 'sobre los dedos',
  lado: 'pegado al costado de la mano',
  estirado: 'estirado',
  curvo: 'curvo',
  toca: 'tocando las puntas de los dedos',
  entre: 'entre los dedos',
}

const PALMA: Record<Palma, string> = {
  frente: 'Voltea la mano: palma al frente',
  dorso: 'Voltea la mano: dorso al frente',
  lado: 'Pon la mano de lado',
}

/** Qué hay que cambiar para pasar de la forma "a" a la forma "b". Lista vacía = misma forma. */
export function diferencias(a: FormaMano, b: FormaMano): string[] {
  const cambios: string[] = []
  for (const dedo of DEDOS_LARGOS) {
    if (a.dedos[dedo] !== b.dedos[dedo]) cambios.push(`${VERBO_DEDO[b.dedos[dedo]]} el ${NOMBRE_DEDO[dedo]}`)
  }
  if (a.pulgar !== b.pulgar) cambios.push(`Pulgar: ${PULGAR[b.pulgar]}`)
  if ((a.entre ?? 0) !== (b.entre ?? 0)) cambios.push('Mueve el pulgar a otro hueco entre los dedos')
  if (!!a.separados !== !!b.separados) cambios.push(b.separados ? 'Separa índice y medio' : 'Junta índice y medio')
  if (!!a.cruzados !== !!b.cruzados) cambios.push(b.cruzados ? 'Cruza índice y medio' : 'Descruza índice y medio')
  if ((a.giro ?? 0) !== (b.giro ?? 0)) cambios.push(b.giro ? `Gira la mano ${b.giro}°` : 'Endereza la mano')
  if ((a.palma ?? 'frente') !== (b.palma ?? 'frente')) cambios.push(PALMA[b.palma ?? 'frente'])
  if ((a.movimiento ?? '') !== (b.movimiento ?? '')) cambios.push(b.movimiento ? 'Agrega el movimiento' : 'Sin movimiento')
  return cambios
}

export interface GrafoLetras {
  letras: Letra[] // las letras de la lengua, en orden del alfabeto
  grafo: Record<string, string[]> // cada letra → sus letras vecinas (lo que se manda al backend)
}

/**
 * Letras a las que se puede llegar desde "inicio" sin importar cuántos pasos se den.
 * Sirve para saber si "no hay ruta" se debe al límite de profundidad o a que las letras
 * están en grupos separados del grafo (por ejemplo C, O y D solo se parecen entre sí).
 */
export function alcanzables(grafo: Record<string, string[]>, inicio: string): Set<string> {
  const vistas = new Set([inicio])
  const pendientes = [inicio]
  while (pendientes.length) {
    for (const vecina of grafo[pendientes.pop()!] ?? []) {
      if (!vistas.has(vecina)) {
        vistas.add(vecina)
        pendientes.push(vecina)
      }
    }
  }
  return vistas
}

/** Arma el grafo de letras de una lengua. */
export function grafoLetras(lengua: Lengua): GrafoLetras {
  const letras = alfabeto(lengua)
  const grafo: Record<string, string[]> = {}
  for (const a of letras) {
    // Vecinas: las demás letras cuya forma cambia en 1 o 2 detalles (en orden del alfabeto).
    grafo[a.letra] = letras
      .filter((b) => b.letra !== a.letra && diferencias(a.forma, b.forma).length <= MAX_DIFERENCIAS)
      .map((b) => b.letra)
  }
  return { letras, grafo }
}

export interface GrafoConCostos {
  grafo: Record<string, Record<string, number>> // cada letra → {vecina: costo}
  heuristica: Record<string, number> // h(n) de cada letra hacia la meta
}

/**
 * Datos para UCS, Greedy y A* (comparación de algoritmos, backend/app/busqueda_costo.py):
 *   - costo de un paso c(n, m): cuántos detalles de la mano cambian de la letra n a la m (1 o 2).
 *   - heurística h(n): cuántos detalles le faltan a la letra n para ser la meta.
 * h(n) nunca sobreestima (es admisible): cada detalle distinto tiene que cambiar al menos una vez
 * y cada cambio cuesta 1. Además es consistente, h(n) ≤ c(n, m) + h(m), porque cambiar de n a m
 * no puede acercar a la meta más detalles de los que cambia.
 */
export function grafoConCostos(lengua: Lengua, objetivo: string): GrafoConCostos {
  const { letras, grafo: vecinas } = grafoLetras(lengua)
  const forma = Object.fromEntries(letras.map((l) => [l.letra, l.forma]))
  const grafo: Record<string, Record<string, number>> = {}
  const heuristica: Record<string, number> = {}
  for (const { letra } of letras) {
    grafo[letra] = Object.fromEntries(vecinas[letra].map((v) => [v, diferencias(forma[letra], forma[v]).length]))
    heuristica[letra] = diferencias(forma[letra], forma[objetivo]).length
  }
  return { grafo, heuristica }
}
