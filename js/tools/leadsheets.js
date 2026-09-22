/* ==========================================================================
   Eigene Stücke

   Die Begleitband für die Prüfungsstücke. Die festen Folgen im Werkzeug
   „Improvisation“ sind Übungsfelder; geprüft wird aber über There Will Never
   Be Another You, nicht über einen Quintfall. Hier tippt man die Akkorde aus
   dem eigenen Leadsheet ab, und die Band spielt genau die.

   Die Akkorde kommen bewusst vom Nutzer und nicht aus der App. Harmonien
   von Standards gibt es in vielen Fassungen, und eine aus dem Gedächtnis
   wäre für genau dieses Leadsheet vermutlich falsch — dieselbe Haltung wie
   bei den Altissimo-Griffen. Vorlagen gibt es nur für Formen, die jeder
   gleich spielt: Blues, Jazz-Blues, Rhythm Changes.

   Angezeigt wird gegriffen, gespielt klingend; eingegeben wird, was im
   Leadsheet steht, und man sagt dazu, ob es ein C- oder ein Es-Leadsheet ist.

   Die Band spielt Swing-Begleitung mit Walking Bass. Für eine Bossa oder
   ein Funk-Stück stimmt das Gerüst, der Groove nicht; mit Swing auf
   „gerade“ lässt sich trotzdem die Form üben.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, escapeHtml, toast } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { NAMING, spell, chromatic } from "../music/theory.js";
import { guidePitches, akkordeImTakt, progressionTakte, chordAtBar } from "../music/harmonie.js";
import { leseLeadsheet, gegriffenSymbol, zuGegriffen, VORLAGEN, vorlageText } from "../music/leadsheet.js";
import { programmTitel } from "../data/pruefung.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let offen = null;              // id des offenen Stücks
let bearbeiten = false;
let offBar = null, offState = null;
let vorgemerkt = null;         // Titel, mit dem die Prüfung hierher schickt

const naming = () => state().settings.naming;
const liste = () => drill("leadsheets:liste", { songs: [] }).songs;
const songOf = id => liste().find(s => s.id === id);
const neueId = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Die Prüfung schickt mit einem Stücktitel hierher: öffnen oder anlegen. */
export function oeffneFuerTitel(titel) { vorgemerkt = titel; }

// Klingende Tonarten für Vorlagen. Für ein Es-Instrument liegen die
// bequemen Blues-Tonarten bei B, Es und F klingend.
const TONARTEN = [10, 3, 5, 0, 7, 2, 9, 4, 11, 6, 1, 8].map(pc => {
  const p = chromatic(60 + pc);
  return { pc, tonika: { step: p.step, alter: p.alter } };
});

function gelesen(song) {
  return leseLeadsheet(song.text, { eingabe: song.eingabe || "klingend", naming: naming() });
}

