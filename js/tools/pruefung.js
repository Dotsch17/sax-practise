/* ==========================================================================
   Prüfung

   Der Überblick über die Zulassungsprüfung IGP Saxophon Popularmusik:
   wie viele Tage noch, was verlangt ist, wo jeder Punkt steht, und ob das
   zum Zeitplan passt.

   Warum es das gibt: neun Monate sind lang genug, um jede Woche das Falsche
   zu üben. Wer nur nach Lust übt, übt die Stücke, die schon gehen, und
   merkt im April, dass das Klavier noch bei null steht. Diese Ansicht
   rechnet vom Prüfungstag rückwärts und sagt, was bis wann stehen muss.

   Alles Inhaltliche — Anforderungen, Stufen, Meilensteine — steht in
   js/data/pruefung.js.
   ========================================================================== */

"use strict";

import { $, $$, escapeHtml, toast, todayISO, emit } from "../core/dom.js";
import { state, save, drill } from "../core/store.js";
import {
  TEILE, STUFEN, STILE, VORSCHLAEGE, QUELLEN, punktOf, eintrag, eintragSchluessel,
  termin, meilensteine, sollStufe, naechsterMeilenstein, tageBis, hinweise,
} from "../data/pruefung.js";
import { abdeckung } from "../music/skalenarten.js";
import { abdeckung as kadenzAbdeckung } from "../music/kadenz.js";
import * as aufnahmen from "../core/aufnahmen.js";
import { vorwaehlen } from "./aufnahme.js";
import { vorwaehlen as hoertestModus } from "./hoertest.js";

let offen = null;
let root = null;

const heute = () => todayISO();
const datumDe = iso => { const [y, m, d] = iso.split("-"); return `${Number(d)}.${Number(m)}.${y}`; };

function speichereEintrag(id, patch) {
  const d = drill(eintragSchluessel(id), {});
  Object.assign(d, patch);
  d.last = heute();
  save();
}

function gehZu(tab, tool) { location.hash = `#${tab}/${tool}`; }

