/* ==========================================================================
   Stile und Formen — was ein Blues ist, bevor man einen spielt

   „Spiel einen Blues“ ist für jemanden, der nicht weiß, was ein Blues ist,
   keine Aufgabe, sondern ein Rätsel. Deshalb steht hier zu jedem Stil, den
   der Nutzer in der Prüfung oder auf einem Gig braucht:

   - was er ist, in Sätzen, die man ohne Vorwissen versteht,
   - woran man ihn beim Hören erkennt,
   - seine Form — und die spielt die Band, in der Tonart der eigenen Stücke,
   - wie man darüber spielt, in Schritten mit „fertig, wenn“,
   - die typischen Fehler, Aufnahmen zum Anhören und was das für die
     eigenen Prüfungsstücke heißt.

   Fakten, bei denen man sich irren kann, stehen vorsichtig da: Tonarten
   von Stücken als „in den meisten Leadsheets“, weil es Fassungen gibt.
   Hörbeispiele nur, wo Titel, Musiker und Jahr sicher sind.

   `stufen` ist dieselbe Schreibweise wie bei den Leadsheet-Vorlagen
   (js/music/leadsheet.js): I7, ii7, IVmaj7, #IV°7, bVI7; ohne Endung ist
   es ein Dreiklang (I Dur, vi Moll). Die Band liest daraus die Akkorde in
   der gewählten klingenden Tonart.

   Reiner Inhalt, kein DOM.
   ========================================================================== */

"use strict";

const K = (step, alter = 0) => ({ step, alter, octave: 4 });
// Klingende Tonarten, die in Jazz und Pop für Bläser üblich sind.
const F = { name: "F", tonika: K(3) }, B = { name: "B", tonika: K(6, -1) }, C = { name: "C", tonika: K(0) },
  Es = { name: "Es", tonika: K(2, -1) }, G = { name: "G", tonika: K(4) }, D = { name: "D", tonika: K(1) },
  A = { name: "A", tonika: K(5) }, E = { name: "E", tonika: K(2) };

