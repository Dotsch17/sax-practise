/* Prüft js/music/mustertest.js. Läuft mit `node tools/test-mustertest.mjs`.

   Hier steht die Musiktheorie der Hörtest-Aufgaben unter Schutz: Namen der
   Intervalle, Schreibweise über Stufen, Akkorde und ihre Lagen,
   Versetzungszeichen, die ein Lehrer so setzen würde. Was hier falsch ist,
   lernt man falsch — deshalb viele Durchläufe mit Zufall und dazu feste
   Beispiele, die man im Kopf nachrechnen kann. */

import * as M from "../js/music/mustertest.js";
import * as T from "../js/music/theory.js";
import { mulberry32, UMKEHRUNGEN } from "../js/music/diktat.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const P = (step, alter, octave) => ({ step, alter, octave });
const rng = mulberry32(20260923);
const pc = m => ((m % 12) + 12) % 12;
const name = p => T.spell(p) + p.octave;
const laenge = w => w.dur * (w.dots ? 1.5 : 1);

console.log("Intervalle benennen");
{
  eq(M.intervallName(P(0, 0, 4), P(2, 0, 4)), "große Terz", "C–E");
  eq(M.intervallName(P(0, 0, 4), P(2, -1, 4)), "kleine Terz", "C–Es");
  eq(M.intervallName(P(0, 0, 4), P(1, 1, 4)), "übermäßige Sekunde", "C–Dis klingt wie C–Es, ist aber eine Sekunde");
  eq(M.intervallName(P(6, 0, 3), P(3, 0, 4)), "verminderte Quinte", "H–F");
  eq(M.intervallName(P(3, 0, 4), P(6, 0, 4)), "übermäßige Quarte", "F–H");
  eq(M.intervallName(P(2, 0, 4), P(3, 0, 4)), "kleine Sekunde", "E–F");
  eq(M.intervallName(P(0, 0, 4), P(0, 0, 5)), "reine Oktave", "C–C");
  eq(M.intervallName(P(5, 0, 4), P(4, 0, 5)), "kleine Septime", "A–G");
  eq(M.intervallName(P(1, 0, 4), P(0, 1, 5)), "große Septime", "D–Cis");
  eq(M.intervallName(P(2, -1, 4), P(0, 0, 5)), "große Sexte", "Es–C");
  eq(M.intervallName(P(0, 0, 5), P(2, -1, 4)), "große Sexte", "Reihenfolge egal");
  eq(M.intervallName(P(4, 0, 4), P(2, -1, 5)), "kleine Sexte", "G–Es");
  eq(M.intervallName(P(3, 1, 4), P(0, 0, 5)), "verminderte Quinte", "Fis–C");
  // Jeder Eintrag der Intervalltabelle hat den Namen, den die Tabelle sagt.
  for (const iv of M.INTERVALL_AUSWAHL) {
    for (let p0 = 55; p0 < 67; p0++) {
      const g = T.chromatic(p0);
      for (const r of [1, -1]) {
        const z = T.intervalFrom(g, iv.semitones, r);
        // Der Tritonus steht in der Tabelle als übermäßige Quarte, in beide Richtungen.
        const erwartet = iv.semitones === 6 ? "übermäßige Quarte" : iv.name.charAt(0).toLowerCase() + iv.name.slice(1);
        eq(M.intervallName(g, z), erwartet, `${iv.name} ${r > 0 ? "über" : "unter"} ${T.spell(g)}`);
      }
    }
  }
}

