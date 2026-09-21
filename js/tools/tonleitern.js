/* ==========================================================================
   Tonleitern

   Für die Aufnahmeprüfung zählt, was du greifst — wenn jemand „D-Dur“ sagt,
   meint er die Tonart, die du liest. Deshalb ist der Griff hier die
   Hauptangabe und die klingende Tonart steht klein daneben. Wer das
   verwechselt, übt die falsche Tonart.

   Der Fortschritt wird je Tonart und Art getrennt geführt. Das ist der
   eigentliche Zweck: nach zwei Wochen sieht man auf einen Blick, welche
   Tonarten man immer wieder auslässt — und das sind erfahrungsgemäß genau
   die, die in der Prüfung drankommen.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast, todayISO, daysBetween } from "../core/dom.js";
import { state, drill, recordDrill, save } from "../core/store.js";
import {
  MAJOR_KEYS, MINOR_KEYS, SCALES, buildScale, buildChord, toMidi, toSounding,
  spell, keySignature, RANGE, fromMidi, NAMING,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { playMelody } from "../audio/signals.js";
import * as metro from "../audio/metronome.js";

/* Welche Arten übbar sind. Die Reihenfolge ist die des Übens, nicht die des
   Quintenzirkels: erst Dur, dann die drei Mollarten, dann Dreiklänge, dann
   alles Weitere. */
const TYPES = [
  { id: "dur", label: "Dur", scale: "dur", keys: "major" },
  { id: "moll_natur", label: "Moll natürlich", scale: "moll_natur", keys: "minor" },
  { id: "moll_harmonisch", label: "Moll harmonisch", scale: "moll_harmonisch", keys: "minor" },
  { id: "moll_melodisch", label: "Moll melodisch", scale: "moll_melodisch", keys: "minor" },
  { id: "dreiklang_dur", label: "Dreiklang Dur", chord: "dur", keys: "major" },
  { id: "dreiklang_moll", label: "Dreiklang Moll", chord: "moll", keys: "minor" },
  { id: "dom7", label: "Dominantsept", chord: "dom7", keys: "major" },
  { id: "chromatisch", label: "Chromatisch", scale: "chromatisch", keys: "major" },
  { id: "ganzton", label: "Ganzton", scale: "ganzton", keys: "major" },
  { id: "blues", label: "Blues", scale: "blues", keys: "major" },
  { id: "dorisch", label: "Dorisch", scale: "dorisch", keys: "major" },
  { id: "mixolydisch", label: "Mixolydisch", scale: "mixolydisch", keys: "major" },
];

let sel = { type: "dur", keyIndex: 0, octaves: 2, richtung: "auf-ab" };
let pruefung = null;   // { rest: [...], aktuell }

const typeOf = id => TYPES.find(t => t.id === id) || TYPES[0];
const keysFor = type => type.keys === "minor" ? MINOR_KEYS : MAJOR_KEYS;
const drillId = (typeId, keyName) => `skala:${typeId}:${keyName}`;

/* --- Töne bauen ------------------------------------------------------------ */

/**
 * Sucht die Oktave, in der die Leiter ganz in den Umfang passt. Ohne das
 * landet Fis-Dur über zwei Oktaven im Altissimo und ist nicht spielbar.
 */
function fitOctave(tonic, halbtoene) {
  for (const oct of [4, 3, 5, 2]) {
    const t = { ...tonic, octave: oct };
    const low = toMidi(t);
    if (low >= RANGE.writtenLow && low + halbtoene <= RANGE.writtenHigh) return t;
  }
  // Passt nirgends ganz: die tiefste Lage nehmen, die noch beginnt.
  for (const oct of [4, 3, 5]) {
    const t = { ...tonic, octave: oct };
    if (toMidi(t) >= RANGE.writtenLow) return t;
  }
  return { ...tonic, octave: 4 };
}

