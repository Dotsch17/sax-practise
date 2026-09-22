/* Prüft js/music/kadenz.js und js/music/klaviatur.js.
   Läuft mit `node tools/test-kadenz.mjs`.

   Das Wichtigste zuerst: C-Dur, a-Moll und die drei II–V–I-Varianten
   müssen Ton für Ton dem Beiblatt der mdw entsprechen. Alles andere wird
   daraus abgeleitet und muss richtig buchstabiert, vollständig und in
   spielbarer Lage sein. */

import * as K from "../js/music/kadenz.js";
import * as T from "../js/music/theory.js";
import { renderKlaviatur, weisseTasten } from "../js/music/klaviatur.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const name = p => T.spellWithOctave(p);
const rh = k => k.akkorde.map(a => a.rh.map(name).join(" "));
const bass = k => k.akkorde.map(a => name(a.bass)).join(" ");
const key = (liste, n_) => liste.find(k => k.name === n_);
const pc = m => ((m % 12) + 12) % 12;

console.log("Das Beiblatt, Ton für Ton");
{
  const C = key(T.MAJOR_KEYS, "C-Dur"), a = key(T.MINOR_KEYS, "a-Moll");
  eq(rh(K.kadenz("dur", C, "quint")), ["C4 E4 G4", "C4 F4 A4", "H3 D4 G4", "C4 E4 G4"], "C-Dur Quintlage");
  eq(rh(K.kadenz("dur", C, "oktav")), ["E4 G4 C5", "F4 A4 C5", "D4 G4 H4", "E4 G4 C5"], "C-Dur Oktavlage");
  eq(rh(K.kadenz("dur", C, "terz")), ["G4 C5 E5", "A4 C5 F5", "G4 H4 D5", "G4 C5 E5"], "C-Dur Terzlage");
  eq(bass(K.kadenz("dur", C, "quint")), "C3 F3 G3 C3", "Bass in Dur");

  eq(rh(K.kadenz("moll", a, "quint")), ["A3 C4 E4", "A3 D4 F4", "Gis3 H3 E4", "A3 C4 E4"], "a-Moll Quintlage");
  eq(rh(K.kadenz("moll", a, "oktav")), ["C4 E4 A4", "D4 F4 A4", "H3 E4 Gis4", "C4 E4 A4"], "a-Moll Oktavlage");
  eq(rh(K.kadenz("moll", a, "terz")), ["E4 A4 C5", "F4 A4 D5", "E4 Gis4 H4", "E4 A4 C5"], "a-Moll Terzlage");
  eq(bass(K.kadenz("moll", a, "quint")), "A2 D3 E3 A2", "Bass in Moll");

  eq(rh(K.kadenz("iivi", C, 1)), ["C4 F4", "H3 F4", "H3 E4"], "II–V–I Variante 1");
  eq(rh(K.kadenz("iivi", C, 2)), ["F3 A3 C4 E4", "F3 A3 H3 D4", "E3 G3 H3 D4"], "II–V–I Variante 2");
  eq(rh(K.kadenz("iivi", C, 3)), ["C4 E4 F4 A4", "H3 D4 F4 A4", "H3 D4 E4 G4"], "II–V–I Variante 3");
  eq(bass(K.kadenz("iivi", C, 1)), "D2 G2 C2", "Bass der II–V–I");
  eq(K.kadenz("iivi", C, 1).akkorde.map(a => a.symbol), ["Dm7", "G7", "Cmaj7"], "Symbole");
  eq(K.kadenz("dur", C, "quint").akkorde.map(a => a.dauer), [1, 1, 1, 3], "drei Halbe und eine punktierte Ganze");
}

