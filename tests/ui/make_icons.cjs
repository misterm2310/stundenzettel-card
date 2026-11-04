// 🎨 Baut tests/ui/icons.json und www/app/icons.json: alle MDI-Symbole, die in der Karte vorkommen
// (für den Test-Browser ohne HA und für die Offline-App, die kein <ha-icon> von Home Assistant hat).
// Aufruf: node tests/ui/make_icons.cjs <pfad-zu-@mdi/js>   · Symbole: Material Design Icons (Pictogrammers, Apache 2.0)
const fs = require("fs");
const mdi = require(process.argv[2] || "@mdi/js");
const src = fs.readFileSync(__dirname + "/../../custom_components/stundenzettel/www/stundenzettel-card.js", "utf8");
const camel = (n) => "mdi" + n.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const out = {};
for (const m of src.matchAll(/["':]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["']/g)) { const p = mdi[camel(m[1])]; if (p) out[m[1]] = p; }
fs.writeFileSync(__dirname + "/icons.json", JSON.stringify(out));
fs.writeFileSync(__dirname + "/../../custom_components/stundenzettel/www/app/icons.json", JSON.stringify(out));
console.log(Object.keys(out).length + " Symbole");
