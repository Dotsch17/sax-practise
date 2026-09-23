/* ==========================================================================
   Call and Response

   Die Band läuft durch, die App spielt zwei Takte vor, du antwortest zwei
   Takte. Das ist die älteste Art, Improvisation zu lernen, und sie
   funktioniert aus einem Grund: du musst im Tempo antworten. Es gibt kein
   Nachdenken, kein Anhalten, kein Nochmal. Genau das fehlt beim stillen
   Üben über eine Begleitung, wo man immer weiterspielen kann, ohne je
   etwas zu Ende zu bringen.

   Das Lick wird **einen Takt im Voraus** eingeplant, nicht in dem Moment,
   in dem es klingen soll. Der Takt-Rückruf der Band kommt zum Klingen des
   Schlags; wer erst dann plant, hängt beim ersten Ton hinterher.

   Kein Mikrofon: die Band kommt aus demselben Lautsprecher, den das Mikrofon
   hört. Eine Tonhöhenerkennung würde den Bass verfolgen statt dich. Was hier
   zählt, ist ohnehin nichts, was eine Maschine beurteilen könnte — ob deine
   Antwort etwas mit dem Vorgespielten zu tun hat, hörst nur du.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, setSetting, drill, recordDrill } from "../core/store.js";
import { PROGRESSIONS, buildProgression, progressionTakte, chordAtBar, chordSymbol, inTonart }
  from "../music/harmonie.js";
import { generateLick, STUFEN as LICK_STUFEN } from "../music/lick.js";
import { toWritten, toMidi, fromMidi, spell, writtenKeySignature, spellOnStep, stufeInTonart } from "../music/theory.js";
import { renderStaff, autoBeam, DUR } from "../music/notation.js";
import { playAt } from "../audio/signals.js";
import { audio } from "../audio/context.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const TONARTEN = [
  { pc: 10, name: "B",   sig: -2 }, { pc: 3, name: "Es",  sig: -3 },
  { pc: 5,  name: "F",   sig: -1 }, { pc: 0, name: "C",   sig:  0 },
  { pc: 7,  name: "G",   sig:  1 }, { pc: 2, name: "D",   sig:  2 },
  { pc: 9,  name: "A",   sig:  3 }, { pc: 4, name: "E",   sig:  4 },
  { pc: 11, name: "H",   sig:  5 }, { pc: 6, name: "Fis", sig:  6 },
  { pc: 1,  name: "Des", sig: -5 }, { pc: 8, name: "As",  sig: -4 },
];

let sel = {
  prog: "blues", tonartIdx: 0, stufe: "mittel",
  laenge: 2, tempo: 110, swing: 0.62, zeigeNoten: false,
};
let akkorde = [];
let aktuellesLick = null;     // { noten, abTakt }
let letztesLick = null;       // zum Nachschauen, nachdem geantwortet wurde
let phase = "aus";            // aus | hoeren | antworten
let offBar = null, offState = null;

const progOf = () => PROGRESSIONS.find(p => p.id === sel.prog) || PROGRESSIONS[0];
const drillId = () => `callresponse:${sel.prog}`;

/* Gezählt wird **fortlaufend**, nicht innerhalb der Form. Bei vier Takten
   Länge über einen Zwölftakter geht die Aufteilung sonst am Formende nicht
   auf: 12 modulo 8 ist 4, und nach dem Umbruch kämen acht Takte Vorspiel
   hintereinander. */
