/* Prüft den Übungsplan und die Session-Zusammenstellung.

   Zwei Dinge stehen hier unter Schutz: der Plan aus Modul 1 darf sich nicht
   verändern, und was daraus für einen kurzen Abend gebaut wird, muss eine
   brauchbare Session sein — nicht sieben Zwei-Minuten-Blöcke. */

import * as P from "../js/data/plan.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} (war ${JSON.stringify(a)}, erwartet ${JSON.stringify(b)})`);
const summe = p => p.reduce((s, b) => s + b.min, 0);

console.log("Der Plan aus Modul 1 bleibt unangetastet");
{
  eq(P.BLOCKS.length, 7, "sieben Blöcke");
  eq(summe(P.BLOCKS), 80, "achtzig Minuten");
  eq(P.BLOCKS.map(b => b.id).join(","),
     "mundstueck,langetoene,obertoene,dynamik,intonation,artikulation,etuede",
     "Reihenfolge unverändert");
  ok(P.BLOCKS.every(b => b.cues && b.cues.length >= 2), "jeder Block hat Merkpunkte");
  ok(P.BLOCKS.every(b => !("werkzeug" in b)), "die Werkzeugzuordnung steht nicht in BLOCKS");
}

console.log("\nOhne Zeitvorgabe kommt der volle Plan");
{
  const p = P.planFor("probelokal");
  eq(p.length, 7, "alle Blöcke");
  eq(summe(p), 80, "volle Länge");
  ok(p.every(b => "werkzeug" in b), "mit Werkzeug je Block");
  eq(P.planFor("probelokal", { minuten: 0 }).length, 7, "null Minuten heißt alles");
  eq(P.planFor("probelokal", { minuten: 999 }).length, 7, "mehr Zeit als nötig ändert nichts");
}

console.log("\nEine kurze Session ist kürzer, nicht kleinteiliger");
{
  for (const min of [20, 40, 60]) {
    const p = P.planFor("probelokal", { minuten: min });
    eq(summe(p), min, `${min} Minuten kommen auf genau ${min} heraus`);
    ok(p.every(b => b.min >= P.MINDEST), `kein Block unter ${P.MINDEST} Minuten bei ${min}`);
    ok(p.length >= 1 && p.length <= 7, `sinnvolle Blockzahl bei ${min}: ${p.length}`);
    eq(p[0].id, "mundstueck", `das Einspielen bleibt bei ${min} drin`);
  }
  ok(P.planFor("probelokal", { minuten: 20 }).length <
     P.planFor("probelokal", { minuten: 60 }).length,
     "zwanzig Minuten haben weniger Blöcke als sechzig");

  // Der eigentliche Punkt: kurz üben heißt weniger Sachen, nicht dieselben
  // Sachen in Häppchen.
  const kurz = P.planFor("probelokal", { minuten: 20 });
  ok(kurz.length <= 3, `zwanzig Minuten ergeben höchstens drei Blöcke (waren ${kurz.length})`);
  ok(kurz.every(b => b.min >= 4), "und jeder davon ist mindestens vier Minuten lang");
  const mittel = P.planFor("probelokal", { minuten: 40 });
  ok(mittel.length <= 5, `vierzig Minuten ergeben höchstens fünf Blöcke (waren ${mittel.length})`);
  ok(summe(mittel) / mittel.length >= 7,
     "im Schnitt bleiben die Blöcke bei sieben Minuten oder mehr");
}

console.log("\nDie Reihenfolge wird nie umgestellt");
{
  const voll = P.BLOCKS.map(b => b.id);
  for (const min of [20, 30, 40, 55, 60, 75]) {
    const ids = P.planFor("probelokal", { minuten: min }).map(b => b.id);
    const sortiert = [...ids].sort((a, b) => voll.indexOf(a) - voll.indexOf(b));
    eq(ids.join(","), sortiert.join(","), `Planreihenfolge bei ${min} Minuten`);
  }
}

