/**
 * DATOS DE DEMOSTRACIÓN: 100 PERSONAS SIMULADAS (ml/demo_100_personas.py)
 *
 * La base real todavía tiene muy pocos intentos, y las gráficas «por personas» saldrían vacías.
 * Este archivo trae lo mismo que calcula el servidor con los datos reales, pero de 100 personas
 * simuladas. La app lo muestra SIEMPRE con la etiqueta «Demostración»: no son personas reales.
 *   - dominio     → Estadísticas: cuántas personas hay en cada nivel de cada letra
 *   - confusiones → IA por dentro → Señas parecidas: cuántas personas confunden cada letra
 */
import type { ConfusionesPersonas, DominioLetra } from '../../../services/intentos'
import demoJson from './demo_personas.json'

export const DEMO = demoJson as {
  fecha: string
  descripcion: string
  personas: number
  intentos: number
  dominio: DominioLetra[]
  confusiones: ConfusionesPersonas
}

export const ETIQUETA_DEMO = `Demostración (${DEMO.personas} personas simuladas)`
