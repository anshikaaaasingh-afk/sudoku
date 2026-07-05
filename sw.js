const CACHE_NAME = 'sudoku-master-v1';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './pwa/manifest.json',
  './modules/storage.js', './modules/board.js', './modules/solver.js', './modules/generator.js',
  './modules/notes.js', './modules/hints.js', './modules/timer.js', './modules/levels.js',
  './modules/achievements.js', './modules/streaks.js', './modules/daily.js',
  './modules/statistics.js', './modules/analytics.js', './modules/themes.js', './modules/sounds.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
