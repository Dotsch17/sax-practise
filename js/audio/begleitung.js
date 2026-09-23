/* ==========================================================================
   Begleitung: Bass, Akkorde, Schlagzeug

   Derselbe vorausschauende Scheduler wie beim Metronom — ein Wecker alle
   25 ms legt die nächsten 200 ms exakt auf die Audio-Uhr. Gehört wird die
   Audio-Uhr; Ruckler im Hauptthread sind unhörbar.

   Gerechnet wird in Sechzehnteln, weil Funk und House sie brauchen. Was auf
   welchem Sechzehntel erklingt, steht in js/music/grooves.js; hier wird nur
   daraus Klang gemacht. Bei den geswingten Grooves gibt es nur Viertel und
   „und“, und das „und“ liegt auf dem Swing-Verhältnis: bei 0,5 gerade, bei
   0,667 voller Swing, dazwischen alles — ein Blues bei 200 swingt weniger
   als einer bei 100.

   Kein DOM.
   ========================================================================== */

"use strict";

import { audio, bisHoerbar } from "./context.js";
import { midiToFreq } from "../music/theory.js";
import { chordAtBar, progressionTakte, akkordAufSchlag, akkordeImTakt } from "../music/harmonie.js";
import { grooveOf, ereignisse, subAnteil } from "../music/grooves.js";

const LOOKAHEAD_S = 0.2;
const TICK_MS = 25;

let running = false;
let timer = null;
let naechsteZeit = 0;
let position = 0;          // Sechzehntel seit dem Start, Einzähler inklusive
let akkorde = [];
let bpm = 120;
let swing = 0.62;
let a4 = 440;
let taktlaenge = 4;
let groove = "swing";
let laut = { bass: 0.9, comp: 0.55, becken: 0.5 };
let spuren = { bass: true, comp: true, becken: true };
// Ein Takt Hi-Hat vor dem ersten Akkord. Aus, solange es niemand verlangt —
// die Übungen mit festen Folgen fangen direkt an.
let einzaehlen = false;
let vorlauf = 0;           // Sechzehntel Einzähler dieses Laufs
let zustand = {};          // laufende Basslinie des Grooves

const barWatchers = new Set();
export function onBar(fn) { barWatchers.add(fn); return () => barWatchers.delete(fn); }
const stateWatchers = new Set();
export function onStateChange(fn) { stateWatchers.add(fn); return () => stateWatchers.delete(fn); }

const proTakt = () => taktlaenge * 4;
export const isRunning = () => running;
export const getBpm = () => bpm;
export const getGroove = () => groove;
export const getTakt = () => Math.floor(Math.max(0, position - vorlauf) / proTakt());

export function configure(opts = {}) {
  const warGerade = grooveOf(groove).gerade;
  const neuGroove = opts.groove != null ? grooveOf(opts.groove).id : groove;
  const zeitWechsel = (opts.bpm != null && opts.bpm !== bpm) ||
                      (opts.swing != null && opts.swing !== swing) ||
                      grooveOf(neuGroove).gerade !== warGerade;
  if (opts.akkorde) akkorde = opts.akkorde;
  if (opts.bpm != null) bpm = Math.min(300, Math.max(30, Math.round(opts.bpm)));
  if (opts.swing != null) swing = Math.min(0.7, Math.max(0.5, opts.swing));
  if (opts.a4 != null) a4 = opts.a4;
  if (opts.taktlaenge != null) taktlaenge = opts.taktlaenge;
  if (opts.laut) laut = { ...laut, ...opts.laut };
  if (opts.spuren) spuren = { ...spuren, ...opts.spuren };
  if (opts.einzaehlen != null) einzaehlen = !!opts.einzaehlen;
  if (neuGroove !== groove) { groove = neuGroove; zustand = {}; }
  if (zeitWechsel && running) verankere();
  for (const fn of stateWatchers) fn({ running, bpm, swing, groove });
}

/* --- Klangbausteine --------------------------------------------------------- */

/** Kontrabass-artig: Dreieck durch einen Tiefpass, kurzer Anriss. */
function bass(time, midi, dauer, amp) {
  const ctx = audio();
  const f = midiToFreq(midi, a4);
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, time);
  lp.frequency.exponentialRampToValueAtTime(320, time + 0.12);
  lp.Q.value = 2;

  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(amp, time + 0.012);
  g.gain.exponentialRampToValueAtTime(amp * 0.5, time + Math.min(0.09, dauer * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);

  for (const [mult, a, typ] of [[1, 1, "triangle"], [2, 0.18, "sine"], [1.005, 0.4, "triangle"]]) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = typ;
    o.frequency.value = f * mult;
    og.gain.value = a;
    o.connect(og); og.connect(lp);
    o.start(time); o.stop(time + dauer + 0.05);
  }
  lp.connect(g); g.connect(ctx.destination);
}

