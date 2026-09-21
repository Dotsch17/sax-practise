/* ==========================================================================
   Tonanalyse

   Einen langen Ton aufnehmen und danach ansehen, was wirklich passiert ist.
   Das ist der Block „Lange Töne“ mit Rückmeldung — und die Rückmeldung ist
   eine andere, als man erwartet: interessant ist nicht, ob der Ton *schön*
   war, sondern ob er *ruhig* war.

   Drei Kurven, und jede beantwortet eine eigene Frage:

   - **Tonhöhe in Cent.** Läuft sie weg, arbeitet der Ansatz. Zittert sie,
     ist es unbewusstes Vibrato. Fällt sie am Ende, geht die Luft aus.
   - **Lautstärke.** Für Messa di voce das eigentliche Bild: wird die
     Kurve wirklich gleichmäszig, oder springt sie an den Rändern?
   - **Spektraler Schwerpunkt.** Wie hell der Klang ist. Sein Wert ist
     ziemlich egal — seine Ruhe ist alles. Flackert er, wackeln Ansatz oder
     Luft, und zwar bevor man es hört.

   Gespeichert werden nur die Messwerte, nicht das Audio. Ein paar hundert
   Zahlen je Aufnahme passen in localStorage; eine Tonspur täte das nicht.
   Dafür lassen sich Aufnahmen über Wochen vergleichen — Tag 1 gegen Tag 30,
   genau wie in der Roadmap vorgesehen.
   ========================================================================== */

"use strict";

import { $, $$, el, clamp, toast, todayISO, escapeHtml } from "../core/dom.js";
import { state, save, drill } from "../core/store.js";
import * as pitch from "../audio/pitch.js";
import { centsOff, chromatic, spell, toWritten, midiToFreq } from "../music/theory.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const MAX_SEKUNDEN = 30;
const PUNKTE = 160;          // so viele Stützstellen werden gespeichert

let mikroAn = false;
let laufend = null;          // { frames: [], start, timer }
let offPitch = null;
let angesehen = null;        // Index der offenen Aufnahme

const aufnahmen = () => {
  const s = state();
  if (!Array.isArray(s.recordings)) s.recordings = [];
  return s.recordings;
};

/* --- Aufnehmen ---------------------------------------------------------------- */

async function starte(root) {
  if (!mikroAn) {
    try {
      await pitch.start({ spektrum: true });
      mikroAn = true;
    } catch (e) {
      console.warn(e);
      $("#ta-hinweis", root).textContent =
        location.protocol === "https:" || location.hostname === "localhost"
          ? "Ohne Mikrofonfreigabe geht es nicht."
          : "Das Mikrofon braucht HTTPS. Über eine reine IP-Adresse geht es nicht.";
      toast("Kein Mikrofon");
      return;
    }
  }
  holdScreen();
  laufend = { frames: [], start: performance.now() / 1000 };
  angesehen = null;
  render(root);
  laufend.timer = setTimeout(() => beende(root), MAX_SEKUNDEN * 1000);
}

function beende(root) {
  if (!laufend) return;
  clearTimeout(laufend.timer);
  const frames = laufend.frames;
  laufend = null;
  releaseScreen();

  const ergebnis = auswerten(frames);
  if (!ergebnis) {
    toast("Zu wenig Ton angekommen");
    render(root);
    return;
  }
  aufnahmen().unshift(ergebnis);
  // Mehr als vierzig Aufnahmen sind für den Vergleich nicht nötig und
  // würden den Speicher zumüllen.
  if (aufnahmen().length > 40) aufnahmen().length = 40;
  save();
  angesehen = 0;
  render(root);
}

/**
 * Macht aus den Rohbildern einen gespeicherten Satz. Die Kurven werden auf
 * feste Stützstellen heruntergerechnet, damit die Grösze nicht von der
 * Aufnahmedauer abhängt.
 */
