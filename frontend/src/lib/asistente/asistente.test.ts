import { describe, expect, it } from 'vitest'
import { alfabeto } from '../aprendizaje/alfabeto'
import { CONFIGURACION_INICIAL } from '../configuracion'
import { manoSintetica } from '../vision/manoSintetica'
import { entender, normalizarFrase, pareceA } from './entender'
import { letraMasCercana } from './pista'
import { responder, valoresAnteriores, type ContextoMani } from './responder'

const ctx: ContextoMani = { config: CONFIGURACION_INICIAL, lengua: 'LSM', letras: alfabeto('LSM'), recomendaciones: [], puedeDeshacer: false }

describe('normalizar y comparar palabras', () => {
  it('quita acentos y signos pero respeta la Ñ', () => {
    expect(normalizarFrase('¿Cómo se hace la Ñ?')).toBe('como se hace la ñ')
  })
  it('perdona errores de ortografía «al oído»', () => {
    expect(pareceA('asul', 'azul')).toBe(true)
    expect(pareceA('boz', 'voz')).toBe(true)
    expect(pareceA('configuracon', 'configuracion')).toBe(true)
    expect(pareceA('cosa', 'rosa')).toBe(false)
  })
})

describe('entender', () => {
  it('colores', () => {
    expect(entender('Cambia el color principal a azul')).toEqual({ tipo: 'color', color: 'azul' })
    expect(entender('pon la app en asul')).toEqual({ tipo: 'color', color: 'azul' })
    expect(entender('quiero la app negra')).toEqual({ tipo: 'color', color: 'negro' })
    expect(entender('cambia el color a negro o azul')).toMatchObject({ tipo: 'color', color: null, opciones: ['negro', 'azul'] })
    expect(entender('cambia el color')).toEqual({ tipo: 'color', color: null })
    expect(entender('ponla roja')).toMatchObject({ tipo: 'color', noDisponible: 'roja' })
    expect(entender('pon el color original')).toEqual({ tipo: 'color', color: 'teal' })
    expect(entender('modo oscuro')).toEqual({ tipo: 'modo-oscuro' })
  })

  it('letras', () => {
    expect(entender('¿Cómo se hace la Ñ?')).toMatchObject({ tipo: 'letra', letra: 'Ñ', leCuesta: false })
    expect(entender('no me sale la r')).toMatchObject({ tipo: 'letra', letra: 'R', leCuesta: true })
    expect(entender('la letra b')).toMatchObject({ tipo: 'letra', letra: 'B' })
    expect(entender('A')).toMatchObject({ tipo: 'letra', letra: 'A' })
    // «la configuración» no es la letra C
    expect(entender('muéstrame la configuración')).toMatchObject({ tipo: 'ir' })
  })

  it('ajustes', () => {
    expect(entender('pon la letra más grande')).toEqual({ tipo: 'ajuste', que: 'texto', direccion: 'mas' })
    expect(entender('letra más chica')).toEqual({ tipo: 'ajuste', que: 'texto', direccion: 'menos' })
    expect(entender('activa el alto contraste')).toEqual({ tipo: 'ajuste', que: 'contraste', direccion: 'activar' })
    expect(entender('quita las animaciones')).toEqual({ tipo: 'ajuste', que: 'movimiento', direccion: 'desactivar' })
    expect(entender('quita los sonidos')).toEqual({ tipo: 'ajuste', que: 'sonidos', direccion: 'desactivar' })
    expect(entender('habla más lento')).toEqual({ tipo: 'ajuste', que: 'vozVelocidad', direccion: 'menos' })
    expect(entender('sube el volumen')).toEqual({ tipo: 'ajuste', que: 'vozVolumen', direccion: 'mas' })
    expect(entender('no guardes el historial')).toEqual({ tipo: 'ajuste', que: 'historial', direccion: 'desactivar' })
  })

  it('lengua, pantallas y plática', () => {
    expect(entender('cambia a ASL')).toEqual({ tipo: 'lengua', lengua: 'ASL' })
    expect(entender('llévame a los juegos')).toMatchObject({ tipo: 'ir', destino: { ruta: '/aprender/juegos' } })
    expect(entender('quiero jugar')).toMatchObject({ tipo: 'ir', destino: { ruta: '/aprender/juegos' } })
    expect(entender('abre voz a señas')).toMatchObject({ tipo: 'ir', destino: { ruta: '/traductor/voz' } })
    expect(entender('historial')).toMatchObject({ tipo: 'ir', destino: { ruta: '/historial' } })
    expect(entender('emergencia')).toMatchObject({ tipo: 'ir', destino: { ruta: '/emergencia' } })
    expect(entender('¿Qué practico hoy?')).toEqual({ tipo: 'practicar' })
    expect(entender('hola')).toEqual({ tipo: 'saludo' })
    expect(entender('¿quién eres?')).toEqual({ tipo: 'presentacion' })
    expect(entender('deshazlo')).toEqual({ tipo: 'deshacer' })
  })

  it('busca en la Ayuda lo que no es una orden', () => {
    const r = entender('no me prende la cámara')
    expect(r.tipo).toBe('pregunta')
    expect(entender('asdfgh qwerty')).toEqual({ tipo: 'no-entendi' })
  })
})

describe('responder', () => {
  it('cambia el color y se puede deshacer', () => {
    const r = responder({ tipo: 'color', color: 'azul' }, ctx)
    expect(r.cambios).toEqual({ colorPrincipal: 'azul' })
    expect(r.texto).toContain('azul')
    expect(valoresAnteriores(ctx.config, r.cambios!)).toEqual({ colorPrincipal: 'teal' })
  })
  it('no repite un cambio que ya está', () => {
    expect(responder({ tipo: 'color', color: 'teal' }, ctx).cambios).toBeUndefined()
    expect(responder({ tipo: 'ajuste', que: 'texto', direccion: 'menos' }, ctx).cambios).toBeUndefined()
  })
  it('«quitar animaciones» activa Reducir movimiento', () => {
    expect(responder({ tipo: 'ajuste', que: 'movimiento', direccion: 'desactivar' }, ctx).cambios).toEqual({ reducirMovimiento: true })
  })
  it('enseña la letra con su dibujo', () => {
    const r = responder({ tipo: 'letra', letra: 'Ñ', leCuesta: false }, ctx)
    expect(r.letra?.letra).toBe('Ñ')
    expect(responder({ tipo: 'letra', letra: 'Ñ', leCuesta: false }, { ...ctx, lengua: 'ASL', letras: alfabeto('ASL') }).letra).toBeUndefined()
  })
})

describe('pista: la letra más cercana', () => {
  it('reconoce la letra cuando la mano está bien hecha', () => {
    const letras = alfabeto('LSM')
    const b = letras.find((l) => l.letra === 'B')!
    const pista = letraMasCercana(manoSintetica(b.forma), letras)
    expect(pista?.consejos).toEqual([])
  })
})
