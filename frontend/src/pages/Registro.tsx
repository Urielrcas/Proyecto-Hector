import { Lock, Mail, UserRound } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso } from '../components/Aviso'
import { Boton } from '../components/Boton'
import { CampoTexto } from '../components/CampoTexto'
import { DisenoAcceso } from '../components/DisenoAcceso'
import { useApp } from '../context/AppContext'
import { LENGUAS, type Lengua } from '../lib/tipos'
import { validarContrasena, validarCorreo, validarNombre } from '../lib/validacion'
import { ErrorApi } from '../lib/api'
import { cumple } from '../lib/logica/reglas'
import { registrar } from '../services/auth'

type Campo = 'nombre' | 'correo' | 'contrasena' | 'confirmacion'

export default function Registro() {
  const { lengua, entrar } = useApp()
  const navegar = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', correo: '', contrasena: '', confirmacion: '' })
  const [lenguaElegida, setLenguaElegida] = useState<Lengua>(lengua ?? 'LSM')
  const [errores, setErrores] = useState<Partial<Record<Campo, string | null>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const cambiar = (campo: Campo) => (e: ChangeEvent<HTMLInputElement>) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }))
    // Al corregir un campo, quitar su error.
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: null }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos = {
      nombre: validarNombre(datos.nombre),
      correo: validarCorreo(datos.correo),
      contrasena: validarContrasena(datos.contrasena),
      confirmacion: datos.confirmacion !== datos.contrasena ? 'Las contraseñas no coinciden.' : null,
    }
    setErrores(nuevos)
    setErrorGeneral(null)
    // Regla «registro válido»: n ∧ e ∧ k ∧ q
    if (!cumple('registroValido', { n: !nuevos.nombre, e: !nuevos.correo, k: !nuevos.contrasena, q: !nuevos.confirmacion })) return

    setCargando(true)
    try {
      entrar(await registrar({ ...datos, lengua: lenguaElegida }))
      navegar('/inicio', { replace: true })
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 409) setErrores((er) => ({ ...er, correo: err.message }))
      else setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <DisenoAcceso titulo="Crear cuenta" subtitulo="Guarda tus conversaciones y tu progreso de aprendizaje.">
      <form onSubmit={enviar} noValidate className="space-y-5">
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        <CampoTexto
          etiqueta="Nombre"
          icono={UserRound}
          autoComplete="name"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          icono={Mail}
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          value={datos.correo}
          onChange={cambiar('correo')}
          error={errores.correo}
        />
        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          icono={Lock}
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
          value={datos.contrasena}
          onChange={cambiar('contrasena')}
          error={errores.contrasena}
        />
        <CampoTexto
          etiqueta="Confirmar contraseña"
          type="password"
          icono={Lock}
          autoComplete="new-password"
          value={datos.confirmacion}
          onChange={cambiar('confirmacion')}
          error={errores.confirmacion}
        />

        <fieldset>
          <legend className="mb-1.5 font-bold text-stone-800">Lengua de señas principal</legend>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
            {(Object.keys(LENGUAS) as Lengua[]).map((clave) => (
              <label
                key={clave}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-marca-500 ${
                  lenguaElegida === clave ? 'bg-white text-marca-800 shadow-sm' : 'text-stone-600'
                }`}
              >
                <input
                  type="radio"
                  name="lengua"
                  value={clave}
                  checked={lenguaElegida === clave}
                  onChange={() => setLenguaElegida(clave)}
                  className="sr-only"
                />
                {clave}
              </label>
            ))}
          </div>
        </fieldset>

        <Boton type="submit" className="w-full" cargando={cargando}>
          Crear cuenta
        </Boton>
      </form>

      <p className="mt-6 text-center text-stone-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-bold text-marca-800 underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </DisenoAcceso>
  )
}
