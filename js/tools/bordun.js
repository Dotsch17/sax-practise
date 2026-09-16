/* ==========================================================================
   Bordun

   Zwölf klingende Tonhöhen, zu jeder der zugehörige Griff am Alt. Die
   Zuordnung wird nie „vereinfacht“: das Altsaxophon ist in Es, der Griff ist
   die klingende Tonhöhe plus eine grosze Sexte. Wer hier schludert, übt
   monatelang gegen die falsche Tonhöhe.
   ========================================================================== */

"use strict";

import { $, $$, el } from "../core/dom.js";
import { state, setSetting } from "../core/store.js";
import * as drone from "../audio/drone.js";
import { chromatic, spell, toWritten, NAMING } from "../music/theory.js";

// Klingender Tonvorrat C3 bis H3. Das ist die Lage, in der ein Bordun trägt,
// ohne den eigenen Ton zu verdecken.
const FIRST = 48, COUNT = 12;

const naming = () => state().settings.naming === "en" ? NAMING.EN : NAMING.DE;

const chromaticSpell = midi => spell(chromatic(midi), naming());

function keyLabel(midi) {
  return { sounding: chromaticSpell(midi), written: chromaticSpell(toWritten(midi)) };
}

function render(root) {
  const vol = state().settings.droneVol;
  root.innerHTML = `
    <p class="hint">Klingende Tonhöhe, darunter der Griff am Alt.</p>
    <div class="keys" id="keys"></div>
    <div class="slider">
      <label for="drone-vol">Lautstärke</label>
      <input type="range" id="drone-vol" min="0" max="100" value="${vol}">
      <span class="slider-val" id="drone-vol-val">${vol}</span>
    </div>
    <button class="wide" id="drone-stop">Bordun aus</button>
    <p class="hint spaced">
      Hör auf die Schwebung gegen deinen Ton, nicht auf das Display.
      Wird sie langsamer, wirst du reiner.
    </p>`;

  renderKeys(root);

  const slider = $("#drone-vol", root);
  slider.addEventListener("input", e => {
    const v = Number(e.target.value);
    setSetting("droneVol", v);
    drone.setVolume(v / 100);
    $("#drone-vol-val", root).textContent = v;
  });
  $("#drone-stop", root).addEventListener("click", () => drone.stop());
}

function renderKeys(root) {
  const host = $("#keys", root);
  if (!host) return;
  const cur = drone.current();
  host.innerHTML = Array.from({ length: COUNT }, (_, i) => {
    const midi = FIRST + i;
    const { sounding, written } = keyLabel(midi);
    return `<button class="key" data-midi="${midi}" aria-pressed="${cur === midi}">
              <b>${sounding}</b><span>Griff ${written}</span>
            </button>`;
  }).join("");

  $$(".key", host).forEach(b => b.addEventListener("click", () =>
    drone.toggle(Number(b.dataset.midi), state().settings.a4)));
}

export default {
  id: "bordun",
  label: "Bordun",
  mount(root) {
    drone.setVolume(state().settings.droneVol / 100);
    render(root);
    this._off = drone.onChange(() => renderKeys(root));
  },
  unmount() { this._off?.(); },
};
