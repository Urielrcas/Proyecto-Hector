/*
 * PANTALLA: CREAR CUENTA
 * Formulario de nombre, correo, contraseña, confirmación y lengua de señas.
 * Valida con la regla lógica "registro válido" (n ∧ e ∧ k ∧ q) y crea la cuenta en el servidor.
 * Si el correo ya existe (error 409), lo marca en el campo de correo.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Lock (candado), Mail (sobre de correo), UserRound (persona)
import { Lock, Mail, UserRound } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     ChangeEvent → tipo: el evento de escribir en un campo
//     FormEvent → tipo: el evento de enviar un formulario
import { useState, type ChangeEvent, type FormEvent } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
//     useNavigate → función para cambiar de pantalla desde el código
import { Link, useNavigate } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CampoTexto.tsx:
//     CampoTexto → campo de texto con etiqueta, ícono y mensaje de error
import { CampoTexto } from '../components/CampoTexto'
// ▸ Desde nuestro proyecto: src/components/DisenoAcceso.tsx:
//     DisenoAcceso → diseño de login/registro/recuperar (fondo, logo, botón de emergencia)
import { DisenoAcceso } from '../components/DisenoAcceso'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     LENGUAS → nombres y regiones de LSM y ASL
//     Lengua → tipo: 'LSM' o 'ASL'
import { LENGUAS, type Lengua } from '../lib/tipos'
// ▸ Desde nuestro proyecto: src/lib/validacion.ts:
//     validarContrasena → revisa que la contraseña tenga 8+ caracteres, letra y número
//     validarCorreo → revisa que el correo tenga formato válido
//     validarNombre → revisa que el nombre no esté vacío
import { validarContrasena, validarCorreo, validarNombre } from '../lib/validacion'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../lib/api'
// ▸ Desde nuestro proyecto: src/lib/logica/reglas.ts:
//     cumple → evalúa una regla de lógica proposicional con valores V/F
import { cumple } from '../lib/logica/reglas'
// ▸ Desde nuestro proyecto: src/services/auth.ts:
//     registrar → pide al servidor crear una cuenta
import { registrar } from '../services/auth'

// Nombres de los campos de texto del formulario.
type Campo = 'nombre' | 'correo' | 'contrasena' | 'confirmacion'

export default function Registro() {
  const { lengua, entrar } = useApp() // lengua elegida antes y función para iniciar la sesión
  const navegar = useNavigate()
  // Lo que el usuario escribe en cada campo (todos en un solo objeto).
  const [datos, setDatos] = useState({ nombre: '', correo: '', contrasena: '', confirmacion: '' })
  // Lengua del selector LSM/ASL; empieza con la que eligió en la configuración inicial.
  const [lenguaElegida, setLenguaElegida] = useState<Lengua>(lengua ?? 'LSM')
  const [errores, setErrores] = useState<Partial<Record<Campo, string | null>>>({}) // error de cada campo
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null) // error del servidor
  const [cargando, setCargando] = useState(false) // esperando al servidor

  // Crea la función onChange de cada campo: cambiar('nombre') actualiza datos.nombre al escribir.
  const cambiar = (campo: Campo) => (e: ChangeEvent<HTMLInputElement>) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }))
    // Al corregir un campo, quitar su error.
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: null }))
  }

  // Botón "Crear cuenta".
  const enviar = async (e: FormEvent) => {
    e.preventDefault() // no recargar la página
    // 1) Validar cada campo (null = correcto, texto = mensaje de error)
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

    // 2) Crear la cuenta en el servidor; si todo sale bien, la sesión queda iniciada y va al inicio
    setCargando(true)
    try {
      entrar(await registrar({ ...datos, lengua: lenguaElegida }))
      navegar('/inicio', { replace: true })
    } catch (err) {
      // 3) Si falló: 409 = correo ya registrado (se marca en su campo); otro error → recuadro rojo arriba
      if (err instanceof ErrorApi && err.estado === 409) setErrores((er) => ({ ...er, correo: err.message }))
      else setErrorGeneral(err instanceof ErrorApi ? err.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <DisenoAcceso titulo="Crear cuenta" subtitulo="Guarda tus conversaciones y tu progreso de aprendizaje.">
      {/* noValidate: usamos nuestra propia validación en lugar de la del navegador */}
      <form onSubmit={enviar} noValidate className="space-y-5">
        {/* Error del servidor (si hay) */}
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        {/* Los 4 campos. "autoComplete" ayuda al navegador a sugerir datos guardados. */}
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

        {/* Selector LSM / ASL: son botones de opción (radio) ocultos (sr-only) con apariencia de interruptor.
            La opción elegida se ve en blanco (bg-white). */}
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

        {/* Botón que envía el formulario (ejecuta enviar) */}
        <Boton type="submit" className="w-full" cargando={cargando}>
          Crear cuenta
        </Boton>
      </form>

      {/* Enlace para ir al login si ya tiene cuenta */}
      <p className="mt-6 text-center text-stone-600">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-bold text-marca-800 underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </DisenoAcceso>
  )
}
