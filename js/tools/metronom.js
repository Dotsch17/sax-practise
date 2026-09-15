/* ==========================================================================
   Metronom

   Gegenüber der ersten Fassung dazugekommen: Unterteilung, Klangfarbe,
   Tap-Tempo und eine Tempo-Rampe. Die Rampe ist das eigentliche Übewerkzeug —
   eine Stelle wird nicht dadurch schneller, dass man sie schnell übt, sondern
   dadurch, dass man das Tempo in kleinen Schritten anhebt und jede Stufe
   sauber spielt.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, setSetting } from "../core/store.js";
import * as metro from "../audio/metronome.js";

const SUBS = [
  { v: 1, label: "♩", name: "Viertel" },
  { v: 2, label: "♫", name: "Achtel" },
  { v: 3, label: "³", name: "Triolen" },
  { v: 4, label: "♬", name: "Sechzehntel" },
];
const SOUNDS = [
  { v: "klick", label: "Klick" },
  { v: "holz", label: "Holz" },
  { v: "zunge", label: "Zunge" },
];

let ramp = null;      // { fromBpm, toBpm, stepBpm, bars, barsLeft }
let tapTimes = [];

function render(root) {
  const s = state().settings;
  root.innerHTML = `
    <div class="bpm">
      <button class="step" id="bpm-minus" aria-label="Langsamer">−</button>
      <div class="val" id="bpm-val">${s.bpm}</div>
      <button class="step" id="bpm-plus" aria-label="Schneller">+</button>
    </div>
    <div class="slider">
      <label for="bpm-range">Tempo</label>
      <input type="range" id="bpm-range" min="30" max="240" value="${s.bpm}">
    </div>
    <div class="slider">
      <label for="beats-range">Takt</label>
      <input type="range" id="beats-range" min="1" max="8" value="${s.beats}">
      <span class="slider-val" id="beats-val">${s.beats}</span>
    </div>
    <div class="beats" id="beats"></div>

    <div class="chips" role="group" aria-label="Unterteilung">
      ${SUBS.map(x => `<button class="chip" data-sub="${x.v}" title="${x.name}">${x.label}</button>`).join("")}
    </div>

    <button class="wide" id="metro-toggle" aria-pressed="false">Metronom starten</button>

    <div class="row2">
      <button id="tap">Tempo tippen</button>
      <button id="ramp-open">Tempo-Rampe</button>
    </div>

    <div id="ramp-box" class="panel" hidden>
      <p class="hint">
        Spielt eine Stelle so lange in einem Tempo, bis die eingestellte Zahl
        Takte vorbei ist, und hebt dann an. Wenn etwas nicht sauber wird,
        gehst du eine Stufe zurück — nicht weiter hinauf.
      </p>
      <div class="grid3">
        <label>Von<input type="number" id="ramp-from" min="30" max="240" value="${Math.max(30, s.bpm - 20)}"></label>
        <label>Bis<input type="number" id="ramp-to" min="30" max="240" value="${Math.min(240, s.bpm + 20)}"></label>
        <label>Schritt<input type="number" id="ramp-step" min="1" max="20" value="4"></label>
        <label>Takte<input type="number" id="ramp-bars" min="1" max="32" value="4"></label>
      </div>
      <button class="wide" id="ramp-start">Rampe starten</button>
      <p class="hint" id="ramp-status"></p>
    </div>

    <h2>Klangfarbe</h2>
    <div class="chips" role="group" aria-label="Klangfarbe">
      ${SOUNDS.map(x => `<button class="chip" data-sound="${x.v}">${x.label}</button>`).join("")}
    </div>
    <p class="hint">
      „Zunge" ist so kurz, dass du deine eigene Artikulation dagegen hörst —
      gut für Block 6.
    </p>`;

  renderBeats(root);
  syncChips(root);
  metro.configure({ bpm: s.bpm, beats: s.beats, sound: s.metroSound });

  const setBpm = v => {
    const bpm = clamp(Math.round(v), 30, 240);
    setSetting("bpm", bpm);
    metro.configure({ bpm });
    $("#bpm-val", root).textContent = bpm;
    $("#bpm-range", root).value = bpm;
  };

  $("#bpm-minus", root).addEventListener("click", () => setBpm(state().settings.bpm - 1));
  $("#bpm-plus", root).addEventListener("click", () => setBpm(state().settings.bpm + 1));
  $("#bpm-range", root).addEventListener("input", e => setBpm(Number(e.target.value)));

  $("#beats-range", root).addEventListener("input", e => {
    const b = Number(e.target.value);
    setSetting("beats", b);
    metro.configure({ beats: b });
    $("#beats-val", root).textContent = b;
    renderBeats(root);
  });

  $$("[data-sub]", root).forEach(b => b.addEventListener("click", () => {
    metro.configure({ subdivision: Number(b.dataset.sub) });
    syncChips(root);
  }));

  $$("[data-sound]", root).forEach(b => b.addEventListener("click", () => {
    setSetting("metroSound", b.dataset.sound);
    metro.configure({ sound: b.dataset.sound });
    syncChips(root);
  }));

  $("#metro-toggle", root).addEventListener("click", () => metro.toggle());

  $("#tap", root).addEventListener("click", () => {
    const now = performance.now();
    // Länger als zwei Sekunden Pause heiszt: neue Messung.
    tapTimes = tapTimes.filter(t => now - t < 2000);
    tapTimes.push(now);
    if (tapTimes.length >= 2) {
      const gaps = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setBpm(60000 / avg);
    }
    if (tapTimes.length > 6) tapTimes.shift();
  });

  $("#ramp-open", root).addEventListener("click", () => {
    const box = $("#ramp-box", root);
    box.hidden = !box.hidden;
  });

  $("#ramp-start", root).addEventListener("click", () => startRamp(root));
}

function renderBeats(root) {
  const host = $("#beats", root);
  if (!host) return;
  host.innerHTML = Array.from({ length: state().settings.beats },
    (_, i) => `<i class="${i === 0 ? "accent" : ""}"></i>`).join("");
}

function syncChips(root) {
  $$("[data-sub]", root).forEach(b =>
    b.classList.toggle("on", Number(b.dataset.sub) === metro.getSubdivision()));
  $$("[data-sound]", root).forEach(b =>
    b.classList.toggle("on", b.dataset.sound === state().settings.metroSound));
}

/* --- Tempo-Rampe ---------------------------------------------------------- */

