/* Prüft js/music/melodie.js. Der Generator muss Melodien liefern, die
   spielbar und lesbar sind — nicht nur formal gültig. Deshalb wird hier
   auch geprüft, ob die Gestalt stimmt: wieviel Schritt gegen Sprung, ob
   nach einem Sprung umgekehrt wird, ob Anfang und Ende auf dem Grundton
   liegen. */

import { generateMelodie, generatePhrase, spannweite, STUFEN } from "../js/music/melodie.js";
import { toMidi, spell, RANGE, MAJOR_KEYS, keySignatureSteps } from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);

const toene = m => m.noten.filter(x => x.pitch);

console.log("\nAlles bleibt im spielbaren Umfang");
for (const key of MAJOR_KEYS) {
  for (const stufe of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 8; seed++) {
      const m = generateMelodie({ tonic: key.tonic, stufe, takte: 4, seed });
      for (const nt of toene(m)) {
        const midi = toMidi(nt.pitch);
        ok(midi >= RANGE.writtenLow && midi <= RANGE.writtenHigh,
           `${key.name} Stufe ${stufe} Lauf ${seed}: ${spell(nt.pitch)}${nt.pitch.octave} = ${midi} liegt im Umfang`);
      }
    }
  }
}

console.log("\nTakte gehen auf");
for (const beats of [3, 4]) {
  for (let seed = 0; seed < 20; seed++) {
    const m = generateMelodie({ tonic: MAJOR_KEYS[0].tonic, stufe: 3, takte: 3, beats, seed });
    let takt = 0, takte = 0;
    for (const nt of m.noten) {
      if (nt.barline) {
        if (nt.barline !== "end") {
          ok(Math.abs(takt - beats) < 1e-6, `${beats}/4 Lauf ${seed}: Takt ${takte} hat ${takt}`);
          takt = 0; takte++;
        }
        continue;
      }
      takt += nt.dur * (nt.dots ? 1.5 : 1);
    }
  }
}

console.log("\nAnfang und Ende liegen auf dem Grundton");
for (let seed = 0; seed < 40; seed++) {
  const key = MAJOR_KEYS[seed % MAJOR_KEYS.length];
  const m = generateMelodie({ tonic: key.tonic, stufe: 2, takte: 4, seed });
  const t = toene(m);
  ok(t.length >= 2, `Lauf ${seed}: mindestens zwei Toene`);
  if (t.length < 2) continue;
  eq(spell(t[0].pitch), spell(key.tonic), `Lauf ${seed}: beginnt auf ${key.name}`);
  eq(spell(t[t.length - 1].pitch), spell(key.tonic), `Lauf ${seed}: endet auf ${key.name}`);
}

console.log("\nGestalt: ueberwiegend Schritte, Spruenge nur in den Dreiklang");
{
  let schritte = 0, spruenge = 0, weiteSpruenge = 0;
  let nachSprungUmkehr = 0, nachSprungGesamt = 0;

  for (let seed = 0; seed < 120; seed++) {
    const m = generateMelodie({ tonic: MAJOR_KEYS[0].tonic, stufe: 3, takte: 4, seed });
    const t = toene(m).map(x => toMidi(x.pitch));
    let letzterSprung = 0;
    for (let i = 1; i < t.length; i++) {
      const d = t[i] - t[i - 1];
      if (Math.abs(d) <= 2) schritte++; else spruenge++;
      if (Math.abs(d) > 9) weiteSpruenge++;
      if (Math.abs(letzterSprung) > 2) {
        nachSprungGesamt++;
        if (Math.sign(d) !== Math.sign(letzterSprung) || d === 0) nachSprungUmkehr++;
      }
      letzterSprung = d;
    }
  }
  const anteilSchritte = schritte / (schritte + spruenge);
  ok(anteilSchritte > 0.55,
     `mehr als die Haelfte sind Schritte (${(anteilSchritte * 100).toFixed(0)} %)`);
  ok(spruenge > 0, "es gibt ueberhaupt Spruenge");
  eq(weiteSpruenge, 0, "keine Spruenge weiter als eine Sexte");
  const umkehrquote = nachSprungGesamt ? nachSprungUmkehr / nachSprungGesamt : 1;
  ok(umkehrquote > 0.6,
     `nach einem Sprung wird meist umgekehrt (${(umkehrquote * 100).toFixed(0)} %)`);
}

