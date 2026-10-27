import { beforeEach, describe, expect, it } from 'vitest'
import { almacenLocal, filtrarYPaginar, MAX_LOCAL, tituloDe, type RegistroHistorial } from './historial'
import { cumple } from './logica/reglas'

// localStorage de mentira (las pruebas corren fuera del navegador).
function localStorageFalso() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  }
}

const msg = (texto: string, autor: 'sorda' | 'oyente' = 'sorda') => ({ autor, texto, hora: '2026-10-27T10:00:00.000Z' })

function registro(id: string, tipo: RegistroHistorial['tipo'], textos: string[], actualizado: string): RegistroHistorial {
  return {
    id,
    tipo,
    lengua: 'LSM',
    titulo: textos[0],
    total_mensajes: textos.length,
    mensajes: textos.map((t) => msg(t)),
    creado_en: actualizado,
    actualizado_en: actualizado,
  }
}

describe('tituloDe', () => {
  it('usa el primer mensaje sin espacios de más', () => {
    expect(tituloDe([msg('  Hola,   ¿cómo  estás? '), msg('Bien')])).toBe('Hola, ¿cómo estás?')
  })
  it('recorta los mensajes largos', () => {
    const t = tituloDe([msg('a'.repeat(200))])
    expect(t.length).toBe(80)
    expect(t.endsWith('…')).toBe(true)
  })
})

describe('filtrarYPaginar', () => {
  const todos = [
    registro('1', 'senas-texto', ['Necesito agua'], '2026-10-01T00:00:00Z'),
    registro('2', 'conversacion', ['Hola', 'Gracias'], '2026-10-03T00:00:00Z'),
    registro('3', 'voz-senas', ['Buenos días'], '2026-10-02T00:00:00Z'),
  ]
  it('ordena lo más reciente primero', () => {
    expect(filtrarYPaginar(todos, {}).items.map((r) => r.id)).toEqual(['2', '3', '1'])
  })
  it('busca dentro de cualquier mensaje, sin importar mayúsculas', () => {
    expect(filtrarYPaginar(todos, { buscar: 'GRACIAS' }).items.map((r) => r.id)).toEqual(['2'])
  })
  it('filtra por tipo', () => {
    expect(filtrarYPaginar(todos, { tipo: 'voz-senas' }).total).toBe(1)
  })
  it('pagina', () => {
    const p = filtrarYPaginar(todos, { pagina: 2, porPagina: 2 })
    expect(p.total).toBe(3)
    expect(p.items.map((r) => r.id)).toEqual(['1'])
  })
})

describe('almacenLocal (invitados)', () => {
  beforeEach(() => {
    globalThis.localStorage = localStorageFalso() as unknown as Storage
  })

  it('crea, actualiza, lista y borra', async () => {
    const a = almacenLocal('prueba')
    const r = await a.crear({ tipo: 'conversacion', lengua: 'LSM', mensajes: [msg('Hola')] })
    expect(r.titulo).toBe('Hola')
    await a.actualizar(r.id, { tipo: 'conversacion', lengua: 'LSM', mensajes: [msg('Hola'), msg('Adiós', 'oyente')] })
    expect((await a.obtener(r.id)).mensajes).toHaveLength(2)
    expect((await a.listar({})).total).toBe(1)
    await a.eliminar(r.id)
    await expect(a.obtener(r.id)).rejects.toMatchObject({ estado: 404 })
  })

  it('borrar todo deja el historial vacío', async () => {
    const a = almacenLocal('prueba')
    await a.crear({ tipo: 'senas-texto', lengua: 'ASL', mensajes: [msg('HI')] })
    await a.eliminarTodo()
    expect((await a.listar({})).total).toBe(0)
  })

  it(`no guarda más de ${MAX_LOCAL} registros`, async () => {
    const a = almacenLocal('prueba')
    for (let i = 0; i < MAX_LOCAL + 3; i++) await a.crear({ tipo: 'senas-texto', lengua: 'LSM', mensajes: [msg(`m${i}`)] })
    expect((await a.listar({ porPagina: 500 })).total).toBe(MAX_LOCAL)
  })
})

describe('reglas nuevas', () => {
  it('guardarHistorial: h ∧ t', () => {
    expect(cumple('guardarHistorial', { h: true, t: true })).toBe(true)
    expect(cumple('guardarHistorial', { h: false, t: true })).toBe(false)
    expect(cumple('guardarHistorial', { h: true, t: false })).toBe(false)
  })
  it('perfilValido: n ∧ (c → (a ∧ k ∧ q))', () => {
    // Solo cambia el nombre: no hace falta la contraseña
    expect(cumple('perfilValido', { n: true, c: false, a: false, k: false, q: false })).toBe(true)
    // Quiere cambiar la contraseña pero no escribió la actual
    expect(cumple('perfilValido', { n: true, c: true, a: false, k: true, q: true })).toBe(false)
    expect(cumple('perfilValido', { n: true, c: true, a: true, k: true, q: true })).toBe(true)
    // Nombre inválido: nunca
    expect(cumple('perfilValido', { n: false, c: false, a: false, k: false, q: false })).toBe(false)
  })
})
