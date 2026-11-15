/* Service Worker: App offline verfügbar, OpenCV nach erstem Laden aus dem Cache */
const VERSION = 'boule-v1';
const SHELL = ['./', 'index.html', 'app.js', 'detect.js', 'rules.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'boule-opencv').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // Chat-Anfragen (POST) nie cachen
  const url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net') { // OpenCV: einmal laden, dann immer aus dem Cache
    e.respondWith(caches.open('boule-opencv').then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // App-Dateien: Netz zuerst (Updates sofort sichtbar), offline aus dem Cache
  e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
