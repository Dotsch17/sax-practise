/* ==========================================================================
   Prüfungssimulation

   Das Saxophon-Programm der Zulassungsprüfung am Stück, mit einer Aufnahme
   über alles. Der Ablauf steht in js/data/simulation.js; hier ist nur die
   Bühne: eine Station nach der anderen, groß lesbar vom Notenständer, ein
   Knopf „Weiter“ und sonst nichts, was zum Anhalten einlädt.

   Die Aufnahme bekommt Marken bei jedem Stationswechsel. Nachher springt
   man damit direkt zu Stück drei, statt zwanzig Minuten zu spulen — und
   hört sich deshalb überhaupt an, was man gespielt hat.

   Bewertet wird am Ende, nicht unterwegs: in der Prüfung weiß man auch
   erst hinterher, wie es war.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { baueSimulation, bilanz, URTEILE, LISTE } from "../data/simulation.js";
import * as rek from "../audio/rekorder.js";
import * as db from "../core/aufnahmen.js";
import * as band from "../audio/begleitung.js";
import * as metro from "../audio/metronome.js";
import { playMelody } from "../audio/signals.js";
import { leseLeadsheet } from "../music/leadsheet.js";
import { generateMelodie } from "../music/melodie.js";
import { renderStaff, autoBeam } from "../music/notation.js";
import { MAJOR_KEYS } from "../music/theory.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let optionen = { aufnahme: true, unterbrechen: true };
let lauf = null;       // { stationen, i, start, stationStart, marken, aufgabe, phase, danke, timer }
let ende = null;       // { stationen, marken, dauer, aufnahmeId, urteile, notiz, gespeichert }
let offBand = null;

const liste = () => drill(LISTE, { eintraege: [] }).eintraege;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const jetzt = () => Date.now() / 1000;

/* --- Start ------------------------------------------------------------------- */

function renderStart() {
  const alt = liste().slice(-3).reverse();
  root.innerHTML = `
    <h2>Prüfung simulieren</h2>
    <p class="hint">Das ganze Saxophon-Programm, kalt und am Stück: eine Minute Einstimmen, deine drei Stücke und
      zwei Etüden in einer Reihenfolge, die die Kommission bestimmt, drei Tonleitern oder Akkorde, Blattlesen.
      Rund zwanzig bis dreißig Minuten. Es gibt kein Nochmal — nur Weiter.</p>
    <div class="chips" role="group" aria-label="Optionen">
      <button class="chip${optionen.aufnahme ? " on" : ""}" id="sim-opt-auf"${rek.unterstuetzt() ? "" : " disabled"}>Aufnahme über alles</button>
      <button class="chip${optionen.unterbrechen ? " on" : ""}" id="sim-opt-unt">Kommission unterbricht</button>
    </div>
    <p class="hint">Kommissionen hören oft nur die ersten ein, zwei Minuten eines Stücks. Wer so übt, dass es erst im
      zweiten Chorus gut wird, verschenkt genau die Zeit, die zählt.</p>
    <button class="wide primary" id="sim-los">Simulation beginnen</button>
    <p class="hint">Stücke und Etüden kommen aus dem Prüfungs-Cockpit. Hat ein Stück dort denselben Titel wie unter
      „Eigene Stücke“, spielt auf Wunsch die Band.</p>
    ${alt.length ? `<h3>Zuletzt</h3>${alt.map(e => `
      <div class="sim-zeile"><b>${escapeHtml(e.datum)}</b>
        <span>${mmss(e.dauer || 0)} · ${e.sicher || 0} sicher, ${e.wackler || 0} Wackler, ${e.raus || 0} ausgestiegen</span></div>`).join("")}` : ""}`;

  $("#sim-opt-auf", root).addEventListener("click", () => { optionen.aufnahme = !optionen.aufnahme; renderStart(); });
  $("#sim-opt-unt", root).addEventListener("click", () => { optionen.unterbrechen = !optionen.unterbrechen; renderStart(); });
  $("#sim-los", root).addEventListener("click", beginne);
}

async function beginne() {
  const stationen = baueSimulation(state().drills, { heute: todayISO(), unterbrechen: optionen.unterbrechen });
  let mitAufnahme = optionen.aufnahme && rek.unterstuetzt();
  if (mitAufnahme) {
    try { await rek.starte(); }
    catch (e) { console.warn(e); toast("Mikrofon nicht verfügbar — es läuft ohne Aufnahme"); mitAufnahme = false; }
  }
  holdScreen();
  lauf = { stationen, i: -1, start: jetzt(), marken: [], mitAufnahme, timer: setInterval(tick, 250) };
  naechste();
}

/* --- Lauf -------------------------------------------------------------------- */

