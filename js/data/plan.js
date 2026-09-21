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

/* ==========================================================================
   Übe-Kontexte

   Der Plan oben ist der für das Probelokal: echtes Saxophon, beliebig laut,
   volle Tonarbeit. Er bleibt unverändert, weil er aus einem ausgearbeiteten
   Konzept stammt.

   Nur: an den meisten Tagen steht man nicht im Probelokal. Und dann ist die
   ehrliche Antwort nicht „mach dasselbe leiser“ — sie ist, dass das
   Instrument und der Ort bestimmen, was überhaupt sinnvoll übbar ist:

   - **Zuhause leise.** Tonarbeit im Forte fällt weg, aber das pp fällt
     nicht weg — im Gegenteil, es ist die Lage, in der man zu Hause besser
     arbeitet als im Probelokal, weil man sich selbst hört. Dazu alles, was
     ganz ohne Ton geht: Atmung, Ansatz trocken, Fingertechnik, Singen und
     Greifen. Letzteres ist die am meisten unterschätzte Übung überhaupt.
   - **Travel Sax.** Kann Griffe, Technik, Lesen, Harmonie und Zusammenspiel
     mit Musik aus dem Kopfhörer. Kann **nicht** Ansatz, Voicing, Obertöne,
     Klangfarbe oder Intonation — der Ton kommt aus der Elektronik und sagt
     nichts über den eigenen. Wer daran Tonarbeit übt, übt nichts.

   `werkzeug` verweist auf das Werkzeug, das in diesem Block direkt
   mitläuft. Ohne diese Angabe müsste man den Block lesen und dann in einen
   anderen Reiter wechseln — und dann macht man es nicht.
   ========================================================================== */

