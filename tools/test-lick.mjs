/* Prüft js/music/lick.js.

   Ein Lick ist schwerer zu prüfen als eine Tonleiter — „klingt gut" lässt
   sich nicht messen. Prüfbar ist aber, ob die drei Regeln eingehalten
   werden, nach denen es gebaut sein soll: Akkordton auf der Eins beim
   Wechsel, überwiegend Schritte, und alles im spielbaren Bereich. Genau das
   steht hier. */

import { generateLick, STUFEN } from "../js/music/lick.js";
import { PROGRESSIONS, buildProgression, chordAtBar, chordPitches, scalePitches }
  from "../js/music/harmonie.js";
import { toMidi } from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);

const allePc = ps => new Set(ps.map(m => ((m % 12) + 12) % 12));

console.log("\nAlles liegt in bequemer Lage");
for (const prog of PROGRESSIONS) {
  for (let pc = 0; pc < 12; pc += 3) {
    const akk = buildProgression(prog, pc);
    for (const stufe of STUFEN.map(s => s.id)) {
      for (let seed = 0; seed < 5; seed++) {
        const lick = generateLick(akk, 0, 2, { stufe, seed });
        ok(lick.length > 0, `${prog.id}/${stufe}/${seed}: nicht leer`);
        for (const nt of lick) {
          // Klingend F3 bis D5 — das liegt am Alt gegriffen zwischen D4 und H5.
          ok(nt.midi >= 53 && nt.midi <= 74,
             `${prog.id}/${stufe}/${seed}: ${nt.midi} liegt in der Lage`);
        }
      }
    }
  }
}

console.log("\nZeiten sind sauber");
for (let seed = 0; seed < 40; seed++) {
  const akk = buildProgression(PROGRESSIONS[0], 0);
  const lick = generateLick(akk, 0, 2, { seed });
  for (let i = 1; i < lick.length; i++) {
    ok(lick[i].beat > lick[i - 1].beat, `Lauf ${seed}: Zeiten steigen`);
  }
  ok(lick.every(nt => nt.beat >= 0 && nt.beat < 8), `Lauf ${seed}: alles im Zweitakter`);
  ok(lick.every(nt => nt.dauer > 0), `Lauf ${seed}: jede Note hat Dauer`);
  // Kein Überhang über das Ende hinaus.
  const letzte = lick[lick.length - 1];
  ok(letzte.beat + letzte.dauer <= 8.001, `Lauf ${seed}: nichts ragt über den Zweitakter`);
}

console.log("\nRegel 1: Akkordton auf der Eins beim Wechsel");
{
  let treffer = 0, gesamt = 0;
  for (const prog of PROGRESSIONS) {
    const akk = buildProgression(prog, 0);
    for (let seed = 0; seed < 25; seed++) {
      const lick = generateLick(akk, 0, 2, { seed });
      const aufEins = lick.find(nt => nt.beat === 0);
      if (!aufEins) continue;
      const akkord = chordAtBar(akk, 0);
      const toene = allePc(chordPitches(akkord.root, akkord.q).map(toMidi));
      gesamt++;
      if (toene.has(((aufEins.midi % 12) + 12) % 12)) treffer++;
    }
  }
  ok(gesamt > 0, "es gibt Noten auf der Eins");
  const quote = treffer / gesamt;
  ok(quote > 0.9, `auf der Eins steht fast immer ein Akkordton (${(quote * 100).toFixed(0)} %)`);
}

console.log("\nAlle Töne gehören zur Skala des jeweiligen Takts");
for (const prog of PROGRESSIONS) {
  const akk = buildProgression(prog, 0);
  for (let seed = 0; seed < 12; seed++) {
    const lick = generateLick(akk, 0, 2, { seed });
    for (const nt of lick) {
      const takt = Math.floor(nt.beat / 4);
      const akkord = chordAtBar(akk, takt);
      const erlaubt = allePc(scalePitches(akkord.root, akkord.q).map(toMidi));
      ok(erlaubt.has(((nt.midi % 12) + 12) % 12),
         `${prog.id}/${seed}: ${nt.midi} gehört zur Skala von ${akkord.symbol}`);
    }
  }
}

console.log("\nRegel 3: überwiegend Schritte, nach Sprüngen Umkehr");
{
  let schritte = 0, spruenge = 0, weit = 0;
  let umkehr = 0, nachSprung = 0;
  for (let seed = 0; seed < 150; seed++) {
    const akk = buildProgression(PROGRESSIONS[0], 0);
    const lick = generateLick(akk, 0, 2, { seed, stufe: "mittel" });
    let letzterSprung = 0;
    for (let i = 1; i < lick.length; i++) {
      const d = lick[i].midi - lick[i - 1].midi;
      if (Math.abs(d) <= 2) schritte++; else spruenge++;
      if (Math.abs(d) > 12) weit++;
      if (Math.abs(letzterSprung) > 4) {
        nachSprung++;
        if (Math.sign(d) !== Math.sign(letzterSprung) || d === 0) umkehr++;
      }
      letzterSprung = d;
    }
  }
  const anteil = schritte / (schritte + spruenge);
  ok(anteil > 0.45, `mindestens knapp die Hälfte Schritte (${(anteil * 100).toFixed(0)} %)`);
  ok(spruenge > 0, "es gibt Sprünge");
  eq(weit, 0, "kein Sprung über eine Oktave");
  if (nachSprung > 10) {
    ok(umkehr / nachSprung > 0.55,
       `nach groszen Spruengen wird meist umgekehrt (${(umkehr / nachSprung * 100).toFixed(0)} %)`);
  }
}

console.log("\nStufen unterscheiden sich in der Dichte");
{
  const dichte = stufe => {
    let n = 0;
    for (let seed = 0; seed < 60; seed++) {
      n += generateLick(buildProgression(PROGRESSIONS[0], 0), 0, 2, { stufe, seed }).length;
    }
    return n / 60;
  };
  const r = dichte("ruhig"), m = dichte("mittel"), d = dichte("dicht");
  ok(r < m, `ruhig hat weniger Töne als mittel (${r.toFixed(1)} gegen ${m.toFixed(1)})`);
  ok(m < d, `mittel weniger als dicht (${m.toFixed(1)} gegen ${d.toFixed(1)})`);
  eq(STUFEN.length, 3, "drei Stufen");
}

console.log("\nLicks über verschiedene Stellen der Folge");
{
  const akk = buildProgression(PROGRESSIONS.find(p => p.id === "blues"), 10);
  for (let ab = 0; ab < 12; ab++) {
    const lick = generateLick(akk, ab, 2, { seed: ab });
    ok(lick.length > 0, `ab Takt ${ab}: nicht leer`);
    // Der erste Ton muss zum Akkord dieses Takts passen.
    const akkord = chordAtBar(akk, ab);
    const erlaubt = allePc(scalePitches(akkord.root, akkord.q).map(toMidi));
    ok(erlaubt.has(((lick[0].midi % 12) + 12) % 12),
       `ab Takt ${ab}: erster Ton passt zu ${akkord.symbol}`);
  }
}

console.log("\nDerselbe Startwert gibt dasselbe Lick");
{
  const akk = buildProgression(PROGRESSIONS[0], 0);
  const a = JSON.stringify(generateLick(akk, 0, 2, { seed: 5 }));
  const b = JSON.stringify(generateLick(akk, 0, 2, { seed: 5 }));
  const c = JSON.stringify(generateLick(akk, 0, 2, { seed: 6 }));
  eq(a, b, "gleicher Startwert, gleiches Lick");
  ok(a !== c, "anderer Startwert, anderes Lick");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
