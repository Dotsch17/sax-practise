/* ==========================================================================
   Service Worker — Offlinebetrieb

   WICHTIG: Bei jeder Änderung an index.html, manifest.json, den Icons oder
   den Schriften muss VERSION hochgezählt werden. Der Browser erkennt eine
   neue Fassung ausschließlich daran, dass sich diese Datei byteweise
   unterscheidet. Bleibt sie gleich, liefert der Cache dauerhaft den alten
   Stand aus, auch wenn auf GitHub Pages längst etwas Neues liegt.

   Cache-First für alles Eigene, Network-First für nichts — es gibt kein
   Backend, und die einzigen Daten liegen in localStorage.
   ========================================================================== */
"use strict";

const VERSION = "v21";
const CACHE   = "sax-uebeplan-" + VERSION;

// Relative Pfade, damit derselbe Worker unter jedem Unterverzeichnis läuft
// (auf GitHub Pages liegt die App unter /sax-practise/, lokal unter /).
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/responsive.css",
  "./css/shell.css",
  "./css/tools.css",
  "./js/audio/begleitung.js",
  "./js/audio/context.js",
  "./js/audio/drone.js",
  "./js/audio/metronome.js",
  "./js/audio/notenfolge.js",
  "./js/audio/pitch.js",
  "./js/audio/rekorder.js",
  "./js/audio/signals.js",
  "./js/audio/verzug.js",
  "./js/core/abgleich.js",
  "./js/core/aufnahmen.js",
  "./js/core/dom.js",
  "./js/core/koennen.js",
  "./js/core/session.js",
  "./js/core/store.js",
  "./js/data/improwissen.js",
  "./js/data/licks.js",
  "./js/data/plan.js",
  "./js/data/popvokabular.js",
  "./js/data/pruefung.js",
  "./js/data/setlist.js",
  "./js/data/songwissen.js",
  "./js/data/wissen.js",
  "./js/main.js",
  "./js/music/diktat.js",
  "./js/music/glyphs.js",
  "./js/music/griffbild.js",
  "./js/music/grooves.js",
  "./js/music/harmonie.js",
  "./js/music/kadenz.js",
  "./js/music/klaviatur.js",
  "./js/music/leadsheet.js",
  "./js/music/lick.js",
  "./js/music/lickwoche.js",
  "./js/music/melodie.js",
  "./js/music/notation.js",
  "./js/music/obertoene.js",
  "./js/music/popmessung.js",
  "./js/music/rhythmus.js",
  "./js/music/skalenarten.js",
  "./js/music/theory.js",
  "./js/music/vibrato.js",
  "./js/tools/aufnahme.js",
  "./js/tools/blattspiel.js",
  "./js/tools/bordun.js",
  "./js/tools/callresponse.js",
  "./js/tools/daten.js",
  "./js/tools/gehoer.js",
  "./js/tools/gigtraining.js",
  "./js/tools/griffe.js",
  "./js/tools/grundlagen.js",
  "./js/tools/hoertest.js",
  "./js/tools/improvisation.js",
  "./js/tools/kadenzen.js",
  "./js/tools/leadsheets.js",
  "./js/tools/lickwoche.js",
  "./js/tools/metronom.js",
  "./js/tools/nachspielen.js",
  "./js/tools/obertoene.js",
  "./js/tools/popsound.js",
  "./js/tools/protokoll.js",
  "./js/tools/pruefung.js",
  "./js/tools/repertoire.js",
  "./js/tools/rhythmus.js",
  "./js/tools/session.js",
  "./js/tools/setlist.js",
  "./js/tools/songmitspielen.js",
  "./js/tools/statistik.js",
  "./js/tools/stimmgeraet.js",
  "./js/tools/tonanalyse.js",
  "./js/tools/tonartfinden.js",
  "./js/tools/tonleitern.js",
  "./js/tools/vibrato.js",
  "./js/tools/wissen.js",
  "./js/views.js",
  "./fonts/barlow-400-latin-ext.woff2",
  "./fonts/barlow-400-latin.woff2",
  "./fonts/barlow-500-latin-ext.woff2",
  "./fonts/barlow-500-latin.woff2",
  "./fonts/barlow-600-latin-ext.woff2",
  "./fonts/barlow-600-latin.woff2",
  "./fonts/instrument-serif-400-italic-latin.woff2",
  "./fonts/instrument-serif-400-latin.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  // Kein skipWaiting: die neue Fassung wartet, bis der Nutzer den Hinweis
  // antippt. Sonst würde mitten in einer laufenden Session neu geladen.
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => n === CACHE ? null : caches.delete(n)));
    await self.clients.claim();
  })());
});

// Erst auf Zuruf der Seite übernehmen, siehe Modul 7 in index.html.
self.addEventListener("message", event => {
  if(event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // Fremdes unangetastet lassen

  // Navigation: immer die gecachte Seite, damit der Kaltstart ohne Netz
  // funktioniert. Ohne Treffer bleibt nur das Netz.
  if(req.mode === "navigate"){
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true })
        .then(hit => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req))
  );
});
