/* ==========================================================================
   Tonleitern und Akkorde

   Für die Prüfung zählt, was du greifst — wenn jemand „D-Dur“ sagt, meint
   er die Tonart, die du liest. Deshalb ist der Griff hier die Hauptangabe
   und die klingende Tonart steht klein daneben.

   Die Zulassungsprüfung IGP Popularmusik fragt siebzehn Arten in allen
   Tonarten ab, „theoretisch und praktisch am Instrument“. Drei Dinge folgen
   daraus, und alle drei stehen hier:

   - **Auswendig.** In der Prüfung liegt kein Blatt. Die Noten lassen sich
     verbergen, und im Prüfermodus sind sie es von selbst.
   - **Theoretisch heißt: die Töne sagen können.** Der Prüfer fragt
     „Fism7♭5?“ und erwartet „Fis, A, C, E“, bevor du spielst. Deshalb
     zuerst laut sagen, dann aufdecken, dann spielen.
   - **Abdeckung statt Lieblingstonarten.** Die Übersicht unten zählt, wie
     viel der 204 Aufgaben schon einmal gesessen hat. Was nie drankommt,
     kommt im Prüfermodus öfter.

   Die Musiktheorie dahinter steht in js/music/skalenarten.js und ist
   dort geprüft.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast, todayISO, daysBetween, escapeHtml } from "../core/dom.js";
import { state, drill, recordDrill, save } from "../core/store.js";
import { toMidi, toSounding, RANGE } from "../music/theory.js";
import {
  ARTEN, GRUPPEN, artOf, drillId, tonartenFuer, titel, buchstabiert, folge,
  abdeckung, pruefungsAufgabe,
} from "../music/skalenarten.js";
import { renderStaff, pitchesToNotes, DUR } from "../music/notation.js";
import { playMelody } from "../audio/signals.js";
import * as metro from "../audio/metronome.js";

let sel = { art: "dur", keyIndex: 0, umfang: 2, richtung: "auf-ab" };
// Im Prüfermodus steht eine Aufgabe offen, und Noten wie Töne sind verdeckt,
// bis man sie aufdeckt.
let pruefer = null;          // { aufgedeckt: bool }

const naming = () => state().settings.naming;
// Auf den Chips steht nur der Grundton, bei Akkorden das Symbol.
const kurzname = (art, k) => art.chord ? titel(art, k, naming())
  : titel(art, k, naming()).replace(/-Dur|-Moll.*| .*/, "");
const notenSichtbar = () => pruefer ? pruefer.aufgedeckt : state().settings.skalaNoten !== false;

/* Frühere Fassungen führten Dorisch und Mixolydisch unter den Durtonarten,
   also als „skala:dorisch:C-Dur“. Jetzt heißen sie nach ihrem Grundton.
   Einmal umziehen, damit bereits Geübtes nicht verschwindet. */
