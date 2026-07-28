// Service Worker für Offline-Fähigkeit (Runtime-Caching, ohne Build-Plugin).
// Cacht die App-Shell (Navigations + statische Assets). Externe Aufrufe
// (Supabase, Wetter, Open-Meteo, OSM) werden NICHT abgefangen.
const CACHE = "catch-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.add("/");
      } catch (e) {
        // ignorieren – Runtime-Caching füllt den Cache nach
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Nur eigene Domain cachen; alles Externe (APIs) normal durchlassen.
  if (url.origin !== self.location.origin) return;

  // Seitenaufrufe: erst Netz, bei Ausfall aus dem Cache (Fallback: Startseite).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // Statische Assets: erst Cache, sonst Netz (und cachen).
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    /\.(png|jpg|jpeg|svg|webp|ico|css|js|woff2?|json)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
