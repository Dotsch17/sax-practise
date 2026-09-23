/* ==========================================================================
   Klavierstück üben

   Für jemanden, der am Klavier bei null anfängt, ist ein ganzes Stück zu
   groß, um es „zu üben“. Man übt Abschnitte, jede Hand für sich, dann
   zusammen, dann schneller — und verliert dabei leicht den Überblick,
   welcher Abschnitt wo steht. Das nimmt dieses Werkzeug ab.

   Je Abschnitt drei Stufen für rechts, links und zusammen: noch nicht,
   langsam sicher, im Tempo. „Zusammen“ geht erst, wenn beide Hände allein
   sitzen — das ist keine Bevormundung, sondern die Reihenfolge, in der man
   Klavier lernt. Dazu das Tempo je Abschnitt mit Metronom, und oben der
   eine Abschnitt, der heute dran ist.

   Fingersätze stehen hier nicht: die legt der Lehrer fest und sie gehören
   in die Noten. Wie bei den Kadenzen.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO } from "../core/dom.js";
import { state, drill, save } from "../core/store.js";
import { eintrag, VORSCHLAEGE } from "../data/pruefung.js";
import * as metro from "../audio/metronome.js";
import { vorwaehlen as aufnahmeVorwaehlen } from "./aufnahme.js";

let root = null;
let offen = null;          // id des gewählten Stücks
let offMetro = null;
let laufendeStelle = null;

const STUFEN = ["noch nicht", "langsam sicher", "im Tempo"];
const liste = () => drill("klavierstueck:liste", { stuecke: [] }).stuecke;
const neueId = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* Was ist an einem Abschnitt als Nächstes zu tun? In der Reihenfolge, in
   der man übt: rechts, links, zusammen, dann das Tempo. */
function naechsterSchritt(st, ziel) {
  if (st.rechts < 1) return "Rechte Hand allein, so langsam, dass kein Fehler passiert.";
  if (st.links < 1) return "Linke Hand allein, genauso langsam.";
  if (st.zusammen < 1) return "Zusammen — noch langsamer als jede Hand allein. Erst die Hände, dann das Tempo.";
  if (st.rechts < 2 || st.links < 2) return "Die Hand, die noch nicht im Tempo sitzt, allein ins Tempo bringen.";
  if (st.zusammen < 2 || st.tempo < ziel) return `Tempo steigern: dreimal fehlerfrei bei ${st.tempo}, dann ${Math.min(ziel, st.tempo + 4)}.`;
  return "Sitzt. Mit dem Abschnitt davor verbinden — immer mit dem letzten Takt davor anfangen.";
}
const fortschritt = st => st.rechts + st.links + 2 * st.zusammen + (st.tempo >= st.ziel ? 1 : 0);

/* Was heute dran ist: zuerst der Reihe nach, bis jeder Abschnitt
   zusammen langsam sitzt — so lernt man ein Stück von vorn nach hinten.
   Danach geht es ums Tempo, und dann um den Abschnitt, der am weitesten
   zurück ist. */
function heuteDran(stueck) {
  if (!stueck.stellen.length) return null;
  const offen = stueck.stellen.find(s => s.zusammen < 1);
  if (offen) return offen;
  return [...stueck.stellen].map((s, i) => ({ s, i, f: fortschritt({ ...s, ziel: stueck.zielTempo }) }))
    .sort((a, b) => a.f - b.f || a.i - b.i)[0].s;
}

/* --- Ansicht --------------------------------------------------------------------- */

