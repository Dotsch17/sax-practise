/* ==========================================================================
   Klaviatur als Bild

   Für jemanden, der am Klavier bei null anfängt, ist die Tastatur das
   bessere Bild als das Notensystem: welche Tasten, mit welcher Hand, und
   welche bleiben liegen. Das Notenbild kommt mit der Zeit dazu; die
   Kadenz muss zuerst in der Hand sitzen.

   Gibt einen SVG-String zurück, wie der Notensatz. Farben kommen aus dem
   CSS über Klassen — Messing für die rechte Hand, gedämpft für den Bass,
   ein Punkt für Töne, die liegen bleiben.

   Kein DOM.
   ========================================================================== */

"use strict";

const WEISS = new Set([0, 2, 4, 5, 7, 9, 11]);
const pc = m => ((m % 12) + 12) % 12;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Weiße Taste unter oder gleich m. */
const weissAb = m => { while (!WEISS.has(pc(m))) m--; return m; };
const weissAuf = m => { while (!WEISS.has(pc(m))) m++; return m; };

/**
 * `tief` und `hoch` sind MIDI-Grenzen; gezeichnet wird bis zur nächsten
 * weißen Taste darüber und darunter. `tasten` ist eine Map von MIDI auf
 * { hand: "rechts" | "links", bleibt: bool, name: string }.
 */
export function renderKlaviatur({ tief, hoch, tasten = new Map(), ariaLabel = "Klaviatur" } = {}) {
  const von = weissAb(tief), bis = weissAuf(hoch);
  const W = 22, H = 104, BW = 13, BH = 64;
  const weisse = [];
  for (let m = von; m <= bis; m++) if (WEISS.has(pc(m))) weisse.push(m);
  const x = new Map(weisse.map((m, i) => [m, i * W]));
  const breite = weisse.length * W;

  const klasse = (m, basis) => {
    const t = tasten.get(m);
    if (!t) return basis;
    return `${basis} ${t.hand === "links" ? "kl-links" : "kl-rechts"}${t.bleibt ? " kl-bleibt" : ""}`;
  };
  const beschriftung = (m, cx, y) => {
    const t = tasten.get(m);
    if (!t) return "";
    return `${t.bleibt ? `<circle class="kl-punkt" cx="${cx}" cy="${y - 16}" r="3"/>` : ""}` +
      `<text class="kl-name" x="${cx}" y="${y}" text-anchor="middle">${esc(t.name || "")}</text>`;
  };

  let out = "";
  for (const m of weisse) {
    out += `<rect class="${klasse(m, "kl-weiss")}" x="${x.get(m) + 0.5}" y="0.5" width="${W - 1}" height="${H - 1}" rx="3"/>`;
    out += beschriftung(m, x.get(m) + W / 2, H - 9);
  }
  for (let m = von; m <= bis; m++) {
    if (WEISS.has(pc(m))) continue;
    const links = x.get(m - 1);
    if (links === undefined) continue;
    const bx = links + W - BW / 2;
    out += `<rect class="${klasse(m, "kl-schwarz")}" x="${bx}" y="0" width="${BW}" height="${BH}" rx="2"/>`;
    out += beschriftung(m, bx + BW / 2, BH - 8);
  }
  // Das mittlere C markieren: die Orientierung, nach der am Klavier jeder
  // zuerst sucht.
  if (x.has(60)) out += `<text class="kl-c4" x="${x.get(60) + W / 2}" y="${H + 13}" text-anchor="middle">C4</text>`;

  return `<svg class="klaviatur" viewBox="0 0 ${breite} ${H + 16}" role="img" aria-label="${esc(ariaLabel)}"
    preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

export const weisseTasten = (tief, hoch) => {
  let n = 0;
  for (let m = weissAb(tief); m <= weissAuf(hoch); m++) if (WEISS.has(pc(m))) n++;
  return n;
};
