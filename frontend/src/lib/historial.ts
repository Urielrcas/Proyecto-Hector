/*
 * HISTORIAL DE TRADUCCIONES Y CONVERSACIONES
 * Tipos de datos y el "almacén" donde se guardan los registros.
 *   - Con cuenta: en el servidor (MongoDB), ver services/historial.ts.
 *   - Como invitado: en este navegador (almacenLocal, aquí abajo).
 * Las dos formas tienen las mismas funciones (listar, obtener, crear, actualizar, eliminar…),
 * así las pantallas no necesitan saber dónde se guarda.
 */
// ▸ Desde nuestro proyecto: src/lib/almacenamiento.ts:
//     guardar → guarda un dato en el navegador (localStorage)
//     leer → lee un dato guardado en el navegador (localStorage)
import { guardar, leer } from './almacenamiento'
// ▸ Desde nuestro proyecto: src/lib/tipos.ts:
//     Lengua → tipo: 'LSM' o 'ASL'
//     Pagina → tipo: resultado paginado
import type { Lengua, Pagina } from './tipos'

/** De dónde viene el registro. */
export type TipoHistorial = 'senas-texto' | 'voz-senas' | 'conversacion'

export const TIPOS_HISTORIAL: Record<TipoHistorial, string> = {
  'senas-texto': 'Señas → Texto',
  'voz-senas': 'Voz / Texto → Señas',
  conversacion: 'Conversación',
}

/** Fecha legible. Ej.: «27 oct 2026, 10:30». */
export const fechaHistorial = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export interface MensajeHistorial {
  /** sorda = lo hizo en señas; oyente = lo dijo o lo escribió. */
  autor: 'sorda' | 'oyente'
  texto: string
  /** Fecha y hora en formato ISO (texto). */
  hora: string
}

export interface DatosHistorial {
  tipo: TipoHistorial
  lengua: Lengua
  mensajes: MensajeHistorial[]
}

export interface ResumenHistorial {
  id: string
  tipo: TipoHistorial
  lengua: Lengua
  titulo: string
  total_mensajes: number
  creado_en: string
  actualizado_en: string
}

export interface RegistroHistorial extends ResumenHistorial {
  mensajes: MensajeHistorial[]
}

export interface FiltroHistorial {
  buscar?: string
  tipo?: TipoHistorial | ''
  pagina?: number
  porPagina?: number
}

/** Lo que debe saber hacer cualquier almacén de historial (servidor o navegador). */
export interface AlmacenHistorial {
  listar(filtro: FiltroHistorial): Promise<Pagina<ResumenHistorial>>
  obtener(id: string): Promise<RegistroHistorial>
  crear(datos: DatosHistorial): Promise<RegistroHistorial>
  actualizar(id: string, datos: DatosHistorial): Promise<RegistroHistorial>
  eliminar(id: string): Promise<void>
  eliminarTodo(): Promise<void>
}

/** Error de «no existe» (el mismo código que usaría el servidor). */
export class RegistroNoEncontrado extends Error {
  readonly estado = 404
  constructor() {
    super('Registro no encontrado.')
  }
}

const LARGO_TITULO = 80

/** Título del registro: el primer mensaje, recortado. Ej.: «Hola, ¿cómo estás?». */
export function tituloDe(mensajes: MensajeHistorial[]): string {
  const texto = (mensajes[0]?.texto ?? '').split(/\s+/).filter(Boolean).join(' ')
  return texto.length <= LARGO_TITULO ? texto : texto.slice(0, LARGO_TITULO - 1).trimEnd() + '…'
}

export function resumenDe(r: RegistroHistorial): ResumenHistorial {
  return {
    id: r.id,
    tipo: r.tipo,
    lengua: r.lengua,
    titulo: r.titulo,
    total_mensajes: r.mensajes.length,
    creado_en: r.creado_en,
    actualizado_en: r.actualizado_en,
  }
}

/** Filtra (texto y tipo), ordena (lo más reciente primero) y pagina una lista de registros. */
export function filtrarYPaginar(registros: RegistroHistorial[], filtro: FiltroHistorial): Pagina<ResumenHistorial> {
  const pagina = filtro.pagina ?? 1
  const porPagina = filtro.porPagina ?? 10
  const buscar = (filtro.buscar ?? '').trim().toLowerCase()
  const encontrados = registros
    .filter((r) => !filtro.tipo || r.tipo === filtro.tipo)
    .filter((r) => !buscar || r.mensajes.some((m) => m.texto.toLowerCase().includes(buscar)))
    .sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en))
  return {
    items: encontrados.slice((pagina - 1) * porPagina, pagina * porPagina).map(resumenDe),
    total: encontrados.length,
    pagina,
    por_pagina: porPagina,
  }
}

/** Registros que se guardan como máximo en el navegador (los más viejos se descartan). */
export const MAX_LOCAL = 100

/** Almacén en el navegador (para invitados). */
export function almacenLocal(clave = 'historial.invitado'): AlmacenHistorial {
  const todos = () => leer<RegistroHistorial[]>(clave, [])
  const escribir = (rs: RegistroHistorial[]) =>
    guardar(
      clave,
      [...rs].sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en)).slice(0, MAX_LOCAL),
    )
  const buscarUno = (id: string) => {
    const r = todos().find((x) => x.id === id)
    if (!r) throw new RegistroNoEncontrado()
    return r
  }

  return {
    async listar(filtro) {
      return filtrarYPaginar(todos(), filtro)
    },
    async obtener(id) {
      return buscarUno(id)
    },
    async crear(datos) {
      const ahora = new Date().toISOString()
      const r: RegistroHistorial = {
        ...datos,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        titulo: tituloDe(datos.mensajes),
        total_mensajes: datos.mensajes.length,
        creado_en: ahora,
        actualizado_en: ahora,
      }
      escribir([r, ...todos()])
      return r
    },
    async actualizar(id, datos) {
      const anterior = buscarUno(id)
      const r: RegistroHistorial = {
        ...anterior,
        ...datos,
        titulo: tituloDe(datos.mensajes),
        total_mensajes: datos.mensajes.length,
        actualizado_en: new Date().toISOString(),
      }
      escribir(todos().map((x) => (x.id === id ? r : x)))
      return r
    },
    async eliminar(id) {
      buscarUno(id)
      escribir(todos().filter((x) => x.id !== id))
    },
    async eliminarTodo() {
      escribir([])
    },
  }
}
