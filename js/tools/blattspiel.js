/* ==========================================================================
   Blattspiel

   Vom-Blatt-Spiel ist eine Prüfungsdisziplin und eine eigene Fähigkeit. Sie
   wird nicht besser, indem man Stücke übt, sondern indem man regelmäszig
   Unbekanntes einmal durchspielt — ohne anzuhalten, ohne zu korrigieren.

   Deshalb ist der Ablauf hier bewusst streng: ansehen, Tempo wählen,
   einzählen, durchspielen. Erst danach darf man vergleichen. Wer vorher
   übt, übt nicht Blattspiel.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, setSetting, drill, recordDrill } from "../core/store.js";
import { generateMelodie, spannweite, STUFEN } from "../music/melodie.js";
import { renderStaff, autoBeam } from "../music/notation.js";
import { MAJOR_KEYS, toMidi, toSounding, spell } from "../music/theory.js";
import { playMelody } from "../audio/signals.js";
import { audio } from "../audio/context.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let sel = { stufe: 2, keyIndex: 0, takte: 4, beats: 4 };
let stueck = null;
let lauf = null;
let verdeckt = false;

const drillId = () => `blattspiel:${sel.stufe}`;

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const d = drill(drillId(), { gespielt: 0, sauber: 0 });
  // Das Tempo ist eine gemeinsame Einstellung, aber jedes Werkzeug hat
  // seinen eigenen sinnvollen Bereich. Ohne Klemmen zeigt der Regler 140 und
  // die Zahl daneben 180.
  const bpm = clamp(state().settings.bpm, 40, 140);
  if (bpm !== state().settings.bpm) setSetting("bpm", bpm);
  root.innerHTML = `
    <div class="chips scroll" id="b-stufen" role="group" aria-label="Stufe"></div>
    <p class="hint" id="b-beschreibung"></p>

    <div class="staff-wrap" id="b-staff"></div>
    <p class="hint" id="b-info"></p>

    <div class="slider">
      <label for="b-bpm">Tempo</label>
      <input type="range" id="b-bpm" min="40" max="140" value="${bpm}">
      <span class="slider-val"><span id="b-bpm-val">${bpm}</span> bpm</span>
    </div>

    <button class="wide primary" id="b-los">Einzählen und durchspielen</button>
    <div class="row2">
      <button id="b-neu">Neues Stück</button>
      <button id="b-vergleich">Vergleichen</button>
    </div>

    <div id="b-nachher" hidden>
      <div class="panel">
        <p class="hint" style="margin:0 0 10px">
          Ohne Anhalten durchgekommen? Ein Fehler zählt nicht — Stehenbleiben zählt.
        </p>
        <div class="row2">
          <button id="b-ok">Durchgekommen</button>
          <button id="b-nok">Hängengeblieben</button>
        </div>
      </div>
    </div>

    <p class="hint spaced">
      ${d.gespielt ? `${d.sauber} von ${d.gespielt} Durchläufen ohne Anhalten.` : ""}
      Das Stück steht im Griff, nicht klingend — so, wie du es liest.
      Beim Vergleichen klingt es eine grosze Sexte tiefer, das ist richtig so.
    </p>`;

  renderStufen(root);
  neu(root);

  $("#b-bpm", root).addEventListener("input", e => {
    const v = Number(e.target.value);
    setSetting("bpm", v);
    $("#b-bpm-val", root).textContent = v;
  });
  $("#b-neu", root).addEventListener("click", () => neu(root));
  $("#b-los", root).addEventListener("click", () => los(root));
  $("#b-vergleich", root).addEventListener("click", () => vergleiche(root));
  $("#b-ok", root).addEventListener("click", () => bewerte(root, true));
  $("#b-nok", root).addEventListener("click", () => bewerte(root, false));
}

function renderStufen(root) {
  const host = $("#b-stufen", root);
  host.innerHTML = "";
  for (const s of STUFEN) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => { sel.stufe = s.id; render(root); } },
    }));
  }
}

function neu(root) {
  // Die Tonart wechselt mit — beim Blattspiel ist der Wechsel der Tonart
  // ein wesentlicher Teil der Schwierigkeit.
  const erlaubt = sel.stufe <= 2 ? 5 : sel.stufe === 3 ? 9 : MAJOR_KEYS.length;
  sel.keyIndex = Math.floor(Math.random() * erlaubt);
  sel.takte = sel.stufe <= 2 ? 4 : 8;

  const key = MAJOR_KEYS[sel.keyIndex];
  stueck = generateMelodie({
    tonic: key.tonic, stufe: sel.stufe, takte: sel.takte, beats: sel.beats,
  });
  verdeckt = false;
  $("#b-nachher", root).hidden = true;

  const st = STUFEN.find(s => s.id === sel.stufe);
  $("#b-beschreibung", root).textContent = st ? st.beschreibung : "";

  const toene = stueck.noten.filter(n => n.pitch).map(n => n.pitch);
  const tiefster = toene.reduce((a, b) => toMidi(b) < toMidi(a) ? b : a);
  const hoechster = toene.reduce((a, b) => toMidi(b) > toMidi(a) ? b : a);
  $("#b-info", root).textContent =
    `${key.name} · ${sel.takte} Takte · Umfang ${spell(tiefster)}${tiefster.octave}` +
    ` bis ${spell(hoechster)}${hoechster.octave}`;

  zeichne(root);
}

function zeichne(root) {
  if (!stueck) return;
  $("#b-staff", root).innerHTML = renderStaff({
    notes: autoBeam(stueck.noten.map(n => ({ ...n })), 1),
    keySig: stueck.keySig,
    timeSig: [sel.beats, 4],
    ariaLabel: "Blattspielübung",
    extraClass: "compact",
  });
}

/* --- Ablauf ------------------------------------------------------------------ */

