/* ==========================================================================
   Notensatz als SVG

   Die Zeichen kommen aus glyphs.js, also aus Bravura-Umrissen, die einmalig
   in Pfaddaten übersetzt wurden. Zur Laufzeit wird nichts nachgeladen.

   Koordinaten: ein Notenlinienabstand ist 10 Einheiten. Die oberste Linie
   liegt bei y=0, die unterste bei y=40. Eine diatonische Stufe sind 5
   Einheiten. Gerechnet wird in diatonischen Stufen, nicht in Halbtönen —
   sonst läge Fis auf einer anderen Höhe als F, und das wäre falsch.
   ========================================================================== */

"use strict";

import { GLYPH, ADVANCE } from "./glyphs.js";
import { keySignatureSteps } from "./theory.js";

export const SP = 10;            // Linienabstand
export const STAFF_H = 4 * SP;   // Höhe des Systems
const STEM_W = 1.2;
const STEM_LEN = 3.5 * SP;
const LINE_W = 1.2;

// Notenwerte in Vierteln
export const DUR = { ganze: 4, halbe: 2, viertel: 1, achtel: 0.5, sechzehntel: 0.25 };

/* --- Vertikale Lage ------------------------------------------------------ */

/** Diatonischer Index: zählt Stufen durch, C0 ist 0. */
export const diatonic = ({ step, octave }) => octave * 7 + step;

// Im Violinschlüssel liegt E4 auf der untersten Linie, im Bassschlüssel G2.
const BOTTOM = { g: diatonic({ step: 2, octave: 4 }), f: diatonic({ step: 4, octave: 2 }) };

/** y-Koordinate einer geschriebenen Tonhöhe. */
export function noteY(pitch, clef = "g") {
  return STAFF_H - (diatonic(pitch) - BOTTOM[clef]) * (SP / 2);
}

// Der Schlüssel sitzt mit seinem Ursprung auf der Linie, die er benennt.
const CLEF = { g: { glyph: "gClef", y: 3 * SP }, f: { glyph: "fClef", y: SP } };

// Lage der Vorzeichen in der Vorzeichnung, Violinschlüssel. Im
// Bassschlüssel stehen sie an derselben Stelle im System, also zwei
// Oktaven tiefer — nicht an derselben Tonhöhe, sonst schweben sie über
// dem System.
const SIG_OCT_SHARP = { 3: 5, 0: 5, 4: 5, 1: 5, 5: 4, 2: 5, 6: 4 };  // Fis Cis Gis Dis Ais Eis His
const SIG_OCT_FLAT  = { 6: 4, 2: 5, 5: 4, 1: 5, 4: 4, 0: 5, 3: 4 };  // B Es As Des Ges Ces Fes
const SIG_VERSATZ = { g: 0, f: -2 };

const ACC_GLYPH = { 2: "accDoubleSharp", 1: "accSharp", 0: "accNatural", [-1]: "accFlat", [-2]: "accDoubleFlat" };
const REST_GLYPH = { 4: "restWhole", 2: "restHalf", 1: "restQuarter", 0.5: "rest8th", 0.25: "rest16th" };
// Ganze und halbe Pause hängen an bzw. liegen auf einer bestimmten Linie.
const REST_Y = { 4: SP, 2: 2 * SP, 1: 2 * SP, 0.5: 2 * SP, 0.25: 2 * SP };
const HEAD_GLYPH = d => d >= DUR.ganze ? "noteheadWhole" : d >= DUR.halbe ? "noteheadHalf" : "noteheadBlack";

/* --- Bausteine ----------------------------------------------------------- */

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const glyph = (name, x, y) => GLYPH[name]
  ? `<path d="${GLYPH[name]}" transform="translate(${r(x)},${r(y)})"/>`
  : "";

const line = (x1, y1, x2, y2, w = LINE_W) =>
  `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke-width="${w}"/>`;

const rect = (x, y, w, h) =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"/>`;

const r = v => Math.round(v * 100) / 100;

function ledgerLines(x, y, headW) {
  let out = "";
  const w = headW * 0.7;
  for (let ly = -SP; ly >= y - 1; ly -= SP) out += line(x - w, ly, x + headW + w, ly, 1.4);
  for (let ly = STAFF_H + SP; ly <= y + 1; ly += SP) out += line(x - w, ly, x + headW + w, ly, 1.4);
  return out;
}

/** Wieviel Platz eine Note bekommt. Längere Werte bekommen mehr, aber nicht
    proportional — sonst wird eine ganze Note absurd breit. */