function alteModiUmziehen() {
  const d = state().drills;
  let geaendert = false;
  for (const id of ["dorisch", "mixolydisch"]) {
    const neu = tonartenFuer(artOf(id));
    for (const [schluessel, wert] of Object.entries(d)) {
      const m = schluessel.match(new RegExp(`^skala:${id}:(.+)-Dur$`));
      if (!m) continue;
      const alt = tonartenFuer(artOf("dur")).find(k => k.name === m[1] + "-Dur");
      const ziel = alt && neu.find(k => ((toMidi(k.tonic) - toMidi(alt.tonic)) % 12 + 12) % 12 === 0);
      if (ziel && !d[drillId(id, ziel.name)]) d[drillId(id, ziel.name)] = wert;
      delete d[schluessel];
      geaendert = true;
    }
  }
  if (geaendert) save();
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const art = artOf(sel.art);
  sel.keyIndex = clamp(sel.keyIndex, 0, tonartenFuer(art).length - 1);

  root.innerHTML = `
    <div class="chips scroll" id="gruppe-chips" role="group" aria-label="Gruppe"></div>
    <div class="chips scroll" id="type-chips" role="group" aria-label="Art"></div>
    <div class="chips scroll" id="key-chips" role="group" aria-label="Grundton"></div>

    <div id="pruefer-kopf"></div>
    <div id="scale-head"></div>
    <div id="scale-toene"></div>
    <div class="staff-wrap" id="scale-staff"></div>
    <button class="linkish" id="sc-noten"></button>

    <div class="row2">
      <button id="sc-play">Vorspielen</button>
      <button id="sc-metro">Mit Metronom</button>
    </div>

    <div class="grid3">
      <label>Umfang
        <select id="sc-oct">
          <option value="1">1 Oktave</option><option value="2">2 Oktaven</option>
          <option value="3">3 Oktaven</option><option value="voll">ganzer Umfang</option>
        </select>
      </label>
      <label>Richtung
        <select id="sc-dir">
          <option value="auf-ab">auf und ab</option>
          <option value="auf">nur auf</option>
          <option value="ab">nur ab</option>
        </select>
      </label>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Geschafft?</h3>
      <p class="hint">
        Erst abhaken, wenn sie zweimal hintereinander sauber und gleichmäßig
        kam — auswendig, im ganzen Umfang, einmal gebunden und einmal im
        Jazz-Muster: Offbeat angestoßen, in die Zählzeit gebunden. Das Tempo
        wird mitgeschrieben.
      </p>
      <div class="row2">
        <button id="sc-done">Bei ${state().settings.bpm} bpm geschafft</button>
        <button id="sc-pruefer">${pruefer ? "Prüfer beenden" : "Prüfer spielen"}</button>
      </div>
      <p class="hint" id="sc-status" style="margin:12px 0 0"></p>
    </div>

    <h2>Diese Art</h2>
    <p class="hint">
      Bestes Tempo je Grundton. Was blass ist, hast du noch nie abgehakt oder
      lange nicht mehr.
    </p>
    <div class="keygrid" id="sc-grid"></div>

    <h2>Prüfungsstoff</h2>
    <p class="hint" id="sc-abdeckung-summe"></p>
    <div id="sc-abdeckung"></div>`;

  renderGruppenChips(root);
  renderTypeChips(root);
  renderKeyChips(root);
  $("#sc-oct", root).value = String(sel.umfang);
  $("#sc-dir", root).value = sel.richtung;
  renderScale(root);
  renderGrid(root);
  renderAbdeckung(root);

  $("#sc-oct", root).addEventListener("change", e => {
    sel.umfang = e.target.value === "voll" ? "voll" : Number(e.target.value);
    renderScale(root);
  });
  $("#sc-dir", root).addEventListener("change", e => {
    sel.richtung = e.target.value; renderScale(root);
  });
  $("#sc-play", root).addEventListener("click", () => spiele());
  $("#sc-metro", root).addEventListener("click", () => metro.toggle());
  $("#sc-done", root).addEventListener("click", () => abhaken(root));
  $("#sc-pruefer", root).addEventListener("click", () => {
    if (pruefer) { pruefer = null; render(root); }
    else naechsteFrage(root);
  });
  $("#sc-noten", root).addEventListener("click", () => {
    if (pruefer) { pruefer.aufgedeckt = !pruefer.aufgedeckt; }
    else { state().settings.skalaNoten = !notenSichtbar(); save(); }
    renderScale(root);
  });
}

function waehleArt(root, id) {
  const alteKeys = tonartenFuer(artOf(sel.art));
  const alt = alteKeys[sel.keyIndex];
  sel.art = id;
  // Beim Wechsel der Art auf demselben Grundton bleiben, nicht auf dem
  // gleichen Index — die Listen haben verschiedene Reihenfolgen.
  const neu = tonartenFuer(artOf(id));
  const i = alt ? neu.findIndex(k => (toMidi(k.tonic) - toMidi(alt.tonic)) % 12 === 0) : -1;
  sel.keyIndex = i >= 0 ? i : 0;
}

function renderGruppenChips(root) {
  const host = $("#gruppe-chips", root);
  const aktiv = artOf(sel.art).gruppe;
  host.innerHTML = "";
  for (const g of GRUPPEN) {
    host.append(el("button", {
      class: "chip" + (g === aktiv ? " on" : ""),
      text: g,
      on: { click: () => {
        if (g === aktiv) return;
        waehleArt(root, ARTEN.find(a => a.gruppe === g).id);
        render(root);
      } },
    }));
  }
}

