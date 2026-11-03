/*
 * PANTALLA: CALIBRAR CON MI MANO (/mi-ia/calibrar)
 * Recorre varias letras: para cada una muestra el dibujo, cuenta 3, 2, 1 y graba la mano 2 segundos.
 * Con eso la IA se ajusta a la mano real (lib/ia/calibracion.ts):
 *   - guarda posturas para la red neuronal (que se reentrena sola o con el botón del final),
 *   - si las reglas no reconocen la forma y no se confunde con otra letra, la recuerda como forma personal,
 *   - si se confunde con otra letra, no la guarda y lo avisa.
 * Al final se puede descargar un archivo con los puntos de la mano para revisar las reglas.
 */

import { ArrowLeft, Check, CircleAlert, Download, Hand, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '../../components/Boton'
import { CamaraManos } from '../../components/CamaraManos'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { ManoIlustrada } from '../../components/ManoIlustrada'
import { Acompanante, type Animo } from '../../components/Mascota'
import { useApp } from '../../context/AppContext'
import { useModeloIA } from '../../hooks/useModeloIA'
import { analizarLetra, LETRAS_CONFUSAS, repartidas, type ResultadoLetra } from '../../lib/ia/calibracion'
import { sonidos } from '../../lib/juegos/sonidos'
import { vibrar } from '../../lib/tacto'
import { leerMano, type Punto } from '../../lib/vision/postura'

const MS_GRABAR = 2000
const MS_VER_RESULTADO = 1600

type Fase = 'elegir' | 'calibrando' | 'resumen'
type Paso = 'cuenta' | 'grabando' | 'resultado'

const TEXTO_DECISION: Record<ResultadoLetra['decision'], string> = {
  bien: 'La reconozco bien. Guardé tu mano para la red.',
  recordar: 'La hiciste distinto a la regla: aprendí tu forma.',
  conflicto: 'Se confunde con otra letra: no la guardé.',
  'sin-mano': 'No vi tu mano. Repítela.',
}

export default function Calibrar() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const ia = useModeloIA()
  const letras = ia.letras

  const [fase, setFase] = useState<Fase>('elegir')
  const [lista, setLista] = useState<string[]>([])
  const [indice, setIndice] = useState(0)
  const [paso, setPaso] = useState<Paso>('cuenta')
  const [cuenta, setCuenta] = useState(3)
  const [resultados, setResultados] = useState<ResultadoLetra[]>([])
  const posturas = useRef<Punto[][]>([])
  const datos = useRef<Record<string, { puntos: Punto[]; lectura: ReturnType<typeof leerMano> }[]>>({})

  const confusas = useMemo(() => LETRAS_CONFUSAS.filter((l) => letras.some((x) => x.letra === l)), [letras])
  const letra = letras.find((l) => l.letra === lista[indice])
  const ultimo = resultados.at(-1)

  const empezar = (cuales: string[]) => {
    setLista(cuales)
    setIndice(0)
    setResultados([])
    datos.current = {}
    setCuenta(3)
    setPaso('cuenta')
    setFase('calibrando')
  }

  // La cámara entrega la mano en cada cuadro: mientras se graba, se guarda.
  const alDetectar = (p: Punto[] | null) => {
    if (fase !== 'calibrando' || paso !== 'grabando' || !p || !letra) return
    posturas.current.push(p)
    ;(datos.current[letra.letra] ??= []).push({ puntos: p.map((q) => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4), z: q.z === undefined ? undefined : +q.z.toFixed(4) })), lectura: leerMano(p) })
  }

  // Termina de grabar una letra: analizar y aplicar lo que la IA debe aprender.
  const terminarLetra = () => {
    if (!letra) return
    const r = analizarLetra(letra, letras, posturas.current, ia.memoria)
    if (r.decision !== 'sin-mano') ia.agregarMuestras(letra.letra, repartidas(posturas.current, 8))
    if (r.decision === 'recordar') ia.recordarForma(letra.letra, repartidas(posturas.current, 12))
    setResultados((rs) => [...rs.filter((x) => x.letra !== r.letra), r])
    if (r.decision === 'bien' || r.decision === 'recordar') {
      sonidos.acierto()
      vibrar('acierto')
    } else sonidos.error()
    setPaso('resultado')
  }

  // Reloj de cada letra: cuenta 3-2-1 → grabar 2 s → mostrar el resultado → siguiente.
  useEffect(() => {
    if (fase !== 'calibrando') return
    let t: ReturnType<typeof setTimeout>
    if (paso === 'cuenta') {
      t = setTimeout(() => {
        if (cuenta > 1) return setCuenta(cuenta - 1)
        posturas.current = []
        setPaso('grabando')
      }, 1000)
    } else if (paso === 'grabando') {
      t = setTimeout(terminarLetra, MS_GRABAR)
    } else {
      t = setTimeout(() => {
        // Si no se vio la mano, se repite la misma letra; si no, la siguiente.
        if (ultimo?.decision === 'sin-mano') {
          setCuenta(3)
          setPaso('cuenta')
          return
        }
        if (indice + 1 >= lista.length) return setFase('resumen')
        setIndice(indice + 1)
        setCuenta(3)
        setPaso('cuenta')
      }, MS_VER_RESULTADO)
    }
    return () => clearTimeout(t)
    // terminarLetra cambia en cada render; el reloj solo depende del paso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, paso, cuenta, indice])

  const saltar = () => {
    if (indice + 1 >= lista.length) return setFase('resumen')
    setIndice(indice + 1)
    setCuenta(3)
    setPaso('cuenta')
  }

  const descargar = () => {
    const contenido = { lengua, fecha: new Date().toISOString(), resultados, cuadros: datos.current }
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(new Blob([JSON.stringify(contenido)], { type: 'application/json' }))
    enlace.download = `calibracion-${lengua}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  const mani: { animo: Animo; mensaje: string } =
    paso === 'cuenta'
      ? { animo: 'atento', mensaje: `Haz la ${letra?.letra} y quédate quieto… ${cuenta}` }
      : paso === 'grabando'
        ? { animo: 'pensando', mensaje: 'Grabando… no te muevas.' }
        : { animo: ultimo?.decision === 'bien' || ultimo?.decision === 'recordar' ? 'fiesta' : 'pensando', mensaje: ultimo ? TEXTO_DECISION[ultimo.decision] : '' }

  return (
    <>
      <EncabezadoPagina titulo="Calibrar con mi mano" descripcion={`Ajusta el reconocimiento a tu mano · ${lengua}`} volverA="/mi-ia" />

      {fase === 'elegir' && (
        <section className="max-w-2xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <Acompanante
            animo="hola"
            mensaje="Cada mano es distinta. Haz cada letra 2 segundos y yo me ajusto a la tuya."
            tamano="size-20"
          />
          <ul className="mt-5 space-y-2 text-stone-700">
            <li className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-marca-700" aria-hidden /> Si la reconozco bien, guardo tu mano para que la red aprenda.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-marca-700" aria-hidden /> Si la haces distinto, aprendo tu forma, siempre que no se confunda con otra letra.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-marca-700" aria-hidden /> Busca buena luz y deja tu mano completa dentro de la cámara.
            </li>
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Boton onClick={() => empezar(confusas)}>
              <Sparkles className="size-5" aria-hidden /> Las que más se confunden ({confusas.length})
            </Boton>
            <Boton variante="secundario" onClick={() => empezar(letras.map((l) => l.letra))}>
              <Hand className="size-5" aria-hidden /> Todo el alfabeto ({letras.length})
            </Boton>
          </div>
          <p className="mt-3 text-sm text-stone-500">Las que más se confunden: {confusas.join(', ')}. Tarda como medio minuto.</p>
        </section>
      )}

      {fase === 'calibrando' && letra && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <CamaraManos alDetectar={alDetectar} borde={paso === 'resultado' && (ultimo?.decision === 'bien' || ultimo?.decision === 'recordar') ? 'exito' : 'neutro'} />
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden>
              <div className="h-full bg-marca-600 transition-all" style={{ width: `${((indice + (paso === 'resultado' ? 1 : 0)) / lista.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Letra {indice + 1} de {lista.length}
            </p>
          </section>
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-5">
              <div className="grid size-32 place-items-center rounded-2xl bg-marca-50/60">
                <ManoIlustrada forma={letra.forma} etiqueta={`Dibujo de la letra ${letra.letra}`} />
              </div>
              <div>
                <p className="text-8xl leading-none font-bold text-marca-900">{letra.letra}</p>
                {paso === 'cuenta' && <p className="mt-2 text-4xl font-bold text-marca-700 tabular-nums">{cuenta}</p>}
                {paso === 'grabando' && <p className="mt-2 font-bold text-amber-700">● Grabando</p>}
              </div>
            </div>
            <ol className="mt-4 space-y-1 text-stone-700">
              {letra.pasos.map((p, i) => (
                <li key={i}>
                  {i + 1}. {p}
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-16" />
            </div>
            <button onClick={saltar} className="mt-4 inline-flex items-center gap-1 font-bold text-stone-500 hover:text-marca-800">
              <SkipForward className="size-4" aria-hidden /> Saltar esta letra
            </button>
          </section>
        </div>
      )}

      {fase === 'resumen' && (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Así quedó</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {resultados.map((r) => {
              const bien = r.decision === 'bien' || r.decision === 'recordar'
              return (
                <li key={r.letra} className={`flex items-start gap-3 rounded-2xl border-2 p-3 ${bien ? 'border-marca-200 bg-marca-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
                  <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-2xl font-bold ${bien ? 'bg-marca-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{r.letra}</span>
                  <span className="text-sm">
                    <span className="flex items-center gap-1 font-bold">
                      {bien ? <Check className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
                      {r.decision === 'bien' ? 'Bien' : r.decision === 'recordar' ? 'Aprendí tu forma' : r.decision === 'conflicto' ? `Se confunde con la ${r.confundidaCon}` : 'Sin mano'}
                    </span>
                    <span className="block text-stone-600">La regla la reconoció en {Math.round(r.reconocida * 100)} % de los cuadros.</span>
                    {r.decision === 'conflicto' && r.consejo && <span className="block text-stone-600">Prueba: {r.consejo}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Boton onClick={() => ia.entrenar()} disabled={!!ia.entrenamiento}>
              <Sparkles className="size-5" aria-hidden /> {ia.entrenamiento ? 'Entrenando la red…' : 'Reentrenar mi red con esto'}
            </Boton>
            <Boton variante="secundario" onClick={descargar}>
              <Download className="size-5" aria-hidden /> Descargar los datos
            </Boton>
            <Boton variante="secundario" onClick={() => setFase('elegir')}>
              <RotateCcw className="size-5" aria-hidden /> Calibrar otra vez
            </Boton>
            <Link to="/mi-ia" className="inline-flex min-h-12 items-center gap-1 px-2 font-bold text-marca-800 hover:underline">
              <ArrowLeft className="size-5" aria-hidden /> Volver a Mi IA
            </Link>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            El archivo trae solo los números de los puntos de tu mano (sin imagen). Mándaselo al equipo si alguna letra se sigue confundiendo.
          </p>
        </section>
      )}
    </>
  )
}
