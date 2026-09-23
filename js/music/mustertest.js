/* ==========================================================================
   Die übrigen Aufgaben des Mustertests Gehörbildung der mdw

   Aufgabe 3 (Melodie ergänzen) steht in diktat.js. Hier stehen die
   anderen, jede so, wie sie im Mustertest aussieht:

   1. Intervall zur Zweistimmigkeit ergänzen: ein Ton steht da, ▲ oder ▼
      sagt, ob der zweite darüber oder darunter liegt. Dreimal simultan.
   2. Rhythmus ergänzen und Taktstriche setzen: die Tonhöhen stehen als
      Notenköpfe da, Takt und Tonart auch.
   4. Zwei vierstimmige Akkorde, der zweite um einen Ton oder ein
      Vorzeichen verändert: den zweiten notieren.
   5. Dreistimmiger Akkord, der Basston steht da: die zwei Töne darüber.
   6. Dur-moll-tonale Melodie: die Versetzungszeichen ergänzen.

   Alles klingend, wie am Klavier. Buchstabiert wird über Stufen, nie über
   Halbtöne: eine kleine Terz über H ist D, eine übermäßige Sekunde ist
   Cisis — beide klingen gleich, aber nur eines ist die Antwort. Wer sich
   beim Hören für die falsche Schreibweise entscheidet, bekommt gesagt,
   welches Intervall er geschrieben hat.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import {
  toMidi, spellOnStep, intervalFrom, INTERVALS, buildChord, buildScale, CHORDS,
  MAJOR_KEYS, MINOR_KEYS, spell,
} from "./theory.js";
import { generateRhythm } from "./rhythmus.js";
import { artOf, tonartenFuer } from "./skalenarten.js";
import { tonaleLinie, UMKEHRUNGEN, AKKORD_ARTEN, akkordArtOf } from "./diktat.js";
import { diatonic } from "./notation.js";

const waehle = (liste, rng) => liste[Math.floor(rng() * liste.length)];
const pc = m => ((m % 12) + 12) % 12;
const gleich = (a, b) => a && b && a.step === b.step && a.alter === b.alter && a.octave === b.octave;
const laenge = n => n.dur * (n.dots ? 1.5 : 1);
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

/* --- Intervalle benennen --------------------------------------------------------- */

const STUFEN_NAME = ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"];
const BASIS = [0, 2, 4, 5, 7, 9, 11, 12];

/**
 * Der Name des Intervalls zwischen zwei buchstabierten Tönen, aus Stufen
 * und Halbtönen: „kleine Terz“, „übermäßige Sekunde“, „reine Quinte“.
 * Nur bis zur Oktave.
 */
export function intervallName(a, b) {
  const [u, o] = toMidi(a) <= toMidi(b) ? [a, b] : [b, a];
  const d = diatonic(o) - diatonic(u);
  const s = toMidi(o) - toMidi(u);
  if (d < 0 || d > 7) return null;
  const diff = s - BASIS[d];
  const rein = [0, 3, 4, 7].includes(d);
  const art = rein
    ? { "-2": "doppelt vermindert", "-1": "vermindert", 0: "rein", 1: "übermäßig", 2: "doppelt übermäßig" }[diff]
    : { "-3": "doppelt vermindert", "-2": "vermindert", "-1": "klein", 0: "groß", 1: "übermäßig", 2: "doppelt übermäßig" }[diff];
  if (!art) return null;
  const endung = { rein: "reine", klein: "kleine", groß: "große", vermindert: "verminderte", übermäßig: "übermäßige",
    "doppelt vermindert": "doppelt verminderte", "doppelt übermäßig": "doppelt übermäßige" }[art];
  return `${endung} ${STUFEN_NAME[d]}`;
}

/* --- 1. Intervall ergänzen ------------------------------------------------------------ */

export const INTERVALL_AUSWAHL = INTERVALS.filter(i => i.semitones >= 1 && i.semitones <= 12);

/* Tonraum je Schlüssel: der gegebene Ton liegt im System oder knapp daneben,
   der gesuchte darf eine Hilfslinie mehr brauchen. */
