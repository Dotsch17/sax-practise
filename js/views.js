/* ==========================================================================
   Was wo steht

   Fünf Reiter unten, innerhalb jedes Reiters eine Reihe Werkzeuge. Damit ist
   alles in höchstens zwei Tipps erreichbar und innerhalb eines Reiters in
   einem. Der Session-Runner steht ohne Umweg da, wenn die App startet — das
   ist die Hauptaktion und bleibt bei null Tipps.

   Die Aufteilung folgt dem Üben, nicht der Technik: Ton und Technik sind die
   beiden Hälften der Instrumentalarbeit, Gehör ist die Prüfungsdisziplin
   daneben, Journal ist alles, was man im Sitzen macht.
   ========================================================================== */

"use strict";

import session   from "./tools/session.js";
import bordun    from "./tools/bordun.js";
import stimmgeraet from "./tools/stimmgeraet.js";
import metronom  from "./tools/metronom.js";
import protokoll from "./tools/protokoll.js";
import daten     from "./tools/daten.js";

export const TABS = [
  { id: "ueben",   label: "Üben",    tools: [session] },
  { id: "ton",     label: "Ton",     tools: [stimmgeraet, bordun] },
  { id: "technik", label: "Technik", tools: [metronom] },
  { id: "gehoer",  label: "Gehör",   tools: [] },
  { id: "journal", label: "Journal", tools: [protokoll, daten] },
];

export const findTab = id => TABS.find(t => t.id === id) || TABS[0];
export const findTool = (tab, id) => tab.tools.find(t => t.id === id) || tab.tools[0];
