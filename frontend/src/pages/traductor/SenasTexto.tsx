/*
 * PANTALLA: TRADUCTOR SEÑAS → TEXTO Y VOZ
 * La persona deletrea con el alfabeto dactilológico (LSM o ASL) frente a la cámara y la app
 * escribe cada letra reconocida, forma las palabras y las lee en voz alta.
 *   - Izquierda: la cámara y los botones para corregir (agregar la letra que se ve, espacio, borrar, limpiar).
 *   - Derecha: la seña reconocida, el texto resultante, el nivel de confianza y «Reproducir voz».
 * El reconocimiento lo hace hooks/useDeletreo.ts (con lib/vision/reconocedor.ts y las reglas lógicas «letra reconocida» y
 * «espacio de palabra»). Por ahora reconoce el deletreo; las palabras completas (HOLA, GRACIAS...)
 * llegarán con el modelo entrenado.
 * «Corregir frase» manda lo deletreado al backend, que usa Ollama para separar palabras y poner acentos
 * y signos ("HOLACOMO ESTAS" → "Hola, ¿cómo estás?"); «Reproducir voz» lee entonces la frase corregida.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Delete (borrar ⌫), Hand (mano), Plus (más +), Space (barra espaciadora), SpellCheck (revisar ortografía), Trash2 (bote de basura), Volume2 (bocina)
import { Delete, Hand, Plus, Space, SpellCheck, Trash2, Volume2 } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CamaraManos.tsx:
//     CamaraManos → video de la cámara con la mano dibujada encima
import { CamaraManos } from '../../components/CamaraManos'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: IA (red neuronal convolucional y autocorrector):
//     AvisoCorreccion → «La IA corrigió X → Y · Deshacer»;  LoQueVeLaIA → lo que cree la red neuronal
//     useIADeletreo → la red y el autocorrector listos para el deletreo
import { AvisoCorreccion, LoQueVeLaIA } from '../../components/ia/PiezasIA'
import { useIADeletreo } from '../../hooks/useIADeletreo'
// ▸ Desde nuestro proyecto: src/components/IndicadorHistorial.tsx:
//     IndicadorHistorial → avisa si la traducción ya se guardó en el Historial
import { IndicadorHistorial } from '../../components/IndicadorHistorial'
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
// ▸ Desde nuestro proyecto: src/hooks/useHistorial.ts:
//     useGuardadoHistorial → guarda esta traducción en el Historial mientras se usa la pantalla
import { useGuardadoHistorial } from '../../hooks/useHistorial'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from '../../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../../lib/api'
// ▸ Desde nuestro proyecto: src/lib/voz.ts:
//     hablar → lee un texto en voz alta
//     hayVoz → ¿el navegador puede leer en voz alta?
import { hablar, hayVoz } from '../../lib/voz'
// ▸ Desde nuestro proyecto: src/services/frase.ts:
//     corregirFrase → pide al backend (Ollama) la frase bien escrita
//     FraseCorregida → tipo: la frase corregida que responde el backend
import { corregirFrase, type FraseCorregida } from '../../services/frase'

export default function SenasTexto() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const idiomaVoz: 'es-MX' | 'en-US' = lengua === 'ASL' ? 'en-US' : 'es-MX' // las palabras deletreadas en ASL son en inglés
  const [leerPalabras, setLeerPalabras] = useState(() => leer('traductor.leerPalabras', true)) // leer cada palabra al terminarla

  // El reconocimiento de letras y el texto que se forma (hooks/useDeletreo.ts).
  // IA: la red neuronal ayuda a reconocer y el autocorrector arregla las palabras al terminarlas.
  const ia = useIADeletreo()
  const d = useDeletreo(lengua, {
    // Al terminar una palabra, leerla en voz alta (si está activada la opción).
    alTerminarPalabra: (palabra) => leerPalabras && hablar(palabra.toLowerCase(), idiomaVoz),
    clasificar: ia.clasificar,
    corrector: ia.corrector,
    memoria: ia.memoria,
  })
  const { texto, estado, resaltada, candidata, confianza } = d

  const cambiarLeerPalabras = (valor: boolean) => {
    setLeerPalabras(valor)
    guardar('traductor.leerPalabras', valor)
  }

  // Lo que se muestra en «Seña reconocida»: la letra recién escrita o la que se ve ahora.
  const mostrada = resaltada ?? candidata

  // ── Corrector de frases (Ollama) ──
  // Cada resultado recuerda para qué texto se pidió: si se sigue deletreando, deja de mostrarse.
  const [correccion, setCorreccion] = useState<{ para: string; datos: FraseCorregida } | null>(null)
  const [errorCorreccion, setErrorCorreccion] = useState<{ para: string; mensaje: string } | null>(null)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const vigente = correccion?.para === texto ? correccion.datos : null
  const errorVigente = errorCorreccion?.para === texto ? errorCorreccion.mensaje : null
  // Lo que se lee en voz alta: la frase corregida si la hay; si no, lo deletreado.
  const fraseFinal = vigente?.corregida ? vigente.frase : comoFrase(texto)

  // Historial: lo deletreado se guarda solo; al presionar «Limpiar» empieza un registro nuevo.
  const historial = useGuardadoHistorial('senas-texto', texto.trim() ? [{ autor: 'sorda', texto: fraseFinal }] : [])

  // Botón «Corregir frase»
  const corregir = async () => {
    const para = texto
    setCorrigiendo(true)
    setErrorCorreccion(null)
    try {
      setCorreccion({ para, datos: await corregirFrase(para, lengua) })
    } catch (err) {
      setErrorCorreccion({ para, mensaje: err instanceof ErrorApi ? err.message : 'No se pudo corregir la frase.' })
    } finally {
      setCorrigiendo(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Señas → Texto y voz"
        descripcion={`Deletrea con el alfabeto de ${lengua} frente a la cámara: cada letra se escribe sola.`}
        icono={Hand}
      />
      <div className="-mt-3 mb-4 sm:-mt-5">
        <IndicadorHistorial estado={historial.estado} />
      </div>

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
          <LoQueVeLaIA ia={estado?.ia} personal={estado?.personal} entrenando={ia.entrenando} activa={!!ia.clasificar || !!ia.entrenando} />
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
          <AvisoCorreccion correccion={d.correccion} alDeshacer={d.deshacerCorreccion} alAceptar={d.aceptarSugerencia} alCerrar={d.descartarCorreccion} />

          {/* Corregir con Ollama: separa palabras y pone acentos y signos */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Boton variante="secundario" onClick={corregir} cargando={corrigiendo} disabled={!texto.trim() || !!vigente}>
              <SpellCheck className="size-5" aria-hidden />
              Corregir frase
            </Boton>
            <span className="text-sm text-stone-600">Separa las palabras y pone acentos y signos.</span>
          </div>
          {vigente?.corregida && (
            <div className="mt-3 rounded-2xl border-2 border-marca-200 bg-white p-4" aria-live="polite">
              <p className="text-sm font-bold text-marca-800">Frase corregida</p>
              <p className="mt-1 text-2xl font-bold break-words text-stone-900">{vigente.frase}</p>
              <p className="mt-1 text-xs text-stone-500">Corregida con Ollama ({vigente.modelo}). Revisa que diga lo que quisiste decir.</p>
            </div>
          )}
          {vigente && !vigente.corregida && (
            <p className="mt-3 rounded-xl bg-stone-50 px-4 py-3 text-stone-700" aria-live="polite">
              No se encontró una corrección segura: se deja el texto como lo deletreaste.
            </p>
          )}
          {errorVigente && (
            <div className="mt-3">
              <Aviso tipo="error">{errorVigente}</Aviso>
            </div>
          )}

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
            <Boton className="w-full" onClick={() => hablar(fraseFinal, idiomaVoz)} disabled={!texto.trim() || !hayVoz()}>
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
          <li>
            Al terminar, «Corregir frase» separa las palabras pegadas y pone acentos y signos («HOLACOMO ESTAS» → «Hola, ¿cómo estás?»).
          </li>
        </ul>
        <p className="mt-3 text-sm text-stone-600">
          El reconocimiento es aproximado y se basa en la posición de tus dedos. Las palabras completas (hola, gracias...) llegarán con el
          modelo entrenado.
        </p>
      </details>
    </>
  )
}
