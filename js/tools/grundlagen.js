/* ==========================================================================
   Improvisation — Grundlagen

   Das Werkzeug, das vorher gefehlt hat. „Mollpentatonik“ ist ohne Erklärung
   nur ein Wort, und eine Skala, die man nicht versteht, kann man nicht
   einsetzen — man kann sie nur abspielen.

   Deshalb steht hier zu jeder Skala nicht nur, wie sie gebaut ist, sondern
   wann man sie nimmt, welcher Ton daran gefährlich ist, und was der erste
   Schritt ist. Dazu die fünf Konzepte, die auf einem Fest mehr bringen als
   jede weitere Skala.

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

const TEILE = [
  { id: "skalen", label: "Skalen" },
  { id: "konzepte", label: "Konzepte" },
  { id: "song", label: "Über einen Song" },
];

/* Die klingenden Tonarten, in denen Tanzmusik meistens steht — nach
   Häufigkeit sortiert, nicht nach Quintenzirkel. Wer im Kopfhörer sucht,
   fängt oben an und ist meist nach drei Versuchen fertig. */
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

let sel = { teil: "skalen", offen: null, tonartIdx: 0, rezept: "pentatonik_moll" };

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
      on: { click: () => { sel.teil = t.id; sel.offen = null; render(root); } },
    }));
  }

  if (sel.teil === "skalen") renderSkalen(root);
  else if (sel.teil === "konzepte") renderKonzepte(root);
  else renderSong(root);
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
  unmount() { sel.offen = null; },
};
