/**
 * LÓGICA DE LOS JUEGOS DE APRENDIZAJE
 * Funciones puras (sin pantalla) que usan los tres juegos:
 *   - «¿Qué letra es?»: preguntas de opción múltiple con dibujos de la mano.
 *   - «Reto contra reloj»: aparece una letra y hay que hacerla con la cámara antes de que se acabe el tiempo.
 *   - «Deletrea la palabra»: igual que el reto, pero las letras forman una palabra.
 *   - «Memorama»: voltear cartas para juntar cada letra con el dibujo de su seña.
 * Para hacerlos más emocionantes: rachas que multiplican los puntos, vidas y estrellas al final.
 * Los distractores del cuestionario son las letras MÁS PARECIDAS a la correcta
 * (se mide con diferencias() del grafo de letras), así el juego obliga a fijarse en los detalles.
 */
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import type { Letra } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     diferencias → qué hay que cambiar para pasar de una forma de mano a otra
import { diferencias } from '../aprendizaje/grafoLetras'

/** Número al azar entre 0 y 1 (se puede cambiar en las pruebas para que siempre salga lo mismo). */
export type Azar = () => number

/** Mezcla una lista (algoritmo de Fisher-Yates) sin modificar la original. */
export function barajar<T>(lista: T[], azar: Azar = Math.random): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Preguntas por partida en «¿Qué letra es?». */
export const PREGUNTAS_ADIVINA = 10
/** Letras por partida en el «Reto contra reloj». */
export const LETRAS_RETO = 8
/** Segundos para hacer una letra sin movimiento / con movimiento. */
export const SEGUNDOS_LETRA = 10
export const SEGUNDOS_LETRA_MOVIMIENTO = 15

/**
 * Tipo de pregunta:
 *  - 'dibujo': se muestra el dibujo de la mano y se elige la letra;
 *  - 'letra': se muestra la letra y se elige el dibujo correcto.
 */
export type TipoPregunta = 'dibujo' | 'letra'

export interface Pregunta {
  tipo: TipoPregunta
  correcta: Letra
  /** 4 opciones ya mezcladas (incluye la correcta). */
  opciones: Letra[]
}

/**
 * Las letras más parecidas a «correcta» (menos diferencias en su forma), para usarlas como
 * opciones incorrectas. Se descartan las de forma idéntica en el dibujo (no se podrían distinguir).
 * Ej.: para la U salen la V, la R, la H…, no la A.
 */
export function distractores(letras: Letra[], correcta: Letra, cuantos = 3, azar: Azar = Math.random): Letra[] {
  const candidatas = letras
    .filter((l) => l.letra !== correcta.letra)
    .map((l) => ({ l, dif: diferencias(correcta.forma, l.forma).length }))
    .filter((c) => c.dif > 0)
  // Primero se mezclan (para que los empates salgan distintos cada vez) y luego se ordenan por parecido.
  const ordenadas = barajar(candidatas, azar).sort((a, b) => a.dif - b.dif)
  // Se toman al azar entre las 6 más parecidas: difícil, pero no siempre las mismas.
  return barajar(ordenadas.slice(0, Math.max(cuantos, 6)), azar)
    .slice(0, cuantos)
    .map((c) => c.l)
}

/**
 * Arma las preguntas de una partida de «¿Qué letra es?», alternando los dos tipos.
 * Se pregunta por las letras «elegidas» (p. ej. las que el usuario cree que ya sabe);
 * las opciones incorrectas salen de «todas» las letras de la lengua.
 */
export function crearPreguntas(elegidas: Letra[], todas: Letra[], cuantas = PREGUNTAS_ADIVINA, azar: Azar = Math.random): Pregunta[] {
  return crearReto(elegidas, cuantas, azar).map((correcta, i) => ({
    tipo: i % 2 === 0 ? 'dibujo' : 'letra',
    correcta,
    opciones: barajar([correcta, ...distractores(todas, correcta, 3, azar)], azar),
  }))
}

/** Elige las letras de un reto. Si hay pocas letras disponibles, se repiten (sin dos iguales seguidas). */
export function crearReto(letras: Letra[], cuantas = LETRAS_RETO, azar: Azar = Math.random): Letra[] {
  if (letras.length === 0) return []
  const resultado: Letra[] = []
  while (resultado.length < cuantas) {
    for (const l of barajar(letras, azar)) {
      if (resultado.length >= cuantas) break
      if (letras.length > 1 && resultado.at(-1)?.letra === l.letra) continue
      resultado.push(l)
    }
  }
  return resultado
}

/** Segundos que se dan para una letra. */
export const segundosPara = (l: Letra) => (l.movimiento ? SEGUNDOS_LETRA_MOVIMIENTO : SEGUNDOS_LETRA)

/**
 * Multiplicador por racha (aciertos seguidos): ×2 desde 3 seguidos, ×3 desde 5.
 * Ej.: si llevas 4 aciertos seguidos, la siguiente letra vale el doble.
 */
export function multiplicador(racha: number): number {
  return racha >= 5 ? 3 : racha >= 3 ? 2 : 1
}

/**
 * Puntos de una letra acertada en el reto: (10 base + 1 por cada segundo que sobró) × multiplicador de racha.
 * Si se usó la pista (ver el dibujo), vale la mitad.
 * Ej.: acertar la L con 6 s de sobra = 16 puntos; con pista = 8; con racha de 3 = 32.
 */
export function puntosLetra(segundosSobrantes: number, conPista: boolean, racha = 0): number {
  const puntos = (10 + Math.max(0, Math.floor(segundosSobrantes))) * multiplicador(racha)
  return conPista ? Math.floor(puntos / 2) : puntos
}

