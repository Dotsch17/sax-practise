/* ==========================================================================
   Hörtest

   Der schriftliche Teil der Zulassungsprüfung, zum Üben. Die mdw spielt am
   Klavier vor, und man schreibt auf: Melodien tonal und freitonal, Rhythmen,
   Akkorde mit ihrer Lage, und man findet den Ton, der anders klingt, als er
   dasteht. Die Gehörbildung nebenan fragt Namen ab; hier wird notiert.

   Drei Entscheidungen, die man leicht für Bequemlichkeit hält:

   - **Beim Eintragen klingt nichts.** Im Prüfungsraum gibt es kein Klavier
     zum Nachprüfen. Wer sich jeden Ton vorspielen lässt, übt Probieren,
     nicht Hören.
   - **Die Oktave ergibt sich aus dem Schritt.** Man tippt den Tonnamen, und
     der Ton landet dort, wo er dem vorigen am nächsten ist — so denkt man
     beim Diktat: Schritt, Terz, Sprung. Liegt er eine Oktave daneben,
     korrigiert man es mit einem Tipp.
   - **Im tonalen Diktat zählt die Schreibweise.** Gis in a-Moll ist kein As;
     die Auswertung sagt es, statt es durchgehen zu lassen.

   „Melodie ergänzen“ ist das vollständige Melodiediktat, genau im Format
   des Mustertests der mdw: vier Takte stehen da, die nächsten vier schreibt
   man mit Tonhöhen und Rhythmus, dreimal wird vorgespielt, einen Punkt gibt
   es je Takt. Eingetragen wird wie auf Papier: erst der Notenwert, dann der
   Ton. Der Wert bleibt gewählt, bis man einen anderen tippt — in einer
   Achtelkette tippt man also nur Töne.

   Alles klingend, im Violinschlüssel. Die Logik steht in js/music/diktat.js.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast } from "../core/dom.js";
import { state, drill, scoreDrill, save } from "../core/store.js";
import { spell, toMidi, NAMING } from "../music/theory.js";
import { renderStaff, autoBeam, DUR } from "../music/notation.js";
import {
  MELODIE_STUFEN, melodieDiktat, vorzeichnungFuer, naechsteLage, vergleicheTonhoehen,
  rhythmusDiktat, palette, bausteinVon, bausteineZuNoten, passt, vergleicheRhythmus,
  AKKORD_ARTEN, AKKORD_STUFEN, UMKEHRUNGEN, akkordArtOf, baueAkkord,
  fehlerMelodie, fehlerAkkord, wiedererkennen, zeitplan,
  ERGAENZEN_STUFEN, melodieErgaenzen, notenwerte, eingabeZuNoten, vergleicheErgaenzung, ergaenzungsHinweise,
} from "../music/diktat.js";
import { audio } from "../audio/context.js";
import { playAt, playChord, playMelody, ok as sigOk, nope as sigNope } from "../audio/signals.js";

const MODI = [
  { id: "ergaenzen", label: "Melodie ergänzen" },
  { id: "melodie",  label: "Tonhöhen" },
  { id: "rhythmus", label: "Rhythmus" },
  { id: "akkorde",  label: "Akkorde" },
  { id: "fehler",   label: "Fehler finden" },
  { id: "wieder",   label: "Wiedererkennen" },
];

let sel = { modus: "ergaenzen", ergStufe: 2, melArt: "tonal", melStufe: 1, rhyStufe: 2, akkStufe: "drei", fehlerArt: "melodie" };
let wert = { dur: 1, dots: 0 };   // Melodie ergänzen: der gewählte Notenwert
let root = null;
let aufgabe = null;
let eingabe = [];          // Melodie: Tonhöhen, Rhythmus: Baustein-ids
let vorz = null;           // vorgewähltes Vorzeichen für den nächsten Ton
let gehoert = 0;
let ergebnis = null;       // nach dem Prüfen
let akkWahl = { art: null, umk: null };
let vorgewaehlt = null;

/** Die Prüfung schickt mit einem Modus hierher. */
export function vorwaehlen(modus) { vorgewaehlt = modus; }

const a4 = () => state().settings.a4;
const deutsch = () => state().settings.naming !== NAMING.EN;
const variante = () => ({
  ergaenzen: String(sel.ergStufe),
  melodie: `${sel.melArt}:${sel.melStufe}`, rhythmus: String(sel.rhyStufe),
  akkorde: sel.akkStufe, fehler: sel.fehlerArt, wieder: "3",
})[sel.modus];
const drillId = () => `hoertest:${sel.modus}:${variante()}`;
const BPM = { 1: 66, 2: 72, 3: 80 };

/* --- Aufgaben ------------------------------------------------------------------ */

/* Bei den Akkorden kommt öfter dran, was zuletzt falsch war — wie in der
   Gehörbildung. Sonst übt man den Dur-Sextakkord, den man kann, und nie den
   Terzquartakkord. */
function waehleAkkord() {
  const arten = AKKORD_STUFEN.find(s => s.id === sel.akkStufe).arten;
  const fehler = drill("hoertest:fehler:akkorde", {});
  const kandidaten = [];
  for (const art of arten) {
    const zahl = akkordArtOf(art).toene;
    for (let u = 0; u < zahl; u++) kandidaten.push({ art, u, w: 1 + 3 * (fehler[`${art}:${u}`] || 0) });
  }
  const summe = kandidaten.reduce((s, k) => s + k.w, 0);
  let x = Math.random() * summe;
  for (const k of kandidaten) { x -= k.w; if (x <= 0) return k; }
  return kandidaten[0];
}

