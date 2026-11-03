import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { palabrasDe } from '../aprendizaje/palabras'
import type { Cuerpo, Escena, ManoVista } from './escena'
import { cumpleRelacion, estaEn } from './escena'
import { girar, manoSintetica, mover } from './manoSintetica'
import type { Punto } from './postura'
import { ReconocedorSena, SENAS, type EstadoSena } from './senas'

// Una persona frente a la cámara: cara arriba al centro, hombros abajo.
const CUERPO: Cuerpo = { nariz: { x: 0.5, y: 0.25 }, ojos: { x: 0.5, y: 0.2 }, boca: { x: 0.5, y: 0.3 }, hombros: { x: 0.5, y: 0.55 }, anchoHombros: 0.4 }

const forma = (letra: string) => alfabeto('LSM').find((l) => l.letra === letra)!.forma
const mano = (puntos: Punto[]): ManoVista => ({ puntos, normal: puntos })
/** Mano de la letra, chica (como se ve en la cámara), con las puntas de los dedos en (x, y). */
function manoEn(letra: string, x: number, y: number, escala = 0.3, grados = 0): Punto[] {
  const p = mover(girar(manoSintetica(forma(letra)), grados), 0, 0, escala)
  const puntas = { x: (p[8].x + p[12].x) / 2, y: Math.min(p[8].y, p[12].y, p[4].y) }
  return p.map((q) => ({ x: q.x + x - puntas.x, y: q.y + y - puntas.y }))
}

/** Pasa una serie de escenas por el reconocedor (30 cuadros por segundo) y devuelve todos los estados. */
function correr(id: string, escenas: Escena[]): EstadoSena[] {
  const r = new ReconocedorSena(id, id.startsWith('asl') ? 'ASL' : 'LSM')
  return escenas.map((e, i) => r.procesar(e, i * 33))
}

describe('lugares del cuerpo', () => {
  it('reconoce barbilla, pecho y frente', () => {
    expect(estaEn('barbilla', { x: 0.5, y: 0.36 }, CUERPO)).toBe(true)
    expect(estaEn('pecho', { x: 0.5, y: 0.65 }, CUERPO)).toBe(true)
    expect(estaEn('frente', { x: 0.5, y: 0.13 }, CUERPO)).toBe(true)
    expect(estaEn('barbilla', { x: 0.5, y: 0.65 }, CUERPO)).toBe(false)
  })
})

describe('señas de palabras', () => {
  it('todas las señas apuntan a palabras que existen', () => {
    const ids = new Set([...palabrasDe('LSM'), ...palabrasDe('ASL')].map((p) => p.id))
    for (const id of Object.keys(SENAS)) expect(ids.has(id), id).toBe(true)
    // y se pueden preparar (las letras existen en su alfabeto)
    for (const id of Object.keys(SENAS)) expect(() => new ReconocedorSena(id, id.startsWith('asl') ? 'ASL' : 'LSM')).not.toThrow()
  })

  it('«Bien» (LSM): B en la barbilla que va al frente', () => {
    const escenas: Escena[] = Array.from({ length: 45 }, (_, i) => {
      const escala = 0.3 * (1 + Math.max(0, i - 15) * 0.012) // a partir del cuadro 15 se acerca a la cámara
      return { manos: [mano(manoEn('B', 0.5, 0.36, escala))], cuerpo: CUERPO }
    })
    expect(correr('lsm-bien', escenas).some((e) => e.reconocida)).toBe(true)
  })

  it('«Bien» no se reconoce en el pecho y Mani dice dónde ponerla', () => {
    const escenas: Escena[] = Array.from({ length: 45 }, (_, i) => ({ manos: [mano(manoEn('B', 0.5, 0.75, 0.3 * (1 + i * 0.01)))], cuerpo: CUERPO }))
    const estados = correr('lsm-bien', escenas)
    expect(estados.some((e) => e.reconocida)).toBe(false)
    expect(estados.at(-1)!.consejo).toContain('barbilla')
  })

  it('sin cuerpo visible pide alejarse', () => {
    const escenas: Escena[] = Array.from({ length: 20 }, () => ({ manos: [mano(manoEn('B', 0.5, 0.36))], cuerpo: null }))
    expect(correr('lsm-bien', escenas).at(-1)!.consejo).toContain('Aléjate')
  })

  it('«Baño» (LSM): B en el pecho, de arriba a abajo', () => {
    const escenas: Escena[] = Array.from({ length: 50 }, (_, i) => ({ manos: [mano(manoEn('B', 0.5, 0.62 + 0.05 * Math.sin(i / 3)))], cuerpo: CUERPO }))
    expect(correr('lsm-baño', escenas).some((e) => e.reconocida)).toBe(true)
  })

  it('«Casa» (LSM): dos manos abiertas unidas por las yemas', () => {
    const a = manoEn('B', 0.5, 0.6, 0.3, 35)
    let b = manoEn('B', 0.5, 0.6, 0.3, -35)
    const puntas = (p: Punto[]) => ({ x: (p[8].x + p[12].x + p[16].x) / 3, y: (p[8].y + p[12].y + p[16].y) / 3 })
    const [pa, pb] = [puntas(a), puntas(b)]
    b = b.map((q) => ({ x: q.x + pa.x - pb.x, y: q.y + pa.y - pb.y }))
    expect(cumpleRelacion('yemas-unidas', a, b)).toBe(true)
    const escenas: Escena[] = Array.from({ length: 30 }, () => ({ manos: [mano(a), mano(b)], cuerpo: CUERPO }))
    expect(correr('lsm-casa', escenas).some((e) => e.reconocida)).toBe(true)
  })

  it('«Casa» con una sola mano pide la otra mano', () => {
    const escenas: Escena[] = Array.from({ length: 30 }, () => ({ manos: [mano(manoEn('B', 0.5, 0.6))], cuerpo: CUERPO }))
    const estados = correr('lsm-casa', escenas)
    expect(estados.some((e) => e.reconocida)).toBe(false)
    expect(estados.at(-1)!.consejo).toContain('otra mano')
  })

  it('«Buenos días» (LSM) tiene dos partes: primero la B y luego la D', () => {
    const r = new ReconocedorSena('lsm-buenos-dias', 'LSM')
    let t = 0
    const estados: EstadoSena[] = []
    for (let i = 0; i < 45; i++) estados.push(r.procesar({ manos: [mano(manoEn('B', 0.5, 0.62, 0.3 * (1 + Math.max(0, i - 15) * 0.012)))], cuerpo: CUERPO }, (t += 33)))
    expect(estados.at(-1)!.parte).toBe(1)
    for (let i = 0; i < 45; i++) estados.push(r.procesar({ manos: [mano(manoEn('D', 0.5 + Math.max(0, i - 10) * 0.004, 0.5))], cuerpo: CUERPO }, (t += 33)))
    expect(estados.some((e) => e.reconocida)).toBe(true)
  })
})