/** Estrellas al terminar (0 a 3) según el porcentaje de aciertos. */
export function estrellas(aciertos: number, total: number): number {
  if (!total) return 0
  const p = aciertos / total
  return p >= 0.9 ? 3 : p >= 0.6 ? 2 : p >= 0.3 ? 1 : 0
}

/* ── «¿Qué letra es?» ── */

/** Segundos para responder cada pregunta y vidas al empezar. */
export const SEGUNDOS_PREGUNTA = 8
export const VIDAS = 3

/** Puntos por respuesta correcta: (10 + segundos que sobraron) × multiplicador de racha. */
export function puntosRespuesta(segundosSobrantes: number, racha = 0): number {
  return (10 + Math.max(0, Math.floor(segundosSobrantes))) * multiplicador(racha)
}

/* ── Memorama ── */

export type Dificultad = 'facil' | 'normal' | 'dificil'
export const PARES: Record<Dificultad, number> = { facil: 4, normal: 6, dificil: 8 }

export interface Carta {
  id: number
  letra: Letra
  /** La carta muestra la letra escrita o el dibujo de la seña. */
  cara: 'letra' | 'dibujo'
}

/**
 * Arma las cartas del memorama: por cada letra, una carta con la letra y otra con su dibujo.
 * En «difícil» las letras son parecidas entre sí (ej.: U, V, R, H…), para obligar a fijarse.
 */
export function crearMemorama(letras: Letra[], dificultad: Dificultad, azar: Azar = Math.random): Carta[] {
  const pares = Math.min(PARES[dificultad], letras.length)
  let elegidas: Letra[]
  if (dificultad === 'dificil') {
    const base = barajar(letras, azar)[0]
    elegidas = [base, ...distractores(letras, base, pares - 1, azar)]
  } else {
    elegidas = barajar(letras, azar).slice(0, pares)
  }
  const cartas = elegidas.flatMap((letra) => [
    { letra, cara: 'letra' as const },
    { letra, cara: 'dibujo' as const },
  ])
  return barajar(cartas, azar).map((c, id) => ({ ...c, id }))
}

/**
 * Puntos del memorama: 20 por par, −5 por cada movimiento de más y un bono por terminar rápido.
 * Ej.: 6 pares en 8 movimientos y 40 s → 120 − 10 + 20 = 130.
 */
export function puntosMemorama(pares: number, movimientos: number, segundos: number): number {
  const extra = Math.max(0, movimientos - pares)
  const bono = Math.max(0, 60 - Math.floor(segundos))
  return Math.max(10, pares * 20 - extra * 5 + bono)
}

/** Estrellas del memorama según los movimientos: perfecto = un movimiento por par. */
export function estrellasMemorama(pares: number, movimientos: number): number {
  return movimientos <= pares * 1.5 ? 3 : movimientos <= pares * 2.2 ? 2 : 1
}

/** Palabras cortas para «Deletrea la palabra» (sin letras dobles seguidas ni LL/RR/Ñ, que no todas las lenguas tienen). */
export const PALABRAS = ['HOLA', 'SOL', 'MAR', 'CASA', 'LUNA', 'AGUA', 'GATO', 'PAN', 'MESA', 'FLOR', 'AMIGO', 'NUBE', 'VIDA', 'TREN', 'DEDO']

/** Convierte una palabra en la lista de letras del alfabeto (omite las que la lengua no tenga). */
export function letrasDePalabra(palabra: string, letras: Letra[]): Letra[] {
  return [...palabra.toUpperCase()].map((c) => letras.find((l) => l.letra === c)).filter((l): l is Letra => !!l)
}

/** Elige las palabras de una partida (todas sus letras deben existir en la lengua). */
export function crearPalabras(letras: Letra[], cuantas = 3, azar: Azar = Math.random): string[] {
  const posibles = PALABRAS.filter((p) => letrasDePalabra(p, letras).length === p.length)
  return barajar(posibles, azar).slice(0, cuantas)
}

/* ── Registro de partidas (para ver el avance) ── */

export type NombreJuego = 'adivina' | 'reto' | 'palabra' | 'memorama'

export interface Partida {
  juego: NombreJuego
  puntos: number
  aciertos: number
  total: number
  /** Fecha en milisegundos. */
  fecha: number
  /** Letras que se fallaron (para sugerir repasarlas). */
  falladas: string[]
  /** Mejor racha de aciertos seguidos. */
  racha?: number
  /** Pistas usadas (reto y palabra). */
  pistas?: number
  /** Estrellas obtenidas (0 a 3). */
  estrellas?: number
}

/** Partidas que se recuerdan por usuario y lengua. */
export const MAX_PARTIDAS = 100

/** Agrega una partida al registro (la más reciente primero) sin pasar del máximo. */
export function agregarPartida(registro: Partida[], partida: Partida): Partida[] {
  return [partida, ...registro].slice(0, MAX_PARTIDAS)
}

/** Mejor puntaje de un juego (0 si nunca se ha jugado). */
export function mejorPuntaje(registro: Partida[], juego: NombreJuego): number {
  return Math.max(0, ...registro.filter((p) => p.juego === juego).map((p) => p.puntos))
}

/**
 * Letras para repasar: las que más se han fallado en las últimas partidas.
 * Ej.: si fallaste la R en 3 partidas y la T en 1, primero sale la R.
 */
export function letrasParaRepasar(registro: Partida[], cuantas = 5): string[] {
  const conteo = new Map<string, number>()
  for (const p of registro.slice(0, 10)) for (const l of p.falladas) conteo.set(l, (conteo.get(l) ?? 0) + 1)
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cuantas)
    .map(([l]) => l)
}
