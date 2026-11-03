/**
 * MANI · QUÉ CONTESTAR Y QUÉ HACER
 *
 * Recibe la intención (entender.ts) y lo que pasa en la app (configuración, lengua, letras,
 * recomendaciones de la IA) y arma la respuesta de Mani:
 *   - el texto del globo y su ánimo (feliz, pensando...),
 *   - los cambios que hay que aplicar (configuración o lengua), con opción de deshacer,
 *   - lo que se muestra debajo: una pantalla a la que ir, el dibujo de una letra, preguntas de Ayuda...
 *
 * No cambia nada por sí misma: solo DICE qué hacer (así se puede probar sin pantalla).
 * Quien aplica los cambios es el componente AsistenteMani.
 */
// ▸ Desde nuestro proyecto:
import type { Animo } from '../../components/Mascota'
import type { Letra } from '../aprendizaje/alfabeto'
import { palabraPorNombre, type Palabra } from '../aprendizaje/palabras'
import { COLORES_PRINCIPALES, PALETAS } from '../colores'
import { ESCALA_TEXTO, CONFIGURACION_INICIAL, type Configuracion, type TamanoTexto } from '../configuracion'
import type { Recomendacion } from '../ia/dominio'
import { LENGUAS, type Lengua } from '../tipos'
import type { Destino, Intencion, PreguntaEncontrada, QueAjuste, Direccion } from './entender'

export interface ContextoMani {
  config: Configuracion
  lengua: Lengua
  letras: Letra[]
  recomendaciones: Recomendacion[]
  /** ¿Hay un cambio anterior que se pueda deshacer? */
  puedeDeshacer: boolean
}

export interface Respuesta {
  texto: string
  animo: Animo
  /** Cambios de configuración que hay que aplicar. */
  cambios?: Partial<Configuracion>
  /** Cambiar la lengua de señas. */
  lengua?: Lengua
  /** Ir a esta pantalla en cuanto se conteste. */
  irA?: Destino
  /** Botón para ir a una pantalla (sin ir sola). */
  enlace?: Destino
  /** Dibujo y pasos de una letra. */
  letra?: Letra
  /** Pasos de la seña de una palabra. */
  palabra?: Palabra
  preguntas?: PreguntaEncontrada[]
  recomendaciones?: Recomendacion[]
  /** Botones con frases que el usuario puede tocar para responder rápido. */
  sugerencias?: string[]
  /** Pedir al componente que deshaga el último cambio. */
  deshacer?: boolean
}

/** Frases de ejemplo para empezar. */
export function sugerenciasIniciales(lengua: Lengua): string[] {
  return ['¿Qué practico hoy?', 'Pon la app en azul', lengua === 'LSM' ? '¿Cómo se hace la Ñ?' : '¿Cómo se hace la J?', 'No me prende la cámara']
}

const ORDEN_TEXTO: TamanoTexto[] = ['normal', 'grande', 'muy-grande']
const limitar = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100

/** Ajustes de sí/no: qué opción cambian y cómo lo dice Mani. */
const INTERRUPTORES: Partial<Record<QueAjuste, { opcion: keyof Configuracion; invertido?: boolean; si: string; no: string }>> = {
  contraste: { opcion: 'altoContraste', si: 'Activé el alto contraste: textos y bordes más oscuros.', no: 'Quité el alto contraste.' },
  // «Activar animaciones» = apagar «Reducir movimiento».
  movimiento: { opcion: 'reducirMovimiento', invertido: true, si: 'Volví a poner las animaciones.', no: 'Quité las animaciones de la app.' },
  sonidos: { opcion: 'sonidosJuegos', si: 'Prendí los sonidos de los juegos.', no: 'Silencié los sonidos de los juegos.' },
  historial: { opcion: 'guardarHistorial', si: 'Desde ahora guardo tus traducciones en el Historial.', no: 'Ya no guardo tus traducciones en el Historial.' },
  autocorreccion: { opcion: 'autocorreccion', si: 'Activé el autocorrector de palabras.', no: 'Apagué el autocorrector: escribiré las palabras tal cual.' },
}

