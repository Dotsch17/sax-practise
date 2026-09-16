/* ==========================================================================
   Wissen — die Erklärungen hinter dem Übungsplan

   Alles Inhaltliche steht hier, wie beim Übungsplan. Wenn du einen Text
   änderst, änderst du nur diese Datei.

   Grundsatz für alles, was hier steht: nur, was beim Üben eine Entscheidung
   ändert. Kein Instrumentenbau, keine Geschichte, keine Anekdoten. Wo etwas
   je nach Setup und Körperbau verschieden ist, steht das dabei, statt eine
   Zahl als Wahrheit zu verkaufen.
   ========================================================================== */

"use strict";

export const THEMEN = ["Ton", "Technik", "Material", "Methode"];

export const ARTIKEL = [
  {
    id: "ansatz",
    titel: "Ansatz",
    thema: "Ton",
    lead: "Der Ansatz hält das Blatt, er drückt es nicht. Fast alles, was am Anfang nach Tonproblem aussieht, ist zu viel Druck von unten.",
    block: "mundstueck",
    abschnitte: [
      { h: "Was er tun soll", p: [
        "Die Unterlippe liegt als Polster über den unteren Schneidezähnen und stützt das Blatt. Die oberen Zähne liegen auf dem Mundstück. Die Mundwinkel ziehen leicht nach innen, so dass ringsum abgedichtet wird — nicht nach hinten wie beim Lächeln.",
        "Der Ansatz ist ein Ring, keine Klammer. Er hält die Schwingung in Form. Die Energie kommt aus der Luft.",
      ]},
      { h: "Woran du zu viel Druck erkennst", liste: [
        "Der Ton wird beim Lauterwerden hart statt voll.",
        "Im Leisen bricht der Ton ab, statt dünner zu werden.",
        "Die tiefen Töne sprechen erst nach einem Ruck an.",
        "Nach zwanzig Minuten tut die Unterlippe weh.",
        "Das Vibrato kommt aus dem Kiefer statt aus der Lippe und klingt eckig.",
      ]},
      { h: "Die Probe", p: [
        "Spiel das Mundstück allein und halte den Ton zehn Sekunden absolut stabil. Wandert die Tonhöhe nach oben, beiszt du nach. Biege den Ton dann bewusst nach unten und langsam zurück, ohne dass er abreiszt — das ist der Bewegungsumfang, den du brauchst, um im Zusammenspiel korrigieren zu können.",
        "Welche Tonhöhe das Mundstück allein ergibt, hängt von Bahn, Blatt und Ansatz ab; für das Altsaxophon wird meist eine Lage um das klingende A herum genannt. Verlass dich nicht auf die Zahl, sondern darauf, dass sie bei dir jeden Tag dieselbe ist. Wandert sie über Wochen nach oben, wird dein Ansatz enger.",
      ]},
    ],
  },

  {
    id: "luft",
    titel: "Luft",
    thema: "Ton",
    lead: "Ein voller Ton ist fast immer eine Luftfrage, keine Ansatzfrage. Mehr Luft bei gleichbleibendem Ansatz ist der Weg; mehr Druck von unten ist die Sackgasse.",
    block: "langetoene",
    abschnitte: [
      { h: "Einatmen", p: [
        "Durch den Mundwinkel, tief, ohne die Schultern zu heben. Der Bauch geht nach auszen, die Rippen weiten sich seitlich. Wer die Schultern hebt, füllt nur die Spitzen der Lungen und hat nach vier Takten nichts mehr.",
        "Atme so tief ein, wie die Stelle es braucht — nicht immer maximal. Eine volle Lunge unter Druck macht den Ton genauso unruhig wie zu wenig Luft.",
      ]},
      { h: "Ausatmen", p: [
        "Der Luftstrom ist gleichmäszig und warm, so als würdest du eine Scheibe anhauchen. Er beginnt vor dem Ton und endet nach ihm. Der Ton endet mit der Luft, nie mit der Zunge — die Zunge beendet nur dann einen Ton, wenn es ausdrücklich so gewollt ist.",
      ]},
      { h: "Die Probe", liste: [
        "Halte einen mittleren Ton acht bis zwölf Sekunden. Bleibt Lautstärke und Farbe gleich?",
        "Messa di voce über fünfzehn Sekunden: leise beginnen, voll werden, leise enden. Wird der Ton im Lauten hart, kommt die Lautstärke aus dem Kiefer statt aus der Luft.",
        "Spiel denselben Ton einmal mit doppelt so viel Luft und bewusst lockerem Kiefer. Wenn er dabei voller und nicht höher wird, hast du den Zusammenhang gefunden.",
      ]},
    ],
  },

  {
    id: "voicing",
    titel: "Voicing",
    thema: "Ton",
    lead: "Voicing ist die Form des Mundraums und die Lage der Zunge. Es entscheidet über Klangfarbe, Intonation, Ansprache in der Tiefe und über das gesamte Altissimo.",
    block: "obertoene",
    abschnitte: [
      { h: "Worum es geht", p: [
        "Der Mundraum ist ein Resonanzraum, den du formen kannst. Hoher Zungenrücken, wie beim Vokal „i“, stützt hohe Töne. Tiefer Zungenrücken, wie beim „o“ oder „a“, gibt der Tiefe Raum. Das Ohr führt dabei: stell dir den Ton vor, den du willst, bevor du ihn spielst.",
        "Der Unterschied zum Ansatz ist wichtig. Der Ansatz bleibt bei alldem ruhig. Verändert wird, was hinter den Zähnen passiert.",
      ]},
      { h: "Warum Obertöne das Werkzeug dafür sind", p: [
        "Bei der Obertonübung bleibt der Griff derselbe — tief B, ohne Oktavklappe — und du erzeugst die Teiltöne allein über das Voicing. Damit trainierst du genau die Fähigkeit, die du für Altissimo, für die Ansprache im pp und für saubere Registerübergänge brauchst. Es gibt keine Abkürzung daran vorbei.",
        "Matching ist der zweite Schritt: spiel den zweiten Teilton auf tief B, dann den gegriffenen Ton derselben Höhe, und gleich Farbe und Tonhöhe an. Der gegriffene klingt anfangs dünner. Wenn beide gleich klingen, ist dein Voicing für diese Lage richtig.",
      ]},
      { h: "Wenn nichts passiert", liste: [
        "Zu wenig Luft. Obertöne brauchen mehr Luft, nicht mehr Druck.",
        "Der Ansatz zieht sich zusammen. Das erzwingt einen Quetschton statt eines Teiltons.",
        "Du denkst den Zielton nicht. Sing ihn vorher, dann geht es oft sofort.",
        "Zu früh aufgegeben. Der erste Wechsel dauert bei vielen Leuten Tage, nicht Minuten.",
      ]},
    ],
  },

  {
    id: "intonation",
    titel: "Intonation",
    thema: "Ton",
    lead: "Das Saxophon hat bekannte Eigenheiten. Sie zu kennen ist die halbe Arbeit — die andere Hälfte ist, sie mit dem Ohr statt mit dem Display zu korrigieren.",
    block: "intonation",
    abschnitte: [
      { h: "Zuerst das Instrument einstimmen", p: [
        "Spiel dich fünf Minuten warm, bevor du stimmst. Ein kaltes Saxophon steht deutlich tiefer, und was du kalt einstellst, ist zehn Minuten später falsch.",
        "Das Mundstück weiter auf den S-Bogen schieben macht höher, weiter herunter macht tiefer. Steht das Mundstück sehr weit auszen oder sehr weit innen, stimmt etwas anderes nicht — meist der Ansatz oder das Blatt.",
      ]},
      { h: "Was typischerweise abweicht", p: [
        "An fast jedem Saxophon gibt es Töne, die von Haus aus höher oder tiefer liegen als der Rest, und die Abweichungen unterscheiden sich von Instrument zu Instrument und von Setup zu Setup. Deshalb lohnt es sich nicht, eine fremde Liste auswendig zu lernen — deine eigene ist die richtige.",
        "Genau dafür gibt es die Intonationskarte im Stimmgerät: sie schreibt mit, welchen Ton du wie verstimmst, über viele Sessions hinweg. Was dort nach zwei Wochen mit mehr als zehn Cent steht, ist deine Liste.",
      ]},
      { h: "Wie du korrigierst", liste: [
        "Über das Voicing, nicht über den Kiefer. Kieferkorrekturen kosten Klangfarbe.",
        "Bordun laufen lassen und auf die Schwebung hören. Wird sie langsamer, wirst du reiner.",
        "Chromatisch gebunden spielen, nicht Ton für Ton einzeln prüfen — die Übergänge zeigen mehr als die Einzeltöne.",
        "Das Display erst danach zum Gegenprüfen. Wer beim Üben aufs Display schaut, hört nicht.",
      ]},
    ],
  },

  {
    id: "artikulation",
    titel: "Artikulation",
    thema: "Technik",
    lead: "Die Zunge unterbricht die Luft, sie startet sie nicht. Wer mit der Zunge anstöszt statt mit der Luft, bekommt einen Knall statt eines Tonanfangs.",
    block: "artikulation",
    abschnitte: [
      { h: "Der Bewegungsablauf", p: [
        "Die Luft ist schon da, bevor der Ton kommt. Die Zungenspitze liegt leicht an der Blattspitze und gibt sie frei. Das ist die ganze Bewegung: freigeben, nicht schlagen.",
        "Denk „da“ statt „ta“. Das Erste ist ein weicher Anfang, das Zweite ein Aufprall. Für harte Akzente gibt es „ta“ auch, aber als Ausnahme.",
      ]},
      { h: "Der Maszstab", p: [
        "Kurze Töne klingen wie lange, nur kürzer. Ein Staccato hat denselben Kern und dieselbe Farbe wie ein gehaltener Ton — es hört nur früher auf. Wenn deine kurzen Töne dünner klingen als deine langen, artikulierst du mit dem Ansatz mit.",
        "Prüf das im pp gegen. Im Lauten verzeiht die Luft viel; im Leisen hörst du sofort, ob die Zunge zu viel tut.",
      ]},
      { h: "Mit dem Metronom", p: [
        "Nimm die Klangfarbe „Zunge“ im Metronom — der Klick ist so kurz, dass du deine eigene Artikulation dagegen hörst statt darüber. Beginn langsam genug, dass jeder Ton gleich klingt, und geh in Vierer-Schritten hinauf. Wird etwas ungleich, gehst du eine Stufe zurück, nicht weiter.",
      ]},
    ],
  },

  {
    id: "dynamik",
    titel: "Dynamik",
    thema: "Ton",
    lead: "Lautstärke kommt aus der Luftmenge, nicht aus dem Lippendruck. Wenn ff hart klingt, ist es kein ff, sondern ein gequetschtes f.",
    block: "dynamik",
    abschnitte: [
      { h: "Messa di voce", p: [
        "Ein Ton, fünfzehn bis zwanzig Sekunden: aus dem Nichts anschwellen, voll werden, wieder ins Nichts. Das ist die härteste und die nützlichste Tonübung, die es gibt, weil sie Luftführung, Ansatzruhe und Intonation gleichzeitig prüft.",
        "Achte darauf, dass die Tonhöhe dabei stehen bleibt. Steigt sie beim Lauterwerden, arbeitet der Kiefer mit. Fällt sie, lässt der Ansatz los, statt ruhig zu bleiben.",
      ]},
      { h: "Die beiden Enden", liste: [
        "ff ohne Härte: mehr Luft, gleicher Ansatz, offener Mundraum. Härte heiszt Lippendruck.",
        "pp ohne Abriss: die Luft bleibt in Bewegung, auch wenn wenig kommt. Besonders in der Tiefe braucht das ein tiefes Voicing.",
        "Beides braucht Zeit. Die Ränder der Dynamik wachsen über Wochen, nicht über Tage.",
      ]},
    ],
  },

  {
    id: "vibrato",
    titel: "Vibrato",
    thema: "Ton",
    lead: "Im klassischen Saxophonspiel kommt das Vibrato aus der Unterlippe, nicht aus dem Kiefer und nicht aus dem Zwerchfell. Es ist ein Ausdrucksmittel und kein Dauerzustand.",
    abschnitte: [
      { h: "Wie es entsteht", p: [
        "Die Unterlippe macht eine kleine, regelmäszige Bewegung, als würdest du „wa-wa-wa“ oder „ja-ja-ja“ formen. Der Ton wird dabei leicht nach unten gebogen und kehrt zur Ausgangshöhe zurück — das Vibrato liegt also unter der Tonhöhe, nicht darum herum.",
        "Der Ton selbst muss ohne Vibrato stehen, bevor du eines darauflegst. Vibrato auf einem wackligen Ton macht den Wackler nur unsichtbar, nicht besser.",
      ]},
      { h: "Üben mit dem Metronom", p: [
        "Stell das Metronom auf ein ruhiges Tempo, etwa 60, und spiel zuerst zwei Bewegungen je Schlag, dann drei, dann vier. Gleichmäszigkeit vor Geschwindigkeit. Übliche Vibratogeschwindigkeiten im klassischen Spiel liegen ungefähr bei fünf bis sieben Bewegungen je Sekunde, aber das ist ein Rahmen und keine Vorschrift: Tempo, Charakter und Lage des Stücks entscheiden.",
        "Übe es bewusst auch mit dem Ausschalten. Ein langer Ton, dessen Vibrato am Ende ruhig ausläuft, ist ein Ausdrucksmittel. Eines, das nie aufhört, ist ein Tick.",
      ]},
    ],
  },

  {
    id: "altissimo",
    titel: "Altissimo",
    thema: "Technik",
    lead: "Das Altissimo ist keine Grifffrage. Die Griffe helfen, aber getragen wird der Ton vom Voicing — deshalb sind Obertöne die Vorarbeit und nicht die Nebensache.",
    abschnitte: [
      { h: "Die Reihenfolge", p: [
        "Erst die Obertonreihe auf tief B, tief H und tief C sicher beherrschen, dann das Matching gegen die gegriffenen Töne, dann erst Altissimo-Griffe. Wer die Reihenfolge umdreht, erzwingt Töne, die beim ersten Druck wegbrechen.",
        "Wenn dir G, Gis und A schon teilweise gelingen, ist der nächste Schritt nicht ein neuer Ton, sondern Verlässlichkeit: derselbe Ton zehnmal hintereinander, aus dem Nichts, ohne Anlauf über einen anderen. Erst wenn er zehnmal kommt, ist er deiner.",
      ]},
      { h: "Was Altissimo nicht ist", liste: [
        "Kein Kraftakt. Mehr Druck schlieszt das Blatt und der Ton stirbt.",
        "Kein Griff-Auswendiglernen. Die Griffe unterscheiden sich je nach Instrument und Setup; welcher bei dir trägt, findest du selbst heraus.",
        "Kein Tagesprojekt. Das ist Monatsarbeit, und sie geht schneller, wenn du täglich fünf Minuten statt wöchentlich eine Stunde investierst.",
      ]},
      { h: "Zur Griffwahl", p: [
        "Griffe fürs Altissimo sind am Saxophon nicht einheitlich. Was an einem Instrument sicher spricht, spricht am nächsten gar nicht. Nimm eine Grifftabelle für dein Instrument als Ausgangspunkt, probier die Varianten durch und schreib dir auf, welche bei dir trägt — im Repertoire-Teil dieser App, bei dem Stück, in dem du sie brauchst.",
      ]},
    ],
  },

  {
    id: "blaetter",
    titel: "Blätter",
    thema: "Material",
    lead: "Blätter sind Naturprodukt und schwanken stark. Der gröszte Teil der Tage, an denen „der Ton nicht da ist“, sind Blatt-Tage — und die meisten davon sind vermeidbar.",
    abschnitte: [
      { h: "Einspielen und rotieren", p: [
        "Nimm ein neues Blatt in den ersten Tagen nur wenige Minuten und spiel es nicht sofort in der vollen Session ein. Rohr braucht ein paar Zyklen aus Anfeuchten und Trocknen, bis es stabil wird.",
        "Halte drei bis vier Blätter derselben Marke und Stärke in Betrieb, nummeriere sie und rotiere täglich. Wer immer dasselbe Blatt spielt, hat alle zwei Wochen einen schlechten Tag und alle vier Wochen eine Krise.",
      ]},
      { h: "Aufbewahren", p: [
        "Nach dem Spielen abwischen und flach in ein Etui mit ebener Fläche legen. Blätter, die an der Luft liegen, wellen sich; gewellte Blätter dichten nicht mehr ab und sprechen in der Tiefe schlecht an.",
      ]},
      { h: "Zu hart oder zu weich?", liste: [
        "Zu hart: die Tiefe spricht schwer an, im pp bricht der Ton ab, nach kurzer Zeit wird die Lippe müde.",
        "Zu weich: der Ton wird im ff flach und rauschig, die Höhe kippt, das Blatt schlägt zu.",
        "Bevor du die Stärke änderst, prüf den Ansatz. Sehr oft ist ein „zu hartes“ Blatt nur zu wenig Luft.",
      ]},
      { h: "Im Übemonat nicht wechseln", p: [
        "Solange du am Ton arbeitest, bleibt das Setup gleich. Mundstück, Blattmarke und Stärke sind Konstanten, sonst weiszt du nie, ob eine Veränderung von dir oder vom Material kommt.",
      ]},
    ],
  },

  {
    id: "ueben",
    titel: "Wie man übt",
    thema: "Methode",
    lead: "Die Frage ist nicht, wie lange du übst, sondern wie viele bewusste Wiederholungen du machst. Alles andere ist Zeit am Instrument, nicht Übung.",
    abschnitte: [
      { h: "Langsam heiszt langsam genug", p: [
        "Das richtige Tempo ist das, in dem du fehlerfrei und ohne Anspannung spielst — nicht das, in dem du gerade noch durchkommst. Wer schnell übt, übt vor allem seine Fehler ein.",
        "Nach oben geht es in kleinen Schritten, mit der Tempo-Rampe im Metronom. Geht eine Stufe nicht sauber, gehst du eine zurück statt weiter hinauf. Das fühlt sich langsam an und ist die schnellste Methode, die es gibt.",
      ]},
      { h: "Kleine Einheiten", p: [
        "Zwei Takte, die sitzen, sind mehr wert als eine Seite, die ungefähr geht. Nimm die schwierigste Stelle heraus, übe sie einzeln und setz sie erst dann wieder ein — mit je einem Takt davor und danach, denn der Übergang ist meist das eigentliche Problem.",
      ]},
      { h: "Täglich schlägt viel", p: [
        "Zwanzig Minuten an sechs Tagen bringen mehr als zwei Stunden an einem. Das gilt besonders für alles, was mit Ansatz, Voicing und Altissimo zu tun hat — das sind körperliche Anpassungen, und die brauchen Wiederholung über Zeit, nicht Dauer am Stück.",
      ]},
      { h: "Aufschreiben", p: [
        "Was du nicht notierst, vergisst du bis morgen. Welches Blatt, welche Töne schief waren, welches Tempo du geschafft hast. Genau dafür gibt es das Protokoll und die Auswertung in dieser App — nach zwei Wochen zeigen sie dir, welchen Block du systematisch auslässt.",
      ]},
    ],
  },

  {
    id: "vorspiel",
    titel: "Vorspielen",
    thema: "Methode",
    lead: "Vorspielen ist eine eigene Fähigkeit und wird eigens geübt. Wer nur allein übt, übt eine Situation, die in der Prüfung nicht vorkommt.",
    abschnitte: [
      { h: "Die Situation üben", liste: [
        "Spiel regelmäszig Durchläufe ohne Anhalten. Ein Fehler wird nicht korrigiert, es geht weiter — das ist die Fähigkeit, die in der Prüfung zählt.",
        "Nimm dich auf. Die Aufnahme hört schonungsloser zu als du im Spielen.",
        "Spiel jemandem vor, auch wenn es unangenehm ist. Der Puls unter Beobachtung ist ein anderer, und daran gewöhnt man sich nur durch Wiederholung.",
        "Übe den Anfang öfter als den Rest. Die ersten acht Takte entscheiden über deine Nerven für den Rest.",
      ]},
      { h: "Am Tag selbst", p: [
        "Warmspielen wie immer, nicht mehr und nicht anders. Am Prüfungstag noch etwas verändern zu wollen ist der häufigste vermeidbare Fehler.",
        "Neues Blatt? Nein. Nimm eines, das seit Tagen läuft, und hab ein zweites eingespieltes dabei.",
      ]},
    ],
  },
];

