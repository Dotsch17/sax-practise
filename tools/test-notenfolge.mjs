/* Prüft js/audio/notenfolge.js mit gerechneten Messwertströmen.

   Das ist genau der Teil, den man am Gerät nicht prüfen kann: man kann nicht
   reproduzierbar danebenspielen. Hier lassen sich die Fälle bauen, die beim
   Saxophon wirklich vorkommen — Ansprache mit Oktavsprung, gebundene Töne
   ohne Stille dazwischen, ein kurzer Wackler mitten im Ton. */

import { sammler, vergleiche, VORGABEN } from "../js/audio/notenfolge.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

const RATE = 1 / 30;      // dreißig Messungen je Sekunde, wie in pitch.js

/**
 * Spielt einen Strom ab. `folge` ist eine Liste aus
 *   { midi, ms, cents?, klarheit? }  oder  { still: true, ms }
 */
function strom(folge, opts = {}) {
  const raus = [];
  const s = sammler(nt => raus.push(nt), opts);
  let t = 0;
  for (const teil of folge) {
    const schritte = Math.round(teil.ms / 1000 / RATE);
    for (let i = 0; i < schritte; i++) {
      if (teil.still) {
        s.fuettere({ zeit: t, still: true });
      } else {
        s.fuettere({
          zeit: t,
          midiExact: teil.midi + (teil.cents || 0) / 100,
          klarheit: teil.klarheit ?? 0.95,
        });
      }
      t += RATE;
    }
  }
  s.beende(t);
  return raus;
}

const midis = ns => ns.map(x => x.midi);

console.log("\nEinzelne Töne");
eq(midis(strom([{ midi: 69, ms: 500 }])), [69], "ein gehaltener Ton");
eq(midis(strom([{ midi: 69, ms: 40 }])), [], "ein zu kurzer Ton zählt nicht");
eq(midis(strom([{ still: true, ms: 500 }])), [], "Stille gibt keine Note");
eq(midis(strom([{ midi: 69, ms: 500, klarheit: 0.3 }])), [],
   "unsichere Messungen zählen nicht");

console.log("\nFolgen mit Stille dazwischen");
eq(midis(strom([
  { midi: 69, ms: 400 }, { still: true, ms: 250 },
  { midi: 71, ms: 400 }, { still: true, ms: 250 },
  { midi: 72, ms: 400 },
])), [69, 71, 72], "drei getrennte Töne");

console.log("\nGebundene Töne ohne Stille");
// Genau das ist der schwierige Fall: zwischen zwei Legatotönen gibt es keine
// Lücke, an der man trennen könnte.
eq(midis(strom([
  { midi: 67, ms: 400 }, { midi: 69, ms: 400 }, { midi: 71, ms: 400 },
])), [67, 69, 71], "drei gebundene Töne werden getrennt");
eq(midis(strom([
  { midi: 60, ms: 300 }, { midi: 62, ms: 300 }, { midi: 64, ms: 300 },
  { midi: 65, ms: 300 }, { midi: 67, ms: 400 },
])), [60, 62, 64, 65, 67], "fünf gebundene Töne");

console.log("\nDerselbe Ton zweimal hintereinander");
// Ohne Stille dazwischen ist das nicht zu trennen — und das ist richtig so.
eq(midis(strom([{ midi: 69, ms: 400 }, { midi: 69, ms: 400 }])), [69],
   "zweimal derselbe Ton ohne Lücke ist eine Note");
eq(midis(strom([
  { midi: 69, ms: 300 }, { still: true, ms: 250 }, { midi: 69, ms: 300 },
])), [69, 69], "mit Lücke sind es zwei");

console.log("\nAnsprache: die ersten Millisekunden liegen daneben");
// Ein kurzer Oktavsprung beim Anblasen darf keine eigene Note werden.
eq(midis(strom([
  { midi: 81, ms: 50 },          // Ansprache kippt in die Oktave
  { midi: 69, ms: 500 },
])), [69], "ein kurzer Oktavsprung beim Anblasen wird verschluckt");
eq(midis(strom([
  { midi: 68, ms: 40 },          // Ansatz zieht den Ton erst hoch
  { midi: 69, ms: 500 },
])), [69], "eine kurze Fehltonhöhe am Anfang zählt nicht");

