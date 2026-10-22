/*
 * PANTALLA: RUTA DE APRENDIZAJE
 * El usuario elige una letra que ya sabe y una que quiere aprender. La app busca un camino de
 * letras intermedias donde cada paso cambia solo 1 o 2 detalles de la mano, para aprender poco a poco.
 *
 * Tiene dos vistas:
 *   - Sencilla (todas las personas): «Armar mi ruta» muestra solo el camino recomendado, con el dibujo
 *     de cada letra y qué cambiar. Por dentro usa A* (el camino que menos cambia la mano).
 *   - Técnica (solo administradores, regla «administrar usuarios» c ∧ a): los algoritmos, costos y
 *     heurística con todos sus detalles, para revisar que todo funcione.
 *
 * Cómo se relaciona la vista técnica con la búsqueda vista en clase:
 *   - Nodos: las letras.  Conexiones: letras con forma de mano parecida (lib/aprendizaje/grafoLetras.ts).
 *   - El backend ejecuta DFS o BFS (backend/app/busqueda.py) y devuelve TODO lo que hizo.
 *   - Aquí se muestra: orden de exploración, letras visitadas, ruta(s) encontrada(s),
 *     ciclos detectados y evitados, y ramas cortadas por el límite de profundidad.
 *   - Un reproductor permite ver la exploración paso a paso sobre el dibujo del grafo.
 *   - «Comparar los 5 algoritmos» ejecuta BFS, DFS, UCS, Greedy y A* sobre el mismo grafo con costos
 *     (práctica p30algoritmosbusquedacompara.py) y los compara (components/ComparacionAlgoritmos.tsx).
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: ChartBarBig (gráfica de barras), ChevronLeft (flechita ‹), ChevronRight (flechita ›), Pause (pausa), Play (reproducir), Route (ruta), SkipBack (ir al inicio), SkipForward (ir al final)
import { ChartBarBig, ChevronLeft, ChevronRight, Pause, Play, Route, SkipBack, SkipForward } from 'lucide-react'
// ▸ Desde React (librería para construir la interfaz con componentes):
//     useEffect → ejecuta código después de dibujar (cargar datos, escuchar teclas, encender la cámara...)
//     useState → guarda datos que, al cambiar, vuelven a dibujar la pantalla
//     FormEvent → tipo: el evento de enviar un formulario
import { useEffect, useState, type FormEvent } from 'react'
// ▸ Desde React Router (navegación entre pantallas según la dirección: /login, /inicio...):
//     Link → enlace para ir a otra pantalla sin recargar la página
import { Link } from 'react-router-dom'
// ▸ Desde nuestro proyecto: src/components/Aviso.tsx:
//     Aviso → mensaje verde (éxito) o rojo (error)
import { Aviso } from '../../components/Aviso'
// ▸ Desde nuestro proyecto: src/components/Boton.tsx:
//     Boton → botón que ejecuta una acción al presionarlo
import { Boton } from '../../components/Boton'
// ▸ Desde nuestro proyecto: src/components/CampoSelect.tsx:
//     CampoSelect → lista desplegable con etiqueta
import { CampoSelect } from '../../components/CampoSelect'
// ▸ Desde nuestro proyecto: src/components/ComparacionAlgoritmos.tsx:
//     ComparacionAlgoritmos → tabla, gráficas e interpretación de los 5 algoritmos
import { ComparacionAlgoritmos } from '../../components/ComparacionAlgoritmos'
// ▸ Desde nuestro proyecto: src/components/EncabezadoPagina.tsx:
//     EncabezadoPagina → título de la página con ícono o flecha de regreso
import { EncabezadoPagina } from '../../components/EncabezadoPagina'
// ▸ Desde nuestro proyecto: src/components/GrafoBusqueda.tsx:
//     GrafoBusqueda → dibujo del grafo de letras con el recorrido de la búsqueda
import { GrafoBusqueda } from '../../components/GrafoBusqueda'
// ▸ Desde nuestro proyecto: src/components/RutaRecomendada.tsx:
//     RutaRecomendada → el camino de letras con el dibujo de cada una y qué cambiar entre ellas
import { RutaRecomendada } from '../../components/RutaRecomendada'
// ▸ Desde nuestro proyecto: src/context/AppContext.tsx:
//     useApp → lee el estado global: usuario, sesión, lengua, permisos, salir()...
import { useApp } from '../../context/AppContext'
// ▸ Desde nuestro proyecto: src/hooks/useProgresoAprendizaje.ts:
//     useProgresoAprendizaje → hook con las letras logradas por el usuario
import { useProgresoAprendizaje } from '../../hooks/useProgresoAprendizaje'
// ▸ Desde nuestro proyecto: src/lib/api.ts:
//     ErrorApi → tipo de error que devuelve el backend (con mensaje y código)
import { ErrorApi } from '../../lib/api'
// ▸ Desde nuestro proyecto: src/lib/aprendizaje/grafoLetras.ts:
//     alcanzables → letras a las que se puede llegar desde una letra (sin límite de pasos)
//     grafoConCostos → grafo con costos y heurística hacia la meta (para UCS, Greedy y A*)
//     grafoLetras → arma el grafo de letras de una lengua
//     MAX_DIFERENCIAS → máximo de cambios entre letras conectadas
//     puntoDeLetra → el punto (x, y) de una letra en el plano cartesiano, con la meta en (0, 0)
//     Distancia → tipo: 'manhattan' | 'euclidiana' (cómo se mide la heurística)
import { alcanzables, grafoConCostos, grafoLetras, MAX_DIFERENCIAS, puntoDeLetra, type Distancia } from '../../lib/aprendizaje/grafoLetras'
// ▸ Desde nuestro proyecto: src/services/busqueda.ts:
//     buscarRuta → pide al servidor buscar las rutas con DFS o BFS
//     compararAlgoritmos → pide al servidor ejecutar y comparar BFS, DFS, UCS, Greedy y A*
//     caminoEnPaso → la rama que seguía DFS en un paso de la exploración
//     Algoritmo → tipo: 'dfs-todas' | 'dfs-primera' | 'bfs'
//     Comparacion → tipo: resultado de los 5 algoritmos
//     ResultadoBusqueda → tipo: lo que devolvió la búsqueda
import { buscarRuta, caminoEnPaso, compararAlgoritmos, type Algoritmo, type Comparacion, type ResultadoBusqueda } from '../../services/busqueda'

const ALGORITMOS: { valor: Algoritmo; texto: string }[] = [
  { valor: 'dfs-todas', texto: 'DFS · todas las rutas' },
  { valor: 'dfs-primera', texto: 'DFS · la primera que encuentre' },
  { valor: 'bfs', texto: 'BFS · la ruta más corta' },
]
const LIMITES = [1, 2, 3, 4, 5, 6] // límite de profundidad (el backend acepta hasta 6)
const MAX_RUTAS_VISIBLES = 15 // en la lista de "Todas las rutas"
const MAX_PASOS_VISIBLES = 120 // en la lista del orden de exploración (el reproductor muestra todos)
const MAX_CICLOS_VISIBLES = 8
const MS_POR_PASO = 450 // velocidad del reproductor

// Flechas entre letras: "A → E → S"
const conFlechas = (letras: string[]) => letras.join(' → ')

// Tarjeta con un número (ej.: "Rutas encontradas: 3").
function Dato({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-bold text-stone-600">{titulo}</p>
      <p className="mt-0.5 text-3xl font-bold text-marca-800 tabular-nums">{valor}</p>
      <p className="text-sm text-stone-600">{detalle}</p>
    </div>
  )
}

// Cuadrito de color para la leyenda del grafo.
function Muestra({ clase, children }: { clase: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-4 rounded-full ${clase}`} aria-hidden />
      {children}
    </span>
  )
}

export default function RutaAprendizaje() {
  const { lengua: lenguaElegida, puedeAdministrarUsuarios: esAdmin } = useApp() // esAdmin: regla c ∧ a
  const lengua = lenguaElegida ?? 'LSM'
  const { logradas } = useProgresoAprendizaje()
  const { letras, grafo } = grafoLetras(lengua)
  const nombres = letras.map((l) => l.letra)

  // Valores iniciales: de una letra que ya logró (o la primera) a una que aún no logra.
  const inicioSugerido = () => nombres.find((l) => logradas.includes(l)) ?? nombres[0]
  const objetivoSugerido = (desde: string) => nombres.find((l) => l !== desde && !logradas.includes(l)) ?? nombres.find((l) => l !== desde)!

  // ── Formulario ──
  const [inicio, setInicio] = useState(inicioSugerido)
  const [objetivo, setObjetivo] = useState(() => objetivoSugerido(inicioSugerido()))
  const [algoritmo, setAlgoritmo] = useState<Algoritmo>('dfs-todas')
  const [limite, setLimite] = useState(3)

  // ── Resultado y reproductor ──
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  const [paso, setPaso] = useState(0) // cuántos pasos de la exploración se muestran en el grafo
  const [reproduciendo, setReproduciendo] = useState(false)
  const [cargando, setCargando] = useState(false)
  // ── Comparación de los 5 algoritmos (se muestra en lugar del resultado de una sola búsqueda) ──
  // Se compara dos veces: con la heurística medida con Manhattan y con Euclidiana.
  const [comparacion, setComparacion] = useState<{
    datos: Record<Distancia, Comparacion>
    punto: [number, number] // la letra de inicio en el plano cartesiano
    inicio: string
    objetivo: string
  } | null>(null)
  const [comparando, setComparando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ── Vista sencilla (todas las personas): solo el camino recomendado ──
  const [rutaSimple, setRutaSimple] = useState<{ camino: string[] | null; inicio: string; objetivo: string } | null>(null)
  const [armando, setArmando] = useState(false)

  // Si cambia la lengua (LSM ↔ ASL), las letras cambian: reiniciar el formulario y el resultado.
  const [lenguaAnterior, setLenguaAnterior] = useState(lengua)
  if (lenguaAnterior !== lengua) {
    setLenguaAnterior(lengua)
    const nuevoInicio = nombres.includes(inicio) ? inicio : nombres[0]
    setInicio(nuevoInicio)
    if (!nombres.includes(objetivo) || objetivo === nuevoInicio) setObjetivo(objetivoSugerido(nuevoInicio))
    setResultado(null)
    setComparacion(null)
    setRutaSimple(null)
  }

  const total = resultado?.orden_exploracion.length ?? 0
  // El reproductor se detiene solo al llegar al último paso.
  const enReproduccion = reproduciendo && paso < total

  // Reproductor: avanza un paso cada MS_POR_PASO milisegundos.
  useEffect(() => {
    if (!enReproduccion) return
    const t = setInterval(() => setPaso((p) => Math.min(total, p + 1)), MS_POR_PASO)
    return () => clearInterval(t)
  }, [enReproduccion, total])

  // Botón «Buscar ruta»: manda el grafo al backend y muestra el resultado ya terminado.
  const buscar = async (e: FormEvent) => {
    e.preventDefault()
    if (inicio === objetivo) {
      setError('Elige dos letras distintas.')
      return
    }
    setCargando(true)
    setError(null)
    setReproduciendo(false)
    try {
      const r = await buscarRuta({ grafo, inicio, objetivo, algoritmo, limite })
      setComparacion(null)
      setResultado(r)
      setPaso(r.orden_exploracion.length) // mostrar el estado final; el reproductor permite regresar
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo buscar la ruta.')
    } finally {
      setCargando(false)
    }
  }

  // Botón «Comparar los 5 algoritmos»: manda el grafo con costos y la heurística hacia la meta,
  // una vez medida con Manhattan y otra con Euclidiana (las dos peticiones van al mismo tiempo).
  // No usa el algoritmo ni el límite del formulario: todos buscan sin límite para compararlos igual.
  const comparar = async () => {
    if (inicio === objetivo) {
      setError('Elige dos letras distintas.')
      return
    }
    setComparando(true)
    setError(null)
    setReproduciendo(false)
    try {
      const [manhattan, euclidiana] = await Promise.all(
        (['manhattan', 'euclidiana'] as const).map((d) => compararAlgoritmos({ ...grafoConCostos(lengua, objetivo, d), inicio, objetivo })),
      )
      setResultado(null)
      setComparacion({ datos: { manhattan, euclidiana }, punto: puntoDeLetra(lengua, inicio, objetivo), inicio, objetivo })
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudieron comparar los algoritmos.')
    } finally {
      setComparando(false)
    }
  }

  // Botón «Armar mi ruta» (vista sencilla): se usa A*, que da el camino que menos cambia la mano.
  // La persona solo ve el camino; los algoritmos y la heurística quedan en la vista técnica.
  const armar = async (e: FormEvent) => {
    e.preventDefault()
    if (inicio === objetivo) {
      setError('Elige dos letras distintas.')
      return
    }
    setArmando(true)
    setError(null)
    try {
      const datos = await compararAlgoritmos({ ...grafoConCostos(lengua, objetivo), inicio, objetivo })
      const astar = datos.resultados.find((r) => r.algoritmo === 'astar')
      setRutaSimple({ camino: astar?.camino ?? null, inicio, objetivo })
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo armar la ruta.')
    } finally {
      setArmando(false)
    }
  }

  // La ruta que se recomienda: la más corta de las encontradas (en BFS es la única).
  const rutaCorta = resultado?.rutas.reduce<string[] | null>((mejor, r) => (!mejor || r.length < mejor.length ? r : mejor), null) ?? null
  const pasoActual = resultado && paso > 0 && paso <= total ? resultado.orden_exploracion[paso - 1] : null
  const ramaActual = resultado && paso < total ? caminoEnPaso(resultado, paso) : []

  return (
    <>
      <EncabezadoPagina
        titulo="Ruta de aprendizaje"
        descripcion="Te armamos un camino de letras parecidas para aprender una nueva poco a poco."
        volverA="/aprender"
      />

      {/* ═════ Vista sencilla (todas las personas) ═════ */}
      <form onSubmit={armar} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Letra que ya sabes"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            opciones={nombres.map((l) => ({ valor: l, texto: logradas.includes(l) ? `${l} (lograda)` : l }))}
          />
          <CampoSelect
            etiqueta="Letra que quieres aprender"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            opciones={nombres.map((l) => ({ valor: l, texto: logradas.includes(l) ? `${l} (lograda)` : l }))}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Boton type="submit" cargando={armando}>
            <Route className="size-5" aria-hidden />
            Armar mi ruta
          </Boton>
          {error && (
            <div className="min-w-0 flex-1">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          )}
        </div>
      </form>

      {rutaSimple && (
        <div className="mt-6">
          {rutaSimple.camino ? (
            <RutaRecomendada titulo="Tu ruta" ruta={rutaSimple.camino} letras={letras} logradas={logradas} />
          ) : (
            <Aviso tipo="error">
              La {rutaSimple.objetivo} es muy distinta de las demás letras: no hay letras parecidas que lleven a ella desde la{' '}
              {rutaSimple.inicio}. Puedes{' '}
              <Link to={`/aprender/${encodeURIComponent(rutaSimple.objetivo)}`} className="font-bold underline">
                practicarla directamente
              </Link>
              .
            </Aviso>
          )}
        </div>
      )}

      {/* ═════ Vista técnica: solo administradores (regla «administrar usuarios»: c ∧ a) ═════ */}
      {esAdmin && (
        <section aria-labelledby="titulo-tecnica" className="mt-10 border-t-2 border-dashed border-stone-300 pt-8">
          <h2 id="titulo-tecnica" className="text-xl font-bold">
            Vista técnica <span className="text-base font-normal text-stone-500">· solo administradores</span>
          </h2>
          <p className="mt-1 text-stone-600">
            Cómo se calcula la ruta: algoritmos de búsqueda, costos y heurística, con las letras elegidas arriba ({inicio} → {objetivo}).
          </p>

          {/* Explicación corta (se puede abrir y cerrar) */}
          <details className="mt-4 rounded-2xl border border-marca-200 bg-marca-50/60 p-4 sm:p-5">
            <summary className="cursor-pointer font-bold text-marca-900">¿Cómo funciona?</summary>
            <div className="mt-3 space-y-2 text-stone-700">
              <p>
                Cada <strong>letra</strong> es un punto del grafo. Dos letras están <strong>conectadas</strong> si su forma de mano cambia en
                {` ${MAX_DIFERENCIAS} detalles o menos`} (un dedo, el pulgar, girar la mano…).
              </p>
              <p>
                <strong>DFS</strong> avanza por un camino lo más lejos posible y, si no llega, regresa y prueba otro (<em>backtracking</em>).{' '}
                <strong>BFS</strong> revisa por niveles, por eso encuentra la ruta con menos pasos.
              </p>
              <p>
                Como las letras se parecen en ambos sentidos hay <strong>ciclos</strong> (A → E → S → A). Para no dar vueltas para siempre, el
                algoritmo recuerda las letras <strong>visitadas</strong>. El <strong>límite de profundidad</strong> es el máximo de pasos: al
                llegar a él, la rama se corta.
              </p>
              <p>
                <strong>Costo:</strong> cuántos detalles de la mano cambian en cada paso. <strong>Heurística:</strong> cuántos detalles le faltan a
                una letra para ser la meta, medido como distancia <strong>Manhattan</strong> (cuadro por cuadro: de (3, 4) a la meta, 3 + 4 = 7)
                o <strong>Euclidiana</strong> (en línea recta: √(3² + 4²) = 5). <strong>UCS</strong> busca el menor costo, <strong>Greedy</strong> sigue la heurística y{' '}
                <strong>A*</strong> combina ambas (es el que usa «Armar mi ruta»).
              </p>
            </div>
          </details>

          <form onSubmit={buscar} className="mt-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSelect etiqueta="Algoritmo" value={algoritmo} onChange={(e) => setAlgoritmo(e.target.value as Algoritmo)} opciones={ALGORITMOS} />
              <CampoSelect
                etiqueta="Límite de profundidad"
                value={String(limite)}
                onChange={(e) => setLimite(Number(e.target.value))}
                opciones={LIMITES.map((n) => ({ valor: String(n), texto: `${n} ${n === 1 ? 'paso' : 'pasos'}` }))}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Boton type="submit" variante="secundario" cargando={cargando}>
                <Route className="size-5" aria-hidden />
                Buscar con este algoritmo
              </Boton>
              <Boton type="button" variante="secundario" cargando={comparando} onClick={comparar}>
                <ChartBarBig className="size-5" aria-hidden />
                Comparar los 5 algoritmos
              </Boton>
            </div>
          </form>

      {comparacion && (
        <ComparacionAlgoritmos
          comparaciones={comparacion.datos}
          punto={comparacion.punto}
          letras={nombres}
          grafo={grafo}
          inicio={comparacion.inicio}
          objetivo={comparacion.objetivo}
        />
      )}

      {resultado && (
        <div className="mt-8 space-y-6">
          {/* ── Números de la búsqueda ── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Dato titulo="Exploraciones" valor={total} detalle="letras revisadas, con repeticiones" />
            <Dato titulo="Letras visitadas" valor={resultado.visitados.length} detalle="letras distintas" />
            <Dato titulo="Rutas encontradas" valor={resultado.rutas.length} detalle={`de ${resultado.inicio} a ${resultado.objetivo}`} />
            <Dato titulo="Ciclos evitados" valor={resultado.ciclos_evitados.length} detalle={`${resultado.repetidos_evitados} veces se evitó repetir`} />
            <Dato titulo="Ramas cortadas" valor={resultado.ramas_cortadas} detalle={`por el límite de ${resultado.limite} pasos`} />
          </div>

          {resultado.truncado && (
            <p className="rounded-xl border-2 border-stone-200 bg-stone-100 p-4 text-stone-700">
              Hay demasiadas rutas con este límite: la búsqueda se detuvo al llegar al tope del servidor. Prueba con un límite menor.
            </p>
          )}

          {/* ── Grafo + reproductor ── */}
          <section aria-labelledby="titulo-grafo" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="titulo-grafo" className="text-lg font-bold">
              Recorrido en el grafo
            </h2>
            <p className="text-stone-600">Usa los controles para ver, paso a paso, en qué orden se exploraron las letras.</p>

            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
              <div className="mx-auto w-full max-w-md">
                <GrafoBusqueda letras={nombres} grafo={grafo} resultado={resultado} paso={paso} rutaFinal={rutaCorta} />
              </div>

              <div className="space-y-4">
                {/* Controles del reproductor */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { icono: SkipBack, etiqueta: 'Ir al inicio', accion: () => setPaso(0) },
                    { icono: ChevronLeft, etiqueta: 'Paso anterior', accion: () => setPaso((p) => Math.max(0, p - 1)) },
                    { icono: ChevronRight, etiqueta: 'Paso siguiente', accion: () => setPaso((p) => Math.min(total, p + 1)) },
                    { icono: SkipForward, etiqueta: 'Ir al final', accion: () => setPaso(total) },
                  ].map(({ icono: Icono, etiqueta, accion }) => (
                    <button
                      key={etiqueta}
                      type="button"
                      onClick={() => {
                        setReproduciendo(false)
                        accion()
                      }}
                      className="grid size-11 place-items-center rounded-xl border-2 border-stone-200 text-stone-700 hover:bg-stone-100"
                      aria-label={etiqueta}
                      title={etiqueta}
                    >
                      <Icono className="size-5" />
                    </button>
                  ))}
                  <Boton
                    type="button"
                    variante="secundario"
                    onClick={() => {
                      if (!enReproduccion && paso >= total) setPaso(0) // al final: reproducir desde el inicio
                      setReproduciendo(!enReproduccion)
                    }}
                  >
                    {enReproduccion ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
                    {enReproduccion ? 'Pausar' : 'Reproducir'}
                  </Boton>
                </div>
                <input
                  type="range"
                  min={0}
                  max={total}
                  value={paso}
                  onChange={(e) => {
                    setReproduciendo(false)
                    setPaso(Number(e.target.value))
                  }}
                  className="w-full accent-marca-700"
                  aria-label="Paso de la exploración"
                />

                {/* Qué está pasando en este paso */}
                <div className="rounded-2xl bg-stone-50 p-4" aria-live="polite">
                  {paso >= total ? (
                    <p>
                      <strong>Búsqueda terminada.</strong>{' '}
                      {rutaCorta ? `Se resalta la ruta más corta: ${conFlechas(rutaCorta)}.` : 'No se encontró ninguna ruta con este límite.'}
                    </p>
                  ) : paso === 0 ? (
                    <p>
                      <strong>Paso 0 de {total}.</strong> La búsqueda empieza en {resultado.inicio}.
                    </p>
                  ) : (
                    <p>
                      <strong>
                        Paso {paso} de {total}:
                      </strong>{' '}
                      revisando <strong>{pasoActual?.nodo}</strong> (profundidad {pasoActual?.profundidad}).
                      {resultado.algoritmo !== 'bfs' && <> Rama actual: {conFlechas(ramaActual)}.</>}
                    </p>
                  )}
                </div>

                {/* Leyenda de colores */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
                  <Muestra clase="border-[1.5px] border-stone-300 bg-white">Sin explorar</Muestra>
                  <Muestra clase="border-[1.5px] border-marca-300 bg-marca-100">Explorada</Muestra>
                  <Muestra clase="bg-marca-700">{paso >= total ? 'Ruta encontrada' : 'Rama actual'}</Muestra>
                  <Muestra clase="border-[3px] border-orange-700 bg-white">Revisando ahora</Muestra>
                  <Muestra clase="border-2 border-dashed border-stone-500 bg-white">Cortada por el límite</Muestra>
                </div>
              </div>
            </div>
          </section>

          {/* ── Ruta más corta de las encontradas, con el dibujo de cada letra y qué cambia ── */}
          {rutaCorta ? (
            <RutaRecomendada titulo="Ruta más corta encontrada" ruta={rutaCorta} letras={letras} logradas={logradas} />
          ) : (
            <Aviso tipo="error">
              No hay ruta de {resultado.inicio} a {resultado.objetivo} con un límite de {resultado.limite} pasos.{' '}
              {alcanzables(grafo, resultado.inicio).has(resultado.objetivo)
                ? 'Prueba con un límite mayor.'
                : 'Estas letras están en grupos distintos del grafo: ninguna cadena de letras parecidas las une, aunque subas el límite.'}
            </Aviso>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Todas las rutas encontradas ── */}
            <section aria-labelledby="titulo-rutas" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 id="titulo-rutas" className="text-lg font-bold">
                Rutas encontradas ({resultado.rutas.length})
              </h2>
              <p className="text-stone-600">Caminos que sí llegan a {resultado.objetivo}, en el orden en que se encontraron.</p>
              {resultado.rutas.length ? (
                <ol className="mt-3 space-y-1.5">
                  {resultado.rutas.slice(0, MAX_RUTAS_VISIBLES).map((ruta, i) => (
                    <li key={ruta.join('')} className={`rounded-lg px-3 py-1.5 ${ruta === rutaCorta ? 'bg-marca-50 font-bold text-marca-900' : ''}`}>
                      <span className="text-stone-500">Ruta {i + 1}:</span> {conFlechas(ruta)}
                      {ruta === rutaCorta && <span className="text-sm"> · la más corta</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-stone-500">Ninguna.</p>
              )}
              {resultado.rutas.length > MAX_RUTAS_VISIBLES && <p className="mt-2 text-sm text-stone-500">…y {resultado.rutas.length - MAX_RUTAS_VISIBLES} más.</p>}
            </section>

            {/* ── Ciclos y límite: cómo se evitó buscar para siempre ── */}
            <section aria-labelledby="titulo-ciclos" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 id="titulo-ciclos" className="text-lg font-bold">
                Ciclos evitados ({resultado.ciclos_evitados.length})
              </h2>
              <p className="text-stone-600">
                Antes de avanzar a una letra se revisa si ya está en el camino (letras visitadas). Si está, avanzar formaría un ciclo, así que se
                descarta.
              </p>
              {resultado.ciclos_evitados.length ? (
                <ul className="mt-3 space-y-1">
                  {resultado.ciclos_evitados.slice(0, MAX_CICLOS_VISIBLES).map((ciclo) => (
                    <li key={ciclo.join('')}>↻ {conFlechas(ciclo)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-stone-500">No se encontraron ciclos con este límite.</p>
              )}
              {resultado.ciclos_evitados.length > MAX_CICLOS_VISIBLES && (
                <p className="mt-1 text-sm text-stone-500">…y {resultado.ciclos_evitados.length - MAX_CICLOS_VISIBLES} más.</p>
              )}

              <h3 className="mt-5 font-bold">Límite de profundidad: {resultado.limite} pasos</h3>
              <p className="text-stone-600">
                {resultado.cortes_por_limite.length
                  ? `Se cortaron ${resultado.ramas_cortadas} ramas al llegar al límite, en las letras: ${resultado.cortes_por_limite.join(', ')}.`
                  : 'Ninguna rama llegó al límite.'}
              </p>
            </section>
          </div>

          {/* ── Orden de exploración ── */}
          <section aria-labelledby="titulo-orden" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="titulo-orden" className="text-lg font-bold">
              Orden de exploración ({total})
            </h2>
            <p className="text-stone-600">
              Todas las letras que el algoritmo revisó, en orden. <strong>No es lo mismo que la ruta:</strong> la ruta solo incluye las letras que
              llevan a {resultado.objetivo}. El número pequeño es la profundidad (pasos desde {resultado.inicio}).
            </p>
            <ol className="mt-4 flex flex-wrap gap-1.5">
              {resultado.orden_exploracion.slice(0, MAX_PASOS_VISIBLES).map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setReproduciendo(false)
                      setPaso(i + 1)
                    }}
                    className={`inline-flex items-baseline gap-1 rounded-lg border px-2 py-1 font-bold ${
                      i + 1 === paso ? 'border-orange-700 bg-orange-50 text-orange-900' : 'border-stone-200 text-stone-800 hover:bg-stone-100'
                    }`}
                    aria-label={`Paso ${i + 1}: ${p.nodo}, profundidad ${p.profundidad}`}
                  >
                    {p.nodo}
                    <sub className="text-xs font-normal text-stone-500">{p.profundidad}</sub>
                  </button>
                </li>
              ))}
            </ol>
            {total > MAX_PASOS_VISIBLES && (
              <p className="mt-2 text-sm text-stone-500">…y {total - MAX_PASOS_VISIBLES} más (usa el reproductor para verlos todos).</p>
            )}
            <p className="mt-4 text-sm text-stone-600">
              <span className="font-bold text-stone-800">Letras visitadas (sin repetir): </span>
              {resultado.visitados.join(', ')}
            </p>
          </section>
        </div>
      )}
        </section>
      )}
    </>
  )
}