const RAUM = {
  g: { gegeben: [57, 81], ziel: [53, 86] },
  f: { gegeben: [38, 62], ziel: [34, 66] },
};

export function intervallAufgabe({ rng = Math.random } = {}) {
  for (let versuch = 0; versuch < 200; versuch++) {
    const iv = waehle(INTERVALL_AUSWAHL, rng);
    const richtung = rng() < 0.5 ? 1 : -1;
    const clef = rng() < 0.5 ? "g" : "f";
    const step = Math.floor(rng() * 7);
    const alter = rng() < 0.7 ? 0 : (rng() < 0.5 ? 1 : -1);
    const [lo, hi] = RAUM[clef].gegeben;
    const moeglich = [2, 3, 4, 5].map(octave => ({ step, alter, octave })).filter(p => toMidi(p) >= lo && toMidi(p) <= hi);
    if (!moeglich.length) continue;
    const gegeben = waehle(moeglich, rng);
    const ziel = intervalFrom(gegeben, iv.semitones, richtung);
    const [zlo, zhi] = RAUM[clef].ziel;
    if (Math.abs(ziel.alter) > 1 || toMidi(ziel) < zlo || toMidi(ziel) > zhi) continue;
    return { clef, gegeben, richtung, intervall: iv, ziel, name: intervallName(gegeben, ziel) };
  }
  // Rückfall, der immer geht: große Terz über C4.
  const gegeben = { step: 0, alter: 0, octave: 4 };
  return { clef: "g", gegeben, richtung: 1, intervall: INTERVALS[4], ziel: intervalFrom(gegeben, 4, 1), name: "große Terz" };
}

/**
 * Wo ein eingetippter Buchstabe landet: auf der nächsten Stufe in der
 * angegebenen Richtung, nie auf derselben (die Prime kommt nicht vor).
 */
export function lageInRichtung(step, alter, bezug, richtung) {
  const d0 = diatonic(bezug);
  for (let k = 1; k <= 8; k++) {
    const d = d0 + richtung * k;
    if (((d % 7) + 7) % 7 === step) return { step, alter, octave: Math.floor(d / 7) };
  }
  return { step, alter, octave: bezug.octave };
}

/**
 * Prüft ein eingetragenes Intervall. Der Tritonus zählt als übermäßige
 * Quarte oder verminderte Quinte, beides ist richtig — alles andere hat
 * genau eine Schreibweise.
 */
export function pruefeIntervall(a, ton) {
  if (!ton) return { richtig: false, klingt: false, text: "Kein Ton eingetragen." };
  const geschrieben = intervallName(a.gegeben, ton);
  const klingt = toMidi(ton) === toMidi(a.ziel);
  const tritonus = a.intervall.semitones === 6 && klingt && ["übermäßige Quarte", "verminderte Quinte"].includes(geschrieben);
  const richtig = gleich(ton, a.ziel) || tritonus;
  let text;
  if (richtig) text = `Richtig: ${a.name}${tritonus && !gleich(ton, a.ziel) ? " (hier als " + geschrieben + " geschrieben, auch richtig)" : ""}.`;
  else if (klingt) text = `Richtig gehört, aber falsch geschrieben: du hast eine ${geschrieben || "unübliche Schreibweise"} notiert. Gesucht war die ${a.name}, also ${spell(a.ziel)}.`;
  else text = `Das war eine ${a.name}${geschrieben ? `; du hast eine ${geschrieben} notiert` : ""}.`;
  return { richtig, klingt, text };
}

/* --- 2. Rhythmus zu Tonhöhen ------------------------------------------------------------ */

export const RHYTHMUS_STUFEN = [
  { id: 1, label: "Stufe 1", rhythmus: 2, auftakt: 0, was: "Viertel, Achtel, Halbe, kein Auftakt" },
  { id: 2, label: "Stufe 2", rhythmus: 2, auftakt: 0.5, was: "Mit Punktierungen und manchmal einem Auftakt" },
  { id: 3, label: "Stufe 3", rhythmus: 3, auftakt: 0.5, was: "Dazu Sechzehntel — wie die Haydn-Sonate im Mustertest" },
];

