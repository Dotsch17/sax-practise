/* ==========================================================================
   Üben — der Session-Runner

   Die Hauptansicht und der Grund, warum es die App gibt. Das iPhone steht am
   Notenständer, beide Hände sind am Instrument: grosze Ziffern, grosze
   Flächen, kein Scrollen für die Hauptaktion.
   ========================================================================== */

"use strict";

import { $, $$, el, mmss, escapeHtml, toast, on } from "../core/dom.js";
import { state, resetDay, save } from "../core/store.js";
import * as S from "../core/session.js";
import { WEEKS } from "../data/plan.js";

function render(root) {
  const st = S.status();
  const b = st.block;
  const p = st.plan;
  const day = state().day;

  const total = p.reduce((a, x) => a + x.min, 0);
  const doneMin = p.filter(x => day.done.includes(x.id)).reduce((a, x) => a + x.min, 0);

  root.innerHTML = `
    <div class="now">
      <h1 id="block-name">${escapeHtml(b.name)}</h1>
      <div class="of">Block ${st.index + 1} von ${p.length} · ${b.min} Minuten</div>
      <div class="clock" id="clock">${mmss(st.remaining)}</div>
      <div class="bar"><i id="bar-fill"></i></div>
      <ul class="cues">${b.cues.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
      <div class="controls">
        <button id="btn-toggle" class="primary"></button>
        <button id="btn-done">Fertig</button>
      </div>
    </div>

    <div class="plan" id="plan"></div>
    <div class="total">
      <span>${doneMin} von ${total} Minuten erledigt</span>
      <button id="btn-reset-day" class="linkish">Tag zurücksetzen</button>
    </div>`;

  renderPlan(root);
  paint(root);

  $("#btn-toggle", root).addEventListener("click", () => S.toggle());
  $("#btn-done", root).addEventListener("click", () => {
    S.stop();
    S.done(S.status().block.id);
    toast("Abgehakt");
  });
  $("#btn-reset-day", root).addEventListener("click", () => {
    resetDay();
    S.select(0);
    toast("Tag zurückgesetzt");
  });
}

function renderPlan(root) {
  const st = S.status();
  const day = state().day;
  const host = $("#plan", root);
  if (!host) return;

  host.innerHTML = st.plan.map((x, i) => {
    const done = day.done.includes(x.id);
    const stateName = done ? "done" : (i === st.index ? "current" : "open");
    const mark = done ? "✓" : (stateName === "current" ? "▸" : "");
    // Tatsächlich verbrachte Zeit steht daneben, sobald es sie gibt — die
    // Lücke zwischen geplant und wirklich ist die interessante Zahl.
    const spent = day.spent[x.id] ? Math.round(day.spent[x.id] / 60) : 0;
    return `<button class="plan-row" data-i="${i}" data-state="${stateName}">
              <span class="idx">${i + 1}</span>
              <span class="name">${escapeHtml(x.name)}</span>
              <span class="min">${spent ? `${spent}/${x.min}` : x.min}</span>
              <span class="mark">${mark}</span>
            </button>`;
  }).join("");

  $$(".plan-row", host).forEach(elm =>
    elm.addEventListener("click", () => S.select(Number(elm.dataset.i))));
}

function paint(root) {
  const st = S.status();
  const clock = $("#clock", root);
  if (!clock) return;
  const done = state().day.done.includes(st.block.id);
  clock.textContent = mmss(st.remaining);
  clock.className = "clock" + (st.running ? " running" : "") + (done && !st.running ? " done" : "");
  const fill = $("#bar-fill", root);
  if (fill) fill.style.width = (100 * (1 - st.remaining / (st.block.min * 60))).toFixed(1) + "%";
  const btn = $("#btn-toggle", root);
  if (btn) btn.textContent = st.running ? "Pause"
    : (st.remaining < st.block.min * 60 ? "Weiter" : "Starten");
}

export default {
  id: "session",
  label: "Session",
  mount(root) {
    render(root);
    // Nur die Uhr neu malen, nicht die ganze Ansicht — sonst flackert die
    // Liste jede Fünftelsekunde.
    const offTick = on("session:tick", () => paint(root));
    const offChange = on("session:changed", () => render(root));
    this._off = () => { offTick(); offChange(); };
  },
  unmount() { this._off?.(); },
  // Die Wochenwahl gehört in die Kopfzeile, nicht in eine Werkzeugliste.
  topbar: () => {
    const sel = el("select", { id: "week-select", "aria-label": "Woche" },
      [1, 2, 3, 4].map(w => el("option", { value: w, selected: state().week === w }, `Woche ${w}`)));
    sel.addEventListener("change", e => {
      state().week = Number(e.target.value);
      save();
      S.select(0);
    });
    return sel;
  },
  focusLine: () => WEEKS[state().week]?.focus || "",
};
