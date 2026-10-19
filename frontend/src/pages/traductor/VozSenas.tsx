/*
 * PANTALLA: TRADUCTOR VOZ / TEXTO → SEÑAS
 * La persona oyente habla (o escribe) y la app muestra el mensaje en señas.
 *   - Izquierda: pestañas «Hablar» (micrófono con las ondas de la voz) y «Escribir».
 *   - Derecha: el texto reconocido y las señas, una tras otra (components/ReproductorSenas.tsx).
 * Por ahora el mensaje se muestra DELETREADO con los dibujos de la mano de cada letra
 * (lib/traduccion/deletreo.ts). Las palabras con seña propia y el avatar llegarán después.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Keyboard (teclado), Mic (micrófono), MicOff (micrófono tachado), Play (reproducir), Square (detener)
import { Keyboard, Mic, MicOff, Play, Square } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useState, type FormEvent } from 'react'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/components/ReproductorSenas.tsx:
//     ReproductorSenas → muestra el texto en señas, una tras otra, con sus controles
import { ReproductorSenas } from '../../components/ReproductorSenas'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useNivelMicrofono.ts:
//     useNivelMicrofono → qué tan fuerte llega la voz (para dibujar las ondas)
import { useNivelMicrofono } from '../../hooks/useNivelMicrofono'
// ▸ Desde nuestro proyecto: src/hooks/useReconocimientoVoz.ts:
//     useReconocimientoVoz → convierte la voz en texto con el navegador
//     ErrorVoz → tipo: por qué falló el reconocimiento de voz
import { useReconocimientoVoz, type ErrorVoz } from '../../hooks/useReconocimientoVoz'
// ▸ Desde nuestro proyecto: src/lib/navegacion.ts:
//     VOZ_SENAS → sección del menú «Voz / Texto → Señas» (título e ícono)
import { VOZ_SENAS } from '../../lib/navegacion'

const EJEMPLOS = ['Hola', 'Necesito ayuda', 'Gracias', '¿Cómo estás?']

const MENSAJE_ERROR: Record<ErrorVoz, string> = {
  'sin-soporte': 'Este navegador no puede convertir la voz en texto. Usa Google Chrome o Microsoft Edge, o escribe el mensaje.',
  'sin-permiso': 'No hay permiso para usar el micrófono. Actívalo desde el ícono del candado en la barra de direcciones.',
  'sin-voz': 'No se escuchó nada. Presiona el micrófono y habla cerca de él.',
  'sin-red': 'No hay conexión: el reconocimiento de voz del navegador necesita internet. Puedes escribir el mensaje.',
  otro: 'No se pudo reconocer la voz. Inténtalo de nuevo o escribe el mensaje.',
}

export default function VozSenas() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const idioma: 'es-MX' | 'en-US' = lengua === 'ASL' ? 'en-US' : 'es-MX'

  const [modo, setModo] = useState<'hablar' | 'escribir'>('hablar')
  const [texto, setTexto] = useState('') // el mensaje que se muestra en señas
  const [borrador, setBorrador] = useState('') // lo que se escribe en la pestaña «Escribir»

  // Cada mensaje nuevo cambia la «versión»: el reproductor se vuelve a montar y empieza desde el inicio.
  const [version, setVersion] = useState(0)

  // Mostrar un mensaje nuevo en señas desde el principio.
  const traducir = (nuevo: string) => {
    setTexto(nuevo)
    setVersion((v) => v + 1)
  }

  // ── Voz ──
  const voz = useReconocimientoVoz(idioma, traducir)
  const niveles = useNivelMicrofono(voz.escuchando)

  const enviarTexto = (e: FormEvent) => {
    e.preventDefault()
    if (borrador.trim()) traducir(borrador.trim())
  }

  return (
    <>
      <EncabezadoPagina titulo={VOZ_SENAS.titulo} descripcion={`Habla o escribe y el mensaje se muestra en señas de ${lengua}.`} icono={VOZ_SENAS.icono} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Izquierda: Hablar / Escribir ── */}
        <section aria-label="Entrada del mensaje" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="tablist" aria-label="Cómo dar el mensaje">
            {(
              [
                ['hablar', 'Hablar', Mic],
                ['escribir', 'Escribir', Keyboard],
              ] as const
            ).map(([valor, nombre, Icono]) => (
              <button
                key={valor}
                role="tab"
                aria-selected={modo === valor}
                onClick={() => {
                  if (voz.escuchando) voz.detener()
                  setModo(valor)
                }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-lg font-bold transition-colors ${
                  modo === valor ? 'bg-marca-700 text-white' : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icono className="size-5" aria-hidden />
                {nombre}
              </button>
            ))}
          </div>

          {modo === 'hablar' ? (
            <div className="mt-5 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-stone-200 p-6 text-center">
              <button
                onClick={() => (voz.escuchando ? voz.detener() : voz.iniciar())}
                disabled={!voz.soportado}
                aria-pressed={voz.escuchando}
                aria-label={voz.escuchando ? 'Dejar de escuchar' : 'Presiona y habla'}
                className={`grid size-28 place-items-center rounded-full border-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  voz.escuchando ? 'border-red-200 bg-red-600 text-white hover:bg-red-700' : 'border-marca-100 bg-marca-50 text-marca-800 hover:bg-marca-100'
                }`}
              >
                {!voz.soportado ? <MicOff className="size-12" /> : voz.escuchando ? <Square className="size-10 fill-current" /> : <Mic className="size-12" />}
              </button>
              <p className="mt-4 text-lg font-bold">
                {voz.escuchando ? 'Te escucho… presiona de nuevo para terminar' : 'Presiona el micrófono y habla'}
              </p>

              {/* Ondas: la altura de cada barra es el volumen de la voz en ese momento */}
              <div className="mt-5 flex h-16 items-center gap-1" aria-hidden>
                {niveles.map((n, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full transition-[height] duration-75 ${voz.escuchando ? 'bg-marca-600' : 'bg-stone-300'}`}
                    style={{ height: `${Math.max(6, n * 64)}px` }}
                  />
                ))}
              </div>

              <p className="mt-4 min-h-14 text-xl text-stone-800" aria-live="polite">
                {voz.parcial || (voz.escuchando ? '' : ' ')}
              </p>
              {voz.error && (
                <div className="mt-2 w-full text-left">
                  <Aviso tipo="error">{MENSAJE_ERROR[voz.error]}</Aviso>
                </div>
              )}
              <p className="mt-4 text-sm text-stone-500">
                La voz la convierte en texto el navegador ({idioma === 'es-MX' ? 'español' : 'inglés'}); en Chrome y Edge usa su servicio en
                línea.
              </p>
            </div>
          ) : (
            <form onSubmit={enviarTexto} className="mt-5 rounded-2xl border border-stone-200 p-5">
              <label htmlFor="mensaje" className="font-bold">
                Escribe el mensaje
              </label>
              <textarea
                id="mensaje"
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                rows={5}
                maxLength={300}
                placeholder="Por ejemplo: Hola, ¿cómo estás?"
                className="mt-2 w-full rounded-xl border-2 border-stone-300 p-3 text-lg focus:border-marca-600 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {EJEMPLOS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setBorrador(e)}
                    className="rounded-full border border-stone-300 px-3 py-1 text-sm hover:bg-stone-100"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Boton type="submit" className="mt-4 w-full" disabled={!borrador.trim()}>
                <Play className="size-5" aria-hidden />
                Mostrar en señas
              </Boton>
            </form>
          )}
        </section>

        {/* ── Derecha: texto reconocido y señas ── */}
        <section aria-label="Mensaje en señas" className="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold">Texto reconocido</h2>
          <p className="mt-2 min-h-14 rounded-2xl bg-marca-50/60 p-4 text-xl">{texto || <span className="text-stone-500">Todavía no hay mensaje.</span>}</p>

          <h2 className="mt-5 mb-2 font-bold">En señas · {lengua}</h2>
          <ReproductorSenas key={version} texto={texto} lengua={lengua} />
          <p className="mt-auto pt-5 text-sm text-stone-500">
            Por ahora el mensaje se muestra deletreado letra por letra. Las palabras con seña propia y el avatar llegarán más adelante.
          </p>
        </section>
      </div>
    </>
  )
}
