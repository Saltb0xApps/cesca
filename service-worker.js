/* Ariadne service worker.
   - Precaches the app shell.
   - Network-first for HTML, cache-first for static assets.
   - Handles "show-checkin" push notifications for due check-ins.
*/

const VERSION = "ariadne-v2";
const SHELL = [
  "/",
  "/index.html",
  "/app.html",
  "/styles.css",
  "/landing.css",
  "/landing.js",
  "/app.js",
  "/questions.js",
  "/demo-data.js",
  "/config.js",
  "/manifest.webmanifest",
  "/assets/icons/icon.svg",
  "/assets/icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Don't intercept cross-origin (CDNs, Supabase, etc.).
  if (url.origin !== self.location.origin) return;

  // HTML: network-first, fall back to cache, then to /app.html offline shell.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/app.html")))
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});

/* ---------- push notifications ----------
   The server sends pushes when a user's check-in is due. The payload is
   expected to be JSON: { title, body, url }.
*/
self.addEventListener("push", (event) => {
  let data = { title: "Ariadne", body: "It's check-in time.", url: "/app.html#checkins" };
  try { if (event.data) data = Object.assign(data, event.data.json()); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/assets/icons/icon.svg",
      badge: "/assets/icons/icon.svg",
      data: { url: data.url },
      tag: "ariadne-checkin"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