function fuelle(schlaege, stufe, rng) {
  return generateRhythm({ beats: schlaege, stufe, takte: 1, seed: Math.floor(rng() * 1e9) })
    .noten.filter(n => !n.barline).map(n => ({ dur: n.dur, dots: n.dots || 0 }));
}

/* Ein Takt, der mit einem Ton von mindestens einem Schlag endet. */
function mitSchluss(schlaege, stufe, rng) {
  const lang = schlaege >= 3 ? 2 : 1;
  if (schlaege - lang <= 0) return [{ dur: schlaege === 1 ? 1 : 2, dots: 0 }];
  return [...fuelle(schlaege - lang, stufe, rng), { dur: lang, dots: 0 }];
}

/**
 * Vier Takte mit Tonhöhen. Gibt die Noten mit Rhythmus und Taktstrichen
 * (die Lösung), die Tonhöhen, die Werte je Ton und die Stellen, hinter
 * denen ein Taktstrich steht.
 */
export function rhythmusZuToenen({ stufe = 2, rng = Math.random } = {}) {
  const st = RHYTHMUS_STUFEN.find(s => s.id === stufe) || RHYTHMUS_STUFEN[1];
  const schlaege = waehle([2, 3, 4], rng);
  const auftakt = st.auftakt && rng() < 0.5 ? waehle(schlaege >= 3 ? [0.5, 1] : [0.5], rng) : 0;
  const takte = [];
  if (auftakt) takte.push([{ dur: auftakt, dots: 0 }]);
  for (let t = 0; t < 3; t++) takte.push(fuelle(schlaege, st.rhythmus, rng));
  takte.push(mitSchluss(schlaege - auftakt, st.rhythmus, rng));

  const werte = takte.flat();
  const moll = rng() < 0.35;
  const tt = (moll ? MINOR_KEYS : MAJOR_KEYS).filter(k => Math.abs(k.sig) <= 3);
  const key = waehle(tt, rng);
  const { toene } = tonaleLinie({ key, skala: moll ? "moll_harmonisch" : "dur", anzahl: werte.length, rng });

  const striche = [];
  let i = 0;
  const noten = [];
  takte.forEach((tk, ti) => {
    if (ti > 0) { noten.push({ barline: true }); striche.push(i - 1); }
    for (const w of tk) noten.push({ pitch: toene[i++], ...w });
  });
  noten.push({ barline: "end" });
  return { stufe: st.id, schlaege, auftakt, keySig: key.sig, tonart: key, moll, toene, werte, striche, noten };
}

/**
 * Prüft eingetragene Werte und Taktstriche. Punkte wie im Mustertest
 * (vier je Melodie): drei für den Rhythmus, anteilig nach richtigen
 * Werten und auf halbe Punkte abgerundet, einer für die Taktstriche,
 * wenn alle stimmen. Die Aufteilung ist eine eigene Annahme — die mdw
 * nennt nur die Summe.
 */
export function pruefeRhythmusZuToenen(a, eingabe) {
  const einzeln = a.werte.map((w, i) => {
    const e = eingabe.werte[i];
    return !!e && e.dur === w.dur && (e.dots || 0) === (w.dots || 0);
  });
  const richtig = einzeln.filter(Boolean).length;
  const soll = new Set(a.striche);
  const ist = new Set(eingabe.striche);
  const stricheOk = soll.size === ist.size && [...soll].every(x => ist.has(x));
  const rhythmusPunkte = Math.floor(6 * richtig / a.werte.length) / 2;
  const punkte = rhythmusPunkte + (stricheOk ? 1 : 0);
  return { einzeln, richtig, gesamt: a.werte.length, stricheOk, punkte, max: 4, alles: punkte === 4 };
}

/**
 * Der „vollständige Satz“ zur Melodie: je Takt Bass und Akkord, gewählt
 * aus I, IV und V — der, dessen Töne im Takt am längsten klingen. In Moll
 * ist die V ein Durakkord, wie in der harmonischen Kadenz. Das ist kein
 * Klaviersatz wie im Mustertest (dort Hensel und Haydn), aber er macht
 * dasselbe: er zeigt, wo die Eins liegt.
 * Zeiten in Vierteln ab Beginn.
 */
