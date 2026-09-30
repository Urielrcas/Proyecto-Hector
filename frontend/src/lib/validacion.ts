export function validarCorreo(correo: string): string | null {
  if (!correo.trim()) return 'Escribe tu correo electrónico.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return 'El correo no tiene un formato válido.'
  return null
}

export function validarContrasena(contrasena: string): string | null {
  if (!contrasena) return 'Escribe una contraseña.'
  if (contrasena.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) || !/\d/.test(contrasena))
    return 'Debe incluir al menos una letra y un número.'
  return null
}

export function validarNombre(nombre: string): string | null {
  if (nombre.trim().length < 2) return 'Escribe tu nombre.'
  return null
}
