/* ==========================================================================
   Improvisation

   Die Begleitung klingt **klingend**, die Anzeige steht **gegriffen**. Über
   einem klingenden C7 liest du A7 und spielst A-mixolydisch. Wer das
   verwechselt, übt über die falschen Töne und merkt es nicht, weil die
   Begleitung ja richtig klingt — das ist der teuerste Fehler, den ein
   Es-Instrument beim Improvisieren machen kann. Deshalb steht die klingende
   Tonart nur klein daneben.

   Beim Spielen kann man nur hinschauen, nicht lesen. Also: der Akkord ist
   riesig, der nächste steht daneben, und darunter kommt genau eine Sache —
   je nach Modus die Skala, die Zieltöne, die Akkordtöne oder ein Muster.
   Vier Anzeigen gleichzeitig wären null Anzeigen.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, setSetting, drill, recordDrill } from "../core/store.js";
import {
  PROGRESSIONS, QUALITIES, PATTERNS, buildProgression, progressionTakte,
  chordPitches, guidePitches, scalePitches, chordSymbol, applyPattern,
} from "../music/harmonie.js";
import {
  toWritten, toMidi, chromatic, spell, majorKeySignature, writtenKeySignature,
  fromMidi, keySignature,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const MODI = [
  { id: "skala", label: "Skala", was: "Die naheliegende Tonleiter zum Akkord." },
  { id: "ziel", label: "Zieltöne", was: "Nur Terz und Septime. Spiel ausschließlich diese zwei Töne je Akkord — das klingt schon nach Musik, lange bevor Skalen sitzen." },
  { id: "akkord", label: "Akkordtöne", was: "Grundton, Terz, Quinte, Septime. Damit triffst du immer richtig." },
  { id: "muster", label: "Muster", was: "Ein Baustein, durch die Akkorde geschoben." },
];

// Klingende Tonarten. Für ein Es-Instrument sind die bequemen Blues-Tonarten
// klingend B, Es und F — gegriffen also G, C und D.
const TONARTEN = [
  { pc: 10, name: "B" }, { pc: 3, name: "Es" }, { pc: 5, name: "F" },
  { pc: 0, name: "C" }, { pc: 7, name: "G" }, { pc: 2, name: "D" },
  { pc: 9, name: "A" }, { pc: 4, name: "E" }, { pc: 11, name: "H" },
  { pc: 6, name: "Fis" }, { pc: 1, name: "Des" }, { pc: 8, name: "As" },
];

let sel = {
  prog: "dur251", tonartIdx: 0, modus: "ziel", muster: "akkord1357",
  tempo: 120, swing: 0.62,
  spuren: { bass: true, comp: true, becken: true },
};
let akkorde = [];
let aktuell = null;
let offBar = null, offState = null;

const progOf = () => PROGRESSIONS.find(p => p.id === sel.prog) || PROGRESSIONS[0];

/** Ein klingender Akkord, wie er gegriffen gelesen wird. */
function gegriffen(akkord) {
  const w = toWritten(toMidi(akkord.root));
  // Die Schreibweise des Griffs folgt der gegriffenen Tonart, damit über
  // klingend Es7 ein C7 steht und kein H♯7.
  const sig = writtenKeySignature(majorKeySignature(akkord.root));
  const root = { ...fromMidi(w, sig < 0 ? "flat" : "sharp"), octave: akkord.root.octave + 1 };
  return { ...akkord, root, symbol: chordSymbol(root, akkord.q) };
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const p = progOf();
  root.innerHTML = `
    <div class="chips scroll" id="im-prog" role="group" aria-label="Akkordfolge"></div>
    <p class="hint" id="im-was"></p>

    <div class="jetzt">
      <div class="jetzt-kopf">
        <span class="jetzt-takt" id="im-takt"></span>
        <span class="jetzt-naechst" id="im-naechst"></span>
      </div>
      <div class="jetzt-akkord" id="im-akkord">—</div>
      <div class="jetzt-unter" id="im-klingend"></div>
      <div class="formleiste" id="im-form"></div>
    </div>

    <div class="chips scroll" id="im-modi" role="group" aria-label="Was angezeigt wird"></div>
    <div class="chips scroll" id="im-muster" role="group" aria-label="Muster" hidden></div>
    <div class="staff-wrap" id="im-staff"></div>
    <p class="hint" id="im-farbe"></p>

    <button class="wide primary" id="im-los">Begleitung starten</button>

    <div class="grid3">
      <label>Tonart, klingend
        <select id="im-tonart">
          ${TONARTEN.map((t, i) => `<option value="${i}">${t.name}</option>`).join("")}
        </select>
      </label>
      <label>Tempo
        <input type="number" id="im-tempo" min="40" max="280" value="${sel.tempo}">
      </label>
    </div>

    <div class="slider">
      <label for="im-swing">Swing</label>
      <input type="range" id="im-swing" min="50" max="67" value="${Math.round(sel.swing * 100)}">
      <span class="slider-val" id="im-swing-val"></span>
    </div>

    <div class="chips" id="im-spuren" role="group" aria-label="Spuren"></div>

    <p class="hint spaced">
      Die Begleitung klingt in der gewählten Tonart. Angezeigt wird, was du
      greifst — eine große Sexte höher. Das ist kein Fehler, sondern der
      ganze Witz am Es-Instrument.
    </p>`;

  renderProgChips(root);
  renderModusChips(root);
  renderMusterChips(root);
  renderSpuren(root);
  $("#im-tonart", root).value = String(sel.tonartIdx);
  $("#im-swing-val", root).textContent = swingText();
  baue(root);

  $("#im-tonart", root).addEventListener("change", e => {
    sel.tonartIdx = Number(e.target.value); baue(root);
  });
  $("#im-tempo", root).addEventListener("change", e => {
    sel.tempo = clamp(Number(e.target.value) || 120, 40, 280);
    e.target.value = sel.tempo;
    band.configure({ bpm: sel.tempo });
  });
  $("#im-swing", root).addEventListener("input", e => {
    sel.swing = Number(e.target.value) / 100;
    band.configure({ swing: sel.swing });
    $("#im-swing-val", root).textContent = swingText();
  });
  $("#im-los", root).addEventListener("click", () => {
    if (band.isRunning()) { band.stop(); releaseScreen(); }
    else { band.configure({ akkorde, bpm: sel.tempo, swing: sel.swing, a4: state().settings.a4, spuren: sel.spuren }); band.start(); holdScreen(); }
  });
}

