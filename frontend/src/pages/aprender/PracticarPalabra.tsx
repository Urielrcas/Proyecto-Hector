/*
 * PANTALLA: UNA PALABRA (/aprender/palabras/ID)
 * Muestra cómo se hace la seña de una palabra (pasos del diccionario), los dibujos de las
 * formas de mano que usa (letras del alfabeto) y su fuente. Con la cámara se practica de dos formas:
 *   - «Haz la seña»: la cámara ve las dos manos y el cuerpo y revisa forma, lugar, otra mano y
 *     movimiento (lib/vision/senas.ts). Solo en las palabras que tienen su seña programada.
 *   - «Deletréala»: cada letra que haces se va marcando.
 */

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, CircleDashed, HandHelping, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CamaraManos } from '../../components/CamaraManos'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { LetrasQueSalen } from '../../components/LetrasQueSalen'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { Acompanante, type Animo } from '../../components/Mascota'
import { Confeti } from '../../components/juegos/Confeti'
import { useApp } from '../../context/AppContext'
import { mensajeDeletreo, useDeletreo } from '../../hooks/useDeletreo'
import { useIADeletreo } from '../../hooks/useIADeletreo'
import { useProgresoPalabras } from '../../hooks/useProgresoPalabras'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { avanceDeletreo, buscarPalabra, CATEGORIAS, deletreoDe, FUENTE_PALABRAS, palabrasDe, type Palabra } from '../../lib/aprendizaje/palabras'
import { sonidos } from '../../lib/juegos/sonidos'
import { vibrar } from '../../lib/tacto'
import type { Lengua } from '../../lib/tipos'
import type { Lugar } from '../../lib/vision/escena'
import { ReconocedorSena, tieneSena, type EstadoSena } from '../../lib/vision/senas'
import { hablar, hayVoz } from '../../lib/voz'

export default function PracticarPalabra() {
  const { id = '' } = useParams()
  const { lengua: lenguaElegida } = useApp()
  const encontrada = buscarPalabra(id)
  const lengua = lenguaElegida ?? 'LSM'

  if (!encontrada) return <Navigate to="/aprender/palabras" replace />
  // Si cambiaron la lengua en el menú, volver a la lista de esa lengua.
  if (encontrada.lengua !== lengua) return <Navigate to={`/aprender/palabras?tema=${encontrada.palabra.categoria}`} replace />
  return <Contenido key={id} palabra={encontrada.palabra} lengua={lengua} />
}

