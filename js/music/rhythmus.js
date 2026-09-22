/* ==========================================================================
   Rhythmen erzeugen

   Reine Datenerzeugung, ohne DOM und ohne Audio — damit sie prüfbar bleibt.
   Ein erzeugter Takt muss exakt aufgehen; ein Generator, der gelegentlich
   Takte mit 4,5 Schlägen ausspuckt, ist schlimmer als keiner.
   ========================================================================== */

"use strict";

/** Bausteine, jeweils als Folge von { dur, dots, pause }. Die Summe steht
    daneben, damit das Füllen ohne Nachrechnen geht. */
export const BAUSTEINE = [
  // Stufe 1: Viertel, Halbe, Ganze
  { stufe: 1, laenge: 1, teile: [{ dur: 1 }] },
  { stufe: 1, laenge: 2, teile: [{ dur: 2 }] },
  { stufe: 1, laenge: 4, teile: [{ dur: 4 }] },
  { stufe: 1, laenge: 1, teile: [{ dur: 1, pause: true }] },

  // Stufe 2: Achtelpaare und punktierte Viertel
  { stufe: 2, laenge: 1, teile: [{ dur: 0.5 }, { dur: 0.5 }] },
  { stufe: 2, laenge: 2, teile: [{ dur: 1, dots: 1 }, { dur: 0.5 }] },
  { stufe: 2, laenge: 1, teile: [{ dur: 0.5, pause: true }, { dur: 0.5 }] },
  { stufe: 2, laenge: 2, teile: [{ dur: 2, dots: 0 }] },

  // Stufe 3: Sechzehntel in Vierergruppen und gemischt
  { stufe: 3, laenge: 1, teile: [{ dur: 0.25 }, { dur: 0.25 }, { dur: 0.25 }, { dur: 0.25 }] },
  { stufe: 3, laenge: 1, teile: [{ dur: 0.5 }, { dur: 0.25 }, { dur: 0.25 }] },
  { stufe: 3, laenge: 1, teile: [{ dur: 0.25 }, { dur: 0.25 }, { dur: 0.5 }] },
  { stufe: 3, laenge: 1, teile: [{ dur: 0.5, dots: 1 }, { dur: 0.25 }] },

  // Stufe 4: Synkopen und Bindungen über die Zählzeit
  { stufe: 4, laenge: 2, teile: [{ dur: 0.5 }, { dur: 1 }, { dur: 0.5 }] },
  { stufe: 4, laenge: 1, teile: [{ dur: 0.25 }, { dur: 0.5 }, { dur: 0.25 }] },
  { stufe: 4, laenge: 2, teile: [{ dur: 0.5, pause: true }, { dur: 1, dots: 1 }] },
  { stufe: 4, laenge: 2, teile: [{ dur: 1, dots: 1 }, { dur: 0.25 }, { dur: 0.25 }] },
];

export const STUFEN = [
  { id: 1, label: "Viertel", beschreibung: "Viertel, Halbe, Ganze und Viertelpausen" },
  { id: 2, label: "Achtel", beschreibung: "dazu Achtelpaare und punktierte Viertel" },
  { id: 3, label: "Sechzehntel", beschreibung: "dazu Sechzehntelgruppen" },
  { id: 4, label: "Synkopen", beschreibung: "dazu Bindungen über die Zählzeit" },
];

const laengeVon = t => t.dur * (t.dots ? 1.5 : 1);

/**
 * Baut einen Takt, der exakt aufgeht. `beats` ist die Zahl der Viertel.
 * Gefüllt wird von vorn; passt nichts mehr, wird mit dem größten passenden
 * Wert aufgefüllt, damit der Takt nie krumm endet.
 */
function bau(beats, stufe, rnd) {
  const erlaubt = BAUSTEINE.filter(b => b.stufe <= stufe);
  const teile = [];
  let rest = beats;
  let schutz = 0;

  while (rest > 0.001 && schutz++ < 100) {
    const passend = erlaubt.filter(b => b.laenge <= rest + 0.001);
    if (!passend.length) break;
    const b = passend[Math.floor(rnd() * passend.length)];
    for (const t of b.teile) teile.push({ ...t });
    rest -= b.laenge;
  }

  // Rest sauber auffüllen. Kommt bei krummen Taktarten wie 3/4 vor.
  while (rest > 0.001) {
    const wert = rest >= 2 ? 2 : rest >= 1 ? 1 : rest >= 0.5 ? 0.5 : 0.25;
    teile.push({ dur: wert });
    rest -= wert;
  }
  return teile;
}

/**
 * Erzeugt einen Rhythmus über mehrere Takte.
 * Gibt Noten im Format von notation.js, mit Taktstrichen dazwischen, plus
 * die Einsatzzeitpunkte in Vierteln ab Beginn — die braucht die Messung.
 */
export function generateRhythm({ beats = 4, stufe = 2, takte = 2, seed = null } = {}) {
  const rnd = seed === null ? Math.random : mulberry32(seed);
  const noten = [];
  const einsaetze = [];
  let pos = 0;

  for (let t = 0; t < takte; t++) {
    if (t > 0) noten.push({ barline: true });
    for (const teil of bau(beats, stufe, rnd)) {
      if (!teil.pause) einsaetze.push(pos);
      noten.push({
        pitch: teil.pause ? null : { step: 6, alter: 0, octave: 4 },   // H4, auf der Mittellinie
        dur: teil.dur,
        dots: teil.dots || 0,
      });
      pos += laengeVon(teil);
    }
  }
  noten.push({ barline: "end" });
  return { noten, einsaetze, dauer: pos };
}

/** Kleiner, deterministischer Zufallsgenerator — nur für reproduzierbare Tests. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ordnet getippte Zeiten den erwarteten Einsätzen zu und misst die
 * Abweichung. Zeiten in Sekunden, Einsätze in Vierteln.
 *
 * Bewusst gierig von vorn nach hinten: wer einen Einsatz auslässt, soll
 * nicht rückwirkend alle folgenden Treffer verlieren.
 */
export function bewerte(taps, einsaetze, startZeit, sekundenJeViertel, toleranz = 0.25) {
  const erwartet = einsaetze.map(e => startZeit + e * sekundenJeViertel);
  const fenster = toleranz * sekundenJeViertel;
  const treffer = new Array(erwartet.length).fill(null);
  const uebrig = [...taps];

  for (let i = 0; i < erwartet.length; i++) {
    let besterIdx = -1, bestesDelta = Infinity;
    for (let j = 0; j < uebrig.length; j++) {
      const d = uebrig[j] - erwartet[i];
      if (Math.abs(d) < Math.abs(bestesDelta) && Math.abs(d) <= fenster) {
        bestesDelta = d; besterIdx = j;
      }
    }
    if (besterIdx >= 0) {
      treffer[i] = bestesDelta;
      uebrig.splice(besterIdx, 1);
    }
  }

  const getroffen = treffer.filter(t => t !== null);
  const abweichungen = getroffen.map(Math.abs);
  return {
    treffer,
    getroffen: getroffen.length,
    gesamt: erwartet.length,
    zuviel: uebrig.length,
    mittlereAbweichungMs: getroffen.length
      ? Math.round(1000 * abweichungen.reduce((a, b) => a + b, 0) / getroffen.length)
      : null,
    // Ein durchgehender Versatz in eine Richtung heißt: du schleppst oder
    // eilst. Das ist etwas anderes als ungenau zu sein.
    versatzMs: getroffen.length
      ? Math.round(1000 * getroffen.reduce((a, b) => a + b, 0) / getroffen.length)
      : null,
  };
}
