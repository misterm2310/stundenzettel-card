// 📱 Stundenzettel – Offline-Speicher für die App. Hier liegt NUR Programm, keine Zahlen.
// (Die Zahlen merkt sich die Seite selbst im Handy – und löscht sie beim Abmelden.)
const CACHE = "stundenzettel-app-__SZ_VERSION__";
const FILES = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icons.json", "/stundenzettel/files/stundenzettel-card.js?v=__SZ_VERSION__", "/stundenzettel/files/stundenzettel-en.json?v=__SZ_VERSION__", "/stundenzettel/files/mister-m.webp?v=__SZ_VERSION__"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(FILES.map((f) => c.add(f)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("stundenzettel-app-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Erst das Netz fragen (dann ist alles aktuell). Ohne Netz – oder nach 4 Sekunden Funkloch – das Gespeicherte nehmen.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const ours = url.pathname.startsWith("/stundenzettel/app/") || url.pathname.startsWith("/stundenzettel/files/");
  if (e.request.method !== "GET" || url.origin !== location.origin || !ours || url.pathname.endsWith("sw.js")) return;
  const lookup = () => caches.match(e.request).then((r) => r || caches.match(e.request, { ignoreSearch: true }))
    .then((r) => r || (url.pathname.startsWith("/stundenzettel/app/") ? caches.match("./") : undefined));
  const net = fetch(e.request).then((resp) => {
    if (/\.(js|svg|json)$/.test(url.pathname) && /text\/html/.test(resp.headers.get("content-type") || "")) throw new Error("html"); // WLAN-Anmeldeseite
    if (resp.ok && resp.type === "basic" && !resp.redirected) {
      const copy = resp.clone();
      const key = url.pathname === "/stundenzettel/app/" || url.pathname === "/stundenzettel/app/index.html" ? "./" : e.request;
      caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
    }
    return resp;
  });
  const guarded = net.catch(() => lookup().then((r) => r || new Response("offline", { status: 503 })));
  const slow = new Promise((res) => setTimeout(() => lookup().then((r) => res(r || null), () => res(null)), 4000));
  e.waitUntil(net.catch(() => {}));
  e.respondWith(Promise.race([guarded, slow]).then((r) => r || guarded));
});
