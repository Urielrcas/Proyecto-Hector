/*
 * SERVICIO DE BÚSQUEDA (ruta de aprendizaje)
 * Manda el grafo de letras al backend (backend/app/rutas/busqueda.py):
 *   - buscarRuta: ejecuta DFS o BFS (backend/app/busqueda.py) y devuelve todo lo que hizo:
 *     orden de exploración, nodos visitados, rutas, ciclos evitados y ramas cortadas por el límite.
 *   - compararAlgoritmos: ejecuta BFS, DFS, UCS, Greedy y A* con el mismo grafo con costos y la
 *     misma heurística (backend/app/busqueda_costo.py) para compararlos.
 */

// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     api → función que hace las peticiones al backend
import { api } from '../lib/api'

export type Algoritmo = 'dfs-todas' | 'dfs-primera' | 'bfs'

// Lo que se envía (BusquedaEntrada en backend/app/modelos.py).
export interface DatosBusqueda {
  grafo: Record<string, string[]> // cada letra → sus letras vecinas
  inicio: string
  objetivo: string
  algoritmo: Algoritmo
  limite: number | null // profundidad máxima (pasos); null = sin límite
}

// Lo que responde (BusquedaSalida en backend/app/modelos.py).
export interface ResultadoBusqueda {
  algoritmo: Algoritmo
  inicio: string
  objetivo: string
  limite: number | null
  orden_exploracion: { nodo: string; profundidad: number }[] // cada revisión, en orden (puede repetir letras)
  visitados: string[] // letras distintas que se revisaron
  rutas: string[][] // caminos que sí llegan al objetivo
  ciclos_evitados: string[][] // ciclos detectados que no se siguieron, ej. ['A', 'E', 'S', 'A']
  repetidos_evitados: number // veces que se descartó una letra ya visitada
  cortes_por_limite: string[] // letras donde una rama se detuvo por el límite
  ramas_cortadas: number
  truncado: boolean // true si se llegó al tope de rutas o pasos del servidor
}

// POST /api/busqueda/ruta
export function buscarRuta(datos: DatosBusqueda) {
  return api<ResultadoBusqueda>('/busqueda/ruta', { metodo: 'POST', cuerpo: datos })
}

// ── Comparación de los 5 algoritmos ──

export type ClaveAlgoritmo = 'bfs' | 'dfs' | 'ucs' | 'greedy' | 'astar'

// Un nodo expandido: según el algoritmo trae g (costo real), h (heurística), f = g + h o la profundidad.
export interface Expansion {
  nodo: string
  g: number | null
  h: number | null
  f: number | null
  profundidad: number | null
}

// Resultado de un algoritmo (ResultadoComparadoSalida en backend/app/modelos.py).
export interface ResultadoComparado {
  algoritmo: ClaveAlgoritmo
  nombre: string // "BFS", "A*"...
  camino: string[] | null // null = no hay ruta
  costo: number | null // suma de los cambios de la mano en el camino
  pasos: number
  expandidos: Expansion[]
  registro: string[] // explicación paso a paso
}

export interface Comparacion {
  resultados: ResultadoComparado[] // en orden: BFS, DFS, UCS, Greedy, A*
  heuristica_consistente: boolean
  fallas_heuristica: string[]
}

// POST /api/busqueda/comparar
export function compararAlgoritmos(datos: {
  grafo: Record<string, Record<string, number>>
  heuristica: Record<string, number>
  inicio: string
  objetivo: string
}) {
  return api<Comparacion>('/busqueda/comparar', { metodo: 'POST', cuerpo: datos })
}

/**
 * Camino de DFS en el paso "k": se reconstruye con las profundidades del orden de exploración.
 * En DFS, el nodo de profundidad d reemplaza todo lo que había desde el nivel d de la pila.
 * (En BFS no hay una sola rama: se devuelve solo la letra actual.)
 */
export function caminoEnPaso(resultado: ResultadoBusqueda, k: number): string[] {
  if (resultado.algoritmo === 'bfs') return k > 0 ? [resultado.orden_exploracion[k - 1].nodo] : []
  const pila: string[] = []
  for (const { nodo, profundidad } of resultado.orden_exploracion.slice(0, k)) {
    pila.length = profundidad // backtracking: se quitan los niveles más profundos
    pila.push(nodo)
  }
  return pila
}
