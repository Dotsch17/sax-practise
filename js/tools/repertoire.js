/* ==========================================================================
   Repertoire

   Nicht als Bibliothek gedacht, sondern als Arbeitsliste. Der Kern ist nicht
   das Stück, sondern die Stelle: welcher Takt klemmt, in welchem Tempo er
   gerade geht, und wann du zuletzt daran warst. Genau das vergisst man von
   einem Tag auf den nächsten, und genau das entscheidet, ob ein Stück in
   sechs Wochen sitzt.

   Auch für Altissimo-Griffe ist hier der richtige Platz: welcher Griff in
   welchem Stück trägt, ist am Instrument verschieden und gehört zur Stelle,
   nicht in eine allgemeine Tabelle.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO, daysBetween } from "../core/dom.js";
import { state, save } from "../core/store.js";

const STATUS = [
  { id: "neu", label: "Neu" },
  { id: "arbeit", label: "In Arbeit" },
  { id: "sitzt", label: "Sitzt" },
  { id: "ruht", label: "Ruht" },
];

let offen = null;

const stuecke = () => {
  const s = state();
  if (!Array.isArray(s.repertoire)) s.repertoire = [];
  return s.repertoire;
};
const findeStueck = id => stuecke().find(x => x.id === id);
const neueId = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  if (offen) { renderStueck(root, offen); return; }

  const liste = stuecke();
  const heute = todayISO();

  root.innerHTML = `
    <div class="panel">
      <div class="grid3">
        <label style="grid-column:1/-1">Stück
          <input type="text" id="rp-titel" placeholder="Ferling, Etüde Nr. 4">
        </label>
        <label style="grid-column:1/-1">Komponist
          <input type="text" id="rp-komponist" placeholder="optional">
        </label>
      </div>
      <button class="wide" id="rp-add">Aufnehmen</button>
    </div>

    ${liste.length ? `<div id="rp-liste">${liste.map(s => karte(s, heute)).join("")}</div>`
      : `<p class="empty">Noch nichts aufgenommen. Trag das Stück ein, an dem du
         gerade arbeitest — und danach die Takte, die klemmen.</p>`}`;

  $("#rp-add", root).addEventListener("click", () => {
    const titel = $("#rp-titel", root).value.trim();
    if (!titel) { toast("Ohne Titel geht es nicht"); return; }
    stuecke().push({
      id: neueId(),
      titel,
      komponist: $("#rp-komponist", root).value.trim(),
      status: "neu",
      angelegt: todayISO(),
      stellen: [],
      notiz: "",
    });
    save();
    toast("Aufgenommen");
    render(root);
  });

  $$("[data-stueck]", root).forEach(b => b.addEventListener("click", () => {
    offen = b.dataset.stueck;
    render(root);
    window.scrollTo(0, 0);
  }));
}

function karte(s, heute) {
  const offeneStellen = (s.stellen || []).filter(x => !x.sitzt).length;
  const letzte = (s.stellen || []).map(x => x.last).filter(Boolean).sort().pop();
  const tage = letzte ? daysBetween(letzte, heute) : null;
  return `<button class="rp-karte" data-stueck="${s.id}">
    <span class="rp-kopf">
      <b>${escapeHtml(s.titel)}</b>
      <i class="rp-status">${STATUS.find(x => x.id === s.status)?.label || ""}</i>
    </span>
    ${s.komponist ? `<span class="rp-sub">${escapeHtml(s.komponist)}</span>` : ""}
    <span class="rp-sub">
      ${(s.stellen || []).length
        ? `${(s.stellen || []).length} Stellen, ${offeneStellen} offen`
        : "keine Stellen notiert"}
      ${tage !== null ? ` · zuletzt vor ${tage} ${tage === 1 ? "Tag" : "Tagen"}` : ""}
    </span>
  </button>`;
}

/* --- Ein Stück --------------------------------------------------------------- */

