/*
 * PANTALLA: MI IA — lo que la inteligencia artificial aprendió del usuario, en palabras sencillas
 *   1. Resumen: letras que domina, qué tan bien lo conoce la IA y palabras que aprendió.
 *   2. Lo que sabe de ti: qué tanto domina cada letra (colores) y qué le recomienda practicar.
 *   3. Enséñale tu mano: la cámara, «Aprender de mí» y lo que cree que estás haciendo.
 *   4. Tus señas personales: las letras que la IA recuerda «a tu manera».
 *   5. Tus palabras: las que aprendió el autocorrector.
 * Lo técnico (capas de la red, gráficas, árbol de decisión) está en «IA por dentro», solo para administradores.
 */

// ▸ Desde Framer Motion (animaciones):
import { motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Brain, Cpu, GraduationCap, Hand, Heart, RotateCcw, Sparkles, SpellCheck, Trash2, Zap } from 'lucide-react'
// ▸ Desde React Router:
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto:
import { Boton, BotonEnlace } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useApp } from '../../context/AppContext'
import { useConfiguracion } from '../../hooks/useConfiguracion'
import { useModeloIA } from '../../hooks/useModeloIA'
import { dominioEfectivo, nivelLetra } from '../../lib/ia/dominio'
import { totalMuestras } from '../../lib/ia/modeloIA'
import { IA_POR_DENTRO } from '../../lib/navegacion'
import { LaboratorioRed } from './LaboratorioRed'
import { SenasPersonales } from './SenasPersonales'
import { pct, Tarjeta } from './Tarjeta'

/** Frase corta según qué tan bien reconoce la mano del usuario. */
function queTanBien(precision: number | undefined): string {
  if (precision === undefined) return 'Todavía no conoce tu mano'
  if (precision >= 0.9) return 'Te reconoce casi siempre'
  if (precision >= 0.75) return 'Te reconoce la mayoría de las veces'
  return 'Todavía se equivoca seguido: enséñale más'
}

