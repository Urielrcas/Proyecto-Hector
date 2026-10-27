/*
 * PANTALLA: CONFIGURACIÓN
 * Secciones:
 *   1. Lengua de señas (LSM / ASL).
 *   2. Voz: velocidad, volumen, qué voz usar y botón «Probar».
 *   3. Señas: velocidad con la que se muestran.
 *   4. Accesibilidad: tamaño de letra, alto contraste y reducir movimiento.
 *   5. Historial: guardar o no, y borrar todo.
 *   6. Perfil (solo con cuenta): nombre y contraseña (regla n ∧ (c → (a ∧ k ∧ q))).
 * Los cambios de 1–5 se aplican al instante y se guardan en este navegador (lib/configuracion.ts).
 */

// ▸ Desde Lucide (librería de íconos):
import { Accessibility, Hand, History, KeyRound, Languages, RotateCcw, Settings, Trash2, User, Volume2, type LucideIcon } from 'lucide-react'
// ▸ Desde React:
//     useEffect → escuchar cuándo el navegador termina de cargar sus voces
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent / ReactNode → tipos
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
// ▸ Desde nuestro proyecto: componentes reutilizables
import { Aviso } from '../../components/Aviso'
import { Boton } from '../../components/Boton'
import { CampoTexto } from '../../components/CampoTexto'
import { Dialogo } from '../../components/Dialogo'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: estado global, configuración e historial
import { useApp } from '../../context/AppContext'
import { useConfiguracion } from '../../hooks/useConfiguracion'
import { useAlmacenHistorial } from '../../hooks/useHistorial'
import { ErrorApi } from '../../lib/api'
import { ESCALA_TEXTO, restablecerConfiguracion, VELOCIDADES_SENAS, type TamanoTexto } from '../../lib/configuracion'
import { cumple } from '../../lib/logica/reglas'
import { LENGUAS, type Lengua } from '../../lib/tipos'
import { validarContrasena, validarNombre } from '../../lib/validacion'
import { hablar, hayVoz, vocesDisponibles } from '../../lib/voz'
import { actualizarPerfil } from '../../services/auth'

/* ── Piezas pequeñas de la pantalla ── */

