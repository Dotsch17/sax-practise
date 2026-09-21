/* ==========================================================================
   Nachspielen

   Die App spielt eine kurze Phrase, du spielst sie nach, und das Mikrofon
   prüft, ob du sie getroffen hast. Das ist die Übung, die man sonst nur zu
   zweit machen kann — und die, die das Gehör am schnellsten mit dem
   Instrument verbindet. Intervalle erkennen ist Wissen; eine Phrase
   nachspielen zu können ist Können.

   Verglichen wird in **klingenden** Tonhöhen, denn das ist, was aus dem
   Instrument kommt und was das Mikrofon hört. Angezeigt wird bei der
   Auflösung der Griff, denn das ist, was du gedrückt hast.

   Zwei Dinge, die den Unterschied machen:

   - Der erste Ton kann vorgegeben werden. Am Anfang ist die Aufgabe „finde
     den Anfang und dann die Abstände“ zu groß; mit gegebenem Anfang übt man
     nur die Abstände, und das ist der Teil, der zählt.
   - Die Phrase wird nicht angezeigt, bevor du gespielt hast. Wer mitliest,
     übt Blattspiel, nicht Gehör.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, drill, scoreDrill, recordDrill } from "../core/store.js";
import { generatePhrase } from "../music/melodie.js";
import {
  MAJOR_KEYS, toMidi, toSounding, toWritten, spell, chromatic, majorKeySignature,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { playMelody, ok as sigOk, nope as sigNope } from "../audio/signals.js";
import * as pitch from "../audio/pitch.js";
import * as notenfolge from "../audio/notenfolge.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const STUFEN = [
  { id: 2, label: "2 Töne", laenge: 2, sprung: 0.3, hilfe: true },
  { id: 3, label: "3 Töne", laenge: 3, sprung: 0.25, hilfe: true },
  { id: 4, label: "4 Töne", laenge: 4, sprung: 0.25, hilfe: false },
  { id: 6, label: "6 Töne", laenge: 6, sprung: 0.3, hilfe: false },
  { id: 8, label: "8 Töne", laenge: 8, sprung: 0.35, hilfe: false },
];

let sel = { stufe: 3, keyIndex: 0, hilfe: true, tempo: 1.0 };
let phrase = null;          // { griffe: [pitch], klingend: [midi] }
let mikroAn = false;
let hoeren = null;          // Abmeldefunktion, solange aufgenommen wird
let gespielt = [];
let zustand = "bereit";     // bereit | hoert | aufnahme | ergebnis

const drillId = () => `nachspielen:${sel.stufe}`;
const stufeObj = () => STUFEN.find(s => s.id === sel.stufe) || STUFEN[1];

/* --- Aufgabe ----------------------------------------------------------------- */

function neu(root) {
  const st = stufeObj();
  // Eine Tonart, die auf dem Alt bequem liegt. Gewürfelt, damit man nicht
  // immer dieselben Griffe übt.
  sel.keyIndex = Math.floor(Math.random() * 7);
  const key = MAJOR_KEYS[sel.keyIndex];
  const griffe = generatePhrase({
    tonic: key.tonic, laenge: st.laenge, sprung: st.sprung, umfang: 7,
  });
  phrase = { griffe, klingend: griffe.map(p => toSounding(toMidi(p))), key };
  gespielt = [];
  zustand = "bereit";
  zeichne(root);
}

function spielVor() {
  if (!phrase) return 0;
  const a4 = state().settings.a4;
  const dauer = 0.52 / sel.tempo;
  return playMelody(phrase.klingend, { noteDur: dauer, gap: 0.06, a4 });
}

function spielErstenTon() {
  if (!phrase) return;
  playMelody([phrase.klingend[0]], { noteDur: 1.0, a4: state().settings.a4 });
}

/* --- Aufnahme ----------------------------------------------------------------- */

