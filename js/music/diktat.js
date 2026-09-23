/* ==========================================================================
   Hörtest — Aufgaben für den schriftlichen Teil der Zulassungsprüfung

   Die mdw prüft das Hören schriftlich und vom Klavier: tonale und freitonale
   Melodien, Rhythmen, Intervalle, Drei- und Septakkorde mit Umkehrungen,
   veränderte Töne in Mehrklängen — „durch Notendiktate, Fehlererkennen und
   gehörmäßiges Wiedererkennen notierter Beispiele“.

   Das ist eine andere Fähigkeit als Akkorde am Klang benennen. Wer „Moll“
   sagen kann, kann deshalb noch nicht aufschreiben, welcher Ton in welcher
   Oktave im Bass lag. Deshalb wird hier geschrieben, nicht getippt:
   Tonhöhen buchstabiert, Rhythmen schlagweise, Akkorde mit Lage.

   Alles klingend, im Violinschlüssel, so wie am Klavier geprüft.

   Reine Datenerzeugung und Auswertung, kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import {
  MAJOR_KEYS, MINOR_KEYS, buildChord, buildScale, toMidi, fromMidi, spellOnStep,
  keySignatureSteps, CHORDS,
} from "./theory.js";
import { generatePhrase } from "./melodie.js";
import { generateRhythm, BAUSTEINE, mulberry32 } from "./rhythmus.js";
import { artOf, tonartenFuer } from "./skalenarten.js";

export { mulberry32 };

const waehle = (liste, rng) => liste[Math.floor(rng() * liste.length)];
const pc = m => ((m % 12) + 12) % 12;

/* Klingender Rahmen für alles, was notiert wird: G3 bis A5. Tiefer braucht
   Hilfslinien unter dem System, höher wird es am Klavier schrill und im
   Violinschlüssel unübersichtlich. */
export const TIEF = 55;
export const HOCH = 81;

/* --- Tonhöhen eingeben ------------------------------------------------------ */

/** Welche Alteration die Vorzeichnung einer Stufe gibt. */
export function vorzeichnungFuer(step, keySig) {
  if (!keySig) return 0;
  return keySignatureSteps(keySig).includes(step) ? Math.sign(keySig) : 0;
}

/**
 * Die Oktave, in der ein eingegebener Ton dem vorigen am nächsten liegt.
 * So schreibt man ein Diktat auch: man denkt in Schritten und Sprüngen, nicht
 * in Oktavnummern. Bei Gleichstand gewinnt die Richtung nach innen, zur Mitte
 * des Systems hin.
 */
export function naechsteLage(step, alter, vorher) {
  const bezug = vorher ? toMidi(vorher) : 67;
  let beste = null;
  for (let octave = 2; octave <= 6; octave++) {
    const p = { step, alter, octave };
    const d = Math.abs(toMidi(p) - bezug);
    const zurMitte = Math.abs(toMidi(p) - 70);
    if (!beste || d < beste.d || (d === beste.d && zurMitte < beste.zurMitte)) beste = { p, d, zurMitte };
  }
  return beste.p;
}

/**
 * Vergleicht eingetragene mit gespielten Tonhöhen, Ton für Ton.
 * "richtig", "enharmonisch" (klingt gleich, falsch geschrieben), "oktave"
 * (richtiger Ton, falsche Oktave), "falsch" oder "fehlt".
 *
 * Im tonalen Diktat zählt die Schreibweise: Gis in a-Moll ist kein As. Im
 * freitonalen gibt es keine Tonart, die eine Schreibweise vorgibt — dort
 * gilt enharmonisch als richtig.
 */
export function vergleicheTonhoehen(soll, ist, { enharmonischOk = false } = {}) {
  const einzeln = soll.map((s, i) => {
    const x = ist[i];
    if (!x) return "fehlt";
    if (x.step === s.step && x.alter === s.alter && x.octave === s.octave) return "richtig";
    if (toMidi(x) === toMidi(s)) return enharmonischOk ? "richtig" : "enharmonisch";
    if (pc(toMidi(x)) === pc(toMidi(s)) && (enharmonischOk || (x.step === s.step && x.alter === s.alter))) return "oktave";
    return "falsch";
  });
  const richtig = einzeln.filter(e => e === "richtig").length;
  return { einzeln, richtig, gesamt: soll.length, alles: richtig === soll.length };
}

/* --- Melodiediktat ----------------------------------------------------------- */

export const MELODIE_STUFEN = [
  { id: 1, label: "Stufe 1", takte: 2, rhythmus: 1, mindestens: 5, freiIntervalle: [1, 2, 3, 4],
    was: "Zwei Takte, Viertel und Halbe, überwiegend Schritte" },
  { id: 2, label: "Stufe 2", takte: 2, rhythmus: 2, mindestens: 7, freiIntervalle: [1, 2, 3, 4, 5, 7, 8, 9],
    was: "Zwei Takte mit Achteln, Terzen und Dreiklangssprüngen" },
  { id: 3, label: "Stufe 3", takte: 4, rhythmus: 2, mindestens: 12, freiIntervalle: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    was: "Vier Takte, größere Sprünge, freitonal mit Tritonus und Septimen" },
];