export function satzFuer(a) {
  const tonika = toMidi({ ...a.tonart.tonic, octave: 3 });
  const drei = a.moll
    ? [[0, 3, 7], [5, 8, 12], [7, 11, 14]]
    : [[0, 4, 7], [5, 9, 12], [7, 11, 14]];
  const takte = [];
  let pos = 0, start = 0;
  const grenze = t => t === 0 && a.auftakt ? a.auftakt : a.schlaege;
  let tk = 0, toeneImTakt = [];
  a.werte.forEach((w, i) => {
    toeneImTakt.push({ midi: toMidi(a.toene[i]), l: laenge(w) });
    pos += laenge(w);
    if (pos - start >= grenze(tk) - 1e-6 || i === a.werte.length - 1) {
      takte.push({ start, laenge: pos - start, toene: toeneImTakt });
      start = pos; tk++; toeneImTakt = [];
    }
  });
  const events = [];
  for (const t of takte) {
    let bester = drei[0], punkte = -1;
    for (const akk of drei) {
      const pcs = akk.map(x => pc(tonika + x));
      const p = t.toene.reduce((s, x) => s + (pcs.includes(pc(x.midi)) ? x.l : 0), 0);
      if (p > punkte + 1e-6) { punkte = p; bester = akk; }
    }
    const grund = tonika + bester[0] - (tonika + bester[0] > 50 ? 12 : 0);
    events.push({ midi: grund, zeit: t.start, dauer: t.laenge, bass: true });
    for (const x of bester) events.push({ midi: tonika + x, zeit: t.start, dauer: t.laenge });
  }
  return events;
}

/* --- 4. Veränderter Akkord ------------------------------------------------------------ */

/* Ist die Tonfolge ein Terzenstapel einer bekannten Akkordart? Geprüft wird
   über Buchstaben und Halbtöne zugleich, damit der veränderte Akkord nicht
   nur richtig klingt, sondern auch richtig geschrieben ist. */
export function erkenneAkkord(toene) {
  const verschieden = [];
  for (const p of toene) if (!verschieden.some(q => pc(toMidi(q)) === pc(toMidi(p)) && q.step === p.step)) verschieden.push(p);
  for (const grund of verschieden) {
    const abst = verschieden.map(p => ({
      stufe: ((p.step - grund.step) % 7 + 7) % 7,
      halb: pc(toMidi(p) - toMidi(grund)),
    })).sort((x, y) => x.stufe - y.stufe);
    for (const [id, c] of Object.entries(CHORDS)) {
      if (c.steps.length !== abst.length) continue;
      if (abst.every((x, j) => x.stufe === 2 * j && x.halb === c.steps[j])) return { art: id, grund };
    }
  }
  return null;
}

const VIERKLAENGE = ["dom7", "dur7", "moll7", "halbvermindert", "vermindert7"];
const DREIKLAENGE = ["dur", "moll", "vermindert", "uebermaessig"];

/* Ein vierstimmiger Akkord in enger Lage im Violinschlüssel: Septakkord,
   oder Dreiklang mit verdoppeltem Grundton. */
function vierstimmig(rng) {
  for (let versuch = 0; versuch < 100; versuch++) {
    const art = rng() < 0.6 ? waehle(VIERKLAENGE, rng) : waehle(DREIKLAENGE.slice(0, 3), rng);
    const roots = tonartenFuer(artOf(akkordArtOf(art)?.skala || "dreiklang_dur"));
    const root = waehle(roots, rng).tonic;
    let toene = buildChord({ ...root, octave: 4 }, art);
    if (toene.length === 3) {
      // Dreiklang in Grundstellung mit verdoppeltem Grundton oben — so
      // bleibt er vierstimmig und in enger Lage.
      toene = [...toene, { ...toene[0], octave: toene[0].octave + 1 }];
    } else {
      const umk = Math.floor(rng() * 4);
      for (let i = 0; i < umk; i++) {
        const [unten, ...rest] = toene;
        toene = [...rest, { ...unten, octave: unten.octave + 1 }];
      }
    }
    while (toMidi(toene[0]) > 67) toene = toene.map(p => ({ ...p, octave: p.octave - 1 }));
    while (toMidi(toene[0]) < 60) toene = toene.map(p => ({ ...p, octave: p.octave + 1 }));
    if (toene.some(p => Math.abs(p.alter) > 1) || toMidi(toene[toene.length - 1]) > 81) continue;
    return { art, toene };
  }
  return { art: "dom7", toene: buildChord({ step: 4, alter: 0, octave: 4 }, "dom7") };
}

