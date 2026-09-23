/* ==========================================================================
   Pop-Sound

   Der Lehrgang für das Pop- und Soul-Vokabular: Subtone, Scoop, Fall,
   Bend, Ghost Notes, Growl, Pop-Vibrato, Shake, Altissimo-Schrei. Jede
   Technik mit dem Warum, den Schritten, den typischen Fehlern, einem
   „fertig, wenn“ und einer Übung über den Groove, in dem sie zu Hause ist.

   Sechs davon lassen sich messen, und dann wird gemessen: Scoop, Fall und
   Bend am Tonhöhenverlauf, Pop-Vibrato und Shake mit der Vibrato-Analyse,
   Subtone an der Helligkeit gegen den eigenen normalen Ton. Gemessen wird ohne Band — das Mikrofon würde sonst den
   Bass verfolgen statt des Saxophons.

   Die Inhalte stehen in js/data/popvokabular.js, die Messungen in
   js/music/popmessung.js.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { freqToMidi, spell, fromMidi } from "../music/theory.js";
import { PROGRESSIONS, buildProgression } from "../music/harmonie.js";
import { gegriffenSymbol } from "../music/leadsheet.js";
import { grooveOf } from "../music/grooves.js";
import { TECHNIKEN, STUFEN, technikOf, drillId } from "../data/popvokabular.js";
import * as M from "../music/popmessung.js";
import * as pitch from "../audio/pitch.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let offen = null;
let offPitch = null, offBar = null, offState = null;
let mikro = false;
let versuch = null, stilleSeit = 0;
let ergebnisse = [];             // die letzten Versuche dieser Sitzung
let subtonePhase = null;         // { phase: "normal" | "sub", normal, sub, start }

const eintrag = id => drill(drillId(id), { stufe: -1 });

/* --- Liste ------------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (offen) { renderTechnik(technikOf(offen)); return; }
  root.innerHTML = `
    <p class="hint">Neun Techniken, in der Reihenfolge, in der man sie lernt. Sie machen ein Saxophon
      zum Pop-Saxophon — und sie sind Gewürze: ein Solo, in dem jeder Ton gebogen wird, klingt nach Karikatur.
      Alle brauchen ein echtes Saxophon; der Travel Sax kann keine davon.</p>
    <div class="pop-liste">${TECHNIKEN.map((t, i) => {
      const e = eintrag(t.id);
      return `<button class="pr-punkt pop-karte" data-id="${t.id}">
        <span class="pr-punkt-kopf"><b>${i + 1}. ${escapeHtml(t.name)}</b>
          <em>${e.stufe >= 0 ? escapeHtml(STUFEN[e.stufe].label) : "neu"}</em></span>
        <span class="pr-punkt-sub">${escapeHtml(t.kurz)}${t.messung ? " · mit Messung" : ""}${
          t.wo.includes("leise") ? "" : " · nur im Probelokal"}</span>
        <span class="pr-stufen">${STUFEN.map((_, k) => `<i class="${k <= e.stufe ? "an" : ""}"></i>`).join("")}</span>
      </button>`;
    }).join("")}</div>`;
  $$(".pop-karte", root).forEach(b => b.addEventListener("click", () => {
    offen = b.dataset.id; ergebnisse = []; subtonePhase = null; render(); window.scrollTo(0, 0);
  }));
}

/* --- Eine Technik -------------------------------------------------------------- */