/** Gibt die geschriebenen Tonhöhen der aktuellen Auswahl. */
function pitchesFor(type, key, octaves, richtung) {
  let auf;
  if (type.chord) {
    const tonic = fitOctave(key.tonic, 12 * octaves);
    auf = [];
    for (let o = 0; o < octaves; o++) {
      const base = { ...tonic, octave: tonic.octave + o };
      auf.push(...buildChord(base, type.chord));
    }
    auf.push({ ...tonic, octave: tonic.octave + octaves });
  } else {
    const spannweite = 12 * octaves;
    const tonic = fitOctave(key.tonic, spannweite);
    auf = buildScale(tonic, type.scale, octaves);
  }
  if (richtung === "auf") return auf;
  if (richtung === "ab") return [...auf].reverse();
  // Auf und ab, ohne den Gipfelton zweimal.
  return [...auf, ...auf.slice(0, -1).reverse()];
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const type = typeOf(sel.type);
  const keys = keysFor(type);
  sel.keyIndex = clamp(sel.keyIndex, 0, keys.length - 1);

  root.innerHTML = `
    <div class="chips scroll" id="type-chips" role="group" aria-label="Art"></div>
    <div class="chips scroll" id="key-chips" role="group" aria-label="Tonart"></div>

    <div id="scale-head"></div>
    <div class="staff-wrap" id="scale-staff"></div>

    <div class="row2">
      <button id="sc-play">Vorspielen</button>
      <button id="sc-metro">Mit Metronom</button>
    </div>

    <div class="grid3">
      <label>Oktaven
        <select id="sc-oct">
          <option value="1">1</option><option value="2">2</option><option value="3">3</option>
        </select>
      </label>
      <label>Richtung
        <select id="sc-dir">
          <option value="auf-ab">auf und ab</option>
          <option value="auf">nur auf</option>
          <option value="ab">nur ab</option>
        </select>
      </label>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Geschafft?</h3>
      <p class="hint">
        Erst abhaken, wenn sie zweimal hintereinander sauber und gleichmäßig
        kam. Das Tempo wird mitgeschrieben — nächstes Mal weißt du, wo du
        warst.
      </p>
      <div class="row2">
        <button id="sc-done">Bei ${state().settings.bpm} bpm geschafft</button>
        <button id="sc-random">Zufällige Tonart</button>
      </div>
      <p class="hint" id="sc-status" style="margin:12px 0 0"></p>
    </div>

    <h2>Übersicht</h2>
    <p class="hint">
      Bestes Tempo je Tonart. Was blass ist, hast du noch nie abgehakt —
      und das sind die, die in der Prüfung kommen.
    </p>
    <div class="keygrid" id="sc-grid"></div>`;

  renderTypeChips(root);
  renderKeyChips(root);
  $("#sc-oct", root).value = String(sel.octaves);
  $("#sc-dir", root).value = sel.richtung;
  renderScale(root);
  renderGrid(root);

  $("#sc-oct", root).addEventListener("change", e => {
    sel.octaves = Number(e.target.value); renderScale(root);
  });
  $("#sc-dir", root).addEventListener("change", e => {
    sel.richtung = e.target.value; renderScale(root);
  });
  $("#sc-play", root).addEventListener("click", () => spiele(root));
  $("#sc-metro", root).addEventListener("click", () => metro.toggle());
  $("#sc-done", root).addEventListener("click", () => abhaken(root));
  $("#sc-random", root).addEventListener("click", () => zufall(root));
}

function renderTypeChips(root) {
  const host = $("#type-chips", root);
  host.innerHTML = "";
  for (const t of TYPES) {
    host.append(el("button", {
      class: "chip" + (t.id === sel.type ? " on" : ""),
      text: t.label,
      on: { click: () => {
        const alteKeys = keysFor(typeOf(sel.type));
        const alterName = alteKeys[sel.keyIndex]?.name;
        sel.type = t.id;
        // Beim Wechsel zwischen Dur und Moll auf der gleichen Vorzeichnung
        // bleiben, nicht auf dem gleichen Index.
        const neu = keysFor(t);
        const sig = alteKeys[sel.keyIndex]?.sig;
        const i = neu.findIndex(k => k.sig === sig);
        sel.keyIndex = i >= 0 ? i : 0;
        render(root);
      } },
    }));
  }
}

function renderKeyChips(root) {
  const host = $("#key-chips", root);
  const keys = keysFor(typeOf(sel.type));
  host.innerHTML = "";
  keys.forEach((k, i) => {
    const b = el("button", {
      class: "chip" + (i === sel.keyIndex ? " on" : ""),
      text: k.name.replace("-Dur", "").replace("-Moll", ""),
      title: k.name,
      on: { click: () => { sel.keyIndex = i; renderScale(root); renderKeyChips(root); } },
    });
    host.append(b);
    // Nach einem Sprung per Zufall muss die neue Tonart im Bild sein.
    if (i === sel.keyIndex) requestAnimationFrame(() =>
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }));
  });
}

