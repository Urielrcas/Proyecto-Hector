/*
 * COMPONENTE: RUTA RECOMENDADA
 * Muestra el camino de letras para aprender una nueva: el dibujo de cada letra y, entre una
 * y otra, qué hay que cambiar en la mano. Tocar una letra abre su práctica.
 * Lo usa la pantalla «Ruta de aprendizaje» (vista sencilla y vista técnica).
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowRight (flecha →), Check (palomita ✓)
import { ArrowRight, Check } from 'lucide-react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/alfabeto.ts:
//     Letra → tipo: una letra con sus pasos y forma
import type { Letra } from '../lib/aprendizaje/alfabeto'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     diferencias → qué cambia de la forma de una letra a la siguiente
import { diferencias } from '../lib/aprendizaje/grafoLetras'
// ▸ Desde nuestro proyecto: src/components/ManoIlustrada.tsx:
//     ManoIlustrada → dibujo de la mano de una letra
import { ManoIlustrada } from './ManoIlustrada'

export function RutaRecomendada({ ruta, letras, logradas, titulo }: { ruta: string[]; letras: Letra[]; logradas: string[]; titulo: string }) {
  const formaDe = (letra: string) => letras.find((l) => l.letra === letra)!.forma
  return (
    <section aria-labelledby="titulo-ruta" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="titulo-ruta" className="text-lg font-bold">
        {titulo}: {ruta.join(' → ')}
      </h2>
      <p className="text-stone-600">
        {ruta.length - 1} {ruta.length === 2 ? 'paso' : 'pasos'}. Practica las letras en este orden; toca una para practicarla.
      </p>
      <ol className="mt-5 flex flex-wrap items-stretch gap-3">
        {ruta.map((letra, i) => (
          <li key={letra} className="flex items-stretch gap-3">
            {/* Entre una letra y la siguiente: qué hay que cambiar en la mano */}
            {i > 0 && (
              <div className="flex max-w-40 flex-col justify-center gap-1 text-sm text-stone-600">
                <ArrowRight className="size-5 text-marca-700" aria-hidden />
                {diferencias(formaDe(ruta[i - 1]), formaDe(letra)).map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            )}
            <Link
              to={`/aprender/${encodeURIComponent(letra)}`}
              className="relative flex w-28 flex-col items-center rounded-2xl border-2 border-stone-200 p-2 hover:border-marca-300 hover:bg-marca-50/50"
              aria-label={`Practicar la letra ${letra}${logradas.includes(letra) ? ' (lograda)' : ''}`}
            >
              <span className="size-20">
                <ManoIlustrada forma={formaDe(letra)} etiqueta={`Dibujo de la letra ${letra}`} />
              </span>
              <span className="text-2xl font-bold">{letra}</span>
              {logradas.includes(letra) && (
                <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-marca-600 text-white">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