function renderTechnik(t) {
  const e = eintrag(t.id);
  const u = t.uebung;
  const prog = PROGRESSIONS.find(p => p.id === u.prog);
  root.innerHTML = `
    <button class="zurueck" id="pop-zurueck">← Pop-Sound</button>
    <h2 style="margin-top:6px">${escapeHtml(t.name)}</h2>
    <p class="artikel-lead">${escapeHtml(t.kurz)}</p>
    <p class="artikel-text">${escapeHtml(t.warum)}</p>

    <h3>So geht's</h3>
    <ol class="pop-schritte">${t.wie.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ol>

    <h3>Typische Fehler</h3>
    <ul class="pop-fehler">${t.fehler.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>

    <p class="warnung"><b>Fertig, wenn:</b> ${escapeHtml(t.fertig)}</p>

    ${t.messung ? `<section class="panel pop-mess">
      <h3 style="margin-top:0">Messen</h3>
      <div id="pop-mess"></div>
    </section>` : ""}

    <section class="panel">
      <h3 style="margin-top:0">Über die Band</h3>
      <p class="hint">${escapeHtml(u.text)}</p>
      <p class="hint">${escapeHtml(grooveOf(u.groove).name)} · ${escapeHtml(prog.name)} · ${u.tempo} bpm</p>
      <div class="jetzt pop-jetzt">
        <div class="jetzt-kopf"><span id="pop-takt"></span><span class="jetzt-naechst" id="pop-naechst"></span></div>
        <div class="jetzt-akkord" id="pop-akkord">—</div>
      </div>
      <button class="wide primary" id="pop-band">Band starten</button>
    </section>

    <h3>Wo stehst du?</h3>
    <div class="stufenwahl">${STUFEN.map((s, i) => `
      <button class="stufe${i <= e.stufe ? " an" : ""}" data-i="${i}">
        <b>${escapeHtml(s.label)}</b><span>Fertig, wenn: ${escapeHtml(s.fertig)}</span>
      </button>`).join("")}</div>

    <h3>Hören</h3>
    <ul class="pop-hoeren">${t.hoeren.map(h => `<li><b>${escapeHtml(h.wer)}</b> — ${escapeHtml(h.was)}</li>`).join("")}</ul>`;

  $("#pop-zurueck", root).addEventListener("click", () => {
    aufraeumen(); offen = null; render(); window.scrollTo(0, 0);
  });
  $$(".stufe", root).forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    const d = eintrag(t.id);
    d.stufe = i === d.stufe ? i - 1 : i;
    d.last = todayISO();
    save();
    renderTechnik(t);
  }));

  // Band
  const akkorde = buildProgression(prog, u.tonart);
  const zeigeAkkord = info => {
    const a = info?.akkord || akkorde[0];
    $("#pop-akkord", root).textContent = gegriffenSymbol(a, state().settings.naming);
    $("#pop-takt", root).textContent = info ? `Takt ${info.takt + 1}` : "";
    $("#pop-naechst", root).textContent = info?.naechster && info.naechster !== a
      ? `dann ${gegriffenSymbol(info.naechster, state().settings.naming)}` : "";
  };
  zeigeAkkord(null);
  offBar?.(); offBar = band.onBar(info => { if (root && $("#pop-akkord", root)) zeigeAkkord(info); });
  offState?.(); offState = band.onStateChange(({ running }) => {
    const b = root && $("#pop-band", root);
    if (b) { b.textContent = running ? "Band stoppen" : "Band starten"; b.classList.toggle("primary", !running); }
  });
  $("#pop-band", root).addEventListener("click", () => {
    if (band.isRunning()) { band.stop(); releaseScreen(); return; }
    if (mikro) stoppeMikro();
    band.configure({ akkorde, bpm: u.tempo, swing: 0.62, groove: u.groove, a4: state().settings.a4, einzaehlen: true });
    band.start();
    holdScreen();
  });

  if (t.messung) renderMessung(t);
}

/* --- Messen ------------------------------------------------------------------------ */

