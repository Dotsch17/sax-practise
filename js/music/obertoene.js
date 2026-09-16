/* ==========================================================================
   Teiltöne

   Die Naturtonreihe über einem Griff. Wichtig und leicht falsch gemacht:
   die Teiltöne liegen **nicht** auf gleichstufigen Halbtönen. Der fünfte
   Teilton ist rund 14 Cent tiefer als die gleichstufige grosze Terz, der
   siebte rund 31 Cent tiefer als die kleine Septime. Wer die Teiltöne über
   die nächstgelegene Klaviertaste bestimmt, hält den fünften für zu tief
   gespielt, obwohl er genau richtig ist.

   Deshalb wird hier über das **Frequenzverhältnis** zum Grundton erkannt,
   nicht über die Tonhöhe: Teilton k heiszt f = k · f0, und daran gibt es
   nichts zu deuteln.

   Reine Rechnung, kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { midiToFreq, freqToMidi } from "./theory.js";

/* Die Griffe, auf denen die Obertonübung im Plan steht: tief B, tief H,
   tief C — jeweils ohne Oktavklappe. Angegeben als **notierte** MIDI-Zahl. */
export const GRUNDGRIFFE = [
  { written: 58, name: "tief B" },
  { written: 59, name: "tief H" },
  { written: 60, name: "tief C" },
];

/**
 * Die ersten `n` Teiltöne über einer klingenden Grundfrequenz.
 * `cents` ist die Abweichung von der nächstgelegenen gleichstufigen
 * Tonhöhe — genau die Zahl, die man kennen muss, um nicht gegen ein
 * Stimmgerät anzuspielen.
 */
export function partials(f0, n = 8, a4 = 440) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    const freq = f0 * k;
    const midiExact = freqToMidi(freq, a4);
    const midi = Math.round(midiExact);
    out.push({
      k, freq, midiExact, midi,
      cents: Math.round((midiExact - midi) * 100),
    });
  }
  return out;
}

/**
 * Welchen Teilton hat der Spieler getroffen?
 *
 * Gibt `{ k, abweichungCents, sicher }`. `abweichungCents` ist die
 * Abweichung vom *exakten* Teilton, nicht von der Klaviertaste. `sicher`
 * ist falsch, wenn die Messung zwischen zwei Teiltönen liegt — dann ist es
 * ein Quetschton und kein Teilton.
 */
export function erkennePartial(freq, f0, maxK = 10) {
  if (!(freq > 0) || !(f0 > 0)) return { k: 0, abweichungCents: 0, sicher: false };
  const verhaeltnis = freq / f0;
  const k = Math.max(1, Math.min(maxK, Math.round(verhaeltnis)));
  const abweichung = 1200 * Math.log2(verhaeltnis / k);
  // Die Teiltöne liegen oben immer enger beieinander: zwischen 7 und 8 sind
  // es nur noch gut 230 Cent. Ein Drittel des Abstands zum Nachbarn ist
  // deshalb die vernünftige Grenze, keine feste Centzahl.
  const abstandZumNachbarn = 1200 * Math.log2((k + 1) / k);
  return {
    k,
    abweichungCents: Math.round(abweichung),
    sicher: Math.abs(abweichung) < abstandZumNachbarn / 3,
  };
}

/** Grundfrequenz eines Griffs, klingend. */
export const grundFrequenz = (writtenMidi, a4 = 440) =>
  midiToFreq(writtenMidi - 9, a4);

/**
 * Wie gut passen Teilton und gegriffener Ton zusammen? Das ist das
 * „Matching" aus dem Übungsplan: derselbe Ton einmal über das Voicing und
 * einmal über den Griff, und beide sollen gleich klingen.
 *
 * Zurück kommt der Unterschied in Cent und in der Klangfarbe. Der
 * gegriffene Ton klingt anfangs fast immer dünner — das zeigt sich als
 * niedrigerer Schwerpunkt und schwächere obere Teiltöne.
 */
export function vergleicheMatching(teilton, gegriffen) {
  const centsDiff = (teilton.cents ?? 0) - (gegriffen.cents ?? 0);
  const schwerDiff = (teilton.centroid || 0) - (gegriffen.centroid || 0);
  const relativ = gegriffen.centroid > 0 ? schwerDiff / gegriffen.centroid : 0;

  let urteil;
  if (Math.abs(centsDiff) > 25) {
    urteil = "Die Tonhöhen liegen noch weit auseinander. Zuerst die Höhe angleichen, dann die Farbe.";
  } else if (relativ > 0.15) {
    urteil = "Der gegriffene Ton ist deutlich dunkler als der Teilton. Nimm das Voicing des Teiltons mit in den Griff.";
  } else if (relativ < -0.15) {
    urteil = "Der gegriffene Ton ist heller als der Teilton — ungewöhnlich. Meist ist dann der Teilton gequetscht.";
  } else if (Math.abs(centsDiff) <= 10) {
    urteil = "Das passt. Höhe und Farbe liegen zusammen.";
  } else {
    urteil = "Die Farbe stimmt schon, die Höhe noch nicht ganz.";
  }

  return {
    centsDiff: Math.round(centsDiff),
    schwerpunktDiff: Math.round(schwerDiff),
    relativ: Math.round(relativ * 100),
    urteil,
  };
}
