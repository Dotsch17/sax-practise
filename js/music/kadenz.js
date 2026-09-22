/* ==========================================================================
   Kadenzen für den Prüfungsteil Klavier

   Genau die Modelle vom Beiblatt der mdw, nicht irgendwelche. Für zkF
   Popularmusik verlangt:

   a) einfache Kadenz I–IV–V–I in Quint-, Oktav- und Terzlage, Dur,
   b) dasselbe in Moll (i–iv–V–i, Dominante mit Leitton),
      beides in allen Tonarten bis zwei Kreuze und zwei Be,
   c) II–V–I in Dur bis zwei Vorzeichen, in einer von drei Varianten.

   Die Modelle stehen hier als Stufen-Positionen: 0 ist der Grundton in der
   Lage der rechten Hand, 2 die Terz darüber, −1 der Leitton darunter. So
   ergibt sich jede Tonart richtig buchstabiert aus ihrer Leiter, statt
   durch Verschieben um Halbtöne — B-Dur hat ein Es in der Subdominante,
   kein Dis.

   Die Lage heißt nach dem Ton, der in der rechten Hand oben liegt: in der
   Quintlage die Quinte, in der Oktavlage der Grundton, in der Terzlage die
   Terz. Gemeinsame Töne bleiben liegen, die anderen gehen den kürzesten
   Weg. Das ist die ganze Stimmführung, und sie steckt in den Zahlen.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { MAJOR_KEYS, MINOR_KEYS, buildScale, toMidi, spell } from "./theory.js";

/* --- Die Modelle vom Beiblatt ------------------------------------------------- */

const BASS_EINFACH = [-7, -4, -3, -7];                 // C3 F3 G3 C3 bezogen auf C4

export const LAGEN = [
  { id: "quint", label: "Quintlage", rh: [[0, 2, 4], [0, 3, 5], [-1, 1, 4], [0, 2, 4]] },
  { id: "oktav", label: "Oktavlage", rh: [[2, 4, 7], [3, 5, 7], [1, 4, 6], [2, 4, 7]] },
  { id: "terz",  label: "Terzlage",  rh: [[4, 7, 9], [5, 7, 10], [4, 6, 8], [4, 7, 9]] },
];

/* II–V–I, bezogen auf den Grundton der Tonika in der Lage der rechten
   Hand. Der Bass liegt zwei Oktaven tiefer als dort, wie auf dem Blatt. */
const BASS_IIVI = [-13, -10, -14];                     // D2 G2 C2
export const VARIANTEN = [
  { id: 1, label: "Variante 1", was: "Nur Terz und Septime — die schlankeste Form, zwei Töne rechts.",
    rh: [[0, 3], [-1, 3], [-1, 2]] },
  { id: 2, label: "Variante 2", was: "Vierstimmig, beginnt mit der Terz unten: F-A-C-E, F-A-H-D, E-G-H-D.",
    rh: [[-4, -2, 0, 2], [-4, -2, -1, 1], [-5, -3, -1, 1]] },
  { id: 3, label: "Variante 3", was: "Vierstimmig, beginnt mit der Septime unten: C-E-F-A, H-D-F-A, H-D-E-G.",
    rh: [[0, 2, 3, 5], [-1, 1, 3, 5], [-1, 1, 2, 4]] },
];

export const ARTEN = [
  { id: "dur",  label: "I–IV–V–I Dur",  stufen: ["I", "IV", "V", "I"] },
  { id: "moll", label: "i–iv–V–i Moll", stufen: ["i", "iv", "V", "i"] },
  { id: "iivi", label: "II–V–I",        stufen: ["ii", "V", "I"] },
];
export const artOf = id => ARTEN.find(a => a.id === id) || ARTEN[0];

/* Prüfungsumfang zkF Popularmusik: bis zwei Vorzeichen. Fis-Dur und Ges-Dur
   kommen nicht vor, also auch keine doppelten Namen. */
export const TONARTEN = {
  dur: MAJOR_KEYS.filter(k => Math.abs(k.sig) <= 2),
  moll: MINOR_KEYS.filter(k => Math.abs(k.sig) <= 2),
  iivi: MAJOR_KEYS.filter(k => Math.abs(k.sig) <= 2),
};

/* --- Umsetzen in eine Tonart ------------------------------------------------------ */

const pc = m => ((m % 12) + 12) % 12;

/* In welche Oktave der Bezugston kommt. Auf dem Blatt ist es C4 in Dur und
   A3 in Moll; andere Tonarten nehmen die Lage, die einer Mitte am nächsten
   liegt, bei Gleichstand die höhere — tiefe enge Lagen klingen am Klavier
   dumpf. Für Dur liegt die Mitte zwischen G3 und D4: sonst rutscht F-Dur
   mit dem Bass bis C4 und der Terzlage bis B5 hinauf. */
function bezug(tonic, ziel) {
  let beste = null;
  for (let octave = 2; octave <= 5; octave++) {
    const t = { ...tonic, octave };
    const d = Math.abs(toMidi(t) - ziel);
    if (!beste || d < beste.d || (d === beste.d && toMidi(t) > toMidi(beste.t))) beste = { t, d };
  }
  return beste.t;
}

function leiterUm(tonic, moll) {
  const tief = { ...tonic, octave: tonic.octave - 3 };
  const leiter = buildScale(tief, moll ? "moll_harmonisch" : "dur", 6);
  return i => leiter[i + 21];
}

