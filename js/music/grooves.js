/* ==========================================================================
   Grooves für die Begleitband

   Bisher konnte die Band nur Swing. Das reicht für Standards, aber nicht
   für die Prüfung — „drei Stücke verschiedener Stilrichtungen“ heißt, dass
   eines davon eine Ballade, eine Bossa oder ein Funk-Stück sein wird — und
   schon gar nicht für das zweite Ziel, den DJ-Gig: dort liegt House
   darunter, und wer das nie geübt hat, schleppt gegen die Bassdrum.

   Ein Groove ist hier nichts als eine Tabelle: auf welchem Sechzehntel
   spielt welches Instrument, und was spielt der Bass. Jeder Groove hat
   eine eigene Regel für den Bass, weil der Bass den Stil mehr prägt als
   das Schlagzeug: Swing geht, Bossa pendelt zwischen Grundton und Quinte,
   Funk lässt Löcher, House spielt auf die Offbeats.

   Reine Rechnung, kein Audio, kein DOM. Die Begleitung macht daraus Klang,
   die Tests prüfen, dass jeder Groove dort schlägt, wo sein Stil es will.
   ========================================================================== */

"use strict";

import { QUALITIES } from "./harmonie.js";
import { toMidi } from "./theory.js";

export const GROOVES = [
  { id: "swing", name: "Swing", gerade: false, tempo: 140,
    was: "Walking Bass, Ride-Becken, Akkorde auf zwei und vier. Standards, Blues, Bebop." },
  { id: "ballade", name: "Ballade", gerade: false, tempo: 66,
    was: "Halbe im Bass, Besen, lange Akkorde. Viel Platz — hier hört man jeden Ton, jede Intonation und jedes Vibrato." },
  { id: "bossa", name: "Bossa", gerade: true, tempo: 132,
    was: "Grundton und Quinte im Bass, Rimshot im Clave-Muster über zwei Takte, gerade Achtel. Leise und in der Time, nicht darüber." },
  { id: "funk", name: "Funk", gerade: true, tempo: 100,
    was: "Sechzehntel in der Hi-Hat, Backbeat auf zwei und vier, ein Bass mit Löchern. Hier zählt, wo du nicht spielst — und dass deine Achtel gerade bleiben." },
  { id: "pop", name: "Pop", gerade: true, tempo: 96,
    was: "Achtel im Bass, Backbeat, Klavier in Vierteln. Die Grundlage jedes Hochzeitssets." },
  { id: "house", name: "House", gerade: true, tempo: 124,
    was: "Bassdrum auf jedem Schlag, offene Hi-Hat dazwischen, Bass auf den Offbeats. Das, was unter einem DJ-Set liegt. Die Maschine wackelt nicht — du darfst es auch nicht." },
];

export const grooveOf = id => GROOVES.find(g => g.id === id) || GROOVES[0];

/* --- Töne für Bass und Akkorde ---------------------------------------------- */

const q = a => QUALITIES[a.q];

/** Der Grundton in Basslage, unteres E bis oberes E. */
export function grundInLage(akkord) {
  let r = toMidi(akkord.root);
  while (r > 52) r -= 12;
  while (r < 40) r += 12;
  return r;
}

const quinteVon = a => grundInLage(a) + q(a).steps[2];
const septimeVon = a => grundInLage(a) + (q(a).steps[3] ?? q(a).steps[2]);

/** Ein Halbton an den nächsten Grundton heran, aus der näheren Richtung. */
function leitton(von, nach, rng) {
  let ziel = grundInLage(nach);
  while (ziel > von + 7) ziel -= 12;
  while (ziel < von - 5) ziel += 12;
  return ziel + (rng() < 0.5 ? 1 : -1);
}

/**
 * Walking Bass für einen Abschnitt von ein bis vier Schlägen: Grundton,
 * Akkordtöne, und auf dem letzten Schlag ein Halbton an den nächsten
 * Grundton heran. So spielen Bassisten, und so wird die Harmonie hörbar.
 */
export function bassWalk(akkord, danach, schlaege, rng = Math.random) {
  const r = grundInLage(akkord);
  const qq = q(akkord);
  const terz = r + qq.steps[1], quinte = r + qq.steps[2], sept = r + (qq.steps[3] ?? 12);
  const lt = leitton(r, danach, rng);
  const mitte = rng() < 0.5 ? [terz, quinte] : [quinte, sept];
  if (schlaege >= 4) return [r, mitte[0], mitte[1], lt];
  if (schlaege === 3) return [r, mitte[0], lt];
  if (schlaege === 2) return [r, lt];
  return [r];
}

