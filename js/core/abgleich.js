/* ==========================================================================
   Zwei Geräte, ein Übestand

   Geübt wird am iPad am Notenständer mit dem echten Saxophon und am iPhone
   mit dem Travel Sax. Jedes Gerät hat seinen eigenen Speicher; ohne
   Abgleich weiß das iPad nichts von den Tonarten, die am iPhone gefunden
   wurden, und das Können-Profil meldet dort „nie geübt“, was längst
   sitzt. Einlesen ersetzt alles — das löscht, was auf dem anderen Gerät
   dazukam. Deshalb Zusammenführen.

   Die wichtigste Eigenschaft: **zweimal zusammenführen ergibt dasselbe wie
   einmal.** Man schickt die Datei hin und her, vom iPhone ans iPad und
   zurück, und nichts darf sich dabei verdoppeln. Daraus folgen die Regeln:

   - Listen werden vereinigt. Einträge mit `id` gelten als derselbe Eintrag
     und werden ineinander geführt, alle anderen als gleich, wenn sie
     gleich aussehen.
   - Zahlen: die größere. Zähler wie richtig und falsch werden damit nicht
     addiert — addieren wäre beim zweiten Abgleich doppelt gezählt. Der
     Zähler ist danach eher zu klein als zu groß; das ist die ehrlichere
     Richtung.
   - Datumsangaben: das spätere. Ja schlägt nein: was auf einem Gerät
     abgehakt ist, bleibt abgehakt.
   - Anderer Text: der dieses Geräts.
   - Einstellungen, Übe-Kontext und der heutige Tag bleiben die dieses
     Geräts. Der Bluetooth-Verzug des iPhones hat auf dem iPad nichts zu
     suchen, und der Kontext ist, was man an diesem Gerät gerade tut.

   Kein DOM.
   ========================================================================== */

"use strict";

/** Was nur für dieses Gerät gilt und beim Einlesen nie überschrieben wird. */
export const GERAET_EINSTELLUNGEN = ["ausgabeVerzug"];

const NUR_HIER = new Set(["settings", "kontext", "day", "week", "v"]);
const DATUM = /^\d{4}-\d{2}-\d{2}/;

const istObjekt = x => x !== null && typeof x === "object" && !Array.isArray(x);
const schluessel = x => JSON.stringify(x);

/** Führt zwei beliebige Werte nach den Regeln oben zusammen. `a` ist hier. */
export function fuehreWert(a, b) {
  if (a === undefined) return kopie(b);
  if (b === undefined) return kopie(a);
  if (Array.isArray(a) && Array.isArray(b)) return fuehreListe(a, b);
  if (istObjekt(a) && istObjekt(b)) return fuehreObjekt(a, b);
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return a || b;
  if (typeof a === "string" && typeof b === "string" && DATUM.test(a) && DATUM.test(b)) return a >= b ? a : b;
  if (a === null) return kopie(b);
  return kopie(a);
}

function fuehreObjekt(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = fuehreWert(a[k], b[k]);
  return out;
}

function fuehreListe(a, b) {
  const out = a.map(kopie);
  const mitId = new Map();
  const gesehen = new Set();
  out.forEach((x, i) => {
    if (istObjekt(x) && x.id != null) mitId.set(x.id, i);
    else gesehen.add(schluessel(x));
  });
  for (const x of b) {
    if (istObjekt(x) && x.id != null) {
      if (mitId.has(x.id)) {
        const i = mitId.get(x.id);
        out[i] = fuehreWert(out[i], x);
      } else {
        mitId.set(x.id, out.length);
        out.push(kopie(x));
      }
      continue;
    }
    const k = schluessel(x);
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    out.push(kopie(x));
  }
  return out;
}

const kopie = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));

/**
 * Führt den Zustand eines anderen Geräts in den hiesigen. Gibt einen neuen
 * Zustand und eine kurze Bilanz zurück; beides ändert `hier` nicht.
 */
export function fuehreZusammen(hier, dort) {
  if (!istObjekt(dort)) throw new Error("Kein Übestand");
  const neu = kopie(hier);
  for (const k of Object.keys(dort)) {
    if (NUR_HIER.has(k)) continue;
    neu[k] = fuehreWert(hier[k], dort[k]);
  }
  // Das Protokoll liest sich chronologisch; die Vereinigung hängt die
  // Einträge des anderen Geräts nur hinten an.
  if (Array.isArray(neu.log)) {
    neu.log = neu.log
      .map((e, i) => ({ e, i }))
      .sort((x, y) => String(x.e?.date ?? "").localeCompare(String(y.e?.date ?? "")) || x.i - y.i)
      .map(x => x.e);
  }
  const zahl = (s, k) => Array.isArray(s?.[k]) ? s[k].length : 0;
  const bilanz = {
    sessions: zahl(neu, "log") - zahl(hier, "log"),
    uebungen: Object.keys(neu.drills || {}).length - Object.keys(hier.drills || {}).length,
    stuecke: zahl(neu, "repertoire") - zahl(hier, "repertoire"),
  };
  return { zustand: neu, bilanz };
}

/**
 * Beim Ersetzen (Einlesen) bleiben die Geräte-Einstellungen von hier.
 */
export function behalteGeraet(hier, dort) {
  const neu = kopie(dort);
  neu.settings = { ...(neu.settings || {}) };
  for (const k of GERAET_EINSTELLUNGEN) {
    if (hier?.settings && k in hier.settings) neu.settings[k] = hier.settings[k];
    else delete neu.settings[k];
  }
  return neu;
}