console.log("\n1. Intervall ergänzen");
{
  const raum = { g: [53, 86], f: [34, 66] };
  const gesehen = new Set();
  for (let i = 0; i < 600; i++) {
    const a = M.intervallAufgabe({ rng });
    const wo = `${name(a.gegeben)} ${a.richtung > 0 ? "▲" : "▼"} ${a.name}`;
    ok(T.toMidi(a.ziel) - T.toMidi(a.gegeben) === a.richtung * a.intervall.semitones, `${wo}: Abstand stimmt`);
    ok(Math.abs(a.ziel.alter) <= 1 && Math.abs(a.gegeben.alter) <= 1, `${wo}: höchstens ein Vorzeichen`);
    ok(T.toMidi(a.ziel) >= raum[a.clef][0] && T.toMidi(a.ziel) <= raum[a.clef][1], `${wo}: im Rahmen des Schlüssels`);
    eq(a.name, M.intervallName(a.gegeben, a.ziel), `${wo}: Name passt zur Schreibweise`);
    ok(M.pruefeIntervall(a, a.ziel).richtig, `${wo}: die Lösung ist richtig`);
    gesehen.add(a.intervall.semitones);
    const gesetzt = M.lageInRichtung(a.ziel.step, a.ziel.alter, a.gegeben, a.richtung);
    eq(gesetzt, a.ziel, `${wo}: der Buchstabe landet in der richtigen Richtung und Oktave`);
    // Enharmonisch falsch geschrieben: klingt richtig, zählt aber nicht.
    const enh = T.spellOnStep(T.toMidi(a.ziel), (a.ziel.step + 1) % 7);
    if (Math.abs(enh.alter) <= 2 && a.intervall.semitones !== 6) {
      const r = M.pruefeIntervall(a, enh);
      ok(!r.richtig && r.klingt, `${wo}: ${name(enh)} statt ${name(a.ziel)} ist falsch geschrieben`);
    }
  }
  eq(gesehen.size, 12, "alle Intervalle von der kleinen Sekunde bis zur Oktave kommen vor");
  const tt = { clef: "g", gegeben: P(0, 0, 4), richtung: 1, intervall: T.INTERVALS[6], ziel: P(3, 1, 4), name: "übermäßige Quarte" };
  ok(M.pruefeIntervall(tt, P(4, -1, 4)).richtig, "Tritonus: Ges statt Fis ist auch richtig");
  const kt = { clef: "g", gegeben: P(6, 0, 3), richtung: 1, intervall: T.INTERVALS[3], ziel: P(1, 0, 4), name: "kleine Terz" };
  const falsch = M.pruefeIntervall(kt, P(0, 2, 4));
  ok(!falsch.richtig && /übermäßige Sekunde/.test(falsch.text), "H–Cisis wird als übermäßige Sekunde benannt");
}

console.log("\n2. Rhythmus zu Tonhöhen");
{
  let mitAuftakt = 0;
  for (let i = 0; i < 400; i++) {
    const a = M.rhythmusZuToenen({ stufe: 1 + (i % 3), rng });
    const wo = `${a.tonart.name} ${a.schlaege}/4${a.auftakt ? " Auftakt " + a.auftakt : ""}`;
    eq(a.toene.length, a.werte.length, `${wo}: je Ton ein Wert`);
    const summe = a.werte.reduce((s, w) => s + laenge(w), 0);
    ok(Math.abs(summe - 4 * a.schlaege) < 1e-6, `${wo}: vier volle Takte, Auftakt und verkürzter Schlusstakt zusammen`);
    // Taktstriche stehen genau dort, wo Auftakt plus volle Takte enden.
    let pos = 0;
    const soll = [];
    a.werte.forEach((w, j) => {
      pos += laenge(w);
      const rest = (pos - a.auftakt) / a.schlaege;
      if (j < a.werte.length - 1 && (Math.abs(pos - a.auftakt) < 1e-6 || (pos > a.auftakt && Math.abs(rest - Math.round(rest)) < 1e-6))) soll.push(j);
    });
    eq(a.striche, soll, `${wo}: Taktstriche an den richtigen Stellen`);
    eq(a.striche.length, a.auftakt ? 4 : 3, `${wo}: ${a.auftakt ? "vier" : "drei"} Taktstriche`);
    ok(pc(T.toMidi(a.toene[a.toene.length - 1])) === pc(T.toMidi(a.tonart.tonic)), `${wo}: endet auf dem Grundton`);
    ok(laenge(a.werte[a.werte.length - 1]) >= 1, `${wo}: der letzte Ton ist lang`);
    if (a.auftakt) mitAuftakt++;
    const r = M.pruefeRhythmusZuToenen(a, { werte: a.werte, striche: a.striche });
    ok(r.alles && r.punkte === 4, `${wo}: die Lösung ergibt vier Punkte`);
    const ohneStrich = M.pruefeRhythmusZuToenen(a, { werte: a.werte, striche: a.striche.slice(1) });
    eq(ohneStrich.punkte, 3, `${wo}: ein fehlender Taktstrich kostet den Taktstrich-Punkt`);
    const satz = M.satzFuer(a);
    ok(satz.filter(e => e.bass).length === a.striche.length + 1, `${wo}: die Begleitung hat je Takt einen Basston`);
  }
  ok(mitAuftakt > 50, `Auftakte kommen vor (${mitAuftakt})`);
}

