self.addEventListener('install', e=>{
  e.waitUntil(caches.open('selos-v7').then(cache=>cache.addAll([
    './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
    './icons/icon-192.png','./icons/icon-512.png','./assets/logo-cdd-brasilia.png',
    './modelos/modelo_importacao.json','./modelos/modelo_importacao.csv','./config.js'
  ])));
});
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))); });