async function starteAufnahme(root) {
  if (!mikroAn) {
    try {
      await pitch.start();
      mikroAn = true;
      holdScreen();
    } catch (e) {
      console.warn(e);
      $("#ns-hinweis", root).textContent =
        location.protocol === "https:" || location.hostname === "localhost"
          ? "Ohne Mikrofonfreigabe geht es nicht."
          : "Das Mikrofon braucht HTTPS. Über eine reine IP-Adresse geht es nicht.";
      toast("Kein Mikrofon");
      return;
    }
  }

  gespielt = [];
  zustand = "aufnahme";
  zeichne(root);

  hoeren = notenfolge.hoereZu(note => {
    gespielt.push(note.midi);
    zeigeGespielt(root);
    // Sobald genug Töne da sind, von selbst auswerten — man soll nicht mit
    // dem Instrument im Mund einen Knopf suchen müssen.
    if (gespielt.length >= phrase.klingend.length) {
      setTimeout(() => { if (zustand === "aufnahme") beendeAufnahme(root); }, 700);
    }
  });
}

function beendeAufnahme(root) {
  if (zustand !== "aufnahme") return;
  notenfolge.stopp();
  hoeren = null;
  zustand = "ergebnis";

  const ergebnis = notenfolge.vergleiche(gespielt, phrase.klingend);
  scoreDrill(drillId(), ergebnis.alleRichtig);
  ergebnis.alleRichtig ? sigOk() : sigNope();

  const d = drill(drillId(), {});
  if (ergebnis.alleRichtig) {
    recordDrill(drillId(), { serie: d.streak || 0 });
  }
  zeichne(root, ergebnis);
}

/* --- Ansicht ------------------------------------------------------------------ */

function render(root) {
  root.innerHTML = `
    <div class="chips scroll" id="ns-stufen" role="group" aria-label="Länge"></div>

    <div class="nachspiel" id="ns-box">
      <div class="nachspiel-status" id="ns-status"></div>
      <div class="nachspiel-punkte" id="ns-punkte"></div>
    </div>

    <div class="row2">
      <button id="ns-hoeren">Phrase hören</button>
      <button id="ns-erster">Erster Ton</button>
    </div>
    <button class="wide primary" id="ns-auf">Jetzt spielen</button>

    <div id="ns-aufloesung" hidden></div>

    <div class="chips" id="ns-optionen" style="margin-top:16px"></div>
    <p class="hint" id="ns-hinweis">
      Hör die Phrase, sing sie innerlich mit, und spiel sie dann. Nicht
      suchen — wer auf dem Instrument sucht, übt Suchen.
    </p>
    <p class="hint" id="ns-punktestand"></p>`;

  renderStufen(root);
  renderOptionen(root);
  neu(root);

  $("#ns-hoeren", root).addEventListener("click", () => {
    zustand = "hoert";
    zeichne(root);
    const dauer = spielVor();
    setTimeout(() => { if (zustand === "hoert") { zustand = "bereit"; zeichne(root); } }, dauer * 1000);
  });
  $("#ns-erster", root).addEventListener("click", spielErstenTon);
  $("#ns-auf", root).addEventListener("click", () => {
    if (zustand === "aufnahme") beendeAufnahme(root);
    else if (zustand === "ergebnis") { neu(root); setTimeout(() => spielVor(), 250); }
    else starteAufnahme(root);
  });
}

function renderStufen(root) {
  const host = $("#ns-stufen", root);
  host.innerHTML = "";
  for (const s of STUFEN) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => { sel.stufe = s.id; sel.hilfe = s.hilfe; render(root); } },
    }));
  }
}

