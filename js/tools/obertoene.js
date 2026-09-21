/* ==========================================================================
   Obertöne

   Der Block, den die Auswertung als den am häufigsten ausgelassenen zeigt —
   und zugleich der, an dem Altissimo, Ansprache im pp und saubere
   Registerübergänge hängen. Der Grund, warum er liegen bleibt, ist immer
   derselbe: man hört nicht, ob etwas passiert. Ein Teilton, der nicht kommt,
   fühlt sich genauso an wie einer, der knapp danebengeht.

   Genau das nimmt die Rückmeldung ab. Die App sagt dir, welchen Teilton du
   getroffen hast — über das Frequenzverhältnis zum Grundton, nicht über die
   nächste Klaviertaste. Das ist der Unterschied, an dem Stimmgeräte
   scheitern: der fünfte Teilton liegt 14 Cent unter der gleichstufigen
   großen Terz, und das ist richtig so.

   Der Matching-Modus ist der eigentliche Zweck. Derselbe Ton einmal über
   das Voicing und einmal über den Griff, und die App zeigt, wie weit Höhe
   und Klangfarbe auseinanderliegen. Der gegriffene klingt anfangs fast
   immer dünner — wenn beide gleich klingen, ist das Voicing für diese Lage
   richtig.
   ========================================================================== */

"use strict";

import { $, $$, el, toast, escapeHtml } from "../core/dom.js";
import { state, drill, recordDrill, save } from "../core/store.js";
import * as pitch from "../audio/pitch.js";
import {
  GRUNDGRIFFE, partials, erkennePartial, grundFrequenz, vergleicheMatching,
} from "../music/obertoene.js";
import { chromatic, spell, toWritten, freqToMidi, midiToFreq } from "../music/theory.js";
import { holdScreen, releaseScreen } from "../core/session.js";
import { ok as sigOk, playFreqs, stopPlayback, isPlaying, onPlayback } from "../audio/signals.js";

const MODI = [
  { id: "frei", label: "Frei", was: "Spiel, was kommt — die App sagt dir, welcher Teilton es war." },
  { id: "reihe", label: "Reihe", was: "Teilton für Teilton hinauf. Jeder muss eine Sekunde ruhig stehen, bevor es weitergeht." },
  { id: "matching", label: "Matching", was: "Erst den Teilton, dann denselben Ton gegriffen. Die App vergleicht Höhe und Klangfarbe." },
];

const HALTEN_MS = 1000;
const ANZAHL = 8;

let sel = { griff: 58, modus: "frei" };
let mikroAn = false;
let offPitch = null;
let offPlayback = null;
let erkannt = null;          // { k, abweichungCents, sicher, freq }
let ziel = 2;                // im Reihe-Modus der nächste Teilton
let halten = { seit: 0, k: 0 };
let matching = { schritt: 0, teilton: null, gegriffen: null, ergebnis: null, sammeln: null };

const drillId = () => `obertoene:${sel.griff}`;
const griffName = () => (GRUNDGRIFFE.find(g => g.written === sel.griff) || GRUNDGRIFFE[0]).name;
const f0 = () => grundFrequenz(sel.griff, state().settings.a4);

/** Der notierte Ton, der einem Teilton entspricht — für die Anzeige. */
function teiltonName(p) {
  const g = chromatic(toWritten(p.midi));
  return `${spell(g)}${g.octave}`;
}

/* --- Ansicht ---------------------------------------------------------------- */

