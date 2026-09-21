/* ==========================================================================
   Melodien für das Blattspiel erzeugen

   Eine brauchbare Vom-Blatt-Übung ist nicht zufällig. Zufällige Tonfolgen
   sind schwerer zu lesen als echte Musik und trainieren das Falsche: beim
   Blattspiel liest man Gestalten, nicht einzelne Noten. Deshalb bevorzugt
   dieser Generator Sekundschritte, macht Sprünge fast nur innerhalb des
   Dreiklangs, kehrt nach einem Sprung meist um und endet auf dem Grundton.

   Reine Datenerzeugung, kein DOM, kein Audio — damit prüfbar.
   ========================================================================== */

"use strict";

import { buildScale, toMidi, majorKeySignature, RANGE } from "./theory.js";
import { generateRhythm, mulberry32 } from "./rhythmus.js";

export const STUFEN = [
  { id: 1, label: "Stufe 1", rhythmus: 1, sprung: 0.0, umfang: 5,
    beschreibung: "Sekundschritte, Viertel und Halbe, fünf Töne" },
  { id: 2, label: "Stufe 2", rhythmus: 2, sprung: 0.18, umfang: 8,
    beschreibung: "dazu Terzen und Achtel, eine Oktave" },
  { id: 3, label: "Stufe 3", rhythmus: 3, sprung: 0.3, umfang: 10,
    beschreibung: "dazu Dreiklangssprünge und Sechzehntel" },
  { id: 4, label: "Stufe 4", rhythmus: 4, sprung: 0.42, umfang: 15,
    beschreibung: "dazu Synkopen und zwei Oktaven" },
];

/**
 * Sucht die Lage, in der die Übung bequem liegt: so tief wie möglich, ohne
 * an die Untergrenze zu stoßen, damit nach oben Platz bleibt.
 */
function grundlage(tonic) {
  for (const oct of [4, 3, 5]) {
    const t = { ...tonic, octave: oct };
    if (toMidi(t) >= RANGE.writtenLow + 2) return t;
  }
  return { ...tonic, octave: 4 };
}

/**
 * Erzeugt eine Melodie.
 *
 * tonic   buchstabierter Grundton (Griff, nicht klingend)
 * stufe   1 bis 4
 * takte   Zahl der Takte
 * beats   Viertel je Takt
 */
export function generateMelodie({ tonic, stufe = 2, takte = 4, beats = 4, seed = null } = {}) {
  const st = STUFEN.find(s => s.id === stufe) || STUFEN[1];
  const rnd = seed === null ? Math.random : mulberry32(seed);

  const { noten: rhythmus } = generateRhythm({
    beats, stufe: st.rhythmus, takte,
    seed: seed === null ? null : seed * 7919 + 13,
  });

  const basis = grundlage(tonic);
  const sig = majorKeySignature(basis);
  // Drei Oktaven Vorrat aufbauen und dann am tatsächlichen Umfang des
  // Instruments abschneiden. Eine Abschätzung über Halbtöne reicht hier
  // nicht: je nach Tonart und Lage bleibt oben unterschiedlich viel Platz,
  // und eine Übung, die über den Umfang hinausläuft, ist unbrauchbar.
  const leiter = buildScale(basis, "dur", 3)
    .filter(p => toMidi(p) >= RANGE.writtenLow && toMidi(p) <= RANGE.writtenHigh);
  const maxIdx = Math.min(leiter.length - 1, st.umfang);

  // Dreiklangstöne sind die Stufen 0, 2 und 4 der Leiter — dorthin darf
  // gesprungen werden, alles andere wäre beim Blattlesen unmusikalisch.
  const istAkkordton = i => [0, 2, 4].includes(i % 7);

  let idx = 0;                 // Index in der Leiter, 0 ist der Grundton
  let letzterSprung = 0;
  const melodie = [];
  const klingende = rhythmus.filter(n => !n.barline && n.pitch).length;
  let gesetzt = 0;

  for (const nt of rhythmus) {
    if (nt.barline) { melodie.push(nt); continue; }
    if (!nt.pitch) { melodie.push({ ...nt, pitch: null }); continue; }

    gesetzt++;
    if (gesetzt === 1) {
      idx = 0;                                  // auf dem Grundton beginnen
    } else if (gesetzt === klingende) {
      // Auf dem Grundton enden, aber auf dem nächstgelegenen. Stur auf
      // Index 0 zu springen gäbe am Schluss gelegentlich einen Sprung über
      // zwei Oktaven — genau das, was eine Blattspielübung nicht braucht.
      idx = naechsterGrundton(idx, maxIdx);
    } else {
      idx = naechsterIndex(idx, letzterSprung, st, maxIdx, rnd, istAkkordton);
      letzterSprung = idx - (melodie.filter(m => m.pitch).length
        ? letzterIdx(melodie, leiter) : idx);
    }

    melodie.push({ ...nt, pitch: leiter[idx] });
  }

  return { noten: melodie, keySig: sig, tonic: basis, tiefster: leiter[0], stufe: st };
}

