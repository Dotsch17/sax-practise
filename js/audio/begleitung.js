/* ==========================================================================
   Begleitung: Bass, Comping, Becken

   Derselbe vorausschauende Scheduler wie beim Metronom — ein Wecker alle
   25 ms legt die nächsten 200 ms exakt auf die Audio-Uhr. Gehört wird die
   Audio-Uhr; Ruckler im Hauptthread sind unhörbar.

   Swing ist kein Schalter, sondern ein Verhältnis: das „und" liegt bei
   geradem Spiel auf 0,5 und bei vollem Swing auf 0,667 der Zählzeit.
   Dazwischen ist alles erlaubt, und genau das braucht man beim Üben —
   ein Blues bei 200 swingt weniger als einer bei 100.

   Der Bass geht bewusst nicht nach Zufall. Eine Basslinie, die den nächsten
   Grundton nicht ansteuert, klingt nach Zufallsgenerator und hilft beim
   Hören der Harmonie nicht. Deshalb: Grundton auf Eins, Akkordtöne in der
   Mitte, Leitton auf Vier.

   Kein DOM.
   ========================================================================== */

"use strict";

import { audio } from "./context.js";
import { midiToFreq, toMidi } from "../music/theory.js";
import { QUALITIES, chordAtBar, progressionTakte } from "../music/harmonie.js";

const LOOKAHEAD_S = 0.2;
const TICK_MS = 25;

let running = false;
let timer = null;
let naechsteZeit = 0;
let position = 0;          // Achtelschritte seit dem Start
let akkorde = [];
let bpm = 120;
let swing = 0.62;
let a4 = 440;
let taktlaenge = 4;
let laut = { bass: 0.9, comp: 0.55, becken: 0.5 };
let spuren = { bass: true, comp: true, becken: true };

const barWatchers = new Set();
export function onBar(fn) { barWatchers.add(fn); return () => barWatchers.delete(fn); }
const stateWatchers = new Set();
export function onStateChange(fn) { stateWatchers.add(fn); return () => stateWatchers.delete(fn); }

export const isRunning = () => running;
export const getBpm = () => bpm;
export const getTakt = () => Math.floor(position / (taktlaenge * 2));

