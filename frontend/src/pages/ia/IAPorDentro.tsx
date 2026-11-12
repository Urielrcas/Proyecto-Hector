/*
 * PANTALLA: IA POR DENTRO (solo administradores)
 * Lo técnico de la inteligencia artificial, para quien quiera ver cómo funciona:
 *   1. Red neuronal convolucional: sus capas, entrenarla (curva en vivo) y el laboratorio
 *      (ver lo que recibe y lo que detecta cada filtro).
 *   2. Árbol de decisión: el modelo de machine learning entrenado en Python y su examen.
 *      Validación y comparación de algoritmos (prácticas 04 y 05): profundidad, Random Forest, KNN.
 *   3. Autocorrector: cómo decide y un probador.
 * El usuario normal ve la versión sencilla en «Mi IA».
 */

// ▸ Desde Lucide (íconos):
import { Cpu, GitBranch, Network, Scale, Sparkles, Zap } from 'lucide-react'
// ▸ Desde React:
import { useMemo, useState } from 'react'
// ▸ Desde nuestro proyecto:
import { Boton } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useApp } from '../../context/AppContext'
import { useModeloIA } from '../../hooks/useModeloIA'
import { clasesDe } from '../../lib/ia/cnn/datos'
import { corregir, formasDe, vocabularioCon } from '../../lib/ia/corrector'
import { totalMuestras } from '../../lib/ia/modeloIA'
import { VOCABULARIO } from '../../lib/ia/vocabulario'
import { ArbolDecision } from './ArbolDecision'
import { CurvaEntrenamiento, DiagramaRed } from './GraficasRed'
import { LaboratorioRed } from './LaboratorioRed'
import { pct, Tarjeta } from './Tarjeta'
import { ValidacionModelos } from './ValidacionModelos'