const tonaleTonarten = maxSig => ({
  dur: MAJOR_KEYS.filter(k => Math.abs(k.sig) <= maxSig),
  moll: MINOR_KEYS.filter(k => Math.abs(k.sig) <= maxSig),
});

/** Passt eine Tonhöhenfolge in den klingenden Rahmen, ganze Oktaven verschoben. */
function inRahmen(pitches) {
  const midis = pitches.filter(Boolean).map(toMidi);
  let shift = 0;
  while (Math.max(...midis) + shift > HOCH) shift -= 12;
  while (Math.min(...midis) + shift < TIEF) shift += 12;
  return pitches.map(p => p && { ...p, octave: p.octave + shift / 12 });
}

/**
 * Ein Melodiediktat. Gibt die Noten mit Rhythmus (Format von notation.js),
 * die reinen Tonhöhen, die Tonart und, bei tonalen Diktaten, die Kadenz.
 *
 * `art` ist "tonal" oder "frei". Tonal heißt Dur oder harmonisch Moll bis
 * zwei Vorzeichen, ab Stufe 3 bis drei; frei heißt zufällige Intervalle ohne
 * Tonart, aber nie zweimal derselbe Ton hintereinander.
 */
export function melodieDiktat({ art = "tonal", stufe = 1, rng = Math.random } = {}) {
  const st = MELODIE_STUFEN.find(s => s.id === stufe) || MELODIE_STUFEN[0];
  // Zwei Takte aus Halben und Ganzen sind drei Töne — das ist kein Diktat.
  // Rhythmen mit zu wenig Tönen werden verworfen.
  let rhythmus, anzahl = 0;
  for (let versuch = 0; versuch < 300 && anzahl < st.mindestens; versuch++) {
    rhythmus = generateRhythm({ beats: 4, stufe: st.rhythmus, takte: st.takte,
      seed: Math.floor(rng() * 1e9) }).noten;
    anzahl = rhythmus.filter(n => !n.barline && n.pitch).length;
  }

  let pitches, keySig = 0, tonart = null, moll = false;
  if (art === "tonal") {
    const t = tonaleTonarten(stufe >= 3 ? 3 : 2);
    moll = rng() < 0.4;
    const key = waehle(moll ? t.moll : t.dur, rng);
    keySig = key.sig;
    tonart = key;
    // Derselbe Gestaltgeber wie beim Nachspielen: Schritte, Sprünge in den
    // Dreiklang, nach einem Sprung zurück. So klingen Diktate, und so muss
    // man sie hören lernen — als Gestalt, nicht als Kette einzelner Töne.
    pitches = generatePhrase({ tonic: key.tonic, laenge: anzahl, sprung: 0.1 + 0.12 * stufe,
      umfang: 7 + stufe, skala: moll ? "moll_harmonisch" : "dur", seed: Math.floor(rng() * 1e9) });
    // Enden auf dem Grundton, in der Lage, die dem vorletzten Ton am
    // nächsten ist. Ein Diktat, das in der Luft hängt, lässt sich nicht
    // gegenprüfen — und das Gegenprüfen am Grundton ist die halbe Technik.
    const vor = pitches[pitches.length - 2] || pitches[0];
    pitches[pitches.length - 1] = naechsteLage(key.tonic.step, key.tonic.alter, vor);
    pitches = inRahmen(pitches);
  } else {
    let m = 60 + Math.floor(rng() * 8);
    const out = [m];
    for (let i = 1; i < anzahl; i++) {
      let schritt, ziel, schutz = 0;
      do {
        schritt = waehle(st.freiIntervalle, rng) * (rng() < 0.5 ? -1 : 1);
        ziel = m + schritt;
      } while ((ziel < TIEF + 2 || ziel > HOCH - 2) && schutz++ < 20);
      if (ziel < TIEF + 2 || ziel > HOCH - 2) ziel = m - schritt;
      m = ziel;
      out.push(m);
    }
    // Ohne Tonart gibt es keine richtige Schreibweise; aufwärts mit Kreuz,
    // abwärts mit Be ist die übliche Konvention bei freitonalen Diktaten.
    pitches = out.map((x, i) => fromMidi(x, i > 0 && x < out[i - 1] ? "flat" : "sharp"));
  }

  let k = 0;
  const noten = rhythmus.map(n => (n.barline || !n.pitch) ? { ...n } : { ...n, pitch: pitches[k++] });
  return { art, stufe: st.id, noten, pitches, keySig, tonart, moll,
           kadenz: tonart ? kadenz(tonart, moll) : null };
}

/**
 * I–IV–V–I in enger Lage, klingend um C4. Stellt die Tonart her, bevor die
 * Melodie kommt — so wird im Prüfungsraum auch begonnen.
 */
export function kadenz(key, moll = false) {
  const grund = { ...key.tonic, octave: 3 };
  const stufeAuf = n => {
    const leiter = buildScale(grund, moll ? "moll_harmonisch" : "dur", 1);
    return leiter[n];
  };
  const drei = (p, art) => buildChord(p, art).map(toMidi);
  const [i, iv, v] = [stufeAuf(0), stufeAuf(3), stufeAuf(4)];
  const t = moll ? "moll" : "dur";
  const akk = [drei(i, t), drei(iv, t), drei(v, "dur"), drei(i, t)];
  // In die Nähe von C4 legen, damit es nach Klavier klingt und nicht nach Orgel.
  return akk.map(a => {
    let x = [...a];
    while (Math.min(...x) < 52) x = x.map(m => m + 12);
    while (Math.min(...x) > 63) x = x.map(m => m - 12);
    return [x[0] - 12, ...x];      // Grundton im Bass verdoppelt
  });
}