function naechste() {
  stoppeKlang();
  lauf.i++;
  if (lauf.i >= lauf.stationen.length) { beende(); return; }
  const s = lauf.stationen[lauf.i];
  lauf.stationStart = jetzt();
  lauf.aufgabe = 0;
  lauf.phase = s.art === "blatt" ? "ansehen" : null;
  lauf.danke = false;
  lauf.marken.push({ t: Math.round(jetzt() - lauf.start), id: s.id, titel: s.titel });
  renderStation();
  window.scrollTo(0, 0);
}

function renderStation() {
  const s = lauf.stationen[lauf.i];
  const song = s.art === "stueck" ? leadsheetFuer(s.titel) : null;
  const letzte = lauf.i === lauf.stationen.length - 1;

  root.innerHTML = `
    <div class="sim-kopf">
      <span>Teil ${lauf.i + 1} von ${lauf.stationen.length}</span>
      <span>${lauf.mitAufnahme ? `<i class="sim-rec"></i> ` : ""}<b id="sim-gesamt">${mmss(jetzt() - lauf.start)}</b></span>
    </div>
    <h1 class="sim-titel">${escapeHtml(s.titel)}</h1>
    ${s.platzhalter ? `<p class="hint">Im Cockpit ist hier noch kein Titel eingetragen. Spiel, was du dafür vorgesehen hast — oder merk dir, dass es fehlt.</p>` : ""}
    <p class="sim-was">${escapeHtml(s.was)}</p>
    <div class="clock sim-uhr" id="sim-uhr">${mmss(0)}</div>
    <p class="sim-danke" id="sim-danke" hidden>„Danke, das reicht.“</p>
    <div id="sim-inhalt"></div>
    <button class="wide primary sim-weiter" id="sim-weiter">${letzte ? "Fertig" : "Weiter"}</button>
    <button class="linkish" id="sim-abbruch">Simulation abbrechen</button>`;

  const inhalt = $("#sim-inhalt", root);
  if (s.art === "einstimmen") {
    inhalt.innerHTML = `<button class="wide" id="sim-a">Stimmton A (klingend)</button>`;
    $("#sim-a", root).addEventListener("click", () => playMelody([69], { noteDur: 3, a4: state().settings.a4 }));
  } else if (s.art === "stueck" || s.art === "etuede") {
    inhalt.innerHTML = `
      ${s.tempo ? `<p class="hint">Dein Tempo laut Cockpit: ${s.tempo}.</p>` : ""}
      ${song ? `<button class="wide" id="sim-band">${band.isRunning() ? "Band stoppen" : "Band mit Einzähler"}</button>
        <p class="hint">Die Band spielt „${escapeHtml(song.titel)}“ aus Eigene Stücke.</p>` : ""}`;
    $("#sim-band", root)?.addEventListener("click", () => bandUmschalten(song));
  } else if (s.art === "tonleitern") {
    renderAufgabe();
  } else if (s.art === "blatt") {
    renderBlatt();
  }

  $("#sim-weiter", root).addEventListener("click", naechste);
  $("#sim-abbruch", root).addEventListener("click", () => {
    if (!confirm("Simulation abbrechen? Die Aufnahme wird verworfen.")) return;
    abbrechen();
    renderStart();
  });
}

function renderAufgabe() {
  const s = lauf.stationen[lauf.i];
  const a = s.aufgaben[lauf.aufgabe];
  const inhalt = $("#sim-inhalt", root);
  inhalt.innerHTML = `
    <p class="hint">Aufgabe ${lauf.aufgabe + 1} von ${s.aufgaben.length}</p>
    <p class="sim-aufgabe">${escapeHtml(a.titel)}</p>
    <p class="hint">${a.akkord ? "Erst die Töne nennen, dann gebrochen über den ganzen Umfang." : "Erst die Vorzeichen nennen, dann über den ganzen Umfang, auf und ab."}</p>
    ${lauf.aufgabe < s.aufgaben.length - 1 ? `<button class="wide" id="sim-aufgabe-weiter">Nächste Aufgabe</button>` : ""}`;
  $("#sim-aufgabe-weiter", root)?.addEventListener("click", () => {
    lauf.aufgabe++;
    lauf.marken.push({ t: Math.round(jetzt() - lauf.start), id: s.id, titel: s.aufgaben[lauf.aufgabe].titel });
    renderAufgabe();
  });
}

