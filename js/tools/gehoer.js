/* ==========================================================================
   Gehörbildung

   Wichtig und leicht zu verwechseln: hier wird in klingenden Tonhöhen
   gearbeitet, nicht in Griffen. Die Gehörprüfung wird am Klavier abgenommen,
   und wer sich beim Hören das Es-Instrument dazudenkt, rechnet unter Druck
   zweimal und verliert Zeit. Der Griff steht auf Wunsch daneben, aber er ist
   nicht die Hauptsache.

   Die Auswahl der Aufgaben ist bewusst nicht gleichverteilt: was zuletzt
   falsch war, kommt öfter. Ohne das übt man endlos die Quinte, die man
   ohnehin kann, und nie den Tritonus.
   ========================================================================== */

"use strict";

import { $, $$, el, toast } from "../core/dom.js";
import { state, drill, scoreDrill, save } from "../core/store.js";
import {
  INTERVALS, CHORDS, SCALES, buildChord, buildScale, chromatic, toMidi,
  spell, toWritten, intervalFrom,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { playMelody, playChord, ok as sigOk, nope as sigNope } from "../audio/signals.js";

/* --- Übungsarten ----------------------------------------------------------- */

const STUFEN = {
  intervalle: [
    { id: "leicht", label: "Leicht", auswahl: [0, 5, 7, 12, 4, 3] },
    { id: "mittel", label: "Mittel", auswahl: [0, 2, 3, 4, 5, 7, 9, 12] },
    { id: "alle", label: "Alle", auswahl: INTERVALS.map(i => i.semitones) },
  ],
  akkorde: [
    { id: "leicht", label: "Leicht", auswahl: ["dur", "moll"] },
    { id: "mittel", label: "Mittel", auswahl: ["dur", "moll", "vermindert", "uebermaessig"] },
    { id: "alle", label: "Alle", auswahl: Object.keys(CHORDS) },
  ],
  skalen: [
    { id: "leicht", label: "Leicht", auswahl: ["dur", "moll_natur"] },
    { id: "mittel", label: "Mittel", auswahl: ["dur", "moll_natur", "moll_harmonisch", "pentatonik_dur"] },
    { id: "alle", label: "Alle", auswahl: ["dur", "moll_natur", "moll_harmonisch", "moll_melodisch",
      "dorisch", "mixolydisch", "lydisch", "phrygisch", "blues", "ganzton", "pentatonik_dur"] },
  ],
};

const ARTEN = [
  { id: "intervalle", label: "Intervalle" },
  { id: "akkorde", label: "Akkorde" },
  { id: "skalen", label: "Skalen" },
  { id: "richtung", label: "Höher oder tiefer" },
];

let sel = { art: "intervalle", stufe: "leicht", harmonisch: false };
let aufgabe = null;   // { antwort, midis, zeige }
let beantwortet = false;

const drillId = () => `gehoer:${sel.art}:${sel.stufe}`;
const fehlerId = () => `gehoer:fehler:${sel.art}`;
const stufenFor = art => STUFEN[art] || [{ id: "leicht", label: "Leicht", auswahl: [] }];
const stufeObj = () => stufenFor(sel.art).find(s => s.id === sel.stufe) || stufenFor(sel.art)[0];

/* --- Aufgabe bauen ---------------------------------------------------------- */

/** Ein Grundton in bequemer Lage: klingend G3 bis G4. */
const zufallsGrundton = () => 55 + Math.floor(Math.random() * 13);

/**
 * Wählt gewichtet: was zuletzt falsch war, kommt öfter dran. Ohne das übt
 * man die Quinte, die man kann, und nie den Tritonus.
 */
function waehle(auswahl) {
  const f = drill(fehlerId(), {});
  const gewichte = auswahl.map(a => 1 + (f[String(a)] || 0) * 3);
  const summe = gewichte.reduce((x, y) => x + y, 0);
  let w = Math.random() * summe;
  for (let i = 0; i < auswahl.length; i++) {
    w -= gewichte[i];
    if (w <= 0) return auswahl[i];
  }
  return auswahl[auswahl.length - 1];
}

function neueAufgabe() {
  const grund = zufallsGrundton();
  const st = stufeObj();

  if (sel.art === "intervalle") {
    const halbtoene = waehle(st.auswahl);
    const aufwaerts = Math.random() < 0.8;   // abwärts seltener, aber es kommt vor
    const zweiter = aufwaerts ? grund + halbtoene : grund - halbtoene;
    // Der zweite Ton wird über die Stufenzahl geschrieben, nicht über die
    // Halbtöne — sonst stünde über Fis ein B statt eines Ais.
    const wurzel = chromatic(grund);
    aufgabe = {
      antwort: String(halbtoene),
      midis: [grund, zweiter],
      zeige: [wurzel, intervalFrom(wurzel, halbtoene, aufwaerts ? 1 : -1)],
      text: INTERVALS.find(i => i.semitones === halbtoene)?.name +
            (halbtoene === 0 || halbtoene === 12 ? "" : aufwaerts ? ", aufwärts" : ", abwärts"),
    };
  } else if (sel.art === "akkorde") {
    const key = waehle(st.auswahl);
    const root = chromatic(grund);
    const pitches = buildChord(root, key);
    aufgabe = {
      antwort: key,
      midis: pitches.map(toMidi),
      zeige: pitches,
      text: CHORDS[key].name,
    };
  } else if (sel.art === "skalen") {
    const key = waehle(st.auswahl);
    const root = chromatic(grund);
    const pitches = buildScale(root, key, 1);
    aufgabe = {
      antwort: key,
      midis: pitches.map(toMidi),
      zeige: pitches,
      text: SCALES[key].name,
    };
  } else {   // richtung
    const halbtoene = [1, 2, 3, 4, 5, 7][Math.floor(Math.random() * 6)];
    const hoch = Math.random() < 0.5;
    const zweiter = hoch ? grund + halbtoene : grund - halbtoene;
    aufgabe = {
      antwort: hoch ? "hoch" : "tief",
      midis: [grund, zweiter],
      zeige: [grund, zweiter].map(chromatic),
      text: hoch ? "höher" : "tiefer",
    };
  }
  beantwortet = false;
}

function spiele() {
  if (!aufgabe) return;
  const a4 = state().settings.a4;
  if (sel.art === "akkorde" && sel.harmonisch) {
    playChord(aufgabe.midis, { a4 });
  } else if (sel.art === "intervalle" && sel.harmonisch) {
    playChord(aufgabe.midis, { a4, dur: 2 });
  } else {
    const dauer = sel.art === "skalen" ? 0.32 : 0.6;
    playMelody(aufgabe.midis, { noteDur: dauer, gap: 0.03, a4 });
  }
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const d = drill(drillId(), { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
  const gesamt = d.right + d.wrong;

  root.innerHTML = `
    <div class="chips scroll" id="art-chips" role="group" aria-label="Übungsart"></div>
    <div class="chips scroll" id="stufe-chips" role="group" aria-label="Stufe"></div>

    <div class="quiz">
      <div class="quiz-score">
        <span><b id="q-right">${d.right}</b> richtig</span>
        <span><b id="q-streak">${d.streak}</b> in Folge${d.bestStreak ? ` · best ${d.bestStreak}` : ""}</span>
        <span><b id="q-quote">${gesamt ? Math.round(100 * d.right / gesamt) : 0}</b> %</span>
      </div>

      <button class="wide primary quiz-play" id="q-play">Anhören</button>

      <div id="q-mode" class="chips" style="margin-top:12px"></div>

      <div class="answers" id="q-answers"></div>

      <div id="q-feedback" class="quiz-feedback" hidden></div>
    </div>

    <p class="hint spaced">
      Gehört wird klingend, so wie am Klavier geprüft. Der Griff am Alt steht
      bei der Auflösung daneben.
    </p>`;

  renderArtChips(root);
  renderStufeChips(root);
  renderModus(root);
  renderAntworten(root);

  $("#q-play", root).addEventListener("click", () => {
    if (!aufgabe) neueAufgabe();
    spiele();
  });

  neueAufgabe();
  renderAntworten(root);
}

function renderArtChips(root) {
  const host = $("#art-chips", root);
  host.innerHTML = "";
  for (const a of ARTEN) {
    host.append(el("button", {
      class: "chip" + (a.id === sel.art ? " on" : ""),
      text: a.label,
      on: { click: () => { sel.art = a.id; sel.stufe = "leicht"; render(root); } },
    }));
  }
}

function renderStufeChips(root) {
  const host = $("#stufe-chips", root);
  host.innerHTML = "";
  const stufen = stufenFor(sel.art);
  host.hidden = sel.art === "richtung";
  if (host.hidden) return;
  for (const s of stufen) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => { sel.stufe = s.id; render(root); } },
    }));
  }
}

