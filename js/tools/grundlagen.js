/* ==========================================================================
   Improvisation — Grundlagen

   Das Werkzeug, das vorher gefehlt hat. „Mollpentatonik“ ist ohne Erklärung
   nur ein Wort, und eine Skala, die man nicht versteht, kann man nicht
   einsetzen — man kann sie nur abspielen.

   Deshalb steht hier zu jeder Skala nicht nur, wie sie gebaut ist, sondern
   wann man sie nimmt, welcher Ton daran gefährlich ist, und was der erste
   Schritt ist. Dazu die fünf Konzepte, die auf einem Fest mehr bringen als
   jede weitere Skala.

   Vorn stehen die Stile und Formen: was ein Blues ist, bevor man einen
   spielt. Jeder Stil mit seiner Form, die die Band in der Tonart der
   eigenen Stücke spielt, und einer Übung, die Form zu hören — man tippt
   die Eins jedes Chorus. Die Inhalte stehen in js/data/stile.js.

   Und der Teil, der die eigentliche Übesituation trifft: du hörst einen Song
   im Kopfhörer und willst mitspielen. Die App kann dabei nicht mithören —
   aus dem Kopfhörer kommt der Song, und das Mikrofon würde ihn verfolgen
   statt dich. Sie kann aber das Rechnen abnehmen: du sagst, welche Tonart du
   gehört hast, und bekommst deine Griffe dazu. Für ein Es-Instrument ist
   genau das die Hürde, an der man mitten im Song hängenbleibt.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast } from "../core/dom.js";
import { state, save } from "../core/store.js";
import { SKALEN_WISSEN, KONZEPTE, SONG_ANLEITUNG } from "../data/improwissen.js";
import {
  buildScale, toMidi, toWritten, chromatic, spell, majorKeySignature,
  minorKeySignature, writtenKeySignature, fromMidi, SCALES,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { playMelody } from "../audio/signals.js";
import { STILE, stilOf } from "../data/stile.js";
import { stufenText, leseLeadsheet, gegriffenSymbol } from "../music/leadsheet.js";
import { akkordeImTakt, progressionTakte } from "../music/harmonie.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const TEILE = [
  { id: "stile", label: "Stile und Formen" },
  { id: "skalen", label: "Skalen" },
  { id: "konzepte", label: "Konzepte" },
  { id: "song", label: "Über einen Song" },
];

/* Die zwölf klingenden Grundtöne für den Griffrechner, Moll-Namen, weil
   man im Kopfhörer meist zuerst den Grundton hört. Die Reihenfolge ist
   Gewohnheit, keine Statistik. */
const HAEUFIGE = [
  { pc: 9, name: "a" }, { pc: 2, name: "d" }, { pc: 4, name: "e" },
  { pc: 7, name: "g" }, { pc: 0, name: "c" }, { pc: 5, name: "f" },
  { pc: 11, name: "h" }, { pc: 6, name: "fis" }, { pc: 1, name: "cis" },
  { pc: 8, name: "gis" }, { pc: 3, name: "es" }, { pc: 10, name: "b" },
];

const REZEPTE = [
  { id: "pentatonik_moll", label: "Moll-Pentatonik", skala: "pentatonik_moll", moll: true,
    wann: "Moll, unklar, House, Blues — die sichere Wahl." },
  { id: "blues", label: "Blues", skala: "blues", moll: true,
    wann: "Wenn es nach Reibung klingen darf." },
  { id: "pentatonik_dur", label: "Dur-Pentatonik", skala: "pentatonik_dur", moll: false,
    wann: "Eindeutig Dur und fröhlich." },
  { id: "mixolydisch", label: "Mixolydisch", skala: "mixolydisch", moll: false,
    wann: "Funk, Soul, ein stehender 7er-Akkord." },
  { id: "dorisch", label: "Dorisch", skala: "dorisch", moll: true,
    wann: "m7-Vamps, wenn die Pentatonik zu wenig hergibt." },
];

let sel = { teil: "stile", offen: null, tonartIdx: 0, rezept: "pentatonik_moll",
            stil: null, stilTonart: 0, stilVariante: 0, verdeckt: false };
