/* ==========================================================================
   Gig-Training

   Der Unterschied zwischen „ich kann improvisieren“ und „ich kann eine
   Stunde lang bei einem Apéro spielen, ohne dass es langweilig wird“ ist
   nicht Können, sondern Disziplin. Wer frei über einen Vamp spielt, fällt
   nach zwei Minuten in dieselben Läufe und hört selbst nicht mehr hin.

   Deshalb gibt dieses Werkzeug Auflagen und wechselt sie alle acht Takte.
   Nur Zieltöne. Zwei Takte spielen, zwei schweigen. Ein Motiv, sonst
   nichts. Nur die mittlere Oktave. Jede einzelne davon ist eine
   Einschränkung, und genau daran wächst das Spiel — eine Einschränkung
   zwingt zu einer Entscheidung, und Entscheidungen sind das, was man auf
   einer Bühne hört.

   Der zweite Zweck ist Ausdauer. Fünf Minuten durchgehend über einen
   einzigen Vamp sind länger, als man denkt, und sie sind die realistische
   Probe für einen Gig, bei dem niemand nach vier Takten applaudiert.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, mmss, escapeHtml, toast } from "../core/dom.js";
import { state, drill, recordDrill } from "../core/store.js";
import {
  PROGRESSIONS, buildProgression, progressionTakte, chordSymbol,
} from "../music/harmonie.js";
import {
  toWritten, toMidi, fromMidi, writtenKeySignature,
} from "../music/theory.js";
import * as band from "../audio/begleitung.js";
import { ok as sigOk } from "../audio/signals.js";
import { holdScreen, releaseScreen } from "../core/session.js";

/* Die Auflagen. Jede ist eine Einschränkung, und jede trainiert etwas
   anderes. `takte` sagt, wie lange sie gilt — kurz genug, dass es weh tut,
   lang genug, dass man hineinkommt. */
const AUFLAGEN = [
  { id: "ziel", kurz: "Nur Zieltöne", takte: 8,
    lang: "Je Akkord nur Terz oder Septime. Ein Ton, dann warten.",
    warum: "Das ist die Übung, die aus Tonfolgen Musik macht." },
  { id: "pause", kurz: "Zwei spielen, zwei schweigen", takte: 8,
    lang: "Zwei Takte eine Phrase, zwei Takte gar nichts. Ohne Ausnahme.",
    warum: "Eine Phrase mit Pause dahinter wird gehört. Eine Kette wird Hintergrund." },
  { id: "motiv", kurz: "Ein Motiv, sonst nichts", takte: 16,
    lang: "Drei oder vier Töne. Wiederholen, versetzen, verschieben — aber keine neuen.",
    warum: "Wiederholung ist kein Ideenmangel, sie ist die Idee." },
  { id: "mitte", kurz: "Nur die mittlere Oktave", takte: 8,
    lang: "Kein Ton über dem notierten G5, keiner unter dem notierten G4.",
    warum: "Was oben brillant klingt, verschwindet in einer Anlage. Unten trägt es." },
  { id: "eins", kurz: "Nur auf der Eins", takte: 8,
    lang: "Ein einziger Ton je Takt, genau auf der Eins. Sonst Stille.",
    warum: "Wer die Eins trifft, hat die Form. Wer sie verliert, hat nichts." },
  { id: "lang", kurz: "Nur lange Töne", takte: 8,
    lang: "Kein Ton kürzer als zwei Takte. Voll ausspielen, bis er endet.",
    warum: "Hier hört man deinen Klang — und auf einem Fest ist das alles." },
  { id: "frei", kurz: "Frei", takte: 8,
    lang: "Alles erlaubt. Aber nimm mit, was in den Runden davor passiert ist.",
    warum: "Freiheit nach Auflagen klingt anders als Freiheit von Anfang an." },
];

const DAUERN = [
  { min: 3, label: "3 min" },
  { min: 5, label: "5 min" },
  { min: 10, label: "10 min" },
  { min: 20, label: "20 min" },
];

const TONARTEN = [
  { pc: 10, name: "B",   sig: -2 }, { pc: 3, name: "Es",  sig: -3 },
  { pc: 5,  name: "F",   sig: -1 }, { pc: 0, name: "C",   sig:  0 },
  { pc: 7,  name: "G",   sig:  1 }, { pc: 2, name: "D",   sig:  2 },
  { pc: 9,  name: "A",   sig:  3 }, { pc: 4, name: "E",   sig:  4 },
  { pc: 11, name: "H",   sig:  5 }, { pc: 6, name: "Fis", sig:  6 },
  { pc: 1,  name: "Des", sig: -5 }, { pc: 8, name: "As",  sig: -4 },
];

let sel = { prog: "house_vamp", tonartIdx: 0, dauer: 5, tempo: 120, swing: 0.5 };
let akkorde = [];
let lauf = null;   // { startMs, absTakt, auflage, seitTakten, reihenfolge, idx }
let offBar = null, offState = null;

