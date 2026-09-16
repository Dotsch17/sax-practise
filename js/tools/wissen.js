/* ==========================================================================
   Wissen

   Zwei Wege hinein: über das Thema, wenn man etwas nachlesen will, und über
   das Symptom, wenn gerade etwas nicht klappt. Der zweite Weg ist der
   wichtigere — beim Üben hat man ein Problem, keine Frage.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast } from "../core/dom.js";
import { state, save } from "../core/store.js";
import { ARTIKEL, DIAGNOSE, THEMEN } from "../data/wissen.js";
import { BLOCKS } from "../data/plan.js";

let offen = null;     // id des offenen Artikels
let modus = "diagnose";

const artikelOf = id => ARTIKEL.find(a => a.id === id);
const gelesen = id => (state().read || []).includes(id);

function markiereGelesen(id) {
  const s = state();
  if (!s.read) s.read = [];
  if (!s.read.includes(id)) { s.read.push(id); save(); }
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div class="chips" role="group" aria-label="Zugang">
      <button class="chip" data-modus="diagnose">Da klemmt was</button>
      <button class="chip" data-modus="themen">Nachlesen</button>
    </div>
    <div id="w-body"></div>`;

  $$("[data-modus]", root).forEach(b => b.addEventListener("click", () => {
    modus = b.dataset.modus;
    offen = null;
    render(root);
  }));
  $$("[data-modus]", root).forEach(b => b.classList.toggle("on", b.dataset.modus === modus));

  if (offen) renderArtikel(root, offen);
  else if (modus === "diagnose") renderDiagnose(root);
  else renderThemen(root);
}

function renderDiagnose(root) {
  const host = $("#w-body", root);
  host.innerHTML = `
    <p class="hint">
      Such das Symptom, nicht die Theorie. Die Ursachen stehen in der
      Reihenfolge, in der du sie prüfen solltest — oben das Wahrscheinlichste.
    </p>
    ${DIAGNOSE.map((d, i) => `
      <details class="diag">
        <summary>${escapeHtml(d.problem)}</summary>
        <ol class="diag-liste">
          ${d.ursachen.map(u => `<li>${escapeHtml(u)}</li>`).join("")}
        </ol>
        <div class="diag-links">
          ${d.artikel.map(a => {
            const art = artikelOf(a);
            return art ? `<button class="chip" data-artikel="${a}">${escapeHtml(art.titel)}</button>` : "";
          }).join("")}
        </div>
      </details>`).join("")}`;

  bindeArtikelLinks(root);
}

function renderThemen(root) {
  const host = $("#w-body", root);
  host.innerHTML = THEMEN.map(t => {
    const liste = ARTIKEL.filter(a => a.thema === t);
    if (!liste.length) return "";
    return `<h3>${escapeHtml(t)}</h3>
      <div class="artikel-liste">
        ${liste.map(a => `
          <button class="artikel-karte${gelesen(a.id) ? " gelesen" : ""}" data-artikel="${a.id}">
            <b>${escapeHtml(a.titel)}</b>
            <span>${escapeHtml(a.lead)}</span>
          </button>`).join("")}
      </div>`;
  }).join("");

  bindeArtikelLinks(root);
}

function bindeArtikelLinks(root) {
  $$("[data-artikel]", root).forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    offen = b.dataset.artikel;
    render(root);
    window.scrollTo(0, 0);
  }));
}

function renderArtikel(root, id) {
  const a = artikelOf(id);
  if (!a) { offen = null; render(root); return; }
  markiereGelesen(id);

  const block = a.block ? BLOCKS.find(b => b.id === a.block) : null;
  const host = $("#w-body", root);

  host.innerHTML = `
    <button class="zurueck" id="w-back">← Zurück</button>
    <h2 style="margin-top:6px">${escapeHtml(a.titel)}</h2>
    <p class="artikel-lead">${escapeHtml(a.lead)}</p>
    ${block ? `<p class="hint">Gehört zum Block „${escapeHtml(block.name)}“, ${block.min} Minuten.</p>` : ""}

    ${a.abschnitte.map(s => `
      <h3>${escapeHtml(s.h)}</h3>
      ${(s.p || []).map(t => `<p class="artikel-text">${escapeHtml(t)}</p>`).join("")}
      ${s.liste ? `<ul class="cues">${s.liste.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
    `).join("")}

    ${block ? `<div class="panel">
      <p class="hint" style="margin:0 0 8px">Die Merkpunkte aus dem Übungsplan dazu:</p>
      <ul class="cues" style="margin:0">${block.cues.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
    </div>` : ""}`;

  $("#w-back", host).addEventListener("click", () => { offen = null; render(root); });
}

export default {
  id: "wissen",
  label: "Wissen",
  mount(root) { render(root); },
  unmount() { offen = null; },
};
