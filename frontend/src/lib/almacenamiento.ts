/*
 * ALMACENAMIENTO EN EL NAVEGADOR (localStorage)
 * localStorage es una pequeña "memoria" del navegador que NO se borra al recargar la página.
 * Aquí se guarda: si ya vio la bienvenida, la lengua elegida, la sesión y el progreso de aprendizaje.
 * Puedes verlo en el navegador: F12 → pestaña "Application" → "Local Storage".
 *
 * localStorage puede fallar (modo privado, cookies bloqueadas); por eso cada función usa try/catch:
 * si falla, la app sigue funcionando (solo que no recuerda nada al recargar).
 */

// Todas las claves empiezan con "senas." para no mezclarse con otras páginas (ej.: "senas.lengua").
const PREFIJO = 'senas.'

// Lee un dato guardado. Si no existe (o falla), devuelve "porDefecto".
// <T> significa que funciona con cualquier tipo de dato (texto, número, objeto...).
export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const valor = localStorage.getItem(PREFIJO + clave)
    // localStorage solo guarda texto; JSON.parse lo convierte de vuelta a su tipo original.
    return valor === null ? porDefecto : (JSON.parse(valor) as T)
  } catch {
    return porDefecto
  }
}

// Guarda un dato. JSON.stringify lo convierte a texto para poder guardarlo.
export function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor))
  } catch {
    // sin almacenamiento: el estado vive solo en memoria
  }
}

// Borra un dato (por ejemplo, la sesión al cerrar sesión).
export function borrar(clave: string): void {
  try {
    localStorage.removeItem(PREFIJO + clave)
  } catch {
    // ignorar
  }
}
