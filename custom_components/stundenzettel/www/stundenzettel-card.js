/* ⏱️ Stundenzettel-Karte für Home Assistant – von Mister-M (mit Hilfe von Claude 🤖)
 * Arbeitszeit, Überstunden-Konto, Urlaub und Krank. Optik wie die Einkaufsliste.
 * Alle Daten liegen in deinem Home Assistant (Integration „Stundenzettel“) – die Karte zeigt nur an und schickt Änderungen.
 */

const SZ_VERSION = "0.2.0-beta.6";
const REPO = "https://github.com/misterm2310/stundenzettel-card";
const PAYPAL = "https://paypal.me/MarcoStrickmann";
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WD = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WD_LONG = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
// 📅 Arten von Tagen: Symbol, Name, Farbe
const KIND = {
  work: ["briefcase-outline", "Arbeit", "#1e88e5"],
  urlaub: ["beach", "Urlaub", "#43a047"],
  krank: ["emoticon-sick-outline", "Krank", "#e53935"],
  feiertag: ["party-popper", "Feiertag", "#8e24aa"],
  frei: ["sofa-outline", "Frei", "#78909c"],
  pauschal: ["cash", "Pauschal", "#fb8c00"],
};
const SOURCE = { calendar: "📅 aus dem Kalender", stamp: "⏱️ gestempelt", card: "✍️ von Hand", import: "📥 Import", holiday: "🎌 Feiertags-Kalender" };
const SZ_NEWS = [
  ["0.2.0-beta.6", "📄 <b>Zettel vom Chef</b> im Monat: „Zeitsaldenliste“ als PDF wählen – wo seine Stunden anders sind, stehen sie rot links neben deinen, unten sein Saldo, „Saldo Vormonat“ mit einem Tipp als Ü.-Alt (geht nur mit diesem Zettel-Typ, siehe ⓘ) · ⓘ <b>Hilfe zum Antippen</b>: In ⚙️ und bei „Lohnabrechnung / Korrektur“ steht neben den Feldern ein kleines ⓘ statt langer Texte · 🏪 Hinweis: Ab Home Assistant 2026.11 heißt HACS „Marketplace“ (Einstellungen &gt; Marketplace)"],
  ["0.2.0-beta.5", "🎨 Heute: <b>Kommen</b> (grün) und <b>Gehen</b> (rot) stehen auch auf dem Handy nebeneinander, mit farbigem ⏱️-Knopf · 📥 Import erkennt Monatsnamen auch abgekürzt (z. B. „Septem“) · 📅 Nach dem Start von Home Assistant versucht die Karte den Kalender noch ein paar Mal, statt gleich „nicht gefunden“ zu melden"],
  ["0.2.0-beta.4", "📊 Neuer Reiter <b>Statistik</b>: Überstunden-Kurve, Stunden pro Monat mit Soll-Linie, Wochentage, Urlaub & Krank pro Jahr und Rekorde – für ein Jahr oder alle Jahre · ⏱️ Heute oben zwei Felder <b>Kommen</b> und <b>Gehen</b> (antippen, Uhrzeit ändern, fertig) mit ⏱️ „jetzt“ · 💶 <b>Ü.-Alt laut Lohnabrechnung</b> pro Monat eintragen – die Karte rechnet dann mit der Zahl vom Chef weiter und zeigt die Abweichung · 📥 Import übernimmt auch die Monatswerte (Summe, Ü.-Alt, Ü.-Gesamt, 8 Stunden und →) genau wie im alten Zettel · 📅 Fehlt ein Termin im Kalender (z. B. gelöscht), legt die Karte ihn wieder an · Knopf „Alle Tage in den Kalender schreiben“ · 🥪 „8 Stunden und →“ zählt jetzt ohne Pause – wie auf dem Zettel"],
  ["0.2.0-beta.3", "📤 <b>Drucken & Teilen</b> für Monat und Jahr: als PDF (WhatsApp, Mail, Drucker – auch auf dem iPhone), Drucken oder als Text · ☕ Pause wahlweise <b>nach Uhrzeit beim Gehen</b> (z. B. bis 12 Uhr 0,25 – danach 0,50) · 💶 Bezahlte Stunden: oben die aktuellen, darunter „bis Dezember 2019: 160“ · 🐞 Tag bearbeiten: das Pausen-Feld bleibt leer (= nach Regel) statt eine 0 vorzufüllen"],
  ["0.2.0-beta.2", "🐞 Überstunden-Konto: Schon eingetragener Urlaub in einem späteren Monat (z. B. Dezember) zählt erst, wenn der Monat dran ist – vorher wurde fälschlich das volle Soll abgezogen · 🔮 Kommende Monate zeigen nur, was schon eingetragen ist · 🧳 Resturlaub aus dem Vorjahr (⚙️ → Urlaub, Krank & Co.) zählt zum Resturlaub dazu · Blaue Knöpfe „In HACS öffnen“ und „Integration hinzufügen“ in der Anleitung auf GitHub"],
  ["0.2.0", "Heute zeigt oben groß die <b>Stunden von heute</b> (beim Stempeln läuft die Zeit mit), darunter Monat und Überstunden-Konto · 🔒 PIN-Sperre für ⚙️ oder die ganze Karte (geht auch ohne Netz) · 📱 Offline-App fürs Handy: stempeln ohne Netz, wird später nachgeschickt · Kurzbefehle „Kommen“ und „Gehen“ am App-Symbol · 🌍 Englisch · ⏰ Maskottchen: ein kleiner Wecker mit Laune und Jahreszeiten-Kostüm · 🙈 Überstunden verschleiern · ↩️ Rückgängig nach dem Löschen · 🧘 Ruhiger Modus · Reiter ausblenden · Neues Symbol"],
  ["0.1.0", "Erste Version 🎉 · Termin „Arbeiten“ aus dem Kalender lesen und (wenn du willst) zurückschreiben · Kommen/Gehen per Knopf oder automatisch per Handy-Zone · Überstunden-Konto wie auf dem Papier-Zettel (Summe, Bezahlt, Ü.-Alt, Ü.-Gesamt) · Urlaub, Krank, Feiertag, Frei, Pauschal · Pausen-Regeln · Alte Tabelle als Text importieren · Drucken und CSV"],
];
const SZ_CARDS = new Set();

const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (name) => `<ha-icon icon="mdi:${name}"></ha-icon>`;
const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2) + Date.now().toString(36));
const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
const monthName = (key) => { const [y, m] = String(key).split("-").map(Number); return `${MONTHS[(m || 1) - 1]} ${y}`; };
const wdOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1; };
const dm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
const h2 = (v) => (Number(v) || 0).toLocaleString(SZ_LANG === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // ⏱️ 9,25
const hs = (v) => { const n = Number(v) || 0; return (n > 0.004 ? "+" : n < -0.004 ? "−" : "±") + h2(Math.abs(n)); }; // ➕ mit Vorzeichen
const eur = (v) => (Number(v) || 0).toLocaleString(SZ_LANG === "en" ? "en-GB" : "de-DE", { style: "currency", currency: "EUR" });
const toNum = (v) => { if (v == null || String(v).trim() === "") return null; const n = Number(String(v).trim().replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* egal */ } } };
// 🔢 Versionen vergleichen (1.2.3-beta.4)
function szVerCmp(a, b) {
  const p = (v) => { const m = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?/.exec(String(v).trim()); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? Infinity : +m[4]] : [0, 0, 0, Infinity]; };
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
// 📋 Text kopieren – mit Ersatzweg wie bei der Einkaufsliste, falls das Handy die Zwischenablage sperrt (z. B. in der HA-App oder ohne https)
function szCopy(text, inp) {
  const old = () => {
    try {
      let tmp = null;
      if (!inp) { tmp = document.createElement("textarea"); tmp.value = text; tmp.setAttribute("readonly", ""); tmp.style.cssText = "position:fixed;opacity:0;top:0;left:0"; document.body.appendChild(tmp); }
      (inp || tmp).select();
      document.execCommand?.("copy");
      tmp?.remove();
    } catch (_) { /* egal */ }
  };
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(old);
  old();
  return Promise.resolve();
}

// 🌍 Englisch: gleiches Wörterbuch-Prinzip wie Kegelclub und Fixkosten (www/stundenzettel-en.json)
let SZ_LANG = "de", SZ_DICT = null, SZ_PATTERNS = [], SZ_DICT_PROMISE = null, SZ_DICT_FAIL = 0;
const SZ_USER = new Set(); // ✋ Namen, die die Leute selbst getippt haben – nie übersetzen
const SZ_ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SZ_SKIP = "textarea,style,script,option[data-user],[translate=no]";
const SZ_INLINE = new Set(["B", "I", "EM", "STRONG", "BR", "CODE", "U", "SMALL"]);
const szNorm = (t) => String(t).replace(/\s+/g, " ").trim();
function szWantLang(hass, config) {
  const want = String(config?.language || "auto").toLowerCase();
  const l = want !== "auto" ? want : String(hass?.locale?.language || hass?.language || "de").toLowerCase();
  return l.startsWith("de") ? "de" : "en";
}
function szLoadDict() {
  if (!SZ_DICT_PROMISE && Date.now() - SZ_DICT_FAIL > 60000) {
    SZ_DICT_PROMISE = fetch(`/stundenzettel/files/stundenzettel-en.json?v=${SZ_VERSION}`).then((r) => r.json()).then((raw) => {
      const dict = {}, pats = [];
      for (const [de, en] of Object.entries(raw)) {
        if (de.startsWith("//")) continue; // Kommentar-Zeilen
        const key = szNorm(de);
        if (!key.includes("{}")) { dict[key] = en; continue; }
        const parts = key.split("{}");
        pats.push([new RegExp("^" + parts.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.*?)") + "$", "s"), en, parts.join("").length]);
      }
      pats.sort((a, b) => b[2] - a[2]); // genauere Muster zuerst
      SZ_DICT = dict; SZ_PATTERNS = pats;
      for (const c of SZ_CARDS) { c._force = true; c._render(); }
    }).catch(() => { SZ_DICT_PROMISE = null; SZ_DICT_FAIL = Date.now(); });
  }
  return SZ_DICT_PROMISE || Promise.resolve();
}
// 📝 Ein Text auf Englisch (oder unverändert, wenn es ihn im Wörterbuch nicht gibt)
function szT(text, depth = 0) {
  if (SZ_LANG === "de" || !SZ_DICT || text == null) return text;
  const raw = String(text), key = szNorm(raw);
  if (!key || !/[A-Za-zÄÖÜäöüß]/.test(key) || SZ_USER.has(key)) return raw;
  const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0], wrap = (x) => lead + x + trail;
  if (key in SZ_DICT) return wrap(SZ_DICT[key]);
  for (const [rx, en] of SZ_PATTERNS) {
    const m = key.match(rx);
    if (m) return wrap(en.replace(/\{(\d)\}/g, (_, i) => { const g = m[Number(i) + 1] ?? ""; return depth < 2 ? szT(g, depth + 1) : g; }));
  }
  const m = depth < 2 && key.match(/^([^\p{L}\p{N}„“"(<]+?)\s(.+)$/u); // „🏦 Kasse“: Zeichen vorne weg, Rest übersetzen
  if (m) { const rest = szT(m[2], depth + 1); if (rest !== m[2]) return wrap(`${m[1]} ${rest}`); }
  return raw;
}
// 🧱 Ein Absatz mit <b>fett</b> darin wird als Ganzes übersetzt (sonst zerfällt der Satz in Stücke)
function szBlockKey(el) {
  if (!el.firstElementChild || el.closest(SZ_SKIP)) return null;
  let words = false;
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { if (/[A-Za-zÄÖÜäöüß]/.test(n.data)) words = true; }
    else if (n.nodeType === 1) { if (!SZ_INLINE.has(n.tagName) || n.firstElementChild || n.attributes.length) return null; }
  }
  return words ? szNorm(el.innerHTML) : null;
}
function szTranslateTree(root) {
  if (SZ_LANG === "de" || !SZ_DICT || !root) return;
  const w = document.createTreeWalker(root, 5 /* Elemente + Text */);
  let n = w.nextNode();
  while (n) {
    if (n.nodeType === 1) {
      if (n.matches(SZ_SKIP)) { n = w.nextSibling() || szNext(w); continue; }
      for (const a of SZ_ATTRS) { const v = n.getAttribute(a); if (v) { const t = szT(v); if (t !== v) n.setAttribute(a, t); } }
      const bk = szBlockKey(n);
      if (bk) { const t = szT(bk); if (t !== bk) { n.innerHTML = t; n = w.nextSibling() || szNext(w); continue; } }
    } else if (n.parentElement && !n.parentElement.closest(SZ_SKIP)) { const t = szT(n.data); if (t !== n.data) n.data = t; }
    n = w.nextNode();
  }
}
function szNext(w) { let p; while ((p = w.parentNode())) { const s = w.nextSibling(); if (s) return s; } return null; }
const szConfirm = (t) => confirm(szT(t));
// ✋ Alles, was die Leute selbst benannt haben, landet in SZ_USER und wird nie übersetzt
function szCollectUser(d) {
  SZ_USER.clear();
  if (!d) return;
  const add = (x) => { const k = szNorm(x ?? ""); if (k) SZ_USER.add(k); };
  for (const e of Object.values(d.days || {})) { add(e.note); for (const l of String(e.note || "").split("\n")) add(l); }
  for (const m of Object.values(d.months_meta || {})) add(m.note);
  add(d.settings?.event_title); add(d.settings?.location);
}
const szLoc = () => (SZ_LANG === "en" ? "en-GB" : "de-DE");

// 🔒 Entsperrt gilt für alle Stundenzettel-Karten dieser Seite, bis 🔒 angetippt wird oder 10 Minuten nichts passiert
const PIN_LOCK = { until: 0 };
const pinOpen = () => PIN_LOCK.until > Date.now();
const pinTouch = () => { if (pinOpen()) PIN_LOCK.until = Date.now() + 10 * 60 * 1000; };
// 📴 PIN ohne Netz prüfen: HA schickt einen Offline-Schlüssel (PBKDF2-SHA256), die Karte rechnet genauso nach.
// Ohne https (z. B. http://192.168…) gibt es kein crypto.subtle – dann rechnet ein kleines SHA-256 hier im Code.
const PINOFF_FAIL = "stundenzettel_pinfehler";
function pinSha256(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  const w = new Uint32Array(64), r = (x, c) => (x >>> c) | (x << (32 - c));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) w[i] = (w[i - 16] + (r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3)) + w[i - 7] + (r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10))) | 0;
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer);
  H.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}
function pinPbkdf2Js(pw, salt, iter) { // 🐢 Notfall ohne crypto.subtle (1 Block = 32 Byte reicht)
  let key = pw; if (key.length > 64) key = pinSha256(key);
  const ip = new Uint8Array(64).fill(0x36), op = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < key.length; i++) { ip[i] ^= key[i]; op[i] ^= key[i]; }
  const hmacf = (msg) => { const a = new Uint8Array(64 + msg.length); a.set(ip); a.set(msg, 64); const b = new Uint8Array(96); b.set(op); b.set(pinSha256(a), 64); return pinSha256(b); };
  const s1 = new Uint8Array(salt.length + 4); s1.set(salt); s1[salt.length + 3] = 1;
  let u = hmacf(s1); const t = u.slice();
  for (let i = 1; i < iter; i++) { u = hmacf(u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; }
  return t;
}
async function pinPbkdf2(pin, saltHex, iter) {
  const pw = new TextEncoder().encode(String(pin)), salt = new Uint8Array((saltHex.match(/../g) || []).map((h) => parseInt(h, 16)));
  let out;
  try {
    const k = await crypto.subtle.importKey("raw", pw, "PBKDF2", false, ["deriveBits"]);
    out = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256));
  } catch (_) { out = pinPbkdf2Js(pw, salt, iter); }
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}
// ✔ / ✘ / Wartezeit – auch offline: 5× falsch = 1 Minute Pause, danach jedes Mal doppelt so lang (höchstens 1 Stunde)
async function pinCheckOffline(off, pin) {
  const f = store.get(PINOFF_FAIL, { n: 0, until: 0 });
  if (f.until > Date.now()) return { wait: Math.ceil((f.until - Date.now()) / 1000) };
  if (!off || !off.salt || !off.hash || !off.iter) return { unknown: true };
  const ok = (await pinPbkdf2(pin, off.salt, off.iter)) === off.hash;
  if (ok) { store.put(PINOFF_FAIL, { n: 0, until: 0 }); return { ok: true }; }
  f.n = (f.n || 0) + 1;
  if (f.n >= 5) f.until = Date.now() + Math.min(3600, 60 * 2 ** (f.n - 5)) * 1000;
  store.put(PINOFF_FAIL, f);
  return { ok: false };
}

// ---------------------------------------------------------------- 📮 Postausgang (wie Kegelclub): Änderungen ohne Netz merken und später schicken
const QKEY = "stundenzettel_queue";   // 📮 was noch zu Home Assistant muss
const DKEY = "stundenzettel_data";    // 📴 letzter Stand (nur in der Offline-App, damit sie ohne Netz etwas zeigt)
const CALMKEY = "stundenzettel_calm"; // 🧘 Ruhiger Modus – nur dieses Gerät
const THEMEKEY = "szapp_theme";       // 🌓 Hell / Dunkel – nur in der Offline-App
const szTheme = () => { try { return localStorage.getItem(THEMEKEY) || "auto"; } catch (_) { return "auto"; } };
const szMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const szHhmm = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
const szClock = (h) => szHhmm(Math.round(Number(h || 0) * 60) % 1440); // 12.5 → „12:30“
// ☕ Gleiche Rechnung wie in Home Assistant (manager.py → auto_pause / day_hours), damit die Karte auch offline richtig zählt
function szAutoPause(brutto, rules) {
  let best = 0;
  for (const r of rules || []) if (brutto > Number(r.from || 0) + 1e-9) best = Math.max(best, Number(r.pause || 0));
  return best;
}
function szDayHours(e, st) {
  const r2 = (v) => Math.round(v * 100) / 100;
  if (!e) return { hours: 0, brutto: 0, pause: 0 };
  if (e.kind === "work") {
    const a = szMin(e.start); let b = szMin(e.end);
    if (a == null || b == null) return { hours: 0, brutto: 0, pause: 0 };
    if (b < a) b += 1440;
    const brutto = (b - a) / 60;
    const pause = e.pause == null ? szAutoPause(st.pause_by === "ende" ? b / 60 : brutto, st.pause_rules) : Number(e.pause); // ☕ nach Dauer oder nach Uhrzeit beim Gehen
    return { hours: r2(Math.max(0, brutto - pause)), brutto: r2(brutto), pause: r2(pause) };
  }
  if (["urlaub", "krank", "feiertag"].includes(e.kind)) return { hours: r2(e.hours == null ? Number(st.absence_hours ?? 8) : Number(e.hours)), brutto: 0, pause: 0 };
  return { hours: 0, brutto: 0, pause: 0 };
}
// 📝 Eine Änderung aus dem Postausgang schon mal selbst anwenden (die Monats-Summen rechnet Home Assistant, sobald es wieder Netz gibt)
function szApplyLocal(d, op) {
  const st = d.settings || {};
  const roundTo = Number(st.round) || 0;
  const nowMin = (ts) => { const t = new Date(ts || Date.now()); let m = t.getHours() * 60 + t.getMinutes(); if (roundTo) m = Math.round(m / roundTo) * roundTo; return [isoOf(t.getFullYear(), t.getMonth() + 1, t.getDate()), Math.min(m, 1439)]; };
  if (op.type === "day_set") {
    const e = { kind: op.kind || "work", source: "card", waiting: true };
    for (const k of ["start", "end", "pause", "hours", "amount", "note"]) if (op[k] != null && op[k] !== "") e[k] = op[k];
    d.days[op.date] = { ...e, ...szDayHours(e, st), pause_set: e.pause != null };
  } else if (op.type === "day_delete") delete d.days[op.date];
  else if (op.type === "stamp_in") { const [iso, m] = nowMin(op.ts); if (!d.stamp) d.stamp = { in: szHhmm(m), date: iso, ts: op.ts, waiting: true }; }
  else if (op.type === "stamp_cancel") d.stamp = null;
  else if (op.type === "stamp_out" && d.stamp) {
    let [iso, m] = nowMin(op.ts);
    if (iso !== d.stamp.date) { iso = d.stamp.date; m = 1439; }
    let start = szMin(d.stamp.in);
    const old = d.days[iso];
    if (old?.kind === "work" && old.source === "stamp" && old.start) start = Math.min(start, szMin(old.start));
    const e = { kind: "work", start: szHhmm(start), end: szHhmm(Math.max(m, start)), source: "stamp", waiting: true, ...(old?.note ? { note: old.note } : {}) };
    d.days[iso] = { ...e, ...szDayHours(e, st) };
    d.stamp = null;
  } else if (op.type === "set") d.settings = { ...st, [op.key]: op.value };
  else if (op.type === "month_set") { const old = { ...((d.months_meta || {})[op.month] || {}) }; for (const k of ["adjust", "paid", "note", "alt"]) if (k in op) old[k] = op[k]; if ("sheet" in op && !op.sheet) delete old.sheet; if ("boss" in op && !op.boss) delete old.boss; d.months_meta = { ...(d.months_meta || {}), [op.month]: old }; }
}