function auswerten(frames) {
  const klingend = frames.filter(f => f.midiExact !== null && f.klarheit > 0.7);
  if (klingend.length < 15) return null;

  // Der gespielte Ton ist der häufigste gerundete Halbton — nicht der
  // Mittelwert, der bei einem Tonwechsel dazwischen läge.
  const zaehler = new Map();
  for (const f of klingend) {
    const m = Math.round(f.midiExact);
    zaehler.set(m, (zaehler.get(m) || 0) + 1);
  }
  const midi = [...zaehler.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const t0 = klingend[0].t;
  const t1 = klingend[klingend.length - 1].t;
  const dauer = t1 - t0;
  if (dauer < 0.8) return null;

  const punkte = [];
  for (let i = 0; i < PUNKTE; i++) {
    const t = t0 + dauer * i / (PUNKTE - 1);
    // Nächstgelegenes Bild nehmen statt zu interpolieren — bei 30 Bildern je
    // Sekunde ist der Unterschied bedeutungslos und das Verhalten klarer.
    let best = klingend[0], abstand = Infinity;
    for (const f of klingend) {
      const d = Math.abs(f.t - t);
      if (d < abstand) { abstand = d; best = f; }
    }
    punkte.push({
      c: Math.round((best.midiExact - midi) * 100),
      p: Math.round(best.rms * 1000),
      s: Math.round(best.centroid || 0),
    });
  }

  const cents = punkte.map(p => p.c);
  const mittel = cents.reduce((a, b) => a + b, 0) / cents.length;
  const streuung = Math.sqrt(cents.reduce((a, c) => a + (c - mittel) ** 2, 0) / cents.length);

  const schwer = punkte.map(p => p.s).filter(s => s > 0);
  const sMittel = schwer.length ? schwer.reduce((a, b) => a + b, 0) / schwer.length : 0;
  const sStreuung = schwer.length
    ? Math.sqrt(schwer.reduce((a, s) => a + (s - sMittel) ** 2, 0) / schwer.length) : 0;

  // Teiltöne über die ganze Aufnahme mitteln.
  const harm = new Array(8).fill(0);
  let harmN = 0;
  for (const f of klingend) {
    if (!f.harmonische) continue;
    harmN++;
    for (let k = 0; k < 8; k++) harm[k] += f.harmonische[k] || 0;
  }
  if (harmN) for (let k = 0; k < 8; k++) harm[k] = Math.round(harm[k] / harmN * 100) / 100;

  // Driftet die Tonhöhe? Erste gegen letzte Fünftel.
  const fuenftel = Math.floor(PUNKTE / 5);
  const anfang = cents.slice(0, fuenftel).reduce((a, b) => a + b, 0) / fuenftel;
  const ende = cents.slice(-fuenftel).reduce((a, b) => a + b, 0) / fuenftel;

  return {
    datum: todayISO(),
    zeit: new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }),
    midi, dauer: Math.round(dauer * 10) / 10,
    mittel: Math.round(mittel),
    streuung: Math.round(streuung * 10) / 10,
    drift: Math.round(ende - anfang),
    schwerpunkt: Math.round(sMittel),
    schwerpunktStreuung: Math.round(sStreuung),
    harmonische: harm,
    punkte,
  };
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const liste = aufnahmen();
  const a = angesehen !== null ? liste[angesehen] : null;

  root.innerHTML = `
    <p class="hint">
      Spiel einen langen Ton — acht bis zwölf Sekunden, ohne Vibrato. Danach
      steht hier, wie ruhig er wirklich war.
    </p>

    <div class="ta-pegel" id="ta-pegel">
      <div class="ta-pegel-balken"><i id="ta-pegel-fill"></i></div>
      <div class="ta-pegel-text" id="ta-pegel-text">—</div>
    </div>

    <button class="wide primary" id="ta-start">${laufend ? "Aufnahme beenden" : "Aufnehmen"}</button>

    <p class="hint" id="ta-hinweis">
      ${laufend ? "läuft — höchstens " + MAX_SEKUNDEN + " Sekunden" : ""}
    </p>

    <div id="ta-ergebnis">${a ? ergebnisHtml(a, liste) : ""}</div>

    ${liste.length ? `
      <h2>Frühere Aufnahmen</h2>
      <div id="ta-liste">${liste.map((x, i) => `
        <button class="ta-zeile${i === angesehen ? " on" : ""}" data-i="${i}">
          <span class="ta-zeile-ton">${escapeHtml(tonName(x.midi))}</span>
          <span class="ta-zeile-datum">${escapeHtml(x.datum)} ${escapeHtml(x.zeit || "")}</span>
          <span class="ta-zeile-wert">± ${x.streuung} Cent</span>
        </button>`).join("")}</div>
      <div class="row2"><button id="ta-leeren" class="linkish">Alle Aufnahmen löschen</button></div>
    ` : ""}`;

  $("#ta-start", root).addEventListener("click", () => laufend ? beende(root) : starte(root));

  $$("[data-i]", root).forEach(b => b.addEventListener("click", () => {
    angesehen = Number(b.dataset.i);
    render(root);
  }));

  const leeren = $("#ta-leeren", root);
  if (leeren) leeren.addEventListener("click", () => {
    if (leeren.dataset.sicher !== "ja") {
      leeren.dataset.sicher = "ja";
      leeren.textContent = "Wirklich alle löschen?";
      setTimeout(() => {
        if (!leeren.isConnected) return;
        leeren.dataset.sicher = ""; leeren.textContent = "Alle Aufnahmen löschen";
      }, 4000);
      return;
    }
    state().recordings = [];
    save();
    angesehen = null;
    render(root);
  });
}

