/*
 * PANTALLA: MI EXPEDIENTE (/aprender/expediente) · prácticas 18 y 19
 * El registro completo de cómo va el usuario: resumen, consejos de la IA, el mapa del alfabeto
 * con el estado de cada letra y el detalle de las practicadas (con la predicción del próximo intento).
 * Los datos salen de cada intento que guarda «Practicar letra» (backend/app/rutas/intentos.py).
 */
import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BotonEnlace } from '../../components/Boton'
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
import { VistaExpediente } from '../../components/ia/VistaExpediente'
import { useApp } from '../../context/AppContext'
import { useExpediente } from '../../hooks/useExpediente'

export default function Expediente() {
  const { lengua } = useApp()
  const { expediente, cargando, error, conCuenta } = useExpediente()

  return (
    <>
      <EncabezadoPagina titulo="Mi expediente" descripcion={`Cómo vas aprendiendo el alfabeto · ${lengua ?? 'LSM'}`} volverA="/aprender" icono={ClipboardList} />

      {!conCuenta ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <p className="text-lg">Tu expediente se arma con tus intentos de práctica, y para guardarlos necesitas una cuenta.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <BotonEnlace to="/registro">Crear cuenta</BotonEnlace>
            <BotonEnlace to="/login" variante="secundario">
              Iniciar sesión
            </BotonEnlace>
          </div>
        </div>
      ) : cargando && !expediente ? (
        <p className="rounded-3xl border border-stone-200 bg-white p-6 text-stone-600">Cargando tu expediente…</p>
      ) : error && !expediente ? (
        <p className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</p>
      ) : expediente ? (
        <>
          {expediente.siguiente && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-marca-200 bg-marca-50/60 p-5">
              <p className="text-lg">
                La IA te sugiere practicar ahora la <strong className="text-2xl text-marca-800">{expediente.siguiente}</strong>
              </p>
              <BotonEnlace to={`/aprender/${encodeURIComponent(expediente.siguiente)}`}>Practicar la {expediente.siguiente}</BotonEnlace>
            </div>
          )}
          <VistaExpediente expediente={expediente} />
          <p className="mt-6 text-sm text-stone-500">
            Cada vez que practicas una letra, la app anota si la lograste, qué tan cerca estuviste y con qué letra la confundió la IA. ¿Quieres
            saber cómo funciona por dentro? Mira{' '}
            <Link to="/mi-ia" className="font-bold text-marca-800 hover:underline">
              Mi IA
            </Link>
            .
          </p>
        </>
      ) : null}
    </>
  )
}