describe('C no se confunde con A', () => {
  it('una C (también girada de lado) no cumple la A', async () => {
    const { evaluar } = await import('./postura')
    const letras = alfabeto('LSM')
    const A = letras.find((l) => l.letra === 'A')!
    const C = letras.find((l) => l.letra === 'C')!
    for (const grados of [0, 60, 90]) {
      const c = girar(manoSintetica(C.forma), grados)
      expect(evaluar(c, A.objetivo).correcto, `C girada ${grados}°`).toBe(false)
    }
  })
})

describe('E no se confunde con A', () => {
  it('una E con la punta del pulgar hacia el índice, debajo de las puntas, se lee como E y no como A', async () => {
    const { evaluar } = await import('./postura')
    const letras = alfabeto('LSM')
    const A = letras.find((l) => l.letra === 'A')!
    const E = letras.find((l) => l.letra === 'E')!
    const p = manoSintetica(E.forma).map((q) => ({ ...q }))
    // Pulgar cruzado bajo las puntas, con la punta del lado del índice (como la hace una mano real).
    p[4] = { x: p[8].x - 0.005, y: p[8].y + 0.045 }
    p[3] = { x: p[8].x - 0.06, y: p[8].y + 0.09 }
    expect(evaluar(p, E.objetivo).correcto).toBe(true)
    expect(evaluar(p, A.objetivo).correcto).toBe(false)
  })
})

describe('E con la mano inclinada', () => {
  it('una E vista con la mano inclinada (palma acortada) no se lee como C', async () => {
    const { evaluar } = await import('./postura')
    const letras = alfabeto('LSM')
    const C = letras.find((l) => l.letra === 'C')!
    const E = letras.find((l) => l.letra === 'E')!
    const p = manoSintetica(E.forma).map((q) => ({ ...q }))
    p[4] = { x: p[8].x - 0.005, y: p[8].y + 0.045 }
    p[3] = { x: p[8].x - 0.06, y: p[8].y + 0.09 }
    for (const inclinacion of [1, 0.7, 0.5]) {
      // Inclinar: la mano se acorta a lo alto (hacia la muñeca), el ancho no cambia.
      const inclinada = p.map((q) => ({ x: q.x, y: p[0].y + (q.y - p[0].y) * inclinacion }))
      expect(evaluar(inclinada, C.objetivo).correcto, `inclinación ${inclinacion}`).toBe(false)
      expect(evaluar(inclinada, E.objetivo).correcto, `inclinación ${inclinacion}`).toBe(true)
    }
  })
})
