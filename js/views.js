/* ==========================================================================
   Was wo steht

   Fünf Reiter unten, innerhalb jedes Reiters eine Reihe Werkzeuge. Damit ist
   alles in höchstens zwei Tipps erreichbar und innerhalb eines Reiters in
   einem. Der Session-Runner steht ohne Umweg da, wenn die App startet — das
   ist die Hauptaktion und bleibt bei null Tipps.

   Prüfung und Aufnahme stehen gleich daneben: die Prüfung, weil sie sagt,
   wofür die Session heute da ist, und die Aufnahme, weil sie nach jedem
   Durchlauf gebraucht wird und nicht erst im Journal.

   Die Aufteilung folgt dem Üben, nicht der Technik: Ton und Technik sind die
   beiden Hälften der Instrumentalarbeit, Gehör ist die Prüfungsdisziplin
   daneben, Journal ist alles, was man im Sitzen macht.
   ========================================================================== */

"use strict";

import session   from "./tools/session.js";
import pruefung  from "./tools/pruefung.js";
import aufnahme  from "./tools/aufnahme.js";
import bordun    from "./tools/bordun.js";
import stimmgeraet from "./tools/stimmgeraet.js";
import tonanalyse from "./tools/tonanalyse.js";
import obertoene  from "./tools/obertoene.js";
import metronom  from "./tools/metronom.js";
import tonleitern from "./tools/tonleitern.js";
import kadenzen  from "./tools/kadenzen.js";
import gehoer    from "./tools/gehoer.js";
import hoertest  from "./tools/hoertest.js";
import nachspielen from "./tools/nachspielen.js";
import rhythmus  from "./tools/rhythmus.js";
import blattspiel from "./tools/blattspiel.js";
import griffe     from "./tools/griffe.js";
import grundlagen from "./tools/grundlagen.js";
import improvisation from "./tools/improvisation.js";
import leadsheets from "./tools/leadsheets.js";
import callresponse from "./tools/callresponse.js";
import gigtraining from "./tools/gigtraining.js";
import tonartfinden from "./tools/tonartfinden.js";
import songmitspielen from "./tools/songmitspielen.js";
import protokoll from "./tools/protokoll.js";
import statistik from "./tools/statistik.js";
import wissen    from "./tools/wissen.js";
import repertoire from "./tools/repertoire.js";
import daten     from "./tools/daten.js";

export const TABS = [
  { id: "ueben",   label: "Üben",    tools: [session, pruefung, aufnahme] },
  { id: "ton",     label: "Ton",     tools: [stimmgeraet, obertoene, tonanalyse, bordun] },
  { id: "technik", label: "Technik", tools: [tonleitern, kadenzen, rhythmus, blattspiel, griffe, metronom] },
  { id: "gehoer",  label: "Gehör",   tools: [hoertest, gehoer, nachspielen] },
  { id: "impro",   label: "Impro",   tools: [grundlagen, improvisation, leadsheets, tonartfinden, songmitspielen, callresponse, gigtraining] },
  { id: "journal", label: "Journal", tools: [protokoll, statistik, repertoire, wissen, daten] },
];

export const findTab = id => TABS.find(t => t.id === id) || TABS[0];
export const findTool = (tab, id) => tab.tools.find(t => t.id === id) || tab.tools[0];
