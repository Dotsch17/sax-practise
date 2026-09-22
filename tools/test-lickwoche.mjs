/* Prüft js/music/lickwoche.js, js/data/licks.js und js/data/setlist.js.
   Läuft mit `node tools/test-lickwoche.mjs`.

   Was hier unter Schutz steht: ein Lick bleibt in allen zwölf Tonarten
   derselbe Lick — gleiche Intervalle, richtig buchstabiert, im Umfang des
   Alts — und jeder Lick der Bibliothek passt zu dem Akkord, über den er
   gehört. */

import * as L from "../js/music/lickwoche.js";
import { LICKS } from "../js/data/licks.js";
import * as S from "../js/data/setlist.js";
import { QUALITIES } from "../js/music/harmonie.js";
import { toMidi, spell, RANGE } from "../js/music/theory.js";
import { gegriffenSymbol } from "../js/music/leadsheet.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const pc = m => ((m % 12) + 12) % 12;
const namen = noten => noten.filter(x => x.pitch).map(x => spell(x.pitch));

console.log("Kurzschrift");
{
  const x = L.notenAus("A4:8 C5:8 Es5:4. r:8 B4:2 Fis4:16");
  eq(x.map(y => y.dur), [0.5, 0.5, 1, 0.5, 2, 0.25], "Dauern");
  eq(x[2].dots, 1, "punktiert");
  eq(x[3].pitch, null, "Pause");
  eq(namen(x), ["A", "C", "Es", "B", "Fis"], "Tonnamen");
  eq(L.laenge(x), 5.25, "Gesamtlänge in Schlägen");
  let fehler = false;
  try { L.notenAus("X4:8"); } catch { fehler = true; }
  ok(fehler, "Unsinn wird abgelehnt, nicht geraten");
}

console.log("\nZwölf Tonarten im Quartenzirkel");
{
  eq(L.ZWOELF.map(t => spell(t)), ["C", "F", "B", "Es", "As", "Des", "Ges", "H", "E", "A", "D", "G"], "Quartenzirkel ab C");
  eq(new Set(L.ZWOELF.map(L.pcVon)).size, 12, "alle zwölf Tonhöhen");
  const abG = L.tonartenAb({ step: 4, alter: 0 });
  eq(abG.map(t => spell(t)).slice(0, 3), ["G", "C", "F"], "ab G geht es weiter mit C und F");
  eq(abG.length, 12, "immer zwölf");
}

console.log("\nTransponieren");
{
  const lick = L.notenAus("G4:8 A4:8 H4:8 Fis4:8 G4:2");
  const nachF = L.transponiere(lick, { step: 4, alter: 0 }, { step: 3, alter: 0 });
  eq(namen(nachF.noten), ["F", "G", "A", "E", "F"], "G nach F: das Fis wird ein E, nicht ein Fes");
  const nachDes = L.transponiere(lick, { step: 4, alter: 0 }, { step: 1, alter: -1 });
  eq(namen(nachDes.noten), ["Des", "Es", "F", "C", "Des"], "nach Des: Des-Dur-Schreibweise");
  const nachH = L.transponiere(lick, { step: 4, alter: 0 }, { step: 6, alter: 0 });
  eq(namen(nachH.noten), ["H", "Cis", "Dis", "Ais", "H"], "nach H: Kreuze, das Leitton-Ais");
  const ab = x => x.noten.filter(y => y.pitch).map(y => toMidi(y.pitch));
  const orig = lick.map(y => toMidi(y.pitch));
  for (const t of L.ZWOELF) {
    const r = L.transponiere(lick, { step: 4, alter: 0 }, t);
    const m = ab(r);
    eq(m.map((v, i) => v - m[0]), orig.map(v => v - orig[0]), `nach ${spell(t)}: dieselben Intervalle`);
    ok(r.passt && m.every(v => v >= RANGE.writtenLow && v <= RANGE.writtenHigh), `nach ${spell(t)}: im Umfang`);
    eq(r.noten.map(y => y.dur), lick.map(y => y.dur), `nach ${spell(t)}: derselbe Rhythmus`);
  }
  const zuWeit = L.notenAus("B3:8 Fis6:8 H6:8");
  ok(!L.inUmfang(zuWeit).passt, "was nicht in den Umfang passt, wird als solches gemeldet");
}

console.log("\nTaktstriche");
{
  const t = L.mitTaktstrichen(L.notenAus("C5:4 D5:4 E5:4 F5:4 G5:2 G5:2"));
  eq(t.filter(x => x.barline).map(x => x.barline), [true, "end"], "ein Strich nach vier Schlägen, einer am Ende");
}