export function spacingFor(dur) {
  return 22 + 26 * Math.sqrt(Math.min(dur, 4));
}

/* --- Hauptfunktion -------------------------------------------------------- */

/**
 * Zeichnet ein System.
 *
 * notes: Folge aus
 *   { pitch, dur, dots, accidental, state, label, artic, dynamic, fermata, beam }
 *   { chord: [{ pitch, accidental, state }], dur }   -> Akkord, Töne übereinander
 *   { pitch, dur, kopf: true }   -> nur der Notenkopf, ohne Hals (Tonhöhen ohne Rhythmus)
 *   { dur }                      -> Pause
 *   { barline: true | "end" | "repeat" }
 *   { spacer: 20 }
 *
 * `accidental` true erzwingt ein Vorzeichen. pitchesToNotes() setzt es
 * automatisch nach Vorzeichnung.
 * `beam` ist eine Gruppennummer; gleiche Nummern werden zusammengebalkt.
 * `state` färbt den Kopf über die CSS-Klasse nt-<state>.
 */
export function renderStaff(opts = {}) {
  const {
    notes = [],
    keySig = 0,
    timeSig = null,
    clef = "g",
    width = null,
    noteSpacing = null,
    leftPad = 6,
    rightPad = 16,
    showClef = true,
    padTop = 40,
    padBottom = 40,
    ariaLabel = "Notenbeispiel",
    extraClass = "",
  } = opts;

  let x = leftPad;
  let marks = "";        // alles hinter den Noten
  let body = "";

  if (showClef) {
    const c = CLEF[clef];
    body += glyph(c.glyph, x, c.y);
    x += ADVANCE[c.glyph] + 7;
  }

  const sigSteps = keySignatureSteps(keySig);
  const sharp = keySig >= 0;
  for (const step of sigSteps) {
    const octave = (sharp ? SIG_OCT_SHARP : SIG_OCT_FLAT)[step] + SIG_VERSATZ[clef];
    body += glyph(sharp ? "accSharp" : "accFlat", x, noteY({ step, octave }, clef));
    x += (sharp ? 6.2 : 6.6);
  }
  if (sigSteps.length) x += 9;

  if (timeSig) {
    const digits = s => String(s).split("").map(d => "timeSig" + d);
    const wide = a => a.reduce((s, g) => s + ADVANCE[g], 0);
    const [num, den] = [digits(timeSig[0]), digits(timeSig[1])];
    const w = Math.max(wide(num), wide(den));
    let nx = x + (w - wide(num)) / 2, dx = x + (w - wide(den)) / 2;
    for (const g of num) { body += glyph(g, nx, SP); nx += ADVANCE[g]; }
    for (const g of den) { body += glyph(g, dx, 3 * SP); dx += ADVANCE[g]; }
    x += w + 12;
  }

  x += 8;   // Luft zwischen Vorspann und erster Note

  /* --- Platzierung ----------------------------------------------------- */
  const laid = [];
  for (const nt of notes) {
    if (nt.spacer) { x += nt.spacer; continue; }
    if (nt.barline) { laid.push({ x, barline: nt.barline }); x += 12; continue; }
    // Vor einem Vorzeichen muss Luft sein, sonst klebt es am Vorgänger.
    if (nt.chord) {
      const lage = akkordLage(nt.chord);
      x += lage.spalten * 8;
      laid.push({ x, nt, lage });
      x += (noteSpacing || spacingFor(nt.dur)) + (lage.versetzt ? 10 : 0);
      continue;
    }
    if (nt.accidental) x += 9;
    laid.push({ x, nt });
    x += noteSpacing || spacingFor(nt.dur);
  }

  const totalW = width || (x + rightPad);

  // Beschriftungen müssen unter die tiefste Note, sonst schneiden sie
  // Hilfslinien. Dasselbe gilt für die Dynamik.
  const tiefsterVon = L => L.nt?.chord ? Math.max(...L.nt.chord.map(c => noteY(c.pitch, clef)))
    : L.nt?.pitch ? noteY(L.nt.pitch, clef) : null;
  const hoechsterVon = L => L.nt?.chord ? Math.min(...L.nt.chord.map(c => noteY(c.pitch, clef)))
    : L.nt?.pitch ? noteY(L.nt.pitch, clef) : null;
  const lowest = laid.reduce((m, L) => tiefsterVon(L) != null ? Math.max(m, tiefsterVon(L)) : m, STAFF_H);
  const dynY = Math.max(lowest + 24, STAFF_H + 24);
  const labelY = dynY + (notes.some(n => n.dynamic) ? 20 : 0);

  let staff = "";
  for (let i = 0; i < 5; i++) staff += line(0, i * SP, totalW, i * SP);

  /* --- Halsrichtung je Balkengruppe ------------------------------------ */
  const groups = new Map();
  for (const L of laid) {
    if (!L.nt || !L.nt.pitch || L.nt.beam == null) continue;
    if (!groups.has(L.nt.beam)) groups.set(L.nt.beam, []);
    groups.get(L.nt.beam).push(L);
  }
  const groupUp = new Map();
  for (const [id, members] of groups) {
    const avg = members.reduce((s, m) => s + noteY(m.nt.pitch, clef), 0) / members.length;
    groupUp.set(id, avg > STAFF_H / 2);
  }

  /* --- Noten ------------------------------------------------------------ */
  for (const L of laid) {
    if (L.barline) {
      staff += L.barline === "end"
        ? rect(L.x, 0, 1.2, STAFF_H) + rect(L.x + 3.5, 0, 3.5, STAFF_H)
        : line(L.x, 0, L.x, STAFF_H, 1.4);
      continue;
    }
    const nt = L.nt;
    const cls = nt.state ? ` class="nt-${esc(nt.state)}"` : "";
    let g = "";

    if (nt.chord) {                                    // Akkord
      body += akkordSvg(L, clef);
      continue;
    }

    if (!nt.pitch) {                                   // Pause
      const name = REST_GLYPH[nt.dur] || "restQuarter";
      g += glyph(name, L.x, REST_Y[nt.dur] ?? 2 * SP);
      if (nt.dots) g += glyph("augmentationDot", L.x + ADVANCE[name] + 3, 2 * SP - 5);
      body += `<g${cls}>${g}</g>`;
      continue;
    }

    const y = noteY(nt.pitch, clef);
    const head = HEAD_GLYPH(nt.dur);
    const headW = ADVANCE[head];
    const up = nt.beam != null ? groupUp.get(nt.beam) : y > STAFF_H / 2;

    g += ledgerLines(L.x, y, headW);

    if (nt.accidental) {
      const a = ACC_GLYPH[nt.pitch.alter] ?? "accNatural";
      g += glyph(a, L.x - ADVANCE[a] - 3, y);
    }

    g += glyph(head, L.x, y);

    if (nt.dur < DUR.ganze && !nt.kopf) {
      const sx = up ? L.x + headW - STEM_W / 2 : L.x + STEM_W / 2;
      const sy = up ? y - STEM_LEN : y + STEM_LEN;
      g += line(sx, y, sx, sy, STEM_W);
      if (nt.dur <= DUR.achtel && nt.beam == null) {
        const f = (nt.dur <= DUR.sechzehntel ? "flag16th" : "flag8th") + (up ? "Up" : "Down");
        g += glyph(f, sx - (up ? STEM_W / 2 : -STEM_W / 2), sy);
      }
    }

    if (nt.dots) {
      // Der Punkt sitzt nie auf einer Linie, sondern im Zwischenraum darüber.
      const dy = (y % SP === 0) ? y - SP / 2 : y;
      for (let i = 0; i < nt.dots; i++) {
        g += glyph("augmentationDot", L.x + headW + 4 + i * 5, dy);
      }
    }

    if (nt.artic) {
      const below = up;                    // Artikulation gegenüber dem Hals
      const ay = below ? Math.max(y + 12, STAFF_H + 12) : Math.min(y - 12, -6);
      let ax = L.x + headW / 2;
      for (const a of [].concat(nt.artic)) {
        const name = ({ staccato: "staccato", tenuto: "tenuto", akzent: "accent", marcato: "marcato" })[a];
        if (!name) continue;
        const gl = name === "marcato" ? "marcatoAbove" : name + (below ? "Below" : "Above");
        g += glyph(gl, ax - ADVANCE[gl] / 2, ay);
      }
    }

    if (nt.fermata) g += glyph("fermataAbove", L.x + headW / 2 - ADVANCE.fermataAbove / 2, -12);

    if (nt.dynamic) {
      let dx = L.x;
      for (const ch of nt.dynamic) {
        const gl = { p: "dynP", m: "dynM", f: "dynF", r: "dynR", s: "dynS", z: "dynZ" }[ch];
        if (gl) { marks += glyph(gl, dx, dynY); dx += ADVANCE[gl]; }
      }
    }

    if (nt.label) {
      marks += `<text x="${r(L.x + headW / 2)}" y="${r(labelY)}"
                  text-anchor="middle" class="staff-label"
                  stroke="none">${esc(nt.label)}</text>`;
    }

    body += `<g${cls}>${g}</g>`;
  }

  /* --- Balken ------------------------------------------------------------ */
  let beams = "";
  for (const [id, members] of groups) {
    if (members.length < 2) continue;
    const up = groupUp.get(id);
    const ys = members.map(m => noteY(m.nt.pitch, clef));
    // Waagrechter Balken am äußersten Hals, damit kein Hals zu kurz wird.
    const by = up ? Math.min(...ys) - STEM_LEN : Math.max(...ys) + STEM_LEN;
    const xs = members.map(m => m.x + (up ? ADVANCE[HEAD_GLYPH(m.nt.dur)] - STEM_W / 2 : STEM_W / 2));

    // Hälse bis zum Balken verlängern
    members.forEach((m, i) => {
      beams += line(xs[i], noteY(m.nt.pitch, clef), xs[i], by, STEM_W);
    });
    const bw = 0.5 * SP;
    beams += rect(xs[0] - STEM_W / 2, up ? by : by - bw, xs[xs.length - 1] - xs[0] + STEM_W, bw);

    // Zweiter Balken für Sechzehntel
    const six = members.map(m => m.nt.dur <= DUR.sechzehntel);
    let i = 0;
    while (i < six.length) {
      if (!six[i]) { i++; continue; }
      let j = i;
      while (j + 1 < six.length && six[j + 1]) j++;
      const y2 = up ? by + bw + 2.5 : by - bw - 2.5 - bw;
      const x1 = xs[i] - STEM_W / 2;
      const x2 = j > i ? xs[j] + STEM_W / 2 : xs[i] + 7;
      beams += rect(x1, y2, x2 - x1, bw);
      i = j + 1;
    }
  }

  const highest = laid.reduce((m, L) => hoechsterVon(L) != null ? Math.min(m, hoechsterVon(L)) : m, 0);
  const top = Math.min(-padTop, highest - 26);
  const bottom = Math.max(STAFF_H + padBottom, labelY + 10);
  const vb = `0 ${r(top)} ${r(totalW)} ${r(bottom - top)}`;
  return `<svg class="staff ${extraClass}" viewBox="${vb}" role="img" aria-label="${esc(ariaLabel)}"
     preserveAspectRatio="xMinYMid meet" fill="currentColor" stroke="currentColor"
     >${staff}${beams}${body}${marks}</svg>`;
}

