/* ==========================================================================
   Rhythmus

   Der Unterschied zu „Metronom an und mitspielen“: hier wird gemessen. Nach
   dem Durchgang steht da, um wie viele Millisekunden du daneben warst und
   ob du gleichmäszig streust oder durchgehend schleppst. Das sind zwei ganz
   verschiedene Probleme mit zwei ganz verschiedenen Lösungen, und ohne
   Messung hört man den Unterschied an sich selbst fast nie.

   Gemessen wird gegen die Audio-Uhr, nicht gegen Date.now(). Die Audio-Uhr
   ist das, was der Nutzer hört; alles andere wäre gegen die falsche
   Referenz gemessen.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast } from "../core/dom.js";
import { state, setSetting, drill, recordDrill } from "../core/store.js";
import { generateRhythm, bewerte, STUFEN } from "../music/rhythmus.js";
import { renderStaff, autoBeam } from "../music/notation.js";
import { audio } from "../audio/context.js";
import { ok as sigOk } from "../audio/signals.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let sel = { stufe: 2, beats: 4, takte: 2 };
let aufgabe = null;
let lauf = null;      // { taps: [], startZeit, spv, timer }
let keyHandler = null;

const drillId = () => `rhythmus:${sel.stufe}`;

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const d = drill(drillId(), {});
  const bpm = clamp(state().settings.bpm, 40, 180);
  if (bpm !== state().settings.bpm) setSetting("bpm", bpm);
  root.innerHTML = `
    <div class="chips scroll" id="r-stufen" role="group" aria-label="Stufe"></div>

    <p class="hint" id="r-beschreibung"></p>
    <div class="staff-wrap" id="r-staff"></div>

    <div class="grid3">
      <label>Takt
        <select id="r-beats">
          ${[2, 3, 4, 5, 6].map(b => `<option value="${b}">${b}/4</option>`).join("")}
        </select>
      </label>
      <label>Takte
        <select id="r-takte">
          ${[1, 2, 4].map(b => `<option value="${b}">${b}</option>`).join("")}
        </select>
      </label>
    </div>

    <div class="slider">
      <label for="r-bpm">Tempo</label>
      <input type="range" id="r-bpm" min="40" max="180" value="${bpm}">
      <span class="slider-val"><span id="r-bpm-val">${bpm}</span> bpm</span>
    </div>

    <div class="row2">
      <button id="r-neu">Neuer Rhythmus</button>
      <button id="r-hoeren">Vorhören</button>
    </div>

    <button class="wide primary" id="r-start" style="margin-top:12px">Vorzählen und los</button>

    <button class="tapfeld" id="r-tap" hidden>
      <span id="r-tap-text">Tippen</span>
    </button>

    <div id="r-ergebnis"></div>

    ${d.bestMs ? `<p class="hint spaced">Deine beste Genauigkeit auf dieser Stufe: ± ${d.bestMs} ms.</p>` : ""}`;

  renderStufen(root);
  $("#r-beats", root).value = String(sel.beats);
  $("#r-takte", root).value = String(sel.takte);
  neu(root);

  $("#r-beats", root).addEventListener("change", e => { sel.beats = Number(e.target.value); neu(root); });
  $("#r-takte", root).addEventListener("change", e => { sel.takte = Number(e.target.value); neu(root); });
  $("#r-bpm", root).addEventListener("input", e => {
    const v = Number(e.target.value);
    setSetting("bpm", v);
    $("#r-bpm-val", root).textContent = v;
  });
  $("#r-neu", root).addEventListener("click", () => neu(root));
  $("#r-hoeren", root).addEventListener("click", () => vorhoeren(root));
  $("#r-start", root).addEventListener("click", () => starte(root));

  const tap = $("#r-tap", root);
  // pointerdown statt click: click feuert erst beim Loslassen und ist
  // dadurch systematisch zu spät.
  tap.addEventListener("pointerdown", e => { e.preventDefault(); tippe(); });
  // Der Router ruft unmount() ohne Argument, deshalb merkt sich das Modul
  // den Handler selbst statt ihn am Element abzulegen.
  keyHandler = e => {
    if (e.code === "Space" && lauf) { e.preventDefault(); tippe(); }
  };
  document.addEventListener("keydown", keyHandler);
}

function renderStufen(root) {
  const host = $("#r-stufen", root);
  host.innerHTML = "";
  for (const s of STUFEN) {
    host.append(el("button", {
      class: "chip" + (s.id === sel.stufe ? " on" : ""),
      text: s.label,
      on: { click: () => { sel.stufe = s.id; render(root); } },
    }));
  }
}

function neu(root) {
  aufgabe = generateRhythm({ beats: sel.beats, stufe: sel.stufe, takte: sel.takte });
  const st = STUFEN.find(s => s.id === sel.stufe);
  $("#r-beschreibung", root).textContent = st ? st.beschreibung : "";
  $("#r-ergebnis", root).innerHTML = "";
  zeichne(root);
}

function zeichne(root, zustaende = null) {
  if (!aufgabe) return;
  let i = 0;
  const noten = aufgabe.noten.map(nt => {
    if (nt.barline || !nt.pitch) return nt;
    const z = zustaende ? zustaende[i++] : undefined;
    return z ? { ...nt, state: z } : { ...nt, state: undefined };
  });
  $("#r-staff", root).innerHTML = renderStaff({
    notes: autoBeam(noten, 1),
    timeSig: [sel.beats, 4],
    ariaLabel: "Rhythmus",
    extraClass: "compact",
  });
}

/* --- Ablauf ------------------------------------------------------------------ */