function renderScale(root) {
  const type = typeOf(sel.type);
  const key = keysFor(type)[sel.keyIndex];
  const pitches = pitchesFor(type, key, sel.octaves, sel.richtung);

  // Klingende Tonart: neun Halbtöne tiefer als der Griff.
  const klingendMidi = toSounding(toMidi(key.tonic));
  const klingendSig = keySignature(klingendMidi % 12, type.keys === "minor" ? "minor" : "major");
  const klingendName = spell(fromMidi(klingendMidi, klingendSig < 0 ? "flat" : "sharp")) +
    (type.keys === "minor" ? "-Moll" : "-Dur");

  const d = drill(drillId(type.id, key.name), {});
  const tief = Math.min(...pitches.map(toMidi));
  const hoch = Math.max(...pitches.map(toMidi));
  const passt = tief >= RANGE.writtenLow && hoch <= RANGE.writtenHigh;

  $("#scale-head", root).innerHTML = `
    <h2 style="margin-bottom:0">${key.name}</h2>
    <p class="hint" style="margin-top:2px">
      Griff · klingt als ${klingendName} · ${
        key.sig === 0 ? "ohne Vorzeichen"
        : Math.abs(key.sig) + (key.sig > 0 ? " Kreuz" : " Be") + (Math.abs(key.sig) > 1 ? (key.sig > 0 ? "e" : "n") : "")}
      ${d.bestBpm ? ` · dein bestes Tempo ${d.bestBpm} bpm` : ""}
      ${!passt ? ` · <strong>geht über den Umfang hinaus</strong>` : ""}
    </p>`;

  $("#scale-staff", root).innerHTML = renderStaff({
    keySig: key.sig,
    notes: pitchesToNotes(pitches, DUR.viertel, { accidentalsFor: key.sig }),
    ariaLabel: `${key.name}, ${sel.octaves} ${sel.octaves === 1 ? "Oktave" : "Oktaven"}`,
    extraClass: "compact",
  });

  const st = $("#sc-status", root);
  if (st) {
    st.textContent = d.bestBpm
      ? `Zuletzt am ${d.last}, bestes Tempo ${d.bestBpm} bpm, ${d.count || 0}× abgehakt.`
      : "Noch nie abgehakt.";
  }
  const btn = $("#sc-done", root);
  if (btn) btn.textContent = `Bei ${state().settings.bpm} bpm geschafft`;
}

function spiele(root) {
  const type = typeOf(sel.type);
  const key = keysFor(type)[sel.keyIndex];
  const pitches = pitchesFor(type, key, sel.octaves, sel.richtung);
  // Vorgespielt wird klingend — sonst hörst du eine andere Tonart, als du
  // liest, und das verwirrt beim Mitspielen.
  const midis = pitches.map(p => toSounding(toMidi(p)));
  const bpm = state().settings.bpm;
  playMelody(midis, { noteDur: Math.min(0.5, 60 / bpm * 0.9), gap: 0.02, a4: state().settings.a4 });
}

function abhaken(root) {
  const type = typeOf(sel.type);
  const key = keysFor(type)[sel.keyIndex];
  const id = drillId(type.id, key.name);
  const d = drill(id, { count: 0, bestBpm: 0 });
  const bpm = state().settings.bpm;
  recordDrill(id, {
    count: (d.count || 0) + 1,
    bestBpm: Math.max(d.bestBpm || 0, bpm),
  });
  toast(`${key.name} abgehakt bei ${bpm} bpm`);
  renderScale(root);
  renderGrid(root);
  if (pruefung) naechstePruefung(root);
}

/** Wählt eine Tonart, die lange nicht dran war — nicht rein zufällig. */
function zufall(root) {
  const type = typeOf(sel.type);
  const keys = keysFor(type);
  const heute = todayISO();
  const gewichtet = keys.map((k, i) => {
    const d = drill(drillId(type.id, k.name), {});
    // Nie geübt wiegt am schwersten, danach zählt, wie lange es her ist.
    const alter = d.last ? Math.min(60, daysBetween(d.last, heute)) : 60;
    return { i, gewicht: 1 + alter * 2 };
  });
  const summe = gewichtet.reduce((a, g) => a + g.gewicht, 0);
  let w = Math.random() * summe;
  for (const g of gewichtet) {
    w -= g.gewicht;
    if (w <= 0) { sel.keyIndex = g.i; break; }
  }
  renderScale(root);
  renderKeyChips(root);
}

function naechstePruefung(root) {
  if (!pruefung?.rest.length) { pruefung = null; return; }
  sel.keyIndex = pruefung.rest.shift();
  renderScale(root);
  renderKeyChips(root);
}

function renderGrid(root) {
  const host = $("#sc-grid", root);
  if (!host) return;
  const type = typeOf(sel.type);
  const keys = keysFor(type);
  const heute = todayISO();

  host.innerHTML = keys.map((k, i) => {
    const d = drill(drillId(type.id, k.name), {});
    const tage = d.last ? daysBetween(d.last, heute) : null;
    // Frisch geübt ist voll da, lange her verblasst — das ist die
    // Vergessenskurve als Bild.
    const frische = tage === null ? 0 : Math.max(0.25, 1 - tage / 21);
    return `<button class="keycell${d.bestBpm ? "" : " leer"}" data-i="${i}"
              style="--frische:${frische.toFixed(2)}" title="${k.name}">
      <b>${k.name.replace("-Dur", "").replace("-Moll", "")}</b>
      <span>${d.bestBpm ? d.bestBpm : "–"}</span>
    </button>`;
  }).join("");

  $$(".keycell", host).forEach(b => b.addEventListener("click", () => {
    sel.keyIndex = Number(b.dataset.i);
    renderScale(root);
    renderKeyChips(root);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

export default {
  id: "tonleitern",
  label: "Tonleitern",
  mount(root) { render(root); },
  unmount() { pruefung = null; },
};
