/* Prüft js/music/theory.js. Läuft mit `node tools/test-theory.mjs`.
   Kein Testframework — das wäre eine Abhängigkeit. */
import * as T from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.log("  FAIL " + msg); fail++; } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${msg}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const near = (a, b, tol, msg) => ok(Math.abs(a - b) < tol, `${msg} (${a} vs ${b})`);

const P = (step, alter, octave = 4) => ({ step, alter, octave });
const names = ps => ps.map(p => T.spell(p));

console.log("\nTonnamen, deutsch");
eq(T.spell(P(0, 0)), "C", "C");
eq(T.spell(P(6, 0)), "H", "H ist der Ton unter C");
eq(T.spell(P(6, -1)), "B", "H erniedrigt ist B, nicht Hes");
eq(T.spell(P(6, -2)), "Heses", "doppelt erniedrigtes H");
eq(T.spell(P(2, -1)), "Es", "E erniedrigt ist Es, nicht Ees");
eq(T.spell(P(5, -1)), "As", "A erniedrigt ist As");
eq(T.spell(P(1, -1)), "Des", "D erniedrigt ist Des");
eq(T.spell(P(3, 1)), "Fis", "F erhöht ist Fis");
eq(T.spell(P(0, 2)), "Cisis", "doppelt erhöhtes C");
eq(T.spell(P(6, 0), T.NAMING.EN), "B", "international ist H ein B");
eq(T.spell(P(6, -1), T.NAMING.EN), "B♭", "international B♭");
eq(T.spellWithOctave(P(5, 0, 3)), "A3", "mit Oktavziffer");

console.log("\nFrequenzen");
near(T.midiToFreq(69), 440, 0.001, "A4 = 440 Hz");
near(T.midiToFreq(57), 220, 0.001, "A3 = 220 Hz — der Bezug des Borduns");
near(T.midiToFreq(48), 130.813, 0.01, "C3 = 130,81 Hz");
near(T.midiToFreq(60), 261.626, 0.01, "C4 = 261,63 Hz");
eq(T.toMidi(P(5, 0, 4)), 69, "A4 ist MIDI 69");
eq(T.toMidi(P(0, 0, 3)), 48, "C3 ist MIDI 48");
eq(T.toMidi(P(6, 0, 3)), 59, "H3 ist MIDI 59");

console.log("\nCent-Abweichung");
let r = T.centsOff(440);
eq([r.midi, r.cents], [69, 0], "440 Hz ist genau A4");
r = T.centsOff(440 * Math.pow(2, 10 / 1200));
eq([r.midi, r.cents], [69, 10], "10 Cent zu hoch");
r = T.centsOff(440 * Math.pow(2, -25 / 1200));
eq([r.midi, r.cents], [69, -25], "25 Cent zu tief");
eq(T.centsOff(219).midi, 57, "219 Hz wird noch als A3 erkannt");

console.log("\nEnharmonik und Oktavgrenzen");
eq(T.fromMidi(61, "sharp"), P(0, 1), "61 als Cis4");
eq(T.fromMidi(61, "flat"), P(1, -1), "61 als Des4");
for (let m = 24; m <= 108; m++) {
  ok(T.toMidi(T.fromMidi(m, "sharp")) === m, "Hin und zurück mit Kreuzen bei " + m);
  ok(T.toMidi(T.fromMidi(m, "flat")) === m, "Hin und zurück mit Ben bei " + m);
}

console.log("\nVorzeichnungen");
eq(T.keySignature(0), 0, "C-Dur ohne Vorzeichen");
eq(T.keySignature(7), 1, "G-Dur, ein Kreuz");
eq(T.keySignature(3), -3, "Es-Dur, drei Ben");
eq(T.keySignature(10), -2, "B-Dur, zwei Ben");
eq(T.keySignature(9, "minor"), 0, "a-Moll ohne Vorzeichen");
eq(T.keySignature(4, "minor"), 1, "e-Moll, ein Kreuz");
eq(T.keySignature(0, "minor"), -3, "c-Moll, drei Ben");
eq(T.keySignatureSteps(3), [3, 0, 4], "drei Kreuze sind Fis Cis Gis");
eq(T.keySignatureSteps(-3), [6, 2, 5], "drei Ben sind B Es As");

console.log("\nTransposition Altsaxophon");
eq(T.toWritten(58), 67, "klingend B3 wird zu Griff G4");
eq(T.spell(T.fromMidi(58, "flat")), "B", "klingend ist es ein B");
eq(T.spell(T.fromMidi(67, "sharp")), "G", "gegriffen ist es ein G");
eq(T.toSounding(T.toWritten(70)), 70, "hin und zurück transponiert");
eq(T.writtenKeySignature(0), 3, "klingend C-Dur liest sich als A-Dur, drei Kreuze");
eq(T.writtenKeySignature(-3), 0, "klingend Es-Dur liest sich als C-Dur");
eq(T.writtenKeySignature(-1), 2, "klingend F-Dur liest sich als D-Dur");
for (let s = -7; s <= 7; s++) {
  const w = T.writtenKeySignature(s);
  ok(w >= -7 && w <= 7, `Vorzeichnung ${s} bleibt nach Transposition lesbar (${w})`);
}

