/* ==========================================================================
   Einstiegspunkt: Navigation, Startsequenz, Service Worker
   ========================================================================== */

"use strict";

import { $, $$, el, on, toast, initToast } from "./core/dom.js";
import { state, save } from "./core/store.js";
import * as session from "./core/session.js";
import { installUnlock } from "./audio/context.js";
import * as drone from "./audio/drone.js";
import * as metro from "./audio/metronome.js";
import { TABS, findTab, findTool } from "./views.js";

/* --- Navigation ----------------------------------------------------------- */

let currentTab = TABS[0];
let currentTool = null;
// Welches Werkzeug in welchem Reiter zuletzt offen war — beim Zurückwechseln
// landet man dort, wo man aufgehört hat.
const lastTool = new Map();

function openTab(tabId, toolId = null) {
  const tab = findTab(tabId);
  currentTab = tab;
  const tool = toolId ? findTool(tab, toolId) : findTool(tab, lastTool.get(tab.id));

  $$("nav button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab.id)));
  renderToolbar(tab, tool);
  openTool(tool);

  // Die Adresszeile spiegelt den Ort, damit Zurück im Browser funktioniert
  // und ein Neuladen dort landet, wo man war.
  const hash = "#" + tab.id + (tool && tab.tools.length > 1 ? "/" + tool.id : "");
  if (location.hash !== hash) history.replaceState(null, "", hash);
}

function openTool(tool) {
  const host = $("#tool");
  if (currentTool?.unmount) { try { currentTool.unmount(); } catch (e) { console.warn(e); } }
  host.innerHTML = "";
  currentTool = tool || null;
  if (!tool) {
    host.innerHTML = `<p class="empty">Hier kommt noch etwas hin.</p>`;
  } else {
    lastTool.set(currentTab.id, tool.id);
    try { tool.mount(host); }
    catch (e) {
      console.error("Werkzeug konnte nicht geladen werden:", tool.id, e);
      host.innerHTML = `<p class="empty">Dieses Werkzeug ist gerade kaputt. Details stehen in der Konsole.</p>`;
    }
  }
  renderTopbar();
  window.scrollTo(0, 0);
}

function renderToolbar(tab, tool) {
  const bar = $("#toolbar");
  bar.innerHTML = "";
  // Bei einem einzigen Werkzeug wäre die Leiste nur Lärm.
  bar.hidden = tab.tools.length < 2;
  if (bar.hidden) return;
  for (const t of tab.tools) {
    bar.append(el("button", {
      class: "chip" + (t === tool ? " on" : ""),
      text: t.label,
      "aria-current": t === tool ? "true" : null,
      on: { click: () => openTab(tab.id, t.id) },
    }));
  }
}

function renderTopbar() {
  const slot = $("#topbar-slot");
  slot.innerHTML = "";
  const extra = currentTool?.topbar?.();
  if (extra) slot.append(extra);

  const d = new Date();
  $("#today-label").textContent =
    d.toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "long" });

  const focus = currentTool?.focusLine?.();
  const fl = $("#focus-line");
  fl.textContent = focus || "";
  fl.hidden = !focus;
}

/* --- Streifen „läuft gerade“ ---------------------------------------------- */

/* Bordun und Metronom laufen weiter, wenn man den Reiter wechselt. Ohne
   diesen Streifen müsste man zurücknavigieren, um sie auszuschalten — und
   das mit dem Instrument in der Hand. */
function renderRunning() {
  const bar = $("#running");
  const bits = [];
  if (drone.current() !== null) bits.push({ what: "Bordun", stop: () => drone.stop() });
  if (metro.isRunning()) bits.push({ what: metro.getBpm() + " bpm", stop: () => metro.stop() });

  bar.hidden = bits.length === 0;
  bar.innerHTML = "";
  if (bar.hidden) return;

  for (const b of bits) {
    bar.append(el("button", {
      class: "running-chip",
      on: { click: b.stop },
      "aria-label": b.what + " ausschalten",
    }, [el("span", { class: "dot" }), b.what, el("span", { class: "x", text: "✕" })]));
  }
}

/* --- Start ----------------------------------------------------------------- */

function boot() {
  initToast();
  installUnlock();

  for (const tab of TABS) {
    $("nav .inner").append(el("button", {
      data: { tab: tab.id },
      text: tab.label,
      "aria-selected": "false",
      on: { click: () => openTab(tab.id) },
    }));
  }

  metro.configure({
    bpm: state().settings.bpm,
    beats: state().settings.beats,
    sound: state().settings.metroSound,
  });
  drone.setVolume(state().settings.droneVol / 100);

  // Werkzeuge, die die Kopfzeile beeinflussen, melden sich hier.
  on("topbar:refresh", renderTopbar);

  drone.onChange(renderRunning);
  metro.onStateChange(renderRunning);
  renderRunning();

  session.selectFirstOpen();

  const [tabId, toolId] = location.hash.replace(/^#/, "").split("/");
  openTab(tabId || TABS[0].id, toolId);

  window.addEventListener("hashchange", () => {
    const [t, x] = location.hash.replace(/^#/, "").split("/");
    if (t && t !== currentTab.id) openTab(t, x);
  });
}

boot();

/* --- Service Worker -------------------------------------------------------- */

/* Der neue Worker übernimmt bewusst nicht von selbst, sondern wartet auf den
   Tipp des Nutzers — sonst würde die Seite mitten in einer laufenden Session
   neu geladen. Beim Deployen VERSION in sw.js hochzählen. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });

      let accepted = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!accepted) return;
        accepted = false;
        location.reload();
      });

      const offer = worker => toast("Neue Version — neu laden", () => {
        accepted = true;
        worker.postMessage("skip-waiting");
      });

      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) offer(sw);
        });
      });
    } catch (e) {
      console.warn("Service Worker nicht registriert.", e);
    }
  });
}