function Contenido({ palabra, lengua }: { palabra: Palabra; lengua: Lengua }) {
  const { practicadas, marcarVista } = useProgresoPalabras()
  const letras = useMemo(() => alfabeto(lengua), [lengua])
  const [practicando, setPracticando] = useState(false)
  const conSena = tieneSena(palabra.id)
  const [modo, setModo] = useState<'sena' | 'deletreo'>(conSena ? 'sena' : 'deletreo')

  useEffect(() => marcarVista(palabra.id), [palabra.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // La palabra anterior y la siguiente del mismo tema.
  const delTema = palabrasDe(lengua, palabra.categoria)
  const i = delTema.findIndex((p) => p.id === palabra.id)
  const anterior = delTema[i - 1]
  const siguiente = delTema[i + 1]

  const formas = palabra.letras.map((l) => letras.find((x) => x.letra === l)).filter((l) => !!l)
  const dicha = palabra.glosa ?? palabra.palabra
  const idiomaVoz = lengua === 'ASL' ? 'en-US' : 'es-MX'

  return (
    <>
      <EncabezadoPagina titulo={palabra.palabra} descripcion={`${CATEGORIAS[palabra.categoria].titulo} · ${lengua}`} volverA={`/aprender/palabras?tema=${palabra.categoria}`} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cómo se hace */}
        <section aria-labelledby="titulo-como" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="titulo-como" className="text-xl font-bold">
              Cómo se hace
            </h2>
            {palabra.glosa && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-bold text-stone-600">{palabra.glosa}</span>}
            {palabra.dosManos && (
              <span className="inline-flex items-center gap-1 rounded-full bg-marca-50 px-2.5 py-0.5 text-sm font-bold text-marca-800">
                <HandHelping className="size-4" aria-hidden /> Dos manos
              </span>
            )}
            {practicadas.includes(palabra.id) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-marca-600 px-2.5 py-0.5 text-sm font-bold text-white">
                <Check className="size-4" strokeWidth={3} aria-hidden /> Practicada
              </span>
            )}
          </div>

          <ol className="mt-4 space-y-3">
            {palabra.pasos.map((paso, n) => (
              <motion.li key={n} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: n * 0.08 }} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-marca-700 font-bold text-white">{n + 1}</span>
                <span className="pt-0.5 text-lg">{paso}</span>
              </motion.li>
            ))}
          </ol>

          {formas.length > 0 && (
            <>
              <h3 className="mt-6 font-bold">Formas de la mano que usa</h3>
              <ul className="mt-2 flex flex-wrap gap-3">
                {formas.map((l) => (
                  <li key={l.letra}>
                    <Link to={`/aprender/${encodeURIComponent(l.letra)}`} className="flex flex-col items-center rounded-2xl bg-marca-50/60 p-3 transition-colors hover:bg-marca-100">
                      <span className="grid size-24 place-items-center">
                        <ManoIlustrada forma={l.forma} etiqueta={`Dibujo de la letra ${l.letra}`} />
                      </span>
                      <span className="mt-1 text-sm font-bold text-marca-800">Letra {l.letra}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {hayVoz() && (
              <button
                onClick={() => hablar(dicha.toLowerCase(), idiomaVoz)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-4 font-bold text-stone-700 hover:border-marca-300"
              >
                <Volume2 className="size-5" aria-hidden /> Escuchar
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Fuente: {FUENTE_PALABRAS[lengua]}, pág. {palabra.pagina}
            {lengua === 'ASL' && ' del PDF'}.
          </p>
        </section>

        {/* Práctica con la cámara */}
        <section aria-labelledby="titulo-practica" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="titulo-practica" className="text-xl font-bold">
            Practica con la cámara
          </h2>
          {conSena && (
            <div role="tablist" aria-label="Cómo practicar" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1">
              {(['sena', 'deletreo'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={modo === m}
                  onClick={() => setModo(m)}
                  className={`min-h-10 rounded-lg text-sm font-bold transition-colors ${modo === m ? 'bg-white text-marca-800 shadow-sm' : 'text-stone-600'}`}
                >
                  {m === 'sena' ? 'Haz la seña' : 'Deletréala'}
                </button>
              ))}
            </div>
          )}
          {practicando ? (
            modo === 'sena' ? (
              <PracticaSena key="sena" palabra={palabra} lengua={lengua} />
            ) : (
              <Practica key="deletreo" palabra={palabra} lengua={lengua} />
            )
          ) : (
            <div className="mt-4 flex flex-col items-start gap-4">
              <Acompanante
                animo="hola"
                mensaje={
                  modo === 'sena'
                    ? `Haz la seña completa frente a la cámara${palabra.dosManos ? ', con las dos manos' : ''}. Colócate para que se vean tu cara y tus hombros.`
                    : `Deletrea «${deletreoDe(palabra, lengua)}» letra por letra para que se te quede.`
                }
                tamano="size-20"
              />
              <button
                onClick={() => setPracticando(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-marca-700 px-5 font-bold text-white shadow-sm hover:bg-marca-800"
              >
                <Camera className="size-5" aria-hidden /> Encender la cámara
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Anterior / siguiente del tema */}
      <nav aria-label="Otras palabras" className="mt-6 flex justify-between gap-3">
        {anterior ? (
          <Link to={`/aprender/palabras/${anterior.id}`} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-marca-800 hover:bg-marca-50">
            <ArrowLeft className="size-5" aria-hidden /> {anterior.palabra}
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link to={`/aprender/palabras/${siguiente.id}`} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-marca-800 hover:bg-marca-50">
            {siguiente.palabra} <ArrowRight className="size-5" aria-hidden />
          </Link>
        )}
      </nav>
    </>
  )
}

/** La cámara y las letras de la palabra, que se van marcando al deletrearlas. */
function Practica({ palabra, lengua }: { palabra: Palabra; lengua: Lengua }) {
  const ia = useIADeletreo()
  // Sin autocorrector: aquí se quiere ver exactamente lo que deletreas.
  const d = useDeletreo(lengua, { clasificar: ia.clasificar, memoria: ia.memoria })
  const { marcarPracticada } = useProgresoPalabras()
  const objetivo = deletreoDe(palabra, lengua)
  const letrasObjetivo = [...objetivo]
  const avance = avanceDeletreo(d.texto, objetivo)
  const total = objetivo.replace(/ /g, '').length
  const lograda = avance === total

  const celebrada = lograda

  // Al completarla: guardar, sonar y vibrar (una vez por intento).
  const yaCelebro = useRef(false)
  useEffect(() => {
    if (!lograda) {
      yaCelebro.current = false
      return
    }
    if (yaCelebro.current) return
    yaCelebro.current = true
    marcarPracticada(palabra.id)
    sonidos.victoria()
    vibrar('logro')
  }, [lograda, marcarPracticada, palabra.id])

  const mani: { animo: Animo; mensaje: string } = celebrada
    ? { animo: 'fiesta', mensaje: `¡Deletreaste «${objetivo}»!` }
    : avance > 0
      ? { animo: 'feliz', mensaje: `¡Bien! Sigue con la ${objetivo.replace(/ /g, '')[avance]}.` }
      : { animo: 'atento', mensaje: `Empieza con la ${objetivo[0]}. ${mensajeDeletreo(d.estado)}` }

  // Cuántas letras (sin espacios) hay antes de cada posición, para saber cuáles ya se hicieron.
  let contadas = 0

  return (
    <div className="mt-4 space-y-4">
      <Confeti disparo={celebrada ? d.texto.length : 0} />
      <div className="relative">
        <CamaraManos alDetectar={d.alDetectar} borde={d.resaltada || celebrada ? 'exito' : 'neutro'} />
        <LetrasQueSalen texto={d.texto} />
      </div>

      <ul className="flex flex-wrap justify-center gap-1.5" aria-label={`Letras de ${objetivo}`}>
        {letrasObjetivo.map((l, n) => {
          if (l === ' ') return <li key={n} className="w-3" aria-hidden />
          const hecha = contadas < avance
          const actual = contadas === avance
          contadas++
          return (
            <motion.li
              key={n}
              animate={hecha ? { scale: [1, 1.2, 1] } : {}}
              className={`grid size-11 place-items-center rounded-xl border-2 text-xl font-bold ${
                hecha ? 'border-marca-500 bg-marca-600 text-white' : actual ? 'border-marca-400 bg-white text-marca-800' : 'border-stone-200 bg-stone-50 text-stone-400'
              }`}
            >
              {l}
            </motion.li>
          )
        })}
      </ul>

      <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-16" />

      {celebrada && (
        <button
          onClick={d.limpiar}
          className="min-h-11 rounded-xl border-2 border-stone-200 bg-white px-4 font-bold text-stone-700 hover:border-marca-300"
        >
          Otra vez
        </button>
      )}
    </div>
  )
}

const PIEZAS: { clave: keyof EstadoSena['revision']; nombre: string }[] = [
  { clave: 'forma', nombre: 'Forma de la mano' },
  { clave: 'lugar', nombre: 'Lugar' },
  { clave: 'otra', nombre: 'Otra mano' },
  { clave: 'movimiento', nombre: 'Movimiento' },
]

/** «Haz la seña»: la cámara ve las dos manos y el cuerpo, y revisa cada pieza de la seña. */
function PracticaSena({ palabra, lengua }: { palabra: Palabra; lengua: Lengua }) {
  const { marcarPracticada } = useProgresoPalabras()
  const reconocedor = useRef<ReconocedorSena | null>(null)
  reconocedor.current ??= new ReconocedorSena(palabra.id, lengua)
  const lugarRef = useRef<Lugar | null>(null)
  const [estado, setEstado] = useState<EstadoSena | null>(null)
  const [veces, setVeces] = useState(0)
  const ultimaClave = useRef('')

  // En cada cuadro: revisar la seña. Solo se redibuja cuando cambia algo que se ve.
  const alVerEscena = (escena: Parameters<ReconocedorSena['procesar']>[0], tiempo: number) => {
    const e = reconocedor.current!.procesar(escena, tiempo)
    lugarRef.current = e.lugarObjetivo
    if (e.reconocida) {
      setVeces((n) => n + 1)
      marcarPracticada(palabra.id)
      sonidos.victoria()
      vibrar('logro')
    }
    const r = e.revision
    const clave = `${e.consejo}|${e.parte}|${r.forma}${r.lugar}${r.otra}${r.movimiento}|${e.reconocida}`
    if (clave !== ultimaClave.current) {
      ultimaClave.current = clave
      setEstado(e)
    }
  }

  const partes = estado?.partes ?? 1
  const tieneOtra = !!palabra.dosManos
  const mani: { animo: Animo; mensaje: string } =
    estado?.consejo === '¡Muy bien!' && veces > 0
      ? { animo: 'fiesta', mensaje: `¡Esa es «${palabra.palabra}»! ${veces > 1 ? `(${veces} veces)` : ''}` }
      : { animo: estado?.revision.forma ? 'feliz' : 'atento', mensaje: estado?.consejo ?? 'Preparando la cámara…' }

  return (
    <div className="mt-4 space-y-4">
      <Confeti disparo={veces} />
      <CamaraManos alDetectar={() => {}} borde={mani.animo === 'fiesta' ? 'exito' : 'neutro'} senas={{ alVerEscena, lugarRef }} />

      {partes > 1 && (
        <p className="text-sm font-bold text-stone-600">
          Parte {(estado?.parte ?? 0) + 1} de {partes}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2">
        {PIEZAS.filter((p) => p.clave !== 'otra' || tieneOtra).map((p) => {
          const ok = !!estado?.revision[p.clave]
          return (
            <li
              key={p.clave}
              className={`flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-2 text-sm font-bold transition-colors ${
                ok ? 'border-marca-300 bg-marca-50 text-marca-800' : 'border-stone-200 text-stone-500'
              }`}
            >
              {ok ? <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden /> : <CircleDashed className="size-4 shrink-0" aria-hidden />}
              {p.nombre}
            </li>
          )
        })}
      </ul>

      <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-16" />
      <p className="text-sm text-stone-500">
        El círculo punteado en la cámara marca dónde va la mano. La seña se revisa con reglas sencillas: si no te la reconoce, prueba más despacio y con
        buena luz.
      </p>
    </div>
  )
}
