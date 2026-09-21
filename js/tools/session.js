/* ==========================================================================
   Üben — der Session-Runner

   Die Hauptansicht und der Grund, warum es die App gibt. Das Gerät steht am
   Notenständer, beide Hände sind am Instrument: große Ziffern, große
   Flächen, kein Scrollen für die Hauptaktion.

   Zwei Dinge, die diese Ansicht von einer Checkliste unterscheiden:

   1. **Der Kontext bestimmt den Plan.** Nicht „derselbe Plan, nur leiser“ —
      sondern ein anderer Plan. Am Travel Sax lässt sich keine Tonarbeit
      üben, zu Hause kein Forte, und beides ist kein Mangel, sondern eine
      Information darüber, was dort sinnvoll ist. Siehe KONTEXTE in
      js/data/plan.js.

   2. **Das Werkzeug läuft im Block mit.** Ein Block, der „Bordun laufen
      lassen“ sagt, während der Bordun in einem anderen Reiter sitzt, ist
      eine Anleitung und keine Übung. Das zugehörige Werkzeug wird deshalb
      direkt hier eingehängt — nachgeladen, wenn der Block drankommt, und
      wieder abgeräumt, wenn man weitergeht.
   ========================================================================== */

"use strict";

import { $, $$, el, mmss, escapeHtml, toast, on, emit } from "../core/dom.js";
import { state, resetDay, save } from "../core/store.js";
import * as S from "../core/session.js";
import { WEEKS, KONTEXTE, kontextOf } from "../data/plan.js";
import { befunde } from "../core/koennen.js";

// Das eingehängte Werkzeug, damit es beim Blockwechsel abgeräumt wird.
let werkzeug = null;
let werkzeugId = null;

/* --- Werkzeug ein- und aushängen ---------------------------------------------- */

function raeumeWerkzeug() {
  if (werkzeug?.unmount) { try { werkzeug.unmount(); } catch (e) { console.warn(e); } }
  werkzeug = null;
  werkzeugId = null;
}

/**
 * Lädt das Werkzeug eines Blocks nach und hängt es ein. Dynamisch geladen,
 * weil eine feste Einbindung einen Ringschluss gäbe: die Werkzeugliste
 * kennt diese Datei, und diese Datei bräuchte die Werkzeugliste.
 */
async function haengeWerkzeugEin(root, id) {
  const host = $("#werkzeug-inhalt", root);
  const rahmen = $("#werkzeug", root);
  if (!host || !rahmen) return;

  if (!id) { raeumeWerkzeug(); rahmen.hidden = true; host.innerHTML = ""; return; }
  if (id === werkzeugId) return;          // schon da

  raeumeWerkzeug();
  rahmen.hidden = false;
  host.innerHTML = `<p class="hint">lädt …</p>`;

  try {
    const mod = await import(`./${id}.js`);
    const w = mod.default;
    // Zwischen Anfordern und Laden kann der Block gewechselt haben.
    if (!$("#werkzeug-inhalt", root) || $("#werkzeug", root)?.dataset.will !== id) return;
    host.innerHTML = "";
    $("#werkzeug-titel", root).textContent = w.label;
    w.mount(host);
    werkzeug = w;
    werkzeugId = id;
  } catch (e) {
    console.error("Werkzeug " + id + " konnte nicht geladen werden:", e);
    host.innerHTML = `<p class="empty">Dieses Werkzeug lädt gerade nicht.
      Du findest es auch in seinem eigenen Bereich.</p>`;
  }
}

/* --- Ansicht ------------------------------------------------------------------ */

