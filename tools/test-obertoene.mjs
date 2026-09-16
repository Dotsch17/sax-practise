/* Prüft js/music/obertoene.js.

   Der Fehler, den diese Datei vermeiden soll: Teiltöne über die
   nächstgelegene Klaviertaste zu bestimmen. Der fünfte Teilton liegt rund
   14 Cent unter der gleichstufigen groszen Terz, der siebte rund 31 Cent
   unter der kleinen Septime. Wer das nicht berücksichtigt, meldet einen
   perfekt geblasenen fünften Teilton als „zu tief". */

import { partials, erkennePartial, grundFrequenz, vergleicheMatching, GRUNDGRIFFE }
  from "../js/music/obertoene.js";
import { midiToFreq, toSounding } from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);
const nah = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, `${m} (${a} gegen ${b})`);

console.log("\nGrundfrequenz aus dem Griff");
// Notiert tief B ist MIDI 58, klingend also 49.
nah(grundFrequenz(58), midiToFreq(49), 0.01, "tief B klingt als MIDI 49");
nah(grundFrequenz(60), midiToFreq(51), 0.01, "tief C klingt als MIDI 51");
for (const g of GRUNDGRIFFE) {
  nah(grundFrequenz(g.written), midiToFreq(toSounding(g.written)), 0.01,
      `${g.name}: Grundfrequenz stimmt`);
}

console.log("\nTeiltöne liegen auf ganzzahligen Vielfachen");
{
  const f0 = 100;
  const p = partials(f0, 8);
  eq(p.length, 8, "acht Teiltöne");
  for (let k = 1; k <= 8; k++) {
    nah(p[k - 1].freq, f0 * k, 1e-6, `Teilton ${k} liegt bei ${k}·f0`);
    eq(p[k - 1].k, k, `Teilton ${k} ist als ${k} gezählt`);
  }
}

console.log("\nDie Abweichungen von der Klaviertastatur stimmen");
{
  // Diese Zahlen sind Physik und nicht verhandelbar.
  const p = partials(midiToFreq(49), 8);
  nah(p[0].cents, 0, 1, "Teilton 1: die Oktavlage des Grundtons, 0 Cent");
  nah(p[1].cents, 0, 1, "Teilton 2: Oktave, 0 Cent");
  nah(p[2].cents, 2, 2, "Teilton 3: Quinte, rund +2 Cent");
  nah(p[3].cents, 0, 1, "Teilton 4: Doppeloktave, 0 Cent");
  nah(p[4].cents, -14, 2, "Teilton 5: grosze Terz, rund -14 Cent");
  nah(p[5].cents, 2, 2, "Teilton 6: Quinte, rund +2 Cent");
  nah(p[6].cents, -31, 2, "Teilton 7: kleine Septime, rund -31 Cent");
  nah(p[7].cents, 0, 1, "Teilton 8: Dreifachoktave, 0 Cent");
}

console.log("\nErkennung trifft den richtigen Teilton");
for (const grundMidi of [49, 50, 51]) {
  const f0 = midiToFreq(grundMidi);
  for (let k = 1; k <= 8; k++) {
    const r = erkennePartial(f0 * k, f0);
    eq(r.k, k, `Grundton ${grundMidi}: exakter Teilton ${k} wird als ${k} erkannt`);
    nah(r.abweichungCents, 0, 1, `Grundton ${grundMidi}, Teilton ${k}: keine Abweichung`);
    ok(r.sicher, `Grundton ${grundMidi}, Teilton ${k}: sicher`);
  }
}

console.log("\nEin sauber geblasener fünfter Teilton gilt nicht als verstimmt");
{
  const f0 = midiToFreq(49);
  // Genau der fünfte Teilton — also 14 Cent unter der Klaviertaste.
  const r = erkennePartial(f0 * 5, f0);
  eq(r.k, 5, "wird als fünfter Teilton erkannt");
  nah(r.abweichungCents, 0, 1, "und als richtig, nicht als 14 Cent zu tief");
  // Gegenprobe: wer ihn auf die Klaviertaste zieht, ist wirklich daneben.
  const aufTaste = midiToFreq(Math.round(1200 * Math.log2(f0 * 5 / 440) / 100 + 69));
  const r2 = erkennePartial(aufTaste, f0);
  nah(r2.abweichungCents, 14, 3, "auf die Klaviertaste gezogen sind es rund +14 Cent");
}

