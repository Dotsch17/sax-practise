/* ==========================================================================
   Skalen und Akkorde als Prüfungsstoff

   Die Zulassungsprüfung IGP Saxophon Popularmusik verlangt „theoretisch und
   praktisch am Instrument“: Dur, Moll äolisch, harmonisch und melodisch,
   die Modi dorisch bis lokrisch, dazu Drei- und Vierklänge — in allen
   Tonarten. Das sind siebzehn Arten mal zwölf Grundtöne. Wer das nicht
   zählt, übt die zwanzig, die er mag, und steht in der Prüfung vor
   Gis-lokrisch.

   Zwei Dinge, die hier nicht verhandelbar sind:

   - **Grundtöne werden so gewählt, wie man sie schreibt.** Cis-phrygisch,
     nicht Des-phrygisch — Letzteres hätte Eses und Fes. Für jede Art und
     jede Tonhöhe wird die Schreibweise mit den wenigsten Vorzeichen
     genommen. Das ist die, nach der ein Prüfer fragt.
   - **„Ganzer Umfang“ heißt vom Grundton bis ganz oben, bis ganz unten und
     zurück.** Nicht zwei Oktaven, die zufällig passen. Genau so wird es
     verlangt, und genau dort fallen die Töne am Rand heraus, die man sonst
     nie spielt.

   Kein DOM. Die Tonleitern-Ansicht und die Tests benutzen dasselbe.
   ========================================================================== */

"use strict";

import {
  MAJOR_KEYS, MINOR_KEYS, SCALES, buildScale, buildChord, toMidi, spell,
  RANGE, NAMING,
} from "./theory.js";

/* --- Die Arten --------------------------------------------------------------- */

/* `keys` bestimmt, woher die Grundtöne kommen:
   - "major" und "minor" sind die Tonartenlisten aus theory.js. Das bleibt
     für Dur, Moll und den Dominantseptakkord so, weil unter diesen Namen
     schon Übungsdaten gespeichert sind.
   - "frei" heißt: zwölf Grundtöne, jeweils in der Schreibweise mit den
     wenigsten Vorzeichen. */
export const ARTEN = [
  { id: "dur",             label: "Dur",             gruppe: "Skalen", scale: "dur",             keys: "major", pruefung: true },
  { id: "moll_natur",      label: "Moll äolisch",    gruppe: "Skalen", scale: "moll_natur",      keys: "minor", pruefung: true },
  { id: "moll_harmonisch", label: "Moll harmonisch", gruppe: "Skalen", scale: "moll_harmonisch", keys: "minor", pruefung: true },
  { id: "moll_melodisch",  label: "Moll melodisch",  gruppe: "Skalen", scale: "moll_melodisch",  keys: "minor", pruefung: true },

  { id: "dorisch",     label: "Dorisch",     gruppe: "Modi", scale: "dorisch",     keys: "frei", pruefung: true },
  { id: "phrygisch",   label: "Phrygisch",   gruppe: "Modi", scale: "phrygisch",   keys: "frei", pruefung: true },
  { id: "lydisch",     label: "Lydisch",     gruppe: "Modi", scale: "lydisch",     keys: "frei", pruefung: true },
  { id: "mixolydisch", label: "Mixolydisch", gruppe: "Modi", scale: "mixolydisch", keys: "frei", pruefung: true },
  { id: "lokrisch",    label: "Lokrisch",    gruppe: "Modi", scale: "lokrisch",    keys: "frei", pruefung: true },

  { id: "dreiklang_dur",          label: "Dur-Dreiklang",   gruppe: "Akkorde", chord: "dur",            keys: "major", symbol: "",     pruefung: true },
  { id: "dreiklang_moll",         label: "Moll-Dreiklang",  gruppe: "Akkorde", chord: "moll",           keys: "minor", symbol: "m",    pruefung: true },
  { id: "dreiklang_vermindert",   label: "Vermindert",      gruppe: "Akkorde", chord: "vermindert",     keys: "frei",  symbol: "°",    pruefung: true },
  { id: "dreiklang_uebermaessig", label: "Übermäßig",       gruppe: "Akkorde", chord: "uebermaessig",   keys: "frei",  symbol: "+",    pruefung: true },
  { id: "maj7",                   label: "Major 7",         gruppe: "Akkorde", chord: "dur7",           keys: "frei",  symbol: "maj7", pruefung: true },
  { id: "dom7",                   label: "Dominant 7",      gruppe: "Akkorde", chord: "dom7",           keys: "major", symbol: "7",    pruefung: true },
  { id: "moll7",                  label: "Moll 7",          gruppe: "Akkorde", chord: "moll7",          keys: "frei",  symbol: "m7",   pruefung: true },
  { id: "halbvermindert",         label: "Moll 7♭5",        gruppe: "Akkorde", chord: "halbvermindert", keys: "frei",  symbol: "m7♭5", pruefung: true },

  { id: "chromatisch", label: "Chromatisch", gruppe: "Weitere", scale: "chromatisch", keys: "major" },
  { id: "blues",       label: "Blues",       gruppe: "Weitere", scale: "blues",       keys: "major" },
  { id: "ganzton",     label: "Ganzton",     gruppe: "Weitere", scale: "ganzton",     keys: "major" },
];

