/* Prüft js/music/harmonie.js.

   Der teuerste Fehler hier wäre ein falsch buchstabierter Akkordton: über
   Es7 steht ein Ges, kein Fis. Der zweitteuerste wäre eine Akkordfolge, die
   sich nicht sauber transponieren lässt — dann übt man in elf von zwölf
   Tonarten etwas anderes als in der zwölften. */

import * as H from "../js/music/harmonie.js";
import { spell, toMidi, chromatic, MAJOR_KEYS, stufeInTonart, writtenKeySignature } from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

const P = (step, alter, octave = 4) => ({ step, alter, octave });
const namen = ps => ps.map(p => spell(p));

console.log("\nAkkordtöne klingen richtig");
for (const [id, q] of Object.entries(H.QUALITIES)) {
  for (let pc = 0; pc < 12; pc++) {
    const root = chromatic(60 + pc);
    const toene = H.chordPitches(root, id);
    eq(toene.map(toMidi), q.steps.map(s => toMidi(root) + s),
       `${id} auf ${spell(root)}: Halbtöne stimmen`);
    ok(toene.every(p => Math.abs(p.alter) <= 2),
       `${id} auf ${spell(root)}: kein Dreifachvorzeichen`);
  }
}

console.log("\nAkkordtöne sind richtig buchstabiert");
eq(namen(H.chordPitches(P(0, 0), "maj7")), ["C", "E", "G", "H"], "Cmaj7");
eq(namen(H.chordPitches(P(0, 0), "dom7")), ["C", "E", "G", "B"], "C7");
eq(namen(H.chordPitches(P(1, 0), "m7")), ["D", "F", "A", "C"], "Dm7");
eq(namen(H.chordPitches(P(2, -1), "dom7")), ["Es", "G", "B", "Des"], "Es7 — Des, nicht Cis");
eq(namen(H.chordPitches(P(3, 1), "dom7")), ["Fis", "Ais", "Cis", "E"], "Fis7 — Ais, nicht B");
eq(namen(H.chordPitches(P(6, 0), "m7b5")), ["H", "D", "F", "A"], "Hm7♭5");
eq(namen(H.chordPitches(P(0, 1), "dim7")), ["Cis", "E", "G", "B"], "Cis°7");
eq(namen(H.chordPitches(P(4, 0), "sus7")), ["G", "C", "D", "F"], "G7sus4 — Quarte statt Terz");
eq(namen(H.chordPitches(P(5, 0), "mMaj7")), ["A", "C", "E", "Gis"], "Am maj7 — Gis, nicht As");

console.log("\nZieltöne sind Terz und Septime");
eq(namen(H.guidePitches(P(4, 0), "dom7")), ["H", "F"], "G7: H und F, der Tritonus");
eq(namen(H.guidePitches(P(1, 0), "m7")), ["F", "C"], "Dm7: F und C");
eq(namen(H.guidePitches(P(0, 0), "maj7")), ["E", "H"], "Cmaj7: E und H");
for (const [id, q] of Object.entries(H.QUALITIES)) {
  for (let pc = 0; pc < 12; pc++) {
    const root = chromatic(60 + pc);
    const z = H.guidePitches(root, id);
    eq(z.length, 2, `${id} auf ${spell(root)}: genau zwei Zieltöne`);
    const alle = H.chordPitches(root, id).map(toMidi);
    ok(z.every(p => alle.includes(toMidi(p))),
       `${id} auf ${spell(root)}: Zieltöne sind auch Akkordtöne`);
  }
}

console.log("\nSkalen passen zum Akkord");
eq(namen(H.scalePitches(P(4, 0), "dom7")), ["G","A","H","C","D","E","F"], "G mixolydisch");
eq(namen(H.scalePitches(P(1, 0), "m7")), ["D","E","F","G","A","H","C"], "D dorisch");
eq(namen(H.scalePitches(P(0, 0), "maj7_11")), ["C","D","E","Fis","G","A","H"], "C lydisch");
for (const [id, q] of Object.entries(H.QUALITIES)) {
  for (let pc = 0; pc < 12; pc++) {
    const root = chromatic(60 + pc);
    const sk = H.scalePitches(root, id);
    eq(sk.map(toMidi), q.skala.map(s => toMidi(root) + s),
       `${id} auf ${spell(root)}: Skala klingt richtig`);
    // Jeder Akkordton muss in der Skala vorkommen, sonst passt sie nicht.
    const skPcs = new Set(sk.map(p => toMidi(p) % 12));
    for (const ct of H.chordPitches(root, id)) {
      ok(skPcs.has(toMidi(ct) % 12),
         `${id} auf ${spell(root)}: Akkordton ${spell(ct)} liegt in der Skala`);
    }
    if (q.skala.length === 7) {
      ok(new Set(sk.map(p => p.step)).size === 7,
         `${id} auf ${spell(root)}: siebenstufige Skala benutzt jeden Buchstaben einmal`);
    }
  }
}