function neueAufgabe() {
  eingabe = []; vorz = null; gehoert = 0; ergebnis = null; akkWahl = { art: null, umk: null };
  if (sel.modus === "ergaenzen") { aufgabe = melodieErgaenzen({ stufe: sel.ergStufe }); wert = { dur: 1, dots: 0 }; }
  else if (sel.modus === "melodie") aufgabe = melodieDiktat({ art: sel.melArt, stufe: sel.melStufe });
  else if (sel.modus === "rhythmus") aufgabe = rhythmusDiktat({ stufe: sel.rhyStufe });
  else if (sel.modus === "akkorde") { const k = waehleAkkord(); aufgabe = baueAkkord(k.art, k.u); }
  else if (sel.modus === "fehler") aufgabe = sel.fehlerArt === "melodie" ? fehlerMelodie() : fehlerAkkord();
  else aufgabe = wiedererkennen();
}

/* --- Spielen -------------------------------------------------------------------- */

function spieleMelodie(mitKadenz) {
  const ctx = audio();
  let t = ctx.currentTime + 0.12;
  if (mitKadenz && aufgabe.kadenz) {
    for (const akk of aufgabe.kadenz) {
      playAt(akk.map(midi => ({ midi, zeit: t, dauer: 0.8 })), { a4: a4(), amp: 0.1 });
      t += 0.85;
    }
    t += 0.6;
  }
  const z = zeitplan(aufgabe.noten, BPM[sel.melStufe] || 72, t);
  playAt(z.noten, { a4: a4() });
}

/* Ein Takt Einzähler, dann die ganze Periode. Die Kadenz nur auf
   Wunsch: in der Prüfung gibt es keine, die vier notierten Takte stellen
   die Tonart her. */
function spieleErgaenzung(nurKadenz) {
  const ctx = audio();
  let t = ctx.currentTime + 0.12;
  if (nurKadenz) {
    for (const akk of aufgabe.kadenz) {
      playAt(akk.map(midi => ({ midi, zeit: t, dauer: 0.8 })), { a4: a4(), amp: 0.1 });
      t += 0.85;
    }
    return;
  }
  const viertel = 60 / aufgabe.bpm;
  playAt(Array.from({ length: aufgabe.schlaege }, (_, i) => ({ midi: 91, zeit: t + i * viertel, dauer: 0.05 })), { a4: a4(), amp: 0.1 });
  const z = zeitplan(aufgabe.noten, aufgabe.bpm, t + aufgabe.schlaege * viertel);
  playAt(z.noten, { a4: a4() });
}

function spieleRhythmus() {
  const ctx = audio();
  const bpm = 76, viertel = 60 / bpm;
  const t0 = ctx.currentTime + 0.12;
  // Ein Takt Einzähler, dann der Rhythmus auf einem Ton. Die Dauer klingt
  // mit: eine Halbe und eine Viertel mit Pause sind verschiedene Rhythmen.
  playAt([0, 1, 2, 3].map(i => ({ midi: 91, zeit: t0 + i * viertel, dauer: 0.05 })), { a4: a4(), amp: 0.12 });
  const z = zeitplan(aufgabe.noten, bpm, t0 + 4 * viertel);
  playAt(z.noten.map(n => ({ ...n, midi: 69 })), { a4: a4(), amp: 0.22 });
}

function spiele(extra = null) {
  if (!aufgabe) return;
  if (sel.modus === "ergaenzen") {
    spieleErgaenzung(extra === "kadenz");
    if (extra === "kadenz") return;
    gehoert++;
    const z = $("#ht-gehoert", root);
    if (z) z.textContent = gehoert <= 3 ? `${gehoert} von 3` : `${gehoert}× — in der Prüfung nur dreimal`;
    return;
  }
  gehoert++;
  if (sel.modus === "melodie") spieleMelodie(extra === "kadenz" || (gehoert === 1 && sel.melArt === "tonal"));
  else if (sel.modus === "rhythmus") spieleRhythmus();
  else if (sel.modus === "akkorde") {
    if (extra === "gebrochen") playMelody(aufgabe.midis, { noteDur: 0.5, gap: 0.02, a4: a4() });
    else playChord(aufgabe.midis, { a4: a4(), dur: 2 });
  } else if (sel.modus === "fehler") {
    const midis = extra === "notiert" ? aufgabe.notiert.map(toMidi) : aufgabe.gespielt;
    if (sel.fehlerArt === "akkord" && extra !== "gebrochen" && extra !== "notiert") playChord(midis, { a4: a4(), dur: 2 });
    else playMelody(midis, { noteDur: 0.5, gap: 0.03, a4: a4() });
  } else {
    playMelody(aufgabe.gespielt, { noteDur: 0.5, gap: 0.03, a4: a4() });
  }
  const z = $("#ht-gehoert", root);
  if (z) z.textContent = `${gehoert}× gehört`;
}

/* --- Ansicht --------------------------------------------------------------------- */

