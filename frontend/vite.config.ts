/*
 * CONFIGURACIÓN DE VITE (el servidor de desarrollo del frontend)
 *   - plugins: React y Tailwind CSS.
 *   - port 5173 fijo: si ya está ocupado, avisa con un error en lugar de usar otro puerto.
 *   - proxy: toda petición a /api se reenvía al backend de FastAPI (puerto 8000).
 */

// ▸ Desde plugin de Tailwind CSS para Vite (estilos con clases):
//     tailwindcss → plugin que activa Tailwind CSS
import tailwindcss from '@tailwindcss/vite'
// ▸ Desde plugin de React para Vite:
//     react → plugin que permite usar React con Vite
import react from '@vitejs/plugin-react'
// ▸ Desde Vite (la herramienta que ejecuta y compila el frontend):
//     defineConfig → ayuda a escribir la configuración de Vite
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Puerto fijo: si ya hay otro servidor abierto, avisa en lugar de usar otro puerto.
    port: 5173,
    strictPort: true,
    // En desarrollo, /api se redirige al backend FastAPI.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
