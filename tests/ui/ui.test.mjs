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
  await page.clock.setFixedTime(new Date("2026-11-04T10:00:00")); // 📅 Uhr auf den Tag der Beispiel-Daten stellen
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
  ok(await card(page).locator(".kg.running input[data-v='start']").inputValue() !== "" && /Eingestempelt seit/.test(await txt()), "Heute: eingestempelt → Felder Kommen/Gehen, Kommen läuft");
  await shot(page, "1-heute");
  await click(page, '[data-a="tab"][data-v="monat"]');
  ok(/Dein Konto heute/.test(await txt()) && /Soll bis heute/.test(await txt()) && /Gearbeitet bis heute/.test(await txt()), "Monat (läuft noch): Soll nur bis heute");
  await shot(page, "2-monat");
  await click(page, '[data-a="mon"][data-v="-1"]');
  ok(/Oktober 2026/.test(await txt()) && /Konto Ende Oktober/.test(await txt()) && /Dieser Monat/.test(await txt()) && await card(page).locator(".zchip").count() >= 3, "Vormonat: Zettel mit Summe/Bezahlt/Ü.-Gesamt");
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
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '[data-a="share"][data-v="month"]');
  ok(/Drucken & Teilen/.test(await txt()) && /PDF/.test(await txt()) && /November 2026/.test(await txt()), "Monat → Drucken & Teilen zeigt PDF-Knöpfe und Vorschau");
  const pdf = await card(page).evaluate((el) => { const b = el._sharePdfBytes(); return { head: String.fromCharCode(...b.slice(0, 5)), tail: String.fromCharCode(...b.slice(-6)), n: b.length }; });
  ok(pdf.head === "%PDF-" && /%%EOF/.test(pdf.tail) && pdf.n > 1500, "PDF vom Monat ist eine echte PDF-Datei");
  await shot(page, "4b-teilen");
  await click(page, '[data-a="back"]');
  ok(await card(page).locator(".tabs").count() === 1, "Schließen führt zurück zum Monat");
  await click(page, '.dayrow[data-d="2026-11-04"]');
  ok(await card(page).locator('form[data-form="day"] input[name="pause"]').inputValue() === "", "Tag bearbeiten: Pause leer, wenn sie nur nach Regel kommt");
  await click(page, '[data-a="tab"][data-v="jahr"]');
  ok(/Okt/.test(await txt()) && /Σ/.test(await txt()), "Jahr: Tabelle mit Summe");
  await shot(page, "4-jahr");
  await click(page, '[data-a="share"][data-v="year"]');
  const pdfY = await card(page).evaluate((el) => el._sharePdfBytes().length);
  ok(/Stundenzettel 2026/.test(await txt()) && pdfY > 1500, "Jahr → Drucken & Teilen mit PDF");
  const sign = await card(page).evaluate((el) => { const b = el._sharePdfBytes(); let s = ""; for (const x of b) s += String.fromCharCode(x); return { pdf: /Unterschrift Arbeitnehmer/.test(s) && /Unterschrift Chef/.test(s), print: /Unterschrift Arbeitnehmer[\s\S]*Unterschrift Chef/.test(el._shareHtmlDoc(el._shareModel())) }; });
  ok(sign.pdf && sign.print, "PDF und Drucken: unten Unterschrift-Linien für Arbeitnehmer und Chef");
  const news = await card(page).evaluate((el) => { const d = document.createElement("div"); d.innerHTML = el._newsHtml(); return { box: d.querySelector(".betabox")?.innerText || "", rest: [...d.children].filter((x) => !x.classList.contains("betabox")).map((x) => x.innerText).join("\n"), n: d.querySelectorAll(":scope > ul > li").length }; });
  ok(/Du bist in der Beta/.test(news.box) && /Neu in dieser Beta/.test(news.box) && news.box.indexOf("Beta 4 ·") > 0 && news.box.indexOf("Beta 4 ·") < news.box.indexOf("Beta 1 ·") && !/Erste offizielle/.test(news.box), "Was ist neu: oranger Beta-Kasten, höchste Beta oben");
  ok(/Die letzten Neuerungen bis Version 1\.0\.0/.test(news.rest) && news.n > 0 && news.n <= 15 && !/Zweiter Stundenzettel/.test(news.rest), "Was ist neu: darunter höchstens 15 Neuerungen bis zur letzten offiziellen Version");
  await click(page, '[data-a="back"]');
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
  await click(page, '[data-a="kgnow"][data-v="end"]');
  await page.waitForTimeout(100);
  ok(await card(page).locator(".kg.running").count() === 0 && await card(page).locator(".kg input[data-v='end']").inputValue() !== "", "⏱️ bei Gehen stempelt aus – Gehen-Feld ist gefüllt");
  await card(page).locator(".kg input[data-v='end']").fill("16:15");
  await card(page).locator(".kg input[data-v='end']").dispatchEvent("change");
  await page.waitForTimeout(150);
  const kgOps = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(kgOps.some((o) => o.type === "day_set" && o.date === "2026-11-04" && o.end === "16:15" && o.start), "Gehen-Feld ändern trägt den Tag ein (day_set)");
  // 📈 Statistik
  await click(page, '[data-a="tab"][data-v="stat"]');
  ok(/Überstunden-Konto/i.test(await txt()) && /Wochentage/i.test(await txt()) && /Rekorde/i.test(await txt()) && /Urlaub & Krank pro Jahr/i.test(await txt()) && await card(page).locator(".chart svg polyline").count() === 2, "Statistik: Kurve, Wochentage, Urlaub & Krank, Rekorde");
  await shot(page, "7-statistik");
  await card(page).locator('select[data-a="statyear"]').selectOption("2026");
  await page.waitForTimeout(150);
  ok(/Stunden pro Monat/i.test(await txt()) && await card(page).locator(".vb").count() >= 2, "Statistik: Jahr 2026 zeigt Monats-Balken");
  // 💶 Lohnabrechnung
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '[data-a="monthform"]');
  ok(await card(page).locator('form[data-form="month"] input[name="alt"]').count() === 1, "Monat: Feld „Ü.-Alt laut Lohnabrechnung“");
  await card(page).locator('form[data-form="month"] input[name="alt"]').fill("31");
  await click(page, 'form[data-form="month"] button[type="submit"]');
  await page.waitForTimeout(150);
  const mOps = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(mOps.some((o) => o.type === "month_set" && o.alt === 31), "Lohnabrechnung speichern schickt month_set mit alt");
  // 📄 Zettel vom Chef
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '.bossrow .finfo');
  ok(/Zeitsaldenliste/.test(await card(page).locator('.fhint[data-tip="boss"]').innerText()), "Monat: ⓘ neben „Zettel vom Chef“ sagt, welche Zettel gehen");
  await card(page).locator("#bossfile").setInputFiles({ name: "zettel.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 ausgedacht") });
  await page.waitForTimeout(250);
  ok(/Oktober 2026/.test(await txt()) && /Laut Chef/.test(await txt()) && /Laut mir/.test(await txt()) && /Unterschied/.test(await txt()), "Zettel vom Chef: springt zum Monat und zeigt den Saldo vom Chef");
  const bossN = await card(page).locator(".dayrow .boss").count();
  ok(bossN >= 3, `Zettel vom Chef: rote Stunden nur an abweichenden Tagen (${bossN})`);
  const firstBoss = await card(page).locator(".dayrow .hrs").filter({ has: page.locator(".boss") }).first().innerText();
  ok(/^\d+,\d\d\s*\d+,\d\d$/.test(firstBoss.trim()), `Rote Zahl steht links neben den eigenen Stunden („${firstBoss.trim().replace(/\s+/, " ")}“)`);
  const up = await card(page).locator(".dayrow .boss.up").count(), down = await card(page).locator(".dayrow .boss:not(.up)").count();
  ok(up >= 1 && down >= 1, `Zettel vom Chef: grün wo der Chef mehr hat (${up}), rot wo weniger (${down})`);
  ok(await card(page).locator(".boss-box .vpos").count() >= 2, "Zettel vom Chef: Salden im Plus sind grün");
  const bbox = await card(page).locator(".boss-box").innerText();
  ok(/\+40:07 Std\./.test(bbox) && !/40,12/.test(bbox) && /Chef \+40:07/.test(await card(page).locator(".bpick").innerText()), "Zettel vom Chef: Zahlen in Std:Min wie auf dem Lohnzettel (+40:07)");
  // 📝 Notizen nur als Symbol
  const mt = await txt();
  ok(!/Musterstadt – Terrasse/.test(mt) && await card(page).locator(".dayrow .notebtn").count() >= 5, "Monat: Notizen nur als 📝-Symbol, kein Text");
  await click(page, '.dayrow .notebtn');
  ok(await card(page).locator(".dayrow .notetext").count() === 1 && await card(page).locator('form[data-form="day"]').count() === 0, "📝 antippen zeigt die Notiz (ohne den Tag zu öffnen)");
  await click(page, '.dayrow .notebtn');
  ok(await card(page).locator(".dayrow .notetext").count() === 0, "📝 nochmal antippen: Notiz wieder zu");
  await shot(page, "2b-zettel-vom-chef");
  await click(page, '[data-a="bossue"]');
  await page.waitForTimeout(150);
  const uOps = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(uOps.some((o) => o.type === "month_set" && o.month === "2026-11" && o.alt === 40.12), "„Chef“ wählen: November startet mit dem Übertrag vom Chef – month_set für den nächsten Monat");
  await click(page, '[data-a="bossmine"]');
  await page.waitForTimeout(150);
  const mOps2 = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").flatMap((m) => m.ops));
  ok(mOps2.some((o) => o.type === "month_set" && o.month === "2026-11" && o.alt === null), "„Mir“ wählen: November rechnet wieder mit der eigenen Zahl");
  await click(page, '[data-a="mon"][data-v="1"]');
  // ⓘ in den Einstellungen
  await click(page, '[data-a="tab"][data-v="set"]');
  await click(page, '[data-a="setgrp"][data-v="Arbeitszeit"]');
  await click(page, '.lrow[data-v="work"]');
  const hidden0 = await card(page).locator(".fhint:not([hidden])").count();
  await click(page, '.finfo[data-v="paid_hours"]');
  ok(hidden0 === 0 && await card(page).locator('.fhint[data-tip="paid_hours"]:not([hidden])').count() === 1, "⚙️ ⓘ neben dem Feld klappt die Erklärung auf (vorher keine Textwand)");
  await click(page, '.finfo[data-v="paid_hours"]');
  ok(await card(page).locator('.fhint[data-tip="paid_hours"]:not([hidden])').count() === 0, "⚙️ ⓘ nochmal antippen = zu");
  await click(page, '[data-a="back"]');
  await click(page, '[data-a="back"]');
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
  await click(page, '[data-a="tab"][data-v="monat"]');
  ok(await card(page).locator(".bossrow").count() === 0, "Ohne Netz: kein Knopf „Zettel vom Chef“ (braucht Home Assistant)");
  await click(page, '[data-a="tab"][data-v="heute"]');
  await click(page, '[data-a="kgnow"][data-v="start"]');
  ok(/wartet/.test(await card(page).locator(".topbar").innerText()) && await card(page).locator(".kg.running").count() === 1, "Ohne Netz: Einstempeln landet im Postausgang und wirkt sofort");
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
{ // 🔒 Ändern nur mit PIN – nur im Monat und für ältere Tage, Heute (heute + gestern) frei
  const { page, errors } = await open("#pin-lockedit");
  const t0 = await card(page).locator("ha-card").innerText();
  ok(/Überstunden-Konto/.test(t0) && !/PIN eingeben/.test(t0), "Ändern nur mit PIN: Ansehen geht ohne PIN");
  await click(page, '.dayrow[data-a="open"]');
  ok(await card(page).locator('form[data-form="day"]').count() === 1 && await card(page).locator(".pinpad").count() === 0, "Heute: heutigen Tag ändern geht ohne PIN");
  await click(page, '[data-a="close"]');
  await click(page, '[data-a="tday"][data-v="-1"]');
  ok(/Gestern/.test(await card(page).locator(".hero").innerText()), "‹ springt auf gestern");
  await click(page, '.dayrow[data-a="open"]');
  ok(await card(page).locator(".pinpad").count() === 0, "Heute: gestern ändern geht ohne PIN");
  await click(page, '[data-a="close"]');
  await click(page, '[data-a="tday"][data-v="-1"]');
  await click(page, '.dayrow[data-a="open"]');
  ok(/Zum Ändern brauchst du die PIN/.test(await card(page).locator("ha-card").innerText()), "Heute: ältere Tage nur ansehen – Ändern fragt nach der PIN");
  await click(page, '[data-a="back"]');
  ok(await card(page).locator(".pinpad").count() === 0 && await card(page).locator(".hero").count() === 1, "Abbrechen: zurück in Heute, nichts geändert");
  await click(page, '.hero .hday');
  ok(/Heute,/.test(await card(page).locator(".hero").innerText()), "Datum antippen: zurück zu heute");
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '.dayrow[data-a="open"]');
  ok(/Zum Ändern brauchst du die PIN/.test(await card(page).locator("ha-card").innerText()), "Monat: Tag antippen fragt nach der PIN");
  await shot(page, "9b-aendern-pin");
  const n0 = await page.evaluate(() => fake.msgs.filter((m) => m.type === "stundenzettel/apply").length);
  for (const k of ["1", "2", "3", "4", "✔"]) await click(page, `[data-a="pkey"][data-v="${k}"]`);
  await page.waitForTimeout(150);
  ok(await card(page).locator(".pinpad").count() === 0 && n0 === 0, "Richtige PIN: Tastenfeld weg, vorher wurde nichts geschickt");
  await click(page, '.dayrow[data-a="open"]');
  ok(await card(page).locator('form[data-form="day"]').count() === 1, "Nach der PIN: Tag im Monat lässt sich ändern");
  ok(!errors.length, "Ändern nur mit PIN: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
{ // 📅 Heute: Tage blättern + 📝 Notiz-Schnellwähler + 🧪 Was ist neu sortiert
  const { page, errors } = await open("");
  await click(page, '[data-a="tday"][data-v="-1"]');
  await click(page, '[data-a="tday"][data-v="-1"]');
  const h = await card(page).locator(".hero").innerText();
  ok(!/Heute|Gestern/.test(h.split("\n")[0]) && /\d\d\.\d\d\./.test(h) && await card(page).locator('[data-a="kgnow"]').count() === 0, `Heute: zwei Tage zurück zeigt den Tag, ohne ⏱️ jetzt („${h.split("\n")[0]}“)`);
  await click(page, '[data-a="tday"][data-v="1"]');
  await click(page, '[data-a="tday"][data-v="1"]');
  ok(/Heute,/.test(await card(page).locator(".hero").innerText()), "› zurück bis heute");
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '.dayrow[data-a="open"]');
  const chips = await card(page).locator('[data-a="nplace"]').count();
  ok(chips >= 2 && await card(page).locator('[data-a="nact"]').count() >= 2, `Notiz: Schnellwähler mit Orten (${chips}) und Tätigkeiten`);
  const ta = card(page).locator('textarea[name="note"]');
  await ta.fill("");
  const p1 = await card(page).locator('[data-a="nplace"]').first().getAttribute("data-v");
  await click(page, '[data-a="nplace"]');
  await click(page, '[data-a="nact"]');
  await card(page).locator('[data-a="nplace"]').nth(1).click(); await page.waitForTimeout(120);
  const v = await ta.inputValue();
  ok(await card(page).evaluate((el) => el.shadowRoot.activeElement?.name !== "note"), "Notiz: Schnellknöpfe holen keine Tastatur (Feld bekommt keinen Fokus)");
  ok(v.split("\n").length === 2 && v.startsWith(p1 + " - ") && /^.+ - .+$/.test(v.split("\n")[0]), `Notiz: jeder Ort in eigener Zeile, Tätigkeit dahinter („${v.replace(/\n/g, " ⏎ ")}“)`);
  await shot(page, "3b-notiz-schnellwahl");
  ok(!errors.length, "Blättern & Schnellwähler: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
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
  ok(/Today, Wednesday/.test(t) && /Overtime balance/.test(t) && /Arrive/.test(t) && /Leave/.test(t), "Englisch: Heute-Ansicht übersetzt");
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
{ // 👥 zweiter Stundenzettel: jede Nachricht sagt, welcher gemeint ist
  const page = await browser.newPage({ viewport: { width: 520, height: 1000 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "#entry2");
  await page.waitForFunction(() => window.ready); await page.waitForTimeout(300);
  await click(page, '.dayrow[data-a="open"], [data-a="tab"][data-v="monat"]');
  await click(page, '[data-a="tab"][data-v="monat"]');
  await click(page, '.dayrow[data-a="open"]');
  await card(page).locator('form[data-form="day"] button[type="submit"]').first().click(); await page.waitForTimeout(200);
  const msgs = await page.evaluate(() => fake.msgs);
  ok(msgs.length >= 2 && msgs.every((m) => m.entry_id === "e2"), `Zweiter Stundenzettel: alle ${msgs.length} Nachrichten mit entry_id`);
  ok(msgs.some((m) => m.type === "stundenzettel/apply"), "Zweiter Stundenzettel: Speichern geht an den richtigen");
  ok(!errors.length, "Zweiter Stundenzettel: keine Fehler" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}
await browser.close();
server.close();
console.log(fails ? `\n❌ ${fails} Prüfungen fehlgeschlagen` : "\n🎉 Alles grün");
process.exit(fails ? 1 : 0);