/* --- Überblick ---------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (offen) { renderPunkt(offen); return; }
  const drills = state().drills;
  const t = termin(drills);
  const tage = tageBis(heute(), t.datum);
  const naechst = naechsterMeilenstein(t.datum, heute());
  const soll = sollStufe(t.datum, heute());
  const tipps = hinweise(drills, heute());

  root.innerHTML = `
    <div class="countdown">
      <b>${Math.max(0, tage)}</b>
      <span>Tage bis zur Zulassungsprüfung IGP Saxophon Popularmusik${t.geschaetzt ? " — Termin geschätzt" : ""}</span>
    </div>
    <label class="feld">Prüfungstag
      <input type="date" id="pr-termin" value="${t.datum}">
    </label>

    ${naechst ? `<div class="rat">
      <div class="rat-kopf">Als Nächstes · bis ${datumDe(naechst.datum)}</div>
      <b class="rat-titel">${escapeHtml(naechst.titel)}</b>
      <p class="rat-grund">${escapeHtml(naechst.was)}</p>
    </div>` : ""}

    ${tipps.map(h => `<p class="warnung">${escapeHtml(h)}</p>`).join("")}

    ${TEILE.map(teil => `
      <section class="pr-teil">
        <h2>${escapeHtml(teil.titel)}</h2>
        ${teil.punkte.map(p => punktKarte(p, soll)).join("")}
      </section>`).join("")}

    <h2>Zeitplan</h2>
    <div id="pr-plan">${meilensteine(t.datum).map(m => {
      const klasse = m.datum < heute() ? "vorbei" : (m === naechst ? "jetzt" : "");
      return `<div class="meilenstein ${klasse}">
        <time>${datumDe(m.datum)}</time>
        <span class="zeichen">${m.datum < heute() ? "✓" : m === naechst ? "▸" : ""}</span>
        <span><b>${escapeHtml(m.titel)}</b></span>
      </div>`;
    }).join("")}</div>

    <h2>Quellen</h2>
    <p class="hint">Stand der Anforderungen: Studienjahr 2026/27. Vor der Anmeldung gegenlesen —
      die Institute ändern Details von Jahr zu Jahr.</p>
    ${QUELLEN.map(q => `<p class="hint"><a class="linkish" href="${q.url}" target="_blank" rel="noopener">${escapeHtml(q.titel)}</a></p>`).join("")}`;

  $("#pr-termin", root).addEventListener("change", e => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return;
    speichereEintrag("termin", { datum: e.target.value });
    toast("Termin gespeichert");
    render();
    emit("topbar:refresh");
  });
  $$(".pr-punkt", root).forEach(b => b.addEventListener("click", () => {
    const p = punktOf(b.dataset.id);
    if (p.art === "abdeckung") { gehZu(p.werkzeug.tab, p.werkzeug.tool); return; }
    offen = p.id;
    render();
    window.scrollTo(0, 0);
  }));
}

function punktKarte(p, soll) {
  const e = eintrag(state().drills, p.id);
  if (p.art === "abdeckung") {
    const a = p.id === "kadenzen"
      ? kadenzAbdeckung(state().drills, state().settings.kadenzVariante || 1)
      : abdeckung(state().drills);
    return `<button class="pr-punkt" data-id="${p.id}">
      <span class="pr-punkt-kopf"><b>${escapeHtml(p.titel)}</b><em>${a.geuebt} von ${a.gesamt}</em></span>
      <span class="pr-punkt-sub">${escapeHtml(p.was)}</span>
      <span class="pr-stufen"><i class="an" style="flex:${a.geuebt || 0.0001}"></i><i style="flex:${a.gesamt - a.geuebt || 0.0001}"></i></span>
    </button>`;
  }
  const stufen = STUFEN[p.art];
  const stufe = e.stufe ?? -1;
  const mitStufenSoll = p.art !== "pruefpunkt";
  const titel = e.titel ? `${e.titel}` : p.titel;
  const status = stufe >= 0 ? stufen[stufe].label : "offen";
  const unter = e.titel
    ? [p.titel, e.stil].filter(Boolean).join(" · ")
    : p.was;
  return `<button class="pr-punkt" data-id="${p.id}">
    <span class="pr-punkt-kopf"><b>${escapeHtml(titel)}</b><em>${escapeHtml(status)}</em></span>
    <span class="pr-punkt-sub">${escapeHtml(unter)}</span>
    <span class="pr-stufen">${stufen.map((s, i) =>
      `<i class="${i <= stufe ? "an" : ""}${mitStufenSoll && i === soll ? " soll" : ""}"></i>`).join("")}</span>
  </button>`;
}

/* --- Ein Punkt ------------------------------------------------------------------ */