function render() {
  if (!root) return;
  const d = drill(drillId(), { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
  const gesamt = d.right + d.wrong;
  const schnitt = sel.modus === "ergaenzen" && d.aufgaben
    ? `<span><b>${String(Math.round(10 * d.punkte / d.aufgaben) / 10).replace(".", ",")}</b> von 4 im Schnitt</span>`
    : `<span><b>${gesamt ? Math.round(100 * d.right / gesamt) : 0}</b> %</span>`;

  root.innerHTML = `
    <div class="chips scroll" id="ht-modi" role="group" aria-label="Aufgabe"></div>
    <div class="chips scroll" id="ht-var" role="group" aria-label="Stufe"></div>

    <div class="quiz">
      <div class="quiz-score">
        <span><b>${d.right}</b> richtig</span>
        <span><b>${d.streak}</b> in Folge${d.bestStreak ? ` · best ${d.bestStreak}` : ""}</span>
        ${schnitt}
      </div>
      <p class="hint" id="ht-was"></p>
      <button class="wide primary quiz-play" id="ht-play">Anhören</button>
      <div class="ht-nebenknoepfe" id="ht-neben"></div>
      <div id="ht-aufgabe"></div>
      <div id="ht-ergebnis" class="quiz-feedback" hidden></div>
    </div>`;

  renderModi();
  renderVarianten();
  $("#ht-play", root).addEventListener("click", () => spiele());
  renderNeben();
  renderAufgabe();
}

function renderModi() {
  const host = $("#ht-modi", root);
  host.innerHTML = "";
  for (const m of MODI) {
    host.append(el("button", {
      class: "chip" + (m.id === sel.modus ? " on" : ""), text: m.label,
      on: { click: () => { if (m.id === sel.modus) return; sel.modus = m.id; neueAufgabe(); render(); } },
    }));
  }
}

function renderVarianten() {
  const host = $("#ht-var", root);
  host.innerHTML = "";
  const chip = (label, an, fn) => host.append(el("button", {
    class: "chip" + (an ? " on" : ""), text: label, on: { click: () => { fn(); neueAufgabe(); render(); } },
  }));
  let was = "";
  if (sel.modus === "ergaenzen") {
    for (const s of ERGAENZEN_STUFEN) chip(s.label, sel.ergStufe === s.id, () => { sel.ergStufe = s.id; });
    const st = ERGAENZEN_STUFEN.find(s => s.id === sel.ergStufe);
    was = `${st.was}. Vier Takte stehen da, die nächsten vier schreibst du — Töne und Rhythmus. ` +
      "Takt 5 und 6 beginnen meist wie Takt 1 und 2: hör zuerst, ob und wo sie abweichen. Dreimal hören, wie in der Prüfung.";
  } else if (sel.modus === "melodie") {
    chip("tonal", sel.melArt === "tonal", () => { sel.melArt = "tonal"; });
    chip("freitonal", sel.melArt === "frei", () => { sel.melArt = "frei"; });
    for (const s of MELODIE_STUFEN) chip(s.label, sel.melStufe === s.id, () => { sel.melStufe = s.id; });
    const st = MELODIE_STUFEN.find(s => s.id === sel.melStufe);
    was = `${st.was}. Der Rhythmus steht da, der erste Ton ist gegeben — trag die Tonhöhen ein. ` +
      (sel.melArt === "tonal" ? "Beim ersten Hören kommt die Kadenz vorweg." : "Freitonal zählt jede Schreibweise, die richtig klingt.");
  } else if (sel.modus === "rhythmus") {
    for (const s of [1, 2, 3, 4]) chip(["Viertel", "Achtel", "Sechzehntel", "Synkopen"][s - 1], sel.rhyStufe === s, () => { sel.rhyStufe = s; });
    was = "Zwei Takte im Vierviertel, ein Takt wird eingezählt. Schlag für Schlag eintragen — die Dauer zählt mit: eine Halbe ist nicht dasselbe wie eine Viertel mit Pause.";
  } else if (sel.modus === "akkorde") {
    for (const s of AKKORD_STUFEN) chip(s.label, sel.akkStufe === s.id, () => { sel.akkStufe = s.id; });
    was = "Art und Lage. Hör zuerst auf den Bass: liegt der Grundton unten, die Terz, die Quinte oder die Septime? Das gibt die Lage, die Art hört man danach in den Intervallen darüber.";
  } else if (sel.modus === "fehler") {
    chip("Melodie", sel.fehlerArt === "melodie", () => { sel.fehlerArt = "melodie"; });
    chip("Akkord", sel.fehlerArt === "akkord", () => { sel.fehlerArt = "akkord"; });
    was = sel.fehlerArt === "melodie"
      ? "Lies mit, während es klingt. Ein Ton kann anders sein als notiert — oder keiner. Erst singen, was dasteht, dann hören."
      : "Der notierte Akkord, gespielt mit höchstens einem Ton einen Halbton daneben. Welcher? Die Töne stehen von unten nach oben.";
  } else {
    was = "Drei notierte Beispiele, eines wird gespielt. Vor dem Hören lesen und innerlich singen, wo sie sich unterscheiden — dann weißt du, worauf du hören musst.";
  }
  $("#ht-was", root).textContent = was;
}

function renderNeben() {
  const host = $("#ht-neben", root);
  const knopf = (label, extra) => `<button data-extra="${extra}">${label}</button>`;
  let k = "";
  if (sel.modus === "melodie" && sel.melArt === "tonal") k = knopf("Kadenz und Melodie", "kadenz");
  if (sel.modus === "ergaenzen") k = knopf("Nur Kadenz (Übung)", "kadenz");
  if (sel.modus === "akkorde") k = knopf("Gebrochen", "gebrochen");
  if (sel.modus === "fehler" && sel.fehlerArt === "akkord") k = knopf("Gebrochen", "gebrochen");
  const zaehler = sel.modus === "ergaenzen" ? `${gehoert} von 3` : `${gehoert}× gehört`;
  host.innerHTML = `<div class="row2">${k}<span class="ht-gehoert" id="ht-gehoert">${zaehler}</span></div>`;
  $$("button[data-extra]", host).forEach(b => b.addEventListener("click", () => spiele(b.dataset.extra)));
}

/* --- Melodie ----------------------------------------------------------------------- */

/** Vorzeichen, wie gedruckt: nur wo die Vorzeichnung es nicht schon sagt,
    im Takt nur beim ersten Mal. */
function setzeVorzeichen(noten, keySig) {
  let imTakt = new Map();
  for (const n of noten) {
    if (n.barline) { imTakt = new Map(); continue; }
    if (!n.pitch || n.state === "blass") continue;
    const id = n.pitch.step + ":" + n.pitch.octave;
    const erwartet = imTakt.has(id) ? imTakt.get(id) : vorzeichnungFuer(n.pitch.step, keySig);
    n.accidental = n.pitch.alter !== erwartet;
    imTakt.set(id, n.pitch.alter);
  }
  return noten;
}

function melodieNoten(zustaende = null) {
  let i = -1;
  const noten = aufgabe.noten.map(n => {
    if (n.barline || !n.pitch) return { ...n };
    i++;
    if (i === 0) return { ...n };                 // gegeben
    const x = eingabe[i - 1];
    if (x) return { ...n, pitch: x, state: zustaende ? (zustaende[i - 1] === "richtig" ? "richtig" : "falsch") : undefined };
    return { ...n, pitch: { step: 6, alter: 0, octave: 4 }, state: i - 1 === eingabe.length ? "aktiv-blass" : "blass" };
  });
  return autoBeam(setzeVorzeichen(noten, aufgabe.keySig));
}

function renderMelodie(host) {
  const soll = aufgabe.pitches.slice(1);
  const buchstaben = deutsch() ? ["C", "D", "E", "F", "G", "A", "H"] : ["C", "D", "E", "F", "G", "A", "B"];
  host.innerHTML = `
    <div class="staff-wrap">${renderStaff({
      notes: melodieNoten(ergebnis?.einzeln), keySig: aufgabe.keySig, timeSig: [4, 4],
      ariaLabel: "Dein Diktat", extraClass: aufgabe.noten.length > 14 ? "compact" : "",
    })}</div>
    <p class="hint">${ergebnis ? "" : `Ton ${Math.min(eingabe.length + 2, soll.length + 1)} von ${soll.length + 1}`}</p>
    ${ergebnis ? "" : `
    <div class="pad">
      <div class="pad-vz">
        ${[[-1, "♭"], [0, "♮"], [1, "♯"]].map(([v, z]) =>
          `<button class="vz${vorz === v ? " on" : ""}" data-vz="${v}" aria-label="Vorzeichen ${z}">${z}</button>`).join("")}
      </div>
      <div class="pad-toene">${buchstaben.map((b, step) =>
        `<button class="ton" data-step="${step}"${eingabe.length >= soll.length ? " disabled" : ""}>${b}</button>`).join("")}</div>
      <div class="pad-vz">
        <button id="ht-okt-ab" ${eingabe.length ? "" : "disabled"}>Oktave ↓</button>
        <button id="ht-okt-auf" ${eingabe.length ? "" : "disabled"}>Oktave ↑</button>
        <button id="ht-weg" ${eingabe.length ? "" : "disabled"}>Löschen</button>
      </div>
      <button class="wide primary" id="ht-pruefen" ${eingabe.length ? "" : "disabled"}>Prüfen</button>
    </div>`}`;

  if (ergebnis) return;
  $$(".vz", host).forEach(b => b.addEventListener("click", () => {
    const v = Number(b.dataset.vz);
    vorz = vorz === v ? null : v;
    renderAufgabe();
  }));
  $$(".ton", host).forEach(b => b.addEventListener("click", () => {
    if (eingabe.length >= soll.length) return;
    const step = Number(b.dataset.step);
    const alter = vorz ?? vorzeichnungFuer(step, aufgabe.keySig);
    const vorher = eingabe[eingabe.length - 1] || aufgabe.pitches[0];
    eingabe.push(naechsteLage(step, alter, vorher));
    vorz = null;
    renderAufgabe();
  }));
  const oktave = d => {
    const x = eingabe[eingabe.length - 1];
    if (!x) return;
    const neu = { ...x, octave: x.octave + d };
    if (toMidi(neu) < 48 || toMidi(neu) > 88) return;
    eingabe[eingabe.length - 1] = neu;
    renderAufgabe();
  };
  $("#ht-okt-ab", host).addEventListener("click", () => oktave(-1));
  $("#ht-okt-auf", host).addEventListener("click", () => oktave(1));
  $("#ht-weg", host).addEventListener("click", () => { eingabe.pop(); renderAufgabe(); });
  $("#ht-pruefen", host).addEventListener("click", () => {
    ergebnis = vergleicheTonhoehen(soll, eingabe, { enharmonischOk: sel.melArt === "frei" });
    werte(ergebnis.alles);
    renderAufgabe();
    zeigeErgebnis(melodieText());
  });
}

function melodieText() {
  const name = p => spell(p, state().settings.naming) + p.octave;
  const hinweise = ergebnis.einzeln.map((e, i) => {
    const s = aufgabe.pitches[i + 1];
    if (e === "enharmonisch") return `Ton ${i + 2}: klingt richtig, heißt hier aber ${name(s)}.`;
    if (e === "oktave") return `Ton ${i + 2}: richtiger Ton, aber ${name(s)}.`;
    if (e === "falsch") return `Ton ${i + 2} ist ein ${name(s)}.`;
    if (e === "fehlt") return `Ton ${i + 2} fehlt: ${name(s)}.`;
    return null;
  }).filter(Boolean);
  const tonart = aufgabe.tonart ? ` · ${aufgabe.tonart.name}${aufgabe.moll ? " (harmonisch)" : ""}` : "";
  return {
    titel: ergebnis.alles ? "Alles richtig" : `${ergebnis.richtig} von ${ergebnis.gesamt} Tönen richtig`,
    text: hinweise.join(" ") + tonart,
    loesung: renderStaff({ notes: autoBeam(setzeVorzeichen(aufgabe.noten.map(n => ({ ...n })), aufgabe.keySig)),
      keySig: aufgabe.keySig, timeSig: [4, 4], ariaLabel: "Lösung", extraClass: "compact" }),
  };
}

/* --- Melodie ergänzen --------------------------------------------------------------- */

const H4 = { step: 6, alter: 0, octave: 4 };
const gleicherWert = (a, b) => a.dur === b.dur && (a.dots || 0) === (b.dots || 0);
const wertName = w => ({ "4:0": "Ganze", "2:1": "punktierte Halbe", "2:0": "Halbe", "1:1": "punktierte Viertel",
  "1:0": "Viertel", "0.5:1": "punktierte Achtel", "0.5:0": "Achtel", "0.25:0": "Sechzehntel" })[`${w.dur}:${w.dots || 0}`] || "Wert";

/* Vier Takte in einer Zeile, am schmalen Telefon zwei Zeilen zu je zwei.
   Eine Sechzehntelkette auf vier Takten wäre dort sonst zu klein zum Lesen. */
function zeilen(noten, { keySig, timeSig = null, label }) {
  const jeZeile = (root?.clientWidth || 800) < 520 ? 2 : 4;
  const teile = [[]];
  let takt = 0;
  for (const n of noten) {
    if (n.barline === true) {
      takt++;
      if (takt % jeZeile === 0) { teile[teile.length - 1].push({ barline: true }); teile.push([]); continue; }
    }
    teile[teile.length - 1].push(n);
  }
  const svgs = teile.filter(t => t.some(n => !n.barline)).map((t, i) => renderStaff({
    notes: autoBeam(t), keySig, timeSig: i === 0 ? timeSig : null, ariaLabel: label, extraClass: "passend",
  }));
  return svgs.map(svg => `<div class="staff-wrap">${massstab(svg)}</div>`).join("");
}

/* Alle Notenzeilen eines Diktats im selben Maßstab: so groß wie möglich,
   aber so, dass die breiteste Zeile ganz hineinpasst. Jede Zeile einzeln
   auf die Breite zu ziehen machte eine Zeile mit zwei Noten riesig und
   eine Sechzehntelkette winzig. */
const BREITESTE = 900;     // viewBox-Breite, bis zu der noch gemeinsam skaliert wird
function massstab(svg) {
  const m = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!m) return svg;
  const platz = Math.max(200, (root?.clientWidth || 600) - 24);
  const jeEinheit = Math.min(128 / Number(m[2]), platz / Math.min(BREITESTE, zeilenBreite));
  const breite = Math.min(platz, Number(m[1]) * jeEinheit);
  return svg.replace("<svg ", `<svg style="width:${breite.toFixed(0)}px" `);
}
let zeilenBreite = 600;

function renderErgaenzen(host) {
  const stand = eingabeZuNoten(eingabe, aufgabe.schlaege);
  // Maßstab aus der Vorgabe: die gesuchten Takte haben ungefähr gleich viele Noten.
  zeilenBreite = 0;
  zeilen(setzeVorzeichen(aufgabe.vorgabe.map(n => ({ ...n })), aufgabe.keySig), { keySig: aufgabe.keySig, timeSig: [aufgabe.schlaege, 4], label: "" })
    .replace(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+)/g, (_, w) => { zeilenBreite = Math.max(zeilenBreite, Number(w)); return ""; });
  zeilenBreite = Math.max(zeilenBreite, 300);
  const wertListe = notenwerte(aufgabe.stufe, aufgabe.schlaege);
  const passtWert = stand.rest >= wert.dur * (wert.dots ? 1.5 : 1) - 1e-6;
  const buchstaben = deutsch() ? ["C", "D", "E", "F", "G", "A", "H"] : ["C", "D", "E", "F", "G", "A", "B"];

  let k = 0;
  const eigene = stand.noten.map(n => {
    if (n.barline || !ergebnis) return { ...n };
    return { ...n, state: ergebnis.einzeln[k++] };
  });
  const mini = w => renderStaff({ notes: [{ pitch: H4, dur: w.dur, dots: w.dots }], showClef: false,
    leftPad: 10, rightPad: 10, padTop: 12, padBottom: 12, extraClass: "mini", ariaLabel: wertName(w) });

  host.innerHTML = `
    <p class="hint">${escapeHtml(aufgabe.tonart.name)}${aufgabe.moll ? " (harmonisch)" : ""} · ${aufgabe.schlaege}/4 · Takt 1 bis 4</p>
    ${zeilen(setzeVorzeichen(aufgabe.vorgabe.map(n => ({ ...n })), aufgabe.keySig),
      { keySig: aufgabe.keySig, timeSig: [aufgabe.schlaege, 4], label: "Vorgegeben, Takt 1 bis 4" })}
    <p class="hint">Takt 5 bis 8${ergebnis ? "" : stand.voll ? " — vollständig" : ` · jetzt Takt ${stand.takt + 4}, Schlag ${stand.schlag}`}</p>
    ${eingabe.length ? zeilen(setzeVorzeichen(eigene, aufgabe.keySig), { keySig: aufgabe.keySig, label: "Dein Diktat, Takt 5 bis 8" })
      : `<div class="staff-wrap"><p class="hint ht-leer">Erst den Notenwert, dann den Ton.</p></div>`}
    ${ergebnis ? "" : `
    <div class="palette ht-werte">${wertListe.map(w => `
      <button class="zelle${gleicherWert(w, wert) ? " on" : ""}" data-dur="${w.dur}" data-dots="${w.dots}"
        ${stand.voll || w.laenge > stand.rest + 1e-6 ? "disabled" : ""} aria-label="${wertName(w)}">${mini(w)}</button>`).join("")}</div>
    <div class="pad">
      <div class="pad-vz">
        ${[[-1, "♭"], [0, "♮"], [1, "♯"]].map(([v, z]) =>
          `<button class="vz${vorz === v ? " on" : ""}" data-vz="${v}" aria-label="Vorzeichen ${z}">${z}</button>`).join("")}
        <button id="ht-pause" ${stand.voll || !passtWert ? "disabled" : ""}>Pause</button>
      </div>
      <div class="pad-toene">${buchstaben.map((b, step) =>
        `<button class="ton" data-step="${step}"${stand.voll || !passtWert ? " disabled" : ""}>${b}</button>`).join("")}</div>
      <div class="pad-vz">
        <button id="ht-okt-ab" ${eingabe.some(e => e.pitch) ? "" : "disabled"}>Oktave ↓</button>
        <button id="ht-okt-auf" ${eingabe.some(e => e.pitch) ? "" : "disabled"}>Oktave ↑</button>
        <button id="ht-weg" ${eingabe.length ? "" : "disabled"}>Löschen</button>
      </div>
      ${!stand.voll && !passtWert ? `<p class="hint">Eine ${wertName(wert)} passt nicht mehr in diesen Takt.</p>` : ""}
      <button class="wide primary" id="ht-pruefen" ${stand.voll ? "" : "disabled"}>Prüfen</button>
    </div>`}`;

  if (ergebnis) return;
  $$(".zelle", host).forEach(b => b.addEventListener("click", () => {
    wert = { dur: Number(b.dataset.dur), dots: Number(b.dataset.dots) };
    renderAufgabe();
  }));
  $$(".vz", host).forEach(b => b.addEventListener("click", () => {
    const v = Number(b.dataset.vz);
    vorz = vorz === v ? null : v;
    renderAufgabe();
  }));
  const letzterTon = () => [...eingabe].reverse().find(e => e.pitch)?.pitch || aufgabe.letzterVorgabeTon;
  $$(".ton", host).forEach(b => b.addEventListener("click", () => {
    const step = Number(b.dataset.step);
    const alter = vorz ?? vorzeichnungFuer(step, aufgabe.keySig);
    eingabe.push({ pitch: naechsteLage(step, alter, letzterTon()), ...wert });
    vorz = null;
    renderAufgabe();
  }));
  $("#ht-pause", host).addEventListener("click", () => { eingabe.push({ pitch: null, ...wert }); renderAufgabe(); });
  const oktave = d => {
    const i = eingabe.map(e => !!e.pitch).lastIndexOf(true);
    if (i < 0) return;
    const neu = { ...eingabe[i].pitch, octave: eingabe[i].pitch.octave + d };
    if (toMidi(neu) < 48 || toMidi(neu) > 88) return;
    eingabe[i] = { ...eingabe[i], pitch: neu };
    renderAufgabe();
  };
  $("#ht-okt-ab", host).addEventListener("click", () => oktave(-1));
  $("#ht-okt-auf", host).addEventListener("click", () => oktave(1));
  $("#ht-weg", host).addEventListener("click", () => { eingabe.pop(); renderAufgabe(); });
  $("#ht-pruefen", host).addEventListener("click", () => {
    ergebnis = vergleicheErgaenzung(aufgabe.gesucht, stand.noten, aufgabe.schlaege);
    // Für die Statistik zählt eine Aufgabe als geschafft ab drei von vier
    // Punkten; die Punkte selbst stehen daneben.
    const d = drill(drillId(), { right: 0, wrong: 0, streak: 0, bestStreak: 0 });
    d.punkte = (d.punkte || 0) + ergebnis.punkte;
    d.aufgaben = (d.aufgaben || 0) + 1;
    werte(ergebnis.punkte >= 3);
    renderAufgabe();
    const komma = x => String(x).replace(".", ",");
    zeigeErgebnis({
      titel: ergebnis.alles ? "Alles richtig: 4 von 4 Punkten" : `${komma(ergebnis.punkte)} von 4 Punkten`,
      text: ergaenzungsHinweise(ergebnis).join(" "),
      loesung: zeilen(setzeVorzeichen(aufgabe.gesucht.map(n => ({ ...n })), aufgabe.keySig),
        { keySig: aufgabe.keySig, label: "Lösung, Takt 5 bis 8" }),
    });
  });
}

