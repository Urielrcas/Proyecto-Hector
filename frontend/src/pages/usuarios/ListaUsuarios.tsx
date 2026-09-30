import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, UserCog, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Aviso } from '../../components/Aviso'
import { Boton, BotonEnlace } from '../../components/Boton'
import { Dialogo } from '../../components/Dialogo'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useApp } from '../../context/AppContext'
import { ErrorApi } from '../../lib/api'
import { ESTADOS, ROLES, type Pagina, type Usuario } from '../../lib/tipos'
import { eliminarUsuario, listarUsuarios } from '../../services/usuarios'

const POR_PAGINA = 10

function Insignia({ activo, children }: { activo: boolean; children: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${
        activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
      }`}
    >
      <span className={`size-2 rounded-full ${activo ? 'bg-emerald-600' : 'bg-red-600'}`} aria-hidden />
      {children}
    </span>
  )
}

function BotonesAccion({ usuario, esYo, onEliminar }: { usuario: Usuario; esYo: boolean; onEliminar: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Link
        to={`/usuarios/${usuario.id}/editar`}
        className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
        aria-label={`Editar a ${usuario.nombre}`}
        title="Editar"
      >
        <Pencil className="size-5" />
      </Link>
      <button
        onClick={onEliminar}
        disabled={esYo}
        className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={esYo ? 'No puedes eliminar tu propia cuenta' : `Eliminar a ${usuario.nombre}`}
        title={esYo ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
      >
        <Trash2 className="size-5" />
      </button>
    </div>
  )
}

function numerosDePagina(actual: number, total: number): number[] {
  const inicio = Math.max(1, Math.min(actual - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i)
}

export default function ListaUsuarios() {
  const { usuario: yo } = useApp()
  const location = useLocation()
  const navegar = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<Pagina<Usuario> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  const [aviso, setAviso] = useState<string | null>((location.state as { aviso?: string } | null)?.aviso ?? null)
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  // Quitar el aviso del historial para que no reaparezca al recargar.
  useEffect(() => {
    if (location.state) navegar('.', { replace: true, state: null })
  }, [location.state, navegar])

  // Buscar 300 ms después de que el usuario deja de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    listarUsuarios({ buscar: busquedaAplicada, pagina, porPagina: POR_PAGINA })
      .then((r) => {
        if (!vigente) return
        // Si se eliminó el último de una página, regresar a la anterior.
        if (r.items.length === 0 && pagina > 1) setPagina(pagina - 1)
        else setDatos(r)
      })
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los usuarios.'))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [busquedaAplicada, pagina, recargar])

  const confirmarEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await eliminarUsuario(aEliminar.id)
      setAviso(`Se eliminó a ${aEliminar.nombre}.`)
      setAEliminar(null)
      setRecargar((n) => n + 1)
    } catch (e) {
      setErrorEliminar(e instanceof ErrorApi ? e.message : 'No se pudo eliminar el usuario.')
    } finally {
      setEliminando(false)
    }
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1
  const desde = datos && datos.total > 0 ? (datos.pagina - 1) * datos.por_pagina + 1 : 0
  const hasta = datos ? desde + datos.items.length - 1 : 0

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Administra las cuentas de la aplicación."
        icono={UserCog}
        acciones={
          <BotonEnlace to="/usuarios/nuevo">
            <Plus className="size-5" aria-hidden />
            Nuevo usuario
          </BotonEnlace>
        }
      />

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
        <div className="relative">
          <label htmlFor="buscar-usuarios" className="sr-only">
            Buscar por nombre o correo
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
          <input
            id="buscar-usuarios"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="min-h-12 w-full rounded-xl border-2 border-stone-300 bg-white py-3 pr-4 pl-12 focus:border-marca-600 focus:outline-none"
          />
        </div>

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
                <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : datos.items.length === 0 ? (
            <p className="py-10 text-center text-stone-600">
              {busquedaAplicada ? `No hay usuarios que coincidan con “${busquedaAplicada}”.` : 'Todavía no hay usuarios.'}
            </p>
          ) : (
            <div className={`transition-opacity ${cargando ? 'opacity-50' : ''}`}>
              {/* Escritorio: tabla */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-stone-200 text-sm text-stone-600">
                      <th className="py-3 pr-4 font-bold">#</th>
                      <th className="py-3 pr-4 font-bold">Nombre</th>
                      <th className="py-3 pr-4 font-bold">Correo</th>
                      <th className="py-3 pr-4 font-bold">Tipo de usuario</th>
                      <th className="py-3 pr-4 font-bold">Estado</th>
                      <th className="py-3 text-right font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.items.map((u, i) => (
                      <tr key={u.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 pr-4 text-stone-500">{desde + i}</td>
                        <td className="py-3 pr-4 font-bold">
                          {u.nombre}
                          {u.id === yo?.id && <span className="ml-2 text-sm font-normal text-stone-500">(tú)</span>}
                        </td>
                        <td className="py-3 pr-4 break-all text-stone-700">{u.correo}</td>
                        <td className="py-3 pr-4">{ROLES[u.rol]}</td>
                        <td className="py-3 pr-4">
                          <Insignia activo={u.estado === 'activo'}>{ESTADOS[u.estado]}</Insignia>
                        </td>
                        <td className="py-3">
                          <BotonesAccion usuario={u} esYo={u.id === yo?.id} onEliminar={() => setAEliminar(u)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Celular: tarjetas */}
              <ul className="space-y-3 md:hidden">
                {datos.items.map((u) => (
                  <li key={u.id} className="rounded-2xl border-2 border-stone-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">
                          {u.nombre}
                          {u.id === yo?.id && <span className="ml-1 font-normal text-stone-500">(tú)</span>}
                        </p>
                        <p className="text-sm break-all text-stone-600">{u.correo}</p>
                      </div>
                      <BotonesAccion usuario={u} esYo={u.id === yo?.id} onEliminar={() => setAEliminar(u)} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 font-bold text-stone-700">{ROLES[u.rol]}</span>
                      <Insignia activo={u.estado === 'activo'}>{ESTADOS[u.estado]}</Insignia>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {datos && datos.total > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <p className="text-stone-600">
              Mostrando {desde}–{hasta} de {datos.total} {datos.total === 1 ? 'usuario' : 'usuarios'}
            </p>
            {totalPaginas > 1 && (
              <nav aria-label="Paginación" className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(pagina - 1)}
                  disabled={pagina === 1}
                  className="grid size-10 place-items-center rounded-lg border-2 border-stone-200 hover:bg-stone-50 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-5" />
                </button>
                {numerosDePagina(pagina, totalPaginas).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    aria-current={n === pagina ? 'page' : undefined}
                    aria-label={`Página ${n}`}
                    className={`grid size-10 place-items-center rounded-lg font-bold ${
                      n === pagina ? 'bg-marca-700 text-white' : 'border-2 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
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

      <Dialogo
        abierto={aEliminar !== null}
        onCerrar={() => {
          setAEliminar(null)
          setErrorEliminar(null)
        }}
        titulo="Eliminar usuario"
      >
        {aEliminar && (
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
              <Trash2 className="size-8" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-bold">¿Estás seguro de eliminar este usuario?</h2>
            <p className="mt-1 text-stone-600">Esta acción no se puede deshacer.</p>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-stone-50 p-4 text-left">
              <dt className="text-stone-600">Nombre</dt>
              <dd className="font-bold">{aEliminar.nombre}</dd>
              <dt className="text-stone-600">Correo</dt>
              <dd className="font-bold break-all">{aEliminar.correo}</dd>
              <dt className="text-stone-600">Tipo</dt>
              <dd className="font-bold">{ROLES[aEliminar.rol]}</dd>
              <dt className="text-stone-600">Estado</dt>
              <dd className="font-bold">{ESTADOS[aEliminar.estado]}</dd>
            </dl>
            {errorEliminar && (
              <div className="mt-4 text-left">
                <Aviso tipo="error">{errorEliminar}</Aviso>
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Boton variante="secundario" onClick={() => setAEliminar(null)} autoFocus>
                Cancelar
              </Boton>
              <Boton variante="peligro" onClick={confirmarEliminar} cargando={eliminando}>
                <Trash2 className="size-5" aria-hidden />
                Eliminar
              </Boton>
            </div>
          </div>
        )}
      </Dialogo>
    </>
  )
}
