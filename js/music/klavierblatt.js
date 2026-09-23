/* ==========================================================================
   Blattspiel am Klavier

   Die mdw nennt fürs Blattspiel „leichte Stücke: einfache barocke Tänze,
   Bartók Mikrokosmos Ende Band 1, Norton Microjazz“. Der Nutzer fängt am
   Klavier bei null an. Deshalb beginnen die Übungen dort, wo Mikrokosmos
   beginnt, und steigen bis zu dessen Ende von Band 1:

   1. rechte Hand allein, fünf Töne, Viertel und Halbe
   2. linke Hand allein
   3. die Hände abwechselnd, Frage und Antwort
   4. beide Hände zusammen, parallel
   5. beide Hände in Gegenbewegung, gleiche Finger in beiden Händen
   6. Melodie rechts, liegende Quinte links, mit Achteln und in Moll

   Alles in der Fünftonlage: jede Hand liegt über fünf Tasten, ein Finger je
   Taste. Die Finger ergeben sich aus der Lage — rechts der Daumen auf dem
   tiefsten Ton, links der kleine Finger — und sind deshalb kein Fingersatz,
   den ein Lehrer festlegen müsste. Anders als bei den Kadenzen darf die
   App sie also zeigen.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { buildScale, toMidi } from "./theory.js";
import { generateRhythm, mulberry32 } from "./rhythmus.js";

const waehle = (liste, rng) => liste[Math.floor(rng() * liste.length)];
const laenge = n => n.dur * (n.dots ? 1.5 : 1);

/* Die Fünftonlagen: Tonart, Vorzeichnung, Skala. Die Oktave jeder Hand
   wird so gewählt, dass sie im System liegt: rechts ab dem mittleren C,
   links zwischen F2 und E3. */
export const LAGEN = [
  { id: "C", name: "C-Dur", tonika: { step: 0, alter: 0 }, skala: "dur", sig: 0 },
  { id: "G", name: "G-Dur", tonika: { step: 4, alter: 0 }, skala: "dur", sig: 1 },
  { id: "F", name: "F-Dur", tonika: { step: 3, alter: 0 }, skala: "dur", sig: -1 },
  { id: "D", name: "D-Dur", tonika: { step: 1, alter: 0 }, skala: "dur", sig: 2 },
  { id: "a", name: "a-Moll", tonika: { step: 5, alter: 0 }, skala: "moll_natur", sig: 0 },
  { id: "d", name: "d-Moll", tonika: { step: 1, alter: 0 }, skala: "moll_natur", sig: -1 },
  { id: "e", name: "e-Moll", tonika: { step: 2, alter: 0 }, skala: "moll_natur", sig: 1 },
];
export const lageOf = id => LAGEN.find(l => l.id === id) || LAGEN[0];

export const KLAVIER_STUFEN = [
  { id: 1, label: "Rechte Hand", modus: "rechts", lagen: ["C", "G"], rhythmus: 1, takte: 4, schlaege: [4],
    was: "Nur die rechte Hand, fünf Töne, Viertel und Halbe. Daumen auf dem Grundton." },
  { id: 2, label: "Linke Hand", modus: "links", lagen: ["C", "G"], rhythmus: 1, takte: 4, schlaege: [4],
    was: "Nur die linke Hand im Bassschlüssel. Der kleine Finger liegt auf dem Grundton." },
  { id: 3, label: "Abwechselnd", modus: "wechsel", lagen: ["C", "G", "F"], rhythmus: 1, takte: 8, schlaege: [4, 3],
    was: "Zwei Takte rechts, zwei Takte links — wie Frage und Antwort. So beginnt Mikrokosmos." },
  { id: 4, label: "Parallel", modus: "parallel", lagen: ["C", "G", "F", "a"], rhythmus: 1, takte: 8, schlaege: [4, 3],
    was: "Beide Hände zusammen, dieselbe Melodie im Abstand von einer oder zwei Oktaven." },
  { id: 5, label: "Gegenbewegung", modus: "gegen", lagen: ["C", "G", "F", "a", "d"], rhythmus: 1, takte: 8, schlaege: [4, 3],
    was: "Beide Hände spiegeln sich: gleiche Finger in beiden Händen, die eine Hand steigt, die andere fällt." },
  { id: 6, label: "Melodie und Quinte", modus: "begleitet", lagen: ["C", "G", "F", "D", "a", "d", "e"], rhythmus: 2, takte: 8, schlaege: [4, 3, 2],
    was: "Melodie rechts mit Achteln, links liegende Töne. Etwa das Ende von Mikrokosmos Band 1." },
];
export const stufeOf = id => KLAVIER_STUFEN.find(s => s.id === id) || KLAVIER_STUFEN[0];