let formLauf = null;      // Formübung: { r, eins, chorusMs, schlagMs, treffer, versuche }
let offBar = null, offBandState = null;
const naming = () => state().settings.naming;

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div class="chips" id="gl-teile" role="group" aria-label="Bereich"></div>
    <div id="gl-inhalt"></div>`;

  const host = $("#gl-teile", root);
  for (const t of TEILE) {
    host.append(el("button", {
      class: "chip" + (t.id === sel.teil ? " on" : ""),
      text: t.label,
      on: { click: () => { stoppeStilBand(); sel.teil = t.id; sel.offen = null; sel.stil = null; render(root); } },
    }));
  }

  if (sel.teil === "stile") renderStile(root);
  else if (sel.teil === "skalen") renderSkalen(root);
  else if (sel.teil === "konzepte") renderKonzepte(root);
  else renderSong(root);
}

/* --- Stile und Formen --------------------------------------------------------- */

function renderStile(root) {
  const host = $("#gl-inhalt", root);
  const s = sel.stil && stilOf(sel.stil);
  if (s) { renderStil(host, root, s); return; }
  host.innerHTML = `
    <p class="hint">Bevor man über einen Stil improvisiert, muss man wissen, was ihn ausmacht und wie seine Form
      gebaut ist. Fang mit dem Blues an: zwei deiner Prüfungsstücke sind Blues.</p>
    <div class="artikel-liste">
      ${STILE.map(x => `
        <button class="artikel-karte" data-stil="${x.id}">
          <b>${escapeHtml(x.titel)}</b>
          <span>${escapeHtml(x.kurz)}</span>
        </button>`).join("")}
    </div>`;
  $$("[data-stil]", host).forEach(b => b.addEventListener("click", () => {
    sel.stil = b.dataset.stil; sel.stilTonart = 0; sel.stilVariante = 0; sel.verdeckt = false;
    renderStile(root);
    window.scrollTo(0, 0);
  }));
}

/* Die Form in der gewählten Tonart: klingend gelesen, gegriffen angezeigt. */
function formVon(s) {
  const v = s.varianten[sel.stilVariante] || s.varianten[0];
  const t = s.tonarten[sel.stilTonart] || s.tonarten[0];
  const r = leseLeadsheet(stufenText(v.stufen, t.tonika, naming()), { eingabe: "klingend", naming: naming() });
  const stufenJeTakt = v.stufen.replace(/\[[^\]]*\]/g, "").split("|").map(x => x.trim()).filter(Boolean);
  return { v, t, r, stufenJeTakt };
}

function renderStil(host, root, s) {
  const { v, t, r, stufenJeTakt } = formVon(s);
  const gegriffenTonika = gegriffenSymbol({ root: { ...t.tonika, octave: 3 }, q: "dur" }, naming());
  const n = progressionTakte(r.akkorde);
  const marken = new Map(r.abschnitte.map(a => [a.abTakt, a.label]));
  const liste = xs => `<ul class="stil-liste">${xs.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;

  host.innerHTML = `
    <button class="zurueck" id="st-back">← Alle Stile</button>
    <h2 style="margin-top:6px">${escapeHtml(s.titel)}</h2>
    <p class="artikel-lead">${escapeHtml(s.kurz)}</p>

    ${s.abschnitte.map(a => `
      <h3>${escapeHtml(a.h)}</h3>
      ${(a.p || []).map(x => `<p class="artikel-text">${escapeHtml(x)}</p>`).join("")}
      ${a.liste ? liste(a.liste) : ""}`).join("")}

    <h3>So erkennst du ihn beim Hören</h3>
    ${liste(s.erkennen)}

    <h3>Die Form</h3>
    ${s.varianten.length > 1 ? `<div class="chips" id="st-var" role="group" aria-label="Variante">${s.varianten.map((x, i) =>
      `<button class="chip${i === sel.stilVariante ? " on" : ""}" data-i="${i}">${escapeHtml(x.label)}</button>`).join("")}</div>` : ""}
    <p class="hint">${escapeHtml(v.was)}</p>
    <div class="chips scroll" id="st-ton" role="group" aria-label="Tonart">${s.tonarten.map((x, i) =>
      `<button class="chip${i === sel.stilTonart ? " on" : ""}" data-i="${i}">klingend ${escapeHtml(x.name)}</button>`).join("")}</div>
    <p class="hint">Gegriffen ist der Grundton ${escapeHtml(gegriffenTonika)}. Oben der Akkord, wie du ihn liest, darunter die Stufe.</p>
    <div class="ls-gitter st-gitter${sel.verdeckt ? " verdeckt" : ""}" id="st-gitter">${Array.from({ length: n }, (_, k) => {
      const im = akkordeImTakt(r.akkorde, k);
      return `<div class="ls-takt" data-takt="${k}">
        ${marken.has(k) ? `<span class="ls-marke">${escapeHtml(marken.get(k))}</span>` : ""}
        <b>${im.map(a => escapeHtml(gegriffenSymbol(a, naming()))).join(" ")}</b>
        <small>${escapeHtml(stufenJeTakt[k] || "")}</small>
      </div>`;
    }).join("")}</div>

    <div class="row2">
      <button id="st-band" class="${band.isRunning() && formLauf ? "" : "primary"}">${band.isRunning() && formLauf ? "Band stoppen" : "Band spielen"}</button>
      <button id="st-verdeckt">${sel.verdeckt ? "Raster zeigen" : "Raster verdecken"}</button>
    </div>
    <p class="hint">Formübung: tipp auf die große Fläche, wenn ein neuer Durchgang beginnt — auf die Eins von Takt 1.
      Erst mit Raster, dann verdeckt. So hörst du die Form, statt sie abzulesen.</p>
    <button class="tapfeld" id="st-tap" ${band.isRunning() && formLauf ? "" : "disabled"}><span id="st-tap-text">${formLauf?.text || "Neuer Durchgang"}</span></button>
    <p class="hint" id="st-stand">${formLauf && formLauf.versuche ? `${formLauf.treffer} von ${formLauf.versuche} getroffen` : ""}</p>

    <h3>So spielst du darüber</h3>
    <ol class="stil-schritte">${s.schritte.map(x => `
      <li><b>${escapeHtml(x.was)}</b>
        <p>${escapeHtml(x.wie)}</p>
        <p class="fertig">Fertig, wenn: ${escapeHtml(x.fertig)}</p></li>`).join("")}</ol>

    <h3>Typische Fehler</h3>
    ${liste(s.fehler)}

    <h3>Anhören</h3>
    <ul class="stil-liste">${s.hoeren.map(h => `<li><b>${escapeHtml(h.wer)}</b> — ${escapeHtml(h.was)}</li>`).join("")}</ul>

    <h3>Für dich</h3>
    <p class="artikel-text">${escapeHtml(s.deine)}</p>`;

  $("#st-back", host).addEventListener("click", () => { stoppeStilBand(); sel.stil = null; renderStile(root); window.scrollTo(0, 0); });
  $$("#st-var .chip", host).forEach(b => b.addEventListener("click", () => { stoppeStilBand(); sel.stilVariante = Number(b.dataset.i); renderStil(host, root, s); }));
  $$("#st-ton .chip", host).forEach(b => b.addEventListener("click", () => { stoppeStilBand(); sel.stilTonart = Number(b.dataset.i); renderStil(host, root, s); }));
  $("#st-verdeckt", host).addEventListener("click", () => {
    sel.verdeckt = !sel.verdeckt;
    $("#st-gitter", host).classList.toggle("verdeckt", sel.verdeckt);
    $("#st-verdeckt", host).textContent = sel.verdeckt ? "Raster zeigen" : "Raster verdecken";
  });
  $("#st-band", host).addEventListener("click", () => {
    if (band.isRunning() && formLauf) { stoppeStilBand(); renderStil(host, root, s); return; }
    starteStilBand(s, r, host, root);
  });
  $("#st-tap", host).addEventListener("pointerdown", e => { e.preventDefault(); tippeEins(host); });
}

