/* ==========================================================================
   Kleine DOM-Helfer. Bewusst winzig — die App braucht kein Framework.
   ========================================================================== */

"use strict";

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Baut ein Element. attrs kennt `class`, `html`, `text`, `on` und alles andere
    landet als Attribut. */
export function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "text") n.textContent = v;
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
    else if (k === "data") for (const [dk, dv] of Object.entries(v)) n.dataset[dk] = dv;
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

/** mm:ss aus Sekunden. */
export function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

/** „3 h 12 min“ für längere Zeiträume im Protokoll. */
export function humanMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  return h + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
}

export const todayISO = (d = new Date()) =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
   String(d.getDate()).padStart(2, "0")].join("-");

export const parseISO = s => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Tage zwischen zwei ISO-Daten, positiv wenn b später liegt. */
export const daysBetween = (a, b) =>
  Math.round((parseISO(b) - parseISO(a)) / 86400000);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* --- Hinweisstreifen ------------------------------------------------------ */

let toastTimer;
/** Mit onTap bleibt der Hinweis stehen, bis er angetippt wird. Ohne onTap
    verschwindet er nach 1,8 Sekunden. */
export function toast(msg, onTap) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  t.classList.toggle("tap", !!onTap);
  t.onclick = onTap || null;
  if (onTap) { t.setAttribute("role", "button"); t.setAttribute("tabindex", "0"); }
  else { t.removeAttribute("role"); t.removeAttribute("tabindex"); }
  clearTimeout(toastTimer);
  if (!onTap) toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

export function initToast() {
  const t = $("#toast");
  if (!t) return;
  t.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.currentTarget.onclick) {
      e.preventDefault();
      e.currentTarget.onclick();
    }
  });
}

/* --- Sehr kleiner Ereignisbus -------------------------------------------- */

const listeners = new Map();
export const on = (name, fn) => {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name).delete(fn);
};
export const emit = (name, payload) => {
  for (const fn of listeners.get(name) || []) {
    try { fn(payload); } catch (e) { console.warn("Fehler in Zuhörer für " + name, e); }
  }
};
