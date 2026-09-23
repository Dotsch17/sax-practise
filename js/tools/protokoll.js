/* ==========================================================================
   Protokoll

   Was heute gemacht wurde, plus eine Notiz. Die Notiz ist der wertvollste
   Teil: „welches Blatt, welche Töne waren schief“ beantwortet in vier Wochen
   Fragen, die keine Statistik beantworten kann.
   ========================================================================== */

"use strict";

import { $, el, escapeHtml, toast, humanMinutes } from "../core/dom.js";
import { state, save } from "../core/store.js";
import { planFor } from "../data/plan.js";

function todaySummary() {
  const s = state();
  const plan = planFor(s.kontext, { minuten: s.settings.minuten || 0, schwerpunkt: s.day.schwerpunkt || null });
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
      week: s.week,   // bleibt für alte Einträge im Protokoll stehen
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

/* „Mi., 23. Sep.“ statt 2026-09-23: liest sich schneller, und das ISO-Datum
   brach am Telefon mitten in der Zahl um. Das Jahr nur, wenn es nicht das
   laufende ist. */
function datumKurz(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = { weekday: "short", day: "numeric", month: "short" };
  if (y !== new Date().getFullYear()) opts.year = "numeric";
  return dt.toLocaleDateString("de-AT", opts);
}

function entryHtml(e) {
  const minuten = e.spent && e.spent !== e.minutes
    ? `${e.spent} min gespielt · ${e.minutes} geplant`
    : humanMinutes(e.minutes);
  return `<div class="entry">
    <div class="head"><b>${escapeHtml(datumKurz(e.date))}</b><span>${escapeHtml(minuten)}</span></div>
    <div class="meta">${e.blocks.map(escapeHtml).join(", ") || "keine Blöcke"}</div>
    ${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ""}
  </div>`;
}

export default {
  id: "protokoll",
  label: "Protokoll",
  mount(root) { render(root); },
};