const progOf = () => PROGRESSIONS.find(p => p.id === sel.prog) || PROGRESSIONS[0];

/** Die Auflagen in gemischter Reihenfolge, „Frei“ immer zum Schluss. */
function mischeAuflagen() {
  const ohneFrei = AUFLAGEN.filter(a => a.id !== "frei");
  for (let i = ohneFrei.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ohneFrei[i], ohneFrei[j]] = [ohneFrei[j], ohneFrei[i]];
  }
  return [...ohneFrei, AUFLAGEN.find(a => a.id === "frei")];
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const d = drill("gigtraining", { minuten: 0, laeufe: 0 });

  root.innerHTML = `
    <p class="hint">
      Eine Stunde beim Apéro ist kein Solo, sondern Ausdauer plus
      Zurückhaltung. Hier gibt die App die Auflagen vor und wechselt sie —
      genau das, was man allein nicht durchhält.
    </p>

    <div class="gig-buehne" id="gig-buehne">
      <div class="gig-rest" id="gig-rest">${mmss(sel.dauer * 60)}</div>
      <div class="gig-auflage" id="gig-auflage">bereit</div>
      <div class="gig-lang" id="gig-lang">Wähl eine Folge und leg los.</div>
      <div class="gig-balken"><i id="gig-fill"></i></div>
      <div class="gig-unten">
        <span id="gig-akkord">—</span>
        <span id="gig-naechste"></span>
      </div>
    </div>

    <button class="wide primary" id="gig-los">Los</button>
    <p class="hint" id="gig-warum"></p>

    <div class="chips scroll" id="gig-prog" role="group" aria-label="Akkordfolge"></div>

    <div class="grid3">
      <label>Tonart, klingend
        <select id="gig-tonart">
          ${TONARTEN.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join("")}
        </select>
      </label>
      <label>Tempo
        <input type="number" id="gig-tempo" min="60" max="200" value="${sel.tempo}">
      </label>
      <label>Dauer
        <select id="gig-dauer">
          ${DAUERN.map(x => `<option value="${x.min}">${x.label}</option>`).join("")}
        </select>
      </label>
      <label>Swing
        <select id="gig-swing">
          <option value="50">gerade</option>
          <option value="58">leicht</option>
          <option value="62">mittel</option>
          <option value="66">voll</option>
        </select>
      </label>
    </div>

    <h2>Die Auflagen</h2>
    <p class="hint">
      Jede ist eine Einschränkung, und jede trainiert etwas anderes. Eine
      Einschränkung zwingt zu einer Entscheidung, und Entscheidungen sind
      das, was man auf einer Bühne hört.
    </p>
    <div id="gig-liste">${AUFLAGEN.map(a => `
      <div class="gig-zeile">
        <b>${escapeHtml(a.kurz)}</b>
        <span>${escapeHtml(a.warum)}</span>
      </div>`).join("")}</div>

    ${d.minuten ? `<p class="hint spaced">
      Bisher ${d.minuten} Minuten Gig-Training in ${d.laeufe}
      ${d.laeufe === 1 ? "Durchgang" : "Durchgängen"}.</p>` : ""}`;

  renderProgChips(root);
  $("#gig-tonart", root).value = String(sel.tonartIdx);
  $("#gig-dauer", root).value = String(sel.dauer);
  $("#gig-swing", root).value = String(Math.round(sel.swing * 100));
  baue(root);

  $("#gig-tonart", root).addEventListener("change", e => {
    sel.tonartIdx = Number(e.target.value); baue(root);
  });
  $("#gig-tempo", root).addEventListener("change", e => {
    sel.tempo = clamp(Number(e.target.value) || 120, 60, 200);
    e.target.value = sel.tempo;
    band.configure({ bpm: sel.tempo });
  });
  $("#gig-dauer", root).addEventListener("change", e => {
    sel.dauer = Number(e.target.value);
    if (!lauf) $("#gig-rest", root).textContent = mmss(sel.dauer * 60);
  });
  $("#gig-swing", root).addEventListener("change", e => {
    sel.swing = Number(e.target.value) / 100;
    band.configure({ swing: sel.swing });
  });
  $("#gig-los", root).addEventListener("click", () => lauf ? halt(root) : los(root));
}

function renderProgChips(root) {
  const host = $("#gig-prog", root);
  host.innerHTML = "";
  for (const p of PROGRESSIONS) {
    host.append(el("button", {
      class: "chip" + (p.id === sel.prog ? " on" : ""),
      text: p.name,
      on: { click: () => { sel.prog = p.id; sel.tempo = p.tempo; halt(root); render(root); } },
    }));
  }
}

function baue(root) {
  akkorde = buildProgression(progOf(), TONARTEN[sel.tonartIdx].pc);
  band.configure({
    akkorde, bpm: sel.tempo, swing: sel.swing, a4: state().settings.a4,
    groove: progOf().groove || "swing",
  });
}