/* --- Melodie ergänzen: das vollständige Melodiediktat ------------------------------

   So steht es im Mustertest der mdw (Gehörtest, Aufgabe 3): „Sie hören eine
   durmolltonale Melodie, deren erste vier Takte bereits vorgegeben sind.
   Komplettieren Sie die zweiten vier Takte. Die Melodie wird dreimal
   vorgespielt.“ Tonhöhen und Rhythmus zugleich, vier Punkte, einer je Takt.

   Die Melodie ist eine Periode, wie im Beispiel der mdw: Vordersatz mit
   Halbschluss (Takt 4 endet auf der zweiten oder fünften Stufe),
   Nachsatz, der wie der Vordersatz beginnt und auf dem Grundton schließt.
   Das ist keine Bequemlichkeit des Generators, sondern die wichtigste
   Hörstrategie für diese Aufgabe: Takt 5 und 6 kennt man meist schon —
   man muss nur hören, ob und wo sie abweichen. */

export const ERGAENZEN_STUFEN = [
  { id: 1, label: "Stufe 1", rhythmus: 1, schlaege: [4], maxSig: 1, moll: 0, bpm: 72,
    was: "Vierviertel, Viertel und Halbe, Dur bis ein Vorzeichen" },
  { id: 2, label: "Stufe 2", rhythmus: 2, schlaege: [2, 3, 4], maxSig: 2, moll: 0.35, bpm: 80,
    was: "Zwei-, Drei- und Vierviertel mit Achteln und Punktierungen, Dur und harmonisch Moll" },
  { id: 3, label: "Stufe 3", rhythmus: 3, schlaege: [2, 3, 4], maxSig: 3, moll: 0.4, bpm: 88,
    was: "Dazu Sechzehntel, bis drei Vorzeichen — etwa so schwer wie der Mustertest der mdw" },
];

/** Die Notenwerte, die man eintragen kann, je Stufe. `laenge` in Vierteln. */
export function notenwerte(stufe, schlaege) {
  const alle = [
    { dur: 4, dots: 0, stufe: 1 }, { dur: 2, dots: 1, stufe: 1 }, { dur: 2, dots: 0, stufe: 1 },
    { dur: 1, dots: 1, stufe: 2 }, { dur: 1, dots: 0, stufe: 1 }, { dur: 0.5, dots: 1, stufe: 3 },
    { dur: 0.5, dots: 0, stufe: 2 }, { dur: 0.25, dots: 0, stufe: 3 },
  ];
  return alle
    .filter(w => w.stufe <= stufe)
    .map(w => ({ dur: w.dur, dots: w.dots, laenge: w.dur * (w.dots ? 1.5 : 1) }))
    .filter(w => w.laenge <= schlaege);
}

const laenge = n => n.dur * (n.dots ? 1.5 : 1);

/* Ein Takt ohne Taktstriche, der genau aufgeht. Pausen werden zu Tönen:
   eine Melodie in dieser Aufgabe singt durch, und eine Viertelpause
   mitten im Takt ist beim Hören nicht von einer kurzen Note zu
   unterscheiden — das wäre ein Rätsel, kein Diktat. */
function taktRhythmus(schlaege, stufe, rng) {
  return generateRhythm({ beats: schlaege, stufe, takte: 1, seed: Math.floor(rng() * 1e9) })
    .noten.filter(n => !n.barline).map(n => ({ dur: n.dur, dots: n.dots || 0, pause: false }));
}

/* Ein Takt, der mit einem langen Ton schließt: Halbschluss oder Schluss.
   `ganz` heißt: der Schlusston füllt den ganzen Takt. */
function schlussTakt(schlaege, stufe, rng, ganz) {
  if (ganz) {
    const w = schlaege === 4 ? { dur: 4, dots: 0 } : schlaege === 3 ? { dur: 2, dots: 1 } : { dur: 2, dots: 0 };
    return [{ ...w, pause: false }];
  }
  const lang = schlaege === 2 ? 1 : 2;
  const vorn = schlaege - lang > 0 ? taktRhythmus(schlaege - lang, stufe, rng) : [];
  // Keine Pause direkt vor dem Schlusston: das klänge nach Abbruch.
  if (vorn.length && vorn[vorn.length - 1].pause) vorn[vorn.length - 1].pause = false;
  return [...vorn, { dur: lang, dots: 0, pause: false }];
}

/* Stufen-Index relativ zum Grundton: 0 Grundton, 4 Quinte, 7 Oktave,
   -3 Quinte darunter. Der Rahmen `r` ({ lo, hi }) hält die Melodie
   sangbar und im Violinschlüssel; er hängt von der Tonart ab, denn in
   H-Dur liegt die Oktave über dem Grundton schon über dem System. */
const mod7 = i => ((i % 7) + 7) % 7;
/* Im harmonischen Moll liegt zwischen sechster und siebter Stufe eine
   übermäßige Sekunde. In einem Diktat für diese Stufe hat sie nichts zu
   suchen; wer sie hören soll, bekommt sie in Aufgabe 6 des Mustertests. */
