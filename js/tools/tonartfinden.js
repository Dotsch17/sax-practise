/* ==========================================================================
   Tonart finden

   Die Übung für genau die Situation, die auf dem Gig zählt: es läuft etwas,
   du kennst es nicht, und du hast acht Takte Zeit herauszufinden, worüber du
   spielen kannst. Auf der Hochzeit legt der DJ auf, niemand sagt dir die
   Tonart, und ein Griff ins Falsche hört jeder im Raum.

   Die Band spielt in einer zufälligen Tonart. Du suchst den Grundton auf dem
   Instrument und tippst dann den **Griff**, nicht die klingende Tonhöhe —
   denn das ist, was du wirklich weißt, wenn du ihn gefunden hast. Die
   Umrechnung macht die App, und genau dadurch übt man sie mit.

   Kein Mikrofon, und das ist Absicht: die Band kommt aus demselben
   Lautsprecher, den das Mikrofon hört. Eine Tonhöhenerkennung würde den Bass
   verfolgen statt dich. Außerdem geht es so auch mit dem Travel Sax, der
   akustisch gar nichts von sich gibt.

   Gemessen wird die Zeit bis zur Antwort, nicht nur richtig oder falsch. Wer
   die Tonart nach dreißig Sekunden findet, findet sie auf dem Gig nicht.
   ========================================================================== */

"use strict";

import { $, el, clamp } from "../core/dom.js";
import { state, drill, scoreDrill, recordDrill } from "../core/store.js";
import { PROGRESSIONS, buildProgression, progressionTakte } from "../music/harmonie.js";
import {
  chromatic, spell, fromMidi, toSounding,
  majorKeySignature, minorKeySignature, buildScale,
} from "../music/theory.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { ok as sigOk, nope as sigNope } from "../audio/signals.js";
import * as band from "../audio/begleitung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

/* Die zwölf Griffe als Antwortfeld. Reihenfolge wie auf dem Instrument, nicht
   im Quintenzirkel — gesucht wird ein Ton, nicht eine Tonart. */
const GRIFFE = [
  { pc: 0, name: "C" }, { pc: 1, name: "Des" }, { pc: 2, name: "D" },
  { pc: 3, name: "Es" }, { pc: 4, name: "E" }, { pc: 5, name: "F" },
  { pc: 6, name: "Fis" }, { pc: 7, name: "G" }, { pc: 8, name: "As" },
  { pc: 9, name: "A" }, { pc: 10, name: "B" }, { pc: 11, name: "H" },
];

/* Akkordfolgen, die auf einem Gig wirklich vorkommen. Jede trägt, ob sie
   Dur oder Moll klingt — das ist die zweite Hälfte der Antwort. */
const STOFF = [
  { prog: "vier_akkorde", geschlecht: "dur" },
  { prog: "moll_pop",     geschlecht: "moll" },
  { prog: "house_vamp",   geschlecht: "moll" },
  { prog: "bossa",        geschlecht: "dur" },
  { prog: "blues",        geschlecht: "dur" },
  { prog: "dur251",       geschlecht: "dur" },
  { prog: "ballade",      geschlecht: "dur" },
];

const STUFEN = [
  {
    id: "leicht", label: "leicht",
    was: "Vier bequeme Tonarten, nur Dur. Die Band läuft, bis du antwortest.",
    tonarten: [10, 3, 5, 0], nurDur: true, takteHoeren: 0,
  },
  {
    id: "mittel", label: "mittel",
    was: "Alle zwölf Tonarten, Dur und Moll. Die Band läuft, bis du antwortest.",
    tonarten: null, nurDur: false, takteHoeren: 0,
  },
  {
    id: "gig", label: "wie auf dem Gig",
    was: "Acht Takte hören, dann ist Ruhe. Die Antwort kommt aus dem Gedächtnis.",
    tonarten: null, nurDur: false, takteHoeren: 8,
  },
];

let sel = { stufe: "mittel", tempo: 104 };
let runde = null;      // { tonikaPc, geschlecht, prog, akkorde, start, antwortPc }
let offBar = null;
let offState = null;
let uhr = null;
let absTakt = -1;

/* Gerade oder geswingt — die Band klingt sonst nach Lehrbuch statt nach Gig. */
const SWING = { blues: 0.62, dur251: 0.62, bossa: 0.5, ballade: 0.56 };

const stufeOf = () => STUFEN.find(s => s.id === sel.stufe) || STUFEN[1];
const drillId = () => `tonartfinden:${sel.stufe}`;

/* --- Aufgabe ---------------------------------------------------------------- */