function render(root) {
  const d = drill(drillId(), { hoechster: 0 });
  root.innerHTML = `
    <div class="chips" id="ob-griff" role="group" aria-label="Grundgriff"></div>
    <div class="chips" id="ob-modus" role="group" aria-label="Modus"></div>
    <p class="hint" id="ob-was"></p>

    <div class="ob-anzeige" id="ob-anzeige">
      <div class="ob-gross" id="ob-gross">—</div>
      <div class="ob-klein" id="ob-klein">Mikrofon aus</div>
    </div>

    <div class="row2">
      <button id="ob-anhoeren">Reihe anhören</button>
      <button id="ob-ziel-hoeren">Zielton hören</button>
    </div>

    <div class="ob-leiter" id="ob-leiter"></div>

    <button class="wide primary" id="ob-mikro">Mikrofon einschalten</button>
    <div id="ob-matching"></div>

    <p class="hint spaced" id="ob-hinweis">
      Griff ${escapeHtml(griffName())}, ohne Oktavklappe. Alles andere macht
      das Voicing — nicht der Ansatz, nicht mehr Druck.
      ${d.hoechster ? `<br>Dein bisher höchster sicherer Teilton auf diesem Griff: ${d.hoechster}.` : ""}
    </p>`;

  renderGriffChips(root);
  renderModusChips(root);
  renderLeiter(root);
  renderMatching(root);

  $("#ob-mikro", root).addEventListener("click", () => toggleMikro(root));
  $("#ob-anhoeren", root).addEventListener("click", () => {
    if (isPlaying()) { stopPlayback(); return; }
    spieleReihe(root, Math.max(4, Math.min(ANZAHL, ziel + 1)));
  });
  $("#ob-ziel-hoeren", root).addEventListener("click", () => {
    spieleTeilton(root, sel.modus === "reihe" ? ziel
      : matching.teilton ? matching.teilton.k : 2);
  });

  if (offPlayback) offPlayback();
  offPlayback = onPlayback(laeuft => {
    const btn = $("#ob-anhoeren", root);
    if (btn) btn.textContent = laeuft ? "Vorspiel stoppen" : "Reihe anhören";
    if (!laeuft) {
      const klein = $("#ob-klein", root);
      if (klein) klein.textContent = mikroAn ? "hört zu" : "Mikrofon aus";
    }
  });
}

function renderGriffChips(root) {
  const host = $("#ob-griff", root);
  host.innerHTML = "";
  for (const g of GRUNDGRIFFE) {
    host.append(el("button", {
      class: "chip" + (g.written === sel.griff ? " on" : ""),
      text: "Griff " + g.name,
      on: { click: () => { sel.griff = g.written; ziel = 2; matching = { schritt: 0 }; render(root); } },
    }));
  }
}

function renderModusChips(root) {
  const host = $("#ob-modus", root);
  host.innerHTML = "";
  for (const m of MODI) {
    host.append(el("button", {
      class: "chip" + (m.id === sel.modus ? " on" : ""),
      text: m.label,
      on: { click: () => {
        sel.modus = m.id;
        ziel = 2;
        matching = { schritt: 0, teilton: null, gegriffen: null, ergebnis: null };
        render(root);
      } },
    }));
  }
  const m = MODI.find(x => x.id === sel.modus);
  const was = $("#ob-was", root);
  if (was && m) was.textContent = m.was;
}

/**
 * Die Naturtonreihe als Leiter, von oben nach unten wie auf dem Papier.
 * Jede Stufe ist ein Knopf: antippen spielt den Teilton **exakt** vor, mit
 * seiner echten Frequenz statt der nächsten Klaviertaste. Wer den Ton vorher
 * im Ohr hat, trifft ihn — das ist beim Voicing der ganze Trick, und es ist
 * der Grund, warum Obertonübungen zu zweit schneller gehen als allein.
 */
function renderLeiter(root) {
  const host = $("#ob-leiter", root);
  if (!host) return;
  const reihe = partials(f0(), ANZAHL, state().settings.a4);

  host.innerHTML = "";
  for (const p of [...reihe].reverse()) {
    const aktiv = erkannt && erkannt.sicher && erkannt.k === p.k;
    const istZiel = sel.modus === "reihe" && p.k === ziel;
    const gezielt = sel.modus === "matching" && matching.teilton && matching.teilton.k === p.k;
    const breite = aktiv
      ? Math.max(6, 100 - Math.min(100, Math.abs(erkannt.abweichungCents) * 2)) : 0;

    host.append(el("button", {
      class: "ob-stufe" + (aktiv ? " an" : "") + (istZiel || gezielt ? " ziel" : ""),
      "aria-label": `Teilton ${p.k}, ${teiltonName(p)}, anhören`,
      html: `<span class="ob-k">${p.k}</span>
        <span class="ob-ton">${escapeHtml(teiltonName(p))}</span>
        <span class="ob-cent">${p.cents > 0 ? "+" : ""}${p.cents}</span>
        <span class="ob-bar"><i style="width:${breite}%"></i></span>
        <span class="ob-play">▶</span>`,
      on: { click: () => spieleTeilton(root, p.k) },
    }));
  }
}

/* --- Vorspielen ------------------------------------------------------------- */