console.log("\nDer Schwerpunkt bekommt Zeit und bleibt lange drin");
{
  const ohne = P.planFor("probelokal", { minuten: 40 });
  const mit  = P.planFor("probelokal", { minuten: 40, schwerpunkt: "obertoene" });
  eq(summe(mit), 40, "die Gesamtzeit stimmt weiterhin");
  const o1 = ohne.find(b => b.id === "obertoene")?.min || 0;
  const o2 = mit.find(b => b.id === "obertoene")?.min || 0;
  ok(o2 > o1, `mit Schwerpunkt mehr Minuten (${o1} auf ${o2})`);

  // Bei sehr wenig Zeit überlebt neben dem Einspielen genau der Schwerpunkt.
  const knapp = P.planFor("probelokal", { minuten: 20, schwerpunkt: "etuede" });
  ok(knapp.some(b => b.id === "etuede"), "der Schwerpunkt ist auch bei 20 Minuten dabei");
  eq(knapp[0].id, "mundstueck", "und das Einspielen davor");
  eq(summe(knapp), 20, "zwanzig Minuten bleiben zwanzig");

  // Ein Schwerpunkt, den es im Kontext nicht gibt, darf nichts kaputtmachen.
  const quatsch = P.planFor("leise", { minuten: 30, schwerpunkt: "obertoene" });
  eq(summe(quatsch), 30, "ein unbekannter Schwerpunkt ändert die Summe nicht");
  ok(quatsch.length >= 2, "und es bleibt eine Session übrig");
}

console.log("\nDie anderen Kontexte werden genauso zugeschnitten");
{
  for (const k of P.KONTEXTE) {
    const voll = P.planFor(k.id);
    ok(voll.length >= 4, `${k.name}: der volle Plan hat Substanz (${voll.length} Blöcke)`);
    const kurz = P.planFor(k.id, { minuten: 25 });
    eq(summe(kurz), 25, `${k.name}: 25 Minuten kommen auf 25`);
    ok(kurz.every(b => b.min >= P.MINDEST), `${k.name}: kein zu kurzer Block`);
    eq(kurz[0].id, voll[0].id, `${k.name}: der erste Block bleibt der erste`);
    ok(kurz.every(b => b.cues && b.cues.length), `${k.name}: Merkpunkte bleiben erhalten`);
  }
}

console.log("\nDie Kontexte selbst");
{
  eq(P.KONTEXTE.length, 3, "drei Kontexte");
  eq(P.kontextOf("gibtsnicht").id, "probelokal", "unbekannt fällt auf das Probelokal zurück");
  const ts = P.kontextOf("travelsax");
  ok(!!ts.warnung, "am Travel Sax steht die Warnung dabei");
  ok(/Ansatz|Voicing|Obertöne/.test(ts.warnung), "und benennt, was dort nicht geht");
}

console.log("\nWerkzeug zurück auf den Block");
{
  eq(P.blockFuerWerkzeug("probelokal", "obertoene"), "obertoene", "Obertöne finden ihren Block");
  eq(P.blockFuerWerkzeug("probelokal", "bordun"), "intonation", "der Bordun gehört zur Intonation");
  eq(P.blockFuerWerkzeug("probelokal", "tonleitern"), null, "was nicht im Plan steht, gibt null");
  eq(P.blockFuerWerkzeug("probelokal", null), null, "ohne Werkzeug kein Block");
  eq(P.blockFuerWerkzeug("leise", "tonleitern"), "singen_greifen",
     "im leisen Kontext hängen Tonleitern am Singen und Greifen");
}

console.log("\nbaueSession direkt");
{
  const b = [
    { id: "a", name: "A", min: 10, cues: ["x"] },
    { id: "b", name: "B", min: 20, cues: ["x"] },
    { id: "c", name: "C", min: 30, cues: ["x"] },
  ];
  eq(summe(P.baueSession(b, 0)), 60, "ohne Vorgabe unverändert");
  eq(summe(P.baueSession(b, 30)), 30, "auf dreißig gekürzt");
  eq(P.baueSession(b, 3).length, 1, "drei Minuten reichen für genau einen Block");
  eq(P.baueSession(b, 3)[0].id, "a", "und zwar für den ersten");
  eq(summe(P.baueSession(b, 3)), 3, "auch dann stimmt die Summe");
  eq(P.baueSession([], 30).length, 0, "ohne Blöcke kommt nichts heraus");
  ok(P.baueSession(b, 30) !== b, "die Vorlage wird nicht verändert");
  eq(b[1].min, 20, "die Blockliste bleibt, wie sie war");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