/* --- Diagnose ---------------------------------------------------------------
   Vom Symptom zur Ursache. Die Reihenfolge der Ursachen ist die der
   Wahrscheinlichkeit, nicht die der Wichtigkeit — oben steht, was man
   zuerst prüfen sollte. */

export const DIAGNOSE = [
  {
    problem: "Der Ton klingt dünn oder gedrückt",
    ursachen: [
      "Zu viel Lippendruck. Probier denselben Ton mit bewusst lockerem Kiefer und mehr Luft.",
      "Zu wenig Luft. Ein voller Ton ist fast immer eine Luftfrage.",
      "Mundraum zu eng. Denk beim Spielen ein „o“ statt eines „i“.",
      "Blatt gewellt oder ausgespielt. Nimm ein anderes aus der Rotation.",
    ],
    artikel: ["ansatz", "luft", "voicing"],
  },
  {
    problem: "Die tiefen Töne sprechen nicht an",
    ursachen: [
      "Ansatz zu fest. In der Tiefe braucht das Blatt Platz zum Schwingen.",
      "Voicing zu hoch. Der Zungenrücken muss herunter, Richtung „o“ oder „a“.",
      "Luft zu zaghaft. Tiefe Töne brauchen Menge, nicht Druck.",
      "Undichtigkeit an einer Klappe. Wenn tief C noch geht und tief B nicht, lass die Mechanik prüfen.",
    ],
    artikel: ["voicing", "luft"],
  },
  {
    problem: "Im pp bricht der Ton ab",
    ursachen: [
      "Die Luft steht still. Auch leise muss sie in Bewegung bleiben.",
      "Der Ansatz macht die Dynamik statt der Luft — im Leisen schlieszt er dann das Blatt.",
      "Blatt zu hart für die Lautstärke.",
      "Fehlende Übung an den Rändern. Messa di voce baut das über Wochen auf.",
    ],
    artikel: ["dynamik", "luft"],
  },
  {
    problem: "Im ff wird der Ton hart",
    ursachen: [
      "Lautstärke kommt aus dem Kiefer statt aus der Luft.",
      "Mundraum schlieszt sich beim Lauterwerden.",
      "Blatt zu weich, es schlägt zu.",
    ],
    artikel: ["dynamik", "ansatz"],
  },
  {
    problem: "Beim Oktavwechsel springt oder kippt der Ton",
    ursachen: [
      "Das Voicing wechselt zu spät oder gar nicht. Genau das trainieren die Obertöne.",
      "Der Ansatz hilft nach. Er soll ruhig bleiben.",
      "Der Luftstrom bricht im Moment des Wechsels ein.",
    ],
    artikel: ["voicing"],
  },
  {
    problem: "Einzelne Töne sind immer zu hoch oder zu tief",
    ursachen: [
      "Instrumenteneigenheit. Schau in die Intonationskarte im Stimmgerät — nach ein paar Sessions steht dort deine eigene Liste.",
      "Korrektur über den Kiefer statt über das Voicing. Das kostet Klangfarbe.",
      "Mundstück steht zu weit auszen oder innen; die Abweichungen verteilen sich dann ungleich über den Umfang.",
      "Zu früh gestimmt, das Instrument war noch kalt.",
    ],
    artikel: ["intonation"],
  },
  {
    problem: "Die Zunge kommt nicht mit",
    ursachen: [
      "Zu viel Zungenbewegung. Nur die Spitze, und nur ein Freigeben.",
      "Die Luft stützt nicht durch. Ohne stehende Luft muss die Zunge arbeiten, die dafür nicht gemacht ist.",
      "Zu schnell geübt. Geh auf ein Tempo zurück, in dem jeder Ton gleich klingt, und nimm die Tempo-Rampe.",
    ],
    artikel: ["artikulation", "ueben"],
  },
  {
    problem: "Der Ton ist da, aber er flackert",
    ursachen: [
      "Luftstrom ungleichmäszig, oft weil zu viel eingeatmet und dann gedrückt wird.",
      "Unbewusstes Vibrato aus dem Kiefer.",
      "Ansatz noch nicht ausdauernd genug — das gibt sich mit täglichen langen Tönen.",
    ],
    artikel: ["luft", "vibrato"],
  },
  {
    problem: "Altissimo spricht nicht oder nur manchmal",
    ursachen: [
      "Obertonarbeit fehlt. Ohne sichere Teiltöne auf tief B ist Altissimo Glückssache.",
      "Zu viel Druck. Mehr Kraft schlieszt das Blatt.",
      "Der Zielton wird nicht gedacht. Sing ihn vor dem Spielen.",
      "Griff passt nicht zu deinem Instrument. Probier die Varianten durch.",
    ],
    artikel: ["altissimo", "voicing"],
  },
  {
    problem: "Heute geht gar nichts",
    ursachen: [
      "Blatt. Zuerst ein anderes probieren, bevor du an dir zweifelst.",
      "Zu wenig warmgespielt. Mundstück allein und lange Töne, fünf Minuten, bevor du urteilst.",
      "Müdigkeit. Ansatz und Luft sind Muskelarbeit; an manchen Tagen ist die Kurve unten.",
      "Wenn es drei Tage hintereinander so ist, liegt es nicht am Tag. Schau ins Protokoll, was sich geändert hat.",
    ],
    artikel: ["blaetter", "ueben"],
  },
];