console.log("\nAndere Tonarten, richtig buchstabiert");
{
  const B = key(T.MAJOR_KEYS, "B-Dur"), h = key(T.MINOR_KEYS, "h-Moll"), g = key(T.MINOR_KEYS, "g-Moll");
  ok(K.kadenz("dur", B, "quint").akkorde[1].rh.some(p => T.spell(p) === "Es"), "B-Dur: Subdominante mit Es, nicht Dis");
  ok(K.kadenz("moll", h, "quint").akkorde[2].rh.some(p => T.spell(p) === "Ais"), "h-Moll: Leitton Ais, nicht B");
  ok(K.kadenz("moll", g, "quint").akkorde[2].rh.some(p => T.spell(p) === "Fis"), "g-Moll: Leitton Fis");
  eq(K.kadenz("iivi", B, 1).akkorde.map(a => a.symbol), ["Cm7", "F7", "Bmaj7"], "II–V–I in B-Dur");
  eq(K.kadenz("iivi", B, 1, T.NAMING.EN).akkorde.map(a => a.symbol), ["Cm7", "F7", "B♭maj7"], "und international");
  eq(K.kadenz("dur", key(T.MAJOR_KEYS, "G-Dur"), "quint").akkorde.map(a => a.symbol), ["G", "C", "D", "G"], "Dreiklangssymbole in G");
  eq(K.kadenz("moll", key(T.MINOR_KEYS, "e-Moll"), "quint").akkorde.map(a => a.symbol), ["Em", "Am", "H", "Em"],
     "in Moll ist die Dominante Dur");

  eq(K.TONARTEN.dur.map(k => k.name), ["C-Dur", "G-Dur", "D-Dur", "F-Dur", "B-Dur"], "Durtonarten bis zwei Vorzeichen");
  eq(K.TONARTEN.moll.map(k => k.name), ["a-Moll", "e-Moll", "h-Moll", "d-Moll", "g-Moll"], "Molltonarten bis zwei Vorzeichen");
}

console.log("\nJede Kadenz in jeder Tonart ist vollständig und spielbar");
{
  const C = key(T.MAJOR_KEYS, "C-Dur");
  const modellC = {};
  for (const l of K.LAGEN) modellC["dur" + l.id] = K.kadenz("dur", C, l.id);
  const a = key(T.MINOR_KEYS, "a-Moll");
  for (const l of K.LAGEN) modellC["moll" + l.id] = K.kadenz("moll", a, l.id);
  for (const v of K.VARIANTEN) modellC["iivi" + v.id] = K.kadenz("iivi", C, v.id);
  const abstaende = k => k.akkorde.map(x => [T.toMidi(x.bass), ...x.rh.map(T.toMidi)])
    .map(ms => ms.map(m => m - ms[0]));

  for (const artId of ["dur", "moll", "iivi"]) {
    const lagen = artId === "iivi" ? K.VARIANTEN.map(v => v.id) : K.LAGEN.map(l => l.id);
    for (const k of K.TONARTEN[artId]) {
      for (const lage of lagen) {
        const kad = K.kadenz(artId, k, lage);
        const titel = `${k.name} ${K.lageLabel(artId, lage)}`;
        // Transponiert heißt: dieselben Abstände wie im Modell auf dem Blatt.
        eq(abstaende(kad), abstaende(modellC[artId + lage]), `${titel}: dieselben Abstände wie auf dem Blatt`);
        for (const x of kad.akkorde) {
          const b = T.toMidi(x.bass), ms = x.rh.map(T.toMidi);
          ok(b >= 33 && b <= 57, `${titel}: Bass ${T.spellWithOctave(x.bass)} liegt im Bassbereich`);
          ok(Math.min(...ms) >= 50 && Math.max(...ms) <= 79, `${titel}: rechte Hand zwischen D3 und G5`);
          ok(ms.every((m, i) => i === 0 || m > ms[i - 1]), `${titel}: rechte Hand von unten nach oben`);
          ok(Math.max(...ms) - Math.min(...ms) <= 12, `${titel}: rechte Hand in einer Oktave`);
        }
        // Die erste und letzte Tonika sind gleich; bei I–IV bleibt der
        // Grundton liegen.
        if (artId !== "iivi") {
          eq(kad.akkorde[0].rh.map(T.toMidi).join(), kad.akkorde[3].rh.map(T.toMidi).join(),
             `${titel}: endet, wie sie beginnt`);
          const bl = K.bleibende(kad.akkorde[0], kad.akkorde[1]);
          ok(bl.filter(Boolean).length === 1, `${titel}: von I nach IV bleibt genau ein Ton liegen`);
          ok(pc(T.toMidi(kad.akkorde[3].bass)) === pc(T.toMidi(k.tonic)), `${titel}: Bass endet auf dem Grundton`);
        }
      }
    }
  }
}

