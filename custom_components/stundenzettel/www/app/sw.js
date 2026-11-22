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

// ---------------------------------------------------------------- 🔄 Im Hintergrund nachschicken (wie bei der Einkaufsliste)
// Ist die App zu und kommt das Netz zurück, weckt Chrome (Android) diesen Helfer kurz auf („sync“).
// Er schickt den Postausgang an Home Assistant – genau so, wie es die Karte selbst tun würde.
// Doppelt schadet nicht: Home Assistant merkt sich jede Änderungs-Nummer (op_id) und macht nichts zweimal.
// iPhones kennen das leider nicht; dort wird wie bisher beim nächsten Öffnen nachgeschickt.
const QPRE = "stundenzettel_queue"; // Postausgang je Stundenzettel: stundenzettel_queue oder stundenzettel_queue_<entry_id>
let dbp = null;
function db() {
  return dbp || (dbp = new Promise((ok, fail) => {
    const r = indexedDB.open("stundenzettel-app", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; ok(r.result); }; // Abmelden will löschen → sofort loslassen
    r.onerror = () => { dbp = null; fail(r.error); };
  }));
}
async function kv(mode, fn) {
  const d = await db();
  return new Promise((ok, fail) => {
    const tx = d.transaction("kv", mode);
    let out;
    fn(tx.objectStore("kv"), (v) => { out = v; });
    tx.oncomplete = () => ok(out);
    tx.onerror = () => fail(tx.error);
  });
}
const kvGet = (k) => kv("readonly", (st, set) => { const r = st.get(k); r.onsuccess = () => set(r.result); });
const kvSet = (k, v) => kv("readwrite", (st) => { st.put(v, k); });

async function accessToken(auth) {
  if (auth.access && auth.expires > Date.now()) return auth.access;
  const r = await fetch("/auth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refresh, client_id: auth.client_id }),
  });
  if (!r.ok) throw new Error("token " + r.status);
  const j = await r.json();
  const next = { ...auth, access: j.access_token, expires: Date.now() + (j.expires_in || 1800) * 1000 - 60000 };
  await kvSet("auth", next);
  return next.access;
}

function openSocket(token) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(self.location.origin.replace(/^http/, "ws") + "/api/websocket");
    const pending = new Map();
    let id = 1;
    const timer = setTimeout(() => { try { ws.close(); } catch (_) { /* egal */ } fail(new Error("timeout")); }, 15000);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === "auth_required") ws.send(JSON.stringify({ type: "auth", access_token: token }));
      else if (m.type === "auth_invalid") { clearTimeout(timer); fail(new Error("auth")); }
      else if (m.type === "auth_ok") {
        clearTimeout(timer);
        ok({
          call: (msg) => new Promise((res, rej) => { const n = id++; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, ...msg })); }),
          close: () => { try { ws.close(); } catch (_) { /* egal */ } },
        });
      } else if (m.type === "result") {
        const p = pending.get(m.id);
        if (p) { pending.delete(m.id); m.success ? p.res(m.result) : p.rej(Object.assign(new Error("ha"), { ha: m.error })); }
      }
    };
    ws.onclose = () => { clearTimeout(timer); for (const p of pending.values()) p.rej(Object.assign(new Error("lost"), { lost: true })); pending.clear(); fail(new Error("closed")); };
    ws.onerror = () => { try { ws.close(); } catch (_) { /* egal */ } };
  });
}

async function flushQueue(force) {
  if (!force) { // ist die App gerade offen und sichtbar? Dann macht die Karte das selbst
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.some((c) => c.visibilityState === "visible")) return;
  }
  const queues = (await kvGet("queues")) || {};
  if (!Object.values(queues).some((q) => Array.isArray(q) && q.length)) return;
  const auth = await kvGet("auth");
  if (!auth?.refresh) return;
  let sock = null;
  const sent = [], bad = [];
  let n = 0; // wirklich neu angekommen (schon Bekanntes zählt nicht)
  try {
    sock = await openSocket(await accessToken(auth));
    for (const key of Object.keys(queues)) {
      if (key !== QPRE && !key.startsWith(QPRE + "_")) continue;
      const entry = key.slice(QPRE.length + 1); // leer = der erste Stundenzettel
      while (queues[key]?.length) {
        const batch = queues[key].slice(0, 100);
        const res = await sock.call({ type: "stundenzettel/apply", ops: batch, ...(entry ? { entry_id: entry } : {}) });
        for (const r of res?.results || []) { if (!r.ok) bad.push(r.error); else if (!r.dup) n += 1; }
        sent.push(...batch.map((o) => o.op_id));
        queues[key] = queues[key].slice(batch.length);
        await kvSet("queues", queues); // nach jedem Stück merken – reißt das Netz ab, bleibt der Rest liegen
      }
    }
  } finally {
    sock?.close();
    if (sent.length || bad.length) { // 📝 für die Seite: was schon raus ist (wird beim nächsten Öffnen aus dem Postausgang genommen)
      const old = (await kvGet("flushed").catch(() => null)) || { ids: [], n: 0, bad: [] };
      await kvSet("flushed", { ids: [...old.ids, ...sent].slice(-2000), n: (old.n || 0) + n, bad: [...old.bad, ...bad].slice(-20), at: Date.now() }).catch(() => {});
    }
  }
}

self.addEventListener("sync", (e) => {
  if (e.tag === "sz-queue") e.waitUntil(flushQueue(false)); // Fehler = Chrome probiert es später von selbst nochmal
});
// Zum Testen: die Seite kann den Helfer auch direkt bitten
self.addEventListener("message", (e) => {
  if (e.data?.type === "sz-flush") e.waitUntil(flushQueue(!!e.data.force).catch(() => {}));
});
