/* ==========================================================================
   Prüfungssimulation

   Das ganze Saxophon-Programm kalt und am Stück, mit laufender Aufnahme.
   Üben heißt: eine Stelle, noch einmal, bis sie sitzt. Die Prüfung heißt:
   einmal, jetzt, in einer Reihenfolge, die ein anderer bestimmt. Das ist
   eine eigene Fähigkeit, und sie wird nur geübt, wenn man sie übt.

   Was die Simulation deshalb anders macht als jedes andere Werkzeug:
   - Kein Einspielen außer einer Minute Einstimmen.
   - Kein „nochmal“. Der einzige Knopf heißt Weiter.
   - Die Reihenfolge nach dem ersten Stück bestimmt die „Kommission“.
     Das erste Stück wählt man in der Regel selbst.
   - Auf Wunsch unterbricht sie. Kommissionen hören oft nur die ersten
     ein, zwei Minuten eines Stücks; wer seine Stücke so übt, dass es erst
     im zweiten Chorus gut wird, verschenkt genau die Zeit, die zählt.
   - Tonleitern und Blattlesen fragt sie zufällig ab, gewichtet wie der
     Prüfermodus: was nie geübt wurde, kommt am ehesten dran.

   Die Stücke und Etüden kommen aus dem Prüfungs-Cockpit. Fehlt ein Titel,
   steht der Platzhalter da — die Simulation läuft trotzdem, denn auch das
   ist ein Befund.

   Kein DOM.
   ========================================================================== */

"use strict";

import { TEILE, eintrag } from "./pruefung.js";
import { pruefungsAufgabe, artOf, tonartenFuer, titel as skalaTitel } from "../music/skalenarten.js";

export const LISTE = "simulation:liste";

/** Wie die Kommission unterbricht: frühestens, spätestens, wie oft. */
export const UNTERBRECHUNG = { ab: 75, bis: 150, stueck: 0.6, etuede: 0.5 };

export const EINSTIMMEN = 60;          // Sekunden
export const BLATT_ANSEHEN = 60;       // Sekunden Ansehzeit vor dem Blattlesen
export const TONLEITER_AUFGABEN = 3;

export const URTEILE = [
  { id: "sicher", label: "sicher", was: "Durchgespielt, und so darf es in der Prüfung klingen." },
  { id: "wackler", label: "Wackler", was: "Durchgekommen, aber mit Stellen, die man hört." },
  { id: "raus", label: "ausgestiegen", was: "Angehalten, neu angefangen oder die Form verloren." },
];

const sax = TEILE.find(t => t.id === "sax");
const punkt = id => sax.punkte.find(p => p.id === id);

function mische(liste, rng) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function unterbrechung(art, rng, an) {
  if (!an) return null;
  if (rng() >= UNTERBRECHUNG[art]) return null;
  return Math.round(UNTERBRECHUNG.ab + rng() * (UNTERBRECHUNG.bis - UNTERBRECHUNG.ab));
}

function musikStation(id, drills, rng, an) {
  const p = punkt(id);
  const e = eintrag(drills, id);
  return {
    id, art: p.art,
    titel: e.titel || p.titel,
    platzhalter: !e.titel,
    was: p.art === "stueck"
      ? "Thema, Improvisation, Thema. Einzählen, spielen, Schluss — auch wenn etwas danebengeht."
      : "Von vorn bis hinten, im Tempo, das du in der Prüfung spielen willst.",
    tempo: e.tempo || null,
    unterbrechung: unterbrechung(p.art, rng, an),
  };
}

/**
 * Baut den Ablauf einer Simulation.
 * `drills` ist der Übestand, `heute` ein ISO-Datum, `rng` austauschbar.
 */
export function baueSimulation(drills = {}, { heute = null, rng = Math.random, unterbrechen = true } = {}) {
  const stationen = [{
    id: "einstimmen", art: "einstimmen", titel: "Einstimmen",
    was: "Eine Minute. Ein, zwei Töne gegen den Stimmton, Blatt anfeuchten, atmen. Mehr Einspielen gibt es nicht.",
    dauer: EINSTIMMEN,
  }];

  stationen.push(musikStation("stueck1", drills, rng, unterbrechen));
  const rest = mische(["stueck2", "stueck3", "etuede1", "etuede2"], rng);
  for (const id of rest) stationen.push(musikStation(id, drills, rng, unterbrechen));

  const aufgaben = [];
  let vorher = null;
  for (let i = 0; i < TONLEITER_AUFGABEN; i++) {
    let a = null;
    for (let versuch = 0; versuch < 20; versuch++) {
      a = pruefungsAufgabe(drills, heute, rng, vorher);
      if (!aufgaben.some(x => x.art === a.art && x.keyIndex === a.keyIndex)) break;
    }
    const art = artOf(a.art);
    const key = tonartenFuer(art)[a.keyIndex];
    const t = skalaTitel(art, key);
    aufgaben.push({ art: a.art, keyIndex: a.keyIndex, titel: art.chord ? `${t} (${art.label})` : t, akkord: !!art.chord });
    vorher = a;
  }
  stationen.push({
    id: "tonleitern", art: "tonleitern", titel: "Tonleitern und Akkorde",
    was: "Die Kommission nennt eine Aufgabe. Erst sagen, welche Vorzeichen und Töne es sind, dann über den ganzen Umfang auf und ab — ohne Noten.",
    aufgaben,
  });

  stationen.push({
    id: "blattlesen", art: "blatt", titel: "Blattlesen",
    was: "Eine Minute ansehen: Tonart, Takt, Rhythmen, die höchste und tiefste Note. Still greifen ist erlaubt, spielen nicht. Dann einmal durch, ohne anzuhalten.",
    ansehen: BLATT_ANSEHEN,
    seed: Math.floor(rng() * 1e9),
  });

  return stationen;
}

/**
 * Was eine abgeschlossene Simulation sagt. `urteile` ist
 * `{ stationId: "sicher" | "wackler" | "raus" }`.
 */
export function bilanz(stationen, urteile = {}) {
  const gewertet = stationen.filter(s => s.art !== "einstimmen");
  const zahl = id => gewertet.filter(s => urteile[s.id] === id).length;
  const offen = gewertet.filter(s => !urteile[s.id]).length;
  const raus = gewertet.filter(s => urteile[s.id] === "raus").map(s => s.titel);
  const fehlend = gewertet.filter(s => s.platzhalter).map(s => s.titel);
  let satz;
  if (offen === gewertet.length) satz = "Noch nicht bewertet.";
  else if (raus.length) satz = `Ausgestiegen bei ${raus.join(", ")}. Genau diese Stellen einzeln üben — und dann wieder am Stück.`;
  else if (zahl("wackler")) satz = "Durchgekommen. Die Wackler anhören, bevor du sie übst: oft ist es nicht die Stelle, sondern der Takt davor.";
  else satz = "Alles sicher. Nächstes Mal mit anderer Reihenfolge, müde oder vor Publikum — die Prüfung ist auch nicht ausgeruht.";
  return { sicher: zahl("sicher"), wackler: zahl("wackler"), raus: raus.length, offen, fehlend, satz };
}

/** Tage seit der letzten Simulation, oder null. */
export function tageSeitLetzter(drills, heute) {
  const l = drills?.[LISTE]?.eintraege || [];
  if (!l.length || !heute) return null;
  const letzte = l.map(e => e.datum).sort().pop();
  const utc = iso => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(heute) - utc(letzte)) / 86400000);
}
