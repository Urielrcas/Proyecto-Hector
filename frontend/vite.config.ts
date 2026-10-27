/*
 * CONFIGURACIÓN DE VITE (el servidor de desarrollo del frontend)
 *   - plugins: React y Tailwind CSS.
 *   - port 5173 fijo: si ya está ocupado, avisa con un error en lugar de usar otro puerto.
 *   - proxy: toda petición a /api se reenvía al backend de FastAPI (puerto 8000).
 *   - modo «celular» (npm run dev:celular): abre el servidor a la red Wi-Fi y usa https con el
 *     certificado de la carpeta certs/ (el celular solo deja usar la cámara y el micrófono con https).
 */

// ▸ Desde plugin de Tailwind CSS para Vite (estilos con clases):
//     tailwindcss → plugin que activa Tailwind CSS
import tailwindcss from '@tailwindcss/vite'
// ▸ Desde plugin de React para Vite:
//     react → plugin que permite usar React con Vite
import react from '@vitejs/plugin-react'
// ▸ Desde Node (archivos):
//     existsSync / readFileSync → revisar y leer el certificado de certs/
import { existsSync, readFileSync } from 'node:fs'
// ▸ Desde Vite (la herramienta que ejecuta y compila el frontend):
//     defineConfig → ayuda a escribir la configuración de Vite
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const celular = mode === 'celular'
  if (celular && !(existsSync('certs/clave.pem') && existsSync('certs/certificado.pem'))) {
    throw new Error('Falta el certificado en frontend/certs/ (ver README: «Abrir en el celular»).')
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Puerto fijo: si ya hay otro servidor abierto, avisa en lugar de usar otro puerto.
      port: 5173,
      strictPort: true,
      // Modo celular: visible en la red Wi-Fi y con https.
      host: celular ? true : undefined,
      https: celular ? { key: readFileSync('certs/clave.pem'), cert: readFileSync('certs/certificado.pem') } : undefined,
      // En desarrollo, /api se redirige al backend FastAPI.
      proxy: { '/api': 'http://127.0.0.1:8000' },
    },
  }
})