function renderTypeChips(root) {
  const host = $("#type-chips", root);
  const aktiv = artOf(sel.art);
  host.innerHTML = "";
  for (const a of ARTEN.filter(x => x.gruppe === aktiv.gruppe)) {
    host.append(el("button", {
      class: "chip" + (a.id === sel.art ? " on" : ""),
      text: a.label,
      on: { click: () => { waehleArt(root, a.id); render(root); } },
    }));
  }
}

function renderKeyChips(root) {
  const host = $("#key-chips", root);
  const art = artOf(sel.art);
  host.innerHTML = "";
  tonartenFuer(art).forEach((k, i) => {
    const b = el("button", {
      class: "chip" + (i === sel.keyIndex ? " on" : ""),
      text: kurzname(art, k),
      title: titel(art, k, naming()),
      on: { click: () => { sel.keyIndex = i; renderScale(root); renderKeyChips(root); } },
    });
    host.append(b);
    // Nach einem Sprung muss die neue Tonart im Bild sein.
    if (i === sel.keyIndex) requestAnimationFrame(() =>
      b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }));
  });
}

/** Die klingende Entsprechung, in derselben Schreibweise wie die Liste. */
function klingend(art, key) {
  const ziel = ((toSounding(toMidi(key.tonic)) % 12) + 12) % 12;
  const k = tonartenFuer(art).find(x => ((toMidi(x.tonic) % 12) + 12) % 12 === ziel);
  return k ? titel(art, k, naming()) : "";
}

function renderScale(root) {
  const art = artOf(sel.art);
  const key = tonartenFuer(art)[sel.keyIndex];
  const pitches = folge(art, key, sel.umfang, sel.richtung);
  const d = drill(drillId(art.id, key.name), {});
  const passt = pitches.every(p => toMidi(p) >= RANGE.writtenLow && toMidi(p) <= RANGE.writtenHigh);
  const sichtbar = notenSichtbar();

  $("#pruefer-kopf", root).innerHTML = pruefer ? `
    <div class="pruefer">
      <div class="pruefer-kopf">Prüfer fragt</div>
      <div class="pruefer-frage">${escapeHtml(titel(art, key, naming()))}</div>
      <p class="hint">Erst die Töne laut sagen, dann aufdecken, dann spielen: ganzer Umfang, auswendig.</p>
      <div class="row2">
        <button id="pr-auf">${pruefer.aufgedeckt ? "Verdecken" : "Aufdecken"}</button>
        <button id="pr-weiter">Nächste Frage</button>
      </div>
    </div>` : "";
  $("#pr-auf", root)?.addEventListener("click", () => { pruefer.aufgedeckt = !pruefer.aufgedeckt; renderScale(root); });
  $("#pr-weiter", root)?.addEventListener("click", () => naechsteFrage(root));

  $("#scale-head", root).innerHTML = pruefer ? "" : `
    <h2 style="margin-bottom:0">${escapeHtml(titel(art, key, naming()))}</h2>
    <p class="hint" style="margin-top:2px">
      Griff · klingt als ${escapeHtml(klingend(art, key))}
      ${d.bestBpm ? ` · dein bestes Tempo ${d.bestBpm} bpm` : ""}
      ${!passt ? ` · <strong>zwei Oktaven passen hier nicht, nimm den ganzen Umfang</strong>` : ""}
    </p>`;

  $("#scale-toene", root).innerHTML = sichtbar
    ? `<p class="toene">${buchstabiert(art, key, naming()).map(escapeHtml).join(" · ")}</p>`
    : "";

  $("#scale-staff", root).hidden = !sichtbar;
  if (sichtbar) {
    $("#scale-staff", root).innerHTML = renderStaff({
      keySig: key.sig || 0,
      notes: pitchesToNotes(pitches, DUR.viertel, { accidentalsFor: key.sig || 0 }),
      ariaLabel: titel(art, key, naming()),
      extraClass: "compact",
    });
  }
  const knopf = $("#sc-noten", root);
  knopf.textContent = sichtbar ? "Noten verbergen und auswendig spielen" : "Noten zeigen";
  knopf.hidden = !!pruefer;

  $("#sc-dir", root).disabled = sel.umfang === "voll";

  const st = $("#sc-status", root);
  st.textContent = d.bestBpm
    ? `Zuletzt am ${d.last}, bestes Tempo ${d.bestBpm} bpm, ${d.count || 0}× abgehakt.`
    : "Noch nie abgehakt.";
  $("#sc-done", root).textContent = `Bei ${state().settings.bpm} bpm geschafft`;
}

