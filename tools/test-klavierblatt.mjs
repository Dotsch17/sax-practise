/* Prüft js/music/klavierblatt.js und das Klaviersystem im Notensatz.
   Läuft mit `node tools/test-klavierblatt.mjs`.

   Jede Übung muss spielbar sein, wie sie dasteht: beide Hände gleich lange
   Takte, jede Hand in ihrer Fünftonlage, der Schluss auf dem Grundton. Und
   im Klaviersystem steht, was gleichzeitig klingt, genau untereinander. */

import * as K from "../js/music/klavierblatt.js";
import * as T from "../js/music/theory.js";
import * as N from "../js/music/notation.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const rng = K.mulberry32(20260923);
const laenge = x => x.dur * (x.dots ? 1.5 : 1);
const pc = m => ((m % 12) + 12) % 12;
const toene = x => x.chord ? x.chord.map(c => c.pitch) : x.pitch ? [x.pitch] : [];

console.log("Handlagen");
{
  const c = K.handlage(K.lageOf("C"));
  eq(c.rechts.map(p => T.spell(p) + p.octave), ["C4", "D4", "E4", "F4", "G4"], "C: rechts C4 bis G4");
  eq(c.links.map(p => T.spell(p) + p.octave), ["C3", "D3", "E3", "F3", "G3"], "C: links C3 bis G3");
  const e = K.handlage(K.lageOf("e"));
  eq(e.rechts.map(p => T.spell(p)), ["E", "Fis", "G", "A", "H"], "e-Moll: Fis, nicht Ges");
  const d = K.handlage(K.lageOf("d"));
  eq(d.rechts.map(p => T.spell(p)), ["D", "E", "F", "G", "A"], "d-Moll: F, natürliches Moll");
  for (const l of K.LAGEN) {
    const h = K.handlage(l);
    ok(T.toMidi(h.links[0]) >= 41 && T.toMidi(h.links[0]) <= 52, `${l.name}: linke Hand im Bassschlüssel`);
    ok(T.toMidi(h.rechts[0]) >= 60 && T.toMidi(h.rechts[0]) <= 71, `${l.name}: rechte Hand ab dem mittleren C`);
  }
}