/* --- Rhythmus ---------------------------------------------------------------------- */

function renderRhythmus(host) {
  const stand = bausteineZuNoten(eingabe, 4, 2);
  const pal = palette(sel.rhyStufe);
  host.innerHTML = `
    <div class="staff-wrap">${stand.noten.length ? renderStaff({
      notes: autoBeam(stand.noten.map(n => ({ ...n }))), timeSig: [4, 4], ariaLabel: "Dein Rhythmus",
    }) : `<p class="hint ht-leer">Noch nichts eingetragen.</p>`}</div>
    ${ergebnis ? "" : `
    <p class="hint">Takt ${Math.min(2, Math.floor(stand.pos / 4) + 1)}, Schlag ${stand.voll ? 4 : Math.floor(stand.pos % 4) + 1}</p>
    <div class="palette">${pal.map(b => `
      <button class="zelle" data-id="${b.id}" ${stand.voll || !passt(b, stand.rest) ? "disabled" : ""}
        aria-label="${b.laenge} ${b.laenge === 1 ? "Schlag" : "Schläge"}">
        ${renderStaff({ notes: autoBeam(b.teile.map(t => ({ pitch: t.pause ? null : { step: 6, alter: 0, octave: 4 }, dur: t.dur, dots: t.dots || 0 }))),
          showClef: false, leftPad: 6, rightPad: 6, padTop: 12, padBottom: 12, extraClass: "mini", ariaLabel: "Baustein" })}
      </button>`).join("")}</div>
    <div class="row2">
      <button id="ht-weg" ${eingabe.length ? "" : "disabled"}>Löschen</button>
      <button id="ht-pruefen" class="weiter" ${stand.voll ? "" : "disabled"}>Prüfen</button>
    </div>`}`;

  if (ergebnis) return;
  $$(".zelle", host).forEach(b => b.addEventListener("click", () => { eingabe.push(b.dataset.id); renderAufgabe(); }));
  $("#ht-weg", host).addEventListener("click", () => { eingabe.pop(); renderAufgabe(); });
  $("#ht-pruefen", host).addEventListener("click", () => {
    ergebnis = vergleicheRhythmus(aufgabe.noten, stand.noten, 8);
    werte(ergebnis.alles);
    renderAufgabe();
    const falsch = ergebnis.einzeln.map((r, i) => r ? null : `Takt ${Math.floor(i / 4) + 1} Schlag ${i % 4 + 1}`).filter(Boolean);
    zeigeErgebnis({
      titel: ergebnis.alles ? "Alles richtig" : `${ergebnis.richtig} von 8 Schlägen richtig`,
      text: falsch.length ? "Daneben: " + falsch.join(", ") + "." : "",
      loesung: renderStaff({ notes: autoBeam(aufgabe.noten.map(n => ({ ...n }))), timeSig: [4, 4],
        ariaLabel: "Lösung", extraClass: "compact" }),
    });
  });
}

