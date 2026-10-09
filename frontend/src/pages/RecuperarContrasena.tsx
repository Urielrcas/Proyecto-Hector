/*
 * PANTALLA: RECUPERAR CONTRASEÑA
 * El usuario escribe su correo y se envía la solicitud al servidor.
 * Nota: el servidor registra la solicitud, pero el envío del correo aún no está implementado.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ArrowLeft (flecha ←), Mail (sobre de correo)
import { ArrowLeft, Mail } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useState, type FormEvent } from 'react'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
//     BotonEnlace → botón que lleva a otra pantalla (como un enlace)
import { Boton, BotonEnlace } from '../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CampoTexto.tsx:
//     CampoTexto → campo de texto con etiqueta, ícono y mensaje de error
import { CampoTexto } from '../components/CampoTexto'
// ▸ Desde nuestro proyecto: src/components/DisenoAcceso.tsx:
//     DisenoAcceso → diseño de login/registro/recuperar (fondo, logo, botón de emergencia)
import { DisenoAcceso } from '../components/DisenoAcceso'
// ▸ Desde nuestro proyecto: src/lib/validacion.ts:
//     validarCorreo → revisa que el correo tenga formato válido
import { validarCorreo } from '../lib/validacion'
// ▸ Desde nuestro proyecto: src/services/auth.ts:
//     solicitarRecuperacion → pide al servidor recuperar la contraseña
import { solicitarRecuperacion } from '../services/auth'

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('') // lo que escribe el usuario
  const [error, setError] = useState<string | null>(null) // mensaje de error del campo
  const [cargando, setCargando] = useState(false) // esperando al servidor
  const [enviado, setEnviado] = useState(false) // true = mostrar el mensaje de confirmación

  // Botón "Enviar enlace": valida el correo y envía la solicitud.
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
      {/* Si ya se envió: mensaje verde de confirmación. Si no: el formulario con el correo. */}
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

      {/* Siempre visible: regresar al login */}
      <BotonEnlace to="/login" variante="fantasma" className="mt-4 w-full">
        <ArrowLeft className="size-5" aria-hidden />
        Volver a iniciar sesión
      </BotonEnlace>
    </DisenoAcceso>
  )
}
