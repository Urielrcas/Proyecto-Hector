/*
 * COMPONENTE: DIBUJO DEL GRAFO DE LETRAS (SVG)
 * Dibuja las letras en círculo y las líneas entre las que se parecen (el grafo).
 * Encima muestra lo que hizo la búsqueda hasta el paso elegido:
 *   - gris claro           = letra que todavía no se explora,
 *   - verde claro          = letra ya explorada,
 *   - verde oscuro         = camino que se está siguiendo (o, al final, la ruta encontrada),
 *   - anillo naranja       = letra que se está revisando en este paso,
 *   - borde gris punteado  = rama cortada por el límite de profundidad (al final).
 * Se usa en la pantalla «Ruta de aprendizaje» (pages/aprender/RutaAprendizaje.tsx).
 */

// ▸ Desde nuestro proyecto: src/services/busqueda.ts:
//     caminoEnPaso → la rama que seguía DFS en un paso de la exploración
//     ResultadoBusqueda → tipo: lo que devolvió la búsqueda (orden, rutas, ciclos, cortes...)
import { caminoEnPaso, type ResultadoBusqueda } from '../services/busqueda'

// Colores (los mismos tonos "marca" de index.css, más el naranja de acento).
const COLOR = {
  linea: '#e7e5e4',
  lineaCamino: '#13695d',
  nodo: '#ffffff',
  bordeNodo: '#d6d3d1',
  textoNodo: '#78716c',
  explorado: '#d0f5eb',
  bordeExplorado: '#6dd8c1',
  textoExplorado: '#12463f',
  camino: '#13695d',
  textoCamino: '#ffffff',
  actual: '#c2410c',
  corte: '#78716c',
}

const TAMANO = 420 // el dibujo mide 420 × 420 (se escala al ancho disponible)
const CENTRO = TAMANO / 2
const RADIO = 170 // radio del círculo donde van las letras
const RADIO_NODO = 15
const MARGEN = 24 // espacio extra alrededor del dibujo

export function GrafoBusqueda({
  letras,
  grafo,
  resultado,
  paso,
  rutaFinal,
}: {
  letras: string[] // en orden del alfabeto (así quedan acomodadas en el círculo)
  grafo: Record<string, string[]>
  resultado: ResultadoBusqueda | null
  paso: number // cuántos pasos del orden de exploración se muestran (el total = estado final)
  rutaFinal: string[] | null // ruta que se resalta al terminar
}) {
  // Posición de cada letra en el círculo (empieza arriba y avanza como las manecillas del reloj).
  const posicion: Record<string, { x: number; y: number }> = {}
  letras.forEach((letra, i) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / letras.length
    posicion[letra] = { x: CENTRO + RADIO * Math.cos(angulo), y: CENTRO + RADIO * Math.sin(angulo) }
  })

  // Estado de la búsqueda en el paso elegido.
  const total = resultado?.orden_exploracion.length ?? 0
  const alFinal = !!resultado && paso >= total
  const explorados = new Set(resultado?.orden_exploracion.slice(0, paso).map((p) => p.nodo))
  const actual = resultado && paso > 0 && !alFinal ? resultado.orden_exploracion[paso - 1].nodo : null
  // Lo que se pinta de verde oscuro: la ruta encontrada al final, o la rama actual durante el recorrido.
  const camino = alFinal ? (rutaFinal ?? []) : resultado ? caminoEnPaso(resultado, paso) : []
  const enCamino = new Set(camino)
  const tramos = new Set(camino.slice(1).map((b, i) => [camino[i], b].sort().join('-')))
  const cortes = new Set(alFinal ? resultado.cortes_por_limite : [])

  // Líneas del grafo: cada par de letras conectadas se dibuja una sola vez.
  const lineas: [string, string][] = []
  for (const a of letras) for (const b of grafo[a] ?? []) if (a < b && posicion[b]) lineas.push([a, b])

  return (
    <svg
      // Margen alrededor del círculo para que las etiquetas "Inicio" y "Meta" no se corten en los bordes.
      viewBox={`${-MARGEN} ${-MARGEN} ${TAMANO + 2 * MARGEN} ${TAMANO + 2 * MARGEN}`}
      className="h-auto w-full"
      role="img"
      aria-label={
        resultado
          ? `Grafo de ${letras.length} letras. ${explorados.size} exploradas${camino.length ? `; camino resaltado: ${camino.join(', ')}` : ''}.`
          : `Grafo de ${letras.length} letras conectadas por parecido de la forma de la mano.`
      }
    >
      {/* Primero las líneas normales, luego las del camino (para que queden encima) */}
      {lineas.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={posicion[a].x} y1={posicion[a].y} x2={posicion[b].x} y2={posicion[b].y} stroke={COLOR.linea} strokeWidth={1.2} />
      ))}
      {lineas
        .filter(([a, b]) => tramos.has([a, b].sort().join('-')))
        .map(([a, b]) => (
          <line key={`c-${a}-${b}`} x1={posicion[a].x} y1={posicion[a].y} x2={posicion[b].x} y2={posicion[b].y} stroke={COLOR.lineaCamino} strokeWidth={4} strokeLinecap="round" />
        ))}

      {/* Letras */}
      {letras.map((letra) => {
        const { x, y } = posicion[letra]
        const deCamino = enCamino.has(letra)
        const explorada = explorados.has(letra)
        const relleno = deCamino ? COLOR.camino : explorada ? COLOR.explorado : COLOR.nodo
        const borde = deCamino ? COLOR.camino : explorada ? COLOR.bordeExplorado : COLOR.bordeNodo
        const texto = deCamino ? COLOR.textoCamino : explorada ? COLOR.textoExplorado : COLOR.textoNodo
        // Etiqueta "Inicio" / "Meta" por fuera del círculo.
        const etiqueta = resultado && (letra === resultado.inicio ? 'Inicio' : letra === resultado.objetivo ? 'Meta' : null)
        const fuera = { x: CENTRO + ((x - CENTRO) * (RADIO + 32)) / RADIO, y: CENTRO + ((y - CENTRO) * (RADIO + 32)) / RADIO }
        return (
          <g key={letra}>
            {letra === actual && <circle cx={x} cy={y} r={RADIO_NODO + 5} fill="none" stroke={COLOR.actual} strokeWidth={3} />}
            <circle
              cx={x}
              cy={y}
              r={RADIO_NODO}
              fill={relleno}
              stroke={cortes.has(letra) && !deCamino ? COLOR.corte : borde}
              strokeWidth={cortes.has(letra) ? 2 : 1.5}
              strokeDasharray={cortes.has(letra) && !deCamino ? '3 3' : undefined}
            />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700} fill={texto}>
              {letra}
            </text>
            {etiqueta && (
              <text x={fuera.x} y={fuera.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill={COLOR.lineaCamino}>
                {etiqueta}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