console.log("\nÜbersicht und Abfrage");
{
  eq(K.aufgaben(1).length, 35, "15 Dur, 15 Moll und 5 II–V–I");
  eq(K.abdeckung({}).geuebt, 0, "leer ist nichts geübt");
  const C = key(T.MAJOR_KEYS, "C-Dur");
  const d = {
    [K.drillId("dur", "quint", "C-Dur")]: { count: 1 },
    [K.drillId("iivi", "2", "C-Dur")]: { count: 1 },
    [K.drillId("dur", "terz", "C-Dur")]: { count: 0 },
  };
  eq(K.abdeckung(d, 1).geuebt, 1, "eine andere Variante zählt nicht zur gewählten");
  eq(K.abdeckung(d, 2).geuebt, 2, "die gewählte schon");

  let s = 11; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const alle = {};
  for (const a of K.aufgaben(1)) alle[K.drillId(a.art, a.lage, a.key.name)] = { count: 1, last: "2026-09-21" };
  delete alle[K.drillId("moll", "terz", "g-Moll")];
  let treffer = 0;
  for (let i = 0; i < 300; i++) {
    const x = K.pruefungsAufgabe(alle, "2026-09-22", 1, rng);
    if (x.art === "moll" && x.lage === "terz" && x.key.name === "g-Moll") treffer++;
  }
  ok(treffer > 100, `nie Gesessenes kommt deutlich öfter (${treffer} von 300)`);
  const vorher = { art: "dur", lage: "quint", key: C };
  let gleich = 0;
  for (let i = 0; i < 300; i++) {
    const x = K.pruefungsAufgabe({}, "2026-09-22", 1, rng, vorher);
    if (x.art === "dur" && x.lage === "quint" && x.key.name === "C-Dur") gleich++;
  }
  eq(gleich, 0, "dieselbe Aufgabe kommt nicht zweimal hintereinander");
}

console.log("\nKlaviatur");
{
  eq(weisseTasten(60, 72), 8, "eine Oktave C bis C hat acht weiße Tasten");
  eq(weisseTasten(61, 70), 7, "gezeichnet wird bis zur nächsten weißen Taste");
  const svg = renderKlaviatur({ tief: 48, hoch: 72, tasten: new Map([
    [48, { hand: "links", name: "C" }], [64, { hand: "rechts", bleibt: true, name: "E" }], [66, { hand: "rechts", name: "Fis" }],
  ]) });
  ok(svg.startsWith("<svg") && svg.includes("viewBox"), "ein SVG");
  eq((svg.match(/kl-weiss/g) || []).length, 15, "zwei Oktaven C3 bis C5: fünfzehn weiße Tasten");
  eq((svg.match(/class="kl-schwarz/g) || []).length, 10, "und zehn schwarze");
  ok(/kl-links/.test(svg) && /kl-rechts kl-bleibt/.test(svg), "Hände und liegende Töne sind markiert");
  ok(svg.includes(">Fis<") && svg.includes(">C4<"), "beschriftet, mit dem mittleren C");
  ok(!renderKlaviatur({ tief: 60, hoch: 64, tasten: new Map([[60, { hand: "rechts", name: "<x>" }]]) }).includes("<x>"),
     "Beschriftung wird maskiert");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