function startRamp(root) {
  const g = id => Number($("#" + id, root).value);
  const from = clamp(g("ramp-from"), 30, 240);
  const to = clamp(g("ramp-to"), 30, 240);
  const step = clamp(g("ramp-step"), 1, 20);
  const bars = clamp(g("ramp-bars"), 1, 32);
  if (to <= from) { toast("Das Zieltempo muss höher sein"); return; }

  ramp = { from, to, step, bars, barsLeft: bars, bpm: from };
  setSetting("bpm", from);
  metro.configure({ bpm: from });
  $("#bpm-val", root).textContent = from;
  $("#bpm-range", root).value = from;
  if (!metro.isRunning()) metro.start();
  updateRampStatus(root);
}

function rampOnBar(root) {
  if (!ramp) return;
  ramp.barsLeft--;
  if (ramp.barsLeft > 0) { updateRampStatus(root); return; }
  ramp.bpm = Math.min(ramp.to, ramp.bpm + ramp.step);
  ramp.barsLeft = ramp.bars;
  metro.configure({ bpm: ramp.bpm });
  setSetting("bpm", ramp.bpm);
  const v = $("#bpm-val", root), r = $("#bpm-range", root);
  if (v) v.textContent = ramp.bpm;
  if (r) r.value = ramp.bpm;
  if (ramp.bpm >= ramp.to) {
    toast("Zieltempo erreicht: " + ramp.to);
    ramp = null;
  }
  updateRampStatus(root);
}

function updateRampStatus(root) {
  const s = $("#ramp-status", root);
  if (!s) return;
  s.textContent = ramp
    ? `${ramp.bpm} bpm · noch ${ramp.barsLeft} ${ramp.barsLeft === 1 ? "Takt" : "Takte"} bis ${Math.min(ramp.to, ramp.bpm + ramp.step)}`
    : "";
}

export default {
  id: "metronom",
  label: "Metronom",
  mount(root) {
    render(root);
    const offBeat = metro.onBeat(({ beat, sub, accent }) => {
      if (sub !== 0) return;
      const els = $$("#beats i", root);
      els.forEach(e => e.classList.remove("on"));
      if (els[beat]) els[beat].classList.add("on");
      if (beat === 0 && ramp) rampOnBar(root);
    });
    const offState = metro.onStateChange(({ running }) => {
      const b = $("#metro-toggle", root);
      if (!b) return;
      b.textContent = running ? "Metronom stoppen" : "Metronom starten";
      b.setAttribute("aria-pressed", String(running));
      if (!running) $$("#beats i", root).forEach(e => e.classList.remove("on"));
    });
    this._off = () => { offBeat(); offState(); };
  },
  unmount() { this._off?.(); ramp = null; },
};