/* --- Ablauf ------------------------------------------------------------------- */

function los(root) {
  const reihenfolge = mischeAuflagen();
  lauf = {
    startMs: performance.now(),
    reihenfolge, idx: 0,
    seitTakten: 0,
    absTakt: -1,
  };
  band.configure({ akkorde, bpm: sel.tempo, swing: sel.swing, a4: state().settings.a4, groove: progOf().groove || "swing" });
  band.start();
  holdScreen();
  zeigeAuflage(root);
  lauf.timer = setInterval(() => tick(root), 250);
}

function halt(root, fertig = false) {
  if (!lauf) return;
  clearInterval(lauf.timer);
  const gespielt = Math.round((performance.now() - lauf.startMs) / 60000);
  lauf = null;
  band.stop();
  releaseScreen();

  if (gespielt >= 1) {
    const d = drill("gigtraining", { minuten: 0, laeufe: 0 });
    recordDrill("gigtraining", {
      minuten: (d.minuten || 0) + gespielt,
      laeufe: (d.laeufe || 0) + 1,
    });
  }

  const b = $("#gig-buehne", root);
  if (b) b.classList.remove("laeuft");
  $("#gig-auflage", root).textContent = fertig ? "Durchgang fertig" : "abgebrochen";
  $("#gig-lang", root).textContent = fertig
    ? `${gespielt} Minuten durchgehalten. Genau das ist die Übung.`
    : "";
  $("#gig-fill", root).style.width = "0%";
  $("#gig-rest", root).textContent = mmss(sel.dauer * 60);
  const knopf = $("#gig-los", root);
  if (knopf) { knopf.textContent = "Los"; knopf.classList.add("primary"); }
  if (fertig) { sigOk(); toast("Durchgang geschafft"); }
}

function tick(root) {
  if (!lauf) return;
  const verstrichen = (performance.now() - lauf.startMs) / 1000;
  const rest = Math.max(0, sel.dauer * 60 - verstrichen);
  const feld = $("#gig-rest", root);
  if (feld) feld.textContent = mmss(rest);
  if (rest <= 0) halt(root, true);
}

/** Wird je Takt von der Band gerufen. Zählt die Auflage weiter. */
function aufTakt(root, info) {
  if (!lauf) return;
  const gesamt = progressionTakte(akkorde);
  const abs = info.durchgang * gesamt + info.takt;
  if (abs === lauf.absTakt) return;
  lauf.absTakt = abs;
  lauf.seitTakten++;

  const jetzt = lauf.reihenfolge[lauf.idx];
  if (lauf.seitTakten > jetzt.takte) {
    lauf.idx = (lauf.idx + 1) % lauf.reihenfolge.length;
    lauf.seitTakten = 1;
    zeigeAuflage(root);
    sigOk();
  }

  // Fortschritt innerhalb der Auflage
  const a = lauf.reihenfolge[lauf.idx];
  const fill = $("#gig-fill", root);
  if (fill) fill.style.width = (100 * lauf.seitTakten / a.takte).toFixed(0) + "%";

  const sig = writtenKeySignature(TONARTEN[sel.tonartIdx].sig + (progOf().sigVersatz || 0));
  const w = toWritten(toMidi(info.akkord.root));
  const griffRoot = { ...fromMidi(w, sig < 0 ? "flat" : "sharp"),
                      octave: info.akkord.root.octave + 1 };
  const feld = $("#gig-akkord", root);
  if (feld) feld.textContent = chordSymbol(griffRoot, info.akkord.q);
}

function zeigeAuflage(root) {
  if (!lauf) return;
  const a = lauf.reihenfolge[lauf.idx];
  const naechste = lauf.reihenfolge[(lauf.idx + 1) % lauf.reihenfolge.length];
  $("#gig-buehne", root).classList.add("laeuft");
  $("#gig-auflage", root).textContent = a.kurz;
  $("#gig-lang", root).textContent = a.lang;
  $("#gig-warum", root).textContent = a.warum;
  $("#gig-naechste", root).textContent = "dann: " + naechste.kurz;
  const knopf = $("#gig-los", root);
  if (knopf) { knopf.textContent = "Abbrechen"; knopf.classList.remove("primary"); }
}

export default {
  id: "gigtraining",
  label: "Gig-Training",
  mount(root) {
    render(root);
    offBar = band.onBar(info => aufTakt(root, info));
    // Die Band lässt sich auch über den Streifen „läuft gerade" abschalten.
    // Ohne diesen Rückruf liefe die Auflagenuhr weiter, während nichts mehr
    // klingt — und der Knopf stünde immer noch auf „Abbrechen".
    offState = band.onStateChange(({ running }) => {
      if (!running && lauf) halt(root);
    });
  },
  unmount() {
    offBar?.(); offState?.();
    if (lauf) { clearInterval(lauf.timer); lauf = null; }
    band.stop();
    releaseScreen();
  },
};