export default function MiIA() {
  const { esAdmin } = useApp()
  const ia = useModeloIA()
  const { config, cambiar } = useConfiguracion()
  const { modelo, letras, entrenamiento } = ia
  const red = modelo.red
  const posturas = totalMuestras(modelo)
  const dominadas = letras.filter((l) => nivelLetra(modelo.dominio[l.letra]) === 'dominada').length
  const palabrasAprendidas = Object.entries(modelo.corrector.palabras).sort((a, b) => b[1] - a[1])

  return (
    <>
      <EncabezadoPagina
        titulo="Mi IA"
        descripcion="Lo que la app ha aprendido de ti y cómo puedes enseñarle."
        icono={Brain}
        acciones={
          <div className="flex flex-wrap gap-2">
            <BotonEnlace to="/mi-ia/calibrar">
              <Hand className="size-5" aria-hidden /> Calibrar con mi mano
            </BotonEnlace>
            {esAdmin && (
              <BotonEnlace to={IA_POR_DENTRO.ruta} variante="secundario">
                <Cpu className="size-5" aria-hidden /> IA por dentro
              </BotonEnlace>
            )}
          </div>
        }
      />

      {/* 1. Resumen */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 rounded-3xl bg-linear-to-br from-marca-700 to-marca-900 p-5 text-white shadow-lg sm:grid-cols-3 sm:p-7"
      >
        {[
          { titulo: 'Letras que dominas', valor: `${dominadas} de ${letras.length}`, detalle: 'según lo que has practicado', icono: GraduationCap },
          { titulo: 'Qué tan bien te conoce', valor: red ? pct(red.precision) : '—', detalle: queTanBien(red?.precision), icono: Heart },
          { titulo: 'Palabras que aprendió', valor: String(palabrasAprendidas.length), detalle: 'de lo que deletreas', icono: SpellCheck },
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
        {/* 2. Lo que sabe de ti */}
        <Tarjeta
          titulo="Lo que sabe de ti"
          icono={GraduationCap}
          acciones={
            <Boton variante="fantasma" onClick={ia.reiniciarDominio}>
              <RotateCcw className="size-5" aria-hidden /> Reiniciar
            </Boton>
          }
        >
          <p className="text-stone-600">Cada vez que practicas o juegas, la app anota qué letras ya te salen bien y cuáles te cuestan.</p>
          <ul className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-9 lg:grid-cols-14">
            {letras.map((l) => {
              const e = modelo.dominio[l.letra]
              const v = dominioEfectivo(e)
              const nivel = nivelLetra(e)
              return (
                <li key={l.letra}>
                  <Link
                    to={`/aprender/${encodeURIComponent(l.letra)}`}
                    title={e ? `${e.aciertos} de ${e.intentos} bien` : 'Aún no la practicas'}
                    className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border-2 border-stone-200 font-bold"
                  >
                    {/* Relleno de abajo hacia arriba según qué tan bien la domina */}
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
          <p className="mt-2 text-sm text-stone-500">Lleno = ya te sale. Punto ámbar = hace mucho que no la practicas.</p>

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

        {/* 3. Enséñale tu mano */}
        <Tarjeta
          titulo="Enséñale tu mano"
          icono={Hand}
          acciones={
            <Boton onClick={() => ia.entrenar()} disabled={!!entrenamiento}>
              <Zap className="size-5" aria-hidden />
              {entrenamiento ? 'Aprendiendo…' : 'Aprender de mí'}
            </Boton>
          }
        >
          <p className="text-stone-600">
            Cada mano es distinta. Mientras más señas le enseñes, mejor reconoce las tuyas. También aprende sola de lo que practicas y juegas.
          </p>

          <div className="mt-4 rounded-2xl bg-stone-50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{entrenamiento ? 'Aprendiendo de tu mano…' : queTanBien(red?.precision)}</p>
              <p className="text-sm text-stone-600">Le has enseñado {posturas} {posturas === 1 ? 'seña' : 'señas'}</p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200">
              <motion.div
                className="h-full rounded-full bg-marca-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((red?.precision ?? 0) * 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            {ia.errorEntrenamiento && <p className="mt-2 text-sm text-red-700">{ia.errorEntrenamiento}</p>}
          </div>

          <div className="mt-5">
            <LaboratorioRed />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-stone-100 pt-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="size-5 accent-marca-700" checked={config.usarRedNeuronal} onChange={(e) => cambiar({ usarRedNeuronal: e.target.checked })} />
              Usar lo que aprendió de mí en el traductor
            </label>
            <Boton variante="fantasma" onClick={() => ia.borrarMuestras()} disabled={!posturas}>
              <Trash2 className="size-5" aria-hidden /> Olvidar mis señas
            </Boton>
          </div>
        </Tarjeta>

        {/* 4. Tus señas personales */}
        <Tarjeta titulo="Tus señas personales" icono={Sparkles}>
          <p className="mb-4 text-stone-600">
            Si haces una letra a tu manera (por ejemplo, porque te cuesta doblar los dedos como en el dibujo), la app la recuerda y desde
            entonces te la acepta en la práctica, los juegos y el traductor.
          </p>
          <SenasPersonales />
        </Tarjeta>

        {/* 5. Tus palabras (autocorrector) */}
        <Tarjeta
          titulo="Tus palabras"
          icono={SpellCheck}
          acciones={
            <Boton variante="fantasma" onClick={ia.olvidarPalabras} disabled={!palabrasAprendidas.length && !modelo.corrector.aplicadas}>
              <Trash2 className="size-5" aria-hidden /> Olvidar
            </Boton>
          }
        >
          <p className="text-stone-600">
            Si al deletrear se le escapa una letra, la app corrige la palabra. Y si deshaces una corrección, aprende que tu palabra era la buena.
          </p>
          {palabrasAprendidas.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {palabrasAprendidas.slice(0, 30).map(([w, n]) => (
                <li key={w} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold">
                  {w} <span className="font-normal text-stone-500">×{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-stone-50 p-4 text-stone-600">Aún no aprende palabras tuyas: deletrea en el traductor.</p>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-5 accent-marca-700" checked={config.autocorreccion} onChange={(e) => cambiar({ autocorreccion: e.target.checked })} />
            Corregir solas las palabras (si no, solo sugiere)
          </label>
        </Tarjeta>
      </div>
    </>
  )
}