console.log("\nDie Bibliothek passt zu ihren Akkorden");
{
  // Welcher Akkord liegt unter welchem Schlag, relativ zum Bezugston.
  const akkordBei = (ueber, pos) => {
    if (ueber === "251") return pos < 4 ? [2, "m7"] : pos < 8 ? [7, "dom7"] : [0, "maj7"];
    if (ueber === "blues") return [0, "dom7"];
    return [0, ueber];
  };
  // Blue Notes sind im Blues und über Moll erlaubt: kleine Terz und
  // verminderte Quinte über dem Grundton.
  const blau = { blues: [3, 6], m7: [6] };

  for (const l of LICKS) {
    const noten = L.notenAus(l.noten);
    ok(Math.abs(L.laenge(noten) % 4) < 1e-6, `${l.titel}: füllt ganze Takte`);
    ok(L.UEBER.some(u => u.id === l.ueber), `${l.titel}: bekannte Harmonie`);
    ok(l.was && l.anwenden, `${l.titel}: Zweck und Einsatz`);
    const bezugPc = L.pcVon(l.bezug);
    let pos = 0;
    const toene = [];
    for (const x of noten) { if (x.pitch) toene.push({ midi: toMidi(x.pitch), pos }); pos += L.dauerVon(x); }
    toene.forEach((t, i) => {
      const [grad, q] = akkordBei(l.ueber, t.pos);
      const grund = (bezugPc + grad) % 12;
      const stufe = pc(t.midi - grund);
      const inSkala = QUALITIES[q].skala.includes(stufe) || (blau[l.ueber] || []).includes(stufe);
      const naechster = toene[i + 1];
      const durchgang = naechster && Math.abs(naechster.midi - t.midi) === 1;
      ok(inSkala || durchgang, `${l.titel}: Ton ${i + 1} gehört zum Akkord oder löst sich chromatisch auf`);
    });
    // Und in jeder Tonart spielbar.
    for (const t of L.tonartenAb(l.bezug)) {
      ok(L.transponiere(noten, l.bezug, t).passt, `${l.titel} in ${spell(t)}: im Umfang`);
    }
  }
  const leit = L.notenAus(LICKS.find(l => l.id === "leitlinie").noten).filter(x => x.pitch).map(x => spell(x.pitch));
  eq([leit[2], leit[3], leit[5], leit[6]], ["C", "H", "F", "E"], "Leitlinie: Septime löst sich in die nächste Terz auf");
}

console.log("\nBand zum Lick");
{
  const a = L.bandFuer("m7", { step: 5, alter: 0 });
  eq([a.length, a[0].q, spell(a[0].root)], [1, "m7", "C"], "gegriffen A-Moll: die Band spielt klingend Cm7");
  eq(L.bandFuer("251", { step: 0, alter: 0 }).map(x => spell(x.root)), ["F", "B", "Es"], "II–V–I auf gegriffen C klingt in Es");
  eq(L.bandFuer("blues", { step: 4, alter: 0 }).length > 3, true, "Blues auf gegriffen G ist ein ganzer Blues");
  // Die Akkorde werden in der gegriffenen Tonart buchstabiert. In Des-Dur
  // gegriffen ist die Zwei ein Es, kein Dis — auch wenn es klingend ein Fis
  // wäre, das man über Halbtöne gerechnet bekäme.
  const des = L.bandFuer("251", { step: 1, alter: -1 }).map(a => gegriffenSymbol(a));
  eq(des, ["Esm7", "As7", "Desmaj7"], "II–V–I in Des gegriffen: Esm7, As7, Desmaj7");
  for (const t of L.ZWOELF) {
    const sym = L.bandFuer("251", t).map(a => gegriffenSymbol(a));
    ok(!/isis|eses/.test(sym.join(" ")), `II–V–I in ${spell(t)}: keine Doppelvorzeichen (${sym.join(" ")})`);
    eq(sym[2].replace("maj7", ""), spell(t).charAt(0).toUpperCase() + spell(t).slice(1), `II–V–I in ${spell(t)}: die Eins heißt wie die Tonart`);
  }
  eq(L.bandFuer("blues", { step: 1, alter: -1 }).map(a => gegriffenSymbol(a)).slice(0, 2), ["Des7", "Ges7"],
     "Blues in Des gegriffen: Des7, Ges7 — nicht Cis7, Fis7");
}

console.log("\nSetlist");
{
  ok(S.VORSCHLAEGE.length >= 10, "genug Vorschläge");
  ok(S.VORSCHLAEGE.every(v => v.titel && v.interpret && v.rollen.length && v.warum), "jeder mit Interpret, Rolle und Grund");
  ok(S.VORSCHLAEGE.every(v => !("tonart" in v)), "keine Tonarten aus dem Gedächtnis");
  ok(S.VORSCHLAEGE.every(v => v.rollen.every(r => S.ROLLEN.some(x => x.id === r))), "nur bekannte Rollen");
  eq(S.STUFEN.length, 5, "fünf Stufen bis gig-reif");
  eq(S.griffTonart({ griffPc: 4, geschlecht: "moll" }), "e-Moll", "Griff e-Moll");
  eq(S.klingendTonart({ griffPc: 4, geschlecht: "moll" }), "g-Moll", "klingt g-Moll");
  eq(S.klingendTonart({ griffPc: 0, geschlecht: "dur" }), "Es-Dur", "Griff C klingt Es");
  eq(S.griffTonart({ griffPc: null }), null, "ohne Tonart nichts");
  const songs = [{ id: "a", gig: { stufe: 4 } }, { id: "b", gig: { stufe: 1 } }, { id: "c" }];
  eq(S.setAus(["b", "x", "a"], songs).map(s => s.id), ["b", "a"], "Set in Reihenfolge, Gelöschtes fällt heraus");
  eq(S.bereitschaft(S.setAus(["a", "b", "c"], songs)), { reif: 1, gesamt: 3 }, "einer von dreien gig-reif");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
