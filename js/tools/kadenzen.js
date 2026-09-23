/* ==========================================================================
   Kadenzen

   Der dritte Teil der Klavierprüfung, und der, der sich am sichersten
   vorbereiten lässt: die Modelle stehen auf dem Beiblatt der mdw, sie
   ändern sich nicht, und es sind genau fünfunddreißig Aufgaben. Wer bei
   null anfängt, braucht dafür kein Talent, sondern jeden Tag zehn Minuten.

   Gezeigt wird die Klaviatur, nicht das Notenbild — am Anfang ist die Frage
   „welche Tasten“, nicht „welche Note“. Und gezeigt wird, welche Töne von
   einem Akkord zum nächsten liegen bleiben. Das ist die ganze Kunst der
   Kadenz: nur bewegen, was sich bewegen muss.

   Den Fingersatz legt der Lehrer fest. Er steht hier bewusst nicht, aus
   demselben Grund wie die Altissimo-Griffe: lieber keiner als ein falscher,
   der sich einschleift.

   Die Modelle stehen in js/music/kadenz.js und sind gegen das Blatt geprüft.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO, daysBetween } from "../core/dom.js";
import { state, save, drill, recordDrill } from "../core/store.js";
import { spell, toMidi } from "../music/theory.js";
import {
  ARTEN, LAGEN, VARIANTEN, TONARTEN, kadenz, bleibende, umfang, drillId,
  abdeckung, pruefungsAufgabe, klang, artOf,
} from "../music/kadenz.js";
import { renderKlaviatur } from "../music/klaviatur.js";
import { audio, bisHoerbar } from "../audio/context.js";
import { playAt, stopPlayback } from "../audio/signals.js";

let sel = { art: "dur", lage: "quint", key: 0, schritt: 0 };
let root = null;
let pruefer = null;          // { aufgedeckt }
let timer = [];

const naming = () => state().settings.naming;
const variante = () => state().settings.kadenzVariante || 1;
const lageFuer = artId => artId === "iivi" ? String(variante()) : sel.lage;
const keys = () => TONARTEN[sel.art];
const aktuell = () => kadenz(sel.art, keys()[sel.key] || keys()[0], lageFuer(sel.art), naming());
const name = p => { const s = spell(p, naming()); return s.charAt(0).toUpperCase() + s.slice(1); };

function stoppeVorspiel() {
  for (const t of timer) clearTimeout(t);
  timer = [];
}

/* --- Ansicht ---------------------------------------------------------------- */

function render() {
  if (!root) return;
  const kad = aktuell();
  sel.schritt = Math.min(sel.schritt, kad.akkorde.length - 1);
  const d = drill(drillId(kad.art, kad.lage, kad.key.name), {});
  const sichtbar = !pruefer || pruefer.aufgedeckt;

  root.innerHTML = `
    <div class="chips scroll" id="kd-art" role="group" aria-label="Kadenz"></div>
    <div class="chips scroll" id="kd-lage" role="group" aria-label="Lage"></div>
    <div class="chips scroll" id="kd-key" role="group" aria-label="Tonart"></div>

    ${pruefer ? `<div class="pruefer">
      <div class="pruefer-kopf">Prüfer fragt</div>
      <div class="pruefer-frage">${escapeHtml(kad.key.name)}</div>
      <p class="hint">${escapeHtml(artOf(kad.art).label)} · ${escapeHtml(kad.label)}. Erst am Klavier spielen, dann aufdecken und vergleichen.</p>
      <div class="row2">
        <button id="kd-auf">${pruefer.aufgedeckt ? "Verdecken" : "Aufdecken"}</button>
        <button id="kd-naechste">Nächste Frage</button>
      </div>
    </div>` : `
    <h2 style="margin-bottom:0">${escapeHtml(kad.key.name)} · ${escapeHtml(kad.label)}</h2>
    <p class="hint" style="margin-top:2px">${escapeHtml(kad.akkorde.map(a => a.symbol).join(" – "))}${
      d.count ? ` · ${d.count}× gesessen, zuletzt ${d.last}` : ""}</p>
    ${kad.art === "iivi" ? `<p class="hint">${escapeHtml(VARIANTEN.find(v => v.id === variante()).was)}
      In der Prüfung spielst du eine Variante: such dir eine aus und bleib dabei. Die Übersicht zählt nur sie.</p>` : ""}`}

    <div class="kd-schritte" id="kd-schritte"></div>
    <div class="kd-tasten" id="kd-tasten"${sichtbar ? "" : " hidden"}></div>
    <div class="kd-haende" id="kd-haende"${sichtbar ? "" : " hidden"}></div>

    <div class="row2">
      <button id="kd-play">Vorspielen</button>
      <button id="kd-weiter">Nächster Akkord</button>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Gesessen?</h3>
      <p class="hint">Erst abhaken, wenn sie zweimal hintereinander ohne Stocken kam, ohne auf die
        Hände zu schauen — und die Töne, die liegen bleiben, wirklich liegen blieben.</p>
      <div class="row2">
        <button id="kd-sitzt">Sitzt</button>
        <button id="kd-pruefer">${pruefer ? "Prüfer beenden" : "Prüfer spielen"}</button>
      </div>
    </div>

    <h2>Prüfungsstoff</h2>
    <p class="hint" id="kd-summe"></p>
    <div id="kd-uebersicht"></div>
    <p class="hint spaced">Die Modelle sind die vom
      <a class="linkish" href="https://www.mdw.ac.at/upload/MDWeb/tip/downloads/BeiblattKadenzenIGPPFZuLa2023.pdf"
         target="_blank" rel="noopener">Beiblatt Kadenzen</a> der mdw. Den Fingersatz legt dein Lehrer fest.</p>`;

  renderChips();
  renderSchritt(kad);
  renderUebersicht();

  $("#kd-play", root).addEventListener("click", () => vorspielen(kad));
  $("#kd-weiter", root).addEventListener("click", () => {
    sel.schritt = (sel.schritt + 1) % kad.akkorde.length;
    renderSchritt(kad);
    spieleAkkord(kad.akkorde[sel.schritt]);
  });
  $("#kd-sitzt", root).addEventListener("click", () => {
    const id = drillId(kad.art, kad.lage, kad.key.name);
    recordDrill(id, { count: (drill(id, {}).count || 0) + 1 });
    toast(`${kad.key.name}, ${kad.label} gesessen`);
    if (pruefer) naechsteFrage(); else render();
  });
  $("#kd-pruefer", root).addEventListener("click", () => {
    if (pruefer) { pruefer = null; render(); } else naechsteFrage();
  });
  $("#kd-auf", root)?.addEventListener("click", () => { pruefer.aufgedeckt = !pruefer.aufgedeckt; render(); });
  $("#kd-naechste", root)?.addEventListener("click", naechsteFrage);
}

