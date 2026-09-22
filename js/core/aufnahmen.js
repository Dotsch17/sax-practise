/* ==========================================================================
   Aufnahmen speichern

   Audio gehört in IndexedDB, nicht in localStorage: eine Minute AAC sind
   rund ein Megabyte, localStorage fasst insgesamt etwa fünf. Deshalb liegen
   die Aufnahmen hier getrennt vom übrigen Zustand — und deshalb sind sie
   auch nicht im JSON-Export. Wer eine Aufnahme behalten will, sichert sie
   einzeln als Datei.

   Jeder Eintrag trägt den Titel, unter dem er geübt wurde. Das ist der
   Schlüssel für den Vergleich: dasselbe Stück heute gegen vor vier Wochen.
   ========================================================================== */

"use strict";

const DB = "sax-aufnahmen";
const STORE = "aufnahmen";
let dbPromise = null;

function oeffne() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Kein IndexedDB")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function tx(modus, fn) {
  return oeffne().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modus);
    const store = t.objectStore(STORE);
    let ergebnis;
    const req = fn(store);
    if (req) req.onsuccess = () => { ergebnis = req.result; };
    t.oncomplete = () => resolve(ergebnis);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

/* Safari löscht Webspeicher nach längerer Nichtbenutzung. Die Bitte um
   dauerhaften Speicher wird nicht immer erfüllt, kostet aber nichts. */
let persistGefragt = false;
function bitteUmDauer() {
  if (persistGefragt) return;
  persistGefragt = true;
  try { navigator.storage?.persist?.(); } catch (e) {}
}

/** Speichert eine Aufnahme. `eintrag` ohne id bekommt eine. */
export async function speichere(eintrag) {
  bitteUmDauer();
  const e = {
    id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    erstellt: Date.now(),
    notiz: "",
    ...eintrag,
  };
  await tx("readwrite", s => s.put(e));
  return e;
}

/** Alle Aufnahmen, neueste zuerst. */
export async function alle() {
  const liste = (await tx("readonly", s => s.getAll())) || [];
  return liste.sort((a, b) => b.erstellt - a.erstellt);
}

export async function aendere(id, patch) {
  const liste = await alle();
  const e = liste.find(x => x.id === id);
  if (!e) return null;
  const neu = { ...e, ...patch };
  await tx("readwrite", s => s.put(neu));
  return neu;
}

export const loesche = id => tx("readwrite", s => s.delete(id));

/** Nach Titel gruppiert, jede Gruppe neueste zuerst. */
export function nachTitel(liste) {
  const g = new Map();
  for (const a of liste) {
    const t = a.titel || "Ohne Titel";
    if (!g.has(t)) g.set(t, []);
    g.get(t).push(a);
  }
  return [...g.entries()].map(([titel, eintraege]) => ({ titel, eintraege }));
}

/** Wann ein Titel zuletzt aufgenommen wurde, als ISO-Datum. */
export async function letzteJeTitel() {
  const m = new Map();
  for (const a of await alle()) if (!m.has(a.titel)) m.set(a.titel, a.datum);
  return m;
}