function renderModus(root) {
  const host = $("#q-mode", root);
  host.innerHTML = "";
  if (sel.art !== "intervalle" && sel.art !== "akkorde") { host.hidden = true; return; }
  host.hidden = false;
  for (const [v, label] of [[false, "nacheinander"], [true, "gleichzeitig"]]) {
    host.append(el("button", {
      class: "chip" + (sel.harmonisch === v ? " on" : ""),
      text: label,
      on: { click: () => { sel.harmonisch = v; renderModus(root); } },
    }));
  }
}

function antwortOptionen() {
  const st = stufeObj();
  if (sel.art === "intervalle") {
    return st.auswahl.map(s => ({
      wert: String(s),
      label: INTERVALS.find(i => i.semitones === s)?.short || String(s),
      titel: INTERVALS.find(i => i.semitones === s)?.name,
    }));
  }
  if (sel.art === "akkorde") {
    return st.auswahl.map(k => ({ wert: k, label: CHORDS[k].name, titel: CHORDS[k].name }));
  }
  if (sel.art === "skalen") {
    return st.auswahl.map(k => ({ wert: k, label: SCALES[k].name, titel: SCALES[k].name }));
  }
  return [{ wert: "hoch", label: "höher" }, { wert: "tief", label: "tiefer" }];
}

