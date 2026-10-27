/*
 * LABORATORIO DE LA RED NEURONAL (pantalla «Mi IA»)
 *   - Pruébala: con la cámara, muestra la imagen 28×28 que recibe la red, lo que «ve» cada
 *     filtro de la primera convolución y las 3 formas más probables.
 *   - Enséñale: eliges una letra, la haces 3 segundos y la IA recuerda TU forma (memoria.ts):
 *     desde ese momento cuenta como correcta. También son muestras para la red (con 15 nuevas se reentrena sola).
 */

// ▸ Desde Framer Motion (animaciones):
import { AnimatePresence, motion } from 'framer-motion'
// ▸ Desde Lucide (íconos):
import { Camera, CameraOff, CircleDot } from 'lucide-react'
// ▸ Desde React:
import { useRef, useState } from 'react'
// ▸ Desde nuestro proyecto:
import { Aviso } from '../../components/Aviso'
import { Boton } from '../../components/Boton'
import { CamaraManos } from '../../components/CamaraManos'
import { CampoSelect } from '../../components/CampoSelect'
import { useModeloIA } from '../../hooks/useModeloIA'
import type { Prediccion } from '../../lib/ia/cnn/clasificador'
import { MUESTRAS_PARA_REENTRENAR, muestrasNuevas } from '../../lib/ia/modeloIA'
import type { Punto } from '../../lib/vision/postura'
import { ImagenRed } from './GraficasRed'

/** Segundos que se graban al enseñarle una letra. */
const SEGUNDOS_GRABAR = 3

export function LaboratorioRed() {
  const ia = useModeloIA()
  const [camara, setCamara] = useState(false)
  const [prediccion, setPrediccion] = useState<Prediccion | null>(null)
  const [letra, setLetra] = useState(ia.letras[0]?.letra ?? 'A')
  const [grabando, setGrabando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const cuadro = useRef(0)
  const grabacion = useRef<{ hasta: number; posturas: Punto[][]; letra: string } | null>(null)

  const terminarGrabacion = () => {
    const g = grabacion.current
    grabacion.current = null
    setGrabando(false)
    if (!g) return
    if (g.posturas.length < 3) {
      setAviso('No se vio bien tu mano. Ponla frente a la cámara e inténtalo otra vez.')
      return
    }
    ia.recordarForma(g.letra, g.posturas)
    setAviso(`¡Listo! La IA recordará tu forma de la ${g.letra} (${g.posturas.length} posturas).`)
  }

  // En cada cuadro: predicción (5 veces por segundo, para no cargar la pantalla) y grabación.
  const alDetectar = (puntos: Punto[] | null) => {
    cuadro.current++
    const g = grabacion.current
    if (g) {
      if (puntos && cuadro.current % 3 === 0) g.posturas.push(puntos)
      if (Date.now() >= g.hasta) terminarGrabacion()
    }
    if (cuadro.current % 6 !== 0) return
    setPrediccion(puntos && ia.clasificar ? ia.clasificar(puntos, true) : null)
  }

  const grabar = () => {
    setAviso(null)
    grabacion.current = { hasta: Date.now() + SEGUNDOS_GRABAR * 1000, posturas: [], letra }
    setGrabando(true)
  }

  const nuevas = muestrasNuevas(ia.modelo)
  const mapas = prediccion?.mapas

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── Cámara y «Enséñale» ── */}
      <div>
        {camara ? (
          <CamaraManos alDetectar={alDetectar} borde={grabando ? 'exito' : 'neutro'} />
        ) : (
          <div className="grid aspect-4/3 place-items-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center">
            <div>
              <Camera className="mx-auto size-10 text-stone-400" aria-hidden />
              <p className="mt-2 text-stone-600">Enciende la cámara para ver cómo piensa la red y para enseñarle tu mano.</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <Boton variante="secundario" onClick={() => setCamara(!camara)}>
            {camara ? <CameraOff className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
            {camara ? 'Apagar cámara' : 'Encender cámara'}
          </Boton>
        </div>

        <div className="mt-5 rounded-2xl border border-marca-200 bg-marca-50/60 p-4">
          <h3 className="font-bold">Enséñale tu forma de hacer una letra</h3>
          <p className="mt-1 text-sm text-stone-600">
            Elige la letra, presiona «Grabar» y haz la seña {SEGUNDOS_GRABAR} segundos. Mueve un poco la mano para que aprenda variaciones.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <CampoSelect
              etiqueta="Letra"
              className="w-28"
              opciones={ia.letras.map((l) => ({ valor: l.letra, texto: `${l.letra}${ia.modelo.personales?.[l.letra]?.length ? ' ✓' : ''}` }))}
              value={letra}
              onChange={(e) => setLetra(e.target.value)}
            />
            <Boton onClick={grabar} disabled={!camara || grabando}>
              <CircleDot className={`size-5 ${grabando ? 'animate-pulse text-red-300' : ''}`} aria-hidden />
              {grabando ? 'Grabando…' : 'Grabar'}
            </Boton>
          </div>
          {aviso && (
            <div className="mt-3">
              <Aviso tipo={aviso.startsWith('¡Listo') ? 'exito' : 'error'}>{aviso}</Aviso>
            </div>
          )}
          <p className="mt-3 text-sm text-stone-600">
            Posturas nuevas desde el último entrenamiento: <strong>{nuevas}</strong> de {MUESTRAS_PARA_REENTRENAR}. Al llegar, la red se
            reentrena sola.
          </p>
        </div>
      </div>

      {/* ── Lo que ve y piensa la red ── */}
      <div className="space-y-4">
        {!ia.clasificar ? (
          <p className="rounded-2xl bg-stone-50 p-5 text-stone-600">La red todavía no está entrenada. Entrénala arriba para ver sus respuestas aquí.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <p className="mb-1 text-sm font-bold">Lo que recibe (28×28)</p>
                <ImagenRed datos={prediccion?.imagen ?? null} etiqueta="Imagen del esqueleto de la mano que recibe la red" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-bold">Lo que detecta cada filtro</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 6 }, (_, f) => (
                    <ImagenRed
                      key={f}
                      datos={mapas ? mapas.subarray(f * 784, (f + 1) * 784) : null}
                      tamano={64}
                      etiqueta={`Mapa del filtro ${f + 1} de la primera convolución`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">La red cree que es…</p>
              {prediccion ? (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {prediccion.top.map((t, i) => (
                      <motion.li key={t.nombre} layout className="flex items-center gap-3">
                        <span className={`w-12 text-right font-bold ${i === 0 ? 'text-2xl text-marca-800' : 'text-lg text-stone-600'}`}>{t.nombre}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-200">
                          <motion.div
                            className={`h-full rounded-full ${i === 0 ? 'bg-marca-600' : 'bg-stone-400'}`}
                            animate={{ width: `${Math.round(t.probabilidad * 100)}%` }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                          />
                        </div>
                        <span className="w-12 text-right tabular-nums">{Math.round(t.probabilidad * 100)} %</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="text-stone-500">{camara ? 'Muestra tu mano a la cámara.' : 'Enciende la cámara.'}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
