/* ==========================================================================
   Stimmgerät

   Zwei Dinge, die ein gekauftes Stimmgerät nicht kann und die hier den
   Unterschied machen:

   1. Es zeigt Griff und klingende Tonhöhe gleichzeitig. Am Es-Instrument ist
      das der Unterschied zwischen „ich spiele ein A" und „im Raum kommt ein
      C an", und Verwechslungen davon kosten im Ensemble Nerven.

   2. Es merkt sich, welche Töne du wie verstimmst. Der Block „Intonation"
      sagt „Abweichende Töne notieren" — das macht die App jetzt von selbst.
      Nach ein paar Sessions steht da, ob dein tiefes Des wirklich zu tief
      ist oder ob du es dir nur einbildest.

   Wichtig fürs Üben: Die Anzeige ist ein Kontrollmittel, kein Übemittel.
   Wer aufs Display schaut, hört nicht. Deshalb gibt es den Referenzton —
   stimm nach der Schwebung und prüf danach mit dem Auge.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import * as pitch from "../audio/pitch.js";
import * as drone from "../audio/drone.js";
import { holdScreen, releaseScreen } from "../core/session.js";
import {
  centsOff, midiToFreq, toWritten, toSounding, fromMidi, spell, NAMING,
} from "../music/theory.js";

const DRILL = "stimmgeraet:noten";
const STABLE_CENTS = 12;      // enger gilt als gehaltener Ton
const HOLD_MS = 600;          // so lange muss er stehen, bevor er zählt

let hold = { midi: null, since: 0, cents: [] };
let running = false;

const FLAT_PCS = new Set([1, 3, 8, 10]);
const naming = () => state().settings.naming === "en" ? NAMING.EN : NAMING.DE;
const name = midi => spell(
  fromMidi(midi, FLAT_PCS.has(((midi % 12) + 12) % 12) ? "flat" : "sharp"), naming());

/* --- Ansicht --------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div class="tuner" id="tuner">
      <div class="tuner-note" id="t-note">—</div>
      <div class="tuner-alt" id="t-alt">Mikrofon aus</div>

      <div class="tuner-scale" aria-hidden="true">
        <div class="tuner-ticks">
          ${[-50, -25, 0, 25, 50].map(c =>
            `<i class="${c === 0 ? "mid" : ""}" style="left:${50 + c}%"></i>`).join("")}
        </div>
        <div class="tuner-needle" id="t-needle"></div>
        <div class="tuner-target"></div>
      </div>
      <div class="tuner-cents" id="t-cents">
        <span id="t-cents-num">–</span> <small>Cent</small>
      </div>

      <div class="tuner-meta">
        <span id="t-freq">—</span>
        <span id="t-stab">—</span>
      </div>
    </div>

    <button class="wide primary" id="t-toggle">Mikrofon einschalten</button>
    <div class="row2">
      <button id="t-ref">Referenzton</button>
      <button id="t-clear">Karte leeren</button>
    </div>
    <p class="hint spaced" id="t-hint">
      Der Ton braucht einen Moment, bis er steht. Erst dann zählt er für die
      Intonationskarte.
    </p>

    <h2>Deine Intonation</h2>
    <p class="hint">
      Mittlere Abweichung je Ton, über alle Messungen. Nach rechts heiszt zu
      hoch, nach links zu tief. Was hier nicht steht, hast du noch nicht lange
      genug gehalten.
    </p>
    <div id="t-map"></div>`;

  renderMap(root);

  $("#t-toggle", root).addEventListener("click", () => toggleMic(root));
  $("#t-ref", root).addEventListener("click", () => {
    const m = hold.midi;
    if (m == null) { toast("Erst einen Ton spielen"); return; }
    // Der Referenzton klingt in der Lage, in der er gespielt wird.
    drone.toggle(toSounding(m), state().settings.a4);
  });
  $("#t-clear", root).addEventListener("click", () => {
    const d = drill(DRILL, {});
    for (const k of Object.keys(d)) delete d[k];
    save();
    renderMap(root);
    toast("Intonationskarte geleert");
  });
}

async function toggleMic(root) {
  const btn = $("#t-toggle", root);
  if (running) {
    pitch.stop();
    drone.stop();
    releaseScreen();
    running = false;
    btn.textContent = "Mikrofon einschalten";
    btn.classList.add("primary");
    $("#t-alt", root).textContent = "Mikrofon aus";
    return;
  }
  btn.disabled = true;
  try {
    await pitch.start();
    running = true;
    holdScreen();
    btn.textContent = "Mikrofon ausschalten";
    btn.classList.remove("primary");
  } catch (e) {
    console.warn(e);
    // Der häufigste Fall ist kein Fehler, sondern eine Absage — und der
    // zweithäufigste ist fehlendes HTTPS.
    const grund = location.protocol === "https:" || location.hostname === "localhost"
      ? "Ohne Mikrofonfreigabe geht es nicht."
      : "Das Mikrofon braucht HTTPS. Über eine reine IP-Adresse geht es nicht.";
    $("#t-hint", root).textContent = grund;
    toast("Kein Mikrofon");
  } finally {
    btn.disabled = false;
  }
}

/* --- Messung verarbeiten ---------------------------------------------------- */