console.log("\nLeichte Abweichungen bleiben demselben Teilton zugeordnet");
{
  const f0 = midiToFreq(49);
  for (const cents of [-30, -15, 15, 30]) {
    const r = erkennePartial(f0 * 3 * Math.pow(2, cents / 1200), f0);
    eq(r.k, 3, `${cents} Cent daneben ist noch Teilton 3`);
    nah(r.abweichungCents, cents, 2, `${cents} Cent werden gemessen`);
    ok(r.sicher, `${cents} Cent gilt noch als sicher`);
  }
}

console.log("\nQuetschtöne zwischen zwei Teiltönen gelten als unsicher");
{
  const f0 = midiToFreq(49);
  // Genau zwischen Teilton 2 und 3.
  const r = erkennePartial(f0 * 2.5, f0);
  ok(!r.sicher, `zwischen zwei Teiltönen ist unsicher (k=${r.k}, ${r.abweichungCents} Cent)`);
  // Auch oben, wo die Teiltöne enger liegen.
  const r2 = erkennePartial(f0 * 7.5, f0);
  ok(!r2.sicher, "auch oben, wo die Abstände kleiner sind");
  // Dort muss die Grenze enger sein als unten -- sonst gilt oben alles als sicher.
  const r3 = erkennePartial(f0 * 7 * Math.pow(2, 90 / 1200), f0);
  ok(!r3.sicher, "90 Cent über Teilton 7 ist nicht mehr sicher");
  const r4 = erkennePartial(f0 * 2 * Math.pow(2, 90 / 1200), f0);
  ok(r4.sicher, "90 Cent über Teilton 2 ist dagegen noch im Rahmen");
}

console.log("\nUnsinnige Eingaben stürzen nicht ab");
{
  ok(!erkennePartial(0, 100).sicher, "Frequenz 0");
  ok(!erkennePartial(100, 0).sicher, "Grundton 0");
  ok(!erkennePartial(NaN, 100).sicher, "NaN");
  eq(partials(0, 4).length, 4, "Grundton 0 liefert trotzdem vier Einträge");
}

console.log("\nMatching-Urteil");
{
  let r = vergleicheMatching({ cents: 2, centroid: 1500 }, { cents: 0, centroid: 1480 });
  ok(/passt/.test(r.urteil), `gleiche Höhe und Farbe: ${r.urteil}`);
  eq(r.centsDiff, 2, "Centdifferenz");

  r = vergleicheMatching({ cents: 0, centroid: 2000 }, { cents: 0, centroid: 1400 });
  ok(/dunkler/.test(r.urteil), `gegriffener Ton dunkler: ${r.urteil}`);
  ok(r.relativ > 15, `relativer Unterschied ${r.relativ} %`);

  r = vergleicheMatching({ cents: 40, centroid: 1500 }, { cents: 0, centroid: 1500 });
  ok(/Tonhöhen/.test(r.urteil), `Höhe weit auseinander: ${r.urteil}`);

  r = vergleicheMatching({ cents: 0, centroid: 1200 }, { cents: 0, centroid: 1900 });
  ok(/heller/.test(r.urteil), `gegriffener Ton heller: ${r.urteil}`);

  r = vergleicheMatching({ cents: 18, centroid: 1500 }, { cents: 0, centroid: 1480 });
  ok(/Farbe stimmt/.test(r.urteil), `Farbe gut, Höhe knapp daneben: ${r.urteil}`);

  // Ohne Spektrumdaten darf nichts explodieren.
  r = vergleicheMatching({ cents: 0 }, { cents: 0 });
  ok(typeof r.urteil === "string" && r.urteil.length > 0, "auch ohne Spektrum ein Urteil");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
