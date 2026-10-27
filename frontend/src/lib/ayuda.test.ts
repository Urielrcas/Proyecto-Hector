import { describe, expect, it } from 'vitest'
import { filtrarTemas, normalizar, TEMAS } from './ayuda'

describe('buscador de la ayuda', () => {
  it('sin búsqueda muestra todo', () => {
    expect(filtrarTemas(TEMAS, '  ')).toBe(TEMAS)
  })
  it('ignora acentos y mayúsculas («CAMARA» encuentra «cámara»)', () => {
    expect(normalizar('Cámara')).toBe('camara')
    const r = filtrarTemas(TEMAS, 'CAMARA')
    expect(r.length).toBeGreaterThan(0)
    expect(r.map((t) => t.id)).toContain('camara')
  })
  it('exige todas las palabras', () => {
    const r = filtrarTemas(TEMAS, 'historial privado')
    expect(r.flatMap((t) => t.preguntas).length).toBeGreaterThan(0)
    for (const t of r)
      for (const p of t.preguntas) {
        const texto = normalizar(`${t.titulo} ${p.pregunta} ${p.respuesta}`)
        expect(texto).toContain('historial')
        expect(texto).toContain('privado')
      }
    expect(filtrarTemas(TEMAS, 'zzzz nadaquever')).toEqual([])
  })
  it('cada tema tiene id único y al menos una pregunta', () => {
    expect(new Set(TEMAS.map((t) => t.id)).size).toBe(TEMAS.length)
    for (const t of TEMAS) expect(t.preguntas.length).toBeGreaterThan(0)
  })
})
