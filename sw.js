// public/sw.js
const CACHE_NAME = 'chestrips-cache-v1';

// Recursos críticos externos que la guía necesita para renderizar mapas, fuentes e iconos
const CRITICAL_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700;800&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. Instalación: precacheo de librerías externas esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpieza de versiones viejas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptación de peticiones: Red primero con fallback a caché (o caché dinámico)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo interceptamos peticiones GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Si el recurso ya está en caché (ej. Leaflet, CDNs), devuélvelo al instante
      const cachedResponse = await cache.match(request);
      if (cachedResponse && !request.url.includes('/g/')) {
        return cachedResponse;
      }

      try {
        // Si hay conexión, pide el recurso a la red
        const networkResponse = await fetch(request);

        // Si es una respuesta válida (código 200 o opaca para CDN externos), guárdala
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (err) {
        // En caso de fallo de red (modo avión o sin cobertura), usa la copia guardada
        if (cachedResponse) {
          return cachedResponse;
        }
        throw err;
      }
    })
  );
});
