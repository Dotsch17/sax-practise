/* Alles prüfen, was ohne Browser prüfbar ist.

     node tools/check.mjs

   Läuft vor jedem Deployen. Was hier grün ist, kann trotzdem am Gerät
   scheitern — Audio, Mikrofon, Wake Lock und der Service Worker lassen sich
   nur dort testen. Aber was hier rot ist, ist am Gerät sicher kaputt. */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (args, label) => {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
    return true;
  } catch { return false; }
};

let ok = true;

// 1. Jede JS-Datei muss syntaktisch heil sein.
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + "/" + e.name;
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith(".js")) jsFiles.push(rel);
  }
})("js");
process.stdout.write(`\n=== Syntax: ${jsFiles.length} Moduldateien ===\n`);
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", path.join(ROOT, f)], { stdio: "pipe" });
  } catch (e) {
    console.log("  FAIL " + f + "\n" + String(e.stderr || e).slice(0, 400));
    ok = false;
  }
}
try { execFileSync(process.execPath, ["--check", path.join(ROOT, "sw.js")], { stdio: "pipe" }); }
catch (e) { console.log("  FAIL sw.js"); ok = false; }
if (ok) console.log("  alle heil");

// 2. Jedes Modul muss sich auch wirklich laden lassen — das findet kaputte
//    Importpfade, die --check nicht sieht. Module, die ein DOM brauchen,
//    scheitern dabei erwartungsgemäsz und werden nicht gewertet.
process.stdout.write(`\n=== Importierbarkeit ===\n`);
let importFails = 0;
// main.js startet die App beim Laden und braucht deshalb zwingend ein DOM.
const RUNS_ON_IMPORT = new Set(["js/main.js"]);
for (const f of jsFiles) {
  if (RUNS_ON_IMPORT.has(f)) continue;
  try {
    await import("file://" + path.join(ROOT, f).replace(/\\/g, "/"));
  } catch (e) {
    const msg = String(e.message || e);
    if (/document is not defined|window is not defined|localStorage/.test(msg)) continue;
    console.log("  FAIL " + f + ": " + msg.slice(0, 160));
    importFails++;
  }
}
console.log(importFails ? `  ${importFails} Modul(e) laden nicht` : "  alle ladbar");
if (importFails) ok = false;

// 3. manifest.json muss gültiges JSON sein.
try {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const missing = ["name", "start_url", "display", "icons"].filter(k => !(k in m));
  console.log(`\n=== manifest.json ===\n  ` +
    (missing.length ? "FAIL, es fehlt: " + missing.join(", ") : "gültig"));
  if (missing.length) ok = false;
} catch (e) { console.log("\n=== manifest.json ===\n  FAIL: " + e.message); ok = false; }

// 4. Die restlichen Suiten.
ok = run(["tools/test-theory.mjs"], "Musiktheorie") && ok;
ok = run(["tools/test-notation.mjs"], "Notensatz") && ok;
ok = run(["tools/test-rhythmus.mjs"], "Rhythmus") && ok;
ok = run(["tools/test-pitch.mjs"], "Tonhoehenerkennung") && ok;
ok = run(["tools/sync-precache.mjs"], "Precache-Liste") && ok;

console.log(ok ? "\nAlles grün.\n" : "\nEs gibt Fehler.\n");
process.exit(ok ? 0 : 1);