export const GRUPPEN = ["Skalen", "Modi", "Akkorde", "Weitere"];
export const PRUEFUNGS_ARTEN = ARTEN.filter(a => a.pruefung);

export const artOf = id => ARTEN.find(a => a.id === id) || ARTEN[0];
export const drillId = (artId, keyName) => `skala:${artId}:${keyName}`;

/* --- Grundtöne ---------------------------------------------------------------- */

// Quintenzirkel ab C, wie die Tonartenlisten: so wird geübt und abgefragt.
const ZIRKEL = [0, 7, 2, 9, 4, 11, 6, 5, 10, 3, 8, 1];
const STAMM = [0, 2, 4, 5, 7, 9, 11];
const pcOf = p => ((toMidi(p) % 12) + 12) % 12;

/** Die Töne einer Art über einem Grundton, eine Oktave, ohne Wiederholung. */
function einmal(art, tonic) {
  if (art.chord) return buildChord(tonic, art.chord);
  return buildScale(tonic, art.scale, 1).slice(0, -1);
}

const vorzeichenLast = toene => toene.reduce((s, p) => s + Math.abs(p.alter), 0);

/**
 * Welche Vorzeichnung die Skala trägt. Bei den Modi ist das die der
 * Durtonart, aus der sie stammt: D-dorisch steht ohne Vorzeichen, nicht mit
 * einem Be. Akkorde bekommen keine, ihre Vorzeichen stehen am Ton.
 */
function vorzeichnung(art, toene) {
  if (art.chord || art.scale === "chromatisch" || art.scale === "blues" || art.scale === "ganzton") return 0;
  const kreuze = toene.filter(p => p.alter > 0).length;
  const ben = toene.filter(p => p.alter < 0).length;
  return kreuze ? kreuze : -ben;
}

const freiCache = new Map();

/**
 * Zwölf Grundtöne für eine Art mit freier Schreibweise. Je Tonhöhe gewinnt
 * die Schreibweise mit den wenigsten Vorzeichen in der ganzen Skala; bei
 * Gleichstand die mit Be, weil Leadsheets so geschrieben sind.
 */
function freieGrundtoene(art) {
  if (freiCache.has(art.id)) return freiCache.get(art.id);
  const out = ZIRKEL.map(pc => {
    const kandidaten = [];
    for (let step = 0; step < 7; step++) {
      for (const alter of [-1, 0, 1]) {
        if ((((STAMM[step] + alter) % 12) + 12) % 12 === pc) kandidaten.push({ step, alter, octave: 4 });
      }
    }
    const bewertet = kandidaten.map(t => ({ t, last: vorzeichenLast(einmal(art, t)) + Math.abs(t.alter) * 0.5 }));
    bewertet.sort((a, b) => a.last - b.last || a.t.alter - b.t.alter);
    const tonic = bewertet[0].t;
    return { tonic, sig: vorzeichnung(art, einmal(art, tonic)), name: spell(tonic), pc };
  });
  freiCache.set(art.id, out);
  return out;
}

/** Die Grundtöne einer Art, in Übungsreihenfolge. */
export function tonartenFuer(art) {
  if (art.keys === "minor") return MINOR_KEYS;
  if (art.keys === "major") return MAJOR_KEYS;
  return freieGrundtoene(art);
}

/* --- Benennen ----------------------------------------------------------------- */

const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Was auf der Karte steht: „a-Moll harmonisch“, „Cis phrygisch“, „Fm7♭5“.
 * Akkorde als Symbol, weil sie so im Leadsheet stehen und so abgefragt
 * werden.
 */
export function titel(art, key, naming = NAMING.DE) {
  const grund = spell(key.tonic, naming);
  if (art.chord) return gross(grund) + art.symbol;
  if (art.keys === "major" && art.scale === "dur") return key.name;
  if (art.keys === "minor") {
    const zusatz = { moll_natur: "äolisch", moll_harmonisch: "harmonisch", moll_melodisch: "melodisch" }[art.id];
    return key.name + (zusatz ? " " + zusatz : "");
  }
  return gross(grund) + " " + art.label.toLowerCase();
}

/** Die Tonnamen einer Oktave, aufwärts. Das ist die „theoretische“ Antwort. */
export function buchstabiert(art, key, naming = NAMING.DE) {
  return einmal(art, key.tonic).map(p => gross(spell(p, naming)));
}

/* --- Tonfolgen ---------------------------------------------------------------- */

/** Sucht die Oktave, in der die Leiter ganz in den Umfang passt. */
function passendeOktave(tonic, halbtoene) {
  for (const oct of [4, 3, 5, 2]) {
    const t = { ...tonic, octave: oct };
    const low = toMidi(t);
    if (low >= RANGE.writtenLow && low + halbtoene <= RANGE.writtenHigh) return t;
  }
  for (const oct of [4, 3, 5]) {
    const t = { ...tonic, octave: oct };
    if (toMidi(t) >= RANGE.writtenLow) return t;
  }
  return { ...tonic, octave: 4 };
}

