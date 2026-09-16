/* Prüft js/music/rhythmus.js. Der Generator muss in jedem Fall Takte
   liefern, die exakt aufgehen — ein Takt mit 4,5 Schlägen ist schlimmer als
   gar kein Generator, weil er beim Üben unbemerkt Unsinn antrainiert. */

import { generateRhythm, bewerte, mulberry32, STUFEN } from "../js/music/rhythmus.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);

const laenge = nt => nt.dur * (nt.dots ? 1.5 : 1);

console.log("\nJeder erzeugte Takt geht exakt auf");
for (const beats of [2, 3, 4, 5, 6]) {
  for (const stufe of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 40; seed++) {
      const { noten, dauer } = generateRhythm({ beats, stufe, takte: 2, seed });
      ok(Math.abs(dauer - beats * 2) < 1e-6,
         `${beats}/4, Stufe ${stufe}, Lauf ${seed}: Gesamtlaenge ${dauer} statt ${beats * 2}`);

      // Auch jeder einzelne Takt muss stimmen, nicht nur die Summe.
      let takt = 0, i = 0;
      for (const nt of noten) {
        if (nt.barline) {
          ok(Math.abs(takt - beats) < 1e-6,
             `${beats}/4, Stufe ${stufe}, Lauf ${seed}: Takt ${i} hat ${takt} statt ${beats}`);
          takt = 0; i++;
          continue;
        }
        takt += laenge(nt);
      }
    }
  }
}

console.log("\nEinsaetze passen zu den Noten");
for (let seed = 0; seed < 30; seed++) {
  const { noten, einsaetze } = generateRhythm({ beats: 4, stufe: 3, takte: 2, seed });
  const klingende = noten.filter(nt => !nt.barline && nt.pitch);
  eq(einsaetze.length, klingende.length, `Lauf ${seed}: ein Einsatz je klingender Note`);
  for (let i = 1; i < einsaetze.length; i++) {
    ok(einsaetze[i] > einsaetze[i - 1], `Lauf ${seed}: Einsaetze steigen`);
  }
  ok(einsaetze.every(e => e >= 0 && e < 8.001), `Lauf ${seed}: alle Einsaetze im Stueck`);
}

console.log("\nStufen unterscheiden sich wirklich");
{
  const kuerzeste = stufe => {
    let min = 9;
    for (let seed = 0; seed < 60; seed++) {
      for (const nt of generateRhythm({ beats: 4, stufe, takte: 2, seed }).noten) {
        if (!nt.barline) min = Math.min(min, nt.dur);
      }
    }
    return min;
  };
  eq(kuerzeste(1), 1, "Stufe 1 kennt nichts unter einer Viertel");
  eq(kuerzeste(2), 0.5, "Stufe 2 geht bis zur Achtel");
  eq(kuerzeste(3), 0.25, "Stufe 3 geht bis zur Sechzehntel");
  eq(STUFEN.length, 4, "vier Stufen");
}

console.log("\nDerselbe Startwert gibt denselben Rhythmus");
{
  const a = JSON.stringify(generateRhythm({ seed: 7 }).noten);
  const b = JSON.stringify(generateRhythm({ seed: 7 }).noten);
  const c = JSON.stringify(generateRhythm({ seed: 8 }).noten);
  eq(a, b, "gleicher Startwert, gleiches Ergebnis");
  ok(a !== c, "anderer Startwert, anderes Ergebnis");
}

console.log("\nBewertung");
{
  const einsaetze = [0, 1, 2, 3];
  const spv = 0.5;              // 120 bpm
  const start = 10;

  // Perfekt getippt
  let r = bewerte(einsaetze.map(e => start + e * spv), einsaetze, start, spv);
  eq(r.getroffen, 4, "alle vier getroffen");
  eq(r.mittlereAbweichungMs, 0, "keine Abweichung");
  eq(r.zuviel, 0, "nichts zu viel");

  // Durchgehend 40 ms zu spaet: das ist Schleppen, nicht Ungenauigkeit
  r = bewerte(einsaetze.map(e => start + e * spv + 0.04), einsaetze, start, spv);
  eq(r.versatzMs, 40, "Versatz von 40 ms wird erkannt");
  eq(r.mittlereAbweichungMs, 40, "mittlere Abweichung 40 ms");

  // Streuung ohne Versatz
  r = bewerte([start, start + spv + 0.05, start + 2 * spv - 0.05, start + 3 * spv],
              einsaetze, start, spv);
  eq(r.versatzMs, 0, "kein Versatz, wenn es sich ausgleicht");
  eq(r.mittlereAbweichungMs, 25, "aber die Abweichung bleibt sichtbar");

  // Einen ausgelassen: die folgenden duerfen nicht mit verloren gehen
  r = bewerte([start, start + 2 * spv, start + 3 * spv], einsaetze, start, spv);
  eq(r.getroffen, 3, "drei von vier getroffen");
  eq(r.treffer[1], null, "genau der zweite fehlt");
  ok(r.treffer[2] !== null && r.treffer[3] !== null, "die folgenden zaehlen weiter");

  // Zu viel getippt
  r = bewerte([...einsaetze.map(e => start + e * spv), start + 0.2], einsaetze, start, spv);
  eq(r.zuviel, 1, "ein Tipp zu viel wird gezaehlt");

  // Weit daneben zaehlt nicht als Treffer
  r = bewerte([start + 0.4], [0], start, spv);
  eq(r.getroffen, 0, "400 ms daneben ist kein Treffer");

  r = bewerte([], einsaetze, start, spv);
  eq(r.getroffen, 0, "gar nicht getippt");
  eq(r.mittlereAbweichungMs, null, "ohne Treffer keine Abweichung");
}

console.log("\nZufallsgenerator");
{
  const r = mulberry32(42);
  const werte = Array.from({ length: 500 }, r);
  ok(werte.every(v => v >= 0 && v < 1), "alle Werte zwischen 0 und 1");
  const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
  ok(Math.abs(mittel - 0.5) < 0.06, `Mittelwert nahe 0,5 (${mittel.toFixed(3)})`);
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