export const STILE = [
  /* --- Blues ------------------------------------------------------------------------------ */
  {
    id: "blues",
    titel: "Blues",
    kurz: "Zwölf Takte, drei Akkorde — und ein Ton, der zwischen Dur und Moll hängt.",
    tonarten: [F, B, C, Es, G],
    groove: "swing", tempo: 112, swing: 0.62,
    varianten: [
      { id: "grund", label: "Grundform", stufen: "| I7 | I7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7 |",
        was: "Die einfachste Form. So klingt der Blues seit über hundert Jahren." },
      { id: "quick", label: "Quick Change", stufen: "| I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7 |",
        was: "Wie die Grundform, aber schon in Takt 2 kurz zur IV. Sehr verbreitet." },
      { id: "jazz", label: "Jazz-Blues", stufen: "| I7 | IV7 | I7 | v7 I7 | IV7 | #IV°7 | I7 | VI7 | ii7 | V7 | I7 VI7 | ii7 V7 |",
        was: "So wird er in der Jazz-Session gespielt: mit II–V-Verbindungen und Zwischendominanten. Straight, No Chaser und Parker's Mood stehen in dieser Welt." },
    ],
    abschnitte: [
      { h: "Was ein Blues ist", p: [
        "Der Blues ist zwei Dinge zugleich: eine Form und ein Ausdruck. Er ist Ende des 19. Jahrhunderts in afroamerikanischen Gemeinschaften im Süden der USA entstanden und steckt in fast allem, was danach kam — Jazz, Rhythm & Blues, Rock 'n' Roll, Soul, Funk, Rock.",
        "Als Form ist er erstaunlich einfach: zwölf Takte, die sich immer wiederholen, und darin nur drei Akkorde. Sie stehen auf der ersten, vierten und fünften Stufe der Tonart. In C sind das C, F und G. Ein Durchgang durch die zwölf Takte heißt Chorus.",
        "Das Besondere hört man sofort: alle drei Akkorde sind Septakkorde, also C7, F7, G7. In der klassischen Harmonielehre wäre nur der auf der fünften Stufe ein Septakkord, weil er zurück zur Tonika drängt. Im Blues drängt alles — und bleibt trotzdem zu Hause. Das ist der raue, ungelöste Klang.",
        "Als Ausdruck lebt er von den Blue Notes: Tönen, die zwischen den Tasten liegen. Am wichtigsten ist die kleine Terz der Tonart, gespielt über einem Durakkord — über C7 also ein Es, obwohl im Akkord ein E steht. Sänger und Bläser ziehen diesen Ton oft vom Es nach oben Richtung E. Dazu kommen die verminderte Quinte (Ges) und die kleine Septime (B).",
      ]},
      { h: "Wie die zwölf Takte gebaut sind", p: [
        "Drei Zeilen zu je vier Takten, wie drei Sätze:",
      ], liste: [
        "Takt 1–4: zu Hause auf der I. Die Aussage.",
        "Takt 5–6: weg zur IV — der Bass geht eine Quarte hoch, es hebt sich hörbar. Takt 7–8: wieder nach Hause. Die Aussage noch einmal, anders beleuchtet.",
        "Takt 9: die V, die meiste Spannung. Takt 10: die IV, schon auf dem Rückweg. Takt 11: zu Hause. Takt 12: noch einmal die V, damit es wieder von vorn losgeht — der Turnaround.",
      ]},
      { h: "Frage und Antwort", p: [
        "Gesungene Blues folgen oft dem Muster A–A–B: eine Zeile, dieselbe Zeile noch einmal, dann die Antwort, die sie auflöst. Jede Zeile füllt vier Takte, gesungen wird aber nur etwa zwei — die anderen zwei gehören der Antwort eines Instruments.",
        "Das ist für dich als Saxophonist die wichtigste Idee überhaupt: eine Phrase, dann Platz. Oder: ein Motiv, dasselbe Motiv, dann eine Antwort darauf. So klingt ein Blues-Solo nach Blues und nicht nach Tonleiter.",
      ]},
      { h: "Swing und Shuffle", p: [
        "Die meisten Blues werden geswingt: die Achtel sind nicht gleich lang, die erste ist länger als die zweite (ungefähr wie die erste und dritte Note einer Triole). Beim Shuffle ist das besonders deutlich, man hört ein „dum-da dum-da“. Es gibt auch Blues mit geraden Achteln — im Rock und manchmal im Funk.",
        "Die Betonung liegt auf 2 und 4. Wenn du mit dem Fuß tippst: der Klick auf 2 und 4 ist beim Blues die Wahrheit, nicht der auf 1 und 3.",
      ]},
    ],
    erkennen: [
      "Zähl die Takte: nach zwölf fängt alles von vorn an. Das ist das sicherste Zeichen.",
      "Takt 5: der deutlichste Moment. Der Bass steigt, der Klang hebt sich — die IV kommt. Wer diesen Moment hört, hat die Form.",
      "Takt 9 bis 12: Spannung, Rückweg, Ankommen. Am Ende spürt man, wie es „nach Hause“ zieht und wieder anfängt.",
      "Der Klang: Septakkorde überall, meist geswingt, oft mit gezogenen Tönen im Gesang oder Solo.",
      "Frage und Antwort: Phrasen von etwa zwei Takten, danach Luft oder eine Antwort.",
    ],
    schritte: [
      { was: "Die Form hören", wie: "Band starten und mitzählen: 1-2-3-4, 2-2-3-4 … bis 12. Tipp jedes Mal, wenn ein neuer Chorus beginnt — die App prüft mit. Dann mit verdecktem Raster.",
        fertig: "Drei Chorusse hintereinander richtig getippt, mit verdecktem Raster." },
      { was: "Nur Grundtöne", wie: "Je Takt eine ganze Note: der Grundton des Akkords. Nicht mehr. So lernen die Finger die Form.",
        fertig: "Ein Chorus ohne auf das Raster zu schauen, jede Eins getroffen." },
      { was: "Eine Tonleiter für alles", wie: "Moll-Pentatonik der Tonart über den ganzen Blues — in C also C, Es, F, G, B. Das funktioniert über alle drei Akkorde, und genau das ist der Trick des Blues. Nimm drei, vier Töne daraus als Motiv: zwei Takte spielen, zwei Takte Pause.",
        fertig: "Ein Chorus, in dem man dein Motiv wiedererkennt, mit Pausen." },
      { was: "Die Blue Note", wie: "Dazu die verminderte Quinte (Ges in C): immer als Durchgang zwischen Quarte und Quinte, F–Ges–G, nie als Ton zum Stehenbleiben. Und die kleine Terz über dem I-Akkord: von Es nach E hinaufziehen.",
        fertig: "Du setzt die Blue Note bewusst, einmal pro Chorus, und landest danach auf einem stabilen Ton." },
      { was: "A–A–B", wie: "Takt 1–2 ein Motiv, Takt 5–6 dasselbe Motiv (über der IV klingt es anders!), Takt 9–10 eine Antwort. Dazwischen Pausen.",
        fertig: "Zwei Chorusse A–A–B, die jemand, der zuhört, als Aussage erkennt." },
      { was: "Den Akkordwechsel zeigen", wie: "Über der I die große Terz (E über C7), in Takt 5 die Terz des neuen Akkords (A über F7). Von C7 zu F7 fällt das B zum A und das E zum Es — ein Halbtonschritt, und man hört in deiner Linie, dass der Akkord wechselt.",
        fertig: "Beim Wechsel in Takt 5 triffst du A oder Es auf der Eins, ohne zu suchen." },
      { was: "Jazz-Blues", wie: "Variante „Jazz-Blues“ wählen. Jetzt gibt es II–V-Verbindungen (Takt 9–10, Turnaround). Für den Anfang: Zieltöne unter Impro → Begleitband, Modus „Zieltöne“, Folge „Jazz-Blues“.",
        fertig: "Ein Chorus Jazz-Blues, in dem du die Terz jedes neuen Akkords triffst." },
    ],
    fehler: [
      "Die Form verlieren, meist in Takt 9. Gegenmittel: die Eins jedes Taktes mitzählen und in Takt 9 bewusst einen Ton setzen.",
      "Die Tonleiter rauf und runter spielen. Das ist Üben, nicht Blues. Ein Motiv und Pausen klingen hundertmal mehr nach Blues.",
      "Auf der Blue Note stehenbleiben. Dann klingt es nicht bluesig, sondern falsch.",
      "Über F7 (der IV) die große Terz der Tonika halten, das E. Es reibt sich mit dem Es im Akkord. Über der IV ist das Es richtig.",
      "Zu viel spielen. Der Blues braucht Platz — die Hälfte der Zeit Pause ist nicht zu wenig.",
    ],
    hoeren: [
      { wer: "Charlie Parker", was: "„Now's the Time“ (1945) — ein Blues in F, Parker am Altsaxophon." },
      { wer: "Thelonious Monk", was: "„Straight, No Chaser“ — dein Prüfungsstück. Ein Blues, dessen Thema mit einem kurzen Motiv spielt, das immer an einer anderen Stelle im Takt landet." },
      { wer: "Charlie Parker", was: "„Parker's Mood“ (1948) — dein Prüfungsstück. Ein langsamer Blues: jeder Ton zählt." },
      { wer: "Sonny Rollins mit John Coltrane", was: "„Tenor Madness“ (1956) — ein Blues in B, zwei Tenorsaxophone, die sich abwechseln." },
      { wer: "Miles Davis", was: "„All Blues“ vom Album Kind of Blue (1959) — ein Blues im Dreiertakt; Cannonball Adderley spielt Altsaxophon." },
    ],
    deine: "Straight, No Chaser und Parker's Mood sind beide Blues — zwei deiner drei Prüfungsstücke haben also dieselbe Form. Straight, No Chaser steht in den meisten Leadsheets in F (klingend, gegriffen D), Parker's Mood meist in B (gegriffen G). Wähl oben die Tonart und die Variante Jazz-Blues und spiel mit der Band, bevor du das Thema übst: wenn die Form sitzt, hängt das Thema nicht mehr in der Luft.",
  },

  /* --- Moll-Blues -------------------------------------------------------------------------- */
  {
    id: "mollblues",
    titel: "Moll-Blues",
    kurz: "Dieselben zwölf Takte, dunkler.",
    tonarten: [C, G, D, F],
    groove: "swing", tempo: 120, swing: 0.62,
    varianten: [
      { id: "moll", label: "Moll-Blues", stufen: "| i7 | i7 | i7 | i7 | iv7 | iv7 | i7 | i7 | bVI7 | V7 | i7 | V7 |",
        was: "Die übliche Form: Mollakkorde auf I und IV, vor der Dominante die sechste Stufe als Farbe." },
    ],
    abschnitte: [
      { h: "Was anders ist", p: [
        "Die Form ist dieselbe wie beim Blues: zwölf Takte, drei Zeilen. Aber die I und die IV sind Mollakkorde (Cm7 und Fm7 in C), und in Takt 9 steht statt der Dominante oft ein Akkord auf der tiefen sechsten Stufe (As7 in c-Moll), der sich dann in die Dominante (G7) schiebt.",
        "Der Charakter ist ernster, dunkler, oft modaler. Viele Moll-Blues aus dem Jazz der späten 50er und 60er Jahre sind so gebaut.",
      ]},
      { h: "Was man darüber spielt", p: [
        "Die Moll-Pentatonik funktioniert hier noch besser als im Dur-Blues, weil jetzt auch die Akkorde Moll sind. Über i7 und iv7 passt auch dorisch. Über die Dominante in Takt 10 (G7 in c-Moll) gehört der Leitton H — der Ton, der in der Pentatonik fehlt und die Dominante erst hörbar macht.",
      ]},
    ],
    erkennen: [
      "Zwölf Takte wie beim Blues.",
      "Der Grundakkord ist Moll — die kleine Terz klingt stabil, nicht wie eine Reibung.",
      "Takt 9: ein heller, fremder Akkord (bVI7), der in die Dominante rutscht.",
    ],
    schritte: [
      { was: "Form und Grundtöne", wie: "Wie beim Blues: mitzählen, dann nur Grundtöne. Achte auf Takt 9 und 10: bVI und V liegen einen Halbton auseinander.",
        fertig: "Ein Chorus Grundtöne ohne Blick aufs Raster." },
      { was: "Moll-Pentatonik", wie: "Moll-Pentatonik der Tonart über alles, mit Motiven und Pausen.",
        fertig: "Ein Chorus mit wiedererkennbarem Motiv." },
      { was: "Der Leitton", wie: "In Takt 10 über der Dominante den Leitton (H in c-Moll) spielen und in Takt 11 auf den Grundton auflösen.",
        fertig: "Du triffst den Leitton in Takt 10 jedes Chorus." },
    ],
    fehler: [
      "Über die Dominante in Takt 10 weiter Pentatonik spielen und den Leitton auslassen — dann hört man den Wechsel nicht.",
      "Takt 9 verpassen, weil man den Akkord nicht erwartet.",
    ],
    hoeren: [
      { wer: "John Coltrane", was: "„Mr. P.C.“ vom Album Giant Steps (1960) — ein schneller Moll-Blues." },
      { wer: "B.B. King", was: "„The Thrill Is Gone“ (1969) — ein langsamer Moll-Blues aus dem Blues selbst, mit eigener Wendung gegen Ende." },
    ],
    deine: "Keines deiner Stücke ist ein Moll-Blues, aber auf Gigs kommt er oft vor, und über ihn lernt man, wie Moll und Blues zusammengehen.",
  },

  /* --- Rhythm Changes ---------------------------------------------------------------------- */
  {
    id: "rhythm",
    titel: "Rhythm Changes",
    kurz: "Die Akkorde von „I Got Rhythm“ — die zweite Form, die jeder Jazzmusiker kann.",
    tonarten: [B, Es, F, C],
    groove: "swing", tempo: 150, swing: 0.6,
    varianten: [
      { id: "rhythm", label: "32 Takte", stufen: "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | Imaj7 vi7 | ii7 V7 |" +
          "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | ii7 V7 | Imaj7 |" +
          "[B] | III7 | III7 | VI7 | VI7 | II7 | II7 | V7 | V7 |" +
          "[A] | Imaj7 vi7 | ii7 V7 | Imaj7 vi7 | ii7 V7 | v7 I7 | IVmaj7 #IV°7 | ii7 V7 | Imaj7 |",
        was: "AABA mit je acht Takten. Die A-Teile kreisen um die Tonika, die Bridge ist eine Kette von Dominanten." },
    ],
    abschnitte: [
      { h: "Woher der Name kommt", p: [
        "George Gershwin schrieb 1930 „I Got Rhythm“. Die Akkordfolge dieses Songs wurde im Jazz so oft für neue Melodien benutzt, dass sie einen eigenen Namen bekam: Rhythm Changes. Viele Bebop-Themen stehen darauf, etwa „Anthropology“ von Charlie Parker und Dizzy Gillespie — und „Oleo“ von Sonny Rollins, dein Prüfungsstück.",
      ]},
      { h: "Die Form: AABA", p: [
        "32 Takte in vier Teilen zu je acht. Drei A-Teile, die fast gleich sind, und in der Mitte ein B-Teil, die Bridge.",
        "Die A-Teile laufen schnell durch I–VI–II–V: zwei Akkorde pro Takt, immer wieder zurück zur Tonika. In Takt 5 und 6 geht es kurz zur IV.",
        "Die Bridge ist ganz anders: vier Dominantseptakkorde, je zwei Takte, jeder eine Quinte unter dem vorigen — III7, VI7, II7, V7, in B also D7, G7, C7, F7. Das führt Schritt für Schritt zurück zum letzten A-Teil.",
      ]},
    ],
    erkennen: [
      "Schnelle Akkordwechsel, zwei pro Takt, in einer Schleife, die alle zwei Takte zur Tonika zurückkommt.",
      "Nach 16 Takten klingt es plötzlich offen und schwebend: die Bridge mit ihren langen Dominanten.",
      "Tempo meist schnell. Ein Stück, das nach Bebop klingt und diese Bridge hat, ist fast immer Rhythm Changes.",
    ],
    schritte: [
      { was: "Die Form hören", wie: "Band starten, die 32 Takte mitzählen und jeden Chorusanfang tippen. Achte darauf, wann die Bridge beginnt.",
        fertig: "Zwei Chorusse mit verdecktem Raster richtig getippt." },
      { was: "A-Teile: Tonika-Denken", wie: "Am Anfang nicht jeden Akkord ausspielen: über den A-Teilen die Dur-Pentatonik oder Moll-Pentatonik der Tonart, mit Zielton Grundton oder Terz auf der Eins jedes zweiten Taktes.",
        fertig: "Ein A-Teil, in dem du auf Takt 1, 3, 5 und 7 bewusst landest." },
      { was: "Bridge: die Terzen", wie: "Über jedem Dominantakkord der Bridge seine Terz als langen Ton. In B klingend: Fis, H, E, A — gegriffen Dis, Gis, Cis, Fis. Das sind vier Töne, die abwärts im Quintfall wandern, und sie tragen die ganze Bridge.",
        fertig: "Die Bridge nur mit den vier Terzen, ohne zu suchen." },
      { was: "Tempo", wie: "Mit der Band langsam anfangen (120) und in Schritten schneller werden. Oleo wird schnell gespielt; wer das Tempo nicht hat, spielt lieber weniger Töne sicher.",
        fertig: "Oleo-Tempo mit der Band, die Form hält." },
    ],
    fehler: [
      "Jeden Akkord der A-Teile ausspielen wollen und dabei die Form verlieren. Weniger Töne, aber auf der Eins.",
      "Die Bridge nicht kommen hören und mit A-Teil-Material weiterspielen.",
    ],
    hoeren: [
      { wer: "Sonny Rollins", was: "„Oleo“ — dein Prüfungsstück. Die bekannte frühe Aufnahme ist von 1954 mit Miles Davis und Rollins, auf dem Album Bags' Groove." },
      { wer: "Charlie Parker und Dizzy Gillespie", was: "„Anthropology“ — ein Bebop-Thema über Rhythm Changes." },
      { wer: "George Gershwin", was: "„I Got Rhythm“ (1930) — das Original, von dem alles stammt." },
    ],
    deine: "Oleo ist Rhythm Changes, in den meisten Leadsheets in B (klingend, gegriffen G). Übe zuerst die Form mit der Band, dann die Bridge mit den Terzen — sie ist das, woran man in der Prüfung hört, ob du weißt, wo du bist.",
  },

  /* --- Jazz-Standard ----------------------------------------------------------------------- */
  {
    id: "standard",
    titel: "Jazz-Standard",
    kurz: "Ein Song aus dem Broadway oder Film, den alle kennen — und wie man ihn auf der Session spielt.",
    tonarten: [F, B, Es, C],
    groove: "swing", tempo: 132, swing: 0.62,
    varianten: [
      { id: "aaba", label: "AABA, 32 Takte", stufen: "[A] | Imaj7 | vi7 | ii7 | V7 | Imaj7 | vi7 | ii7 | V7 |" +
          "[A] | Imaj7 | vi7 | ii7 | V7 | Imaj7 | vi7 | ii7 | V7 |" +
          "[B] | iii7 | VI7 | ii7 | V7 | iii7 | VI7 | ii7 | V7 |" +
          "[A] | Imaj7 | vi7 | ii7 | V7 | ii7 | V7 | Imaj7 | Imaj7 |",
        was: "Eine Übungsform zum Mitzählen, kein bestimmtes Stück: acht Takte A, noch einmal A, eine Bridge, noch einmal A." },
    ],
    abschnitte: [
      { h: "Was ein Standard ist", p: [
        "Ein Standard ist ein Song, den Jazzmusiker so oft gespielt haben, dass ihn jeder kennt. Viele stammen aus Musicals und Filmen der 1920er bis 1950er Jahre — das „Great American Songbook“. Have You Met Miss Jones (Rodgers und Hart, 1937) und There Will Never Be Another You (Harry Warren, 1942) gehören dazu.",
        "Die meisten sind 32 Takte lang und in Abschnitte zu acht Takten geteilt. Die häufigste Form ist AABA: ein Teil, derselbe noch einmal, ein anderer (die Bridge), der erste wieder. Es gibt auch andere, etwa ABAC — zwei Hälften, die gleich anfangen und verschieden enden.",
      ]},
      { h: "Wie ein Standard gespielt wird", liste: [
        "Einzählen, manchmal ein kurzes Intro.",
        "Das Thema (der „Head“): die Melodie einmal durch die ganze Form.",
        "Soli: jeder Solist spielt einen oder mehrere Durchgänge durch die Form (Chorusse) über dieselben Akkorde.",
        "Oft „Fours“: Solisten und Schlagzeug wechseln sich alle vier Takte ab.",
        "Das Thema noch einmal, dann ein Schluss.",
      ]},
      { h: "Warum die Form alles ist", p: [
        "Im Solo gibt es keine Melodie mehr, an der man sich festhält — nur die Akkorde und die Form im Kopf. Wer weiß, dass jetzt Takt 17 ist und die Bridge beginnt, spielt in die Musik hinein. Wer es nicht weiß, spielt daneben, auch mit den richtigen Tönen.",
        "Deshalb lernt man zuerst das Thema auswendig: es ist die Landkarte. Während des Solos hört man es innerlich mit.",
      ]},
    ],
    erkennen: [
      "Achttaktige Abschnitte; nach acht oder sechzehn Takten wechselt der Charakter (die Bridge).",
      "Die Melodie kommt am Anfang und am Ende, dazwischen Soli über dieselben Akkorde.",
      "Viele II–V–I-Verbindungen: kurze Schleifen, die in eine neue Tonart führen.",
    ],
    schritte: [
      { was: "Die Form mitzählen", wie: "Band starten (Übungsform AABA) und bei jedem Chorusanfang tippen. Dann bei deinem Stück dasselbe mit „Eigene Stücke“.",
        fertig: "Du weißt jederzeit, in welchem Teil du bist, ohne aufs Raster zu schauen." },
      { was: "Das Thema auswendig", wie: "Das Thema deines Standards ohne Blatt, mit der Phrasierung einer Aufnahme, die du magst.",
        fertig: "Du kannst das Thema in jedem Teil der Form beginnen." },
      { was: "Guide Tones", wie: "Durch die ganze Form nur Terz und Septime jedes Akkords (Impro → Eigene Stücke zeigt sie an).",
        fertig: "Ein Chorus nur mit Zieltönen, ohne zu suchen." },
      { was: "Vom Thema aus improvisieren", wie: "Beginn dein Solo mit einem Stück des Themas und verändere es: anderer Rhythmus, andere Lage, ein Ton mehr.",
        fertig: "Zwei Chorusse, die man als Variation deines Stücks erkennt." },
    ],
    fehler: [
      "Soli ohne das Thema im Kopf — dann verliert man die Form.",
      "Jeden Akkord gleich wichtig nehmen. Die Tonart-Inseln (wo die II–V hinführt) sind das Gerüst, die Durchgangsakkorde die Farbe.",
    ],
    hoeren: [
      { wer: "Have You Met Miss Jones?", was: "Rodgers und Hart, 1937 — dein Prüfungsstück. AABA; die Bridge wechselt im Abstand großer Terzen die Tonart, eine Idee, die John Coltrane später in „Giant Steps“ weitergetrieben hat." },
      { wer: "There Will Never Be Another You", was: "Harry Warren und Mack Gordon, 1942 — dein Prüfungsstück. Schau im Leadsheet nach, wie die 32 Takte geteilt sind, und trag die Form in „Eigene Stücke“ ein." },
    ],
    deine: "Have You Met Miss Jones und There Will Never Be Another You sind Standards. Die Übungsform hier ist kein Leadsheet dieser Stücke — die Harmonien stehen bewusst nicht in der App, weil es viele Fassungen gibt. Trag dein Leadsheet unter Impro → Eigene Stücke ein, dann spielt die Band genau deine Fassung.",
  },

  /* --- Ballade ---------------------------------------------------------------------------- */
  {
    id: "ballade",
    titel: "Ballade",
    kurz: "Langsam, leise, ein Ton, der trägt. Nirgends hört man dein Saxophon so genau.",
    tonarten: [Es, F, B, C],
    groove: "ballade", tempo: 60, swing: 0.6,
    varianten: [
      { id: "ballade", label: "Balladenwendung", stufen: "| Imaj7 | vi7 | ii7 | V7 | iii7 | VI7 | ii7 | V7 |",
        was: "Eine ruhige Schleife aus II–V-Verbindungen, zum Üben von Ton und Phrasierung." },
    ],
    abschnitte: [
      { h: "Was eine Ballade ist", p: [
        "Eine Ballade ist ein langsames Stück, meist ein Liebeslied, oft ein Standard. Das Tempo liegt irgendwo zwischen 50 und 70 Schlägen pro Minute. Die Band spielt leise, oft mit Besen statt Stöcken.",
        "In der Ballade gibt es kein Versteck: kein Tempo, das Fehler verwischt, keine Lautstärke, die den Ton überdeckt. Man hört den Ton, die Intonation, das Vibrato und jede Phrasenlänge. Deshalb gehört eine Ballade in fast jedes Prüfungsprogramm — sie zeigt, was eine Tonleiter nicht zeigt.",
      ]},
      { h: "Wie man eine Ballade spielt", liste: [
        "Das Thema ist das Solo. Die Melodie singen, nicht abspielen: jede Phrase hat einen Atem, einen Höhepunkt, ein Ende.",
        "Lange Töne voll ausspielen und bewusst beenden. Vibrato erst gegen Ende eines langen Tons, nicht vom Anfang an.",
        "Subtone in der Tiefe und im Leisen — der warme, rauchige Balladenklang.",
        "Wenig Töne im Solo, dafür Platz. Wenn du doch schneller wirst (Sechzehntelläufe), dann als Ornament, das wieder in den Puls zurückfindet.",
      ]},
    ],
    erkennen: [
      "Sehr langsames Tempo, oft nur Besen und Klavier, viel Raum zwischen den Tönen.",
      "Das Thema wird frei und ausdrucksvoll gespielt, manchmal leicht vor oder hinter dem Schlag.",
    ],
    schritte: [
      { was: "Der Ton zuerst", wie: "Lange Töne mit Bordun und Vibrato-Analyse (Ton → Vibrato, Stil Pop oder klassisch). Das ist Balladenübung.",
        fertig: "Ein Ton acht Sekunden, ruhig, mit Vibrato, das erst nach einer Sekunde einsetzt." },
      { was: "Das Thema singen", wie: "Sing die Melodie deiner Ballade, bevor du sie spielst, und atme dort, wo ein Sänger atmen würde.",
        fertig: "Das Thema auswendig, jede Phrase mit einem erkennbaren Höhepunkt." },
      { was: "Mit der Band", wie: "Die Balladenwendung starten, Tempo 60, und darüber nur Zieltöne als lange Töne.",
        fertig: "Zwei Durchgänge, in denen kein langer Ton wackelt." },
    ],
    fehler: [
      "Zu viele Töne. Eine Ballade braucht Luft.",
      "Vibrato auf jedem Ton vom ersten Moment an — das klingt nervös.",
      "Das Tempo schleppen oder hetzen. Langsam heißt nicht ohne Puls.",
    ],
    hoeren: [
      { wer: "John Coltrane", was: "Das Album Ballads (1963) — Coltrane am Tenorsaxophon, ganz ruhig." },
      { wer: "Coleman Hawkins", was: "„Body and Soul“ (1939) — eine der berühmtesten Saxophonballaden überhaupt." },
      { wer: "Johnny Hodges", was: "Altsaxophonist bei Duke Ellington, bekannt für seinen Balladenton." },
    ],
    deine: "Deine fünf Kandidaten sind alles Swing-Stücke, Parker's Mood ist ein langsamer Blues, aber keine Ballade. Das Prüfungs-Cockpit mahnt deshalb eine an: sprich mit deinem Lehrer über einen Standard, den du als Ballade spielen kannst.",
  },

  /* --- Bossa Nova ------------------------------------------------------------------------- */
  {
    id: "bossa",
    titel: "Bossa Nova",
    kurz: "Brasilien, gerade Achtel, leise und warm — der Klang jedes Aperitivo.",
    tonarten: [F, C, D, G],
    groove: "bossa", tempo: 132, swing: 0.5,
    varianten: [
      { id: "bossa", label: "Bossa-Wendung", stufen: "| Imaj7 | Imaj7 | IVmaj7 | IVmaj7 | ii7 | V7 | Imaj7 | Imaj7 |",
        was: "Eine typische Schleife mit großen Septakkorden und einer II–V zurück." },
    ],
    abschnitte: [
      { h: "Was Bossa Nova ist", p: [
        "Bossa Nova („neue Welle“) entstand Ende der 1950er Jahre in Brasilien. Der Gitarrist und Sänger João Gilberto spielte einen leisen, synkopierten Samba-Rhythmus auf der Gitarre, der Komponist Antonio Carlos Jobim schrieb die Songs dazu, mit Akkorden aus dem Jazz.",
        "Weltbekannt wurde sie mit einem Saxophonisten: Stan Getz nahm 1964 mit João und Astrud Gilberto das Album Getz/Gilberto auf, darauf „The Girl from Ipanema“. Seitdem ist der weiche, leise Saxophonton über Bossa ein eigener Klang.",
      ]},
      { h: "Was sie besonders macht", liste: [
        "Gerade Achtel, nicht geswingt. Das ist der größte Unterschied zum Jazz und der häufigste Fehler.",
        "Ein ruhiger, gleichmäßiger Puls mit Synkopen in Gitarre und Schlagzeug (die Rimshot-Figur über zwei Takte).",
        "Leise Dynamik, warme Farbe. Lieber Subtone als Glanz.",
        "Große Septakkorde (maj7) und viele II–V-Verbindungen — die Harmonik kommt aus dem Jazz.",
      ]},
    ],
    erkennen: [
      "Eine Gitarre mit einem leisen, ständig synkopierten Muster, dazu Schlagzeug mit Rimshot statt Snare.",
      "Gerade Achtel, ruhige Stimmung, eher leise.",
      "Weiche, schwebende Akkorde mit großen Septimen.",
    ],
    schritte: [
      { was: "Gerade Achtel", wie: "Band starten und nur Achtel auf einem Ton spielen, ganz gerade, leise. Vergleiche mit der Jazz-Band: hör den Unterschied.",
        fertig: "Zwei Minuten gerade Achtel, ohne ins Swingen zu kippen." },
      { was: "Lange Linien", wie: "Über die Schleife lange Töne aus den Akkorden, mit Subtone. Die große Septime (E über Fmaj7 klingend) ist hier kein Problem, sondern die Farbe.",
        fertig: "Ein Durchgang, der klingt wie eine gesungene Melodie." },
      { was: "Wenig Vibrato", wie: "Bossa-Saxophon ist eher gerade im Ton; Vibrato höchstens am Ende langer Töne.",
        fertig: "Ein Durchgang ohne unbeabsichtigtes Vibrato." },
    ],
    fehler: [
      "Die Achtel swingen. Dann klingt es nach Jazz, der sich verlaufen hat.",
      "Zu laut und zu hell.",
      "Zu viele Töne; Bossa lebt vom Schweben.",
    ],
    hoeren: [
      { wer: "Stan Getz, João Gilberto, Astrud Gilberto", was: "Das Album Getz/Gilberto (1964), mit „The Girl from Ipanema“." },
      { wer: "Stan Getz und Charlie Byrd", was: "Das Album Jazz Samba (1962), mit „Desafinado“." },
    ],
    deine: "Keines deiner Prüfungsstücke ist eine Bossa — aber das Cockpit verlangt verschiedene Stilrichtungen, und für Aperitivi ist sie das wichtigste Repertoire. Ein Jobim-Stück wäre ein naheliegendes drittes Stück in anderem Stil; sprich mit deinem Lehrer darüber.",
  },

  /* --- Funk und Soul ---------------------------------------------------------------------- */
  {
    id: "funk",
    titel: "Funk und Soul",
    kurz: "Ein Akkord, ein Groove, und jeder Ton sitzt auf dem Punkt.",
    tonarten: [E, A, D, G],
    groove: "funk", tempo: 100, swing: 0.5,
    varianten: [
      { id: "vamp", label: "Ein-Akkord-Vamp", stufen: "| I7 | I7 | I7 | I7 | I7 | I7 | I7 | I7 |",
        was: "Acht Takte auf einem Dominantseptakkord — die Grundsituation im Funk." },
      { id: "zwei", label: "Zwei Akkorde", stufen: "| i7 | i7 | i7 | i7 | IV7 | IV7 | i7 | i7 |",
        was: "Moll mit Wechsel zur IV — typisch für Soul und Funk." },
    ],
    abschnitte: [
      { h: "Was Funk ist", p: [
        "Funk entstand in den 1960er Jahren in den USA aus Soul und Rhythm & Blues; James Brown gilt als seine zentrale Figur. Die Idee: die Harmonie wird fast unwichtig, oft steht ein einziger Akkord minutenlang, und alles lebt vom Rhythmus. Jedes Instrument spielt ein kurzes, wiederholtes Muster, und zusammen ergibt das den Groove.",
        "Der wichtigste Schlag ist die Eins. Bei James Brown hieß das „on the one“: alle treffen die Eins gemeinsam, dazwischen ist Platz für Synkopen.",
        "Das Saxophon spielt im Funk oft im Bläsersatz (kurze, scharfe Einwürfe, „Horn Stabs“) und im Solo rhythmische, kurze Phrasen statt langer Linien. Maceo Parker, lange Saxophonist bei James Brown, ist das Vorbild für diesen Stil.",
      ]},
      { h: "Was man darüber spielt", liste: [
        "Über einen Dominantseptakkord: mixolydisch oder die Moll-Pentatonik der Tonart (ja, über Dur — wie beim Blues).",
        "Über m7: dorisch oder Moll-Pentatonik.",
        "Kurze Töne, Ghost Notes, Wiederholung. Ein Riff aus drei Tönen, zehnmal auf den Punkt, ist mehr Funk als jeder Lauf.",
      ]},
    ],
    erkennen: [
      "Bass und Schlagzeug stehen im Vordergrund, der Bass spielt ein markantes, wiederholtes Muster.",
      "Der Akkord wechselt lange nicht oder nur zwischen zwei Akkorden.",
      "Sechzehntel-Groove mit geraden Achteln, kurze gedämpfte Gitarrenschläge, Backbeat auf 2 und 4.",
    ],
    schritte: [
      { was: "Auf die Eins", wie: "Band starten und nur auf jeder Eins einen kurzen Ton spielen. Dann zusätzlich auf einer Sechzehntel davor oder danach.",
        fertig: "Acht Takte, in denen jede Eins exakt mit der Bassdrum kommt." },
      { was: "Ein Riff", wie: "Drei Töne aus der Moll-Pentatonik, rhythmisch festgelegt, zwei Takte lang. Acht Takte wiederholen, ohne es zu verändern.",
        fertig: "Das Riff sitzt so, dass du dazu tanzen könntest." },
      { was: "Riff variieren", wie: "Einen Ton ändern, eine Pause verschieben, eine Ghost Note dazu (Pop-Sound → Ghost Notes).",
        fertig: "Ein Solo über 16 Takte nur aus Variationen eines Riffs." },
    ],
    fehler: [
      "Lange Linien spielen. Funk braucht kurze Töne und Pausen.",
      "Hinter den Schlag rutschen. Im Funk ist das Timing die Melodie.",
      "Zu viele Töne pro Takt.",
    ],
    hoeren: [
      { wer: "Maceo Parker", was: "Lange Saxophonist bei James Brown; seine eigenen Platten, etwa das Live-Album Life on Planet Groove (1992)." },
      { wer: "Tower of Power", was: "Die Band mit dem wohl bekanntesten Funk-Bläsersatz." },
      { wer: "David Sanborn", was: "Altsaxophonist zwischen Funk, Soul und Pop — der Ton, an dem sich viele Pop-Saxophonisten orientieren." },
    ],
    deine: "Für die Prüfung wäre ein Funk- oder Soul-Stück ein Kontrast zu deinen Swing-Stücken. Für Gigs ist es Pflicht: vieles, was ein DJ spielt, steht auf einem Funk- oder Soul-Groove.",
  },

  /* --- Pop und House für Gigs --------------------------------------------------------------- */
  {
    id: "pop",
    titel: "Pop und House auf dem Gig",
    kurz: "Vier Akkorde, Achtertakte — und die Kunst, im richtigen Moment zu schweigen.",
    tonarten: [A, D, G, C, E],
    groove: "house", tempo: 122, swing: 0.5,
    varianten: [
      { id: "moll", label: "Moll-Vierer", stufen: "| i | bVI | bIII | bVII | i | bVI | bIII | bVII |",
        was: "i–VI–III–VII, die dunkle Popschleife, von Ballade bis Dancefloor." },
      { id: "dur", label: "Vier Akkorde", stufen: "| I | V | vi | IV | I | V | vi | IV |",
        was: "I–V–vi–IV, die Folge unter unzähligen Popsongs." },
    ],
    abschnitte: [
      { h: "Wie ein Popsong gebaut ist", p: [
        "Popsongs bestehen aus Teilen, die sich wiederholen: Strophe, Pre-Chorus (Überleitung), Refrain, manchmal eine Bridge. Die Teile sind fast immer 8 oder 16 Takte lang. Unter vielen Songs liegt eine einzige Schleife aus vier Akkorden, die sich durch den ganzen Song zieht.",
        "House und Dance-Musik denken noch mehr in Blöcken: acht, sechzehn, zweiunddreißig Takte. Dazwischen Aufbau (Build-up), Spannung und der Moment, in dem Bassdrum und Bass zurückkommen (der Drop).",
      ]},
      { h: "Die Rolle des Saxophons auf einem DJ-Set", liste: [
        "Du bist nicht der Sänger. Wenn Gesang läuft, spielst du nicht oder nur ganz leise Antworten in die Lücken.",
        "Der Hook: die markante Melodie des Songs. Wer ihn mitspielt oder variiert, hat den Raum sofort.",
        "Phrasen in Achtertakt-Blöcken: acht Takte spielen, acht Takte Pause. Neue Ideen beginnen auf der Eins eines Blocks.",
        "Im Build-up nicht mitsteigern, sondern warten; direkt nach dem Drop einsetzen — das ist der Moment mit der größten Wirkung.",
        "Ton vor Tönen: ein voller Ton in der Mittellage setzt sich durch, schnelle Läufe in der Höhe verschwinden in der Anlage.",
      ]},
    ],
    erkennen: [
      "Zähl in Achtern: nach acht Takten passiert fast immer etwas (neues Element, Wechsel, Pause).",
      "Eine Akkordschleife aus vier Akkorden, die sich immer wiederholt.",
      "Beim House: Bassdrum auf jedem Schlag, offene Hi-Hat auf den Achteln dazwischen.",
    ],
    schritte: [
      { was: "Tonart finden", wie: "Gig → Tonart finden: die Band spielt, du suchst den Grundton am Instrument. Das ist der erste Schritt auf jedem Gig.",
        fertig: "Grundton unter fünfzehn Sekunden." },
      { was: "In Achtern zählen", wie: "Band starten und bei jedem neuen Achtertakt-Block tippen (Chorusanfang).",
        fertig: "Vier Blöcke hintereinander ohne Verzählen." },
      { was: "Acht spielen, acht schweigen", wie: "Moll-Pentatonik der Tonart, lange Töne, ein Motiv. Acht Takte spielen, acht Takte Pause.",
        fertig: "Zwei Minuten, in denen jede Phrase auf der Eins eines Blocks beginnt." },
      { was: "Gig-Training", wie: "Gig → Gig-Training: Auflagen über eine laufende Band, taktweise wechselnd.",
        fertig: "Eine Runde Gig-Training ohne Aussetzer." },
    ],
    fehler: [
      "Über den Gesang spielen.",
      "Ohne Pause durchspielen — nach zwei Minuten hört niemand mehr hin.",
      "Hohe, schnelle Läufe auf einer lauten Anlage.",
    ],
    hoeren: [
      { wer: "Deine Setlist", was: "Die Vorschläge unter Gig → Setlist nennen Songs mit Saxophon und seiner Rolle darin — hör, wann das Saxophon spielt und wann es schweigt." },
    ],
    deine: "Das ist dein zweites Ziel neben der Prüfung. Die Prüfung verlangt Stilvielfalt — ein Pop- oder Soulstück mit Improvisation wäre ein Kontrast zu deinen Swing-Stücken.",
  },
];

export const stilOf = id => STILE.find(s => s.id === id) || null;
