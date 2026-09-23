/* ==========================================================================
   Blattspiel am Klavier

   Der Prüfungsteil, bei dem man nicht üben kann, was drankommt — nur, wie
   man damit umgeht. Also jeden Tag ein neues, kurzes Stück, einmal durch,
   ohne anzuhalten. Die Übungen kommen aus js/music/klavierblatt.js und
   steigen vom ersten Mikrokosmos-Stück bis zum Ende von Band 1.

   Der Ablauf ist der der Prüfung: ansehen (Tonart, Takt, Handlage, was
   sich wiederholt), einzählen, durchspielen, und erst danach hören, wie es
   hätte klingen sollen. Wer sich vorher vorspielen lässt, übt Nachspielen,
   nicht Blattspiel.

   Über dem Notentext steht die Tastatur mit der Handlage: welche fünf
   Tasten, welcher Finger. Die Finger ergeben sich aus der Fünftonlage und
   sind deshalb kein Fingersatz, den der Lehrer festlegen müsste.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast } from "../core/dom.js";
import { state, drill, save, setSetting } from "../core/store.js";
import { KLAVIER_STUFEN, stufeOf, klavierUebung } from "../music/klavierblatt.js";
import { renderSystem, autoBeam } from "../music/notation.js";
import { renderKlaviatur } from "../music/klaviatur.js";
import { spell, toMidi } from "../music/theory.js";
import { audio, bisHoerbar } from "../audio/context.js";
import { playAt, stopPlayback } from "../audio/signals.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let sel = { stufe: 1 };
let uebung = null;
let phase = "ansehen";      // ansehen → spielen → bewerten
let ansehenBis = 0;
let uhr = null, ablauf = null;
let klicks = [];            // geplante Pulsklicks, damit „Fertig“ sie auch anhält

const tempo = () => state().settings.klavierBpm || 60;
const drillId = () => `klavierblatt:${sel.stufe}`;
const URTEILE = [
  { id: "durch", label: "Durchgespielt", was: "Ohne anzuhalten, höchstens kleine Fehler." },
  { id: "fehler", label: "Mit Fehlern", was: "Durchgekommen, aber mit Stellen, an denen es gewackelt hat." },
  { id: "halt", label: "Angehalten", was: "Mindestens einmal stehengeblieben oder neu angefangen." },
];

function neu() {
  uebung = klavierUebung({ stufe: sel.stufe });
  phase = "ansehen";
  ansehenBis = Date.now() + 30000;
}

/* --- Ansicht ------------------------------------------------------------------- */

function render() {
  if (!root) return;
  const st = stufeOf(sel.stufe);
  const d = drill(drillId(), { durch: 0, fehler: 0, halt: 0 });
  const gesamt = d.durch + d.fehler + d.halt;
  root.innerHTML = `
    <div class="chips scroll" id="kb-stufen" role="group" aria-label="Stufe"></div>
    <p class="hint">${escapeHtml(st.was)}</p>
    ${gesamt ? `<p class="hint">Auf dieser Stufe ${d.durch} von ${gesamt} durchgespielt.${d.durch >= 5 && d.durch / gesamt >= 0.7 && sel.stufe < 6 ? " Zeit für die nächste Stufe." : ""}</p>` : ""}
    <div id="kb-lage"></div>
    <div id="kb-noten"></div>
    <div id="kb-aktion"></div>`;

  const chips = $("#kb-stufen", root);
  for (const s of KLAVIER_STUFEN) chips.append(el("button", {
    class: "chip" + (s.id === sel.stufe ? " on" : ""), text: `${s.id} ${s.label}`,
    on: { click: () => { if (s.id === sel.stufe) return; stoppe(); sel.stufe = s.id; neu(); render(); } },
  }));
  renderLage();
  renderNoten();
  renderAktion();
}

