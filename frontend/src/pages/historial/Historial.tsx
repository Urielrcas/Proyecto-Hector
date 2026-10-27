/*
 * PANTALLA: HISTORIAL
 * Lista las traducciones y conversaciones guardadas (lo más reciente primero), con:
 *   - buscador (busca dentro del texto de los mensajes),
 *   - filtro por tipo (Señas → Texto, Voz → Señas, Conversación),
 *   - paginación, botón para ver cada registro, borrar uno y borrar todo.
 * Con cuenta se guarda en el servidor; como invitado, solo en este navegador.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ChevronLeft/ChevronRight (flechas), Eye (ojo), History (reloj), Search (lupa), Trash2 (bote), X (tache)
import { ChevronLeft, ChevronRight, Eye, History, Search, Trash2, X } from 'lucide-react'
// ▸ Desde React:
//     useEffect → ejecuta código después de dibujar (cargar datos)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'
// ▸ Desde React Router:
//     Link → enlace a otra pantalla
//     useLocation / useNavigate → leer el aviso que manda el detalle al borrar
import { Link, useLocation, useNavigate } from 'react-router-dom'
// ▸ Desde nuestro proyecto: componentes reutilizables
import { Aviso } from '../../components/Aviso'
import { Boton } from '../../components/Boton'
import { Dialogo } from '../../components/Dialogo'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { InsigniaTipo } from '../../components/InsigniaTipo'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → saber si hay cuenta o es invitado
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useConfiguracion.ts:
//     useConfiguracion → saber si el historial está activado
import { useConfiguracion } from '../../hooks/useConfiguracion'
// ▸ Desde nuestro proyecto: src/hooks/useHistorial.ts:
//     useAlmacenHistorial → dónde está guardado el historial (servidor o navegador)
import { useAlmacenHistorial } from '../../hooks/useHistorial'
// ▸ Desde nuestro proyecto: src/lib/historial.ts:
//     fechaHistorial → fecha legible;  TIPOS_HISTORIAL → nombre de cada tipo
//     ResumenHistorial, TipoHistorial → tipos
import { fechaHistorial, TIPOS_HISTORIAL, type ResumenHistorial, type TipoHistorial } from '../../lib/historial'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Pagina → tipo: resultado paginado
import type { Pagina } from '../../lib/tipos'

const POR_PAGINA = 10

export default function Historial() {
  const { usuario } = useApp()
  const { config } = useConfiguracion()
  const almacen = useAlmacenHistorial()
  const location = useLocation()
  const navegar = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [tipo, setTipo] = useState<TipoHistorial | ''>('')
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<Pagina<ResumenHistorial> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)
  // Aviso verde (p. ej. «Se borró el registro.»); puede venir de la pantalla de detalle.
  const [aviso, setAviso] = useState<string | null>((location.state as { aviso?: string } | null)?.aviso ?? null)
  // Diálogo de borrar: un registro o «todo».
  const [aBorrar, setABorrar] = useState<ResumenHistorial | 'todo' | null>(null)
  const [borrando, setBorrando] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)

  // Quitar el aviso de la dirección (para que no vuelva a salir al recargar).
  useEffect(() => {
    if (location.state) navegar('.', { replace: true, state: null })
  }, [location.state, navegar])

  // Buscar 300 ms después de que se deja de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // Pedir la lista cada vez que cambia la búsqueda, el tipo o la página.
  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    almacen
      .listar({ buscar: busquedaAplicada, tipo, pagina, porPagina: POR_PAGINA })
      .then((r) => {
        if (!vigente) return
        if (r.items.length === 0 && pagina > 1) setPagina(pagina - 1)
        else setDatos(r)
      })
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [almacen, busquedaAplicada, tipo, pagina, recargar])

  const confirmarBorrar = async () => {
    if (!aBorrar) return
    setBorrando(true)
    setErrorBorrar(null)
    try {
      if (aBorrar === 'todo') {
        await almacen.eliminarTodo()
        setAviso('Se borró todo tu historial.')
      } else {
        await almacen.eliminar(aBorrar.id)
        setAviso('Se borró el registro.')
      }
      setABorrar(null)
      setRecargar((n) => n + 1)
    } catch (e) {
      setErrorBorrar(e instanceof Error ? e.message : 'No se pudo borrar.')
    } finally {
      setBorrando(false)
    }
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1
  const hayFiltro = !!busquedaAplicada || !!tipo

  return (
    <>
      <EncabezadoPagina
        titulo="Historial"
        descripcion={usuario ? 'Tus traducciones y conversaciones guardadas.' : 'Como invitado, tu historial se guarda solo en este navegador.'}
        icono={History}
        acciones={
          datos && datos.total > 0 && !hayFiltro ? (
            <Boton variante="secundario" onClick={() => setABorrar('todo')}>
              <Trash2 className="size-5" aria-hidden />
              Borrar todo
            </Boton>
          ) : undefined
        }
      />

      {!config.guardarHistorial && (
        <div className="mb-4">
          <Aviso tipo="error">
            El historial está desactivado: las nuevas traducciones no se guardan.{' '}
            <Link to="/configuracion" className="font-bold underline">
              Activarlo en Configuración
            </Link>
          </Aviso>
        </div>
      )}

      {aviso && (
        <div className="mb-4 flex items-start gap-2">
          <div className="flex-1">
            <Aviso tipo="exito">{aviso}</Aviso>
          </div>
          <button onClick={() => setAviso(null)} className="grid size-11 place-items-center rounded-xl text-stone-600 hover:bg-stone-200" aria-label="Cerrar aviso">
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Buscador y filtro por tipo */}
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <label htmlFor="buscar-historial" className="sr-only">
              Buscar en el historial
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
            <input
              id="buscar-historial"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar una palabra o frase…"
              className="min-h-12 w-full rounded-xl border-2 border-stone-300 bg-white py-3 pr-4 pl-12 focus:border-marca-600 focus:outline-none"
            />
          </div>
          <div role="radiogroup" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
            {([['', 'Todos'], ...Object.entries(TIPOS_HISTORIAL)] as [TipoHistorial | '', string][]).map(([valor, nombre]) => (
              <button
                key={valor || 'todos'}
                role="radio"
                aria-checked={tipo === valor}
                onClick={() => {
                  setTipo(valor)
                  setPagina(1)
                }}
                className={`min-h-12 rounded-xl border-2 px-4 font-bold transition-colors ${
                  tipo === valor ? 'border-marca-700 bg-marca-700 text-white' : 'border-stone-200 text-stone-700 hover:border-marca-300'
                }`}
              >
                {nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido: error → cargando → vacío → lista */}
        <div className="mt-5" aria-live="polite" aria-busy={cargando}>
          {error ? (
            <div className="space-y-3">
              <Aviso tipo="error">{error}</Aviso>
              <Boton variante="secundario" onClick={() => setRecargar((n) => n + 1)}>
                Reintentar
              </Boton>
            </div>
          ) : !datos ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : datos.items.length === 0 ? (
            <div className="py-10 text-center text-stone-600">
              {hayFiltro ? (
                <p>No hay registros que coincidan con la búsqueda.</p>
              ) : (
                <>
                  <p className="font-bold text-stone-800">Todavía no hay nada en tu historial.</p>
                  <p className="mt-1">Lo que traduzcas en Señas → Texto, Voz → Señas o en el Modo conversación aparecerá aquí.</p>
                </>
              )}
            </div>
          ) : (
            <ul className={`divide-y divide-stone-100 transition-opacity ${cargando ? 'opacity-50' : ''}`}>
              {datos.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                  <Link to={`/historial/${encodeURIComponent(r.id)}`} className="min-w-0 flex-1 rounded-xl p-1 hover:bg-stone-50">
                    <span className="flex flex-wrap items-center gap-2">
                      <InsigniaTipo tipo={r.tipo} />
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-sm font-bold text-stone-700">{r.lengua}</span>
                      <span className="text-sm text-stone-500">{fechaHistorial(r.actualizado_en)}</span>
                    </span>
                    <span className="mt-1.5 block truncate text-lg font-bold">{r.titulo}</span>
                    <span className="block text-sm text-stone-600">
                      {r.total_mensajes} {r.total_mensajes === 1 ? 'mensaje' : 'mensajes'}
                    </span>
                  </Link>
                  <div className="flex gap-1">
                    <Link
                      to={`/historial/${encodeURIComponent(r.id)}`}
                      className="grid size-11 place-items-center rounded-xl text-marca-800 hover:bg-marca-50"
                      aria-label={`Ver «${r.titulo}»`}
                      title="Ver"
                    >
                      <Eye className="size-5" />
                    </Link>
                    <button
                      onClick={() => setABorrar(r)}
                      className="grid size-11 place-items-center rounded-xl text-red-700 hover:bg-red-50"
                      aria-label={`Borrar «${r.titulo}»`}
                      title="Borrar"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pie: total y paginación */}
        {datos && datos.total > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <p className="text-stone-600">
              {datos.total} {datos.total === 1 ? 'registro' : 'registros'}
            </p>
            {totalPaginas > 1 && (
              <nav aria-label="Paginación" className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(pagina - 1)}
                  disabled={pagina === 1}
                  className="grid size-10 place-items-center rounded-lg border-2 border-stone-200 hover:bg-stone-50 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="font-bold tabular-nums">
                  {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(pagina + 1)}
                  disabled={pagina === totalPaginas}
                  className="grid size-10 place-items-center rounded-lg border-2 border-stone-200 hover:bg-stone-50 disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="size-5" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Confirmación para borrar uno o todo */}
      <Dialogo
        abierto={aBorrar !== null}
        onCerrar={() => {
          setABorrar(null)
          setErrorBorrar(null)
        }}
        titulo="Borrar del historial"
      >
        {aBorrar && (
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
              <Trash2 className="size-8" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-bold">{aBorrar === 'todo' ? '¿Borrar todo tu historial?' : '¿Borrar este registro?'}</h2>
            <p className="mt-1 text-stone-600">Esta acción no se puede deshacer.</p>
            {aBorrar !== 'todo' && <p className="mt-4 rounded-2xl bg-stone-50 p-4 font-bold break-words">{aBorrar.titulo}</p>}
            {errorBorrar && (
              <div className="mt-4 text-left">
                <Aviso tipo="error">{errorBorrar}</Aviso>
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Boton variante="secundario" onClick={() => setABorrar(null)} autoFocus>
                Cancelar
              </Boton>
              <Boton variante="peligro" onClick={confirmarBorrar} cargando={borrando}>
                <Trash2 className="size-5" aria-hidden />
                Borrar
              </Boton>
            </div>
          </div>
        )}
      </Dialogo>
    </>
  )
}