/**
 * Eine Kadenz in einer Tonart. `art` ist "dur", "moll" oder "iivi"; `lage`
 * ist eine Lage-id (für dur und moll) oder eine Varianten-Nummer (für iivi).
 *
 * Gibt die Akkorde mit rechter Hand, Bass, Stufe und Symbol zurück, dazu
 * die Dauer jedes Akkords in Halben — wie auf dem Blatt: dreimal eine
 * Halbe und eine punktierte Ganze, beziehungsweise zwei Halbe und eine Ganze.
 */
export function kadenz(artId, key, lage, naming) {
  const art = artOf(artId);
  const moll = art.id === "moll";
  const iivi = art.id === "iivi";
  const t0 = bezug(key.tonic, iivi ? 62 : moll ? 57 : 58.5);
  const stufe = leiterUm(t0, moll);

  const rh = iivi ? (VARIANTEN.find(v => v.id === Number(lage)) || VARIANTEN[0]).rh
                  : (LAGEN.find(l => l.id === lage) || LAGEN[0]).rh;
  const bass = iivi ? BASS_IIVI : BASS_EINFACH;
  const dauern = iivi ? [1, 1, 2] : [1, 1, 1, 3];

  const akkorde = rh.map((stimmen, i) => ({
    stufe: art.stufen[i],
    rh: stimmen.map(stufe),
    bass: stufe(bass[i]),
    dauer: dauern[i],
    symbol: symbol(art, i, stufe, naming),
  }));
  return { art: art.id, key, lage, akkorde, label: lageLabel(art.id, lage) };
}

export const lageLabel = (artId, lage) => artId === "iivi"
  ? (VARIANTEN.find(v => v.id === Number(lage)) || VARIANTEN[0]).label
  : (LAGEN.find(l => l.id === lage) || LAGEN[0]).label;

/** Akkordsymbol, wie im Leadsheet: Dm7, G7, Cmaj7 — oder bei der einfachen
    Kadenz die Dreiklänge. */
function symbol(art, i, stufe, naming) {
  const name = p => { const s = spell(p, naming); return s.charAt(0).toUpperCase() + s.slice(1); };
  if (art.id === "iivi") {
    const grund = [1, 4, 0][i];
    return name(stufe(grund)) + ["m7", "7", "maj7"][i];
  }
  const grund = [0, 3, 4, 0][i];
  const moll = art.id === "moll" && i !== 2;
  return name(stufe(grund)) + (moll ? "m" : "");
}

/** Welche Töne der rechten Hand vom vorigen Akkord liegen bleiben. */
export function bleibende(vorher, jetzt) {
  if (!vorher) return jetzt.rh.map(() => false);
  const alt = new Set(vorher.rh.map(toMidi));
  return jetzt.rh.map(p => alt.has(toMidi(p)));
}

/** Tiefster und höchster Ton einer ganzen Kadenz, für eine feste Tastatur. */
export function umfang(k) {
  const alle = k.akkorde.flatMap(a => [a.bass, ...a.rh]).map(toMidi);
  return { tief: Math.min(...alle), hoch: Math.max(...alle) };
}

/* --- Übersicht und Abfrage ---------------------------------------------------------- */

export const drillId = (artId, lage, keyName) => `kadenz:${artId}:${lage}:${keyName}`;

/* Was die Prüfung verlangt: jede Lage in jeder Tonart für Dur und Moll,
   und die gewählte II–V–I-Variante in jeder Durtonart. */
export function aufgaben(variante = 1) {
  const out = [];
  for (const artId of ["dur", "moll"]) {
    for (const l of LAGEN) for (const k of TONARTEN[artId]) out.push({ art: artId, lage: l.id, key: k });
  }
  for (const k of TONARTEN.iivi) out.push({ art: "iivi", lage: String(variante), key: k });
  return out;
}

const sitzt = d => !!d && (d.count || 0) > 0;

export function abdeckung(drills = {}, variante = 1) {
  const liste = aufgaben(variante);
  const geuebt = liste.filter(a => sitzt(drills[drillId(a.art, a.lage, a.key.name)])).length;
  return { geuebt, gesamt: liste.length };
}

const TAG = 86400000;
const tage = (a, b) => {
  const d = s => { const [y, m, t] = s.split("-").map(Number); return Date.UTC(y, m - 1, t); };
  return Math.round((d(b) - d(a)) / TAG);
};

/** Eine Prüfungsaufgabe: nie Gesessenes zuerst, dann was am längsten her ist. */
export function pruefungsAufgabe(drills = {}, heute, variante = 1, rng = Math.random, ausser = null) {
  const liste = aufgaben(variante).filter(a =>
    !(ausser && a.art === ausser.art && a.lage === ausser.lage && a.key.name === ausser.key.name));
  const gew = liste.map(a => {
    const d = drills[drillId(a.art, a.lage, a.key.name)];
    if (!sitzt(d)) return 40;
    return 1 + (d.last && heute ? Math.min(40, Math.max(0, tage(d.last, heute))) : 40);
  });
  let x = rng() * gew.reduce((s, g) => s + g, 0);
  for (let i = 0; i < liste.length; i++) { x -= gew[i]; if (x <= 0) return liste[i]; }
  return liste[liste.length - 1];
}

/** Für das Vorspielen: alle Töne eines Akkords als MIDI, Bass zuerst. */
export const klang = a => [toMidi(a.bass), ...a.rh.map(toMidi)];
export { pc };