function onPitch(root, p) {
  const noteEl = $("#t-note", root);
  if (!noteEl) return;
  const altEl = $("#t-alt", root);
  const needle = $("#t-needle", root);
  const centsEl = $("#t-cents-num", root);
  const freqEl = $("#t-freq", root);
  const stabEl = $("#t-stab", root);
  const tuner = $("#tuner", root);

  if (!p || !p.freq) {
    tuner.classList.remove("in-tune");
    if (p && p.silent) {
      noteEl.textContent = "—";
      altEl.textContent = running ? "hört zu" : "Mikrofon aus";
      centsEl.textContent = "–";
      freqEl.textContent = "—";
      stabEl.textContent = "—";
      needle.style.left = "50%";
    }
    hold = { midi: null, since: 0, cents: [] };
    return;
  }

  const a4 = state().settings.a4;
  const { midi: soundingMidi, cents } = centsOff(p.freq, a4);
  const writtenMidi = toWritten(soundingMidi);
  const zeigeGriff = state().settings.pitchView === "written";

  const haupt = zeigeGriff ? writtenMidi : soundingMidi;
  const neben = zeigeGriff ? soundingMidi : writtenMidi;

  noteEl.textContent = name(haupt);
  altEl.textContent = (zeigeGriff ? "klingend " : "Griff ") + name(neben);

  needle.style.left = clamp(50 + cents, 2, 98) + "%";
  centsEl.textContent = (cents > 0 ? "+" : "") + cents;
  freqEl.textContent = p.freq.toFixed(1) + " Hz · Ziel " + midiToFreq(soundingMidi, a4).toFixed(1);
  stabEl.textContent = "± " + Math.round(p.spreadCents) + " Cent";

  // „Rein" heiszt hier unter 5 Cent. Enger ist beim Blasinstrument
  // Selbstbetrug: allein das Anblasen bewegt die Tonhöhe um mehr.
  tuner.classList.toggle("in-tune", Math.abs(cents) <= 5);

  collect(root, writtenMidi, cents, p.spreadCents);
}

/** Sammelt nur, was wirklich gehalten wurde. */
function collect(root, writtenMidi, cents, spread) {
  const now = performance.now();
  if (hold.midi !== writtenMidi) {
    hold = { midi: writtenMidi, since: now, cents: [] };
    return;
  }
  if (spread > STABLE_CENTS) { hold.since = now; hold.cents = []; return; }
  hold.cents.push(cents);
  if (now - hold.since < HOLD_MS) return;

  // Ein Eintrag je gehaltenem Ton, nicht je Bild — sonst zählt ein langer
  // Ton fünfzigmal und verzerrt den Mittelwert.
  const mittel = hold.cents.reduce((a, b) => a + b, 0) / hold.cents.length;
  addSample(writtenMidi, mittel);
  hold = { midi: writtenMidi, since: now + 1e9, cents: [] };   // erst bei Tonwechsel wieder
  renderMap(root);
}

/** Laufender Mittelwert und Streuung nach Welford — ohne wachsende Listen. */
function addSample(midi, cents) {
  const d = drill(DRILL, {});
  const k = String(midi);
  const e = d[k] || (d[k] = { n: 0, mean: 0, m2: 0, min: cents, max: cents });
  e.n++;
  const delta = cents - e.mean;
  e.mean += delta / e.n;
  e.m2 += delta * (cents - e.mean);
  e.min = Math.min(e.min, cents);
  e.max = Math.max(e.max, cents);
  save();
}

/* --- Intonationskarte ------------------------------------------------------- */

function renderMap(root) {
  const host = $("#t-map", root);
  if (!host) return;
  const d = drill(DRILL, {});
  const rows = Object.entries(d)
    .map(([k, v]) => ({ midi: Number(k), ...v }))
    .filter(r => r.n >= 2)
    .sort((a, b) => a.midi - b.midi);

  if (!rows.length) {
    host.innerHTML = `<p class="empty">Noch nichts gemessen. Halte einen Ton eine
      halbe Sekunde ruhig, dann erscheint er hier.</p>`;
    return;
  }

  const auffaellig = rows.filter(r => Math.abs(r.mean) >= 10);
  host.innerHTML = rows.map(r => {
    const abw = Math.round(r.mean);
    const sd = r.n > 1 ? Math.sqrt(r.m2 / (r.n - 1)) : 0;
    const links = abw < 0;
    const breite = Math.min(50, Math.abs(abw) / 50 * 50);
    return `<div class="into-row">
      <span class="into-note">${name(r.midi)}</span>
      <span class="into-bar">
        <i class="mid"></i>
        <i class="fill" style="${links ? `right:50%;width:${breite}%` : `left:50%;width:${breite}%`}"></i>
      </span>
      <span class="into-val">${abw > 0 ? "+" : ""}${abw}</span>
      <span class="into-n">±${Math.round(sd)} · ${r.n}×</span>
    </div>`;
  }).join("") + (auffaellig.length ? `
    <p class="hint spaced">
      Deutlich daneben: ${auffaellig.map(r =>
        `${name(r.midi)} ${Math.round(r.mean) > 0 ? "+" : ""}${Math.round(r.mean)}`).join(", ")}.
      Diese Töne gehören in den Block „Intonation" — mit Bordun, chromatisch
      gebunden, und auf die Schwebung hören statt aufs Display.
    </p>` : "");
}

export default {
  id: "stimmgeraet",
  label: "Stimmgerät",
  mount(root) {
    render(root);
    this._off = pitch.onPitch(p => onPitch(root, p));
  },
  unmount() {
    this._off?.();
    if (running) { pitch.stop(); releaseScreen(); running = false; }
  },
};
