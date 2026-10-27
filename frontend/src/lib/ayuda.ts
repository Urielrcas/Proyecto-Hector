/*
 * CONTENIDO DE LA AYUDA
 * Preguntas frecuentes por tema (las muestra pages/ayuda/Ayuda.tsx) y el buscador.
 * Para agregar una pregunta: agrégala en el tema que corresponda.
 */
// ▸ Desde Lucide (librería de íconos):
import { BookOpen, Camera, Hand, History, Mic, Rocket, Settings, Siren, Users, Wrench, type LucideIcon } from 'lucide-react'

export interface Pregunta {
  pregunta: string
  respuesta: string
}

export interface Tema {
  id: string
  titulo: string
  icono: LucideIcon
  /** Pantalla relacionada (para el enlace «Ir a …»). */
  ruta?: string
  preguntas: Pregunta[]
}

export const TEMAS: Tema[] = [
  {
    id: 'inicio',
    titulo: 'Primeros pasos',
    icono: Rocket,
    ruta: '/inicio',
    preguntas: [
      {
        pregunta: '¿Para qué sirve la aplicación?',
        respuesta:
          'Traduce entre lengua de señas y español: tú deletreas con la mano frente a la cámara y la app lo escribe y lo lee en voz alta; o alguien habla o escribe y la app lo muestra en señas.',
      },
      {
        pregunta: '¿Qué diferencia hay entre LSM y ASL?',
        respuesta:
          'LSM es la Lengua de Señas Mexicana (27 letras, incluye Ñ). ASL es la American Sign Language (26 letras). Algunas letras se hacen distinto. Puedes cambiar de lengua en el menú lateral o en Configuración.',
      },
      {
        pregunta: '¿Necesito una cuenta?',
        respuesta:
          'No. Como invitado puedes usar todo, pero tu progreso y tu historial se guardan solo en este navegador. Con una cuenta se guardan en el servidor y los ves en cualquier equipo.',
      },
    ],
  },
  {
    id: 'camara',
    titulo: 'La cámara',
    icono: Camera,
    preguntas: [
      {
        pregunta: '¿Cómo pongo la mano para que la reconozca?',
        respuesta:
          'Usa la mano derecha, a unos 40–60 cm de la cámara, con buena luz de frente y la mano completa dentro del recuadro. Un fondo liso ayuda. Cuando la app ve tu mano, aparece «Mano detectada».',
      },
      {
        pregunta: 'La cámara no enciende',
        respuesta:
          'Revisa que le diste permiso al navegador (ícono del candado junto a la dirección) y que ninguna otra aplicación, como una videollamada, esté usando la cámara. Luego recarga la página.',
      },
      {
        pregunta: '¿Se graba o se envía mi video?',
        respuesta:
          'No. El video se analiza en tu propio equipo y nunca se envía a ningún servidor. La app solo calcula la posición de tus dedos (21 puntos de la mano).',
      },
    ],
  },
  {
    id: 'senas-texto',
    titulo: 'Señas → Texto y voz',
    icono: Hand,
    ruta: '/traductor/senas',
    preguntas: [
      {
        pregunta: '¿Cómo deletreo una palabra?',
        respuesta:
          'Haz cada letra y mantén la mano quieta un momento: se escribe sola y el recuadro se pone verde. Para terminar la palabra, baja la mano un segundo y medio: se agrega un espacio y se lee en voz alta.',
      },
      {
        pregunta: '¿Cómo repito una letra, como la L de «calle»?',
        respuesta: 'Baja la mano un instante o cambia de forma, y vuelve a hacer la letra.',
      },
      {
        pregunta: 'No distingue la I de la J (o la N de la Ñ)',
        respuesta:
          'Tienen la misma forma y solo cambian por el movimiento. Si dejas la mano quieta se escribe la primera (I, N, K); si haces el movimiento, la segunda (J, Ñ, P).',
      },
      {
        pregunta: '¿Qué hace «Corregir frase»?',
        respuesta:
          'Separa las palabras pegadas y pone acentos y signos. Por ejemplo, «HOLACOMO ESTAS» → «Hola, ¿cómo estás?». Necesita que el servidor esté encendido.',
      },
    ],
  },
  {
    id: 'voz-senas',
    titulo: 'Voz / Texto → Señas',
    icono: Mic,
    ruta: '/traductor/voz',
    preguntas: [
      {
        pregunta: 'El micrófono no funciona',
        respuesta:
          'El reconocimiento de voz funciona en Chrome y Edge y necesita internet. Da permiso al micrófono. Si no puedes usarlo, cambia a la pestaña «Escribir».',
      },
      {
        pregunta: '¿Por qué el mensaje sale letra por letra?',
        respuesta:
          'Por ahora los mensajes se muestran deletreados con el alfabeto. Puedes cambiar la velocidad en el reproductor o en Configuración → Señas.',
      },
    ],
  },
  {
    id: 'conversacion',
    titulo: 'Modo conversación',
    icono: Users,
    ruta: '/conversacion',
    preguntas: [
      {
        pregunta: '¿Cómo funciona?',
        respuesta:
          'La pantalla se divide en dos: la persona sorda deletrea con la cámara y la oyente lo escucha; la persona oyente habla o escribe y la sorda lo ve en señas.',
      },
      {
        pregunta: '¿Qué es el envío automático?',
        respuesta:
          'Si está activado, el mensaje deletreado se envía solo cuando la persona sorda baja la mano 3 segundos. Si no, se envía con el botón «Enviar».',
      },
      {
        pregunta: '¿Para qué es «Cara a cara»?',
        respuesta: 'Gira el panel de la persona oyente para poner una tableta sobre la mesa y que cada quien vea su lado al derecho.',
      },
    ],
  },
  {
    id: 'aprender',
    titulo: 'Aprendizaje y juegos',
    icono: BookOpen,
    ruta: '/aprender',
    preguntas: [
      {
        pregunta: '¿Cuándo se marca una letra como «lograda»?',
        respuesta:
          'Cuando la cámara ve la forma correcta de tu mano durante un momento y, si la letra lleva movimiento (como la J o la Z), también el movimiento.',
      },
      {
        pregunta: 'Hago una letra un poco diferente y no me la acepta',
        respuesta:
          'Practícala unos segundos: la app te ofrecerá «Recordar mi forma». Haz la letra como siempre la haces durante 3 segundos y la IA la recordará; desde entonces la acepta en la práctica, los juegos y el traductor. Puedes verla u olvidarla en «Mi IA».',
      },
      {
        pregunta: '¿Qué es la ruta de aprendizaje?',
        respuesta: 'Te arma un camino de letras parecidas para llegar poco a poco a la letra que quieres aprender.',
      },
      {
        pregunta: '¿Cómo pruebo si ya me sé una letra?',
        respuesta:
          'En Aprendizaje → Juegos. En «Reto contra reloj» eliges las letras que crees que ya sabes y debes hacerlas sin ver el dibujo antes de que se acabe el tiempo. Si pides una pista, la letra vale la mitad.',
      },
    ],
  },
  {
    id: 'historial',
    titulo: 'Historial',
    icono: History,
    ruta: '/historial',
    preguntas: [
      {
        pregunta: '¿Qué se guarda en el historial?',
        respuesta:
          'Lo que deletreas en Señas → Texto, lo que se muestra en Voz → Señas y los mensajes del Modo conversación. Se guarda solo, unos segundos después de cada cambio.',
      },
      {
        pregunta: '¿Alguien más puede ver mi historial?',
        respuesta: 'No. Es privado: ni el administrador puede verlo. Puedes borrar un registro o todo el historial cuando quieras.',
      },
      {
        pregunta: '¿Cómo dejo de guardar?',
        respuesta: 'En Configuración → Historial, apaga «Guardar mis traducciones».',
      },
    ],
  },
  {
    id: 'configuracion',
    titulo: 'Configuración y accesibilidad',
    icono: Settings,
    ruta: '/configuracion',
    preguntas: [
      {
        pregunta: '¿Puedo agrandar la letra?',
        respuesta: 'Sí. En Configuración → Accesibilidad elige «Grande» o «Muy grande». También puedes activar alto contraste.',
      },
      {
        pregunta: 'La voz habla muy rápido',
        respuesta: 'En Configuración → Voz baja la velocidad y presiona «Probar voz» para escucharla.',
      },
    ],
  },
  {
    id: 'emergencia',
    titulo: 'Emergencias',
    icono: Siren,
    ruta: '/emergencia',
    preguntas: [
      {
        pregunta: '¿Cómo pido ayuda rápido?',
        respuesta:
          'Usa el botón rojo de emergencia del menú: muestra frases listas («Necesito ayuda urgente», «Tengo dolor», «Llame a una ambulancia»…) que se leen en voz alta. Funciona incluso sin iniciar sesión.',
      },
    ],
  },
  {
    id: 'problemas',
    titulo: 'Problemas comunes',
    icono: Wrench,
    preguntas: [
      {
        pregunta: '«No hay conexión con el servidor»',
        respuesta:
          'El backend está apagado o no hay internet. Puedes seguir usando la cámara y el aprendizaje; tu progreso y tu historial se suben cuando vuelve la conexión.',
      },
      {
        pregunta: 'No reconoce bien una letra',
        respuesta:
          'La evaluación es aproximada y se basa en la posición de tus dedos. Mejora la luz, acerca la mano y revisa en Aprendizaje qué dedo marca en rojo. En el traductor puedes usar «Agregar» para escribir la letra que se ve.',
      },
      {
        pregunta: 'No se escucha la voz',
        respuesta: 'Sube el volumen del equipo y revisa Configuración → Voz (volumen y voz elegida).',
      },
    ],
  },
]

/** Texto sin acentos y en minúsculas, para buscar «como» y encontrar «cómo». */
export const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Temas con solo las preguntas que contienen todas las palabras buscadas. */
export function filtrarTemas(temas: Tema[], busqueda: string): Tema[] {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean)
  if (!palabras.length) return temas
  return temas
    .map((t) => ({
      ...t,
      preguntas: t.preguntas.filter((p) => {
        const texto = normalizar(`${t.titulo} ${p.pregunta} ${p.respuesta}`)
        return palabras.every((w) => texto.includes(w))
      }),
    }))
    .filter((t) => t.preguntas.length > 0)
}

