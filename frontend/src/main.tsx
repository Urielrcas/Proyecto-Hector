/*
 * PUNTO DE ENTRADA DEL FRONTEND
 * Arranca React y dibuja el componente <App /> dentro del <div id="root"> de index.html.
 * StrictMode activa revisiones extra durante el desarrollo (no afecta al usuario final).
 */

// ▸ Desde React (librería para construir la interfaz con componentes):
//     StrictMode → modo de revisión extra durante el desarrollo
import { StrictMode } from 'react'
// ▸ Desde React DOM (dibuja los componentes de React en la página web):
//     createRoot → conecta React con el <div id="root"> de index.html
import { createRoot } from 'react-dom/client'
// ▸ Desde nuestro proyecto: src/index.css
//     estilos globales y colores de la app (Tailwind CSS); al importarlo se aplican a todas las pantallas
import './index.css'
// ▸ Desde nuestro proyecto: src/App.tsx:
//     App → componente principal con todas las rutas
import App from './App.tsx'

// Buscar el <div id="root"> de index.html y dibujar ahí toda la aplicación (<App />).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