function wuerfle() {
  const st = stufeOf();
  let stoff = STOFF.filter(s => PROGRESSIONS.some(p => p.id === s.prog));
  if (st.nurDur) stoff = stoff.filter(s => s.geschlecht === "dur");
  const gewaehlt = stoff[Math.floor(Math.random() * stoff.length)];
  const prog = PROGRESSIONS.find(p => p.id === gewaehlt.prog);

  const topf = st.tonarten || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  let tonikaPc = topf[Math.floor(Math.random() * topf.length)];
  // Zweimal dieselbe Tonart hintereinander ist keine Gehörübung, sondern
  // eine Gedächtnisstütze.
  if (runde && topf.length > 1 && tonikaPc === runde.tonikaPc) {
    tonikaPc = topf[(topf.indexOf(tonikaPc) + 1 + Math.floor(Math.random() * (topf.length - 1))) % topf.length];
  }

  return {
    tonikaPc, geschlecht: gewaehlt.geschlecht, prog,
    akkorde: buildProgression(prog, tonikaPc),
    start: 0, antwortPc: null, hoerenVorbei: false,
  };
}

function starte(root) {
  runde = wuerfle();
  absTakt = -1;
  band.configure({
    akkorde: runde.akkorde, bpm: sel.tempo, swing: SWING[runde.prog.id] ?? 0.5,
    a4: state().settings.a4, taktlaenge: 4,
  });
  if (!offBar) offBar = band.onBar(info => aufTakt(root, info));
  // Wird die Band von außen gestoppt, bleibt die Frage offen — nur die
  // Anzeige muss es mitbekommen.
  if (!offState) offState = band.onStateChange(({ running }) => {
    if (!running && runde && runde.antwortPc == null) { runde.hoerenVorbei = true; zeichne(root); }
  });
  band.start();
  holdScreen();
  runde.start = performance.now();
  // Die Uhr läuft eigenständig weiter, nicht nur im Takt der Band — sonst
  // steht die Zeit bei langsamem Tempo sekundenlang still.
  if (uhr) clearInterval(uhr);
  uhr = setInterval(() => {
    if (!runde || runde.antwortPc != null) return;
    const feld = $("#tf-uhr", root);
    if (feld) feld.textContent = `${((performance.now() - runde.start) / 1000).toFixed(1)} s`;
  }, 100);
  zeichne(root);
}

function stoppeUhr() { if (uhr) { clearInterval(uhr); uhr = null; } }

function halt(root) {
  band.stop();
  stoppeUhr();
  releaseScreen();
  if (offBar) { offBar(); offBar = null; }
  if (offState) { offState(); offState = null; }
  zeichne(root);
}

function aufTakt(root, info) {
  if (!runde) return;
  const gesamt = progressionTakte(runde.akkorde);
  const abs = info.durchgang * gesamt + info.takt;
  if (abs === absTakt) return;
  absTakt = abs;

  const st = stufeOf();
  // abs ist nullbasiert: beim Beginn von Takt 8 sind acht Takte erklungen.
  if (st.takteHoeren && abs >= st.takteHoeren && !runde.hoerenVorbei) {
    runde.hoerenVorbei = true;
    band.stop();
    releaseScreen();
  }
  zeichne(root);
}

/* --- Antwort ---------------------------------------------------------------- */

function antworte(root, griffPc) {
  if (!runde || runde.antwortPc != null) return;
  runde.antwortPc = griffPc;
  const sekunden = (performance.now() - runde.start) / 1000;
  runde.sekunden = sekunden;

  const richtigGriff = (runde.tonikaPc + 9) % 12;      // Griff = klingend + große Sexte
  const richtig = griffPc === richtigGriff;

  band.stop();
  stoppeUhr();
  releaseScreen();
  scoreDrill(drillId(), richtig);
  richtig ? sigOk() : sigNope();

  if (richtig) {
    const d = drill(drillId(), {});
    const bisher = d.schnellste;
    if (!bisher || sekunden < bisher) recordDrill(drillId(), { schnellste: Math.round(sekunden * 10) / 10 });
  }
  zeichne(root);
}