const tonName = midi => {
  const g = chromatic(toWritten(midi));
  return `${spell(g)}${g.octave}`;
};

function ergebnisHtml(a, liste) {
  // Die letzte Aufnahme desselben Tons, die älter ist — das ist der
  // Vergleich, der etwas aussagt.
  const vorher = liste.find(x => x !== a && x.midi === a.midi && x.datum < a.datum);

  const urteilStreuung = a.streuung <= 5 ? "Sehr ruhig."
    : a.streuung <= 12 ? "Ordentlich ruhig."
    : a.streuung <= 25 ? "Die Tonhöhe arbeitet noch."
    : "Die Tonhöhe läuft deutlich.";
  const urteilDrift = Math.abs(a.drift) < 6 ? ""
    : a.drift > 0 ? ` Der Ton steigt im Verlauf um ${a.drift} Cent — meist beiszt der Ansatz nach.`
    : ` Der Ton fällt im Verlauf um ${-a.drift} Cent — meist geht die Luft aus.`;
  const urteilFarbe = a.schwerpunkt === 0 ? ""
    : a.schwerpunktStreuung / Math.max(1, a.schwerpunkt) < 0.08
      ? " Die Klangfarbe bleibt stabil."
      : " Die Klangfarbe flackert — das ist Ansatz oder Luft, noch bevor man es hört.";

  return `
    <div class="panel">
      <div class="stat-row">
        <div class="stat"><b>${escapeHtml(tonName(a.midi))}</b><span>Griff · ${a.dauer} s</span></div>
        <div class="stat"><b>${a.mittel > 0 ? "+" : ""}${a.mittel}</b><span>Cent Lage</span></div>
        <div class="stat"><b>± ${a.streuung}</b><span>Cent Streuung</span></div>
      </div>
      <p class="hint" style="margin:12px 0 0">${urteilStreuung}${urteilDrift}${urteilFarbe}</p>
      ${vorher ? `<p class="hint" style="margin:6px 0 0">
        Am ${escapeHtml(vorher.datum)} war derselbe Ton bei ± ${vorher.streuung} Cent —
        ${a.streuung < vorher.streuung ? "das ist ruhiger geworden." : a.streuung > vorher.streuung ? "heute unruhiger." : "gleich geblieben."}
      </p>` : ""}
    </div>

    <h3>Tonhöhe in Cent</h3>
    ${kurve(a.punkte.map(p => p.c), { mitte: 0, spanne: 50, einheit: "Cent" })}

    <h3>Lautstärke</h3>
    ${kurve(a.punkte.map(p => p.p), { vonNull: true, einheit: "" })}

    ${a.schwerpunkt ? `
      <h3>Spektraler Schwerpunkt</h3>
      ${kurve(a.punkte.map(p => p.s), { vonNull: true, einheit: "Hz" })}
      <p class="hint">Mittel ${a.schwerpunkt} Hz, Schwankung ± ${a.schwerpunktStreuung} Hz.</p>
    ` : ""}

    ${a.harmonische && a.harmonische.some(h => h > 0) ? `
      <h3>Teiltöne</h3>
      <p class="hint">
        Stärke der ersten acht Teiltöne, bezogen auf den Grundton. Ein voller
        Ton hat kräftige zweite und dritte Teiltöne; ein dünner hat fast nur
        den Grundton.
      </p>
      <div class="harm">${a.harmonische.map((h, k) => `
        <div class="harm-bar">
          <i style="height:${Math.min(100, h * 100)}%"></i>
          <u>${k + 1}</u>
        </div>`).join("")}</div>
    ` : ""}`;
}

