/* ==========================================================================
   Aufnehmen

   Die ehrlichste Rückmeldung, die es gibt: sich selbst anhören. Keine
   Cent-Zahl sagt, ob eine Phrase trägt, ob die Time sitzt oder ob der Ton
   über eine Anlage durchkommen würde. Die Aufnahme sagt es, und sie sagt
   es schonungsloser als man im Spielen hört.

   Alle Aufbereitungen des Mikrofons sind aus. Pegelautomatik und
   Rauschfilter machen aus einem Saxophon etwas, das nach Telefon klingt,
   und genau das will man nicht beurteilen.

   Kein DOM. Läuft unter Capacitor genauso, dort gibt es MediaRecorder im
   WebView auch.
   ========================================================================== */

"use strict";

import { audio } from "./context.js";

let rec = null;
let stream = null;
let chunks = [];
let startedAt = 0;
let mime = "";
let source = null;
let analyser = null;
let buf = null;
let spitzeSeitStart = 0;

export const unterstuetzt = () =>
  typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export const laeuft = () => rec?.state === "recording";
export const sekunden = () => laeuft() ? (Date.now() - startedAt) / 1000 : 0;

/* Safari nimmt AAC in MP4 auf, Chrome und Firefox Opus in WebM. Die erste
   Form, die der Browser kann, gewinnt. */
function waehleFormat() {
  if (typeof MediaRecorder.isTypeSupported !== "function") return "";
  for (const m of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export async function starte() {
  if (laeuft()) return;
  if (!unterstuetzt()) throw new Error("Dieser Browser kann nicht aufnehmen.");
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });
  mime = waehleFormat();
  rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 128000 } : undefined);
  chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  startedAt = Date.now();

  // Pegel mitlesen, damit man Übersteuern sieht, bevor man es sich anhört.
  // Eine verzerrte Aufnahme ist wertlos, und bei einem Saxophon einen Meter
  // vor dem Telefon passiert das schnell.
  try {
    const ctx = audio();
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
  } catch (e) { analyser = null; }
  spitzeSeitStart = 0;
}

/** Aktueller Pegel: `rms` und `spitze` zwischen 0 und 1. */
export function pegel() {
  if (!analyser) return { rms: 0, spitze: 0, maxSpitze: spitzeSeitStart };
  analyser.getFloatTimeDomainData(buf);
  let s = 0, p = 0;
  for (const x of buf) { s += x * x; const a = Math.abs(x); if (a > p) p = a; }
  if (p > spitzeSeitStart) spitzeSeitStart = p;
  return { rms: Math.sqrt(s / buf.length), spitze: p, maxSpitze: spitzeSeitStart };
}

function aufraeumen() {
  try { source?.disconnect(); } catch (e) {}
  for (const t of stream?.getTracks() || []) t.stop();
  stream = null; source = null; analyser = null; buf = null; rec = null;
}

/** Hält an und liefert `{ blob, mime, dauer, spitze }`. */
export function stoppe() {
  return new Promise((resolve, reject) => {
    if (!rec) { reject(new Error("Es läuft keine Aufnahme.")); return; }
    const dauer = (Date.now() - startedAt) / 1000;
    const r = rec;
    r.onstop = () => {
      const typ = r.mimeType || mime || "audio/mp4";
      const blob = new Blob(chunks, { type: typ });
      const spitze = spitzeSeitStart;
      chunks = [];
      aufraeumen();
      resolve({ blob, mime: typ, dauer, spitze });
    };
    try { r.stop(); } catch (e) { aufraeumen(); reject(e); }
  });
}

/** Bricht ab, ohne etwas zu liefern. */
export function verwerfe() {
  if (!rec) return;
  rec.onstop = null;
  try { rec.stop(); } catch (e) {}
  chunks = [];
  aufraeumen();
}
