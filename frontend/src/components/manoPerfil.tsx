/*
 * MANO DE PERFIL (vista de lado), estilo lámina ilustrada
 * Para las letras que se hacen con la mano de lado (C, O, P, X…). Se ve la mano desde el lado
 * del pulgar: el dorso queda a la izquierda y la palma mira a la derecha.
 *
 * Como lo dibuja un ilustrador, la mano es UN SOLO CONTORNO que se recorre sin despegar el lápiz:
 *   muñeca → dorso de la mano → lado de afuera del índice → punta → lado de adentro del índice →
 *   palma → lado de adentro del pulgar → punta → lado de afuera del pulgar → muñeca.
 *
 * Cada dedo es una cadena de 3 falanges que se doblan en sus articulaciones (como en una mano
 * real, tomada de fotos de referencia): en la C el dedo sube, dobla casi en escuadra en el
 * nudillo del medio y la punta cae; en la O se cierra hasta tocar el pulgar. En cada articulación
 * doblada el nudillo sobresale un poco por fuera.
 * Los otros dedos (medio, anular, meñique) asoman escalonados por detrás del índice.
 */

// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     EstadoDedo → tipo: 'estirado' | 'curvo' | 'doblado'
//     FormaMano → tipo: descripción de la forma de la mano
import type { EstadoDedo, FormaMano } from '../lib/aprendizaje/forma'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     Dedo → tipo: nombre de un dedo
import type { Dedo } from '../lib/vision/postura'
// ▸ Desde nuestro proyecto: src/components/manoDibujo.tsx:
//     herramientas compartidas para dibujar la mano (colores, piel, tipos)
import { COLORES, PIEL, giroDe, grosorDe, pielDe, suma, unitario, type EscenaMano, type P, type Pieza, type Tono } from './manoDibujo'

/** Un dedo como cadena de puntos: base, articulaciones y punta. */
type Cadena = P[]
/** Punto del eje de un dedo con su dirección y su ancho. */
type Muestra = { p: P; u: P; w: number; doblez: number }

// Nudillo del índice (arriba del dorso) y raíz del pulgar (en la palma, cerca de la muñeca).
const NUDILLO: P = { x: 96, y: 126 }
const RAIZ_PULGAR: P = { x: 122, y: 214 }
// Dorso de la mano, de la muñeca al nudillo del índice (ancho, como en las fotos de referencia).
const DORSO: P[] = [
  { x: 44, y: 272 },
  { x: 38, y: 232 },
  { x: 42, y: 194 },
  { x: 54, y: 160 },
  { x: 72, y: 138 },
]
// Muñeca del lado de la palma (debajo del pulgar).
const MUNECA_PALMA: P[] = [
  { x: 132, y: 248 },
  { x: 128, y: 272 },
]
const LARGOS_INDICE = [50, 32, 27] // falange de la base, del medio y de la punta
const ANCHO_INDICE: [number, number] = [40, 31]
const ANCHO_PULGAR: [number, number] = [44, 32]

/** Grados que se dobla cada articulación del índice (acumulados desde vertical hacia la palma). */
function angulosIndice(forma: FormaMano): [number, number, number] {
  const estado = forma.dedos.indice
  if (estado === 'estirado') return [2, 2, 2]
  if (estado === 'doblado') return [80, 180, 240]
  if (forma.pulgar === 'toca') return [22, 100, 168] // O: se cierra hasta el pulgar, dejando el hueco redondo
  if (forma.dedos.medio !== 'curvo') return [15, 115, 175] // X: gancho
  return [30, 105, 130] // C: sube, dobla en escuadra y la punta cae
}

/** Cadena de un dedo a partir de su base, el largo de cada falange y sus ángulos. */
function cadena(base: P, largos: number[], angulos: number[]): Cadena {
  const puntos = [base]
  largos.forEach((largo, i) => {
    const a = (angulos[i] * Math.PI) / 180
    puntos.push(suma(puntos[i], { x: Math.sin(a), y: -Math.cos(a) }, largo))
  })
  return puntos
}