const verboten = (a, b, moll) => moll && Math.abs(a - b) === 1 && [5, 6].includes(mod7(a)) && [5, 6].includes(mod7(b));

function schrittVon(idx, letzter, moll, rng, r) {
  for (let versuch = 0; versuch < 30; versuch++) {
    let ziel;
    if (Math.abs(letzter) >= 3) {
      // Nach einem Sprung schrittweise zurück: so klingt eine Melodie.
      ziel = idx - Math.sign(letzter);
    } else if (rng() < 0.68) {
      const weiter = letzter !== 0 && rng() < 0.6 ? Math.sign(letzter) : (rng() < 0.5 ? -1 : 1);
      ziel = idx + weiter;
    } else {
      // Sprung in einen Ton des Tonika-Dreiklangs, höchstens eine Quinte.
      const kandidaten = [];
      for (let z = idx - 4; z <= idx + 4; z++) {
        if (Math.abs(z - idx) >= 2 && [0, 2, 4].includes(mod7(z))) kandidaten.push(z);
      }
      ziel = kandidaten[Math.floor(rng() * kandidaten.length)];
    }
    if (ziel == null || ziel < r.lo || ziel > r.hi || verboten(idx, ziel, moll)) continue;
    return ziel;
  }
  const runter = idx - 1 >= r.lo && !verboten(idx, idx - 1, moll);
  return runter ? idx - 1 : idx + 1;
}

function wanderung(start, anzahl, moll, rng, r) {
  const out = [];
  let idx = start, letzter = 0;
  for (let i = 0; i < anzahl; i++) {
    const neu = schrittVon(idx, letzter, moll, rng, r);
    letzter = neu - idx;
    idx = neu;
    out.push(idx);
  }
  return out;
}

const naechsterAus = (von, kandidaten, moll, r) => kandidaten
  .filter(k => !verboten(von, k, moll) && k >= r.lo && k <= r.hi)
  .sort((a, b) => Math.abs(a - von) - Math.abs(b - von))[0];

/* Der Tonraum als Stufen-Index: alles, was mit etwas Luft in G3 bis A5
   liegt, höchstens eine Quinte unter und eine None über dem Grundton. */
function rahmenFuer(tonAus) {
  const r = { lo: -5, hi: 9 };
  while (toMidi(tonAus(r.lo)) < TIEF + 2) r.lo++;
  while (toMidi(tonAus(r.hi)) > HOCH - 2) r.hi--;
  r.lo = Math.max(r.lo, r.hi - 12);
  return r;
}

/**
 * Eine sangbare Linie in einer Tonart, die auf dem Grundton endet: dieselbe
 * Gestalt wie im Melodiediktat, für die anderen Aufgaben des Mustertests.
 * `skala` ist "dur", "moll_harmonisch" oder "moll_natur". Gibt die Töne
 * und ihre Stufen-Indizes (0 Grundton, 4 Quinte, 7 Oktave) zurück.
 */
export function tonaleLinie({ key, skala = "dur", anzahl, rng = Math.random }) {
  const harm = skala === "moll_harmonisch";
  const leiter = buildScale({ ...key.tonic, octave: 3 }, skala, 3);
  const tonAus = i => leiter[i + 7];
  const r = rahmenFuer(tonAus);
  const start = waehle([0, 2, 4].filter(x => x >= r.lo && x <= r.hi), rng);
  const mitte = wanderung(start, Math.max(0, anzahl - 3), harm, rng, r);
  const letzter = mitte.length ? mitte[mitte.length - 1] : start;
  const vorletzter = naechsterAus(letzter, r.hi >= 7 ? [1, -1, 8, 6] : [1, -1], harm, r) ?? 1;
  const ende = vorletzter === 1 || vorletzter === -1 ? 0 : 7;
  let indizes = [start, ...mitte, vorletzter, ende];
  if (anzahl < indizes.length) indizes = [...indizes.slice(0, anzahl - 1), ende];
  return { indizes, toene: indizes.map(tonAus) };
}

/**
 * Eine Aufgabe „Melodie ergänzen“. Gibt die ganze Melodie, die vier
 * vorgegebenen Takte und die vier gesuchten, jeweils im Format von
 * notation.js, dazu Tonart, Takt und Tempo.
 */
