/* ==========================================================================
   Setlist

   Das Repertoire für Hochzeiten, Aperitivi und DJ-Sets: welche Stücke, in
   welcher Griff-Tonart, was du darin spielst und wann. Dazu ein Set in der
   Reihenfolge des Abends und eine Bühnenansicht, die man am Notenständer
   mit einem Tipp weiterblättert.

   Die Songs sind dieselben wie in „Zum Song spielen“. Dort findet man
   Tonart und Form am Original; hier kommt dazu, was auf dem Gig zählt. Ein
   Song, der hier angelegt wird, steht auch dort, und umgekehrt.

   Die Bühnenkarte zeigt genau das, was man in drei Sekunden lesen kann,
   während der DJ schon den nächsten Track anspielt: Griff-Tonart groß,
   dein Einsatz, das Tempo. Nichts, was man suchen muss.
   ========================================================================== */

"use strict";

import { $, $$, el, escapeHtml, toast, todayISO } from "../core/dom.js";
import { drill, save } from "../core/store.js";
import {
  ROLLEN, STUFEN, VORSCHLAEGE, griffTonart, klingendTonart, setAus, bereitschaft,
} from "../data/setlist.js";
import { oeffneSong } from "./songmitspielen.js";
import { holdScreen, releaseScreen } from "../core/session.js";