function starteStilBand(s, r, host, root) {
  stoppeStilBand();
  const schlagMs = 60000 / s.tempo;
  formLauf = { r, eins: null, schlagMs, chorusMs: progressionTakte(r.akkorde) * 4 * schlagMs, treffer: 0, versuche: 0, text: "Neuer Durchgang" };
  band.configure({ akkorde: r.akkorde, bpm: s.tempo, swing: s.swing, groove: s.groove, a4: state().settings.a4, einzaehlen: false });
  band.start();
  holdScreen();
  offBar = band.onBar(info => {
    if (!formLauf) return;
    if (info.takt === 0) formLauf.eins = performance.now();
    const g = $("#st-gitter", host);
    if (!g) return;
    $$(".ls-takt", g).forEach(f => f.classList.toggle("on", Number(f.dataset.takt) === info.takt));
  });
  offBandState = band.onStateChange(() => { if (!band.isRunning() && formLauf) { stoppeStilBand(); if (root.isConnected) renderStil(host, root, s); } });
  renderStil(host, root, s);
}

/* Getippt wird auf die Eins eines neuen Durchgangs. Gewertet gegen den
   nächsten Chorusanfang, gehört — die Anzeige kommt über onBar schon zum
   hörbaren Zeitpunkt, auch über Bluetooth. Ein Schlag Spielraum. */
