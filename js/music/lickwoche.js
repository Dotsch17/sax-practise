/* ==========================================================================
   Lick der Woche — Rechnung

   Ein Lick ist eine kurze Phrase mit Rhythmus, gegriffen notiert, über
   einem bestimmten Akkord oder einer Folge. Gelernt wird er, bis er in
   allen zwölf Tonarten sitzt: erst dann gehört er einem, sonst ist er ein
   Kunststück in G.

   Die zwölf Tonarten laufen im Quartenzirkel, weil Musik so weitergeht —
   II–V–I, Blues, Standards bewegen sich in Quarten. Wer in Quarten übt,
   übt die Wege, die er auf der Bühne braucht.

   Transponiert wird über Stufen, nicht über Halbtöne: ein Lick in G mit
   einem Fis wird in F einen E-Leitton haben, nicht ein Fes. Dann wird der
   ganze Lick oktavweise in den Umfang des Alts gelegt.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { toMidi, spellOnStep, RANGE } from "./theory.js";
import { buildProgression, PROGRESSIONS, chordSymbol } from "./harmonie.js";
import { zuKlingend } from "./leadsheet.js";

/* Zwölf gegriffene Grundtöne im Quartenzirkel, in der üblichen
   Schreibweise: B und Es statt Ais und Dis, aber Fis statt Ges wäre
   genauso richtig — Ges passt zum Zirkel, der von den Be-Tonarten kommt. */
export const ZWOELF = [
  { step: 0, alter: 0 }, { step: 3, alter: 0 }, { step: 6, alter: -1 }, { step: 2, alter: -1 },
  { step: 5, alter: -1 }, { step: 1, alter: -1 }, { step: 4, alter: -1 }, { step: 6, alter: 0 },
  { step: 2, alter: 0 }, { step: 5, alter: 0 }, { step: 1, alter: 0 }, { step: 4, alter: 0 },
];

const STAMM = [0, 2, 4, 5, 7, 9, 11];
const pcVon = t => (((STAMM[t.step] + t.alter) % 12) + 12) % 12;
export const keyName = t => `${t.step}:${t.alter}`;

/** Die zwölf Tonarten, beginnend mit der Tonart des Licks. */
export function tonartenAb(bezug) {
  const i = ZWOELF.findIndex(t => pcVon(t) === pcVon(bezug));
  const start = i < 0 ? 0 : i;
  return [...ZWOELF.slice(start), ...ZWOELF.slice(0, start)].map((t, k) => k === 0 ? { ...bezug } : t);
}

export const dauerVon = n => n.dur * (n.dots ? 1.5 : 1);
export const laenge = noten => noten.reduce((s, n) => s + dauerVon(n), 0);

/**
 * Transponiert einen Lick von seinem Bezugston auf einen anderen, über
 * Stufen buchstabiert, und legt ihn oktavweise in den Umfang des Alts.
 * `passt` sagt, ob das gelungen ist — ein Lick über zwei Oktaven passt
 * nicht in jede Tonart, und das soll man sehen, statt einen Ton im
 * Altissimo zu suchen.
 */
export function transponiere(noten, bezug, ziel) {
  const vonMidi = pcVon(bezug), nachMidi = pcVon(ziel);
  let halb = nachMidi - vonMidi;
  if (halb > 6) halb -= 12;
  if (halb < -5) halb += 12;
  const stufen = ((ziel.step - bezug.step) % 7 + 7) % 7;
  // Stufen und Halbtöne müssen in dieselbe Richtung zeigen.
  const stufenRichtung = halb >= 0 ? stufen : stufen - 7;
  const roh = noten.map(n => n.pitch
    ? { ...n, pitch: spellOnStep(toMidi(n.pitch) + halb, ((n.pitch.step + stufenRichtung) % 7 + 7) % 7) }
    : { ...n });
  return inUmfang(roh);
}

/** Verschiebt oktavweise, bis alle Töne im Umfang liegen, möglichst wenig. */
export function inUmfang(noten) {
  const midis = noten.filter(n => n.pitch).map(n => toMidi(n.pitch));
  if (!midis.length) return { noten, passt: true, versatz: 0 };
  const tief = Math.min(...midis), hoch = Math.max(...midis);
  for (const v of [0, -12, 12, -24, 24]) {
    if (tief + v >= RANGE.writtenLow && hoch + v <= RANGE.writtenHigh) {
      return { noten: v ? noten.map(n => n.pitch ? { ...n, pitch: { ...n.pitch, octave: n.pitch.octave + v / 12 } } : n) : noten,
               passt: true, versatz: v };
    }
  }
  return { noten, passt: false, versatz: 0 };
}

