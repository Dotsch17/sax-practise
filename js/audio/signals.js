/* ==========================================================================
   Signale und kurze Klangbeispiele

   Alles, was die App selbst vorspielt: Blockende, richtig, falsch, und die
   Töne für Gehörübungen. Kein DOM.
   ========================================================================== */

"use strict";

import { audio } from "./context.js";
import { midiToFreq } from "../music/theory.js";

/** Zwei steigende Töne am Blockende. Freundlich, nicht alarmierend. */
export function chime() {
  const ctx = audio(), t0 = ctx.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t = t0 + i * 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 1.2);
  });
}

function blip(freqs, dur = 0.12, gap = 0.09, type = "sine", amp = 0.25) {
  const ctx = audio();
  let t = ctx.currentTime + 0.01;
  for (const f of freqs) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
    t += gap;
  }
}

export const ok   = () => blip([784, 1175], 0.1, 0.07);
export const nope = () => blip([220, 175], 0.16, 0.12, "triangle", 0.2);

/* --- Töne für Gehörübungen ---------------------------------------------- */

// Ein Klang mit wenigen Teiltönen. Ein reiner Sinus ist zum Intervallhören
// zu körperlos; ein Sägezahn zu scharf, um Terzen sauber zu unterscheiden.
function voice(ctx, freq, t, dur, amp) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.02);
  g.gain.setValueAtTime(amp, t + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(ctx.destination);

  for (const [mult, a] of [[1, 1], [2, 0.3], [3, 0.12], [4, 0.06]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    og.gain.value = a;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

/** Spielt MIDI-Tonhöhen nacheinander. Gibt die Gesamtdauer in Sekunden. */
export function playMelody(midis, opts = {}) {
  const { noteDur = 0.55, gap = 0.05, a4 = 440, amp = 0.2, startIn = 0.05 } = opts;
  const ctx = audio();
  let t = ctx.currentTime + startIn;
  for (const m of midis) {
    voice(ctx, midiToFreq(m, a4), t, noteDur, amp);
    t += noteDur + gap;
  }
  return t - ctx.currentTime;
}

/** Spielt MIDI-Tonhöhen gleichzeitig, für Akkorde. */
export function playChord(midis, opts = {}) {
  const { dur = 1.6, a4 = 440, amp = 0.16 } = opts;
  const ctx = audio();
  const t = ctx.currentTime + 0.05;
  for (const m of midis) voice(ctx, midiToFreq(m, a4), t, dur, amp);
  return dur + 0.05;
}

/**
 * Spielt Töne zu festen Zeitpunkten der Audio-Uhr. Für alles, was mit einer
 * laufenden Begleitung zusammenpassen muss: `playMelody` rechnet relativ zu
 * „jetzt" und liefe dadurch gegen die Band aus dem Takt.
 *
 * noten: [{ midi, zeit, dauer }] — zeit und dauer in Sekunden.
 */
export function playAt(noten, opts = {}) {
  const { a4 = 440, amp = 0.22 } = opts;
  const ctx = audio();
  for (const nt of noten) {
    if (nt.zeit < ctx.currentTime - 0.05) continue;   // schon vorbei
    voice(ctx, midiToFreq(nt.midi, a4), Math.max(nt.zeit, ctx.currentTime),
          Math.max(0.08, nt.dauer), amp);
  }
}

/** Ein Referenzton, etwa als Ausgangspunkt einer Gehörübung. */
export function playNote(midi, opts = {}) {
  return playMelody([midi], { noteDur: 0.9, ...opts });
}