export function melodieErgaenzen({ stufe = 2, rng = Math.random } = {}) {
  const st = ERGAENZEN_STUFEN.find(s => s.id === stufe) || ERGAENZEN_STUFEN[1];
  const schlaege = waehle(st.schlaege, rng);
  const moll = rng() < st.moll;
  const t = tonaleTonarten(st.maxSig);
  const key = waehle(moll ? t.moll : t.dur, rng);

  // Rhythmus der Periode. Takt 5 und 6 wiederholen Takt 1 und 2.
  let takte;
  for (let versuch = 0; versuch < 50; versuch++) {
    const t1 = taktRhythmus(schlaege, st.rhythmus, rng);
    const t2 = taktRhythmus(schlaege, st.rhythmus, rng);
    const t3 = taktRhythmus(schlaege, st.rhythmus, rng);
    const t4 = schlussTakt(schlaege, st.rhythmus, rng, false);
    const t7 = taktRhythmus(schlaege, st.rhythmus, rng);
    const t8 = schlussTakt(schlaege, st.rhythmus, rng, st.id === 1 || rng() < 0.5);
    takte = [t1, t2, t3, t4, t1.map(x => ({ ...x })), t2.map(x => ({ ...x })), t7, t8];
    // Eine Periode, die mit einer Pause beginnt, klingt nach Fehlstart;
    // zu wenig Töne in den gesuchten Takten ist kein Diktat.
    const toene = takte.slice(4).flat().filter(x => !x.pause).length;
    if (!t1[0].pause && toene >= 2 * schlaege + (st.id > 1 ? 2 : 0)) break;
  }

  // Tonhöhen als Stufen-Index. Der Rahmen: alles, was mit etwas Luft in
  // G3 bis A5 liegt, höchstens eine Quinte unter und eine None über dem
  // Grundton.
  const leiter = buildScale({ ...key.tonic, octave: 3 }, moll ? "moll_harmonisch" : "dur", 3);
  const tonAus = i => leiter[i + 7];
  const r = rahmenFuer(tonAus);
  const anzahl = takte.map(tk => tk.filter(x => !x.pause).length);
  const vorder = anzahl.slice(0, 4).reduce((a, b) => a + b, 0);
  const start = waehle([0, 2, 4].filter(x => x >= r.lo && x <= r.hi), rng);
  const v = [start, ...wanderung(start, vorder - 2, moll, rng, r)];
  v.push(naechsterAus(v[v.length - 1], [1, 4, -3, 8], moll, r) ?? 4);     // Halbschluss

  const n12 = anzahl[0] + anzahl[1];
  const nach = v.slice(0, n12);
  // Oft weicht Takt 6 im ersten Ton ab, wie im Beispiel der mdw. Genau
  // darauf muss man beim Hören achten.
  if (anzahl[5] > 0 && rng() < 0.5) {
    const i = anzahl[4];
    const alt = nach[i];
    const neu = naechsterAus(alt, [alt + 1, alt - 1], moll, r);
    if (neu != null && !verboten(nach[i - 1] ?? neu, neu, moll)) nach[i] = neu;
  }
  const rest = anzahl[6] + anzahl[7];
  const mitte = wanderung(nach[nach.length - 1], Math.max(0, rest - 2), moll, rng, r);
  const vorletzter = naechsterAus(mitte.length ? mitte[mitte.length - 1] : nach[nach.length - 1], r.hi >= 7 ? [1, -1, 8, 6] : [1, -1], moll, r) ?? 1;
  const letzter = vorletzter === 1 || vorletzter === -1 ? 0 : 7;
  const indizes = [...v, ...nach, ...mitte, vorletzter, letzter].slice(0, vorder + n12 + rest);
  if (rest === 1) indizes[indizes.length - 1] = naechsterAus(nach[nach.length - 1], [0, 7], moll, r) ?? 0;

  const pitches = indizes.map(tonAus);

  const noten = [];
  let k = 0;
  takte.forEach((tk, ti) => {
    if (ti > 0) noten.push({ barline: true });
    for (const x of tk) noten.push({ pitch: x.pause ? null : pitches[k++], dur: x.dur, dots: x.dots });
  });
  noten.push({ barline: "end" });

  const grenze = noten.findIndex((n, i) => n.barline && noten.slice(0, i).filter(m => m.barline).length === 3);
  const vorgabe = [...noten.slice(0, grenze), { barline: "end" }];
  const gesucht = noten.slice(grenze + 1);
  return {
    art: "ergaenzen", stufe: st.id, schlaege, keySig: key.sig, tonart: key, moll, bpm: st.bpm,
    noten, vorgabe, gesucht, kadenz: kadenz(key, moll),
    letzterVorgabeTon: [...vorgabe].reverse().find(n => n.pitch)?.pitch || null,
  };
}

/**
 * Macht aus eingetragenen Ereignissen `{ pitch | null, dur, dots }` Noten
 * mit Taktstrichen. Ein Wert, der über den Taktstrich ragen würde, wird
 * nicht angenommen — `rest` sagt der Oberfläche, was im Takt noch frei ist.
 */
export function eingabeZuNoten(ereignisse, schlaege, takte = 4) {
  const noten = [];
  let pos = 0;
  for (const e of ereignisse) {
    if (pos > 0 && Math.abs(pos % schlaege) < 1e-6) noten.push({ barline: true });
    noten.push({ pitch: e.pitch, dur: e.dur, dots: e.dots || 0 });
    pos += laenge(e);
  }
  const voll = pos >= schlaege * takte - 1e-6;
  if (voll) noten.push({ barline: "end" });
  const imTakt = pos % schlaege;
  const rest = voll ? 0 : (Math.abs(imTakt) < 1e-6 ? schlaege : schlaege - imTakt);
  return { noten, pos, voll, rest, takt: Math.min(takte, Math.floor(pos / schlaege + 1e-6) + 1), schlag: Math.floor(imTakt + 1e-6) + 1 };
}