/* --- Akkorde ----------------------------------------------------------------
   Töne übereinander, wie gedruckt:
   - Liegen zwei Töne eine Sekunde auseinander, steht der obere rechts
     neben dem Hals (bei ganzen Noten: neben dem unteren), sonst
     überdecken sich die Köpfe.
   - Vorzeichen werden von oben nach unten gesetzt, jedes in die erste
     Spalte links, in der es keinem anderen näher als eine Sexte kommt.
     Das ist die übliche Stichregel; sie verhindert, dass sich die Zeichen
     überschneiden. */

function akkordLage(chord) {
  const toene = chord.map((c, i) => ({ ...c, i, d: diatonic(c.pitch) })).sort((a, b) => a.d - b.d);
  let vorher = null;
  for (const t of toene) {
    t.rechts = !!(vorher && t.d - vorher.d === 1 && !vorher.rechts);
    vorher = t;
  }
  const mitVz = [...toene].filter(t => t.accidental).sort((a, b) => b.d - a.d);
  const spalten = [];
  for (const t of mitVz) {
    let k = 0;
    while (spalten[k] && spalten[k].some(d => Math.abs(d - t.d) < 6)) k++;
    (spalten[k] ||= []).push(t.d);
    t.spalte = k;
  }
  return { toene, spalten: spalten.length, versetzt: toene.some(t => t.rechts) };
}