function renderPunkt(id) {
  const p = punktOf(id);
  const e = eintrag(state().drills, id);
  const stufen = STUFEN[p.art];
  const stufe = e.stufe ?? -1;
  const mitStueck = ["stueck", "etuede", "klavier"].includes(p.art);
  const soll = sollStufe(termin(state().drills).datum, heute());
  const vorschlaege = VORSCHLAEGE[p.art] || [];

  root.innerHTML = `
    <button class="zurueck" id="pr-zurueck">← Prüfung</button>
    <h2 style="margin-top:6px">${escapeHtml(p.titel)}</h2>
    <p class="hint">${escapeHtml(p.was)}</p>

    ${mitStueck ? `
      <label class="feld">Titel
        <input type="text" id="pr-titel" list="pr-vorschlaege" value="${escapeHtml(e.titel || "")}" autocomplete="off">
        <datalist id="pr-vorschlaege">${vorschlaege.map(v => `<option value="${escapeHtml(v.titel)}">`).join("")}</datalist>
      </label>
      ${p.stil ? `<label class="feld">Stilrichtung
        <select id="pr-stil"><option value="">—</option>${STILE.map(s =>
          `<option${s === e.stil ? " selected" : ""}>${escapeHtml(s)}</option>`).join("")}</select>
      </label>` : ""}
      <div class="grid3">
        <label>Zieltempo<input type="number" id="pr-ziel" inputmode="numeric" min="30" max="360" value="${e.zielBpm || ""}"></label>
        <label>Geht gerade<input type="number" id="pr-jetzt" inputmode="numeric" min="30" max="360" value="${e.jetztBpm || ""}"></label>
      </div>` : ""}

    <h3>Wo steht es?</h3>
    <div class="stufenwahl">${stufen.map((s, i) => `
      <button class="stufe${i <= stufe ? " an" : ""}" data-i="${i}">
        <b>${escapeHtml(s.label)}${mitStueck && i === soll ? " · laut Zeitplan jetzt" : ""}</b>
        <span>Fertig, wenn: ${escapeHtml(s.fertig)}</span>
      </button>`).join("")}</div>

    ${mitStueck ? `
      <div class="row2">
        <button id="pr-durchlauf">Durchlauf ohne Anhalten · ${e.durchlaeufe || 0}</button>
        <button id="pr-aufnehmen">Aufnehmen</button>
      </div>
      <p class="hint" id="pr-aufnahme-info"></p>` : ""}

    ${p.werkzeug ? `<button class="wide" id="pr-werkzeug">${escapeHtml(p.werkzeug.name)} öffnen</button>` : ""}

    <label class="feld">Notiz
      <textarea id="pr-notiz" placeholder="Welche Stelle klemmt, welche Aufnahme dient als Vorbild, was sagt der Lehrer">${escapeHtml(e.notiz || "")}</textarea>
    </label>`;

  $("#pr-zurueck", root).addEventListener("click", () => { offen = null; render(); window.scrollTo(0, 0); });
  $$(".stufe", root).forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    // Nochmal auf die oberste gesetzte Stufe tippen nimmt sie zurück.
    speichereEintrag(id, { stufe: i === stufe ? i - 1 : i });
    renderPunkt(id);
  }));
  const feld = (sel, key, wandeln = v => v.trim()) => {
    const f = $(sel, root);
    if (f) f.addEventListener("change", () => speichereEintrag(id, { [key]: wandeln(f.value) }));
  };
  feld("#pr-titel", "titel");
  feld("#pr-stil", "stil");
  feld("#pr-ziel", "zielBpm", v => Number(v) || null);
  feld("#pr-jetzt", "jetztBpm", v => Number(v) || null);
  feld("#pr-notiz", "notiz");

  $("#pr-durchlauf", root)?.addEventListener("click", () => {
    speichereEintrag(id, { durchlaeufe: (eintrag(state().drills, id).durchlaeufe || 0) + 1 });
    toast("Durchlauf gezählt");
    renderPunkt(id);
  });
  $("#pr-aufnehmen", root)?.addEventListener("click", () => {
    const t = $("#pr-titel", root)?.value.trim() || p.titel;
    speichereEintrag(id, { titel: t });
    vorwaehlen(t);
    gehZu("ueben", "aufnahme");
  });
  $("#pr-werkzeug", root)?.addEventListener("click", () => {
    if (p.werkzeug.tool === "hoertest" && p.werkzeug.modus) hoertestModus(p.werkzeug.modus);
    gehZu(p.werkzeug.tab, p.werkzeug.tool);
  });

  if (mitStueck && e.titel) {
    aufnahmen.alle().then(liste => {
      const eigene = liste.filter(a => a.titel === e.titel);
      const info = $("#pr-aufnahme-info", root);
      if (!info) return;
      info.textContent = eigene.length
        ? `${eigene.length} ${eigene.length === 1 ? "Aufnahme" : "Aufnahmen"}, zuletzt am ${datumDe(eigene[0].datum)}.`
        : "Noch keine Aufnahme. Nimm heute den Stand auf, damit du in vier Wochen vergleichen kannst.";
    }).catch(() => {});
  }
}

export default {
  id: "pruefung",
  label: "Prüfung",
  mount(r) { root = r; render(); },
  unmount() { root = null; },
  focusLine: () => {
    const t = termin(state().drills);
    const tage = tageBis(todayISO(), t.datum);
    return tage >= 0 ? `noch ${tage} Tage bis zur Prüfung${t.geschaetzt ? " (geschätzt)" : ""}` : "";
  },
};