/* --- Akkorde ------------------------------------------------------------------------- */

function renderAkkorde(host) {
  const arten = AKKORD_STUFEN.find(s => s.id === sel.akkStufe).arten.map(akkordArtOf);
  const zahl = akkWahl.art ? akkordArtOf(akkWahl.art).toene : Math.max(...arten.map(a => a.toene));
  const lagen = akkWahl.art ? UMKEHRUNGEN[zahl]
    : ["Grundstellung", "1. Umkehrung", "2. Umkehrung", "3. Umkehrung"].slice(0, zahl);
  const zu = ergebnis !== null;
  host.innerHTML = `
    <h3>Art</h3>
    <div class="answers" id="ht-arten">${arten.map(a => `
      <button class="answer${akkWahl.art === a.id ? " gewaehlt" : ""}${zu && a.id === aufgabe.art ? " richtig" : ""}${zu && akkWahl.art === a.id && a.id !== aufgabe.art ? " falsch" : ""}"
        data-art="${a.id}" ${zu ? "disabled" : ""}>${escapeHtml(a.label)}</button>`).join("")}</div>
    <h3>Lage</h3>
    <div class="answers" id="ht-lagen">${lagen.map((l, u) => `
      <button class="answer${akkWahl.umk === u ? " gewaehlt" : ""}${zu && u === aufgabe.umkehrung ? " richtig" : ""}${zu && akkWahl.umk === u && u !== aufgabe.umkehrung ? " falsch" : ""}"
        data-umk="${u}" ${zu ? "disabled" : ""}>${escapeHtml(l)}</button>`).join("")}</div>`;
  if (zu) return;
  const pruefe = () => {
    if (akkWahl.art === null || akkWahl.umk === null) return;
    const richtig = akkWahl.art === aufgabe.art && akkWahl.umk === aufgabe.umkehrung;
    ergebnis = { alles: richtig };
    const f = drill("hoertest:fehler:akkorde", {});
    const k = `${aufgabe.art}:${aufgabe.umkehrung}`;
    f[k] = Math.max(0, (f[k] || 0) + (richtig ? -1 : 2));
    save();
    werte(richtig);
    renderAufgabe();
    const art = akkordArtOf(aufgabe.art);
    const toene = aufgabe.toene.map(p => spell(p, state().settings.naming)).join(" – ");
    const g = spell(aufgabe.root, state().settings.naming);
    const grund = g.charAt(0).toUpperCase() + g.slice(1);
    zeigeErgebnis({
      titel: `${richtig ? "Richtig: " : "Das war "}${grund} ${art.label}, ${UMKEHRUNGEN[art.toene][aufgabe.umkehrung]}`,
      text: `Von unten: ${toene}.`,
      loesung: renderStaff({ notes: aufgabe.toene.map(p => ({ pitch: p, dur: DUR.halbe, accidental: p.alter !== 0 })),
        ariaLabel: "Lösung, von unten nach oben", extraClass: "compact" }),
    });
  };
  $$("[data-art]", host).forEach(b => b.addEventListener("click", () => {
    akkWahl.art = b.dataset.art;
    if (akkWahl.umk !== null && akkWahl.umk >= akkordArtOf(akkWahl.art).toene) akkWahl.umk = null;
    renderAufgabe(); pruefe();
  }));
  $$("[data-umk]", host).forEach(b => b.addEventListener("click", () => {
    akkWahl.umk = Number(b.dataset.umk); renderAufgabe(); pruefe();
  }));
}

