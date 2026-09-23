/* ==========================================================================
   Metronom mit vorausschauendem Scheduler

   setInterval ist für Klicks zu ungenau und wird vom Browser zusätzlich
   gedrosselt. Deshalb läuft ein Wecker alle 25 ms, der jeden Klick 100 ms im
   Voraus exakt auf die Audio-Uhr legt. Gehört wird die Audio-Uhr, nicht der
   Wecker — Ruckler im Hauptthread sind dadurch unhörbar.

   Kein DOM: wer die Zählzeit anzeigen will, hängt sich mit onBeat ein.
   ========================================================================== */

"use strict";

import { audio, bisHoerbar } from "./context.js";

const LOOKAHEAD_S = 0.1;
const TICK_MS = 25;

let running = false;
let timer = null;
let nextTime = 0;
let beat = 0;

let bpm = 60;
let beats = 4;
let subdivision = 1;       // 1 = Viertel, 2 = Achtel, 3 = Triolen, 4 = Sechzehntel
let accentFirst = true;
let sound = "klick";
let volume = 0.9;

const beatWatchers = new Set();
const stateWatchers = new Set();

/** fn({ beat, sub, time, accent }) — feuert genau dann, wenn der Klick klingt. */
export function onBeat(fn) { beatWatchers.add(fn); return () => beatWatchers.delete(fn); }
export function onStateChange(fn) { stateWatchers.add(fn); return () => stateWatchers.delete(fn); }

export const isRunning = () => running;
export const getBpm = () => bpm;
export const getBeats = () => beats;
export const getSubdivision = () => subdivision;

export function configure(opts = {}) {
  if (opts.bpm != null) bpm = Math.min(300, Math.max(20, Math.round(opts.bpm)));
  if (opts.beats != null) beats = Math.min(16, Math.max(1, Math.round(opts.beats)));
  if (opts.subdivision != null) subdivision = Math.min(4, Math.max(1, Math.round(opts.subdivision)));
  if (opts.accentFirst != null) accentFirst = !!opts.accentFirst;
  if (opts.sound != null) sound = opts.sound;
  if (opts.volume != null) volume = Math.min(1, Math.max(0, opts.volume));
  notifyState();
}

function notifyState() {
  const s = { running, bpm, beats, subdivision };
  for (const fn of stateWatchers) fn(s);
}

/* --- Klangerzeugung ------------------------------------------------------- */

// Drei Klangfarben: „klick“ ist ein kurzer Sinus, „holz“ klingt trockener,
// „zunge“ ist so kurz, dass man die eigene Artikulation dagegen hört.
const TONES = {
  klick: { accent: 1600, normal: 1050, sub: 780, decay: 0.05, type: "sine" },
  holz:  { accent: 2400, normal: 1400, sub: 900, decay: 0.03, type: "triangle" },
  zunge: { accent: 3200, normal: 2000, sub: 1200, decay: 0.015, type: "square" },
};

function click(time, level) {
  const ctx = audio();
  const t = TONES[sound] || TONES.klick;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = t.type;
  o.frequency.value = level === "accent" ? t.accent : level === "sub" ? t.sub : t.normal;
  const amp = (level === "accent" ? 0.5 : level === "sub" ? 0.16 : 0.3) * volume;
  g.gain.setValueAtTime(amp, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + t.decay);
  o.connect(g); g.connect(ctx.destination);
  o.start(time);
  o.stop(time + t.decay + 0.01);
}

/* --- Scheduler ------------------------------------------------------------ */

function schedule() {
  const ctx = audio();
  const stepDur = 60 / bpm / subdivision;

  while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
    const sub = beat % subdivision;
    const mainBeat = Math.floor(beat / subdivision) % beats;
    const level = sub !== 0 ? "sub" : (accentFirst && mainBeat === 0 ? "accent" : "normal");

    click(nextTime, level);

    // Die Anzeige wird per Timeout nachgezogen, damit sie mit dem Klang
    // zusammenfällt und nicht mit dem Scheduler.
    const payload = { beat: mainBeat, sub, time: nextTime, accent: level === "accent" };
    setTimeout(() => { for (const fn of beatWatchers) fn(payload); }, bisHoerbar(nextTime));

    beat++;
    nextTime += stepDur;
  }
}

export function start() {
  if (running) return;
  const ctx = audio();
  running = true;
  beat = 0;
  nextTime = ctx.currentTime + 0.08;
  timer = setInterval(schedule, TICK_MS);
  schedule();
  notifyState();
}

export function stop() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = null;
  notifyState();
}

export function toggle() { running ? stop() : start(); }

/**
 * Spielt einen Einzähler und ruft danach zurück. Für Übungen, bei denen der
 * Nutzer im Tempo einsteigen muss, statt kalt loszulegen.
 */
export function countIn(bars = 1, done = () => {}) {
  const ctx = audio();
  const stepDur = 60 / bpm;
  let t = ctx.currentTime + 0.12;
  const total = bars * beats;
  for (let i = 0; i < total; i++) {
    click(t, i % beats === 0 ? "accent" : "normal");
    const payload = { beat: i % beats, sub: 0, time: t, accent: i % beats === 0, countIn: true };
    setTimeout(() => { for (const fn of beatWatchers) fn(payload); }, bisHoerbar(t));
    t += stepDur;
  }
  setTimeout(done, bisHoerbar(t));
  return t;                     // Startzeitpunkt auf der Audio-Uhr
}
