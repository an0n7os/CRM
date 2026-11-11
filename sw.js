'use strict';
const CACHE_NAME = 'crm-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/util.js',
  './js/const.js',
  './js/db.js',
  './js/qr.js',
  './js/seed.js',
  './js/pages/leads.js',
  './js/pages/jobcards.js',
  './js/pages/surveys.js',
  './js/pages/pcbuilder.js',
  './js/pages/quotes.js',
  './js/pages/inventory.js',
  './js/pages/billing.js',
  './js/pages/expenses.js',
  './js/pages/amc.js',
  './js/pages/rma.js',
  './js/pages/licenses.js',
  './js/pages/customers.js',
  './js/pages/field.js',
  './js/pages/performance.js',
  './js/pages/reports.js',
  './js/pages/dashboard.js',
  './js/pages/settings.js',
  './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
