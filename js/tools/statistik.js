/* ==========================================================================
   Auswertung

   Die Abnahme aus der Roadmap lautet: nach zwei Wochen muss erkennbar sein,
   welcher Block regelmäszig ausgelassen wird. Genau darauf ist diese Ansicht
   gebaut — nicht auf hübsche Gesamtsummen.

   Gerechnet wird mit `spent`, also der tatsächlich am Instrument verbrachten
   Zeit, nicht mit den geplanten Minuten. Der Unterschied zwischen beiden ist
   die ehrlichste Zahl, die die App hat.
   ========================================================================== */

"use strict";

import { $, el, escapeHtml, humanMinutes, todayISO, parseISO, daysBetween } from "../core/dom.js";
import { state } from "../core/store.js";
import { BLOCKS, planFor } from "../data/plan.js";

/* --- Auswerten -------------------------------------------------------------- */

/** Alle Tage mit Daten, aufsteigend. Der heutige Tag zählt mit, auch wenn
    er noch nicht gespeichert ist. */
function tage() {
  const s = state();
  const map = new Map();
  for (const e of s.log) {
    const t = map.get(e.date) || { date: e.date, minuten: 0, bloecke: new Set(), notiz: [] };
    t.minuten += e.spent || e.minutes || 0;
    for (const b of e.blocks || []) t.bloecke.add(b);
    if (e.note) t.notiz.push(e.note);
    map.set(e.date, t);
  }
  const heuteSpent = Math.round(
    Object.values(s.day.spent || {}).reduce((a, v) => a + v, 0) / 60);
  if (heuteSpent > 0 && !map.has(s.day.date)) {
    map.set(s.day.date, {
      date: s.day.date, minuten: heuteSpent, offen: true,
      bloecke: new Set(planFor(s.kontext, s.week).filter(b => s.day.done.includes(b.id)).map(b => b.name)),
      notiz: [],
    });
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Längste Kette aufeinanderfolgender Tage, die heute oder gestern endet. */
function serie(liste) {
  if (!liste.length) return { aktuell: 0, beste: 0 };
  const heute = todayISO();
  let beste = 1, lauf = 1;
  for (let i = 1; i < liste.length; i++) {
    lauf = daysBetween(liste[i - 1].date, liste[i].date) === 1 ? lauf + 1 : 1;
    beste = Math.max(beste, lauf);
  }
  const letzter = liste[liste.length - 1].date;
  const abstand = daysBetween(letzter, heute);
  // Gestern zählt noch als laufend — sonst reiszt die Serie jeden Morgen.
  const aktuell = abstand <= 1 ? lauf : 0;
  return { aktuell, beste };
}

/** Wie oft ein Block in den letzten N Tagen vorkam, je Block. */
function blockVerteilung(liste, tageZurueck = 28) {
  const s = state();
  const grenze = liste.length
    ? liste.filter(t => daysBetween(t.date, todayISO()) < tageZurueck)
    : [];
  const zaehler = new Map(BLOCKS.map(b => [b.name, 0]));
  for (const t of grenze) for (const name of t.bloecke) {
    if (zaehler.has(name)) zaehler.set(name, zaehler.get(name) + 1);
  }
  // Sekunden je Block aus dem laufenden Tag mitzählen, sonst fehlt heute.
  return { zaehler, tage: grenze.length };
}

/* --- Ansicht ----------------------------------------------------------------- */

function render(root) {
  const liste = tage();
  const s = serie(liste);
  const gesamt = liste.reduce((a, t) => a + t.minuten, 0);
  const { zaehler, tage: nTage } = blockVerteilung(liste);

  if (!liste.length) {
    root.innerHTML = `<p class="empty">
      Noch keine Daten. Nach der ersten gespeicherten Session steht hier, wie
      viel du wirklich gespielt hast — und nach zwei Wochen, welchen Block du
      immer wieder auslässt.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="stat-row">
      <div class="stat"><b>${s.aktuell}</b><span>Tage in Folge</span></div>
      <div class="stat"><b>${liste.length}</b><span>Übetage</span></div>
      <div class="stat"><b>${Math.round(gesamt / 60)}</b><span>Stunden gesamt</span></div>
    </div>
    ${s.beste > s.aktuell ? `<p class="hint">Deine längste Serie war ${s.beste} Tage.</p>` : ""}

    <h2>Letzte vier Wochen</h2>
    <p class="hint">Jeder Balken ein Tag, Höhe sind die Minuten am Instrument.</p>
    <div class="daybars" id="daybars"></div>

    <h2>Welcher Block fällt aus?</h2>
    <p class="hint">
      An wie vielen der letzten ${nTage} ${nTage === 1 ? "Übetag" : "Übetage"} kam
      jeder Block vor. Was unten steht, überspringst du — und das ist meistens
      das, was du am nötigsten hättest.
    </p>
    <div id="blockbars"></div>

    <h2>Geplant gegen wirklich</h2>
    <p class="hint">
      Links die geplanten Minuten, rechts die, die der Timer wirklich
      mitgelaufen ist. Eine Lücke ist kein Vorwurf, sondern eine Information:
      dann ist der Plan zu lang, nicht du zu faul.
    </p>
    <div id="planreal"></div>`;

  renderDayBars(root, liste);
  renderBlockBars(root, zaehler, nTage);
  renderPlanReal(root);
}

function renderDayBars(root, liste) {
  const host = $("#daybars", root);
  const heute = todayISO();
  const proTag = new Map(liste.map(t => [t.date, t]));
  const max = Math.max(30, ...liste.map(t => t.minuten));

  const felder = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(parseISO(heute));
    d.setDate(d.getDate() - i);
    const iso = todayISO(d);
    const t = proTag.get(iso);
    const h = t ? Math.max(4, Math.round(100 * t.minuten / max)) : 0;
    const wochentag = d.toLocaleDateString("de-AT", { weekday: "short" });
    felder.push(`<div class="daybar" title="${iso}: ${t ? t.minuten + " min" : "nichts"}">
      <i style="height:${h}%"></i>
      ${i % 7 === 0 ? `<u>${escapeHtml(wochentag)}</u>` : "<u></u>"}
    </div>`);
  }
  host.innerHTML = felder.join("");
}

function renderBlockBars(root, zaehler, nTage) {
  const host = $("#blockbars", root);
  const eintraege = BLOCKS.map(b => ({ name: b.name, n: zaehler.get(b.name) || 0 }))
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, nTage);

  host.innerHTML = eintraege.map(e => {
    const anteil = Math.round(100 * e.n / max);
    return `<div class="bbar">
      <span class="bbar-name">${escapeHtml(e.name)}</span>
      <span class="bbar-track"><i style="width:${anteil}%"></i></span>
      <span class="bbar-n">${e.n}</span>
    </div>`;
  }).join("");

  const schwach = eintraege.filter(e => e.n < nTage * 0.4);
  if (schwach.length && nTage >= 5) {
    host.insertAdjacentHTML("beforeend", `<p class="hint spaced">
      Selten dran: ${schwach.map(e => escapeHtml(e.name)).join(", ")}.
      Zieh diesen Block morgen nach vorn — hinten fällt immer dasselbe weg.
    </p>`);
  }
}

function renderPlanReal(root) {
  const host = $("#planreal", root);
  const s = state();
  const plan = planFor(s.kontext, s.week);

  // Summe der wirklich verbrachten Sekunden je Block über das Protokoll
  // hinweg lässt sich nicht rekonstruieren — gespeichert wird nur die
  // Tagessumme. Deshalb zeigt diese Tabelle den heutigen Tag.
  const zeilen = plan.map(b => {
    const echt = Math.round((s.day.spent[b.id] || 0) / 60);
    return { name: b.name, geplant: b.min, echt };
  });
  const hatDaten = zeilen.some(z => z.echt > 0);

  if (!hatDaten) {
    host.innerHTML = `<p class="hint">
      Heute lief der Timer noch nicht. Sobald er läuft, steht hier Block für
      Block, wie weit Plan und Wirklichkeit auseinandergehen.</p>`;
    return;
  }

  const max = Math.max(...zeilen.map(z => Math.max(z.geplant, z.echt)));
  host.innerHTML = zeilen.map(z => `
    <div class="pr-row">
      <span class="pr-name">${escapeHtml(z.name)}</span>
      <span class="pr-bars">
        <i class="plan" style="width:${100 * z.geplant / max}%"></i>
        <i class="echt" style="width:${100 * z.echt / max}%"></i>
      </span>
      <span class="pr-n">${z.echt}/${z.geplant}</span>
    </div>`).join("");
}

export default {
  id: "statistik",
  label: "Auswertung",
  mount(root) { render(root); },
};
