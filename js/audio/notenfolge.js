/* ==========================================================================
   Aus dem Tonhöhenstrom einzelne Noten machen

   Die Tonhöhenerkennung liefert dreißigmal je Sekunde einen Messwert. Zum
   Nachspielen braucht man aber Noten: „A, dann H, dann C". Dazwischen liegt
   die eigentliche Arbeit, und sie ist beim Saxophon besonders heikel:

   - Der Anblasvorgang ist nicht sauber. Die ersten 50 bis 100 ms eines Tons
     liegen oft daneben oder springen in die Oktave. Deshalb zählt ein Ton
     erst, wenn er eine Weile ruhig steht.
   - Zwischen zwei gebundenen Tönen gibt es keine Stille, an der man trennen
     könnte. Getrennt wird deshalb an der Tonhöhe, nicht an der Lautstärke.
   - Ein Ton, der kurz wackelt, darf nicht zu zwei Noten werden. Deshalb
     muss eine neue Tonhöhe erst eine Weile halten, bevor sie den Vorgänger
     ablöst.

   Der Sammler ist bewusst ein reiner Zustandsautomat, den man mit Messwerten
   füttert. So lässt er sich ohne Mikrofon mit gerechneten Strömen prüfen —
   und genau das ist nötig, weil man am Gerät nicht reproduzierbar
   danebenspielen kann.
   ========================================================================== */

"use strict";

import * as pitch from "./pitch.js";

export const VORGABEN = {
  minDauerMs: 110,      // so lange muss eine Tonhöhe stehen, bis sie zählt
  wechselMs: 70,        // so lange muss eine neue Tonhöhe halten, um abzulösen
  stilleMs: 140,        // so lange Stille beendet den laufenden Ton
  toleranzCents: 55,    // innerhalb davon gilt es als derselbe Ton
  minKlarheit: 0.68,
};

/**
 * Erzeugt einen Sammler. `emit(note)` wird gerufen, sobald eine Note
 * feststeht: { midi, cents, beginn, dauer }.
 */
export function sammler(emit, opts = {}) {
  const v = { ...VORGABEN, ...opts };

  let laufend = null;    // { midi, beginn, centsSumme, n, letzteZeit }
  let kandidat = null;   // { midi, seit }
  let letzteStimme = -1; // Zeit der letzten brauchbaren Messung

  const schliesse = zeit => {
    if (!laufend) return;
    const dauer = zeit - laufend.beginn;
    if (dauer * 1000 >= v.minDauerMs) {
      emit({
        midi: laufend.midi,
        cents: Math.round(laufend.centsSumme / laufend.n),
        beginn: laufend.beginn,
        dauer,
      });
    }
    laufend = null;
  };

  return {
    /**
     * Einen Messwert einspeisen.
     * `zeit` in Sekunden auf derselben Uhr, gegen die später verglichen wird.
     */
    fuettere({ zeit, midiExact = null, klarheit = 0, still = false }) {
      if (still || midiExact === null || klarheit < v.minKlarheit) {
        if (letzteStimme >= 0 && (zeit - letzteStimme) * 1000 >= v.stilleMs) {
          schliesse(zeit);
          kandidat = null;
        }
        return;
      }
      letzteStimme = zeit;

      const midi = Math.round(midiExact);
      const cents = Math.round((midiExact - midi) * 100);

      if (laufend && Math.abs((midiExact - laufend.midi) * 100) <= v.toleranzCents) {
        // Derselbe Ton, er hält.
        laufend.centsSumme += cents + (midi - laufend.midi) * 100;
        laufend.n++;
        laufend.letzteZeit = zeit;
        kandidat = null;
        return;
      }

      // Eine andere Tonhöhe. Sie löst erst ab, wenn sie selbst eine Weile hält —
      // sonst macht ein Wackler aus einem Ton zwei.
      if (!kandidat || kandidat.midi !== midi) {
        kandidat = { midi, seit: zeit, centsSumme: cents, n: 1 };
        return;
      }
      kandidat.centsSumme += cents;
      kandidat.n++;

      if ((zeit - kandidat.seit) * 1000 >= v.wechselMs) {
        schliesse(kandidat.seit);
        laufend = {
          midi: kandidat.midi,
          beginn: kandidat.seit,
          centsSumme: kandidat.centsSumme,
          n: kandidat.n,
          letzteZeit: zeit,
        };
        kandidat = null;
      }
    },

    /** Am Ende einer Aufnahme den letzten Ton noch abschlieszen. */
    beende(zeit) { schliesse(zeit); kandidat = null; },
  };
}

/* --- Live vom Mikrofon -------------------------------------------------------- */

let abmelden = null;
let aktiverSammler = null;

/**
 * Hört zu und ruft `onNote` für jede erkannte Note. Gibt eine Funktion
 * zurück, die das Zuhören beendet und den letzten Ton abschlieszt.
 */
export function hoereZu(onNote, opts = {}) {
  stopp();
  aktiverSammler = sammler(onNote, opts);
  abmelden = pitch.onPitch(p => {
    if (!p || !aktiverSammler) return;
    aktiverSammler.fuettere({
      zeit: performance.now() / 1000,
      midiExact: p.midiExact ?? null,
      klarheit: p.clarity || 0,
      still: !!p.silent,
    });
  });
  return stopp;
}

export function stopp() {
  if (aktiverSammler) aktiverSammler.beende(performance.now() / 1000);
  abmelden?.();
  abmelden = null;
  aktiverSammler = null;
}

/* --- Vergleichen --------------------------------------------------------------
   Gierig von vorn: wer einen Ton auslässt, soll nicht rückwirkend alle
   folgenden verlieren. Dasselbe Prinzip wie bei der Rhythmusmessung. */

/**
 * Vergleicht gespielte mit erwarteten MIDI-Tonhöhen.
 * `oktaveEgal` wertet denselben Ton in anderer Oktave als halbrichtig.
 */
export function vergleiche(gespielt, erwartet, { oktaveEgal = true } = {}) {
  const ergebnis = erwartet.map(() => null);
  const rest = [...gespielt];
  let sucheAb = 0;

  erwartet.forEach((soll, i) => {
    for (let j = sucheAb; j < rest.length; j++) {
      if (rest[j] === soll) {
        ergebnis[i] = "richtig";
        sucheAb = j + 1;
        return;
      }
      if (oktaveEgal && ((rest[j] - soll) % 12 + 12) % 12 === 0) {
        ergebnis[i] = "oktave";
        sucheAb = j + 1;
        return;
      }
    }
  });

  const richtig = ergebnis.filter(x => x === "richtig").length;
  const oktave = ergebnis.filter(x => x === "oktave").length;
  return {
    proTon: ergebnis,
    richtig, oktave,
    fehlend: ergebnis.filter(x => x === null).length,
    gesamt: erwartet.length,
    zuviel: Math.max(0, gespielt.length - (richtig + oktave)),
    alleRichtig: richtig === erwartet.length,
  };
}
