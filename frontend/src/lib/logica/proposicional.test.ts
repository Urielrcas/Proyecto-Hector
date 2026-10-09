// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un resultado sea el esperado
//     it → define una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → devuelve las letras de LSM o ASL con sus pasos y forma
import { alfabeto } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/vision/manoSintetica.ts:
//     manoSintetica → crea una mano falsa (solo para pruebas)
import { manoSintetica } from '../vision/manoSintetica'
// ▸ Desde nuestro proyecto: src/lib/vision/postura.ts:
//     formulaDeObjetivo → la fórmula lógica de una letra
//     leerMano → convierte los 21 puntos en: dedos estirados/curvos/doblados, pulgar, orientación
//     proposicionesDeLectura → convierte lo que ve la cámara en proposiciones V/F
import { formulaDeObjetivo, leerMano, proposicionesDeLectura } from '../vision/postura'
// ▸ Desde nuestro proyecto: src/lib/logica/proposicional.ts:
//     analizar → convierte texto como 'p ∧ q' en una fórmula
//     aTexto → convierte una fórmula en texto
//     clasificar → dice si una fórmula es tautología, contradicción o contingencia
//     equivalentes → dice si dos fórmulas son equivalentes
//     ErrorSintaxis → error al escribir mal una fórmula
//     evaluar → evalúa (en postura: la seña de la mano; en proposicional: una fórmula lógica)
//     tablaDeVerdad → genera la tabla de verdad de una fórmula
//     variables → lista las proposiciones de una fórmula
import { analizar, aTexto, clasificar, equivalentes, ErrorSintaxis, evaluar, tablaDeVerdad, variables } from './proposicional'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
//     REGLAS → todas las reglas lógicas de la app
//     verificarRegla → compara la tabla de verdad de una regla con la esperada
import { cumple, REGLAS, verificarRegla } from './reglas'

const tabla = (texto: string) => tablaDeVerdad(analizar(texto))
const resultado = (texto: string) => tabla(texto).filas.map((f) => f.resultados.at(-1))

describe('análisis de fórmulas', () => {
  it('respeta la precedencia ¬ > ∧ > ∨ > → > ↔ (y lo muestra con paréntesis)', () => {
    expect(aTexto(analizar('¬p ∧ q ∨ r → s ↔ t'))).toBe('(((¬p ∧ q) ∨ r) → s) ↔ t')
    expect(aTexto(analizar('¬(p ∧ q)'))).toBe('¬(p ∧ q)')
    expect(aTexto(analizar('(p ∨ q) ∧ r'))).toBe('(p ∨ q) ∧ r')
    expect(aTexto(analizar('p ∧ q ∧ r'))).toBe('p ∧ q ∧ r')
  })

  it('el condicional agrupa a la derecha', () => {
    expect(aTexto(analizar('p → q → r'))).toBe('p → (q → r)')
    expect(aTexto(analizar('(p → q) → r'))).toBe('(p → q) → r')
    expect(evaluar(analizar('p → q → r'), { p: true, q: false, r: false })).toBe(true)
    expect(evaluar(analizar('(p → q) → r'), { p: true, q: false, r: false })).toBe(true)
    expect(evaluar(analizar('(p → q) → r'), { p: false, q: false, r: false })).toBe(false)
  })

  it('acepta los conectivos escritos con teclado', () => {
    expect(aTexto(analizar('~p & q | !r -> s <-> t'))).toBe('(((¬p ∧ q) ∨ ¬r) → s) ↔ t')
    expect(aTexto(analizar('p => q <=> 1'))).toBe('(p → q) ↔ ⊤')
  })

  it('explica los errores de sintaxis', () => {
    expect(() => analizar('p ∧')).toThrow(ErrorSintaxis)
    expect(() => analizar('(p ∨ q')).toThrow('Falta cerrar un paréntesis.')
    expect(() => analizar('p q')).toThrow('Falta un conectivo entre dos proposiciones.')
    expect(() => analizar('p ∨ q)')).toThrow('Hay un paréntesis de cierre de más.')
    expect(() => analizar('')).toThrow('Escribe una fórmula.')
  })
})

describe('tablas de verdad', () => {
  it('tablas de los conectivos básicos (filas V V, V F, F V, F F)', () => {
    expect(resultado('p ∧ q')).toEqual([true, false, false, false])
    expect(resultado('p ∨ q')).toEqual([true, true, true, false])
    expect(resultado('p → q')).toEqual([true, false, true, true])
    expect(resultado('p ↔ q')).toEqual([true, false, false, true])
    expect(resultado('¬p')).toEqual([false, true])
  })

  it('incluye las columnas intermedias en orden', () => {
    const t = tabla('¬p ∨ q')
    expect(t.variables).toEqual(['p', 'q'])
    expect(t.columnas).toEqual(['¬p', '¬p ∨ q'])
    expect(t.filas).toHaveLength(4)
  })

  it('una tabla con n proposiciones tiene 2^n filas', () => {
    expect(tabla('p ∧ q ∧ r ∧ s').filas).toHaveLength(16)
    expect(variables(analizar('(p → q) ∧ (q → p) ∧ p'))).toEqual(['p', 'q'])
  })
})

