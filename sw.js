// Bump VERSION on every release (and APP_VERSION in js/version.js to match).
//
// Strategy: the app's own files are NETWORK-FIRST — online, every launch gets
// the latest, consistent set of files; the cache is only the offline fallback.
// (An earlier cache-first version could pin an installed app to a mix of old
// and new files: GitHub Pages lets browsers HTTP-cache files for 10 minutes,
// so a precache taken right after a deploy could grab stale copies.)
const VERSION = "pw-v15";

const CORE = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/version.js",
  "js/notes.js",
  "js/engine.js",
  "js/fretboard.js",
  "js/bar.js",
  "js/strum.js",
  "js/tuning.js",
  "js/scales.js",
  "js/chords.js",
  "js/looper.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

const NETWORK_TIMEOUT_MS = 4000; // slow connection: fall back to the saved copy

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      // cache:"reload" skips the browser's HTTP cache, so the precache is
      // always a fresh, matching set
      .then(c => c.addAll(CORE.map(u => new Request(u, {cache: "reload"}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req){
  const cache = await caches.open(VERSION);
  try{
    const res = await Promise.race([
      fetch(req, {cache: "no-cache"}), // always revalidate with the server
      new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), NETWORK_TIMEOUT_MS)),
    ]);
    if(res.ok) cache.put(req, res.clone());
    return res;
  }catch(_e){
    const hit = await cache.match(req, {ignoreSearch: true});
    if(hit) return hit;
    if(req.mode === "navigate") return (await cache.match("./")) || Response.error();
    return Response.error();
  }
}

// fonts never change for a given URL — cache-first is right for them
async function cacheFirst(req){
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  if(res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if(url.origin === location.origin){
    e.respondWith(networkFirst(e.request));
  }else if(url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")){
    e.respondWith(cacheFirst(e.request));
  }
});