console.log("\nSkalen, richtig buchstabiert");
eq(names(T.buildScale(P(0, 0), "dur")), ["C","D","E","F","G","A","H","C"], "C-Dur");
eq(names(T.buildScale(P(2, -1), "dur")), ["Es","F","G","As","B","C","D","Es"], "Es-Dur mit Ben");
eq(names(T.buildScale(P(1, 0), "dur")), ["D","E","Fis","G","A","H","Cis","D"], "D-Dur mit Kreuzen");
eq(names(T.buildScale(P(3, 1), "dur")), ["Fis","Gis","Ais","H","Cis","Dis","Eis","Fis"], "Fis-Dur braucht ein Eis");
eq(names(T.buildScale(P(4, -1), "dur")), ["Ges","As","B","Ces","Des","Es","F","Ges"], "Ges-Dur braucht ein Ces");
eq(names(T.buildScale(P(5, 0), "moll_harmonisch")), ["A","H","C","D","E","F","Gis","A"], "a-Moll harmonisch: siebte Stufe ist Gis, nicht As");
eq(names(T.buildScale(P(0, 0), "moll_harmonisch")), ["C","D","Es","F","G","As","H","C"], "c-Moll harmonisch");
eq(names(T.buildScale(P(1, 0), "moll_melodisch")), ["D","E","F","G","A","H","Cis","D"], "d-Moll melodisch aufwärts");
eq(names(T.buildScale(P(1, 0), "dorisch")), ["D","E","F","G","A","H","C","D"], "D dorisch");
eq(names(T.buildScale(P(2, 0), "phrygisch")), ["E","F","G","A","H","C","D","E"], "E phrygisch");
eq(names(T.buildScale(P(3, 0), "lydisch")), ["F","G","A","H","C","D","E","F"], "F lydisch");
eq(names(T.buildScale(P(4, 0), "mixolydisch")), ["G","A","H","C","D","E","F","G"], "G mixolydisch");
eq(T.buildScale(P(0, 0), "dur", 2).length, 15, "zwei Oktaven sind 15 Töne");
eq(T.buildScale(P(0, 0), "chromatisch").length, 13, "Chromatik hat 13 Töne");
eq(T.buildScale(P(0, 0), "pentatonik_dur").length, 6, "Pentatonik hat 6 Töne mit Oktave");

console.log("\nJede Tonart durchbuchstabiert");
for (const k of T.MAJOR_KEYS) {
  eq(T.spell(k.tonic) + "-Dur", k.name, k.name + ": Grundton passt zum Namen");
  for (const sk of ["dur"]) {
    const sc = T.buildScale(k.tonic, sk);
    ok(new Set(sc.slice(0, 7).map(p => p.step)).size === 7, `${k.name} ${sk}: jeder Buchstabe genau einmal`);
    ok(sc.every(p => Math.abs(p.alter) <= 2), `${k.name} ${sk}: kein Dreifachvorzeichen`);
  }
}
for (const k of T.MINOR_KEYS) {
  eq(T.spell(k.tonic).toLowerCase() + "-moll", k.name.toLowerCase(), k.name + ": Grundton passt zum Namen");
  for (const sk of ["moll_natur", "moll_harmonisch", "moll_melodisch"]) {
    const sc = T.buildScale(k.tonic, sk);
    ok(new Set(sc.slice(0, 7).map(p => p.step)).size === 7, `${k.name} ${sk}: jeder Buchstabe genau einmal`);
    ok(sc.every(p => Math.abs(p.alter) <= 2), `${k.name} ${sk}: kein Dreifachvorzeichen`);
  }
}

console.log("\nSkalen klingen richtig, nicht nur aussehen");
for (const key of Object.keys(T.SCALES)) {
  const sc = T.buildScale(P(0, 0), key);
  const want = T.SCALES[key].steps.map(s => 60 + s).concat([72]);
  eq(sc.map(T.toMidi), want, key + ": Halbtonschritte stimmen");
}

console.log("\nAkkorde");
eq(names(T.buildChord(P(0, 0), "dur")), ["C","E","G"], "C-Dur-Dreiklang");
eq(names(T.buildChord(P(1, 0), "moll")), ["D","F","A"], "d-Moll-Dreiklang");
eq(names(T.buildChord(P(4, 0), "dom7")), ["G","H","D","F"], "G7");
eq(names(T.buildChord(P(6, 0), "vermindert")), ["H","D","F"], "verminderter Dreiklang auf H");
eq(names(T.buildChord(P(2, -1), "dur7")), ["Es","G","B","D"], "Es-Dur-Septakkord");
for (const ck of Object.keys(T.CHORDS)) {
  eq(T.buildChord(P(0, 0), ck).map(T.toMidi), T.CHORDS[ck].steps.map(s => 60 + s),
     ck + ": Halbtonschritte stimmen");
}

console.log("\nUmfang");
ok(T.inRange(58), "notiert B3 liegt im Umfang");
ok(T.inRange(90), "notiert Fis6 liegt im Umfang");
ok(!T.inRange(57), "darunter nicht");
ok(T.isAltissimo(91), "darüber ist Altissimo");

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
