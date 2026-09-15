/* ==========================================================================
   Protokoll

   Was heute gemacht wurde, plus eine Notiz. Die Notiz ist der wertvollste
   Teil: „welches Blatt, welche Töne waren schief" beantwortet in vier Wochen
   Fragen, die keine Statistik beantworten kann.
   ========================================================================== */

"use strict";

import { $, el, escapeHtml, toast, humanMinutes } from "../core/dom.js";
import { state, save } from "../core/store.js";
import { planForWeek } from "../data/plan.js";

function todaySummary() {
  const s = state();
  const plan = planForWeek(s.week);
  const done = plan.filter(x => s.day.done.includes(x.id));
  const geplant = done.reduce((a, x) => a + x.min, 0);
  const wirklich = Math.round(
    Object.values(s.day.spent).reduce((a, v) => a + v, 0) / 60);
  return { done, geplant, wirklich };
}

function render(root) {
  const { done, geplant, wirklich } = todaySummary();
  const log = [...state().log].reverse();

  root.innerHTML = `
    <p class="hint" id="log-summary">${
      done.length
        ? `${done.length} ${done.length === 1 ? "Block" : "Blöcke"}, ${geplant} geplante Minuten${
            wirklich ? `, ${wirklich} wirklich am Instrument` : ""}: ${
            done.map(x => escapeHtml(x.name)).join(", ")}`
        : "Noch kein Block abgeschlossen."}</p>

    <textarea id="log-note" placeholder="Was hat funktioniert, was nicht? Welches Blatt? Welche Töne waren schief?"></textarea>
    <button class="wide" id="btn-save">Session speichern</button>

    <h2>Bisher</h2>
    <div id="entries">${
      log.length
        ? log.map(entryHtml).join("")
        : `<p class="empty">Noch keine Sessions gespeichert. Speichere die erste am Ende deiner Übung.</p>`}</div>`;

  $("#btn-save", root).addEventListener("click", () => {
    const s = state();
    const { done, geplant, wirklich } = todaySummary();
    s.log.push({
      date: s.day.date,
      week: s.week,
      blocks: done.map(x => x.name),
      minutes: geplant,
      spent: wirklich,
      note: $("#log-note", root).value.trim(),
    });
    save();
    toast("Session gespeichert");
    render(root);
  });
}

function entryHtml(e) {
  const minuten = e.spent && e.spent !== e.minutes
    ? `${e.spent} min gespielt · ${e.minutes} geplant`
    : humanMinutes(e.minutes);
  return `<div class="entry">
    <div class="head"><b>${escapeHtml(e.date)}</b><span>${escapeHtml(minuten)}</span></div>
    <div class="meta">Woche ${e.week} · ${e.blocks.map(escapeHtml).join(", ") || "keine Blöcke"}</div>
    ${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ""}
  </div>`;
}

export default {
  id: "protokoll",
  label: "Protokoll",
  mount(root) { render(root); },
};
