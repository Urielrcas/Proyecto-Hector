// localStorage puede fallar (modo privado, cookies bloqueadas); la app debe seguir funcionando.
const PREFIJO = 'senas.'

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const valor = localStorage.getItem(PREFIJO + clave)
    return valor === null ? porDefecto : (JSON.parse(valor) as T)
  } catch {
    return porDefecto
  }
}

export function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor))
  } catch {
    // sin almacenamiento: el estado vive solo en memoria
  }
}

export function borrar(clave: string): void {
  try {
    localStorage.removeItem(PREFIJO + clave)
  } catch {
    // ignorar
  }
}