/* --- Liste --------------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (vorgemerkt) {
    const t = vorgemerkt;
    vorgemerkt = null;
    let s = liste().find(x => x.titel === t);
    if (!s) {
      s = { id: neueId(), titel: t, text: "", eingabe: "klingend", tempo: 140, swing: 0.62 };
      liste().push(s);
      save();
      bearbeiten = true;
    }
    offen = s.id;
  }
  if (offen && songOf(offen)) { renderSong(songOf(offen)); return; }
  offen = null;

  const songs = liste();
  const vorschlaege = programmTitel(state().drills).filter(t => !songs.some(s => s.titel === t));
  root.innerHTML = `
    <p class="hint">Deine Stücke mit eigener Band. Tipp die Akkorde aus deinem Leadsheet ab —
      die Band spielt genau die, und angezeigt wird, was du greifst.</p>
    <div id="ls-liste">${songs.length ? songs.map(s => {
      const r = gelesen(s);
      return `<button class="rp-karte ls-karte" data-id="${s.id}">
        <span class="rp-kopf"><b>${escapeHtml(s.titel)}</b>
          <em class="rp-status">${r.fehler.length ? "Fehler im Leadsheet" : `${r.taktzahl} Takte`}</em></span>
        <span class="rp-sub">${s.tempo} bpm · ${s.eingabe === "es" ? "Es-Leadsheet" : "C-Leadsheet"}</span>
      </button>`;
    }).join("") : `<p class="empty">Noch keine Stücke. Leg dein erstes Prüfungsstück an.</p>`}</div>

    <h2>Neues Stück</h2>
    <label class="feld">Titel
      <input type="text" id="ls-titel" list="ls-titel-vorschlag" autocomplete="off"
        placeholder="There Will Never Be Another You">
      <datalist id="ls-titel-vorschlag">${vorschlaege.map(t => `<option value="${escapeHtml(t)}">`).join("")}</datalist>
    </label>
    <div class="chips scroll" id="ls-vorlage" role="group" aria-label="Vorlage"></div>
    <label class="feld" id="ls-tonart-feld" hidden>Tonart, klingend
      <select id="ls-tonart">${TONARTEN.map((t, i) =>
        `<option value="${i}">${escapeHtml(spell(t.tonika, naming()))}</option>`).join("")}</select>
    </label>
    <p class="hint" id="ls-vorlage-was"></p>
    <button class="wide primary" id="ls-anlegen">Anlegen</button>`;

  let vorlage = "leer";
  const zeigeVorlagen = () => {
    const host = $("#ls-vorlage", root);
    host.innerHTML = "";
    for (const v of [{ id: "leer", name: "Leer" }, ...VORLAGEN]) {
      host.append(el("button", {
        class: "chip" + (v.id === vorlage ? " on" : ""), text: v.name,
        on: { click: () => { vorlage = v.id; zeigeVorlagen(); } },
      }));
    }
    $("#ls-tonart-feld", root).hidden = vorlage === "leer";
    $("#ls-vorlage-was", root).textContent = vorlage === "leer"
      ? "Leer heißt: du tippst die Akkorde aus deinem Leadsheet ab."
      : VORLAGEN.find(v => v.id === vorlage).was;
  };
  zeigeVorlagen();

  $$(".ls-karte", root).forEach(b => b.addEventListener("click", () => {
    offen = b.dataset.id; bearbeiten = false; render(); window.scrollTo(0, 0);
  }));
  $("#ls-anlegen", root).addEventListener("click", () => {
    const titel = $("#ls-titel", root).value.trim() ||
      (vorlage === "leer" ? "Neues Stück" : VORLAGEN.find(v => v.id === vorlage).name);
    const t = TONARTEN[Number($("#ls-tonart", root).value) || 0];
    const song = {
      id: neueId(), titel, eingabe: "klingend",
      text: vorlage === "leer" ? "" : vorlageText(vorlage, t.tonika, naming()),
      tempo: vorlage === "rhythm" ? 180 : 140, swing: 0.62,
    };
    liste().push(song);
    save();
    offen = song.id;
    bearbeiten = vorlage === "leer";
    render();
    window.scrollTo(0, 0);
  });
}

/* --- Ein Stück ---------------------------------------------------------------- */

