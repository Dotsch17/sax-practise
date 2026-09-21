/* ==========================================================================
   Tonhöhenerkennung vom Mikrofon, nach YIN

   Warum YIN und nicht einfache Autokorrelation: Autokorrelation verwechselt
   regelmäßig den Grundton mit der Oktave darüber oder darunter. Beim
   Saxophon ist das fatal — der zweite Teilton ist oft lauter als der erste,
   besonders im pp und in der Tiefe. YIN normiert die Differenzfunktion
   kumulativ und wählt die erste, nicht die tiefste Senke; genau das
   verhindert den Oktavsprung.

   Zur Latenz: CLAUDE.md nennt unter 10 ms als Ziel. Das ist für die tiefen
   Töne physikalisch nicht erreichbar — für eine verlässliche Grundton-
   erkennung braucht es rund zwei Perioden, bei klingend Des3 sind das schon
   15 ms. Das Fenster hier ist 2048 Punkte, bei 48 kHz also gut 40 ms. Für
   ein Stimmgerät und für Tonanalyse ist das reichlich schnell; ein echter
   Regelkreis mit hörbarer Rückmeldung wäre etwas anderes.

   Kein DOM.
   ========================================================================== */

"use strict";

import { audio } from "./context.js";
import { freqToMidi } from "../music/theory.js";

const BUFFER = 2048;
const THRESHOLD = 0.12;      // YIN-Schwelle; kleiner heißt strenger
const MIN_HZ = 70;           // unter dem tiefsten klingenden Ton
const MAX_HZ = 1800;         // über dem höchsten Altissimo
const SILENCE_RMS = 0.006;   // darunter wird gar nicht erst gerechnet
const UPDATE_HZ = 30;

let stream = null;
let source = null;
let analyser = null;
let buf = null;
let spekBuf = null;
let mitSpektrum = false;
let raf = null;
let lastRun = 0;
let history = [];            // für den Median, gegen Zappeln

const watchers = new Set();

export const isActive = () => !!analyser;
export function onPitch(fn) { watchers.add(fn); return () => watchers.delete(fn); }

/* --- YIN ------------------------------------------------------------------ */

/**
 * Gibt die Periode in Abtastwerten zurück, oder -1. `clarity` ist 1 minus
 * der normierten Differenz an der Senke: 1 ist ein perfekt periodisches
 * Signal, unter etwa 0,8 wird es unzuverlässig.
 */
export function yin(x, sampleRate, threshold = THRESHOLD) {
  const maxTau = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(x.length / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const W = Math.floor(x.length / 2);

  // Schritt 1 und 2: Differenzfunktion und kumulative Normierung in einem Zug.
  const d = new Float32Array(maxTau + 1);
  let runningSum = 0;
  const dPrime = new Float32Array(maxTau + 1);
  dPrime[0] = 1;

  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const delta = x[i] - x[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
    runningSum += sum;
    dPrime[tau] = runningSum === 0 ? 1 : sum * tau / runningSum;
  }

  // Schritt 3: die erste Senke unter der Schwelle, nicht die tiefste.
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (dPrime[t] < threshold) {
      // Bis zum lokalen Minimum weiterlaufen, sonst sitzt man auf der Flanke.
      while (t + 1 <= maxTau && dPrime[t + 1] < dPrime[t]) t++;
      tau = t;
      break;
    }
  }
  // Nichts unter der Schwelle: das globale Minimum als Notnagel, aber mit
  // der schlechten clarity, die es verdient.
  if (tau === -1) {
    let best = minTau;
    for (let t = minTau; t <= maxTau; t++) if (dPrime[t] < dPrime[best]) best = t;
    if (dPrime[best] > 0.6) return { tau: -1, clarity: 0 };
    tau = best;
  }

  // Schritt 4: parabolische Feininterpolation. Ohne sie rastet die Anzeige
  // in Stufen ein, die bei hohen Tönen mehrere Cent betragen.
  let betterTau = tau;
  if (tau > 0 && tau < maxTau) {
    const s0 = dPrime[tau - 1], s1 = dPrime[tau], s2 = dPrime[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) betterTau = tau + (s2 - s0) / denom;
  }

  return { tau: betterTau, clarity: Math.max(0, Math.min(1, 1 - dPrime[tau])) };
}

