/* Hält die Precache-Liste in sw.js mit dem Repo im Gleichstand.

   Ohne das ist die Liste die verletzlichste Stelle des Projekts: eine neue
   Datei, die nicht drinsteht, fehlt im Flugmodus — und das merkt man erst
   im Probelokal ohne Netz.

     node tools/sync-precache.mjs          prüft und meldet Abweichungen
     node tools/sync-precache.mjs --write  schreibt die Liste neu

   Kein Build-Schritt: die App läuft auch ohne diesen Aufruf. Er ist eine
   Kontrolle vor dem Deployen. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW = path.join(ROOT, "sw.js");

// Was in den Cache gehört. tools/ fehlt bewusst: Entwicklungswerkzeuge
// haben im Offlinebetrieb nichts verloren.
const DIRS = ["css", "js", "fonts", "icons"];
const EXT = new Set([".js", ".css", ".woff2", ".png", ".json"]);
const EXTRA = ["./", "./index.html", "./manifest.json"];
const SKIP = new Set(["fonts/HERKUNFT.md", "fonts/OFL.txt"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + "/" + e.name;
    if (e.isDirectory()) walk(rel, out);
    else if (EXT.has(path.extname(e.name)) && !SKIP.has(rel)) out.push("./" + rel);
  }
  return out;
}

const assets = [...EXTRA, ...DIRS.flatMap(d => walk(d))];

const block = "const ASSETS = [\n" +
  assets.map(a => `  ${JSON.stringify(a)},`).join("\n").replace(/,$/, "") +
  "\n];";

const src = fs.readFileSync(SW, "utf8");
const re = /const ASSETS = \[[\s\S]*?\n\];/;
if (!re.test(src)) {
  console.error("In sw.js steht kein erkennbarer ASSETS-Block.");
  process.exit(2);
}

const next = src.replace(re, block);
const write = process.argv.includes("--write");

if (next === src) {
  console.log(`Precache-Liste ist aktuell: ${assets.length} Dateien.`);
  process.exit(0);
}

if (write) {
  fs.writeFileSync(SW, next, "utf8");
  console.log(`Precache-Liste neu geschrieben: ${assets.length} Dateien.`);
  process.exit(0);
}

// Unterschied zeigen, damit klar ist, was fehlt oder zu viel ist.
const listed = new Set((src.match(re)[0].match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1)));
const wanted = new Set(assets);
const missing = [...wanted].filter(a => !listed.has(a));
const stale = [...listed].filter(a => !wanted.has(a));
if (missing.length) console.error("Fehlt im Precache:\n  " + missing.join("\n  "));
if (stale.length) console.error("Steht im Precache, existiert aber nicht:\n  " + stale.join("\n  "));
console.error("\nBeheben mit: node tools/sync-precache.mjs --write");
process.exit(1);