describe('clasificación y equivalencias', () => {
  it('tautología, contradicción y contingencia', () => {
    expect(clasificar(analizar('p ∨ ¬p'))).toBe('tautologia')
    expect(clasificar(analizar('p ∧ ¬p'))).toBe('contradiccion')
    expect(clasificar(analizar('p → q'))).toBe('contingencia')
  })

  it.each([
    ['De Morgan (∧)', '¬(p ∧ q)', '¬p ∨ ¬q'],
    ['De Morgan (∨)', '¬(p ∨ q)', '¬p ∧ ¬q'],
    ['Contrarrecíproca', 'p → q', '¬q → ¬p'],
    ['Condicional como disyunción', 'p → q', '¬p ∨ q'],
    ['Doble negación', '¬¬p', 'p'],
    ['Distributiva', 'p ∧ (q ∨ r)', '(p ∧ q) ∨ (p ∧ r)'],
    ['Bicondicional', 'p ↔ q', '(p → q) ∧ (q → p)'],
  ])('%s: %s ≡ %s', (_, a, b) => {
    expect(equivalentes(analizar(a), analizar(b))).toBe(true)
  })

  it('reconoce lo que no es equivalente (recíproca)', () => {
    expect(equivalentes(analizar('p → q'), analizar('q → p'))).toBe(false)
  })

  it('modus ponens y modus tollens son tautologías', () => {
    expect(clasificar(analizar('(p → q) ∧ p → q'))).toBe('tautologia')
    expect(clasificar(analizar('(p → q) ∧ ¬q → ¬p'))).toBe('tautologia')
  })
})

describe('reglas de la app', () => {
  it('administrar usuarios requiere cuenta y rol de administrador', () => {
    expect(cumple('accesoUsuarios', { c: true, a: true })).toBe(true)
    expect(cumple('accesoUsuarios', { c: true, a: false })).toBe(false)
    expect(cumple('accesoUsuarios', { c: false, a: true })).toBe(false)
  })

  it.each(Object.entries(REGLAS))('«%s» cumple la tabla de verdad de su especificación', (_, r) => {
    expect(verificarRegla(r)).toEqual([])
  })

  it('la verificación detecta una fórmula que no coincide con su tabla', () => {
    const malEscrita = { ...REGLAS.accesoUsuarios, formula: analizar('c ∨ a') }
    expect(verificarRegla(malEscrita)).toEqual(['Tabla de verdad VVVF ≠ esperada VFFF'])
  })

  it('al editar un usuario, la contraseña vacía es válida; al crearlo, no', () => {
    const base = { n: true, e: true, k: false, s: true }
    expect(cumple('usuarioValido', { ...base, d: true })).toBe(true)
    expect(cumple('usuarioValido', { ...base, d: false })).toBe(false)
  })

  it('una letra con movimiento no se logra solo con la forma', () => {
    expect(cumple('letraLograda', { f: true, m: false, d: false })).toBe(true)
    expect(cumple('letraLograda', { f: true, m: true, d: false })).toBe(false)
    expect(cumple('letraLograda', { f: true, m: true, d: true })).toBe(true)
    expect(cumple('letraLograda', { f: false, m: true, d: true })).toBe(false)
  })

  it('cada regla usa solo las proposiciones que documenta', () => {
    for (const r of Object.values(REGLAS)) expect(variables(r.formula).sort()).toEqual(Object.keys(r.proposiciones).sort())
  })
})

describe('letras como fórmulas (evaluador de señas)', () => {
  const lsm = Object.fromEntries(alfabeto('LSM').map((l) => [l.letra, l]))

  it('la D es una conjunción de condiciones con variantes en disyunción', () => {
    expect(aTexto(formulaDeObjetivo(lsm.D.objetivo))).toBe(
      'apunta_arriba ∧ indice_estirado ∧ (medio_curvo ∨ medio_doblado) ∧ (anular_curvo ∨ anular_doblado) ∧ ' +
        '(menique_curvo ∨ menique_doblado) ∧ pulgar_toca',
    )
  })

  it('la U exige los dedos juntos y sin cruzar: ¬cruzados ∧ ¬separados', () => {
    const texto = aTexto(formulaDeObjetivo(lsm.U.objetivo))
    expect(texto).toContain('¬cruzados')
    expect(texto).toContain('¬separados')
  })

  it('cada letra es verdadera con la valuación de su propia forma y falsa con la de otra', () => {
    const valuacion = (letra: string) => proposicionesDeLectura(leerMano(manoSintetica(lsm[letra].forma)))
    expect(evaluar(formulaDeObjetivo(lsm.L.objetivo), valuacion('L'))).toBe(true)
    expect(evaluar(formulaDeObjetivo(lsm.L.objetivo), valuacion('Y'))).toBe(false)
  })
})
