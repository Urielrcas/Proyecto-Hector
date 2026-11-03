import { describe, expect, it } from 'vitest'
import { entender } from '../asistente/entender'
import { alfabeto } from './alfabeto'
import { avanceDeletreo, buscarPalabra, CATEGORIAS, deletreoDe, opcionesPrueba, palabraPorNombre, palabrasDe, type Categoria } from './palabras'

describe('palabras y frases', () => {
  it('cada lengua tiene palabras en los tres temas, con id único y su fuente', () => {
    for (const lengua of ['LSM', 'ASL'] as const) {
      const todas = palabrasDe(lengua)
      expect(new Set(todas.map((p) => p.id)).size).toBe(todas.length)
      for (const tema of Object.keys(CATEGORIAS) as Categoria[]) expect(palabrasDe(lengua, tema).length).toBeGreaterThanOrEqual(3)
      for (const p of todas) {
        expect(p.pasos.length).toBeGreaterThan(0)
        expect(p.pagina).toBeGreaterThan(0)
      }
    }
  })

  it('las formas de mano que usa cada palabra existen en su alfabeto', () => {
    for (const lengua of ['LSM', 'ASL'] as const) {
      const letras = new Set(alfabeto(lengua).map((l) => l.letra))
      for (const p of palabrasDe(lengua)) for (const l of p.letras) expect(letras.has(l), `${p.id} usa ${l}`).toBe(true)
    }
  })

  it('se deletrea en español (LSM) o en inglés (ASL), sin acentos ni signos', () => {
    expect(deletreoDe(palabraPorNombre('adiós', 'LSM')!, 'LSM')).toBe('ADIOS')
    expect(deletreoDe(palabraPorNombre('baño', 'LSM')!, 'LSM')).toBe('BAÑO')
    expect(deletreoDe(palabraPorNombre('tomar', 'LSM')!, 'LSM')).toBe('TOMAR')
    expect(deletreoDe(palabraPorNombre('agua', 'ASL')!, 'ASL')).toBe('WATER')
    expect(deletreoDe(palabraPorNombre('de nada', 'ASL')!, 'ASL')).toBe('YOURE WELCOME')
    expect(buscarPalabra('lsm-buenos-dias')?.palabra.palabra).toBe('Buenos días')
  })

  it('avance del deletreo: cuenta lo que va bien al final de lo escrito', () => {
    expect(avanceDeletreo('', 'AGUA')).toBe(0)
    expect(avanceDeletreo('AG', 'AGUA')).toBe(2)
    expect(avanceDeletreo('XAGU', 'AGUA')).toBe(3)
    expect(avanceDeletreo('AGUA ', 'AGUA')).toBe(4)
    expect(avanceDeletreo('BUENOS DI', 'BUENOS DIAS')).toBe(8)
  })

  it('«Ponte a prueba» da 4 opciones distintas con la correcta', () => {
    const correcta = palabraPorNombre('agua', 'LSM')!
    const opciones = opcionesPrueba('LSM', correcta)
    expect(opciones).toHaveLength(4)
    expect(new Set(opciones.map((p) => p.id)).size).toBe(4)
    expect(opciones.some((p) => p.id === correcta.id)).toBe(true)
  })

  it('Mani entiende «¿cómo se dice…?»', () => {
    expect(entender('¿Cómo se dice agua?')).toEqual({ tipo: 'palabra', nombre: 'agua' })
    expect(entender('cómo se dice buenas noches')).toEqual({ tipo: 'palabra', nombre: 'buenas noches' })
    expect(entender('¿cómo se hace la A? no me sale')).toMatchObject({ tipo: 'letra', letra: 'A' })
  })
})