function renderStueck(root, id) {
  const s = findeStueck(id);
  if (!s) { offen = null; render(root); return; }

  root.innerHTML = `
    <button class="zurueck" id="rp-back">← Alle Stücke</button>
    <h2 style="margin-top:6px">${escapeHtml(s.titel)}</h2>
    ${s.komponist ? `<p class="hint" style="margin-top:0">${escapeHtml(s.komponist)}</p>` : ""}

    <div class="chips" id="rp-status" role="group" aria-label="Status"></div>

    <h3>Stellen</h3>
    <p class="hint">
      Takt, Problem, Tempo. Beim Üben nur die offenen Stellen durchgehen —
      das Stück von vorn zu spielen ist Zeitvertreib, keine Arbeit.
    </p>
    <div id="rp-stellen"></div>

    <div class="panel">
      <div class="grid3">
        <label>Takte<input type="text" id="rp-takt" placeholder="17–24"></label>
        <label>Tempo<input type="number" id="rp-tempo" min="20" max="240" placeholder="${state().settings.bpm}"></label>
        <label style="grid-column:1/-1">Was klemmt
          <input type="text" id="rp-was" placeholder="Sprung ins Altissimo G, Ansprache">
        </label>
      </div>
      <button class="wide" id="rp-add-stelle">Stelle notieren</button>
    </div>

    <h3>Notiz zum Stück</h3>
    <textarea id="rp-notiz" placeholder="Ausgabe, Tempoangabe, Atemstellen, welcher Altissimo-Griff hier trägt">${escapeHtml(s.notiz || "")}</textarea>

    <div class="row2">
      <button id="rp-save-notiz">Notiz sichern</button>
      <button id="rp-del" class="linkish">Stück löschen</button>
    </div>`;

  renderStatus(root, s);
  renderStellen(root, s);

  $("#rp-back", root).addEventListener("click", () => { offen = null; render(root); });

  $("#rp-add-stelle", root).addEventListener("click", () => {
    const takt = $("#rp-takt", root).value.trim();
    const was = $("#rp-was", root).value.trim();
    if (!takt && !was) { toast("Takt oder Problem angeben"); return; }
    s.stellen = s.stellen || [];
    s.stellen.push({
      id: neueId(), takt, was,
      tempo: Number($("#rp-tempo", root).value) || null,
      sitzt: false, last: todayISO(),
    });
    save();
    renderStueck(root, id);
  });

  $("#rp-save-notiz", root).addEventListener("click", () => {
    s.notiz = $("#rp-notiz", root).value;
    save();
    toast("Notiz gesichert");
  });

  $("#rp-del", root).addEventListener("click", () => {
    // Bewusst zweistufig: ein Fehlgriff darf kein Stück mit Monaten Arbeit
    // löschen.
    const btn = $("#rp-del", root);
    if (btn.dataset.sicher !== "ja") {
      btn.dataset.sicher = "ja";
      btn.textContent = "Wirklich löschen?";
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.dataset.sicher = ""; btn.textContent = "Stück löschen";
      }, 4000);
      return;
    }
    const arr = stuecke();
    arr.splice(arr.findIndex(x => x.id === id), 1);
    save();
    offen = null;
    toast("Gelöscht");
    render(root);
  });
}

function renderStatus(root, s) {
  const host = $("#rp-status", root);
  host.innerHTML = "";
  for (const st of STATUS) {
    host.append(el("button", {
      class: "chip" + (s.status === st.id ? " on" : ""),
      text: st.label,
      on: { click: () => { s.status = st.id; save(); renderStatus(root, s); } },
    }));
  }
}

function renderStellen(root, s) {
  const host = $("#rp-stellen", root);
  const liste = s.stellen || [];
  if (!liste.length) {
    host.innerHTML = `<p class="hint">Noch keine Stelle notiert.</p>`;
    return;
  }
  // Offene zuerst — beim Üben will man sie oben haben.
  const sortiert = [...liste].sort((a, b) => (a.sitzt ? 1 : 0) - (b.sitzt ? 1 : 0));
  host.innerHTML = sortiert.map(st => `
    <div class="rp-stelle${st.sitzt ? " sitzt" : ""}">
      <button class="rp-haken" data-toggle="${st.id}"
        aria-label="${st.sitzt ? "wieder öffnen" : "als sitzend markieren"}">${st.sitzt ? "✓" : "○"}</button>
      <span class="rp-stelle-text">
        <b>${escapeHtml(st.takt || "—")}</b>
        ${st.was ? `<span>${escapeHtml(st.was)}</span>` : ""}
      </span>
      <span class="rp-stelle-tempo">${st.tempo ? st.tempo + "<small> bpm</small>" : ""}</span>
      <button class="rp-weg" data-del="${st.id}" aria-label="Stelle entfernen">✕</button>
    </div>`).join("");

  $$("[data-toggle]", host).forEach(b => b.addEventListener("click", () => {
    const st = liste.find(x => x.id === b.dataset.toggle);
    st.sitzt = !st.sitzt;
    st.last = todayISO();
    save();
    renderStellen(root, s);
  }));
  $$("[data-del]", host).forEach(b => b.addEventListener("click", () => {
    s.stellen = liste.filter(x => x.id !== b.dataset.del);
    save();
    renderStellen(root, s);
  }));
}

export default {
  id: "repertoire",
  label: "Repertoire",
  mount(root) { render(root); },
  unmount() { offen = null; },
};
