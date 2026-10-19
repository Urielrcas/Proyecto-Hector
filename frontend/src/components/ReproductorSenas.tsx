/*
 * COMPONENTE: REPRODUCTOR DE SEÑAS
 * Muestra un texto en señas, una tras otra (por ahora deletreado con el dibujo de cada letra),
 * con barra de avance, reproducir/pausar, anterior/siguiente, repetir, velocidad y la tira de letras.
 * Empieza a reproducir solo al aparecer. Para mostrar un mensaje nuevo desde el inicio,
 * quien lo usa le cambia la «key» (así se vuelve a montar).
 * Lo usan el traductor Voz / Texto → Señas y el Modo conversación.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ChevronLeft (flechita ‹), ChevronRight (flechita ›), Pause (pausa), Play (reproducir), RotateCcw (repetir)
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (aquí: el temporizador que avanza las señas)
//     useMemo → recuerda un cálculo y solo lo repite cuando cambian sus datos
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useMemo, useState } from 'react'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../lib/tipos'
// ▸ Desde nuestro proyecto: src/lib/traduccion/deletreo.ts:
//     duracion → cuánto se muestra cada seña según la velocidad
//     textoASenas → convierte el texto en la secuencia de señas
//     Sena → tipo: una seña de la secuencia (letra, pausa o sin seña)
import { duracion, textoASenas, type Sena } from '../lib/traduccion/deletreo'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from './Boton'
// ▸ Desde nuestro proyecto: src/components/ManoIlustrada.tsx:
//     ManoIlustrada → dibujo de la mano de una letra
import { ManoIlustrada } from './ManoIlustrada'

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2]

// Lo que se ve en grande para cada seña.
function SenaGrande({ sena, compacto }: { sena: Sena | undefined; compacto: boolean }) {
  if (!sena) return <p className="text-stone-500">Aquí aparecerán las señas.</p>
  if (sena.tipo === 'pausa') return <p className="text-lg font-bold text-stone-500">· pausa entre palabras ·</p>
  if (sena.tipo === 'sin-sena')
    return (
      <div className="text-center">
        <p className={`${compacto ? 'text-5xl' : 'text-7xl'} font-bold text-stone-700`}>{sena.texto}</p>
        <p className="mt-2 text-stone-600">Sin seña en el alfabeto</p>
      </div>
    )
  return (
    <div className="flex items-center gap-6">
      <div className={compacto ? 'size-32' : 'size-44 sm:size-52'}>
        <ManoIlustrada forma={sena.letra.forma} etiqueta={`Seña de la letra ${sena.letra.letra}`} />
      </div>
      <div>
        <p className={`${compacto ? 'text-6xl' : 'text-8xl'} leading-none font-bold text-marca-900`}>{sena.letra.letra}</p>
        {sena.letra.movimiento && <p className="mt-2 text-sm font-bold text-amber-700">Con movimiento</p>}
      </div>
    </div>
  )
}

export function ReproductorSenas({ texto, lengua, compacto = false }: { texto: string; lengua: Lengua; compacto?: boolean }) {
  const [posicion, setPosicion] = useState(0) // seña que se muestra (= total cuando ya terminó)
  const [reproduciendo, setReproduciendo] = useState(() => !!texto.trim()) // empieza solo si hay mensaje
  const [velocidad, setVelocidad] = useState(1)
  // Solo se recalcula al cambiar el texto o la lengua (si no, el temporizador se reiniciaría en cada redibujado).
  const senas = useMemo(() => textoASenas(texto, lengua), [texto, lengua])
  const total = senas.length
  const actual = posicion < total ? senas[posicion] : senas[total - 1]
  const enReproduccion = reproduciendo && posicion < total

  // Avanzar a la siguiente seña cuando se cumple su tiempo.
  useEffect(() => {
    if (!enReproduccion) return
    const t = setTimeout(() => setPosicion((p) => p + 1), duracion(senas[posicion], velocidad))
    return () => clearTimeout(t)
  }, [enReproduccion, posicion, velocidad, senas])

  const reproducirOPausar = () => {
    if (enReproduccion) return setReproduciendo(false)
    if (posicion >= total) setPosicion(0) // terminó: empezar de nuevo
    setReproduciendo(true)
  }
  const irA = (i: number) => {
    setReproduciendo(false)
    setPosicion(Math.max(0, Math.min(total - 1, i)))
  }
  const repetir = () => {
    setPosicion(0)
    setReproduciendo(true)
  }

  // Las señas agrupadas por palabra, para la tira de abajo.
  const porPalabra: { sena: Sena; indice: number }[][] = []
  senas.forEach((sena, indice) => {
    if (sena.tipo === 'pausa') return
    ;(porPalabra[sena.palabra] ??= []).push({ sena, indice })
  })

  return (
    <div>
      <div className={`grid place-items-center rounded-2xl bg-stone-50 p-4 ${compacto ? 'min-h-48' : 'min-h-72'}`} aria-live="polite">
        {/* key: al cambiar de seña se vuelve a montar y se ve la animación (también si se repite la letra) */}
        <div key={posicion} className="animate-aparecer">
          <SenaGrande sena={total ? actual : undefined} compacto={compacto} />
        </div>
      </div>

      {/* Barra de avance */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden>
        <div className="h-full bg-marca-600 transition-all" style={{ width: `${total ? (Math.min(posicion + 1, total) / total) * 100 : 0}%` }} />
      </div>

      {/* Controles */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Boton onClick={reproducirOPausar} disabled={!total} aria-label={enReproduccion ? 'Pausar' : 'Reproducir'}>
          {enReproduccion ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
          {enReproduccion ? 'Pausar' : 'Reproducir'}
        </Boton>
        {[
          { icono: ChevronLeft, etiqueta: 'Seña anterior', accion: () => irA(posicion - 1) },
          { icono: ChevronRight, etiqueta: 'Seña siguiente', accion: () => irA(posicion + 1) },
          { icono: RotateCcw, etiqueta: 'Repetir desde el inicio', accion: repetir },
        ].map(({ icono: Icono, etiqueta, accion }) => (
          <button
            key={etiqueta}
            onClick={accion}
            disabled={!total}
            className="grid size-12 place-items-center rounded-xl border-2 border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40"
            aria-label={etiqueta}
            title={etiqueta}
          >
            <Icono className="size-5" />
          </button>
        ))}
        <label className="ml-auto flex items-center gap-3 text-sm font-bold text-stone-700">
          Velocidad
          <input
            type="range"
            min={0}
            max={VELOCIDADES.length - 1}
            value={VELOCIDADES.indexOf(velocidad)}
            onChange={(e) => setVelocidad(VELOCIDADES[Number(e.target.value)])}
            className="w-24 accent-marca-700"
            aria-valuetext={`${velocidad}×`}
          />
          <span className="w-10 tabular-nums">{velocidad}×</span>
        </label>
      </div>

      {/* Tira con todas las letras: la actual resaltada; tocar una salta a ella */}
      {total > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Letras del mensaje">
          {porPalabra.map((palabra, i) => (
            <span key={i} className="flex gap-1">
              {palabra.map(({ sena, indice }) => (
                <button
                  key={indice}
                  onClick={() => irA(indice)}
                  aria-current={indice === posicion}
                  className={`min-w-8 rounded-md px-1.5 py-0.5 text-lg font-bold ${
                    indice === posicion ? 'bg-marca-700 text-white' : indice < posicion ? 'text-marca-800' : 'text-stone-400 hover:bg-stone-100'
                  }`}
                >
                  {sena.tipo === 'letra' ? sena.letra.letra : sena.tipo === 'sin-sena' ? sena.texto : ''}
                </button>
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