function akkordSvg(L, clef) {
  const { nt, lage } = L;
  const head = HEAD_GLYPH(nt.dur);
  const headW = ADVANCE[head];
  let out = "";
  const ys = lage.toene.map(t => noteY(t.pitch, clef));
  const oben = Math.min(...ys), unten = Math.max(...ys);
  const up = (oben + unten) / 2 > STAFF_H / 2;
  for (const t of lage.toene) {
    const y = noteY(t.pitch, clef);
    // Bei Hals nach unten steht der versetzte Kopf links; bei Hals nach
    // oben und bei ganzen Noten rechts.
    const dx = t.rechts ? (nt.dur < DUR.ganze && !up ? -headW + STEM_W : headW - STEM_W) : 0;
    let g = ledgerLines(L.x + dx, y, headW);
    if (t.accidental) {
      const a = ACC_GLYPH[t.pitch.alter] ?? "accNatural";
      g += glyph(a, L.x - ADVANCE[a] - 3 - t.spalte * 8, y);
    }
    g += glyph(head, L.x + dx, y);
    if (nt.dots) {
      const dy = (y % SP === 0) ? y - SP / 2 : y;
      g += glyph("augmentationDot", L.x + headW * (lage.versetzt ? 2 : 1) + 4, dy);
    }
    const cls = t.state ? ` class="nt-${esc(t.state)}"` : "";
    out += `<g${cls}>${g}</g>`;
  }
  if (nt.dur < DUR.ganze) {
    const sx = up ? L.x + headW - STEM_W / 2 : L.x + STEM_W / 2;
    const y1 = up ? unten : oben;
    const y2 = up ? oben - STEM_LEN : unten + STEM_LEN;
    out += line(sx, y1, sx, y2, STEM_W);
  }
  return out;
}

