/*
 * PRUEBAS DE TEXTO A SEÑAS (deletreo del traductor Voz / Texto → Señas)
 */

// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un valor sea el esperado
//     it → una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/traduccion/deletreo.ts:
//     duracion → cuánto se muestra cada seña
//     MS_LETRA → duración base de una letra
//     textoASenas → convierte un texto en la secuencia de señas
//     Sena → tipo: una seña de la secuencia
import { duracion, MS_LETRA, textoASenas, type Sena } from './deletreo'

// Resume la secuencia como texto: letras, «_» para las pausas y [x] para lo que no tiene seña.
const resumen = (senas: Sena[]) => senas.map((s) => (s.tipo === 'letra' ? s.letra.letra : s.tipo === 'pausa' ? '_' : `[${s.texto}]`)).join('')

describe('textoASenas', () => {
  it('deletrea palabras con una pausa entre ellas', () => {
    expect(resumen(textoASenas('hola mundo', 'LSM'))).toBe('HOLA_MUNDO')
  })

  it('quita acentos y signos de puntuación', () => {
    expect(resumen(textoASenas('¡Hola! ¿Cómo estás?', 'LSM'))).toBe('HOLA_COMO_ESTAS')
    expect(resumen(textoASenas('pingüino', 'LSM'))).toBe('PINGUINO')
  })

  it('la Ñ existe en LSM; en ASL se deletrea como N', () => {
    expect(resumen(textoASenas('niño', 'LSM'))).toBe('NIÑO')
    expect(resumen(textoASenas('niño', 'ASL'))).toBe('NINO')
  })

  it('marca los números como sin seña y conserva el carácter original', () => {
    const s = textoASenas('piso 3', 'LSM')
    expect(resumen(s)).toBe('PISO_[3]')
    const a = textoASenas('á', 'LSM')[0]
    expect(a.tipo === 'letra' && a.original).toBe('á')
  })

  it('no deja pausas sueltas por palabras hechas solo de signos', () => {
    expect(resumen(textoASenas('hola , ¿ adiós', 'LSM'))).toBe('HOLA_ADIOS')
    expect(textoASenas('   ', 'LSM')).toEqual([])
  })

  it('numera las palabras', () => {
    const s = textoASenas('sí no', 'LSM')
    expect(s.map((x) => x.palabra)).toEqual([0, 0, 1, 1, 1])
  })
})

describe('duracion', () => {
  it('depende de la velocidad y de si la letra lleva movimiento', () => {
    const [a] = textoASenas('a', 'LSM')
    const [j] = textoASenas('j', 'LSM')
    expect(duracion(a, 1)).toBe(MS_LETRA)
    expect(duracion(a, 2)).toBe(MS_LETRA / 2)
    expect(duracion(j, 1)).toBeGreaterThan(duracion(a, 1))
  })
})