/** Muestras a lo largo de la cadena: cada articulación y la mitad de cada falange, con su ancho. */
function muestrear(c: Cadena, [w0, w1]: [number, number]): Muestra[] {
  const largos = c.slice(1).map((q, i) => Math.hypot(q.x - c[i].x, q.y - c[i].y))
  const total = largos.reduce((s, l) => s + l, 0)
  const dirs = c.slice(1).map((q, i) => unitario(q.x - c[i].x, q.y - c[i].y))
  const out: Muestra[] = []
  let recorrido = 0
  c.forEach((q, i) => {
    const antes = dirs[i - 1] ?? dirs[0]
    const despues = dirs[i] ?? dirs[dirs.length - 1]
    const u = unitario(antes.x + despues.x, antes.y + despues.y)
    // Cuánto se dobla aquí (0 = recto, 1 = escuadra): el nudillo sobresale según eso.
    const doblez = Math.min(1, Math.acos(Math.max(-1, Math.min(1, antes.x * despues.x + antes.y * despues.y))) / (Math.PI / 2))
    const w = w0 + (w1 - w0) * (recorrido / total)
    out.push({ p: q, u, w, doblez: i === 0 || i === c.length - 1 ? 0 : doblez })
    if (i < largos.length) {
      const medio = suma(q, dirs[i], largos[i] / 2)
      out.push({ p: medio, u: dirs[i], w: w0 + (w1 - w0) * ((recorrido + largos[i] / 2) / total), doblez: 0 })
      recorrido += largos[i]
    }
  })
  return out
}

/**
 * Los dos lados de un dedo (de la base a la punta) y su punta redonda.
 * `afuera` es el lado izquierdo de la dirección del dedo (el dorso); `adentro`, el de la palma.
 */
function lados(c: Cadena, anchos: [number, number], desde = 0) {
  const m = muestrear(c, anchos).slice(desde)
  const afuera: P[] = []
  const adentro: P[] = []
  for (const { p, u, w, doblez } of m) {
    const n = { x: -u.y, y: u.x } // hacia la derecha de la dirección (la palma)
    afuera.push(suma(p, n, -(w / 2) * (1 + 0.14 * doblez))) // el nudillo sobresale
    adentro.push(suma(p, n, (w / 2) * (1 - 0.12 * doblez))) // el pliegue se hunde
  }
  const ultima = m[m.length - 1]
  const { p: fin, u } = ultima
  const n = { x: -u.y, y: u.x }
  const h = ultima.w / 2
  const punta = [suma(suma(fin, n, -h * 0.72), u, h * 0.7), suma(fin, u, h), suma(suma(fin, n, h * 0.72), u, h * 0.7)]
  return { afuera, adentro, punta, fin, u, n, h, muestras: m }
}

/** Curva suave cerrada (o abierta) que pasa por todos los puntos (Catmull-Rom → Bézier). */
function suave(pts: P[], cerrada: boolean) {
  const n = pts.length
  const at = (i: number) => (cerrada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const f = (q: P) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`
  let d = `M${f(pts[0])}`
  const tramos = cerrada ? n : n - 1
  for (let i = 0; i < tramos; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`
  }
  return cerrada ? `${d} Z` : d
}

/** Articulaciones del pulgar (raíz, nudillo, punta) según su posición; `punta` = punta del índice. */
function cadenaPulgar(forma: FormaMano, punta: P): Cadena {
  const r = RAIZ_PULGAR
  switch (forma.pulgar) {
    case 'curvo':
      // C: casi horizontal hacia adelante, la punta un poco hacia arriba.
      return [r, { x: 158, y: 216 }, { x: 192, y: 202 }]
    case 'toca':
      // O: sale hacia adelante y sube a encontrarse con la punta del índice.
      return [{ x: r.x + 2, y: r.y - 16 }, { x: 166, y: 184 }, { x: punta.x + 8, y: punta.y + 22 }]
    case 'entre':
      return [r, { x: 148, y: 184 }, { x: 136, y: 132 }]
    case 'lado':
      return [r, { x: 134, y: 178 }, { x: 120, y: 128 }]
    case 'estirado':
      return [r, { x: 158, y: 190 }, { x: 196, y: 148 }]
    default:
      // Sobre o doblado: cruza por delante de los dedos enroscados.
      return [r, { x: 154, y: 198 }, { x: 168, y: 160 }]
  }
}

