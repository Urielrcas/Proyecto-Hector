/*
 * COMPONENTE: ELEGIR CON QUÉ LETRAS JUGAR
 * Pantalla previa de los juegos. Cuatro opciones:
 *   - «Recomendadas por la IA»: las que el modelo del estudiante dice que conviene practicar
 *     (las que te cuestan, las que estás olvidando y las nuevas parecidas a las que ya dominas).
 *   - «Las que ya logré»: solo las letras marcadas como logradas en Aprendizaje.
 *   - «Todo el alfabeto».
 *   - «Yo las elijo»: el usuario toca las letras que cree que ya sabe (ej.: A, E, I, O, U).
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Play (triángulo de reproducir)
import { Play, Sparkles } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta algo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/hooks/useModeloIA.ts:
//     useModeloIA → recomendaciones de la IA
import { useModeloIA } from '../../hooks/useModeloIA'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     Letra → tipo: una letra con sus pasos, forma y objetivo
import type { Letra } from '../../lib/aprendizaje/alfabeto'

type Modo = 'ia' | 'logradas' | 'todas' | 'elegir'

/** Mínimo de letras logradas para ofrecer «Las que ya logré». */
const MIN_LOGRADAS = 2

export function SelectorLetras({
  letras,
  logradas,
  alEmpezar,
}: {
  letras: Letra[] // alfabeto de la lengua
  logradas: string[] // letras ya logradas en Aprendizaje
  alEmpezar: (elegidas: Letra[]) => void
}) {
  const hayLogradas = letras.filter((l) => logradas.includes(l.letra)).length >= MIN_LOGRADAS
  // La IA recomienda hasta 6 letras; con al menos 2 ya es la opción por defecto.
  const { modelo, recomendaciones: recomendadas } = useModeloIA()
  const recomendacionesIA = recomendadas.length >= 2 && Object.keys(modelo.dominio).length > 0 ? recomendadas : []
  const [modo, setModo] = useState<Modo>(recomendacionesIA.length ? 'ia' : hayLogradas ? 'logradas' : 'todas')
  const [elegidas, setElegidas] = useState<string[]>([])

  const alternar = (letra: string) => setElegidas((e) => (e.includes(letra) ? e.filter((x) => x !== letra) : [...e, letra]))

  const seleccion =
    modo === 'todas'
      ? letras
      : letras.filter((l) => (modo === 'ia' ? recomendacionesIA.map((r) => r.letra) : modo === 'logradas' ? logradas : elegidas).includes(l.letra))

  const opciones: { valor: Modo; titulo: string; texto: string; desactivada?: boolean }[] = [
    {
      valor: 'ia',
      titulo: '✨ Recomendadas por la IA',
      texto: recomendacionesIA.length ? `${recomendacionesIA.map((r) => r.letra).join(', ')}` : 'Juega o practica un poco y la IA te recomendará',
      desactivada: !recomendacionesIA.length,
    },
    {
      valor: 'logradas',
      titulo: 'Las que ya logré',
      texto: hayLogradas
        ? `${letras.filter((l) => logradas.includes(l.letra)).length} letras de Aprendizaje`
        : `Logra al menos ${MIN_LOGRADAS} letras en Aprendizaje`,
      desactivada: !hayLogradas,
    },
    { valor: 'todas', titulo: 'Todo el alfabeto', texto: `${letras.length} letras` },
    { valor: 'elegir', titulo: 'Yo las elijo', texto: 'Las que creo que ya sé' },
  ]

  return (
    <section aria-labelledby="titulo-selector" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 id="titulo-selector" className="text-xl font-bold">
        ¿Con qué letras quieres jugar?
      </h2>

      <div role="radiogroup" aria-label="Letras para jugar" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={modo === o.valor}
            disabled={o.desactivada}
            onClick={() => setModo(o.valor)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              modo === o.valor ? 'border-marca-600 bg-marca-50' : 'border-stone-200 hover:border-marca-300'
            }`}
          >
            <span className="block font-bold">{o.titulo}</span>
            <span className="block text-sm text-stone-600">{o.texto}</span>
          </button>
        ))}
      </div>

      {/* Por qué la IA recomienda cada letra */}
      {modo === 'ia' && recomendacionesIA.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded-2xl bg-marca-50/60 p-4">
          {recomendacionesIA.map((r) => (
            <li key={r.letra} className="flex items-center gap-3">
              <Sparkles className="size-4 shrink-0 text-marca-700" aria-hidden />
              <strong className="w-6 text-lg">{r.letra}</strong>
              <span className="text-stone-700">{r.motivo}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Cuadrícula para tocar letras (solo en «Yo las elijo») */}
      {modo === 'elegir' && (
        <div className="mt-5">
          <p className="text-stone-600">Toca las letras que crees que ya sabes:</p>
          <ul className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-14">
            {letras.map((l) => {
              const activa = elegidas.includes(l.letra)
              return (
                <li key={l.letra}>
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => alternar(l.letra)}
                    className={`grid aspect-square w-full place-items-center rounded-xl border-2 text-xl font-bold transition-colors ${
                      activa ? 'border-marca-600 bg-marca-600 text-white' : 'border-stone-200 bg-white hover:border-marca-300'
                    }`}
                  >
                    {l.letra}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Boton onClick={() => alEmpezar(seleccion)} disabled={seleccion.length === 0}>
          <Play className="size-5" aria-hidden />
          Empezar
        </Boton>
        {modo === 'elegir' && seleccion.length === 0 && <span className="text-sm text-stone-500">Elige al menos una letra.</span>}
      </div>
    </section>
  )
}
