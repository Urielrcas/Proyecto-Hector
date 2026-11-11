/*
 * SECCIONES DEL MENÚ
 * Cada sección tiene: ruta, título, descripción e ícono (de la librería lucide-react).
 *   - MENU (al final) define qué aparece en el menú lateral y en qué orden.
 *   - soloAdmin: true oculta la sección a quien no es administrador.
 * Para cambiar el nombre o el ícono de una sección del menú, edítalo aquí.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: Languages (idiomas), BookOpen (libro abierto), Brain (cerebro), ChartColumn (gráfica de barras), CircleHelp (círculo con ?), Cpu (chip), Hand (mano), History (reloj de historial), House (casa), Mic (micrófono), Settings (engrane), Siren (sirena), UserCog (usuario con engrane), Users (dos personas), LucideIcon (tipo: cualquier ícono de Lucide)
import {
  BookOpen,
  Brain,
  ChartColumn,
  CircleHelp,
  Cpu,
  Hand,
  History,
  House,
  Languages,
  Mic,
  Settings,
  Siren,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface Seccion {
  ruta: string
  titulo: string
  descripcion: string
  icono: LucideIcon
  soloAdmin?: boolean
  /** Otras rutas en las que esta sección se marca como activa en el menú. */
  activaEn?: string[]
}

export const INICIO: Seccion = { ruta: '/inicio', titulo: 'Inicio', descripcion: '', icono: House }

export const SENAS_TEXTO: Seccion = {
  ruta: '/traductor/senas',
  titulo: 'Señas → Texto y voz',
  descripcion: 'Haz señas frente a la cámara y escucha la traducción.',
  icono: Hand,
}

export const VOZ_SENAS: Seccion = {
  ruta: '/traductor/voz',
  titulo: 'Voz / Texto → Señas',
  descripcion: 'Habla o escribe y el avatar lo muestra en señas.',
  icono: Mic,
}

export const CONVERSACION: Seccion = {
  ruta: '/conversacion',
  titulo: 'Modo conversación',
  descripcion: 'Pantalla dividida para dos personas.',
  icono: Users,
}

/** Sección del menú que junta los tres modos de traducción (Señas→Texto, Voz→Señas y Conversación). */
export const TRADUCIR: Seccion = {
  ruta: '/traductor/senas',
  titulo: 'Traducir',
  descripcion: 'Señas, voz y texto, o una conversación.',
  icono: Languages,
  activaEn: ['/traductor', '/conversacion'],
}

/** Los modos que se eligen arriba de cada traductor (components/SelectorModo.tsx). */
export const MODOS_TRADUCIR: Seccion[] = [SENAS_TEXTO, VOZ_SENAS, CONVERSACION]

export const HISTORIAL: Seccion = {
  ruta: '/historial',
  titulo: 'Historial',
  descripcion: 'Tus conversaciones anteriores.',
  icono: History,
}

export const APRENDIZAJE: Seccion = {
  ruta: '/aprender',
  titulo: 'Aprendizaje',
  descripcion: 'Practica el alfabeto y palabras.',
  icono: BookOpen,
}

export const MI_IA: Seccion = {
  ruta: '/mi-ia',
  titulo: 'Mi IA',
  descripcion: 'Lo que la inteligencia artificial aprendió de ti.',
  icono: Brain,
}

export const USUARIOS: Seccion = {
  ruta: '/usuarios',
  titulo: 'Usuarios',
  descripcion: 'Administra las cuentas.',
  icono: UserCog,
  soloAdmin: true,
}

export const ESTADISTICAS: Seccion = {
  ruta: '/estadisticas',
  titulo: 'Estadísticas',
  descripcion: 'Gráficas del avance de los usuarios.',
  icono: ChartColumn,
  soloAdmin: true,
}

/** Lo técnico de la IA (capas de la red, gráficas, árbol de decisión). El usuario ve la versión sencilla en «Mi IA». */
export const IA_POR_DENTRO: Seccion = {
  ruta: '/ia-por-dentro',
  titulo: 'IA por dentro',
  descripcion: 'Cómo funcionan los modelos de IA.',
  icono: Cpu,
  soloAdmin: true,
}

export const CONFIGURACION: Seccion = {
  ruta: '/configuracion',
  titulo: 'Configuración',
  descripcion: 'Lengua, voz y accesibilidad.',
  icono: Settings,
}

export const AYUDA: Seccion = {
  ruta: '/ayuda',
  titulo: 'Ayuda',
  descripcion: 'Cómo usar la app.',
  icono: CircleHelp,
}

export const EMERGENCIA: Seccion = {
  ruta: '/emergencia',
  titulo: 'Frases de emergencia',
  descripcion: 'Pide ayuda, indica dolor o comparte tu dirección.',
  icono: Siren,
}

/** Orden del menú lateral. */
export const MENU: Seccion[] = [INICIO, TRADUCIR, APRENDIZAJE, HISTORIAL, MI_IA, USUARIOS, ESTADISTICAS, IA_POR_DENTRO, CONFIGURACION, AYUDA]

/** Barra inferior del celular (el resto está en «Más», que abre el menú completo). */
export const BARRA_INFERIOR: Seccion[] = [INICIO, TRADUCIR, APRENDIZAJE]

/** ¿La sección está activa en esta dirección? (Inicio solo en /inicio exacto.) */
export function seccionActiva(s: Seccion, ruta: string): boolean {
  if (s.ruta === INICIO.ruta) return ruta === INICIO.ruta
  return [s.ruta, ...(s.activaEn ?? [])].some((r) => ruta === r || ruta.startsWith(r + '/'))
}
