/**
 * RESULTADOS DE LAS PRÁCTICAS 20 A 27 (los escribe Python en practicas.json, ver ml/app_json.py)
 *   - spark / mongo: datos masivos (p20, p21 y p22)
 *   - preparacion / entrenamiento / comparacion: la red CNN 1D (p23, p24 y p25)
 *   - prediccionDatos / prediccion: predicción del siguiente intento (p26 y p27)
 * La app los muestra en «IA por dentro».
 */
import practicasJson from './practicas.json'

type Metricas = { exactitud: number; precision: number; recall: number; f1: number }
type Regresion = { mae: number; rmse: number; r2: number }

// «as unknown as»: el JSON lo escribe Python; aquí solo le decimos a TypeScript su forma.
export const PRACTICAS = practicasJson as unknown as {
  spark: {
    fecha: string
    leidas: number
    rechazadas: Record<string, number>
    duplicadas: number
    finales: number
    letras: number
    nucleos: number
    segundos: number
    pesoCsvMB: number
    pesoParquetMB: number
    porGiro: { tramo: string; manos: number; reglas: number }[]
    porLetra: { letra: string; manos: number; estirados: number; pulgar: number; reglas: number }[]
  }
  mongo: { fecha: string; coleccion: string; documentos: number; nuevas: number; actualizadas: number; particiones: number; lote: number; segundos: number }
  preparacion: { manos: { entrenamiento: number; deP03: number; masivas: number; validacion: number; prueba: number }; forma: [number, number]; canales: string[]; clases: number }
  entrenamiento: {
    fecha: string
    dispositivo: string
    parametros: number
    epocas: number
    epocaMejor: number
    paciencia: number
    lote: number
    segundos: number
    historia: { epoca: number; perdida: number; exactitud: number; perdidaVal: number; exactitudVal: number }[]
    examen: Metricas
    confusiones: { real: string; dijo: string; veces: number }[]
  }
  comparacion: {
    modelos: Record<'cnn1d' | 'bosque', Metricas & { validacion: number; segundosEntrenar: number; msPorMano: number; parametros: number }>
    app: Record<'votacion' | 'arbol' | 'knn' | 'reglas', Metricas>
    porGiro: { tramo: string; manos: number; cnn1d: number; bosque: number }[]
    ganador: 'cnn1d' | 'bosque'
    superaApp: boolean
  }
  prediccionDatos: { intentos: number; personas: number; ejemplos: number; entrenamiento: number; validacion: number; prueba: number }
  prediccion: {
    fecha: string
    epocas: number
    segundos: number
    parametros: number
    historia: { epoca: number; perdida: number; perdidaVal: number }[]
    examen: Record<'cnn' | 'ultimo' | 'promedio', Regresion>
    ejemplos: { intento1: number; intento2: number; real: number; predicho: number }[]
  }
}