/** Wie weit daneben, und ist es wenigstens ein Ton aus der Tonart? */
function urteil(griffPc) {
  const abstand = ((griffPc - (runde.tonikaPc + 9)) % 12 + 12) % 12;
  if (abstand === 0) return null;
  const dur = runde.geschlecht === "dur";
  const leiter = dur ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];

  // Die Paralleltonart ist der teuerste Irrtum: gleiche Vorzeichen, gleiche
  // Töne, und trotzdem klingt jede Phrase auf der falschen Eins.
  if (!dur && abstand === 3) {
    return "Du hast die parallele Dur-Tonart gehört. Dieselben Vorzeichen, dieselben Töne — unterscheiden lassen sie sich nur daran, wo der Bass zur Ruhe kommt.";
  }
  if (dur && abstand === 9) {
    return "Du hast die parallele Moll-Tonart gehört. Dieselben Vorzeichen, dieselben Töne — unterscheiden lassen sie sich nur daran, wo der Bass zur Ruhe kommt.";
  }
  if (abstand === 7) {
    return "Das ist die Quinte. Sie klingt so stabil, dass man sie dauernd für den Grundton hält — der Grundton ist der, auf dem du stehen bleiben kannst, ohne dass es weiterzieht.";
  }
  if (abstand === 5) {
    return "Das ist die Quarte. Von ihr aus zieht alles zum Grundton hinunter; genau dieses Ziehen ist das Zeichen, dass du noch nicht dort bist.";
  }
  if (abstand === 4 || abstand === 3) {
    return "Das ist die Terz. Sie trägt die Farbe der Tonart und ist deshalb der auffälligste Ton — aber nicht der Grundton.";
  }
  if (abstand === 1 || abstand === 11) {
    return "Ein Halbton daneben. Beim nächsten Mal erst singen, dann greifen: mit der Stimme trifft man keinen Halbton daneben.";
  }
  if (leiter.includes(abstand)) {
    return "Ein Ton aus der richtigen Tonart, nur nicht der Grundton. Das ist der häufigste Fehler und der harmloseste.";
  }
  return "Außerhalb der Tonart. Fang beim Bass an: was er auf der Eins des ersten Takts spielt, ist fast immer der Grundton.";
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  root.innerHTML = `
    <div class="chips scroll" id="tf-stufen" role="group" aria-label="Stufe"></div>
    <p class="hint" id="tf-stufe-was"></p>

    <div class="tf-buehne" id="tf-buehne">
      <div class="tf-frage" id="tf-frage">Welche Tonart?</div>
      <div class="tf-uhr" id="tf-uhr">—</div>
      <div class="tf-takte" id="tf-takte"></div>
    </div>

    <button class="wide primary" id="tf-los">Los</button>

    <div id="tf-antwort" hidden>
      <p class="hint">Welchen <b>Griff</b> hast du gefunden?</p>
      <div class="keys" id="tf-griffe"></div>
    </div>

    <div id="tf-loesung" hidden></div>

    <div class="grid3">
      <label>Tempo
        <input type="number" id="tf-tempo" min="60" max="180" value="${sel.tempo}">
      </label>
    </div>

    <p class="hint spaced">
      Der Bass spielt den Grundton auf der Eins. Sing ihn mit, bevor du ihn
      suchst — mit der Stimme findet man ihn schneller als mit den Fingern.
    </p>
    <p class="hint" id="tf-punktestand"></p>`;

  renderStufen(root);
  renderGriffe(root);

  $("#tf-los", root).addEventListener("click", () => {
    if (runde && runde.antwortPc == null) { halt(root); runde = null; zeichne(root); }
    else starte(root);
  });
  $("#tf-tempo", root).addEventListener("change", e => {
    sel.tempo = clamp(parseInt(e.target.value, 10) || 104, 60, 180);
    e.target.value = sel.tempo;
    if (band.isRunning()) band.configure({ bpm: sel.tempo });
  });

  zeichne(root);
}

function renderStufen(root) {
  const host = $("#tf-stufen", root);
  host.innerHTML = "";
  for (const s of STUFEN) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => {
        if (band.isRunning()) halt(root);
        sel.stufe = s.id; runde = null;
        renderStufen(root); zeichne(root);
      } },
    }));
  }
  $("#tf-stufe-was", root).textContent = stufeOf().was;
}

function renderGriffe(root) {
  const host = $("#tf-griffe", root);
  host.innerHTML = "";
  for (const g of GRIFFE) {
    host.append(el("button", {
      class: "key",
      html: `<b>${g.name}</b><span>klingt ${spell(chromatic(toSounding(72 + g.pc)))}</span>`,
      on: { click: () => antworte(root, g.pc) },
    }));
  }
}

