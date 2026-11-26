import { describe, expect, it } from 'vitest'
import type { LetraExpediente } from '../../services/intentos'
import { alfabeto } from './alfabeto'
import { consejoDedos, consejoDelDedo, dedosDistintos } from './consejoDedos'

const LSM = alfabeto('LSM')
const letra = (l: string) => LSM.find((x) => x.letra === l)!

function info(parcial: Partial<LetraExpediente>): LetraExpediente {
  return {
    letra: 'E', intentos: 0, aciertos: 0, tasa: 0, puntaje_promedio: 0, ultimo_puntaje: 0, lograda: false, estado: 'difícil',
    tendencia: 'estable', confundida_con: [], dedo_mas_fallado: null, fallidos: 0, dedos_fallados: [], ultima_vez: null, prediccion: null,
    ...parcial,
  }
}

describe('consejo personal por dedos', () => {
  it('dice cuántos fallos, el porcentaje del dedo y qué hacer con él en esa letra', () => {
    const c = consejoDedos(letra('E'), info({ intentos: 20, fallidos: 20, dedos_fallados: [{ dedo: 'pulgar', veces: 12, porcentaje: 0.6 }] }), LSM)!
    expect(c.resumen).toBe('Llevas 20 intentos fallidos con la E. En el 60 % de ellos falló tu pulgar.')
    expect(c.consejos[0]).toBe(`Te aconsejo: ${consejoDelDedo(letra('E').objetivo, 'pulgar')!.replace(/^./, (x) => x.toLowerCase())}`)
    expect(c.dedo).toBe('pulgar')
  })

  it('menciona un segundo dedo solo si falla seguido', () => {
    const base = { intentos: 10, fallidos: 10 }
    const con = consejoDedos(letra('E'), info({ ...base, dedos_fallados: [{ dedo: 'pulgar', veces: 6, porcentaje: 0.6 }, { dedo: 'indice', veces: 4, porcentaje: 0.4 }] }), LSM)!
    expect(con.consejos.some((t) => t.startsWith('También revisa tu índice (falló en el 40 %)'))).toBe(true)
    const sin = consejoDedos(letra('E'), info({ ...base, dedos_fallados: [{ dedo: 'pulgar', veces: 6, porcentaje: 0.6 }, { dedo: 'indice', veces: 1, porcentaje: 0.1 }] }), LSM)!
    expect(sin.consejos).toHaveLength(1)
  })

  it('explica qué distingue la letra de la que ve la IA', () => {
    expect(dedosDistintos(letra('B').objetivo, letra('A').objetivo)).toEqual(expect.arrayContaining(['indice', 'medio', 'anular', 'menique']))
    const c = consejoDedos(letra('U'), info({ letra: 'U', fallidos: 5, confundida_con: [{ letra: 'A', veces: 3 }] }), LSM)!
    expect(c.consejos.at(-1)).toMatch(/^Cuando fallas, la IA ve una A \(3 veces\)\. Para que no se confundan: /)
  })

  it('no repite el consejo del dedo si es justo lo que distingue la letra de la otra', () => {
    const c = consejoDedos(letra('E'), info({ fallidos: 20, dedos_fallados: [{ dedo: 'pulgar', veces: 16, porcentaje: 0.8 }], confundida_con: [{ letra: 'A', veces: 13 }] }), LSM)!
    const pulgar = consejoDelDedo(letra('E').objetivo, 'pulgar')!.replace(/^./, (x) => x.toLowerCase())
    expect(c.consejos.filter((t) => t.includes(pulgar))).toHaveLength(1)
  })

  it('con pocos fallos todavía no aconseja', () => {
    expect(consejoDedos(letra('E'), info({ fallidos: 2, dedos_fallados: [{ dedo: 'pulgar', veces: 2, porcentaje: 1 }] }), LSM)).toBeNull()
  })
})
