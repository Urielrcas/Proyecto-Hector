/*
 * PANTALLA: DETALLE DE UN REGISTRO DEL HISTORIAL (/historial/:id)
 * Muestra los mensajes como en una conversación. De cada mensaje se puede:
 *   - escucharlo (voz del navegador),
 *   - verlo en señas (deletreado con el reproductor, arriba).
 * También se puede copiar todo el texto o borrar el registro.
 */

// ▸ Desde Lucide (librería de íconos):
//     íconos: Copy (copiar), Ear (oreja), Hand (mano), Play (reproducir), Trash2 (bote), Volume2 (bocina)
import { Copy, Ear, Hand, Play, Trash2, Volume2 } from 'lucide-react'
// ▸ Desde React:
//     useEffect → cargar el registro al abrir la pantalla
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'
// ▸ Desde React Router:
//     useNavigate → regresar a la lista al borrar
//     useParams → lee el :id de la dirección
import { useNavigate, useParams } from 'react-router-dom'
// ▸ Desde nuestro proyecto: componentes reutilizables
import { Aviso } from '../../components/Aviso'
import { Boton, BotonEnlace } from '../../components/Boton'
import { Dialogo } from '../../components/Dialogo'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { InsigniaTipo } from '../../components/InsigniaTipo'
import { ReproductorSenas } from '../../components/ReproductorSenas'
// ▸ Desde nuestro proyecto: src/hooks/useHistorial.ts:
//     useAlmacenHistorial → dónde está guardado el historial (servidor o navegador)
import { useAlmacenHistorial } from '../../hooks/useHistorial'
// ▸ Desde nuestro proyecto: src/lib/historial.ts:
//     RegistroHistorial → tipo: un registro con sus mensajes
import { fechaHistorial, type RegistroHistorial } from '../../lib/historial'
// ▸ Desde nuestro proyecto: src/lib/voz.ts:
//     hablar → lee un texto en voz alta
//     hayVoz → ¿el navegador puede leer en voz alta?
import { hablar, hayVoz } from '../../lib/voz'

export default function DetalleHistorial() {
  const { id = '' } = useParams()
  const almacen = useAlmacenHistorial()
  const navegar = useNavigate()

  const [registro, setRegistro] = useState<RegistroHistorial | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Mensaje que se está mostrando en señas; «vez» reinicia el reproductor al pedirlo de nuevo.
  const [enSenas, setEnSenas] = useState<{ indice: number; vez: number } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    let vigente = true
    almacen
      .obtener(id)
      .then((r) => vigente && setRegistro(r))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo abrir el registro.'))
    return () => {
      vigente = false
    }
  }, [almacen, id])

  const idioma = registro?.lengua === 'ASL' ? 'en-US' : 'es-MX'
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const copiar = async () => {
    if (!registro) return
    const texto = registro.mensajes.map((m) => `${m.autor === 'sorda' ? 'Señas' : 'Voz'}: ${m.texto}`).join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar el texto.')
    }
  }

  const borrar = async () => {
    setBorrando(true)
    try {
      await almacen.eliminar(id)
      navegar('/historial', { state: { aviso: 'Se borró el registro.' } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar.')
      setBorrando(false)
      setConfirmar(false)
    }
  }

  if (error && !registro) {
    return (
      <>
        <EncabezadoPagina titulo="Historial" volverA="/historial" />
        <div className="space-y-3">
          <Aviso tipo="error">{error}</Aviso>
          <BotonEnlace to="/historial" variante="secundario">
            Volver al historial
          </BotonEnlace>
        </div>
      </>
    )
  }

  if (!registro) {
    return (
      <>
        <EncabezadoPagina titulo="Historial" volverA="/historial" />
        <div className="h-64 animate-pulse rounded-3xl bg-stone-100" />
      </>
    )
  }

  const mensajeEnSenas = enSenas ? registro.mensajes[enSenas.indice] : null

  return (
    <>
      <EncabezadoPagina
        titulo={registro.titulo}
        descripcion={`${fechaHistorial(registro.creado_en)} · ${registro.lengua}`}
        volverA="/historial"
        acciones={
          <div className="flex flex-wrap gap-2">
            <Boton variante="secundario" onClick={copiar}>
              <Copy className="size-5" aria-hidden />
              {copiado ? '¡Copiado!' : 'Copiar texto'}
            </Boton>
            <Boton variante="peligro" onClick={() => setConfirmar(true)}>
              <Trash2 className="size-5" aria-hidden />
              Borrar
            </Boton>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Mensajes ── */}
        <section aria-label="Mensajes" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <InsigniaTipo tipo={registro.tipo} />
          <ol className="mt-4 space-y-3">
            {registro.mensajes.map((m, i) => {
              const sorda = m.autor === 'sorda'
              return (
                <li key={i} className={`flex ${sorda ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${sorda ? 'rounded-bl-md bg-marca-50' : 'rounded-br-md bg-stone-100'} ${
                      enSenas?.indice === i ? 'ring-2 ring-marca-500' : ''
                    }`}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                      {sorda ? <Hand className="size-3.5" aria-hidden /> : <Ear className="size-3.5" aria-hidden />}
                      {sorda ? 'En señas' : 'Con voz o texto'} · {hora(m.hora)}
                    </p>
                    <p className="mt-1 text-lg font-bold break-words">{m.texto}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-marca-800">
                      <button onClick={() => hablar(m.texto, idioma)} disabled={!hayVoz()} className="inline-flex items-center gap-1 hover:underline disabled:opacity-50">
                        <Volume2 className="size-4" aria-hidden />
                        Escuchar
                      </button>
                      <button
                        onClick={() => setEnSenas((a) => ({ indice: i, vez: (a?.vez ?? 0) + 1 }))}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Play className="size-4" aria-hidden />
                        Ver en señas
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── Reproductor en señas ── */}
        <section aria-label="Mensaje en señas" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 font-bold">En señas · {registro.lengua}</h2>
          {mensajeEnSenas ? (
            <>
              <p className="mb-3 rounded-xl bg-marca-50/60 px-4 py-2 break-words">{mensajeEnSenas.texto}</p>
              <ReproductorSenas key={`${enSenas!.indice}-${enSenas!.vez}`} texto={mensajeEnSenas.texto} lengua={registro.lengua} />
            </>
          ) : (
            <p className="py-10 text-center text-stone-500">Toca «Ver en señas» en un mensaje para verlo deletreado.</p>
          )}
        </section>
      </div>

      <Dialogo abierto={confirmar} onCerrar={() => setConfirmar(false)} titulo="Borrar registro">
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
            <Trash2 className="size-8" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-bold">¿Borrar este registro?</h2>
          <p className="mt-1 text-stone-600">Esta acción no se puede deshacer.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Boton variante="secundario" onClick={() => setConfirmar(false)} autoFocus>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={borrar} cargando={borrando}>
              Borrar
            </Boton>
          </div>
        </div>
      </Dialogo>
    </>
  )
}