/** Die fünf Töne jeder Hand in einer Lage. */
export function handlage(lage) {
  const rechtsGrund = { ...lage.tonika, octave: 4 };
  let linksOkt = 3;
  while (toMidi({ ...lage.tonika, octave: linksOkt }) > 52) linksOkt--;
  while (toMidi({ ...lage.tonika, octave: linksOkt }) < 41) linksOkt++;
  const fuenf = grund => buildScale(grund, lage.skala, 1).slice(0, 5);
  return { rechts: fuenf(rechtsGrund), links: fuenf({ ...lage.tonika, octave: linksOkt }) };
}

/* Ein Takt Rhythmus ohne Pausen: gelesen wird zuerst die Tonhöhe, und
   Pausen im ersten Jahr machen das Blattspiel nur schwerer, nicht besser. */
function taktRhythmus(schlaege, stufe, rng) {
  return generateRhythm({ beats: schlaege, stufe, takte: 1, seed: Math.floor(rng() * 1e9) })
    .noten.filter(n => !n.barline).map(n => ({ dur: n.dur, dots: n.dots || 0 }));
}

const ganzerTakt = schlaege => schlaege === 4 ? { dur: 4, dots: 0 } : schlaege === 3 ? { dur: 2, dots: 1 } : { dur: 2, dots: 0 };

/* Eine Linie aus Stufen 0 bis 4 in der Fünftonlage: meist Schritte,
   manchmal eine Terz, nie ein Sprung über die Lage hinaus. */
function linie(anzahl, start, ende, rng) {
  if (anzahl <= 1) return [ende];
  // Der vorletzte Ton ist ein Nachbar des Schlusstons; die Linie wird so
  // gelenkt, dass sie ihn mit Schritten und Terzen erreicht.
  const vorletzter = ende === 0 ? 1 : ende === 4 ? 3 : waehle([ende - 1, ende + 1], rng);
  // Bei kurzen Phrasen muss schon der Anfang nah genug am Schluss liegen.
  const bezug = anzahl === 2 ? ende : vorletzter;
  const reichweite = anzahl === 2 ? 2 : 2 * (anzahl - 2);
  if (Math.abs(start - bezug) > reichweite) start = bezug + Math.sign(start - bezug) * reichweite;
  const out = [start];
  let d = start, letzter = 0;
  for (let i = 1; i < anzahl - 1; i++) {
    const ziel = i === anzahl - 2 ? vorletzter : null;
    const nachher = anzahl - 2 - i;           // Töne bis zum vorletzten
    let neu;
    if (ziel != null) neu = ziel;
    else {
      for (let versuch = 0; versuch < 20; versuch++) {
        const schritt = rng() < 0.75 ? (letzter !== 0 && rng() < 0.6 ? Math.sign(letzter) : (rng() < 0.5 ? -1 : 1)) : (rng() < 0.5 ? -2 : 2);
        neu = d + schritt;
        if (neu >= 0 && neu <= 4 && Math.abs(neu - vorletzter) <= 2 * nachher) break;
        neu = null;
      }
      if (neu == null) neu = d + Math.sign(vorletzter - d) * Math.min(2, Math.abs(vorletzter - d));
    }
    letzter = neu - d;
    d = neu;
    out.push(d);
  }
  out.push(ende);
  return out;
}

/**
 * Eine Blattspiel-Übung. Gibt die Takte je Hand im Format von
 * notation.js (Pausen als `{ dur }`, Zweiklänge als `{ chord }`), die
 * Handlage und die Ereignisse zum Vorspielen (Zeiten in Vierteln).
 */
