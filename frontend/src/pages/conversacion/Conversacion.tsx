/*
 * PANTALLA: MODO CONVERSACIÓN (pantalla dividida para dos personas)
 * Junta los dos traductores para que una persona sorda y una oyente platiquen:
 *   - Persona sorda: deletrea con la cámara (hooks/useDeletreo.ts); al enviar, el mensaje se lee
 *     en voz alta. Ve en señas lo último que dijo la persona oyente (components/ReproductorSenas.tsx).
 *   - Persona oyente: habla (hooks/useReconocimientoVoz.ts) o escribe; ve en grande lo último que
 *     dijo la persona sorda.
 *   - En medio, la conversación completa: cada mensaje se puede volver a escuchar o ver en señas.
 * «Cara a cara» gira el panel de la persona oyente para usar una tableta sobre la mesa, entre las dos.
 * Regla lógica «envío automático» (a ∧ s ∧ t): el mensaje deletreado se envía solo al bajar la mano 3 s.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Delete (borrar ⌫), Ear (oído), Hand (mano), Mic (micrófono), MicOff (micrófono tachado), Plus (más +), RefreshCw (flechas en círculo), RotateCw (girar), Send (enviar), Space (espacio), Square (detener), Volume2 (bocina)
import { Delete, Ear, Hand, Mic, MicOff, Plus, RefreshCw, RotateCw, Send, Space, Square, Volume2 } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (aquí: bajar la conversación al último mensaje)
//     useRef → guarda un valor que NO redibuja la pantalla al cambiar (la lista, opciones para la cámara)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
// ▸ Desde nuestro proyecto: src/components/ReproductorSenas.tsx:
//     ReproductorSenas → muestra un texto en señas, una tras otra
import { ReproductorSenas } from '../../components/ReproductorSenas'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useDeletreo.ts:
//     comoFrase → muestra el texto deletreado como frase normal (Hola mundo)
//     mensajeDeletreo → texto de ayuda según lo que pasa con la mano
//     useDeletreo → reconocimiento de letras con la cámara y el texto que se forma
import { comoFrase, mensajeDeletreo, useDeletreo } from '../../hooks/useDeletreo'
// ▸ Desde nuestro proyecto: src/hooks/useNivelMicrofono.ts:
//     useNivelMicrofono → qué tan fuerte llega la voz (para dibujar las ondas)
import { useNivelMicrofono } from '../../hooks/useNivelMicrofono'
// ▸ Desde nuestro proyecto: src/hooks/useReconocimientoVoz.ts:
//     useReconocimientoVoz → convierte la voz en texto con el navegador
import { useReconocimientoVoz } from '../../hooks/useReconocimientoVoz'
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from '../../lib/almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/lib/navegacion.ts:
//     CONVERSACION → sección del menú «Modo conversación» (título e ícono)
import { CONVERSACION } from '../../lib/navegacion'
// ▸ Desde nuestro proyecto: src/lib/voz.ts:
//     hablar → lee un texto en voz alta
import { hablar } from '../../lib/voz'

/** Tiempo con la mano abajo para enviar solo el mensaje (si está activado). */
const MS_ENVIO_AUTOMATICO = 3000

interface Mensaje {
  id: number
  autor: 'sorda' | 'oyente'
  texto: string
  hora: Date
}