/* Die Noten eines Takts: Beginn im Takt, Länge, Tonhöhe. */
function taktweise(noten, schlaege) {
  const takte = [];
  let pos = 0;
  for (const n of noten) {
    if (n.barline) continue;
    const t = Math.floor(pos / schlaege + 1e-6);
    (takte[t] ||= []).push({ start: pos - t * schlaege, laenge: laenge(n), pitch: n.pitch });
    pos += laenge(n);
  }
  return takte;
}

const gleicherTon = (a, b) => (!a && !b) || (a && b && a.step === b.step && a.alter === b.alter && a.octave === b.octave);

/**
 * Wertet die gesuchten Takte aus, wie die mdw punktet: einer je Takt.
 * Ein Takt mit richtigem Rhythmus und richtigen Tönen zählt ganz, mit
 * einem von beiden halb. Dazu je eingetragener Note, ob sie stimmt, und je
 * Takt ein Satz, was daran falsch war.
 */
export function vergleicheErgaenzung(soll, ist, schlaege) {
  const a = taktweise(soll, schlaege), b = taktweise(ist, schlaege);
  const takte = a.map((s, i) => {
    const x = b[i] || [];
    const rhythmus = s.length === x.length && s.every((e, j) =>
      Math.abs(e.start - x[j].start) < 1e-6 && Math.abs(e.laenge - x[j].laenge) < 1e-6 && !e.pitch === !x[j].pitch);
    const tS = s.filter(e => e.pitch).map(e => e.pitch), tI = x.filter(e => e.pitch).map(e => e.pitch);
    const toene = tS.length === tI.length && tS.every((p, j) => gleicherTon(p, tI[j]));
    const klang = tS.length === tI.length && tS.every((p, j) => toMidi(p) === toMidi(tI[j]));
    const ohneOktave = tS.length === tI.length && tS.every((p, j) => p.step === tI[j].step && p.alter === tI[j].alter);
    return { rhythmus, toene, klang, ohneOktave, punkte: rhythmus && toene ? 1 : (rhythmus || toene) ? 0.5 : 0 };
  });
  // Je eingetragener Note: gibt es im Soll eine Note mit demselben Beginn,
  // derselben Länge und demselben Ton?
  const zustaende = [];
  b.forEach((x, ti) => x.forEach(e => {
    const s = (a[ti] || []).find(z => Math.abs(z.start - e.start) < 1e-6);
    zustaende.push(s && Math.abs(s.laenge - e.laenge) < 1e-6 && gleicherTon(s.pitch, e.pitch) ? "richtig" : "falsch");
  }));
  const punkte = takte.reduce((s, t) => s + t.punkte, 0);
  return { takte, punkte, max: a.length, alles: punkte === a.length, einzeln: zustaende };
}

/** Ein Satz je falschem Takt, gezählt ab `ersterTakt`. */
export function ergaenzungsHinweise(ergebnis, ersterTakt = 5) {
  return ergebnis.takte.map((t, i) => {
    const nr = ersterTakt + i;
    if (t.rhythmus && t.toene) return null;
    if (t.rhythmus && t.klang) return `Takt ${nr}: klingt richtig, ist aber anders geschrieben.`;
    if (t.rhythmus && t.ohneOktave) return `Takt ${nr}: richtige Töne, falsche Oktave.`;
    if (t.rhythmus) return `Takt ${nr}: Rhythmus stimmt, Töne nicht.`;
    if (t.toene) return `Takt ${nr}: Töne stimmen, Rhythmus nicht.`;
    return `Takt ${nr}: Rhythmus und Töne.`;
  }).filter(Boolean);
}

/* --- Rhythmusdiktat -------------------------------------------------------------- */

const dauerVon = t => t.dur * (t.dots ? 1.5 : 1);

/* Die Bausteine, die man eintippt. Doppelte (die Halbe steht in zwei
   Stufen) fallen weg, und jeder Baustein bekommt eine feste id. */
export function palette(stufe) {
  const gesehen = new Set();
  const out = [];
  BAUSTEINE.forEach((b, i) => {
    if (b.stufe > stufe) return;
    const sig = JSON.stringify(b.teile);
    if (gesehen.has(sig)) return;
    gesehen.add(sig);
    out.push({ id: "b" + i, laenge: b.laenge, teile: b.teile, stufe: b.stufe });
  });
  return out.sort((a, b) => a.laenge - b.laenge || a.stufe - b.stufe);
}

export const bausteinVon = id => {
  const i = Number(String(id).slice(1));
  const b = BAUSTEINE[i];
  return b ? { id, laenge: b.laenge, teile: b.teile, stufe: b.stufe } : null;
};

export function rhythmusDiktat({ stufe = 2, takte = 2, beats = 4, rng = Math.random } = {}) {
  const r = generateRhythm({ beats, stufe, takte, seed: Math.floor(rng() * 1e9) });
  return { stufe, takte, beats, noten: r.noten, einsaetze: r.einsaetze, dauer: r.dauer };
}

/**
 * Macht aus eingegebenen Bausteinen Noten mit Taktstrichen. Ein Baustein,
 * der über den Taktstrich ragen würde, wird nicht angenommen — `passt`
 * sagt der Oberfläche, welche gerade gehen.
 */