/** Comping: Terz, Quinte und Septime um das mittlere C. */
export function voicing(akkord) {
  const qq = q(akkord);
  let r = toMidi(akkord.root);
  while (r > 60) r -= 12;
  while (r < 52) r += 12;
  return [r + qq.steps[1], r + qq.steps[2], r + (qq.steps[3] ?? 12)];
}

/* --- Ereignisse je Sechzehntel -----------------------------------------------
   `s` ist { viertel, sub, taktImLoop, hier } — `sub` ist das Sechzehntel im
   Schlag (0 bis 3), `hier` kommt aus akkordAufSchlag(). `zustand` hält die
   laufende Basslinie zwischen den Schlägen. Zurück kommt eine Liste von
   Ereignissen: { typ, midi | midis, dauer (in Schlägen), amp }.

   Bei den geswingten Grooves gibt es nur Sub 0 und Sub 2; wo das „und“
   liegt, entscheidet die Begleitung über das Swing-Verhältnis. */

const E = (typ, amp, extra = {}) => ({ typ, amp, ...extra });

function swing(s, zustand, rng) {
  const { viertel, sub, hier } = s;
  const out = [];
  if (sub === 0) {
    // Eine neue Linie auf der Eins, bei jedem Akkordwechsel — und wenn es
    // noch keine gibt: wer mitten im Takt auf Swing umschaltet, hat noch
    // keine, und dann beginnt sie eben hier.
    if (viertel === 0 || hier.beginnt || !zustand.linie) {
      zustand.linie = bassWalk(hier.akkord, hier.danach, hier.schlaege, rng);
      zustand.ab = viertel;
    }
    out.push(E("bass", 0.18, { midi: zustand.linie[Math.min(zustand.linie.length - 1, viertel - zustand.ab)], dauer: 0.92 }));
    out.push(E("ride", viertel === 0 ? 0.10 : 0.07));
    if (viertel % 2 === 1) out.push(E("hihat", 0.09));
    if (hier.beginnt) out.push(E("comp", 0.10, { midis: voicing(hier.akkord), dauer: 1.2 }));
    else if (viertel % 2 === 1) out.push(E("comp", 0.07, { midis: voicing(hier.akkord), dauer: 0.7 }));
  } else if (sub === 2 && viertel % 2 === 1) {
    out.push(E("ride", 0.05));
  }
  return out;
}

function ballade(s, zustand, rng) {
  const { viertel, sub, hier } = s;
  const out = [];
  if (sub === 0) {
    // Zwei-Feel: Halbe im Bass. Auf der Drei die Quinte, oder ein Leitton,
    // wenn im nächsten Takt ein anderer Akkord kommt.
    if (viertel === 0 || hier.beginnt) {
      out.push(E("bass", 0.17, { midi: grundInLage(hier.akkord), dauer: Math.min(2, hier.schlaege) * 0.95 }));
    } else if (viertel === 2) {
      const wechselt = hier.danach !== hier.akkord;
      const ton = wechselt ? leitton(grundInLage(hier.akkord), hier.danach, rng) : quinteVon(hier.akkord);
      out.push(E("bass", 0.15, { midi: ton, dauer: Math.min(2, hier.schlaege) * 0.95 }));
    }
    out.push(E("besen", viertel === 0 ? 0.06 : 0.045, { dauer: 0.9 }));
    if (viertel % 2 === 1) out.push(E("hihat", 0.045));
    if (hier.beginnt) out.push(E("comp", 0.08, { midis: voicing(hier.akkord), dauer: hier.schlaege * 0.95 }));
  } else if (sub === 2 && viertel % 2 === 1) {
    out.push(E("besen", 0.03, { dauer: 0.4 }));
  }
  return out;
}

/* Clave über zwei Takte, in Achteln gezählt: erster Takt 1, 2-und, 4;
   zweiter Takt 2 und 3-und. Rimshot und Gitarre folgen ihr. */
const BOSSA_CLAVE = [[0, 3, 6], [2, 5]];

function bossa(s) {
  const { viertel, sub, taktImLoop, hier } = s;
  const out = [];
  const achtel = viertel * 2 + sub / 2;
  if (sub % 2 === 1) return out;
  if (sub === 0 && (viertel === 0 || viertel === 2)) {
    out.push(E("bass", 0.17, { midi: grundInLage(hier.akkord), dauer: 1.4 }));
    out.push(E("kick", 0.09));
  }
  if (sub === 2 && (viertel === 1 || viertel === 3)) {
    // Die Quinte unter dem Grundton, wenn sie nicht zu tief wird: so
    // pendelt ein Bossa-Bass.
    const q5 = quinteVon(hier.akkord);
    out.push(E("bass", 0.13, { midi: q5 - 12 >= 36 ? q5 - 12 : q5, dauer: 0.45 }));
  }
  out.push(E("shaker", sub === 2 ? 0.05 : 0.03));
  if (BOSSA_CLAVE[taktImLoop % 2].includes(achtel)) {
    out.push(E("rim", 0.09));
    out.push(E("comp", 0.065, { midis: voicing(hier.akkord), dauer: 0.45 }));
  }
  return out;
}