/** Taktstriche einsetzen, wo die Summe eine volle Zählzeit-Gruppe erreicht. */
export function mitTaktstrichen(noten, schlaege = 4) {
  const out = [];
  let pos = 0;
  noten.forEach((n, i) => {
    out.push({ ...n });
    pos += dauerVon(n);
    if (i < noten.length - 1 && Math.abs(pos % schlaege) < 1e-6) out.push({ barline: true });
  });
  out.push({ barline: "end" });
  return out;
}

/* --- Wozu der Lick passt ------------------------------------------------------- */

export const UEBER = [
  { id: "m7",    label: "Moll 7",    was: "über einen Moll-Septakkord oder Moll-Vamp" },
  { id: "dom7",  label: "Dominante", was: "über einen Dominantseptakkord" },
  { id: "maj7",  label: "Dur",       was: "über einen Dur-Akkord" },
  { id: "251",   label: "II–V–I",    was: "über eine II–V–I, der Bezugston ist die Eins" },
  { id: "blues", label: "Blues",     was: "über einen Blues, der Bezugston ist der Grundton" },
];

/* Die Band zum Lick: dieselbe Harmonie in der Tonart, in der gerade geübt
   wird. Gespielt wird klingend — gegriffen minus neun Halbtöne. */
const VAMPS = {
  m7:   { akkorde: [{ grad: 0, q: "m7", takte: 4 }] },
  dom7: { akkorde: [{ grad: 0, q: "dom7", takte: 4 }] },
  maj7: { akkorde: [{ grad: 0, q: "maj7", takte: 4 }] },
};

/* Welche Stufe ein Halbtonabstand in der Tonart ist, für die Schreibweise:
   die Zwei einer Tonart ist ein D über C, kein Cis, und die kleine Septime
   ein B, kein Ais. */
const STUFE_VON = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

/**
 * Die Akkorde werden in der gegriffenen Tonart buchstabiert und dann über
 * Stufen nach klingend übertragen. Andersherum — klingend über Halbtöne —
 * stünde in Des-Dur gegriffen ein Dism7, wo ein Esm7 hingehört.
 */
export function bandFuer(ueber, gegriffenerGrund) {
  const prog = VAMPS[ueber]
    || PROGRESSIONS.find(p => p.id === (ueber === "251" ? "dur251" : "blues"));
  const tonika = { ...gegriffenerGrund, octave: 4 };
  const basis = buildProgression(prog, 0);
  return basis.map((a, i) => {
    const grad = prog.akkorde[i].grad;
    const gegriffen = spellOnStep(toMidi(tonika) + grad, (tonika.step + STUFE_VON[grad]) % 7);
    const root = { ...zuKlingend(gegriffen), octave: 3 };
    return { ...a, root, symbol: chordSymbol(root, a.q) };
  });
}

export { pcVon };

/* --- Kurzschrift ------------------------------------------------------------------
   Für die Bibliothek und die Tests: „A4:8 C5:8 Es5:4 r:4“. Tonname
   deutsch mit Oktave, Doppelpunkt, Dauer als 1, 2, 4, 8 oder 16, ein
   Punkt dahinter heißt punktiert, „r“ ist eine Pause. Gegriffen. */

const NAMEN = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, H: 6, B: 6 };

export function notenAus(text) {
  return text.trim().split(/\s+/).map(tok => {
    const [ton, d = "8"] = tok.split(":");
    const punkt = d.endsWith(".");
    const dur = 4 / Number(punkt ? d.slice(0, -1) : d);
    if (ton === "r") return { pitch: null, dur, dots: punkt ? 1 : 0 };
    const m = /^([A-H])(is|es|s)?(\d)$/.exec(ton);
    if (!m) throw new Error("Unbekannter Ton: " + tok);
    let alter = m[2] === "is" ? 1 : m[2] ? -1 : 0;
    if (m[1] === "B") alter = -1;
    return { pitch: { step: NAMEN[m[1]], alter, octave: Number(m[3]) }, dur, dots: punkt ? 1 : 0 };
  });
}