/**
 * Eine schlichte Linienkurve als SVG. Bewusst ohne Achsenbeschriftung: was
 * hier zählt, ist die Form, nicht der Ablesewert.
 */
function kurve(werte, opts = {}) {
  const { mitte = null, spanne = null, vonNull = false, einheit = "" } = opts;
  if (!werte.length) return "";
  const W = 320, H = 90;

  let min, max;
  if (mitte !== null && spanne !== null) {
    min = mitte - spanne; max = mitte + spanne;
    const echtMax = Math.max(...werte.map(Math.abs));
    if (echtMax > spanne) { min = -echtMax * 1.1; max = echtMax * 1.1; }
  } else if (vonNull) {
    min = 0; max = Math.max(1, ...werte) * 1.1;
  } else {
    min = Math.min(...werte); max = Math.max(...werte);
  }
  const bereich = max - min || 1;
  const y = v => H - (v - min) / bereich * H;

  const punkte = werte.map((v, i) =>
    `${(i / (werte.length - 1) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const nulllinie = (mitte !== null && min < mitte && max > mitte)
    ? `<line class="kurve-null" x1="0" y1="${y(mitte).toFixed(1)}" x2="${W}" y2="${y(mitte).toFixed(1)}"/>`
    : "";

  const beschriftung = `
    <text class="kurve-txt" x="2" y="10">${Math.round(max)}${einheit ? " " + einheit : ""}</text>
    <text class="kurve-txt" x="2" y="${H - 2}">${Math.round(min)}</text>`;

  return `<div class="kurve-wrap"><svg class="kurve" viewBox="0 0 ${W} ${H}"
    preserveAspectRatio="none" role="img" aria-label="Verlauf">
    ${nulllinie}<polyline class="kurve-linie" points="${punkte}"/>
  </svg><svg class="kurve-achse" viewBox="0 0 ${W} ${H}">${beschriftung}</svg></div>`;
}

/* --- Live-Pegel ---------------------------------------------------------------- */

function aufMessung(root, p) {
  if (laufend && p) {
    laufend.frames.push({
      t: performance.now() / 1000,
      midiExact: p.silent ? null : (p.midiExact ?? null),
      rms: p.rms || 0,
      klarheit: p.clarity || 0,
      centroid: p.centroid || 0,
      harmonische: p.harmonische || null,
    });
  }

  const fill = $("#ta-pegel-fill", root);
  const text = $("#ta-pegel-text", root);
  if (!fill || !text) return;

  const pegel = p ? Math.min(1, (p.rms || 0) * 8) : 0;
  fill.style.width = (pegel * 100).toFixed(0) + "%";

  if (!mikroAn) text.textContent = "Mikrofon aus";
  else if (!p || p.silent) text.textContent = laufend ? "hört zu …" : "bereit";
  else if (p.freq) {
    const { midi, cents } = centsOff(p.freq, state().settings.a4);
    text.textContent = `${tonName(midi)} ${cents > 0 ? "+" : ""}${cents} Cent` +
      (laufend ? ` · ${(performance.now() / 1000 - laufend.start).toFixed(1)} s` : "");
  } else text.textContent = laufend ? "…" : "bereit";
}

export default {
  id: "tonanalyse",
  label: "Tonanalyse",
  mount(root) {
    render(root);
    offPitch = pitch.onPitch(p => aufMessung(root, p));
  },
  unmount() {
    offPitch?.();
    if (laufend) { clearTimeout(laufend.timer); laufend = null; }
    if (mikroAn) { pitch.stop(); mikroAn = false; }
    releaseScreen();
    angesehen = null;
  },
};
