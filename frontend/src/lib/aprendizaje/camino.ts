/**
 * CAMINO DE APRENDIZAJE (el mapa de niveles de «Aprender»)
 * Ordena el alfabeto en niveles de 4 letras, con un reto (juego) cada 2 niveles.
 *
 * Cómo se ordenan las letras: búsqueda en anchura (BFS) sobre el grafo de letras parecidas
 * (grafoLetras.ts). Se empieza en la primera letra del alfabeto y se visitan primero sus vecinas,
 * luego las vecinas de las vecinas… Así cada nivel junta letras que se parecen y aprender una
 * ayuda con la siguiente. Si quedan letras en otro grupo del grafo (no conectadas), se sigue
 * con otra BFS desde la primera que falte, en orden del alfabeto.
 *
 * Estado de cada parada:
 *   - hecho: todas sus letras ya se lograron (reto: todos los niveles anteriores están hechos).
 *   - actual: la primera parada que no está hecha (ahí está Mani).
 *   - pendiente: las que siguen.
 */
import type { Lengua } from '../tipos'
import { grafoLetras } from './grafoLetras'

export const LETRAS_POR_NIVEL = 4
export const NIVELES_POR_RETO = 2

const NOMBRES = ['Primeros pasos', 'Calentando', 'Tomando ritmo', 'Dedos ágiles', 'Buen avance', 'Casi en la cima', 'Gran final', 'Extra']

export type EstadoParada = 'hecho' | 'actual' | 'pendiente'

export type Parada =
  | { tipo: 'nivel'; id: string; numero: number; titulo: string; letras: string[]; logradas: number; estado: EstadoParada }
  | { tipo: 'reto'; id: string; titulo: string; descripcion: string; ruta: string; estado: EstadoParada }

/** Letras del alfabeto en orden BFS sobre el grafo de letras parecidas. */
export function ordenBFS(lengua: Lengua): string[] {
  const { letras, grafo } = grafoLetras(lengua)
  const vistas = new Set<string>()
  const orden: string[] = []
  for (const { letra: inicio } of letras) {
    if (vistas.has(inicio)) continue
    // BFS: cola de letras por visitar
    const cola = [inicio]
    vistas.add(inicio)
    while (cola.length) {
      const actual = cola.shift()!
      orden.push(actual)
      for (const vecina of grafo[actual] ?? []) {
        if (!vistas.has(vecina)) {
          vistas.add(vecina)
          cola.push(vecina)
        }
      }
    }
  }
  return orden
}

const RETOS = [
  { titulo: 'Reto: ¿Qué letra es?', descripcion: 'Adivina las letras por su dibujo.', ruta: '/aprender/juegos/adivina' },
  { titulo: 'Reto contra reloj', descripcion: 'Haz las letras con tu mano antes de que acabe el tiempo.', ruta: '/aprender/juegos/reto' },
  { titulo: 'Reto: Memorama', descripcion: 'Encuentra los pares de letra y seña.', ruta: '/aprender/juegos/memorama' },
]

type SinEstado<T> = T extends unknown ? Omit<T, 'estado'> & { hecha: boolean } : never

/** Arma el camino completo con el progreso del usuario. */
export function armarCamino(lengua: Lengua, logradas: readonly string[]): Parada[] {
  const orden = ordenBFS(lengua)
  const hechas = new Set(logradas)
  const borrador: SinEstado<Parada>[] = []
  let nivelesHechos = true // ¿todos los niveles hasta aquí están completos?

  for (let i = 0, n = 0; i < orden.length; i += LETRAS_POR_NIVEL, n++) {
    const letras = orden.slice(i, i + LETRAS_POR_NIVEL)
    const cuantas = letras.filter((l) => hechas.has(l)).length
    const hecha = cuantas === letras.length
    nivelesHechos &&= hecha
    borrador.push({ tipo: 'nivel', id: `nivel-${n + 1}`, numero: n + 1, titulo: NOMBRES[Math.min(n, NOMBRES.length - 1)], letras, logradas: cuantas, hecha })

    // Cada 2 niveles, un reto. Queda «hecho» cuando ya se completaron los niveles de antes.
    const esUltimo = i + LETRAS_POR_NIVEL >= orden.length
    if ((n + 1) % NIVELES_POR_RETO === 0 && !esUltimo) {
      const reto = RETOS[((n + 1) / NIVELES_POR_RETO - 1) % RETOS.length]
      borrador.push({ tipo: 'reto', id: `reto-${n + 1}`, ...reto, hecha: nivelesHechos })
    }
  }
  borrador.push({
    tipo: 'reto',
    id: 'final',
    titulo: 'Meta: deletrea palabras',
    descripcion: 'Junta todo lo que aprendiste deletreando palabras completas.',
    ruta: '/aprender/juegos/palabra',
    hecha: nivelesHechos,
  })

  // La primera parada sin hacer es la «actual»; las demás sin hacer quedan «pendientes».
  const actual = borrador.findIndex((p) => !p.hecha)
  return borrador.map(({ hecha, ...p }, i) => ({ ...p, estado: hecha ? 'hecho' : i === actual ? 'actual' : 'pendiente' }) as Parada)
}