function vorhoeren(root) {
  if (!aufgabe) return;
  const ctx = audio();
  const spv = 60 / state().settings.bpm;
  const t0 = ctx.currentTime + 0.15;
  for (const e of aufgabe.einsaetze) klick(t0 + e * spv, 0.32);
}

/** Ein trockener Holzklick, deutlich anders als der Metronomklick. */
function klick(time, amp) {
  const ctx = audio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = 1900;
  g.gain.setValueAtTime(amp, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
  o.connect(g); g.connect(ctx.destination);
  o.start(time); o.stop(time + 0.05);
}

function starte(root) {
  if (!aufgabe || lauf) return;
  const ctx = audio();
  const bpm = state().settings.bpm;
  const spv = 60 / bpm;

  const tap = $("#r-tap", root);
  const start = $("#r-start", root);
  tap.hidden = false;
  start.hidden = true;
  $("#r-ergebnis", root).innerHTML = "";
  $("#r-tap-text", root).textContent = "vorzählen …";
  holdScreen();

  // Einzähler und Puls werden hier selbst geplant, nicht über das Metronom.
  // Das Metronom hat eine eigene Zeitbasis; wer beides mischt, bekommt einen
  // Versatz von einigen Zehntelsekunden zwischen Einzähler und Puls — und
  // misst dann gegen die falsche Referenz.
  const startZeit = ctx.currentTime + 0.2 + sel.beats * spv;

  for (let i = 0; i < sel.beats; i++) {
    puls(startZeit - (sel.beats - i) * spv, i === 0);
  }
  for (let i = 0; i < sel.beats * sel.takte; i++) {
    puls(startZeit + i * spv, i % sel.beats === 0);
  }

  lauf = { taps: [], startZeit, spv };

  setTimeout(() => {
    if (!lauf) return;
    $("#r-tap-text", root).textContent = "Tippen";
    tap.classList.add("aktiv");
  }, Math.max(0, (startZeit - ctx.currentTime) * 1000));

  const endeMs = (startZeit - ctx.currentTime + aufgabe.dauer * spv + 0.6) * 1000;
  lauf.timer = setTimeout(() => werteAus(root), endeMs);
}

/** Der Puls: heller Sinus, klar unterscheidbar vom Rhythmus-Vorhören. */
function puls(time, betont) {
  const ctx = audio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = betont ? 1600 : 1050;
  g.gain.setValueAtTime(betont ? 0.4 : 0.22, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start(time); o.stop(time + 0.07);
}

function tippe() {
  if (!lauf) return;
  lauf.taps.push(audio().currentTime);
  const t = $("#r-tap");
  if (t) { t.classList.add("schlag"); setTimeout(() => t.classList.remove("schlag"), 90); }
}

function werteAus(root) {
  if (!lauf) return;
  releaseScreen();
  const { taps, startZeit, spv } = lauf;
  clearTimeout(lauf.timer);
  lauf = null;

  const tap = $("#r-tap", root);
  const start = $("#r-start", root);
  if (tap) { tap.hidden = true; tap.classList.remove("aktiv"); }
  if (start) start.hidden = false;

  const r = bewerte(taps, aufgabe.einsaetze, startZeit, spv);
  zeichne(root, r.treffer.map(t => t === null ? "falsch" : "richtig"));

  const host = $("#r-ergebnis", root);
  if (!r.getroffen) {
    host.innerHTML = `<p class="hint spaced">Nichts angekommen. Tipp auf die
      große Fläche, sobald der Einzähler durch ist.</p>`;
    return;
  }

  const quote = Math.round(100 * r.getroffen / r.gesamt);
  // Schleppen und Eilen sind etwas anderes als Ungenauigkeit — und brauchen
  // eine andere Übemethode. Deshalb stehen beide Zahlen getrennt da.
  const richtung = r.versatzMs > 12 ? "Du bist durchgehend zu spät — du schleppst."
    : r.versatzMs < -12 ? "Du bist durchgehend zu früh — du eilst."
    : "Kein Versatz in eine Richtung, das ist gut.";

  host.innerHTML = `
    <div class="panel" style="margin-top:16px">
      <div class="stat-row">
        <div class="stat"><b>${quote}</b><span>% getroffen</span></div>
        <div class="stat"><b>${r.mittlereAbweichungMs}</b><span>ms Abweichung</span></div>
        <div class="stat"><b>${r.versatzMs > 0 ? "+" : ""}${r.versatzMs}</b><span>ms Versatz</span></div>
      </div>
      <p class="hint" style="margin:12px 0 0">
        ${richtung}
        ${r.zuviel ? ` ${r.zuviel} ${r.zuviel === 1 ? "Tipp war" : "Tipps waren"} zu viel.` : ""}
        ${r.mittlereAbweichungMs <= 30
          ? " Unter 30 ms ist im Zusammenspiel nicht mehr hörbar."
          : " Geh mit dem Tempo herunter, bis du unter 30 ms kommst, und arbeite dich hinauf."}
      </p>
    </div>`;

  const d = drill(drillId(), {});
  if (quote >= 80) {
    recordDrill(drillId(), {
      bestMs: d.bestMs ? Math.min(d.bestMs, r.mittlereAbweichungMs) : r.mittlereAbweichungMs,
      count: (d.count || 0) + 1,
    });
    if (r.mittlereAbweichungMs <= 30) sigOk();
  }
}

export default {
  id: "rhythmus",
  label: "Rhythmus",
  mount(root) { render(root); },
  unmount() {
    if (lauf) { clearTimeout(lauf.timer); lauf = null; releaseScreen(); }
    if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; }
  },
};