function renderLage() {
  const u = uebung;
  const tasten = new Map();
  u.hand.rechts.forEach((p, i) => tasten.set(toMidi(p), { hand: "rechts", name: String(i + 1) }));
  u.hand.links.forEach((p, i) => tasten.set(toMidi(p), { hand: "links", name: String(5 - i) }));
  const beide = u.modus !== "rechts" && u.modus !== "links";
  const name = p => spell(p, state().settings.naming);
  $("#kb-lage", root).innerHTML = `
    <p class="kb-lage-kopf"><b>${escapeHtml(u.lage.name)}</b> · ${u.schlaege}/4 · Viertel = ${tempo()}</p>
    <div class="kb-tasten">${renderKlaviatur({
      tief: Math.min(...u.hand.links.map(toMidi)) - 2, hoch: Math.max(...u.hand.rechts.map(toMidi)) + 2,
      tasten, ariaLabel: "Handlage",
    })}</div>
    <p class="hint">${u.modus === "links" ? "" : `Rechts: Daumen auf ${escapeHtml(name(u.hand.rechts[0]))}, kleiner Finger auf ${escapeHtml(name(u.hand.rechts[4]))}. `}${u.modus === "rechts" ? "" : `Links: kleiner Finger auf ${escapeHtml(name(u.hand.links[0]))}, Daumen auf ${escapeHtml(name(u.hand.links[4]))}.`}
      ${beide ? "Die Zahlen auf den Tasten sind die Finger: 1 ist der Daumen." : "1 ist der Daumen."}</p>`;
}

/* Zeilen zu zwei Takten am Telefon, zu vier sonst — alle im selben Maßstab. */
function renderNoten() {
  const u = uebung;
  const jeZeile = (root.clientWidth || 800) < 560 ? 2 : 4;
  const zeilen = [];
  for (let i = 0; i < u.takte.length; i += jeZeile) {
    const stueck = u.takte.slice(i, i + jeZeile);
    const oben = [], unten = [];
    stueck.forEach((tk, k) => {
      const letzter = i + k === u.takte.length - 1;
      oben.push(...tk.oben.map(n => ({ ...n })), { barline: letzter ? "end" : true });
      unten.push(...tk.unten.map(n => ({ ...n })), { barline: letzter ? "end" : true });
    });
    zeilen.push(renderSystem({ oben: autoBeam(oben), unten: autoBeam(unten), keySig: u.keySig, timeSig: i === 0 ? [u.schlaege, 4] : null,
      ariaLabel: `Takt ${i + 1} bis ${i + stueck.length}`, extraClass: "passend" }));
  }
  const breite = svg => Number(svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/)?.[1] || 1);
  const hoehe = svg => Number(svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/)?.[2] || 1);
  const platz = Math.max(240, (root.clientWidth || 600) - 24);
  const maxB = Math.max(...zeilen.map(breite));
  const jeEinheit = Math.min(260 / Math.max(...zeilen.map(hoehe)), platz / maxB);
  $("#kb-noten", root).innerHTML = zeilen.map(svg =>
    `<div class="staff-wrap">${svg.replace("<svg ", `<svg style="width:${(breite(svg) * jeEinheit).toFixed(0)}px" `)}</div>`).join("");
}

function renderAktion() {
  const host = $("#kb-aktion", root);
  if (phase === "ansehen") {
    host.innerHTML = `
      <p class="hint"><b>Erst ansehen.</b> Tonart und Takt, wo die Hände liegen, welche Stellen gleich sind,
        die tiefste und höchste Note. Dann nicht mehr nachdenken, sondern spielen.</p>
      <div class="clock kb-uhr" id="kb-uhr">0:30</div>
      <div class="row2">
        <button id="kb-los" class="primary">Einzählen und spielen</button>
        <button id="kb-neu">Andere Übung</button>
      </div>
      ${tempoHtml()}`;
    $("#kb-los", host).addEventListener("click", spielen);
    $("#kb-neu", host).addEventListener("click", () => { neu(); render(); });
    verdrahteTempo(host);
    starteUhr();
  } else if (phase === "spielen") {
    host.innerHTML = `
      <p class="hint">Einen Takt einzählen lassen, dann spielen. Der Puls läuft leise mit. Nicht anhalten —
        lieber eine Hand weglassen als stehenbleiben.</p>
      <button class="wide" id="kb-fertig">Fertig gespielt</button>`;
    $("#kb-fertig", host).addEventListener("click", () => { stoppe(); phase = "bewerten"; renderAktion(); });
  } else {
    host.innerHTML = `
      <p class="hint">Wie war es? Ehrlich — die Prüfung ist auch ehrlich.</p>
      <div class="answers">${URTEILE.map(u => `<button class="answer" data-urteil="${u.id}" title="${escapeHtml(u.was)}">${u.label}</button>`).join("")}</div>
      <div class="row2">
        <button id="kb-hoeren">So klingt es</button>
        <button id="kb-nochmal">Nochmal spielen</button>
      </div>`;
    $$("[data-urteil]", host).forEach(b => b.addEventListener("click", () => {
      const d = drill(drillId(), { durch: 0, fehler: 0, halt: 0 });
      d[b.dataset.urteil] = (d[b.dataset.urteil] || 0) + 1;
      d.last = new Date().toISOString().slice(0, 10);
      save();
      toast("Notiert");
      stoppe();
      neu();
      render();
      window.scrollTo(0, 0);
    }));
    $("#kb-hoeren", host).addEventListener("click", vorspielen);
    $("#kb-nochmal", host).addEventListener("click", spielen);
  }
}