export function rmsOf(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/* --- Mikrofon ------------------------------------------------------------- */

/**
 * Fragt das Mikrofon an und startet die Erkennung.
 * Wirft, wenn der Nutzer ablehnt oder kein sicherer Kontext vorliegt.
 *
 * `opts.spektrum` schaltet die Spektrumauswertung dazu: spektraler
 * Schwerpunkt und die Stärke der ersten Teiltöne. Die kostet rund tausend
 * Rechenschritte je Bild und wird deshalb nur eingeschaltet, wo sie
 * gebraucht wird — für ein Stimmgerät ist sie sinnlos.
 */
export async function start(opts = {}) {
  mitSpektrum = !!opts.spektrum;
  if (analyser) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Dieser Browser gibt kein Mikrofon her.");
  }

  // Alle drei Aufbereitungen abschalten: Echounterdrückung, Rauschfilter und
  // Pegelautomatik verbiegen genau die Eigenschaften, die hier gemessen
  // werden sollen.
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });

  const ctx = audio();
  source = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = BUFFER;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  // Bewusst nicht an die Ausgabe hängen — sonst pfeift es.

  buf = new Float32Array(analyser.fftSize);
  spekBuf = new Float32Array(analyser.frequencyBinCount);
  history = [];
  lastRun = 0;
  loop();
}

export function stop() {
  cancelAnimationFrame(raf);
  raf = null;
  try { source?.disconnect(); } catch (e) {}
  for (const t of stream?.getTracks() || []) t.stop();
  stream = null; source = null; analyser = null; buf = null; spekBuf = null;
  history = [];
  for (const fn of watchers) fn(null);
}

function loop() {
  raf = requestAnimationFrame(loop);
  const now = performance.now();
  if (now - lastRun < 1000 / UPDATE_HZ) return;
  lastRun = now;

  const ctx = audio();
  analyser.getFloatTimeDomainData(buf);
  const rms = rmsOf(buf);

  if (rms < SILENCE_RMS) {
    history = [];
    for (const fn of watchers) fn({ rms, freq: null, clarity: 0, silent: true });
    return;
  }

  const { tau, clarity } = yin(buf, ctx.sampleRate);
  if (tau <= 0 || clarity < 0.5) {
    for (const fn of watchers) fn({ rms, freq: null, clarity, silent: false });
    return;
  }

  const freq = ctx.sampleRate / tau;

  // Median über die letzten Messungen. Ein Mittelwert würde von einem
  // einzelnen Ausreißer mitgezogen, der Median nicht.
  history.push(freq);
  if (history.length > 5) history.shift();
  const sorted = [...history].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Streuung der letzten Messungen in Cent: das ist die Stabilität des Tons,
  // und damit die eigentlich interessante Zahl beim Üben langer Töne.
  const spread = history.length > 1
    ? 1200 * Math.log2(sorted[sorted.length - 1] / sorted[0])
    : 0;

  const payload = {
    rms,
    freq: median,
    raw: freq,
    clarity,
    spreadCents: spread,
    silent: false,
    midiExact: freqToMidi(median),
  };

  if (mitSpektrum) {
    analyser.getFloatFrequencyData(spekBuf);
    Object.assign(payload, spektrum(spekBuf, ctx.sampleRate, median));
  }

  for (const fn of watchers) fn(payload);
}

/* --- Spektrum ---------------------------------------------------------------- */

/**
 * Spektraler Schwerpunkt und die Stärke der ersten Teiltöne.
 *
 * Der Schwerpunkt ist das gewichtete Mittel aller Frequenzen — er sagt, wie
 * hell der Klang ist. Beim Üben langer Töne ist nicht sein Wert interessant,
 * sondern seine Ruhe: flackert er, wackeln Ansatz oder Luft, und zwar bevor
 * man es hört.
 *
 * `dB` ist, was getFloatFrequencyData liefert; gerechnet wird linear.
 */
export function spektrum(dB, sampleRate, f0) {
  const binHz = sampleRate / 2 / dB.length;
  let summe = 0, gewichtet = 0;

  for (let i = 1; i < dB.length; i++) {
    // Unter -90 dB ist nur Rauschen; das würde den Schwerpunkt nach oben
    // ziehen, weil hohe Bins zahlreicher sind als tiefe.
    if (dB[i] < -90) continue;
    const m = Math.pow(10, dB[i] / 20);
    summe += m;
    gewichtet += m * i * binHz;
  }
  const centroid = summe > 0 ? gewichtet / summe : 0;

  // Teiltonstärken, jeweils das Maximum in einem kleinen Fenster um k*f0 —
  // der Grundton liegt selten exakt auf einer Binmitte.
  const harmonische = [];
  if (f0 > 0) {
    for (let k = 1; k <= 8; k++) {
      const bin = Math.round(k * f0 / binHz);
      if (bin >= dB.length - 1) { harmonische.push(0); continue; }
      let best = -Infinity;
      for (let j = Math.max(1, bin - 2); j <= Math.min(dB.length - 1, bin + 2); j++) {
        if (dB[j] > best) best = dB[j];
      }
      harmonische.push(Math.pow(10, best / 20));
    }
    // Auf den Grundton beziehen: absolute Pegel hängen am Abstand zum
    // Mikrofon, die Verhältnisse nicht.
    const bezug = harmonische[0] || 1e-9;
    for (let k = 0; k < harmonische.length; k++) harmonische[k] /= bezug;
  }

  return { centroid, harmonische };
}
