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
//    scheitern dabei erwartungsgemäß und werden nicht gewertet.
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

// 4. Rechtschreibung: kein s-z als Ersatz für ß.
//
//    Im Code stand das lange überall — eine Gewohnheit aus Zeiten
//    ohne Umlaute im Editor. Die Oberfläche ist deutsch, der Nutzer liest
//    sie, und dort gehört ß hin. Weil sich das beim Schreiben unbemerkt
//    wieder einschleicht, prüft es die Testsuite.
{
  // Wörter, in denen s und z wirklich aufeinandertreffen.
  const ERLAUBT = new Set([
    "Disziplin", "Disziplinen", "Prüfungsdisziplin", "Prüfungsdisziplinen",
    "Minuszeichen", "Auflösungszeichen", "Adresszeile", "Kreuzsymbol",
  ]);
  // Trennbare Verben mit „zu“ im Inneren: herauszufinden, auszuschalten,
  // loszulegen, herauszurechnen. Das ist eine offene Wortklasse, die sich
  // nicht aufzählen lässt — deshalb eine Regel statt einer Liste.
  const ZU_INFINITIV = new RegExp("s" + "zu[a-zäöüß]");
  // Zusammengesetzt, damit die Prüfung nicht über ihr eigenes Muster stolpert.
  const WORT = "[A-Za-zÄÖÜäöüß]*";
  const MUSTER = new RegExp(WORT + "s" + "z" + WORT, "g");

  const dateien = [];
  (function sammle(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) sammle(p);
      else if (/\.(js|mjs|md|html|css)$/.test(e.name)) dateien.push(p);
    }
  })(ROOT);

  const treffer = [];
  for (const f of dateien) {
    const zeilen = fs.readFileSync(f, "utf8").split(/\r?\n/);
    zeilen.forEach((zeile, i) => {
      for (const w of zeile.match(MUSTER) || []) {
        if (ERLAUBT.has(w) || ZU_INFINITIV.test(w)) continue;
        treffer.push(`${path.relative(ROOT, f)}:${i + 1}  ${w}`);
      }
    });
  }
  process.stdout.write(`\n=== Rechtschreibung ===\n`);
  if (treffer.length) {
    for (const z of treffer.slice(0, 20)) console.log("  " + z + "  -> hier gehört ß hin");
    if (treffer.length > 20) console.log(`  … und ${treffer.length - 20} weitere`);
    ok = false;
  } else {
    console.log(`  ß wird überall ausgeschrieben, ${dateien.length} Dateien geprüft`);
  }
}

// 5. Die restlichen Suiten.
ok = run(["tools/test-theory.mjs"], "Musiktheorie") && ok;
ok = run(["tools/test-notation.mjs"], "Notensatz") && ok;
ok = run(["tools/test-rhythmus.mjs"], "Rhythmus") && ok;
ok = run(["tools/test-melodie.mjs"], "Melodien") && ok;
ok = run(["tools/test-harmonie.mjs"], "Harmonielehre") && ok;
ok = run(["tools/test-notenfolge.mjs"], "Notenerkennung") && ok;
ok = run(["tools/test-lick.mjs"], "Licks") && ok;
ok = run(["tools/test-obertoene.mjs"], "Teiltoene") && ok;
ok = run(["tools/test-koennen.mjs"], "Koennen-Profil") && ok;
ok = run(["tools/test-plan.mjs"], "Uebungsplan") && ok;
ok = run(["tools/test-skalenarten.mjs"], "Pruefungsstoff Tonleitern") && ok;
ok = run(["tools/test-pruefung.mjs"], "Pruefungsplan") && ok;
ok = run(["tools/test-diktat.mjs"], "Hoertest") && ok;
ok = run(["tools/test-kadenz.mjs"], "Kadenzen") && ok;
ok = run(["tools/test-pitch.mjs"], "Tonhoehenerkennung") && ok;
ok = run(["tools/sync-precache.mjs"], "Precache-Liste") && ok;

console.log(ok ? "\nAlles grün.\n" : "\nEs gibt Fehler.\n");
process.exit(ok ? 0 : 1);
