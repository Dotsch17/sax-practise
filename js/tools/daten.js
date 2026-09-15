/* ==========================================================================
   Daten und Einstellungen

   Export und Import sind keine Nebensache. Safari löscht script-schreibbaren
   Speicher nach etwa sieben Tagen ohne Nutzung, und jede Adresse hat ihren
   eigenen Speicher. Die JSON-Datei ist die einzige Kopie, die das überlebt.
   ========================================================================== */

"use strict";

import { $, $$, toast, todayISO, humanMinutes } from "../core/dom.js";
import { state, setSetting, exportBlob, importFile } from "../core/store.js";

function render(root) {
  const s = state().settings;
  const st = state();
  const tage = new Set(st.log.map(e => e.date)).size;
  const minuten = st.log.reduce((a, e) => a + (e.spent || e.minutes || 0), 0);

  root.innerHTML = `
    <h2>Stimmung</h2>
    <div class="slider">
      <label for="a4">Kammerton</label>
      <input type="range" id="a4" min="430" max="448" step="1" value="${s.a4}">
      <span class="slider-val"><span id="a4-val">${s.a4}</span> Hz</span>
    </div>
    <p class="hint">
      Betrifft Bordun, Stimmgerät und alle vorgespielten Töne. 440 ist der
      Normalfall; manche Orchester spielen 442 oder 443.
    </p>

    <h2>Tonnamen</h2>
    <div class="chips" role="group" aria-label="Tonnamen">
      <button class="chip" data-naming="de">Deutsch · H und B</button>
      <button class="chip" data-naming="en">International · B und B♭</button>
    </div>

    <h2>Tonhöhen anzeigen als</h2>
    <div class="chips" role="group" aria-label="Tonhöhen anzeigen als">
      <button class="chip" data-pitchview="written">Griff</button>
      <button class="chip" data-pitchview="sounding">klingend</button>
    </div>
    <p class="hint">
      Der Griff ist, was du liest und greifst. Klingend ist, was im Raum
      ankommt — eine grosze Sexte tiefer. Im Zusammenspiel zählt klingend.
    </p>

    <h2>Deine Daten</h2>
    <p class="hint">
      ${st.log.length} gespeicherte Sessions an ${tage} ${tage === 1 ? "Tag" : "Tagen"},
      zusammen ${humanMinutes(minuten)}.
    </p>
    <div class="row2">
      <button id="btn-export">Daten exportieren</button>
      <button id="btn-import">Daten einlesen</button>
    </div>
    <input type="file" id="file-input" accept="application/json" hidden>
    <p class="hint spaced">
      Safari löscht lokal gespeicherte Daten, wenn eine Seite länger nicht
      benutzt wird. Exportiere die Datei deshalb ab und zu — sie ist die
      einzige Kopie, die das überlebt. Jede Adresse hat auszerdem ihren
      eigenen Speicher: rufst du die App unter einer anderen Adresse auf,
      ist sie leer, und du liest die Datei wieder ein.
    </p>`;

  sync(root);

  $("#a4", root).addEventListener("input", e => {
    const v = Number(e.target.value);
    setSetting("a4", v);
    $("#a4-val", root).textContent = v;
  });

  $$("[data-naming]", root).forEach(b => b.addEventListener("click", () => {
    setSetting("naming", b.dataset.naming);
    sync(root);
    toast("Tonnamen umgestellt");
  }));

  $$("[data-pitchview]", root).forEach(b => b.addEventListener("click", () => {
    setSetting("pitchView", b.dataset.pitchview);
    sync(root);
  }));

  $("#btn-export", root).addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(exportBlob());
    a.download = `uebeplan-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $("#btn-import", root).addEventListener("click", () => $("#file-input", root).click());
  $("#file-input", root).addEventListener("change", async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      await importFile(f);
      toast("Daten eingelesen");
      location.reload();
    } catch (err) {
      console.warn(err);
      toast("Datei nicht lesbar");
    }
  });
}

function sync(root) {
  const s = state().settings;
  $$("[data-naming]", root).forEach(b => b.classList.toggle("on", b.dataset.naming === s.naming));
  $$("[data-pitchview]", root).forEach(b => b.classList.toggle("on", b.dataset.pitchview === s.pitchView));
}

export default {
  id: "daten",
  label: "Daten",
  mount(root) { render(root); },
};