console.log("\nÜbungen");
for (let i = 0; i < 600; i++) {
  const stufe = 1 + (i % 6);
  const a = K.klavierUebung({ stufe, rng });
  const wo = `Stufe ${stufe}, ${a.lage.name}, ${a.schlaege}/4`;
  const st = K.stufeOf(stufe);
  eq(a.takte.length, st.takte, `${wo}: Taktzahl`);
  ok(a.takte.every(tk => ["oben", "unten"].every(s => Math.abs(tk[s].reduce((x, y) => x + laenge(y), 0) - a.schlaege) < 1e-6)),
     `${wo}: jeder Takt geht in beiden Händen auf`);
  const rechts = new Set(a.hand.rechts.map(T.toMidi)), links = new Set(a.hand.links.map(T.toMidi));
  ok(a.takte.every(tk => tk.oben.flatMap(toene).every(p => rechts.has(T.toMidi(p)))), `${wo}: rechts nur Töne der Lage`);
  ok(a.takte.every(tk => tk.unten.flatMap(toene).every(p => links.has(T.toMidi(p)))), `${wo}: links nur Töne der Lage`);
  const letzter = a.takte[a.takte.length - 1];
  const tonika = pc(T.toMidi({ ...a.lage.tonika, octave: 4 }));
  const bass = letzter.unten.flatMap(toene), oben = letzter.oben.flatMap(toene);
  const schluss = bass.length ? bass : oben;
  ok(schluss.some(p => pc(T.toMidi(p)) === tonika), `${wo}: am Schluss der Grundton ${a.modus === "rechts" ? "rechts" : "im Bass"}`);
  if (a.modus === "parallel") {
    ok(a.takte.every(tk => tk.oben.length === tk.unten.length && tk.oben.every((x, j) =>
      a.hand.rechts.findIndex(p => T.toMidi(p) === T.toMidi(x.pitch)) === a.hand.links.findIndex(p => T.toMidi(p) === T.toMidi(tk.unten[j].pitch)))),
      `${wo}: parallel heißt dieselbe Stufe in beiden Händen`);
  }
  if (a.modus === "gegen") {
    ok(a.takte.every(tk => tk.oben.every((x, j) =>
      a.hand.rechts.findIndex(p => T.toMidi(p) === T.toMidi(x.pitch)) + a.hand.links.findIndex(p => T.toMidi(p) === T.toMidi(tk.unten[j].pitch)) === 4)),
      `${wo}: Gegenbewegung heißt gleiche Finger in beiden Händen`);
  }
  if (a.modus === "wechsel") {
    ok(a.takte.every(tk => tk.oben.every(x => !x.pitch) !== tk.unten.every(x => !x.pitch)), `${wo}: immer genau eine Hand spielt`);
  }
  // Keine Sprünge über eine Terz hinaus in der Melodie.
  // Schritte und Terzen innerhalb jeder Phrase einer Hand (beim Wechsel
  // beginnt jede Phrase neu).
  const phrasen = a.modus === "wechsel"
    ? [0, 2, 4, 6].map(t => a.takte.slice(t, t + 2).flatMap(tk => [...tk.oben, ...tk.unten]))
    : [a.takte.flatMap(tk => (a.modus === "links" ? tk.unten : tk.oben))];
  for (const ph of phrasen) {
    const mel = ph.filter(x => x.pitch).map(x => T.toMidi(x.pitch));
    ok(mel.every((m, j) => j === 0 || Math.abs(m - mel[j - 1]) <= 4), `${wo}: Schritte und Terzen`);
  }
  ok(a.ereignisse.length > 0 && a.ereignisse.every((e, j) => j === 0 || e.zeit >= a.ereignisse[j - 1].zeit), `${wo}: Ereignisse zum Vorspielen in Reihenfolge`);
}

console.log("\nKlaviersystem");
{
  const P = (step, octave) => ({ step, alter: 0, octave });
  const oben = [{ pitch: P(0, 5), dur: 1 }, { pitch: P(1, 5), dur: 1 }, { pitch: P(2, 5), dur: 2 }, { barline: "end" }];
  const unten = [{ pitch: P(0, 3), dur: 2 }, { pitch: P(4, 3), dur: 2 }, { barline: "end" }];
  const svg = N.renderSystem({ oben, unten, timeSig: [4, 4] });
  ok(/fClef|<g transform="translate\(0,/.test(svg), "zwei Systeme");
  const xs = [...svg.matchAll(/<path d="[^"]+" transform="translate\(([\d.]+),/g)].map(m => Number(m[1]));
  // Die erste Note oben und unten beginnen gleichzeitig und stehen gleich weit rechts.
  const koepfe = [...svg.matchAll(/transform="translate\(([\d.]+),(-?[\d.]+)\)"\/>/g)];
  ok(koepfe.length > 4, "Köpfe gezeichnet");
  const alleX = new Set(xs);
  ok(alleX.size < xs.length, "Noten, die gleichzeitig beginnen, teilen sich eine x-Lage");
  // Dieselbe Übung einmal ganz gesetzt: keine NaN-Koordinaten.
  const u = K.klavierUebung({ stufe: 6, rng });
  const o = u.takte.flatMap((tk, i) => [...tk.oben, { barline: i === u.takte.length - 1 ? "end" : true }]);
  const un = u.takte.flatMap((tk, i) => [...tk.unten, { barline: i === u.takte.length - 1 ? "end" : true }]);
  ok(!N.renderSystem({ oben: o, unten: un, keySig: u.keySig, timeSig: [u.schlaege, 4] }).includes("NaN"), "ganze Übung ohne ungültige Koordinaten");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