function Tarjeta({ titulo, icono: Icono, children, id }: { titulo: string; icono: LucideIcon; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={id} className="flex items-center gap-3 text-lg font-bold">
        <span className="grid size-10 place-items-center rounded-xl bg-marca-100 text-marca-800">
          <Icono className="size-5" aria-hidden />
        </span>
        {titulo}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

/** Interruptor (sí / no) con su explicación. */
function Interruptor({ etiqueta, ayuda, activo, alCambiar }: { etiqueta: string; ayuda?: string; activo: boolean; alCambiar: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => alCambiar(!activo)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl p-1 text-left"
    >
      <span>
        <span className="block font-bold">{etiqueta}</span>
        {ayuda && <span className="block text-sm text-stone-600">{ayuda}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${activo ? 'bg-marca-700' : 'bg-stone-300'}`} aria-hidden>
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-6' : ''}`} />
      </span>
    </button>
  )
}

/** Deslizador con etiqueta y el valor a la derecha. */
function Deslizador({
  etiqueta,
  valor,
  texto,
  min,
  max,
  paso = 1,
  alCambiar,
}: {
  etiqueta: string
  valor: number
  texto: string
  min: number
  max: number
  paso?: number
  alCambiar: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex justify-between font-bold">
        {etiqueta}
        <span className="text-marca-800 tabular-nums">{texto}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
        aria-valuetext={texto}
        className="mt-2 w-full accent-marca-700"
      />
    </label>
  )
}

/* ── Pantalla ── */

export default function Configuracion() {
  const { lengua, elegirLengua, usuario } = useApp()
  const { config, cambiar } = useConfiguracion()
  const almacen = useAlmacenHistorial()

  // Voces del navegador (llegan un momento después de abrir la página).
  const idiomaVoz = lengua === 'ASL' ? 'en' : 'es'
  const [voces, setVoces] = useState(() => vocesDisponibles(idiomaVoz))
  useEffect(() => {
    if (!hayVoz()) return
    const cargar = () => setVoces(vocesDisponibles(idiomaVoz))
    cargar()
    speechSynthesis.addEventListener('voiceschanged', cargar)
    return () => speechSynthesis.removeEventListener('voiceschanged', cargar)
  }, [idiomaVoz])

  // Borrar todo el historial.
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [avisoHistorial, setAvisoHistorial] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const borrarHistorial = async () => {
    setBorrando(true)
    try {
      await almacen.eliminarTodo()
      setAvisoHistorial({ tipo: 'exito', texto: 'Se borró todo tu historial.' })
    } catch (e) {
      setAvisoHistorial({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo borrar el historial.' })
    } finally {
      setBorrando(false)
      setConfirmarBorrar(false)
    }
  }

  const probarVoz = () =>
    hablar(lengua === 'ASL' ? 'Hello! This is how the voice will sound.' : 'Hola, así sonará la voz de la aplicación.', lengua === 'ASL' ? 'en-US' : 'es-MX')

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Lengua, voz, accesibilidad e historial."
        icono={Settings}
        acciones={
          <Boton variante="secundario" onClick={restablecerConfiguracion}>
            <RotateCcw className="size-5" aria-hidden />
            Restablecer
          </Boton>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* 1. Lengua */}
        <Tarjeta titulo="Lengua de señas" icono={Languages} id="cfg-lengua">
          <div role="radiogroup" aria-label="Lengua de señas" className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(LENGUAS) as Lengua[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lengua === l}
                onClick={() => elegirLengua(l)}
                className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                  lengua === l ? 'border-marca-600 bg-marca-50' : 'border-stone-200 hover:border-marca-300'
                }`}
              >
                <span className="block text-xl font-bold">{l}</span>
                <span className="block text-sm text-stone-600">
                  {LENGUAS[l].nombre} · {LENGUAS[l].region}
                </span>
              </button>
            ))}
          </div>
          <p className="text-sm text-stone-600">
            Cambia el alfabeto de Aprendizaje, de los juegos y de los traductores.{usuario && ' Se guarda también en tu cuenta.'}
          </p>
        </Tarjeta>

        {/* 2. Voz */}
        <Tarjeta titulo="Voz" icono={Volume2} id="cfg-voz">
          {!hayVoz() ? (
            <Aviso tipo="error">Este navegador no puede leer en voz alta.</Aviso>
          ) : (
            <>
              <Deslizador
                etiqueta="Velocidad"
                valor={config.vozVelocidad}
                texto={config.vozVelocidad < 0.8 ? 'Lenta' : config.vozVelocidad > 1.15 ? 'Rápida' : 'Normal'}
                min={0.5}
                max={1.5}
                paso={0.05}
                alCambiar={(v) => cambiar({ vozVelocidad: v })}
              />
              <Deslizador
                etiqueta="Volumen"
                valor={config.vozVolumen}
                texto={`${Math.round(config.vozVolumen * 100)} %`}
                min={0}
                max={1}
                paso={0.05}
                alCambiar={(v) => cambiar({ vozVolumen: v })}
              />
              <label className="block">
                <span className="font-bold">Voz ({idiomaVoz === 'es' ? 'español' : 'inglés'})</span>
                <select
                  value={config.vozNombre}
                  onChange={(e) => cambiar({ vozNombre: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-xl border-2 border-stone-300 bg-white px-3 focus:border-marca-600 focus:outline-none"
                >
                  <option value="">La que elija el navegador</option>
                  {voces.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
              <Boton variante="secundario" onClick={probarVoz}>
                <Volume2 className="size-5" aria-hidden />
                Probar voz
              </Boton>
            </>
          )}
        </Tarjeta>

        {/* 3. Señas */}
        <Tarjeta titulo="Señas" icono={Hand} id="cfg-senas">
          <Deslizador
            etiqueta="Velocidad de las señas"
            valor={VELOCIDADES_SENAS.indexOf(config.senasVelocidad)}
            texto={`${config.senasVelocidad}×`}
            min={0}
            max={VELOCIDADES_SENAS.length - 1}
            alCambiar={(i) => cambiar({ senasVelocidad: VELOCIDADES_SENAS[i] })}
          />
          <p className="text-sm text-stone-600">
            Qué tan rápido se muestran las letras en Voz / Texto → Señas, en el Modo conversación y en el Historial. A 1× cada letra dura
            un segundo.
          </p>
        </Tarjeta>

        {/* 4. Accesibilidad */}
        <Tarjeta titulo="Accesibilidad" icono={Accessibility} id="cfg-accesibilidad">
          <div>
            <p className="font-bold">Tamaño de la letra</p>
            <div role="radiogroup" aria-label="Tamaño de la letra" className="mt-2 grid grid-cols-3 gap-2">
              {(Object.keys(ESCALA_TEXTO) as TamanoTexto[]).map((t, i) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={config.tamanoTexto === t}
                  onClick={() => cambiar({ tamanoTexto: t })}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 transition-colors ${
                    config.tamanoTexto === t ? 'border-marca-600 bg-marca-50' : 'border-stone-200 hover:border-marca-300'
                  }`}
                >
                  <span className="font-bold" style={{ fontSize: `${1 + i * 0.3}rem` }} aria-hidden>
                    Aa
                  </span>
                  <span className="text-sm">{ESCALA_TEXTO[t].nombre}</span>
                </button>
              ))}
            </div>
          </div>
          <Interruptor
            etiqueta="Alto contraste"
            ayuda="Textos y bordes más oscuros para leer mejor."
            activo={config.altoContraste}
            alCambiar={(v) => cambiar({ altoContraste: v })}
          />
          <Interruptor
            etiqueta="Sonidos de los juegos"
            ayuda="Aciertos, errores y cuenta regresiva."
            activo={config.sonidosJuegos}
            alCambiar={(v) => cambiar({ sonidosJuegos: v })}
          />
          <Interruptor
            etiqueta="Reducir movimiento"
            ayuda="Quita las animaciones de la app."
            activo={config.reducirMovimiento}
            alCambiar={(v) => cambiar({ reducirMovimiento: v })}
          />
        </Tarjeta>

        {/* 5. Historial */}
        <Tarjeta titulo="Historial" icono={History} id="cfg-historial">
          <Interruptor
            etiqueta="Guardar mis traducciones"
            ayuda={
              usuario
                ? 'Se guardan en tu cuenta. Nadie más puede verlas, ni el administrador.'
                : 'Como invitado se guardan solo en este navegador.'
            }
            activo={config.guardarHistorial}
            alCambiar={(v) => cambiar({ guardarHistorial: v })}
          />
          {avisoHistorial && <Aviso tipo={avisoHistorial.tipo}>{avisoHistorial.texto}</Aviso>}
          <Boton variante="secundario" onClick={() => setConfirmarBorrar(true)}>
            <Trash2 className="size-5" aria-hidden />
            Borrar todo mi historial
          </Boton>
        </Tarjeta>

        {/* 6. Perfil */}
        <Tarjeta titulo="Mi perfil" icono={User} id="cfg-perfil">
          {usuario ? (
            <FormularioPerfil key={usuario.id} />
          ) : (
            <p className="text-stone-600">
              Entraste como invitado. Crea una cuenta (cierra sesión y elige «Registrarse») para guardar tu progreso y tu historial en
              cualquier equipo.
            </p>
          )}
        </Tarjeta>
      </div>

      <Dialogo abierto={confirmarBorrar} onCerrar={() => setConfirmarBorrar(false)} titulo="Borrar historial">
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
            <Trash2 className="size-8" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-bold">¿Borrar todo tu historial?</h2>
          <p className="mt-1 text-stone-600">Esta acción no se puede deshacer.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Boton variante="secundario" onClick={() => setConfirmarBorrar(false)} autoFocus>
              Cancelar
            </Boton>
            <Boton variante="peligro" onClick={borrarHistorial} cargando={borrando}>
              Borrar todo
            </Boton>
          </div>
        </div>
      </Dialogo>
    </>
  )
}

