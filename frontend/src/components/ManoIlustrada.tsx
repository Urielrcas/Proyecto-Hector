/*
 * COMPONENTE: DIBUJO DE LA MANO (SVG)
 * Dibuja la mano DERECHA de una letra, orientada como en el alfabeto ilustrado:
 *   - palma al frente (la mayoría): se ven la palma y sus líneas; el pulgar queda a la derecha,
 *   - dorso al frente (G, H, M, N, Ñ, Q): se ven los nudillos, los tendones y las uñas; el pulgar a la izquierda,
 *   - de lado (C, O, P, X): la mano de perfil (ver manoPerfil.ts),
 *   - la mano girada si apunta hacia un lado o hacia abajo, y flechas naranjas si lleva movimiento.
 * Cada dedo: estirado = recto, curvo = la punta se dobla hacia el frente (se ve su uña),
 * doblado = metido en la palma (se ve el nudillo y la uña).
 * Estilo de lámina ilustrada: piel clara con contorno café delgado.
 * Con "tonos" colorea cada dedo en verde (bien) o rojo (corregir) al comparar con la cámara.
 *
 * Las piezas se calculan aquí (o en manoPerfil.ts) y se pintan con LienzoMano (manoDibujo.tsx).
 */

// ▸ Desde nuestro proyecto: src/lib/aprendizaje/forma.ts:
//     EstadoDedo → tipo: 'estirado' | 'curvo' | 'doblado'
//     FormaMano → tipo: descripción de la forma de la mano
//     Movimiento → tipo: el movimiento de una letra (j, z, arriba, lados, frente)
import type { EstadoDedo, FormaMano, Movimiento } from '../lib/aprendizaje/forma'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     Dedo → tipo: nombre de un dedo
import type { Dedo } from '../lib/vision/postura'
// ▸ Desde nuestro proyecto: src/components/manoDibujo.tsx:
//     herramientas compartidas para dibujar la mano (figuras, pliegues, colores, LienzoMano)
import { COLORES, LienzoMano, PIEL, figura, giroDe, grosorDe, pielDe, pliegue, suma, unitario, type EscenaMano, type Nodo, type P, type Pieza, type Tono } from './manoDibujo'
// ▸ Desde nuestro proyecto: src/components/manoPerfil.ts:
//     escenaPerfil → piezas de la mano vista de lado
import { escenaPerfil } from './manoPerfil'

// Nudillo (x, k), largo y ancho de cada dedo, con la mano vertical. (Se dibuja con el pulgar a la
// izquierda; para la palma al frente se refleja y el pulgar queda a la derecha, como una mano derecha.)
const DEDOS: { dedo: Exclude<Dedo, 'pulgar'>; x: number; k: number; largo: number; ancho: number }[] = [
  { dedo: 'indice', x: 66, k: 142, largo: 86, ancho: 21 },
  { dedo: 'medio', x: 90, k: 138, largo: 96, ancho: 22 },
  { dedo: 'anular', x: 114, k: 140, largo: 90, ancho: 21 },
  { dedo: 'menique', x: 136, k: 148, largo: 70, ancho: 17 },
]

// Cuánto se mueve la punta hacia un lado cuando los dedos van separados o cruzados.
const ABIERTOS: Record<string, number> = { indice: -16, medio: 6, anular: 18 }
const CRUZADOS: Record<string, number> = { indice: 22, medio: -22 }

const PALMA =
  'M54 156 C54 138 60 132 74 132 L128 132 C146 132 152 142 151 160 L149 198 C148 216 142 228 136 238 L134 272 L70 272 L68 238 C60 226 56 214 55 200 Z'
const LINEAS_PALMA = ['M149 172 Q124 160 100 176', 'M60 186 Q92 178 120 200', 'M64 184 Q80 206 86 240', 'M118 214 Q124 226 122 240']
// En el dorso: los tendones que bajan de cada nudillo hacia la muñeca.
const TENDONES = DEDOS.map((d) => `M${d.x} ${d.k + 12} Q${d.x + (100 - d.x) * 0.3} 200 ${100 + (d.x - 100) * 0.35} 246`)

/** Dirección y articulaciones de un dedo. */
function geometria(d: (typeof DEDOS)[number], forma: FormaMano) {
  const estado = forma.dedos[d.dedo]
  const desvio = estado === 'estirado' ? ((forma.cruzados ? CRUZADOS : forma.separados ? ABIERTOS : {})[d.dedo] ?? 0) : 0
  return { estado, base: { x: d.x, y: d.k }, u: unitario(desvio, -d.largo) }
}

