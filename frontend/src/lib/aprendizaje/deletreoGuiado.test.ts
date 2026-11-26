import { describe, expect, it } from 'vitest'
import { alfabeto } from './alfabeto'
import { limpiarPalabra, pasosDeletreo, primerNombre } from './deletreoGuiado'

describe('deletreo guiado', () => {
  it('limpia la palabra: mayúsculas, sin acentos ni signos, respeta la Ñ', () => {
    expect(limpiarPalabra('  Sofía López! ')).toBe('SOFIA LOPEZ')
    expect(limpiarPalabra('Núñez')).toBe('NUÑEZ')
    expect(limpiarPalabra('123')).toBe('')
  })

  it('da las letras en orden y salta los espacios y lo que no existe en la lengua', () => {
    expect(pasosDeletreo('Ana Luz', alfabeto('LSM')).map((p) => p.letra.letra)).toEqual(['A', 'N', 'A', 'L', 'U', 'Z'])
    expect(pasosDeletreo('Ñu', alfabeto('ASL')).map((p) => p.letra.letra)).toEqual(['U'])
  })

  it('toma el primer nombre', () => {
    expect(primerNombre('Ana María Pérez')).toBe('Ana')
    expect(primerNombre('  ')).toBeNull()
    expect(primerNombre(undefined)).toBeNull()
  })
})