export const KONTEXTE = [
  {
    id: "probelokal",
    name: "Probelokal",
    kurz: "laut",
    was: "Echtes Saxophon, beliebig laut. Der volle Tonplan.",
    bloecke: null,          // null heißt: der Plan oben, unverändert
  },

  {
    id: "leise",
    name: "Zuhause leise",
    kurz: "Rücksicht",
    was: "Echtes Saxophon, aber die Nachbarn. Alles, was im pp oder ganz ohne Ton geht — und das ist mehr, als man denkt.",
    bloecke: [
      { id: "atem", name: "Atem", min: 5, werkzeug: null, cues: [
        "Vier Sekunden ein durch den Mundwinkel, acht Sekunden gleichmäßig aus",
        "Der Bauch geht nach außen, die Schultern bleiben unten",
        "Am Ende der Ausatmung nicht pressen — lieber früher neu einatmen",
        "Das kostet keinen Ton und trägt jeden",
      ]},
      { id: "ansatz_trocken", name: "Ansatz ohne Ton", min: 5, werkzeug: null, cues: [
        "Nur Mundstück im Mund, keine Luft: die Form aufbauen und halten",
        "Unterlippe als Polster, Mundwinkel nach innen, Kiefer locker",
        "Dreißig Sekunden halten, lösen, wiederholen",
        "Tut nach zwanzig Sekunden die Lippe weh, ist zu viel Druck drin",
      ]},
      { id: "pp_toene", name: "Lange Töne im pp", min: 15, werkzeug: "stimmgeraet", cues: [
        "So leise, wie du gerade noch einen Kern hörst — nicht leiser",
        "Die Luft bleibt in Bewegung, auch wenn wenig kommt",
        "Genau hier hörst du Schwankungen, die im Forte untergehen",
        "Das Stimmgerät schreibt mit, welche Töne im pp weglaufen",
      ]},
      { id: "singen_greifen", name: "Singen und greifen", min: 10, werkzeug: "tonleitern", cues: [
        "Die Tonleiter singen und dabei die Griffe mitgreifen, ohne zu blasen",
        "Wer einen Ton nicht singen kann, kann ihn auch nicht treffen",
        "Oktaven notfalls versetzen — es geht um die Verbindung, nicht um die Lage",
        "Die am meisten unterschätzte Übung, die es gibt",
      ]},
      { id: "finger_still", name: "Fingertechnik still", min: 10, werkzeug: "metronom", cues: [
        "Ohne Blasen, nur die Griffe, mit Metronom",
        "Die Klappen sollen nicht klappern — das ist die halbe Übung",
        "Langsam genug, dass jeder Wechsel gleichzeitig kommt",
        "Erst wenn es still und gleichmäßig ist, Tempo hinauf",
      ]},
      { id: "blatt_still", name: "Blattspiel still", min: 10, werkzeug: "blattspiel", cues: [
        "Lesen und greifen, ohne Ton. Im Tempo, ohne anzuhalten",
        "Innerlich mitsingen — sonst ist es Fingergymnastik",
        "Am nächsten lauten Tag dasselbe mit Ton, und es wird sitzen",
      ]},
      { id: "gehoer_leise", name: "Gehör", min: 10, werkzeug: "nachspielen", cues: [
        "Kopfhörer auf, Phrasen nachspielen — im pp geht das auch spät abends",
        "Wenn gar nichts geht: nur hören und innerlich mitsingen",
      ]},
    ],
  },

  {
    id: "travelsax",
    name: "Travel Sax",
    kurz: "still",
    was: "Elektronisch, lautlos für den Raum. Kann Technik, Lesen, Harmonie und Zusammenspiel — kann keine Tonarbeit.",
    warnung: "Ansatz, Voicing, Obertöne und Klangfarbe lassen sich hier nicht üben. Der Ton kommt aus der Elektronik und sagt nichts über deinen. Wer das verwechselt, übt monatelang an etwas vorbei.",
    bloecke: [
      { id: "ts_warm", name: "Warm werden", min: 5, werkzeug: "tonleitern", cues: [
        "Chromatisch durch den ganzen Umfang, langsam und gebunden",
        "Es geht um die Finger, nicht um den Ton",
        "Auf gleichmäßige Wechsel achten, besonders über die Registerklappe",
      ]},
      { id: "ts_tonleitern", name: "Tonleitern", min: 15, werkzeug: "tonleitern", cues: [
        "Zwei Tonarten je Session, dafür in allen Formen: auf, ab, Dreiklang, Dominantsept",
        "Mit Metronom und Tempo-Rampe — hier ist das Travel Sax dem echten überlegen, weil du jederzeit spielen kannst",
        "Was du hier automatisierst, steht im Probelokal schon",
      ]},
      { id: "ts_rhythmus", name: "Rhythmus", min: 10, werkzeug: "rhythmus", cues: [
        "Gemessen, nicht gefühlt. Unter 30 ms Abweichung ist das Ziel",
        "Schleppen und Streuen sind zwei verschiedene Probleme",
      ]},
      { id: "ts_blatt", name: "Blattspiel", min: 10, werkzeug: "blattspiel", cues: [
        "Einmal durch, ohne anzuhalten. Ein Fehler zählt nicht, Stehenbleiben zählt",
        "Lieber eine Stufe zu leicht und flüssig als eine zu schwer und stockend",
      ]},
      { id: "ts_impro", name: "Improvisation", min: 20, werkzeug: "improvisation", cues: [
        "Erst Zieltöne über die Akkorde, dann Skalen, dann frei",
        "Mit Kopfhörer über die Begleitung — oder über einen Song, den du gerade hörst",
        "Zehn Minuten über eine Akkordfolge bringen mehr als zwanzig über fünf",
      ]},
      { id: "ts_gehoer", name: "Nachspielen", min: 10, werkzeug: "nachspielen", cues: [
        "Phrase hören, innerlich singen, nachspielen. Nicht suchen",
        "Das ist die Fähigkeit, die dich auf einer Bühne rettet",
      ]},
    ],
  },
];

export const kontextOf = id => KONTEXTE.find(k => k.id === id) || KONTEXTE[0];

