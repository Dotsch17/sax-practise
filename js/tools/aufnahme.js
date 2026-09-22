/* ==========================================================================
   Aufnahme

   Aufnehmen, anhören, vergleichen. Das ist die Rückmeldung, die keine
   Messung ersetzt: ob eine Phrase trägt, ob die Time sitzt, ob der Ton
   nach etwas klingt. Man hört es beim Spielen nicht, weil man beim Spielen
   hört, was man spielen wollte.

   Jede Aufnahme hat einen Titel — das Stück, die Etüde, die Übung. Unter
   demselben Titel lässt sich die erste gegen die letzte Aufnahme hören. Das
   ist der Vergleich, der zeigt, ob sich in vier Wochen etwas bewegt hat,
   und er ist der beste Grund, weiterzumachen.

   Die Regel dazu steht im Wissensteil unter „Vorspielen“: nicht am selben
   Tag anhören, an dem man aufgenommen hat. Am nächsten Tag hört man, was
   wirklich da war.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO, mmss } from "../core/dom.js";
import { state, save } from "../core/store.js";
import * as rek from "../audio/rekorder.js";
import * as db from "../core/aufnahmen.js";
import { programmTitel } from "../data/pruefung.js";
import { holdScreen, releaseScreen } from "../core/session.js";

let vorgewaehlt = null;
let root = null;
let raf = null;
let urls = [];
let zuletzt = null;         // id der eben gespeicherten Aufnahme

/** Andere Werkzeuge schicken den Nutzer mit einem Titel hierher. */
export function vorwaehlen(titel) { vorgewaehlt = titel; }

const aktuellerTitel = () => state().settings.aufnahmeTitel || "";

function setzeTitel(t) {
  state().settings.aufnahmeTitel = t;
  save();
}

/* --- Ansicht ---------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (!rek.unterstuetzt()) {
    root.innerHTML = `<p class="empty">Dieser Browser kann nicht aufnehmen. Auf dem iPhone
      geht es in Safari und als Home-Bildschirm-App ab iOS 14.3.</p>`;
    return;
  }

  root.innerHTML = `
    <label class="feld">Was nimmst du auf?
      <input type="text" id="au-titel" placeholder="Stück, Etüde oder Übung" autocomplete="off">
    </label>
    <div class="chips scroll" id="au-vorschlaege" role="group" aria-label="Titel"></div>

    <button class="wide primary au-knopf" id="au-start"></button>
    <div class="au-pegel" id="au-pegel" hidden><i></i></div>
    <p class="hint" id="au-hinweis"></p>

    <div id="au-neu"></div>

    <h2>Deine Aufnahmen</h2>
    <p class="hint">
      Die Aufnahmen liegen nur auf diesem Gerät und nicht im Export unter
      Daten. Was du behalten willst, sicherst du einzeln als Datei. Hör sie
      dir am nächsten Tag an, nicht am selben.
    </p>
    <div id="au-liste"><p class="hint">lädt …</p></div>`;

  const input = $("#au-titel", root);
  input.value = aktuellerTitel();
  input.addEventListener("change", () => setzeTitel(input.value.trim()));
  renderVorschlaege();
  renderKnopf();
  $("#au-start", root).addEventListener("click", umschalten);
  renderListe();
}

function renderVorschlaege() {
  const host = $("#au-vorschlaege", root);
  if (!host) return;
  db.alle().catch(() => []).then(liste => {
    const titel = [...new Set([
      ...programmTitel(state().drills),
      ...liste.map(a => a.titel).filter(Boolean),
      "Tonleitern", "Lange Töne",
    ])].slice(0, 14);
    host.innerHTML = "";
    for (const t of titel) {
      host.append(el("button", {
        class: "chip" + (t === aktuellerTitel() ? " on" : ""),
        text: t,
        on: { click: () => {
          setzeTitel(t);
          $("#au-titel", root).value = t;
          renderVorschlaege();
        } },
      }));
    }
  });
}

function renderKnopf() {
  const b = $("#au-start", root);
  if (!b) return;
  b.textContent = rek.laeuft() ? `Stopp · ${mmss(rek.sekunden())}` : "Aufnehmen";
  b.classList.toggle("laeuft", rek.laeuft());
  $("#au-pegel", root).hidden = !rek.laeuft();
  if (!rek.laeuft()) {
    $("#au-hinweis", root).textContent =
      "Telefon etwa einen Meter vor dem Schallbecher, leicht seitlich. Erst einspielen, dann aufnehmen — und dann durchspielen, ohne abzubrechen.";
  }
}

function pegelSchleife() {
  raf = requestAnimationFrame(pegelSchleife);
  if (!root || !rek.laeuft()) return;
  const p = rek.pegel();
  const balken = $("#au-pegel i", root);
  if (balken) balken.style.width = Math.min(100, Math.round(p.spitze * 100)) + "%";
  const knopf = $("#au-start", root);
  if (knopf) knopf.textContent = `Stopp · ${mmss(rek.sekunden())}`;
  const h = $("#au-hinweis", root);
  if (h) h.textContent = p.maxSpitze > 0.98
    ? "Übersteuert. Das Telefon weiter weg, sonst ist die Aufnahme verzerrt."
    : p.rms < 0.005 && rek.sekunden() > 3
      ? "Kaum Pegel. Ist das Mikrofon frei?"
      : "Läuft. Nicht abbrechen, auch wenn etwas danebengeht.";
}

async function umschalten() {
  if (rek.laeuft()) { await beende(); return; }
  const t = $("#au-titel", root)?.value.trim();
  if (t) setzeTitel(t);
  try {
    await rek.starte();
    holdScreen();
    zuletzt = null;
    $("#au-neu", root).innerHTML = "";
    renderKnopf();
    cancelAnimationFrame(raf);
    pegelSchleife();
  } catch (e) {
    console.warn(e);
    toast("Mikrofon nicht verfügbar");
  }
}

async function beende() {
  cancelAnimationFrame(raf);
  raf = null;
  try {
    const { blob, mime, dauer, spitze } = await rek.stoppe();
    releaseScreen();
    if (dauer < 1.5) { toast("Zu kurz, nicht gespeichert"); renderKnopf(); return; }
    const e = await db.speichere({
      titel: aktuellerTitel() || "Ohne Titel",
      datum: todayISO(),
      dauer, mime, groesse: blob.size, spitze, blob,
    });
    zuletzt = e.id;
    toast("Aufnahme gespeichert");
  } catch (e) {
    console.warn(e);
    toast("Aufnahme konnte nicht gespeichert werden");
  }
  if (!root) return;
  renderKnopf();
  renderNeu();
  renderVorschlaege();
  renderListe();
}

/* Direkt nach der Aufnahme: eine Zeile, was auffiel. Sofort, solange man
   es noch weiß — anhören erst morgen. */