function renderBlatt() {
  const s = lauf.stationen[lauf.i];
  const key = MAJOR_KEYS[s.seed % 9];
  const stueck = generateMelodie({ tonic: key.tonic, stufe: 3, takte: 8, beats: 4, seed: s.seed });
  const inhalt = $("#sim-inhalt", root);
  inhalt.innerHTML = `
    <div class="staff-wrap">${renderStaff({
      notes: autoBeam(stueck.noten.map(n => ({ ...n })), 1),
      keySig: stueck.keySig, timeSig: [4, 4], ariaLabel: "Blattlesen",
    })}</div>
    <p class="hint" id="sim-blatt-hinweis">${lauf.phase === "ansehen"
      ? `Ansehen, ${s.ansehen} Sekunden. Nicht spielen.`
      : "Einzählen lassen und einmal durch. Viertel = 80."}</p>
    <button class="wide" id="sim-einzaehlen"${lauf.phase === "ansehen" ? " hidden" : ""}>Einzählen</button>`;
  $("#sim-einzaehlen", root).addEventListener("click", () => {
    metro.configure({ bpm: 80, beats: 4 });
    metro.countIn(1);
  });
}

function tick() {
  if (!lauf || !root) return;
  const s = lauf.stationen[lauf.i];
  const inStation = jetzt() - lauf.stationStart;
  const g = $("#sim-gesamt", root);
  if (g) g.textContent = mmss(jetzt() - lauf.start);
  const uhr = $("#sim-uhr", root);
  if (!uhr || !s) return;

  if (s.art === "einstimmen") {
    const rest = Math.max(0, s.dauer - inStation);
    uhr.textContent = mmss(rest);
    uhr.classList.toggle("running", rest > 0);
    return;
  }
  if (s.art === "blatt" && lauf.phase === "ansehen") {
    const rest = Math.max(0, s.ansehen - inStation);
    uhr.textContent = mmss(rest);
    if (rest <= 0) {
      lauf.phase = "spielen";
      lauf.marken.push({ t: Math.round(jetzt() - lauf.start), id: s.id, titel: "Blattlesen: spielen" });
      $("#sim-blatt-hinweis", root).textContent = "Einzählen lassen und einmal durch. Viertel = 80.";
      $("#sim-einzaehlen", root).hidden = false;
    }
    return;
  }
  uhr.textContent = mmss(inStation);
  uhr.classList.add("running");

  if (s.unterbrechung != null && !lauf.danke && inStation >= s.unterbrechung) {
    lauf.danke = true;
    stoppeKlang();
    $("#sim-danke", root).hidden = false;
    // Zwei leise Töne, wie jemand, der sich räuspert: hörbar, nicht erschreckend.
    playMelody([76, 72], { noteDur: 0.25, gap: 0.08, amp: 0.12, a4: state().settings.a4 });
    const b = $("#sim-band", root);
    if (b) b.textContent = "Band mit Einzähler";
  }
}

/* --- Band --------------------------------------------------------------------- */

function leadsheetFuer(titel) {
  const t = titel.trim().toLowerCase();
  const songs = drill("leadsheets:liste", { songs: [] }).songs;
  const song = songs.find(x => (x.titel || "").trim().toLowerCase() === t);
  if (!song?.text) return null;
  const r = leseLeadsheet(song.text, { eingabe: song.eingabe || "klingend", naming: state().settings.naming });
  if (r.fehler.length || !r.akkorde.length) return null;
  return { ...song, akkorde: r.akkorde };
}

function bandUmschalten(song) {
  if (band.isRunning()) { band.stop(); }
  else {
    band.configure({
      akkorde: song.akkorde, bpm: song.tempo || 120, swing: song.swing ?? 0.62,
      a4: state().settings.a4, groove: song.groove || "swing", einzaehlen: true,
    });
    band.start();
  }
  const b = $("#sim-band", root);
  if (b) b.textContent = band.isRunning() ? "Band stoppen" : "Band mit Einzähler";
}

function stoppeKlang() {
  if (band.isRunning()) band.stop();
  if (metro.isRunning()) metro.stop();
}

/* --- Ende --------------------------------------------------------------------- */

async function beende() {
  const l = lauf;
  clearInterval(l.timer);
  lauf = null;
  stoppeKlang();
  releaseScreen();
  ende = { stationen: l.stationen, marken: l.marken, dauer: Math.round(jetzt() - l.start), urteile: {}, notiz: "", aufnahmeId: null, url: null };
  root.innerHTML = `<p class="hint">Aufnahme wird gespeichert …</p>`;
  if (l.mitAufnahme && rek.laeuft()) {
    try {
      const { blob, mime, dauer, spitze } = await rek.stoppe();
      const e = await db.speichere({
        titel: "Prüfungssimulation", datum: todayISO(), dauer, mime, groesse: blob.size, spitze, blob,
        notiz: "", marken: l.marken,
      });
      ende.aufnahmeId = e.id;
      ende.url = URL.createObjectURL(blob);
    } catch (err) {
      console.warn(err);
      toast("Aufnahme konnte nicht gespeichert werden");
    }
  }
  renderEnde();
}

