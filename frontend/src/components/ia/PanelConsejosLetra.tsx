/*
 * COMPONENTE: MANI TE AYUDA CON LA LETRA QUE PRACTICAS (en «Practicar letra»)
 * En lugar de una lista larga de consejos debajo de la cámara, Mani los da uno por uno:
 *   - Cerrado: Mani pequeño, cuántos intentos llevas y el botón «Pídele ayuda a Mani» (con cuántos consejos tiene).
 *     Si la letra te está costando, Mani se ofrece solo: «¿Te ayudo con la E?».
 *   - Abierto: Mani con un globo de diálogo; «Otro consejo» pasa al siguiente, «Leer en voz alta» lo dice
 *     con la voz del navegador y «Ya entendí» lo cierra.
 * Los consejos salen de los intentos guardados (prácticas 18, 19 y 27) y del consejo por dedos
 * (lib/aprendizaje/ayudaMani.ts y consejoDedos.ts). Los invitados no tienen expediente: se les invita a iniciar sesión.
 */
import { ChevronLeft, ChevronRight, HelpCircle, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { alfabeto } from '../../lib/aprendizaje/alfabeto'
import { globosDeAyuda } from '../../lib/aprendizaje/ayudaMani'
import { callar, hablar, hayVoz } from '../../lib/voz'
import type { Expediente } from '../../services/intentos'
import { Acompanante, Mascota, NOMBRE_MASCOTA } from '../Mascota'

export function PanelConsejosLetra({ letra, expediente, conCuenta }: { letra: string; expediente: Expediente | null; conCuenta: boolean }) {
  const info = expediente?.letras.find((l) => l.letra === letra)
  const lengua = expediente?.lengua
  const globos = useMemo(() => {
    if (!lengua) return []
    const letras = alfabeto(lengua)
    const esta = letras.find((l) => l.letra === letra)
    return esta ? globosDeAyuda(esta, expediente, letras) : []
  }, [lengua, letra, expediente])
  const [abierto, setAbierto] = useState(false)
  const [paso, setPaso] = useState(0)

  // Al cambiar de letra se cierra y empieza desde el primer consejo (y se deja de leer en voz alta).
  const [deLetra, setDeLetra] = useState(letra)
  if (deLetra !== letra) {
    setDeLetra(letra)
    setAbierto(false)
    setPaso(0)
  }
  useEffect(() => () => callar(), [letra])
  // Si llegan menos consejos (se actualizó el expediente), no quedarse fuera de la lista.
  const actual = globos[Math.min(paso, Math.max(0, globos.length - 1))]

  const cerrar = () => {
    setAbierto(false)
    callar()
  }

  if (!conCuenta) {
    return (
      <section aria-label={`${NOMBRE_MASCOTA} te ayuda`} className="mt-4 flex items-center gap-3 rounded-2xl border border-marca-200 bg-marca-50/50 p-3">
        <Mascota animo="hola" className="size-12 shrink-0" />
        <p className="text-sm text-stone-700">
          <Link to="/login" className="font-bold text-marca-800 hover:underline">
            Inicia sesión
          </Link>{' '}
          y {NOMBRE_MASCOTA} recordará tus intentos para darte consejos.
        </p>
      </section>
    )
  }

  if (!info || info.intentos === 0) {
    return (
      <section aria-label={`${NOMBRE_MASCOTA} te ayuda`} className="mt-4 flex items-center gap-3 rounded-2xl border border-marca-200 bg-marca-50/50 p-3">
        <Mascota animo="atento" className="size-12 shrink-0" />
        <p className="text-sm text-stone-700">Haz tu primer intento: voy a ir viendo cómo te va para darte consejos.</p>
      </section>
    )
  }

  const leCuesta = info.estado === 'difícil' || info.fallidos >= 5

  if (!abierto || !actual) {
    return (
      <section aria-label={`${NOMBRE_MASCOTA} te ayuda`} className="mt-4 rounded-2xl border border-marca-200 bg-marca-50/50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Mascota animo={leCuesta ? 'pensando' : 'atento'} className="size-12 shrink-0" />
          <div className="min-w-0 flex-1 basis-40 text-sm text-stone-700">
            {leCuesta && globos.length ? (
              <p className="font-bold text-stone-800">¿Te ayudo con la {letra}?</p>
            ) : null}
            <p>
              {info.intentos} {info.intentos === 1 ? 'intento' : 'intentos'} · {info.aciertos} {info.aciertos === 1 ? 'logrado' : 'logrados'} · último{' '}
              {info.ultimo_puntaje} %
            </p>
          </div>
          {globos.length > 0 && (
            <button
              type="button"
              onClick={() => (setPaso(0), setAbierto(true))}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold ${leCuesta ? 'bg-marca-700 text-white hover:bg-marca-800' : 'border-2 border-marca-300 bg-white text-marca-800 hover:bg-marca-50'}`}
            >
              <HelpCircle className="size-5" aria-hidden />
              Pídele ayuda a {NOMBRE_MASCOTA}
              <span className={`grid size-6 place-items-center rounded-full text-xs ${leCuesta ? 'bg-white text-marca-800' : 'bg-marca-100'}`} aria-label={`${globos.length} consejos`}>
                {globos.length}
              </span>
            </button>
          )}
        </div>
      </section>
    )
  }

  const ultimo = paso >= globos.length - 1
  return (
    <section aria-label={`${NOMBRE_MASCOTA} te ayuda`} className="mt-4 rounded-2xl border border-marca-200 bg-marca-50/50 p-3">
      <Acompanante animo={actual.animo} mensaje={actual.texto} tamano="size-16 sm:size-20">
        {actual.letra && (
          <Link to={`/aprender/${encodeURIComponent(actual.letra)}`} className="mt-1 block text-sm text-marca-800 hover:underline">
            Practicar la {actual.letra} →
          </Link>
        )}
      </Acompanante>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-sm text-stone-600 tabular-nums" aria-live="polite">
          Consejo {Math.min(paso, globos.length - 1) + 1} de {globos.length}
        </span>
        {hayVoz() && (
          <button
            type="button"
            onClick={() => hablar(actual.texto)}
            aria-label="Leer en voz alta"
            title="Leer en voz alta"
            className="grid size-10 place-items-center rounded-xl text-marca-800 hover:bg-marca-100"
          >
            <Volume2 className="size-5" aria-hidden />
          </button>
        )}
        {paso > 0 && (
          <button type="button" onClick={() => (callar(), setPaso(paso - 1))} className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-bold text-stone-600 hover:bg-stone-100" aria-label="Consejo anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        )}
        {ultimo ? (
          <button type="button" onClick={cerrar} className="min-h-10 rounded-xl bg-marca-700 px-4 text-sm font-bold text-white hover:bg-marca-800">
            ¡Ya entendí!
          </button>
        ) : (
          <>
            <button type="button" onClick={cerrar} className="min-h-10 rounded-xl px-3 text-sm font-bold text-stone-600 hover:bg-stone-100">
              Ya entendí
            </button>
            <button type="button" onClick={() => (callar(), setPaso(paso + 1))} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-marca-700 px-4 text-sm font-bold text-white hover:bg-marca-800">
              Otro consejo <ChevronRight className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>
      <Link to="/aprender/expediente" className="mt-1 inline-block text-xs font-bold text-marca-800 hover:underline">
        Ver mi expediente completo →
      </Link>
    </section>
  )
}