function funk(s, zustand, rng) {
  const { viertel, sub, hier } = s;
  const n = viertel * 4 + sub;
  const out = [];
  out.push(E("hihat", sub === 0 ? 0.07 : sub === 2 ? 0.05 : 0.025, { dauer: 0.05 }));
  if ([0, 6, 10].includes(n)) out.push(E("kick", 0.16));
  if (n === 4 || n === 12) out.push(E("snare", 0.14));
  if (n === 7 || n === 14) out.push(E("snare", 0.035));

  const r = grundInLage(hier.akkord);
  const bassMuster = {
    0: [r, 0.45, 0.18], 3: [r, 0.2, 0.13], 6: [r + 12, 0.2, 0.14],
    8: [r, 0.45, 0.17], 10: [septimeVon(hier.akkord), 0.2, 0.13],
  };
  if (bassMuster[n]) {
    const [midi, dauer, amp] = bassMuster[n];
    out.push(E("bass", amp, { midi, dauer }));
  }
  if (n === 14) {
    const ton = hier.danach !== hier.akkord ? leitton(r, hier.danach, rng) : quinteVon(hier.akkord);
    out.push(E("bass", 0.12, { midi: ton, dauer: 0.2 }));
  }
  if ([2, 10, 13].includes(n)) out.push(E("comp", 0.07, { midis: voicing(hier.akkord), dauer: 0.15, hell: true }));
  return out;
}

function pop(s, zustand, rng) {
  const { viertel, sub, hier } = s;
  const out = [];
  if (sub % 2 === 1) return out;
  out.push(E("hihat", sub === 0 ? 0.06 : 0.04, { dauer: 0.06 }));
  if (sub === 0 && (viertel === 0 || viertel === 2)) out.push(E("kick", 0.15));
  if (sub === 2 && viertel === 2) out.push(E("kick", 0.09));
  if (sub === 0 && (viertel === 1 || viertel === 3)) out.push(E("snare", 0.13));

  const r = grundInLage(hier.akkord);
  const letztesAchtel = viertel === 3 && sub === 2;
  const ton = letztesAchtel && hier.danach !== hier.akkord ? leitton(r, hier.danach, rng) : r;
  out.push(E("bass", sub === 0 ? 0.16 : 0.12, { midi: ton, dauer: 0.45 }));
  if (sub === 0) out.push(E("comp", 0.05, { midis: voicing(hier.akkord), dauer: 0.9 }));
  return out;
}

function house(s) {
  const { viertel, sub, hier } = s;
  const n = viertel * 4 + sub;
  const out = [];
  if (sub === 0) out.push(E("kick", 0.2));
  if (sub === 0 && viertel % 2 === 1) out.push(E("clap", 0.12));
  if (sub === 2) out.push(E("openhat", 0.07));
  if (sub === 1 || sub === 3) out.push(E("hihat", 0.025, { dauer: 0.04 }));
  if (sub === 2) {
    const r = grundInLage(hier.akkord);
    out.push(E("bass", 0.17, { midi: viertel === 3 ? r + 12 : r, dauer: 0.4 }));
  }
  if ([2, 7, 10].includes(n)) out.push(E("comp", 0.06, { midis: voicing(hier.akkord), dauer: 0.25 }));
  return out;
}

const MUSTER = { swing, ballade, bossa, funk, pop, house };

/** Was auf diesem Sechzehntel erklingt. */
export function ereignisse(grooveId, s, zustand = {}, rng = Math.random) {
  return (MUSTER[grooveId] || swing)(s, zustand, rng);
}

/**
 * Wo das Sechzehntel `sub` im Schlag liegt, als Anteil des Schlags. Gerade
 * Grooves teilen gleichmäßig, geswingte schieben das „und“ auf das
 * Swing-Verhältnis — bei 0,5 gerade, bei 0,667 voller Swing.
 */
export function subAnteil(sub, gerade, swingVerhaeltnis) {
  if (gerade) return sub * 0.25;
  const s = swingVerhaeltnis;
  return [0, s / 2, s, s + (1 - s) / 2][sub];
}
