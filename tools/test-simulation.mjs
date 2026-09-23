/* Prüft js/data/simulation.js. Läuft mit `node tools/test-simulation.mjs`.

   Die Simulation muss das ganze Saxophon-Programm enthalten, jedes Mal in
   einer anderen Reihenfolge nach dem ersten Stück, mit drei verschiedenen
   Tonleiter-Aufgaben. Und sie muss auch laufen, wenn im Cockpit noch
   nichts eingetragen ist. */

import * as Sim from "../js/data/simulation.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

let seed = 5;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

console.log("Ablauf");
{
  const drills = {
    "pruefung:stueck1": { titel: "Oleo", tempo: 200 },
    "pruefung:stueck2": { titel: "Parker's Mood" },
    "pruefung:etuede1": { titel: "Niehaus 3" },
  };
  const reihenfolgen = new Set();
  for (let i = 0; i < 40; i++) {
    const s = Sim.baueSimulation(drills, { heute: "2026-09-23", rng });
    const ids = s.map(x => x.id);
    eq(ids[0], "einstimmen", "zuerst einstimmen");
    eq(ids[1], "stueck1", "das erste Stück wählt man selbst");
    eq(ids.slice(-2), ["tonleitern", "blattlesen"], "am Schluss Tonleitern und Blattlesen");
    eq([...ids].sort(), ["blattlesen", "einstimmen", "etuede1", "etuede2", "stueck1", "stueck2", "stueck3", "tonleitern"],
      "das ganze Saxophon-Programm, jedes einmal");
    reihenfolgen.add(ids.slice(2, 6).join());
    const t = s.find(x => x.id === "tonleitern");
    eq(t.aufgaben.length, Sim.TONLEITER_AUFGABEN, "drei Tonleiter-Aufgaben");
    eq(new Set(t.aufgaben.map(a => a.art + a.keyIndex)).size, t.aufgaben.length, "drei verschiedene");
    ok(t.aufgaben.every(a => typeof a.titel === "string" && a.titel.length > 1), "jede Aufgabe hat einen lesbaren Titel");
    for (const x of s.filter(x => x.unterbrechung != null)) {
      ok(x.unterbrechung >= Sim.UNTERBRECHUNG.ab && x.unterbrechung <= Sim.UNTERBRECHUNG.bis, "Unterbrechung im Rahmen");
    }
    ok(Number.isInteger(s.find(x => x.id === "blattlesen").seed), "Blattlesen hat einen festen Seed für die Noten");
  }
  ok(reihenfolgen.size > 5, `die Kommission mischt (${reihenfolgen.size} Reihenfolgen)`);

  const s = Sim.baueSimulation(drills, { rng, unterbrechen: false });
  eq(s.find(x => x.id === "stueck1").titel, "Oleo", "Titel kommt aus dem Cockpit");
  eq(s.find(x => x.id === "stueck1").tempo, 200, "Tempo auch");
  ok(s.find(x => x.id === "stueck3").platzhalter, "fehlender Titel ist als Platzhalter markiert");
  ok(s.every(x => x.unterbrechung == null), "ohne Unterbrechen unterbricht niemand");

  const leer = Sim.baueSimulation({}, { rng });
  eq(leer.length, 8, "läuft auch ohne jeden Eintrag");
  ok(leer.filter(x => x.art === "stueck").every(x => x.platzhalter), "dann alles Platzhalter");

  let viele = 0, faelle = 0;
  for (let i = 0; i < 400; i++) {
    for (const x of Sim.baueSimulation({}, { rng }).filter(x => x.art === "stueck")) {
      faelle++; if (x.unterbrechung != null) viele++;
    }
  }
  ok(Math.abs(viele / faelle - Sim.UNTERBRECHUNG.stueck) < 0.06, `Stücke werden etwa so oft unterbrochen wie eingestellt (${(viele / faelle).toFixed(2)})`);
}

console.log("\nBilanz");
{
  const s = Sim.baueSimulation({ "pruefung:stueck1": { titel: "Oleo" } }, { rng });
  eq(Sim.bilanz(s, {}).satz, "Noch nicht bewertet.", "ohne Urteil keine Aussage");
  const alleSicher = Object.fromEntries(s.map(x => [x.id, "sicher"]));
  const b = Sim.bilanz(s, alleSicher);
  eq([b.sicher, b.wackler, b.raus, b.offen], [7, 0, 0, 0], "Einstimmen zählt nicht mit");
  const mitRaus = { ...alleSicher, stueck1: "raus" };
  ok(/Oleo/.test(Sim.bilanz(s, mitRaus).satz), "der Ausstieg wird beim Namen genannt");
  ok(/Wackler/.test(Sim.bilanz(s, { ...alleSicher, etuede1: "wackler" }).satz), "Wackler werden angesprochen");
  eq(b.fehlend.length, 4, "fehlende Titel werden gesammelt");
}

console.log("\nLetzte Simulation");
{
  eq(Sim.tageSeitLetzter({}, "2026-09-23"), null, "noch nie");
  eq(Sim.tageSeitLetzter({ [Sim.LISTE]: { eintraege: [{ datum: "2026-09-01" }, { datum: "2026-09-20" }] } }, "2026-09-23"), 3, "Tage seit der letzten");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
