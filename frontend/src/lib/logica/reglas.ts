/**
 * Reglas de decisión de la aplicación, en lógica proposicional.
 *
 * Cada regla se declara con:
 *  - su fórmula, que es la que el código evalúa para decidir (permisos, formularios, aprendizaje);
 *  - su tabla de verdad esperada (la especificación), escrita como la columna de resultados
 *    en el orden habitual: filas de "todo V" a "todo F", con la primera proposición variando más lento.
 *
 * `verificarRegla` genera la tabla de verdad de la fórmula y la compara con la especificación,
 * así una fórmula mal escrita se detecta de inmediato (al cargar en desarrollo y en las pruebas).
 */
// ▸ Desde nuestro proyecto: src/lib/logica/proposicional.ts:
//     analizar → convierte texto como 'p ∧ q' en una fórmula
//     evaluar → evalúa (en postura: la seña de la mano; en proposicional: una fórmula lógica)
//     tablaDeVerdad → genera la tabla de verdad de una fórmula
//     variables → lista las proposiciones de una fórmula
//     Formula → tipo: una fórmula de lógica proposicional
import { analizar, evaluar, tablaDeVerdad, variables, type Formula } from './proposicional'

export interface Regla {
  descripcion: string
  /** Significado de cada proposición, en el orden en que aparecen en la fórmula. */
  proposiciones: Record<string, string>
  formula: Formula
  /** Columna de resultados esperada, p. ej. "VFFF" para p ∧ q. */
  tablaEsperada: string
}

const regla = (r: Omit<Regla, 'formula'> & { formula: string }): Regla => ({ ...r, formula: analizar(r.formula) })

export const REGLAS = {
  /** Usado por AppContext → RequiereSesion: qué pantallas internas se pueden abrir. */
  accesoModulos: regla({
    descripcion: 'Se puede usar la app con una cuenta o como invitado.',
    proposiciones: { c: 'tiene una cuenta con sesión iniciada', i: 'entró como invitado' },
    formula: 'c ∨ i',
    tablaEsperada: 'VVVF',
  }),
  /** Usado por AppContext → RequiereAdmin y el menú: acceso a «Usuarios». */
  accesoUsuarios: regla({
    descripcion: 'Solo una cuenta con rol de administrador puede administrar usuarios.',
    proposiciones: { c: 'tiene una cuenta con sesión iniciada', a: 'su rol es administrador' },
    formula: 'c ∧ a',
    tablaEsperada: 'VFFF',
  }),
  /** Usado por Login: se envía al servidor solo si el formulario es válido. */
  loginValido: regla({
    descripcion: 'El correo debe tener formato válido y la contraseña no puede estar vacía.',
    proposiciones: { e: 'el correo tiene formato válido', k: 'se escribió la contraseña' },
    formula: 'e ∧ k',
    tablaEsperada: 'VFFF',
  }),
  /** Usado por Registro y por el formulario de Usuarios. */
  registroValido: regla({
    descripcion: 'Todos los campos del registro deben ser válidos y las contraseñas deben coincidir.',
    proposiciones: {
      n: 'el nombre es válido',
      e: 'el correo tiene formato válido',
      k: 'la contraseña cumple los requisitos',
      q: 'la confirmación coincide con la contraseña',
    },
    formula: 'n ∧ e ∧ k ∧ q',
    tablaEsperada: 'VFFFFFFFFFFFFFFF',
  }),
  /** Usado por el formulario de Usuarios (crear y editar). */
  usuarioValido: regla({
    descripcion:
      'Nombre y correo válidos, y la contraseña cumple los requisitos, salvo al editar con la contraseña vacía (no se cambia).',
    proposiciones: {
      n: 'el nombre es válido',
      e: 'el correo tiene formato válido',
      k: 'la contraseña cumple los requisitos',
      d: 'se está editando un usuario existente',
      s: 'el campo de contraseña está vacío',
    },
    formula: 'n ∧ e ∧ (k ∨ (d ∧ s))',
    tablaEsperada: 'VVVVVFFF' + 'F'.repeat(24),
  }),
  /** Usado por PracticarLetra: cuándo una letra se da por lograda. */
  letraLograda: regla({
    descripcion: 'La forma debe ser correcta y, si la letra lleva movimiento, el movimiento debe detectarse.',
    proposiciones: { f: 'la forma de la mano es correcta', m: 'la letra lleva movimiento', d: 'se detectó el movimiento' },
    formula: 'f ∧ (m → d)',
    tablaEsperada: 'VFVVFFFF',
  }),
} satisfies Record<string, Regla>

export type NombreRegla = keyof typeof REGLAS

/** Compara la tabla de verdad generada de la fórmula con la especificada. Devuelve los errores encontrados. */
export function verificarRegla(r: Regla): string[] {
  const errores: string[] = []
  const vars = variables(r.formula)
  if (vars.join() !== Object.keys(r.proposiciones).join()) {
    errores.push(`Proposiciones de la fórmula (${vars.join(', ')}) ≠ documentadas (${Object.keys(r.proposiciones).join(', ')})`)
  }
  const obtenida = tablaDeVerdad(r.formula)
    .filas.map((f) => (f.resultados[f.resultados.length - 1] ? 'V' : 'F'))
    .join('')
  if (obtenida !== r.tablaEsperada) errores.push(`Tabla de verdad ${obtenida} ≠ esperada ${r.tablaEsperada}`)
  return errores
}

if (import.meta.env.DEV) {
  for (const [nombre, r] of Object.entries(REGLAS)) {
    const errores = verificarRegla(r)
    if (errores.length) throw new Error(`La regla «${nombre}» no cumple su especificación: ${errores.join('; ')}`)
  }
}

/** Evalúa una regla con los valores de verdad de sus proposiciones. */
export function cumple<N extends NombreRegla>(nombre: N, valores: Record<keyof (typeof REGLAS)[N]['proposiciones'], boolean>): boolean {
  return evaluar(REGLAS[nombre].formula, valores as Record<string, boolean>)
}
