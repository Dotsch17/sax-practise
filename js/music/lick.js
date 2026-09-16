/* ==========================================================================
   Licks über eine Akkordfolge erzeugen

   Für Call and Response: die App spielt zwei Takte vor, du antwortest zwei
   Takte. Damit das etwas bringt, muss das Vorgespielte klingen wie etwas,
   das ein Mensch spielen würde — sonst übt man Zufall nachzuahmen.

   Drei Regeln, nach denen hier gebaut wird, und alle drei sind keine
   Stilfrage, sondern das, was eine Linie über Akkorde überhaupt hörbar
   macht:

   1. **Auf der Eins steht ein Akkordton.** Wo die Harmonie wechselt, muss
      die Linie das bestätigen, sonst hört man den Wechsel nicht.
   2. **Terz und Septime sind die Ziele.** Sie tragen die Harmonie; die
      Quinte ist fast beliebig, der Grundton ist der langweiligste Ton.
   3. **Dazwischen wird geschritten.** Sprünge nur in den Akkord, und nach
      einem Sprung geht es in die Gegenrichtung weiter.

   Erzeugt werden **klingende** Tonhöhen — das ist, was aus dem Lautsprecher
   kommt. Die Anzeige transponiert selbst.

   Reine Datenerzeugung, kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { QUALITIES, chordAtBar, scalePitches, guidePitches, chordPitches } from "./harmonie.js";
import { toMidi } from "./theory.js";
import { mulberry32 } from "./rhythmus.js";

/* Rhythmusbausteine für einen Viertelschlag. `off` ist der Versatz in
   Vierteln, `dauer` die Länge. Das Gewicht hängt von der Dichte ab: bei
   hoher Dichte laufen Achtel durch, bei niedriger kommen Viertel und Pausen
   dazu. Ohne diese Abhängigkeit klängen alle drei Stufen gleich — genau das
   war der erste Fehler hier. */
const BAUSTEINE = [
  { id: "zwei",    noten: [{ off: 0,   dauer: 0.5 }, { off: 0.5, dauer: 0.5 }],
    gewicht: d => d * d * 6 },
  { id: "viertel", noten: [{ off: 0,   dauer: 1 }],   gewicht: d => (1 - d) * 6 },
  { id: "kurz",    noten: [{ off: 0,   dauer: 0.5 }], gewicht: d => (1 - d) * 3 },
  { id: "auftakt", noten: [{ off: 0.5, dauer: 0.5 }], gewicht: d => (1 - d) * 3 },
  { id: "pause",   noten: [],                          gewicht: d => (1 - d) * (1 - d) * 4 },
];

export const STUFEN = [
  { id: "ruhig", label: "Ruhig", dichte: 0.5, sprung: 0.15,
    was: "Viertel und wenige Achtel. Viel Platz zum Zuhören." },
  { id: "mittel", label: "Mittel", dichte: 0.75, sprung: 0.25,
    was: "Überwiegend Achtel, wie eine gesungene Linie." },
  { id: "dicht", label: "Dicht", dichte: 0.95, sprung: 0.35,
    was: "Durchlaufende Achtel mit Sprüngen. Bebop-Dichte." },
];

/** Eine bequeme klingende Lage für das Altsaxophon: klingend F3 bis D5. */
const TIEF = 53, HOCH = 74;

function inLage(midi) {
  let m = midi;
  while (m < TIEF) m += 12;
  while (m > HOCH) m -= 12;
  return m;
}

/**
 * Baut ein Lick über `takte` Takte ab `abTakt` einer Akkordfolge.
 *
 * Gibt eine Liste aus { midi, beat, dauer } — `beat` und `dauer` in
 * Vierteln ab dem Beginn des Licks, `midi` klingend.
 */
