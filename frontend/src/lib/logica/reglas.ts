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
  /** Usado por la IA (lib/ia/corrector.ts): cuándo una palabra deletreada se corrige sola. */
  autocorregir: regla({
    descripcion:
      'Se corrige sola si la autocorrección está activada, la palabra no existe en el vocabulario, hay una palabra cercana y es claramente la mejor.',
    proposiciones: {
      a: 'la autocorrección está activada',
      v: 'la palabra ya existe en el vocabulario',
      c: 'hay una palabra cercana',
      u: 'la palabra cercana es claramente la mejor',
    },
    formula: 'a ∧ ¬v ∧ c ∧ u',
    tablaEsperada: 'FFFF' + 'VFFF' + 'F'.repeat(8),
  }),
  /** Usado por la IA (lib/ia/memoria.ts): cuándo una mano es TU forma recordada de una letra. */
  formaPersonal: regla({
    descripcion: 'Es tu forma de la letra si la IA recuerda cómo la haces, tu mano está cerca de ese recuerdo y está claramente más cerca de esa letra que de cualquier otra.',
    proposiciones: {
      p: 'la IA recuerda tu forma de esa letra',
      c: 'tu mano está cerca de la forma recordada',
      u: 'está claramente más cerca de esa letra que de otra',
    },
    formula: 'p ∧ c ∧ u',
    tablaEsperada: 'VFFFFFFF',
  }),
  /** Usado por la práctica de letras y los juegos con cámara: cuándo la forma de la mano cuenta como correcta. */
  formaAceptada: regla({
    descripcion: 'La forma cuenta como correcta si la reconocen las reglas generales (como el dibujo) o si es tu forma personal recordada.',
    proposiciones: {
      g: 'las reglas generales reconocen la forma',
      p: 'la IA recuerda tu forma de esa letra',
      c: 'tu mano está cerca de la forma recordada',
      u: 'está claramente más cerca de esa letra que de otra',
    },
    formula: 'g ∨ (p ∧ c ∧ u)',
    tablaEsperada: 'V'.repeat(8) + 'VFFFFFFF',
  }),
  /** Usado por la IA (hooks/useModeloIA.ts): cuándo la red neuronal se vuelve a entrenar sola. */
  reentrenarRed: regla({
    descripcion:
      'La red se reentrena sola si no se está entrenando ya y, o nunca se ha entrenado, o el usuario agregó suficientes muestras nuevas de su mano.',
    proposiciones: { e: 'ya se está entrenando', n: 'la red nunca se ha entrenado', m: 'hay suficientes muestras nuevas' },
    formula: '¬e ∧ (n ∨ m)',
    tablaEsperada: 'FFFF' + 'VVVF',
  }),
  /** Usado por hooks/useGuardadoHistorial.ts: cuándo se guarda una traducción o conversación en el Historial. */
  guardarHistorial: regla({
    descripcion: 'Se guarda en el historial si la opción está activada en Configuración y hay al menos un mensaje.',
    proposiciones: { h: 'guardar historial está activado', t: 'hay al menos un mensaje' },
    formula: 'h ∧ t',
    tablaEsperada: 'VFFF',
  }),
  /** Usado por Configuración → Perfil: cuándo se puede enviar el formulario. */
  perfilValido: regla({
    descripcion: 'El nombre debe ser válido y, si se quiere cambiar la contraseña, hay que escribir la actual y una nueva válida que coincida con su confirmación.',
    proposiciones: {
      n: 'el nombre es válido',
      c: 'se quiere cambiar la contraseña',
      a: 'se escribió la contraseña actual',
      k: 'la contraseña nueva cumple los requisitos',
      q: 'la confirmación coincide con la nueva',
    },
    formula: 'n ∧ (c → (a ∧ k ∧ q))',
    tablaEsperada: 'VFFFFFFF' + 'VVVVVVVV' + 'F'.repeat(16),
  }),
  /** Usado por los juegos «Reto contra reloj» y «Deletrea la palabra»: cuándo cuenta como acierto. */
  aciertoReto: regla({
    descripcion: 'La letra cuenta como acierto si la forma es correcta, se hizo el movimiento (si lleva) y aún queda tiempo.',
    proposiciones: {
      f: 'la forma de la mano es correcta',
      m: 'la letra lleva movimiento',
      d: 'se detectó el movimiento',
      t: 'todavía queda tiempo',
    },
    formula: 'f ∧ (m → d) ∧ t',
    tablaEsperada: 'VFFFVFVF' + 'F'.repeat(8),
  }),
  /** Usado por el traductor Señas → Texto (lib/vision/reconocedor.ts): cuándo se acepta una letra deletreada. */
  letraReconocida: regla({
    descripcion:
      'La forma de la letra se sostiene; si lleva movimiento, el movimiento debe detectarse, y si no lleva, la mano debe estar quieta.',
    proposiciones: {
      f: 'la forma de la letra se sostiene varios cuadros',
      m: 'la letra lleva movimiento',
      d: 'se detectó el movimiento',
      q: 'la mano está quieta',
    },
    formula: 'f ∧ (m → d) ∧ (¬m → q)',
    tablaEsperada: 'VVFFVFVF' + 'F'.repeat(8),
  }),
  /** Usado por el traductor Señas → Texto: cuándo termina una palabra (se agrega un espacio). */
  espacioPalabra: regla({
    descripcion: 'Se cierra la palabra cuando la mano desaparece un momento después de haber deletreado al menos una letra.',
    proposiciones: { s: 'no se ve la mano desde hace 1.5 segundos', u: 'se agregó una letra después del último espacio' },
    formula: 's ∧ u',
    tablaEsperada: 'VFFF',
  }),
  /** Usado por el Modo conversación: cuándo se envía solo el mensaje deletreado por la persona sorda. */
  envioAutomatico: regla({
    descripcion: 'El mensaje se envía solo si la opción está activada, la mano lleva 3 segundos abajo y hay algo escrito.',
    proposiciones: { a: 'el envío automático está activado', s: 'no se ve la mano desde hace 3 segundos', t: 'hay un mensaje escrito' },
    formula: 'a ∧ s ∧ t',
    tablaEsperada: 'VFFFFFFF',
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
