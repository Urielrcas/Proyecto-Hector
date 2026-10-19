/*
 * PANTALLA: TRADUCTOR SEÑAS → TEXTO Y VOZ
 * La persona deletrea con el alfabeto dactilológico (LSM o ASL) frente a la cámara y la app
 * escribe cada letra reconocida, forma las palabras y las lee en voz alta.
 *   - Izquierda: la cámara y los botones para corregir (agregar la letra que se ve, espacio, borrar, limpiar).
 *   - Derecha: la seña reconocida, el texto resultante, el nivel de confianza y «Reproducir voz».
 * El reconocimiento lo hace hooks/useDeletreo.ts (con lib/vision/reconocedor.ts y las reglas lógicas «letra reconocida» y
 * «espacio de palabra»). Por ahora reconoce el deletreo; las palabras completas (HOLA, GRACIAS...)
 * llegarán con el modelo entrenado.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Delete (borrar ⌫), Hand (mano), Plus (más +), Space (barra espaciadora), Trash2 (bote de basura), Volume2 (bocina)
import { Delete, Hand, Plus, Space, Trash2, Volume2 } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CamaraManos.tsx:
//     CamaraManos → video de la cámara con la mano dibujada encima
import { CamaraManos } from '../../components/CamaraManos'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/components/ManoIlustrada.tsx:
//     ManoIlustrada → dibujo de la mano de una letra
import { ManoIlustrada } from '../../components/ManoIlustrada'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useDeletreo.ts:
//     comoFrase → muestra el texto deletreado como frase normal (Hola mundo)
//     mensajeDeletreo → texto de ayuda según lo que pasa con la mano
//     useDeletreo → reconocimiento de letras con la cámara y el texto que se forma
import { comoFrase, mensajeDeletreo, useDeletreo } from '../../hooks/useDeletreo'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from '../../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/voz.ts:
//     hablar → lee un texto en voz alta
//     hayVoz → ¿el navegador puede leer en voz alta?
import { hablar, hayVoz } from '../../lib/voz'

export default function SenasTexto() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const idiomaVoz: 'es-MX' | 'en-US' = lengua === 'ASL' ? 'en-US' : 'es-MX' // las palabras deletreadas en ASL son en inglés
  const [leerPalabras, setLeerPalabras] = useState(() => leer('traductor.leerPalabras', true)) // leer cada palabra al terminarla

  // El reconocimiento de letras y el texto que se forma (hooks/useDeletreo.ts).
  const d = useDeletreo(lengua, {
    // Al terminar una palabra, leerla en voz alta (si está activada la opción).
    alTerminarPalabra: (palabra) => leerPalabras && hablar(palabra.toLowerCase(), idiomaVoz),
  })
  const { texto, estado, resaltada, candidata, confianza } = d

  const cambiarLeerPalabras = (valor: boolean) => {
    setLeerPalabras(valor)
    guardar('traductor.leerPalabras', valor)
  }

  // Lo que se muestra en «Seña reconocida»: la letra recién escrita o la que se ve ahora.
  const mostrada = resaltada ?? candidata

  return (
    <>
      <EncabezadoPagina
        titulo="Señas → Texto y voz"
        descripcion={`Deletrea con el alfabeto de ${lengua} frente a la cámara: cada letra se escribe sola.`}
        icono={Hand}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Izquierda: cámara y botones para corregir ── */}
        <section aria-labelledby="titulo-camara" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="titulo-camara" className="sr-only">
            Cámara
          </h2>
          <CamaraManos alDetectar={d.alDetectar} borde={resaltada ? 'exito' : 'neutro'} />
          <p className="mt-3 min-h-12 rounded-xl bg-stone-50 px-4 py-3 font-bold text-stone-800" aria-live="polite">
            {mensajeDeletreo(estado)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Boton onClick={d.agregarCandidata} disabled={!candidata} title="Escribe la letra que se ve ahora, sin esperar">
              <Plus className="size-5" aria-hidden />
              {candidata ? `Agregar ${candidata.letra}` : 'Agregar'}
            </Boton>
            <Boton variante="secundario" onClick={d.agregarEspacio} disabled={!texto || texto.endsWith(' ')}>
              <Space className="size-5" aria-hidden />
              Espacio
            </Boton>
            <Boton variante="secundario" onClick={d.borrar} disabled={!texto}>
              <Delete className="size-5" aria-hidden />
              Borrar
            </Boton>
            <Boton variante="secundario" onClick={d.limpiar} disabled={!texto}>
              <Trash2 className="size-5" aria-hidden />
              Limpiar
            </Boton>
          </div>
        </section>

        {/* ── Derecha: seña reconocida, texto resultante, confianza y voz ── */}
        <section aria-labelledby="titulo-resultado" className="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="titulo-resultado" className="sr-only">
            Resultado
          </h2>

          <h3 className="font-bold">Seña reconocida</h3>
          <div
            className={`mt-2 flex min-h-28 items-center gap-4 rounded-2xl border-2 p-4 transition-colors ${
              resaltada ? 'border-emerald-400 bg-emerald-50' : 'border-transparent bg-marca-50/60'
            }`}
          >
            {mostrada ? (
              <>
                <span className="w-16 text-center text-6xl font-bold text-marca-900">{mostrada.letra}</span>
                <span className="size-20 shrink-0">
                  <ManoIlustrada forma={mostrada.forma} etiqueta={`Dibujo de la letra ${mostrada.letra}`} />
                </span>
                <span className="text-stone-600">{resaltada ? 'Escrita' : 'Se ve en la cámara'}</span>
              </>
            ) : (
              <span className="text-stone-500">Todavía no se reconoce ninguna letra.</span>
            )}
          </div>

          <h3 className="mt-5 font-bold">Texto resultante</h3>
          <p className="mt-2 min-h-24 rounded-2xl bg-marca-50/60 p-4 text-3xl font-bold break-words text-stone-900" aria-live="polite">
            {texto ? comoFrase(texto) : <span className="text-lg font-normal text-stone-500">Aquí aparecerá lo que deletrees.</span>}
            <span className="ml-0.5 inline-block h-8 w-0.5 animate-pulse bg-marca-700 align-middle" aria-hidden />
          </p>

          <div className="mt-5 flex items-center justify-between text-sm">
            <h3 className="font-bold">Nivel de confianza</h3>
            <span className="font-bold tabular-nums">{confianza} %</span>
          </div>
          <div
            className="mt-1.5 h-3 overflow-hidden rounded-full bg-stone-200"
            role="progressbar"
            aria-valuenow={confianza}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Nivel de confianza de la seña"
          >
            <div className="h-full rounded-full bg-marca-600 transition-all" style={{ width: `${confianza}%` }} />
          </div>
          <p className="mt-1 text-sm text-stone-600">Qué tan estable se ha visto la letra en el último medio segundo.</p>

          <div className="mt-auto pt-6">
            <Boton className="w-full" onClick={() => hablar(comoFrase(texto), idiomaVoz)} disabled={!texto.trim() || !hayVoz()}>
              <Volume2 className="size-5" aria-hidden />
              Reproducir voz
            </Boton>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-stone-700">
              <input
                type="checkbox"
                className="size-5 accent-marca-700"
                checked={leerPalabras}
                onChange={(e) => cambiarLeerPalabras(e.target.checked)}
              />
              Leer cada palabra en voz alta al terminarla
            </label>
          </div>
        </section>
      </div>

      {/* Cómo deletrear (se puede abrir y cerrar) */}
      <details className="mt-6 rounded-2xl border border-marca-200 bg-marca-50/60 p-4 sm:p-5">
        <summary className="cursor-pointer font-bold text-marca-900">¿Cómo deletrear?</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-700">
          <li>Haz cada letra y mantén la mano quieta un momento: se escribe sola y el recuadro se pone verde.</li>
          <li>Las letras con movimiento (como J o Z en LSM) se escriben al hacer su movimiento.</li>
          <li>
            Si una forma sirve para dos letras (I y J, N y Ñ, K y P), quieta es la primera; con el movimiento, la segunda.
          </li>
          <li>Para terminar una palabra, baja la mano un segundo y medio: se agrega el espacio y se lee en voz alta.</li>
          <li>Para repetir una letra (como la L de «calle»), baja la mano un instante y vuelve a hacerla.</li>
          <li>Si la app no escribe una letra, usa «Agregar» para escribir la que se ve en la cámara.</li>
        </ul>
        <p className="mt-3 text-sm text-stone-600">
          El reconocimiento es aproximado y se basa en la posición de tus dedos. Las palabras completas (hola, gracias...) llegarán con el
          modelo entrenado.
        </p>
      </details>
    </>
  )
}
