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
// Las palabras con seña propia se ven como {id parte}.
const resumen = (senas: Sena[]) =>
  senas.map((s) => (s.tipo === 'letra' ? s.letra.letra : s.tipo === 'pausa' ? '_' : s.tipo === 'palabra' ? `{${s.entrada.id} ${s.parte + 1}/${s.partes}}` : `[${s.texto}]`)).join('')

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
    expect(resumen(textoASenas('hola , ¿ mundo', 'LSM'))).toBe('HOLA_MUNDO')
    expect(textoASenas('   ', 'LSM')).toEqual([])
  })

  it('numera las palabras', () => {
    // «sol» y «mar» no tienen seña propia: se deletrean (dos palabras con la pausa en medio).
    const s = textoASenas('sol mar', 'LSM')
    expect(s.map((x) => x.palabra)).toEqual([0, 0, 0, 1, 1, 1, 1])
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

describe('palabras con seña propia', () => {
  it('se muestran completas aunque vengan conjugadas o en plural; lo demás se deletrea', () => {
    expect(resumen(textoASenas('Necesito agua', 'LSM'))).toBe('{lsm-necesitar 1/1}_{lsm-agua 1/1}')
    expect(resumen(textoASenas('mis amigos', 'LSM'))).toBe('MIS_{lsm-amigo 1/1}')
    expect(resumen(textoASenas('Ayúdame', 'LSM'))).toBe('AYUDAME')
    expect(resumen(textoASenas('ayuda por favor', 'LSM'))).toBe('{lsm-ayudar 1/1}_{lsm-por-favor 1/1}')
  })

  it('las frases de varias palabras ganan y su seña puede tener partes', () => {
    expect(resumen(textoASenas('¡Buenos días!', 'LSM'))).toBe('{lsm-buenos-dias 1/2}{lsm-buenos-dias 2/2}')
    expect(resumen(textoASenas('buenas noches Ana', 'LSM'))).toBe('{lsm-buenas-noches 1/2}{lsm-buenas-noches 2/2}_ANA')
  })

  it('en ASL se reconocen en inglés (la glosa) y en español', () => {
    expect(resumen(textoASenas('hello water', 'ASL'))).toBe('{asl-hola 1/1}_{asl-agua 1/1}')
    expect(resumen(textoASenas('agua', 'ASL'))).toBe('{asl-agua 1/1}')
  })

  it('cada parte de una palabra dura más que una letra', () => {
    const [parte] = textoASenas('agua', 'LSM')
    expect(duracion(parte, 1)).toBeGreaterThan(MS_LETRA)
  })
})