/**
 * Zwei Akkorde, der zweite an genau einer Stelle um einen Halbton
 * verändert: entweder nur das Vorzeichen (E → Es) oder ein Nachbarton
 * (E → F). Der zweite ist wieder ein richtig geschriebener Akkord, sonst
 * gäbe es keine eindeutige Lösung.
 */
export function akkordVeraendert({ rng = Math.random } = {}) {
  for (let versuch = 0; versuch < 200; versuch++) {
    const { art, toene } = vierstimmig(rng);
    const kandidaten = [];
    toene.forEach((p, i) => {
      for (const d of [-1, 1]) {
        const ziel = toMidi(p) + d;
        for (const step of [p.step, (p.step + d + 7) % 7]) {
          const q = spellOnStep(ziel, step);
          if (Math.abs(q.alter) > 1) continue;
          const neu = toene.map((x, j) => j === i ? q : x);
          if (new Set(neu.map(toMidi)).size !== neu.length) continue;
          // Die Reihenfolge von unten nach oben muss bleiben.
          if (neu.some((x, j) => j > 0 && toMidi(x) <= toMidi(neu[j - 1]))) continue;
          const erkannt = erkenneAkkord(neu);
          if (erkannt) kandidaten.push({ neu, i, erkannt, vorzeichen: step === p.step });
        }
      }
    });
    if (!kandidaten.length) continue;
    const k = waehle(kandidaten, rng);
    return { erster: toene, zweiter: k.neu, stimme: k.i, artVorher: art, artNachher: k.erkannt.art,
             grundNachher: k.erkannt.grund, nurVorzeichen: k.vorzeichen };
  }
  throw new Error("Kein veränderbarer Akkord gefunden");
}

/** Stimme für Stimme: richtig, klingt richtig (anders geschrieben) oder falsch. */
export function pruefeAkkord(soll, ist) {
  const einzeln = soll.map((p, i) => gleich(p, ist[i]) ? "richtig"
    : ist[i] && toMidi(ist[i]) === toMidi(p) ? "enharmonisch" : "falsch");
  return { einzeln, alles: einzeln.every(e => e === "richtig") };
}

/* Deutsche Akkordnamen: Dur groß, Moll klein geschrieben (C-Dur, c-Moll);
   Akkorde ohne Tongeschlecht „auf“ ihrem Grundton. */
export function akkordName(art, grund) {
  const g = spell(grund);
  switch (art) {
    case "dur": return `${gross(g)}-Dur-Dreiklang`;
    case "moll": return `${g.toLowerCase()}-Moll-Dreiklang`;
    case "vermindert": return `verminderter Dreiklang auf ${gross(g)}`;
    case "uebermaessig": return `übermäßiger Dreiklang auf ${gross(g)}`;
    case "dom7": return `Dominantseptakkord auf ${gross(g)}`;
    case "dur7": return `großer Septakkord auf ${gross(g)} (${gross(g)}maj7)`;
    case "moll7": return `Mollseptakkord auf ${gross(g)} (${gross(g)}m7)`;
    case "halbvermindert": return `halbverminderter Septakkord auf ${gross(g)}`;
    case "vermindert7": return `verminderter Septakkord auf ${gross(g)}`;
    default: return `${CHORDS[art]?.name || art} auf ${gross(g)}`;
  }
}

/* --- 5. Basston gegeben --------------------------------------------------------------- */