/** Alle Töne der Art, die im Umfang liegen, aufsteigend und ohne Doppel. */
function vorrat(art, tonic) {
  const roh = [];
  for (let o = 1; o <= 7; o++) {
    const t = { ...tonic, octave: o };
    roh.push(...(art.chord ? buildChord(t, art.chord) : buildScale(t, art.scale, 1)));
  }
  const gesehen = new Set();
  return roh
    .filter(p => { const m = toMidi(p); return m >= RANGE.writtenLow && m <= RANGE.writtenHigh; })
    .sort((a, b) => toMidi(a) - toMidi(b))
    .filter(p => { const m = toMidi(p); if (gesehen.has(m)) return false; gesehen.add(m); return true; });
}

/**
 * Die zu spielende Tonfolge in Griffhöhen.
 *
 * `umfang` ist 1, 2, 3 (Oktaven) oder "voll". Beim vollen Umfang geht es
 * vom tiefsten Grundton bis zum höchsten Ton der Art, hinunter bis zum
 * tiefsten und wieder hinauf zum Grundton — die Richtung spielt dann keine
 * Rolle, das Muster ist festgelegt.
 */
export function folge(art, key, umfang = 2, richtung = "auf-ab") {
  if (umfang === "voll") {
    const L = vorrat(art, key.tonic);
    const pc = pcOf(key.tonic);
    const t = L.findIndex(p => pcOf(p) === pc && p.step === key.tonic.step);
    if (t < 0) return L;
    const ende = L.length - 1;
    return [
      ...L.slice(t),
      ...L.slice(0, ende).reverse(),
      ...L.slice(1, t + 1),
    ];
  }

  const oktaven = Number(umfang) || 1;
  let auf;
  if (art.chord) {
    const tonic = passendeOktave(key.tonic, 12 * oktaven);
    auf = [];
    for (let o = 0; o < oktaven; o++) auf.push(...buildChord({ ...tonic, octave: tonic.octave + o }, art.chord));
    auf.push({ ...tonic, octave: tonic.octave + oktaven });
  } else {
    auf = buildScale(passendeOktave(key.tonic, 12 * oktaven), art.scale, oktaven);
  }
  if (richtung === "auf") return auf;
  if (richtung === "ab") return [...auf].reverse();
  return [...auf, ...auf.slice(0, -1).reverse()];
}

/* --- Abdeckung und Abfrage ------------------------------------------------------ */

const TAG = 86400000;
const tageZwischen = (a, b) => {
  const d = s => { const [y, m, t] = s.split("-").map(Number); return Date.UTC(y, m - 1, t); };
  return Math.round((d(b) - d(a)) / TAG);
};

const geuebt = d => !!d && (d.count || 0) > 0;

/**
 * Wie viel vom Prüfungsstoff schon einmal gesessen hat, je Art und über
 * alle. Gezählt werden Tonhöhen, nicht Namen: Fis-Dur und Ges-Dur sind für
 * die Abdeckung dieselbe Tonart.
 */
export function abdeckung(drills = {}) {
  const arten = PRUEFUNGS_ARTEN.map(art => {
    const pcs = new Set();
    for (const k of tonartenFuer(art)) if (geuebt(drills[drillId(art.id, k.name)])) pcs.add(pcOf(k.tonic));
    return { art, geuebt: pcs.size, gesamt: 12 };
  });
  const geuebtSumme = arten.reduce((s, a) => s + a.geuebt, 0);
  return { arten, geuebt: geuebtSumme, gesamt: arten.length * 12 };
}

/**
 * Eine Prüfungsaufgabe, wie ein Prüfer sie stellen würde: Art und Tonart
 * gemischt. Nicht gleichverteilt — nie Geübtes wiegt am meisten, danach
 * zählt, wie lange es her ist. `rng` ist austauschbar, damit es sich
 * prüfen lässt.
 */
export function pruefungsAufgabe(drills = {}, heute, rng = Math.random, ausser = null) {
  const kandidaten = [];
  for (const art of PRUEFUNGS_ARTEN) {
    tonartenFuer(art).forEach((k, i) => {
      if (ausser && ausser.art === art.id && ausser.keyIndex === i) return;
      const d = drills[drillId(art.id, k.name)];
      const alter = d?.last && heute ? Math.min(60, Math.max(0, tageZwischen(d.last, heute))) : 60;
      const gewicht = geuebt(d) ? 1 + alter : 90;
      kandidaten.push({ art: art.id, keyIndex: i, gewicht });
    });
  }
  const summe = kandidaten.reduce((s, k) => s + k.gewicht, 0);
  let w = rng() * summe;
  for (const k of kandidaten) { w -= k.gewicht; if (w <= 0) return { art: k.art, keyIndex: k.keyIndex }; }
  const l = kandidaten[kandidaten.length - 1];
  return { art: l.art, keyIndex: l.keyIndex };
}
