/* Prüft js/music/skalenarten.js: den Tonleiter- und Akkordstoff der
   Zulassungsprüfung. Läuft mit `node tools/test-skalenarten.mjs`.

   Was hier unter Schutz steht: jede Art hat zwölf Grundtöne, jeder davon
   ist so geschrieben, wie man ihn schreibt, jede Folge bleibt im Umfang,
   und der ganze Umfang beginnt und endet auf dem Grundton. */

import * as A from "../js/music/skalenarten.js";
import * as T from "../js/music/theory.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const pc = p => ((T.toMidi(p) % 12) + 12) % 12;

console.log("Der Prüfungsstoff ist vollständig");
{
  eq(A.PRUEFUNGS_ARTEN.length, 17, "siebzehn Arten laut Anforderungen 2026/27");
  for (const id of ["dur", "moll_natur", "moll_harmonisch", "moll_melodisch",
    "dorisch", "phrygisch", "lydisch", "mixolydisch", "lokrisch",
    "dreiklang_dur", "dreiklang_moll", "dreiklang_vermindert", "dreiklang_uebermaessig",
    "maj7", "dom7", "moll7", "halbvermindert"]) {
    ok(A.PRUEFUNGS_ARTEN.some(a => a.id === id), `${id} gehört zum Prüfungsstoff`);
  }
  for (const art of A.PRUEFUNGS_ARTEN) {
    const pcs = new Set(A.tonartenFuer(art).map(k => pc(k.tonic)));
    eq(pcs.size, 12, `${art.label}: alle zwölf Tonhöhen`);
  }
}

console.log("\nGrundtöne werden geschrieben, wie man sie schreibt");
{
  const name = (id, p) => A.tonartenFuer(A.artOf(id)).find(k => pc(k.tonic) === p).name;
  eq(name("phrygisch", 1), "Cis", "Cis-phrygisch, nicht Des mit Eses und Fes");
  eq(name("lydisch", 1), "Des", "Des-lydisch, nicht Cis mit His und Eis");
  eq(name("dorisch", 6), "Fis", "Fis-dorisch");
  eq(name("maj7", 10), "B", "Bmaj7, nicht Aismaj7");
  eq(name("moll7", 8), "Gis", "Gism7, nicht Asm7 mit Ces");
  eq(name("dreiklang_uebermaessig", 3), "Es", "Es+");

  for (const art of A.PRUEFUNGS_ARTEN.filter(a => a.keys === "frei")) {
    for (const k of A.tonartenFuer(art)) {
      const toene = A.buchstabiert(art, k);
      const doppelt = toene.filter(t => /(isis|eses|sas)$/.test(t) || t === "Heses");
      if (art.scale) ok(doppelt.length === 0, `${A.titel(art, k)} ohne Doppelvorzeichen (${toene.join(" ")})`);
      if (art.scale) ok(Math.abs(k.sig) <= 6, `${A.titel(art, k)} hat höchstens sechs Vorzeichen`);
    }
  }
}