function zeichne(root) {
  const buehne = $("#tf-buehne", root);
  if (!buehne) return;
  const laeuft = band.isRunning();
  const offen = runde && runde.antwortPc == null;
  const fertig = runde && runde.antwortPc != null;

  buehne.classList.toggle("laeuft", laeuft);
  $("#tf-los", root).textContent = offen ? "Abbrechen" : runde ? "Nächste" : "Los";
  $("#tf-antwort", root).hidden = !offen;

  $("#tf-frage", root).textContent = !runde ? "Welche Tonart?"
    : offen ? (runde.hoerenVorbei ? "Und jetzt?" : "Hör hin") : "Aufgelöst";

  const sek = runde
    ? (runde.sekunden ?? (performance.now() - runde.start) / 1000) : null;
  $("#tf-uhr", root).textContent = sek == null ? "—" : `${sek.toFixed(1)} s`;

  const takte = $("#tf-takte", root);
  if (runde && absTakt >= 0) {
    const gesamt = progressionTakte(runde.akkorde);
    takte.textContent = offen && !runde.hoerenVorbei
      ? `Takt ${absTakt % gesamt + 1} von ${gesamt}` : "";
  } else takte.textContent = "";

  zeigeLoesung(root, fertig);

  const d = drill(drillId(), { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
  const g = (d.right || 0) + (d.wrong || 0);
  $("#tf-punktestand", root).textContent = g
    ? `${d.right} von ${g} getroffen · ${d.streak} in Folge${d.schnellste ? ` · schnellste ${d.schnellste} s` : ""}`
    : "";
}

function zeigeLoesung(root, fertig) {
  const host = $("#tf-loesung", root);
  host.hidden = !fertig;
  if (!fertig) { host.innerHTML = ""; return; }

  const dur = runde.geschlecht === "dur";
  const klingendMidi = 60 + runde.tonikaPc;
  const griffPc = (runde.tonikaPc + 9) % 12;
  // Die Leiter in der mittleren Oktave, damit sie ohne Hilfslinien dasteht
  // und auf dem Instrument liegt.
  const grundMidi = 60 + griffPc;
  const richtig = runde.antwortPc === griffPc;
  const gewaehlt = GRIFFE.find(x => x.pc === runde.antwortPc);

  const grund = fromMidi(grundMidi, griffPc === 6 || griffPc === 1 ? "sharp" : "flat");
  const sig = dur ? majorKeySignature(grund) : minorKeySignature(grund);
  const leiter = buildScale(grund, dur ? "dur" : "moll_natur", 1);
  const klingend = spell(chromatic(klingendMidi));
  const griff = spell(grund);

  host.innerHTML = `
    <div class="tf-ergebnis ${richtig ? "gut" : ""}">
      <b>${richtig ? "✓ Getroffen" : "✕ Daneben"}</b>
      <span>${runde.prog.name} · ${runde.sekunden.toFixed(1)} s</span>
    </div>
    <div class="tf-zeile">
      <b>Klingend ${klingend}-${dur ? "Dur" : "Moll"}</b>
      <span>Das kommt aus dem Lautsprecher.</span>
    </div>
    <div class="tf-zeile">
      <b>Griff ${griff}-${dur ? "Dur" : "Moll"}</b>
      <span>Das greifst du. ${vorzeichenText(sig)}</span>
    </div>
    ${richtig ? "" : `<p class="hint">Du hast ${gewaehlt ? gewaehlt.name : "?"} getippt. ${urteil(runde.antwortPc)}</p>`}
    <div class="staff-wrap">${renderStaff({
      keySig: sig,
      notes: pitchesToNotes(leiter, DUR.viertel, { accidentalsFor: sig }),
      extraClass: "compact",
      ariaLabel: `${griff}-${dur ? "Dur" : "Moll"} gegriffen`,
    })}</div>
    <p class="hint">
      ${dur
        ? "Über Dur trägt die Dur-Pentatonik, und mixolydisch, sobald eine Septime dazukommt."
        : "Über Moll trägt die Moll-Pentatonik. Ein Ton mehr, und es ist Blues."}
      Was die Skalen sind und wann sie schiefgehen, steht unter Grundlagen.
    </p>`;
}

const vorzeichenText = sig =>
  sig === 0 ? "Keine Vorzeichen."
  : sig > 0 ? `${sig} Kreuz${sig > 1 ? "e" : ""}.`
  : `${-sig} B${-sig > 1 ? "e" : ""}.`;

export default {
  id: "tonartfinden",
  label: "Tonart finden",
  mount(root) { render(root); },
  unmount() {
    band.stop();
    stoppeUhr();
    if (offBar) { offBar(); offBar = null; }
    if (offState) { offState(); offState = null; }
    releaseScreen();
    runde = null; absTakt = -1;
  },
};