console.log("\nStufen sind wirklich verschieden schwer");
{
  const messe = stufe => {
    let sw = 0, kuerzeste = 9, laeufe = 60;
    for (let seed = 0; seed < laeufe; seed++) {
      const m = generateMelodie({ tonic: MAJOR_KEYS[0].tonic, stufe, takte: 4, seed });
      sw += spannweite(m.noten);
      for (const nt of m.noten) if (!nt.barline) kuerzeste = Math.min(kuerzeste, nt.dur);
    }
    return { spannweite: sw / laeufe, kuerzeste };
  };
  const s1 = messe(1), s2 = messe(2), s4 = messe(4);
  ok(s1.spannweite < s2.spannweite, `Stufe 1 enger als Stufe 2 (${s1.spannweite.toFixed(1)} gegen ${s2.spannweite.toFixed(1)})`);
  ok(s2.spannweite < s4.spannweite, `Stufe 2 enger als Stufe 4 (${s2.spannweite.toFixed(1)} gegen ${s4.spannweite.toFixed(1)})`);
  eq(s1.kuerzeste, 1, "Stufe 1 kennt nichts unter einer Viertel");
  ok(s4.kuerzeste <= 0.25, "Stufe 4 geht bis zur Sechzehntel");
  eq(STUFEN.length, 4, "vier Stufen");
}

console.log("\nToene passen zur Tonart");
for (const key of MAJOR_KEYS) {
  const m = generateMelodie({ tonic: key.tonic, stufe: 3, takte: 4, seed: 5 });
  eq(m.keySig, key.sig, `${key.name}: Vorzeichnung ${key.sig}`);
  const sigSteps = keySignatureSteps(key.sig);
  const erwartet = key.sig >= 0 ? 1 : -1;
  for (const nt of toene(m)) {
    const soll = sigSteps.includes(nt.pitch.step) ? erwartet : 0;
    eq(nt.pitch.alter, soll,
       `${key.name}: ${spell(nt.pitch)} passt zur Vorzeichnung`);
  }
}

console.log("\nDerselbe Startwert gibt dieselbe Melodie");
{
  const a = JSON.stringify(generateMelodie({ tonic: MAJOR_KEYS[2].tonic, seed: 3 }).noten);
  const b = JSON.stringify(generateMelodie({ tonic: MAJOR_KEYS[2].tonic, seed: 3 }).noten);
  const c = JSON.stringify(generateMelodie({ tonic: MAJOR_KEYS[2].tonic, seed: 4 }).noten);
  eq(a, b, "gleicher Startwert, gleiches Ergebnis");
  ok(a !== c, "anderer Startwert, anderes Ergebnis");
}

console.log("\nPhrasen fuers Nachspielen");
for (const key of MAJOR_KEYS) {
  for (const laenge of [2, 3, 4, 6, 8]) {
    for (let seed = 0; seed < 6; seed++) {
      const p = generatePhrase({ tonic: key.tonic, laenge, seed, sprung: 0.25 });
      eq(p.length, laenge, `${key.name}, ${laenge} Toene: richtige Laenge`);
      ok(p.every(x => toMidi(x) >= RANGE.writtenLow && toMidi(x) <= RANGE.writtenHigh),
         `${key.name}, ${laenge} Toene: alles im Umfang`);
      eq(spell(p[0]), spell(key.tonic), `${key.name}: beginnt auf dem Grundton`);
    }
  }
}
{
  // Auch hier soll es ueberwiegend Schritte geben, sonst kann man sich die
  // Phrase nicht merken -- und Merken ist die ganze Uebung.
  let schritte = 0, spruenge = 0;
  for (let seed = 0; seed < 200; seed++) {
    const p = generatePhrase({ tonic: MAJOR_KEYS[0].tonic, laenge: 6, seed, sprung: 0.25 });
    for (let i = 1; i < p.length; i++) {
      Math.abs(toMidi(p[i]) - toMidi(p[i-1])) <= 2 ? schritte++ : spruenge++;
    }
  }
  const anteil = schritte / (schritte + spruenge);
  ok(anteil > 0.55, `ueberwiegend Schritte (${(anteil*100).toFixed(0)} %)`);
  ok(spruenge > 0, "aber es gibt auch Spruenge");
}
{
  const a = JSON.stringify(generatePhrase({ tonic: MAJOR_KEYS[0].tonic, seed: 9 }));
  const b = JSON.stringify(generatePhrase({ tonic: MAJOR_KEYS[0].tonic, seed: 9 }));
  eq(a, b, "gleicher Startwert, gleiche Phrase");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