function tempoHtml() {
  return `<div class="slider kb-tempo">
    <label for="kb-bpm">Tempo</label>
    <input type="range" id="kb-bpm" min="40" max="96" step="4" value="${tempo()}">
    <span class="slider-val"><span id="kb-bpm-val">${tempo()}</span></span>
  </div>`;
}

function verdrahteTempo(host) {
  $("#kb-bpm", host).addEventListener("input", e => {
    setSetting("klavierBpm", Number(e.target.value));
    $("#kb-bpm-val", host).textContent = e.target.value;
    const k = $(".kb-lage-kopf", root);
    if (k) k.innerHTML = `<b>${escapeHtml(uebung.lage.name)}</b> · ${uebung.schlaege}/4 · Viertel = ${tempo()}`;
  });
}

function starteUhr() {
  clearInterval(uhr);
  const zeige = () => {
    const rest = Math.max(0, Math.ceil((ansehenBis - Date.now()) / 1000));
    const u = root && $("#kb-uhr", root);
    if (!u) { clearInterval(uhr); return; }
    u.textContent = `0:${String(rest).padStart(2, "0")}`;
    u.classList.toggle("running", rest > 0);
    if (!rest) clearInterval(uhr);
  };
  zeige();
  uhr = setInterval(zeige, 250);
}

/* --- Klang --------------------------------------------------------------------- */

function klick(t, betont) {
  const ctx = audio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = betont ? 1500 : 1000;
  g.gain.setValueAtTime(betont ? 0.22 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.07);
  klicks.push(o);
}

/* Einen Takt einzählen, dann läuft der Puls leise durch das ganze Stück. */
function spielen() {
  stoppe();
  const ctx = audio();
  const spb = 60 / tempo();
  const t0 = ctx.currentTime + 0.2;
  const schlaege = uebung.schlaege;
  const gesamt = uebung.takte.length * schlaege;
  for (let i = 0; i < schlaege; i++) klick(t0 + i * spb, i === 0);
  const start = t0 + schlaege * spb;
  for (let i = 0; i < gesamt; i++) klick(start + i * spb, i % schlaege === 0);
  phase = "spielen";
  holdScreen();
  renderAktion();
  ablauf = setTimeout(() => {
    ablauf = null;
    releaseScreen();
    if (phase === "spielen") { phase = "bewerten"; renderAktion(); }
  }, bisHoerbar(start + gesamt * spb + 0.4));
}

function vorspielen() {
  stopPlayback();
  const ctx = audio();
  const spb = 60 / tempo();
  const t0 = ctx.currentTime + 0.15;
  playAt(uebung.ereignisse.map(e => ({ midi: e.midi, zeit: t0 + e.zeit * spb, dauer: e.dauer * spb * 0.92 })),
    { a4: state().settings.a4, amp: 0.13 });
}

function stoppe() {
  for (const o of klicks) { try { o.stop(); } catch (e) { /* schon vorbei */ } }
  klicks = [];
  clearTimeout(ablauf); ablauf = null;
  clearInterval(uhr); uhr = null;
  stopPlayback();
  releaseScreen();
}

export default {
  id: "klavierblatt",
  label: "Klavier-Blatt",
  mount(r) {
    root = r;
    if (!uebung) neu();
    render();
  },
  unmount() { stoppe(); root = null; },
};
