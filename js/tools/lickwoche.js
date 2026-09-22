/* ==========================================================================
   Lick der Woche

   Eine Phrase pro Woche, bis sie in allen zwölf Tonarten sitzt, und dann
   über die Band eingesetzt. Das ist, wie Improvisation wirklich wächst:
   nicht über Skalen, sondern über Vokabeln, die man aus Aufnahmen holt und
   so oft in anderen Tonarten spielt, bis man sie nicht mehr denken muss.

   Die eigentliche Übung ist, einen Lick selbst aus einer Aufnahme zu holen:
   Stelle loopen und verlangsamen, mitsingen, bis sie sitzt, am Instrument
   suchen, dann hier eintragen. Die App spielt die Aufnahme nicht — dafür
   gibt es Werkzeuge wie Transcribe! oder Moises — aber sie macht aus dem,
   was man gefunden hat, zwölf Tonarten, eine Band und einen Stand.

   Für den Anfang stehen sechs selbst gebaute Licks bereit, damit man den
   Ablauf lernt, bevor man ihn mit einer echten Aufnahme macht.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO, daysBetween, clamp } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { spell } from "../music/theory.js";
import { renderStaff, autoBeam } from "../music/notation.js";
import {
  ZWOELF, tonartenAb, keyName, transponiere, mitTaktstrichen, laenge, UEBER, bandFuer, notenAus,
  pcVon,
} from "../music/lickwoche.js";
import { naechsteLage, zeitplan } from "../music/diktat.js";
import { gegriffenSymbol } from "../music/leadsheet.js";
import { LICKS } from "../data/licks.js";
import { audio } from "../audio/context.js";
import { playAt } from "../audio/signals.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let ansicht = "woche";          // "woche" | "auswahl" | "editor"
let tonIdx = 0;
let notenSichtbar = true;
let entwurf = null;             // der Lick im Editor
let offBar = null;

const naming = () => state().settings.naming;
const eigene = () => drill("lick:eigene", { licks: [] }).licks;
const alleLicks = () => [...eigene(), ...LICKS];
const lickOf = id => alleLicks().find(l => l.id === id) || LICKS[0];
const woche = () => drill("lick:woche", { id: LICKS[0].id, seit: todayISO() });
const stand = id => drill(`lick:${id}`, { tonarten: {} });
const notenVon = l => Array.isArray(l.noten) ? l.noten : notenAus(l.noten);
const tempo = () => clamp(state().settings.lickBpm || 80, 40, 240);
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
const tonName = t => gross(spell(t, naming()));

function geschafft(l) {
  const s = stand(l.id).tonarten;
  return tonartenAb(l.bezug).filter(t => s[keyName(t)]).length;
}

/* --- Woche ------------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (ansicht === "auswahl") return renderAuswahl();
  if (ansicht === "editor") return renderEditor();

  const w = woche();
  const l = lickOf(w.id);
  const tonarten = tonartenAb(l.bezug);
  tonIdx = clamp(tonIdx, 0, 11);
  const ziel = tonarten[tonIdx];
  const t = transponiere(notenVon(l), l.bezug, ziel);
  const s = stand(l.id).tonarten;
  const zahl = geschafft(l);
  const tage = daysBetween(w.seit, todayISO());
  const ueber = UEBER.find(u => u.id === l.ueber);

  root.innerHTML = `
    <div class="rat">
      <div class="rat-kopf">Lick der Woche · seit ${tage === 0 ? "heute" : tage === 1 ? "gestern" : tage + " Tagen"} · ${zahl} von 12 Tonarten</div>
      <b class="rat-titel">${escapeHtml(l.titel)}</b>
      <p class="rat-grund">${escapeHtml(l.was || "")}</p>
      ${l.quelle ? `<p class="rat-grund">Aus: ${escapeHtml(l.quelle)}</p>` : ""}
      <p class="rat-grund"><b>${escapeHtml(ueber?.label || "")}</b> — ${escapeHtml(ueber?.was || "")}</p>
    </div>
    ${zahl === 12 ? `<p class="warnung">Alle zwölf Tonarten. Jetzt einsetzen, über die Band und in deinen Stücken — und dir den nächsten vornehmen.</p>` : ""}

    <div class="chips scroll" id="lw-ton" role="group" aria-label="Tonart"></div>
    <h2 style="margin-bottom:0">in ${escapeHtml(tonName(ziel))}${s[keyName(ziel)] ? " ✓" : ""}</h2>
    <p class="hint" style="margin-top:2px">gegriffen · klingt in ${escapeHtml(tonName(klingendVon(ziel)))}${t.passt ? "" : " · <strong>passt nicht ganz in den Umfang</strong>"}</p>
    <div class="staff-wrap" id="lw-noten"${notenSichtbar ? "" : " hidden"}>${renderStaff({
      notes: autoBeam(mitTaktstrichen(t.noten).map(n => n.pitch ? { ...n, accidental: n.pitch.alter !== 0 } : n)),
      timeSig: [4, 4], ariaLabel: `${l.titel} in ${tonName(ziel)}`,
      extraClass: t.noten.length > 8 ? "compact" : "",
    })}</div>
    <button class="linkish" id="lw-sicht">${notenSichtbar ? "Noten verbergen und nach Gehör spielen" : "Noten zeigen"}</button>

    <div class="row2">
      <button id="lw-play">Vorspielen</button>
      <button id="lw-band">Mit Band</button>
    </div>
    <div class="grid3">
      <label>Tempo<input type="number" id="lw-tempo" min="40" max="240" value="${tempo()}"></label>
      <label>&nbsp;<button class="${s[keyName(ziel)] ? "" : "weiter"}" id="lw-sitzt">Sitzt in ${escapeHtml(tonName(ziel))}</button></label>
    </div>
    <div class="jetzt pop-jetzt" id="lw-jetzt" hidden>
      <div class="jetzt-kopf"><span id="lw-takt"></span></div>
      <div class="jetzt-akkord" id="lw-akkord">—</div>
    </div>

    <p class="hint"><b>Einsetzen:</b> ${escapeHtml(l.anwenden || "Über die Band, erst an einer festen Stelle, dann frei.")}</p>
    <p class="hint">Reihenfolge je Tonart: vorspielen lassen, mitsingen, ohne Noten suchen, dann erst mit Noten prüfen.
      Abhaken, wenn er zweimal hintereinander im Tempo kam.</p>

    <div class="row2">
      <button id="lw-auswahl">Anderer Lick</button>
      <button id="lw-neu">Eigenen eintragen</button>
    </div>`;

  const chips = $("#lw-ton", root);
  tonarten.forEach((k, i) => chips.append(el("button", {
    class: "chip" + (i === tonIdx ? " on" : ""),
    text: tonName(k) + (s[keyName(k)] ? " ✓" : ""),
    on: { click: () => { tonIdx = i; stoppeBand(); render(); } },
  })));

  $("#lw-sicht", root).addEventListener("click", () => { notenSichtbar = !notenSichtbar; render(); });
  $("#lw-play", root).addEventListener("click", () => spiele(t.noten));
  $("#lw-band", root).addEventListener("click", () => bandUmschalten(l, ziel));
  $("#lw-tempo", root).addEventListener("change", e => {
    state().settings.lickBpm = clamp(Number(e.target.value) || 80, 40, 240);
    save();
    band.configure({ bpm: tempo() });
  });
  $("#lw-sitzt", root).addEventListener("click", () => {
    const st = stand(l.id);
    st.tonarten[keyName(ziel)] = { bpm: tempo(), am: todayISO() };
    st.last = todayISO();
    save();
    toast(`${tonName(ziel)} sitzt`);
    // Weiter zur nächsten offenen Tonart im Zirkel.
    const naechste = tonarten.findIndex((k, i) => i > tonIdx && !st.tonarten[keyName(k)]);
    if (naechste >= 0) tonIdx = naechste;
    stoppeBand();
    render();
  });
  $("#lw-auswahl", root).addEventListener("click", () => { stoppeBand(); ansicht = "auswahl"; render(); window.scrollTo(0, 0); });
  $("#lw-neu", root).addEventListener("click", () => { stoppeBand(); entwurf = neuerEntwurf(); ansicht = "editor"; render(); window.scrollTo(0, 0); });
}

const klingendVon = t => {
  const pc = (pcVon(t) - 9 + 12) % 12;
  return ZWOELF.find(z => pcVon(z) === pc);
};

function spiele(noten) {
  const ctx = audio();
  const z = zeitplan(noten, tempo(), ctx.currentTime + 0.1);
  // Gegriffen notiert, klingend gespielt: neun Halbtöne tiefer.
  playAt(z.noten.map(n => ({ ...n, midi: n.midi - 9 })), { a4: state().settings.a4 });
}

function bandUmschalten(l, ziel) {
  if (band.isRunning()) { stoppeBand(); return; }
  const akkorde = bandFuer(l.ueber, ziel);
  band.configure({ akkorde, bpm: tempo(), swing: 0.62, groove: l.groove || "swing", a4: state().settings.a4, einzaehlen: true });
  band.start();
  holdScreen();
  $("#lw-jetzt", root).hidden = false;
  $("#lw-band", root).textContent = "Band stoppen";
  offBar?.();
  offBar = band.onBar(info => {
    if (!root || !$("#lw-akkord", root)) return;
    $("#lw-akkord", root).textContent = gegriffenSymbol(info.akkord, naming());
    $("#lw-takt", root).textContent = `Takt ${info.takt + 1}`;
  });
}

function stoppeBand() {
  if (band.isRunning()) { band.stop(); releaseScreen(); }
  offBar?.(); offBar = null;
}

/* --- Auswahl ------------------------------------------------------------------ */