/* --- Hilfen --------------------------------------------------------------- */

/**
 * Setzt Vorzeichen so, wie sie gedruckt gehörten: nur wenn die Tonart sie
 * nicht schon trägt, und innerhalb eines Taktes nur beim ersten Mal.
 */
export function pitchesToNotes(pitches, dur = DUR.viertel, opts = {}) {
  const { labels = null, accidentalsFor = null, states = null } = opts;
  const shown = new Map();
  const sigSteps = accidentalsFor === null ? [] : keySignatureSteps(accidentalsFor);
  const sigAlter = accidentalsFor >= 0 ? 1 : -1;

  return pitches.map((p, i) => {
    let acc;
    if (accidentalsFor === null) {
      acc = p.alter !== 0;
    } else {
      const inSig = sigSteps.includes(p.step);
      const expected = inSig ? sigAlter : 0;
      const id = p.step + ":" + p.octave;
      acc = p.alter !== expected || (shown.has(id) && shown.get(id) !== p.alter);
      if (acc) shown.set(id, p.alter);
    }
    return {
      pitch: p, dur, accidental: acc,
      label: labels ? labels[i] : null,
      state: states ? states[i] : undefined,
    };
  });
}

/** Eine einzelne Tonhöhe auf einem System, etwa fürs Gehörtraining. */
export function renderSingle(pitch, opts = {}) {
  return renderStaff({
    notes: [{ pitch, dur: DUR.ganze, accidental: pitch.alter !== 0 }],
    rightPad: 34, ...opts,
  });
}

/**
 * Setzt Achtel und Sechzehntel taktweise zu Balkengruppen zusammen.
 *
 * Gruppiert wird nach der Zählzeit, in der eine Note **beginnt** — nicht
 * danach, wann die Summe der Dauern eine Zählzeit voll macht. Der
 * Unterschied zeigt sich bei jeder Synkope: ragt eine Note über die
 * Zählzeit hinaus, fängt die nächste Gruppe trotzdem erst beim nächsten
 * Schlag an. Wer stattdessen nach jedem Überlauf von vorn zählt,
 * verschiebt alle folgenden Balken um den Überhang, und dann zeigt der
 * Balken genau das nicht mehr, wofür er da ist: wo die Zählzeit liegt.
 */
export function autoBeam(notes, beatsPerGroup = 1) {
  const schritt = beatsPerGroup > 0 ? beatsPerGroup : 1;
  let id = 0, pos = 0, grenze = schritt, group = [];
  const flush = () => {
    if (group.length > 1) group.forEach(n => { n.beam = id; });
    id++; group = [];
  };
  for (const n of notes) {
    if (n.barline) { flush(); pos = 0; grenze = schritt; continue; }
    // Beginnt die Note in einer neuen Zählzeit, endet die alte Gruppe hier.
    while (pos >= grenze) { flush(); grenze += schritt; }
    if (n.pitch && n.dur <= DUR.achtel) group.push(n); else flush();
    pos += n.dur * (n.dots ? 1.5 : 1);
  }
  flush();
  return notes;
}
