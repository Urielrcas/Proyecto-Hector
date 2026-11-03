/*
 * PANTALLA: CREAR CONTRASEÑA NUEVA (/restablecer?token=…)
 * Se abre desde el enlace del correo de «Recuperar contraseña». La persona escribe su contraseña
 * nueva dos veces y el servidor la cambia si el enlace es válido, no venció y no se ha usado
 * (regla t ∧ u ∧ a en backend/app/reglas.py).
 */

import { ArrowLeft, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Aviso } from '../components/Aviso'
import { Boton, BotonEnlace } from '../components/Boton'
import { CampoTexto } from '../components/CampoTexto'
import { DisenoAcceso } from '../components/DisenoAcceso'
import { ErrorApi } from '../lib/api'
import { validarContrasena } from '../lib/validacion'
import { restablecerContrasena } from '../services/auth'

export default function RestablecerContrasena() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<{ contrasena?: string | null; confirmacion?: string | null }>({})
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [listo, setListo] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevos = {
      contrasena: validarContrasena(contrasena),
      confirmacion: confirmacion !== contrasena ? 'Las contraseñas no coinciden.' : null,
    }
    setErrores(nuevos)
    if (nuevos.contrasena || nuevos.confirmacion) return
    setCargando(true)
    setError(null)
    try {
      await restablecerContrasena(token, contrasena)
      setListo(true)
    } catch (err) {
      setError(err instanceof ErrorApi && err.estado === 400 ? err.message : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <DisenoAcceso titulo="Crea tu contraseña nueva" subtitulo="Escríbela dos veces. Debe tener al menos 8 caracteres, con una letra y un número.">
      {!token ? (
        <Aviso tipo="error">Este enlace está incompleto. Ábrelo de nuevo desde el correo o pide uno nuevo.</Aviso>
      ) : listo ? (
        <div className="space-y-5">
          <Aviso tipo="exito">Listo, tu contraseña cambió. Ya puedes iniciar sesión con ella.</Aviso>
          <BotonEnlace to="/login" className="w-full">
            Iniciar sesión
          </BotonEnlace>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-5">
          {error && (
            <Aviso tipo="error">
              {error} <a href="/recuperar" className="font-bold underline">Pedir otro enlace</a>
            </Aviso>
          )}
          <CampoTexto
            etiqueta="Contraseña nueva"
            type="password"
            icono={KeyRound}
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            type="password"
            icono={KeyRound}
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            error={errores.confirmacion}
          />
          <Boton type="submit" className="w-full" cargando={cargando}>
            Guardar contraseña
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
