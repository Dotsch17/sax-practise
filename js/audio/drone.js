/* ==========================================================================
   Bordunton

   Sägezahn plus zwei Teiltöne plus eine leicht verstimmte Verdopplung,
   durch einen Tiefpass. Ein reiner Sinus ist zum Einstimmen schlechter: ohne
   Obertöne hört man die Schwebung gegen das eigene Spiel viel schwerer.

   Kein DOM. Wer wissen will, was läuft, fragt current() oder hört auf
   onChange.
   ========================================================================== */

"use strict";

import { audio, ramp } from "./context.js";
import { midiToFreq } from "../music/theory.js";

let voice = null;          // { nodes, gain, midi }
let volume = 0.45;
const watchers = new Set();

const notify = () => { for (const fn of watchers) fn(current()); };

/** Registriert einen Zuhörer für Start und Stopp. Gibt die Abmeldung zurück. */
export function onChange(fn) { watchers.add(fn); return () => watchers.delete(fn); }

/** Welche MIDI-Tonhöhe klingt gerade? null wenn still. */
export const current = () => voice ? voice.midi : null;

export function setVolume(v01) {
  volume = Math.min(1, Math.max(0, v01));
  if (voice) ramp(voice.gain.gain, volume, 0.08);
}

/**
 * Startet den Bordun auf einer klingenden MIDI-Tonhöhe.
 * a4 kommt aus den Einstellungen, damit ein Orchester mit 442 Hz möglich ist.
 */
export function start(midi, a4 = 440) {
  stop(true);
  const ctx = audio();

  const gain = ctx.createGain();
  gain.gain.value = 0;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  lp.connect(gain);
  gain.connect(ctx.destination);

  const base = midiToFreq(midi, a4);
  // Grundton, Oktave, Quinte darüber, plus eine um 5 Cent verstimmte
  // Verdopplung. Die Verstimmung macht den Klang lebendig, ohne die
  // Tonhöhe hörbar zu verziehen.
  const parts = [[1, 1.0], [2, 0.34], [3, 0.16], [1.003, 0.5]];
  const nodes = parts.map(([mult, amp]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = base * mult;
    g.gain.value = amp * 0.16;
    o.connect(g); g.connect(lp);
    o.start();
    return o;
  });

  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.25);
  voice = { nodes, gain, midi };
  notify();
}

export function stop(silent = false) {
  if (!voice) return;
  const ctx = audio();
  const { gain, nodes } = voice;
  ramp(gain.gain, 0, 0.18);
  setTimeout(() => nodes.forEach(o => { try { o.stop(); } catch (e) {} }), 260);
  voice = null;
  if (!silent) notify();
}

/** Schaltet dieselbe Tonhöhe aus, eine andere um. */
export function toggle(midi, a4 = 440) {
  if (current() === midi) stop(); else start(midi, a4);
}
