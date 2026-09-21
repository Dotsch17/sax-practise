/* ==========================================================================
   Der Session-Timer

   Es wird ein Zielzeitpunkt gespeichert und gegen die Systemuhr gerechnet,
   statt Sekunden herunterzuzählen. Sonst geht Zeit verloren, sobald der
   Browser die Seite drosselt — und das tut er, sobald sie in den Hintergrund
   geht.

   Der Wake Lock hält das Display wach, solange ein Timer läuft. Das ist die
   Gegenmasznahme dagegen, dass iOS Web Audio im Hintergrund abschaltet:
   bleibt der Bildschirm an, bleibt der Bordun an.
   ========================================================================== */

"use strict";

import { state, markBlockDone, addSpent } from "./store.js";
import { planFor } from "../data/plan.js";
import { emit } from "./dom.js";
import { chime } from "../audio/signals.js";

let T = { index: 0, running: false, endAt: 0, remaining: 0, tick: null };
let lastRecord = Date.now();
let wakeLock = null;

export const plan = () => planFor(state().kontext, state().week);
export const block = () => plan()[T.index] || plan()[0];
export const status = () => ({ ...T, block: block(), plan: plan() });

export function select(i) {
  stop();
  T.index = Math.max(0, Math.min(plan().length - 1, i));
  T.remaining = block().min * 60;
  emit("session:changed", status());
}

/** Springt auf den ersten Block, der heute noch offen ist. */
export function selectFirstOpen() {
  const p = plan();
  const i = p.findIndex(b => !state().day.done.includes(b.id));
  select(i >= 0 ? i : 0);
}

export function start() {
  if (T.running) return;
  if (T.remaining <= 0) T.remaining = block().min * 60;
  T.endAt = Date.now() + T.remaining * 1000;
  T.running = true;
  lastRecord = Date.now();
  T.tick = setInterval(tick, 200);
  requestWakeLock();
  emit("session:changed", status());
}

export function stop() {
  if (T.running) {
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
    recordSpent();
  }
  T.running = false;
  clearInterval(T.tick);
  T.tick = null;
  releaseWakeLock();
  emit("session:changed", status());
}

export const toggle = () => T.running ? stop() : start();

function recordSpent() {
  const secs = Math.round((Date.now() - lastRecord) / 1000);
  lastRecord = Date.now();
  addSpent(block().id, secs);
}

function tick() {
  T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
  emit("session:tick", status());
  if (T.remaining <= 0) {
    stop();
    chime();
    done(block().id);
    emit("session:blockdone", block());
  }
}

/** Hakt einen Block ab und springt auf den nächsten offenen. */
export function done(blockId) {
  markBlockDone(blockId);
  const p = plan();
  const next = p.findIndex(b => !state().day.done.includes(b.id));
  if (next >= 0) select(next); else emit("session:changed", status());
}

/* --- Wake Lock ------------------------------------------------------------ */

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
  } catch (e) { /* nicht kritisch: das Display geht dann eben aus */ }
}

function releaseWakeLock() {
  try { wakeLock?.release(); } catch (e) {}
  wakeLock = null;
}

// Nach dem Zurückkehren aus dem Hintergrund ist der Lock weg und muss neu
// angefordert werden.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && T.running) requestWakeLock();
});

/**
 * Hält den Bildschirm auch auszerhalb des Session-Timers wach, etwa während
 * einer Aufnahme oder eines Tonleiter-Durchgangs.
 */
export async function holdScreen() { await requestWakeLock(); }
export function releaseScreen() { if (!T.running) releaseWakeLock(); }
