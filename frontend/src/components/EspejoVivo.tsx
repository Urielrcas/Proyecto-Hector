/*
 * COMPONENTE: ESPEJO VIVO (la cámara del Inicio)
 * La cámara con tu mano dibujada y Mani al lado. Haz cualquier letra: Mani la adivina,
 * la letra «sale» de tu mano y se va juntando en una palabra. Si te atoras, Mani te dice qué corregir.
 * Usa el mismo reconocedor que el traductor (hooks/useDeletreo.ts) con la IA del usuario.
 * Se carga aparte (lazy) desde Inicio para que MediaPipe solo se descargue si se enciende la cámara.
 */

import { ArrowRight, Bug, Delete, Volume2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { comoFrase, useDeletreo } from '../hooks/useDeletreo'
import { useIADeletreo } from '../hooks/useIADeletreo'
import { usePistaMani } from '../hooks/usePistaMani'
import { useGrabadoraMano } from '../hooks/useGrabadoraMano'
import { alfabeto } from '../lib/aprendizaje/alfabeto'
import { SENAS_TEXTO } from '../lib/navegacion'
import { hablar, hayVoz } from '../lib/voz'
import { CamaraManos } from './CamaraManos'
import { LetrasQueSalen } from './LetrasQueSalen'
import { Acompanante, type Animo } from './Mascota'

export default function EspejoVivo({ alApagar }: { alApagar: () => void }) {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const ia = useIADeletreo()
  const letras = useMemo(() => alfabeto(lengua), [lengua])
  const pista = usePistaMani(letras)
  const grabadora = useGrabadoraMano(lengua)
  const [reportando, setReportando] = useState(false)
  const [letraReporte, setLetraReporte] = useState('')
  const d = useDeletreo(lengua, { clasificar: ia.clasificar, corrector: ia.corrector, memoria: ia.memoria, alCadaCuadro: pista.alCadaCuadro })
  const { texto, estado, resaltada, candidata, confianza } = d

  // Qué hace y dice Mani según lo que ve la cámara.
  const mani: { animo: Animo; mensaje: string } = resaltada
    ? { animo: 'fiesta', mensaje: `¡Esa es la ${resaltada.letra}!` }
    : !estado || !estado.hayMano
      ? { animo: 'atento', mensaje: texto.trim() ? 'Baja la mano y vuelve a subirla para otra palabra.' : 'Muéstrame tu mano…' }
      : pista.actual
        ? { animo: 'pensando', mensaje: `¿Intentas la ${pista.actual.letra}? ${pista.actual.consejos[0]}` }
        : estado.aviso === 'cambia-forma'
        ? { animo: 'feliz', mensaje: 'Cambia de forma para la siguiente letra.' }
        : candidata && confianza >= 40
          ? { animo: 'pensando', mensaje: candidata.objetivo.movimiento ? `¿La ${candidata.letra}? Haz su movimiento…` : `Mmm… ¿es la ${candidata.letra}? Quédate quieto.` }
          : { animo: 'pensando', mensaje: 'Haz una letra del alfabeto.' }

  const palabras = comoFrase(texto)
  const idiomaVoz = lengua === 'ASL' ? 'en-US' : 'es-MX'

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-center">
      <div className="relative">
        <CamaraManos alDetectar={grabadora.conGrabacion(pista.conPuntos(d.alDetectar))} borde={resaltada ? 'exito' : 'neutro'} />
        <LetrasQueSalen texto={texto} />
        {/* Medidor de seguridad: qué tan segura está la app de la letra que ve */}
        {candidata && !resaltada && (
          <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 py-1 pr-3 pl-1 text-sm font-bold text-stone-800 shadow">
            <span className="grid size-8 place-items-center rounded-full bg-marca-100 text-lg text-marca-800">{candidata.letra}</span>
            <span className="h-2 w-16 overflow-hidden rounded-full bg-stone-200" aria-hidden>
              <span className="block h-full rounded-full bg-marca-500 transition-all" style={{ width: `${confianza}%` }} />
            </span>
          </div>
        )}
        <button
          onClick={alApagar}
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white"
          aria-label="Apagar la cámara"
          title="Apagar la cámara"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <Acompanante animo={mani.animo} mensaje={mani.mensaje} tamano="size-24 sm:size-28" />

        {/* La palabra que se va formando */}
        <div className="rounded-2xl border-2 border-dashed border-marca-200 bg-white/70 p-4">
          <p className="text-sm font-bold text-stone-500">Lo que deletreaste</p>
          <p className="mt-1 min-h-10 text-3xl font-bold tracking-wide break-words text-marca-900" aria-live="polite">
            {palabras || <span className="text-stone-300">· · ·</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {hayVoz() && (
              <button
                onClick={() => hablar(palabras.toLowerCase(), idiomaVoz)}
                disabled={!palabras}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-marca-700 px-3 font-bold text-white hover:bg-marca-800 disabled:opacity-40"
              >
                <Volume2 className="size-5" aria-hidden /> Escuchar
              </button>
            )}
            <button
              onClick={d.borrar}
              disabled={!texto}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-stone-200 bg-white px-3 font-bold text-stone-700 hover:border-marca-300 disabled:opacity-40"
            >
              <Delete className="size-5" aria-hidden /> Borrar
            </button>
            <Link to={SENAS_TEXTO.ruta} className="ml-auto inline-flex min-h-10 items-center gap-1 px-1 font-bold text-marca-800 hover:underline">
              Traductor completo <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* ¿Se equivocó? Grabar la mano para revisar la regla con datos reales */}
        {!reportando ? (
          <button onClick={() => setReportando(true)} className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-stone-500 hover:text-marca-800">
            <Bug className="size-4" aria-hidden /> ¿Se equivocó de letra?
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-stone-200 bg-white p-4 text-sm">
            {grabadora.estado === 'guardada' ? (
              <>
                <p className="font-bold text-marca-800">Listo: se guardó «{grabadora.archivo}» en Descargas.</p>
                <p className="mt-1 text-stone-600">Avísale a Claude para que revise la regla con tu mano real.</p>
                <button onClick={grabadora.otraVez} className="mt-2 font-bold text-marca-800 hover:underline">
                  Grabar otra
                </button>
              </>
            ) : grabadora.estado === 'contando' ? (
              <p className="text-center">
                <span className="block font-bold text-stone-700">Forma la letra {letraReporte.toUpperCase()} y quédate quieto…</span>
                <span className="mt-1 block text-5xl font-bold text-marca-700 tabular-nums">{grabadora.cuenta}</span>
              </p>
            ) : grabadora.estado === 'grabando' ? (
              <p className="font-bold text-marca-800">Grabando… no te muevas (3 segundos).</p>
            ) : (
              <>
                <label className="font-bold text-stone-800" htmlFor="letra-reporte">
                  ¿Qué letra estás haciendo?
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="letra-reporte"
                    value={letraReporte}
                    onChange={(e) => setLetraReporte(e.target.value.slice(-1))}
                    maxLength={1}
                    className="size-11 rounded-xl border-2 border-stone-300 text-center text-xl font-bold uppercase focus:border-marca-600 focus:outline-none"
                  />
                  <button
                    onClick={() => grabadora.grabar(letraReporte)}
                    disabled={!letraReporte.trim()}
                    className="min-h-11 flex-1 rounded-xl bg-marca-700 px-3 font-bold text-white hover:bg-marca-800 disabled:opacity-40"
                  >
                    Grabar (cuenta 3, 2, 1)
                  </button>
                </div>
                <p className="mt-2 text-stone-500">Solo se guardan los números de los puntos de la mano, no la imagen.</p>
                <Link to="/mi-ia/calibrar" className="mt-2 inline-block font-bold text-marca-800 hover:underline">
                  ¿Varias letras fallan? Calibra con tu mano
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