function tippeEins(host) {
  if (!formLauf || formLauf.eins == null) return;
  const t = performance.now();
  const kandidaten = [formLauf.eins - formLauf.chorusMs, formLauf.eins, formLauf.eins + formLauf.chorusMs];
  const d = kandidaten.map(c => t - c).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  formLauf.versuche++;
  if (Math.abs(d) <= formLauf.schlagMs) {
    formLauf.treffer++;
    formLauf.text = "Getroffen";
  } else {
    const takte = Math.max(1, Math.round(Math.abs(d) / (4 * formLauf.schlagMs)));
    formLauf.text = Math.abs(d) < 4 * formLauf.schlagMs * 0.75
      ? (d < 0 ? "Etwas zu früh" : "Etwas zu spät")
      : `${takte} ${takte === 1 ? "Takt" : "Takte"} ${d < 0 ? "zu früh" : "zu spät"}`;
  }
  const tap = $("#st-tap", host);
  if (tap) { tap.classList.add("schlag"); setTimeout(() => tap.classList.remove("schlag"), 90); }
  const txt = $("#st-tap-text", host); if (txt) txt.textContent = formLauf.text;
  const stand = $("#st-stand", host); if (stand) stand.textContent = `${formLauf.treffer} von ${formLauf.versuche} getroffen`;
}

function stoppeStilBand() {
  offBar?.(); offBar = null;
  offBandState?.(); offBandState = null;
  if (formLauf) {
    formLauf = null;
    if (band.isRunning()) band.stop();
    band.configure({ groove: "swing" });
    releaseScreen();
  }
}

/* --- Skalen ------------------------------------------------------------------ */

function renderSkalen(root) {
  const host = $("#gl-inhalt", root);

  if (sel.offen) {
    const s = SKALEN_WISSEN.find(x => x.id === sel.offen);
    if (s) { renderSkalenDetail(host, root, s); return; }
  }

  host.innerHTML = `
    <p class="hint">
      In dieser Reihenfolge lernen. Die erste reicht für die halbe Tanzmusik,
      und wer sie wirklich kann, braucht die fünfte lange nicht.
    </p>
    <div class="artikel-liste">
      ${SKALEN_WISSEN.map(s => `
        <button class="artikel-karte" data-skala="${s.id}">
          <b>${s.reihenfolge}. ${escapeHtml(s.titel)}</b>
          <span>${escapeHtml(s.kurz)}</span>
        </button>`).join("")}
    </div>`;

  $$("[data-skala]", host).forEach(b => b.addEventListener("click", () => {
    sel.offen = b.dataset.skala;
    renderSkalen(root);
    window.scrollTo(0, 0);
  }));
}

