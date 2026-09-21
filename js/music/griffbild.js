/* ==========================================================================
   Griffbilder für das Altsaxophon

   Die Klappenanordnung ist mechanisch und überall gleich — die ist hier
   fest verdrahtet. **Welche** Klappen für einen Ton gedrückt werden, ist es
   nicht: im Altissimo unterscheidet sich das von Instrument zu Instrument,
   von Mundstück zu Mundstück und von Spieler zu Spieler. Deshalb enthält
   diese Datei keine einzige Griffangabe, sondern nur das Bild.

   Die Griffe selbst stehen in den Daten des Nutzers und werden in der App
   eingetragen. Das ist keine Bequemlichkeit, sondern der einzige ehrliche
   Weg: eine abgeschriebene Tabelle wäre für genau dieses Instrument
   vermutlich falsch, und man würde monatelang gegen sie üben.

   Kein DOM: die Funktion gibt SVG-Text zurück.
   ========================================================================== */

"use strict";

/* Die Klappen, von oben nach unten. `x`,`y` sind Mittelpunkte im
   Zeichenraum 0..120 breit und 0..330 hoch. */
export const KLAPPEN = [
  // Linker Daumen
  { id: "okt", name: "Oktavklappe", kurz: "8", form: "rund", x: 16, y: 40, r: 9 },

  // Handflächenklappen links
  { id: "palmF",  name: "Palm F",  kurz: "F",  form: "balken", x: 97, y: 32, w: 24, h: 12 },
  { id: "palmEs", name: "Palm Es", kurz: "E♭", form: "balken", x: 97, y: 48, w: 24, h: 12 },
  { id: "palmD",  name: "Palm D",  kurz: "D",  form: "balken", x: 97, y: 64, w: 24, h: 12 },

  // Vordere F-Klappe
  { id: "frontF", name: "Vorderes F", kurz: "vF", form: "rund", x: 56, y: 60, r: 7 },

  // Linke Hand
  { id: "l1", name: "Linker Zeigefinger", kurz: "1", form: "rund", x: 56, y: 86, r: 13 },
  { id: "bis", name: "Bis-Klappe",        kurz: "B", form: "oval", x: 56, y: 108, w: 16, h: 8 },
  { id: "l2", name: "Linker Mittelfinger", kurz: "2", form: "rund", x: 56, y: 130, r: 13 },
  { id: "l3", name: "Linker Ringfinger",   kurz: "3", form: "rund", x: 56, y: 162, r: 13 },

  // Kleiner Finger links
  { id: "gis", name: "Gis",  kurz: "G♯", form: "balken", x: 24, y: 178, w: 26, h: 11 },
  { id: "cis", name: "Cis",  kurz: "C♯", form: "balken", x: 24, y: 192, w: 26, h: 11 },
  { id: "h",   name: "Tief H", kurz: "H", form: "balken", x: 24, y: 206, w: 26, h: 11 },
  { id: "b",   name: "Tief B", kurz: "B", form: "balken", x: 24, y: 220, w: 26, h: 11 },

  // Seitenklappen rechts
  { id: "seiteE",  name: "Seiten-E",   kurz: "E",  form: "balken", x: 96, y: 174, w: 22, h: 11 },
  { id: "seiteC",  name: "Seiten-C",   kurz: "C",  form: "balken", x: 96, y: 188, w: 22, h: 11 },
  { id: "seiteB",  name: "Seiten-B",   kurz: "B",  form: "balken", x: 96, y: 202, w: 22, h: 11 },

  // Rechte Hand
  { id: "r1", name: "Rechter Zeigefinger", kurz: "1", form: "rund", x: 56, y: 202, r: 13 },
  { id: "r2", name: "Rechter Mittelfinger", kurz: "2", form: "rund", x: 56, y: 234, r: 13 },
  { id: "r3", name: "Rechter Ringfinger",   kurz: "3", form: "rund", x: 56, y: 266, r: 13 },

  { id: "seiteFis", name: "Seiten-Fis", kurz: "F♯", form: "balken", x: 96, y: 246, w: 22, h: 11 },

  // Kleiner Finger rechts
  { id: "es", name: "Tief Es", kurz: "E♭", form: "balken", x: 28, y: 290, w: 26, h: 11 },
  { id: "c",  name: "Tief C",  kurz: "C",  form: "balken", x: 28, y: 304, w: 26, h: 11 },
];

export const KLAPPEN_IDS = KLAPPEN.map(k => k.id);
const byId = Object.fromEntries(KLAPPEN.map(k => [k.id, k]));
export const klappe = id => byId[id];

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Zeichnet ein Griffbild.
 *
 * gedrueckt   Array oder Set der gedrückten Klappen-Ids
 * opts.editier  true macht jede Klappe antippbar (data-klappe)
 * opts.namen    true schreibt die Kurzbezeichnungen daneben
 */
export function renderGriff(gedrueckt = [], opts = {}) {
  const { editier = false, namen = false, titel = "" } = opts;
  const an = new Set(gedrueckt);

  const teile = KLAPPEN.map(k => {
    const gedrueckt_ = an.has(k.id);
    const cls = "klp" + (gedrueckt_ ? " an" : "") + (editier ? " tipp" : "");
    const attr = editier ? ` data-klappe="${k.id}" tabindex="0" role="button"` +
      ` aria-pressed="${gedrueckt_}" aria-label="${esc(k.name)}"` : "";

    let form;
    if (k.form === "rund") {
      form = `<circle cx="${k.x}" cy="${k.y}" r="${k.r}"/>`;
    } else if (k.form === "oval") {
      form = `<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" rx="${k.h / 2}"/>`;
    } else {
      form = `<rect x="${k.x - k.w / 2}" y="${k.y - k.h / 2}" width="${k.w}" height="${k.h}" rx="3"/>`;
    }

    const beschriftung = namen
      ? `<text class="klp-txt" x="${k.x}" y="${k.y + 3.5}" text-anchor="middle">${esc(k.kurz)}</text>`
      : "";

    return `<g class="${cls}"${attr}>${form}${beschriftung}</g>`;
  }).join("");

  // Die senkrechte Linie ist der Korpus — sie macht aus lauter Kreisen ein
  // Instrument und hilft, oben und unten auseinanderzuhalten.
  const korpus = `<line class="korpus" x1="56" y1="70" x2="56" y2="282"/>`;
  const trenner = `<line class="trenner" x1="34" y1="182" x2="78" y2="182"/>`;

  return `<svg class="griffbild" viewBox="0 0 120 330"
      role="img" aria-label="${esc(titel || "Griffbild")}">
    ${korpus}${trenner}${teile}
  </svg>`;
}

/** Kurzschreibweise für den Export und zum Vergleichen, etwa „okt l1 l2 r1“. */
export const alsText = gedrueckt =>
  KLAPPEN_IDS.filter(id => new Set(gedrueckt).has(id)).join(" ");

/** Nur bekannte Klappen durchlassen — schützt vor kaputten Importdaten. */
export const bereinige = gedrueckt =>
  [...new Set(gedrueckt)].filter(id => byId[id]);
