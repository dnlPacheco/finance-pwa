const CACHE_NAME = 'finance-503020-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.jpg'
];

// Instalação do Service Worker e Caching dos Recursos Estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepção de Requisições (Cache First, falling back to Network)
self.addEventListener('fetch', (event) => {
  // Evitar interceptar requisições para CDNs de terceiros diretamente se quisermos que atualizem, 
  // mas como o Tailwind CSS v4 CDN e fontes do Google podem ser cacheadas para uso offline:
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // Se a requisição for bem-sucedida, e for um recurso do nosso próprio app ou fontes/tailwind, podemos cachear dinamicamente
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          (event.request.url.startsWith(self.location.origin) || 
           event.request.url.includes('googleapis.com') || 
           event.request.url.includes('gstatic.com') || 
           event.request.url.includes('tailwindcss.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline (se for navegação HTML, retornar cache de index.html)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