// ---------------------------------------------------------------- ⏰ Maskottchen: der kleine Wecker (wie Einkaufswagen, Sparschwein und Kegelfigur)
function szMascotMood(d, now = new Date()) {
  const hr = now.getHours(), s = d.summary || {};
  if (d.stamp) return "happy";                       // 💪 eingestempelt = es läuft
  if (hr >= 23 || hr < 4) return "sleep";            // 😴 nachts
  if (hr >= 4 && hr < 7) return "tired";             // 🥱 früh morgens
  const bal = Number(s.balance || 0);
  if (bal <= -20) return "shock";                    // 😱 Konto tief im Minus
  if (d._missing || bal < 0) return "worried";       // 😐 gestern fehlt noch / leicht im Minus
  if (d.days?.[d.today]) return "happy";             // 🙂 heute schon eingetragen
  return "calm";
}
function szEaster(y) { // 🐣 Gauß'sche Osterformel (wie bei der Einkaufsliste)
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function szMascotDeco(now = new Date()) { // 👗 gleiche Kostüm-Tage wie Sparschwein, Einkaufswagen und Kegelfigur
  const m = now.getMonth() + 1, day = now.getDate();
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return "party";
  if (m === 12 && day <= 26) return "santa";
  const today = new Date(now.getFullYear(), now.getMonth(), day), diff = Math.round((today - szEaster(now.getFullYear())) / 86400000);
  if (diff >= -3 && diff <= 1) return "bunny";
  if ((m === 10 && day >= 17) || (m === 11 && day <= 7)) return "pumpkin";
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}
function szMascotSvg(mood, deco = "") {
  const k = "#37474f", o = "currentColor"; // k = Gesicht (immer dunkel auf dem weißen Zifferblatt), o = Beine/Glocken (passt sich hell/dunkel an)
  const eyes = mood === "sleep" || mood === "tired" ? `<path d="M14.2 14.6q1 .8 2 0M17.8 14.6q1 .8 2 0" fill="none" stroke="${k}" stroke-width="1" stroke-linecap="round"/>`
    : mood === "shock" ? `<circle cx="15.2" cy="14.2" r="1.3" fill="#fff" stroke="${k}" stroke-width=".8"/><circle cx="18.8" cy="14.2" r="1.3" fill="#fff" stroke="${k}" stroke-width=".8"/><circle cx="15.2" cy="14.2" r=".5" fill="${k}"/><circle cx="18.8" cy="14.2" r=".5" fill="${k}"/>`
    : mood === "worried" ? `<circle cx="15.2" cy="14.4" r=".9" fill="${k}"/><circle cx="18.8" cy="14.4" r=".9" fill="${k}"/><path d="M14 12.6l2.2.6M20 12.6l-2.2.6" stroke="${k}" stroke-width=".8" stroke-linecap="round"/>`
    : `<circle cx="15.2" cy="14.2" r=".95" fill="${k}"/><circle cx="18.8" cy="14.2" r=".95" fill="${k}"/>`;
  const mouth = { happy: `<path d="M15.4 17q1.6 1.6 3.2 0" fill="none" stroke="${k}" stroke-width="1" stroke-linecap="round"/>`,
    calm: `<path d="M15.8 17.3q1.2.8 2.4 0" fill="none" stroke="${k}" stroke-width="1" stroke-linecap="round"/>`,
    worried: `<path d="M15.8 17.6h2.4" stroke="${k}" stroke-width="1" stroke-linecap="round"/>`,
    shock: `<ellipse cx="17" cy="17.8" rx=".9" ry="1.1" fill="${k}"/>`,
    tired: `<ellipse cx="17" cy="17.7" rx="1.1" ry="1.4" fill="${k}"/>`,
    sleep: `<path d="M16 17.4q1 .6 2 0" fill="none" stroke="${k}" stroke-width=".9" stroke-linecap="round"/>` }[mood] || "";
  const extra = mood === "shock" ? `<path d="M27.4 9q1.2 2 0 2.8q-1.2-.8 0-2.8z" fill="#4fc3f7"/>`
    : mood === "sleep" ? `<text x="26" y="8" font-size="5" font-weight="700" fill="${o}" opacity=".7">z</text><text x="29.4" y="5.2" font-size="3.6" font-weight="700" fill="${o}" opacity=".5">z</text>`
    : mood === "happy" ? `<path d="M29.5 10.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#fdd835"/>` : "";
  const hat = { santa: `<g transform="translate(0 3)"><path d="M12.6 4.6q3.6-7.6 9.4-1.4l-1.6 1.2z" fill="#e53935"/><rect x="12.2" y="3.6" width="9.6" height="2" rx="1" fill="#fff"/><circle cx="22.4" cy="2.4" r="1.4" fill="#fff"/></g>`,
    party: `<g transform="translate(0 2.6)"><path d="M14.4 3.2l2.6-6.2 2.6 6.2z" fill="#ab47bc" stroke="#6a1b9a" stroke-width=".5"/><circle cx="17" cy="-3.2" r="1.1" fill="#fdd835"/></g>`,
    pumpkin: `<g transform="translate(3.6 25.4)"><ellipse cx="0" cy="0" rx="4.4" ry="3.6" fill="#fb8c00" stroke="#e65100" stroke-width=".6"/><path d="M0-3.6q-1.8 3.6 0 7.2M-2.3-3q-2 3 0 6M2.3-3q2 3 0 6" fill="none" stroke="#e65100" stroke-width=".5"/><path d="M0-3.6v-1.6q.8-.8 2-.6" fill="none" stroke="#43a047" stroke-width="1.2" stroke-linecap="round"/></g>`,
    bunny: `<g transform="translate(0 3)"><ellipse cx="14.8" cy="-1" rx="1.4" ry="4" transform="rotate(-12 14.8 3)" fill="#f8bbd0" stroke="${k}" stroke-width=".8"/><ellipse cx="19.2" cy="-1" rx="1.4" ry="4" transform="rotate(12 19.2 3)" fill="#f8bbd0" stroke="${k}" stroke-width=".8"/></g>`,
    spring: `<g transform="translate(24.4 22.6) scale(1.15)"><circle cx="0" cy="-1.5" r="1.2" fill="#f48fb1"/><circle cx="1.5" cy="0" r="1.2" fill="#f48fb1"/><circle cx="0" cy="1.5" r="1.2" fill="#f48fb1"/><circle cx="-1.5" cy="0" r="1.2" fill="#f48fb1"/><circle cx="0" cy="0" r="1" fill="#fdd835"/></g>`,
    summer: `<g transform="translate(0 8)"><rect x="13.4" y="5.2" width="3.4" height="2.4" rx="1" fill="#263238"/><rect x="17.2" y="5.2" width="3.4" height="2.4" rx="1" fill="#263238"/><path d="M16.6 5.9h.8M13.4 5.8l-1.2-.6M20.6 5.8l1.2-.6" stroke="#263238" stroke-width=".7" stroke-linecap="round"/></g>`,
    autumn: `<g transform="translate(22.4 21.6) rotate(-24) scale(1.1)"><path d="M0 0q3.2-4.2 6.4.2q-3.2 3.4-6.4-.2z" fill="#ef6c00"/><path d="M.2-.2l4.2-.6" stroke="#8d4a00" stroke-width=".5"/></g>`,
    winter: `<path d="M11.4 9.2q5.6-6.4 11.2 0z" fill="#1e88e5"/><rect x="10.8" y="8.4" width="12.4" height="2" rx="1" fill="#fff"/><circle cx="17" cy="3.4" r="1.5" fill="#fff"/>` }[deco] || "";
  return `<svg class="mascot ${mood === "calm" ? "" : mood}" viewBox="0 0 34 30" width="32" height="28" style="overflow:visible" aria-hidden="true">
    <path d="M10.4 26l-2.4 3M23.6 26l2.4 3" stroke="${o}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M4.6 10.4a5 5 0 0 1 7.8-6.2z" fill="#fdd835" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/><path d="M29.4 10.4a5 5 0 0 0-7.8-6.2z" fill="#fdd835" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/>
    <rect x="15.7" y="2.8" width="2.6" height="2.6" rx=".8" fill="${o}"/>
    <circle cx="17" cy="16" r="10.4" fill="#fafafa" stroke="#0478bd" stroke-width="1.9"/>
    <path d="M17 6.9v1.3M26.1 16h-1.3M17 25.1v-1.3M7.9 16h1.3" stroke="${k}" stroke-width=".9" stroke-linecap="round" opacity=".55"/>
    ${mood === "happy" ? `<circle cx="13.6" cy="16.6" r=".9" fill="#ec407a" opacity=".45"/><circle cx="20.4" cy="16.6" r=".9" fill="#ec407a" opacity=".45"/>` : ""}
    ${eyes}${mouth}${extra}${hat}</svg>`;
}


const SZ_EMOJI_ICONS = {
  "🏷": "mdi:tag-outline", "✏": "mdi:pencil-outline", "✍": "mdi:account-edit-outline", "📷": "mdi:camera-outline", "📖": "mdi:book-open-variant", "➕": "mdi:plus",
  "📍": "mdi:map-marker-outline", "👁": "mdi:eye-outline", "🛒": "mdi:cart-outline", "✅": "mdi:check-circle-outline", "🔄": "mdi:sync", "🔁": "mdi:repeat",
  "⚠": "mdi:alert-outline", "📋": "mdi:clipboard-text-outline", "📊": "mdi:chart-bar", "✔": "mdi:check", "🧂": "mdi:shaker-outline", "⏳": "mdi:timer-sand",
  "⌛": "mdi:timer-sand", "🏪": "mdi:store-outline", "📧": "mdi:email-outline", "↩": "mdi:undo-variant", "⇄": "mdi:swap-horizontal",
  "🤷": "mdi:map-marker-question-outline", "🕒": "mdi:clock-outline", "💡": "mdi:lightbulb-outline", "🧾": "mdi:receipt-text-outline", "🎉": "mdi:party-popper",
  "👥": "mdi:account-group-outline", "👪": "mdi:account-multiple-outline", "👤": "mdi:account-outline", "⏲": "mdi:pot-steam-outline", "⏱": "mdi:timer-outline",
  "🧲": "mdi:magnet", "🗓": "mdi:calendar-month-outline", "📅": "mdi:calendar-outline", "🚫": "mdi:cancel", "🥫": "mdi:food-variant", "📈": "mdi:chart-line",
  "🧽": "mdi:delete-sweep-outline", "🧹": "mdi:broom", "💣": "mdi:nuke", "🔧": "mdi:wrench-outline", "📝": "mdi:note-text-outline", "⭐": "mdi:star-outline",
  "⌨": "mdi:keyboard-outline", "🗞": "mdi:newspaper-variant-outline", "🖼": "mdi:image-outline", "🔒": "mdi:lock-outline", "🔓": "mdi:lock-open-variant-outline",
  "📦": "mdi:package-variant-closed", "🔥": "mdi:fire", "🤖": "mdi:robot-happy-outline", "🔠": "mdi:format-size", "⚙": "mdi:cog-outline", "🗂": "mdi:shape-outline",
  "🗺": "mdi:map-outline", "🧠": "mdi:brain", "🗣": "mdi:microphone-outline", "🌐": "mdi:web", "🍽": "mdi:silverware-fork-knife", "📄": "mdi:file-document-outline",
  "🧮": "mdi:calculator-variant-outline", "🔊": "mdi:volume-high", "📳": "mdi:vibrate", "🎌": "mdi:flag-outline", "👋": "mdi:hand-wave-outline", "🔐": "mdi:key-outline",
  "📏": "mdi:ruler", "✖": "mdi:close", "🗑": "mdi:delete-outline", "▥": "mdi:barcode", "🧩": "mdi:puzzle-outline", "🧰": "mdi:toolbox-outline", "🔢": "mdi:numeric", "🎨": "mdi:palette-outline", "🔀": "mdi:shuffle-variant", "✓": "mdi:check", "🍕": "mdi:pizza", "🍝": "mdi:pasta", "🥔": "mdi:food-variant", "🥚": "mdi:egg-outline", "🥦": "mdi:carrot", "🍗": "mdi:food-drumstick-outline", "🐟": "mdi:fish", "🍲": "mdi:pot-steam-outline", "💨": "mdi:weather-windy", "🍰": "mdi:cake-variant-outline", "🎛": "mdi:tune-variant", "💾": "mdi:content-save-outline", "💶": "mdi:cash-multiple", "🩺": "mdi:stethoscope", "📱": "mdi:cellphone", "🧪": "mdi:flask-outline", "👨‍🍳": "mdi:chef-hat", "🛍": "mdi:shopping-outline", "🪟": "mdi:window-open-variant", "✨": "mdi:creation-outline", "👆": "mdi:gesture-tap", "💳": "mdi:credit-card-outline", "🙏": "mdi:hand-heart-outline", "🐙": "mdi:github", "🐞": "mdi:bug-outline", "🔍": "mdi:magnify", "📥": "mdi:tray-arrow-down", "🕘": "mdi:history", "🌓": "mdi:theme-light-dark", "🛡": "mdi:shield-outline",
};
// 🎨 Farben zu den Symbolen (damit es nicht trist wird): nur außerhalb von Knöpfen/Links, dort gilt die Schriftfarbe des Knopfes
const SZ_EMOJI_COLORS = {
  "🧹": "#fb8c00", "✍": "#5c6bc0", "📍": "#e53935", "🏷": "#d81b60", "🛒": "#43a047", "✅": "#43a047", "⚠": "#f9a825", "🔧": "#607d8b", "🥫": "#8d6e63",
  "🧾": "#3949ab", "📖": "#1e88e5", "⭐": "#f9a825", "🔒": "#546e7a", "🔓": "#546e7a", "📷": "#1e88e5", "📝": "#6d4c41", "✏": "#6d4c41", "💡": "#f9a825",
  "🎉": "#ab47bc", "🔥": "#ef6c00", "🕒": "#546e7a", "🌐": "#1e88e5", "🔊": "#1e88e5", "📊": "#00897b", "🧂": "#8d6e63", "🏪": "#43a047", "📧": "#1e88e5",
  "🔄": "#1e88e5", "🔁": "#1e88e5", "📋": "#1e88e5", "🗓": "#43a047", "📅": "#43a047", "👥": "#8e24aa", "👪": "#8e24aa", "👤": "#8e24aa", "🧲": "#e53935",
  "🚫": "#e53935", "🗑": "#e53935", "💣": "#b71c1c", "🧽": "#fb8c00", "📈": "#00897b", "🗞": "#d81b60", "🤖": "#5e35b1", "🧠": "#5e35b1", "🤷": "#78909c",
  "⏳": "#fb8c00", "⌛": "#fb8c00", "↩": "#1e88e5", "⇄": "#1e88e5", "🔠": "#546e7a", "🗂": "#fb8c00", "🗺": "#43a047", "🗣": "#1e88e5", "📦": "#8d6e63",
  "🍽": "#fb8c00", "📄": "#546e7a", "🧮": "#00897b", "📳": "#546e7a", "🎌": "#e53935", "👋": "#fb8c00", "🔐": "#546e7a", "📏": "#546e7a", "🧪": "#8e24aa",
  "👨‍🍳": "#e53935", "🛍": "#43a047", "🪟": "#1e88e5", "✨": "#f9a825", "👆": "#1e88e5", "💳": "#00acc1", "🙏": "#ec407a", "🐞": "#e53935", "🔍": "#546e7a",
  "📥": "#1e88e5", "🕘": "#546e7a", "🌓": "#546e7a", "🛡": "#455a64", "⌨": "#546e7a", "🖼": "#1e88e5", "⏲": "#ef6c00", "⏱": "#26a69a", "▥": "#6d4c41", "🍝": "#f9a825", "🥔": "#8d6e63", "🥚": "#fbc02d", "🥦": "#43a047", "🍗": "#bf6b3a", "🐟": "#1e88e5", "🍲": "#ef6c00", "💨": "#546e7a", "🧩": "#8e24aa", "🧰": "#546e7a", "🔢": "#1e88e5", "🎨": "#ec407a", "🔀": "#1e88e5",
};
// 🧩 Farben der großen Gruppen-Kästchen in den Einstellungen (Emoji der Gruppe → Farbe)
const SZ_GEM_COLORS = { "💶": "#fb8c00", "🧮": "#00897b", "📋": "#1e88e5", "🎛": "#8e24aa", "💾": "#43a047", "🩺": "#e53935", "👁": "#00897b", "📱": "#3949ab" };

// ⏱️ Extra-Symbole (aus Kegelclub/Einkaufsliste übernommen)
Object.assign(SZ_EMOJI_ICONS, { "🐷": "mdi:piggy-bank-outline", "🏦": "mdi:bank-outline", "💵": "mdi:cash", "➖": "mdi:minus", "💰": "mdi:cash-multiple", "🎳": "mdi:bowling", "💸": "mdi:cash-minus", "🏁": "mdi:flag-checkered", "🙌": "mdi:hand-okay", "🏆": "mdi:trophy-outline", "👑": "mdi:crown-outline", "🎯": "mdi:target", "📤": "mdi:tray-arrow-up", "🙈": "mdi:eye-off-outline" });
Object.assign(SZ_EMOJI_COLORS, { "🐷": "#e91e63", "🏦": "#1e88e5", "💵": "#43a047", "💰": "#43a047", "🎳": "#fb8c00", "💸": "#e53935", "🏁": "#43a047", "🏆": "#f9a825", "👑": "#f9a825", "🎯": "#fb8c00", "📤": "#1e88e5" });
let SZ_EMOJI_RX = new RegExp("^\\s*(" + Object.keys(SZ_EMOJI_ICONS).sort((a, b) => b.length - a.length).join("|") + ")\\uFE0F?(?=\\s|$)\\s*", "u");
const SZ_ICON_PARENTS = "button,h2,h3,h4,summary,legend,label,b,span,li,a,small,p,.lbl,.ic";
const SZ_ICON_SKIP = "option,select,textarea,input,ha-icon,style,script,[data-noicon]";
// 🎛️ Wie bei der Einkaufsliste: Emoji vorn an Knöpfen/Überschriften → Linien-Symbol (sieht auf jedem Gerät gleich aus)
function szIconizeTree(root) {
  if (!root) return;
  const nodes = []; const w = document.createTreeWalker(root, 4 /* Text */); let n; while ((n = w.nextNode())) nodes.push(n);
  for (const t of nodes) {
    const p = t.parentElement;
    if (!p || !p.matches(SZ_ICON_PARENTS) || p.closest(SZ_ICON_SKIP)) continue; // eigene Namen bekommen data-noicon
    let first = p.firstChild; // das Emoji muss ganz vorn stehen
    while (first && first !== t && ((first.nodeType === 3 && !first.data.trim()) || (p.tagName === "LABEL" && first.nodeType === 1 && first.matches("input")))) first = first.nextSibling;
    if (first !== t) continue;
    const m = SZ_EMOJI_RX.exec(t.data);
    if (!m) continue;
    const key = m[1];
    const ic = document.createElement("ha-icon");
    ic.setAttribute("icon", SZ_EMOJI_ICONS[key]);
    ic.dataset.eli = "1";
    const gem = p.classList.contains("gem"); // großes Kästchen in den Einstellungen: farbiger Grund, weißes Symbol
    const plain = !gem && !p.closest("button,a,.tgl,.swline"); // Knöpfe und Links behalten ihre Schriftfarbe
    const flex = /flex/.test(getComputedStyle(p).display || "");
    ic.style.cssText = `--mdc-icon-size:${gem ? "1.25em" : "1.2em"};vertical-align:-.22em;flex:none;${flex || gem ? "" : "margin-right:.3em;"}${plain && SZ_EMOJI_COLORS[key] ? `color:${SZ_EMOJI_COLORS[key]};` : ""}`;
    if (gem) { p.style.setProperty("background", SZ_GEM_COLORS[key] || SZ_EMOJI_COLORS[key] || "#607d8b"); p.style.color = "#fff"; }
    const rest = t.data.slice(m[0].length);
    t.data = rest;
    if (p.tagName === "LABEL") { const wrap = document.createElement("span"); p.insertBefore(wrap, t); wrap.append(ic, t); }
    else p.insertBefore(ic, t);
  }
}
Object.assign(SZ_EMOJI_ICONS, { "⚖": "mdi:scale-balance", "☕": "mdi:coffee-outline", "🚀": "mdi:rocket-launch-outline", "🖨": "mdi:printer-outline", "🎌": "mdi:flag-outline", "📱": "mdi:cellphone", "💪": "mdi:arm-flex-outline" });
Object.assign(SZ_EMOJI_COLORS, { "⚖": "#43a047", "☕": "#6d4c41", "🚀": "#1e88e5", "🖨": "#546e7a", "💪": "#fb8c00" });
SZ_EMOJI_RX = new RegExp("^\\s*(" + Object.keys(SZ_EMOJI_ICONS).sort((a, b) => b.length - a.length).join("|") + ")\\uFE0F?(?=\\s|$)\\s*", "u");

const CSS = `
:host { display:block; --kc-green:var(--success-color,#43a047); --kc-yellow:var(--warning-color,#ffa600); --kc-red:var(--error-color,#db4437); --pc:var(--primary-color,#03a9f4); }
ha-card { display:block; padding:12px 12px 8px; overflow:hidden; background:var(--ha-card-background, var(--card-background-color)); border-radius:var(--ha-card-border-radius, 12px); }
* { box-sizing:border-box; }
button { font:inherit; color:inherit; }
ha-icon { --mdc-icon-size:20px; display:inline-flex; }
input, select, textarea { font:inherit; font-size:.95em; color:var(--primary-text-color); background:var(--card-background-color, var(--ha-card-background, #fff)); border:1px solid color-mix(in srgb, var(--primary-text-color, #000) 22%, transparent); border-radius:12px; padding:9px 10px; min-width:0; width:100%; outline:none; }
input::placeholder, textarea::placeholder { color:var(--secondary-text-color); opacity:.75; }
input:focus, select:focus, textarea:focus { border-color:var(--pc); box-shadow:0 0 0 2px color-mix(in srgb, var(--pc) 18%, transparent); }
input.swchk { -webkit-appearance:none; appearance:none; flex:none; width:40px; height:22px; margin:0; border:0; border-radius:12px; background:#bdbdbd; position:relative; cursor:pointer; transition:background .15s; padding:0; box-shadow:none; }
input.swchk::after { content:""; position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.3); transition:left .15s; }
input.swchk:checked { background:var(--pc); }
input.swchk:checked::after { left:20px; }
/* 🟢 Leiste oben – wie bei der Einkaufsliste */
.topbar { display:flex; align-items:center; gap:8px; margin:0 4px 8px; font-size:13px; color:var(--secondary-text-color); }
.topbar .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; color:var(--primary-text-color); }
.topbar .ver { opacity:.8; }
.topbar .lbl { display:none; }
.pill { cursor:pointer; border-radius:999px; padding:2px 10px; background:color-mix(in srgb, var(--kc-green) 18%, transparent); color:var(--primary-text-color); white-space:nowrap; border:0; font-size:13px; }
.pill.wait { background:color-mix(in srgb, var(--kc-yellow) 25%, transparent); }
.pill.off { background:color-mix(in srgb, var(--kc-red) 20%, transparent); }
.iconbtn { background:none; border:0; cursor:pointer; padding:6px; border-radius:50%; display:inline-flex; color:var(--secondary-text-color); line-height:0; }
.iconbtn:hover { background:var(--secondary-background-color, rgba(127,127,127,.12)); color:var(--primary-text-color); }
.iconbtn.on { color:var(--pc); }
/* 🏷️ Kopf in der Karte – wie bei der Einkaufsliste: Symbol + Zähler links, Werkzeuge rechts */
.head { display:flex; align-items:center; gap:4px; margin:0 2px 8px; min-height:36px; }
.title { display:flex; align-items:center; gap:8px; font-size:1.25em; font-weight:600; flex:1; min-width:0; }
.title .logo { cursor:pointer; display:inline-flex; }
.badge { cursor:pointer; background:var(--pc); color:var(--text-primary-color,#fff); border-radius:999px; padding:1px 9px; font-size:.75em; font-weight:600; }
.tabs { display:flex; gap:6px; overflow-x:auto; padding:2px 2px 8px; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tab { -webkit-user-select:none; user-select:none; flex:0 0 auto; border:1.5px solid color-mix(in srgb, var(--pc) 55%, transparent); background:transparent; border-radius:999px; padding:5px 12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:.9em; }
.tab ha-icon { --mdc-icon-size:18px; }
.tab.active { background:var(--pc); border-color:var(--pc); color:var(--text-primary-color,#fff); }
.tip { display:flex; align-items:center; gap:8px; border-radius:12px; padding:9px 12px; margin:2px 2px 8px; background:color-mix(in srgb, var(--kc-yellow) 18%, transparent); font-size:.9em; }
.hero { border-radius:12px; padding:12px 14px; margin:2px 2px 10px; background:color-mix(in srgb, var(--hc, var(--kc-green)) 12%, transparent); }
.hero .lbl { font-size:.85em; color:var(--secondary-text-color); }
.big { font-size:2.4em; font-weight:700; line-height:1.15; color:var(--hc, var(--kc-green)); font-variant-numeric:tabular-nums; cursor:pointer; }
.bar { height:8px; background:color-mix(in srgb, var(--primary-text-color) 10%, transparent); border-radius:5px; overflow:hidden; margin-top:8px; }
.bar i { display:block; height:100%; background:var(--hc, var(--kc-green)); border-radius:5px; }
.tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:0 2px 10px; }
.tile { background:var(--secondary-background-color, rgba(127,127,127,.06)); border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:16px; padding:10px 12px; text-align:left; min-width:0; color:var(--primary-text-color); }
.tile.click:hover { border-color:var(--pc); }
.tile.click { cursor:pointer; }
.tile b { display:block; font-size:1em; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tile span { font-size:.75em; color:var(--secondary-text-color); display:flex; align-items:center; gap:3px; }
.tile span ha-icon { --mdc-icon-size:13px; }
.next { display:flex; align-items:center; gap:8px; border-radius:12px; padding:9px 12px; margin:0 2px 6px; background:color-mix(in srgb, var(--kc-yellow) 15%, transparent); font-size:.92em; }
.next ha-icon { color:var(--kc-yellow); }
.ghead { display:flex; align-items:center; gap:6px; font-size:.8em; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--secondary-text-color); padding:12px 4px 2px; }
.ghead .gdot { width:22px; height:22px; flex:none; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--gc, var(--pc)) 18%, transparent); color:var(--gc, var(--pc)); }
.ghead .gdot ha-icon { --mdc-icon-size:16px; }
.ghead.click { cursor:pointer; border-radius:10px; }
.ghead.click:hover { background:var(--secondary-background-color, rgba(127,127,127,.08)); }
.ghead .chev { display:inline-flex; color:var(--secondary-text-color); }
.ghead.click .n { margin-left:auto; }
.ghead .n { margin-left:auto; font-weight:500; text-transform:none; letter-spacing:0; font-size:.9em; }
/* 🧾 Zeilen wie bei der Einkaufsliste: kompakt, farbiger Streifen links */
.item { display:flex; align-items:center; gap:8px; padding:5px 4px 5px 6px; border-radius:12px; border-left:4px solid var(--cc, transparent); transition:opacity .25s, background .2s; }
.item.click:hover { background:color-mix(in srgb, var(--pc) 6%, transparent); }
.item.click { cursor:pointer; }
.chk { width:26px; height:26px; flex:none; border-radius:50%; border:2px solid var(--pc); background:none; cursor:pointer; color:#fff; padding:0; display:inline-flex; align-items:center; justify-content:center; }
.chk ha-icon { --mdc-icon-size:17px; }
.chk.on { background:var(--kc-green); border-color:var(--kc-green); }
.item.done .n b { opacity:.6; text-decoration:line-through; }
.n { flex:1; min-width:0; padding:2px 0; }
.n b { font-weight:500; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.meta { font-size:.75em; color:var(--secondary-text-color); display:flex; flex-wrap:wrap; gap:3px 6px; margin-top:2px; }
.tag { border-radius:8px; padding:0 6px; background:color-mix(in srgb, var(--primary-text-color, #000) 6%, transparent); white-space:nowrap; }
.tag.wait { background:color-mix(in srgb, var(--kc-yellow) 25%, transparent); color:var(--primary-text-color); }
.amt { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.neg { color:var(--kc-red); } .pos { color:var(--kc-green); }
.quick { display:flex; flex-wrap:nowrap; gap:6px; margin:4px 2px 6px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; padding-bottom:2px; } /* ↔️ volle Leiste = wischen, wie die Reiter der Einkaufsliste */
.quick::-webkit-scrollbar { display:none; }
.chip { flex:0 0 auto; white-space:nowrap; border:1.5px solid var(--divider-color, rgba(127,127,127,.35)); background:transparent; border-radius:999px; padding:7px 14px; cursor:pointer; font-size:.95em; }
.chip.on { background:var(--pc); border-color:var(--pc); color:var(--text-primary-color,#fff); }
form.add { display:grid; grid-template-columns:1fr 110px 48px; gap:6px; margin:2px 2px 6px; }
form.add.pinf { grid-template-columns:1fr 48px; }
.potbox { padding:8px 10px; }
.pothead { cursor:pointer; margin:0 0 6px; }
.potrow { display:grid; grid-template-columns:1fr auto auto; gap:6px; align-items:center; margin:0 0 6px; }
.potrow.set { grid-template-columns:auto 1fr auto auto; margin:0; }
.potrow input.amount { text-align:right; min-width:0; }
.lentbtn { border:0; font:inherit; font-size:.85em; cursor:pointer; display:inline-flex; align-items:center; gap:2px; vertical-align:middle; }
.lentbtn ha-icon { --mdc-icon-size:14px; }
.potlbl { font-size:.85em; color:var(--secondary-text-color); }
.iconbtn.potbtn { border:1.5px solid var(--divider-color, rgba(127,127,127,.35)); padding:7px; }
form.add input.amount { text-align:right; }
.addbtn { border:0; border-radius:12px; background:var(--kc-green); color:#fff; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.addbtn ha-icon { --mdc-icon-size:26px; }
.btn { box-sizing:border-box; min-height:40px; border:1px solid color-mix(in srgb, var(--primary-text-color, #000) 22%, transparent); background:transparent; color:var(--primary-text-color); border-radius:12px; padding:8px 14px; cursor:pointer; font:inherit; font-size:.9em; font-weight:500; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:background .15s, border-color .15s; }
.btn:hover:not([disabled]) { border-color:var(--pc); background:color-mix(in srgb, var(--pc) 6%, transparent); }
.btn:active:not([disabled]) { transform:scale(.97); }
.btn ha-icon { --mdc-icon-size:18px; }
.btn.main { border:1px solid transparent; background:var(--pc); color:var(--text-primary-color,#fff); }
.btn.main:hover:not([disabled]) { background:color-mix(in srgb, var(--pc) 88%, #000); border-color:transparent; }
.btn.ok { color:var(--kc-green); border-color:color-mix(in srgb, var(--kc-green) 45%, transparent); }
.btn.small { padding:5px 10px; min-height:32px; font-size:.85em; }
.sum { display:flex; justify-content:space-between; padding:8px 6px 0; font-weight:600; }
.edit { border:1px solid var(--divider-color, rgba(127,127,127,.2)); border-radius:12px; padding:10px; margin:6px 2px; }
.f { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.f label { display:flex; flex-direction:column; gap:3px; font-size:.8em; color:var(--secondary-text-color); }
.f label.wide { grid-column:1 / -1; }
.months { display:flex; flex-wrap:wrap; gap:4px; }
.months button { border:1.5px solid color-mix(in srgb, var(--pc) 45%, transparent); background:none; border-radius:999px; padding:3px 9px; font-size:.85em; cursor:pointer; }
.months button.on { background:var(--pc); color:#fff; border-color:var(--pc); }
.btnrow { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.btnrow.end { justify-content:flex-end; }
.switch { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 4px; border-bottom:1px solid var(--divider-color, rgba(127,127,127,.15)); }
.switch span { display:flex; align-items:center; gap:8px; }
.hist { display:flex; align-items:flex-end; gap:6px; height:150px; padding:8px 0 0; border-bottom:1px solid var(--divider-color); }
.hist .m { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:2px; min-width:0; }
.hist .m span { font-size:10.5px; color:var(--secondary-text-color); }
.legend { display:flex; gap:12px; font-size:12px; color:var(--secondary-text-color); margin:6px 4px; }
.legend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:4px; vertical-align:-1px; }
table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
td, th { padding:6px 4px; border-bottom:1px solid var(--divider-color); text-align:right; font-variant-numeric:tabular-nums; }
td:first-child, th:first-child { text-align:left; }
.hidden-amt { filter:blur(7px); user-select:none; }
.empty { text-align:center; padding:22px 8px; color:var(--secondary-text-color); }
.small { font-size:.82em; color:var(--secondary-text-color); margin:6px 4px; }
/* 📖 Knöpfe UNTER der Karte – wie bei der Einkaufsliste */
.foot { display:flex; justify-content:center; gap:10px; margin:14px 6px 8px; font-size:13px; color:var(--secondary-text-color); }
.foot button { font:inherit; color:inherit; background:none; text-decoration:underline; border:1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius:12px; padding:8px 18px; cursor:pointer; }
.foot button.on { border-color:var(--pc); color:var(--pc); }
.foot button { display:inline-flex; align-items:center; gap:6px; }
.foot button ha-icon { --mdc-icon-size:18px; }
details.gsec { border-radius:12px; margin:6px 2px; background:var(--secondary-background-color, rgba(127,127,127,.08)); }
details.gsec summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:10px; padding:10px 12px; font-weight:600; }
details.gsec summary::-webkit-details-marker { display:none; }
details.gsec .gdot { width:28px; height:28px; flex:none; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--gc) 20%, transparent); color:var(--gc); }
details.gsec .gdot ha-icon { --mdc-icon-size:17px; }
details.gsec .gtext { padding:0 14px 12px 50px; font-size:.92em; line-height:1.5; }
a.btn { text-decoration:none; color:inherit; }
a.btn.paypal { background:#0070ba; border-color:#0070ba; color:#fff; }
/* 🙏 Credits – wie bei der Einkaufsliste */
.elcredits { text-align:center; } .elcredits p { margin:8px 0; }
.ellogo { background:#fff; border-radius:16px; padding:10px; display:inline-block; max-width:100%; box-shadow:0 1px 4px rgba(0,0,0,.12); }
.ellogo img { display:block; max-width:100%; width:200px; height:auto; }
.elcbtns { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin:12px 0; }
a.elcbtn { color:var(--primary-text-color); background:var(--secondary-background-color, rgba(127,127,127,.12)); border-radius:12px; padding:10px 14px; text-decoration:none; font-weight:500; }
a.elcbtn.pp { display:inline-flex; align-items:center; gap:8px; background:#0070BA; color:#fff; border:2px solid #003087; font-weight:700; }
.elcbtn.pp svg { width:20px; height:20px; flex:none; }
.elcsmall { opacity:.7; font-size:.9em; }
a { color:var(--pc); }
/* 🧮 Taschenrechner */
.calc { border-radius:12px; padding:10px; margin:0 2px 10px; background:var(--secondary-background-color, rgba(127,127,127,.1)); }
.calc .disp { display:flex; flex-direction:column; align-items:flex-end; background:var(--card-background-color); border-radius:10px; padding:6px 12px; margin-bottom:8px; min-height:62px; }
.calc .expr { font-size:.9em; color:var(--secondary-text-color); min-height:1.3em; word-break:break-all; text-align:right; }
.calc .res { font-size:1.8em; font-weight:600; font-variant-numeric:tabular-nums; }
.calc .keys { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.calc .keys button { border:0; border-radius:10px; padding:12px 0; font-size:1.15em; cursor:pointer; background:var(--card-background-color); }
.calc .keys button.op { color:var(--pc); font-weight:600; }
.calc .keys button.eq { background:var(--pc); color:#fff; }
.calc .keys button.cl { color:var(--kc-red); }
/* ⏸️ pausiert */
.item.paused .chk { opacity:.6; cursor:default; }
/* ⠿ Verschieben */
.olist { display:flex; flex-direction:column; }

.grip { display:inline-flex; color:var(--secondary-text-color); cursor:grab; touch-action:none; padding:4px 2px; margin:-4px 0; }
.item.drag { background:color-mix(in srgb, var(--pc) 12%, transparent); box-shadow:0 2px 8px rgba(0,0,0,.25); }
.gsub { font-size:.78em; font-weight:600; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:.04em; padding:8px 6px 2px; }
/* ⚙️ Einstellungen wie bei der Einkaufsliste: ein Kasten pro Zweck, Zeilen mit bunten Symbol-Kästchen */
.sethead { font-weight:600; font-size:1.05em; margin:4px 4px 2px; display:flex; align-items:center; gap:8px; }
.lgbox { margin:10px 0 0; border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:12px; overflow:hidden; }
.lgroup { display:flex; align-items:center; gap:12px; width:100%; margin:0; padding:10px 12px; font:inherit; font-size:1em; color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color, #000) 3%, transparent); border:0; cursor:pointer; text-align:left; }
.lgroup[aria-expanded="true"] { border-bottom:1px solid var(--divider-color, rgba(127,127,127,.25)); }
.lgroup b, .lrow b { display:block; font-weight:600; }
.lrow b { font-weight:500; }
.lgroup small, .lrow small { display:block; color:var(--secondary-text-color); font-size:.8em; font-weight:400; }
.lgroup .gem { width:36px; height:36px; flex:none; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; background:color-mix(in srgb, var(--primary-text-color, #000) 7%, transparent); }
.lgroup .grow, .lrow .grow { flex:1 1 auto; min-width:0; }
.lgroup > ha-icon, .lrow > ha-icon:last-child { flex:none; color:var(--secondary-text-color); }
.lrow { display:flex; align-items:center; gap:12px; width:calc(100% - 4px); margin:0 0 0 4px; text-align:left; padding:10px 12px; cursor:pointer; border:0; border-top:1px solid var(--divider-color, rgba(127,127,127,.25)); background:none; color:var(--primary-text-color); font:inherit; }
.lgroup + .lrow { border-top:0; }
.lrow:hover { background:color-mix(in srgb, var(--pc) 6%, transparent); }
.lrow > ha-icon:last-child { opacity:.5; }
.ic { --ic:#607d8b; width:36px; height:36px; flex:none; border-radius:12px; display:flex; align-items:center; justify-content:center; background:var(--ic); color:#fff; }
.ic ha-icon { --mdc-icon-size:20px; color:#fff; }
.pagebody textarea, .pagebody input[readonly] { width:100%; }
/* ↩️ Rückgängig-Leiste unten in der Mitte – wie bei der Einkaufsliste */
/* ✓ nur ein grüner Haken – was er macht, zeigt langes Drücken (wie bei der Einkaufsliste) */
.iconbtn.okbtn { color:var(--kc-green); border:1.5px solid color-mix(in srgb, var(--kc-green) 45%, transparent); padding:5px; }
.iconbtn.okbtn:hover { background:color-mix(in srgb, var(--kc-green) 12%, transparent); color:var(--kc-green); }
.iconbtn.potbtn.okbtn { padding:7px; }
.finding { border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-left:4px solid var(--kc-yellow); border-radius:12px; padding:8px 10px; margin:6px 0; }
.okmsg { color:var(--kc-green); font-weight:600; }
.btn.danger { color:#fff; background:#c62828; border-color:#c62828; }
.tag.lent, .lenttxt { color:#ef6c00; } .tag.lent { background:color-mix(in srgb, #fb8c00 18%, transparent); }
.undobar { position:fixed; left:50%; bottom:calc(20px + env(safe-area-inset-bottom, 0px)); transform:translateX(-50%); z-index:50; max-width:calc(100vw - 24px); display:flex; align-items:center; gap:12px; padding:8px 8px 8px 16px; border-radius:24px; background:#323232; color:#fff; box-shadow:0 3px 12px rgba(0,0,0,.35); font-size:.92em; }
.undobar .ut { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.undobar .ub { border:0; border-radius:16px; padding:7px 12px; background:#fff; color:#222; font:inherit; font-weight:600; cursor:pointer; white-space:nowrap; }
/* 🔄 Neue Version – wie bei der Einkaufsliste */
.updbar { margin:0 2px 8px; padding:8px 10px; border-radius:12px; background:color-mix(in srgb, var(--primary-color,#03a9f4) 14%, transparent); font-size:.88em; display:flex; align-items:center; gap:8px; }
.updbar b { flex:1; }
/* 🪟 Seiten IN der Karte – wie bei der Einkaufsliste (Symbol + Titel, ← / ✕ oben rechts) */
.sec { margin:4px 2px 16px; }
.sechead { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.sechead h3 { min-width:0; margin:0; font-size:1em; }
.pagebody p { line-height:1.4; }
/* 🔢 PIN-Eingabe wie am Handy – wie bei der Einkaufsliste */
.pinpad { text-align:center; max-width:300px; width:100%; margin:0 auto; }
.pinpad .pdots { font-size:28px; letter-spacing:10px; min-height:40px; margin:10px 0 16px; }
.pinpad .ppad { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.pinpad .ppad .btn { font-size:24px; padding:16px 0; margin:0; width:100%; }
.pinpad .pcancel { margin-top:18px; }
.btn.primary { border:1px solid transparent; background:var(--pc); color:var(--text-primary-color,#fff); }
/* 📖 Anleitung wie bei der Einkaufsliste */
.elg { font:15px/1.5 Roboto, sans-serif; }
.elg h2 { font-size:20px; margin:6px 0 4px; }
.elg .elg-sub { color:var(--secondary-text-color); margin:0 0 12px; font-size:14px; }
.elg-q { width:100%; margin:0 0 10px; font-size:16px; padding:10px 12px; }
.elg-none { color:var(--secondary-text-color); margin:8px 2px; }
.elg-sec { border:1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius:12px; margin:10px 0 0; overflow:hidden; }
.elg-sec[hidden] { display:none; }
.elg-sec summary { cursor:pointer; padding:10px 12px; font-weight:600; font-size:16px; list-style:none; display:flex; align-items:center; gap:12px; background:color-mix(in srgb, var(--primary-text-color, #000) 3%, transparent); }
.elg-sec summary::-webkit-details-marker { display:none; }
.elg-sec summary::after { content:""; flex:none; width:8px; height:8px; margin:0 6px 4px auto; border-right:2px solid var(--secondary-text-color); border-bottom:2px solid var(--secondary-text-color); transform:rotate(45deg); transition:transform .2s; }
.elg-sec[open] summary::after { transform:rotate(225deg); margin-bottom:-4px; }
.elg-sec[open] summary { border-bottom:1px solid var(--divider-color, rgba(127,127,127,.3)); }
.elg-ic { flex:none; width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; background:color-mix(in srgb, var(--primary-text-color, #000) 7%, transparent); }
.elg-tt { flex:1; min-width:0; } .elg-tt b { display:block; } .elg-tt small { display:block; font-weight:400; font-size:12.5px; color:var(--secondary-text-color); }
.elg-sec > div { padding:8px 12px 12px; }
.elg-sec ul { margin:4px 0; padding-left:20px; } .elg-sec li { margin:4px 0; }
.betabox { border:1px solid #fb8c00; border-radius:12px; padding:10px 12px; margin:0 0 12px; background:rgba(251,140,0,.1); }
ol.steps { padding-left:22px; }
ol.steps li { margin:3px 0; }
/* 🔤 Beschriftungen unter Symbol-Knöpfen (⚙️ → Ansicht) */
.iconbtn .lbl { font-size:10px; line-height:1.1; font-weight:500; }
:host(.labels) .iconbtn:has(.lbl) { flex-direction:column; align-items:center; gap:2px; border-radius:10px; padding:4px 5px; }
:host(.labels) .topbar .lbl { display:inline; }
:host(.labels) .topbar .iconbtn { flex-direction:column; align-items:center; gap:2px; border-radius:10px; }
/* 🧘 Ruhiger Modus (nur dieses Gerät) */
:host(.calm) *, :host(.calm) *::before, :host(.calm) *::after { animation:none !important; transition:none !important; }
:host(.calm) .gdot, :host(.calm) .ic, :host(.calm) .gem, :host(.calm) .hero, :host(.calm) .badge, :host(.calm) .mascot { filter:saturate(.35); }
/* 🐷 Maskottchen */
.mascotbox { color:var(--primary-text-color); }
.mascot.happy { animation:fkwob 2.6s ease-in-out infinite; transform-origin:50% 90%; }
.mascotbox.hop .mascot { animation:fkhop .7s ease-out 2; }
@keyframes fkwob { 0%,100% { transform:rotate(0); } 25% { transform:rotate(-4deg); } 75% { transform:rotate(4deg); } }
@keyframes fkhop { 0%,100% { transform:translateY(0); } 40% { transform:translateY(-7px); } }
@media (prefers-reduced-motion: reduce) { .mascot, .mascotbox .mascot { animation:none !important; } }
.mascotprev { display:flex; flex-wrap:wrap; gap:14px; margin:10px 0; color:var(--primary-text-color); }
.mascotprev > span { display:flex; flex-direction:column; align-items:center; gap:2px; }
.mascotprev svg { width:44px; height:39px; }
.mascotprev small { font-size:11px; color:var(--secondary-text-color); }
.mascotprev > span.now { outline:2px solid #ec407a; outline-offset:3px; border-radius:10px; }
/* 📜 Verlauf */
.logday { margin:12px 0 4px; font-size:.8em; font-weight:600; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:.03em; }
.logrow { display:flex; align-items:baseline; gap:8px; padding:4px 2px; border-bottom:1px solid var(--divider-color, rgba(127,127,127,.15)); font-size:.9em; }
.logrow .lt { flex:none; width:42px; color:var(--secondary-text-color); font-variant-numeric:tabular-nums; }
.logrow .lx { flex:1; min-width:0; }
.switch .vt { display:flex; flex-direction:column; align-items:flex-start; } .switch .vt small { color:var(--secondary-text-color); font-size:.82em; }
/* 🙈 verschleierte Beträge: PC = Maus drüber, Handy = antippen (4 Sekunden) */
.veil { filter:blur(6px); cursor:pointer; user-select:none; -webkit-user-select:none; transition:filter .2s; }
.veil.peek { filter:none; }
@media (hover:hover) { .veil:hover { filter:none; } }
/* 🎳 Kegelabend: Personen-Kacheln und Strafen-Knöpfe */
.ppl { display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:6px; margin:4px 2px 8px; }
.pp { position:relative; border:2px solid transparent; border-radius:16px; padding:8px 4px 6px; text-align:center; background:var(--secondary-background-color, rgba(127,127,127,.06)); cursor:pointer; min-width:0; color:var(--primary-text-color); font:inherit; }
.pp.sel { border-color:var(--pc); background:color-mix(in srgb, var(--pc) 12%, transparent); }
.pp.off { opacity:.55; }
.pp .av { width:38px; height:38px; margin:0 auto 4px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:14px; background:var(--ac, #607d8b); }
.pp .nm { display:block; font-size:.85em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pp .sum { display:block; font-size:.75em; font-variant-numeric:tabular-nums; color:var(--kc-red); padding:0; font-weight:500; }
.pp .gst { position:absolute; top:4px; left:6px; font-size:9px; font-weight:700; color:var(--secondary-text-color); text-transform:uppercase; }
.stbtn { white-space:nowrap; display:inline-flex; align-items:center; gap:3px; margin-top:4px; border:0; border-radius:999px; padding:2px 8px; font:inherit; font-size:.72em; cursor:pointer; color:#fff; background:var(--sc, #9e9e9e); }
.stbtn ha-icon { --mdc-icon-size:13px; }
.pp.add .av { background:color-mix(in srgb, var(--primary-text-color) 12%, transparent); color:var(--primary-text-color); }
.fines { display:grid; grid-template-columns:repeat(auto-fill, minmax(96px, 1fr)); gap:8px; margin:4px 2px 8px; }
.fine { border:0; border-radius:16px; padding:12px 6px 10px; text-align:center; cursor:pointer; background:var(--secondary-background-color, rgba(127,127,127,.08)); color:var(--primary-text-color); font:inherit; position:relative; }
.fine:active:not([disabled]) { transform:scale(.95); }
.fine[disabled] { opacity:.4; cursor:default; }
.fine ha-icon { --mdc-icon-size:30px; color:var(--kc-orange, #fb8c00); display:block; margin:0 auto 4px; }
.fine b { display:block; font-weight:500; font-size:.9em; line-height:1.2; }
.fine small { display:block; font-size:.75em; color:var(--secondary-text-color); }
.fine small.oth { color:#1e88e5; }
.fine .cnt { position:absolute; top:6px; right:8px; min-width:20px; height:20px; padding:0 5px; border-radius:999px; background:var(--pc); color:#fff; font-size:.72em; font-weight:700; display:flex; align-items:center; justify-content:center; }
.evbar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:2px 2px 8px; }
.evbar .hrs { display:inline-flex; align-items:center; gap:4px; }
.evbar .hrs input { width:64px; text-align:right; padding:6px 8px; }
.bill .item { cursor:default; }
.bill .n .meta .tag.del { cursor:pointer; }
.chips { display:flex; flex-wrap:wrap; gap:4px; }
.chipx { display:inline-flex; align-items:center; gap:2px; border-radius:999px; padding:1px 4px 1px 8px; background:color-mix(in srgb, var(--primary-text-color, #000) 7%, transparent); font-size:.78em; }
.chipx button { border:0; background:none; cursor:pointer; color:var(--kc-red); padding:0 2px; font:inherit; font-weight:700; line-height:1; }
.big.kasse { color:var(--hc, var(--kc-green)); }
.stbar { display:flex; align-items:flex-end; gap:6px; height:150px; padding:18px 2px 0; border-bottom:1px solid var(--divider-color); }
.stbar .c { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; min-width:0; position:relative; }
.stbar .c i { display:block; width:100%; max-width:42px; border-radius:6px 6px 0 0; background:var(--bc, var(--pc)); }
.stbar .c span { position:absolute; top:-16px; font-size:10.5px; white-space:nowrap; }
.stlbl { display:flex; gap:6px; padding:3px 2px 0; }
.stlbl span { flex:1; min-width:0; text-align:center; font-size:10.5px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pie { display:flex; align-items:center; gap:14px; margin:6px 2px; }
.pie .disc { width:120px; height:120px; flex:none; border-radius:50%; }
.pie .lg { font-size:.85em; line-height:1.7; min-width:0; }
.pie .lg i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:-1px; }
.kings { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:6px; margin:0 2px 8px; }
.yearnav { display:flex; align-items:center; justify-content:center; gap:10px; margin:0 2px 6px; font-weight:600; }
.wiz { display:grid; gap:8px; margin:6px 2px; }
.wiz .btn { justify-content:flex-start; padding:12px 14px; text-align:left; }
.wiz .btn small { display:block; font-weight:400; color:var(--secondary-text-color); }
.iconpick { display:grid; grid-template-columns:repeat(auto-fill, minmax(40px, 1fr)); gap:4px; }
.iconpick button { border:1.5px solid transparent; border-radius:10px; background:var(--secondary-background-color, rgba(127,127,127,.08)); padding:6px 0; cursor:pointer; color:var(--primary-text-color); }
.iconpick button.on { border-color:var(--pc); color:var(--pc); }
.seg { display:flex; flex-wrap:wrap; gap:6px; }
.seg button { border:1.5px solid color-mix(in srgb, var(--pc) 45%, transparent); background:none; border-radius:999px; padding:5px 12px; cursor:pointer; font:inherit; font-size:.88em; color:var(--primary-text-color); }
.seg button.on { background:var(--pc); color:#fff; border-color:var(--pc); }
.preview { border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:12px; padding:10px 12px; margin:8px 0; }
.preview table td:first-child { color:var(--secondary-text-color); }
.fine .fminus { position:absolute; top:4px; left:6px; width:26px; height:26px; border-radius:50%; background:var(--kc-red, #e53935); color:#fff; font-size:18px; font-weight:700; line-height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1; }
.fine.hand ha-icon { color:#1e88e5; }
.away { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0 2px 10px; }
.away .chip { border-left:3px solid var(--sc, #9e9e9e); }
.bill .tag.ok { background:color-mix(in srgb, var(--kc-green, #43a047) 18%, transparent); color:var(--kc-green, #43a047); }
.bill .tag.no { background:color-mix(in srgb, var(--kc-red, #e53935) 15%, transparent); color:var(--kc-red, #e53935); }
.bill button.tag { border:0; cursor:pointer; font:inherit; font-size:inherit; }
.evbar .tag.ok { display:inline-flex; align-items:center; gap:3px; color:var(--kc-green, #43a047); }
.evbar .tag.ok ha-icon { --mdc-icon-size:15px; }
.coin { color:var(--secondary-text-color); }
.coin.ok { color:var(--kc-green, #43a047); }
.coin ha-icon { --mdc-icon-size:26px; }
.bill .item.off { opacity:.6; }
.pp.gone { opacity:.75; }
.clubbday { margin:0 2px 10px; padding:8px 12px; border-radius:12px; background:color-mix(in srgb, #fb8c00 14%, transparent); font-weight:500; text-align:center; }
.edit textarea { width:100%; box-sizing:border-box; font:inherit; border-radius:10px; padding:8px; border:1px solid var(--divider-color); background:var(--card-background-color); color:var(--primary-text-color); resize:vertical; }
.iconbtn.awake.on { color:var(--primary-color,#03a9f4); }
/* 📜 Lauftext für zu lange Namen */
.tk { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; min-width:0; }
.tile span > .tk { display:inline-block; max-width:100%; vertical-align:bottom; }
.tk.run { text-overflow:clip; -webkit-mask-image:linear-gradient(90deg, #000, #000 92%, transparent); mask-image:linear-gradient(90deg, #000, #000 92%, transparent); }
.tk .tki, .tk .tkg { font-size:inherit !important; color:inherit; }
.tk .tki { display:inline-block !important; white-space:nowrap; animation:kctk var(--d, 8s) linear infinite; }
.tk .tkg { display:inline-block; width:40px; }
@keyframes kctk { 0%, 12% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
:host(.calm) .tk { white-space:normal; }
/* 📊 Statistik (beta.5) */
.yearnav .btn.small { margin-left:8px; }
.stseg { justify-content:center; margin:2px 0 10px; }
.stseg button { display:inline-flex; align-items:center; gap:4px; }
.stseg ha-icon { --mdc-icon-size:16px; }
.kpis { grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); }
.tile .dl { font-size:.72em; display:block; margin-top:2px; color:var(--secondary-text-color); }
.tile .dl.up { color:#e53935; }
.tile .dl.down { color:#43a047; }
.recs { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:6px; margin:0 2px 8px; }
.tile.rec { border-left:4px solid var(--rc); }
.tile.rec > span:first-child ha-icon { color:var(--rc); }
.tile .rs { font-size:.72em; color:var(--secondary-text-color); display:block; }
.stbar .c.click { cursor:pointer; }
table.sttab td, table.sttab th { padding:6px 4px; border-bottom:1px solid var(--divider-color); text-align:left; }
table.sttab th { font-weight:500; font-size:.85em; color:var(--secondary-text-color); }
table.sttab tr.click { cursor:pointer; }
table.sttab tr.click:hover td { background:color-mix(in srgb, var(--pc) 8%, transparent); }
table.sttab td:not(:first-child), table.sttab th:not(:first-child) { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
i.dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:7px; vertical-align:0; }
.cellbar { position:relative; display:block; min-width:84px; padding:2px 6px; isolation:isolate; }
.cellbar i { position:absolute; right:0; top:0; bottom:0; background:color-mix(in srgb, #e53935 22%, transparent); border-radius:6px; z-index:-1; }
.hbar { display:grid; grid-template-columns:minmax(90px, 38%) 1fr auto; align-items:center; gap:8px; margin:5px 2px; font-size:.9em; }
.hbar > span { display:flex; align-items:center; gap:5px; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.hbar > span ha-icon { --mdc-icon-size:16px; color:#fb8c00; flex:none; }
.hbar i { display:block; height:12px; border-radius:6px; background:var(--bc, var(--pc)); }
.minibars { display:flex; align-items:flex-end; gap:2px; height:64px; padding:4px 2px; border-bottom:1px solid var(--divider-color); }
.minibars i { flex:1; min-width:2px; max-width:14px; border-radius:3px 3px 0 0; background:var(--bc, var(--pc)); }
.mxwrap { overflow-x:auto; margin:0 -2px; }
table.matrix { width:auto; min-width:100%; }
table.matrix th, table.matrix td { padding:5px 6px; text-align:center; border-bottom:1px solid var(--divider-color); font-variant-numeric:tabular-nums; }
table.matrix td:first-child { text-align:left; white-space:nowrap; position:sticky; left:0; background:var(--card-background-color, #fff); }
table.matrix th ha-icon { --mdc-icon-size:18px; color:#fb8c00; }
table.matrix td:not(:first-child) { background:rgba(142, 36, 170, var(--a)); }
.tile b span:not(.tki):not(.tkg), .tile b .m { font-size:inherit !important; color:inherit !important; display:inline !important; }
table.matrix th small { display:block; font-size:9.5px; font-weight:400; color:var(--secondary-text-color); max-width:62px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:2px auto 0; }
/* 📸 Mitglieder-Fotos (beta.6) */
.pp .av.ph { padding:0; overflow:hidden; box-shadow:0 0 0 2px var(--ac, #607d8b); }
.pp .av.ph img { width:100%; height:100%; object-fit:cover; display:block; }
img.phav { border-radius:50%; object-fit:cover; flex:none; vertical-align:middle; margin-right:8px; }
.item > img.phav { margin-right:2px; }
.hbar img.phav { margin-right:2px; }
table.sttab img.phav { margin-right:7px; }
.hero { position:relative; }
img.phhero { position:absolute; right:14px; top:50%; transform:translateY(-50%); width:72px; height:72px; border-radius:50%; object-fit:cover; box-shadow:0 0 0 3px var(--hc); }
.phrow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.phprev { width:56px; height:56px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--primary-text-color) 10%, transparent); flex:none; }
.phprev img { width:100%; height:100%; object-fit:cover; }
.phprev ha-icon { --mdc-icon-size:30px; opacity:.5; }
.phrow label.btn { cursor:pointer; }
.hbar.click { cursor:pointer; }
/* 📤 Drucken & Teilen (beta.6) */
.prchoice { display:flex; flex-wrap:wrap; gap:8px; margin:2px 0 10px; }
.prqr { display:flex; flex-direction:column; align-items:center; gap:8px; margin:6px 0 10px; }
.prqrbox { display:flex; flex-direction:column; align-items:center; gap:4px; }
.prqrc { width:min(280px, 80vw); background:#fff; padding:6px; border-radius:12px; }
.prqrc svg { width:100%; height:auto; display:block; }
.shprev td, .shprev th { white-space:nowrap; } .shprev td:last-child { white-space:normal; min-width:120px; }
.kcprev { overflow-x:auto; border:1px solid var(--divider-color); border-radius:12px; }
/* ⏱️ Extra für den Stundenzettel */
.tiles.two { grid-template-columns:repeat(2,1fr); }
.tile b small { font-weight:400; font-size:.62em; color:var(--secondary-text-color); }
.hero .big { font-variant-numeric:tabular-nums; }
.hero.running .big::after { content:""; display:inline-block; width:.42em; height:.42em; margin-left:.35em; border-radius:50%; background:var(--hc); vertical-align:.2em; animation:szblink 1.6s ease-in-out infinite; }
@keyframes szblink { 50% { opacity:.15; } }
:host(.calm) .hero.running .big::after { animation:none; }
.dayrow .tag.wait { background:color-mix(in srgb, #fb8c00 18%, transparent); }
.kg { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0 2px 10px; }
.kgf { display:grid; grid-template-columns:1fr auto; grid-template-rows:auto auto; align-items:center; column-gap:4px; background:var(--secondary-background-color, rgba(127,127,127,.06)); border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:14px; padding:6px 6px 6px 10px; min-width:0; }
.kgl { grid-column:1 / -1; display:flex; align-items:center; gap:4px; font-size:.8em; color:var(--secondary-text-color); white-space:nowrap; }
.kgl ha-icon { --mdc-icon-size:16px; }
.kgf input[type=time] { width:100%; min-width:0; box-sizing:border-box; font-size:1.35em; font-weight:600; border:0; background:transparent; color:var(--primary-text-color); font-variant-numeric:tabular-nums; padding:4px 2px; }
.kg.ghost .kgf input { color:var(--secondary-text-color); font-weight:400; }
.kgh { margin:-4px 4px 10px; }
.boss { color:var(--kc-red); font-weight:600; font-size:.85em; margin-right:6px; font-variant-numeric:tabular-nums; }
.bossrow { display:inline-flex; align-items:center; gap:6px; }
.finfo { flex:none; width:20px; height:20px; padding:0; border-radius:50%; border:1.5px solid var(--pc); background:none; color:var(--pc); font:700 11px/1 serif; font-style:italic; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; text-transform:none; letter-spacing:0; }
.finfo[aria-expanded="true"] { background:var(--pc); color:#fff; }
.fhint { margin:2px 4px 8px; padding:2px 10px; border-radius:10px; background:color-mix(in srgb, var(--pc) 10%, transparent); }
.fhint[hidden] { display:none; }
.flab { display:flex; align-items:center; gap:8px; }
.fhint p.small { margin:6px 0; }
.kgf.in { --kgc:var(--kc-green); } .kgf.out { --kgc:var(--kc-red); }
.kgf.in, .kgf.out { background:color-mix(in srgb, var(--kgc) 12%, transparent); border-color:color-mix(in srgb, var(--kgc) 45%, transparent); }
.kgf .kgl, .kgf .kgl ha-icon { color:var(--kgc, var(--secondary-text-color)); font-weight:600; }
.kgf .iconbtn { background:var(--kgc, var(--pc)); color:#fff; border-radius:10px; align-items:center; gap:3px; line-height:1; padding:8px 10px; font-size:.85em; font-weight:600; }
.kg.ghost .kgf { background:color-mix(in srgb, var(--kgc) 6%, transparent); }
.kg.running .kgf.in { border-width:2px; }
@media (max-width:420px) { .kg { gap:6px; } .kgf { padding:5px 4px 5px 8px; } .kgf input[type=time] { font-size:1.1em; } .kgf .iconbtn { padding:6px; } .kgf .iconbtn .lbl { display:none; } }
.zr.sub { font-size:.8em; color:var(--secondary-text-color); padding-top:0; }
.wizbox.payslip { border-color:#43a047; }
.statsel { font-size:1em; padding:6px 10px; border-radius:12px; border:1px solid var(--divider-color, rgba(127,127,127,.3)); background:var(--card-background-color, transparent); color:var(--primary-text-color); }
.chart { margin:4px 2px 8px; }
.chart svg { width:100%; height:150px; display:block; }
.chart .zero { stroke:var(--divider-color, rgba(127,127,127,.4)); stroke-width:1; stroke-dasharray:4 4; vector-effect:non-scaling-stroke; }
.chart .line { fill:none; stroke:#43a047; stroke-width:2.5; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
.chart .area { fill:color-mix(in srgb, #43a047 14%, transparent); stroke:none; }
.chart .dot { fill:#43a047; }
.vbars { display:flex; align-items:flex-end; gap:3px; height:150px; margin:4px 2px 4px; overflow-x:auto; }
.vb { flex:1 0 18px; display:flex; flex-direction:column; align-items:center; height:100%; min-width:18px; }
.vb small { font-size:.62em; color:var(--secondary-text-color); margin-top:2px; white-space:nowrap; }
.vbt { position:relative; flex:1; width:100%; }
.vbf { position:absolute; bottom:0; left:12%; right:12%; background:#1e88e5; border-radius:6px 6px 2px 2px; }
.vbf.under { background:#fb8c00; }
.vbs { position:absolute; left:0; right:0; height:2px; background:var(--primary-text-color); opacity:.55; }
.hbars { display:flex; flex-direction:column; gap:6px; margin:4px 2px 8px; }
.hbar { display:grid; grid-template-columns:44px 1fr auto; align-items:center; gap:8px; font-size:.9em; }
.hbar.sel { font-weight:700; }
.hl { color:var(--secondary-text-color); font-variant-numeric:tabular-nums; }
.ht { position:relative; height:12px; border-radius:6px; background:var(--secondary-background-color, rgba(127,127,127,.1)); overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; }
.ht.two { height:16px; gap:2px; background:transparent; }
.hf { display:block; height:100%; background:#fb8c00; border-radius:6px; }
.ht.two .hf { height:7px; }
.hf.u { background:#00897b; } .hf.k { background:#e53935; }
.hv { font-variant-numeric:tabular-nums; white-space:nowrap; }
.hv small { color:var(--secondary-text-color); }
.recs { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:6px; margin:4px 2px 10px; }
.rec { display:flex; gap:8px; align-items:center; background:var(--secondary-background-color, rgba(127,127,127,.06)); border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:14px; padding:8px 10px; min-width:0; }
.rec .n { display:flex; flex-direction:column; min-width:0; }
.rec small { font-size:.72em; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rec b { font-variant-numeric:tabular-nums; }
.stamp { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 2px 10px; }
.stamp .btn.main { flex:1 1 180px; min-height:48px; font-size:1.05em; justify-content:center; }
.stamp .since { flex:1 1 100%; font-size:.85em; color:var(--secondary-text-color); }
.dayrow { display:flex; align-items:center; gap:10px; padding:6px 6px; border-radius:12px; border-left:4px solid var(--cc, transparent); cursor:pointer; }
.dayrow:hover { background:color-mix(in srgb, var(--pc) 6%, transparent); }
.dayrow .wd { width:44px; flex:none; font-variant-numeric:tabular-nums; }
.dayrow .wd b { display:block; font-weight:600; }
.dayrow .wd small { color:var(--secondary-text-color); font-size:.78em; }
.dayrow.we { opacity:.55; }
.dayrow.today { background:color-mix(in srgb, var(--pc) 10%, transparent); }
.kd { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; flex:none; border-radius:50%; background:color-mix(in srgb, var(--kc, #999) 16%, transparent); color:var(--kc, #999); }
.kd ha-icon { --mdc-icon-size:18px; }
.dayrow .hrs { font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.dayrow.empty-day .n b { color:var(--secondary-text-color); font-weight:400; }
.zettel { margin:12px 2px 4px; border:1px solid var(--divider-color, rgba(127,127,127,.25)); border-radius:12px; overflow:hidden; }
.zettel .zr { display:flex; justify-content:space-between; gap:10px; padding:7px 12px; border-top:1px solid var(--divider-color, rgba(127,127,127,.15)); font-variant-numeric:tabular-nums; }
.zettel .zr:first-child { border-top:0; }
.zettel .zr > span:first-child { color:var(--secondary-text-color); display:flex; align-items:center; gap:6px; }
.zettel .zr.tot { font-weight:700; background:color-mix(in srgb, var(--hc, var(--kc-green)) 10%, transparent); }
.zettel .zr.tot > span:last-child { color:var(--hc, var(--kc-green)); }
.vpos { color:var(--kc-green); } .vneg { color:var(--kc-red); }
.dayrow.future { opacity:.6; }
.ytab { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; font-size:.92em; }
.ytab th { text-align:right; font-weight:600; font-size:.78em; color:var(--secondary-text-color); padding:6px 4px; border-bottom:1px solid var(--divider-color, rgba(127,127,127,.25)); }
.ytab th:first-child, .ytab td:first-child { text-align:left; }
.ytab td { text-align:right; padding:7px 4px; border-bottom:1px solid var(--divider-color, rgba(127,127,127,.12)); white-space:nowrap; }
.ytab tr.click { cursor:pointer; } .ytab tr.click:hover td { background:color-mix(in srgb, var(--pc) 6%, transparent); }
.ytab tr.cur td { font-weight:600; } .ytab tr.gap td { opacity:.45; }
.ytab tfoot td { font-weight:700; border-bottom:0; }
.kinds { display:flex; flex-wrap:wrap; gap:6px; margin:2px 0 10px; }
.kinds button { border:1.5px solid color-mix(in srgb, var(--kc) 55%, transparent); background:none; border-radius:999px; padding:6px 12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.kinds button ha-icon { --mdc-icon-size:18px; color:var(--kc); }
.kinds button.on { background:var(--kc); border-color:var(--kc); color:#fff; }
.kinds button.on ha-icon { color:#fff; }
.calline { display:flex; align-items:center; gap:6px; font-size:.82em; color:var(--secondary-text-color); margin:8px 4px 0; }
.calline ha-icon { --mdc-icon-size:16px; }
.calline.bad { color:var(--kc-red); }
.wizbox { border:1.5px dashed color-mix(in srgb, var(--pc) 55%, transparent); border-radius:12px; padding:10px 12px; margin:0 2px 10px; }
.wizbox ol { margin:6px 0 0; padding-left:20px; } .wizbox li { margin:4px 0; }
.planrow { display:grid; grid-template-columns:90px 1fr 1fr; gap:8px; align-items:center; padding:6px 2px; border-bottom:1px solid var(--divider-color, rgba(127,127,127,.12)); }
.planrow label { display:flex; align-items:center; gap:8px; }
`;

// ---------------------------------------------------------------- 📄 Kleiner PDF-Baukasten (aus der Einkaufsliste)
const SZ_PDF_W = { r: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], b: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] }; // Zeichenbreiten (1/1000) für die Zeichen 32–255 (WinAnsi)
const SZ_CP1252 = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
function szPdfChars(text) { // Text → WinAnsi; Emojis und Unbekanntes fallen weg (die Standard-Schrift kennt sie nicht)
  let out = "";
  for (const ch of String(text ?? "").normalize("NFC")) {
    const c = ch.codePointAt(0);
    if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) out += ch;
    else if (SZ_CP1252[c]) out += String.fromCharCode(SZ_CP1252[c]);
    else if (c === 0xff0b) out += "+";
    else if (c === 9 || c === 10 || c === 13) out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}
