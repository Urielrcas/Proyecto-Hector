/*
 * PANTALLA: REGISTRAR / EDITAR USUARIO (solo administradores)
 * Si la dirección tiene un id (/usuarios/ID/editar) está EDITANDO y carga los datos del usuario;
 * si no (/usuarios/nuevo), está CREANDO uno nuevo.
 * Valida con la regla lógica "usuario válido": n ∧ e ∧ (k ∨ (d ∧ s)).
 * Al guardar, vuelve a la lista con un mensaje de éxito.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Lock (candado), Mail (sobre de correo), Save (disquete de guardar), UserRound (persona)
import { Lock, Mail, Save, UserRound } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useEffect, useState, type FormEvent } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     useNavigate → función para cambiar de pantalla desde el código
//     useParams → lee los valores variables de la dirección (por ejemplo el :id o la :letra)
import { useNavigate, useParams } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
//     BotonEnlace → botón que lleva a otra pantalla (como un enlace)
import { Boton, BotonEnlace } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CampoSelect.tsx:
//     CampoSelect → lista desplegable con etiqueta
import { CampoSelect } from '../../components/CampoSelect'
// ▸ Desde nuestro proyecto: src/components/CampoTexto.tsx:
//     CampoTexto → campo de texto con etiqueta, ícono y mensaje de error
import { CampoTexto } from '../../components/CampoTexto'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../../lib/api'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     ESTADOS → textos de cada estado (activo → "Activo")
//     LENGUAS → nombres y regiones de LSM y ASL
//     ROLES → textos de cada rol (admin → "Administrador")
//     EstadoUsuario → tipo: 'activo' o 'inactivo'
//     Lengua → tipo: 'LSM' o 'ASL'
//     Rol → tipo: 'admin' o 'usuario'
import { ESTADOS, LENGUAS, ROLES, type EstadoUsuario, type Lengua, type Rol } from '../../lib/tipos'
// ▸ Desde nuestro proyecto: src/lib/validacion.ts:
//     validarContrasena → revisa que la contraseña tenga 8+ caracteres, letra y número
//     validarCorreo → revisa que el correo tenga formato válido
//     validarNombre → revisa que el nombre no esté vacío
import { validarContrasena, validarCorreo, validarNombre } from '../../lib/validacion'
// ▸ Desde nuestro proyecto: src/services/usuarios.ts:
//     actualizarUsuario → pide al servidor modificar un usuario
//     crearUsuario → pide al servidor crear un usuario
//     obtenerUsuario → pide al servidor un usuario
import { actualizarUsuario, crearUsuario, obtenerUsuario } from '../../services/usuarios'

// Campos del formulario.
interface Formulario {
  nombre: string
  correo: string
  contrasena: string
  rol: Rol
  estado: EstadoUsuario
  lengua: Lengua
}

type Errores = Partial<Record<keyof Formulario, string | null>>

// Valores iniciales al crear un usuario nuevo (tipo "Usuario", estado "Activo", lengua LSM).
const VACIO: Formulario = { nombre: '', correo: '', contrasena: '', rol: 'usuario', estado: 'activo', lengua: 'LSM' }

// Convierte { admin: 'Administrador', ... } en opciones para las listas desplegables.
const aOpciones = (registro: Record<string, string>) => Object.entries(registro).map(([valor, texto]) => ({ valor, texto }))

export default function FormularioUsuario() {
  const { id } = useParams() // el :id de la dirección /usuarios/:id/editar
  const editando = id !== undefined // si hay id → editar; si no → crear
  const { usuario: yo } = useApp()
  const esYo = editando && id === yo?.id // ¿el admin se está editando a sí mismo?
  const navegar = useNavigate()

  const [datos, setDatos] = useState<Formulario>(VACIO) // lo que hay escrito en el formulario
  const [errores, setErrores] = useState<Errores>({}) // errores bajo cada campo
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(editando) // al editar, mientras llegan los datos del servidor
  const [guardando, setGuardando] = useState(false)

  // Al editar: pedir los datos del usuario al servidor y llenar el formulario.
  useEffect(() => {
    if (!id) return
    obtenerUsuario(id)
      .then((u) => setDatos({ nombre: u.nombre, correo: u.correo, contrasena: '', rol: u.rol, estado: u.estado, lengua: u.lengua }))
      .catch((e) => setErrorGeneral(e instanceof ErrorApi ? e.message : 'No se pudo cargar el usuario.'))
      .finally(() => setCargando(false))
  }, [id])

  // Se llama al escribir en un campo: guarda el valor y quita su error.
  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: null }))
  }

  // Botón "Guardar": valida, envía al servidor y regresa a la lista.
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    // 1) Validar cada campo
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

    // 2) Preparar los datos: la contraseña solo se envía si se escribió una
    const { contrasena, ...resto } = datos
    const cuerpo = { ...resto, nombre: resto.nombre.trim(), correo: resto.correo.trim(), ...(contrasena && { contrasena }) }

    // 3) Crear o actualizar en el servidor y volver a la lista con un aviso de éxito
    setGuardando(true)
    try {
      const u = editando ? await actualizarUsuario(id, cuerpo) : await crearUsuario(cuerpo)
      navegar('/usuarios', { state: { aviso: editando ? `Se guardaron los cambios de ${u.nombre}.` : `Se creó el usuario ${u.nombre}.` } })
    } catch (err) {
      // 409 = el correo ya existe → se marca en el campo de correo
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