export function bassUndZwei({ rng = Math.random } = {}) {
  for (let versuch = 0; versuch < 200; versuch++) {
    const art = waehle(DREIKLAENGE, rng);
    const roots = tonartenFuer(artOf(akkordArtOf(art).skala));
    const root = waehle(roots, rng).tonic;
    const umkehrung = Math.floor(rng() * 3);
    let toene = buildChord({ ...root, octave: 3 }, art);
    for (let i = 0; i < umkehrung; i++) {
      const [unten, ...rest] = toene;
      toene = [...rest, { ...unten, octave: unten.octave + 1 }];
    }
    const clef = rng() < 0.5 ? "f" : "g";
    const [lo, hi] = clef === "f" ? [43, 55] : [57, 67];
    while (toMidi(toene[0]) > hi) toene = toene.map(p => ({ ...p, octave: p.octave - 1 }));
    while (toMidi(toene[0]) < lo) toene = toene.map(p => ({ ...p, octave: p.octave + 1 }));
    if (toMidi(toene[0]) > hi || toene.some(p => Math.abs(p.alter) > 1)) continue;
    return { clef, art, umkehrung, root, bass: toene[0], oben: toene.slice(1), toene };
  }
  const toene = buildChord({ step: 0, alter: 0, octave: 4 }, "dur");
  return { clef: "g", art: "dur", umkehrung: 0, root: toene[0], bass: toene[0], oben: toene.slice(1), toene };
}

export const lageName = (art, umkehrung) => UMKEHRUNGEN[3][umkehrung];

/* --- 6. Versetzungszeichen ----------------------------------------------------------- */

/**
 * Eine dur-moll-tonale Melodie, deren Versetzungszeichen fehlen. Im
 * Mustertest steht a-Moll ohne Vorzeichnung, mit Gis und Fis (melodisch
 * aufwärts), G und F abwärts, einem chromatischen Leitton (Dis vor E)
 * und einem tiefalterierten Ton (B vor A). Genau diese Fälle baut der
 * Generator ein — sie sind der Grund, warum die Aufgabe existiert.
 */