export function klavierUebung({ stufe = 1, rng = Math.random, lageId = null } = {}) {
  const st = stufeOf(stufe);
  const lage = lageOf(lageId || waehle(st.lagen, rng));
  const schlaege = waehle(st.schlaege, rng);
  const hand = handlage(lage);
  const ton = (seite, d) => hand[seite][d];

  // Rhythmus: alle Takte bis auf den letzten zufällig, der letzte ein langer Ton.
  const rhythmen = Array.from({ length: st.takte }, (_, i) =>
    i === st.takte - 1 ? [ganzerTakt(schlaege)] : taktRhythmus(schlaege, st.rhythmus, rng));
  // Eine Ganztaktpause steht in jeder Taktart als ganze Pause — sie dauert
  // aber so lange wie der Takt.
  const pause = () => ({ pitch: null, dur: schlaege, dots: 0, ganztakt: true });

  const takte = rhythmen.map(() => ({ oben: [], unten: [] }));
  const melodie = (von, bis, seite, start, ende) => {
    const werte = rhythmen.slice(von, bis);
    const anzahl = werte.reduce((s, tk) => s + tk.length, 0);
    const stufen = linie(anzahl, start, ende, rng);
    let k = 0;
    werte.forEach((tk, i) => {
      takte[von + i][seite === "rechts" ? "oben" : "unten"] = tk.map(w => ({ ...w, pitch: ton(seite, stufen[k++]) }));
    });
    return stufen;
  };

  if (st.modus === "rechts" || st.modus === "links") {
    melodie(0, st.takte, st.modus, waehle([0, 2, 4], rng), 0);
    for (const tk of takte) tk[st.modus === "rechts" ? "unten" : "oben"] = [pause()];
  } else if (st.modus === "wechsel") {
    for (let t = 0; t < st.takte; t += 2) {
      const seite = (t / 2) % 2 === 0 ? "rechts" : "links";
      const letzte = t + 2 >= st.takte;
      melodie(t, t + 2, seite, waehle([0, 2, 4], rng), letzte ? 0 : waehle([1, 4], rng));
      for (const i of [t, t + 1]) takte[i][seite === "rechts" ? "unten" : "oben"] = [pause()];
    }
  } else if (st.modus === "parallel" || st.modus === "gegen") {
    const gegen = st.modus === "gegen";
    // In Gegenbewegung beginnen beide Daumen: rechts auf dem Grundton,
    // links auf der Quinte — gleiche Finger in beiden Händen. Am Schluss
    // liegt rechts die Quinte und links der Grundton.
    const stufen = melodie(0, st.takte, "rechts", gegen ? 0 : waehle([0, 2, 4], rng), gegen ? 4 : 0);
    let k = 0;
    rhythmen.forEach((tk, i) => {
      takte[i].unten = tk.map(w => { const d = stufen[k++]; return { ...w, pitch: ton("links", gegen ? 4 - d : d) }; });
    });
  } else {
    // Melodie mit liegenden Tönen: je Takt die Quinte (Grundton und Quinte
    // zusammen), wo die Melodie im Tonika-Dreiklang bleibt, sonst die
    // Quinte allein — der Ton der Dominante in der Fünftonlage.
    const stufen = melodie(0, st.takte, "rechts", waehle([0, 2, 4], rng), 0);
    let k = 0;
    rhythmen.forEach((tk, i) => {
      const imTakt = stufen.slice(k, k + tk.length);
      const dauern = tk.map(laenge);
      k += tk.length;
      const imDreiklang = imTakt.reduce((s, d, j) => s + ([0, 2, 4].includes(d) ? dauern[j] : 0), 0);
      const tonika = imDreiklang >= schlaege / 2 || i === st.takte - 1;
      const w = ganzerTakt(schlaege);
      takte[i].unten = [tonika
        ? { ...w, chord: [{ pitch: ton("links", 0) }, { pitch: ton("links", 4) }] }
        : { ...w, pitch: ton("links", 4) }];
    });
  }

  // Zum Vorspielen: jede Hand für sich auf der Zeitachse.
  const ereignisse = [];
  for (const seite of ["oben", "unten"]) {
    let t = 0;
    for (const tk of takte) for (const n of tk[seite]) {
      const toene = n.chord ? n.chord.map(c => c.pitch) : n.pitch ? [n.pitch] : [];
      for (const p of toene) ereignisse.push({ midi: toMidi(p), zeit: t, dauer: laenge(n), hand: seite === "oben" ? "rechts" : "links" });
      t += laenge(n);
    }
  }
  ereignisse.sort((a, b) => a.zeit - b.zeit);
  return { stufe: st.id, modus: st.modus, lage, keySig: lage.sig, schlaege, takte, hand, ereignisse };
}

export { mulberry32 };
