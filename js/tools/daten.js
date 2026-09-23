/* ==========================================================================
   Daten und Einstellungen

   Export und Import sind keine Nebensache. Safari löscht script-schreibbaren
   Speicher nach etwa sieben Tagen ohne Nutzung, und jede Adresse hat ihren
   eigenen Speicher. Die JSON-Datei ist die einzige Kopie, die das überlebt.

   Zwei Geräte: das iPad am Notenständer, das iPhone am Travel Sax. Beide
   schreiben ihren eigenen Stand. „An anderes Gerät“ öffnet das Teilen-Menü
   (AirDrop), „Zusammenführen“ liest die Datei ein, ohne etwas zu löschen —
   die Regeln stehen in js/core/abgleich.js.

   Dazu der Bluetooth-Verzug: über den Travel Sax kommt der Ton des Telefons
   rund eine Fünftelsekunde später an. Gemessen wird er hier, mit Klicks
   zum Mittippen; die Rechnung steht in js/audio/verzug.js.
   ========================================================================== */

"use strict";

import { $, $$, toast, todayISO, humanMinutes } from "../core/dom.js";
import { state, setSetting, exportBlob, importFile, mergeFile } from "../core/store.js";
import { audio } from "../audio/context.js";
import { MESSUNG, verzugAusTipps } from "../audio/verzug.js";

let messung = null;     // { klicks, tipps, timer }

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
      ankommt — eine große Sexte tiefer. Im Zusammenspiel zählt klingend.
    </p>

    <h2>Ton über Bluetooth</h2>
    <div class="slider">
      <label for="verzug">Verzug</label>
      <input type="range" id="verzug" min="0" max="400" step="5" value="${s.ausgabeVerzug || 0}">
      <span class="slider-val"><span id="verzug-val">${s.ausgabeVerzug || 0}</span> ms</span>
    </div>
    <p class="hint">
      Hörst du die App über den Travel Sax oder Bluetooth-Kopfhörer, kommt
      jeder Klick rund eine Fünftelsekunde später an, als das Telefon glaubt.
      Die Rhythmusmessung wertet dann jeden Tipp als zu spät, und die
      Taktanzeige der Band läuft vor. Einmal messen, mit genau dem Weg, über
      den du übst. Gilt nur für dieses Gerät; am iPad ohne Bluetooth bleibt er 0.
    </p>
    <button class="wide" id="verzug-los">Verzug messen</button>
    <button class="tapfeld" id="verzug-tap" hidden><span id="verzug-tap-text">Tippen</span></button>
    <p class="hint" id="verzug-ergebnis"></p>

    <h2>Deine Daten</h2>
    <p class="hint">
      ${st.log.length} gespeicherte Sessions an ${tage} ${tage === 1 ? "Tag" : "Tagen"},
      zusammen ${humanMinutes(minuten)}.
    </p>
    <div class="row2">
      <button id="btn-teilen">An anderes Gerät</button>
      <button id="btn-merge">Zusammenführen</button>
    </div>
    <p class="hint">
      Übst du am iPad und am iPhone, hat jedes Gerät seinen eigenen Stand.
      Am einen „An anderes Gerät“ und per AirDrop schicken, am anderen
      „Zusammenführen“ und die Datei wählen. Dabei geht nichts verloren, und
      zweimal zusammenführen zählt nichts doppelt. Einstellungen bleiben die
      des jeweiligen Geräts.
    </p>
    <div class="row2">
      <button id="btn-export">Datei sichern</button>
      <button id="btn-import">Einlesen und ersetzen</button>
    </div>
    <input type="file" id="file-input" accept="application/json,.json" hidden>
    <input type="file" id="merge-input" accept="application/json,.json" hidden>
    <p class="hint spaced">
      Safari löscht lokal gespeicherte Daten, wenn eine Seite länger nicht
      benutzt wird. Exportiere die Datei deshalb ab und zu — sie ist die
      einzige Kopie, die das überlebt. Jede Adresse hat außerdem ihren
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

  $("#btn-export", root).addEventListener("click", sichern);

  // Teilen mit Datei geht in Safari seit iOS 15; wo nicht, wird gesichert.
  $("#btn-teilen", root).addEventListener("click", async () => {
    const datei = new File([exportBlob()], dateiname(), { type: "application/json" });
    if (navigator.canShare?.({ files: [datei] })) {
      try { await navigator.share({ files: [datei], title: "Übeplan Saxophon" }); }
      catch (e) { if (e.name !== "AbortError") toast("Teilen fehlgeschlagen"); }
    } else {
      sichern();
      toast("Teilen geht hier nicht — Datei gesichert");
    }
  });

  $("#btn-merge", root).addEventListener("click", () => $("#merge-input", root).click());
  $("#merge-input", root).addEventListener("change", async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const b = await mergeFile(f);
      const teile = [
        b.sessions && `${b.sessions} ${b.sessions === 1 ? "Session" : "Sessions"}`,
        b.uebungen && `${b.uebungen} ${b.uebungen === 1 ? "Übung" : "Übungen"}`,
        b.stuecke && `${b.stuecke} ${b.stuecke === 1 ? "Stück" : "Stücke"}`,
      ].filter(Boolean);
      toast(teile.length ? `Zusammengeführt: ${teile.join(", ")} neu` : "Zusammengeführt, Fortschritt abgeglichen");
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      console.warn(err);
      toast("Datei nicht lesbar");
    }
  });

  $("#verzug", root).addEventListener("input", e => {
    const v = Number(e.target.value);
    setSetting("ausgabeVerzug", v);
    $("#verzug-val", root).textContent = v;
  });
  $("#verzug-los", root).addEventListener("click", () => messen(root));
  $("#verzug-tap", root).addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!messung) return;
    messung.tipps.push(audio().currentTime);
    const t = e.currentTarget;
    t.classList.add("schlag");
    setTimeout(() => t.classList.remove("schlag"), 90);
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