function ajustar(que: QueAjuste, direccion: Direccion, config: Configuracion): Respuesta {
  const interruptor = INTERRUPTORES[que]
  if (interruptor) {
    const activar = direccion !== 'desactivar'
    const valor = interruptor.invertido ? !activar : activar
    if (config[interruptor.opcion] === valor) return { texto: activar ? 'Eso ya estaba activado. 👍' : 'Eso ya estaba apagado. 👍', animo: 'feliz' }
    return { texto: activar ? interruptor.si : interruptor.no, animo: 'fiesta', cambios: { [interruptor.opcion]: valor } }
  }

  if (que === 'texto') {
    const i = ORDEN_TEXTO.indexOf(config.tamanoTexto)
    const nuevo = direccion === 'normal' ? 'normal' : ORDEN_TEXTO[Math.min(ORDEN_TEXTO.length - 1, Math.max(0, i + (direccion === 'menos' ? -1 : 1)))]
    if (nuevo === config.tamanoTexto) {
      return { texto: direccion === 'menos' || direccion === 'normal' ? 'La letra ya está en su tamaño normal, el más chico.' : 'La letra ya está en su tamaño más grande.', animo: 'feliz' }
    }
    return { texto: `Listo: letra «${ESCALA_TEXTO[nuevo].nombre.toLowerCase()}».`, animo: 'fiesta', cambios: { tamanoTexto: nuevo } }
  }

  if (que === 'vozVelocidad') {
    const v = limitar(config.vozVelocidad + (direccion === 'menos' ? -0.2 : 0.2), 0.5, 1.5)
    if (v === config.vozVelocidad) return { texto: direccion === 'menos' ? 'Ya hablo lo más lento que puedo.' : 'Ya hablo lo más rápido que puedo.', animo: 'feliz' }
    return { texto: direccion === 'menos' ? 'Ok, hablaré más despacio.' : 'Ok, hablaré más rápido.', animo: 'fiesta', cambios: { vozVelocidad: v } }
  }

  // Volumen de la voz.
  const v = limitar(config.vozVolumen + (direccion === 'menos' ? -0.25 : 0.25), 0, 1)
  if (v === config.vozVolumen) return { texto: direccion === 'menos' ? 'La voz ya está sin volumen.' : 'La voz ya está al máximo.', animo: 'feliz' }
  return { texto: `Volumen de la voz: ${Math.round(v * 100)} %.`, animo: 'fiesta', cambios: { vozVolumen: v } }
}

const nombresColores = () => COLORES_PRINCIPALES.map((c) => PALETAS[c].nombre.toLowerCase()).join(', ')