function szPdfWidth(t, bold, size) {
  const w = bold ? SZ_PDF_W.b : SZ_PDF_W.r;
  let n = 0;
  for (let k = 0; k < t.length; k++) n += w[t.charCodeAt(k) - 32] || 556;
  return (n * size) / 1000;
}
function szPdfWrap(t, bold, size, max) { // Wörter auf Zeilen verteilen; zu lange Wörter werden hart getrennt
  const lines = [];
  let cur = "";
  for (let word of t.split(" ")) {
    while (szPdfWidth(word, bold, size) > max && word.length > 1) {
      let k = word.length - 1;
      while (k > 1 && szPdfWidth(word.slice(0, k), bold, size) > max) k--;
      if (cur) { lines.push(cur); cur = ""; }
      lines.push(word.slice(0, k));
      word = word.slice(k);
    }
    const next = cur ? `${cur} ${word}` : word;
    if (cur && szPdfWidth(next, bold, size) > max) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
// 📄 Stundenzettel als PDF (Uint8Array) – A4, Helvetica, ohne fremde Bibliothek (Baukasten wie bei Einkaufsliste und Kegelclub)
// m = { title, sub, big, cols: [{ t, x, w, right }], rows: [{ cells: [], gray, bold }], sums: [[Text, Wert]] }
function szTablePdf(m) {
  const PW = 595.28, PH = 841.89, M = 36, BOTTOM = M + 22;
  const f = (n) => (Math.round(n * 100) / 100).toString();
  const str = (x) => `(${x.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\x80-\xff]/g, (c) => `\\${c.charCodeAt(0).toString(8).padStart(3, "0")}`)})`;
  const pages = [];
  let ops = null;
  const newPage = () => { ops = []; pages.push(ops); };
  const col = (rgb) => rgb.map(f).join(" ");
  const text = (x, y, s, size, bold = false, rgb = [0.13, 0.13, 0.13]) => { if (s) ops.push(`BT /${bold ? "F2" : "F1"} ${f(size)} Tf ${col(rgb)} rg ${f(x)} ${f(y)} Td ${str(s)} Tj ET`); };
  const right = (x, y, s, size, bold, rgb) => text(x - szPdfWidth(s, bold, size), y, s, size, bold, rgb);
  const fill = (x, y, w, h, rgb) => ops.push(`${col(rgb)} rg ${f(x)} ${f(y)} ${f(w)} ${f(h)} re f`);
  const line = (x1, y1, x2, y2, rgb = [0.82, 0.82, 0.82], lw = 0.6) => ops.push(`${f(lw)} w ${col(rgb)} RG ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);
  const gray = [0.45, 0.45, 0.45], accent = [0.118, 0.533, 0.898];
  newPage();
  let y = PH - M;
  text(M, y - 20, szPdfChars(m.title), 20, true);
  if (m.big) right(PW - M, y - 22, szPdfChars(m.big), 20, true, accent);
  y -= 38;
  if (m.sub) for (const l of szPdfWrap(szPdfChars(m.sub), false, 10, PW - 2 * M - 140)) { text(M, y, l, 10, false, gray); y -= 13.5; }
  y -= 2; fill(M, y, PW - 2 * M, 3, accent); y -= 18;
  const X = (c) => M + c.x;
  const head = () => {
    for (const c of m.cols) (c.right ? right : text)(c.right ? X(c) + c.w : X(c), y, szPdfChars(c.t), 8.5, true, gray);
    y -= 6; line(M, y, PW - M, y, [0.6, 0.6, 0.6], 0.8); y -= 12;
  };
  head();
  for (const r of m.rows) {
    const cells = r.cells.map((v, k) => szPdfWrap(szPdfChars(v), !!r.bold && k === 0, 9, m.cols[k].w));
    const h = Math.max(...cells.map((c) => c.length)) * 11 + 4;
    if (y - h < BOTTOM) { newPage(); y = PH - M - 10; head(); }
    const rgb = r.gray ? gray : [0.13, 0.13, 0.13];
    cells.forEach((ls, k) => { const c = m.cols[k]; ls.forEach((l, j) => (c.right ? right(X(c) + c.w, y - j * 11, l, 9, !!r.bold, rgb) : text(X(c), y - j * 11, l, 9, !!r.bold && k === 0, rgb))); });
    y -= h; line(M, y + 7, PW - M, y + 7); y -= 2;
  }
  y -= 10;
  if (y - 15 * m.sums.length < BOTTOM) { newPage(); y = PH - M - 10; }
  for (const [label, val, strong] of m.sums) { text(PW - M - 260, y, szPdfChars(label), 10.5, !!strong); right(PW - M, y, szPdfChars(val), 10.5, true, strong ? accent : [0.13, 0.13, 0.13]); y -= 15; }
  pages.forEach((pg, k) => {
    ops = pg;
    const ft = szPdfChars(`Erstellt mit Stundenzettel${pages.length > 1 ? ` · ${k + 1}/${pages.length}` : ""}`);
    text(PW / 2 - szPdfWidth(ft, false, 8) / 2, M - 4, ft, 8, false, [0.55, 0.55, 0.55]);
  });
  const objs = [];
  const add = (o) => { objs.push(o); return objs.length; };
  const cat = add(""), pagesId = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids = [];
  for (const pg of pages) {
    const body = pg.join("\n");
    const cs = add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(PW)} ${f(PH)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`));
  }
  objs[cat - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${str(szPdfChars(m.title))} /Producer (Stundenzettel) >>`);
  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offs = [];
  objs.forEach((o, k) => { offs.push(out.length); out += `${k + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let k = 0; k < out.length; k++) bytes[k] = out.charCodeAt(k) & 255;
  return bytes;
}

class StundenzettelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._view = "heute";
    const now = new Date();
    this._month = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    this._year = now.getFullYear();
    this._open = null;      // 📝 welcher Tag gerade bearbeitet wird (ISO-Datum)
    this._sheet = null;     // ⚙️ welche Einstellungs-Seite offen ist
    this._share = null;     // 📤 Drucken & Teilen: { kind: "month" | "year", key }
    this._setOpen = null;
    this._pad = null;       // 🔢 PIN-Tastenfeld
    this._server = null;    // 🏠 Stand von Home Assistant
    this._queue = store.get(QKEY, []); // 📮 Postausgang
    this._qv = 0;
    // 👆 Lange auf ein Symbol drücken = kurz sagen, was es macht (wie bei der Einkaufsliste)
    const root = this.shadowRoot;
    let lpTimer = null, lpFired = false;
    const lpBtn = (t) => { const b = t?.closest?.("button"); return b && !(b.innerText || "").trim() && (b.getAttribute("title") || b.getAttribute("aria-label")) ? b : null; };
    root.addEventListener("pointerdown", (e) => {
      const b = lpBtn(e.target);
      clearTimeout(lpTimer); lpFired = false;
      if (!b) return;
      const text = b.getAttribute("title") || b.getAttribute("aria-label");
      lpTimer = setTimeout(() => { lpFired = true; try { navigator.vibrate?.(20); } catch (_) { /* egal */ } this._toast(text); }, 550);
    }, true);
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) root.addEventListener(ev, () => clearTimeout(lpTimer), true);
    root.addEventListener("click", (e) => { if (lpFired) { lpFired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    root.addEventListener("contextmenu", (e) => { if (lpBtn(e.target)) e.preventDefault(); }, true);
    // ⌨️ PIN auch mit der Tastatur
    this._onKey = (e) => {
      if (!this._padShown || !this.isConnected || !this._pad) return;
      if (/^\d$/.test(e.key)) this._padPress(e.key);
      else if (e.key === "Backspace") this._padPress("⌫");
      else if (e.key === "Enter" || e.code === "NumpadEnter") this._padPress("✔");
      else if (e.key === "Escape") this.shadowRoot.querySelector('[data-a="back"]')?.click();
      else return;
      e.preventDefault(); e.stopPropagation();
    };
  }
  static getStubConfig() { return { title: "Stundenzettel" }; }
  static getConfigElement() { return document.createElement("stundenzettel-card-editor"); }
  getCardSize() { return 8; }
  setConfig(config) {
    this._config = { title: "Stundenzettel", ...config };
    if (this._hass) { this._useLang(); this._force = true; this._render(); }
  }
  _useLang() {
    const lang = szWantLang(this._hass, this._config);
    if (lang !== SZ_LANG) { SZ_LANG = lang; for (const c of SZ_CARDS) if (c !== this) { c._force = true; c._render(); } }
    if (SZ_LANG !== "de") szLoadDict();
  }
  get _app() { return !!window.__szOfflineApp; }
  set hass(hass) {
    const first = !this._hass;
    const was = this._hass?.connected;
    this._hass = hass;
    this._useLang();
    if (first) {
      if (this._app) this._server = store.get(DKEY, null);
      this._subscribe(); this._render();
    } else if (was !== hass.connected) this._render();
    if (hass.connected !== false) this._flush();
  }
  connectedCallback() { if (this._hass && !this._unsub) this._subscribe(); SZ_CARDS.add(this); document.addEventListener("keydown", this._onKey, true); }
  disconnectedCallback() { this._unsub?.then((u) => u?.()).catch(() => {}); this._unsub = null; SZ_CARDS.delete(this); clearInterval(this._clock); document.removeEventListener("keydown", this._onKey, true); }
  _subscribe() {
    if (this._unsub || !this._hass?.connection) return;
    this._unsub = this._hass.connection.subscribeMessage((data) => {
      this._server = data; this._err = null;
      if (this._app) store.put(DKEY, data);
      this._render();
    }, { type: "stundenzettel/subscribe" })
      .catch((err) => { this._err = err?.message || String(err); this._unsub = null; this._render(); });
  }
  // 👀 Was man sieht = Stand von Home Assistant + alles, was noch im Postausgang liegt
  get _d() {
    if (!this._server) return null;
    if (this._dc && this._dc.s === this._server && this._dc.q === this._qv) return this._dc.d;
    const d = JSON.parse(JSON.stringify(this._server));
    d.days = d.days || {}; d.settings = d.settings || {};
    for (const op of this._queue) { try { szApplyLocal(d, op); } catch (_) { /* HA sagt dann Bescheid */ } }
    const t = d.today || "";
    if (t) { const [y, m, dd] = t.split("-").map(Number); const g = new Date(y, m - 1, dd - 1); const yi = isoOf(g.getFullYear(), g.getMonth() + 1, g.getDate()); d._missing = !d.days[yi] && !!(d.settings.plan || {})[String(wdOf(yi))]; }
    this._dc = { s: this._server, q: this._qv, d };
    return d;
  }
  // 📮 Jede Änderung geht erst in den Postausgang (überlebt Funklöcher), dann sofort zu Home Assistant
  async _send(...ops) {
    for (const o of ops) this._queue.push({ op_id: uid(), ts: Date.now(), ...o });
    this._qv++;
    store.put(QKEY, this._queue);
    this._render();
    this._flush();
    return true;
  }
  async _flush() {
    if (this._flushing || !this._queue.length || !this._hass || this._hass.connected === false) return;
    this._flushing = true;
    try {
      const batch = this._queue.slice(0, 100);
      const res = await this._hass.callWS({ type: "stundenzettel/apply", ops: batch });
      const done = new Set(batch.map((o) => o.op_id));
      const bad = (res?.results || []).filter((r) => !r.ok);
      this._queue = this._queue.filter((o) => !done.has(o.op_id)); this._qv++;
      store.put(QKEY, this._queue);
      if (bad.length) this._toast("⚠️ " + bad.map((b) => b.error).join(", "));
      this._render();
      if (this._queue.length) setTimeout(() => this._flush(), 50);
    } catch (_) {
      clearTimeout(this._retry);
      this._retry = setTimeout(() => this._flush(), 15000);
    } finally { this._flushing = false; }
  }
  _toast(message) { this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: szT(message) }, bubbles: true, composed: true })); }
  _set(key, value) { return this._send({ type: "set", key, value }); }
  // ⏱️ Kurzbefehl aus der Offline-App (lange aufs App-Symbol drücken)
  stundenzettelShortcut(what) {
    const d = this._d;
    if (!d) { setTimeout(() => this.stundenzettelShortcut(what), 500); return; }
    if (what === "in" && !d.stamp) { this._send({ type: "stamp_in", ts: Date.now() }); this._toast("⏱️ Eingestempelt – schönen Arbeitstag!"); }
    else if (what === "out" && d.stamp) { this._send({ type: "stamp_out", ts: Date.now() }); this._toast("🏁 Ausgestempelt – Feierabend!"); }
    else this._toast(what === "in" ? "Du bist schon eingestempelt 👍" : "Du warst gar nicht eingestempelt 🤔");
  }

  // ---------------------------------------------------------------- 🧮 Kleine Helfer
  get _st() { return this._d?.settings || {}; }
  _rowOf(key) { return (this._d?.months || []).find((m) => m.month === key); }
  _plan(iso) { return (this._st.plan || {})[String(wdOf(iso))] || null; }
  _greet() {
    const h = new Date().getHours();
    const g = h < 11 ? "☀️ Guten Morgen" : h < 18 ? "💪 Moin" : "🌙 Feierabend";
    const name = String(this._hass?.user?.name || "").split(" ")[0];
    return name ? `${g}, ${esc(name)}` : g;
  }
  _lb(t) { return this._st.labels ? `<span class="lbl">${esc(t)}</span>` : ""; }
  _dayText(e) {
    if (!e) return "";
    if (e.kind === "work") return `${esc(e.start || "?")}–${esc(e.end || "?")}${e.pause ? ` · ${h2(e.pause)} Pause` : ""}`;
    if (e.kind === "pauschal") return `${eur(e.amount)}${e.start ? ` · ${esc(e.start)}–${esc(e.end || "?")}` : ""}`;
    return KIND[e.kind]?.[1] || e.kind;
  }

  // ---------------------------------------------------------------- 🖼️ Zeichnen
  _render() {
    const a = this.shadowRoot.activeElement;
    if (a && ((a.tagName === "INPUT" && !["checkbox", "radio", "button"].includes(a.type)) || a.tagName === "TEXTAREA" || a.tagName === "SELECT") && !this._force) { this._pending = true; return; }
    this._force = false;
    const d = this._d;
    this.classList.toggle("labels", !!this._st.labels);
    this.classList.toggle("calm", !!store.get(CALMKEY, false));
    const online = this._hass?.connected !== false;
    const q = this._queue.length;
    const pill = q ? `<button class="pill wait" data-a="tab" data-v="heute">⏳ ${q} ${q === 1 ? "wartet" : "warten"}</button>`
      : online ? `<button class="pill" data-a="tab" data-v="heute">🟢 verbunden</button>`
      : `<button class="pill off" data-a="tab" data-v="heute">${this._app ? "📴 offline – letzter Stand" : "🔴 keine Verbindung"}</button>`;
    const top = `<div class="topbar">${pill}<span class="grow">${this._greet()}</span>${d ? `<button class="iconbtn ${this._view === "set" ? "on" : ""}" data-a="tab" data-v="set" title="Einstellungen">${ic("cog-outline")}<span class="lbl">Einstellungen</span></button>` : ""}<span class="ver" translate="no">v${SZ_VERSION}</span></div>`;
    // 🔒 PIN: sperrt ⚙️ – oder (Schalter „Ganze Karte sperren“) alles
    const appLock = this._app && !!window.__szAppLock?.on?.();
    const lockAll = !!(d && d.pin && this._st.lock_all && !appLock);
    const locked = !!(d && d.pin && !pinOpen() && (lockAll || this._view === "set"));
    this._lockAll = lockAll && locked;
    if (lockAll && !locked) { clearTimeout(this._relockT); this._relockT = setTimeout(() => { this._force = true; this._render(); }, Math.max(1000, PIN_LOCK.until - Date.now() + 500)); }
    if (locked && this._pad?.step !== "unlock") this._pad = { purpose: "unlock", step: "unlock", buf: "", back: "heute" };
    if (!locked && this._pad?.step === "unlock") this._pad = null;
    const vw = this._st.view || {};
    if ((this._view === "monat" && vw.monat === false) || (this._view === "jahr" && vw.jahr === false) || (this._view === "stat" && vw.stat === false)) this._view = "heute";
    let body;
    if (!d) {
      body = this._err ? `<div class="empty">⚠️ ${esc(this._err)}</div>` : `<div class="empty">⏳ Lade …</div>`;
    } else {
      const page = this._pad ? this._padPage() : this._share ? this._sharePage() : this._view === "guide" ? { icon: "book-open-variant", color: "#3949ab", title: "Anleitung", html: this._guideView() }
        : this._view === "set" && this._sheet ? this._sheetPage() : null;
      this._padShown = !!this._pad;
      const deeper = this._pad ? this._pad.back === "sheet" : this._view === "set" && !!this._sheet;
      const showBack = !this._lockAll && (this._view === "set" || this._view === "guide" || !!this._pad || !!this._share);
      const stamp = d.stamp;
      const badge = stamp ? `<span class="badge" data-a="tab" data-v="heute" title="Eingestempelt" style="display:inline-flex;align-items:center;gap:4px">${ic("timer-outline")}seit ${esc(stamp.in)}</span>` : "";
      const title = this._config?.title && this._config.title !== "Stundenzettel" ? esc(this._config.title) : "";
      const isLocked = d.pin && !pinOpen();
      const tools = this._lockAll ? "" : `<button class="iconbtn" data-a="lock" title="${appLock ? "App jetzt sperren" : isLocked ? "Gesperrt – PIN nötig für ⚙️" : d.pin ? "Jetzt sperren" : "Sperren (erst PIN festlegen)"}">${ic(isLocked && !appLock ? "lock-outline" : "lock-open-variant-outline")}${this._lb(isLocked && !appLock ? "Gesperrt" : "Sperren")}</button>
        ${showBack ? `<button class="iconbtn" data-a="back" title="${deeper ? "Zurück" : "Schließen"}">${ic(deeper ? "arrow-left" : "close")}${this._lb(deeper ? "Zurück" : "Schließen")}</button>` : ""}`;
      const logo = this._st.mascot ? `<span class="logo mascotbox" data-a="tab" data-v="heute" title="Zurück zu Heute">${szMascotSvg(szMascotMood(d), szMascotDeco())}</span>` : `<span class="logo" data-a="tab" data-v="heute" title="Zurück zu Heute">${ic("clipboard-text-clock-outline")}</span>`;
      body = `<div class="head"><div class="title">${logo}${title ? `<span data-noicon>${title}</span>` : ""}${this._lockAll ? "" : badge}</div>${tools}</div>`;
      body += this._updHtml(d);
      if (!page && this._view !== "set" && !this._share) {
        const tabs = [["heute", "calendar-today", "Heute"], ...(vw.monat === false ? [] : [["monat", "calendar-month-outline", "Monat"]]), ...(vw.jahr === false ? [] : [["jahr", "chart-bar", "Jahr"]]), ...(vw.stat === false ? [] : [["stat", "chart-line", "Statistik"]])];
        if (tabs.length > 1) body += `<div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${this._view === k ? "active" : ""}" data-a="tab" data-v="${k}">${ic(i)}${l}</button>`).join("")}</div>`;
      }
      if (!locked) pinTouch();
      body += page ? `<div class="sec pagehost"><div class="sechead"><span class="ic" style="--ic:${page.color}">${ic(page.icon)}</span><h3>${page.title}</h3></div><div class="pagebody">${page.html}</div></div>`
        : this._view === "set" ? this._setView() : this._view === "monat" ? this._monthView() : this._view === "jahr" ? this._yearView() : this._view === "stat" ? this._statView() : this._todayView();
    }
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${top}<ha-card>${body}</ha-card>
      ${this._lockAll ? "" : `<div class="foot"><button class="${this._view === "guide" ? "on" : ""}" data-a="tab" data-v="${this._view === "guide" ? "heute" : "guide"}">${ic("book-open-page-variant-outline")}<span>Anleitung</span></button></div>`}
      ${this._undo ? `<div class="undobar" role="status"><span class="ut">${esc(this._undo.label)}</span><button class="ub" data-a="undo">↩️ Rückgängig</button></div>` : ""}`;
    if (SZ_LANG !== "de" && SZ_DICT) {
      try { szCollectUser(d); if (this._config?.title && this._config.title !== "Stundenzettel") SZ_USER.add(szNorm(this._config.title)); szTranslateTree(this.shadowRoot); } catch (_) { /* dann eben Deutsch */ }
    }
    try { szIconizeTree(this.shadowRoot); } catch (_) { /* Symbole sind nur Deko */ }
    this._bind();
    clearInterval(this._clock);
    if (d?.stamp) this._clock = setInterval(() => { this._force = this._view === "heute" && !this._open; if (this._force) this._render(); }, 60000);
  }
  // ↩️ Zurück-Taste (Handy / Seitenleiste)
  stundenzettelIsRoot() { return !this._pad && !this._open && !["set", "guide"].includes(this._view); }
  stundenzettelBack() {
    if (this.stundenzettelIsRoot()) return false;
    this._act({ dataset: { a: this._open ? "close" : "back" } });
    return true;
  }
  _updHtml(d) {
    if (!d.version || d.version === SZ_VERSION) return "";
    if (szVerCmp(d.version, SZ_VERSION) <= 0) return ""; // Karte ist neuer als HA – das regelt sich von selbst
    return `<div class="updbar">🔄 <b>Neue Version ${esc(d.version)} ist da (hier läuft noch ${SZ_VERSION}).</b><button class="btn small" data-a="reload">Neu laden</button></div>`;
  }

  // ---------------------------------------------------------------- 📅 Heute
  _todayView() {
    const d = this._d, s = d.summary || {}, st = this._st;
    const iso = d.today;
    const cur = this._rowOf(iso.slice(0, 7));
    const bal = Number(s.balance || 0);
    let h = "";
    if (!st.calendar && !Object.keys(d.days || {}).length) {
      h += `<div class="wizbox"><b>🚀 Los geht's – in 2 Minuten eingerichtet</b><ol class="small" style="margin-left:0">
        <li><b>Kalender wählen</b>, in dem dein Termin „Arbeiten“ steht → <button class="btn small" data-a="sheet" data-v="cal">📅 Kalender</button></li>
        <li><b>Bezahlte Stunden</b> pro Monat eintragen (Standard 175) → <button class="btn small" data-a="sheet" data-v="work">💶 Arbeitszeit</button></li>
        <li>Alten Zettel? <b>Einfach als Text einfügen</b> → <button class="btn small" data-a="sheet" data-v="imp">📥 Import</button></li></ol>
        <p class="small">Du kannst auch sofort loslegen: unten auf <b>Kommen</b> drücken oder den heutigen Tag eintragen. 💪</p></div>`;
    }
    h += this._payslipHint(cur);
    h += this._todayHero(d, iso);
    h += this._kgHtml(d, iso);
    h += `<div class="ghead"><span class="gdot" style="--gc:#1e88e5">${ic("calendar-today")}</span><span>Eintrag für heute</span></div>`;
    h += this._dayRows([iso], true);
    if (!d.days[iso] && this._open !== iso) {
      const p = this._plan(iso);
      h += `<div class="quick">${p ? `<button class="chip" data-a="quick" data-v="plan" data-d="${iso}">📋 Normaler Tag ${esc(p[0])}–${esc(p[1])}</button>` : ""}${["urlaub", "krank", "feiertag", "frei"].map((k) => `<button class="chip" data-a="quick" data-v="${k}" data-d="${iso}">${ic(KIND[k][0])} ${KIND[k][1]}</button>`).join("")}<button class="chip" data-a="open" data-d="${iso}">✍️ Andere Zeit</button></div>`;
    }
    const y = Number(iso.slice(0, 4));
    const yesterday = (() => { const t = new Date(y, Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) - 1); return isoOf(t.getFullYear(), t.getMonth() + 1, t.getDate()); })();
    if (!d.days[yesterday] && this._plan(yesterday)) {
      h += `<div class="ghead"><span class="gdot" style="--gc:#fb8c00">${ic("calendar-alert")}</span><span>Gestern fehlt noch</span></div>` + this._dayRows([yesterday], true);
    }
    const vw = st.view || {};
    const mon = vw.monat === false ? "" : `data-a="tab" data-v="monat"`, jahr = vw.jahr === false ? "" : `data-a="tab" data-v="jahr"`;
    h += `<div class="tiles two" style="margin-top:12px">
      <div class="tile ${mon ? "click" : ""}" ${mon}><b>${h2(cur?.hours || 0)} <small>/ ${h2(cur?.paid ?? st.paid_hours)}</small></b><span>${ic("clock-outline")}Std. diesen Monat</span></div>
      <div class="tile ${jahr ? "click" : ""}" ${jahr}><b>${this._mv(`<span class="${bal < 0 ? "vneg" : "vpos"}">${hs(bal)}</span>`, "bal")}</b><span>${ic("scale-balance")}Überstunden-Konto</span></div>
      <div class="tile ${jahr ? "click" : ""}" ${jahr}><b>${s.vacation_left ?? 0}</b><span>${ic("beach")}Resturlaub ${y}</span></div>
      <div class="tile ${jahr ? "click" : ""}" ${jahr}><b>${s.sick_days ?? 0}</b><span>${ic("emoticon-sick-outline")}Kranktage ${y}</span></div></div>`;
    h += this._calLine();
    return h;
  }
  // ⏱️ Zwei Felder „Kommen“ und „Gehen“ – antippen, Uhrzeit ändern, fertig (⏱️ = jetzt)
  _kgHtml(d, iso) {
    const e = d.days[iso];
    const stamp = d.stamp && d.stamp.date === iso ? d.stamp : null;
    if (e && e.kind !== "work" && !stamp) return "";
    const p = this._plan(iso) || ["", ""];
    const ghost = !e && !stamp;
    const a = stamp ? stamp.in : e?.start || p[0] || "";
    const b = stamp ? "" : e?.end || p[1] || "";
    const f = (k, icon, label, val, title, ro) => `<div class="kgf ${k === "start" ? "in" : "out"}"><span class="kgl">${ic(icon)}${label}</span><input type="time" step="300" data-a="kg" data-v="${k}" value="${esc(val)}" aria-label="${label}" ${ro ? "readonly" : ""}><button class="iconbtn" data-a="kgnow" data-v="${k}" title="${title}">${ic("timer-outline")}<span class="lbl">jetzt</span></button></div>`;
    return `<div class="kg ${ghost ? "ghost" : ""} ${stamp ? "running" : ""}">${f("start", "login-variant", "Kommen", a, stamp ? "Läuft schon" : "Kommen jetzt – einstempeln", !!stamp)}${f("end", "logout-variant", "Gehen", b, stamp ? "Gehen jetzt – ausstempeln" : "Gehen jetzt", false)}</div>
      ${stamp ? `<div class="stamp"><span class="since">⏱️ Eingestempelt seit ${esc(stamp.in)} – ⏱️ bei „Gehen“ stempelt aus.</span><button class="btn small" data-a="cancelstamp" title="Stempeln abbrechen (nichts eintragen)">${ic("close")}Abbrechen</button></div>`
        : ghost ? `<p class="small kgh">Vorschlag aus deinem normalen Tag – ändere eine Uhrzeit oder tippe ⏱️, dann ist der Tag eingetragen.</p>` : ""}`;
  }
  // 💶 Am Monatsanfang: „Lohnabrechnung da? Ü.-Alt eintragen“
  _payslipHint(cur) {
    const d = this._d, st = this._st;
    if (st.payslip_hint === false || !cur || cur.alt || Number(d.today.slice(8, 10)) > 20) return "";
    if (store.get("sz_payslip_no", "") === cur.month) return "";
    const [y, m] = cur.month.split("-").map(Number);
    const prev = monthName(`${m === 1 ? y - 1 : y}-${pad2(m === 1 ? 12 : m - 1)}`);
    return `<div class="wizbox payslip"><b>💶 Lohnabrechnung für ${esc(prev)} da?</b><p class="small" style="margin:4px 0 8px">Trag den Überstunden-Stand vom Chef als <b>Ü.-Alt</b> für ${esc(monthName(cur.month))} ein – dann rechnet die Karte genau mit seiner Zahl weiter.</p>
      <div class="btnrow"><button class="btn small main" data-a="payslip" data-v="${cur.month}">${ic("cash-check")}Jetzt eintragen</button><button class="btn small" data-a="payslipno" data-v="${cur.month}">${ic("close")}Später</button></div></div>`;
  }
  // ⏱️ Ganz oben: die Stunden von heute (beim Stempeln läuft die Uhr mit)
  _todayHero(d, iso) {
    const st = this._st, e = d.days[iso];
    let big = 0, sub = "", run = false;
    if (d.stamp && d.stamp.date === iso) {
      const now = new Date();
      let a = szMin(d.stamp.in);
      if (e?.kind === "work" && e.source === "stamp" && e.start) a = Math.min(a, szMin(e.start));
      const b = Math.max(a, now.getHours() * 60 + now.getMinutes());
      big = szDayHours({ kind: "work", start: szHhmm(a), end: szHhmm(b) }, st).hours;
      sub = `Eingestempelt seit ${szHhmm(a)} · läuft (Pause schon abgezogen)`;
      run = true;
    } else if (e) {
      big = e.kind === "pauschal" ? 0 : Number(e.hours || 0);
      sub = e.kind === "work" ? `${esc(e.start || "?")}–${esc(e.end || "?")}${e.pause ? ` · ${h2(e.pause)} Pause` : ""}` : e.kind === "pauschal" ? `${KIND.pauschal[1]} ${eur(e.amount)}` : KIND[e.kind]?.[1] || "";
      if (e.provisional) sub += " · ⏳ läuft noch";
    } else {
      const p = this._plan(iso);
      sub = p ? `Noch nichts eingetragen · normal wären ${esc(p[0])}–${esc(p[1])}` : "Heute ist frei 🛋️";
    }
    const color = run ? "#43a047" : e ? (KIND[e.kind]?.[2] || "#1e88e5") : "#1e88e5";
    return `<div class="hero ${run ? "running" : ""}" style="--hc:${color}"><div class="lbl">⏱️ Heute, ${WD_LONG[wdOf(iso)]} ${dm(iso)}</div><div class="big">${h2(big)} Std.</div><div class="lbl">${sub}</div></div>`;
  }
  // 🙈 Verschleiern (⚙️ → Ansicht): Überstunden erst nach Antippen zeigen
  _mv(html, key) {
    if (!this._st.veil) return html;
    const on = this._peek?.key === key && this._peek.until > Date.now();
    return `<span class="veil ${on ? "peek" : ""}" data-a="peek" data-v="${esc(key)}" title="Antippen = 4 Sekunden zeigen">${html}</span>`;
  }
  _calLine() {
    const st = this._st, c = this._d.cal || {};
    if (!st.calendar) return `<div class="calline">${ic("calendar-question")}<span>Kein Kalender verbunden – <a href="#" data-a="sheet" data-v="cal">jetzt einrichten</a></span></div>`;
    if (c.ok === false) return `<div class="calline bad">${ic("calendar-alert")}<span>${esc(c.error || "Kalender-Problem")}</span></div>`;
    const t = c.last ? new Date(c.last).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "noch nicht";
    return `<div class="calline">${ic("calendar-sync-outline")}<span>${esc(st.calendar)} · Termin „${esc(st.event_title)}“ · abgeglichen ${t}${st.cal_write ? " · schreibt zurück" : ""}</span><button class="iconbtn" data-a="sync" title="Jetzt abgleichen">${ic("refresh")}</button></div>`;
  }

  // ---------------------------------------------------------------- 🗓️ Ein Tag (Zeile + Bearbeiten)
  _dayRows(list, showEmpty = false) {
    const d = this._d;
    return list.map((iso) => {
      if (this._open === iso) return this._dayForm(iso);
      const e = d.days[iso];
      const wd = wdOf(iso);
      const we = !e && !this._plan(iso);
      const boss = this._bossMark(iso, e);
      if (!e && !showEmpty && we) return `<div class="dayrow we empty-day" data-a="open" data-d="${iso}"><span class="wd"><b>${WD[wd]}</b><small>${dm(iso)}</small></span><div class="n"><b>Wochenende</b></div>${boss ? `<span class="hrs">${boss}</span>` : ""}</div>`;
      if (!e) return `<div class="dayrow empty-day ${iso === d.today ? "today" : ""} ${iso > d.today ? "future" : ""}" data-a="open" data-d="${iso}"><span class="wd"><b>${WD[wd]}</b><small>${dm(iso)}</small></span><div class="n"><b>${iso > d.today ? "–" : "noch nichts eingetragen"}</b></div>${boss ? `<span class="hrs">${boss}</span>` : ""}<span class="iconbtn">${ic("plus")}</span></div>`;
      const [icon, name, color] = KIND[e.kind] || KIND.work;
      const meta = [e.kind === "work" ? name : "", e.note ? esc(e.note.split("\n")[0]) : "", e.provisional ? "⏳ läuft noch" : "", e.waiting ? "📮 wartet aufs Senden" : "", SOURCE[e.source] || ""].filter(Boolean);
      const hrs = e.kind === "pauschal" ? eur(e.amount) : e.kind === "frei" ? "0" : h2(e.hours);
      return `<div class="dayrow ${iso === d.today ? "today" : ""}" data-a="open" data-d="${iso}" style="--cc:${color}"><span class="wd"><b>${WD[wd]}</b><small>${dm(iso)}</small></span><span class="kd" style="--kc:${color}">${ic(icon)}</span><div class="n"><b data-noicon>${this._dayText(e)}</b>${meta.length ? `<div class="meta">${meta.map((x) => `<span class="tag">${x}</span>`).join("")}</div>` : ""}</div><span class="hrs">${boss}${hrs}</span></div>`;
    }).join("");
  }
  // 📄 Zettel vom Chef: rote Zahl links neben deinen Stunden – nur wo es anders ist
  _bossMark(iso, e) {
    const b = ((this._d.months_meta || {})[iso.slice(0, 7)] || {}).boss?.days?.[iso];
    if (!b) return "";
    const tag = (t) => `<span class="boss" title="laut Zettel vom Chef">${t}</span>`;
    if (b.kind) {
      const same = e && (e.kind === b.kind || (b.kind === "feiertag_halb" && e.kind === "feiertag"));
      if (same || (!e && b.h == null)) return "";
      return tag({ krank: "Krank", feiertag: "Feiertag", feiertag_halb: "½ Feiertag", urlaub: "Urlaub" }[b.kind] || b.kind);
    }
    const mine = e && e.kind === "work" ? Number(e.hours) || 0 : null;
    if (mine != null && Math.abs(mine - b.h) < 0.005) return "";
    return tag(h2(b.h));
  }
  _bossBox(row) {
    const b = ((this._d.months_meta || {})[this._month] || {}).boss;
    if (!b) return "";
    const r = (icon, label, val, cls = "") => `<div class="zr ${cls}"><span>${ic(icon)}${label}</span><span>${val}</span></div>`;
    const n = Object.keys(b.days || {}).filter((iso) => this._bossMark(iso, this._d.days[iso])).length;
    const mine = row ? (row.now ?? row.total) : null;
    const dEnd = b.saldo_ue != null && mine != null ? mine - b.saldo_ue : null;
    const altDiff = row && b.saldo_vm != null && Math.abs(row.old - b.saldo_vm) > 0.004;
    return `<div class="ghead"><span class="gdot" style="--gc:#e53935">${ic("file-document-outline")}</span><span>Zettel vom Chef</span></div>
      <div class="zettel boss-box">
      ${b.gesamt != null ? r("sigma", "Gesamt (Chef)", `${h2(b.gesamt)} Std.`) : ""}${b.soll != null ? r("cash", "Sollzeit (Chef)", `−${h2(b.soll)} Std.`) : ""}
      ${b.saldo_vm != null ? r("history", "Saldo Vormonat (Chef)", this._mv(hs(b.saldo_vm), "bvm" + this._month)) : ""}
      ${b.saldo_ue != null ? r("scale-balance", "Saldo Übertrag (Chef)", this._mv(`${hs(b.saldo_ue)} Std.`, "bue" + this._month), "tot") : ""}
      ${dEnd != null ? `<div class="zr sub"><span><span>Karte</span>&nbsp;${this._mv(hs(mine), "bk" + this._month)}</span><span class="${Math.abs(dEnd) < 0.005 ? "" : dEnd < 0 ? "vneg" : "vpos"}">${Math.abs(dEnd) < 0.005 ? "gleich ✅" : this._mv(hs(dEnd), "bd" + this._month)}</span></div>` : ""}
      ${r("calendar-alert", "Tage mit Abweichung", n ? `<span class="boss">${n}</span>` : "keine 🎉")}</div>
      <div class="btnrow">${altDiff ? `<button class="btn small" data-a="bossalt">${ic("history")}Saldo Vormonat als Ü.-Alt übernehmen</button>` : ""}<button class="btn small" data-a="bossdel">${ic("delete-outline")}Zettel entfernen</button></div>`;
  }
  _dayForm(iso) {
    const d = this._d, st = this._st;
    const e = d.days[iso] || {};
    const p = this._plan(iso) || ["", ""];
    const kind = this._fkind || e.kind || "work";
    const start = e.start || p[0] || "", end = e.end || p[1] || "";
    const kinds = Object.entries(KIND).map(([k, [i, n, c]]) => `<button type="button" class="${kind === k ? "on" : ""}" style="--kc:${c}" data-a="fkind" data-v="${k}">${ic(i)}${n}</button>`).join("");
    let fields = "";
    if (kind === "work" || kind === "pauschal") {
      fields += `<label>Von<input type="time" name="start" value="${esc(start)}" step="300"></label><label>Bis<input type="time" name="end" value="${esc(end)}" step="300"></label>`;
    }
    if (kind === "work") fields += `<label>Pause (Std.)<input name="pause" inputmode="decimal" value="${e.kind === "work" && e.pause_set && e.source !== "calendar" ? esc(String(e.pause).replace(".", ",")) : ""}" placeholder="automatisch"></label><label>&nbsp;<span class="small" style="margin:8px 0 0">leer = nach Pausen-Regel</span></label>`;
    if (["urlaub", "krank", "feiertag"].includes(kind)) fields += `<label>Zählt Stunden<input name="hours" inputmode="decimal" value="${e.kind === kind && e.hours != null && e.source === "card" ? esc(String(e.hours).replace(".", ",")) : ""}" placeholder="${h2(st.absence_hours)}"></label><label>&nbsp;</label>`;
    if (kind === "pauschal") fields += `<label class="wide">Betrag (€) – zählt nicht zu den Stunden<input name="amount" inputmode="decimal" value="${e.amount != null ? esc(String(e.amount).replace(".", ",")) : ""}" placeholder="z. B. 40,00"></label>`;
    fields += `<label class="wide">Notiz (z. B. Baustelle)<textarea name="note" rows="2">${esc(e.note || "")}</textarea></label>`;
    const src = e.source ? `<p class="small">${SOURCE[e.source] || ""}${e.source === "calendar" ? " – wenn du hier speicherst, gilt ab jetzt deine Version (der Kalender ändert den Tag nicht mehr)." : ""}</p>` : "";
    return `<form class="edit" data-form="day" data-d="${iso}"><b>${WD_LONG[wdOf(iso)]}, ${dm(iso)}${iso.slice(0, 4)}</b><div class="kinds">${kinds}</div><div class="f">${fields}</div>${src}
      <div class="btnrow end">${d.days[iso] ? `<button type="button" class="btn" data-a="delday" data-d="${iso}">${ic("delete-outline")}Löschen</button>` : ""}<button type="button" class="btn" data-a="close">Abbrechen</button><button class="btn main" type="submit">${ic("check")}Speichern</button></div></form>`;
  }

  // ---------------------------------------------------------------- 🗓️ Monat
  _monthView() {
    const d = this._d;
    const [y, m] = this._month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const isos = Array.from({ length: last }, (_, i) => isoOf(y, m, i + 1));
    const row = this._rowOf(this._month);
    let h = `<div class="yearnav"><button class="iconbtn" data-a="mon" data-v="-1" title="Monat zurück">${ic("chevron-left")}</button><b>${monthName(this._month)}</b><button class="iconbtn" data-a="mon" data-v="1" title="Monat vor">${ic("chevron-right")}</button></div>`;
    h += this._dayRows(isos);
    h += this._zettel(row);
    h += this._bossBox(row);
    h += `<div class="btnrow"><button class="btn small" data-a="monthform">${ic("pencil-outline")}Lohnabrechnung / Korrektur</button><button class="btn small" data-a="share" data-v="month">${ic("share-variant-outline")}Drucken & Teilen</button><button class="btn small" data-a="csv">${ic("file-delimited-outline")}CSV</button>${this._app ? "" : `<span class="bossrow"><button class="btn small" data-a="bosspick">${ic("file-document-outline")}Zettel vom Chef</button>${this._ib("boss")}<input type="file" id="bossfile" accept=".pdf,application/pdf" hidden></span>`}</div>`;
    if (!this._app) h += `${this._ih("boss", "📄 Geht nur mit Zetteln vom Typ <b>„Zeitsaldenliste“</b> als <b>PDF vom Computer</b> (aus dem Zeiterfassungs-Programm deines Chefs). Fotos, Scans und andere Stundenzettel gehen nicht – dann sagt die Karte Bescheid und ändert nichts.", "🔴 An deinen Tagen ändert sich nichts. Die Stunden vom Chef stehen nur <b>rot links neben deinen</b>, wo sie anders sind. Unten siehst du seinen Saldo und kannst „Saldo Vormonat“ als Ü.-Alt übernehmen.")}`;
    if (this._monthForm) {
      const meta = (d.months_meta || {})[this._month] || {};
      h += `<form class="edit" data-form="month"><div class="flab"><b>🗓️ ${monthName(this._month)}</b>${this._ib("monthform")}</div>${this._ih("monthform", "💶 <b>Ü.-Alt laut Lohnabrechnung</b> = der Überstunden-Stand, den dein Chef auf der Abrechnung vom Vormonat stehen hat. Dann rechnet die Karte ab diesem Monat mit seiner Zahl weiter.", `💡 <b>Korrektur</b> = Stunden, die nicht aus den Tagen kommen (ausgezahlt = Minus, geschenkt = Plus). <b>Soll</b> leer = normal (${h2(this._st.paid_hours)}).`)}<div class="f">
        <label class="wide">💶 Ü.-Alt laut Lohnabrechnung<input name="alt" inputmode="decimal" value="${meta.alt != null ? esc(String(meta.alt).replace(".", ",")) : ""}" placeholder="leer = Stand vom Vormonat (${row ? hs(row.calc_old ?? row.old) : "–"})"></label>
        <label>Korrektur (Std.)<input name="adjust" inputmode="decimal" value="${meta.adjust != null ? esc(String(meta.adjust).replace(".", ",")) : ""}" placeholder="z. B. −20 ausgezahlt"></label>
        <label>Soll nur diesen Monat<input name="paid" inputmode="decimal" value="${meta.paid != null ? esc(String(meta.paid).replace(".", ",")) : ""}" placeholder="${row ? h2(row.paid) : ""}"></label>
        <label class="wide">Notiz<input name="note" value="${esc(meta.note || "")}" placeholder="z. B. 20 Überstunden ausgezahlt"></label></div>
        <div class="btnrow end"><button type="button" class="btn" data-a="monthform">Abbrechen</button><button class="btn main" type="submit">${ic("check")}Speichern</button></div></form>`;
    }
    return h;
  }
  _altRow(row, r) {
    const off = row.old - (row.calc_old ?? row.old);
    const line = r("history", row.alt ? "Ü.-Alt (Lohnabrechnung)" : "Ü.-Alt (Vormonat)", this._mv(hs(row.old), "old" + row.month));
    return row.alt && Math.abs(off) > 0.004 ? line + `<div class="zr sub"><span>Karte hätte ${this._mv(hs(row.calc_old), "co" + row.month)}</span><span class="${off < 0 ? "vneg" : "vpos"}">${this._mv(hs(off), "cd" + row.month)}</span></div>` : line;
  }
  _sheetNote(row) {
    if (!row?.sheet) return "";
    const dh = Math.abs((row.calc_hours ?? row.hours) - row.hours) > 0.004;
    return `<p class="small">📥 Zahlen genau wie auf deinem alten Zettel${dh ? ` (die einzelnen Tage ergeben zusammen ${h2(row.calc_hours)} Std.)` : ""}. <a href="#" data-a="unsheet">Mit der Karte neu rechnen</a></p>`;
  }
  _zettel(row) {
    if (!row) return `<div class="empty">In diesem Monat steht noch nichts. ✍️</div>`;
    const r = (icon, label, val, cls = "") => `<div class="zr ${cls}"><span>${ic(icon)}${label}</span><span>${val}</span></div>`;
    if (row.now != null) { // 📍 laufender Monat: fair rechnen – Soll nur bis heute
      const diff = row.hours - row.paid_today;
      return `<div class="zettel" style="--hc:${row.now < 0 ? "var(--kc-red)" : "var(--kc-green)"}">
      ${r("sigma", "Summe bisher", `${h2(row.hours)} Std.`)}
      ${r("cash", `Soll bis heute <small>(ganzer Monat ${h2(row.paid)})</small>`, `−${h2(row.paid_today)} Std.`)}
      ${r("plus-minus-variant", "Plus/Minus bisher", `<span class="${diff < 0 ? "vneg" : "vpos"}">${hs(diff)}</span>`)}
      ${this._altRow(row, r)}
      ${row.adjust ? r("pencil-outline", `Korrektur${row.note ? ` (${esc(row.note)})` : ""}`, hs(row.adjust)) : ""}
      ${r("scale-balance", "Stand heute", this._mv(`${hs(row.now)} Std.`, "now"), "tot")}
      ${r("beach", "Urlaubstage", row.urlaub)}${r("emoticon-sick-outline", "Kranktage", row.krank)}${row.feiertag ? r("party-popper", "Feiertage", row.feiertag) : ""}
      ${r("food-variant", `${h2(this._st.long_day).replace(",00", "")} Stunden und →`, row.long)}${row.euro ? r("cash", "Pauschal", eur(row.euro)) : ""}</div>
      <p class="small">Der Monat läuft noch – darum zählt das Soll nur bis heute. Den fertigen Zettel (mit vollem Soll) gibt es ab dem 1. des nächsten Monats.</p>`;
    }
    if (row.future) { // 🔮 Monat kommt erst noch – Eingetragenes (z. B. Urlaub) zeigen, Konto bleibt unberührt
      return `<div class="zettel">
      ${r("sigma", "Schon eingetragen", `${h2(row.hours)} Std.`)}
      ${r("beach", "Urlaubstage", row.urlaub)}${r("emoticon-sick-outline", "Kranktage", row.krank)}${row.feiertag ? r("party-popper", "Feiertage", row.feiertag) : ""}</div>
      <p class="small">🔮 Dieser Monat kommt erst noch. Was hier schon steht, zählt fürs Überstunden-Konto erst, wenn der Monat dran ist.</p>`;
    }
    const totCol = row.total < 0 ? "var(--kc-red)" : "var(--kc-green)";
    return `<div class="zettel" style="--hc:${totCol}">
      ${r("sigma", "Summe", `${h2(row.hours)} Std.`)}
      ${r("cash", "Bezahlt (Soll)", `−${h2(row.paid)} Std.`)}
      ${r("plus-minus-variant", "Plus/Minus", `<span class="${row.diff < 0 ? "vneg" : "vpos"}">${hs(row.diff)}</span>`)}
      ${this._altRow(row, r)}
      ${row.adjust ? r("pencil-outline", `Korrektur${row.note ? ` (${esc(row.note)})` : ""}`, hs(row.adjust)) : ""}
      ${r("scale-balance", "Ü.-Gesamt", this._mv(`${hs(row.total)} Std.`, "tot" + row.month), "tot")}
            ${r("beach", "Urlaubstage", row.urlaub)}${r("emoticon-sick-outline", "Kranktage", row.krank)}${row.feiertag ? r("party-popper", "Feiertage", row.feiertag) : ""}
      ${r("food-variant", `${h2(this._st.long_day).replace(",00", "")} Stunden und →`, row.long)}${row.euro ? r("cash", "Pauschal", eur(row.euro)) : ""}</div>${this._sheetNote(row)}`;
  }

  // ---------------------------------------------------------------- 📊 Jahr
  _yearView() {
    const d = this._d, y = String(this._year);
    // 📍 laufender Monat: wie im Monat – Soll nur bis heute, Konto = Stand heute
    const rows = (d.months || []).filter((m) => m.month.startsWith(y)).map((m) => (m.now != null ? { ...m, paid: m.paid_today, diff: m.hours - m.paid_today, total: m.now } : m));
    let h = `<div class="yearnav"><button class="iconbtn" data-a="year" data-v="-1" title="Jahr zurück">${ic("chevron-left")}</button><b>${y}</b><button class="iconbtn" data-a="year" data-v="1" title="Jahr vor">${ic("chevron-right")}</button></div>`;
    if (!rows.length) return h + `<div class="empty">Für ${y} gibt es noch nichts. 🤷</div>`;
    const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const curKey = d.today.slice(0, 7);
    h += `<table class="ytab"><thead><tr><th>Monat</th><th>Std.</th><th>Soll</th><th>+/−</th><th>Konto</th><th>U</th><th>K</th></tr></thead><tbody>${rows.map((r) => `
      <tr class="click ${r.month === curKey ? "cur" : ""} ${r.tracked ? "" : "gap"}" data-a="gomonth" data-v="${r.month}"><td>${MONTHS[Number(r.month.slice(5)) - 1].slice(0, 3)}</td><td>${h2(r.hours)}</td><td>${h2(r.paid)}</td><td class="${r.diff + r.adjust < 0 ? "vneg" : "vpos"}">${r.future ? "" : hs(r.diff + r.adjust)}</td><td><b>${r.future ? "🔮" : this._mv(hs(r.total), "y" + r.month)}</b></td><td>${r.urlaub || ""}</td><td>${r.krank || ""}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Σ</td><td>${h2(sum("hours"))}</td><td>${h2(sum("paid"))}</td><td>${hs(sum("diff") + sum("adjust"))}</td><td></td><td>${sum("urlaub")}</td><td>${sum("krank")}</td></tr></tfoot></table>`;
    const vac = (Number(this._st.vacation_days) || 0) + (Number((this._st.vacation_carry || {})[y]) || 0); // 🧳 + Resturlaub Vorjahr
    h += `<div class="tiles" style="margin-top:12px"><div class="tile"><b>${sum("urlaub")} / ${vac}</b><span>${ic("beach")}Urlaub genommen</span></div><div class="tile"><b>${sum("krank")}</b><span>${ic("emoticon-sick-outline")}Kranktage</span></div><div class="tile"><b>${sum("long")}</b><span>${ic("food-variant")}Tage ab ${h2(this._st.long_day).replace(",00", "")} Std.</span></div></div>`;
    h += `<div class="btnrow"><button class="btn small" data-a="share" data-v="year">${ic("share-variant-outline")}Drucken & Teilen</button></div>`;
    h += `<p class="small">U = Urlaubstage · K = Kranktage · Konto = Ü.-Gesamt am Monatsende (laufender Monat: Stand heute, Soll bis heute). Grau = Monat ohne Einträge (zählt nicht mit). 🔮 = Monat kommt erst noch. Antippen öffnet den Monat.</p>`;
    return h;
  }

  // ---------------------------------------------------------------- 📈 Statistik (wie beim Kegelclub): ein Jahr oder alle Jahre
  _statView() {
    const d = this._d, st = this._st;
    const all = (d.months || []).filter((m) => !m.future && m.tracked).map((m) => (m.now != null ? { ...m, paid: m.paid_today, diff: m.hours - m.paid_today, total: m.now } : m));
    const years = [...new Set(all.map((m) => m.month.slice(0, 4)))].sort();
    if (!years.length) return `<div class="empty">Noch keine Daten für eine Statistik. 📊 Trag ein paar Tage ein oder importiere deinen alten Zettel.</div>`;
    let sel = this._statYear || (years.length === 1 ? years[0] : "all");
    if (sel !== "all" && !years.includes(sel)) sel = "all";
    const rows = all.filter((m) => sel === "all" || m.month.startsWith(sel));
    const days = Object.entries(d.days || {}).filter(([iso]) => iso <= d.today && (sel === "all" || iso.startsWith(sel)));
    const sec = (icon, color, title, body) => `<div class="ghead"><span class="gdot" style="--gc:${color}">${ic(icon)}</span><span>${title}</span></div>${body}`;
    let h = `<div class="yearnav"><select data-a="statyear" class="statsel" aria-label="Zeitraum"><option value="all" ${sel === "all" ? "selected" : ""}>Alle Jahre (${years[0]}–${years[years.length - 1]})</option>${[...years].reverse().map((y) => `<option value="${y}" ${sel === y ? "selected" : ""}>${y}</option>`).join("")}</select></div>`;
    // ⚖️ Konto-Kurve
    const vals = rows.map((m) => Number(m.total) || 0);
    const W = 600, H = 170, P = 6;
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1;
    const X = (i) => P + (vals.length < 2 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (vals.length - 1)), Y = (v) => P + ((hi - v) * (H - 2 * P)) / span;
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    const last = vals[vals.length - 1] ?? 0, maxI = vals.indexOf(Math.max(...vals)), minI = vals.indexOf(Math.min(...vals));
    const lbl = (m) => (sel === "all" ? `${MONTHS[Number(m.month.slice(5)) - 1].slice(0, 3)} ${m.month.slice(0, 4)}` : MONTHS[Number(m.month.slice(5)) - 1]);
    h += sec("scale-balance", "#43a047", "Überstunden-Konto", `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Überstunden-Konto">
      <line x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="zero"/>
      <polyline points="${P},${Y(0).toFixed(1)} ${pts} ${X(vals.length - 1).toFixed(1)},${Y(0).toFixed(1)}" class="area"/>
      <polyline points="${pts}" class="line"/>${vals.length ? `<circle cx="${X(vals.length - 1).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="4" class="dot"/>` : ""}</svg></div>
      <div class="tiles"><div class="tile"><b>${this._mv(`<span class="${last < 0 ? "vneg" : "vpos"}">${hs(last)}</span>`, "st-last")}</b><span>${ic("flag-checkered")}zuletzt</span></div><div class="tile"><b>${this._mv(hs(vals[maxI]), "st-max")}</b><span>${ic("arrow-up-bold")}höchster · ${esc(lbl(rows[maxI]))}</span></div><div class="tile"><b>${this._mv(hs(vals[minI]), "st-min")}</b><span>${ic("arrow-down-bold")}tiefster · ${esc(lbl(rows[minI]))}</span></div></div>`);
    // 📊 Stunden pro Monat (bzw. pro Jahr) mit Soll-Linie
    const groups = sel === "all"
      ? years.map((y) => { const r = all.filter((m) => m.month.startsWith(y)); return { k: y, hours: r.reduce((a, m) => a + (Number(m.hours) || 0), 0) / (r.length || 1), soll: r.reduce((a, m) => a + (Number(m.paid) || 0), 0) / (r.length || 1) }; })
      : rows.map((m) => ({ k: MONTHS[Number(m.month.slice(5)) - 1].slice(0, 3), hours: Number(m.hours) || 0, soll: Number(m.paid) || 0 }));
    const gmax = Math.max(1, ...groups.map((g) => Math.max(g.hours, g.soll)));
    h += sec("chart-bar", "#1e88e5", sel === "all" ? "Stunden pro Monat (Schnitt je Jahr)" : "Stunden pro Monat", `<div class="vbars">${groups.map((g) => `<div class="vb" title="${esc(g.k)}: ${h2(g.hours)} Std. · Soll ${h2(g.soll)}"><div class="vbt"><div class="vbf ${g.hours + 0.004 < g.soll ? "under" : ""}" style="height:${((g.hours / gmax) * 100).toFixed(1)}%"></div><div class="vbs" style="bottom:${((g.soll / gmax) * 100).toFixed(1)}%"></div></div><small>${esc(g.k)}</small></div>`).join("")}</div>
      <p class="small">Balken = gearbeitet (inkl. Urlaub, Krank, Feiertag) · Strich = Soll${sel === "all" ? " · pro Jahr der Schnitt eines Monats" : ""}.</p>`);
    // 📅 Wochentage
    const wd = Array.from({ length: 8 }, () => ({ n: 0, h: 0, ends: {} }));
    for (const [iso, e] of days) {
      if (e.kind !== "work" || !(Number(e.hours) > 0)) continue;
      const w = wd[wdOf(iso)]; w.n++; w.h += Number(e.hours) || 0;
      if (e.end) w.ends[e.end] = (w.ends[e.end] || 0) + 1;
    }
    const wmax = Math.max(1, ...wd.map((w) => (w.n ? w.h / w.n : 0)));
    const wrows = [1, 2, 3, 4, 5, 6, 7].filter((i) => wd[i].n).map((i) => { const w = wd[i], avg = w.h / w.n, end = Object.entries(w.ends).sort((a, b) => b[1] - a[1])[0]?.[0]; return `<div class="hbar"><span class="hl">${WD[i]}</span><span class="ht"><span class="hf" style="width:${((avg / wmax) * 100).toFixed(1)}%"></span></span><span class="hv">${h2(avg)} Std.<small>${end ? ` · meist bis ${esc(end)}` : ""} · ${w.n}×</small></span></div>`; }).join("");
    h += sec("calendar-week", "#fb8c00", "Wochentage", wrows ? `<div class="hbars">${wrows}</div><p class="small">Schnitt der gearbeiteten Stunden je Wochentag (ohne Pause) und die häufigste Feierabend-Zeit.</p>` : `<p class="small">Noch keine Arbeitstage.</p>`);
    // 🏖️ Urlaub & Krank pro Jahr
    const yu = years.map((y) => { const r = all.filter((m) => m.month.startsWith(y)); return { y, u: r.reduce((a, m) => a + (m.urlaub || 0), 0), k: r.reduce((a, m) => a + (m.krank || 0), 0) }; });
    const umax = Math.max(1, ...yu.map((x) => Math.max(x.u, x.k)));
    h += sec("beach", "#00897b", "Urlaub & Krank pro Jahr", `<div class="hbars">${[...yu].reverse().map((x) => `<div class="hbar ${sel === x.y ? "sel" : ""}"><span class="hl">${x.y}</span><span class="ht two"><span class="hf u" style="width:${((x.u / umax) * 100).toFixed(1)}%"></span><span class="hf k" style="width:${((x.k / umax) * 100).toFixed(1)}%"></span></span><span class="hv">🏖️ ${x.u} · 🤒 ${x.k}</span></div>`).join("")}</div><p class="small">Oberer Balken = Urlaubstage, unterer = Kranktage.</p>`);
    // 🏆 Rekorde
    const work = days.filter(([, e]) => e.kind === "work" && Number(e.hours) > 0);
    const best = (arr, f, cmp) => arr.reduce((b, x) => (b == null || cmp(f(x), f(b)) ? x : b), null);
    const longD = best(work, ([, e]) => Number(e.hours), (a, b) => a > b);
    const early = best(work.filter(([, e]) => e.start), ([, e]) => szMin(e.start), (a, b) => a < b);
    const late = best(work.filter(([, e]) => e.end), ([, e]) => szMin(e.end), (a, b) => a > b);
    const done = rows.filter((m) => m.now == null);
    const bm = best(done, (m) => m.diff + (m.adjust || 0), (a, b) => a > b), wm = best(done, (m) => m.diff + (m.adjust || 0), (a, b) => a < b);
    const day = (x) => `${WD[wdOf(x[0])]} ${dm(x[0])}${x[0].slice(0, 4)}`;
    const rec = [
      longD && ["timer-sand-full", "Längster Tag", `${h2(longD[1].hours)} Std.`, `${day(longD)} · ${esc(longD[1].start || "")}–${esc(longD[1].end || "")}`],
      early && ["weather-sunset-up", "Frühester Start", `${esc(early[1].start)} Uhr`, day(early)],
      late && ["weather-night", "Spätester Feierabend", `${esc(late[1].end)} Uhr`, day(late)],
      bm && ["trophy-outline", "Bester Monat", hs(bm.diff + (bm.adjust || 0)), monthName(bm.month)],
      wm && ["emoticon-sad-outline", "Schwächster Monat", hs(wm.diff + (wm.adjust || 0)), monthName(wm.month)],
      ["sigma", "Stunden gesamt", `${h2(rows.reduce((a, m) => a + (Number(m.hours) || 0), 0))} Std.`, `${rows.length} Monate`],
    ].filter(Boolean);
    h += sec("trophy-outline", "#8e24aa", "Rekorde", `<div class="recs">${rec.map(([i, t, v, sub]) => `<div class="rec"><span class="kd" style="--kc:#8e24aa">${ic(i)}</span><div class="n"><small>${t}</small><b>${v}</b><small>${sub}</small></div></div>`).join("")}</div>`);
    return h;
  }

  // ---------------------------------------------------------------- 🔒 PIN (Zahlenfeld wie bei der Einkaufsliste)
  _padPage() {
    const p = this._pad;
    const t = {
      unlock: ["PIN eingeben", this._lockAll ? "Der Stundenzettel ist gesperrt. Mit der PIN geht's weiter." : "Für die <b>⚙️ Einstellungen</b> brauchst du die PIN. Stempeln und Tage eintragen gehen auch ohne."],
      old: ["Alte PIN", p.purpose === "off" ? "Zum Ausschalten erst die jetzige PIN eintippen." : "Erst die jetzige PIN eintippen."],
      new: ["Neue PIN", "4 bis 8 Ziffern, dann ✔."],
      new2: ["Neue PIN nochmal", "Zur Sicherheit noch einmal dieselbe PIN."],
    }[p.step];
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✔"];
    return { icon: "lock-outline", color: "#f4511e", title: t[0], html: `<div class="pinpad"><p class="small">${t[1]}</p>
      <div class="pdots">${p.buf ? "●".repeat(p.buf.length) : "&nbsp;"}</div>
      <div class="ppad">${keys.map((k) => `<button type="button" class="btn ${k === "✔" ? "primary" : ""}" data-a="pkey" data-v="${k}" aria-label="${k === "⌫" ? "Löschen" : k === "✔" ? "OK" : k}">${k}</button>`).join("")}</div>
      ${this._lockAll ? "" : `<button type="button" class="btn pcancel" data-a="back">Abbrechen</button>`}
      ${p.step === "unlock" ? `<p class="small" style="margin-top:16px">PIN vergessen? Ein Admin geht in Home Assistant auf <b>Einstellungen → Geräte & Dienste → Stundenzettel → Konfigurieren</b> und hakt <b>„PIN zurücksetzen“</b> an.</p>` : ""}</div>` };
  }
  _padPress(k) {
    const p = this._pad;
    if (!p) return;
    try { navigator.vibrate?.(12); } catch (_) { /* egal */ }
    if (k === "⌫") p.buf = p.buf.slice(0, -1);
    else if (k === "✔") { if (p.buf.length >= 4) this._padNext(); else this._toast("Die PIN hat 4 bis 8 Ziffern"); }
    else if (/^\d$/.test(k) && p.buf.length < 8) p.buf += k;
    this._redraw();
  }
  _padNext() {
    const p = this._pad, v = p.buf;
    p.buf = "";
    const restart = () => { if (this._pad === p) { p.step = p.purpose === "unlock" ? "unlock" : this._d?.pin ? "old" : "new"; p.buf = ""; } this._redraw(); };
    const setPin = (pin) => this._pin("stundenzettel/pin/set", { pin, old: p.old || null }).then((r) => {
      if (!r) { restart(); return; }
      PIN_LOCK.until = pin ? Date.now() + 10 * 60 * 1000 : 0;
      this._toast(pin ? "🔒 PIN gespeichert" : "🔓 PIN ist aus");
      this._pad = null; this._redraw();
    });
    if (p.step === "unlock") {
      if (this._hass?.connected === false) { // 📴 ohne Netz prüft die Karte selbst (Offline-Schlüssel aus dem letzten Stand)
        this._toast("🔎 PIN wird auf diesem Gerät geprüft …");
        pinCheckOffline(this._d?.pin_off, v).then((r) => {
          if (r.ok) { PIN_LOCK.until = Date.now() + 10 * 60 * 1000; this._pad = null; this._toast("🔓 Entsperrt (offline)"); }
          else if (r.wait) this._toast(`⏳ Zu oft falsch – bitte ${r.wait} Sekunden warten`);
          else if (r.unknown) this._toast("📴 Diese PIN kennt das Gerät noch nicht – einmal mit Netz eingeben, danach geht's auch offline");
          else this._toast("❌ Falsche PIN");
          this._redraw();
        });
        return;
      }
      this._pin("stundenzettel/pin/check", { pin: v }).then((r) => {
        if (r?.ok) { PIN_LOCK.until = Date.now() + 10 * 60 * 1000; this._pad = null; this._toast("🔓 Entsperrt"); }
        else if (r) this._toast("❌ Falsche PIN");
        this._redraw();
      });
    } else if (p.step === "old") { p.old = v; if (p.purpose === "off") setPin(null); else p.step = "new"; }
    else if (p.step === "new") { p.neu = v; p.step = "new2"; }
    else if (p.step === "new2") { if (v === p.neu) setPin(v); else { this._toast("Die zwei PINs sind nicht gleich – bitte nochmal"); p.step = "new"; } }
  }
  _pinSetHtml() {
    const d = this._d, st = this._st;
    return `<p class="small">${d.pin ? "🔒 PIN ist <b>an</b>. ⚙️ fragt nach der PIN." : "Mit einer PIN (4–8 Ziffern) sperrst du ⚙️ – z. B. auf dem Tablet in der Küche, damit keiner dein Soll oder den Kalender umstellt. Stempeln und Tage eintragen gehen weiter ohne PIN."}</p>
      <div class="btnrow">${d.pin ? `<button class="btn main" data-a="padstart" data-v="set">${ic("lock-reset")}PIN ändern</button><button class="btn" data-a="padstart" data-v="off">${ic("lock-open-variant-outline")}PIN ausschalten</button>` : `<button class="btn main" data-a="padstart" data-v="set">${ic("lock-outline")}PIN einschalten</button>`}</div>
      ${d.pin ? this._sw("lock_all", "lock-outline", "Ganze Karte sperren", "Aus = nur ⚙️. An = ohne PIN sieht man gar nichts (auch keine Überstunden).", !!st.lock_all) : ""}
      <div class="ghead"><span class="gdot" style="--gc:#f4511e">${ic("help-circle-outline")}</span><span>PIN vergessen?</span>${this._ib("pinmore")}</div>
      ${this._ih("pinmore", "Die PIN liegt nur als Prüfsumme in Home Assistant. Vergessen? Admin → <b>Geräte & Dienste → Stundenzettel → Konfigurieren → „PIN zurücksetzen“</b>. 5× falsch = 1 Minute Pause. Ohne Netz prüft die Karte die PIN selbst. Nach 10 Minuten ohne Tippen sperrt sie wieder.")}`;
  }
  async _pin(type, payload) {
    if (this._hass?.connected === false) { this._toast("📴 PIN ändern oder ausschalten geht nur mit Netz – entsperren klappt auch offline"); return null; }
    try { return await this._hass.callWS({ type, ...payload }); }
    catch (err) { this._toast("⚠️ " + (err?.message || "Ging nicht")); return null; }
  }

  // ---------------------------------------------------------------- ⚙️ Einstellungen
  // ⓘ Hilfe zum Antippen: kleines i neben dem Feld, Erklärung klappt darunter auf (statt Textwand)
  _ib(id) { const open = this._tipOpen?.has(id); return `<button type="button" class="finfo" data-a="finfo" data-v="${id}" aria-expanded="${open ? "true" : "false"}" title="Was ist das?" aria-label="Was ist das?">i</button>`; }
  _ih(id, ...ps) { return `<div class="fhint" data-tip="${id}" ${this._tipOpen?.has(id) ? "" : "hidden"}>${ps.filter(Boolean).map((p) => `<p class="small">${p}</p>`).join("")}</div>`; }
  _sw(key, icon, title, sub, on, help) { return `<label class="switch"><span>${ic(icon)}<span class="vt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span>${help ? this._ib(key) : ""}</span><input type="checkbox" class="swchk" data-a="setb" data-v="${key}" ${on ? "checked" : ""}></label>${help ? this._ih(key, ...[].concat(help)) : ""}`; }
  _num(key, icon, title, val, unit, help) { return `<div class="switch"><span>${ic(icon)}${title}${help ? this._ib(key) : ""}</span><span><input data-a="setn" data-v="${key}" inputmode="decimal" value="${esc(String(val ?? 0).replace(".", ","))}" style="width:90px;text-align:right"> ${unit}</span></div>${help ? this._ih(key, ...[].concat(help)) : ""}`; }
  _entSel(key, domain, value, empty = "– keiner –") {
    const ents = Object.keys(this._hass?.states || {}).filter((e) => e.startsWith(domain + ".")).sort();
    if (value && !ents.includes(value)) ents.unshift(value);
    return `<select data-a="sets" data-v="${key}">${[`<option value="">${empty}</option>`, ...ents.map((e) => `<option value="${esc(e)}" ${e === value ? "selected" : ""}>${esc(this._hass.states[e]?.attributes?.friendly_name || e)} (${esc(e)})</option>`)].join("")}</select>`;
  }
  _sheets() {
    const d = this._d, st = this._st, admin = this._hass?.user?.is_admin !== false;
    const c = d.cal || {};
    const planN = Object.keys(st.plan || {}).length;
    return {
      work: { icon: "cash-clock", color: "#43a047", title: "Bezahlte Stunden & Konto", info: `${h2(st.paid_hours)} Std. pro Monat · Start ${hs(st.start_balance)}`, html: () => `
        <div class="hero" style="--hc:#43a047"><div class="lbl">💶 Aktuell bezahlt</div><div class="big">${h2(st.paid_hours)} Std.</div><div class="lbl">pro Monat (Soll)</div></div>
        ${this._num("paid_hours", "cash", "Aktuell bezahlte Stunden pro Monat", st.paid_hours, "Std.", "So viele Stunden bezahlt dein Chef jeden Monat. Alles darüber landet auf dem Überstunden-Konto, alles darunter geht runter.")}
        <div class="ghead"><span class="gdot" style="--gc:#43a047">${ic("calendar-range")}</span><span>Früher anders?</span>${this._ib("periods")}<span class="n"><button class="btn small" data-a="addperiod">${ic("plus")}Neu</button></span></div>
        ${this._ih("periods", "Beispiel: Bis Dezember 2019 waren es 160 Stunden, seitdem 175 → oben 175 eintragen und hier „bis Dezember 2019: 160“.")}
        ${[...(st.paid_until || [])].map((p, i) => [p, i]).sort((x, y) => (x[0].until < y[0].until ? 1 : -1)).map(([p, i]) => `<div class="item"><span class="kd" style="--kc:#43a047">${ic("calendar-end")}</span><div class="n"><b>bis ${monthName(p.until)}</b><div class="meta"><span class="tag">${h2(p.hours)} Std. pro Monat</span></div></div><button class="iconbtn" data-a="delperiod" data-v="${i}" title="Löschen">${ic("delete-outline")}</button></div>`).join("")}
        ${(st.paid_periods || []).map((p, i) => `<div class="item"><span class="kd" style="--kc:#9e9e9e">${ic("calendar-start")}</span><div class="n"><b>ab ${monthName(p.from)}</b><div class="meta"><span class="tag">${h2(p.hours)} Std. pro Monat</span><span class="tag">alte Schreibweise</span></div></div><button class="iconbtn" data-a="deloldperiod" data-v="${i}" title="Löschen">${ic("delete-outline")}</button></div>`).join("")}
        ${!(st.paid_until || []).length && !(st.paid_periods || []).length ? `<p class="small">Keine – es gilt immer das Soll oben.</p>` : ""}
        ${this._addPeriod ? `<form class="edit" data-form="period"><div class="f"><label>Bis einschließlich<input type="month" name="until" required></label><label>Stunden pro Monat<input name="hours" inputmode="decimal" required placeholder="160"></label></div><div class="btnrow end"><button type="button" class="btn" data-a="addperiod">Abbrechen</button><button class="btn main" type="submit">${ic("check")}Speichern</button></div></form>` : ""}
        ${this._sw("payslip_hint", "bell-ring-outline", "An die Lohnabrechnung erinnern", "am Monatsanfang unter Heute: „Ü.-Alt eintragen“", st.payslip_hint !== false, "💶 Die Zahl vom Chef trägst du unter <b>Monat → Lohnabrechnung / Korrektur</b> als <b>Ü.-Alt</b> ein.")}
        ${this._num("start_balance", "piggy-bank-outline", "Überstunden, bevor es losging", st.start_balance, "Std.", "💡 Tipp: Unter <b>📥 Import</b> → <b>„Konto stellen“</b> kannst du sagen „Ende Oktober stand das Konto bei 32“ – die Karte rechnet die Korrektur selbst aus.")}` },
      pause: { icon: "coffee-outline", color: "#6d4c41", title: "Pausen-Regeln", info: (st.pause_rules || []).map((r) => (st.pause_by === "ende" ? `nach ${szClock(r.from)} → ${h2(r.pause)}` : `ab ${h2(r.from).replace(",00", "")} Std. → ${h2(r.pause)}`)).join(" · ") || "keine Pause", html: () => `
        <div class="ghead"><span class="gdot" style="--gc:#6d4c41">${ic("coffee-outline")}</span><span>Pause richtet sich nach</span>${this._ib("pauseby")}</div>
        ${this._ih("pauseby", st.pause_by === "ende" ? "Die Pause richtet sich danach, <b>wann du gehst</b>. Es zählt die <b>größte</b> Regel, deren Uhrzeit du <b>überschreitest</b>. Beispiel: Gehen bis 12:00 → 0,25 Pause · Gehen nach 12:00 → 0,50 Pause." : "Die Pause wird automatisch abgezogen. Es zählt die <b>größte</b> Regel, deren Grenze du <b>überschreitest</b>. Beispiel: 6:30–16:15 = 9,75 Std. da → mehr als 6 → 0,50 Pause → <b>9,25 Std.</b>", "Einzelne Tage mit anderer Pause trägst du direkt am Tag ein. Steht im Kalender-Termin „(+0,50 h Pause)“, nimmt die Karte genau das.")}
        <div class="seg"><button class="${st.pause_by !== "ende" ? "on" : ""}" data-a="pauseby" data-v="dauer">${ic("timer-sand")}Nach Dauer</button><button class="${st.pause_by === "ende" ? "on" : ""}" data-a="pauseby" data-v="ende">${ic("clock-end")}Nach Uhrzeit beim Gehen</button></div>
        ${(st.pause_rules || []).map((r, i) => `<div class="item"><span class="kd" style="--kc:#6d4c41">${ic("coffee-outline")}</span><div class="n"><b>${st.pause_by === "ende" ? (r.from > 0 ? `Gehen nach ${szClock(r.from)} Uhr` : "Gehen egal wann") : `mehr als ${h2(r.from)} Std. da`}</b><div class="meta"><span class="tag">${h2(r.pause)} Std. Pause</span></div></div><button class="iconbtn" data-a="delrule" data-v="${i}" title="Löschen">${ic("delete-outline")}</button></div>`).join("") || `<p class="small">Keine Regeln – es wird keine Pause abgezogen.</p>`}
        ${this._addRule ? `<form class="edit" data-form="rule"><div class="f">${st.pause_by === "ende" ? `<label>Gehen nach … Uhr<input type="time" name="from" required value="12:00" step="300"></label>` : `<label>Mehr als … Std. da<input name="from" inputmode="decimal" required placeholder="6"></label>`}<label>… Std. Pause<input name="pause" inputmode="decimal" required placeholder="0,5"></label></div><div class="btnrow end"><button type="button" class="btn" data-a="addrule">Abbrechen</button><button class="btn main" type="submit">${ic("check")}Speichern</button></div></form>` : `<div class="btnrow"><button class="btn small" data-a="addrule">${ic("plus")}Neue Regel</button></div>`}` },
      plan: { icon: "calendar-week", color: "#1e88e5", title: "Normaler Tag", info: planN ? `${planN} Arbeitstage pro Woche` : "kein Plan", html: () => `
        <div class="ghead"><span class="gdot" style="--gc:#1e88e5">${ic("calendar-week")}</span><span>Dein normaler Tag</span>${this._ib("plan")}</div>
        ${this._ih("plan", "Dein normaler Tag pro Wochentag. Daraus kommen der Knopf <b>„📋 Normaler Tag“</b>, die Vorschläge beim Eintragen und das <b>Soll heute</b>. Wochentage ohne Haken = frei.")}
        <form data-form="plan">${[1, 2, 3, 4, 5, 6, 7].map((w) => { const p = (st.plan || {})[String(w)]; return `<div class="planrow"><label><input type="checkbox" class="swchk" name="on${w}" ${p ? "checked" : ""}>${WD[w]}</label><input type="time" name="a${w}" value="${esc(p?.[0] || "06:30")}" step="300"><input type="time" name="b${w}" value="${esc(p?.[1] || "16:15")}" step="300"></div>`; }).join("")}
        <div class="btnrow end"><button class="btn main" type="submit">${ic("check")}Speichern</button></div></form>` },
      absence: { icon: "beach", color: "#00897b", title: "Urlaub, Krank & Co.", info: `${h2(st.absence_hours)} Std. pro Tag · ${st.vacation_days} Urlaubstage`, html: () => `
        ${this._num("absence_hours", "beach", "Ein Urlaubs-, Kranken- oder Feiertag zählt", st.absence_hours, "Std.")}
        ${this._num("vacation_days", "calendar-star", "Urlaubstage pro Jahr", st.vacation_days, "Tage")}
        <div class="switch"><span>${ic("briefcase-outline")}Resturlaub aus ${this._year - 1} (für ${this._year})${this._ib("carry")}</span><span><input data-a="setcarry" data-v="${this._year}" inputmode="decimal" value="${esc(String((st.vacation_carry || {})[this._year] ?? 0).replace(".", ","))}" style="width:90px;text-align:right"> Tage</span></div>
        ${this._ih("carry", "🧳 Übrige Urlaubstage vom Vorjahr kommen zum Anspruch dazu. Für ein anderes Jahr: oben unter Jahr das Jahr wählen, dann hier eintragen.")}
        ${this._num("long_day", "food-variant", "„… Stunden und →“ zählt Tage ab", st.long_day, "Std.", "„8 Stunden und →“ zählt die Tage, an denen du mindestens so viele Stunden gearbeitet hast (ohne Pause gerechnet – wie auf dem Zettel).")}` },
      cal: { icon: "calendar-sync-outline", color: "#3949ab", title: "Kalender", info: st.calendar ? `${st.calendar} · „${st.event_title}“` : "nicht verbunden", html: () => `
        <div class="switch"><span>${ic("calendar-outline")}Kalender${this._ib("calendar")}</span>${this._entSel("calendar", "calendar", st.calendar)}</div>
        ${this._ih("calendar", `In deinem Kalender steht jeden Tag ein Termin <b>„${esc(st.event_title || "Arbeiten")}“</b> mit Anfang und Ende? Dann holt die Karte ihn sich alle 15 Minuten.`, "✋ Was du in der Karte selbst änderst, überschreibt der Kalender nie wieder.")}
        <div class="switch"><span>${ic("format-title")}So heißt der Termin</span><input data-a="sets" data-v="event_title" value="${esc(st.event_title || "")}" style="width:160px"></div>
        ${this._sw("cal_read", "calendar-import", "Termine in die Liste holen", "die letzten 40 Tage, alle 15 Minuten", st.cal_read !== false)}
        ${this._sw("cal_write", "calendar-export", "Änderungen in den Kalender schreiben", "Karte ist die Chefin: deine Zeiten landen im Termin", !!st.cal_write, [`✍️ Was du in der Karte einträgst (oder stempelst), schreibt sie als Termin „${esc(st.event_title)}“ mit <code>[9,25 Stunden (+0,50 h Pause)]</code> in den Kalender. Krank/Urlaub/Frei → der Arbeits-Termin des Tages wird gelöscht. <b>Google</b> kann Termine über Home Assistant nicht ändern, nur löschen und neu anlegen – das macht die Karte dann automatisch.`, "🔁 Fehlt bei einem deiner Arbeitstage der Termin (z. B. aus Versehen im Kalender gelöscht), legt die Karte ihn beim nächsten Abgleich wieder an – für die letzten 40 Tage. Doppelte Termine gibt es nicht."])}
        ${st.cal_write ? `<div class="switch"><span>${ic("map-marker-outline")}Ort im Termin</span><input data-a="sets" data-v="location" value="${esc(st.location || "")}" placeholder="leer = keiner" style="width:180px"></div>
        <div class="ghead"><span class="gdot" style="--gc:#3949ab">${ic("calendar-export")}</span><span>Alle Tage in den Kalender schreiben</span>${this._ib("calrange")}</div>
        ${this._ih("calrange", `Schreibt jeden Arbeitstag im Zeitraum als Termin „${esc(st.event_title)}“ (höchstens gut ein Jahr auf einmal). Was schon richtig drinsteht, bleibt wie es ist.`)}
        <form class="edit" data-form="calrange"><div class="f"><label>Von<input type="date" name="from" required value="${esc(d.today.slice(0, 8) + "01")}"></label><label>Bis<input type="date" name="to" required value="${esc(d.today)}"></label></div><div class="btnrow end"><button class="btn main" type="submit">${ic("calendar-export")}Jetzt schreiben</button></div></form>` : ""}
        <div class="switch"><span>${ic("party-popper")}Feiertage automatisch${this._ib("holiday")}</span>${this._entSel("holiday_calendar", "calendar", st.holiday_calendar, "– aus –")}</div>
        ${this._ih("holiday", "🎌 Tipp: Die Integration „Feiertage“ (z. B. <code>calendar.deutschland_nw</code>) kennt genau die Feiertage deines Bundeslandes.")}
        ${c.error ? `<p class="small" style="color:var(--kc-red)">⚠️ ${esc(c.error)}</p>` : c.ok ? `<p class="small">✅ Verbunden${c.can?.length ? ` · kann: ${c.can.map((x) => ({ create: "anlegen", delete: "löschen", update: "ändern" })[x] || x).join(", ")}` : ""}</p>` : ""}
        <div class="btnrow"><button class="btn main" data-a="sync">${ic("refresh")}Jetzt abgleichen</button></div>` },
      stamp: { icon: "map-marker-radius-outline", color: "#e53935", title: "Stempeln per Handy", info: st.stamp_person && st.stamp_zone ? `${st.stamp_person} in ${st.stamp_zone}` : "aus", html: () => `
        <div class="switch"><span>${ic("account-outline")}Person${this._ib("sperson")}</span>${this._entSel("stamp_person", "person", st.stamp_person, "– aus –")}</div>
        ${this._ih("sperson", "Kommt dein Handy in die Zone (z. B. „Arbeit“), stempelt die Karte ein. Verlässt es die Zone, stempelt sie aus und trägt den Tag ein. Mehrmals rein und raus? Dann zählt <b>erstes Kommen bis letztes Gehen</b>.")}
        <div class="switch"><span>${ic("map-marker-outline")}Zone${this._ib("szone")}</span>${this._entSel("stamp_zone", "zone", st.stamp_zone, "– aus –")}</div>
        ${this._ih("szone", "💡 Eine Zone legst du in Home Assistant an: <b>Einstellungen → Bereiche, Labels & Zonen → Zonen</b>. Die HA-App auf dem Handy braucht Standort-Zugriff.")}
        <div class="switch"><span>${ic("rounded-corner")}Zeiten runden</span><span class="seg">${[[0, "nicht"], [5, "5 Min."], [15, "15 Min."]].map(([v, t]) => `<button class="${Number(st.round) === v ? "on" : ""}" data-a="round" data-v="${v}">${t}</button>`).join("")}</span></div>` },
      imp: { icon: "database-import-outline", color: "#1e88e5", title: "Import & Sicherung", info: "alter Zettel, Konto stellen, Sicherung", html: () => this._importHtml(admin) },
      log: { icon: "history", color: "#5e35b1", title: "Verlauf", info: `${(d.log || []).length} Einträge`, html: () => `${this._sw("log_on", "history", "Verlauf führen", "wer hat wann was geändert", st.log_on !== false)}
        ${(d.log || []).map((l) => `<div class="logrow small" style="margin:6px 4px"><b>${new Date(l.ts).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</b> ${esc(l.text)}${l.user ? ` · ${esc(l.user)}` : ""}</div>`).join("") || `<p class="small">Noch nichts passiert.</p>`}` },
      view: { icon: "eye-outline", color: "#00897b", title: "Ansicht – für alle", info: [st.labels ? "Beschriftungen an" : "", st.veil ? "verschleiert" : "", (st.view || {}).monat === false || (st.view || {}).jahr === false || (st.view || {}).stat === false ? "Reiter ausgeblendet" : ""].filter(Boolean).join(" · ") || "alles sichtbar", html: () => `
        <p class="small">Gilt für <b>alle</b> – auf allen Handys, im Dashboard und in der App.</p>
        ${this._sw("labels", "format-text", "Beschriftungen unter den Symbolen", "auch ohne: lange auf ein Symbol drücken", !!st.labels)}
        ${this._sw("veil", "eye-off-outline", "Überstunden verschleiern", "PC: Maus drüber · Handy: antippen = 4 Sekunden sichtbar", !!st.veil)}
        ${[["monat", "calendar-month-outline", "Reiter „Monat“", "Tage, Zettel, Drucken"], ["jahr", "chart-bar", "Reiter „Jahr“", "Übersicht pro Monat"], ["stat", "chart-line", "Reiter „Statistik“", "Kurven, Wochentage, Rekorde"]].map(([k, i, t, sub]) => `<label class="switch"><span>${ic(i)}<span class="vt"><b>${t}</b><small>${sub}</small></span></span><input type="checkbox" class="swchk" data-a="setview" data-v="${k}" ${(st.view || {})[k] !== false ? "checked" : ""}></label>`).join("")}
        <div class="ghead"><span class="gdot" style="--gc:#00897b">${ic("lightbulb-outline")}</span><span>Gut zu wissen</span>${this._ib("viewmore")}</div>
        ${this._ih("viewmore", "🌍 <b>Sprache:</b> Die Karte spricht automatisch wie dein Home Assistant (Deutsch oder Englisch). Fest einstellen: Karte bearbeiten → „Sprache / Language“.", "📌 Den Stundenzettel gibt's auch als eigenen Eintrag in der <b>Seitenleiste</b>: Einstellungen → Geräte & Dienste → Stundenzettel → Konfigurieren.")}` },
      mascot: { icon: "alarm", color: "#ec407a", title: "Maskottchen", info: st.mascot ? "Wecker ist da" : "aus", html: () => `
        ${this._sw("mascot", "alarm", "Wecker oben links zeigen", "für alle · Standard aus", !!st.mascot)}
        <p class="small">Der kleine Wecker zeigt, wie es läuft:</p>
        <div class="mascotprev">${[["happy", "eingestempelt"], ["calm", "alles gut"], ["worried", "gestern fehlt"], ["shock", "Konto tief im Minus"], ["tired", "früh morgens"], ["sleep", "nachts"]].map(([m, t]) => `<span>${szMascotSvg(m)}<small>${t}</small></span>`).join("")}</div>
        <p class="small">Und er zieht sich passend zur Jahreszeit an:</p>
        <div class="mascotprev">${[["spring", "Frühling"], ["summer", "Sommer"], ["autumn", "Herbst"], ["winter", "Winter"], ["bunny", "Ostern"], ["pumpkin", "Halloween"], ["santa", "Advent"], ["party", "Silvester"]].map(([c, t]) => `<span class="${szMascotDeco() === c ? "now" : ""}">${szMascotSvg("happy", c)}<small>${t}</small></span>`).join("")}</div>` },
      calm: { icon: "meditation", color: "#5c6bc0", title: "Ruhiger Modus", info: store.get(CALMKEY, false) ? "an – nur dieses Gerät" : "aus", html: () => `
        <label class="switch"><span>${ic("meditation")}Ruhiger Modus${this._ib("calm")}</span><input type="checkbox" class="swchk" data-a="setcalm" ${store.get(CALMKEY, false) ? "checked" : ""}></label>
        ${this._ih("calm", "Nur für <b>dieses Gerät</b>. Gedämpfte Farben, keine Animationen – angenehm für alte Tablets.")}` },
      ...(this._app ? { theme: { icon: "theme-light-dark", color: "#37474f", title: "Hell / Dunkel", info: { light: "☀️ Hell", dark: "🌙 Dunkel" }[szTheme()] || "🌓 Automatisch", html: () => `
        <p class="small">Nur für die Offline-App auf diesem Gerät.</p>
        <div class="btnrow">${[["auto", "🌓 Automatisch"], ["light", "☀️ Hell"], ["dark", "🌙 Dunkel"]].map(([v, l]) => `<button class="btn ${szTheme() === v ? "main" : ""}" data-a="theme" data-v="${v}">${l}</button>`).join("")}</div>` } } : {}),
      app: { icon: "cellphone-arrow-down", color: "#3949ab", title: "Offline-App", info: "stempeln auch ohne Netz", html: () => `
        <p class="small">Eine eigene kleine App nur für den Stundenzettel. Sie öffnet sich auch <b>ohne Netz</b> (z. B. im Keller der Baustelle), zeigt den letzten Stand, lässt dich <b>stempeln und Tage eintragen</b> und schickt alles nach, sobald wieder Netz da ist. Die Uhrzeit vom Knopfdruck bleibt dabei erhalten.</p>
        <ol class="small steps"><li>Auf dem Handy im <b>Browser</b> (Chrome oder Safari, nicht in der HA-App) die Adresse unten öffnen.</li><li>Einmal mit deinem Home-Assistant-Benutzer <b>anmelden</b>.</li><li>Im Browser-Menü <b>„Zum Startbildschirm hinzufügen“</b> – fertig, eigenes Symbol.</li><li>Tipp: <b>Lange aufs App-Symbol drücken</b> → „Kommen“ oder „Gehen“ stempelt direkt (Android).</li></ol>
        ${d.app_url ? `<div class="ghead"><span class="gdot" style="--gc:#3949ab">${ic("web")}</span><span>Deine Adresse für die App</span>${this._ib("appmore")}</div>${this._ih("appmore", "Unten in der App: <b>„👆 Fingerabdruck-Sperre“</b>. <b>Abmelden</b> meldet nur das Handy ab – in Home Assistant bleibt alles. Es braucht eine <b>https</b>-Adresse (z. B. Nabu Casa).")}<input id="appUrl" readonly value="${esc(d.app_url)}" translate="no"><div class="btnrow"><button class="btn main" data-a="appcopy">${ic("content-copy")}Kopieren</button></div>`
        : `<p class="small">⚠️ Home Assistant kennt keine https-Adresse für unterwegs. Mit <b>Nabu Casa</b> oder einer eigenen https-Adresse klappt es. Zu Hause geht auch: <code>${esc(location.origin)}/stundenzettel/app/</code></p>`}` },
      pin: { icon: d.pin ? "lock-outline" : "lock-open-variant-outline", color: "#f4511e", title: "Schutz", info: d.pin ? (st.lock_all ? "PIN für die ganze Karte" : "PIN fürs Zahnrad") : "keine PIN", html: () => this._pinSetHtml() },
      errors: { icon: "bug-outline", color: "#e53935", title: "Fehler-Protokoll", info: (d.errors || []).length ? `${d.errors.length} Meldungen` : "keine Fehler 🎉", html: () => `${(d.errors || []).map((e) => `<p class="small"><b>${new Date(e.ts).toLocaleString("de-DE")}</b> ${esc(e.text)}</p>`).join("") || `<p class="small">Alles ruhig. 🎉</p>`}${(d.errors || []).length ? `<div class="btnrow"><button class="btn small" data-a="errclear">${ic("broom")}Leeren</button></div>` : ""}` },
      privacy: { icon: "shield-lock-outline", color: "#455a64", title: "Datenschutz", info: "alles lokal", html: () => `<p class="small">🔒 Deine Arbeitszeiten bleiben in <b>deinem</b> Home Assistant. Keine Cloud, kein Tracking. Nur wenn du einen Kalender verbindest, liest bzw. schreibt Home Assistant dort – so wie bei jedem anderen Termin auch. In der Offline-App liegt zusätzlich eine Kopie im Handy, bis du dich abmeldest.</p>` },
      factory: { icon: "nuke", color: "#b71c1c", title: "Werkseinstellungen", info: admin ? "alles zurücksetzen" : "nur Admins", html: () => admin ? `<p><b>💣 Werkseinstellungen</b><br>Löscht <b>alle Tage</b>, Korrekturen und Einstellungen. Der Kalender selbst bleibt, wie er ist. <b>Das geht nicht rückgängig</b> – vorher unter „Import &amp; Sicherung“ → „Sicherung speichern“.</p><div class="btnrow"><button class="btn danger" data-a="factory">${ic("nuke")}Alles löschen</button></div>` : `<p class="small">Nur für Admins.</p>` },
      news: { icon: "new-box", color: "#fb8c00", title: "Was ist neu", info: `Version ${SZ_VERSION}`, html: () => this._newsHtml() },
      credits: { icon: "hand-heart-outline", color: "#ec407a", title: "Credits", info: `v${SZ_VERSION} · von Mister-M`, html: () => this._creditsHtml() },
    };
  }
  _sheetPage() { const x = this._sheets()[this._sheet]; return x ? { icon: x.icon, color: x.color, title: x.title, html: x.html() } : null; }
  _setView() {
    const sh = this._sheets();
    const cats = [["⏱", "Arbeitszeit", ["work", "pause", "plan", "absence"]], ["📅", "Kalender & Stempeln", ["cal", "stamp"]], ["💾", "Daten", ["imp", "log", "factory"]], ["👁", "Ansicht", ["view", "mascot", "calm", ...(this._app ? ["theme"] : [])]], ["📱", "App & Info", ["app", "pin", "errors", "privacy", "news", "credits"]]];
    return `<div class="sethead">${ic("cog-outline")}<span>Einstellungen</span></div>` + cats.map(([emo, title, keys]) => {
      const open = this._setOpen === title;
      const rows = open ? keys.map((k) => `<button class="lrow" data-a="sheet" data-v="${k}"><span class="ic" style="--ic:${sh[k].color}">${ic(sh[k].icon)}</span><span class="grow"><b>${sh[k].title}</b><small>${esc(sh[k].info)}</small></span>${ic("chevron-right")}</button>`).join("") : "";
      return `<div class="lgbox"><button class="lgroup" data-a="setgrp" data-v="${esc(title)}" aria-expanded="${open}"><span class="gem">${emo}</span><span class="grow"><b>${title}</b><small>${keys.map((k) => sh[k].title).join(", ")}</small></span>${ic(open ? "chevron-up" : "chevron-down")}</button>${rows}</div>`;
    }).join("");
  }
  _importHtml(admin) {
    const p = this._impPrev;
    const lastKey = (this._d.months || []).filter((m) => m.tracked && m.month < this._d.today.slice(0, 7)).map((m) => m.month).pop() || "";
    return `<div class="ghead"><span class="gdot" style="--gc:#1e88e5">${ic("database-import-outline")}</span><span>Alter Zettel</span>${this._ib("impold")}</div>
      <div class="fhint" data-tip="impold" ${this._tipOpen?.has("impold") ? "" : "hidden"}><p class="small"><b>📥 Alter Zettel</b> – markiere in deiner Tabelle (Google Tabellen, Excel oder PDF) einfach alles, kopiere es und füge es hier ein. Die Karte sucht sich Zeilen wie <code>15.03.2012  7:00 - 17:00  9,5</code>, <code>02.08.2012 Urlaub 8</code> oder <code>14.04.2012 8:00 - 11:00 33,00 Euro</code> selbst raus. Die Stunden vom Zettel werden genau übernommen (die Pause passt sich an). Kopierst du aus Google Tabellen oder Excel, kommen auch die <b>Monatswerte</b> mit: Summe, Ü.-Alt (Lohnabrechnung), Ü.-Gesamt und „8 Stunden und →“ – genau so, wie sie im Zettel stehen.</p></div>
      <textarea id="imptext" rows="6" placeholder="Hier einfügen …">${esc(this._impText || "")}</textarea>
      ${this._sw("_overwrite", "file-replace-outline", "Schon vorhandene Tage überschreiben", "aus = nur fehlende Tage ergänzen", !!this._overwrite)}
      <div class="btnrow"><button class="btn" data-a="impprev">${ic("magnify")}Vorschau</button>${p && p.found ? `<button class="btn main" data-a="impgo">${ic("check")}${p.found} Tage übernehmen</button>` : ""}</div>
      ${p ? `<p class="small">${p.found ? `🔎 Gefunden: <b>${p.found} Tage</b> (${p.first ? dm(p.first) + p.first.slice(0, 4) : ""} bis ${p.last ? dm(p.last) + p.last.slice(0, 4) : ""}) · neu: ${p.new} · schon da: ${p.clash}${p.months ? ` · Monatswerte: <b>${p.months} Monate</b>` : ""}${p.skipped ? ` · übersprungen: ${p.skipped} (z. B. Wochenende)` : ""}` : "🤷 Nichts gefunden – sind Datum und Uhrzeit drin?"}${p.applied != null ? ` · ✅ <b>${p.applied} übernommen</b>` : ""}</p>` : ""}
      <div class="ghead"><span class="gdot" style="--gc:#fb8c00">${ic("target")}</span><span>Konto stellen</span>${this._ib("fix")}</div>
      <div class="fhint" data-tip="fix" ${this._tipOpen?.has("fix") ? "" : "hidden"}><p class="small">Auf deinem alten Zettel stand am Ende eines Monats ein anderer Überstunden-Stand (z. B. weil mal welche ausgezahlt wurden)? Sag der Karte einfach, was da stand – sie trägt die Korrektur selbst ein.</p></div>
      <form class="edit" data-form="fix"><div class="f"><label>Monat<input type="month" name="month" value="${esc(lastKey)}" required></label><label>Ü.-Gesamt laut Zettel<input name="value" inputmode="decimal" required placeholder="z. B. 32"></label></div><div class="btnrow end"><button class="btn main" type="submit">${ic("target")}Konto stellen</button></div></form>
      <div class="ghead"><span class="gdot" style="--gc:#43a047">${ic("content-save-outline")}</span><span>Sicherung</span></div>
      <div class="btnrow"><button class="btn" data-a="backup">${ic("download")}Sicherung speichern</button>${admin ? `<button class="btn" data-a="restore">${ic("upload")}Sicherung einspielen</button><input type="file" id="restorefile" accept=".json,application/json" hidden>` : ""}<button class="btn" data-a="csvall">${ic("file-delimited-outline")}Alles als CSV</button></div>`;
  }
  _newsHtml() {
    const li = (t) => `<ul>${t.split(" · ").map((x) => `<li>${x}</li>`).join("")}</ul>`;
    return `${/-beta/.test(SZ_VERSION) ? `<div class="betabox"><b>🧪 Du bist in der Beta ${SZ_VERSION}</b></div>` : ""}<p class="small">Das Neueste steht oben.</p>${SZ_NEWS.map((n) => `<p style="margin:10px 0 0"><b>v${n[0]}</b></p>${li(n[1])}`).join("")}`;
  }
  _creditsHtml() {
    return `<div class="elcredits" translate="no">
      <div class="ellogo"><img src="/stundenzettel/files/mister-m.webp?v=${SZ_VERSION}" alt="Mister-M" loading="lazy"></div>
      <p class="elcv"><b>Stundenzettel</b> v${SZ_VERSION}</p>
      <p>Gemacht von <b>Mister-M</b> – mit Hilfe von Claude 🤖</p>
      <p>Ich versuche, Updates und Fehler-Korrekturen zeitnah zu erledigen.</p>
      <p class="elcsmall">📅 Neue offizielle Versionen kommen immer sonntags. An den anderen Tagen gibt es nur Test-Versionen (Beta) – die siehst du in HACS (ab Home Assistant 2026.11: Einstellungen &gt; Marketplace) unter „Beta-Versionen anzeigen“.</p>
      <div class="elcbtns">
        <a class="elcbtn" href="${REPO}" target="_blank" rel="noopener">🐙 GitHub</a>
        <a class="elcbtn" href="${REPO}/discussions" target="_blank" rel="noopener">💡 Idee oder Wunsch</a>
        <a class="elcbtn" href="${REPO}/issues" target="_blank" rel="noopener">🐞 Fehler melden</a>
        <a class="elcbtn pp" href="${PAYPAL}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 2.7 5 6.2 5c2 0 3.5 1.1 5.8 3.4C14.3 6.1 15.8 5 17.8 5c3.5 0 5.2 3.6 3.8 6.8C19.5 16.4 12 21 12 21z" fill="#fff"/></svg><span>Spenden mit PayPal</span></a>
      </div>
      <p class="elcsmall">Der Stundenzettel ist und bleibt kostenlos. Wenn er dir gefällt, freue ich mich über eine kleine Spende – ganz freiwillig, der Feierabend-Kaffee geht auf dich ☕. Beim Antippen öffnet sich PayPal im Browser; vorher geht nichts ins Internet.</p>
      <p>🔒 Alle Daten bleiben in deinem Home Assistant. Keine Cloud, kein Tracking. Mehr unter ⚙️ → Datenschutz.</p>
      <p class="elcsmall">Symbole: Material Design Icons (Pictogrammers) · Lizenz: MIT</p></div>`;
  }
  _guideView() {
    const sec = (emo, title, sub, body) => `<details class="elg-sec"><summary><span class="elg-ic">${emo}</span><span class="elg-tt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span></summary><div>${body}</div></details>`;
    const G = [
      ["🚀", "Los geht's", "in 2 Minuten eingerichtet", `<p>1. ⚙️ → <b>Kalender</b>: deinen Kalender wählen, in dem jeden Tag ein Termin „Arbeiten“ steht.<br>2. ⚙️ → <b>Bezahlte Stunden</b>: wie viele Stunden dein Chef pro Monat bezahlt (z. B. 175).<br>3. Fertig. 🎉 Ab jetzt rechnet die Karte dein Überstunden-Konto.</p>`],
      ["⏱", "Kommen & Gehen", "zwei Felder, ⏱️ oder Handy", `<p>Unter <b>Heute</b> stehen oben zwei Felder: <b>Kommen</b> und <b>Gehen</b>. Antippen, Uhrzeit ändern – fertig, der Tag ist eingetragen und die Pause abgezogen. ⏱️ neben „Kommen“ stempelt jetzt ein (die Stunden laufen mit), ⏱️ neben „Gehen“ stempelt aus. Noch bequemer: ⚙️ → <b>Stempeln per Handy</b>, dann macht das dein Handy, sobald du in die Zone „Arbeit“ kommst bzw. sie verlässt.</p>`],
      ["📅", "Der Kalender", "lesen und zurückschreiben", `<p>Die Karte holt sich alle 15 Minuten den Termin „Arbeiten“ (Anfang, Ende, Notiz und „(+0,50 h Pause)“). Mit <b>„Änderungen in den Kalender schreiben“</b> geht es auch andersrum: Was du in der Karte einträgst, landet im Termin. Krank oder Urlaub? Dann verschwindet der Arbeits-Termin. Fehlt ein Termin, legt die Karte ihn wieder an, und mit <b>„Alle Tage in den Kalender schreiben“</b> holst du einen ganzen Zeitraum nach.</p><p>✋ Einen Tag, den du in der Karte geändert hast, fasst der Kalender nie wieder an.</p>`],
      ["✍", "Tag eintragen oder ändern", "antippen, ändern, speichern", `<p>Tippe auf einen Tag (unter <b>Heute</b> oder <b>Monat</b>). Oben wählst du die Art: <b>Arbeit, Urlaub, Krank, Feiertag, Frei</b> oder <b>Pauschal</b> (z. B. Samstag für feste Euro – zählt nicht zu den Stunden). Pause leer lassen = automatisch.</p>`],
      ["⚖", "So rechnet das Konto", "wie auf dem Papier-Zettel", `<p><b>Summe</b> aller Stunden im Monat − <b>Bezahlt</b> (z. B. 175) = <b>Plus/Minus</b>.<br><b>Ü.-Alt</b> (Stand vom Vormonat) + Plus/Minus + Korrektur = <b>Ü.-Gesamt</b>.</p><p>Im laufenden Monat zeigt <b>„Konto heute“</b> den fairen Stand: Das Soll wird nur für die Arbeitstage bis heute gerechnet. Monate ganz ohne Einträge zählen nicht mit.</p>`],
      ["☕", "Pausen", "automatisch nach Regel", `<p>⚙️ → <b>Pausen-Regeln</b>. Standard: mehr als 0 Std. da → 0,25 Pause, mehr als 6 Std. → 0,50 Pause. Also 6:30–12:00 = 5,25 Std. und 6:30–16:15 = 9,25 Std.</p><p>Oder <b>nach Uhrzeit beim Gehen</b>: z. B. gehen bis 12:00 → 0,25 Pause, gehen nach 12:00 → 0,50 Pause. Beim Umschalten stellt die Karte die Standard-Regeln passend um.</p>`],
      ["💶", "Lohnabrechnung", "Ü.-Alt vom Chef eintragen", `<p>Unter <b>Monat → Lohnabrechnung / Korrektur</b> trägst du bei <b>Ü.-Alt laut Lohnabrechnung</b> den Überstunden-Stand vom Chef ein. Ab dann rechnet die Karte mit seiner Zahl weiter. Im Zettel siehst du klein, was die Karte selbst gerechnet hätte und wie groß die Abweichung ist.</p><p>Am Monatsanfang erinnert dich die Karte unter Heute daran (abschaltbar unter ⚙️ → Bezahlte Stunden).</p>`],
      ["📊", "Statistik", "Kurven, Wochentage, Rekorde", `<p>Der Reiter <b>Statistik</b> zeigt dein Überstunden-Konto als Kurve, die Stunden pro Monat mit Soll-Linie, deine Wochentage (wie lange im Schnitt, wann meistens Feierabend), Urlaub und Krank pro Jahr und deine Rekorde. Oben wählst du ein Jahr oder <b>Alle Jahre</b>.</p>`],
      ["🗓", "Korrektur & Soll", "ausgezahlt, geschenkt, anderer Monat", `<p>Unter <b>Monat</b> → <b>Korrektur / Soll</b>: z. B. „−20, ausgezahlt“. Oder für genau diesen Monat ein anderes Soll. Früher wurden weniger Stunden bezahlt? ⚙️ → <b>Bezahlte Stunden</b> → <b>Früher anders</b>.</p>`],
      ["📥", "Alten Zettel übernehmen", "einfach Text einfügen", `<p>⚙️ → <b>Import</b>: In Google Tabellen alles markieren, kopieren, einfügen, <b>Vorschau</b>, <b>Übernehmen</b>. Aus Google Tabellen oder Excel kommen auch die Monatswerte mit (Summe, Ü.-Alt, Ü.-Gesamt, 8 Stunden und →) – jeder alte Monat sieht dann genau so aus wie auf dem Zettel. Fehlen die, stellst du mit <b>„Konto stellen“</b> den Stand eines Monats ein.</p>`],
      ["🖨", "Drucken, Teilen & CSV", "für den Chef oder die Steuer", `<p>Unter <b>Monat</b> oder <b>Jahr</b> → <b>Drucken & Teilen</b>: als PDF (z. B. per WhatsApp oder Mail, auf dem iPhone über Teilen → Drucken), direkt drucken oder als Text. <b>CSV</b> (für Excel) gibt es unter Monat. Unter ⚙️ → Import & Sicherung gibt es <b>alles</b> als CSV.</p>`],
      ["📱", "Offline-App", "stempeln ohne Netz", `<p>⚙️ → <b>App & Info → Offline-App</b>: Adresse aufs Handy, einmal anmelden, „Zum Startbildschirm hinzufügen“. Ohne Netz landet alles im <b>Postausgang</b> (oben „⏳ 1 wartet“) und geht raus, sobald wieder Netz da ist – mit der Uhrzeit vom Knopfdruck.</p>`],
      ["🔒", "PIN & Schloss", "⚙️ oder alles sperren", `<p>⚙️ → <b>App & Info → Schutz</b>: PIN festlegen. Dann fragt ⚙️ nach der PIN, mit <b>„Ganze Karte sperren“</b> sogar alles. Das Schloss oben rechts sperrt sofort, nach 10 Minuten ohne Tippen sperrt es von selbst.</p>`],
      ["🤖", "Für Automationen", "Sensoren und Aktionen", `<p>Sensoren: <code>sensor.stundenzettel_ueberstunden</code>, <code>sensor.stundenzettel_stunden_diesen_monat</code>, <code>sensor.stundenzettel_resturlaub</code>, <code>sensor.stundenzettel_kranktage_dieses_jahr</code>, <code>binary_sensor.stundenzettel_eingestempelt</code>.<br>Aktionen: <code>stundenzettel.kommen</code>, <code>stundenzettel.gehen</code>, <code>stundenzettel.tag_eintragen</code>, <code>stundenzettel.abgleichen</code>, <code>stundenzettel.daten_abrufen</code>.</p>`],
    ];
    return `<div class="elg"><h2>⏱️ So funktioniert der Stundenzettel</h2>
      <p class="elg-sub">Tipp auf eine Überschrift klappt sie auf. Diese Anleitung findest du immer über den Knopf <b>📖 Anleitung</b> unter der Karte.</p>
      <input type="search" class="elg-q" placeholder="🔎 In dieser Anleitung suchen, z. B. Pause" aria-label="In dieser Anleitung suchen" autocomplete="off" enterkeyhint="search"><p class="elg-none" hidden>Nichts gefunden 🤷 – versuch ein anderes Wort.</p>
      ${sec("🆕", "Was ist neu", "die letzten Neuerungen", this._newsHtml())}
      ${G.map((g) => sec(...g)).join("")}
      ${sec("🙏", "Credits", "wer das gemacht hat", this._creditsHtml())}</div>`;
  }

  // ---------------------------------------------------------------- 📤 Drucken & Teilen (wie beim Kegelclub): Monat oder Jahr als PDF, Druck oder Text
  _shareModel() {
    const sh = this._share, d = this._d, st = this._st;
    if (sh.kind === "year") {
      const y = sh.key;
      const rows = (d.months || []).filter((m) => m.month.startsWith(y)).map((m) => (m.now != null ? { ...m, paid: m.paid_today, diff: m.hours - m.paid_today, total: m.now } : m));
      const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
      const vac = (Number(st.vacation_days) || 0) + (Number((st.vacation_carry || {})[y]) || 0);
      const last = rows.filter((r) => !r.future).slice(-1)[0];
      return {
        title: `Stundenzettel ${y}`, sub: `Übersicht pro Monat · Stand ${dm(d.today)}${d.today.slice(0, 4)}`, big: last ? `${hs(last.total)} Std.` : "",
        cols: [{ t: "Monat", x: 0, w: 110 }, { t: "Stunden", x: 110, w: 70, right: true }, { t: "Soll", x: 185, w: 70, right: true }, { t: "+/-", x: 260, w: 70, right: true }, { t: "Konto", x: 335, w: 80, right: true }, { t: "Urlaub", x: 420, w: 50, right: true }, { t: "Krank", x: 473, w: 50, right: true }],
        rows: rows.map((r) => ({ gray: !r.tracked, cells: [MONTHS[Number(r.month.slice(5)) - 1], h2(r.hours), r.future ? "" : h2(r.paid), r.future ? "" : hs(r.diff + r.adjust), r.future ? "kommt noch" : hs(r.total), String(r.urlaub || ""), String(r.krank || "")] })),
        sums: [["Stunden gesamt", h2(sum("hours"))], ["Urlaub genommen", `${sum("urlaub")} / ${vac}`], ["Kranktage", String(sum("krank"))], [`Tage ab ${h2(st.long_day).replace(",00", "")} Std.`, String(sum("long"))], ...(last ? [["Überstunden-Konto", `${hs(last.total)} Std.`, true]] : [])],
      };
    }
    const key = sh.key, [y, mo] = key.split("-").map(Number), last = new Date(y, mo, 0).getDate();
    const row = this._rowOf(key) || { hours: 0, paid: 0, diff: 0, old: 0, total: 0, urlaub: 0, krank: 0, long: 0, adjust: 0, euro: 0 };
    const rows = Array.from({ length: last }, (_, i) => isoOf(y, mo, i + 1)).map((iso) => {
      const e = d.days[iso], dt = `${WD[wdOf(iso)]} ${dm(iso)}`;
      if (!e) return { gray: true, cells: [dt, this._plan(iso) ? "" : "frei", "", "", ""] };
      if (e.kind === "work") return { cells: [dt, `${e.start || "?"} - ${e.end || "?"}`, h2(e.pause), h2(e.hours), e.note || ""] };
      return { cells: [dt, KIND[e.kind]?.[1] || e.kind, "", e.kind === "pauschal" ? eur(e.amount) : h2(e.hours), e.note || ""] };
    });
    const now = row.now != null;
    return {
      title: `Stundenzettel ${monthName(key)}`, sub: now ? `Monat läuft noch · Stand ${dm(d.today)}${d.today.slice(0, 4)} (Soll bis heute)` : "", big: `${h2(row.hours)} Std.`,
      cols: [{ t: "Datum", x: 0, w: 75 }, { t: "Uhrzeit / Art", x: 78, w: 105 }, { t: "Pause", x: 186, w: 45, right: true }, { t: "Stunden", x: 236, w: 55, right: true }, { t: "Notiz", x: 302, w: 221 }],
      rows,
      sums: [["Summe", `${h2(row.hours)} Std.`], [now ? "Soll bis heute" : "Bezahlt (Soll)", `-${h2(now ? row.paid_today : row.paid)} Std.`], ["Plus/Minus", hs(row.hours - (now ? row.paid_today : row.paid))], ["Ü.-Alt (Vormonat)", hs(row.old)], ...(row.adjust ? [["Korrektur", hs(row.adjust)]] : []), [now ? "Stand heute" : "Ü.-Gesamt", `${hs(now ? row.now : row.total)} Std.`, true], ["Urlaubstage", String(row.urlaub)], ["Kranktage", String(row.krank)], [`${h2(st.long_day).replace(",00", "")} Stunden und mehr`, String(row.long)], ...(row.euro ? [["Pauschal", eur(row.euro)]] : [])],
    };
  }
  _sharePdfBytes(m = this._shareModel()) { return szTablePdf(m); }
  _shareText(m) {
    const out = [`⏱️ ${m.title}`, ""];
    for (const r of m.rows) { if (r.gray && !r.cells.slice(1).some(Boolean)) continue; out.push(r.cells.filter(Boolean).join(" · ")); }
    out.push("", ...m.sums.map(([l, v]) => `${l}: ${v}`));
    return out.join("\n");
  }
  _sharePage() {
    const m = this._shareModel();
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (/Macintosh/i.test(navigator.userAgent || "") && (navigator.maxTouchPoints || 0) > 1);
    const tbl = `<table class="ytab shprev"><thead><tr>${m.cols.map((c) => `<th>${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${m.rows.map((r) => `<tr class="${r.gray ? "gap" : ""}">${r.cells.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <div class="zettel" style="margin-top:10px">${m.sums.map(([l, v, s]) => `<div class="zr ${s ? "tot" : ""}"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join("")}</div>`;
    return { icon: "share-variant-outline", color: "#546e7a", title: "Drucken & Teilen", html: `
      <div class="prchoice">${apple ? "" : `<button class="btn" data-a="shprint">${ic("printer-outline")}Drucken</button>`}<button class="btn ${apple ? "main" : ""}" data-a="shpdf">${ic("file-pdf-box")}${apple ? "PDF drucken / teilen" : "PDF teilen / speichern"}</button>${navigator.share ? `<button class="btn" data-a="shtext">${ic("message-text-outline")}Als Text teilen</button>` : ""}<button class="btn" data-a="shcopy">${ic("content-copy")}Text kopieren</button></div>
      <p class="small">${apple ? "Auf iPhone und iPad geht Drucken über die PDF: Teilen-Menü → Drucken." : "Vorschau:"} <b>${esc(m.title)}</b></p><div class="kcprev">${tbl}</div>` };
  }
  _shareHtmlDoc(m) {
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(m.title)}</title><style>@page{size:A4;margin:14mm}
      body{font-family:Roboto,Arial,sans-serif;font-size:11.5px;margin:0;color:#000} h1{font-size:18px;margin:0 0 2px} .sub{color:#666;margin:0 0 8px} table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #ccc;padding:3px 5px;text-align:left;vertical-align:top} th{font-size:10px;color:#666;border-bottom:1.5px solid #999}
      tr.gap td{color:#999} .sum{margin:10px 0 0 auto;width:auto} .sum td{border:0;padding:2px 6px} .sum td:last-child{text-align:right;font-weight:bold} .sum tr.tot td{color:#1e88e5;font-size:13px}</style></head><body>
      <h1>${esc(m.title)}</h1>${m.sub ? `<p class="sub">${esc(m.sub)}</p>` : ""}<table><thead><tr>${m.cols.map((c) => `<th${c.right ? ' style="text-align:right"' : ""}>${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${m.rows.map((r) => `<tr class="${r.gray ? "gap" : ""}">${r.cells.map((v, k) => `<td${m.cols[k].right ? ' style="text-align:right"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <table class="sum">${m.sums.map(([l, v, s]) => `<tr class="${s ? "tot" : ""}"><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join("")}</table></body></html>`;
  }
  _sharePrint() {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:182mm;height:263mm;border:0;visibility:hidden;";
    f.srcdoc = this._shareHtmlDoc(this._shareModel());
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) { this._toast("Drucken geht hier nicht – nimm „PDF“."); } setTimeout(() => f.remove(), 60000); };
    document.body.append(f);
  }
  async _sharePdf() { // 📄 iPhone/iPad = Teilen-Menü (dort Drucken per AirPrint), HA-App = kurz von Home Assistant bereitgestellt, sonst Herunterladen
    const m = this._shareModel(), bytes = this._sharePdfBytes(m);
    const name = `Stundenzettel-${this._share.key}.pdf`;
    const file = typeof File === "function" ? new File([bytes], name, { type: "application/pdf" }) : null;
    const touch = (navigator.maxTouchPoints || 0) > 0 || /iPhone|iPad|Android/i.test(navigator.userAgent || "");
    if (this._hass?.auth?.external && !this._app) {
      try {
        let bin = "";
        for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
        const r = await this._hass.callWS({ type: "stundenzettel/pdf/store", data: btoa(bin), name });
        window.open(this._hass?.hassUrl ? this._hass.hassUrl(r.url) : new URL(r.url, location.origin).href, "_blank");
        this._toast("📄 PDF geöffnet – dort über Teilen drucken oder sichern");
      } catch (err) { this._toast("⚠️ " + (err?.message || "PDF ging nicht")); }
      return;
    }
    if (touch && file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: m.title }); return; } catch (err) { if (err?.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    this._toast("📄 PDF gespeichert – öffnen und drucken");
  }
  // ---------------------------------------------------------------- 🖨️ Drucken & CSV
  _csv(keys) {
    const rows = [["Datum", "Wochentag", "Art", "Von", "Bis", "Pause", "Stunden", "Betrag", "Notiz"]];
    const days = this._d.days;
    for (const iso of Object.keys(days).sort()) {
      if (keys && !keys(iso)) continue;
      const e = days[iso];
      rows.push([`${dm(iso)}${iso.slice(0, 4)}`, WD[wdOf(iso)], KIND[e.kind]?.[1] || e.kind, e.start || "", e.end || "", e.kind === "work" ? h2(e.pause) : "", e.kind === "pauschal" ? "" : h2(e.hours), e.kind === "pauschal" ? h2(e.amount) : "", (e.note || "").replace(/\s+/g, " ")]);
    }
    return "﻿" + rows.map((r) => r.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(";")).join("\r\n");
  }
  _download(name, text, type = "text/csv;charset=utf-8") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  _print() {
    const [y, m] = this._month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const row = this._rowOf(this._month);
    const lines = Array.from({ length: last }, (_, i) => isoOf(y, m, i + 1)).map((iso) => {
      const e = this._d.days[iso];
      if (!e) return this._plan(iso) ? `<tr><td>${WD[wdOf(iso)]} ${dm(iso)}</td><td></td><td></td><td></td></tr>` : `<tr class="we"><td>${WD[wdOf(iso)]} ${dm(iso)}</td><td>Wochenende</td><td></td><td></td></tr>`;
      return `<tr><td>${WD[wdOf(iso)]} ${dm(iso)}</td><td>${e.kind === "work" ? `${esc(e.start)} – ${esc(e.end)}` : KIND[e.kind][1]}</td><td>${e.kind === "pauschal" ? eur(e.amount) : h2(e.hours)}</td><td>${esc(e.note || "")}</td></tr>`;
    }).join("");
    const r = row || { hours: 0, paid: 0, diff: 0, old: 0, total: 0, urlaub: 0, krank: 0, long: 0, adjust: 0 };
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Stundenzettel ${monthName(this._month)}</title><style>
      body{font-family:Roboto,Arial,sans-serif;font-size:12px;margin:18px;color:#000} h1{font-size:18px;margin:0 0 10px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #999;padding:3px 6px;text-align:left}
      td:nth-child(3){text-align:right} tr.we td{color:#888} .sum{margin-top:10px;width:auto} .sum td{min-width:120px} .sum td:last-child{text-align:right;font-weight:bold}</style></head><body>
      <h1>Stundenzettel – ${monthName(this._month)}</h1><table><thead><tr><th>Datum</th><th>Uhrzeit</th><th>Stunden</th><th>Notiz</th></tr></thead><tbody>${lines}</tbody></table>
      <table class="sum"><tr><td>Summe</td><td>${h2(r.hours)}</td></tr><tr><td>Bezahlt</td><td>−${h2(r.paid)}</td></tr><tr><td>Plus/Minus</td><td>${hs(r.diff)}</td></tr><tr><td>Ü.-Alt</td><td>${hs(r.old)}</td></tr>${r.adjust ? `<tr><td>Korrektur</td><td>${hs(r.adjust)}</td></tr>` : ""}<tr><td>Ü.-Gesamt</td><td>${hs(r.total)}</td></tr><tr><td>Urlaubstage</td><td>${r.urlaub}</td></tr><tr><td>Kranktage</td><td>${r.krank}</td></tr><tr><td>${h2(this._st.long_day).replace(",00", "")} Stunden und →</td><td>${r.long}</td></tr></table></body></html>`;
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.append(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) { this._toast("Drucken geht hier leider nicht – nimm CSV"); } setTimeout(() => f.remove(), 60000); }, 300);
  }

  // ---------------------------------------------------------------- 👆 Klicks
  _bind() {
    const root = this.shadowRoot;
    root.querySelectorAll("input,textarea,select").forEach((el) => el.addEventListener("blur", () => {
      setTimeout(() => { if (this._pending && !["INPUT", "TEXTAREA", "SELECT"].includes(root.activeElement?.tagName)) { this._pending = false; this._render(); } }, 150);
    }));
    root.querySelectorAll("form").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); this._submit(f); }));
    const gsecs = [...root.querySelectorAll("details.elg-sec")];
    let searching = false;
    gsecs.forEach((x) => x.addEventListener("toggle", () => { if (x.open && !searching) gsecs.forEach((o) => { if (o !== x) o.open = false; }); }));
    const gq = root.querySelector(".elg-q");
    if (gq) {
      const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
      const texts = gsecs.map((x) => norm(x.textContent));
      gq.addEventListener("input", () => {
        const words = norm(gq.value).split(/\s+/).filter(Boolean);
        searching = words.length > 0;
        let hits = 0;
        gsecs.forEach((x, i) => { const hit = !words.length || words.every((w) => texts[i].includes(w)); x.hidden = !hit; x.open = !!words.length && hit; if (hit && words.length) hits++; });
        root.querySelector(".elg-none").hidden = !words.length || hits > 0;
      });
    }
    const imp = root.getElementById("imptext");
    if (imp) imp.addEventListener("input", () => { this._impText = imp.value; });
    const rf = root.getElementById("restorefile");
    if (rf) rf.addEventListener("change", () => this._restore(rf.files?.[0]));
    const bf = root.getElementById("bossfile");
    if (bf) bf.addEventListener("change", () => this._bossImport(bf.files?.[0]));
    root.querySelectorAll("[data-a]").forEach((el) => {
      if (el.tagName === "FORM") return;
      const ev = el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" ? "change" : "click";
      el.addEventListener(ev, (e) => { e.stopPropagation(); if (el.tagName === "A" || el.dataset.a === "finfo") e.preventDefault(); this._act(el, e); });
    });
  }
  _redraw() { this._force = true; this._render(); }
  _undoFor(label, op) {
    clearTimeout(this._undoT);
    this._undo = { label, op };
    this._undoT = setTimeout(() => { this._undo = null; this._redraw(); }, 8000);
  }
  async _act(el) {
    const a = el.dataset.a, v = el.dataset.v, iso = el.dataset.d;
    const d = this._d, st = this._st;
    switch (a) {
      case "tab": this._view = v; this._sheet = null; this._share = null; this._open = null; this._fkind = null; this._monthForm = false; if (this._pad?.step !== "unlock") this._pad = null; return this._redraw();
      case "back":
        if (this._share && !this._pad) { this._share = null; return this._redraw(); }
        if (this._pad) { const back = this._pad.back; this._pad = null; if (back !== "sheet") { this._view = "heute"; this._sheet = null; } }
        else if (this._view === "set" && this._sheet) this._sheet = null; else this._view = "heute";
        this._addRule = this._addPeriod = false; return this._redraw();
      case "lock": {
        const appLock = this._app && window.__szAppLock?.on?.();
        if (appLock) { PIN_LOCK.until = 0; this._pad = null; this._sheet = null; this._view = "heute"; this._open = null; this._redraw(); window.__szAppLock.now(); return; }
        if (!d?.pin) { this._toast("🔒 Erst eine PIN festlegen – dann sperrt das Schloss ⚙️"); this._view = "set"; this._sheet = "pin"; this._pad = null; }
        else if (pinOpen()) { PIN_LOCK.until = 0; this._pad = null; this._toast("🔒 Gesperrt"); if (this._view === "set") { this._view = "heute"; this._sheet = null; } }
        else this._view = "set";
        this._open = null; return this._redraw();
      }
      case "pkey": return this._padPress(v);
      case "padstart": this._pad = { purpose: v, step: d.pin ? "old" : "new", buf: "", back: "sheet" }; return this._redraw();
      case "peek": clearTimeout(this._peekT); this._peek = { key: v, until: Date.now() + 4000 }; el.classList?.add("peek"); this._peekT = setTimeout(() => { this._peek = null; this.shadowRoot.querySelectorAll(".veil.peek").forEach((x) => x.classList.remove("peek")); }, 4000); return;
      case "undo": if (this._undo) { const ops = [].concat(this._undo.op); clearTimeout(this._undoT); this._undo = null; this._send(...ops); } return this._redraw();
      case "setcalm": store.put(CALMKEY, !!el.checked); return this._redraw();
      case "theme": try { v === "auto" ? localStorage.removeItem(THEMEKEY) : localStorage.setItem(THEMEKEY, v); } catch (_) { /* egal */ } if (v === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v); return this._redraw();
      case "appcopy": { const inp = this.shadowRoot.getElementById("appUrl"); szCopy(d.app_url || "", inp).then(() => this._toast("📋 Adresse kopiert")); return; }
      case "setview": return this._set("view", { ...(st.view || {}), [v]: !!el.checked });
      case "finfo": { // ⓘ auf-/zuklappen, ohne neu zu zeichnen
        this._tipOpen = this._tipOpen || new Set();
        const open = !this._tipOpen.has(v);
        if (open) this._tipOpen.add(v); else this._tipOpen.delete(v);
        this.shadowRoot.querySelectorAll(`.fhint[data-tip="${v}"]`).forEach((h) => { h.hidden = !open; });
        el.setAttribute("aria-expanded", String(open));
        return;
      }
      case "setgrp": this._setOpen = this._setOpen === v ? null : v; return this._redraw();
      case "sheet": this._view = "set"; this._sheet = v; return this._redraw();
      case "reload": location.reload(); return;
      case "in": return this._send({ type: "stamp_in", ts: Date.now() });
      case "out": return this._send({ type: "stamp_out", ts: Date.now() });
      case "cancelstamp": if (szConfirm("Stempeln abbrechen? Es wird nichts eingetragen.")) this._send({ type: "stamp_cancel" }); return;
      case "open": this._open = this._open === iso ? null : iso; this._fkind = null; return this._redraw();
      case "close": this._open = null; this._fkind = null; return this._redraw();
      case "fkind": this._fkind = v; return this._redraw();
      case "delday": {
        const old = d.days[iso];
        this._open = null;
        this._send({ type: "day_delete", date: iso });
        if (old) { // ↩️ statt „Wirklich löschen?“: 8 Sekunden Rückgängig (wie bei der Einkaufsliste)
          const back = { type: "day_set", date: iso, kind: old.kind };
          for (const k of ["start", "end", "amount", "note"]) if (old[k] != null && old[k] !== "") back[k] = old[k];
          if (old.kind === "work" && old.source !== "calendar" && old.pause != null) back.pause = old.pause;
          if (["urlaub", "krank", "feiertag"].includes(old.kind) && old.source === "card" && old.hours != null) back.hours = old.hours;
          this._undoFor(`🗑️ ${dm(iso)} gelöscht`, back);
        }
        return this._redraw();
      }
      case "quick": {
        const p = this._plan(iso);
        const op = v === "plan" && p ? { kind: "work", start: p[0], end: p[1] } : { kind: v };
        return this._send({ type: "day_set", date: iso, ...op });
      }
      case "mon": { const [y, m] = this._month.split("-").map(Number); const t = new Date(y, m - 1 + Number(v), 1); this._month = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`; this._open = null; this._monthForm = false; return this._redraw(); }
      case "year": this._year += Number(v); return this._redraw();
      case "gomonth": this._month = v; this._view = "monat"; return this._redraw();
      case "monthform": this._monthForm = !this._monthForm; return this._redraw();
      case "payslip": this._month = v; this._view = "monat"; this._monthForm = true; this._open = null; return this._redraw();
      case "payslipno": store.put("sz_payslip_no", v); return this._redraw();
      case "unsheet": if (szConfirm("Diesen Monat mit den Tagen in der Karte neu rechnen statt mit den Zahlen vom alten Zettel?")) this._send({ type: "month_set", month: this._month, sheet: null }); return;
      case "statyear": this._statYear = el.value; return this._redraw();
      case "kg": {
        const root = this.shadowRoot, iso = d.today, e = d.days[iso];
        const a = root.querySelector('input[data-a="kg"][data-v="start"]')?.value, b = root.querySelector('input[data-a="kg"][data-v="end"]')?.value;
        if (!a || !b) return this._toast("⚠️ Bitte Kommen und Gehen eintragen");
        const op = { type: "day_set", date: iso, kind: "work", start: a, end: b, note: e?.note || "" };
        if (e?.kind === "work" && e.pause_set && e.source !== "calendar") op.pause = e.pause;
        const ops = d.stamp ? [{ type: "stamp_cancel" }, op] : [op];
        if (await this._send(...ops)) this._toast(`✅ Heute ${a}–${b} eingetragen`);
        return;
      }
      case "kgnow": {
        if (v === "start") { if (!d.stamp) { this._send({ type: "stamp_in", ts: Date.now() }); this._toast("⏱️ Eingestempelt – schönen Arbeitstag!"); } return; }
        if (d.stamp) { this._send({ type: "stamp_out", ts: Date.now() }); this._toast("🏁 Ausgestempelt – Feierabend!"); return; }
        const t = new Date(), rd = Number(st.round) || 0; let m = t.getHours() * 60 + t.getMinutes(); if (rd) m = Math.round(m / rd) * rd;
        const inp = this.shadowRoot.querySelector('input[data-a="kg"][data-v="end"]'); if (inp) inp.value = szHhmm(Math.min(m, 1439));
        return this._act({ dataset: { a: "kg" } });
      }
      case "print": return this._print();
      case "share": this._share = v === "year" ? { kind: "year", key: String(this._year) } : { kind: "month", key: this._month }; return this._redraw();
      case "shprint": return this._sharePrint();
      case "shpdf": return this._sharePdf();
      case "shtext": if (navigator.share) navigator.share({ text: this._shareText(this._shareModel()) }).catch(() => {}); return;
      case "shcopy": szCopy(this._shareText(this._shareModel())).then(() => this._toast("📋 Text kopiert")); return;
      case "csv": return this._download(`stundenzettel-${this._month}.csv`, this._csv((x) => x.startsWith(this._month)));
      case "csvall": return this._download("stundenzettel-alles.csv", this._csv());
      case "sync": {
        try { const r = await this._hass.callWS({ type: "stundenzettel/sync" }); this._toast(r?.cal?.ok === false ? `⚠️ ${r.cal.error}` : `🔁 Abgeglichen – ${r.read || 0} Tage neu aus dem Kalender`); } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
        return;
      }
      case "setb": if (v === "_overwrite") { this._overwrite = el.checked; return; } return this._set(v, el.checked);
      case "setn": { const n = toNum(el.value); if (n == null || Number.isNaN(n)) { this._toast("⚠️ Bitte eine Zahl eintragen"); return this._redraw(); } return this._set(v, n); }
      case "setcarry": { const n = toNum(el.value); if (n == null || Number.isNaN(n)) { this._toast("⚠️ Bitte eine Zahl eintragen"); return this._redraw(); } return this._set("vacation_carry", { ...(st.vacation_carry || {}), [v]: n }); }
      case "sets": return this._set(v, el.value);
      case "round": return this._set("round", Number(v));
      case "addrule": this._addRule = !this._addRule; return this._redraw();
      case "pauseby": { // ☕ beim Wechsel auf „Uhrzeit“ die Standard-Regeln passend umstellen (6 Std. → 12 Uhr)
        if (v === (st.pause_by || "dauer")) return;
        const rules = st.pause_rules || [], std = (a, b) => rules.length === 2 && rules.some((r) => r.from === 0 && r.pause === 0.25) && rules.some((r) => r.from === a && r.pause === b);
        const ok = await this._set("pause_by", v);
        if (ok && v === "ende" && std(6, 0.5)) await this._set("pause_rules", [{ from: 0, pause: 0.25 }, { from: 12, pause: 0.5 }]);
        if (ok && v === "dauer" && std(12, 0.5)) await this._set("pause_rules", [{ from: 0, pause: 0.25 }, { from: 6, pause: 0.5 }]);
        return this._redraw();
      }
      case "delrule": return this._set("pause_rules", (st.pause_rules || []).filter((_, i) => i !== Number(v)));
      case "addperiod": this._addPeriod = !this._addPeriod; return this._redraw();
      case "delperiod": return this._set("paid_until", (st.paid_until || []).filter((_, i) => i !== Number(v)));
      case "deloldperiod": return this._set("paid_periods", (st.paid_periods || []).filter((_, i) => i !== Number(v)));
      case "impprev": case "impgo": {
        const text = this.shadowRoot.getElementById("imptext")?.value || this._impText || "";
        if (!text.trim()) { this._toast("Erst Text einfügen 🙂"); return; }
        this._impText = text;
        try { this._impPrev = await this._hass.callWS({ type: "stundenzettel/import", text, apply: a === "impgo", overwrite: !!this._overwrite }); if (a === "impgo") this._toast(`✅ ${this._impPrev.applied} Tage übernommen`); } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
        return this._redraw();
      }
      case "backup": {
        try { const b = await this._hass.callWS({ type: "stundenzettel/backup" }); this._download(`stundenzettel-sicherung-${d.today}.json`, JSON.stringify(b, null, 1), "application/json"); } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
        return;
      }
      case "restore": this.shadowRoot.getElementById("restorefile")?.click(); return;
      case "bosspick": this.shadowRoot.getElementById("bossfile")?.click(); return;
      case "bossalt": { const b = ((d.months_meta || {})[this._month] || {}).boss; if (b?.saldo_vm != null) { this._send({ type: "month_set", month: this._month, alt: b.saldo_vm }); this._toast(`💶 Ü.-Alt = ${hs(b.saldo_vm)} (laut Chef)`); } return; }
      case "bossdel": if (szConfirm("Zettel vom Chef für diesen Monat entfernen? Deine Tage bleiben, wie sie sind.")) this._send({ type: "month_set", month: this._month, boss: null }); return;
      case "errclear": await this._hass.callWS({ type: "stundenzettel/errors_clear" }); return;
      case "factory": if (!szConfirm("Wirklich ALLES löschen? Das geht nicht rückgängig.")) return; await this._hass.callWS({ type: "stundenzettel/factory_reset" }); this._toast("💣 Alles gelöscht"); this._view = "heute"; this._sheet = null; return this._redraw();
      default: return undefined;
    }
  }
  async _bossImport(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this._toast("⚠️ Die Datei ist zu groß – ein Zettel hat meist unter 1 MB"); return; }
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      const r = await this._hass.callWS({ type: "stundenzettel/boss_import", data: btoa(bin) });
      if (r.month && r.month !== this._month) this._month = r.month;
      this._toast(`📄 Zettel für ${monthName(r.month)} eingelesen (${r.days} Tage)`);
      this._redraw();
    } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
  }
  async _restore(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!szConfirm(`Sicherung mit ${Object.keys(data.days || {}).length} Tagen einspielen? Alles Jetzige wird ersetzt.`)) return;
      await this._hass.callWS({ type: "stundenzettel/restore", data });
      this._toast("💾 Sicherung eingespielt");
    } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
  }
  async _submit(f) {
    const fd = Object.fromEntries(new FormData(f).entries());
    const kind = f.dataset.form;
    if (kind === "day") {
      const iso = f.dataset.d;
      const k = this._fkind || this._d.days[iso]?.kind || "work";
      const op = { type: "day_set", date: iso, kind: k, note: fd.note || "" };
      if (k === "work" || k === "pauschal") { op.start = fd.start || null; op.end = fd.end || null; }
      if (k === "work" && String(fd.pause || "").trim()) { const p = toNum(fd.pause); if (Number.isNaN(p)) return this._toast("⚠️ Pause bitte als Zahl, z. B. 0,5"); op.pause = p; }
      if (["urlaub", "krank", "feiertag"].includes(k) && String(fd.hours || "").trim()) op.hours = toNum(fd.hours);
      if (k === "pauschal") op.amount = toNum(fd.amount) || 0;
      if (await this._send(op)) { this._open = null; this._fkind = null; this._redraw(); }
    } else if (kind === "month") {
      const op = { type: "month_set", month: this._month, alt: toNum(String(fd.alt || "").replace("−", "-")), adjust: toNum(fd.adjust), paid: toNum(fd.paid), note: fd.note || "" };
      if (Number.isNaN(op.alt) || Number.isNaN(op.adjust) || Number.isNaN(op.paid)) return this._toast("⚠️ Bitte Zahlen eintragen");
      if (await this._send(op)) { this._monthForm = false; this._redraw(); }
    } else if (kind === "rule") {
      const r = { from: /^\d{1,2}:\d{2}$/.test(fd.from || "") ? szMin(fd.from) / 60 : toNum(fd.from), pause: toNum(fd.pause) };
      if ([r.from, r.pause].some((x) => x == null || Number.isNaN(x))) return this._toast("⚠️ Bitte Zahlen eintragen");
      if (await this._set("pause_rules", [...(this._st.pause_rules || []), r])) { this._addRule = false; this._redraw(); }
    } else if (kind === "period") {
      const p = { until: fd.until, hours: toNum(fd.hours) };
      if (!p.until || p.hours == null || Number.isNaN(p.hours)) return this._toast("⚠️ Monat und Stunden eintragen");
      if (await this._set("paid_until", [...(this._st.paid_until || []), p])) { this._addPeriod = false; this._redraw(); }
    } else if (kind === "plan") {
      const plan = {};
      for (let w = 1; w <= 7; w++) if (f.querySelector(`[name=on${w}]`).checked) plan[String(w)] = [fd[`a${w}`], fd[`b${w}`]];
      if (await this._set("plan", plan)) this._toast("✅ Gespeichert");
    } else if (kind === "calrange") {
      if (!fd.from || !fd.to) return this._toast("⚠️ Von und Bis eintragen");
      try { const r = await this._hass.callWS({ type: "stundenzettel/cal_write_range", from: fd.from, to: fd.to }); this._toast(`📤 ${r.queued} Tage werden in den Kalender geschrieben – das dauert einen Moment`); } catch (err) { this._toast("⚠️ " + (err?.message || err)); }
    } else if (kind === "fix") {
      const value = toNum(fd.value);
      if (!fd.month || value == null || Number.isNaN(value)) return this._toast("⚠️ Monat und Stand eintragen");
      if (await this._send({ type: "balance_fix", month: fd.month, value })) this._toast(`🎯 Konto Ende ${monthName(fd.month)} = ${hs(value)}`);
    }
    return undefined;
  }
}

// ✏️ Karten-Editor (Dashboard → Karte bearbeiten): Titel und Sprache
class StundenzettelCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._draw(); }
  set hass(hass) { this._hass = hass; }
  _set(key, value) {
    const c = { ...this._config };
    if (value === "" || value === false || value == null) delete c[key]; else c[key] = value;
    this._config = c;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: c }, bubbles: true, composed: true }));
  }
  _draw() {
    if (!this._config) return;
    const c = this._config;
    const box = "padding:8px;border-radius:8px;border:1px solid var(--divider-color,#ccc);background:var(--card-background-color,#fff);color:inherit;font:inherit";
    this.innerHTML = `<div style="display:grid;gap:12px;padding:4px 0">
      <label style="display:grid;gap:4px">Titel<input data-k="title" value="${esc(c.title || "")}" style="${box}"></label>
      <label style="display:grid;gap:4px">🌍 Sprache / Language<select data-k="language" style="${box}">${[["", "Automatisch (wie Home Assistant)"], ["de", "Deutsch"], ["en", "English"]].map(([v, t]) => `<option value="${v}" ${(c.language || "") === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <small style="opacity:.7">Alles andere stellst du direkt in der Karte unter ⚙️ ein.</small></div>`;
    this.querySelector('[data-k="title"]').addEventListener("change", (e) => this._set("title", e.target.value));
    this.querySelector('[data-k="language"]').addEventListener("change", (e) => this._set("language", e.target.value));
  }
}
if (!customElements.get("stundenzettel-card-editor")) customElements.define("stundenzettel-card-editor", StundenzettelCardEditor);
StundenzettelCard.mascotDeco = szMascotDeco; // 🧪 für Tests: welches Kostüm an welchem Tag

if (!customElements.get("stundenzettel-card")) {
  customElements.define("stundenzettel-card", StundenzettelCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "stundenzettel-card", name: "Stundenzettel", description: "Arbeitszeit, Überstunden-Konto, Urlaub und Krank – auch aus dem Kalender", preview: false, documentationURL: REPO });
  console.info(`%c ⏱️ STUNDENZETTEL %c v${SZ_VERSION} `, "background:#1e88e5;color:#fff;border-radius:4px 0 0 4px;padding:2px 4px", "background:#43a047;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px");
}