export function vorzeichenAufgabe({ rng = Math.random } = {}) {
  const tonarten = [...MINOR_KEYS.filter(k => Math.abs(k.sig) <= 1), ...MINOR_KEYS.filter(k => k.sig === 0),
                    ...MAJOR_KEYS.filter(k => Math.abs(k.sig) <= 1)];
  for (let versuch = 0; versuch < 300; versuch++) {
    const key = waehle(tonarten, rng);
    const moll = MINOR_KEYS.includes(key);
    const schlaege = waehle([2, 3, 4], rng);
    const werte = [];
    for (let t = 0; t < 3; t++) werte.push(fuelle(schlaege, 2, rng));
    werte.push(mitSchluss(schlaege, 2, rng));
    const flach = werte.flat();
    const { indizes } = tonaleLinie({ key, skala: moll ? "moll_natur" : "dur", anzahl: flach.length, rng });
    const leiter = buildScale({ ...key.tonic, octave: 3 }, moll ? "moll_natur" : "dur", 3);
    const grund = indizes.map(i => leiter[i + 7]);
    const toene = grund.map(p => ({ ...p }));
    const hoch = i => { toene[i] = spellOnStep(toMidi(grund[i]) + 1, grund[i].step); };
    const tief = i => { toene[i] = spellOnStep(toMidi(grund[i]) - 1, grund[i].step); };

    // Nach jeder Änderung prüfen, dass zu den Nachbarn weder eine
    // übermäßige Sekunde noch eine enharmonische Tonwiederholung entsteht
    // (C–Dis, F–Gis, Dis–Es). Sonst wird die Änderung zurückgenommen.
    const uebermSek = (p, q) => p && q && [1, 6].includes(((q.step - p.step) % 7 + 7) % 7) && Math.abs(toMidi(q) - toMidi(p)) === 3;
    const enhPrime = (p, q) => p && q && toMidi(p) === toMidi(q) && p.step !== q.step;
    const sauber = i => ![[i - 1, i], [i, i + 1]].some(([x, y]) => uebermSek(toene[x], toene[y]) || enhPrime(toene[x], toene[y]));
    const versuche = (stellen, fn) => {
      const vorher = stellen.map(i => toene[i]);
      stellen.forEach(fn);
      if (stellen.every(sauber)) return true;
      stellen.forEach((i, k) => { toene[i] = vorher[k]; });
      return false;
    };

    // Moll: der Leitton wird erhöht, wo er sich in den Grundton auflöst.
    // Kommt er schrittweise von der sechsten Stufe, wird die mit erhöht —
    // melodisches Moll aufwärts, sonst stünde eine übermäßige Sekunde da.
    for (let i = 0; i < indizes.length - 1; i++) {
      const s = ((indizes[i] % 7) + 7) % 7;
      if (!moll || s !== 6 || indizes[i + 1] !== indizes[i] + 1) continue;
      if (i > 0 && indizes[i - 1] === indizes[i] - 1) versuche([i - 1, i], hoch);
      else versuche([i], hoch);
    }
    // Chromatik nur an Tönen, deren Nachbarn beide unverändert sind: zwei
    // alterierte Töne hintereinander ergäben Folgen wie Dis–Es, und das
    // ist keine Melodie, sondern ein Rechenfehler.
    const frei = i => [i - 1, i, i + 1].every(j => !toene[j] || toene[j].alter === grund[j].alter);
    for (let i = 1; i < indizes.length - 1; i++) {
      if (!frei(i)) continue;
      const a = toMidi(grund[i]), b = toMidi(grund[i + 1]);
      const s = ((indizes[i] % 7) + 7) % 7;
      if (s === 0 || s === 4) continue;                    // Grundton und Quinte bleiben stehen
      // Chromatischer Leitton: Ganzton unter dem nächsten Ton wird Halbton.
      // In Moll nicht vor die natürliche siebte Stufe: Fis–G in a-Moll
      // widerspräche dem melodischen Moll, das dort Fis–Gis verlangt.
      const zurSieben = moll && ((indizes[i + 1] % 7) + 7) % 7 === 6;
      if (indizes[i + 1] === indizes[i] + 1 && b - a === 2 && !zurSieben && rng() < 0.3) versuche([i], hoch);
      // Tiefalteriert, nur in Moll und nur als ♭2 vor dem Grundton — das
      // B vor A in a-Moll aus dem Mustertest.
      else if (moll && s === 1 && indizes[i + 1] === indizes[i] - 1 && a - b === 2 && rng() < 0.5) versuche([i], tief);
    }
    if (toene.some(p => Math.abs(p.alter) > 1)) continue;
    const vorzeichen = toene.filter((p, i) => p.alter !== vorzeichnungVon(p.step, key.sig)).length;
    if (vorzeichen < 3) continue;

    const noten = [];
    let k = 0;
    werte.forEach((tk, ti) => {
      if (ti > 0) noten.push({ barline: true });
      for (const w of tk) noten.push({ pitch: toene[k++], ...w });
    });
    noten.push({ barline: "end" });
    return { tonart: key, moll, keySig: key.sig, schlaege, toene, grund: grund.map((p, i) => ({ ...p, alter: vorzeichnungVon(p.step, key.sig) })), noten };
  }
  throw new Error("Keine Melodie mit Versetzungszeichen gefunden");
}

function vorzeichnungVon(step, sig) {
  if (!sig) return 0;
  const kreuze = [3, 0, 4, 1, 5, 2, 6], ben = [6, 2, 5, 1, 4, 0, 3];
  return sig > 0 ? (kreuze.slice(0, sig).includes(step) ? 1 : 0) : (ben.slice(0, -sig).includes(step) ? -1 : 0);
}

/** Je Ton: stimmt die Alteration? Punkte wie im Mustertest, 3,5 anteilig. */
export function pruefeVorzeichen(a, alters) {
  const einzeln = a.toene.map((p, i) => (alters[i] ?? a.grund[i].alter) === p.alter);
  const richtig = einzeln.filter(Boolean).length;
  const punkte = Math.floor(7 * richtig / a.toene.length) / 2;
  return { einzeln, richtig, gesamt: a.toene.length, punkte, max: 3.5, alles: richtig === a.toene.length };
}

export { laenge as wertLaenge };

/* --- Der ganze Probe-Gehörtest ---------------------------------------------------------
   Aufbau und Punkte genau wie im Mustertest: sieben Aufgaben, 31,5 Punkte,
   16 zum Bestehen. Wie oft vorgespielt wird, steht je Aufgabe dabei; im
   Probetest ist danach Schluss. Die Stufen sind die schwereren, weil der
   Mustertest so schwer ist. */

