/*
 * SERVICE WORKER (lo pide el navegador para poder instalar la app en el celular)
 * No guarda la app en caché a propósito: siempre se usa la versión más nueva del servidor,
 * así cada cambio que publicamos llega solo, sin reinstalar. Solo si no hay internet
 * se devuelve la última página principal que se vio (los modelos de MediaPipe sí se guardan,
 * porque pesan mucho y no cambian).
 */
const CACHE = 'senas-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  const url = new URL(request.url)

  // Modelos y motor de MediaPipe: primero la copia guardada (no cambian y pesan ~47 MB).
  if (url.pathname.startsWith('/mediapipe/')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const guardada = await cache.match(request)
        if (guardada) return guardada
        const respuesta = await fetch(request)
        if (respuesta.ok) cache.put(request, respuesta.clone())
        return respuesta
      }),
    )
    return
  }

  // Páginas: siempre de la red; sin internet, la última página principal.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((respuesta) => {
          caches.open(CACHE).then((cache) => cache.put('/', respuesta.clone()))
          return respuesta
        })
        .catch(() => caches.match('/')),
    )
  }
})