const ANLEITUNG = {
  scoop: "Mikrofon an, dann einzelne Töne mit Scoop spielen, jeweils eine Sekunde halten und absetzen. Jeder Ton wird einzeln bewertet.",
  fall: "Mikrofon an, dann einen Ton halten und am Ende fallen lassen. Absetzen, nächster Versuch.",
  bend: "Mikrofon an, dann einen Ton halten, hinunterbiegen und zurück, noch einen Moment halten, absetzen.",
  vibrato: "Mikrofon an, dann lange Töne: zwei Schläge gerade ansetzen, dann Vibrato dazu, absetzen. Jeder Ton wird einzeln bewertet.",
  shake: "Mikrofon an, dann einen hohen Ton halten und schütteln, eine Sekunde oder länger, absetzen.",
  subtone: "Zwei Messungen auf demselben Ton, am besten tief D gegriffen: erst dein normaler leiser Ton, dann Subtone. Jeweils drei Sekunden.",
};

function renderMessung(t) {
  const host = $("#pop-mess", root);
  if (!host) return;
  const gut = ergebnisse.filter(r => r.gut).length;
  const letzte = ergebnisse.slice(-5);
  const bilanz = eintrag(t.id).messung || { gut: 0, gesamt: 0 };

  if (t.messung === "subtone") {
    const ph = subtonePhase;
    host.innerHTML = `
      <p class="hint">${ANLEITUNG.subtone} Ohne Band: das Mikrofon würde sonst den Bass hören.</p>
      <div class="row2">
        <button id="pop-normal" class="${ph?.phase === "normal" ? "weiter" : ""}">1 · Normal${ph?.normal ? " ✓" : ""}</button>
        <button id="pop-sub" class="${ph?.phase === "sub" ? "weiter" : ""}" ${ph?.normal ? "" : "disabled"}>2 · Subtone${ph?.sub ? " ✓" : ""}</button>
      </div>
      <p class="hint" id="pop-status">${ph?.phase ? "Misst … spiel den Ton und halte ihn." : ""}</p>
      ${letzte.length ? letzte.slice().reverse().map(ergebnisZeile).join("") : ""}
      ${bilanz.gesamt ? `<p class="hint">Bisher ${bilanz.gut} von ${bilanz.gesamt} Messungen gut.</p>` : ""}`;
    $("#pop-normal", host).addEventListener("click", () => starteSubtone(t, "normal"));
    $("#pop-sub", host).addEventListener("click", () => starteSubtone(t, "sub"));
    return;
  }

  host.innerHTML = `
    <p class="hint">${ANLEITUNG[t.messung]} Ohne Band: das Mikrofon würde sonst den Bass hören.</p>
    <button class="wide${mikro ? "" : " primary"}" id="pop-mikro">${mikro ? "Mikrofon aus" : "Mikrofon an"}</button>
    <p class="hint" id="pop-status">${mikro ? "Hört zu …" : ""}</p>
    ${letzte.length ? `<p class="hint">Diese Runde: ${gut} von ${ergebnisse.length} gut.</p>` : ""}
    ${letzte.slice().reverse().map(ergebnisZeile).join("")}
    ${bilanz.gesamt ? `<p class="hint">Insgesamt ${bilanz.gut} von ${bilanz.gesamt} Versuchen gut.</p>` : ""}`;
  $("#pop-mikro", host).addEventListener("click", async () => {
    if (mikro) { stoppeMikro(); renderMessung(t); return; }
    await starteMikro(t, false);
  });
}

function ergebnisZeile(r) {
  return `<div class="pop-ergebnis${r.gut ? " gut" : ""}">
    <span class="pop-zeichen">${r.gut ? "✓" : "✕"}</span>
    <span>${escapeHtml(r.text)}${r.ton ? ` <small>(${escapeHtml(r.ton)})</small>` : ""}</span>
  </div>`;
}

function merke(t, r) {
  ergebnisse.push(r);
  if (ergebnisse.length > 20) ergebnisse.shift();
  const d = eintrag(t.id);
  d.messung = d.messung || { gut: 0, gesamt: 0 };
  d.messung.gesamt++;
  if (r.gut) d.messung.gut++;
  d.last = todayISO();
  save();
}

