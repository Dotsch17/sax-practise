/* ==========================================================================
   Vibrato

   Einen langen Ton spielen, mit Vibrato, und sehen, was wirklich passiert:
   wie schnell, wie tief, wie gleichmäßig, ab wann, und ob die Welle unter
   dem Ton bleibt. Man hört das eigene Vibrato beim Spielen schlecht — die
   Kieferbewegung ist zu nah —, und genau deshalb lohnt es sich hier, auf
   die Zahlen und die Kurve zu schauen.

   Vier Stile, weil das richtige Vibrato vom Stil abhängt: klassisch,
   Pop, die Metronom-Übung aus dem Wissensteil und der Shake. Die Grenzen
   sind Richtwerte; das Ohr und der Lehrer haben das letzte Wort.

   Gemessen wird mit 60 Punkten je Sekunde und den Rohwerten der
   Tonhöhenerkennung, sonst glättet die Messung weg, was sie messen soll.
   Die Rechnung steht in js/music/vibrato.js.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO, clamp } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { freqToMidi, spell, fromMidi } from "../music/theory.js";
import { STILE, analysiere, urteil, ohneAusreisser, ohneRaender } from "../music/vibrato.js";
import * as pitch from "../audio/pitch.js";
import * as metro from "../audio/metronome.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let root = null;
let stil = "klassik";
let proSchlag = 4;
let mikro = false;
let offPitch = null, offMetro = null;
let versuch = null, stilleSeit = 0;
let letztes = null;             // { analyse, urteil, ton }

const bpm = () => clamp(state().settings.vibratoBpm || 72, 40, 160);
const verlauf = s => drill(`vibrato:${s}`, { messungen: [] }).messungen;
const komma = x => String(x).replace(".", ",");

/* --- Ansicht ------------------------------------------------------------------ */

function render() {
  if (!root) return;
  const s = STILE.find(x => x.id === stil);
  const soll = Math.round(bpm() / 60 * proSchlag * 10) / 10;
  const alt = verlauf(stil).slice(-5);
  const schnitt = alt.length ? {
    rate: Math.round(alt.reduce((a, m) => a + m.rate, 0) / alt.length * 10) / 10,
    tiefe: Math.round(alt.reduce((a, m) => a + m.tiefe, 0) / alt.length),
    gut: alt.filter(m => m.gut).length,
  } : null;

  root.innerHTML = `
    <div class="chips scroll" id="vb-stil" role="group" aria-label="Stil"></div>
    <p class="hint">${escapeHtml(s.was)}</p>

    ${stil === "metronom" ? `
      <div class="grid3">
        <label>Tempo<input type="number" id="vb-bpm" min="40" max="160" value="${bpm()}"></label>
        <label>Wellen je Schlag
          <select id="vb-pro">${[2, 3, 4, 5, 6].map(n => `<option value="${n}"${n === proSchlag ? " selected" : ""}>${n}</option>`).join("")}</select>
        </label>
      </div>
      <p class="hint">Ziel: ${komma(soll)} Wellen je Sekunde. Mit Kopfhörern für das Metronom — sonst hört das Mikrofon den Klick.
        Anfangen mit zwei je Schlag, erst wenn es gleichmäßig ist, drei, dann vier.</p>
      <button class="wide" id="vb-metro">${metro.isRunning() ? "Metronom aus" : "Metronom an"}</button>` : ""}

    <button class="wide${mikro ? "" : " primary"}" id="vb-mikro">${mikro ? "Mikrofon aus" : "Mikrofon an"}</button>
    <p class="hint" id="vb-status">${mikro ? "Einen langen Ton spielen, zwei bis vier Sekunden, dann absetzen." : ""}</p>

    <div id="vb-ergebnis">${letztes ? ergebnisHtml(letztes) : ""}</div>

    ${schnitt ? `<p class="hint spaced">Deine letzten ${alt.length} Messungen hier: im Schnitt ${komma(schnitt.rate)} Wellen je
      Sekunde, ${schnitt.tiefe} Cent tief, ${schnitt.gut} davon sitzen.</p>` : ""}
    <p class="hint">Das Saxophon-Vibrato kommt aus einer kleinen Bewegung des Unterkiefers und liegt unter dem Ton.
      Mehr dazu im Wissensteil unter „Vibrato“.</p>`;

  const chips = $("#vb-stil", root);
  for (const x of STILE) chips.append(el("button", {
    class: "chip" + (x.id === stil ? " on" : ""), text: x.name,
    on: { click: () => { stil = x.id; letztes = null; render(); } },
  }));
  $("#vb-mikro", root).addEventListener("click", () => mikro ? stoppe() : starte());
  $("#vb-bpm", root)?.addEventListener("change", e => {
    state().settings.vibratoBpm = clamp(Number(e.target.value) || 72, 40, 160);
    save();
    metro.configure({ bpm: bpm() });
    render();
  });
  $("#vb-pro", root)?.addEventListener("change", e => { proSchlag = Number(e.target.value); render(); });
  $("#vb-metro", root)?.addEventListener("click", () => {
    metro.configure({ bpm: bpm() });
    metro.toggle();
    render();
  });
}