const hora = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export default function Conversacion() {
  const { lengua: lenguaElegida } = useApp()
  const lengua = lenguaElegida ?? 'LSM'
  const idioma: 'es-MX' | 'en-US' = lengua === 'ASL' ? 'en-US' : 'es-MX'

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  // Mensaje que ve la persona sorda en señas; «vez» aumenta cada vez que se pide verlo (reinicia la reproducción).
  const [enSenas, setEnSenas] = useState<{ mensaje: Mensaje; vez: number } | null>(null)
  const verEnSenas = (mensaje: Mensaje) => setEnSenas((antes) => ({ mensaje, vez: (antes?.vez ?? 0) + 1 }))
  const [caraACara, setCaraACara] = useState(() => leer('conversacion.caraACara', false))
  const [envioAutomatico, setEnvioAutomatico] = useState(() => leer('conversacion.envioAutomatico', true))
  const [escrito, setEscrito] = useState('') // lo que escribe la persona oyente
  const siguienteId = useRef(1)
  const finDeLista = useRef<HTMLDivElement>(null)

  const agregar = (autor: Mensaje['autor'], texto: string) => {
    const m: Mensaje = { id: siguienteId.current++, autor, texto, hora: new Date() }
    setMensajes((ms) => [...ms, m])
    return m
  }

  // ── Persona sorda: deletrea con la cámara ──
  const opciones = useRef({ envioAutomatico })
  useEffect(() => {
    opciones.current = { envioAutomatico }
  })
  const d = useDeletreo(lengua, {
    // Regla «envío automático»: a ∧ s ∧ t
    alCadaCuadro: (e, texto) => {
      const a = opciones.current.envioAutomatico
      const s = e.msSinMano >= MS_ENVIO_AUTOMATICO
      const t = texto.trim() !== ''
      if (cumple('envioAutomatico', { a, s, t })) enviarSorda(texto)
    },
  })
  function enviarSorda(texto = d.texto) {
    const frase = comoFrase(texto)
    if (!frase) return
    agregar('sorda', frase)
    hablar(frase, idioma) // la persona oyente lo escucha
    d.limpiar()
  }

  // ── Persona oyente: habla o escribe ──
  const recibirOyente = (texto: string) => {
    verEnSenas(agregar('oyente', texto)) // la persona sorda lo ve en señas
  }
  const voz = useReconocimientoVoz(idioma, recibirOyente)
  const niveles = useNivelMicrofono(voz.escuchando)
  const enviarEscrito = (e: FormEvent) => {
    e.preventDefault()
    if (escrito.trim()) recibirOyente(escrito.trim())
    setEscrito('')
  }

  // Bajar la lista al último mensaje.
  useEffect(() => {
    finDeLista.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mensajes.length])

  const ultimoDeSorda = [...mensajes].reverse().find((m) => m.autor === 'sorda')
  const nuevaConversacion = () => {
    setMensajes([])
    setEnSenas(null)
    d.limpiar()
  }
  const cambiarOpcion = (clave: string, valor: boolean, aplicar: (v: boolean) => void) => {
    aplicar(valor)
    guardar(clave, valor)
  }

  return (
    <>
      <EncabezadoPagina
        titulo={CONVERSACION.titulo}
        descripcion="Pantalla dividida para que una persona sorda y una oyente platiquen."
        icono={CONVERSACION.icono}
        acciones={
          <div className="flex flex-wrap gap-2">
            {/* Solo en celular y tableta: en computadora los paneles van lado a lado */}
            <Boton
              variante="secundario"
              className="xl:hidden"
              aria-pressed={caraACara}
              onClick={() => cambiarOpcion('conversacion.caraACara', !caraACara, setCaraACara)}
              title="Gira el panel de la persona oyente para usar una tableta sobre la mesa"
            >
              <RotateCw className="size-5" aria-hidden />
              Cara a cara{caraACara ? ': sí' : ''}
            </Boton>
            <Boton variante="secundario" onClick={nuevaConversacion} disabled={!mensajes.length && !d.texto}>
              <RefreshCw className="size-5" aria-hidden />
              Nueva conversación
            </Boton>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)_minmax(0,1fr)]">
        {/* ═════ Persona oyente (arriba en celular/tableta; a la derecha en computadora) ═════ */}
        <section
          aria-labelledby="titulo-oyente"
          className={`order-1 rounded-3xl border-2 border-stone-200 bg-white p-5 shadow-sm xl:order-3 ${caraACara ? 'rotate-180 xl:rotate-0' : ''}`}
        >
          <h2 id="titulo-oyente" className="flex items-center gap-2 text-lg font-bold">
            <Ear className="size-6 text-stone-600" aria-hidden /> Persona oyente · voz
          </h2>

          <p className="mt-4 text-sm font-bold text-stone-600">La persona sorda dice:</p>
          <div className="mt-1 flex min-h-20 items-center gap-3 rounded-2xl bg-marca-50/60 p-4">
            <p className="flex-1 text-2xl font-bold break-words">{ultimoDeSorda?.texto ?? <span className="text-lg font-normal text-stone-500">Aún nada.</span>}</p>
            {ultimoDeSorda && (
              <button
                onClick={() => hablar(ultimoDeSorda.texto, idioma)}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-marca-800 hover:bg-marca-100"
                aria-label="Escuchar otra vez"
                title="Escuchar otra vez"
              >
                <Volume2 className="size-5" />
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={() => (voz.escuchando ? voz.detener() : voz.iniciar())}
              disabled={!voz.soportado}
              aria-pressed={voz.escuchando}
              aria-label={voz.escuchando ? 'Dejar de escuchar' : 'Presiona y habla'}
              className={`grid size-20 shrink-0 place-items-center rounded-full border-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                voz.escuchando ? 'border-red-200 bg-red-600 text-white hover:bg-red-700' : 'border-marca-100 bg-marca-50 text-marca-800 hover:bg-marca-100'
              }`}
            >
              {!voz.soportado ? <MicOff className="size-9" /> : voz.escuchando ? <Square className="size-8 fill-current" /> : <Mic className="size-9" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{voz.escuchando ? 'Te escucho…' : 'Presiona el micrófono y habla'}</p>
              {/* Ondas: la altura de cada barra es el volumen de la voz */}
              <div className="mt-2 flex h-10 items-center gap-0.5" aria-hidden>
                {niveles.map((n, i) => (
                  <span key={i} className={`w-1 rounded-full ${voz.escuchando ? 'bg-marca-600' : 'bg-stone-300'}`} style={{ height: `${Math.max(4, n * 40)}px` }} />
                ))}
              </div>
            </div>
          </div>
          {voz.parcial && voz.escuchando && <p className="mt-2 text-lg text-stone-700">{voz.parcial}</p>}
          {voz.error && voz.error !== 'sin-voz' && (
            <div className="mt-3">
              <Aviso tipo="error">
                {voz.error === 'sin-soporte'
                  ? 'Este navegador no convierte la voz en texto (usa Chrome o Edge). Puedes escribir el mensaje.'
                  : voz.error === 'sin-permiso'
                    ? 'No hay permiso para usar el micrófono.'
                    : 'No se pudo reconocer la voz. Inténtalo de nuevo o escribe el mensaje.'}
              </Aviso>
            </div>
          )}

          <form onSubmit={enviarEscrito} className="mt-4 flex gap-2">
            <label htmlFor="escrito" className="sr-only">
              O escribe el mensaje
            </label>
            <input
              id="escrito"
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              maxLength={200}
              placeholder="O escribe aquí…"
              className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-stone-300 px-4 focus:border-marca-600 focus:outline-none"
            />
            <Boton type="submit" disabled={!escrito.trim()} aria-label="Enviar mensaje escrito">
              <Send className="size-5" aria-hidden />
            </Boton>
          </form>
        </section>

        {/* ═════ Conversación (en medio) ═════ */}
        <section aria-labelledby="titulo-conversacion" className="order-2 flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 id="titulo-conversacion" className="text-lg font-bold">
            Conversación
          </h2>
          <div className="mt-3 max-h-[28rem] min-h-40 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {mensajes.length === 0 && <p className="text-stone-500">Aquí aparecerán los mensajes de las dos personas.</p>}
            {mensajes.map((m) => (
              <div key={m.id} className={`flex ${m.autor === 'sorda' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${m.autor === 'sorda' ? 'rounded-bl-sm bg-marca-100 text-marca-950' : 'rounded-br-sm bg-stone-100 text-stone-900'}`}>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                    {m.autor === 'sorda' ? <Hand className="size-3.5" aria-hidden /> : <Ear className="size-3.5" aria-hidden />}
                    {m.autor === 'sorda' ? 'Persona sorda' : 'Persona oyente'} · {hora(m.hora)}
                  </p>
                  <p className="mt-0.5 text-lg break-words">{m.texto}</p>
                  {/* Volver a escuchar (sorda) o volver a ver en señas (oyente) */}
                  {m.autor === 'sorda' ? (
                    <button onClick={() => hablar(m.texto, idioma)} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-marca-800 hover:underline">
                      <Volume2 className="size-4" aria-hidden /> Escuchar
                    </button>
                  ) : (
                    <button onClick={() => verEnSenas(m)} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-marca-800 hover:underline">
                      <Hand className="size-4" aria-hidden /> Ver en señas
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={finDeLista} />
          </div>
        </section>

        {/* ═════ Persona sorda (abajo en celular/tableta; a la izquierda en computadora) ═════ */}
        <section aria-labelledby="titulo-sorda" className="order-3 rounded-3xl border-2 border-marca-200 bg-white p-5 shadow-sm xl:order-1">
          <h2 id="titulo-sorda" className="flex items-center gap-2 text-lg font-bold">
            <Hand className="size-6 text-marca-700" aria-hidden /> Persona sorda · señas
          </h2>

          <p className="mt-4 text-sm font-bold text-stone-600">
            {enSenas ? `La persona oyente dice: «${enSenas.mensaje.texto}»` : 'Aquí verás en señas lo que diga la persona oyente.'}
          </p>
          <div className="mt-2">
            {/* key: cada mensaje (o «Ver en señas») vuelve a empezar la reproducción */}
            <ReproductorSenas key={enSenas?.vez ?? 0} texto={enSenas?.mensaje.texto ?? ''} lengua={lengua} compacto />
          </div>

          <p className="mt-5 text-sm font-bold text-stone-600">Tu mensaje (deletrea con la cámara):</p>
          {/* En tableta, cámara y texto lado a lado; en computadora el panel es angosto: uno debajo del otro */}
          <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] xl:grid-cols-1">
            <CamaraManos alDetectar={d.alDetectar} borde={d.resaltada ? 'exito' : 'neutro'} />
            <div className="flex flex-col">
              <p className="min-h-16 rounded-2xl bg-marca-50/60 p-3 text-2xl font-bold break-words">
                {d.texto ? comoFrase(d.texto) : <span className="text-base font-normal text-stone-500">Lo que deletrees aparecerá aquí.</span>}
                {d.resaltada && <span className="ml-2 rounded-md bg-emerald-100 px-1.5 text-base text-emerald-800">+{d.resaltada.letra}</span>}
              </p>
              <p className="mt-2 text-sm text-stone-700" aria-live="polite">
                {mensajeDeletreo(d.estado)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Boton onClick={() => enviarSorda()} disabled={!d.texto.trim()} className="col-span-2 sm:col-span-1">
              <Send className="size-5" aria-hidden />
              Enviar
            </Boton>
            <Boton variante="secundario" onClick={d.agregarCandidata} disabled={!d.candidata}>
              <Plus className="size-5" aria-hidden />
              {d.candidata ? d.candidata.letra : 'Letra'}
            </Boton>
            <Boton variante="secundario" onClick={d.agregarEspacio} disabled={!d.texto || d.texto.endsWith(' ')} aria-label="Espacio">
              <Space className="size-5" aria-hidden />
            </Boton>
            <Boton variante="secundario" onClick={d.borrar} disabled={!d.texto} aria-label="Borrar letra">
              <Delete className="size-5" aria-hidden />
            </Boton>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              className="size-5 accent-marca-700"
              checked={envioAutomatico}
              onChange={(e) => cambiarOpcion('conversacion.envioAutomatico', e.target.checked, setEnvioAutomatico)}
            />
            Enviar solo al bajar la mano 3 segundos
          </label>
        </section>
      </div>
    </>
  )
}
