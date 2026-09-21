/* ==========================================================================
   Griffe

   Für das Altissimo und für alles andere, was man sich nicht merken kann:
   ein Griffbild je Ton, mehrere Varianten je Ton, und du trägst sie selbst
   ein.

   Warum nicht fertig geliefert: Altissimo-Griffe sind am Instrument
   verschieden. Was an einem Alt sicher spricht, spricht am nächsten gar
   nicht — das hängt an Mundstück, Blatt, Polstern und Ansatz. Eine
   abgeschriebene Tabelle wäre für genau dieses Instrument vermutlich falsch,
   und man würde monatelang gegen sie üben. Was du hier einträgst, hast du
   selbst ausprobiert; das ist der einzige Griff, der zählt.

   Deshalb auch das Feld „spricht an“: ein Griff, der nur an guten Tagen
   kommt, ist etwas anderes als einer, auf den du dich verlassen kannst.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast } from "../core/dom.js";
import { state, save } from "../core/store.js";
import { renderGriff, KLAPPEN, bereinige } from "../music/griffbild.js";

import { chromatic, spell, toSounding, toWritten, toMidi, RANGE } from "../music/theory.js";
import { renderStaff, DUR } from "../music/notation.js";
import { playNote } from "../audio/signals.js";

/* Die Klappen nach Griffhand gruppiert. Eingetippt wird über Chips und nicht
   über das Griffbild: eine Klappe im Bild ist 16 px groß, und 16 px trifft
   auf einem Telefon niemand. Das Bild bleibt daneben als Kontrolle. */
const GRUPPEN = [
  { name: "Daumen und Palm", ids: ["okt", "palmD", "palmEs", "palmF", "frontF"] },
  { name: "Linke Hand", ids: ["l1", "bis", "l2", "l3"] },
  { name: "Kleiner Finger links", ids: ["gis", "cis", "h", "b"] },
  { name: "Rechte Hand", ids: ["r1", "r2", "r3"] },
  { name: "Seitenklappen", ids: ["seiteE", "seiteC", "seiteB", "seiteFis"] },
  { name: "Kleiner Finger rechts", ids: ["es", "c"] },
];
const klappeVon = id => KLAPPEN.find(k => k.id === id);

/* Die Töne, für die sich eine eigene Sammlung lohnt: das Altissimo ab
   notiert G6, plus die Stellen im Normalumfang, an denen es Alternativen
   gibt. Alles andere kann man auswendig. */
const ALTISSIMO = [91, 92, 93, 94, 95, 96, 97, 98];   // notiert G6 bis D7
const HEIKEL = [66, 78, 89, 90];                       // Fis4, Fis5, F6, Fis6

let offen = null;         // notierte MIDI-Zahl des offenen Tons
let bearbeitung = null;   // { idx, gedrueckt: Set, name, sicher }

const griffe = () => {
  const s = state();
  if (!s.griffe || typeof s.griffe !== "object") s.griffe = {};
  return s.griffe;
};
const fuerTon = midi => griffe()[String(midi)] || [];

const nameVon = midi => spell(chromatic(midi)) + (midi >= 91 ? "" : "");
const lage = midi => {
  const p = chromatic(midi);
  return spell(p) + p.octave;
};

/* --- Übersicht ---------------------------------------------------------------- */

function render(root) {
  if (offen !== null) { renderTon(root, offen); return; }

  const alle = [...ALTISSIMO, ...HEIKEL].sort((a, b) => a - b);
  const eingetragen = alle.filter(m => fuerTon(m).length).length;

  root.innerHTML = `
    <p class="hint">
      Deine Griffe, nicht irgendwelche. Altissimo-Griffe unterscheiden sich
      am Instrument — trag ein, was an deinem Alt wirklich anspricht, und
      vermerk dazu, wie verlässlich es kommt.
    </p>

    <h3>Altissimo</h3>
    <div class="grifftabelle" id="gr-altissimo"></div>

    <h3>Alternativgriffe im Normalumfang</h3>
    <p class="hint">
      Töne, für die es mehrere gebräuchliche Griffe gibt. Welcher in welcher
      Passage besser liegt, entscheidet die Stelle — schreib es dazu.
    </p>
    <div class="grifftabelle" id="gr-heikel"></div>

    <p class="hint spaced">
      ${eingetragen} von ${alle.length} Tönen haben einen Griff.
      Die Griffe liegen in deinen Daten und gehen beim Export mit.
    </p>`;

  kacheln(root, "#gr-altissimo", ALTISSIMO);
  kacheln(root, "#gr-heikel", HEIKEL);
}

