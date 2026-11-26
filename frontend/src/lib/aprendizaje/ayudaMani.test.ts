import { describe, expect, it } from 'vitest'
import type { Expediente, LetraExpediente } from '../../services/intentos'
import { alfabeto } from './alfabeto'
import { globosDeAyuda } from './ayudaMani'

const LSM = alfabeto('LSM')
const E = LSM.find((l) => l.letra === 'E')!

function expediente(letra: Partial<LetraExpediente>, recomendaciones: Expediente['recomendaciones'] = []): Expediente {
  return {
    usuario_id: '1', nombre: 'Ana', lengua: 'LSM',
    resumen: { intentos: 0, aciertos: 0, tasa: 0, puntaje_promedio: 0, letras_practicadas: 1, letras_logradas: 0, total_letras: 27, dias_practicados: 1, ultima_practica: null },
    letras: [{
      letra: 'E', intentos: 20, aciertos: 0, tasa: 0, puntaje_promedio: 50, ultimo_puntaje: 60, lograda: false, estado: 'difícil', tendencia: 'estable',
      confundida_con: [], dedo_mas_fallado: 'pulgar', fallidos: 20, dedos_fallados: [{ dedo: 'pulgar', veces: 16, porcentaje: 0.8 }], ultima_vez: null, prediccion: null,
      ...letra,
    }],
    recomendaciones,
    siguiente: null,
    perfil: null,
    vecinos: null,
  }
}

describe('globos de ayuda de Mani', () => {
  it('empieza con el resumen de fallos y sigue con un consejo por globo', () => {
    const g = globosDeAyuda(E, expediente({}), LSM)
    expect(g[0].texto).toBe('Llevas 20 intentos fallidos con la E. En el 80 % de ellos falló tu pulgar.')
    expect(g[1].texto).toMatch(/^Te aconsejo: /)
  })

  it('no repite los consejos de «difícil» del motor si ya hay consejo por dedos, y cierra con la predicción', () => {
    const g = globosDeAyuda(
      E,
      expediente({ prediccion: { puntaje: 77, mensaje: 'Vas por buen camino' } }, [
        { tipo: 'dificil', prioridad: 1, letra: 'E', mensaje: 'Te cuesta la E' },
        { tipo: 'repaso', prioridad: 4, letra: 'E', mensaje: 'Repasa la E' },
      ]),
      LSM,
    )
    const textos = g.map((x) => x.texto)
    expect(textos).not.toContain('Te cuesta la E')
    expect(textos).toContain('Repasa la E')
    expect(g.at(-1)).toEqual({ texto: 'Vas por buen camino', animo: 'feliz' })
  })

  it('sin nada de esta letra da el consejo más importante de otra', () => {
    const g = globosDeAyuda(E, expediente({ fallidos: 0, dedos_fallados: [] }, [{ tipo: 'dificil', prioridad: 1, letra: 'S', mensaje: 'Te cuesta la S' }]), LSM)
    expect(g).toEqual([{ texto: 'Te cuesta la S', animo: 'atento', letra: 'S' }])
  })

  it('cuenta cuántas personas que aprenden como tú también batallaron con la letra (KNN)', () => {
    const exp = expediente({})
    exp.vecinos = { k: 60, poblacion: 600, origen: 'simulada', parecido: 80, faciles: [], dificiles: [], por_debajo: [], por_letra: { E: { nivel_vecinos: 52, vecinos_con_dato: 40, les_costo: 23 } } }
    const g = globosDeAyuda(E, exp, LSM)
    expect(g.some((x) => x.texto.startsWith('No eres el único: a 23 de 40 personas que aprenden como tú'))).toBe(true)
  })
})