console.log("\n4. Akkord verändert");
{
  const arten = new Set();
  let vz = 0;
  for (let i = 0; i < 500; i++) {
    const a = M.akkordVeraendert({ rng });
    const wo = `${a.erster.map(name).join(" ")} → ${a.zweiter.map(name).join(" ")}`;
    const diff = a.erster.map((p, j) => T.toMidi(a.zweiter[j]) - T.toMidi(p));
    eq(diff.filter(d => d !== 0).length, 1, `${wo}: genau eine Stimme ändert sich`);
    eq(Math.abs(diff[a.stimme]), 1, `${wo}: um einen Halbton`);
    ok(a.erster.every((p, j) => j === a.stimme || JSON.stringify(p) === JSON.stringify(a.zweiter[j])), `${wo}: die anderen bleiben gleich geschrieben`);
    eq(M.erkenneAkkord(a.erster)?.art, a.artVorher, `${wo}: der erste ist ein ${a.artVorher}`);
    eq(M.erkenneAkkord(a.zweiter)?.art, a.artNachher, `${wo}: der zweite ist ein ${a.artNachher}`);
    ok([...a.erster, ...a.zweiter].every(p => Math.abs(p.alter) <= 1), `${wo}: keine Doppelvorzeichen`);
    ok(a.zweiter.every((p, j) => j === 0 || T.toMidi(p) > T.toMidi(a.zweiter[j - 1])), `${wo}: von unten nach oben`);
    ok(T.toMidi(a.erster[0]) >= 60 && T.toMidi(a.erster[3]) <= 81, `${wo}: im Violinschlüssel`);
    eq(a.nurVorzeichen, a.erster[a.stimme].step === a.zweiter[a.stimme].step, `${wo}: Vorzeichen oder Nachbarton, wie angegeben`);
    arten.add(a.artVorher); if (a.nurVorzeichen) vz++;
  }
  ok(arten.size >= 6, `verschiedene Akkordarten (${[...arten].join(", ")})`);
  ok(vz > 100 && vz < 450, `beide Arten der Veränderung kommen vor (${vz} nur Vorzeichen)`);
  eq(M.erkenneAkkord([P(0, 0, 4), P(2, 0, 4), P(4, 0, 4), P(6, -1, 4)]).art, "dom7", "C E G B ist C7");
  eq(M.erkenneAkkord([P(3, 1, 4), P(5, 0, 4), P(0, 0, 5), P(2, -1, 5)]).art, "vermindert7", "Fis A C Es ist verminderter Septakkord");
  eq(M.erkenneAkkord([P(2, 0, 4), P(4, 0, 4), P(0, 0, 5)]).art, "dur", "E G C ist C-Dur als Sextakkord");
  eq(M.erkenneAkkord([P(0, 0, 4), P(2, 0, 4), P(4, 1, 4)]).art, "uebermaessig", "C E Gis ist übermäßig");
  const cea = M.erkenneAkkord([P(0, 0, 4), P(2, 0, 4), P(5, -1, 4)]);
  ok(cea?.art === "uebermaessig" && cea.grund.step === 5 && cea.grund.alter === -1, "C E As ist der übermäßige Dreiklang auf As (As–C–E)");
  eq(M.erkenneAkkord([P(0, 0, 4), P(2, 0, 4), P(4, 0, 4), P(5, 0, 4)])?.art, "moll7", "C E G A ist Am7 in Umkehrung");
  eq(M.erkenneAkkord([P(0, 0, 4), P(1, 0, 4), P(4, 0, 4)]), null, "C D G ist kein Terzenstapel");
  eq(M.erkenneAkkord([P(0, 0, 4), P(1, 1, 4), P(4, 0, 4)]), null, "C Dis G ist falsch geschrieben, nicht c-Moll");
}