export default function IAPorDentro() {
  const { lengua: lenguaApp } = useApp()
  const lengua = lenguaApp ?? 'LSM'
  const ia = useModeloIA()
  const { modelo, letras, entrenamiento } = ia
  const red = modelo.red

  // Probador del autocorrector.
  const [prueba, setPrueba] = useState('HOLS')
  const vocabulario = useMemo(() => vocabularioCon(VOCABULARIO[lengua], modelo.corrector.palabras), [lengua, modelo.corrector.palabras])
  const formas = useMemo(() => formasDe(letras), [letras])
  const resultadoPrueba = prueba.trim() ? corregir(prueba.trim().toUpperCase(), vocabulario, formas) : null

  return (
    <>
      <EncabezadoPagina titulo="IA por dentro" descripcion="Cómo funcionan los modelos de inteligencia artificial de la app." icono={Cpu} />

      <div className="space-y-6">
        {/* 1. Red neuronal convolucional */}
        <Tarjeta
          titulo="Red neuronal convolucional"
          icono={Network}
          acciones={
            <div className="flex flex-wrap gap-2">
              <Boton onClick={() => ia.entrenar()} disabled={!!entrenamiento}>
                <Zap className="size-5" aria-hidden />
                {entrenamiento ? 'Entrenando…' : red ? 'Reentrenar con mis muestras' : 'Entrenar mi red'}
              </Boton>
              {red && (
                <Boton variante="secundario" onClick={() => ia.entrenar(true)} disabled={!!entrenamiento}>
                  Desde cero
                </Boton>
              )}
            </div>
          }
        >
          <p className="text-stone-600">
            La red mira una imagen de 28×28 con el esqueleto de la mano y decide qué forma es. Empieza aprendiendo con manos generadas por
            computadora y luego se adapta a cada usuario con las posturas que guarda al practicar, jugar o enseñarle. Está escrita desde cero
            en el proyecto (sin librerías de IA) y entrena en segundo plano.
          </p>

          <div className="mt-5 overflow-x-auto pb-2">
            <DiagramaRed clases={red?.clases.length ?? clasesDe(letras).length} activa={!!entrenamiento} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
            <div>
              <h3 className="font-bold">{entrenamiento ? 'Aprendiendo ahora…' : 'Cómo aprendió'}</h3>
              {entrenamiento || red ? (
                <CurvaEntrenamiento historia={entrenamiento?.progreso ?? red?.historia ?? []} epocas={entrenamiento?.epocas ?? red?.historia.length ?? 8} />
              ) : (
                <p className="mt-2 rounded-2xl bg-stone-50 p-4 text-stone-600">Todavía no está entrenada. Presiona «Entrenar mi red» (tarda unos segundos).</p>
              )}
              {ia.errorEntrenamiento && <p className="mt-2 text-sm text-red-700">{ia.errorEntrenamiento}</p>}
            </div>
            <dl className="grid grid-cols-2 content-start gap-3">
              {[
                ['Precisión', red ? pct(red.precision) : '—'],
                ['Pesos que aprende', red ? red.parametros.toLocaleString('es-MX') : '—'],
                ['Formas que distingue', String(red?.clases.length ?? '—')],
                ['Posturas usadas', String(red?.muestrasUsadas ?? 0)],
                ['Último entrenamiento', red ? new Date(red.entrenadaEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'],
                ['Posturas guardadas', String(totalMuestras(modelo))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-stone-50 p-3">
                  <dt className="text-sm text-stone-600">{k}</dt>
                  <dd className="text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <h3 className="mt-6 mb-3 font-bold">Laboratorio: mira cómo piensa</h3>
          <LaboratorioRed tecnico />
        </Tarjeta>

        {/* 2. Árbol de decisión (machine learning) */}
        <Tarjeta titulo="Árbol de decisión (machine learning)" icono={GitBranch}>
          <ArbolDecision />
        </Tarjeta>

        {/* 2b. Validación y comparación de algoritmos (prácticas 04 y 05) */}
        <Tarjeta titulo="Validación y comparación de algoritmos" icono={Scale}>
          <ValidacionModelos />
        </Tarjeta>

        {/* 3. Autocorrector */}
        <Tarjeta titulo="Autocorrector" icono={Sparkles}>
          <p className="text-stone-600">
            Al terminar cada palabra deletreada, busca la palabra conocida más cercana. Sabe que la cámara confunde letras de forma parecida
            (como U y V), así que esos errores le «cuestan» menos. Si el usuario deshace una corrección, aprende que su palabra es válida.
          </p>
          <div className="mt-4 rounded-2xl bg-marca-50/60 p-4">
            <label htmlFor="probar-corrector" className="font-bold">
              Pruébalo: escribe una palabra mal deletreada
            </label>
            <input
              id="probar-corrector"
              value={prueba}
              onChange={(e) => setPrueba(e.target.value.toUpperCase())}
              maxLength={20}
              className="mt-2 min-h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-4 font-mono text-xl tracking-widest uppercase focus:border-marca-600 focus:outline-none"
            />
            <p className="mt-3 text-lg" aria-live="polite">
              {!prueba.trim() ? (
                ' '
              ) : !resultadoPrueba ? (
                vocabulario.has(prueba.trim()) ? (
                  <span>✓ «{prueba.trim()}» ya es una palabra conocida.</span>
                ) : (
                  <span className="text-stone-600">No encontré una palabra cercana: la dejaría igual.</span>
                )
              ) : (
                <span>
                  {resultadoPrueba.automatica ? 'La corregiría sola a ' : 'Te sugeriría '}
                  <strong className="text-marca-800">{resultadoPrueba.sugerida}</strong>
                  <span className="text-sm text-stone-600"> (distancia {resultadoPrueba.distancia.toFixed(2)})</span>
                  {resultadoPrueba.alternativas.length > 0 && <span className="text-sm text-stone-600"> · otras: {resultadoPrueba.alternativas.join(', ')}</span>}
                </span>
              )}
            </p>
          </div>
        </Tarjeta>
      </div>
    </>
  )
}
