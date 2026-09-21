/* ==========================================================================
   Signale und kurze Klangbeispiele

   Alles, was die App selbst vorspielt: Blockende, richtig, falsch, und die
   Töne für Gehörübungen. Kein DOM.

   Jeder vorgespielte Klang meldet sich an und wieder ab. Das kostet ein paar
   Zeilen und bringt zwei Dinge, die vorher fehlten: ein laufendes Vorspiel
   lässt sich jederzeit abbrechen, und die App weiß, ob gerade etwas klingt —
   ohne das steht man mit dem Instrument in der Hand da und sucht den Knopf,
   der die Melodie abschaltet, die man versehentlich zweimal gestartet hat.
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

/* --- Was gerade klingt ---------------------------------------------------- */

const aktiv = new Set();
const watchers = new Set();
let zuletzt = false;

/** Meldet sich, sobald ein Vorspiel beginnt oder endet. */
export function onPlayback(fn) { watchers.add(fn); return () => watchers.delete(fn); }
export const isPlaying = () => aktiv.size > 0;

function melde() {
  const jetzt = aktiv.size > 0;
  if (jetzt === zuletzt) return;
  zuletzt = jetzt;
  for (const fn of watchers) fn(jetzt);
}

/** Bricht ab, was die App gerade vorspielt. Kurze Signale bleiben unberührt. */
export function stopPlayback() {
  for (const s of [...aktiv]) s.stop();
  aktiv.clear();
  melde();
}

/* --- Töne für Gehörübungen ---------------------------------------------- */

// Ein Klang mit wenigen Teiltönen. Ein reiner Sinus ist zum Intervallhören
// zu körperlos; ein Sägezahn zu scharf, um Terzen sauber zu unterscheiden.
const MISCHUNG = [[1, 1], [2, 0.3], [3, 0.12], [4, 0.06]];

function voice(ctx, freq, t, dur, amp) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.02);
  g.gain.setValueAtTime(amp, t + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(ctx.destination);

  const stimmen = [];
  for (const [mult, a] of MISCHUNG) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    og.gain.value = a;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + dur + 0.05);
    stimmen.push(o);
  }

  // Abgebrochen wird über eine kurze Rampe, nicht hart: ein abgeschnittener
  // Sinus knackt, und zwar genau in dem Moment, in dem man hinhört.
  const stimme = {
    stop() {
      const jetzt = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(jetzt);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), jetzt);
        g.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.03);
        for (const o of stimmen) o.stop(jetzt + 0.05);
      } catch (e) { /* schon gestoppt */ }
    },
  };
  stimmen[0].addEventListener("ended", () => {
    if (aktiv.delete(stimme)) melde();
  });
  aktiv.add(stimme);
  melde();
  return stimme;
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
 * „jetzt“ und liefe dadurch gegen die Band aus dem Takt.
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

/**
 * Spielt exakte Frequenzen nacheinander. Für die Naturtonreihe: Teiltöne
 * liegen nicht auf Klaviertasten, und wer sie über die nächstgelegene
 * MIDI-Nummer vorspielt, gibt dem Spieler ein um bis zu 31 Cent falsches
 * Ziel ins Ohr — ausgerechnet beim siebten Teilton, der ohnehin der
 * schwierigste ist.
 */
export function playFreqs(freqs, opts = {}) {
  const { noteDur = 0.9, gap = 0.08, amp = 0.2, startIn = 0.05 } = opts;
  const ctx = audio();
  let t = ctx.currentTime + startIn;
  for (const f of freqs) {
    if (!(f > 0)) continue;
    voice(ctx, f, t, noteDur, amp);
    t += noteDur + gap;
  }
  return t - ctx.currentTime;
}

/** Eine einzelne Frequenz, lang genug zum Mitsingen. */
export const playFreq = (freq, opts = {}) => playFreqs([freq], { noteDur: 1.4, ...opts });

/**
 * Ein Ton, der stehen bleibt, bis man ihn abschaltet.
 *
 * Für die Obertonübung ist das der eigentlich nützliche Fall: man sucht ein
 * Voicing und braucht das Ziel dabei im Ohr, nicht vorher. Eine Sekunde
 * Vorspiel ist zum Prüfen gut und zum Finden zu kurz — wer den Ton noch
 * sucht, hat ihn längst wieder vergessen, bis er die Klappe gegriffen hat.
 *
 * Gibt einen Griff zurück, der ihn wieder ausmacht. Er hängt in derselben
 * Liste wie jedes andere Vorspiel und geht deshalb auch über den Streifen
 * „läuft gerade“ und über `stopPlayback()` aus.
 */
export function halteFreq(freq, opts = {}) {
  const { amp = 0.16 } = opts;
  if (!(freq > 0)) return { stop() {} };
  const ctx = audio();
  const t = ctx.currentTime + 0.02;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.08);
  g.connect(ctx.destination);

  const stimmen = [];
  for (const [mult, a] of MISCHUNG) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    og.gain.value = a;
    o.connect(og); og.connect(g);
    o.start(t);              // ohne Ende: er läuft, bis stop() kommt
    stimmen.push(o);
  }

  let aus = false;
  const stimme = {
    frequenz: freq,
    stop() {
      if (aus) return;
      aus = true;
      const jetzt = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(jetzt);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), jetzt);
        g.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.06);
        for (const o of stimmen) o.stop(jetzt + 0.1);
      } catch (e) { /* schon gestoppt */ }
      if (aktiv.delete(stimme)) melde();
    },
  };
  stimmen[0].addEventListener("ended", () => {
    if (aktiv.delete(stimme)) melde();
  });
  aktiv.add(stimme);
  melde();
  return stimme;
}