function render(root) {
  const st = S.status();
  const b = st.block;
  const p = st.plan;
  const day = state().day;
  const k = kontextOf(state().kontext);

  const total = p.reduce((a, x) => a + x.min, 0);
  const doneMin = p.filter(x => day.done.includes(x.id)).reduce((a, x) => a + x.min, 0);

  root.innerHTML = `
    <div class="chips scroll" id="kontext-chips" role="group" aria-label="Wo übst du"></div>
    <p class="hint" id="kontext-was">${escapeHtml(k.was)}</p>
    ${k.warnung ? `<p class="warnung">${escapeHtml(k.warnung)}</p>` : ""}

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

    <section class="werkzeug" id="werkzeug" data-will="${b.werkzeug || ""}" hidden>
      <h3 class="werkzeug-kopf">Dafür brauchst du: <b id="werkzeug-titel"></b></h3>
      <div id="werkzeug-inhalt"></div>
    </section>

    <div id="rat"></div>

    <div class="plan" id="plan"></div>
    <div class="total">
      <span>${doneMin} von ${total} Minuten erledigt</span>
      <button id="btn-reset-day" class="linkish">Tag zurücksetzen</button>
    </div>`;

  renderKontextChips(root);
  renderRat(root);
  renderPlan(root);
  paint(root);
  haengeWerkzeugEin(root, b.werkzeug || null);

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

/**
 * Was heute zählt — aus allem, was die App über den Spieler gemessen hat.
 *
 * Bewusst **ein** Vorschlag, nicht fünf. Eine Liste von Schwächen liest man
 * einmal und nie wieder; ein einzelner Satz mit einem Knopf daneben wird
 * befolgt. Der Rest steht aufgeklappt darunter, für die Tage, an denen man
 * selbst entscheiden will.
 */
function renderRat(root) {
  const host = $("#rat", root);
  if (!host) return;
  const liste = befunde(state(), state().kontext);
  if (!liste.length) {
    host.innerHTML = `<p class="hint spaced">Nichts fällt auf. Die App hat
      entweder noch zu wenig von dir gemessen, oder es steht gerade alles.</p>`;
    return;
  }
  const [erst, ...rest] = liste;
  host.innerHTML = `
    <div class="rat">
      <div class="rat-kopf">Was heute zählt · ${escapeHtml(erst.bereich)}</div>
      <b class="rat-titel">${escapeHtml(erst.titel)}</b>
      <p class="rat-grund">${escapeHtml(erst.grund)}</p>
      <button class="rat-hin" data-ziel="${erst.ziel.tab}/${erst.ziel.tool}">
        ${escapeHtml(erst.ziel.name)} öffnen
      </button>
      ${rest.length ? `<details class="rat-mehr">
        <summary>${rest.length} weitere${rest.length === 1 ? "r Punkt" : " Punkte"}</summary>
        ${rest.slice(0, 4).map(b => `<div class="rat-zeile">
          <button class="rat-hin klein" data-ziel="${b.ziel.tab}/${b.ziel.tool}">
            ${escapeHtml(b.titel)}
          </button>
          <span>${escapeHtml(b.grund)}</span>
        </div>`).join("")}
      </details>` : ""}
    </div>`;

  for (const btn of $$(".rat-hin", host)) {
    btn.addEventListener("click", () => { location.hash = "#" + btn.dataset.ziel; });
  }
}

function renderKontextChips(root) {
  const host = $("#kontext-chips", root);
  if (!host) return;
  host.innerHTML = "";
  for (const k of KONTEXTE) {
    host.append(el("button", {
      class: "chip" + (k.id === state().kontext ? " on" : ""),
      html: `${escapeHtml(k.name)} <small>${escapeHtml(k.kurz)}</small>`,
      on: { click: () => {
        if (k.id === state().kontext) return;
        state().kontext = k.id;
        save();
        // Der Tagesfortschritt gehört zum alten Plan und wäre im neuen
        // sinnlos — die Blocknamen gibt es dort gar nicht.
        resetDay();
        raeumeWerkzeug();
        S.select(0);
        // Die Wochenwahl gilt nur fuer den Probelokal-Plan und muss beim
        // Wechsel verschwinden oder wiederkommen.
        emit("topbar:refresh");
      } },
    }));
  }
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
    // Liste jede Fünftelsekunde und das eingehängte Werkzeug würde bei
    // jedem Tick neu aufgebaut.
    const offTick = on("session:tick", () => paint(root));
    const offChange = on("session:changed", () => render(root));
    this._off = () => { offTick(); offChange(); };
  },
  unmount() { this._off?.(); raeumeWerkzeug(); },
  // Die Wochenwahl gehört in die Kopfzeile, nicht in eine Werkzeugliste.
  topbar: () => {
    // Nur der Probelokal-Plan wechselt wochenweise; die anderen Kontexte
    // haben feste Blöcke.
    if (kontextOf(state().kontext).bloecke) return null;
    const sel = el("select", { id: "week-select", "aria-label": "Woche" },
      [1, 2, 3, 4].map(w => el("option", { value: w, selected: state().week === w }, `Woche ${w}`)));
    sel.addEventListener("change", e => {
      state().week = Number(e.target.value);
      save();
      S.select(0);
    });
    return sel;
  },
  focusLine: () => kontextOf(state().kontext).bloecke
    ? "" : (WEEKS[state().week]?.focus || ""),
};