console.log("\n5. Basston gegeben");
{
  const lagen = new Set();
  for (let i = 0; i < 500; i++) {
    const a = M.bassUndZwei({ rng });
    const wo = `${name(a.bass)} + ${a.oben.map(name).join(" ")} (${a.art}, ${UMKEHRUNGEN[3][a.umkehrung]})`;
    const erkannt = M.erkenneAkkord(a.toene);
    eq(erkannt?.art, a.art, `${wo}: der Akkord ist, was er sein soll`);
    ok(erkannt && erkannt.grund.step === a.root.step && erkannt.grund.alter === a.root.alter, `${wo}: mit dem richtigen Grundton`);
    // Die Lage: welcher Akkordton liegt im Bass?
    const imBass = [0, 2, 4].map(k => (a.root.step + k) % 7).indexOf(a.bass.step);
    eq(imBass, a.umkehrung, `${wo}: im Bass liegt der Ton der Lage`);
    ok(T.toMidi(a.oben[0]) > T.toMidi(a.bass) && T.toMidi(a.oben[1]) > T.toMidi(a.oben[0]), `${wo}: darüber aufsteigend`);
    ok(T.toMidi(a.oben[1]) - T.toMidi(a.bass) < 12, `${wo}: enge Lage, innerhalb einer Oktave`);
    ok(a.toene.every(p => Math.abs(p.alter) <= 1), `${wo}: keine Doppelvorzeichen`);
    ok(M.pruefeAkkord(a.oben, a.oben).alles, `${wo}: die Lösung ist richtig`);
    lagen.add(a.umkehrung + a.clef);
  }
  eq(lagen.size, 6, "alle drei Lagen in beiden Schlüsseln");
  eq(M.lageName("dur", 1), "Sextakkord", "erste Umkehrung heißt Sextakkord");
  eq(M.lageName("dur", 2), "Quartsextakkord", "zweite heißt Quartsextakkord");
  eq(M.akkordName("moll", P(1, 0, 4)), "d-Moll-Dreiklang", "Moll klein geschrieben");
  eq(M.akkordName("dur", P(1, -1, 4)), "Des-Dur-Dreiklang", "Dur groß geschrieben");
  eq(M.akkordName("moll", P(3, 1, 4)), "fis-Moll-Dreiklang", "fis-Moll");
}

