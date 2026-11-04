// 🧪 Oberflächen-Test: Karte im echten Browser (ohne Home Assistant, mit AUSGEDACHTEN Daten)
// Prüft: keine JavaScript-Fehler, alle Reiter, Tag bearbeiten, alle ⚙️-Seiten, Anleitung. Optional Bilder: SHOTS=ordner
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/^\/stundenzettel\/files\//, "/custom_components/stundenzettel/www/"));
  try { const body = await readFile(p); res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }); res.end(body); }
  catch (_) { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/tests/ui/harness.html`;
const SHOTS = process.env.SHOTS;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fails = 0;
const ok = (cond, text) => { console.log(`${cond ? "✅" : "❌"} ${text}`); if (!cond) fails++; };

async function open(hash = "", width = 520) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || (m.type() === "warning" && /Symbol fehlt/.test(m.text()))) errors.push(m.text()); });
  await page.goto(base + hash);
  await page.waitForFunction(() => window.ready && document.getElementById("c1").shadowRoot?.querySelector(".tabs"));
  await page.waitForTimeout(300);
  return { page, errors };
}
const card = (page) => page.locator("#c1");
const click = async (page, sel) => { await card(page).locator(sel).first().click(); await page.waitForTimeout(120); };
const shot = async (page, name) => { if (SHOTS) await card(page).screenshot({ path: `${SHOTS}/${name}.png` }); };

{
  const { page, errors } = await open();
  const txt = async () => card(page).locator("ha-card").innerText();
  const heroTxt = await card(page).locator(".hero").first().innerText();
  ok(/Heute, Mittwoch 04\.11\./.test(heroTxt) && /Std\./.test(heroTxt) && /läuft/.test(heroTxt), "Heute: oben groß die Stunden von heute (läuft mit)");
  ok(/Std\. diesen Monat/.test(await txt()) && /Überstunden-Konto/.test(await txt()), "Heute: darunter Monat und Überstunden-Konto");
  const order = await card(page).locator("ha-card").evaluate((el) => { const t = el.innerText; return [t.indexOf("Heute, Mittwoch"), t.indexOf("Überstunden-Konto")]; });
  ok(order[0] >= 0 && order[0] < order[1], "Heute: Stunden heute stehen VOR dem Überstunden-Konto");
  ok(/Gehen – ausstempeln/.test(await txt()), "Heute: eingestempelt → Gehen-Knopf");
  await shot(page, "1-heute");
  await click(page, '[data-a="tab"][data-v="monat"]');
  ok(/Stand heute/.test(await txt()) && /Soll bis heute/.test(await txt()), "Monat (läuft noch): Soll nur bis heute");
  await shot(page, "2-monat");
  await click(page, '[data-a="mon"][data-v="-1"]');
  ok(/Oktober 2026/.test(await txt()) && /Ü\.-Gesamt/.test(await txt()) && /Bezahlt/.test(await txt()), "Vormonat: Zettel mit Summe/Bezahlt/Ü.-Gesamt");
  await shot(page, "2b-monat-oktober");
  await click(page, '[data-a="mon"][data-v="1"]');
  await click(page, '.dayrow[data-d="2026-11-03"]');
  ok(await card(page).locator('form[data-form="day"]').count() === 1, "Tag antippen öffnet das Formular");
  await shot(page, "3-tag-bearbeiten");
  await click(page, '[data-a="fkind"][data-v="krank"]');
  await click(page, 'form[data-form="day"] button[type="submit"]');
  await page.waitForTimeout(100);
  const sent = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(sent.some((o) => o.type === "day_set" && o.date === "2026-11-03" && o.kind === "krank"), "Speichern schickt day_set (krank)");
  await click(page, '[data-a="tab"][data-v="jahr"]');
  ok(/Okt/.test(await txt()) && /Σ/.test(await txt()), "Jahr: Tabelle mit Summe");
  await shot(page, "4-jahr");
  await click(page, '[data-a="tab"][data-v="set"]');
  for (const grp of ["Arbeitszeit", "Kalender & Stempeln", "Daten", "Ansicht", "App & Info"]) {
    await click(page, `[data-a="setgrp"][data-v="${grp}"]`);
    const keys = await card(page).locator('[data-a="sheet"]').evaluateAll((els) => els.map((e) => e.dataset.v));
    for (const k of keys) {
      await click(page, `.lrow[data-v="${k}"]`);
      ok(await card(page).locator(".pagehost").count() === 1, `⚙️ ${grp} → ${k} öffnet sich`);
      if (SHOTS && ["cal", "work", "imp", "mascot", "pin", "app"].includes(k)) await shot(page, `5-einstellungen-${k}`);
      await click(page, '[data-a="back"]');
    }
  }
  await click(page, '[data-a="setgrp"][data-v="Kalender & Stempeln"]');
  await shot(page, "5-einstellungen");
  await click(page, '.foot [data-v="guide"]');
  ok(/So funktioniert der Stundenzettel/.test(await txt()), "Anleitung öffnet sich");
  await shot(page, "6-anleitung");
  await click(page, '[data-a="tab"][data-v="heute"]');
  await click(page, '[data-a="out"]');
  await page.waitForTimeout(100);
  ok(/Kommen – einstempeln/.test(await txt()), "Ausstempeln → Kommen-Knopf");
  // ↩️ Tag löschen → Rückgängig
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '.dayrow[data-d="2026-11-02"]');
  await click(page, '[data-a="delday"]');
  ok(await card(page).locator(".undobar").count() === 1, "Löschen zeigt „Rückgängig“");
  await click(page, '[data-a="undo"]');
  await page.waitForTimeout(150);
  const ops = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(ops.some((o) => o.type === "day_set" && o.date === "2026-11-02" && o.kind === "work" && o.start), "Rückgängig schickt den alten Tag zurück");
  // 📴 ohne Netz: Postausgang
  await page.evaluate(() => window.setOnline(false));
  await click(page, '[data-a="tab"][data-v="heute"]');
  await click(page, '[data-a="in"]');
  ok(/1 wartet/.test(await card(page).locator(".topbar").innerText()) && /Gehen – ausstempeln/.test(await txt()), "Ohne Netz: Einstempeln landet im Postausgang und wirkt sofort");
  await shot(page, "8-offline-postausgang");
  const before = await page.evaluate(() => fake.msgs.length);
  await page.evaluate(() => window.setOnline(true));
  await page.waitForTimeout(300);
  ok(await page.evaluate((b) => fake.msgs.slice(b).some((m) => m.type === "stundenzettel/apply" && m.ops.some((o) => o.type === "stamp_in" && o.ts)), before), "Netz wieder da: Postausgang wird mit Uhrzeit nachgeschickt");
  ok(/verbunden/.test(await card(page).locator(".topbar").innerText()), "Danach: nichts wartet mehr");
  ok(!errors.length, "keine Fehler in der Konsole" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
{ // 🔒 PIN fürs Zahnrad
  const { page, errors } = await open("#pin");
  await click(page, '[data-a="tab"][data-v="set"]');
  ok(/PIN eingeben/.test(await card(page).locator("ha-card").innerText()), "PIN an: ⚙️ fragt nach der PIN");
  await shot(page, "9-pin");
  for (const k of ["1", "1", "1", "1", "✔"]) await click(page, `[data-a="pkey"][data-v="${k}"]`);
  await page.waitForTimeout(150);
  ok(/PIN eingeben/.test(await card(page).locator("ha-card").innerText()), "Falsche PIN: bleibt zu");
  for (const k of ["1", "2", "3", "4", "✔"]) await click(page, `[data-a="pkey"][data-v="${k}"]`);
  await page.waitForTimeout(150);
  ok(await card(page).locator(".lgbox").count() > 0, "Richtige PIN: ⚙️ geht auf");
  await click(page, '[data-a="lock"]');
  await click(page, '[data-a="tab"][data-v="set"]');
  ok(/PIN eingeben/.test(await card(page).locator("ha-card").innerText()), "Schloss angetippt: wieder zu");
  ok(!errors.length, "PIN: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
{ // 🔒 ganze Karte gesperrt
  const page = await browser.newPage({ viewport: { width: 520, height: 1000 } });
  await page.goto(base + "#pin-lockall");
  await page.waitForFunction(() => window.ready && document.getElementById("c1").shadowRoot?.querySelector(".pinpad"));
  const t = await card(page).locator("ha-card").innerText();
  ok(/gesperrt/.test(t) && !/Überstunden-Konto/.test(t), "Ganze Karte gesperrt: ohne PIN sieht man nichts");
  await page.close();
}
{ // ⏰ Maskottchen + 🌍 Englisch
  const page = await browser.newPage({ viewport: { width: 520, height: 1000 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "#en-mascot");
  await page.waitForFunction(() => window.ready && document.getElementById("c1").shadowRoot?.querySelector(".tabs"));
  await page.waitForTimeout(500);
  ok(await card(page).locator(".mascotbox svg.mascot").count() === 1, "Maskottchen: Wecker oben links");
  const t = await card(page).locator("ha-card").innerText();
  ok(/Today, Wednesday/.test(t) && /Overtime balance/.test(t) && /Leave – clock out/.test(t), "Englisch: Heute-Ansicht übersetzt");
  ok(!/Überstunden|Kommen|einstempeln/.test(t), "Englisch: keine deutschen Reste auf Heute");
  await shot(page, "10-englisch-maskottchen");
  ok(!errors.length, "Englisch: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
{
  const { page, errors } = await open("#empty-light", 390);
  ok(/Los geht's/.test(await card(page).locator("ha-card").innerText()), "Leerer Start zeigt die Einrichtungs-Hilfe");
  await shot(page, "7-start-hell-handy");
  ok(!errors.length, "leer & hell: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
await browser.close();
server.close();
console.log(fails ? `\n❌ ${fails} Prüfungen fehlgeschlagen` : "\n🎉 Alles grün");
process.exit(fails ? 1 : 0);