/** Dónde queda la punta del dedo (para que el pulgar la toque en O, D, F). */
function puntaDedo(d: (typeof DEDOS)[number], forma: FormaMano): P {
  const { estado, base, u } = geometria(d, forma)
  if (estado === 'estirado') return suma(base, u, d.largo)
  if (estado === 'curvo') return { x: d.x, y: d.k - d.largo * 0.28 + d.ancho * 0.4 }
  return { x: d.x, y: d.k + 34 }
}

/**
 * Eje del pulgar (de su raíz en la base de la palma a la punta) según su posición.
 * El primer tramo es el monte del pulgar: la parte carnosa de la palma de donde nace.
 */
function ejePulgar(forma: FormaMano): Nodo[] {
  switch (forma.pulgar) {
    case 'doblado':
      return [
        { x: 84, y: 244, w: 24 },
        { x: 66, y: 220, w: 30 },
        { x: 84, y: 204, w: 23 },
        { x: 106, y: 196, w: 20 },
        { x: 124, y: 190, w: 18 },
      ]
    case 'sobre':
      return [
        { x: 84, y: 244, w: 24 },
        { x: 63, y: 214, w: 30 },
        { x: 80, y: 190, w: 23 },
        { x: 102, y: 176, w: 20 },
        { x: 122, y: 166, w: 18 },
      ]
    case 'lado':
      return [
        { x: 70, y: 228, w: 28 },
        { x: 50, y: 192, w: 25 },
        { x: 46, y: 166, w: 22 },
        { x: 44, y: 146, w: 19 },
      ]
    case 'estirado':
      return [
        { x: 70, y: 228, w: 28 },
        { x: 42, y: 194, w: 25 },
        { x: 24, y: 174, w: 22 },
        { x: 9, y: 156, w: 19 },
      ]
    case 'curvo':
      return [
        { x: 70, y: 228, w: 28 },
        { x: 32, y: 190, w: 25 },
        { x: 25, y: 160, w: 22 },
        { x: 33, y: 134, w: 19 },
      ]
    case 'entre': {
      const i = (forma.entre ?? 1) - 1
      const a = DEDOS[i]
      const b = DEDOS[i + 1]
      const t = { x: (a.x + b.x) / 2, y: (a.k + b.k) / 2 - 2 }
      return [
        { x: 84, y: 244, w: 24 },
        { x: 63, y: 214, w: 30 },
        { x: 72, y: 188, w: 22 },
        { x: (72 + t.x) / 2, y: (188 + t.y) / 2 + 4, w: 20 },
        { ...t, w: 18 },
      ]
    }
    case 'toca': {
      // Se junta con la punta del primer dedo curvo (O, D, F).
      const d = DEDOS.find((x) => forma.dedos[x.dedo] === 'curvo') ?? DEDOS[0]
      const t = puntaDedo(d, forma)
      const m = { x: Math.min(t.x - 22, 40), y: t.y + 40 }
      return [
        { x: 78, y: 244, w: 24 },
        { x: 56, y: 214, w: 28 },
        { ...m, w: 22 },
        { x: (m.x + t.x) / 2 - 3, y: (m.y + t.y) / 2, w: 20 },
        { x: t.x - 3, y: t.y + 6, w: 18 },
      ]
    }
  }
}

