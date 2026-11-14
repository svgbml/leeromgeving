// Offline-cache: eerst netwerk (altijd nieuwste data), anders cache.
const C = "leeromgeving-v2";
const CORE = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg", "data/modules.json", "data/de-cel.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