export function configure(opts = {}) {
  const tempoWechsel = (opts.bpm != null && opts.bpm !== bpm) ||
                       (opts.swing != null && opts.swing !== swing);
  if (opts.akkorde) akkorde = opts.akkorde;
  if (opts.bpm != null) bpm = Math.min(300, Math.max(30, Math.round(opts.bpm)));
  if (opts.swing != null) swing = Math.min(0.7, Math.max(0.5, opts.swing));
  if (opts.a4 != null) a4 = opts.a4;
  if (opts.taktlaenge != null) taktlaenge = opts.taktlaenge;
  if (opts.laut) laut = { ...laut, ...opts.laut };
  if (opts.spuren) spuren = { ...spuren, ...opts.spuren };
  if (tempoWechsel && running) verankere();
  for (const fn of stateWatchers) fn({ running, bpm, swing });
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
  g.gain.exponentialRampToValueAtTime(amp * 0.5, time + 0.09);
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

/** Comping: weiche Akkordfläche, kurz angeschlagen. */
function comp(time, midis, dauer, amp) {
  const ctx = audio();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;

  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(amp, time + 0.02);
  g.gain.exponentialRampToValueAtTime(amp * 0.35, time + dauer * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);

  midis.forEach((m, i) => {
    for (const [mult, a] of [[1, 1], [2, 0.22], [3, 0.08]]) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "triangle";
      // Die Stimmen minimal gegeneinander verstimmen, sonst klingt der
      // Akkord wie ein Orgelregister statt wie ein Instrument.
      o.frequency.value = midiToFreq(m, a4) * mult * (1 + (i - 1) * 0.0008);
      og.gain.value = a / midis.length;
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

function becken(time, amp, hell = true, dauer = 0.25) {
  const ctx = audio();
  const src = ctx.createBufferSource();
  src.buffer = rauschen();
  src.playbackRate.value = hell ? 1.6 : 1;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = hell ? 7000 : 5200;

  const g = ctx.createGain();
  g.gain.setValueAtTime(amp, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dauer);

  src.connect(hp); hp.connect(g); g.connect(ctx.destination);
  src.start(time); src.stop(time + dauer + 0.02);
}

/* --- Linien bauen ------------------------------------------------------------ */

/** Nächster Grundton, damit der Bass ihn ansteuern kann. */
function naechsterGrund(takt) {
  const gesamt = progressionTakte(akkorde);
  return chordAtBar(akkorde, (takt + 1) % gesamt);
}

/**
 * Vier Viertel Bass für einen Takt. Grundton auf Eins, Akkordtöne dazwischen,
 * auf Vier ein Halbton- oder Quintschritt zum nächsten Grundton. Das ist die
 * Regel, nach der Bassisten wirklich spielen, und sie macht die Harmonie
 * hörbar statt nur satt.
 */
function bassTakt(akkord, takt) {
  const q = QUALITIES[akkord.q];
  const grund = toMidi(akkord.root);
  // In eine bequeme Basslage bringen: unteres E bis oberes G.
  let r = grund;
  while (r > 52) r -= 12;
  while (r < 40) r += 12;

  const terz = r + q.steps[1];
  const quinte = r + q.steps[2];
  const sept = r + q.steps[3];

  const zielRoh = toMidi(naechsterGrund(takt).root);
  let ziel = zielRoh;
  while (ziel > r + 7) ziel -= 12;
  while (ziel < r - 5) ziel += 12;

  // Auf Vier von oben oder unten einen Halbton an das Ziel heran.
  const leitton = ziel + (Math.random() < 0.5 ? 1 : -1);

  const mitte = Math.random() < 0.5 ? [terz, quinte] : [quinte, sept];
  return [r, mitte[0], mitte[1], leitton];
}

/** Comping-Voicing: Terz und Septime plus Quinte, in der Mitte gelegen. */
function voicing(akkord) {
  const q = QUALITIES[akkord.q];
  let r = toMidi(akkord.root);
  while (r > 60) r -= 12;
  while (r < 52) r += 12;
  return [r + q.steps[1], r + q.steps[2], r + q.steps[3]];
}

/* --- Scheduler ---------------------------------------------------------------
   Jeder Schritt wird absolut aus dem Startzeitpunkt gerechnet, nicht
   fortlaufend addiert. Inkrementelles Addieren summiert Rundungsfehler und
   wird beim Tempowechsel unübersichtlich; die absolute Formel ist beides
   nicht. */

let startZeit = 0;              // Audio-Uhr-Zeit von Schritt 0
let bassLinie = [40, 40, 40, 40];

/** Absolute Zeit eines Achtelschritts. Das „und" rutscht nach hinten, wenn
    geswingt wird — bei 0,5 gerade, bei 0,667 voller Swing. */
function zeitVon(schritt) {
  const spb = 60 / bpm;
  const proTakt = taktlaenge * 2;
  const takt = Math.floor(schritt / proTakt);
  const imTakt = schritt % proTakt;
  const viertel = Math.floor(imTakt / 2);
  const und = imTakt % 2;
  return startZeit + takt * taktlaenge * spb + viertel * spb + (und ? swing * spb : 0);
}

/** Nach einem Tempowechsel neu verankern, damit der nächste Schritt dort
    liegt, wo er ohne Wechsel gelegen hätte. */
function verankere() {
  const soll = zeitVon(position);
  startZeit += naechsteZeit - soll;
}

function schedule() {
  const ctx = audio();
  if (!akkorde.length) return;
  const spb = 60 / bpm;
  const gesamtTakte = progressionTakte(akkorde);
  const proTakt = taktlaenge * 2;

  while (naechsteZeit < ctx.currentTime + LOOKAHEAD_S) {
    const imTakt = position % proTakt;
    const takt = Math.floor(position / proTakt);
    const taktImLoop = ((takt % gesamtTakte) + gesamtTakte) % gesamtTakte;
    const akkord = chordAtBar(akkorde, taktImLoop);
    const viertel = Math.floor(imTakt / 2);
    const istUnd = imTakt % 2 === 1;

    // --- Bass: auf jedem Viertel
    if (spuren.bass && !istUnd) {
      if (viertel === 0) bassLinie = bassTakt(akkord, taktImLoop);
      bass(naechsteZeit, bassLinie[viertel % bassLinie.length], spb * 0.92, 0.18 * laut.bass);
    }

    // --- Becken: Ride auf 1, 2, 2-und, 3, 4, 4-und; Hi-Hat auf 2 und 4
    if (spuren.becken) {
      if (!istUnd) {
        becken(naechsteZeit, (viertel === 0 ? 0.10 : 0.07) * laut.becken, true, 0.22);
        if (viertel === 1 || viertel === 3) {
          becken(naechsteZeit, 0.09 * laut.becken, false, 0.09);
        }
      } else if (viertel === 1 || viertel === 3) {
        becken(naechsteZeit, 0.05 * laut.becken, true, 0.16);
      }
    }

    // --- Comping: auf zwei und vier, plus ein Anschlag auf die Eins beim
    //     Akkordwechsel, damit der Wechsel hörbar ist.
    if (spuren.comp && !istUnd) {
      const wechsel = viertel === 0 && taktImLoop === akkord.abTakt;
      if (wechsel || viertel === 1 || viertel === 3) {
        comp(naechsteZeit, voicing(akkord), spb * (wechsel ? 1.2 : 0.7),
             (wechsel ? 0.10 : 0.07) * laut.comp);
      }
    }

    // --- Anzeige auf der Eins, zum klingenden Zeitpunkt
    if (imTakt === 0) {
      const payload = {
        takt: taktImLoop, akkord,
        naechster: naechsterGrund(taktImLoop),
        durchgang: Math.floor(takt / gesamtTakte),
        zeit: naechsteZeit,
      };
      const delay = Math.max(0, (naechsteZeit - ctx.currentTime) * 1000);
      setTimeout(() => { for (const fn of barWatchers) fn(payload); }, delay);
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
  bassLinie = bassTakt(chordAtBar(akkorde, 0), 0);
  startZeit = ctx.currentTime + 0.15;
  naechsteZeit = startZeit;
  timer = setInterval(schedule, TICK_MS);
  schedule();
  for (const fn of stateWatchers) fn({ running, bpm, swing });
}

export function stop() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
  for (const fn of stateWatchers) fn({ running, bpm, swing });
}

export function toggle() { running ? stop() : start(); }