/* --- Fehler finden ----------------------------------------------------------------------- */

function renderFehler(host) {
  const melodie = sel.fehlerArt === "melodie";
  const noten = aufgabe.notiert.map((p, i) => ({
    pitch: p, dur: melodie ? DUR.viertel : DUR.halbe, label: String(i + 1),
    state: ergebnis && i === aufgabe.antwort ? "aktiv" : undefined,
  }));
  const keySig = melodie ? aufgabe.keySig : 0;
  const zu = ergebnis !== null;
  const wahl = ergebnis?.wahl;
  const knoepfe = aufgabe.notiert.map((p, i) => ({ wert: i, label: melodie ? `Ton ${i + 1}` : `${i + 1} · ${spell(p, state().settings.naming)}` }))
    .filter(k => !melodie || k.wert > 0);
  knoepfe.push({ wert: -1, label: "Kein Fehler" });
  host.innerHTML = `
    <div class="staff-wrap">${renderStaff({ notes: setzeVorzeichen(noten, keySig), keySig, ariaLabel: "Notiert" })}</div>
    <div class="answers">${knoepfe.map(k => `
      <button class="answer${zu && k.wert === aufgabe.antwort ? " richtig" : ""}${zu && k.wert === wahl && wahl !== aufgabe.antwort ? " falsch" : ""}"
        data-wert="${k.wert}" ${zu ? "disabled" : ""}>${escapeHtml(k.label)}</button>`).join("")}</div>`;
  if (zu) return;
  $$("[data-wert]", host).forEach(b => b.addEventListener("click", () => {
    const w = Number(b.dataset.wert);
    ergebnis = { alles: w === aufgabe.antwort, wahl: w };
    werte(ergebnis.alles);
    renderAufgabe();
    let text;
    if (aufgabe.antwort === -1) text = "Gespielt wurde genau, was dasteht.";
    else {
      const d = aufgabe.gespielt[aufgabe.antwort] - toMidi(aufgabe.notiert[aufgabe.antwort]);
      const wie = Math.abs(d) === 1 ? "einen Halbton" : "einen Ganzton";
      text = `${melodie ? "Ton" : "Stimme"} ${aufgabe.antwort + 1} klang ${wie} ${d > 0 ? "höher" : "tiefer"} als notiert.`;
    }
    zeigeErgebnis({ titel: ergebnis.alles ? "Richtig" : "Daneben", text, vergleich: true });
  }));
}

