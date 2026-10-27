/*
 * PANTALLA: MI IA — todo lo que la inteligencia artificial aprendió del usuario
 *   1. Resumen: dominio del alfabeto, precisión de su red y de su autocorrector.
 *   2. Modelo del estudiante: qué tanto domina cada letra (colores) y qué le recomienda practicar.
 *   3. Tus señas personales: las letras que la IA recuerda «a tu manera».
 *   4. Red neuronal convolucional: sus capas, entrenarla (curva en vivo) y el laboratorio
 *      (verla pensar con la cámara y enseñarle tu mano).
 *   5. Autocorrector: palabras que aprendió, cuántas correcciones aceptaste y un probador.
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, GraduationCap, Hand, Network, RotateCcw, Sparkles, SpellCheck, Trash2, Zap } from 'lucide-react'
// ▸ Desde React:
import { useMemo, useState, type ReactNode } from 'react'
// ▸ Desde React Router:
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { Boton } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useConfiguracion } from '../../hooks/useConfiguracion'
import { useModeloIA } from '../../hooks/useModeloIA'
import { clasesDe } from '../../lib/ia/cnn/datos'
import { corregir, formasDe, vocabularioCon } from '../../lib/ia/corrector'
import { dominioEfectivo, nivelLetra, UMBRAL_DOMINIO } from '../../lib/ia/dominio'
import { precisionCorrector, totalMuestras } from '../../lib/ia/modeloIA'
import { VOCABULARIO } from '../../lib/ia/vocabulario'
import { useApp } from '../../context/AppContext'
import { CurvaEntrenamiento, DiagramaRed } from './GraficasRed'
import { LaboratorioRed } from './LaboratorioRed'
import { SenasPersonales } from './SenasPersonales'

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)} %`)

function Tarjeta({ titulo, icono: Icono, children, acciones }: { titulo: string; icono: typeof Brain; children: ReactNode; acciones?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-xl font-bold">
          <span className="grid size-10 place-items-center rounded-xl bg-marca-100 text-marca-800">
            <Icono className="size-5" aria-hidden />
          </span>
          {titulo}
        </h2>
        {acciones}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function MiIA() {
  const { lengua: lenguaApp } = useApp()
  const lengua = lenguaApp ?? 'LSM'
  const ia = useModeloIA()
  const { config, cambiar } = useConfiguracion()
  const { modelo, letras, entrenamiento } = ia
  const red = modelo.red
  const precisionCorr = precisionCorrector(modelo)

  // Probador del autocorrector.
  const [prueba, setPrueba] = useState('HOLS')
  const vocabulario = useMemo(() => vocabularioCon(VOCABULARIO[lengua], modelo.corrector.palabras), [lengua, modelo.corrector.palabras])
  const formas = useMemo(() => formasDe(letras), [letras])
  const resultadoPrueba = prueba.trim() ? corregir(prueba.trim().toUpperCase(), vocabulario, formas) : null
  const palabrasAprendidas = Object.entries(modelo.corrector.palabras).sort((a, b) => b[1] - a[1])

  return (
    <>
      <EncabezadoPagina titulo="Mi IA" descripcion="Así aprende de ti la inteligencia artificial de la app." icono={Brain} />

      {/* 1. Resumen */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 rounded-3xl bg-linear-to-br from-marca-700 to-marca-900 p-5 text-white shadow-lg sm:grid-cols-3 sm:p-7"
      >
        {[
          { titulo: 'Dominio del alfabeto', valor: pct(ia.dominioPromedio), detalle: 'según el modelo del estudiante', icono: GraduationCap },
          { titulo: 'Precisión de tu red', valor: red ? pct(red.precision) : 'Sin entrenar', detalle: `${totalMuestras(modelo)} posturas de tu mano`, icono: Network },
          {
            titulo: 'Acierto del autocorrector',
            valor: pct(precisionCorr),
            detalle: `${modelo.corrector.aplicadas} correcciones · ${modelo.corrector.deshechas} deshechas`,
            icono: SpellCheck,
          },
        ].map((t) => (
          <div key={t.titulo} className="rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 text-sm opacity-90">
              <t.icono className="size-4" aria-hidden /> {t.titulo}
            </p>
            <p className="mt-1 text-3xl font-bold">{t.valor}</p>
            <p className="text-sm opacity-80">{t.detalle}</p>
          </div>
        ))}
      </motion.section>

      <div className="mt-6 space-y-6">
        {/* 2. Modelo del estudiante */}
        <Tarjeta
          titulo="Lo que la IA sabe de ti"
          icono={GraduationCap}
          acciones={
            <Boton variante="fantasma" onClick={ia.reiniciarDominio}>
              <RotateCcw className="size-5" aria-hidden /> Reiniciar
            </Boton>
          }
        >
          <p className="text-stone-600">
            Cada vez que practicas o juegas, la IA calcula la probabilidad de que ya domines cada letra (Bayesian Knowledge Tracing). Si dejas
            de practicar una letra, supone que la vas olvidando poco a poco.
          </p>
          <ul className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-9 lg:grid-cols-14">
            {letras.map((l) => {
              const e = modelo.dominio[l.letra]
              const v = dominioEfectivo(e)
              const nivel = nivelLetra(e)
              return (
                <li key={l.letra}>
                  <Link
                    to={`/aprender/${encodeURIComponent(l.letra)}`}
                    title={e ? `${Math.round(v * 100)} % · ${e.aciertos} de ${e.intentos} aciertos` : 'Sin intentos'}
                    className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border-2 border-stone-200 font-bold"
                  >
                    {/* Relleno de abajo hacia arriba según el dominio */}
                    <motion.span
                      className={`absolute inset-x-0 bottom-0 ${nivel === 'dominada' ? 'bg-marca-500' : 'bg-marca-200'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${v * 100}%` }}
                      transition={{ duration: 0.8 }}
                      aria-hidden
                    />
                    <span className="relative text-lg">{l.letra}</span>
                    {nivel === 'repasar' && <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500" aria-label="Para repasar" />}
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-sm text-stone-500">
            Lleno = dominada (≥ {UMBRAL_DOMINIO * 100} %). Punto ámbar = la dominabas pero hace mucho no la practicas.
          </p>

          <h3 className="mt-6 font-bold">Te recomiendo practicar</h3>
          {ia.recomendaciones.length === 0 ? (
            <p className="mt-2 text-stone-600">¡Dominas todo el alfabeto!</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ia.recomendaciones.map((r) => (
                <li key={r.letra}>
                  <Link to={`/aprender/${encodeURIComponent(r.letra)}`} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 hover:border-marca-300 hover:bg-marca-50">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-100 text-xl font-bold text-marca-800">{r.letra}</span>
                    <span className="text-stone-700">{r.motivo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* 3. Tus señas personales */}
        <Tarjeta titulo="Tus señas personales" icono={Hand}>
          <p className="mb-4 text-stone-600">
            Si haces una letra a tu manera (por ejemplo, porque te cuesta doblar los dedos como en el dibujo), la IA la recuerda y desde
            entonces la acepta en la práctica, los juegos y el traductor. Para no confundirla, tu forma solo cuenta si se parece más a tu
            letra que a cualquier otra.
          </p>
          <SenasPersonales />
        </Tarjeta>

        {/* 4. Red neuronal convolucional */}
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
            La red mira una imagen de 28×28 con el esqueleto de tu mano y decide qué forma es. Empieza aprendiendo con manos generadas por
            computadora y luego se adapta a tu mano con las posturas que guardas al practicar, jugar o enseñarle aquí. Está escrita desde cero
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
                <p className="mt-2 rounded-2xl bg-stone-50 p-4 text-stone-600">Todavía no la entrenas. Presiona «Entrenar mi red» (tarda unos segundos).</p>
              )}
              {ia.errorEntrenamiento && <p className="mt-2 text-sm text-red-700">{ia.errorEntrenamiento}</p>}
            </div>
            <dl className="grid grid-cols-2 content-start gap-3">
              {[
                ['Precisión', red ? pct(red.precision) : '—'],
                ['Pesos que aprende', red ? red.parametros.toLocaleString('es-MX') : '—'],
                ['Formas que distingue', String(red?.clases.length ?? '—')],
                ['Tus posturas usadas', String(red?.muestrasUsadas ?? 0)],
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

          <h3 className="mt-6 mb-3 font-bold">Laboratorio: mira cómo piensa y enséñale</h3>
          <LaboratorioRed />

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-stone-100 pt-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="size-5 accent-marca-700" checked={config.usarRedNeuronal} onChange={(e) => cambiar({ usarRedNeuronal: e.target.checked })} />
              Usar mi red en los traductores
            </label>
            <Boton variante="fantasma" onClick={() => ia.borrarMuestras()} disabled={!totalMuestras(modelo)}>
              <Trash2 className="size-5" aria-hidden /> Borrar mis posturas
            </Boton>
          </div>
        </Tarjeta>

        {/* 5. Autocorrector */}
        <Tarjeta
          titulo="Autocorrector que aprende"
          icono={Sparkles}
          acciones={
            <Boton variante="fantasma" onClick={ia.olvidarPalabras} disabled={!palabrasAprendidas.length && !modelo.corrector.aplicadas}>
              <Trash2 className="size-5" aria-hidden /> Olvidar
            </Boton>
          }
        >
          <p className="text-stone-600">
            Al terminar cada palabra deletreada, busca la palabra conocida más cercana. Sabe que la cámara confunde letras de forma parecida
            (como U y V), así que esos errores le «cuestan» menos. Si deshaces una corrección, aprende que tu palabra es válida.
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-marca-50/60 p-4">
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
            <div>
              <h3 className="font-bold">Tus palabras ({palabrasAprendidas.length})</h3>
              {palabrasAprendidas.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {palabrasAprendidas.slice(0, 30).map(([w, n]) => (
                    <li key={w} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold">
                      {w} <span className="font-normal text-stone-500">×{n}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-stone-600">Aún no aprende palabras tuyas: deletrea en el traductor.</p>
              )}
              <label className="mt-4 flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-5 accent-marca-700" checked={config.autocorreccion} onChange={(e) => cambiar({ autocorreccion: e.target.checked })} />
                Corregir solas las palabras (si no, solo sugiere)
              </label>
            </div>
          </div>
        </Tarjeta>
      </div>
    </>
  )
}