console.log("\nBenennung und Buchstabieren");
{
  const k = (id, name) => A.tonartenFuer(A.artOf(id)).find(x => x.name === name);
  eq(A.titel(A.artOf("dur"), k("dur", "C-Dur")), "C-Dur", "Dur heißt wie die Tonart");
  eq(A.titel(A.artOf("moll_harmonisch"), k("moll_harmonisch", "a-Moll")), "a-Moll harmonisch", "Moll mit Zusatz");
  eq(A.titel(A.artOf("dorisch"), k("dorisch", "D")), "D dorisch", "Modus mit Grundton");
  eq(A.titel(A.artOf("halbvermindert"), k("halbvermindert", "H")), "Hm7♭5", "halbvermindert als Symbol");
  eq(A.titel(A.artOf("dreiklang_moll"), k("dreiklang_moll", "fis-Moll")), "Fism", "Molldreiklang groß geschrieben");
  eq(A.titel(A.artOf("dom7"), k("dom7", "B-Dur")), "B7", "B7 ist das deutsche B");
  eq(A.titel(A.artOf("dom7"), k("dom7", "B-Dur"), T.NAMING.EN), "B♭7", "international B♭7");

  eq(A.buchstabiert(A.artOf("moll_harmonisch"), k("moll_harmonisch", "a-Moll")),
     ["A", "H", "C", "D", "E", "F", "Gis"], "a-Moll harmonisch hat Gis, nicht As");
  eq(A.buchstabiert(A.artOf("lokrisch"), k("lokrisch", "H")),
     ["H", "C", "D", "E", "F", "G", "A"], "H-lokrisch hat keine Vorzeichen");
  eq(A.buchstabiert(A.artOf("halbvermindert"), k("halbvermindert", "Fis")),
     ["Fis", "A", "C", "E"], "Fism7♭5");
  eq(A.buchstabiert(A.artOf("maj7"), k("maj7", "Es")), ["Es", "G", "B", "D"], "Esmaj7");
  eq(A.buchstabiert(A.artOf("dreiklang_uebermaessig"), k("dreiklang_uebermaessig", "C")),
     ["C", "E", "Gis"], "C+ hat Gis, nicht As");
  eq(k("dorisch", "D").sig, 0, "D-dorisch steht ohne Vorzeichen");
  eq(k("mixolydisch", "G").sig, 0, "G-mixolydisch steht ohne Vorzeichen");
  eq(k("lydisch", "F").sig, 0, "F-lydisch steht ohne Vorzeichen");
  eq(k("phrygisch", "Cis").sig, 3, "Cis-phrygisch trägt die Vorzeichen von A-Dur");
  eq(k("maj7", "Es").sig, 0, "Akkorde tragen keine Vorzeichnung");
}

console.log("\nJede Folge bleibt im Umfang");
{
  let alle = 0, raus = 0;
  for (const art of A.ARTEN) {
    for (const k of A.tonartenFuer(art)) {
      for (const umfang of [1, "voll"]) {
        const f = A.folge(art, k, umfang);
        alle++;
        if (!f.length || !f.every(p => T.inRange(T.toMidi(p)))) raus++;
      }
      // Zwei Oktaven passen physikalisch nicht auf G, Gis/As und A: der
      // Umfang ist nur zweieinhalb Oktaven groß. Dafür gibt es den ganzen
      // Umfang — aber sonst muss es passen.
      const zwei = A.folge(art, k, 2);
      if (![7, 8, 9].includes(pc(k.tonic)) && !zwei.every(p => T.inRange(T.toMidi(p)))) {
        raus++;
        console.log("    zwei Oktaven passen nicht: " + A.titel(art, k));
      }
    }
  }
  eq(raus, 0, `alle ${alle} Folgen für eine Oktave und den ganzen Umfang liegen in B3 bis Fis6, zwei Oktaven überall, wo es geht`);
}

console.log("\nDer ganze Umfang");
{
  for (const art of A.PRUEFUNGS_ARTEN) {
    for (const k of A.tonartenFuer(art)) {
      const f = A.folge(art, k, "voll").map(T.toMidi);
      const name = A.titel(art, k);
      ok(f[0] === f[f.length - 1], `${name}: beginnt und endet auf demselben Ton`);
      ok(f[0] % 12 === pc(k.tonic), `${name}: und der ist der Grundton`);
      const vorrat = new Set(f);
      const hoch = Math.max(...f), tief = Math.min(...f);
      // Kein Ton der Art darf zwischen dem höchsten gespielten und dem
      // Umfangsende fehlen — sonst ist es nicht der ganze Umfang.
      const pcs = new Set(A.buchstabiert(art, k).length ? A.folge(art, k, 1).map(p => T.toMidi(p) % 12) : []);
      let luecke = false;
      for (let m = hoch + 1; m <= T.RANGE.writtenHigh; m++) if (pcs.has(m % 12)) luecke = true;
      for (let m = T.RANGE.writtenLow; m < tief; m++) if (pcs.has(m % 12)) luecke = true;
      ok(!luecke, `${name}: reicht bis an beide Ränder`);
      ok(vorrat.size >= (art.chord ? 7 : 14), `${name}: mehr als zwei Oktaven Material (${vorrat.size})`);
    }
  }
  const c = A.tonartenFuer(A.artOf("dur")).find(k => k.name === "C-Dur");
  const f = A.folge(A.artOf("dur"), c, "voll").map(T.toMidi);
  eq(f[0], 60, "C-Dur beginnt auf C4");
  eq(Math.max(...f), 89, "reicht hinauf bis F6");
  eq(Math.min(...f), 59, "und hinunter bis H3");
}