function renderSkalenDetail(host, root, s) {
  // Zum Anhören und Ansehen: auf einem Grundton, der am Alt bequem liegt.
  const grundKlingend = 57;                       // klingend A3
  const griff = chromatic(toWritten(grundKlingend));
  const skalaKey = SCALES[s.id] ? s.id : (s.id === "blues" ? "blues" : "pentatonik_moll");
  const toene = buildScale(griff, skalaKey, 1);
  const sig = 0;

  host.innerHTML = `
    <button class="zurueck" id="gl-back">← Alle Skalen</button>
    <h2 style="margin-top:6px">${escapeHtml(s.titel)}</h2>
    <p class="artikel-lead">${escapeHtml(s.kurz)}</p>

    <h3>Wie sie gebaut ist</h3>
    <p class="artikel-text">${escapeHtml(s.bau)}</p>

    <div class="staff-wrap">${renderStaff({
      keySig: sig,
      notes: pitchesToNotes(toene, DUR.viertel, {
        accidentalsFor: sig, labels: toene.map(p => spell(p)),
      }),
      extraClass: "compact",
      ariaLabel: s.titel,
    })}</div>
    <p class="hint">
      Gegriffen auf ${escapeHtml(spell(griff))} — klingt auf
      ${escapeHtml(spell(chromatic(grundKlingend)))}. In jeder anderen Tonart
      dieselben Abstände.
    </p>
    <div class="row2">
      <button id="gl-hoeren">Anhören</button>
      <button id="gl-langsam">Langsam</button>
    </div>

    <h3>Warum sie funktioniert</h3>
    ${s.warum.map(t => `<p class="artikel-text">${escapeHtml(t)}</p>`).join("")}

    <h3>Wann du sie nimmst</h3>
    <ul class="cues">${s.wann.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>

    <h3>Worauf du aufpassen musst</h3>
    <p class="artikel-text">${escapeHtml(s.achtung)}</p>

    <div class="panel">
      <p class="hint" style="margin:0 0 6px"><strong>Erster Schritt</strong></p>
      <p class="artikel-text" style="margin:0">${escapeHtml(s.ersterSchritt)}</p>
    </div>`;

  const midis = toene.map(p => toMidi(p) - 9);
  $("#gl-back", host).addEventListener("click", () => {
    sel.offen = null; renderSkalen(root); window.scrollTo(0, 0);
  });
  $("#gl-hoeren", host).addEventListener("click", () =>
    playMelody(midis, { noteDur: 0.34, gap: 0.02, a4: state().settings.a4 }));
  $("#gl-langsam", host).addEventListener("click", () =>
    playMelody(midis, { noteDur: 0.7, gap: 0.05, a4: state().settings.a4 }));
}

/* --- Konzepte ----------------------------------------------------------------- */

function renderKonzepte(root) {
  const host = $("#gl-inhalt", root);
  host.innerHTML = `
    <p class="hint">
      Fünf Dinge, die auf einem Fest mehr bringen als jede weitere Skala.
      Wenn du nur eines davon umsetzt, nimm die Pausen.
    </p>
    ${KONZEPTE.map(k => `
      <details class="diag">
        <summary>${escapeHtml(k.titel)} — <em>${escapeHtml(k.kurz)}</em></summary>
        ${k.text.map(t => `<p class="artikel-text" style="padding:0 0 0 32px">${escapeHtml(t)}</p>`).join("")}
        <div class="panel" style="margin-left:32px">
          <p class="hint" style="margin:0 0 6px"><strong>Übung</strong></p>
          <p class="artikel-text" style="margin:0">${escapeHtml(k.uebung)}</p>
        </div>
      </details>`).join("")}`;
}

/* --- Über einen Song ----------------------------------------------------------- */