function los(root) {
  if (!stueck || lauf) return;
  const ctx = audio();
  const bpm = state().settings.bpm;
  const spv = 60 / bpm;
  const startZeit = ctx.currentTime + 0.2 + sel.beats * spv;

  // Einzähler plus durchlaufender Puls, aus einer Zeitbasis.
  for (let i = 0; i < sel.beats; i++) puls(startZeit - (sel.beats - i) * spv, i === 0);
  const dauer = stueck.noten.reduce((a, n) => a + (n.barline ? 0 : n.dur * (n.dots ? 1.5 : 1)), 0);
  for (let i = 0; i < Math.ceil(dauer); i++) puls(startZeit + i * spv, i % sel.beats === 0);

  const btn = $("#b-los", root);
  btn.disabled = true;
  btn.textContent = "läuft …";
  holdScreen();

  lauf = setTimeout(() => {
    lauf = null;
    releaseScreen();
    btn.disabled = false;
    btn.textContent = "Einzählen und durchspielen";
    $("#b-nachher", root).hidden = false;
  }, (startZeit - ctx.currentTime + dauer * spv + 0.5) * 1000);
}

function puls(time, betont) {
  const ctx = audio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = betont ? 1600 : 1050;
  g.gain.setValueAtTime(betont ? 0.36 : 0.2, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start(time); o.stop(time + 0.07);
}

function vergleiche(root) {
  if (!stueck) return;
  const bpm = state().settings.bpm;
  const spv = 60 / bpm;
  const a4 = state().settings.a4;
  const ctx = audio();
  let t = ctx.currentTime + 0.15;

  for (const nt of stueck.noten) {
    if (nt.barline) continue;
    const laenge = nt.dur * (nt.dots ? 1.5 : 1) * spv;
    if (nt.pitch) {
      // Klingend abspielen: eine grosze Sexte unter dem Griff.
      playMelody([toSounding(toMidi(nt.pitch))], {
        noteDur: Math.max(0.12, laenge * 0.85), gap: 0, a4,
        startIn: t - ctx.currentTime,
      });
    }
    t += laenge;
  }
}

function bewerte(root, sauber) {
  const d = drill(drillId(), { gespielt: 0, sauber: 0 });
  recordDrill(drillId(), {
    gespielt: (d.gespielt || 0) + 1,
    sauber: (d.sauber || 0) + (sauber ? 1 : 0),
  });
  toast(sauber
    ? "Notiert. Beim nächsten Mal eine Stufe höher oder schneller."
    : "Notiert. Geh mit dem Tempo herunter — durchkommen schlägt schnell.");
  $("#b-nachher", root).hidden = true;
  neu(root);
}

export default {
  id: "blattspiel",
  label: "Blattspiel",
  mount(root) { render(root); },
  unmount() {
    if (lauf) { clearTimeout(lauf); lauf = null; releaseScreen(); }
  },
};