export function responder(intencion: Intencion, ctx: ContextoMani): Respuesta {
  switch (intencion.tipo) {
    case 'color': {
      const { color } = intencion
      if (intencion.noDisponible) {
        return {
          texto: `No tengo ${intencion.noDisponible}${intencion.noDisponible.startsWith('roj') ? ': el rojo es solo para emergencias' : ''}. Puedo ponerme ${nombresColores()}.`,
          animo: 'pensando',
          sugerencias: COLORES_PRINCIPALES.map((c) => `Color ${PALETAS[c].nombre.toLowerCase()}`),
        }
      }
      if (!color) {
        const opciones = intencion.opciones ?? COLORES_PRINCIPALES
        return {
          texto: intencion.opciones ? '¿Cuál de los dos prefieres?' : `¿De qué color? Tengo ${nombresColores()}.`,
          animo: 'pensando',
          sugerencias: opciones.map((c) => `Color ${PALETAS[c].nombre.toLowerCase()}`),
        }
      }
      if (color === ctx.config.colorPrincipal) return { texto: `¡Ya soy ${PALETAS[color].adjetivo}! 😄`, animo: 'feliz' }
      return { texto: `¡Listo! Ahora soy ${PALETAS[color].adjetivo}.`, animo: 'fiesta', cambios: { colorPrincipal: color } }
    }

    case 'modo-oscuro':
      return {
        texto: 'Todavía no tengo modo oscuro. Lo más parecido: ponerme en color negro o activar el alto contraste.',
        animo: 'pensando',
        sugerencias: ['Color negro', 'Activa el alto contraste'],
      }

    case 'ajuste':
      return ajustar(intencion.que, intencion.direccion, ctx.config)

    case 'lengua': {
      const { lengua } = intencion
      if (!lengua) return { texto: '¿Qué lengua de señas quieres usar?', animo: 'pensando', sugerencias: ['Cambia a LSM', 'Cambia a ASL'] }
      if (lengua === ctx.lengua) return { texto: `Ya estamos usando ${lengua} (${LENGUAS[lengua].nombre}).`, animo: 'feliz' }
      return { texto: `Cambié a ${lengua}: ${LENGUAS[lengua].nombre}. El alfabeto, los juegos y los traductores ya usan ${lengua}.`, animo: 'fiesta', lengua }
    }

    case 'ir':
      return { texto: `¡Vamos a ${intencion.destino.titulo}!`, animo: 'feliz', irA: intencion.destino }

    case 'letra': {
      const letra = ctx.letras.find((l) => l.letra === intencion.letra)
      if (!letra) {
        return { texto: `La ${intencion.letra} no está en el alfabeto de ${ctx.lengua}.`, animo: 'pensando' }
      }
      const inicio = intencion.leCuesta ? `¡No te preocupes! La ${letra.letra} se hace así:` : `Así se hace la ${letra.letra} en ${ctx.lengua}:`
      return {
        texto: inicio,
        animo: 'atento',
        letra,
        enlace: { ruta: `/aprender/${encodeURIComponent(letra.letra)}`, titulo: `Practicar la ${letra.letra} con la cámara` },
      }
    }

    case 'palabra': {
      const palabra = palabraPorNombre(intencion.nombre, ctx.lengua)
      if (!palabra) {
        return {
          texto: `Todavía no tengo «${intencion.nombre}» en ${ctx.lengua}. Mira las palabras que sí tengo:`,
          animo: 'pensando',
          enlace: { ruta: '/aprender/palabras', titulo: 'Palabras y frases' },
        }
      }
      return {
        texto: `Así se dice «${palabra.palabra}» en ${ctx.lengua}${palabra.dosManos ? ' (con las dos manos)' : ''}:`,
        animo: 'atento',
        palabra,
        enlace: { ruta: `/aprender/palabras/${palabra.id}`, titulo: 'Ver la seña y practicarla' },
      }
    }

    case 'practicar': {
      const recomendaciones = ctx.recomendaciones.slice(0, 3)
      if (!recomendaciones.length) {
        return { texto: '¡Dominas todas las letras! Prueba a deletrear palabras en los juegos.', animo: 'fiesta', enlace: { ruta: '/aprender/juegos/palabra', titulo: 'Deletrear palabras' } }
      }
      return { texto: 'Esto te recomiendo practicar ahora:', animo: 'atento', recomendaciones }
    }

    case 'deshacer':
      return ctx.puedeDeshacer ? { texto: 'Listo, lo dejé como estaba.', animo: 'feliz', deshacer: true } : { texto: 'No hay nada que deshacer.', animo: 'pensando' }

    case 'saludo':
      return { texto: '¡Hola! ¿En qué te ayudo?', animo: 'hola', sugerencias: sugerenciasIniciales(ctx.lengua) }

    case 'gracias':
      return { texto: '¡De nada! Aquí estoy si me necesitas. 🙌', animo: 'fiesta' }

    case 'presentacion':
      return {
        texto:
          'Soy Mani, tu asistente. Puedo enseñarte cómo se hace una letra, decirte qué practicar, contestar dudas de la app, llevarte a cualquier pantalla y cambiar ajustes como el color, el tamaño de la letra o la voz.',
        animo: 'hola',
        sugerencias: sugerenciasIniciales(ctx.lengua),
      }

    case 'pregunta':
      return { texto: intencion.preguntas.length > 1 ? 'Encontré esto en la Ayuda:' : 'Esto dice la Ayuda:', animo: 'atento', preguntas: intencion.preguntas }

    case 'no-entendi':
      return {
        texto: 'Mmm… no te entendí. Prueba con algo como estos ejemplos:',
        animo: 'pensando',
        sugerencias: sugerenciasIniciales(ctx.lengua),
        enlace: { ruta: '/ayuda', titulo: 'Ver toda la Ayuda' },
      }
  }
}

/** Para deshacer: los valores que había antes de aplicar estos cambios. */
export function valoresAnteriores(config: Configuracion, cambios: Partial<Configuracion>): Partial<Configuracion> {
  return Object.fromEntries(Object.keys(cambios).map((k) => [k, config[k as keyof Configuracion] ?? CONFIGURACION_INICIAL[k as keyof Configuracion]]))
}
