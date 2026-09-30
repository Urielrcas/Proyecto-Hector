import { Lock, Mail, Save, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Aviso } from '../../components/Aviso'
import { Boton, BotonEnlace } from '../../components/Boton'
import { CampoSelect } from '../../components/CampoSelect'
import { CampoTexto } from '../../components/CampoTexto'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { useApp } from '../../context/AppContext'
import { ErrorApi } from '../../lib/api'
import { cumple } from '../../lib/logica/reglas'
import { ESTADOS, LENGUAS, ROLES, type EstadoUsuario, type Lengua, type Rol } from '../../lib/tipos'
import { validarContrasena, validarCorreo, validarNombre } from '../../lib/validacion'
import { actualizarUsuario, crearUsuario, obtenerUsuario } from '../../services/usuarios'

interface Formulario {
  nombre: string
  correo: string
  contrasena: string
  rol: Rol
  estado: EstadoUsuario
  lengua: Lengua
}

type Errores = Partial<Record<keyof Formulario, string | null>>

const VACIO: Formulario = { nombre: '', correo: '', contrasena: '', rol: 'usuario', estado: 'activo', lengua: 'LSM' }

const aOpciones = (registro: Record<string, string>) => Object.entries(registro).map(([valor, texto]) => ({ valor, texto }))

export default function FormularioUsuario() {
  const { id } = useParams()
  const editando = id !== undefined
  const { usuario: yo } = useApp()
  const esYo = editando && id === yo?.id
  const navegar = useNavigate()

  const [datos, setDatos] = useState<Formulario>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(editando)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!id) return
    obtenerUsuario(id)
      .then((u) => setDatos({ nombre: u.nombre, correo: u.correo, contrasena: '', rol: u.rol, estado: u.estado, lengua: u.lengua }))
      .catch((e) => setErrorGeneral(e instanceof ErrorApi ? e.message : 'No se pudo cargar el usuario.'))
      .finally(() => setCargando(false))
  }, [id])

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: null }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos: Errores = {
      nombre: validarNombre(datos.nombre),
      correo: validarCorreo(datos.correo),
      // Al editar, la contraseña vacía significa "no cambiarla".
      contrasena: editando && !datos.contrasena ? null : validarContrasena(datos.contrasena),
    }
    setErrores(nuevos)
    setErrorGeneral(null)
    // Regla «usuario válido»: n ∧ e ∧ (k ∨ (d ∧ s))
    const valido = cumple('usuarioValido', {
      n: !nuevos.nombre,
      e: !nuevos.correo,
      k: validarContrasena(datos.contrasena) === null,
      d: editando,
      s: !datos.contrasena,
    })
    if (!valido) return

    const { contrasena, ...resto } = datos
    const cuerpo = { ...resto, nombre: resto.nombre.trim(), correo: resto.correo.trim(), ...(contrasena && { contrasena }) }

    setGuardando(true)
    try {
      const u = editando ? await actualizarUsuario(id, cuerpo) : await crearUsuario(cuerpo)
      navegar('/usuarios', { state: { aviso: editando ? `Se guardaron los cambios de ${u.nombre}.` : `Se creó el usuario ${u.nombre}.` } })
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 409) setErrores((er) => ({ ...er, correo: err.message }))
      else setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo guardar el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <EncabezadoPagina titulo={editando ? 'Editar usuario' : 'Registrar usuario'} volverA="/usuarios" />

      <form onSubmit={enviar} noValidate className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        {cargando ? (
          <div className="space-y-5" aria-busy="true" aria-label="Cargando usuario">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

            <CampoTexto
              etiqueta="Nombre completo"
              icono={UserRound}
              placeholder="Ej. Juan Pérez"
              autoComplete="off"
              value={datos.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              error={errores.nombre}
            />
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              icono={Mail}
              placeholder="ejemplo@correo.com"
              autoComplete="off"
              value={datos.correo}
              onChange={(e) => cambiar('correo', e.target.value)}
              error={errores.correo}
            />
            <CampoTexto
              etiqueta={editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              icono={Lock}
              autoComplete="new-password"
              ayuda={
                editando
                  ? 'Déjala vacía para conservar la contraseña actual.'
                  : 'Mínimo 8 caracteres, con al menos una letra y un número.'
              }
              value={datos.contrasena}
              onChange={(e) => cambiar('contrasena', e.target.value)}
              error={errores.contrasena}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <CampoSelect
                etiqueta="Tipo de usuario"
                opciones={aOpciones(ROLES)}
                value={datos.rol}
                onChange={(e) => cambiar('rol', e.target.value as Rol)}
                disabled={esYo}
              />
              <CampoSelect
                etiqueta="Lengua de señas"
                opciones={Object.entries(LENGUAS).map(([valor, l]) => ({ valor, texto: `${valor} · ${l.region}` }))}
                value={datos.lengua}
                onChange={(e) => cambiar('lengua', e.target.value as Lengua)}
              />
              {editando && (
                <CampoSelect
                  etiqueta="Estado"
                  opciones={aOpciones(ESTADOS)}
                  value={datos.estado}
                  onChange={(e) => cambiar('estado', e.target.value as EstadoUsuario)}
                  disabled={esYo}
                />
              )}
            </div>
            {esYo && <p className="text-sm text-stone-600">No puedes cambiar tu propio tipo de usuario ni desactivar tu cuenta.</p>}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-stone-100 pt-6">
          <BotonEnlace to="/usuarios" variante="secundario">
            Cancelar
          </BotonEnlace>
          <Boton type="submit" cargando={guardando} disabled={cargando}>
            <Save className="size-5" aria-hidden />
            {editando ? 'Guardar cambios' : 'Guardar'}
          </Boton>
        </div>
      </form>
    </div>
  )
}