function renderAuswahl() {
  const w = woche();
  const karte = l => {
    const n = geschafft(l);
    return `<button class="pr-punkt lw-karte" data-id="${l.id}">
      <span class="pr-punkt-kopf"><b>${escapeHtml(l.titel)}</b><em>${l.id === w.id ? "diese Woche" : n + " von 12"}</em></span>
      <span class="pr-punkt-sub">${escapeHtml(UEBER.find(u => u.id === l.ueber)?.label || "")} · ${escapeHtml(tonName(l.bezug))}${l.quelle ? " · " + escapeHtml(l.quelle) : ""}</span>
      <span class="pr-stufen"><i class="an" style="flex:${n || 0.0001}"></i><i style="flex:${12 - n || 0.0001}"></i></span>
    </button>`;
  };
  root.innerHTML = `
    <button class="zurueck" id="lw-zurueck">← Lick der Woche</button>
    ${eigene().length ? `<h2>Deine Licks</h2>${eigene().map(karte).join("")}` : ""}
    <h2>Zum Anfangen</h2>
    <p class="hint">Selbst gebaut, damit du den Ablauf lernst. Die eigentliche Übung ist ein Lick aus einer Aufnahme.</p>
    ${LICKS.map(karte).join("")}
    <button class="wide primary" id="lw-neu">Eigenen Lick aus einer Aufnahme eintragen</button>`;
  $("#lw-zurueck", root).addEventListener("click", () => { ansicht = "woche"; render(); });
  $$(".lw-karte", root).forEach(b => b.addEventListener("click", () => {
    const d = woche();
    if (d.id !== b.dataset.id) { d.id = b.dataset.id; d.seit = todayISO(); save(); }
    tonIdx = 0; ansicht = "woche"; render(); window.scrollTo(0, 0);
  }));
  $("#lw-neu", root).addEventListener("click", () => { entwurf = neuerEntwurf(); ansicht = "editor"; render(); });
}