const swingText = () => sel.swing <= 0.51 ? "gerade"
  : sel.swing >= 0.66 ? "voll" : Math.round(sel.swing * 100) + " %";

function renderProgChips(root) {
  const host = $("#im-prog", root);
  host.innerHTML = "";
  for (const p of PROGRESSIONS) {
    host.append(el("button", {
      class: "chip" + (p.id === sel.prog ? " on" : ""),
      text: p.name,
      on: { click: () => { sel.prog = p.id; sel.tempo = p.tempo; render(root); } },
    }));
  }
}

function renderModusChips(root) {
  const host = $("#im-modi", root);
  host.innerHTML = "";
  for (const m of MODI) {
    host.append(el("button", {
      class: "chip" + (m.id === sel.modus ? " on" : ""),
      text: m.label,
      on: { click: () => { sel.modus = m.id; renderModusChips(root); renderMusterChips(root); zeigeAkkord(root); } },
    }));
  }
}

function renderMusterChips(root) {
  const host = $("#im-muster", root);
  host.hidden = sel.modus !== "muster";
  host.innerHTML = "";
  if (host.hidden) return;
  for (const m of PATTERNS) {
    host.append(el("button", {
      class: "chip" + (m.id === sel.muster ? " on" : ""),
      text: m.name,
      on: { click: () => { sel.muster = m.id; renderMusterChips(root); zeigeAkkord(root); } },
    }));
  }
}

function renderSpuren(root) {
  const host = $("#im-spuren", root);
  host.innerHTML = "";
  for (const [id, label] of [["bass", "Bass"], ["comp", "Akkorde"], ["becken", "Becken"]]) {
    host.append(el("button", {
      class: "chip" + (sel.spuren[id] ? " on" : ""),
      text: label,
      on: { click: () => {
        sel.spuren[id] = !sel.spuren[id];
        band.configure({ spuren: sel.spuren });
        renderSpuren(root);
      } },
    }));
  }
}

function baue(root) {
  const p = progOf();
  akkorde = buildProgression(p, TONARTEN[sel.tonartIdx].pc);
  sel.tempo = sel.tempo || p.tempo;
  $("#im-was", root).textContent = p.was;
  band.configure({ akkorde, bpm: sel.tempo, swing: sel.swing, a4: state().settings.a4, spuren: sel.spuren });
  aktuell = { takt: 0, akkord: akkorde[0], naechster: akkorde[1 % akkorde.length] };
  renderForm(root);
  zeigeAkkord(root);
}