function renderOptionen(root) {
  const host = $("#ns-optionen", root);
  host.innerHTML = "";
  host.append(el("button", {
    class: "chip" + (sel.tempo < 1 ? " on" : ""),
    text: "langsam vorspielen",
    on: { click: () => { sel.tempo = sel.tempo < 1 ? 1.0 : 0.65; renderOptionen(root); } },
  }));
  if (mikroAn) {
    host.append(el("button", {
      class: "chip on",
      text: "Mikrofon aus",
      on: { click: () => {
        notenfolge.stopp(); pitch.stop(); releaseScreen();
        mikroAn = false; zustand = "bereit";
        render(root);
      } },
    }));
  }
}

function zeichne(root, ergebnis = null) {
  const status = $("#ns-status", root);
  const auf = $("#ns-auf", root);
  const box = $("#ns-box", root);
  if (!status) return;

  const texte = {
    bereit: "Hör dir die Phrase an",
    hoert: "hört …",
    aufnahme: "Spiel sie nach",
    ergebnis: ergebnis?.alleRichtig ? "Getroffen" : "Noch nicht",
  };
  status.textContent = texte[zustand];
  box.classList.toggle("aufnahme", zustand === "aufnahme");
  box.classList.toggle("treffer", zustand === "ergebnis" && ergebnis?.alleRichtig);

  auf.textContent = zustand === "aufnahme" ? "Fertig"
    : zustand === "ergebnis" ? "Nächste Phrase" : "Jetzt spielen";

  zeigeGespielt(root, ergebnis);

  const loes = $("#ns-aufloesung", root);
  loes.hidden = zustand !== "ergebnis";
  if (zustand === "ergebnis" && phrase) {
    const sig = majorKeySignature(phrase.key.tonic);
    const zustaende = ergebnis.proTon.map(x =>
      x === "richtig" ? "richtig" : x === "oktave" ? "aktiv" : "falsch");
    loes.innerHTML = `
      <div class="staff-wrap">${renderStaff({
        keySig: sig,
        notes: pitchesToNotes(phrase.griffe, DUR.viertel, {
          accidentalsFor: sig,
          labels: phrase.griffe.map(p => spell(p)),
          states: zustaende,
        }),
        extraClass: "compact",
        ariaLabel: "Auflösung",
      })}</div>
      <p class="hint">
        Griff in ${phrase.key.name} · klingt in ${spell(chromatic(phrase.klingend[0]))}.
        ${ergebnis.oktave ? `${ergebnis.oktave} Ton${ergebnis.oktave > 1 ? "e" : ""} richtig, aber in der falschen Oktave — im Gehör zählt das halb. ` : ""}
        ${ergebnis.fehlend ? `${ergebnis.fehlend} nicht getroffen.` : ""}
        ${ergebnis.zuviel ? ` ${ergebnis.zuviel} Ton${ergebnis.zuviel > 1 ? "e" : ""} zu viel.` : ""}
      </p>`;
  }

  const d = drill(drillId(), { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
  const g = (d.right || 0) + (d.wrong || 0);
  $("#ns-punktestand", root).textContent = g
    ? `${d.right} von ${g} Phrasen getroffen · ${d.streak} in Folge${d.bestStreak > 1 ? `, beste Serie ${d.bestStreak}` : ""}`
    : "";
}

/** Ein Punkt je erwartetem Ton, der sich füllt, sobald du ihn gespielt hast. */
function zeigeGespielt(root, ergebnis = null) {
  const host = $("#ns-punkte", root);
  if (!host || !phrase) return;
  host.innerHTML = phrase.klingend.map((_, i) => {
    let cls = "";
    if (ergebnis) {
      const z = ergebnis.proTon[i];
      cls = z === "richtig" ? " voll" : z === "oktave" ? " halb" : " leer";
    } else if (i < gespielt.length) cls = " voll";
    return `<i class="${cls}"></i>`;
  }).join("");
}

export default {
  id: "nachspielen",
  label: "Nachspielen",
  mount(root) { render(root); },
  unmount() {
    notenfolge.stopp();
    if (mikroAn) { pitch.stop(); mikroAn = false; releaseScreen(); }
    zustand = "bereit";
  },
};