/* --- Wiedererkennen ------------------------------------------------------------------------ */

function renderWieder(host) {
  const zu = ergebnis !== null;
  host.innerHTML = `<div class="wk">${aufgabe.varianten.map((v, i) => `
    <button class="wk-karte${zu && i === aufgabe.antwort ? " richtig" : ""}${zu && i === ergebnis.wahl && i !== aufgabe.antwort ? " falsch" : ""}"
      data-i="${i}" ${zu ? "disabled" : ""}>
      <b>${"ABC"[i]}</b>
      ${renderStaff({ notes: setzeVorzeichen(v.map(p => ({ pitch: p, dur: DUR.viertel })), aufgabe.keySig),
        keySig: aufgabe.keySig, extraClass: "compact", ariaLabel: "Beispiel " + "ABC"[i] })}
    </button>`).join("")}</div>`;
  if (zu) return;
  $$(".wk-karte", host).forEach(b => b.addEventListener("click", () => {
    const w = Number(b.dataset.i);
    ergebnis = { alles: w === aufgabe.antwort, wahl: w };
    werte(ergebnis.alles);
    renderAufgabe();
    zeigeErgebnis({ titel: ergebnis.alles ? "Richtig" : `Gespielt wurde ${"ABC"[aufgabe.antwort]}`, text: "" });
  }));
}