function renderSong(song) {
  const r = gelesen(song);
  const spielbar = r.akkorde.length > 0 && !r.fehler.length;

  root.innerHTML = `
    <button class="zurueck" id="ls-zurueck">← Stücke</button>
    <h2 style="margin-top:6px">${escapeHtml(song.titel)}</h2>

    ${spielbar ? `
    <div class="jetzt">
      <div class="jetzt-kopf">
        <span class="jetzt-takt" id="ls-takt"></span>
        <span class="jetzt-naechst" id="ls-naechst"></span>
      </div>
      <div class="jetzt-akkord" id="ls-akkord">—</div>
      <div class="jetzt-unter" id="ls-unter"></div>
    </div>
    <button class="wide primary" id="ls-los">Band starten</button>
    <div class="ls-gitter" id="ls-gitter"></div>
    <div class="grid3">
      <label>Tempo<input type="number" id="ls-tempo" min="40" max="300" value="${song.tempo}"></label>
      <label>Einzählen
        <select id="ls-einz"><option value="1">ein Takt</option><option value="0">nein</option></select>
      </label>
    </div>
    <div class="slider">
      <label for="ls-swing">Swing</label>
      <input type="range" id="ls-swing" min="50" max="67" value="${Math.round((song.swing ?? 0.62) * 100)}">
      <span class="slider-val" id="ls-swing-val"></span>
    </div>
    <div class="chips" id="ls-spuren" role="group" aria-label="Spuren"></div>` : `
    <p class="warnung">${r.akkorde.length
      ? "Das Leadsheet hat Fehler. Die Band spielt erst, wenn jeder Akkord gelesen werden kann — sonst übst du über etwas, das nicht dasteht."
      : "Noch keine Akkorde. Tipp sie unten aus deinem Leadsheet ab."}</p>`}

    <details class="ls-edit" id="ls-edit"${bearbeiten || !spielbar ? " open" : ""}>
      <summary>Akkorde bearbeiten</summary>
      <label class="feld">Titel<input type="text" id="ls-e-titel" value="${escapeHtml(song.titel)}"></label>
      <div class="chips" id="ls-e-eingabe" role="group" aria-label="Leadsheet"></div>
      <p class="hint" id="ls-e-eingabe-was"></p>
      <label class="feld">Akkorde
        <textarea id="ls-e-text" rows="8" spellcheck="false" autocapitalize="off" autocomplete="off"
          placeholder="[A] | Cm7 F7 | Bbmaj7 | Ebmaj7 | Am7b5 D7 |">${escapeHtml(song.text || "")}</textarea>
      </label>
      <p class="hint">Takte zwischen Strichen. Zwei Akkorde im Takt teilen ihn in Hälften, drei in 2+1+1
        Schläge. % wiederholt den Takt davor, [A] markiert einen Formteil. ${naming() === NAMING.EN
        ? "B heißt hier H; B♭ schreibst du Bb." : "B heißt hier B♭, wie auf Deutsch; Bb geht auch, H ist H."}</p>
      <div id="ls-e-befund"></div>
      <div class="row2">
        <button id="ls-e-speichern" class="weiter">Speichern</button>
        <button id="ls-e-loeschen">Stück löschen</button>
      </div>
    </details>`;

  $("#ls-zurueck", root).addEventListener("click", () => {
    band.stop(); releaseScreen(); offen = null; bearbeiten = false; render(); window.scrollTo(0, 0);
  });
  renderEditor(song);
  if (!spielbar) return;

  renderGitter(r);
  renderSpuren();
  zeigeTakt(r, { takt: 0 });
  $("#ls-swing-val", root).textContent = swingText(song.swing ?? 0.62);
  $("#ls-einz", root).value = state().settings.bandEinzaehlen === false ? "0" : "1";

  const konfig = () => band.configure({
    akkorde: r.akkorde, bpm: song.tempo, swing: song.swing ?? 0.62, a4: state().settings.a4,
    spuren: spuren(), einzaehlen: state().settings.bandEinzaehlen !== false,
  });
  konfig();

  $("#ls-los", root).addEventListener("click", () => {
    if (band.isRunning()) { band.stop(); releaseScreen(); }
    else { konfig(); band.start(); holdScreen(); }
  });
  $("#ls-tempo", root).addEventListener("change", e => {
    song.tempo = clamp(Number(e.target.value) || 120, 40, 300);
    e.target.value = song.tempo;
    save();
    band.configure({ bpm: song.tempo });
  });
  $("#ls-swing", root).addEventListener("input", e => {
    song.swing = Number(e.target.value) / 100;
    $("#ls-swing-val", root).textContent = swingText(song.swing);
    band.configure({ swing: song.swing });
  });
  $("#ls-swing", root).addEventListener("change", () => save());
  $("#ls-einz", root).addEventListener("change", e => {
    state().settings.bandEinzaehlen = e.target.value === "1";
    save();
    band.configure({ einzaehlen: state().settings.bandEinzaehlen });
  });
}

const swingText = s => s <= 0.51 ? "gerade" : s >= 0.66 ? "voll" : Math.round(s * 100) + " %";

function spuren() {
  const s = state().settings.bandSpuren;
  return s && typeof s === "object" ? s : { bass: true, comp: true, becken: true };
}

function renderSpuren() {
  const host = $("#ls-spuren", root);
  host.innerHTML = "";
  for (const [id, label] of [["bass", "Bass"], ["comp", "Akkorde"], ["becken", "Becken"]]) {
    host.append(el("button", {
      class: "chip" + (spuren()[id] ? " on" : ""), text: label,
      on: { click: () => {
        state().settings.bandSpuren = { ...spuren(), [id]: !spuren()[id] };
        save();
        band.configure({ spuren: spuren() });
        renderSpuren();
      } },
    }));
  }
}

/** Die Form als Gitter, vier Takte je Zeile, gegriffen beschriftet. */
function renderGitter(r) {
  const marken = new Map(r.abschnitte.map(a => [a.abTakt, a.label]));
  const n = progressionTakte(r.akkorde);
  $("#ls-gitter", root).innerHTML = Array.from({ length: n }, (_, t) => {
    const im = akkordeImTakt(r.akkorde, t);
    return `<div class="ls-takt" data-takt="${t}">
      ${marken.has(t) ? `<span class="ls-marke">${escapeHtml(marken.get(t))}</span>` : ""}
      ${im.map(a => `<b>${escapeHtml(gegriffenSymbol(a, naming()))}</b>`).join(" ")}
    </div>`;
  }).join("");
}

