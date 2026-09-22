/* ==========================================================================
   Gig-Setlist

   Die Stücke, die auf Hochzeiten, Aperitivi und DJ-Sets wirklich
   drankommen — und für jedes: in welcher Tonart du greifst, was du darin
   spielst, und wann. Das ist das Gegenstück zum Prüfungsprogramm, für das
   zweite Ziel.

   Die Songs selbst sind dieselben wie in „Zum Song spielen“: dort findet man
   Tonart und Form am Original, hier kommt dazu, was man auf dem Gig damit
   macht. Eine Liste, nicht zwei.

   Tonarten stehen hier bewusst nicht in den Vorschlägen. Man bestimmt sie
   am Original, das man spielen wird — und auf einem DJ-Set ist das oft
   ein Edit oder Remix in einer anderen Tonart und einem anderen Tempo.
   Eine Tonart aus einer Liste wäre an genau dem Abend falsch, an dem es
   zählt.

   Reiner Inhalt plus zwei kleine Rechnungen, kein DOM.
   ========================================================================== */

"use strict";

/* Was das Saxophon in einem Song tut. Mehrfachwahl. */
export const ROLLEN = [
  { id: "intro",  label: "Intro" },
  { id: "hook",   label: "Hook" },
  { id: "luecken", label: "Lücken" },
  { id: "solo",   label: "Solo" },
  { id: "outro",  label: "Outro" },
];

/* Wie weit ein Song ist. Jede Stufe mit „fertig, wenn“. */
export const STUFEN = [
  { label: "auf der Liste",     fertig: "Der Song steht drin, mit Interpret und der Fassung, die gespielt wird." },
  { label: "Tonart und Form",   fertig: "Griff-Tonart und Form am Original bestimmt, in „Zum Song spielen“ oder mit dem Ohr." },
  { label: "Hook sitzt",        fertig: "Die Stelle, die jeder kennt, auswendig und im Timing der Aufnahme — auch der Einsatz vor der Eins." },
  { label: "Lücken und Solo",   fertig: "Einmal ganz mit der Aufnahme durch, nur in den Lücken, nie über den Gesang, das Solo mit Anfang und Ende." },
  { label: "gig-reif",          fertig: "Zweimal hintereinander mit der Aufnahme, ohne Blick aufs Handy außer auf die Bühnenkarte." },
];

/* Songs mit Saxophon, die auf Festen gewünscht werden. Nur Titel,
   Interpret und die Rolle des Saxophons — Tonart und Tempo bestimmt man
   am eigenen Original. */
export const VORSCHLAEGE = [
  { titel: "Careless Whisper", interpret: "George Michael", rollen: ["intro", "hook"],
    warum: "Das Riff ist der Song. Wird auf fast jeder Hochzeit gewünscht." },
  { titel: "Baker Street", interpret: "Gerry Rafferty", rollen: ["hook", "solo"],
    warum: "Das bekannteste Alt-Riff der Popmusik." },
  { titel: "Lily Was Here", interpret: "Dave Stewart & Candy Dulfer", rollen: ["hook", "solo"],
    warum: "Instrumental, das Saxophon trägt die Melodie. Ideal für ein Aperitivo." },
  { titel: "Just the Two of Us", interpret: "Grover Washington Jr. & Bill Withers", rollen: ["luecken", "solo"],
    warum: "Smooth Soul, Lücken zwischen den Zeilen und ein Solo. Passt zum Abendessen." },
  { titel: "Smooth Operator", interpret: "Sade", rollen: ["luecken", "solo"],
    warum: "Das Saxophon gehört zum Klang des Stücks. Ruhig, in der Time bleiben." },
  { titel: "Mr. Saxobeat", interpret: "Alexandra Stan", rollen: ["hook"],
    warum: "Tanzflächen-Hook; hier zählt nur Timing gegen die Maschine." },
  { titel: "Run Away", interpret: "SunStroke Project & Olia Tira", rollen: ["hook"],
    warum: "Das Riff, das als „Epic Sax Guy“ bekannt wurde. Die Leute erkennen es nach zwei Tönen." },
  { titel: "Who Can It Be Now?", interpret: "Men at Work", rollen: ["hook"],
    warum: "Kurzes, markantes Riff; gut für den Einstieg in einen Achtziger-Block." },
  { titel: "Your Latest Trick", interpret: "Dire Straits", rollen: ["intro", "outro"],
    warum: "Ruhiges Intro, das einen Raum leise macht. Subtone-Material." },
  { titel: "Moondance", interpret: "Van Morrison", rollen: ["luecken", "solo"],
    warum: "Swingender Pop — hier kommt das Jazz-Vokabular auf die Tanzfläche." },
  { titel: "Urgent", interpret: "Foreigner", rollen: ["solo"],
    warum: "Ein Rock-Solo mit Growl und hohen Tönen, für den Moment, in dem es laut werden darf." },
  { titel: "Pick Up the Pieces", interpret: "Average White Band", rollen: ["hook", "solo"],
    warum: "Funk-Instrumental; gerade Achtel, Ghost Notes, Bläserthema." },
  { titel: "Tequila", interpret: "The Champs", rollen: ["hook", "solo"],
    warum: "Kurz, laut, jeder ruft mit. Für späte Stunden." },
  { titel: "Sax", interpret: "Fleur East", rollen: ["hook"],
    warum: "Neuerer Pop mit Sax-Hook; wird von jüngerem Publikum erkannt." },
];

/* Welche Griff-Tonart ein Song hat, als Text. `griffPc` und `geschlecht`
   kommen aus „Zum Song spielen“. */
const GRIFFE = ["C", "Des", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"];
const KLEIN = ["c", "cis", "d", "es", "e", "f", "fis", "g", "gis", "a", "b", "h"];

export function griffTonart(song) {
  if (song.griffPc == null) return null;
  if (song.geschlecht === "moll") return KLEIN[song.griffPc] + "-Moll";
  if (song.geschlecht === "dur") return GRIFFE[song.griffPc] + "-Dur";
  return GRIFFE[song.griffPc];
}

export function klingendTonart(song) {
  if (song.griffPc == null) return null;
  const pc = ((song.griffPc - 9) % 12 + 12) % 12;
  if (song.geschlecht === "moll") return KLEIN[pc] + "-Moll";
  if (song.geschlecht === "dur") return GRIFFE[pc] + "-Dur";
  return GRIFFE[pc];
}

/** Ein Set in der Reihenfolge, in der es gespielt wird; Unbekanntes fällt heraus. */
export function setAus(ids, songs) {
  return (ids || []).map(id => songs.find(s => s.id === id)).filter(Boolean);
}

/** Wie viele Songs eines Sets gig-reif sind. */
export function bereitschaft(set) {
  const reif = set.filter(s => (s.gig?.stufe ?? -1) >= STUFEN.length - 1).length;
  return { reif, gesamt: set.length };
}