function renderSong(root) {
  const host = $("#gl-inhalt", root);
  const a = SONG_ANLEITUNG;

  host.innerHTML = `
    <h2 style="margin-top:8px">${escapeHtml(a.titel)}</h2>
    <p class="artikel-lead">${escapeHtml(a.einleitung)}</p>

    ${a.schritte.map((s, i) => `
      <h3>${i + 1}. ${escapeHtml(s.h)}</h3>
      ${s.p.map(t => `<p class="artikel-text">${escapeHtml(t)}</p>`).join("")}
    `).join("")}

    <p class="hint spaced">${escapeHtml(a.hinweis)}</p>

    <h2>Griffrechner</h2>
    <p class="hint">
      Du hast die Tonart gehört — hier stehen deine Griffe. Klingend links,
      gegriffen rechts, und genau das ist die Rechnung, die man mitten im
      Song nicht im Kopf machen will.
    </p>

    <label class="gl-feld">Gehörte Tonart, klingend
      <select id="gl-tonart">
        ${HAEUFIGE.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join("")}
      </select>
    </label>

    <div class="chips scroll" id="gl-rezepte" role="group" aria-label="Skala"></div>
    <p class="hint" id="gl-rezept-wann"></p>

    <div id="gl-ergebnis"></div>`;

  $("#gl-tonart", host).value = String(sel.tonartIdx);
  $("#gl-tonart", host).addEventListener("change", e => {
    sel.tonartIdx = Number(e.target.value); renderRezept(root);
  });

  const chips = $("#gl-rezepte", host);
  for (const r of REZEPTE) {
    chips.append(el("button", {
      class: "chip" + (r.id === sel.rezept ? " on" : ""),
      text: r.label,
      on: { click: () => { sel.rezept = r.id; renderSong(root); } },
    }));
  }
  renderRezept(root);
}

function renderRezept(root) {
  const host = $("#gl-ergebnis", root);
  if (!host) return;
  const r = REZEPTE.find(x => x.id === sel.rezept) || REZEPTE[0];
  const t = HAEUFIGE[sel.tonartIdx];

  $("#gl-rezept-wann", root).textContent = r.wann;

  // Klingender Grundton in bequemer Lage, dann der Griff dazu.
  const klingend = 48 + t.pc + (t.pc < 5 ? 12 : 0);
  const griffMidi = toWritten(klingend);
  const griff = chromatic(griffMidi);
  const toene = buildScale(griff, r.skala, 1);

  // Die Vorzeichnung der gegriffenen Tonart, damit die Noten lesbar stehen.
  const klingendSig = r.moll
    ? minorKeySignature(chromatic(klingend))
    : majorKeySignature(chromatic(klingend));
  const sig = writtenKeySignature(klingendSig);

  host.innerHTML = `
    <div class="panel">
      <div class="stat-row">
        <div class="stat"><b>${escapeHtml(spell(chromatic(klingend)))}</b><span>klingend gehört</span></div>
        <div class="stat"><b>${escapeHtml(spell(griff))}</b><span>dein Grundton</span></div>
      </div>
      <p class="hint" style="margin:12px 0 0">
        Deine Tonart liegt eine große Sexte über der gehörten. Das ist kein
        Fehler, sondern das Es-Instrument — und der Grund, warum dir im Song
        die falschen Töne unter die Finger kommen, wenn du es vergisst.
      </p>
    </div>

    <div class="staff-wrap">${renderStaff({
      keySig: sig,
      notes: pitchesToNotes(toene, DUR.viertel, {
        accidentalsFor: sig, labels: toene.map(p => spell(p)),
      }),
      extraClass: "compact",
      ariaLabel: r.label,
    })}</div>

    <div class="row2">
      <button id="gl-rez-hoeren">Anhören</button>
      <button id="gl-rez-grund">Nur den Grundton</button>
    </div>
    <p class="hint spaced">
      Und jetzt: zwei Takte spielen, zwei schweigen. Ein Motiv statt vieler
      Töne. Die Eins mitzählen.
    </p>`;

  const midis = toene.map(p => toMidi(p) - 9);
  $("#gl-rez-hoeren", host).addEventListener("click", () =>
    playMelody(midis, { noteDur: 0.32, gap: 0.02, a4: state().settings.a4 }));
  $("#gl-rez-grund", host).addEventListener("click", () =>
    playMelody([midis[0]], { noteDur: 1.4, a4: state().settings.a4 }));
}

export default {
  id: "grundlagen",
  label: "Grundlagen",
  mount(root) { render(root); },
  unmount() { stoppeStilBand(); sel.offen = null; },
};
