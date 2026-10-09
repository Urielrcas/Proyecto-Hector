/*
 * PANTALLA: INICIAR SESIÓN
 * Formulario de correo y contraseña. Al enviar:
 *   1) valida los campos (regla lógica "login válido": e ∧ k),
 *   2) llama al servidor (services/auth.ts),
 *   3) guarda la sesión (entrar) y va al inicio.
 * También permite registrarse, entrar como invitado o recuperar la contraseña.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Lock (candado), Mail (sobre de correo), UserRound (persona)
import { Lock, Mail, UserRound } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useState, type FormEvent } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
//     useNavigate → función para cambiar de pantalla desde el código
import { Link, useNavigate } from 'react-router-dom'
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
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/validacion.ts:
//     validarCorreo → revisa que el correo tenga formato válido
import { validarCorreo } from '../lib/validacion'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/services/auth.ts:
//     iniciarSesion → pide al servidor iniciar sesión
import { iniciarSesion } from '../services/auth'

export default function Login() {
  const { entrar, entrarComoInvitado } = useApp() // funciones del estado global
  const navegar = useNavigate() // para cambiar de pantalla

  // Estado de la pantalla: lo que escribe el usuario, los errores y si está esperando al servidor.
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState<{ correo?: string | null; contrasena?: string | null }>({}) // errores bajo cada campo
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null) // error del servidor (recuadro rojo arriba)
  const [cargando, setCargando] = useState(false) // true mientras espera respuesta (el botón muestra un círculo girando)

  // Se ejecuta al presionar "Entrar".
  const enviar = async (e: FormEvent) => {
    e.preventDefault() // evita que el navegador recargue la página al enviar el formulario
    // 1) Validar los campos
    const nuevos = {
      correo: validarCorreo(correo),
      contrasena: contrasena ? null : 'Escribe tu contraseña.',
    }
    setErrores(nuevos)
    setErrorGeneral(null)
    // Regla «login válido»: e ∧ k
    if (!cumple('loginValido', { e: !nuevos.correo, k: !nuevos.contrasena })) return

    // 2) Enviar al servidor; si responde bien, guardar la sesión e ir al inicio
    setCargando(true)
    try {
      entrar(await iniciarSesion(correo, contrasena))
      navegar('/inicio', { replace: true })
    } catch (err) {
      // 3) Si falló (contraseña incorrecta, cuenta desactivada, servidor apagado…), mostrar el mensaje
      setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  // Botón "Continuar como invitado": entra sin cuenta.
  const comoInvitado = () => {
    entrarComoInvitado()
    navegar('/inicio', { replace: true })
  }

  // Lo que se dibuja en pantalla. DisenoAcceso pone el fondo, el logo y el botón de Emergencia.
  return (
    <DisenoAcceso titulo="Iniciar sesión" subtitulo="Qué gusto verte. Entra para guardar tu historial y preferencias.">
      <form onSubmit={enviar} noValidate className="space-y-5">
        {/* Recuadro rojo con el error del servidor (solo aparece si hay error) */}
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        {/* Campo de correo */}
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
        {/* Campo de contraseña + enlace "¿Olvidaste tu contraseña?" */}
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

        {/* Botón principal: type="submit" ejecuta enviar() */}
        <Boton type="submit" className="w-full" cargando={cargando}>
          Entrar
        </Boton>
      </form>

      {/* Separador "o" */}
      <div className="my-6 flex items-center gap-3 text-sm text-stone-500">
        <span className="h-px flex-1 bg-stone-300" />o<span className="h-px flex-1 bg-stone-300" />
      </div>

      {/* Otras opciones: registrarse o entrar como invitado */}
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
