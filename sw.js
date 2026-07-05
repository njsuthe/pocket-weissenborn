// Bump VERSION on every release — the activate step drops old caches,
// which is how clients pick up new files (fetch is cache-first).
const VERSION = "pw-v4";

const CORE = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/notes.js",
  "js/engine.js",
  "js/fretboard.js",
  "js/bar.js",
  "js/tuning.js",
  "js/scales.js",
  "js/chords.js",
  "js/looper.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const cacheable =
    url.origin === location.origin ||
    url.hostname.endsWith("fonts.googleapis.com") ||
    url.hostname.endsWith("fonts.gstatic.com");
  if(!cacheable) return;

  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        if(res.ok){
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("./"))
    )
  );
});