const LISTE = "songmitspielen:liste";
const GRIFFE = ["C", "Des", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"];

let root = null;
let ansicht = "liste";          // "liste" | "song" | "buehne"
let offen = null;               // id des offenen Songs
let buehneIdx = 0;

const songs = () => drill(LISTE, { songs: [] }).songs;
const songOf = id => songs().find(s => s.id === id);
const setIds = () => drill("setlist:set", { ids: [] }).ids;
const gig = s => (s.gig ||= { interpret: "", fassung: "", rollen: [], bpm: null, einsatz: "", stufe: 0 });

function neuerSong(titel, extra = {}) {
  const s = {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    titel: titel.trim(), angelegt: todayISO(),
    griffPc: null, geschlecht: null, form: null, erledigt: [], notiz: "",
    gig: { interpret: "", fassung: "", rollen: [], bpm: null, einsatz: "", stufe: 0, ...extra },
  };
  songs().unshift(s);
  save();
  return s;
}

function gehZu(tab, tool) { location.hash = `#${tab}/${tool}`; }

/* --- Liste ------------------------------------------------------------------- */

function render() {
  if (!root) return;
  if (ansicht === "song" && songOf(offen)) return renderSong(songOf(offen));
  if (ansicht === "buehne") return renderBuehne();
  ansicht = "liste";

  const alle = songs();
  const set = setAus(setIds(), alle);
  const b = bereitschaft(set);
  const titel = new Set(alle.map(s => s.titel.toLowerCase()));
  const vorschlaege = VORSCHLAEGE.filter(v => !titel.has(v.titel.toLowerCase()));

  root.innerHTML = `
    <section class="panel">
      <h3 style="margin-top:0">Set für den nächsten Gig</h3>
      ${set.length ? `
        <p class="hint">${set.length} ${set.length === 1 ? "Song" : "Songs"}, davon ${b.reif} gig-reif.</p>
        <div id="sl-set">${set.map((s, i) => `
          <div class="sl-setzeile" data-id="${s.id}">
            <span class="sl-nr">${i + 1}</span>
            <button class="sl-name linkish" data-offen="${s.id}">${escapeHtml(s.titel)}</button>
            <span class="sl-ton">${escapeHtml(griffTonart(s) || "–")}</span>
            <button class="sl-mini" data-hoch="${i}" aria-label="nach oben" ${i ? "" : "disabled"}>↑</button>
            <button class="sl-mini" data-raus="${s.id}" aria-label="aus dem Set">✕</button>
          </div>`).join("")}</div>
        <button class="wide primary" id="sl-buehne">Bühnenansicht</button>`
      : `<p class="hint">Noch leer. Nimm Songs aus deinem Repertoire unten ins Set, in der Reihenfolge des Abends.</p>`}
    </section>

    <h2>Repertoire</h2>
    <div class="sm-neu">
      <input type="text" id="sl-titel" placeholder="Neuer Song" autocomplete="off">
      <button id="sl-anlegen" class="primary">Anlegen</button>
    </div>
    <div id="sl-alle">${alle.length ? alle.map(karte).join("") :
      `<p class="empty">Noch keine Songs. Leg einen an oder nimm einen aus den Vorschlägen.</p>`}</div>

    ${vorschlaege.length ? `<details class="sl-vorschlaege">
      <summary>Vorschläge: Songs mit Saxophon, die auf Festen gewünscht werden</summary>
      <p class="hint">Ohne Tonarten, mit Absicht: bestimm sie am Original, das du spielen wirst. Auf einem DJ-Set
        läuft oft ein Edit oder Remix in anderer Tonart und anderem Tempo.</p>
      ${vorschlaege.map((v, i) => `<div class="sl-vorschlag">
        <div><b>${escapeHtml(v.titel)}</b> <span>${escapeHtml(v.interpret)}</span>
          <p class="hint">${escapeHtml(v.warum)}</p></div>
        <button class="sl-mini" data-vorschlag="${i}" aria-label="aufnehmen">+</button>
      </div>`).join("")}
    </details>` : ""}`;

  $("#sl-buehne", root)?.addEventListener("click", () => { ansicht = "buehne"; buehneIdx = 0; holdScreen(); render(); window.scrollTo(0, 0); });
  $("#sl-anlegen", root).addEventListener("click", () => {
    const t = $("#sl-titel", root).value.trim();
    if (!t) { $("#sl-titel", root).focus(); toast("Titel fehlt"); return; }
    const s = neuerSong(t);
    offen = s.id; ansicht = "song"; render(); window.scrollTo(0, 0);
  });
  $$("[data-offen]", root).forEach(b => b.addEventListener("click", () => {
    offen = b.dataset.offen; ansicht = "song"; render(); window.scrollTo(0, 0);
  }));
  $$("[data-hoch]", root).forEach(b => b.addEventListener("click", () => {
    const ids = setIds(), i = Number(b.dataset.hoch);
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
    save(); render();
  }));
  $$("[data-raus]", root).forEach(b => b.addEventListener("click", () => {
    const d = drill("setlist:set", { ids: [] });
    d.ids = d.ids.filter(x => x !== b.dataset.raus);
    save(); render();
  }));
  $$("[data-insset]", root).forEach(b => b.addEventListener("click", () => {
    const d = drill("setlist:set", { ids: [] });
    if (!d.ids.includes(b.dataset.insset)) d.ids.push(b.dataset.insset);
    save(); toast("Ins Set genommen"); render();
  }));
  $$("[data-vorschlag]", root).forEach(b => b.addEventListener("click", () => {
    const v = vorschlaege[Number(b.dataset.vorschlag)];
    neuerSong(v.titel, { interpret: v.interpret, rollen: [...v.rollen] });
    toast(`${v.titel} aufgenommen`);
    render();
  }));
}

function karte(s) {
  const g = gig(s);
  const imSet = setIds().includes(s.id);
  return `<div class="sl-karte">
    <button class="sl-karte-kopf" data-offen="${s.id}">
      <span class="pr-punkt-kopf"><b>${escapeHtml(s.titel)}</b><em>${escapeHtml(STUFEN[g.stufe || 0].label)}</em></span>
      <span class="pr-punkt-sub">${[g.interpret, griffTonart(s) ? `Griff ${griffTonart(s)}` : "Tonart fehlt",
        g.rollen.map(r => ROLLEN.find(x => x.id === r)?.label).filter(Boolean).join(", ")]
        .filter(Boolean).map(escapeHtml).join(" · ")}</span>
      <span class="pr-stufen">${STUFEN.map((_, k) => `<i class="${k <= (g.stufe || 0) ? "an" : ""}"></i>`).join("")}</span>
    </button>
    ${imSet ? `<span class="sl-imset">im Set</span>` : `<button class="sl-mini" data-insset="${s.id}" aria-label="ins Set">+ Set</button>`}
  </div>`;
}

/* --- Ein Song ------------------------------------------------------------------- */

function renderSong(s) {
  const g = gig(s);
  root.innerHTML = `
    <button class="zurueck" id="sl-zurueck">← Setlist</button>
    <label class="feld">Titel<input type="text" id="sl-f-titel" value="${escapeHtml(s.titel)}"></label>
    <div class="grid3">
      <label>Interpret<input type="text" id="sl-f-interpret" value="${escapeHtml(g.interpret || "")}"></label>
      <label>Tempo (bpm)<input type="number" id="sl-f-bpm" inputmode="numeric" min="40" max="220" value="${g.bpm || ""}"></label>
    </div>
    <label class="feld">Fassung<input type="text" id="sl-f-fassung" placeholder="Original, oder welcher Edit / Remix"
      value="${escapeHtml(g.fassung || "")}"></label>

    <h3>Griff-Tonart</h3>
    <div class="chips scroll" id="sl-f-griff"></div>
    <div class="chips" id="sl-f-geschlecht"></div>
    <p class="hint">${s.griffPc != null ? `Klingt ${escapeHtml(klingendTonart(s))}. ` : ""}Am Original bestimmen, nicht aus einer Liste —
      <button class="linkish" id="sl-finden">mit „Zum Song spielen“ finden</button>.</p>

    <h3>Was du spielst</h3>
    <div class="chips" id="sl-f-rollen"></div>
    <label class="feld">Wann du einsetzt
      <textarea id="sl-f-einsatz" placeholder="Intro-Riff, dann Pause bis nach dem 2. Refrain; Solo über die Bridge; Hook im Outro">${escapeHtml(g.einsatz || "")}</textarea>
    </label>

    <h3>Wo steht es?</h3>
    <div class="stufenwahl">${STUFEN.map((st, i) => `
      <button class="stufe${i <= (g.stufe || 0) ? " an" : ""}" data-i="${i}">
        <b>${escapeHtml(st.label)}</b><span>Fertig, wenn: ${escapeHtml(st.fertig)}</span>
      </button>`).join("")}</div>

    <button class="wide" id="sl-weg" style="margin-top:22px">Song löschen</button>
    <p class="hint">Löscht ihn auch aus „Zum Song spielen“ — es ist dieselbe Liste.</p>`;

  const feld = (sel, fn) => $(sel, root).addEventListener("change", e => { fn(e.target.value); save(); });
  feld("#sl-f-titel", v => { s.titel = v.trim() || s.titel; });
  feld("#sl-f-interpret", v => { g.interpret = v.trim(); });
  feld("#sl-f-bpm", v => { g.bpm = Number(v) || null; });
  feld("#sl-f-fassung", v => { g.fassung = v.trim(); });
  feld("#sl-f-einsatz", v => { g.einsatz = v.trim(); });

  const griffHost = $("#sl-f-griff", root);
  GRIFFE.forEach((name, pc) => griffHost.append(el("button", {
    class: "chip" + (s.griffPc === pc ? " on" : ""), text: name,
    on: { click: () => { s.griffPc = pc; if ((g.stufe || 0) < 1) g.stufe = 1; save(); renderSong(s); } },
  })));
  const gHost = $("#sl-f-geschlecht", root);
  for (const [id, label] of [["dur", "Dur"], ["moll", "Moll"]]) {
    gHost.append(el("button", {
      class: "chip" + (s.geschlecht === id ? " on" : ""), text: label,
      on: { click: () => { s.geschlecht = id; save(); renderSong(s); } },
    }));
  }
  const rHost = $("#sl-f-rollen", root);
  for (const r of ROLLEN) {
    rHost.append(el("button", {
      class: "chip" + (g.rollen.includes(r.id) ? " on" : ""), text: r.label,
      on: { click: () => {
        g.rollen = g.rollen.includes(r.id) ? g.rollen.filter(x => x !== r.id) : [...g.rollen, r.id];
        save(); renderSong(s);
      } },
    }));
  }
  $$(".stufe", root).forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    g.stufe = i === g.stufe ? Math.max(0, i - 1) : i;
    save(); renderSong(s);
  }));
  $("#sl-finden", root).addEventListener("click", () => { oeffneSong(s.id); gehZu("gig", "songmitspielen"); });
  $("#sl-zurueck", root).addEventListener("click", () => { ansicht = "liste"; render(); window.scrollTo(0, 0); });
  $("#sl-weg", root).addEventListener("click", () => {
    if (!confirm(`„${s.titel}“ löschen?`)) return;
    const d = drill(LISTE, { songs: [] });
    d.songs = d.songs.filter(x => x.id !== s.id);
    const set = drill("setlist:set", { ids: [] });
    set.ids = set.ids.filter(x => x !== s.id);
    save();
    ansicht = "liste"; render();
  });
}