/* --- Gemeinsam ------------------------------------------------------------------------------ */

function renderAufgabe() {
  const host = $("#ht-aufgabe", root);
  if (!host || !aufgabe) return;
  ({ ergaenzen: renderErgaenzen, melodie: renderMelodie, rhythmus: renderRhythmus, akkorde: renderAkkorde,
     fehler: renderFehler, wieder: renderWieder })[sel.modus](host);
}

function werte(richtig) {
  scoreDrill(drillId(), richtig);
  richtig ? sigOk() : sigNope();
}

function zeigeErgebnis({ titel, text, loesung = "", vergleich = false }) {
  const host = $("#ht-ergebnis", root);
  host.hidden = false;
  host.innerHTML = `
    <p class="quiz-verdict">${escapeHtml(titel)}</p>
    ${text ? `<p class="hint">${escapeHtml(text)}</p>` : ""}
    ${loesung ? (loesung.startsWith('<div class="staff-wrap">') ? loesung : `<div class="staff-wrap">${loesung}</div>`) : ""}
    <div class="row2">
      <button id="ht-nochmal">Nochmal hören</button>
      ${vergleich ? `<button id="ht-notiert">Wie notiert</button>` : ""}
      <button id="ht-weiter" class="weiter">Weiter</button>
    </div>`;
  $("#ht-nochmal", host).addEventListener("click", () => spiele(sel.modus === "melodie" ? "kadenz" : null));
  $("#ht-notiert", host)?.addEventListener("click", () => spiele("notiert"));
  $("#ht-weiter", host).addEventListener("click", () => { neueAufgabe(); render(); spiele(); });
  $("#ht-weiter", host).focus();
}

export default {
  id: "hoertest",
  label: "Hörtest",
  mount(r) {
    root = r;
    if (vorgewaehlt && MODI.some(m => m.id === vorgewaehlt)) { sel.modus = vorgewaehlt; aufgabe = null; }
    vorgewaehlt = null;
    if (!aufgabe) neueAufgabe();
    render();
  },
  unmount() { root = null; },
};