/* Welches Werkzeug in welchem Block des Probelokal-Plans mitläuft. Bewusst
   hier daneben und nicht in BLOCKS: die Blöcke selbst sind fachlicher
   Inhalt und bleiben unangetastet; welches Werkzeug dazu hilft, ist eine
   Entscheidung dieser App.

   Die Zuordnung ist keine Formsache:
   - Mundstück allein → Stimmgerät. Nicht um die Tonhöhe zu korrigieren,
     sondern um zu sehen, ob sie über Wochen dieselbe bleibt. Wandert sie
     nach oben, wird der Ansatz enger.
   - Lange Töne und Dynamik → Tonanalyse. Bei langen Tönen zählt die Ruhe
     der Kurve, bei Messa di voce die Form der Hüllkurve.
   - Intonation → Bordun, weil der Block genau das verlangt.
   - Artikulation → Metronom mit der Klangfarbe „Zunge“.
   - Etüde → Repertoire, damit die klemmende Stelle gleich dort landet. */
const BLOCK_WERKZEUG = {
  mundstueck:   "stimmgeraet",
  langetoene:   "tonanalyse",
  obertoene:    "obertoene",
  dynamik:      "tonanalyse",
  intonation:   "bordun",
  artikulation: "metronom",
  etuede:       "repertoire",
};

/* ==========================================================================
   Die Session für heute

   Der Plan oben ist ein Vier-Wochen-Konzept, und als solches ist er richtig.
   Nur wird er so nicht benutzt: man nimmt das Instrument in die Hand, wenn
   man Lust und Zeit hat, und das sind mal achtzig Minuten und mal zwanzig.
   Eine Kalenderwoche als Steuergröße hilft dabei nicht — sie zählt etwas,
   das mit dem heutigen Abend nichts zu tun hat, und sie wird falsch, sobald
   man drei Tage aussetzt.

   Was stattdessen zählt, sind zwei Dinge, die man tatsächlich weiß, wenn man
   auspackt: **wie lange** man Zeit hat, und **woran** heute zu arbeiten ist.
   Daraus wird der Plan gebaut.

   Drei Regeln, damit dabei kein Unsinn herauskommt:

   - **Die Reihenfolge bleibt.** Sie ist fachlich begründet: Mundstück vor
     langen Tönen, Ton vor Technik, Etüde zuletzt. Gekürzt wird, nicht
     umsortiert.
   - **Der erste Block bleibt immer.** Das ist das Einspielen, und ohne das
     ist der Rest der Session schlechter, nicht kürzer.
   - **Kein Block unter drei Minuten.** Ein Zwei-Minuten-Block ist Theater:
     bis man eingerichtet ist, klingelt es schon wieder. Lieber ein Block
     weniger und die übrigen lang genug.
   ========================================================================== */

/** Kürzer als das lohnt kein eigener Block. */
export const MINDEST = 3;

/* Wie lang ein Block im Schnitt sein soll. Das ist die eigentliche
   Steuergröße, nicht die Mindestlänge: rechnet man nur gegen das Minimum,
   passen in zwanzig Minuten sechs Blöcke, und dann hat man sechsmal drei
   Minuten statt zweimal zehn. Kurz üben heißt weniger Sachen, nicht dieselben
   Sachen in Häppchen. */
const ZIEL_LAENGE = 10;

export const ZEITEN = [
  { id: 20, label: "20 min", was: "Einspielen und eine Sache. Mehr geht nicht, und mehr muss auch nicht." },
  { id: 40, label: "40 min", was: "Die Hälfte des Plans, aber jeder Block lang genug, um etwas zu bewegen." },
  { id: 60, label: "60 min", was: "Fast alles. Nur die Ränder werden knapper." },
  { id: 0,  label: "so lang es geht", was: "Der ganze Plan, in voller Länge." },
];

/**
 * Baut aus einer Blockliste die Session für heute.
 *
 * `minuten` 0 heißt: alles, unverändert. `schwerpunkt` ist die id eines
 * Blocks, der bevorzugt Zeit bekommt und als vorletzter gestrichen wird —
 * er kommt aus der Auswertung, nicht aus der Laune.
 */
