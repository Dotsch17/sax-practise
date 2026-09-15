/* ==========================================================================
   Der Übungsplan als Daten

   Alles Inhaltliche steht hier und nirgends sonst. Wenn du den Plan änderst,
   änderst du nur diese Datei. Reihenfolge und Merkpunkte stammen aus einem
   ausgearbeiteten Vier-Wochen-Konzept für klassischen Ton und sind fachlich
   begründet — nicht beliebig umsortierbar.
   ========================================================================== */

"use strict";

export const BLOCKS = [
  { id:"mundstueck", name:"Mundstück allein", min:5, cues:[
    "Ton 10 Sekunden absolut stabil halten",
    "Nach unten biegen, langsam zurück, ohne Abriss",
    "Fünfmal anstoßen, ohne dass die Tonhöhe springt"
  ]},
  { id:"langetoene", name:"Lange Töne", min:20, cues:[
    "Bester Ton als Ausgangspunkt, 8 bis 12 Sekunden",
    "Halbton weiter, gleiche Farbe und Lautstärke halten",
    "Kein Vibrato, Lippendruck bleibt konstant",
    "Der Ton endet mit der Luft, nie mit der Zunge"
  ]},
  { id:"obertoene", name:"Obertöne", min:15, cues:[
    "Griff tief B, ohne Oktavklappe",
    "Teilton für Teilton, nur über das Voicing",
    "Danach dasselbe auf tief H und tief C",
    "Matching: Teilton und gegriffenen Ton angleichen"
  ]},
  { id:"dynamik", name:"Dynamik", min:10, cues:[
    "Messa di voce, 15 bis 20 Sekunden pro Ton",
    "ff ohne Härte — Härte heißt Lippendruck, nicht Luft",
    "pp ohne Abriss, besonders in der Tiefe"
  ]},
  { id:"intonation", name:"Intonation", min:10, cues:[
    "Bordun laufen lassen, chromatisch gebunden",
    "Auf Schwebungen hören, nicht aufs Display schauen",
    "Abweichende Töne notieren"
  ]},
  { id:"artikulation", name:"Artikulation", min:10, cues:[
    "Zungenspitze berührt die Blattspitze nur leicht",
    "„da“ statt „ta“",
    "Kurze Töne klingen wie lange, nur kürzer",
    "Im pp gegenprüfen"
  ]},
  { id:"etuede", name:"Etüde oder Stück", min:10, cues:[
    "Eine langsame Ferling-Etüde oder acht Takte Repertoire",
    "Ziel ist der Ton im Zusammenhang, nicht das Stück"
  ]}
];

// Pro Woche: Schwerpunkt und abweichende Minuten.
export const WEEKS = {
  1:{ focus:"Fundament — Ansatz entspannen, Luftmenge erhöhen",
      override:{ obertoene:10, etuede:15 } },
  2:{ focus:"Register verbinden — Übergänge und tiefe Lage",
      override:{} },
  3:{ focus:"Dynamik und Vibrato — hier zahlt sich der laute Raum aus",
      override:{ dynamik:15, etuede:5 } },
  4:{ focus:"Musik und Sicherung — anwenden und aufschreiben",
      override:{ langetoene:15, obertoene:10, intonation:5, etuede:25 } }
};

export function planForWeek(week){
  const ov = (WEEKS[week] || WEEKS[1]).override;
  return BLOCKS.map(b => ({ ...b, min: ov[b.id] ?? b.min }));
}