function ergebnisHtml({ a, u, ton }) {
  const zeile = (name, wert) => `<div class="vb-wert"><span>${name}</span><b>${wert}</b></div>`;
  return `<div class="vb-karte${u.gut ? " gut" : ""}">
    <p class="quiz-verdict">${u.gut ? "✓ " : ""}${escapeHtml(u.text)}</p>
    ${a?.vibrato ? `<div class="vb-werte">
      ${zeile("Geschwindigkeit", `${komma(a.rate)} /s`)}
      ${zeile("Tiefe", `${a.tiefe} Cent`)}
      ${zeile("Gleichmäßig", `${Math.round(a.gleich * 100)} %`)}
      ${zeile("Einsatz", a.einsatz ? `${a.einsatz} ms` : "sofort")}
    </div>` : ""}
    ${a ? kurveSvg(a) : ""}
    ${u.hinweise.length ? `<ul class="pop-fehler">${u.hinweise.map(h => `<li>${escapeHtml(h)}</li>`).join("")}</ul>` : ""}
    ${ton ? `<p class="hint">Gemessen auf ${escapeHtml(ton)}, gegriffen.</p>` : ""}
  </div>`;
}

/* Die Kurve: Tonhöhe in Cent über der Zeit, gestrichelt der nächste
   Halbton — die Linie, unter der das Vibrato bleiben soll. */
function kurveSvg(a) {
  const W = 320, H = 110, pad = 6;
  const zeiten = a.zeiten, werte = a.kurve;
  if (!zeiten?.length) return "";
  const tMax = zeiten[zeiten.length - 1] || 1;
  const spanne = Math.max(40, ...werte.map(Math.abs), Math.abs(a.tonLinie) + 10);
  const x = t => pad + (W - 2 * pad) * t / tMax;
  const y = c => H / 2 - (H / 2 - pad) * c / spanne;
  const pfad = werte.map((c, i) => `${i ? "L" : "M"}${x(zeiten[i]).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  const ton = y(a.tonLinie);
  return `<svg class="vb-kurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tonhöhenverlauf">
    <line class="vb-tonlinie" x1="0" x2="${W}" y1="${ton.toFixed(1)}" y2="${ton.toFixed(1)}"/>
    <path class="vb-pfad" d="${pfad}"/>
    ${a.einsatz ? `<line class="vb-einsatz" x1="${x(a.einsatz).toFixed(1)}" x2="${x(a.einsatz).toFixed(1)}" y1="0" y2="${H}"/>` : ""}
  </svg>`;
}

/* --- Messen ---------------------------------------------------------------------- */

async function starte() {
  try {
    await pitch.start({ hz: 60 });
  } catch (e) {
    toast("Mikrofon nicht verfügbar");
    return;
  }
  mikro = true;
  holdScreen();
  versuch = null; stilleSeit = 0;
  offPitch?.();
  offPitch = pitch.onPitch(aufMessung);
  render();
}

function stoppe() {
  offPitch?.(); offPitch = null;
  if (mikro) { pitch.stop(); releaseScreen(); }
  mikro = false;
  versuch = null;
  render();
}

/* Ein Versuch ist ein Ton von Ansatz bis Absetzen. Eine Viertelsekunde
   Stille beendet ihn. */
function aufMessung(p) {
  if (!p) return;
  const jetzt = performance.now();
  const f = p.raw || p.freq;
  if (f && !p.silent) {
    if (!versuch) versuch = { start: jetzt, punkte: [] };
    versuch.punkte.push({ t: jetzt - versuch.start, midi: freqToMidi(f, state().settings.a4) });
    stilleSeit = 0;
    const s = root && $("#vb-status", root);
    if (s) s.textContent = `Misst … ${komma(Math.round((jetzt - versuch.start) / 100) / 10)} s`;
    return;
  }
  if (!versuch) return;
  if (!stilleSeit) stilleSeit = jetzt;
  if (jetzt - stilleSeit < 250) return;
  const v = versuch;
  versuch = null; stilleSeit = 0;
  if (v.punkte.length < 10) return;
  auswerten(v.punkte);
}

function auswerten(roh) {
  const ohneRand = ohneRaender(roh);
  const punkte = stil === "shake" ? ohneRand : ohneAusreisser(ohneRand);
  const a = analysiere(punkte);
  const u = urteil(a, stil, stil === "metronom" ? { bpm: bpm(), proSchlag } : null);
  const mitte = punkte[Math.floor(punkte.length / 2)]?.midi;
  const ton = mitte ? (() => { const q = fromMidi(Math.round(mitte) + 9, "flat"); return spell(q, state().settings.naming) + q.octave; })() : null;
  letztes = { a, u, ton };
  if (a?.vibrato) {
    const l = verlauf(stil);
    l.push({ am: todayISO(), rate: a.rate, tiefe: a.tiefe, gleich: a.gleich, gut: u.gut });
    if (l.length > 40) l.splice(0, l.length - 40);
    save();
  }
  const host = root && $("#vb-ergebnis", root);
  if (host) host.innerHTML = ergebnisHtml(letztes);
  const s = root && $("#vb-status", root);
  if (s) s.textContent = "Nächster Ton, wenn du so weit bist.";
}

export default {
  id: "vibrato",
  label: "Vibrato",
  mount(r) {
    root = r;
    render();
    offMetro = metro.onStateChange(() => { const b = root && $("#vb-metro", root); if (b) b.textContent = metro.isRunning() ? "Metronom aus" : "Metronom an"; });
  },
  unmount() {
    offMetro?.(); offMetro = null;
    offPitch?.(); offPitch = null;
    if (mikro) { pitch.stop(); releaseScreen(); }
    mikro = false;
    root = null;
  },
};