/** Escena de la mano vista de frente (palma) o de espaldas (dorso). */
function escenaFrontal(forma: FormaMano, tono: (d: Dedo) => Tono, dorso: boolean): Pick<EscenaMano, 'palma' | 'silueta' | 'encima'> {
  const silueta: Pieza[] = [] // estirados y base de los curvos: se funden con la palma
  const encima: Pieza[] = [] // medio cruzado y puntas dobladas de los curvos
  const doblados: Pieza[] = [] // dedos metidos en la palma (o, de dorso, sus nudillos)

  for (const d of DEDOS) {
    const { estado, base, u } = geometria(d, forma)
    const t = tono(d.dedo)
    const comun = { borde: COLORES[estado][t], grosor: grosorDe(estado, t), piel: pielDe(t) }
    const w = d.ancho
    if (estado === 'estirado') {
      const j1 = suma(base, u, d.largo * 0.45)
      const j2 = suma(base, u, d.largo * 0.72)
      const punta = suma(base, u, d.largo - w * 0.45)
      const pieza: Pieza = {
        clave: d.dedo,
        ...comun,
        figura: figura([
          { ...suma(base, u, 4), w },
          { ...j1, w: w * 0.97 },
          { ...j2, w: w * 0.9 },
          { ...punta, w: w * 0.84 },
        ]),
        // De dorso se ven las uñas de los dedos estirados.
        unas: dorso ? [{ c: suma(punta, u, w * 0.08), rx: w * 0.3, ry: w * 0.4, giro: giroDe(u) }] : [],
        pliegues: [pliegue(j1, u, w), pliegue(suma(j1, u, 3), u, w * 0.8), pliegue(j2, u, w * 0.9)],
      }
      // En "cruzados" el medio pasa por encima del índice.
      if (forma.cruzados && d.dedo === 'medio') encima.push(pieza)
      else silueta.push(pieza)
    } else if (estado === 'curvo' && dorso) {
      // De dorso, el dedo curvo se aleja: se ve más corto y sin la uña.
      const j = { x: d.x, y: d.k - d.largo * 0.6 }
      silueta.push({
        clave: d.dedo,
        ...comun,
        figura: figura([
          { ...suma(base, u, 4), w },
          { ...j, w: w * 0.95 },
        ]),
        unas: [],
        pliegues: [pliegue({ x: d.x, y: d.k - d.largo * 0.42 }, u, w)],
      })
    } else if (estado === 'curvo') {
      const j1 = { x: d.x, y: d.k - d.largo * 0.48 }
      silueta.push({
        clave: d.dedo,
        ...comun,
        figura: figura([
          { ...suma(base, u, 4), w },
          { ...j1, w: w * 0.97 },
        ]),
        unas: [],
        pliegues: [pliegue({ x: d.x, y: j1.y + d.largo * 0.14 }, u, w)],
      })
      // La punta doblada hacia el frente: se ve el dorso de la falange y la uña, apuntando abajo.
      const fin = { x: d.x, y: j1.y + d.largo * 0.2 }
      encima.push({
        clave: `${d.dedo}-punta`,
        ...comun,
        piel: pielDe(t, 'sombra'),
        figura: figura(
          [
            { x: d.x, y: j1.y - d.largo * 0.04, w: w * 0.98 },
            { x: d.x, y: j1.y + d.largo * 0.08, w: w * 0.92 },
            { ...fin, w: w * 0.86 },
          ],
          true,
        ),
        unas: [{ c: { x: d.x, y: fin.y + w * 0.08 }, rx: w * 0.3, ry: w * 0.28, giro: 0 }],
        pliegues: [],
      })
    } else if (dorso) {
      // De dorso, del dedo doblado solo asoma el nudillo.
      doblados.push({
        clave: d.dedo,
        ...comun,
        figura: figura(
          [
            { x: d.x, y: d.k - 9, w: w + 2 },
            { x: d.x, y: d.k + 4, w: w + 1 },
          ],
          true,
        ),
        unas: [],
        pliegues: [pliegue({ x: d.x, y: d.k - 2 }, { x: 0, y: 1 }, w * 0.8)],
      })
    } else {
      // Dedo metido en la palma: arriba el nudillo, abajo la uña de la punta.
      const fin = { x: d.x, y: d.k + 27 }
      doblados.push({
        clave: d.dedo,
        ...comun,
        figura: figura(
          [
            { x: d.x, y: d.k - 6, w: w + 2 },
            { x: d.x, y: d.k + 12, w: w + 1 },
            { ...fin, w },
          ],
          true,
        ),
        unas: [{ c: { x: d.x, y: fin.y + 2 }, rx: w * 0.31, ry: w * 0.29, giro: 0 }],
        pliegues: [pliegue({ x: d.x, y: d.k + 4 }, { x: 0, y: 1 }, w), pliegue({ x: d.x, y: d.k + 7 }, { x: 0, y: 1 }, w * 0.7)],
      })
    }
  }

  // ── Pulgar ──
  // Estirado, al lado o en C: sale de la palma y se funde con ella. Si no, va encima de la palma
  // (y de dorso queda escondido detrás de la mano).
  const pulgarAfuera = forma.pulgar === 'estirado' || forma.pulgar === 'lado' || forma.pulgar === 'curvo'
  const pulgarVisible = pulgarAfuera || !dorso
  const estadoPulgar: EstadoDedo = forma.pulgar === 'doblado' ? 'doblado' : forma.pulgar === 'curvo' ? 'curvo' : 'estirado'
  const eje = ejePulgar(forma)
  const tPulgar = eje[eje.length - 1]
  const tm = eje[eje.length - 2]
  const codo = eje[eje.length - 3]
  const uPulgar = unitario(tPulgar.x - tm.x, tPulgar.y - tm.y)
  const tp = tono('pulgar')
  // Por delante, la uña del pulgar se ve cuando va encima de la palma; por detrás, cuando sale de la mano.
  const conUna = dorso ? pulgarAfuera : !(forma.pulgar === 'estirado' || forma.pulgar === 'curvo')
  const pulgar: Pieza = {
    clave: 'pulgar',
    borde: COLORES[estadoPulgar][tp],
    grosor: grosorDe(estadoPulgar, tp),
    piel: pielDe(tp),
    figura: figura(eje.slice(1)),
    unas: conUna ? [{ c: suma(tPulgar, uPulgar, -tPulgar.w * 0.05), rx: tPulgar.w * 0.33, ry: tPulgar.w * 0.38, giro: giroDe(uPulgar) }] : [],
    pliegues: [pliegue(codo, unitario(tm.x - codo.x, tm.y - codo.y), codo.w), pliegue(tm, uPulgar, tm.w)],
  }
  if (pulgarVisible) {
    // El monte del pulgar (la parte carnosa de donde nace) es piel de la palma: no lleva color de estado.
    silueta.unshift({ clave: 'monte', borde: PIEL.borde, grosor: 1.8, piel: 'piel', relleno: 'palma', figura: figura(eje.slice(0, 2)), unas: [], pliegues: [] })
    if (pulgarAfuera) silueta.push(pulgar)
  }

  return {
    palma: { d: PALMA, lineas: dorso ? TENDONES : LINEAS_PALMA },
    silueta,
    encima: [...encima, ...doblados, ...(pulgarVisible && !pulgarAfuera ? [pulgar] : [])],
  }
}