console.log("\nEin Wackler mitten im Ton");
eq(midis(strom([
  { midi: 69, ms: 300 }, { midi: 70, ms: 40 }, { midi: 69, ms: 300 },
])), [69], "ein kurzer Ausrutscher teilt den Ton nicht");

console.log("\nIntonation innerhalb der Toleranz");
eq(midis(strom([{ midi: 69, cents: 40, ms: 500 }])), [69],
   "40 Cent zu hoch ist noch derselbe Ton");
{
  const r = strom([{ midi: 69, cents: 30, ms: 500 }]);
  ok(Math.abs(r[0].cents - 30) <= 3, `die Abweichung wird gemessen (${r[0].cents} Cent)`);
}
eq(midis(strom([{ midi: 69, cents: 45, ms: 300 }, { midi: 69, cents: -45, ms: 300 }])), [69],
   "Schwanken um weniger als einen Halbton bleibt ein Ton");

console.log("\nDauer wird mitgemessen");
{
  const r = strom([{ midi: 69, ms: 600 }]);
  ok(r[0].dauer > 0.4 && r[0].dauer < 0.75, `Dauer plausibel (${r[0].dauer.toFixed(2)} s)`);
  ok(r[0].beginn >= 0 && r[0].beginn < 0.1, "Beginn liegt am Anfang");
}

console.log("\nEine echte Phrase");
eq(midis(strom([
  { midi: 69, ms: 280 }, { midi: 71, ms: 260 }, { midi: 72, ms: 300 },
  { still: true, ms: 200 },
  { midi: 74, ms: 280 }, { midi: 72, ms: 260 }, { midi: 69, ms: 420 },
])), [69, 71, 72, 74, 72, 69], "sechs Töne, teils gebunden, teils getrennt");

console.log("\nVergleichen");
{
  let r = vergleiche([60, 62, 64], [60, 62, 64]);
  ok(r.alleRichtig, "identische Folge");
  eq(r.richtig, 3, "drei richtig");

  r = vergleiche([60, 63, 64], [60, 62, 64]);
  eq(r.proTon, ["richtig", null, "richtig"], "ein falscher Ton in der Mitte");
  eq(r.fehlend, 1, "einer fehlt");
  ok(!r.alleRichtig, "nicht alles richtig");

  r = vergleiche([60, 64], [60, 62, 64]);
  eq(r.proTon, ["richtig", null, "richtig"], "ein ausgelassener Ton verliert die folgenden nicht");

  r = vergleiche([72, 62, 64], [60, 62, 64]);
  eq(r.proTon, ["oktave", "richtig", "richtig"], "richtiger Ton, falsche Oktave");
  eq(r.oktave, 1, "als Oktavfehler gezählt");

  r = vergleiche([72, 62, 64], [60, 62, 64], { oktaveEgal: false });
  eq(r.proTon, [null, "richtig", "richtig"], "streng gewertet ist die Oktave falsch");

  r = vergleiche([60, 61, 62, 64], [60, 62, 64]);
  eq(r.richtig, 3, "ein Ton zu viel dazwischen stört nicht");
  eq(r.zuviel, 1, "wird aber gezählt");

  r = vergleiche([], [60, 62]);
  eq(r.richtig, 0, "nichts gespielt");
  eq(r.fehlend, 2, "beide fehlen");

  r = vergleiche([60, 62], []);
  eq(r.gesamt, 0, "nichts erwartet");
  ok(r.alleRichtig, "und damit trivial richtig");
}

console.log("\nVorgaben sind plausibel");
ok(VORGABEN.minDauerMs >= 80 && VORGABEN.minDauerMs <= 200,
   "Mindestdauer zwischen 80 und 200 ms");
ok(VORGABEN.toleranzCents > 30 && VORGABEN.toleranzCents < 100,
   "Toleranz unter einem Halbton, aber über dem, was ein Ansatz bewegt");
ok(VORGABEN.wechselMs < VORGABEN.minDauerMs,
   "ein Wechsel darf schneller erkannt werden, als eine Note lang sein muss");

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