/* --- Editor ------------------------------------------------------------------------ */

const DAUERN = [[0.25, "16tel"], [0.5, "Achtel"], [1, "Viertel"], [2, "Halbe"], [4, "Ganze"]];

function neuerEntwurf() {
  return { titel: "", quelle: "", ueber: "m7", bezug: { step: 4, alter: 0 }, noten: [], dur: 0.5, punkt: false, vorz: null };
}

function renderEditor() {
  const e = entwurf;
  const buchstaben = naming() === "en" ? ["C", "D", "E", "F", "G", "A", "B"] : ["C", "D", "E", "F", "G", "A", "H"];
  const schlaege = laenge(e.noten);
  root.innerHTML = `
    <button class="zurueck" id="lw-zurueck">← Lick der Woche</button>
    <h2 style="margin-top:6px">Eigener Lick</h2>
    <p class="hint">Stelle in der Aufnahme loopen und verlangsamen (Transcribe!, Moises, Amazing Slow Downer), mitsingen,
      bis du sie ohne Aufnahme singen kannst, am Saxophon suchen — dann erst hier eintragen, gegriffen.</p>
    <label class="feld">Titel<input type="text" id="lw-e-titel" value="${escapeHtml(e.titel)}" placeholder="Parker's Mood, erste Phrase"></label>
    <label class="feld">Quelle<input type="text" id="lw-e-quelle" value="${escapeHtml(e.quelle)}" placeholder="Interpret, Aufnahme, Minute"></label>
    <h3>Über</h3>
    <div class="chips scroll" id="lw-e-ueber"></div>
    <h3>Bezugston, gegriffen</h3>
    <p class="hint">Der Grundton des Akkords — bei II–V–I und Blues die Eins.</p>
    <div class="chips scroll" id="lw-e-bezug"></div>

    <div class="staff-wrap">${e.noten.length ? renderStaff({
      notes: autoBeam(mitTaktstrichen(e.noten).map(n => n.pitch ? { ...n, accidental: n.pitch.alter !== 0 } : n)),
      timeSig: [4, 4], ariaLabel: "Dein Lick",
    }) : `<p class="hint ht-leer">Noch keine Töne.</p>`}</div>
    <p class="hint">${e.noten.length} Töne, ${String(schlaege).replace(".", ",")} Schläge</p>

    <div class="pad">
      <div class="chips scroll" id="lw-e-dauer"></div>
      <div class="pad-vz">
        ${[[-1, "♭"], [0, "♮"], [1, "♯"]].map(([v, z]) => `<button class="vz${e.vorz === v ? " on" : ""}" data-vz="${v}">${z}</button>`).join("")}
      </div>
      <div class="pad-toene">${buchstaben.map((b, step) => `<button class="ton" data-step="${step}">${b}</button>`).join("")}</div>
      <div class="pad-vz">
        <button id="lw-e-pause">Pause</button>
        <button id="lw-e-okt-ab" ${e.noten.some(n => n.pitch) ? "" : "disabled"}>Oktave ↓</button>
        <button id="lw-e-okt-auf" ${e.noten.some(n => n.pitch) ? "" : "disabled"}>Oktave ↑</button>
      </div>
      <div class="row2">
        <button id="lw-e-weg" ${e.noten.length ? "" : "disabled"}>Löschen</button>
        <button id="lw-e-hoeren" ${e.noten.length ? "" : "disabled"}>Anhören</button>
      </div>
    </div>
    <button class="wide primary" id="lw-e-speichern" ${e.noten.some(n => n.pitch) ? "" : "disabled"}>Speichern und diese Woche üben</button>`;

  const text = (sel, key) => $(sel, root).addEventListener("input", ev => { e[key] = ev.target.value; });
  text("#lw-e-titel", "titel");
  text("#lw-e-quelle", "quelle");

  const u = $("#lw-e-ueber", root);
  UEBER.forEach(x => u.append(el("button", {
    class: "chip" + (e.ueber === x.id ? " on" : ""), text: x.label, title: x.was,
    on: { click: () => { e.ueber = x.id; renderEditor(); } },
  })));
  const bz = $("#lw-e-bezug", root);
  ZWOELF.forEach(t => bz.append(el("button", {
    class: "chip" + (pcVon(t) === pcVon(e.bezug) ? " on" : ""), text: tonName(t),
    on: { click: () => { e.bezug = { ...t }; renderEditor(); } },
  })));
  const dh = $("#lw-e-dauer", root);
  DAUERN.forEach(([d, label]) => dh.append(el("button", {
    class: "chip" + (e.dur === d ? " on" : ""), text: label,
    on: { click: () => { e.dur = d; renderEditor(); } },
  })));
  dh.append(el("button", {
    class: "chip" + (e.punkt ? " on" : ""), text: "punktiert",
    on: { click: () => { e.punkt = !e.punkt; renderEditor(); } },
  }));

  $$(".vz", root).forEach(b => b.addEventListener("click", () => {
    const v = Number(b.dataset.vz); e.vorz = e.vorz === v ? null : v; renderEditor();
  }));
  $$(".ton", root).forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.step);
    const alter = e.vorz ?? 0;
    const vorher = [...e.noten].reverse().find(n => n.pitch)?.pitch || { step: 0, alter: 0, octave: 5 };
    e.noten.push({ pitch: naechsteLage(step, alter, vorher), dur: e.dur, dots: e.punkt ? 1 : 0 });
    e.vorz = null;
    renderEditor();
  }));
  $("#lw-e-pause", root).addEventListener("click", () => { e.noten.push({ pitch: null, dur: e.dur, dots: e.punkt ? 1 : 0 }); renderEditor(); });
  const oktave = d => {
    const i = e.noten.map(n => !!n.pitch).lastIndexOf(true);
    if (i < 0) return;
    const p = e.noten[i].pitch;
    e.noten[i] = { ...e.noten[i], pitch: { ...p, octave: p.octave + d } };
    renderEditor();
  };
  $("#lw-e-okt-ab", root).addEventListener("click", () => oktave(-1));
  $("#lw-e-okt-auf", root).addEventListener("click", () => oktave(1));
  $("#lw-e-weg", root).addEventListener("click", () => { e.noten.pop(); renderEditor(); });
  $("#lw-e-hoeren", root).addEventListener("click", () => spiele(e.noten));
  $("#lw-e-speichern", root).addEventListener("click", () => {
    const lick = {
      id: "e" + Date.now().toString(36),
      titel: e.titel.trim() || "Eigener Lick",
      quelle: e.quelle.trim(),
      ueber: e.ueber, bezug: e.bezug,
      noten: e.noten.map(n => ({ pitch: n.pitch, dur: n.dur, dots: n.dots })),
      was: "Aus einer Aufnahme, nach Gehör.",
      anwenden: "Über die Band an einer festen Stelle, dann in deinen Stücken dort, wo die Harmonie passt.",
    };
    eigene().unshift(lick);
    const w = woche();
    w.id = lick.id; w.seit = todayISO();
    save();
    toast("Gespeichert — das ist jetzt dein Lick der Woche");
    entwurf = null; tonIdx = 0; ansicht = "woche"; render(); window.scrollTo(0, 0);
  });
  $("#lw-zurueck", root).addEventListener("click", () => { entwurf = null; ansicht = "woche"; render(); });
}

export default {
  id: "lickwoche",
  label: "Lick der Woche",
  mount(r) { root = r; render(); },
  unmount() {
    stoppeBand();
    band.configure({ einzaehlen: false, groove: "swing" });
    root = null;
  },
};