const dateiname = () => `uebeplan-${todayISO()}.json`;

function sichern() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(exportBlob());
  a.download = dateiname();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* --- Verzug messen ------------------------------------------------------------ */

function messen(root) {
  if (messung) return;
  const ctx = audio();
  const spb = 60 / MESSUNG.bpm;
  const start = ctx.currentTime + 0.3;
  const alle = MESSUNG.einzaehler + MESSUNG.klicks;
  const klicks = [];
  for (let i = 0; i < alle; i++) {
    const t = start + i * spb;
    klick(t, i < MESSUNG.einzaehler);
    if (i >= MESSUNG.einzaehler) klicks.push(t);
  }
  messung = { klicks, tipps: [] };
  $("#verzug-los", root).hidden = true;
  const tap = $("#verzug-tap", root);
  tap.hidden = false;
  tap.classList.add("aktiv");
  $("#verzug-tap-text", root).textContent = "Zu jedem Klick tippen";
  $("#verzug-ergebnis", root).textContent = "";
  // Ausgewertet wird, nachdem auch der letzte Klick über Bluetooth da war.
  messung.timer = setTimeout(() => werteAus(root), (start - ctx.currentTime + alle * spb + 0.6) * 1000);
}

function klick(t, vorweg) {
  const ctx = audio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = vorweg ? 1050 : 1600;
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.06);
}

function werteAus(root) {
  const m = messung;
  messung = null;
  if (!m || !root.isConnected) return;
  $("#verzug-los", root).hidden = false;
  const tap = $("#verzug-tap", root);
  tap.hidden = true;
  tap.classList.remove("aktiv");
  const r = verzugAusTipps(m.klicks, m.tipps);
  const aus = $("#verzug-ergebnis", root);
  if (!r.ok) {
    aus.textContent = r.grund === "unruhig"
      ? `Zu unruhig getippt (±${r.streuung} ms). Noch einmal, ruhig mit dem Klick, nicht davor.`
      : "Zu wenig Tipps angekommen. Die ersten vier Klicks sind zum Hineinhören, danach zu jedem tippen.";
    return;
  }
  setSetting("ausgabeVerzug", r.ms);
  $("#verzug", root).value = r.ms;
  $("#verzug-val", root).textContent = r.ms;
  aus.textContent = r.ms
    ? `Gemessen: ${r.ms} ms (±${r.streuung}). Eingestellt — Rhythmusmessung und Taktanzeige rechnen ihn jetzt heraus.`
    : `Kein nennenswerter Verzug (${r.roh} ms, das ist der Finger). Ausgleich aus.`;
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
  unmount() {
    if (messung) clearTimeout(messung.timer);
    messung = null;
  },
};
