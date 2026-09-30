import { CameraOff, Hand, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useCamaraManos } from '../hooks/useCamaraManos'
import type { Punto } from '../lib/vision/postura'
import { Boton } from './Boton'

const MENSAJES = {
  'sin-permiso': {
    titulo: 'Sin permiso para usar la cámara',
    texto: 'Actívalo desde el ícono del candado en la barra de direcciones del navegador y vuelve a intentarlo.',
  },
  'sin-camara': { titulo: 'No se encontró una cámara', texto: 'Conecta una cámara o prueba desde otro dispositivo.' },
  error: { titulo: 'No se pudo iniciar la detección', texto: 'Recarga la página o inténtalo de nuevo.' },
}

/** Video de la cámara frontal (en espejo) con la mano detectada dibujada encima. */
export function CamaraManos({ alDetectar, borde = 'neutro' }: { alDetectar: (puntos: Punto[] | null, tiempo: number) => void; borde?: 'neutro' | 'exito' }) {
  const [hayMano, setHayMano] = useState(false)
  const { videoRef, canvasRef, estado, reintentar } = useCamaraManos((puntos, tiempo) => {
    // Solo actualizar el estado cuando cambia, no en cada cuadro.
    setHayMano((antes) => (antes === (puntos !== null) ? antes : puntos !== null))
    alDetectar(puntos, tiempo)
  })

  const problema = estado === 'sin-permiso' || estado === 'sin-camara' || estado === 'error' ? MENSAJES[estado] : null

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-4 bg-stone-900 transition-colors ${
        borde === 'exito' ? 'border-emerald-500' : 'border-transparent'
      }`}
    >
      {/* Espejo: el usuario se ve como frente a un espejo */}
      <video ref={videoRef} className="absolute inset-0 size-full -scale-x-100 object-cover" playsInline muted aria-hidden />
      <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-cover" aria-hidden />

      {estado === 'activa' && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-stone-800">
          <span className={`size-2.5 rounded-full ${hayMano ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
          {hayMano ? 'Mano detectada' : 'Cámara activa'}
        </span>
      )}

      {estado === 'activa' && !hayMano && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 p-4 pt-10 text-white">
          <Hand className="size-5" aria-hidden />
          Muestra tu mano frente a la cámara
        </div>
      )}

      {estado === 'iniciando' && (
        <div className="absolute inset-0 grid place-items-center text-white" role="status">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle className="size-10 animate-spin" aria-hidden />
            <span>Preparando la cámara…</span>
          </div>
        </div>
      )}

      {problema && (
        <div className="absolute inset-0 grid place-items-center bg-stone-100 p-6 text-center" role="alert">
          <div className="flex max-w-xs flex-col items-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-stone-200 text-stone-700">
              <CameraOff className="size-7" aria-hidden />
            </span>
            <p className="mt-3 font-bold">{problema.titulo}</p>
            <p className="mt-1 text-sm text-stone-600">{problema.texto}</p>
            <Boton variante="secundario" className="mt-4" onClick={reintentar}>
              <RotateCcw className="size-5" aria-hidden />
              Reintentar
            </Boton>
          </div>
        </div>
      )}
    </div>
  )
}
