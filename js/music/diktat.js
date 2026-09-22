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
