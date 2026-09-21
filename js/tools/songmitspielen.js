/* ==========================================================================
   Zum Song spielen

   Travel Sax ans Handy, Spotify an, mitspielen — so übt der Nutzer
   Improvisation ohnehin. Was fehlte, war die Reihenfolge. Dieses Werkzeug
   führt durch die sieben Schritte, in denen ein Studiomusiker ein
   unbekanntes Stück aufmacht, und hält fest, was dabei herauskam.

   Zwei Entscheidungen, die den Unterschied machen:

   - Jeder Schritt hat ein Abbruchkriterium, nicht nur eine Aufgabe.
     Ohne „fertig, wenn …“ übt man jeden Schritt entweder zwei Minuten zu
     kurz oder zwanzig zu lang.
   - Was einmal gefunden ist, bleibt gespeichert. Beim nächsten Mal steht die
     Tonart schon da, und man fängt bei Schritt vier an statt wieder bei eins.
     Genau so entsteht ein Repertoire, das man auf einem Gig abrufen kann.

   Gespeichert wird unter `drills`, nicht in einem eigenen Feld: das Schema
   bleibt damit unverändert und braucht keine Migration.
   ========================================================================== */

"use strict";

import { $, el, escapeHtml, toast, todayISO } from "../core/dom.js";
import { drill, recordDrill } from "../core/store.js";
import { SCHRITTE, DANACH } from "../data/songwissen.js";
import { chromatic, spell, toSounding, toWritten } from "../music/theory.js";

const LISTE = "songmitspielen:liste";

/* Die zwölf Griffe. Gefragt wird nach dem Griff, denn das ist, was der
   Nutzer in der Hand hat, wenn er den Ton gefunden hat. */
const GRIFFE = [
  { pc: 0, name: "C" }, { pc: 1, name: "Des" }, { pc: 2, name: "D" },
  { pc: 3, name: "Es" }, { pc: 4, name: "E" }, { pc: 5, name: "F" },
  { pc: 6, name: "Fis" }, { pc: 7, name: "G" }, { pc: 8, name: "As" },
  { pc: 9, name: "A" }, { pc: 10, name: "B" }, { pc: 11, name: "H" },
];

const FORMEN = [4, 8, 12, 16];

let offenerSong = null;   // Kopie des Songs, an dem gerade gearbeitet wird
let offenerSchritt = 0;

/* --- Speicher --------------------------------------------------------------- */

const alleSongs = () => drill(LISTE, { songs: [] }).songs;

function speichere(song) {
  const d = drill(LISTE, { songs: [] });
  const i = d.songs.findIndex(s => s.id === song.id);
  if (i >= 0) d.songs[i] = song; else d.songs.unshift(song);
  recordDrill(LISTE, { songs: d.songs.slice(0, 60) });
}

function loesche(id) {
  const d = drill(LISTE, { songs: [] });
  recordDrill(LISTE, { songs: d.songs.filter(s => s.id !== id) });
}