function kacheln(root, sel, liste) {
  const host = $(sel, root);
  host.innerHTML = liste.map(midi => {
    const g = fuerTon(midi);
    const sicher = g.filter(x => x.sicher).length;
    return `<button class="griffkachel${g.length ? "" : " leer"}" data-ton="${midi}">
      <b>${escapeHtml(lage(midi))}</b>
      <span>${g.length
        ? `${g.length} Griff${g.length > 1 ? "e" : ""}${sicher ? `, ${sicher} sicher` : ""}`
        : "noch keiner"}</span>
    </button>`;
  }).join("");

  $$("[data-ton]", host).forEach(b => b.addEventListener("click", () => {
    offen = Number(b.dataset.ton);
    render(root);
    window.scrollTo(0, 0);
  }));
}

/* --- Ein Ton ------------------------------------------------------------------- */

function renderTon(root, midi) {
  const liste = fuerTon(midi);
  const klingendMidi = toSounding(midi);
  const notiert = chromatic(midi);

  root.innerHTML = `
    <button class="zurueck" id="gr-back">← Alle Töne</button>
    <h2 style="margin-top:6px">${escapeHtml(lage(midi))}</h2>
    <p class="hint" style="margin-top:0">
      Griff · klingt ${escapeHtml(lage(klingendMidi))}
      ${midi > RANGE.writtenHigh ? " · Altissimo" : ""}
    </p>

    <div class="staff-wrap">${renderStaff({
      notes: [{ pitch: notiert, dur: DUR.ganze, accidental: notiert.alter !== 0 }],
      rightPad: 40, extraClass: "compact", ariaLabel: lage(midi),
    })}</div>

    <div class="row2">
      <button id="gr-hoeren">Zielton hören</button>
      <button id="gr-neu">Griff eintragen</button>
    </div>

    <div id="gr-editor"></div>
    <div id="gr-liste" style="margin-top:18px"></div>`;

  $("#gr-back", root).addEventListener("click", () => { offen = null; bearbeitung = null; render(root); });
  $("#gr-hoeren", root).addEventListener("click", () =>
    playNote(klingendMidi, { a4: state().settings.a4 }));
  $("#gr-neu", root).addEventListener("click", () => {
    bearbeitung = { idx: -1, gedrueckt: new Set(), name: "", sicher: false };
    renderEditor(root, midi);
  });

  renderEditor(root, midi);
  renderListe(root, midi);
}