console.log("\nAkkordfolgen lassen sich in jede Tonart setzen");
for (const prog of H.PROGRESSIONS) {
  const takte = H.progressionTakte(H.buildProgression(prog, 0));
  ok(takte > 0, `${prog.name}: hat Takte`);
  for (let pc = 0; pc < 12; pc++) {
    const akk = H.buildProgression(prog, pc);
    eq(H.progressionTakte(akk), takte, `${prog.name} in ${pc}: gleiche Länge`);
    // Die Abstände zwischen den Grundtönen müssen in jeder Tonart gleich sein.
    const abstaende = akk.map(a => (toMidi(a.root) - toMidi(akk[0].root) + 120) % 12);
    const ref = H.buildProgression(prog, 0)
      .map(a => (toMidi(a.root) - toMidi(H.buildProgression(prog, 0)[0].root) + 120) % 12);
    eq(abstaende, ref, `${prog.name} in ${pc}: gleiche Struktur`);
    for (const a of akk) {
      ok(H.QUALITIES[a.q], `${prog.name}: ${a.q} ist eine bekannte Akkordart`);
      ok(Math.abs(a.root.alter) <= 1, `${prog.name} in ${pc}: Grundton ${spell(a.root)} ist lesbar`);
      ok(a.symbol.length > 0, `${prog.name} in ${pc}: Symbol vorhanden`);
    }
  }
}

console.log("\nBlues ist zwölf Takte");
eq(H.progressionTakte(H.buildProgression(H.PROGRESSIONS.find(p => p.id === "blues"), 0)), 12,
   "einfacher Blues");
eq(H.progressionTakte(H.buildProgression(H.PROGRESSIONS.find(p => p.id === "jazzblues"), 0)), 12,
   "Jazz-Blues");

console.log("\nAkkord zum Takt finden");
{
  const akk = H.buildProgression(H.PROGRESSIONS.find(p => p.id === "blues"), 0);
  eq(H.chordAtBar(akk, 0).symbol, akk[0].symbol, "Takt 0 ist der erste Akkord");
  eq(H.chordAtBar(akk, 3).symbol, akk[0].symbol, "Takt 3 noch immer");
  eq(H.chordAtBar(akk, 4).symbol, akk[1].symbol, "Takt 4 ist der zweite");
  eq(H.chordAtBar(akk, 12).symbol, akk[0].symbol, "Takt 12 beginnt von vorn");
  eq(H.chordAtBar(akk, 25).symbol, H.chordAtBar(akk, 1).symbol, "zweiter Durchgang stimmt");
  for (let t = 0; t < 40; t++) ok(H.chordAtBar(akk, t), `Takt ${t} liefert einen Akkord`);
}

console.log("\nSymbole");
eq(H.chordSymbol(P(6, -1), "dom7"), "B7", "B7");
eq(H.chordSymbol(P(3, 1), "m7b5"), "Fism7♭5", "Fism7♭5");
eq(H.chordSymbol(P(0, 0), "maj7"), "Cmaj7", "Cmaj7");

console.log("\nMuster auf Skalen anwenden");
{
  const dur = H.scalePitches(P(0, 0), "maj7");
  eq(namen(H.applyPattern(dur, [0, 1, 2, 3])), ["C", "D", "E", "F"], "1 2 3 4");
  eq(namen(H.applyPattern(dur, [0, 2, 4, 6])), ["C", "E", "G", "H"], "1 3 5 7");
  eq(namen(H.applyPattern(dur, [6, 4, 2, 0])), ["H", "G", "E", "C"], "abwärts");
  // Über die Oktave hinaus muss die Oktavzahl mitwachsen.
  const hoch = H.applyPattern(dur, [0, 2, 4, 7]);
  eq(spell(hoch[3]), "C", "achte Stufe ist wieder C");
  eq(hoch[3].octave, dur[0].octave + 1, "und eine Oktave höher");
  // Negative Stufen gehen nach unten.
  const tief = H.applyPattern(dur, [0, -1]);
  eq(spell(tief[1]), "H", "eine Stufe unter C ist H");
  eq(tief[1].octave, dur[0].octave - 1, "und eine Oktave tiefer");
  for (const pat of H.PATTERNS) {
    const r = H.applyPattern(dur, pat.stufen);
    eq(r.length, pat.stufen.length, `${pat.name}: richtige Länge`);
    ok(r.every(p => p && Number.isFinite(toMidi(p))), `${pat.name}: lauter gültige Töne`);
  }
}

