/* ==========================================================================
   Der gemeinsame AudioContext

   Diese Schicht kennt kein DOM. Das ist keine Stilfrage: wenn iOS irgendwann
   blockierend wird, wird derselbe Code unter Capacitor weiterbenutzt, und
   dort gibt es kein document.

   iOS erlaubt Audio erst nach einer Nutzergeste, deshalb wird der Context
   verzögert geweckt und bei jeder Geste nachgeweckt — nach dem Sperren des
   Bildschirms steht er sonst auf "suspended" und bleibt stumm.
   ========================================================================== */

"use strict";

let ac = null;

export function audio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
  return ac;
}

export const now = () => audio().currentTime;

/** Läuft der Context? Für Anzeigen, die sonst still falsch wären. */
export const isRunning = () => !!ac && ac.state === "running";

/**
 * Weckt den Context bei der ersten Geste und danach bei jeder weiteren.
 * Ohne das zweite Wecken bleibt die App nach dem Entsperren stumm.
 */
export function installUnlock() {
  const wake = () => { try { audio(); } catch (e) { /* vor der Geste normal */ } };
  for (const ev of ["touchstart", "mousedown", "keydown"]) {
    document.addEventListener(ev, wake, { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ac) wake();
  });
}

/**
 * Hüllkurve mit weichem Ein- und Ausschwingen. Ein harter Sprung auf 0 gibt
 * ein hörbares Knacken, und das ist beim Üben mit Kopfhörern unangenehm.
 */
export function ramp(param, target, seconds, startAt = null) {
  const ctx = audio();
  const t = startAt ?? ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(target, t + seconds);
}