console.log("\n6. Versetzungszeichen");
{
  let erhoeht7 = 0, tief = 0, chrom = 0;
  for (let i = 0; i < 500; i++) {
    const a = M.vorzeichenAufgabe({ rng });
    const wo = `${a.tonart.name}: ${a.toene.map(p => T.spell(p)).join(" ")}`;
    const t = a.toene;
    ok(t.every((p, j) => p.step === a.grund[j].step && Math.abs(p.alter) <= 1), `${wo}: jeder Ton bleibt auf seinem Buchstaben`);
    const vz = t.filter((p, j) => p.alter !== a.grund[j].alter).length;
    ok(vz >= 3, `${wo}: mindestens drei Versetzungszeichen (${vz})`);
    ok(pc(T.toMidi(t[t.length - 1])) === pc(T.toMidi(a.tonart.tonic)), `${wo}: endet auf dem Grundton`);
    // Nie zwei alterierte Töne direkt hintereinander, die zusammen eine
    // verminderte oder übermäßige Prime ergäben (Dis–Es, B–H).
    ok(t.every((p, j) => j === 0 || !(T.toMidi(p) === T.toMidi(t[j - 1]) && p.step !== t[j - 1].step)), `${wo}: keine enharmonische Tonwiederholung`);
    // Keine übermäßige Sekunde zwischen Nachbartönen.
    ok(t.every((p, j) => j === 0 || !([1, 6].includes(((p.step - t[j - 1].step) % 7 + 7) % 7) && Math.abs(T.toMidi(p) - T.toMidi(t[j - 1])) === 3)),
      `${wo}: keine übermäßige Sekunde`);
    // Der erhöhte Leitton geht nach oben weiter, nicht nach unten.
    if (a.moll) {
      const leit = T.spellOnStep(T.toMidi(a.tonart.tonic) - 1, (a.tonart.tonic.step + 6) % 7);
      t.forEach((p, j) => {
        if (p.step === leit.step && p.alter === leit.alter && j < t.length - 1) {
          ok(T.toMidi(t[j + 1]) > T.toMidi(p), `${wo}: der Leitton ${T.spell(p)} löst sich aufwärts`);
          erhoeht7++;
        }
      });
    }
    t.forEach((p, j) => { if (p.alter < a.grund[j].alter) tief++; else if (p.alter > a.grund[j].alter) chrom++; });
    const r = M.pruefeVorzeichen(a, t.map(p => p.alter));
    ok(r.alles && r.punkte === 3.5, `${wo}: die Lösung ergibt 3,5 Punkte`);
    const leer = M.pruefeVorzeichen(a, a.grund.map(p => p.alter));
    ok(!leer.alles, `${wo}: ohne Vorzeichen nicht alles richtig`);
  }
  ok(erhoeht7 > 100, `erhöhte Leittöne kommen vor (${erhoeht7})`);
  ok(tief > 20, `tiefalterierte Töne kommen vor (${tief})`);
  ok(chrom > 300, `erhöhte Töne kommen vor (${chrom})`);
}

console.log("\nProbetest");
{
  const plan = M.probePlan();
  eq(plan.length, 22, "22 Teilaufgaben: 4 + 2 + 1 + 4 + 4 + 1 + 6");
  eq(M.PROBETEST.reduce((s, a) => s + a.anzahl * a.max, 0), 31.5, "zusammen 31,5 Punkte wie im Mustertest");
  eq(M.PROBETEST.map(a => a.anzahl * a.max), [2, 8, 4, 4, 4, 3.5, 6], "Punkte je Aufgabe wie im Mustertest");
  eq(plan.filter(p => p.modus === "tonrhythmus").map(p => p.stufe), [2, 3], "die zwei Rhythmen in Stufe 2 und 3");
  eq(M.probePunkte("intervall", { richtig: true }), 0.5, "ein Intervall: ein halber Punkt");
  eq(M.probePunkte("typ", { alles: false }), 0, "falscher Akkordtyp: null");
  const alle = plan.map(p => ({ nr: p.nr, punkte: p.max }));
  const voll = M.probeAuswertung(alle);
  ok(voll.summe === 31.5 && voll.bestanden, "alles richtig: 31,5 und bestanden");
  const knapp = M.probeAuswertung(plan.map(p => ({ nr: p.nr, punkte: p.nr <= 3 ? p.max : 0 })));
  ok(knapp.summe === 14 && !knapp.bestanden, "nur Aufgabe 1 bis 3: 14 Punkte, nicht bestanden");
  eq(knapp.schwach.nr, 7, "genannt wird die Aufgabe, in der die meisten Punkte fehlen (Akkordtyp, 6)");
  const nurRhythmusFalsch = M.probeAuswertung(plan.map(p => ({ nr: p.nr, punkte: p.nr === 2 ? 0 : p.nr === 1 ? 0 : p.max })));
  eq(nurRhythmusFalsch.schwach.nr, 2, "acht fehlende Punkte im Rhythmus vor zwei bei den Intervallen");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