function renderChips() {
  const chips = (host, liste, an, klick) => {
    host.innerHTML = "";
    for (const x of liste) host.append(el("button", {
      class: "chip" + (an(x) ? " on" : ""), text: x.label, on: { click: () => { stoppeVorspiel(); klick(x); render(); } },
    }));
  };
  chips($("#kd-art", root), ARTEN, a => a.id === sel.art, a => {
    const alt = keys()[sel.key];
    sel.art = a.id;
    // Auf der gleichen Vorzeichnung bleiben: von G-Dur nach e-Moll.
    const i = keys().findIndex(k => k.sig === alt?.sig);
    sel.key = i >= 0 ? i : 0;
    sel.schritt = 0;
  });
  if (sel.art === "iivi") {
    chips($("#kd-lage", root), VARIANTEN, v => v.id === variante(), v => {
      state().settings.kadenzVariante = v.id; save(); sel.schritt = 0;
    });
  } else {
    chips($("#kd-lage", root), LAGEN, l => l.id === sel.lage, l => { sel.lage = l.id; sel.schritt = 0; });
  }
  chips($("#kd-key", root), keys().map((k, i) => ({ label: k.name.replace("-Dur", "").replace("-Moll", ""), i })),
    x => x.i === sel.key, x => { sel.key = x.i; sel.schritt = 0; });
}

function renderSchritt(kad) {
  const akk = kad.akkorde[sel.schritt];
  const bleibt = bleibende(kad.akkorde[sel.schritt - 1], akk);
  const host = $("#kd-schritte", root);
  host.innerHTML = kad.akkorde.map((a, i) => `
    <button class="kd-schritt${i === sel.schritt ? " on" : ""}" data-i="${i}">
      <b>${escapeHtml(a.stufe)}</b><span>${pruefer && !pruefer.aufgedeckt ? "" : escapeHtml(a.symbol)}</span>
    </button>`).join("");
  $$(".kd-schritt", host).forEach(b => b.addEventListener("click", () => {
    stoppeVorspiel();
    sel.schritt = Number(b.dataset.i);
    renderSchritt(kad);
    spieleAkkord(kad.akkorde[sel.schritt]);
  }));

  const { tief, hoch } = umfang(kad);
  const tasten = new Map();
  tasten.set(toMidi(akk.bass), { hand: "links", name: name(akk.bass) });
  akk.rh.forEach((p, i) => tasten.set(toMidi(p), { hand: "rechts", bleibt: bleibt[i], name: name(p) }));
  $("#kd-tasten", root).innerHTML = renderKlaviatur({
    tief: tief - 2, hoch: hoch + 2, tasten,
    ariaLabel: `Links ${name(akk.bass)}, rechts ${akk.rh.map(name).join(", ")}`,
  });

  const liegen = akk.rh.filter((_, i) => bleibt[i]).map(name);
  $("#kd-haende", root).innerHTML = `
    <div class="kd-hand"><span>Rechts</span><b>${akk.rh.map(p => escapeHtml(name(p))).join(" – ")}</b></div>
    <div class="kd-hand"><span>Links</span><b>${escapeHtml(name(akk.bass))}</b></div>
    <p class="hint">${sel.schritt === 0
      ? "Anfangsakkord. Hand locker auflegen, erst dann spielen."
      : liegen.length
        ? `Liegen lassen: ${liegen.map(escapeHtml).join(", ")} — nur die anderen Finger bewegen sich, zum nächstgelegenen Ton.`
        : "Kein gemeinsamer Ton: alle Finger wandern, aber so wenig wie möglich."}</p>`;
}