export function baueSession(bloecke, minuten = 0, schwerpunkt = null) {
  const alle = bloecke.map(b => ({ ...b }));
  if (!alle.length) return [];
  const voll = alle.reduce((s, b) => s + b.min, 0);
  if (!minuten || minuten >= voll) return alle;

  // Wer überlebt, wenn die Zeit knapp wird: das Einspielen, dann der
  // Schwerpunkt, dann der Rest in Planreihenfolge.
  const rang = new Map(alle.map((b, i) => [b.id, i + 10]));
  rang.set(alle[0].id, 0);
  if (schwerpunkt && rang.has(schwerpunkt)) rang.set(schwerpunkt, 1);

  const nachRang = [...alle].sort((a, b) => rang.get(a.id) - rang.get(b.id));
  const passen = Math.max(1, Math.floor(minuten / MINDEST));
  const wieViele = Math.max(1, Math.min(
    alle.length, passen, Math.round(minuten / ZIEL_LAENGE) || 1));
  const drin = new Set(nachRang.slice(0, wieViele).map(b => b.id));
  const gewaehlt = alle.filter(b => drin.has(b.id));

  // Verteilt wird nach den Minuten des vollen Plans, der Schwerpunkt bekommt
  // das Anderthalbfache. Danach auf ganze Minuten runden und die Differenz
  // dort abladen, wo am meisten Luft ist.
  const gewicht = b => b.min * (b.id === schwerpunkt ? 1.5 : 1);
  const summe = gewaehlt.reduce((s, b) => s + gewicht(b), 0);
  let rest = minuten;
  for (const b of gewaehlt) {
    b.min = Math.max(MINDEST, Math.round(minuten * gewicht(b) / summe));
    rest -= b.min;
  }
  // Rundung und Mindestlänge gehen selten genau auf. Die Differenz wandert
  // in den größten Block — beim Zugeben bevorzugt in den Schwerpunkt, beim
  // Abziehen zuletzt aus ihm. Ohne diese Unterscheidung nimmt man dem
  // Schwerpunkt genau die Minuten wieder weg, die man ihm gerade gegeben hat.
  while (rest !== 0) {
    const zugeben = rest > 0;
    const kandidaten = zugeben ? gewaehlt : gewaehlt.filter(b => b.min > MINDEST);
    if (!kandidaten.length) break;
    const wert = b => b.min + (b.id === schwerpunkt ? (zugeben ? 0.5 : -0.5) : 0);
    const ziel = kandidaten.reduce((a, b) => (wert(b) > wert(a) ? b : a));
    ziel.min += zugeben ? 1 : -1;
    rest += zugeben ? -1 : 1;
  }
  return gewaehlt;
}

/**
 * Der Plan für einen Kontext, zugeschnitten auf die heutige Session.
 * `opts` ist `{ minuten, schwerpunkt }`; ohne beides kommt der volle Plan.
 */
export function planFor(kontextId, opts = {}) {
  const { minuten = 0, schwerpunkt = null } = typeof opts === "object" && opts ? opts : {};
  const k = kontextOf(kontextId);
  const voll = k.bloecke
    ? k.bloecke.map(b => ({ ...b }))
    : BLOCKS.map(b => ({ ...b, werkzeug: BLOCK_WERKZEUG[b.id] || null }));
  return baueSession(voll, minuten, schwerpunkt);
}

/** Zu welchem Block gehört ein Werkzeug? Für Vorschläge aus der Auswertung. */
export function blockFuerWerkzeug(kontextId, werkzeug) {
  if (!werkzeug) return null;
  const k = kontextOf(kontextId);
  const liste = k.bloecke || BLOCKS.map(b => ({ ...b, werkzeug: BLOCK_WERKZEUG[b.id] || null }));
  return liste.find(b => b.werkzeug === werkzeug)?.id || null;
}