const FLECHAS: Record<Movimiento, { d: string; dobles?: boolean }> = {
  j: { d: 'M172 58 V160 Q172 196 142 190' },
  z: { d: 'M108 2 H170 L108 42 H170' },
  arriba: { d: 'M178 128 Q190 42 124 16' },
  lados: { d: 'M36 22 Q100 -4 164 22', dobles: true },
  frente: { d: 'M112 14 H186', dobles: true },
}
const ESPEJO = 'translate(200 0) scale(-1 1)'
// De perfil la mano se recorre un poco para quedar centrada en el recuadro.
const ENCUADRE_PERFIL = 'translate(-8 -6)'

/**
 * Ilustración de una seña con la mano derecha, orientada como en el alfabeto (palma, dorso o de lado).
 * `tonos` colorea cada dedo como correcto o incorrecto al comparar con el intento del usuario.
 */
export function ManoIlustrada({ forma, tonos, etiqueta }: { forma: FormaMano; tonos?: Partial<Record<Dedo, Tono>>; etiqueta: string }) {
  const tono = (d: Dedo): Tono => tonos?.[d] ?? 'objetivo'
  const vista = forma.palma ?? 'frente'
  const giro = forma.giro ?? 0
  // Reflejar para que sea una mano derecha: de frente el pulgar queda a la derecha.
  const espejo = vista === 'frente'
  const partes = vista === 'lado' ? escenaPerfil(forma, tono) : escenaFrontal(forma, tono, vista === 'dorso')
  const flecha = forma.movimiento && FLECHAS[forma.movimiento]

  const escena: EscenaMano = {
    ...partes,
    transform: [giro ? `rotate(${giro} 100 140)` : '', espejo ? ESPEJO : '', vista === 'lado' ? ENCUADRE_PERFIL : ''].join(' ').trim() || undefined,
    // La flecha acompaña al espejo (la Z no: se dibuja como se lee).
    flecha: flecha && { ...flecha, transform: espejo && forma.movimiento !== 'z' ? ESPEJO : undefined },
  }
  return <LienzoMano escena={escena} etiqueta={etiqueta} />
}
