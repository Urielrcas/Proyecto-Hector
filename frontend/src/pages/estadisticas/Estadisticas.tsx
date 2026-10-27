/*
 * PANTALLA: ESTADÍSTICAS (solo administradores)
 * Muestra de un vistazo cómo van los usuarios, sin revisarlos uno por uno:
 *   - tarjetas con los números principales (usuarios, activos, LSM/ASL, avance promedio),
 *   - 4 gráficas hechas con matplotlib en el backend (backend/app/graficas.py):
 *       1. Registros por mes        → ¿está creciendo la app?
 *       2. Usuarios por lengua      → ¿qué lengua aprenden más? ¿cuántas cuentas siguen activas?
 *       3. Letras logradas          → ¿qué letras les cuestan más? (esas hay que reforzar)
 *       4. Avance por usuario       → ¿cuánto lleva cada persona? ¿quién se quedó atrás?
 * Cada gráfica dice qué pregunta responde y cómo leerla.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ChartColumn (gráfica de barras), LoaderCircle (círculo de carga), RefreshCw (flechas de actualizar)
import { ChartColumn, LoaderCircle, RefreshCw } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
import { useEffect, useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../../lib/api'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
import type { Lengua } from '../../lib/tipos'
// ▸ Desde nuestro proyecto: src/services/estadisticas.ts:
//     obtenerGrafica → pide al servidor una gráfica (imagen PNG)
//     obtenerResumen → pide al servidor los números de las tarjetas
//     NombreGrafica → tipo: 'registros' | 'usuarios' | 'letras' | 'avance'
//     ResumenEstadisticas → tipo: los números de las tarjetas
import { obtenerGrafica, obtenerResumen, type NombreGrafica, type ResumenEstadisticas } from '../../services/estadisticas'

// Textos de cada gráfica: la pregunta que responde y cómo leerla.
const GRAFICAS: Record<NombreGrafica, { titulo: string; pregunta: string; comoLeer: string }> = {
  registros: {
    titulo: 'Registros por mes',
    pregunta: '¿Está creciendo la app?',
    comoLeer: 'Cada punto es un mes. La línea punteada es el promedio y el punto naranja, el mes con más cuentas nuevas.',
  },
  usuarios: {
    titulo: 'Usuarios por lengua',
    pregunta: '¿Qué lengua aprenden más y cuántas cuentas siguen activas?',
    comoLeer: 'Barra oscura: cuentas activas. Barra clara: cuentas desactivadas.',
  },
  letras: {
    titulo: 'Letras logradas',
    pregunta: '¿Qué letras les cuestan más a los usuarios?',
    comoLeer: 'Cada barra es una letra: más alta y más oscura = más usuarios la lograron. La de borde naranja es la menos lograda; conviene reforzarla.',
  },
  juegos: {
    titulo: 'Juegos',
    pregunta: '¿Qué juegos usan más?',
    comoLeer: 'Cada barra es un juego: su largo son las partidas jugadas y al lado va el puntaje promedio. La barra oscura es el juego más usado.',
  },
  dificultad: {
    titulo: 'Dificultad de cada letra según la IA',
    pregunta: '¿Qué letras le cuestan más a la gente?',
    comoLeer:
      'Para cada letra, el dominio promedio que calcula la IA (modelo del estudiante) con los aciertos y fallos de todos. Las de borde naranja son las 3 más difíciles; la línea punteada marca cuándo se considera dominada.',
  },
  historial: {
    titulo: 'Uso de los traductores',
    pregunta: '¿Qué traductor usan más?',
    comoLeer: 'Registros guardados en el historial por tipo. Solo se cuentan: el contenido de las conversaciones es privado.',
  },
  avance: {
    titulo: 'Avance por usuario',
    pregunta: '¿Cuánto lleva cada persona? ¿Quién se quedó atrás?',
    comoLeer: 'Cada barra es un usuario: la parte verde son sus letras logradas y la gris lo que le falta. La línea naranja es el promedio.',
  },
}

// Tarjeta con un número grande (ej.: "Usuarios registrados: 25").
function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-stone-600">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-marca-800 tabular-nums">{valor}</p>
      {detalle && <p className="mt-0.5 text-sm text-stone-600">{detalle}</p>}
    </div>
  )
}

// Tarjeta con una gráfica: título, pregunta, la imagen y cómo leerla.
// "lengua" solo en las gráficas que dependen de ella; "recarga" cambia al presionar «Actualizar».
function TarjetaGrafica({ nombre, lengua, recarga }: { nombre: NombreGrafica; lengua?: Lengua; recarga: number }) {
  const { titulo, pregunta, comoLeer } = GRAFICAS[nombre]
  const [imagen, setImagen] = useState<{ url: string; clave: string } | null>(null) // dirección temporal de la imagen
  const [error, setError] = useState<{ mensaje: string; clave: string } | null>(null)
  // Identifica la petición actual: si cambia (otra lengua, «Actualizar»), lo anterior ya no sirve.
  const clave = `${nombre}.${lengua ?? ''}.${recarga}`

  useEffect(() => {
    let url = ''
    let vigente = true
    obtenerGrafica(nombre, lengua)
      .then((blob) => {
        if (!vigente) return
        // createObjectURL da una dirección "blob:..." para mostrar la imagen descargada en un <img>.
        url = URL.createObjectURL(blob)
        setImagen({ url, clave })
      })
      .catch((e) => vigente && setError({ mensaje: e instanceof ErrorApi ? e.message : 'No se pudo cargar la gráfica.', clave }))
    return () => {
      vigente = false
      // Liberar la memoria de la imagen anterior.
      if (url) URL.revokeObjectURL(url)
    }
  }, [nombre, lengua, clave])

  const cargando = imagen?.clave !== clave && error?.clave !== clave

  return (
    <section aria-labelledby={`grafica-${nombre}`} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={`grafica-${nombre}`} className="text-lg font-bold">
        {titulo}
      </h2>
      <p className="text-stone-600">{pregunta}</p>
      <div className="mt-4">
        {cargando ? (
          <div className="grid aspect-[2/1] place-items-center rounded-2xl bg-stone-100 text-stone-500" role="status">
            <LoaderCircle className="size-8 animate-spin" aria-label="Cargando gráfica" />
          </div>
        ) : error?.clave === clave ? (
          <Aviso tipo="error">{error.mensaje}</Aviso>
        ) : (
          imagen && <img src={imagen.url} alt={`${titulo}. ${pregunta}`} className="h-auto w-full rounded-xl" />
        )}
      </div>
      <p className="mt-3 text-sm text-stone-600">
        <span className="font-bold text-stone-800">Cómo leerla: </span>
        {comoLeer}
      </p>
    </section>
  )
}

export default function Estadisticas() {
  const { lengua: lenguaApp } = useApp()
  const [lengua, setLengua] = useState<Lengua>(lenguaApp ?? 'LSM') // lengua de las gráficas de letras y avance
  const [resumen, setResumen] = useState<ResumenEstadisticas | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0) // al sumarle 1 se vuelven a pedir los datos y las gráficas

  // Pedir los números de las tarjetas (y otra vez al presionar «Actualizar»).
  useEffect(() => {
    let vigente = true
    obtenerResumen()
      .then((r) => {
        if (!vigente) return
        setResumen(r)
        setError(null)
      })
      .catch((e) => vigente && setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las estadísticas.'))
    return () => {
      vigente = false
    }
  }, [recarga])

  return (
    <>
      <EncabezadoPagina
        titulo="Estadísticas"
        descripcion="Cómo van los usuarios y su aprendizaje."
        icono={ChartColumn}
        acciones={
          <Boton variante="secundario" onClick={() => setRecarga((n) => n + 1)}>
            <RefreshCw className="size-5" aria-hidden />
            Actualizar
          </Boton>
        }
      />

      {error && (
        <div className="mb-6">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {/* Números principales: 2 columnas en celular, 4 en computadora */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo="Usuarios registrados"
          valor={resumen ? String(resumen.usuarios) : '—'}
          detalle={resumen ? `${resumen.activos} activos · ${resumen.inactivos} inactivos` : undefined}
        />
        <Indicador titulo="Aprenden LSM" valor={resumen ? String(resumen.por_lengua.LSM) : '—'} detalle="Lengua de Señas Mexicana" />
        <Indicador titulo="Aprenden ASL" valor={resumen ? String(resumen.por_lengua.ASL) : '—'} detalle="American Sign Language" />
        <Indicador
          titulo="Avance promedio"
          valor={resumen ? `${resumen.avance_promedio[lengua]} %` : '—'}
          detalle={resumen ? `del alfabeto ${lengua} · ${resumen.letras_logradas} letras logradas en total` : undefined}
        />
      </div>

      {/* Gráficas generales: una por fila, a lo ancho, para que se lean bien */}
      <div className="mt-6 grid gap-6">
        <TarjetaGrafica nombre="registros" recarga={recarga} />
        <TarjetaGrafica nombre="usuarios" recarga={recarga} />
      </div>

      {/* Gráficas del aprendizaje: dependen de la lengua elegida */}
      <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Aprendizaje del alfabeto</h2>
          <p className="text-stone-600">Letras que logran los usuarios al practicar con la cámara.</p>
        </div>
        {/* Selector LSM / ASL (aria-pressed indica cuál está elegido) */}
        <div className="inline-flex rounded-xl border-2 border-stone-200 bg-white p-1" role="group" aria-label="Lengua de las gráficas">
          {(['LSM', 'ASL'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLengua(l)}
              aria-pressed={lengua === l}
              className={`min-h-10 rounded-lg px-4 font-bold transition-colors ${lengua === l ? 'bg-marca-700 text-white' : 'text-stone-700 hover:bg-stone-100'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6">
        <TarjetaGrafica nombre="letras" lengua={lengua} recarga={recarga} />
        <TarjetaGrafica nombre="avance" lengua={lengua} recarga={recarga} />
      </div>

      {/* Inteligencia artificial: modelo del estudiante, red neuronal y autocorrector (de todos los usuarios) */}
      <div className="mt-10 mb-4">
        <h2 className="text-xl font-bold">Inteligencia artificial</h2>
        <p className="text-stone-600">Cómo le va a la IA que aprende de cada usuario. Solo se muestran totales y promedios.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Usuarios con IA" valor={resumen ? String(resumen.usuarios_con_ia) : '—'} detalle="cuentas con modelo propio" />
        <Indicador
          titulo="Redes entrenadas"
          valor={resumen ? String(resumen.redes_entrenadas) : '—'}
          detalle={resumen ? `${resumen.posturas} posturas de mano guardadas` : undefined}
        />
        <Indicador
          titulo="Precisión de las redes"
          valor={resumen?.precision_red != null ? `${resumen.precision_red} %` : '—'}
          detalle="promedio, con manos que no vieron"
        />
        <Indicador
          titulo="Acierto del autocorrector"
          valor={resumen?.precision_corrector != null ? `${resumen.precision_corrector} %` : '—'}
          detalle="correcciones que nadie deshizo"
        />
      </div>
      <div className="mt-6 grid gap-6">
        <TarjetaGrafica nombre="dificultad" lengua={lengua} recarga={recarga} />
      </div>

      {/* Juegos e historial */}
      <div className="mt-10 mb-4">
        <h2 className="text-xl font-bold">Juegos y traductores</h2>
        <p className="text-stone-600">Cuánto se usan los juegos y los traductores.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Partidas jugadas" valor={resumen ? String(resumen.partidas) : '—'} detalle={resumen ? `por ${resumen.jugadores} personas` : undefined} />
        <Indicador titulo="Registros en historial" valor={resumen ? String(resumen.registros_historial) : '—'} detalle="traducciones y conversaciones" />
      </div>
      <div className="mt-6 grid gap-6">
        <TarjetaGrafica nombre="juegos" recarga={recarga} />
        <TarjetaGrafica nombre="historial" recarga={recarga} />
      </div>
    </>
  )
}
