import { Lock, Mail, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso } from '../components/Aviso'
import { Boton, BotonEnlace } from '../components/Boton'
import { CampoTexto } from '../components/CampoTexto'
import { DisenoAcceso } from '../components/DisenoAcceso'
import { useApp } from '../context/AppContext'
import { validarCorreo } from '../lib/validacion'
import { ErrorApi } from '../lib/api'
import { cumple } from '../lib/logica/reglas'
import { iniciarSesion } from '../services/auth'

export default function Login() {
  const { entrar, entrarComoInvitado } = useApp()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<{ correo?: string | null; contrasena?: string | null }>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos = {
      correo: validarCorreo(correo),
      contrasena: contrasena ? null : 'Escribe tu contraseña.',
    }
    setErrores(nuevos)
    setErrorGeneral(null)
    // Regla «login válido»: e ∧ k
    if (!cumple('loginValido', { e: !nuevos.correo, k: !nuevos.contrasena })) return

    setCargando(true)
    try {
      entrar(await iniciarSesion(correo, contrasena))
      navegar('/inicio', { replace: true })
    } catch (err) {
      setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  const comoInvitado = () => {
    entrarComoInvitado()
    navegar('/inicio', { replace: true })
  }

  return (
    <DisenoAcceso titulo="Iniciar sesión" subtitulo="Qué gusto verte. Entra para guardar tu historial y preferencias.">
      <form onSubmit={enviar} noValidate className="space-y-5">
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          icono={Mail}
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
        />
        <div>
          <CampoTexto
            etiqueta="Contraseña"
            type="password"
            icono={Lock}
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
          />
          <div className="mt-2 text-right">
            <Link to="/recuperar" className="font-bold text-marca-800 underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Boton type="submit" className="w-full" cargando={cargando}>
          Entrar
        </Boton>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm text-stone-500">
        <span className="h-px flex-1 bg-stone-300" />o<span className="h-px flex-1 bg-stone-300" />
      </div>

      <div className="space-y-3">
        <BotonEnlace to="/registro" variante="secundario" className="w-full">
          Registrarse
        </BotonEnlace>
        <Boton variante="fantasma" className="w-full" onClick={comoInvitado}>
          <UserRound className="size-5" aria-hidden />
          Continuar como invitado
        </Boton>
        <p className="text-center text-sm text-stone-600">Como invitado, tu historial se guarda solo en este dispositivo.</p>
      </div>
    </DisenoAcceso>
  )
}