/** Nombre y cambio de contraseña. Regla «perfil válido»: n ∧ (c → (a ∧ k ∧ q)). */
function FormularioPerfil() {
  const { usuario, actualizarUsuario } = useApp()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [intento, setIntento] = useState(false) // mostrar errores solo después de intentar guardar
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  const errorNombre = validarNombre(nombre)
  const c = nueva !== '' || actual !== '' // c: quiere cambiar la contraseña
  const errorNueva = c ? validarContrasena(nueva) : null
  const errorActual = c && !actual ? 'Escribe tu contraseña actual.' : null
  const errorConfirmacion = c && confirmacion !== nueva ? 'Las contraseñas no coinciden.' : null
  const valido = cumple('perfilValido', { n: !errorNombre, c, a: !!actual, k: !errorNueva, q: !errorConfirmacion })
  const sinCambios = nombre.trim() === usuario?.nombre && !c

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setIntento(true)
    setResultado(null)
    if (!valido || sinCambios) return
    setGuardando(true)
    try {
      const actualizado = await actualizarPerfil({
        nombre: nombre.trim(),
        ...(c && { contrasena_actual: actual, contrasena_nueva: nueva }),
      })
      actualizarUsuario(actualizado)
      setActual('')
      setNueva('')
      setConfirmacion('')
      setIntento(false)
      setResultado({ tipo: 'exito', texto: c ? 'Se guardó tu perfil y tu nueva contraseña.' : 'Se guardó tu perfil.' })
    } catch (err) {
      setResultado({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo guardar el perfil.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <CampoTexto etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={intento ? errorNombre : null} icono={User} />
      <p className="text-sm text-stone-600">
        Correo: <strong className="break-all">{usuario?.correo}</strong>
      </p>
      <fieldset className="space-y-4 rounded-2xl border border-stone-200 p-4">
        <legend className="flex items-center gap-2 px-1 font-bold">
          <KeyRound className="size-4" aria-hidden /> Cambiar contraseña (opcional)
        </legend>
        <CampoTexto
          etiqueta="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          error={intento ? errorActual : null}
        />
        <CampoTexto
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          error={intento ? errorNueva : null}
          ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
        />
        <CampoTexto
          etiqueta="Confirmar contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          error={intento ? errorConfirmacion : null}
        />
      </fieldset>
      {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
      <Boton type="submit" cargando={guardando} disabled={sinCambios}>
        Guardar perfil
      </Boton>
    </form>
  )
}