/** Akkorde: weiche Fläche, kurz angeschlagen. `hell` für Funk-Stabs. */
function comp(time, midis, dauer, amp, hell = false) {
  const ctx = audio();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = hell ? 4200 : 2600;

  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(amp, time + 0.015);
  g.gain.exponentialRampToValueAtTime(amp * 0.35, time + Math.max(0.03, dauer * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);

  midis.forEach((m, i) => {
    for (const [mult, a] of [[1, 1], [2, hell ? 0.4 : 0.22], [3, hell ? 0.2 : 0.08]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = hell ? "square" : "triangle";
      // Die Stimmen minimal gegeneinander verstimmen, sonst klingt der
      // Akkord wie ein Orgelregister statt wie ein Instrument.
      o.frequency.value = midiToFreq(m, a4) * mult * (1 + (i - 1) * 0.0008);
      og.gain.value = (hell ? 0.35 : 1) * a / midis.length;
      o.connect(og); og.connect(lp);
      o.start(time); o.stop(time + dauer + 0.05);
    }
  });
  lp.connect(g); g.connect(ctx.destination);
}

// Rauschen einmal erzeugen und wiederverwenden — jedes Mal neu zu würfeln
// kostet bei 200 Schlägen je Minute spürbar Rechenzeit.
let rauschPuffer = null;
function rauschen() {
  const ctx = audio();
  if (rauschPuffer && rauschPuffer.sampleRate === ctx.sampleRate) return rauschPuffer;
  const len = Math.floor(ctx.sampleRate * 0.5);
  rauschPuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = rauschPuffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return rauschPuffer;
}

/** Gefiltertes Rauschen mit Hüllkurve: Becken, Hi-Hat, Snare, Besen, Shaker. */
function geraeusch(time, amp, { typ = "highpass", freq = 7000, q = 0.7, dauer = 0.2, rate = 1.6, anstieg = 0.001 } = {}) {
  const ctx = audio();
  const src = ctx.createBufferSource();
  src.buffer = rauschen();
  src.playbackRate.value = rate;
  const f = ctx.createBiquadFilter();
  f.type = typ;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(amp, time + anstieg);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start(time); src.stop(time + dauer + 0.02);
}

/** Ein kurzer Ton mit Tonhöhenabfall: Bassdrum, Snare-Körper, Rimshot. */
function schlag(time, amp, von, bis, dauer, typ = "sine") {
  const ctx = audio();
  const o = ctx.createOscillator();
  o.type = typ;
  o.frequency.setValueAtTime(von, time);
  o.frequency.exponentialRampToValueAtTime(bis, time + dauer * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(amp, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);
  o.connect(g); g.connect(ctx.destination);
  o.start(time); o.stop(time + dauer + 0.02);
}

/* Die Stimmen des Schlagzeugs. Alle aus Rauschen und kurzen Tönen gebaut —
   keine Samples, damit zur Laufzeit nichts nachgeladen wird. */
const SCHLAGZEUG = {
  ride:    (t, a) => geraeusch(t, a, { freq: 7000, dauer: 0.22 }),
  hihat:   (t, a, d) => geraeusch(t, a, { freq: 5200, rate: 1, dauer: Math.min(0.09, d || 0.09) }),
  openhat: (t, a) => geraeusch(t, a, { freq: 6500, dauer: 0.2 }),
  shaker:  (t, a) => geraeusch(t, a, { typ: "bandpass", freq: 6000, q: 1.2, dauer: 0.05, anstieg: 0.008 }),
  besen:   (t, a, d) => geraeusch(t, a, { typ: "bandpass", freq: 2600, q: 0.6, rate: 1, dauer: Math.max(0.12, d || 0.3), anstieg: 0.04 }),
  kick:    (t, a) => schlag(t, a * 2.2, 120, 45, 0.32),
  snare:   (t, a) => {
    geraeusch(t, a, { typ: "bandpass", freq: 1900, q: 0.8, rate: 1, dauer: 0.16 });
    schlag(t, a * 0.8, 210, 160, 0.08, "triangle");
  },
  clap:    (t, a) => {
    for (const d of [0, 0.011, 0.022]) {
      geraeusch(t + d, a, { typ: "bandpass", freq: 1300, q: 1.1, rate: 1, dauer: d === 0.022 ? 0.18 : 0.03 });
    }
  },
  rim:     (t, a) => {
    geraeusch(t, a * 0.7, { typ: "bandpass", freq: 2500, q: 4, rate: 1, dauer: 0.035 });
    schlag(t, a, 1700, 1600, 0.03, "triangle");
  },
};

/* --- Scheduler ---------------------------------------------------------------
   Jeder Schritt wird absolut aus dem Startzeitpunkt gerechnet, nicht
   fortlaufend addiert. Inkrementelles Addieren summiert Rundungsfehler und
   wird beim Tempowechsel unübersichtlich; die absolute Formel ist beides
   nicht. */

let startZeit = 0;              // Audio-Uhr-Zeit von Schritt 0

/** Absolute Zeit eines Sechzehntels. */
function zeitVon(schritt) {
  const spb = 60 / bpm;
  const takt = Math.floor(schritt / proTakt());
  const imTakt = schritt % proTakt();
  const viertel = Math.floor(imTakt / 4);
  const sub = imTakt % 4;
  return startZeit + (takt * taktlaenge + viertel + subAnteil(sub, grooveOf(groove).gerade, swing)) * spb;
}

/** Nach einem Tempo- oder Groovewechsel neu verankern, damit der nächste
    Schritt dort liegt, wo er ohne Wechsel gelegen hätte. */
function verankere() {
  const soll = zeitVon(position);
  startZeit += naechsteZeit - soll;
}

/** Nächster Grundton, für die Anzeige. */
function naechsterGrund(takt) {
  const gesamt = progressionTakte(akkorde);
  return chordAtBar(akkorde, (takt + 1) % gesamt);
}

function spiele(e, zeit, spb) {
  if (e.typ === "bass") {
    if (spuren.bass) bass(zeit, e.midi, e.dauer * spb, e.amp * laut.bass);
  } else if (e.typ === "comp") {
    if (spuren.comp) comp(zeit, e.midis, Math.max(0.08, e.dauer * spb), e.amp * laut.comp, e.hell);
  } else if (spuren.becken && SCHLAGZEUG[e.typ]) {
    SCHLAGZEUG[e.typ](zeit, e.amp * laut.becken * 1.4, e.dauer ? e.dauer * spb : undefined);
  }
}

function schedule() {
  const ctx = audio();
  if (!akkorde.length) return;
  const spb = 60 / bpm;
  const gesamtTakte = progressionTakte(akkorde);

  while (naechsteZeit < ctx.currentTime + LOOKAHEAD_S) {
    // --- Einzähler: nur die Hi-Hat auf jedem Schlag, die Eins betont.
    if (position < vorlauf) {
      if (position % 4 === 0) {
        SCHLAGZEUG.hihat(naechsteZeit, (position === 0 ? 0.16 : 0.11) * Math.max(0.6, laut.becken), 0.07);
      }
      position++;
      naechsteZeit = zeitVon(position);
      continue;
    }
    const p = position - vorlauf;
    const imTakt = p % proTakt();
    const takt = Math.floor(p / proTakt());
    const taktImLoop = ((takt % gesamtTakte) + gesamtTakte) % gesamtTakte;
    const viertel = Math.floor(imTakt / 4);
    const sub = imTakt % 4;
    const hier = akkordAufSchlag(akkorde, taktImLoop, viertel, taktlaenge);

    for (const e of ereignisse(groove, { viertel, sub, taktImLoop, hier }, zustand)) {
      spiele(e, naechsteZeit, spb);
    }

    // --- Anzeige auf der Eins, zum klingenden Zeitpunkt
    if (imTakt === 0) {
      const payload = {
        takt: taktImLoop, akkord: hier.akkord,
        imTakt: akkordeImTakt(akkorde, taktImLoop, taktlaenge),
        naechster: naechsterGrund(taktImLoop),
        durchgang: Math.floor(takt / gesamtTakte),
        zeit: naechsteZeit,
      };
      setTimeout(() => { for (const fn of barWatchers) fn(payload); }, bisHoerbar(naechsteZeit));
    }

    position++;
    naechsteZeit = zeitVon(position);
  }
}

export function start() {
  if (running || !akkorde.length) return;
  const ctx = audio();
  running = true;
  position = 0;
  vorlauf = einzaehlen ? proTakt() : 0;
  zustand = {};
  startZeit = ctx.currentTime + 0.15;
  naechsteZeit = startZeit;
  timer = setInterval(schedule, TICK_MS);
  schedule();
  for (const fn of stateWatchers) fn({ running, bpm, swing, groove });
}

export function stop() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
  for (const fn of stateWatchers) fn({ running, bpm, swing, groove });
}

export function toggle() { running ? stop() : start(); }