const istCallStart = absTakt => absTakt % (sel.laenge * 2) === 0;
const istCall = absTakt => (absTakt % (sel.laenge * 2)) < sel.laenge;

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div class="chips scroll" id="cr-prog" role="group" aria-label="Akkordfolge"></div>

    <div class="cr-bühne" id="cr-buehne">
      <div class="cr-phase" id="cr-phase">bereit</div>
      <div class="cr-akkord" id="cr-akkord">—</div>
      <div class="formleiste" id="cr-form"></div>
    </div>

    <button class="wide primary" id="cr-los">Los</button>

    <div class="chips scroll" id="cr-stufen" role="group" aria-label="Dichte"></div>
    <p class="hint" id="cr-stufe-was"></p>

    <div id="cr-noten"></div>

    <div class="grid3">
      <label>Tonart, klingend
        <select id="cr-tonart">
          ${TONARTEN.map((t, i) => `<option value="${i}">${t.name}</option>`).join("")}
        </select>
      </label>
      <label>Tempo
        <input type="number" id="cr-tempo" min="50" max="240" value="${sel.tempo}">
      </label>
      <label>Länge
        <select id="cr-laenge">
          <option value="1">1 Takt</option>
          <option value="2">2 Takte</option>
          <option value="4">4 Takte</option>
        </select>
      </label>
      <label>Swing
        <select id="cr-swing">
          <option value="50">gerade</option>
          <option value="58">leicht</option>
          <option value="62">mittel</option>
          <option value="66">voll</option>
        </select>
      </label>
    </div>

    <div class="chips" id="cr-optionen"></div>

    <p class="hint spaced">
      Antworte im Tempo, auch wenn es daneben geht. Wer wartet, bis er
      etwas Gutes weiß, lernt nie zu antworten. Die Akkorde stehen
      gegriffen, die Band klingt klingend.
    </p>`;

  renderProgChips(root);
  renderStufenChips(root);
  renderOptionen(root);
  $("#cr-tonart", root).value = String(sel.tonartIdx);
  $("#cr-laenge", root).value = String(sel.laenge);
  $("#cr-swing", root).value = String(Math.round(sel.swing * 100));
  baue(root);

  $("#cr-tonart", root).addEventListener("change", e => {
    sel.tonartIdx = Number(e.target.value); baue(root);
  });
  $("#cr-tempo", root).addEventListener("change", e => {
    sel.tempo = clamp(Number(e.target.value) || 110, 50, 240);
    e.target.value = sel.tempo;
    band.configure({ bpm: sel.tempo });
  });
  $("#cr-laenge", root).addEventListener("change", e => {
    sel.laenge = Number(e.target.value); renderForm(root);
  });
  $("#cr-swing", root).addEventListener("change", e => {
    sel.swing = Number(e.target.value) / 100;
    band.configure({ swing: sel.swing });
  });
  $("#cr-los", root).addEventListener("click", () => {
    if (band.isRunning()) halt(root);
    else los(root);
  });
}

function renderProgChips(root) {
  const host = $("#cr-prog", root);
  host.innerHTML = "";
  for (const p of PROGRESSIONS) {
    host.append(el("button", {
      class: "chip" + (p.id === sel.prog ? " on" : ""),
      text: p.name,
      on: { click: () => { sel.prog = p.id; sel.tempo = p.tempo; halt(root); render(root); } },
    }));
  }
}

function renderStufenChips(root) {
  const host = $("#cr-stufen", root);
  host.innerHTML = "";
  for (const s of LICK_STUFEN) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => {
        sel.stufe = s.id;
        renderStufenChips(root);
        $("#cr-stufe-was", root).textContent = s.was;
      } },
    }));
  }
  const s = LICK_STUFEN.find(x => x.id === sel.stufe);
  const was = $("#cr-stufe-was", root);
  if (was && s) was.textContent = s.was;
}

function renderOptionen(root) {
  const host = $("#cr-optionen", root);
  host.innerHTML = "";
  host.append(el("button", {
    class: "chip" + (sel.zeigeNoten ? " on" : ""),
    text: "Noten nach der Antwort zeigen",
    on: { click: () => {
      sel.zeigeNoten = !sel.zeigeNoten;
      renderOptionen(root);
      if (!sel.zeigeNoten) $("#cr-noten", root).innerHTML = "";
      else zeigeNoten(root);
    } },
  }));
}

function baue(root) {
  akkorde = buildProgression(progOf(), TONARTEN[sel.tonartIdx].pc);
  band.configure({
    akkorde, bpm: sel.tempo, swing: sel.swing,
    a4: state().settings.a4, groove: progOf().groove || "swing",
  });
  renderForm(root);
}

function renderForm(root) {
  const host = $("#cr-form", root);
  if (!host) return;
  const gesamt = progressionTakte(akkorde);
  host.innerHTML = Array.from({ length: gesamt },
    (_, i) => `<i class="${istCall(i) ? "call" : ""}"></i>`).join("");
  // Beim ersten Durchgang stimmt das; danach setzt aufTakt() es je Takt neu.
}

/* --- Ablauf ------------------------------------------------------------------ */

function los(root) {
  aktuellesLick = null;
  letztesLick = null;
  phase = "hoeren";
  band.configure({ akkorde, bpm: sel.tempo, swing: sel.swing, a4: state().settings.a4, groove: progOf().groove || "swing" });
  band.start();
  holdScreen();
  const d = drill(drillId(), { runden: 0 });
  recordDrill(drillId(), { runden: (d.runden || 0) });
}

function halt(root) {
  band.stop();
  releaseScreen();
  phase = "aus";
  aktuellesLick = null;
  const b = $("#cr-buehne", root);
  if (b) { b.classList.remove("hoeren", "antworten"); }
  const p = $("#cr-phase", root);
  if (p) p.textContent = "bereit";
  $$("#cr-form i", root).forEach(f => f.classList.remove("on"));
}

/**
 * Wird je Takt gerufen. Plant das Lick eine Takteinheit im Voraus und
 * schaltet die Anzeige auf den Takt genau um.
 */
function aufTakt(root, info) {
  const spb = 60 / sel.tempo;
  const beats = 4;
  const gesamt = progressionTakte(akkorde);
  const abs = info.durchgang * gesamt + info.takt;

  // --- Anzeige für den laufenden Takt
  phase = istCall(abs) ? "hoeren" : "antworten";
  const buehne = $("#cr-buehne", root);
  buehne.classList.toggle("hoeren", phase === "hoeren");
  buehne.classList.toggle("antworten", phase === "antworten");
  $("#cr-phase", root).textContent = phase === "hoeren" ? "hör zu" : "du";

  const g = gegriffen(info.akkord);
  $("#cr-akkord", root).textContent = g;

  // Die Vorspiel-Takte werden je Durchgang neu markiert, weil sie sich
  // gegen die Form verschieben können.
  const felder = $$("#cr-form i", root);
  felder.forEach((f, i) => {
    f.classList.toggle("on", i === info.takt);
    f.classList.toggle("call", istCall(info.durchgang * gesamt + i));
  });
  felder[info.takt]?.scrollIntoView({ inline: "center", block: "nearest" });

  // --- Wenn im nächsten Takt ein Vorspiel beginnt: jetzt planen.
  const naechsterAbs = abs + 1;
  const naechster = naechsterAbs % gesamt;
  if (istCallStart(naechsterAbs)) {
    const startZeit = info.zeit + beats * spb;
    const lick = generateLick(akkorde, naechster, sel.laenge, { stufe: sel.stufe });
    playAt(lick.map(nt => ({
      midi: nt.midi,
      zeit: startZeit + nt.beat * spb,
      dauer: nt.dauer * spb * 0.92,
    })), { a4: state().settings.a4, amp: 0.26 });
    aktuellesLick = { noten: lick, abTakt: naechster, abs: naechsterAbs };
  }

  // --- Sobald die Antwortphase beginnt, ist das Lick durch: merken und
  //     auf Wunsch anzeigen.
  if (!istCall(abs) && aktuellesLick && abs === aktuellesLick.abs + sel.laenge) {
    letztesLick = aktuellesLick;
    const d = drill(drillId(), { runden: 0 });
    recordDrill(drillId(), { runden: (d.runden || 0) + 1 });
    if (sel.zeigeNoten) zeigeNoten(root);
  }
}

/** Ein klingender Akkord, gegriffen gelesen, in der Tonart der Folge. */
const gegriffen = akkord => inTonart(akkord, TONARTEN[sel.tonartIdx].sig, progOf().sigVersatz || 0).symbol;

function zeigeNoten(root) {
  const host = $("#cr-noten", root);
  if (!host) return;
  if (!letztesLick || !sel.zeigeNoten) { host.innerHTML = ""; return; }

  const versatz = progOf().sigVersatz || 0;
  const sig = writtenKeySignature(TONARTEN[sel.tonartIdx].sig + versatz);
  // Buchstabiert in der gegriffenen Tonart: in Cis-Dur heißt der Ton Eis, nicht F.
  const tonika = sig - versatz;
  // Klingend gespielt, gegriffen gelesen — wie überall in der App.
  const noten = [];
  let letzterTakt = -1;
  for (const nt of letztesLick.noten) {
    const takt = Math.floor(nt.beat / 4);
    if (takt !== letzterTakt && letzterTakt >= 0) noten.push({ barline: true });
    letzterTakt = takt;
    noten.push({
      pitch: spellOnStep(toWritten(nt.midi), stufeInTonart(toWritten(nt.midi) % 12, tonika)),
      dur: nt.dauer >= 1 ? DUR.viertel : DUR.achtel,
    });
  }
  noten.push({ barline: "end" });

  host.innerHTML = `
    <div class="staff-wrap">${renderStaff({
      keySig: sig,
      notes: autoBeam(noten, 1),
      extraClass: "compact",
      ariaLabel: "Das zuletzt vorgespielte Lick",
    })}</div>
    <p class="hint">
      Das war das Lick, gegriffen notiert. Schau es dir an, wenn die Antwort
      danebenging — und dann hör beim nächsten Mal wieder ohne Noten.
    </p>`;
}

export default {
  id: "callresponse",
  label: "Call & Response",
  mount(root) {
    render(root);
    offBar = band.onBar(info => { if (phase !== "aus") aufTakt(root, info); });
    offState = band.onStateChange(({ running }) => {
      const b = $("#cr-los", root);
      if (!b) return;
      b.textContent = running ? "Stopp" : "Los";
      b.classList.toggle("primary", !running);
    });
  },
  unmount() {
    offBar?.(); offState?.();
    band.stop();
    releaseScreen();
    phase = "aus";
  },
};