/* --- Klang ------------------------------------------------------------------- */

const HALBE = 1.3;     // Sekunden je Halbe: langsam genug zum Mitdenken

function spieleAkkord(a, zeit = null, dauer = 1.2) {
  const ctx = audio();
  const t = zeit ?? ctx.currentTime + 0.05;
  const ms = klang(a);
  playAt(ms.map(midi => ({ midi, zeit: t, dauer })), { a4: state().settings.a4, amp: 0.1 });
}

function vorspielen(kad) {
  stoppeVorspiel();
  stopPlayback();
  const ctx = audio();
  const jetzt = ctx.currentTime;
  let t = jetzt + 0.1;
  kad.akkorde.forEach((a, i) => {
    spieleAkkord(a, t, a.dauer * HALBE * 0.95);
    // Die Anzeige wandert mit, damit man sieht, was man hört.
    timer.push(setTimeout(() => {
      if (!root) return;
      sel.schritt = i;
      renderSchritt(kad);
    }, bisHoerbar(t)));
    t += a.dauer * HALBE;
  });
}

/* --- Prüfer ------------------------------------------------------------------- */

function naechsteFrage() {
  stoppeVorspiel();
  const vorher = pruefer ? { art: sel.art, lage: lageFuer(sel.art), key: keys()[sel.key] } : null;
  const x = pruefungsAufgabe(state().drills, todayISO(), variante(), Math.random, vorher);
  sel.art = x.art;
  if (x.art !== "iivi") sel.lage = x.lage;
  sel.key = TONARTEN[x.art].findIndex(k => k.name === x.key.name);
  sel.schritt = 0;
  pruefer = { aufgedeckt: false };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* --- Übersicht ---------------------------------------------------------------- */

function renderUebersicht() {
  const drills = state().drills;
  const heute = todayISO();
  const a = abdeckung(drills, variante());
  $("#kd-summe", root).textContent =
    `${a.geuebt} von ${a.gesamt} Kadenzen saßen schon einmal: jede Lage in jeder Tonart bis zwei Vorzeichen, ` +
    `dazu die II–V–I in Variante ${variante()}.`;

  const zeile = (artId, lage, label) => `
    <div class="kd-zeile"><span class="kd-zeile-name">${escapeHtml(label)}</span>
      ${TONARTEN[artId].map((k, i) => {
        const d = drills[drillId(artId, lage, k.name)];
        const tage = d?.last ? daysBetween(d.last, heute) : null;
        const frische = d?.count ? Math.max(0.25, 1 - (tage || 0) / 21) : 0;
        return `<button class="keycell${d?.count ? "" : " leer"}" style="--frische:${frische.toFixed(2)}"
          data-art="${artId}" data-lage="${lage}" data-i="${i}" title="${escapeHtml(k.name)}">
          <b>${escapeHtml(k.name.replace("-Dur", "").replace("-Moll", ""))}</b><span>${d?.count ? "✓" : "–"}</span></button>`;
      }).join("")}
    </div>`;

  $("#kd-uebersicht", root).innerHTML = `
    <h3>Dur</h3>${LAGEN.map(l => zeile("dur", l.id, l.label)).join("")}
    <h3>Moll</h3>${LAGEN.map(l => zeile("moll", l.id, l.label)).join("")}
    <h3>II–V–I</h3>${zeile("iivi", String(variante()), `Variante ${variante()}`)}`;

  $$("#kd-uebersicht .keycell", root).forEach(b => b.addEventListener("click", () => {
    stoppeVorspiel();
    pruefer = null;
    sel.art = b.dataset.art;
    if (sel.art !== "iivi") sel.lage = b.dataset.lage;
    sel.key = Number(b.dataset.i);
    sel.schritt = 0;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

export default {
  id: "kadenzen",
  label: "Kadenzen",
  mount(r) { root = r; render(); },
  unmount() { stoppeVorspiel(); root = null; pruefer = null; },
};