/** Spielt einen Teilton, davor den Grundton als Bezug. */
function spieleTeilton(root, k) {
  const reihe = partials(f0(), ANZAHL, state().settings.a4);
  const p = reihe.find(x => x.k === k);
  if (!p) return;
  stopPlayback();
  // Grundton zuerst, dann das Ziel: ohne Bezug klingt ein einzelner hoher Ton
  // nach irgendeiner Tonhöhe, mit Bezug nach einem Ziel.
  const folge = k === 1 ? [p.freq] : [reihe[0].freq, p.freq];
  playFreqs(folge, { noteDur: k === 1 ? 1.4 : 1.1, gap: 0.1 });
  meldeVorspiel(root, `Teilton ${k}`);
}

/** Spielt die Reihe von unten nach oben, bis zum höchsten erreichten Teilton. */
function spieleReihe(root, bis) {
  const reihe = partials(f0(), ANZAHL, state().settings.a4);
  stopPlayback();
  playFreqs(reihe.slice(0, bis).map(p => p.freq), { noteDur: 0.75, gap: 0.06 });
  meldeVorspiel(root, `Teiltöne 1 bis ${bis}`);
}

function meldeVorspiel(root, was) {
  const klein = $("#ob-klein", root);
  if (klein) klein.textContent = `spielt vor: ${was}`;
  const btn = $("#ob-anhoeren", root);
  if (btn) btn.textContent = "Vorspiel stoppen";
}

function renderMatching(root) {
  const host = $("#ob-matching", root);
  if (!host) return;
  if (sel.modus !== "matching") { host.innerHTML = ""; return; }

  const schritte = [
    "Wähle einen Teilton: spiel ihn auf dem Grundgriff und halte ihn.",
    "Jetzt denselben Ton mit dem normalen Griff — halte ihn genauso.",
    "Fertig.",
  ];

  host.innerHTML = `
    <div class="panel">
      <p class="hint" style="margin:0 0 10px"><strong>Schritt ${Math.min(matching.schritt + 1, 3)}.</strong>
        ${escapeHtml(schritte[Math.min(matching.schritt, 2)])}</p>
      <div class="ob-match">
        <div class="ob-match-feld${matching.teilton ? " voll" : ""}">
          <b>${matching.teilton ? "Teilton " + matching.teilton.k : "–"}</b>
          <span>${matching.teilton
            ? `${matching.teilton.cents > 0 ? "+" : ""}${matching.teilton.cents} Cent · ${Math.round(matching.teilton.centroid)} Hz`
            : "über das Voicing"}</span>
        </div>
        <div class="ob-match-feld${matching.gegriffen ? " voll" : ""}">
          <b>${matching.gegriffen ? "gegriffen" : "–"}</b>
          <span>${matching.gegriffen
            ? `${matching.gegriffen.cents > 0 ? "+" : ""}${matching.gegriffen.cents} Cent · ${Math.round(matching.gegriffen.centroid)} Hz`
            : "der normale Griff"}</span>
        </div>
      </div>
      ${matching.ergebnis ? `<p class="hint" style="margin:10px 0 0">
        <strong>${Math.abs(matching.ergebnis.centsDiff)} Cent Unterschied,
        Klangfarbe ${matching.ergebnis.relativ > 0 ? "+" : ""}${matching.ergebnis.relativ} %.</strong>
        ${escapeHtml(matching.ergebnis.urteil)}</p>` : ""}
      <div class="row2">
        <button id="ob-match-neu">Von vorn</button>
      </div>
    </div>`;

  $("#ob-match-neu", host).addEventListener("click", () => {
    matching = { schritt: 0, teilton: null, gegriffen: null, ergebnis: null };
    renderMatching(root);
    renderLeiter(root);
  });
}

/* --- Mikrofon --------------------------------------------------------------- */

async function toggleMikro(root) {
  const btn = $("#ob-mikro", root);
  if (mikroAn) {
    pitch.stop();
    releaseScreen();
    mikroAn = false;
    erkannt = null;
    btn.textContent = "Mikrofon einschalten";
    btn.classList.add("primary");
    renderLeiter(root);
    $("#ob-klein", root).textContent = "Mikrofon aus";
    $("#ob-gross", root).textContent = "—";
    return;
  }
  btn.disabled = true;
  try {
    await pitch.start({ spektrum: true });
    mikroAn = true;
    holdScreen();
    btn.textContent = "Mikrofon ausschalten";
    btn.classList.remove("primary");
  } catch (e) {
    console.warn(e);
    $("#ob-hinweis", root).textContent =
      location.protocol === "https:" || location.hostname === "localhost"
        ? "Ohne Mikrofonfreigabe geht es nicht."
        : "Das Mikrofon braucht HTTPS. Über eine reine IP-Adresse geht es nicht.";
    toast("Kein Mikrofon");
  } finally {
    btn.disabled = false;
  }
}