export function bausteineZuNoten(ids, beats = 4, takte = 2) {
  const noten = [];
  let pos = 0;
  for (const id of ids) {
    const b = bausteinVon(id);
    if (!b) continue;
    if (pos > 0 && Math.abs(pos % beats) < 1e-6) noten.push({ barline: true });
    for (const t of b.teile) {
      noten.push({ pitch: t.pause ? null : { step: 6, alter: 0, octave: 4 }, dur: t.dur, dots: t.dots || 0 });
    }
    pos += b.laenge;
  }
  const voll = pos >= beats * takte - 1e-6;
  if (voll) noten.push({ barline: "end" });
  const imTakt = beats - (pos % beats);
  return { noten, pos, voll, rest: voll ? 0 : (Math.abs(imTakt - beats) < 1e-6 ? beats : imTakt) };
}

export const passt = (baustein, rest) => baustein.laenge <= rest + 1e-6;

/** Die Ereignisse eines Rhythmus: Beginn, Länge, Pause — ohne Taktstriche. */
export function ereignisse(noten) {
  const out = [];
  let pos = 0;
  for (const n of noten) {
    if (n.barline) continue;
    const l = dauerVon(n);
    out.push({ start: pos, laenge: l, pause: !n.pitch });
    pos += l;
  }
  return out;
}

/**
 * Vergleicht zwei Rhythmen Schlag für Schlag. Ein Schlag ist richtig, wenn
 * genau dieselben Ereignisse darin beginnen, mit derselben Länge. So sieht
 * man, an welcher Stelle es schiefging, statt nur „falsch“.
 */
export function vergleicheRhythmus(soll, ist, schlaege) {
  const a = ereignisse(soll), b = ereignisse(ist);
  const imSchlag = (liste, s) => liste
    .filter(e => e.start >= s - 1e-6 && e.start < s + 1 - 1e-6)
    .map(e => `${e.start.toFixed(3)}:${e.laenge.toFixed(3)}:${e.pause ? "p" : "n"}`).join("|");
  const einzeln = [];
  for (let s = 0; s < schlaege; s++) {
    // Ein Schlag, in dem nichts beginnt, weil eine lange Note hineinragt,
    // ist richtig, wenn es beim Nutzer genauso ist.
    einzeln.push(imSchlag(a, s) === imSchlag(b, s));
  }
  const richtig = einzeln.filter(Boolean).length;
  return { einzeln, richtig, gesamt: schlaege, alles: richtig === schlaege };
}

/* --- Akkorde mit Umkehrungen ------------------------------------------------------ */

export const AKKORD_ARTEN = [
  { id: "dur", label: "Dur", skala: "dreiklang_dur", toene: 3 },
  { id: "moll", label: "Moll", skala: "dreiklang_moll", toene: 3 },
  { id: "vermindert", label: "vermindert", skala: "dreiklang_vermindert", toene: 3 },
  { id: "uebermaessig", label: "übermäßig", skala: "dreiklang_uebermaessig", toene: 3 },
  { id: "dom7", label: "Dominantsept", skala: "dom7", toene: 4 },
  { id: "dur7", label: "Major 7", skala: "maj7", toene: 4 },
  { id: "moll7", label: "Moll 7", skala: "moll7", toene: 4 },
  { id: "halbvermindert", label: "halbvermindert", skala: "halbvermindert", toene: 4 },
  { id: "vermindert7", label: "vermindert 7", skala: "halbvermindert", toene: 4 },
];

/* Die deutschen Namen der Lagen. So heißen sie in der Prüfung, und sie
   sagen, welches Intervall über dem Bass liegt — das ist beim Hören die
   eigentliche Hilfe. */
export const UMKEHRUNGEN = {
  3: ["Grundstellung", "Sextakkord", "Quartsextakkord"],
  4: ["Grundstellung", "Quintsextakkord", "Terzquartakkord", "Sekundakkord"],
};

export const AKKORD_STUFEN = [
  { id: "drei", label: "Dreiklänge", arten: ["dur", "moll", "vermindert", "uebermaessig"] },
  { id: "vier", label: "Septakkorde", arten: ["dom7", "dur7", "moll7", "halbvermindert", "vermindert7"] },
  { id: "alle", label: "Alle", arten: AKKORD_ARTEN.map(a => a.id) },
  // Aufgabe 7 des Mustertests: nur der Typ, mit den Kürzeln D, m, v, ü, D7, m7.
  { id: "mustertest", label: "Mustertest", arten: ["dur", "moll", "vermindert", "uebermaessig", "dom7", "moll7"], nurArt: true },
];

export const akkordArtOf = id => AKKORD_ARTEN.find(a => a.id === id);

/**
 * Baut einen Akkord in enger Lage und gegebener Umkehrung, klingend.
 * Grundtöne kommen aus der Schreibweise mit den wenigsten Vorzeichen,
 * wie im Tonleiter-Werkzeug.
 */
export function baueAkkord(artId, umkehrung = 0, rng = Math.random) {
  const art = akkordArtOf(artId);
  const roots = tonartenFuer(artOf(art.skala));
  const root = waehle(roots, rng).tonic;
  let toene = buildChord({ ...root, octave: 4 }, artId);
  for (let i = 0; i < umkehrung; i++) {
    const [unten, ...rest] = toene;
    toene = [...rest, { ...unten, octave: unten.octave + 1 }];
  }
  // Bass zwischen F3 und E4, damit der Akkord im System steht.
  while (toMidi(toene[0]) > 64) toene = toene.map(p => ({ ...p, octave: p.octave - 1 }));
  while (toMidi(toene[0]) < 53) toene = toene.map(p => ({ ...p, octave: p.octave + 1 }));
  return { art: artId, umkehrung, toene, midis: toene.map(toMidi), root };
}