/* --- Bühne --------------------------------------------------------------------- */

function renderBuehne() {
  const set = setAus(setIds(), songs());
  if (!set.length) { ansicht = "liste"; releaseScreen(); return render(); }
  buehneIdx = Math.max(0, Math.min(buehneIdx, set.length - 1));
  const s = set[buehneIdx], g = gig(s), n = set[buehneIdx + 1];
  const rollen = g.rollen.map(r => ROLLEN.find(x => x.id === r)?.label).filter(Boolean).join(" · ");
  root.innerHTML = `
    <div class="buehne">
      <div class="buehne-kopf"><span>${buehneIdx + 1} / ${set.length}</span>
        <button class="linkish" id="bu-ende">beenden</button></div>
      <div class="buehne-titel">${escapeHtml(s.titel)}</div>
      <div class="buehne-interpret">${escapeHtml([g.interpret, g.fassung].filter(Boolean).join(" · "))}</div>
      <div class="buehne-ton">${escapeHtml(griffTonart(s) || "Tonart fehlt")}</div>
      <div class="buehne-klingt">${s.griffPc != null ? `Griff · klingt ${escapeHtml(klingendTonart(s))}` : ""}${g.bpm ? ` · ${g.bpm} bpm` : ""}</div>
      ${rollen ? `<div class="buehne-rollen">${escapeHtml(rollen)}</div>` : ""}
      ${g.einsatz ? `<div class="buehne-einsatz">${escapeHtml(g.einsatz)}</div>` : ""}
      <div class="buehne-naechst">${n ? `Danach: ${escapeHtml(n.titel)}${griffTonart(n) ? ` · ${escapeHtml(griffTonart(n))}` : ""}` : "Letzter Song im Set"}</div>
      <div class="row2 buehne-knoepfe">
        <button id="bu-zurueck" ${buehneIdx ? "" : "disabled"}>◀ Zurück</button>
        <button id="bu-weiter" class="weiter" ${n ? "" : "disabled"}>Weiter ▶</button>
      </div>
    </div>`;
  $("#bu-ende", root).addEventListener("click", () => { ansicht = "liste"; releaseScreen(); render(); });
  $("#bu-zurueck", root).addEventListener("click", () => { buehneIdx--; renderBuehne(); });
  $("#bu-weiter", root).addEventListener("click", () => { buehneIdx++; renderBuehne(); });
}

export default {
  id: "setlist",
  label: "Setlist",
  mount(r) { root = r; render(); },
  unmount() { if (ansicht === "buehne") releaseScreen(); root = null; },
};
