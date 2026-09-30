import { ArrowLeft, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Aviso } from '../components/Aviso'
import { Boton, BotonEnlace } from '../components/Boton'
import { CampoTexto } from '../components/CampoTexto'
import { DisenoAcceso } from '../components/DisenoAcceso'
import { validarCorreo } from '../lib/validacion'
import { solicitarRecuperacion } from '../services/auth'

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const errorCorreo = validarCorreo(correo)
    setError(errorCorreo)
    if (errorCorreo) return
    setCargando(true)
    try {
      await solicitarRecuperacion(correo)
      setEnviado(true)
    } catch {
      setError('No se pudo enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <DisenoAcceso
      titulo="Recuperar contraseña"
      subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
    >
      {enviado ? (
        <div className="space-y-5">
          <Aviso tipo="exito">
            Si existe una cuenta con <strong className="break-all">{correo.trim()}</strong>, recibirás un correo en unos minutos.
            Revisa también la carpeta de spam.
          </Aviso>
          <Boton variante="secundario" className="w-full" onClick={() => setEnviado(false)}>
            Usar otro correo
          </Boton>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-5">
          <CampoTexto
            etiqueta="Correo electrónico"
            type="email"
            icono={Mail}
            autoComplete="email"
            inputMode="email"
            placeholder="tucorreo@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={error}
          />
          <Boton type="submit" className="w-full" cargando={cargando}>
            Enviar enlace
          </Boton>
        </form>
      )}

      <BotonEnlace to="/login" variante="fantasma" className="mt-4 w-full">
        <ArrowLeft className="size-5" aria-hidden />
        Volver a iniciar sesión
      </BotonEnlace>
    </DisenoAcceso>
  )
}
