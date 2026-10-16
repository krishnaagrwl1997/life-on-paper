/* Life on Paper service worker.
 *
 * Deliberately small: pages are network-first (so a deploy is never hidden
 * behind a stale cache) with a cached copy of Today as the offline fallback;
 * hashed build assets are cache-first because their names change every deploy.
 * It also shows the daily reminder and opens Today when it is tapped.
 */
const CACHE = "lop-v1";
const OFFLINE_PAGE = "/today";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_PAGE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === OFFLINE_PAGE) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(OFFLINE_PAGE, copy));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_PAGE).then((cached) => cached || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Life on Paper", {
      body: data.body || "Anything from today worth keeping?",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "daily-reminder",
      data: { url: data.url || "/today?write=1" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/today?write=1", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.navigate(target).then((client) => (client || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