/** Der große Akkord oben: was jetzt gegriffen wird, und die Zieltöne. */
function zeigeTakt(r, info) {
  const t = info.takt;
  const gesamt = progressionTakte(r.akkorde);
  const im = info.imTakt || akkordeImTakt(r.akkorde, t);
  const erster = im[0];
  const g = zuGegriffen({ ...erster.root, octave: 4 });
  const ziel = guidePitches(g, erster.q).map(p => spell(p, naming()));
  const gross = $("#ls-akkord", root);
  gross.textContent = im.map(a => gegriffenSymbol(a, naming())).join(" · ");
  // Zwei Akkorde im Takt müssen in eine Zeile passen, sonst springt die
  // Anzeige bei jedem Wechsel in der Höhe.
  gross.classList.toggle("mehrere", im.length > 1);
  $("#ls-unter", root).textContent =
    `Zieltöne ${ziel[0]} und ${ziel[1]} · klingt ${im.map(a => a.symbol).join(" · ")}`;
  $("#ls-takt", root).textContent = `Takt ${t + 1} von ${gesamt}`;
  const naechster = chordAtBar(r.akkorde, (t + 1) % gesamt);
  $("#ls-naechst", root).textContent = `dann ${gegriffenSymbol(naechster, naming())}`;
  $$(".ls-takt", root).forEach(f => f.classList.toggle("on", Number(f.dataset.takt) === t));
  const feld = $(`.ls-takt[data-takt="${t}"]`, root);
  if (feld && band.isRunning()) feld.scrollIntoView({ block: "nearest" });
}

/* --- Editor ------------------------------------------------------------------- */

function renderEditor(song) {
  let eingabe = song.eingabe || "klingend";
  const zeigeEingabe = () => {
    const host = $("#ls-e-eingabe", root);
    host.innerHTML = "";
    for (const [id, label] of [["klingend", "C-Leadsheet, klingend"], ["es", "Es-Leadsheet, gegriffen"]]) {
      host.append(el("button", {
        class: "chip" + (id === eingabe ? " on" : ""), text: label,
        on: { click: () => { eingabe = id; zeigeEingabe(); pruefe(); } },
      }));
    }
    $("#ls-e-eingabe-was", root).textContent = eingabe === "es"
      ? "Das Leadsheet ist schon für Es-Instrumente geschrieben: du tippst ab, was du greifst, die Band spielt eine große Sexte tiefer."
      : "Das Leadsheet ist in C, wie das Real Book: du tippst ab, was klingt, und liest gegriffen eine große Sexte höher.";
  };
  const pruefe = () => {
    const r = leseLeadsheet($("#ls-e-text", root).value, { eingabe, naming: naming() });
    const host = $("#ls-e-befund", root);
    const zeilen = [];
    if (r.fehler.length) zeilen.push(...r.fehler.map(f => `<li>Takt ${f.takt}: ${escapeHtml(f.grund)}</li>`));
    if (r.hinweise.length) zeilen.push(...r.hinweise.map(h => `<li class="ls-hinweis">${escapeHtml(h)}</li>`));
    host.innerHTML = `<p class="hint">${r.taktzahl} Takte gelesen${r.fehler.length
      ? `, <b>${r.fehler.length} ${r.fehler.length === 1 ? "Fehler" : "Fehler"}</b>` : ""}.${r.akkorde.length && !r.fehler.length
      ? ` Gegriffen beginnt es mit ${escapeHtml(gegriffenSymbol(r.akkorde[0], naming()))}.` : ""}</p>
      ${zeilen.length ? `<ul class="ls-befund">${zeilen.join("")}</ul>` : ""}`;
    return r;
  };
  zeigeEingabe();
  pruefe();
  $("#ls-e-text", root).addEventListener("input", pruefe);

  $("#ls-e-speichern", root).addEventListener("click", () => {
    song.titel = $("#ls-e-titel", root).value.trim() || song.titel;
    song.text = $("#ls-e-text", root).value;
    song.eingabe = eingabe;
    save();
    const r = pruefe();
    bearbeiten = r.fehler.length > 0;
    band.stop();
    toast(r.fehler.length ? "Gespeichert, aber mit Fehlern" : "Gespeichert");
    renderSong(song);
  });
  $("#ls-e-loeschen", root).addEventListener("click", () => {
    if (!confirm(`„${song.titel}“ löschen?`)) return;
    const l = liste();
    l.splice(l.indexOf(song), 1);
    save();
    band.stop();
    offen = null;
    render();
  });
}

export default {
  id: "leadsheets",
  label: "Eigene Stücke",
  mount(r) {
    root = r;
    render();
    offBar = band.onBar(info => {
      const song = offen && songOf(offen);
      if (!song || !root || !$("#ls-gitter", root)) return;
      zeigeTakt(gelesen(song), info);
    });
    offState = band.onStateChange(({ running }) => {
      const b = root && $("#ls-los", root);
      if (!b) return;
      b.textContent = running ? "Band stoppen" : "Band starten";
      b.classList.toggle("primary", !running);
    });
  },
  unmount() {
    offBar?.(); offState?.();
    band.stop();
    // Der Einzähler gilt nur hier. Call and Response und Gig-Training
    // zählen ihre Takte ab dem ersten Schlag der Band.
    band.configure({ einzaehlen: false });
    releaseScreen();
    root = null;
  },
};
