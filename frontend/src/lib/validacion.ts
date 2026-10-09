/*
 * VALIDACIÓN DE FORMULARIOS
 * Cada función revisa un campo y devuelve el mensaje de error, o null si está bien.
 * Las usan Login, Registro y el formulario de Usuarios. El backend vuelve a validar
 * lo mismo (modelos.py), por seguridad.
 */

// Revisa el correo. Devuelve el mensaje de error que verá el usuario, o null si es válido.
export function validarCorreo(correo: string): string | null {
  // .trim() quita los espacios al inicio y al final
  if (!correo.trim()) return 'Escribe tu correo electrónico.'
  // Expresión regular: algo@algo.algo (sin espacios). Ej.: ana@correo.com ✓, ana@correo ✗
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return 'El correo no tiene un formato válido.'
  return null
}

// Revisa la contraseña: mínimo 8 caracteres, con al menos una letra y un número.
export function validarContrasena(contrasena: string): string | null {
  if (!contrasena) return 'Escribe una contraseña.'
  if (contrasena.length < 8) return 'Debe tener al menos 8 caracteres.'
  // /[A-Za-zÁÉÍÓÚáéíóúÑñ]/ busca una letra (incluye acentos y ñ); /\d/ busca un número.
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) || !/\d/.test(contrasena))
    return 'Debe incluir al menos una letra y un número.'
  return null
}

// Revisa el nombre: al menos 2 caracteres.
export function validarNombre(nombre: string): string | null {
  if (nombre.trim().length < 2) return 'Escribe tu nombre.'
  return null
}