function aufMessung(root, p) {
  const gross = $("#ob-gross", root);
  const klein = $("#ob-klein", root);
  const box = $("#ob-anzeige", root);
  if (!gross) return;

  if (!p || !p.freq) {
    if (erkannt) { erkannt = null; renderLeiter(root); }
    box.classList.remove("treffer");
    if (p && p.silent) {
      gross.textContent = "—";
      klein.textContent = mikroAn ? "hört zu" : "Mikrofon aus";
    }
    halten = { seit: 0, k: 0 };
    return;
  }

  const r = erkennePartial(p.freq, f0());
  erkannt = { ...r, freq: p.freq, centroid: p.centroid || 0 };
  // Die Leiter wird bei jeder Messung neu gezeichnet, nicht nur beim
  // Teiltonwechsel: der Balken zeigt die Abweichung und soll mitlaufen.
  renderLeiter(root);

  box.classList.toggle("treffer", r.sicher && Math.abs(r.abweichungCents) < 20);
  gross.textContent = r.sicher ? "Teilton " + r.k : "dazwischen";
  klein.textContent = r.sicher
    ? `${r.abweichungCents > 0 ? "+" : ""}${r.abweichungCents} Cent · ${p.freq.toFixed(1)} Hz`
    : "kein Teilton — das ist ein Quetschton";

  verfolgeHalten(root, r, p);
}

/** Zählt mit, wie lange ein Teilton ruhig steht. */
function verfolgeHalten(root, r, p) {
  const jetzt = performance.now();
  if (!r.sicher || Math.abs(r.abweichungCents) > 30 || (p.spreadCents || 0) > 25) {
    halten = { seit: 0, k: 0 };
    return;
  }
  if (halten.k !== r.k) { halten = { seit: jetzt, k: r.k, centsSumme: 0, n: 0, centroidSumme: 0 }; }
  halten.centsSumme += r.abweichungCents;
  halten.centroidSumme += p.centroid || 0;
  halten.n++;
  if (jetzt - halten.seit < HALTEN_MS) return;

  const mittelCents = Math.round(halten.centsSumme / halten.n);
  const mittelCentroid = halten.centroidSumme / halten.n;
  halten = { seit: jetzt + 1e9, k: r.k };    // erst bei Tonwechsel wieder

  const d = drill(drillId(), { hoechster: 0 });
  if (r.k > (d.hoechster || 0)) {
    recordDrill(drillId(), { hoechster: r.k });
    toast(`Teilton ${r.k} gehalten — neuer Höchstwert`);
  }

  if (sel.modus === "reihe" && r.k === ziel) {
    sigOk();
    ziel = Math.min(ANZAHL, ziel + 1);
    renderLeiter(root);
    toast(`Teilton ${r.k} sitzt. Weiter zu ${ziel}.`);
  }

  if (sel.modus === "matching") {
    if (matching.schritt === 0) {
      matching.teilton = { k: r.k, cents: mittelCents, centroid: mittelCentroid };
      matching.schritt = 1;
      sigOk();
      renderMatching(root); renderLeiter(root);
    } else if (matching.schritt === 1) {
      // Im zweiten Schritt wird mit normalem Griff gespielt; dort ist die
      // Abweichung nicht gegen den Teilton zu rechnen, sondern gegen die
      // gleichstufige Tonhöhe.
      const midiExact = freqToMidi(p.freq, state().settings.a4);
      const cents = Math.round((midiExact - Math.round(midiExact)) * 100);
      matching.gegriffen = { cents, centroid: mittelCentroid };
      matching.ergebnis = vergleicheMatching(matching.teilton, matching.gegriffen);
      matching.schritt = 2;
      sigOk();
      renderMatching(root);
    }
  }
}

export default {
  id: "obertoene",
  label: "Obertöne",
  mount(root) {
    render(root);
    offPitch = pitch.onPitch(p => aufMessung(root, p));
  },
  unmount() {
    stopPlayback();
    if (offPlayback) { offPlayback(); offPlayback = null; }
    offPitch?.();
    if (mikroAn) { pitch.stop(); mikroAn = false; }
    releaseScreen();
    erkannt = null;
    matching = { schritt: 0 };
  },
};
