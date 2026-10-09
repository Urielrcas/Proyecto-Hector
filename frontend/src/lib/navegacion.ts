/*
 * SECCIONES DEL MENÚ
 * Cada sección tiene: ruta, título, descripción e ícono (de la librería lucide-react).
 *   - MENU (al final) define qué aparece en el menú lateral y en qué orden.
 *   - soloAdmin: true oculta la sección a quien no es administrador.
 * Para cambiar el nombre o el ícono de una sección del menú, edítalo aquí.
 */

// ▸ Desde Lucide (librería de íconos; catálogo en lucide.dev):
//     íconos: BookOpen (libro abierto), CircleHelp (círculo con ?), Hand (mano), History (reloj de historial), House (casa), Mic (micrófono), Settings (engrane), Siren (sirena), UserCog (usuario con engrane), Users (dos personas), LucideIcon (tipo: cualquier ícono de Lucide)
import {
  BookOpen,
  CircleHelp,
  Hand,
  History,
  House,
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

export const USUARIOS: Seccion = {
  ruta: '/usuarios',
  titulo: 'Usuarios',
  descripcion: 'Administra las cuentas.',
  icono: UserCog,
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
export const MENU: Seccion[] = [INICIO, SENAS_TEXTO, VOZ_SENAS, CONVERSACION, HISTORIAL, APRENDIZAJE, USUARIOS, CONFIGURACION, AYUDA]