function renderAntworten(root) {
  const host = $("#q-answers", root);
  if (!host) return;
  host.innerHTML = "";
  for (const o of antwortOptionen()) {
    host.append(el("button", {
      class: "answer",
      text: o.label,
      title: o.titel || o.label,
      data: { wert: o.wert },
      on: { click: e => antworte(root, o.wert, e.currentTarget) },
    }));
  }
}

function antworte(root, wert, btn) {
  if (!aufgabe || beantwortet) return;
  beantwortet = true;
  const richtig = wert === aufgabe.antwort;

  scoreDrill(drillId(), richtig);

  // Fehlerzähler je Antwortmöglichkeit: das steuert die Auswahl beim
  // nächsten Mal. Richtig beantwortet senkt ihn wieder.
  const f = drill(fehlerId(), {});
  const k = aufgabe.antwort;
  f[k] = Math.max(0, (f[k] || 0) + (richtig ? -1 : 2));
  save();

  richtig ? sigOk() : sigNope();

  $$(".answer", root).forEach(b => {
    b.disabled = true;
    if (b.dataset.wert === aufgabe.antwort) b.classList.add("richtig");
    else if (b === btn) b.classList.add("falsch");
  });

  zeigeAufloesung(root, richtig);
  aktualisiereScore(root);
}

function zeigeAufloesung(root, richtig) {
  const host = $("#q-feedback", root);
  host.hidden = false;

  const griffe = aufgabe.zeige.map(p => spell(chromatic(toWritten(toMidi(p))))).join(" – ");
  const klingend = aufgabe.zeige.map(p => spell(p)).join(" – ");

  host.innerHTML = `
    <p class="quiz-verdict">${richtig ? "Richtig" : "Das war " + aufgabe.text}</p>
    <div class="staff-wrap">${renderStaff({
      notes: pitchesToNotes(aufgabe.zeige, sel.art === "skalen" ? DUR.achtel : DUR.halbe,
        { accidentalsFor: null }),
      extraClass: "compact",
      ariaLabel: aufgabe.text,
    })}</div>
    <p class="hint">klingend ${klingend} · am Alt gegriffen ${griffe}</p>
    <div class="row2">
      <button id="q-again">Nochmal hören</button>
      <button id="q-next" class="weiter">Weiter</button>
    </div>`;

  $("#q-again", host).addEventListener("click", spiele);
  $("#q-next", host).addEventListener("click", () => {
    host.hidden = true;
    neueAufgabe();
    renderAntworten(root);
    spiele();
  });
  $("#q-next", host).focus();
}

function aktualisiereScore(root) {
  const d = drill(drillId(), {});
  const gesamt = (d.right || 0) + (d.wrong || 0);
  $("#q-right", root).textContent = d.right || 0;
  $("#q-streak", root).textContent = d.streak || 0;
  $("#q-quote", root).textContent = gesamt ? Math.round(100 * d.right / gesamt) : 0;
}

export default {
  id: "gehoerbildung",
  label: "Erkennen",
  mount(root) { render(root); },
  unmount() { aufgabe = null; },
};