function renderNeu() {
  const host = $("#au-neu", root);
  if (!host || !zuletzt) return;
  host.innerHTML = `
    <div class="panel">
      <label class="feld">Was ist dir beim Spielen aufgefallen?
        <textarea id="au-notiz" placeholder="Wo es wackelte, was gut ging, welches Blatt"></textarea>
      </label>
      <button class="wide" id="au-notiz-ok">Notiz speichern</button>
    </div>`;
  $("#au-notiz-ok", host).addEventListener("click", async () => {
    await db.aendere(zuletzt, { notiz: $("#au-notiz", host).value.trim() });
    host.innerHTML = "";
    zuletzt = null;
    toast("Notiz gespeichert");
    renderListe();
  });
}

function freigeben() {
  for (const u of urls) URL.revokeObjectURL(u);
  urls = [];
}

const url = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
const endung = mime => /mp4|aac|m4a/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : "webm";
const dateiname = a => `${a.datum} ${a.titel}`.replace(/[\\/:*?"<>|]+/g, "-") + "." + endung(a.mime);

function zeile(a) {
  return `<div class="au-zeile" data-id="${a.id}">
    <div class="au-kopf">
      <b>${escapeHtml(a.datum)}</b>
      <span>${mmss(a.dauer)}${a.spitze > 0.98 ? " · übersteuert" : ""}</span>
    </div>
    <audio controls preload="metadata" src="${url(a.blob)}"></audio>
    ${a.notiz ? `<p class="au-notiz">${escapeHtml(a.notiz)}</p>` : ""}
    <div class="au-aktionen">
      <a class="linkish" href="${url(a.blob)}" download="${escapeHtml(dateiname(a))}">Als Datei sichern</a>
      <button class="linkish au-weg">Löschen</button>
    </div>
  </div>`;
}

async function renderListe() {
  const host = $("#au-liste", root);
  if (!host) return;
  let liste;
  try { liste = await db.alle(); }
  catch (e) { host.innerHTML = `<p class="empty">Der Speicher für Aufnahmen ist nicht erreichbar.</p>`; return; }
  if (!root || !$("#au-liste", root)) return;
  freigeben();
  if (!liste.length) {
    host.innerHTML = `<p class="empty">Noch keine Aufnahmen. Nimm heute etwas auf, das du in
      vier Wochen wieder aufnimmst — dann hörst du, was sich getan hat.</p>`;
    return;
  }
  host.innerHTML = db.nachTitel(liste).map(g => {
    const erste = g.eintraege[g.eintraege.length - 1];
    const letzte = g.eintraege[0];
    const vergleich = g.eintraege.length >= 2 ? `
      <div class="au-vergleich">
        <div><span class="hint">Erste · ${escapeHtml(erste.datum)}</span>
          <audio controls preload="metadata" src="${url(erste.blob)}"></audio></div>
        <div><span class="hint">Letzte · ${escapeHtml(letzte.datum)}</span>
          <audio controls preload="metadata" src="${url(letzte.blob)}"></audio></div>
      </div>` : "";
    return `<details class="au-gruppe"${g.titel === aktuellerTitel() ? " open" : ""}>
      <summary><b>${escapeHtml(g.titel)}</b> <span>${g.eintraege.length}</span></summary>
      ${vergleich}
      ${g.eintraege.map(zeile).join("")}
    </details>`;
  }).join("");

  $$(".au-weg", host).forEach(b => b.addEventListener("click", async () => {
    const id = b.closest(".au-zeile").dataset.id;
    if (!confirm("Diese Aufnahme endgültig löschen?")) return;
    await db.loesche(id);
    toast("Gelöscht");
    renderListe();
  }));
}

export default {
  id: "aufnahme",
  label: "Aufnahme",
  mount(r) {
    root = r;
    if (vorgewaehlt) { setzeTitel(vorgewaehlt); vorgewaehlt = null; }
    render();
    if (rek.laeuft()) pegelSchleife();
  },
  // Eine laufende Aufnahme wird beim Verlassen gespeichert, nicht verworfen:
  // wer mitten im Durchlauf den Reiter wechselt, will ihn trotzdem haben.
  unmount() {
    const lief = rek.laeuft();
    cancelAnimationFrame(raf);
    raf = null;
    root = null;
    if (lief) beende();
    freigeben();
  },
};
