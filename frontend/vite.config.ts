import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
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