export const PROBETEST = [
  { nr: 1, modus: "intervall", titel: "Intervall ergänzen", anzahl: 4, max: 0.5, hoeren: 3,
    anweisung: "Ergänze den zweiten Ton. ▲ heißt darüber, ▼ darunter. Beide Töne klingen zugleich, dreimal." },
  { nr: 2, modus: "tonrhythmus", titel: "Rhythmus und Taktstriche", anzahl: 2, max: 4, hoeren: 2, satz: 2, stufen: [2, 3],
    anweisung: "Ergänze den Rhythmus und setz die Taktstriche. Zweimal nur die Melodie, zweimal mit Begleitung." },
  { nr: 3, modus: "ergaenzen", titel: "Melodie ergänzen", anzahl: 1, max: 4, hoeren: 3, stufe: 3,
    anweisung: "Die ersten vier Takte stehen da, notiere die zweiten vier. Dreimal." },
  { nr: 4, modus: "akkordneu", titel: "Veränderter Akkord", anzahl: 4, max: 1, hoeren: 3,
    anweisung: "Zwei Akkorde, der zweite um einen Ton oder ein Vorzeichen verändert. Notiere den zweiten. Dreimal." },
  { nr: 5, modus: "bass", titel: "Basston gegeben", anzahl: 4, max: 1, hoeren: 3,
    anweisung: "Dreistimmiger Akkord, der Basston steht da. Notiere die beiden Töne darüber. Dreimal." },
  { nr: 6, modus: "vorzeichen", titel: "Versetzungszeichen", anzahl: 1, max: 3.5, hoeren: 3,
    anweisung: "Eine dur-moll-tonale Melodie: ergänze die Versetzungszeichen. Dreimal." },
  { nr: 7, modus: "typ", titel: "Akkordtyp", anzahl: 6, max: 1, hoeren: 3,
    anweisung: "Drei- oder vierstimmiger Akkord: bestimme den Typ. Dreimal." },
];
export const PROBE_MAX = 31.5;
export const PROBE_BESTANDEN = 16;

/** Die einzelnen Aufgaben des Probetests in Reihenfolge. */
export function probePlan() {
  const plan = [];
  for (const a of PROBETEST) {
    for (let k = 0; k < a.anzahl; k++) {
      plan.push({ ...a, teil: k + 1, stufe: a.stufen ? a.stufen[k % a.stufen.length] : a.stufe });
    }
  }
  return plan;
}

/** Punkte für eine gelöste Teilaufgabe, aus dem Ergebnis der Auswertung. */
export function probePunkte(modus, ergebnis) {
  if (!ergebnis) return 0;
  switch (modus) {
    case "intervall": return ergebnis.richtig ? 0.5 : 0;
    case "tonrhythmus": case "ergaenzen": case "vorzeichen": return ergebnis.punkte || 0;
    case "akkordneu": case "bass": case "typ": return ergebnis.alles ? 1 : 0;
    default: return 0;
  }
}

/** Punkte je Aufgabe, Summe und ob bestanden. */
export function probeAuswertung(einzeln) {
  const jeAufgabe = PROBETEST.map(a => {
    const teile = einzeln.filter(e => e.nr === a.nr);
    return { nr: a.nr, titel: a.titel, punkte: teile.reduce((s, e) => s + e.punkte, 0), max: a.anzahl * a.max };
  });
  const summe = jeAufgabe.reduce((s, a) => s + a.punkte, 0);
  // Wo fehlen die meisten Punkte? Das ist die Aufgabe, deren Übung am
  // meisten bringt — nicht die mit dem schlechtesten Anteil: acht fehlende
  // Punkte im Rhythmus wiegen mehr als zwei bei den Intervallen.
  const schwach = [...jeAufgabe].sort((x, y) => (y.max - y.punkte) - (x.max - x.punkte) || x.punkte / x.max - y.punkte / y.max)[0];
  return { jeAufgabe, summe, max: PROBE_MAX, bestanden: summe >= PROBE_BESTANDEN, schwach };
}