/** Ángulos de un dedo de atrás según su estado. */
function angulosDeAtras(forma: FormaMano, dedo: Exclude<Dedo, 'pulgar' | 'indice'>, indice: [number, number, number]): number[] {
  const estado = forma.dedos[dedo]
  if (estado === 'doblado') return [80, 180, 240]
  if (estado === 'estirado') return forma.separados && dedo === 'medio' ? [62, 62, 62] : [2, 2, 2] // P: el medio va al frente
  return indice
}

/** Uña en la punta de un dedo, del lado del dorso (afuera). */
function una(fin: P, u: P, n: P, h: number) {
  return { c: suma(suma(fin, u, -h * 0.15), n, -h * 0.45), rx: h * 0.32, ry: h * 0.6, giro: giroDe(u) }
}

/** Escena de la mano de perfil para una forma. */
export function escenaPerfil(forma: FormaMano, tono: (d: Dedo) => Tono): Pick<EscenaMano, 'palma' | 'silueta' | 'encima' | 'detras' | 'trazos'> {
  const angulos = angulosIndice(forma)
  // En la O la falange del medio se ve más larga (va hacia adelante, de frente a quien mira).
  const largosIndice = forma.pulgar === 'toca' ? [50, 46, 27] : LARGOS_INDICE
  const indice = cadena(NUDILLO, largosIndice, angulos)
  const li = lados(indice, ANCHO_INDICE)
  const pulgar = cadenaPulgar(forma, li.fin)
  const lp = lados(pulgar, ANCHO_PULGAR, 1)
  // Si el pulgar se abre (C, O, L…) es parte del contorno. Si va pegado a los dedos (P, A, S…),
  // se pinta encima de la palma: dentro del contorno dejaría una rendija entre él y el índice.
  const pulgarAbierto = forma.pulgar === 'curvo' || forma.pulgar === 'toca' || forma.pulgar === 'estirado'

  // Palma por dentro: de la base del índice a la del pulgar, un poco hundida (la curva de la mano).
  const baseIndice = li.adentro[1]
  const basePulgar = lp.afuera[0]
  // En la O se hunde más: es el fondo del hueco redondo.
  const hundimiento = forma.pulgar === 'toca' ? 16 : 6
  const hundida = { x: (baseIndice.x + basePulgar.x) / 2 - hundimiento, y: (baseIndice.y + basePulgar.y) / 2 }

  // ── El contorno único de la mano ──
  const dorsoEIndice = [...DORSO, ...li.afuera.slice(1), ...li.punta, ...[...li.adentro].reverse().slice(0, -1)]
  const contorno = pulgarAbierto
    ? [...dorsoEIndice, hundida, ...lp.afuera, ...lp.punta, ...[...lp.adentro].reverse(), ...MUNECA_PALMA]
    : [...dorsoEIndice, { x: baseIndice.x + 8, y: 176 }, { x: 134, y: 214 }, ...MUNECA_PALMA]

  // ── Dedos de atrás: asoman escalonados por detrás del índice, con sus nudillos ──
  const ESCALA = { medio: 1.02, anular: 0.92, menique: 0.76 }
  const deAtras = (['medio', 'anular', 'menique'] as const).map((dedo, i): Pieza => {
    const k = i + 1
    const estado = forma.dedos[dedo]
    const t = tono(dedo)
    const base = { x: NUDILLO.x - 3 * k, y: NUDILLO.y - 13 * k }
    const c = cadena(
      base,
      LARGOS_INDICE.map((l) => l * ESCALA[dedo]),
      angulosDeAtras(forma, dedo, angulos),
    )
    const anchos: [number, number] = [ANCHO_INDICE[0] - 3 * k, ANCHO_INDICE[1] - 3 * k]
    const l = lados(c, anchos)
    const d = suave([...l.afuera, ...l.punta, ...[...l.adentro].reverse()], true)
    return {
      clave: dedo,
      figura: { cerrado: d, borde: d, g1: base, g2: base },
      relleno: 'liso',
      borde: COLORES[estado][t],
      grosor: grosorDe(estado, t),
      piel: pielDe(t, 'sombra'),
      unas: estado === 'doblado' ? [] : [una(l.fin, l.u, l.n, l.h)],
      pliegues: [],
    }
  })

  // ── Pulgar pegado a los dedos: pieza encima de la palma ──
  const tp = tono('pulgar')
  const estadoPulgar: EstadoDedo = forma.pulgar === 'doblado' ? 'doblado' : forma.pulgar === 'curvo' ? 'curvo' : 'estirado'
  const lpCompleto = lados(pulgar, ANCHO_PULGAR)
  const dPulgar = suave([...lpCompleto.afuera, ...lpCompleto.punta, ...[...lpCompleto.adentro].reverse()], true)
  const pulgarEncima: Pieza[] = pulgarAbierto
    ? []
    : [
        {
          clave: 'pulgar',
          figura: { cerrado: dPulgar, borde: dPulgar, g1: RAIZ_PULGAR, g2: RAIZ_PULGAR },
          relleno: 'liso',
          borde: COLORES[estadoPulgar][tp],
          grosor: grosorDe(estadoPulgar, tp),
          piel: pielDe(tp),
          unas: [],
          pliegues: [],
        },
      ]

  // ── Detalles encima del contorno: uñas, pliegues y, al comparar, el color del índice y del pulgar ──
  const ti = tono('indice')
  const marcaDe = (t: Tono, estado: EstadoDedo, pts: P[]) =>
    t === 'objetivo' ? null : <path d={suave(pts, false)} fill="none" stroke={COLORES[estado][t]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  const unas = [una(li.fin, li.u, li.n, li.h), ...(pulgarAbierto ? [una(lp.fin, lp.u, lp.n, lp.h)] : [])]
  // Pliegues del lado de la palma en las articulaciones dobladas.
  const pliegues = [...li.muestras, ...(pulgarAbierto ? lp.muestras : [])]
    .filter((m) => m.doblez > 0.2)
    .map((m, i) => {
      const n = { x: -m.u.y, y: m.u.x }
      const a = suma(m.p, n, m.w * 0.12)
      const b = suma(m.p, n, m.w * 0.4)
      return <path key={i} d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`} stroke={PIEL.pliegue} strokeWidth={1.4} strokeLinecap="round" />
    })
  const trazos = (
    <g>
      {pliegues}
      {unas.map((u, i) => (
        <g key={i} transform={`rotate(${u.giro} ${u.c.x} ${u.c.y})`}>
          <ellipse cx={u.c.x} cy={u.c.y} rx={u.rx} ry={u.ry} fill={PIEL.una} stroke={PIEL.bordeUna} strokeWidth={1.2} />
          <ellipse cx={u.c.x - u.rx * 0.3} cy={u.c.y - u.ry * 0.25} rx={u.rx * 0.28} ry={u.ry * 0.4} fill="#ffffff" opacity={0.8} />
        </g>
      ))}
      {marcaDe(ti, forma.dedos.indice, [...li.afuera.slice(1), ...li.punta, ...[...li.adentro].reverse().slice(0, -1)])}
      {pulgarAbierto && marcaDe(tp, estadoPulgar, [...lp.afuera, ...lp.punta, ...[...lp.adentro].reverse()])}
    </g>
  )

  return {
    palma: { d: suave(contorno, true), lineas: ['M56 250 Q88 260 126 252', 'M62 186 Q76 170 96 164', 'M70 214 Q86 200 108 196'] },
    detras: deAtras.reverse(), // del más lejano (meñique) al más cercano (medio)
    silueta: [],
    encima: pulgarEncima,
    trazos,
  }
}
