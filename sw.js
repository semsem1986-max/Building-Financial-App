// Offline support for the app shell only. Database requests (supabase.co) are never cached here.
const CACHE = "building-financial-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const CDN = /(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === self.location.origin;
  if (!own && !CDN.test(url.hostname)) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: own });
      const fresh = fetch(e.request).then(res => {
        if (res.ok || res.type === "opaque") cache.put(e.request, res.clone());
        return res;
      });
      // own files: newest from the network, cache when offline. Libraries/fonts: cache first.
      if (own) return fresh.catch(() => cached || Response.error());
      return cached || fresh;
    })
  );
});