console.log("\nJede Akkordfolge hat einen Vorzeichnungsversatz");
for (const prog of H.PROGRESSIONS) {
  ok(typeof prog.sigVersatz === "number",
     `${prog.name}: sigVersatz gesetzt`);
  ok(prog.sigVersatz <= 0 && prog.sigVersatz >= -3,
     `${prog.name}: Versatz ${prog.sigVersatz} ist plausibel`);
}
// Moll liegt drei Quinten unter der Durparallele, Dorisch zwei.
eq(H.PROGRESSIONS.find(p => p.id === "moll251").sigVersatz, -3, "Moll-II-V-I");
eq(H.PROGRESSIONS.find(p => p.id === "dorisch_vamp").sigVersatz, -2, "dorischer Vamp");
eq(H.PROGRESSIONS.find(p => p.id === "dur251").sigVersatz, 0, "Dur-II-V-I");

console.log("\nGegriffene Akkorde in der Tonart der Folge");
{
  // Dieselbe Liste wie TONARTEN im Improvisations-Werkzeug.
  const TONARTEN = [
    { pc: 10, sig: -2 }, { pc: 3, sig: -3 }, { pc: 5, sig: -1 }, { pc: 0, sig: 0 },
    { pc: 7, sig: 1 }, { pc: 2, sig: 2 }, { pc: 9, sig: 3 }, { pc: 4, sig: 4 },
    { pc: 11, sig: 5 }, { pc: 6, sig: 6 }, { pc: 1, sig: -5 }, { pc: 8, sig: -4 },
  ];
  const QUINTE = [0, 2, 4, -1, 1, 3, 5];
  const lof = p => QUINTE[p.step] + 7 * p.alter;
  for (const prog of H.PROGRESSIONS) {
    for (const t of TONARTEN) {
      const v = prog.sigVersatz || 0;
      const tonikaG = writtenKeySignature(t.sig + v) - v;
      for (const a of H.buildProgression(prog, t.pc)) {
        const x = H.inTonart(a, t.sig, v);
        const wo = `${prog.id} in ${t.pc}, ${a.symbol}`;
        ok(toMidi(x.root) === toMidi(a.root) + 9, `${wo}: gegriffen ist eine große Sexte höher`);
        ok(toMidi(x.klingend) === toMidi(a.root), `${wo}: klingend bleibt die Tonhöhe`);
        const d = lof(x.root) - tonikaG;
        ok(d >= -5 && d <= 6, `${wo}: ${spell(x.root)} liegt in der gegriffenen Tonart (${d})`);
        const dk = lof(x.klingend) - t.sig;
        ok(dk >= -5 && dk <= 6, `${wo}: ${spell(x.klingend)} liegt in der klingenden Tonart (${dk})`);
      }
    }
  }
  const folge = (id, pc, sig) => {
    const prog = H.PROGRESSIONS.find(p => p.id === id);
    return H.buildProgression(prog, pc).map(a => H.inTonart(a, sig, prog.sigVersatz || 0));
  };
  // Das war der Fehler: jeder Akkord nach seinem eigenen Grundton
  // buchstabiert, in klingend E also Esm7 As7 Cismaj7 unter sieben Kreuzen.
  eq(folge("dur251", 4, 4).map(x => x.symbol), ["Dism7", "Gis7", "Cismaj7"], "klingend E: gegriffen in Cis-Dur");
  eq(folge("dur251", 9, 3).map(x => x.symbol), ["Gism7", "Cis7", "Fismaj7"], "klingend A: gegriffen in Fis-Dur");
  eq(folge("dur251", 11, 5).map(x => x.symbol), ["Bm7", "Es7", "Asmaj7"], "klingend H: gegriffen in As-Dur, wie die Vorzeichnung");
  eq(folge("dur251", 3, -3).map(x => x.symbol), ["Dm7", "G7", "Cmaj7"], "klingend Es: gegriffen in C-Dur");
  eq(folge("dur251", 1, -5).map(x => x.klingendSymbol), ["Esm7", "As7", "Desmaj7"], "klingend Des bleibt Des");
  eq(folge("dur251", 6, 6).map(x => x.klingendSymbol), ["Gism7", "Cis7", "Fismaj7"], "klingend Fis bleibt Fis");

  eq(stufeInTonart(1, 0), 1, "in C heißt der Tritonus-Ersatz Des");
  eq(stufeInTonart(6, 0), 3, "in C heißt die erhöhte Quarte Fis");
  eq(stufeInTonart(3, 7), 1, "in Cis-Dur heißt die zweite Stufe Dis");
  eq(stufeInTonart(8, -3), 5, "in Es-Dur heißt die vierte Stufe As");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