export function generateLick(akkorde, abTakt, takte = 2, opts = {}) {
  const { stufe = "mittel", beats = 4, seed = null } = opts;
  const st = STUFEN.find(s => s.id === stufe) || STUFEN[1];
  const rnd = seed === null ? Math.random : mulberry32(seed);

  const noten = [];
  let letzterMidi = null;
  let letzterSprung = 0;

  for (let t = 0; t < takte; t++) {
    const akkord = chordAtBar(akkorde, abTakt + t);
    const skala = scalePitches(akkord.root, akkord.q).map(toMidi);
    const akkordToene = chordPitches(akkord.root, akkord.q).map(toMidi);
    const ziele = guidePitches(akkord.root, akkord.q).map(toMidi);
    const wechsel = (abTakt + t) === akkord.abTakt;

    for (let b = 0; b < beats; b++) {
      // Auf der Eins eines Akkordwechsels muss etwas klingen, sonst hört man
      // den Wechsel nicht — dort wird keine Pause zugelassen.
      const erzwingen = b === 0 && wechsel;
      const baustein = waehleBaustein(rnd, st.dichte, erzwingen);
      baustein.forEach(teil => {
        const beat = t * beats + b + teil.off;
        const stark = teil.off === 0;
        const aufDerEins = b === 0 && teil.off === 0;

        let midi;
        if (aufDerEins && wechsel) {
          // Regel 1: der Akkordwechsel wird auf der Eins bestätigt, und zwar
          // bevorzugt mit einem Zielton.
          midi = naechstesAus(ziele, letzterMidi, rnd);
        } else if (stark && rnd() < 0.65) {
          midi = naechstesAus(akkordToene, letzterMidi, rnd);
        } else {
          midi = naechsterSchritt(skala, letzterMidi, letzterSprung, st, rnd);
        }

        midi = inLage(midi);
        if (letzterMidi !== null) letzterSprung = midi - letzterMidi;
        letzterMidi = midi;
        noten.push({ midi, beat, dauer: teil.dauer });
      });
    }
  }

  // Am Schluss Luft lassen: der letzte Achtel wird fallengelassen, damit die
  // Antwort nicht auf den Vorhang fällt.
  if (noten.length > 2 && noten[noten.length - 1].beat > takte * beats - 0.6) noten.pop();
  // Keine Note darf über den Zweitakter hinausklingen.
  const ende = takte * beats;
  for (const nt of noten) nt.dauer = Math.min(nt.dauer, ende - nt.beat);
  return noten.filter(nt => nt.dauer > 0.01);
}

function waehleBaustein(rnd, dichte, erzwingen = false) {
  const liste = BAUSTEINE.filter(b =>
    !erzwingen || (b.noten.length && b.noten[0].off === 0));
  const gewichte = liste.map(b => Math.max(0.001, b.gewicht(dichte)));
  const summe = gewichte.reduce((a, x) => a + x, 0);
  let w = rnd() * summe;
  for (let i = 0; i < liste.length; i++) {
    w -= gewichte[i];
    if (w <= 0) return liste[i].noten.map(x => ({ ...x }));
  }
  return liste[liste.length - 1].noten.map(x => ({ ...x }));
}

/** Der Ton aus `menge`, der dem letzten am nächsten liegt — mit etwas Zufall. */
function naechstesAus(menge, letzter, rnd) {
  if (letzter === null) return menge[Math.floor(rnd() * menge.length)];
  const kandidaten = [];
  for (const m of menge) {
    for (let o = -12; o <= 12; o += 12) {
      const k = inLage(m + o);
      kandidaten.push({ k, abstand: Math.abs(k - letzter) });
    }
  }
  kandidaten.sort((a, b) => a.abstand - b.abstand);
  // Aus den drei nächstliegenden wählen, sonst klebt die Linie fest.
  const auswahl = kandidaten.slice(0, 3);
  return auswahl[Math.floor(rnd() * auswahl.length)].k;
}

/** Regel 3: Schritte in der Skala, nach einem Sprung in die Gegenrichtung. */
function naechsterSchritt(skala, letzter, letzterSprung, st, rnd) {
  if (letzter === null) return skala[Math.floor(rnd() * skala.length)];

  // Alle Skalentöne in allen erreichbaren Oktaven, nach Abstand sortiert.
  const alle = [];
  for (const m of skala) for (let o = -24; o <= 24; o += 12) alle.push(inLage(m + o));
  const einzig = [...new Set(alle)].sort((a, b) => a - b);
  const idx = einzig.findIndex(m => m >= letzter);
  if (idx < 0) return einzig[einzig.length - 1];

  let richtung = rnd() < 0.5 ? 1 : -1;
  if (Math.abs(letzterSprung) > 2) richtung = letzterSprung > 0 ? -1 : 1;
  if (letzter <= TIEF + 2) richtung = 1;
  if (letzter >= HOCH - 2) richtung = -1;

  const weite = rnd() < st.sprung ? 2 : 1;
  const ziel = einzig[Math.max(0, Math.min(einzig.length - 1, idx + richtung * weite))];
  return ziel ?? letzter;
}

/** Wieviele Viertel ein Lick lang ist — für die Anzeige. */
export const lickDauer = (takte, beats = 4) => takte * beats;