/* --- Fehler erkennen --------------------------------------------------------------- */

/**
 * Eine notierte Melodie und eine gespielte, in der höchstens ein Ton anders
 * ist. Der erste Ton bleibt immer gleich — er ist der Bezug. In einem von
 * fünf Fällen ist nichts verändert; wer immer einen Fehler findet, rät.
 */
export function fehlerMelodie({ laenge = 6, rng = Math.random } = {}) {
  const t = tonaleTonarten(2);
  const key = waehle(t.dur, rng);
  const notiert = inRahmen(generatePhrase({ tonic: key.tonic, laenge, sprung: 0.3, umfang: 8,
    seed: Math.floor(rng() * 1e9) }));
  const gespielt = notiert.map(toMidi);
  let antwort = -1;
  if (rng() >= 0.2) {
    antwort = 1 + Math.floor(rng() * (laenge - 1));
    const d = waehle([-2, -1, 1, 2], rng);
    gespielt[antwort] += d;
  }
  return { keySig: key.sig, notiert, gespielt, antwort };
}

/** Ein notierter Akkord, gespielt mit höchstens einem Ton einen Halbton daneben. */
export function fehlerAkkord({ rng = Math.random } = {}) {
  const art = waehle(["dur", "moll", "dom7", "dur7", "moll7", "halbvermindert"], rng);
  const a = baueAkkord(art, Math.floor(rng() * akkordArtOf(art).toene), rng);
  const gespielt = [...a.midis];
  let antwort = -1;
  if (rng() >= 0.2) {
    for (let schutz = 0; schutz < 10; schutz++) {
      const i = Math.floor(rng() * gespielt.length);
      const neu = a.midis[i] + (rng() < 0.5 ? -1 : 1);
      if (!a.midis.includes(neu)) { gespielt[i] = neu; antwort = i; break; }
    }
  }
  return { art, umkehrung: a.umkehrung, notiert: a.toene, gespielt, antwort };
}

/* --- Wiedererkennen ------------------------------------------------------------------ */

/**
 * Drei notierte Melodien, die sich nur in ein oder zwei Tönen
 * unterscheiden. Eine davon wird gespielt. Ähnlich müssen sie sein, sonst
 * reicht ein Blick auf die Kontur, und geübt wird nichts.
 */
export function wiedererkennen({ laenge = 5, anzahl = 3, rng = Math.random } = {}) {
  const t = tonaleTonarten(2);
  const key = waehle(t.dur, rng);
  const leiter = buildScale({ ...key.tonic, octave: 3 }, "dur", 3);
  const basis = inRahmen(generatePhrase({ tonic: key.tonic, laenge, sprung: 0.3, umfang: 8,
    seed: Math.floor(rng() * 1e9) }));
  const schluessel = ps => ps.map(toMidi).join(",");
  const varianten = [basis];
  const gesehen = new Set([schluessel(basis)]);
  let schutz = 0;
  while (varianten.length < anzahl && schutz++ < 200) {
    const v = basis.map(p => ({ ...p }));
    const wieviele = 1 + (rng() < 0.4 ? 1 : 0);
    for (let k = 0; k < wieviele; k++) {
      const i = 1 + Math.floor(rng() * (laenge - 1));
      // Um eine Leiterstufe verschieben, damit die Variante tonal bleibt.
      const j = leiter.findIndex(p => toMidi(p) === toMidi(v[i]));
      const z = leiter[j + (rng() < 0.5 ? -1 : 1)];
      if (j >= 0 && z && toMidi(z) >= TIEF && toMidi(z) <= HOCH) v[i] = z;
    }
    if (!gesehen.has(schluessel(v))) { gesehen.add(schluessel(v)); varianten.push(v); }
  }
  // Mischen, damit die Grundform nicht immer vorn steht.
  for (let i = varianten.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [varianten[i], varianten[j]] = [varianten[j], varianten[i]];
  }
  const antwort = Math.floor(rng() * varianten.length);
  return { keySig: key.sig, varianten, antwort, gespielt: varianten[antwort].map(toMidi) };
}

/* --- Spielen ---------------------------------------------------------------------------- */

/**
 * Zeitpunkte für eine Melodie mit Rhythmus. Pausen erzeugen keinen Ton,
 * rücken aber die Zeit weiter. `zeit` und `dauer` in Sekunden ab `start`.
 */
export function zeitplan(noten, bpm = 72, start = 0) {
  const viertel = 60 / bpm;
  const out = [];
  let t = start;
  for (const n of noten) {
    if (n.barline) continue;
    const l = dauerVon(n) * viertel;
    if (n.pitch) out.push({ midi: toMidi(n.pitch), zeit: t, dauer: l * 0.92 });
    t += l;
  }
  return { noten: out, ende: t };
}

/** Für Tests und Anzeige: der Name einer Akkordart. */
export const akkordName = id => akkordArtOf(id)?.label || CHORDS[id]?.name || id;
export { spellOnStep };