function renderEditor(root, midi) {
  const host = $("#gr-editor", root);
  if (!bearbeitung) { host.innerHTML = ""; return; }

  host.innerHTML = `
    <div class="panel">
      <div class="griffeditor">
        <div class="griffbild-wrap klein">${renderGriff([...bearbeitung.gedrueckt],
          { namen: true, titel: "Vorschau" })}</div>
        <div class="griffgruppen">
          ${GRUPPEN.map(gr => `
            <div class="griffgruppe">
              <h3>${escapeHtml(gr.name)}</h3>
              <div class="chips">
                ${gr.ids.map(id => {
                  const k = klappeVon(id);
                  const an = bearbeitung.gedrueckt.has(id);
                  return `<button class="chip${an ? " on" : ""}" data-klappe="${id}"
                    aria-pressed="${an}">${escapeHtml(k.name.replace("Linker ", "").replace("Rechter ", ""))}</button>`;
                }).join("")}
              </div>
            </div>`).join("")}
        </div>
      </div>

      <div class="grid3" style="margin-top:6px">
        <label style="grid-column:1/-1">Bezeichnung
          <input type="text" id="gr-name" value="${escapeHtml(bearbeitung.name)}"
            placeholder="z. B. Griff 1 aus der Tabelle, oder: für schnelle Stellen">
        </label>
      </div>
      <div class="chips">
        <button class="chip${bearbeitung.sicher ? " on" : ""}" id="gr-sicher">spricht sicher an</button>
        <button class="chip" id="gr-leeren">alle lösen</button>
      </div>
      <div class="row2">
        <button id="gr-speichern" class="weiter">Speichern</button>
        <button id="gr-abbrechen">Abbrechen</button>
      </div>
    </div>`;

  $$("[data-klappe]", host).forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.klappe;
    bearbeitung.gedrueckt.has(id)
      ? bearbeitung.gedrueckt.delete(id)
      : bearbeitung.gedrueckt.add(id);
    renderEditor(root, midi);
  }));

  $("#gr-name", host).addEventListener("input", e => { bearbeitung.name = e.target.value; });
  $("#gr-sicher", host).addEventListener("click", () => {
    bearbeitung.sicher = !bearbeitung.sicher;
    renderEditor(root, midi);
  });
  $("#gr-leeren", host).addEventListener("click", () => {
    bearbeitung.gedrueckt.clear();
    renderEditor(root, midi);
  });
  $("#gr-abbrechen", host).addEventListener("click", () => {
    bearbeitung = null; renderEditor(root, midi);
  });
  $("#gr-speichern", host).addEventListener("click", () => {
    if (!bearbeitung.gedrueckt.size) { toast("Noch keine Klappe gewählt"); return; }
    const g = griffe();
    const k = String(midi);
    if (!g[k]) g[k] = [];
    const eintrag = {
      klappen: bereinige([...bearbeitung.gedrueckt]),
      name: bearbeitung.name.trim(),
      sicher: bearbeitung.sicher,
    };
    if (bearbeitung.idx >= 0) g[k][bearbeitung.idx] = eintrag;
    else g[k].push(eintrag);
    save();
    bearbeitung = null;
    toast("Griff gespeichert");
    renderTon(root, midi);
  });
}

function renderListe(root, midi) {
  const host = $("#gr-liste", root);
  const liste = fuerTon(midi);
  if (!liste.length) {
    host.innerHTML = `<p class="empty">
      Noch kein Griff eingetragen. Nimm deine Grifftabelle, probier die
      Varianten der Reihe nach durch und trag die ein, die bei dir kommt.</p>`;
    return;
  }

  host.innerHTML = `<div class="griffreihe">${liste.map((g, i) => `
    <div class="griffkarte${g.sicher ? " sicher" : ""}">
      <div class="griffbild-wrap klein">${renderGriff(g.klappen, { titel: g.name || "Griff " + (i + 1) })}</div>
      <div class="griffkarte-fuss">
        <span>${escapeHtml(g.name || "Griff " + (i + 1))}</span>
        ${g.sicher ? `<i class="griff-sicher">sicher</i>` : ""}
      </div>
      <div class="row2" style="margin-top:6px">
        <button data-bearbeiten="${i}">Ändern</button>
        <button data-weg="${i}">Löschen</button>
      </div>
    </div>`).join("")}</div>`;

  $$("[data-bearbeiten]", host).forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.bearbeiten);
    const g = liste[i];
    bearbeitung = { idx: i, gedrueckt: new Set(g.klappen), name: g.name || "", sicher: !!g.sicher };
    renderEditor(root, midi);
    window.scrollTo(0, 0);
  }));

  $$("[data-weg]", host).forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.weg);
    griffe()[String(midi)].splice(i, 1);
    if (!griffe()[String(midi)].length) delete griffe()[String(midi)];
    save();
    renderTon(root, midi);
  }));
}

export default {
  id: "griffe",
  label: "Griffe",
  mount(root) { render(root); },
  unmount() { offen = null; bearbeitung = null; },
};