console.log("\nEine und zwei Oktaven wie bisher");
{
  const c = A.tonartenFuer(A.artOf("dur")).find(k => k.name === "C-Dur");
  const f = A.folge(A.artOf("dur"), c, 1, "auf").map(p => T.spell(p));
  eq(f, ["C", "D", "E", "F", "G", "A", "H", "C"], "C-Dur, eine Oktave aufwärts");
  eq(A.folge(A.artOf("dur"), c, 2, "auf-ab").length, 29, "zwei Oktaven auf und ab ohne doppelten Gipfel");
  eq(A.folge(A.artOf("dom7"), c, 1, "auf").map(p => T.spell(p)), ["C", "E", "G", "B", "C"], "C7 als Arpeggio");
}

console.log("\nAbdeckung");
{
  eq(A.abdeckung({}).geuebt, 0, "leer heißt nichts geübt");
  eq(A.abdeckung({}).gesamt, 17 * 12, "204 Aufgaben insgesamt");
  const d = {
    [A.drillId("dur", "Fis-Dur")]: { count: 1 },
    [A.drillId("dur", "Ges-Dur")]: { count: 2 },
    [A.drillId("dur", "C-Dur")]: { count: 0 },
    [A.drillId("dorisch", "D")]: { count: 3 },
  };
  const a = A.abdeckung(d);
  eq(a.arten.find(x => x.art.id === "dur").geuebt, 1, "Fis- und Ges-Dur zählen einmal, ein leerer Eintrag gar nicht");
  eq(a.arten.find(x => x.art.id === "dorisch").geuebt, 1, "D-dorisch zählt");
  eq(a.geuebt, 2, "zusammen zwei");
}

console.log("\nPrüfungsaufgaben");
{
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gesehen = new Set();
  for (let i = 0; i < 2000; i++) {
    const x = A.pruefungsAufgabe({}, "2026-09-22", rng);
    const art = A.artOf(x.art);
    ok(art.pruefung, "nur Prüfungsstoff wird abgefragt");
    ok(x.keyIndex >= 0 && x.keyIndex < A.tonartenFuer(art).length, "gültige Tonart");
    gesehen.add(x.art);
  }
  eq(gesehen.size, 17, "nach genug Aufgaben kam jede Art einmal dran");

  // Wer alles bis auf eine Aufgabe gestern geübt hat, bekommt fast immer die eine.
  const drills = {};
  for (const art of A.PRUEFUNGS_ARTEN) for (const k of A.tonartenFuer(art)) {
    drills[A.drillId(art.id, k.name)] = { count: 1, last: "2026-09-21" };
  }
  delete drills[A.drillId("lokrisch", "Gis")];
  let treffer = 0;
  for (let i = 0; i < 400; i++) {
    const x = A.pruefungsAufgabe(drills, "2026-09-22", rng);
    if (x.art === "lokrisch" && A.tonartenFuer(A.artOf("lokrisch"))[x.keyIndex].name === "Gis") treffer++;
  }
  ok(treffer > 60, `nie Geübtes kommt deutlich öfter (${treffer} von 400)`);

  const nicht = { art: "dur", keyIndex: 0 };
  let wieder = 0;
  for (let i = 0; i < 500; i++) {
    const x = A.pruefungsAufgabe({}, "2026-09-22", rng, nicht);
    if (x.art === "dur" && x.keyIndex === 0) wieder++;
  }
  eq(wieder, 0, "dieselbe Aufgabe kommt nicht zweimal hintereinander");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