function letzterIdx(melodie, leiter) {
  for (let i = melodie.length - 1; i >= 0; i--) {
    if (melodie[i].pitch) {
      const j = leiter.findIndex(p =>
        p.step === melodie[i].pitch.step && p.octave === melodie[i].pitch.octave);
      if (j >= 0) return j;
    }
  }
  return 0;
}

function naechsterIndex(idx, letzterSprung, st, maxIdx, rnd, istAkkordton) {
  // Nach einem Sprung folgt fast immer ein Schritt in die Gegenrichtung.
  // Das ist keine Schulregel um ihrer selbst willen: so schreiben Menschen
  // Melodien, und genau solche Gestalten muss man im Blatt erkennen.
  if (Math.abs(letzterSprung) >= 2 && rnd() < 0.8) {
    const richtung = letzterSprung > 0 ? -1 : 1;
    return klemme(idx + richtung, maxIdx);
  }

  const springen = rnd() < st.sprung;
  if (springen) {
    // Nur zu Akkordtönen springen, und höchstens eine Sexte weit.
    const ziele = [];
    for (let d = -5; d <= 5; d++) {
      if (Math.abs(d) < 2) continue;
      const z = idx + d;
      if (z < 0 || z > maxIdx) continue;
      if (istAkkordton(z)) ziele.push(z);
    }
    if (ziele.length) return ziele[Math.floor(rnd() * ziele.length)];
  }

  // Schritt. Am Rand des Umfangs zwingend nach innen.
  let richtung = rnd() < 0.5 ? -1 : 1;
  if (idx <= 0) richtung = 1;
  if (idx >= maxIdx) richtung = -1;
  return klemme(idx + richtung, maxIdx);
}

const klemme = (i, max) => Math.max(0, Math.min(max, i));

/** Der Grundton, der dem aktuellen Ton am nächsten liegt. */
function naechsterGrundton(idx, maxIdx) {
  let beste = 0, abstand = Infinity;
  for (let k = 0; k <= maxIdx; k += 7) {
    if (Math.abs(k - idx) < abstand) { abstand = Math.abs(k - idx); beste = k; }
  }
  return beste;
}

/**
 * Eine kurze Phrase aus reinen Tonhöhen, ohne Rhythmus — für das Nachspielen
 * nach Gehör. Dieselbe Gestaltregel wie beim Blattspiel: überwiegend
 * Schritte, Sprünge nur in den Dreiklang, nach einem Sprung wird umgekehrt.
 * Eine Phrase aus Zufallstönen kann man sich nicht merken, und genau das
 * Merken ist hier die Übung.
 *
 * `laenge` ist die Zahl der Töne, `sprung` die Sprungneigung von 0 bis 1.
 */
export function generatePhrase({ tonic, laenge = 4, sprung = 0.2, umfang = 8,
                                 skala = "dur", seed = null } = {}) {
  const rnd = seed === null ? Math.random : mulberry32(seed);
  const basis = grundlage(tonic);
  const leiter = buildScale(basis, skala, 3)
    .filter(p => toMidi(p) >= RANGE.writtenLow && toMidi(p) <= RANGE.writtenHigh);
  const maxIdx = Math.min(leiter.length - 1, umfang);
  const st = { sprung };
  const istAkkordton = i => [0, 2, 4].includes(i % 7);

  let idx = 0;
  let letzterSprung = 0;
  const out = [leiter[0]];

  for (let i = 1; i < laenge; i++) {
    const vorher = idx;
    idx = naechsterIndex(idx, letzterSprung, st, maxIdx, rnd, istAkkordton);
    letzterSprung = idx - vorher;
    out.push(leiter[idx]);
  }
  return out;
}

/** Spannweite einer Melodie in diatonischen Stufen — für Tests und Anzeige. */
export function spannweite(noten) {
  const midis = noten.filter(n => n.pitch).map(n => toMidi(n.pitch));
  return midis.length ? Math.max(...midis) - Math.min(...midis) : 0;
}