/** Klingende MIDI-Zahl als gegriffener Tonname, für die Anzeige. */
const griffName = midi => { const p = fromMidi(Math.round(midi) + 9, "flat"); return spell(p, state().settings.naming) + p.octave; };

async function starteMikro(t, spektrum) {
  if (band.isRunning()) { band.stop(); releaseScreen(); toast("Band aus — sonst misst das Mikrofon den Bass"); }
  try {
    // Vibrato und Shake brauchen 60 Punkte je Sekunde, sonst hat eine
    // Welle nur fünf.
    await pitch.start({ spektrum, hz: ["vibrato", "shake"].includes(t.messung) ? 60 : 30 });
  } catch (e) {
    toast("Mikrofon nicht verfügbar");
    return false;
  }
  mikro = true;
  holdScreen();
  versuch = null; stilleSeit = 0;
  offPitch?.();
  offPitch = pitch.onPitch(p => aufMessung(t, p));
  if (t.messung !== "subtone") renderMessung(t);
  return true;
}

function stoppeMikro() {
  offPitch?.(); offPitch = null;
  if (mikro) { pitch.stop(); releaseScreen(); }
  mikro = false;
  versuch = null;
}

/* Ein Versuch beginnt mit dem ersten erkannten Ton und endet nach einer
   Viertelsekunde Stille — oder wenn die Erkennung den Ton verliert, was
   am Ende eines Falls regelmäßig passiert. */
function aufMessung(t, p) {
  if (!p) return;
  const jetzt = performance.now();
  if (t.messung === "subtone") return aufSubtone(t, p, jetzt);
  if (p.freq && !p.silent) {
    if (!versuch) versuch = { start: jetzt, punkte: [] };
    versuch.punkte.push({ t: jetzt - versuch.start, midi: freqToMidi(p.raw || p.freq, state().settings.a4) });
    stilleSeit = 0;
    return;
  }
  if (!versuch) return;
  if (!stilleSeit) stilleSeit = jetzt;
  if (jetzt - stilleSeit < 250) return;
  const v = versuch;
  versuch = null; stilleSeit = 0;
  if (v.punkte.length < M.MINDEST_PUNKTE) return;   // ein Kiekser, kein Versuch
  const r = M.MESSUNGEN[t.messung](v.punkte);
  const ziel = v.punkte[v.punkte.length > 3 ? Math.floor(v.punkte.length * 0.75) : 0].midi;
  merke(t, { ...r, ton: griffName(ziel) });
  if (root) renderMessung(t);
}

async function starteSubtone(t, phase) {
  if (!mikro && !(await starteMikro(t, true))) return;
  subtonePhase = { ...(subtonePhase || {}), phase, [phase]: null, sammel: [], start: null };
  renderMessung(t);
}

function aufSubtone(t, p, jetzt) {
  const ph = subtonePhase;
  if (!ph?.phase || !p.freq || p.silent) return;
  if (!ph.start) ph.start = jetzt;
  ph.sammel.push({ t: jetzt - ph.start, midi: freqToMidi(p.raw || p.freq, state().settings.a4), centroid: p.centroid || 0, rms: p.rms });
  if (jetzt - ph.start < 3000) return;
  ph[ph.phase] = ph.sammel;
  const fertig = ph.phase;
  ph.phase = null;
  if (fertig === "sub" && ph.normal) {
    const r = M.subtone(ph.normal, ph.sub);
    merke(t, { ...r, ton: griffName(ph.normal[Math.floor(ph.normal.length / 2)].midi) });
    stoppeMikro();
  }
  if (root) renderMessung(t);
}

function aufraeumen() {
  stoppeMikro();
  band.stop();
  releaseScreen();
  offBar?.(); offBar = null;
  offState?.(); offState = null;
  subtonePhase = null;
}

export default {
  id: "popsound",
  label: "Pop-Sound",
  mount(r) { root = r; render(); },
  unmount() {
    aufraeumen();
    band.configure({ einzaehlen: false, groove: "swing" });
    root = null;
  },
};