function renderForm(root) {
  const host = $("#im-form", root);
  const gesamt = progressionTakte(akkorde);
  host.innerHTML = Array.from({ length: gesamt },
    (_, i) => `<i data-takt="${i}"></i>`).join("");
}

function zeigeAkkord(root) {
  if (!aktuell) return;
  const a = aktuell.akkord;
  const g = gegriffen(a);
  const q = QUALITIES[a.q];

  $("#im-akkord", root).textContent = g.symbol;
  $("#im-klingend", root).textContent = `klingt ${a.symbol}`;
  $("#im-takt", root).textContent = `Takt ${aktuell.takt + 1} von ${progressionTakte(akkorde)}`;
  const n = aktuell.naechster ? gegriffen(aktuell.naechster) : null;
  $("#im-naechst", root).textContent = n && n.symbol !== g.symbol ? `dann ${n.symbol}` : "";

  // Die Vorzeichnung folgt der gegriffenen Tonart des Stücks, nicht der des
  // Einzelakkords — sonst wechselt sie mitten im Chorus.
  const tonikaKlingend = akkorde[0].root;
  const sig = writtenKeySignature(majorKeySignature(tonikaKlingend));

  let toene, beschriftung;
  if (sel.modus === "skala") {
    toene = scalePitches(g.root, a.q);
    beschriftung = toene.map(p => spell(p));
  } else if (sel.modus === "ziel") {
    toene = guidePitches(g.root, a.q);
    beschriftung = ["Terz", "Septime"];
  } else if (sel.modus === "akkord") {
    toene = chordPitches(g.root, a.q);
    beschriftung = ["1", "3", "5", "7"];
  } else {
    const muster = PATTERNS.find(m => m.id === sel.muster) || PATTERNS[0];
    toene = applyPattern(scalePitches(g.root, a.q), muster.stufen);
    beschriftung = toene.map(p => spell(p));
  }

  // In eine spielbare Lage bringen: um den Bereich um das notierte G5 herum.
  const versetzt = inLage(toene);

  $("#im-staff", root).innerHTML = renderStaff({
    keySig: sig,
    notes: pitchesToNotes(versetzt, sel.modus === "ziel" ? DUR.halbe : DUR.viertel,
      { accidentalsFor: sig, labels: beschriftung }),
    extraClass: "compact",
    ariaLabel: g.symbol,
  });

  const m = MODI.find(x => x.id === sel.modus);
  const musterInfo = sel.modus === "muster"
    ? " " + (PATTERNS.find(x => x.id === sel.muster) || {}).was : "";
  $("#im-farbe", root).innerHTML =
    `<strong>${q.skalaName}.</strong> ${q.farbe}<br>${m.was}${musterInfo}`;
}

/** Hebt oder senkt oktavweise, bis die Töne bequem im System liegen. */
function inLage(toene) {
  if (!toene.length) return toene;
  const tief = Math.min(...toene.map(toMidi));
  let shift = 0;
  while (tief + shift < 62) shift += 12;     // nicht unter notiertes D4
  while (tief + shift > 74) shift -= 12;     // nicht über notiertes D5
  if (!shift) return toene;
  return toene.map(p => ({ ...p, octave: p.octave + shift / 12 }));
}

/* --- Takt-Rückmeldung --------------------------------------------------------- */

function aufTakt(root, info) {
  aktuell = info;
  zeigeAkkord(root);
  const felder = $$("#im-form i", root);
  felder.forEach((f, i) => f.classList.toggle("on", i === info.takt));
  // Der laufende Takt soll sichtbar bleiben, auch bei zwölf Feldern.
  const aktivesFeld = felder[info.takt];
  if (aktivesFeld) aktivesFeld.scrollIntoView({ inline: "center", block: "nearest" });
}

export default {
  id: "improvisation",
  label: "Improvisation",
  mount(root) {
    render(root);
    offBar = band.onBar(info => aufTakt(root, info));
    offState = band.onStateChange(({ running }) => {
      const b = $("#im-los", root);
      if (!b) return;
      b.textContent = running ? "Begleitung stoppen" : "Begleitung starten";
      b.classList.toggle("primary", !running);
      if (!running) $$("#im-form i", root).forEach(f => f.classList.remove("on"));
    });
  },
  unmount() {
    offBar?.(); offState?.();
    band.stop();
    releaseScreen();
  },
};
