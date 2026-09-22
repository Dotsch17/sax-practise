/* ==========================================================================
   Zustand und Speicherung

   Ein einziges Objekt in localStorage. Bewusst eines, damit Export und
   Import trivial bleiben — und das sind sie nicht aus Bequemlichkeit,
   sondern weil Safari script-schreibbaren Speicher nach etwa sieben Tagen
   ohne Nutzung löscht. localStorage ist hier nie die einzige Kopie.

   Bei jeder Schemaänderung: Schlüssel hochzählen und eine Migration von der
   Vorversion schreiben. Der Nutzer hat echte Übungsdaten drin.
   ========================================================================== */

"use strict";

import { todayISO, emit } from "./dom.js";

const KEY_V1 = "sax.uebeplan.v1";
const KEY    = "sax.uebeplan.v2";

export const defaultState = () => ({
  v: 2,
  week: 1,
  // Wo und womit gerade geübt wird. Bestimmt, welche Bloecke ueberhaupt
  // sinnvoll sind — siehe KONTEXTE in js/data/plan.js.
  kontext: "probelokal",
  // schwerpunkt wird einmal am Tag aus der Auswertung gesetzt und mit dem
  // Tag wieder verworfen — deshalb steht er hier und nicht in settings.
  day: { date: todayISO(), done: [], spent: {}, schwerpunkt: undefined },
  log: [],
  settings: {
    droneVol: 45,
    minuten: 0,           // 0 heißt: der volle Plan
    bpm: 60,
    beats: 4,
    a4: 440,              // Stimmton, manche Orchester spielen 442
    naming: "de",         // deutsche oder internationale Tonnamen
    pitchView: "written", // wird der Griff oder der klingende Ton angezeigt
    metroSound: "klick",
    countIn: true,
    skalaNoten: true,     // Tonleitern mit Noten oder auswendig
    kadenzVariante: 1,    // welche II–V–I-Variante vom Beiblatt geübt wird
    bandEinzaehlen: true, // eigene Stücke: ein Takt Hi-Hat vorweg
    lickBpm: 80,          // Tempo für den Lick der Woche
    bandSpuren: { bass: true, comp: true, becken: true },
  },
  // Fortschritt je Übungsart. Bewusst flach und nach Übung getrennt,
  // damit eine neue Übung keine Migration braucht.
  drills: {},
  // Aufnahmen: hier stehen nur die Messwerte. Das Audio selbst liegt in
  // IndexedDB, weil es für localStorage um Größenordnungen zu groß ist.
  recordings: [],
  repertoire: [],
  // Eigene Griffe je notierter MIDI-Zahl. Bewusst in den Nutzerdaten und
  // nicht im Code: Altissimo-Griffe sind am Instrument verschieden.
  griffe: {},
  read: [],               // gelesene Wissensartikel
});

let S = load();

export const state = () => S;

function migrate(raw, fromKey) {
  const s = { ...defaultState(), ...raw };
  if (fromKey === KEY_V1) {
    // v1 kannte weder drills noch Repertoire; Woche, Tag, Protokoll und die
    // drei Einstellungen wandern unverändert herüber.
    s.v = 2;
    s.settings = { ...defaultState().settings, ...(raw.settings || {}) };
  }
  s.settings = { ...defaultState().settings, ...(s.settings || {}) };
  if (!s.day || s.day.date !== todayISO()) s.day = { date: todayISO(), done: [], spent: {} };
  if (!Array.isArray(s.log)) s.log = [];
  if (!s.drills || typeof s.drills !== "object") s.drills = {};
  if (!s.griffe || typeof s.griffe !== "object") s.griffe = {};
  if (typeof s.kontext !== "string") s.kontext = "probelokal";
  return s;
}

function load() {
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) return migrate(JSON.parse(cur), KEY);
    const old = localStorage.getItem(KEY_V1);
    if (old) {
      const s = migrate(JSON.parse(old), KEY_V1);
      localStorage.setItem(KEY, JSON.stringify(s));   // v1 bleibt als Sicherung liegen
      return s;
    }
  } catch (e) {
    console.warn("Gespeicherter Zustand nicht lesbar, starte neu.", e);
  }
  return defaultState();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.warn("Speichern fehlgeschlagen.", e); }
  emit("state:saved", S);
}

/** Ersetzt den Zustand vollständig, etwa beim Import. */
export function replaceState(next) {
  S = migrate(next, KEY);
  save();
  emit("state:replaced", S);
  return S;
}

/** Bequemer Zugriff auf Einstellungen mit sofortigem Speichern. */
export function setSetting(key, value) {
  S.settings[key] = value;
  save();
  emit("settings:changed", { key, value });
}

/* --- Fortschritt je Übung ------------------------------------------------ */

/**
 * Holt den Fortschrittssatz einer Übung. `id` ist frei wählbar, etwa
 * "scales:C-Dur" oder "ear:intervalle". Fehlt er, kommt der Startwert.
 */
export function drill(id, init = {}) {
  if (!S.drills[id]) S.drills[id] = { ...init };
  else for (const [k, v] of Object.entries(init)) if (!(k in S.drills[id])) S.drills[id][k] = v;
  return S.drills[id];
}

/** Schreibt einen Übungsdurchgang fort und speichert. */
export function recordDrill(id, patch) {
  const d = drill(id, {});
  Object.assign(d, patch);
  d.last = todayISO();
  save();
  emit("drill:changed", { id, drill: d });
  return d;
}

/**
 * Zählt richtig und falsch mit und führt eine Serie. Das ist das Muster,
 * das Gehör-, Rhythmus- und Theorieübungen teilen.
 */
export function scoreDrill(id, correct) {
  const d = drill(id, { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
  if (correct) {
    d.right++; d.streak++;
    if (d.streak > d.bestStreak) d.bestStreak = d.streak;
  } else {
    d.wrong++; d.streak = 0;
  }
  d.last = todayISO();
  save();
  emit("drill:changed", { id, drill: d });
  return d;
}

/* --- Tagesfortschritt ----------------------------------------------------- */

export function markBlockDone(blockId) {
  if (!S.day.done.includes(blockId)) S.day.done.push(blockId);
  save();
}

export function addSpent(blockId, seconds) {
  if (!(seconds > 0) || seconds >= 3600) return;
  S.day.spent[blockId] = (S.day.spent[blockId] || 0) + seconds;
  save();
}

export function resetDay() {
  S.day = { date: todayISO(), done: [], spent: {} };
  save();
}

/* --- Export und Import ---------------------------------------------------- */

export function exportBlob() {
  return new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
}

export async function importFile(file) {
  const data = JSON.parse(await file.text());
  if (typeof data !== "object" || data === null) throw new Error("Kein Objekt");
  return replaceState(data);
}