function spiele() {
  const art = artOf(sel.art);
  const key = tonartenFuer(art)[sel.keyIndex];
  // Vorgespielt wird klingend — sonst hörst du eine andere Tonart, als du
  // greifst, und das verwirrt beim Mitspielen.
  const midis = folge(art, key, sel.umfang, sel.richtung).map(p => toSounding(toMidi(p)));
  const bpm = state().settings.bpm;
  playMelody(midis, { noteDur: Math.min(0.5, 60 / bpm * 0.9), gap: 0.02, a4: state().settings.a4 });
}

function abhaken(root) {
  const art = artOf(sel.art);
  const key = tonartenFuer(art)[sel.keyIndex];
  const id = drillId(art.id, key.name);
  const d = drill(id, { count: 0, bestBpm: 0 });
  const bpm = state().settings.bpm;
  recordDrill(id, { count: (d.count || 0) + 1, bestBpm: Math.max(d.bestBpm || 0, bpm) });
  toast(`${titel(art, key, naming())} abgehakt bei ${bpm} bpm`);
  if (pruefer) { naechsteFrage(root); return; }
  renderScale(root);
  renderGrid(root);
  renderAbdeckung(root);
}

function naechsteFrage(root) {
  const vorher = pruefer ? { art: sel.art, keyIndex: sel.keyIndex } : null;
  const x = pruefungsAufgabe(state().drills, todayISO(), Math.random, vorher);
  sel.art = x.art;
  sel.keyIndex = x.keyIndex;
  sel.umfang = "voll";
  pruefer = { aufgedeckt: false };
  render(root);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderGrid(root) {
  const host = $("#sc-grid", root);
  if (!host) return;
  const art = artOf(sel.art);
  const heute = todayISO();

  host.innerHTML = tonartenFuer(art).map((k, i) => {
    const d = drill(drillId(art.id, k.name), {});
    const tage = d.last ? daysBetween(d.last, heute) : null;
    // Frisch geübt ist voll da, lange her verblasst — das ist die
    // Vergessenskurve als Bild.
    const frische = tage === null || !d.bestBpm ? 0 : Math.max(0.25, 1 - tage / 21);
    const name = kurzname(art, k);
    return `<button class="keycell${d.bestBpm ? "" : " leer"}" data-i="${i}"
              style="--frische:${frische.toFixed(2)}" title="${escapeHtml(titel(art, k, naming()))}">
      <b>${escapeHtml(name)}</b>
      <span>${d.bestBpm ? d.bestBpm : "–"}</span>
    </button>`;
  }).join("");

  $$(".keycell", host).forEach(b => b.addEventListener("click", () => {
    sel.keyIndex = Number(b.dataset.i);
    renderScale(root);
    renderKeyChips(root);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

function renderAbdeckung(root) {
  const host = $("#sc-abdeckung", root);
  if (!host) return;
  const a = abdeckung(state().drills);
  $("#sc-abdeckung-summe", root).textContent =
    `${a.geuebt} von ${a.gesamt} Aufgaben saßen schon einmal. Gezählt wird je Art und Grundton — ` +
    `die Lücken sind genau das, was der Prüfer fragen wird.`;
  host.innerHTML = a.arten.map(x => `
    <button class="bbar abdeckung" data-art="${x.art.id}">
      <span class="bbar-name">${escapeHtml(x.art.label)}</span>
      <span class="bbar-track"><i style="width:${(100 * x.geuebt / x.gesamt).toFixed(0)}%"></i></span>
      <span class="bbar-n">${x.geuebt}</span>
    </button>`).join("");
  $$(".abdeckung", host).forEach(b => b.addEventListener("click", () => {
    waehleArt(root, b.dataset.art);
    pruefer = null;
    render(root);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

export default {
  id: "tonleitern",
  label: "Tonleitern",
  mount(root) { alteModiUmziehen(); render(root); },
  unmount() { pruefer = null; },
};