function renderEnde() {
  const b = bilanz(ende.stationen, ende.urteile);
  const gewertet = ende.stationen.filter(s => s.art !== "einstimmen");
  root.innerHTML = `
    <h2>Wie war es?</h2>
    <p class="hint">${mmss(ende.dauer)} am Stück. Bewerte jeden Teil so, wie ihn die Kommission gehört hätte — nicht so,
      wie er sich angefühlt hat. Am besten nach dem Anhören.</p>
    ${ende.url ? `<audio controls preload="metadata" src="${ende.url}" id="sim-audio" class="sim-audio"></audio>` : ""}
    <div id="sim-urteile">${gewertet.map(s => {
      const marke = ende.marken.find(m => m.id === s.id);
      return `<div class="sim-urteil">
        <div class="sim-urteil-kopf">
          <b>${escapeHtml(s.titel)}</b>
          ${ende.url && marke ? `<button class="linkish" data-sprung="${marke.t}">ab ${mmss(marke.t)} anhören</button>` : ""}
        </div>
        <div class="chips" role="group" aria-label="${escapeHtml(s.titel)}">
          ${URTEILE.map(u => `<button class="chip${ende.urteile[s.id] === u.id ? " on" : ""}" data-station="${s.id}" data-urteil="${u.id}" title="${escapeHtml(u.was)}">${u.label}</button>`).join("")}
        </div>
      </div>`;
    }).join("")}</div>
    <p class="quiz-verdict" id="sim-bilanz">${escapeHtml(b.satz)}</p>
    ${b.fehlend.length ? `<p class="hint">Ohne Titel im Cockpit: ${escapeHtml(b.fehlend.join(", "))}. Eine Prüfung ohne festes Programm ist keine Simulation, sondern ein Vorspiel.</p>` : ""}
    <label class="feld">Notiz<textarea id="sim-notiz" placeholder="Was war anders als beim Üben? Wo kam die Nervosität?">${escapeHtml(ende.notiz)}</textarea></label>
    <button class="wide primary" id="sim-speichern">${ende.gespeichert ? "Gespeichert" : "Bewertung speichern"}</button>
    <button class="linkish" id="sim-neu">Zurück zum Start</button>`;

  $$("[data-urteil]", root).forEach(x => x.addEventListener("click", () => {
    ende.urteile[x.dataset.station] = x.dataset.urteil;
    ende.gespeichert = false;
    ende.notiz = $("#sim-notiz", root).value;
    const y = window.scrollY;
    renderEnde();
    window.scrollTo(0, y);
  }));
  $$("[data-sprung]", root).forEach(x => x.addEventListener("click", () => {
    const a = $("#sim-audio", root);
    if (!a) return;
    a.currentTime = Number(x.dataset.sprung);
    a.play();
  }));
  $("#sim-speichern", root).addEventListener("click", () => {
    ende.notiz = $("#sim-notiz", root).value;
    const bb = bilanz(ende.stationen, ende.urteile);
    const eintraege = liste();
    const neu = {
      id: ende.aufnahmeId || "s" + Date.now().toString(36),
      datum: todayISO(), dauer: ende.dauer,
      sicher: bb.sicher, wackler: bb.wackler, raus: bb.raus,
      teile: ende.stationen.filter(s => s.art !== "einstimmen").map(s => ({ id: s.id, titel: s.titel, urteil: ende.urteile[s.id] || null })),
      notiz: ende.notiz, aufnahme: ende.aufnahmeId,
    };
    const i = eintraege.findIndex(e => e.id === neu.id);
    if (i >= 0) eintraege[i] = neu; else eintraege.push(neu);
    if (eintraege.length > 30) eintraege.splice(0, eintraege.length - 30);
    save();
    ende.gespeichert = true;
    toast("Simulation gespeichert");
    $("#sim-speichern", root).textContent = "Gespeichert";
  });
  $("#sim-neu", root).addEventListener("click", () => {
    if (ende.url) URL.revokeObjectURL(ende.url);
    ende = null;
    renderStart();
  });
}

function abbrechen() {
  if (!lauf) return;
  clearInterval(lauf.timer);
  stoppeKlang();
  if (lauf.mitAufnahme) rek.verwerfe();
  releaseScreen();
  lauf = null;
}

export default {
  id: "simulation",
  label: "Simulation",
  mount(r) {
    root = r;
    if (lauf) renderStation();
    else if (ende) renderEnde();
    else renderStart();
    offBand = band.onStateChange(() => {
      const b = root && $("#sim-band", root);
      if (b) b.textContent = band.isRunning() ? "Band stoppen" : "Band mit Einzähler";
    });
  },
  unmount() {
    offBand?.(); offBand = null;
    // Wer mitten in der Simulation den Reiter wechselt, bricht sie ab —
    // eine Prüfung pausiert man nicht. Die Aufnahme wäre sonst ohne Ende.
    if (lauf) toast("Simulation abgebrochen");
    abbrechen();
    band.configure({ einzaehlen: false, groove: "swing" });
    root = null;
  },
};