function render() {
  if (!root) return;
  const stuecke = liste();
  const stueck = stuecke.find(s => s.id === offen) || stuecke[0] || null;
  if (stueck) offen = stueck.id;
  const ausCockpit = ["klavier1", "klavier2"].map(id => eintrag(state().drills, id).titel).filter(Boolean)
    .filter(t => !stuecke.some(s => s.titel === t));

  root.innerHTML = `
    <details class="ks-anleitung"${stuecke.length ? "" : " open"}>
      <summary>So lernst du ein Klavierstück, wenn du bei null anfängst</summary>
      <ol class="stil-schritte">
        <li><b>Anhören.</b><p>Eine gute Aufnahme mehrmals hören und mitlesen. Wer weiß, wie es klingen soll, merkt Fehler sofort.</p></li>
        <li><b>Einteilen.</b><p>In Abschnitte von zwei bis vier Takten, meist entlang der Phrasen. Die schwerste Stelle bekommt einen eigenen Abschnitt.</p></li>
        <li><b>Fingersatz festlegen.</b><p>Mit dem Lehrer, in die Noten schreiben, und dann nie mehr ändern. Ein wechselnder Fingersatz ist der häufigste Grund, warum eine Stelle nie sitzt.</p></li>
        <li><b>Hände einzeln, langsam.</b><p>So langsam, dass kein Fehler passiert — mit Metronom. Ein geübter Fehler ist schwerer loszuwerden als ein neuer Ton zu lernen.</p></li>
        <li><b>Zusammen, noch langsamer.</b><p>Erst wenn jede Hand allein sicher ist. Zusammen ist eine neue Aufgabe, nicht die Summe von zwei alten.</p></li>
        <li><b>Tempo in kleinen Schritten.</b><p>Dreimal hintereinander fehlerfrei, dann vier Schläge schneller. Geht es nicht mehr, zurück, nicht weiter.</p></li>
        <li><b>Verbinden.</b><p>Jeden Abschnitt mit dem letzten Takt des vorigen beginnen — die Übergänge sind die Stellen, an denen man im Vorspiel hängenbleibt.</p></li>
        <li><b>Durchlauf und Aufnahme.</b><p>Erst wenn alle Abschnitte im Tempo sitzen. Dann einmal am Stück, aufgenommen, und am nächsten Tag anhören.</p></li>
      </ol>
      <p class="hint">Für die Prüfung verlangt die mdw zwei Stücke verschiedener Epochen, eines darf aus der Popularmusik sein.
        Beispiele: ${VORSCHLAEGE.klavier.map(v => escapeHtml(v.titel)).join("; ")}.</p>
    </details>

    <div class="chips scroll" id="ks-stuecke" role="group" aria-label="Stück"></div>
    ${stueck ? stueckHtml(stueck) : `<p class="hint">Noch kein Stück angelegt. Trag das Stück ein, das du mit deinem Lehrer ausgesucht hast.</p>`}

    <h3>Neues Stück</h3>
    ${ausCockpit.length ? `<div class="chips">${ausCockpit.map(t => `<button class="chip" data-cockpit="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}</div>
      <p class="hint">Aus dem Prüfungs-Cockpit.</p>` : ""}
    <label class="feld">Titel<input type="text" id="ks-titel" placeholder="z. B. Bartók, Mikrokosmos Nr. 30"></label>
    <button class="wide" id="ks-anlegen">Stück anlegen</button>`;

  const chips = $("#ks-stuecke", root);
  for (const s of stuecke) chips.append(el("button", {
    class: "chip" + (s.id === offen ? " on" : ""), text: s.titel,
    on: { click: () => { stoppeMetro(); offen = s.id; render(); } },
  }));
  $$("[data-cockpit]", root).forEach(b => b.addEventListener("click", () => anlegen(b.dataset.cockpit)));
  $("#ks-anlegen", root).addEventListener("click", () => anlegen($("#ks-titel", root).value.trim()));
  if (stueck) verdrahteStueck(stueck);
}

function stueckHtml(stueck) {
  const dran = heuteDran(stueck);
  const fertig = stueck.stellen.filter(s => s.zusammen >= 2 && s.tempo >= stueck.zielTempo).length;
  return `
    <div class="ks-kopf">
      <label>Zieltempo<input type="number" id="ks-ziel" min="30" max="200" value="${stueck.zielTempo}"></label>
      <span class="hint">${stueck.stellen.length ? `${fertig} von ${stueck.stellen.length} Abschnitten im Tempo` : ""}</span>
    </div>
    ${dran ? `<div class="rat">
      <div class="rat-kopf">Heute dran</div>
      <b class="rat-titel">${escapeHtml(dran.name)}</b>
      <p class="rat-grund">${escapeHtml(naechsterSchritt(dran, stueck.zielTempo))}</p>
    </div>` : ""}

    <div class="ks-stellen">${stueck.stellen.map(s => stelleHtml(s, s === dran)).join("")}</div>

    <div class="ks-neu">
      <label class="feld">Abschnitt<input type="text" id="ks-stelle" placeholder="z. B. Takt 1–4"></label>
      <button id="ks-stelle-dazu">Dazu</button>
    </div>
    ${stueck.stellen.length ? "" : `
    <div class="ks-neu">
      <label class="feld">Takte im Stück<input type="number" id="ks-takte" min="4" max="200" placeholder="32"></label>
      <label class="feld">je Abschnitt<input type="number" id="ks-je" min="1" max="16" value="4"></label>
      <button id="ks-teilen">Einteilen</button>
    </div>`}
    <div class="row2">
      <button id="ks-aufnahme">Durchlauf aufnehmen</button>
      <button id="ks-loeschen" class="linkish">Stück entfernen</button>
    </div>`;
}

function stelleHtml(s, dran) {
  const knopf = (hand, label, gesperrt = false) =>
    `<button class="ks-hand stufe-${s[hand]}" data-hand="${hand}" ${gesperrt ? "disabled" : ""} title="${escapeHtml(STUFEN[s[hand]])}">
      <b>${label}</b><small>${escapeHtml(STUFEN[s[hand]])}</small></button>`;
  const spielt = laufendeStelle === s.id && metro.isRunning();
  return `<div class="ks-stelle${dran ? " dran" : ""}" data-stelle="${s.id}">
    <div class="ks-stelle-kopf"><b>${escapeHtml(s.name)}</b><button class="linkish ks-weg" aria-label="Abschnitt entfernen">✕</button></div>
    <div class="ks-haende">
      ${knopf("rechts", "Rechts")}
      ${knopf("links", "Links")}
      ${knopf("zusammen", "Zusammen", s.rechts < 1 || s.links < 1)}
    </div>
    <div class="ks-tempo">
      <button class="ks-minus" aria-label="Langsamer">−</button>
      <span><b>${s.tempo}</b> Schläge/min</span>
      <button class="ks-plus" aria-label="Schneller">+</button>
      <button class="ks-metro${spielt ? " on" : ""}">${spielt ? "Metronom aus" : "Metronom"}</button>
    </div>
  </div>`;
}

function verdrahteStueck(stueck) {
  const speichern = () => { save(); render(); };
  $("#ks-ziel", root).addEventListener("change", e => {
    stueck.zielTempo = Math.max(30, Math.min(200, Number(e.target.value) || stueck.zielTempo));
    speichern();
  });
  $$(".ks-stelle", root).forEach(zeile => {
    const s = stueck.stellen.find(x => x.id === zeile.dataset.stelle);
    $$(".ks-hand", zeile).forEach(b => b.addEventListener("click", () => {
      const hand = b.dataset.hand;
      s[hand] = (s[hand] + 1) % 3;
      // Geht eine Hand zurück, kann „zusammen“ nicht weiter sein als sie.
      if (hand !== "zusammen") s.zusammen = Math.min(s.zusammen, s.rechts, s.links);
      s.geaendert = todayISO();
      speichern();
    }));
    const tempo = d => {
      s.tempo = Math.max(30, Math.min(220, s.tempo + d));
      if (laufendeStelle === s.id && metro.isRunning()) metro.configure({ bpm: s.tempo });
      speichern();
    };
    $(".ks-minus", zeile).addEventListener("click", () => tempo(-4));
    $(".ks-plus", zeile).addEventListener("click", () => tempo(4));
    $(".ks-metro", zeile).addEventListener("click", () => {
      if (laufendeStelle === s.id && metro.isRunning()) { stoppeMetro(); render(); return; }
      metro.configure({ bpm: s.tempo });
      if (!metro.isRunning()) metro.start();
      laufendeStelle = s.id;
      render();
    });
    $(".ks-weg", zeile).addEventListener("click", () => {
      if (!confirm(`Abschnitt „${s.name}“ entfernen?`)) return;
      stueck.stellen = stueck.stellen.filter(x => x !== s);
      speichern();
    });
  });
  $("#ks-stelle-dazu", root).addEventListener("click", () => {
    const name = $("#ks-stelle", root).value.trim() || `Abschnitt ${stueck.stellen.length + 1}`;
    stueck.stellen.push(neueStelle(name, stueck));
    speichern();
  });
  $("#ks-teilen", root)?.addEventListener("click", () => {
    const takte = Number($("#ks-takte", root).value), je = Number($("#ks-je", root).value) || 4;
    if (!takte) { toast("Wie viele Takte hat das Stück?"); return; }
    for (let t = 1; t <= takte; t += je) stueck.stellen.push(neueStelle(`Takt ${t}–${Math.min(takte, t + je - 1)}`, stueck));
    speichern();
  });
  $("#ks-aufnahme", root).addEventListener("click", () => {
    aufnahmeVorwaehlen(stueck.titel);
    location.hash = "#ueben/aufnahme";
  });
  $("#ks-loeschen", root).addEventListener("click", () => {
    if (!confirm(`„${stueck.titel}“ mit allen Abschnitten entfernen?`)) return;
    const l = liste();
    l.splice(l.indexOf(stueck), 1);
    offen = null;
    stoppeMetro();
    speichern();
  });
}

const neueStelle = (name, stueck) => ({
  id: neueId(), name, rechts: 0, links: 0, zusammen: 0,
  // Anfangen bei der Hälfte des Zieltempos, aber nicht unter 40.
  tempo: Math.max(40, Math.round(stueck.zielTempo / 2 / 4) * 4),
});

function anlegen(titel) {
  if (!titel) { toast("Titel fehlt"); return; }
  const s = { id: neueId(), titel, zielTempo: 80, stellen: [], erstellt: todayISO() };
  liste().push(s);
  offen = s.id;
  save();
  render();
}

function stoppeMetro() {
  if (laufendeStelle && metro.isRunning()) metro.stop();
  laufendeStelle = null;
}

export default {
  id: "klavierstueck",
  label: "Klavierstück",
  mount(r) {
    root = r;
    render();
    offMetro = metro.onStateChange(() => { if (!metro.isRunning() && laufendeStelle) { laufendeStelle = null; render(); } });
  },
  unmount() { offMetro?.(); offMetro = null; root = null; },
};
