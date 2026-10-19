/*
 * PRUEBAS DEL RECONOCEDOR DE DELETREO (traductor Señas → Texto)
 * Se simulan cuadros de cámara a 30 por segundo con manos sintéticas (manoSintetica.ts)
 * y se revisa qué texto se va formando.
 */

// ▸ Desde Vitest (herramienta de pruebas automáticas):
//     describe → agrupa varias pruebas
//     expect → comprueba que un valor sea el esperado
//     it → una prueba
import { describe, expect, it } from 'vitest'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     alfabeto → letras de LSM o ASL con su forma
import { alfabeto } from '../aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../tipos'
// ▸ Desde nuestro proyecto: src/lib/vision/manoSintetica.ts:
//     manoSintetica → genera los 21 puntos de una mano con la forma pedida
//     mover → desplaza una mano (para simular movimiento)
import { manoSintetica, mover } from './manoSintetica'
// ▸ Desde nuestro proyecto: src/lib/vision/reconocedor.ts:
//     MS_ESPACIO → tiempo sin mano para cerrar la palabra
//     ReconocedorDeletreo → el reconocedor que se prueba
import { MS_ESPACIO, ReconocedorDeletreo } from './reconocedor'

const DT = 33 // ms entre cuadros (≈ 30 por segundo)
const P = 0.3 // tamaño aproximado de la palma en las manos sintéticas

/** Simula una sesión y devuelve el texto que se forma. */
class Sesion {
  rec: ReconocedorDeletreo
  t = 0
  texto = ''
  forma: Record<string, ReturnType<typeof manoSintetica>>

  constructor(lengua: Lengua) {
    this.rec = new ReconocedorDeletreo(lengua)
    this.forma = Object.fromEntries(alfabeto(lengua).map((l) => [l.letra, manoSintetica(l.forma)]))
  }

  cuadro(puntos: ReturnType<typeof manoSintetica> | null) {
    const e = this.rec.procesar(puntos, this.t)
    this.t += DT
    if (e.letraNueva) this.texto += e.letraNueva
    if (e.espacio) this.texto += ' '
    return e
  }

  /** Sostiene una letra quieta durante `ms` milisegundos. */
  sostener(letra: string, ms = 700) {
    for (let i = 0; i < ms / DT; i++) this.cuadro(this.forma[letra])
  }

  sinMano(ms: number) {
    for (let i = 0; i < ms / DT; i++) this.cuadro(null)
  }

  /** Hace la forma de una letra recorriendo una trayectoria (lista de [dx, dy]). */
  trazar(letra: string, trayectoria: [number, number][], cuadrosPorTramo = 8) {
    for (let i = 0; i < trayectoria.length - 1; i++) {
      const [x1, y1] = trayectoria[i]
      const [x2, y2] = trayectoria[i + 1]
      for (let k = 0; k < cuadrosPorTramo; k++) {
        const f = k / cuadrosPorTramo
        this.cuadro(mover(this.forma[letra], x1 + (x2 - x1) * f, y1 + (y2 - y1) * f))
      }
    }
  }
}

describe('ReconocedorDeletreo', () => {
  it('reconoce una letra sostenida una sola vez, aunque se siga sosteniendo', () => {
    const s = new Sesion('LSM')
    s.sostener('L', 2000)
    expect(s.texto).toBe('L')
  })

  it('deletrea HOLA y cierra la palabra cuando la mano desaparece', () => {
    const s = new Sesion('LSM')
    for (const letra of 'HOLA') s.sostener(letra)
    s.sinMano(MS_ESPACIO + 200)
    expect(s.texto).toBe('HOLA ')
  })

  it('no agrega espacios de más si la mano sigue sin aparecer', () => {
    const s = new Sesion('LSM')
    s.sostener('A')
    s.sinMano(MS_ESPACIO * 3)
    expect(s.texto).toBe('A ')
    s.sinMano(MS_ESPACIO) // sin letras nuevas, no hay otra palabra que cerrar
    expect(s.texto).toBe('A ')
  })

  it('repite una letra si se baja la mano un momento entre las dos (CALLE)', () => {
    const s = new Sesion('LSM')
    for (const letra of 'CAL') s.sostener(letra)
    s.sinMano(300) // menos que MS_ESPACIO: no termina la palabra
    for (const letra of 'LE') s.sostener(letra)
    expect(s.texto).toBe('CALLE')
  })

  it('J: con movimiento se reconoce J y no I', () => {
    const s = new Sesion('LSM')
    s.sostener('I', 200) // forma la I y enseguida dibuja la J
    s.trazar('I', [[0, 0], [0, 0.5 * P], [-0.25 * P, 0.55 * P]])
    expect(s.texto).toBe('J')
  })

  it('I: la misma forma sostenida quieta un segundo es I', () => {
    const s = new Sesion('LSM')
    s.sostener('I', 1300)
    expect(s.texto).toBe('I')
  })

  it('mientras la mano se mueve no acepta la letra estática', () => {
    const s = new Sesion('LSM')
    // Mano en forma de L moviéndose de un lado a otro: no está quieta.
    s.trazar('L', [[0, 0], [0.3 * P, 0], [0, 0], [0.3 * P, 0], [0, 0], [0.3 * P, 0]], 6)
    expect(s.texto).toBe('')
  })

  it('informa la candidata, la confianza y el aviso', () => {
    const s = new Sesion('LSM')
    expect(s.cuadro(null).aviso).toBe('sin-mano')
    const e = s.cuadro(s.forma.L)
    expect(e.candidata?.letra).toBe('L')
    expect(e.confianza).toBeGreaterThan(0)
    expect(e.aviso).toBe('mantener')
    // Con la forma de la I se avisa que también podría ser J.
    const s2 = new Sesion('LSM')
    expect(s2.cuadro(s2.forma.I).gemelaConMovimiento?.letra).toBe('J')
  })

  it('funciona también con ASL', () => {
    const s = new Sesion('ASL')
    for (const letra of 'HI') s.sostener(letra, letra === 'I' ? 1300 : 700)
    expect(s.texto).toBe('HI')
  })
})