const neuerSong = titel => ({
  id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
  titel: titel.trim(), angelegt: todayISO(),
  griffPc: null, geschlecht: null, form: null,
  erledigt: [], notiz: "",
});

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div id="sm-start">
      <div class="sm-neu">
        <input type="text" id="sm-titel" placeholder="Was läuft gerade?" autocomplete="off">
        <button id="sm-anlegen" class="primary">Aufmachen</button>
      </div>
      <p class="hint">
        Travel Sax ans Handy, Song an, und dann der Reihe nach. Sieben
        Schritte, jeder mit einem Punkt, an dem er fertig ist.
      </p>
      <div id="sm-liste"></div>
    </div>

    <div id="sm-arbeit" hidden></div>`;

  $("#sm-anlegen", root).addEventListener("click", () => {
    const feld = $("#sm-titel", root);
    const titel = feld.value.trim();
    if (!titel) { feld.focus(); toast("Titel fehlt"); return; }
    offenerSong = neuerSong(titel);
    offenerSchritt = 0;
    speichere(offenerSong);
    feld.value = "";
    zeichne(root);
  });
  $("#sm-titel", root).addEventListener("keydown", e => {
    if (e.key === "Enter") $("#sm-anlegen", root).click();
  });

  zeichne(root);
}

function zeichne(root) {
  const start = $("#sm-start", root), arbeit = $("#sm-arbeit", root);
  if (!start) return;
  start.hidden = !!offenerSong;
  arbeit.hidden = !offenerSong;
  if (offenerSong) zeichneArbeit(root); else zeichneListe(root);
}

function zeichneListe(root) {
  const host = $("#sm-liste", root);
  const songs = alleSongs();
  if (!songs.length) {
    host.innerHTML = `<p class="hint spaced">Noch kein Song. Der erste ist
      immer der langsamste — beim zehnten hast du die Tonart in zwanzig
      Sekunden.</p>`;
    return;
  }
  host.innerHTML = `<p class="hint spaced">${songs.length} Song${songs.length > 1 ? "s" : ""} aufgemacht</p>`;
  for (const s of songs) {
    const fertig = (s.erledigt || []).length;
    const zeile = el("div", { class: "sm-eintrag" }, [
      el("button", {
        class: "sm-oeffnen",
        html: `<b>${escapeHtml(s.titel)}</b><span>${beschreibe(s)} · ${fertig} von ${SCHRITTE.length}</span>`,
        on: { click: () => {
          offenerSong = { ...s, erledigt: [...(s.erledigt || [])] };
          offenerSchritt = naechsterOffener(offenerSong);
          zeichne(root);
        } },
      }),
      el("button", {
        class: "sm-weg", text: "✕", title: "Löschen",
        "aria-label": `${s.titel} löschen`,
        on: { click: () => { loesche(s.id); zeichneListe(root); } },
      }),
    ]);
    host.append(zeile);
  }
}

function beschreibe(s) {
  if (s.griffPc == null) return "noch nichts gefunden";
  const griff = spell(chromatic(toWritten(60 + soundingPc(s))));
  const klingend = spell(chromatic(60 + soundingPc(s)));
  const art = s.geschlecht === "moll" ? "Moll" : s.geschlecht === "dur" ? "Dur" : "";
  return `Griff ${griff}${art ? "-" + art : ""} · klingt ${klingend}${s.form ? ` · ${s.form} Takte` : ""}`;
}

/* Im Song steht der Griff; klingend ist er neun Halbtöne tiefer. */
const soundingPc = s => ((s.griffPc - 9) % 12 + 12) % 12;

const naechsterOffener = song => {
  const i = SCHRITTE.findIndex(s => !(song.erledigt || []).includes(s.id));
  return i < 0 ? SCHRITTE.length - 1 : i;
};

function zeichneArbeit(root) {
  const host = $("#sm-arbeit", root);
  const s = offenerSong;
  const schritt = SCHRITTE[offenerSchritt];
  const erledigt = s.erledigt || [];
  const istFertig = erledigt.includes(schritt.id);
  const alleFertig = erledigt.length >= SCHRITTE.length;

  host.innerHTML = `
    <div class="sm-kopf">
      <button id="sm-zurueck" class="sm-zurueck">‹ Alle Songs</button>
      <b>${escapeHtml(s.titel)}</b>
      <span>${beschreibe(s)}</span>
    </div>

    <div class="formleiste" id="sm-leiste"></div>

    <div class="sm-schritt">
      <div class="sm-nummer">Schritt ${offenerSchritt + 1} von ${SCHRITTE.length}</div>
      <h3>${escapeHtml(schritt.titel)}</h3>
      <p>${escapeHtml(schritt.was)}</p>
      <div id="sm-eingabe"></div>
      <div class="sm-fertig"><b>Fertig, wenn</b> ${escapeHtml(schritt.fertig)}</div>
      <details class="sm-mehr">
        <summary>Warum das zählt</summary>
        <p>${escapeHtml(schritt.warum)}</p>
        <p class="hint">${escapeHtml(schritt.tipp)}</p>
      </details>
    </div>

    <div class="row2">
      <button id="sm-vor">${istFertig ? "Weiter" : "Geschafft"}</button>
      <button id="sm-ueber">Überspringen</button>
    </div>

    ${alleFertig ? `<div class="sm-danach">
      <b>Alle sieben durch.</b>
      <ul>${DANACH.map(d => `<li>${escapeHtml(d)}</li>`).join("")}</ul>
    </div>` : ""}

    <label class="sm-notiz">Notiz zum Song
      <textarea id="sm-notiz" rows="3" placeholder="Was war schwer, wo kam der Hook?">${escapeHtml(s.notiz || "")}</textarea>
    </label>`;

  zeichneLeiste(root);
  zeichneEingabe(root, schritt);

  $("#sm-zurueck", root).addEventListener("click", () => {
    offenerSong = null; zeichne(root);
  });
  $("#sm-vor", root).addEventListener("click", () => {
    if (!erledigt.includes(schritt.id)) {
      s.erledigt = [...erledigt, schritt.id];
      speichere(s);
    }
    offenerSchritt = Math.min(SCHRITTE.length - 1, offenerSchritt + 1);
    zeichneArbeit(root);
  });
  $("#sm-ueber", root).addEventListener("click", () => {
    offenerSchritt = Math.min(SCHRITTE.length - 1, offenerSchritt + 1);
    zeichneArbeit(root);
  });
  $("#sm-notiz", root).addEventListener("change", e => {
    s.notiz = e.target.value; speichere(s);
  });
}

function zeichneLeiste(root) {
  const host = $("#sm-leiste", root);
  host.innerHTML = "";
  SCHRITTE.forEach((sc, i) => {
    const b = el("button", {
      class: "sm-punkt" + (i === offenerSchritt ? " jetzt" : "") +
             ((offenerSong.erledigt || []).includes(sc.id) ? " fertig" : ""),
      text: String(i + 1),
      title: sc.titel,
      on: { click: () => { offenerSchritt = i; zeichneArbeit(root); } },
    });
    host.append(b);
  });
}

function zeichneEingabe(root, schritt) {
  const host = $("#sm-eingabe", root);
  const s = offenerSong;
  host.innerHTML = "";

  if (schritt.eingabe === "grundton") {
    const feld = el("div", { class: "keys" });
    for (const g of GRIFFE) {
      feld.append(el("button", {
        class: "key",
        "aria-pressed": s.griffPc === g.pc ? "true" : "false",
        html: `<b>${g.name}</b><span>klingt ${spell(chromatic(toSounding(72 + g.pc)))}</span>`,
        on: { click: () => { s.griffPc = g.pc; speichere(s); zeichneArbeit(root); } },
      }));
    }
    host.append(feld);
    return;
  }

  if (schritt.eingabe === "geschlecht") {
    if (s.griffPc == null) {
      host.innerHTML = `<p class="hint">Erst den Grundton, sonst gibt es keine Terz.</p>`;
      return;
    }
    const grosz = spell(chromatic(toWritten(60 + soundingPc(s)) + 4));
    const klein = spell(chromatic(toWritten(60 + soundingPc(s)) + 3));
    const reihe = el("div", { class: "chips" });
    reihe.append(el("button", {
      class: "chip" + (s.geschlecht === "dur" ? " on" : ""),
      text: `Dur — grosze Terz ${grosz}`,
      on: { click: () => { s.geschlecht = "dur"; speichere(s); zeichneArbeit(root); } },
    }));
    reihe.append(el("button", {
      class: "chip" + (s.geschlecht === "moll" ? " on" : ""),
      text: `Moll — kleine Terz ${klein}`,
      on: { click: () => { s.geschlecht = "moll"; speichere(s); zeichneArbeit(root); } },
    }));
    host.append(reihe);
    host.append(el("p", {
      class: "hint",
      text: `Beide Terzen greifst du über dem Grundton ${spell(chromatic(toWritten(60 + soundingPc(s))))}. Spiel sie nacheinander, eine reibt.`,
    }));
    return;
  }

  if (schritt.eingabe === "form") {
    const reihe = el("div", { class: "chips" });
    for (const f of FORMEN) {
      reihe.append(el("button", {
        class: "chip" + (s.form === f ? " on" : ""),
        text: `${f} Takte`,
        on: { click: () => { s.form = f; speichere(s); zeichneArbeit(root); } },
      }));
    }
    host.append(reihe);
  }
}

export default {
  id: "songmitspielen",
  label: "Zum Song spielen",
  mount(root) { render(root); },
  unmount() { offenerSong = null; offenerSchritt = 0; },
};
