/* ==========================================================================
   Improvisation — die Grundlagen

   Alles Inhaltliche steht hier, wie beim Übungsplan.

   Geschrieben für ein bestimmtes Ziel: Apéro, Hochzeit, DJ-Set. Das ist
   keine Einschränkung, sondern eine Schärfung. Auf diesen Gigs braucht man
   nicht dreiundzwanzig Skalen, sondern drei — und die richtig. Man braucht
   keinen Bebop-Wortschatz, sondern einen Ton, der über eine laute Anlage
   trägt, ein Timing, das mit dem Klick sitzt, und die Fähigkeit, in acht
   Takten eine Linie zu bauen, die irgendwohin führt.

   Deshalb steht bei jeder Skala nicht nur, was sie ist, sondern wann man
   sie nimmt, welcher Ton daran gefährlich ist, und was passiert, wenn man
   sie falsch einsetzt.
   ========================================================================== */

"use strict";

/* --- Die Skalen, in der Reihenfolge, in der man sie lernen sollte ---------- */

export const SKALEN_WISSEN = [
  {
    id: "pentatonik_moll",
    titel: "Moll-Pentatonik",
    kurz: "Fünf Töne, kein falscher dabei.",
    reihenfolge: 1,
    bau: "Grundton, kleine Terz, Quarte, Quinte, kleine Septime. In A: A – C – D – E – G.",
    warum: [
      "Fünf statt sieben Töne, und genau die zwei weggelassen, die sich reiben können. Deshalb klingt über einem Mollakkord fast alles richtig, was du daraus spielst.",
      "Das ist ihr ganzer Sinn: sie nimmt dir die Angst vor falschen Tönen und lässt dich auf Rhythmus und Klang hören — also auf das, was auf einer Bühne zählt.",
    ],
    wann: [
      "Über jeden Moll-Akkord und jeden Moll-Vamp.",
      "Über einen Blues — dort auch über die Durakkorde. Das ist der Trick, der Blues zum Blues macht.",
      "Über House- und Deep-House-Loops. Da passiert harmonisch wenig, und die Pentatonik gibt dir Ruhe dafür.",
    ],
    achtung: "Sie ist so sicher, dass man in ihr hängenbleibt. Wenn alles gleich klingt, liegt es nicht an der Pentatonik, sondern daran, dass du nur noch Töne aneinanderreihst. Gegenmittel: Pausen, Wiederholung, und ein Ton, der länger steht als die anderen.",
    ersterSchritt: "Eine Oktave auf und ab, im Tempo eines Songs, den du magst. Dann dieselben fünf Töne, aber nur vier Töne pro Takt — und die restliche Zeit Pause.",
  },

  {
    id: "blues",
    titel: "Blues-Skala",
    kurz: "Die Pentatonik plus der Ton, der weh tut.",
    reihenfolge: 2,
    bau: "Moll-Pentatonik plus die verminderte Quinte. In A: A – C – D – Es – E – G.",
    warum: [
      "Der zusätzliche Ton — die Blue Note — gehört zu keiner Tonart und genau deshalb funktioniert er. Er ist ein Durchgang, kein Ziel.",
      "Er macht aus fünf braven Tönen einen Ausdruck.",
    ],
    wann: [
      "Über Blues, Soul, Funk, Rock — überall, wo es nach Reibung klingen darf.",
      "Sparsam auch über Pop-Loops, als Farbe an einer Stelle.",
    ],
    achtung: "Die Blue Note ist ein Durchgangston. Wer auf ihr stehenbleibt, klingt nicht bluesig, sondern falsch. Spiel sie von oben oder unten an und geh weiter.",
    ersterSchritt: "Pentatonik spielen und die Blue Note nur einmal pro acht Takte einbauen — als Durchgang zwischen Quarte und Quinte.",
  },

  {
    id: "dur_pentatonik",
    titel: "Dur-Pentatonik",
    kurz: "Dieselben fünf Töne, drei Halbtöne tiefer gedacht.",
    reihenfolge: 3,
    bau: "Grundton, Sekunde, große Terz, Quinte, Sexte. In C: C – D – E – G – A. Das sind dieselben Töne wie die a-Moll-Pentatonik, nur mit anderem Zentrum.",
    warum: [
      "Über Durakkorde klingt sie offen und freundlich, ohne die Quarte, die über Dur der einzige wirklich heikle Ton ist.",
      "Weil sie mit der Mollpentatonik einer anderen Tonart identisch ist, lernst du zwei Klänge zum Preis von einem: die Mollpentatonik auf der sechsten Stufe ist die Durpentatonik der Tonika.",
    ],
    wann: [
      "Über Dur-Loops, Gospel, Country, fröhlichen Pop.",
      "Über die Tonika einer Popfolge, wenn die Mollpentatonik zu dunkel klingt.",
    ],
    achtung: "Über einen Dominantseptakkord klingt sie zu brav — dort fehlt ihr die kleine Septime.",
    ersterSchritt: "Spiel eine Mollpentatonik, die du kennst, und beginne stattdessen auf ihrer dritten Stufe. Derselbe Griff, anderes Zentrum, völlig anderer Charakter.",
  },

  {
    id: "mixolydisch",
    titel: "Mixolydisch",
    kurz: "Dur mit kleiner Septime — die Skala jedes Dominantakkords.",
    reihenfolge: 4,
    bau: "Wie Dur, aber die siebte Stufe einen Halbton tiefer. In G: G – A – H – C – D – E – F.",
    warum: [
      "Der Dominantseptakkord besteht aus Grundton, großer Terz und kleiner Septime. Mixolydisch ist genau die Tonleiter, die diese drei enthält.",
      "Fast jeder Funk-, Soul- und Bluesakkord ist ein Dominantseptakkord. Wer mixolydisch kann, kann über die halbe Tanzmusik spielen.",
    ],
    wann: [
      "Über jeden 7er-Akkord.",
      "Über Funk-Vamps, die auf einem Akkord stehenbleiben.",
    ],
    achtung: "Die Quarte ist auch hier heikel: sie liegt einen Halbton über der Terz und will dorthin auflösen. Nimm sie als Durchgang, nicht als Ziel.",
    ersterSchritt: "Spiel die Durtonleiter und senke nur den siebten Ton. Hör den Unterschied — das ist die ganze Skala.",
  },

  {
    id: "dorisch",
    titel: "Dorisch",
    kurz: "Moll mit heller Sexte.",
    reihenfolge: 5,
    bau: "Wie natürliches Moll, aber die sechste Stufe einen Halbton höher. In D: D – E – F – G – A – H – C.",
    warum: [
      "Die große Sexte ist der Unterschied zwischen traurigem Moll und coolem Moll. Sie ist der Ton, auf den man beim Üben zielt.",
      "Über m7-Akkorde ist sie die Standardwahl — und House-, Soul- und Jazz-Vamps stehen fast immer auf m7.",
    ],
    wann: [
      "Über m7-Akkorde und Moll-Vamps.",
      "Überall, wo die Mollpentatonik zu wenig hergibt und du zwei Töne mehr willst.",
    ],
    achtung: "Die kleine Sekunde gibt es hier nicht — das ist der Unterschied zu phrygisch. Wer sie hineinspielt, klingt spanisch statt cool.",
    ersterSchritt: "Moll-Pentatonik spielen und gezielt die große Sexte dazunehmen, sonst nichts. Ein Ton mehr, ganz anderer Charakter.",
  },
];

/* --- Konzepte, die mehr bringen als eine weitere Skala --------------------- */

export const KONZEPTE = [
  {
    id: "zieltoene",
    titel: "Zieltöne",
    kurz: "Terz und Septime tragen die Harmonie. Alles andere ist Verzierung.",
    text: [
      "Wenn du über einem Akkord nur zwei Töne spielen dürftest, wären es die Terz und die Septime. Sie sind das, was einen Akkord zu diesem Akkord macht: der Grundton ist im Bass, die Quinte sagt fast nichts, aber Terz und Septime entscheiden über Dur oder Moll und über Spannung oder Ruhe.",
      "Deshalb ist die wirksamste Improvisationsübung, die es gibt, auch die langweiligste: über eine Akkordfolge ausschließlich Terz und Septime spielen, je einen Ton pro Akkord. Das klingt nach zwei Durchgängen schon nach Musik — und zwar lange bevor irgendeine Skala sitzt.",
      "Der zweite Schritt ist, sie zu verbinden: von der Septime des einen Akkords einen Halbton zur Terz des nächsten. Das ist der Grund, warum Quintfall-Folgen so gut klingen, und es ist keine Zauberei, sondern ein Halbtonschritt.",
    ],
    uebung: "Im Improvisationsmodus „Zieltöne“ wählen, den Quintfall starten und je Akkord nur einen Ton spielen. Zwei Chorusse lang. Danach fühlt sich alles andere leichter an.",
  },
  {
    id: "raum",
    titel: "Pausen",
    kurz: "Der häufigste Anfängerfehler ist nicht ein falscher Ton, sondern kein Schweigen.",
    text: [
      "Wer improvisiert, spielt fast immer zu viel. Das liegt nicht an Können, sondern an Nerven: solange man spielt, passiert etwas, und Stille fühlt sich nach Versagen an.",
      "Auf der Bühne ist es umgekehrt. Eine Phrase, auf die eine Pause folgt, wird gehört. Eine Kette ohne Pausen wird zu Hintergrund.",
      "Regel, an die man sich halten kann, bis sie von selbst geht: spiel zwei Takte, schweig zwei Takte. Das ist Call and Response mit dir selbst, und es ist die schnellste Art, Phrasen zu lernen statt Tonfolgen.",
    ],
    uebung: "Über einen House-Vamp acht Takte lang: zwei Takte spielen, zwei Takte Pause. Ohne Ausnahme, auch wenn es weh tut.",
  },
  {
    id: "motiv",
    titel: "Ein Motiv statt vieler Töne",
    kurz: "Wiederholung ist kein Mangel an Ideen, sondern die Idee.",
    text: [
      "Nimm drei oder vier Töne. Spiel sie. Spiel sie nochmal. Spiel sie eine Stufe höher. Spiel sie rhythmisch verschoben. Spiel sie zum Schluss noch einmal wie am Anfang.",
      "Das ist ein Solo. Es ist mehr Solo als vierzig verschiedene Töne, weil ein Zuhörer etwas wiedererkennen kann.",
      "Auf einem Fest, wo niemand konzentriert zuhört, ist das der Unterschied zwischen „da spielt jemand Saxophon“ und „das war schön“.",
    ],
    uebung: "Einen Chorus lang nur ein Dreitonmotiv, in jeder Variante, die dir einfällt. Keine neuen Töne.",
  },
  {
    id: "ton",
    titel: "Der Ton schlägt die Noten",
    kurz: "Auf einer lauten Anlage hört niemand deine Skala. Deinen Klang hört jeder.",
    text: [
      "Bei einem DJ-Set konkurrierst du mit einer Bassdrum und einer Anlage. Was durchkommt, ist ein voller, tragender Ton in der Mittellage — nicht ein schnelle Linie in der Höhe.",
      "Das ist die gute Nachricht für dich: die Tonarbeit aus dem klassischen Plan ist genau die Vorbereitung auf diese Gigs. Lange Töne, Dynamik, Obertöne — das ist kein Klassik-Ballast, das ist deine Durchsetzungsfähigkeit.",
      "Praktisch: spiel auf solchen Gigs tiefer und einfacher, als du kannst. Was oben herum brillant klingt, verschwindet in der Anlage.",
    ],
    uebung: "Über einen Vamp nur Töne aus der mittleren Oktave, dafür jeden voll ausgespielt. Fünf Minuten. Danach hörst du den Unterschied zu deinem sonstigen Spiel.",
  },
  {
    id: "form",
    titel: "Wissen, wo du bist",
    kurz: "Die häufigste Panik auf der Bühne ist nicht ein falscher Ton, sondern verlorene Form.",
    text: [
      "Bei einer Vierakkordfolge, die sich alle vier Takte wiederholt, verliert man die Eins leichter, als man denkt — besonders wenn man in eine Linie vertieft ist.",
      "Gegenmittel: immer die Eins mitzählen, und zwar körperlich. Fuß, Kopf, irgendetwas. Und beim Üben die Formleiste in der App anschauen, bis der Takt im Körper ist und nicht im Kopf.",
      "Zweites Gegenmittel: auf der Eins jedes neuen Abschnitts einen Ton spielen, der dorthin gehört. Wer die Eins trifft, hat die Form.",
    ],
    uebung: "Über einen Blues nur auf jeder Eins einen einzigen Ton spielen, sonst nichts. Zwei Chorusse. Danach weißt du, ob du die Form wirklich hast.",
  },
];

/* --- Über einen Song improvisieren ----------------------------------------- */

export const SONG_ANLEITUNG = {
  titel: "Über einen Song aus dem Kopfhörer spielen",
  einleitung: "Das ist die nützlichste Übung überhaupt für dein Ziel — und sie hat nur eine Hürde: die Tonart finden. Danach ist es leicht.",
  schritte: [
    {
      h: "Den Grundton finden",
      p: [
        "Lass den Song laufen und spiel einen einzelnen langen Ton. Passt er nicht, geh einen Halbton weiter. Nach spätestens zwölf Versuchen sitzt du richtig — und mit der Zeit brauchst du zwei.",
        "Schneller geht es über den Bass: der tiefste Ton am Anfang einer Schleife ist fast immer der Grundton des ersten Akkords. Sing ihn mit und such ihn auf dem Instrument.",
        "Noch schneller: die meiste Tanzmusik steht in wenigen Tonarten. Probier zuerst klingend a-Moll, d-Moll, e-Moll, g-Moll, C-Dur und F-Dur — das deckt erstaunlich viel ab.",
      ],
    },
    {
      h: "Dur oder Moll entscheiden",
      p: [
        "Spiel über dem gefundenen Grundton die kleine Terz. Klingt sie richtig, ist es Moll. Klingt sie schief, nimm die große Terz.",
        "Im Zweifel Moll: über einem Durstück klingt die Mollpentatonik oft trotzdem, umgekehrt fast nie.",
      ],
    },
    {
      h: "Die Skala wählen",
      p: [
        "Moll oder unklar: Moll-Pentatonik auf dem Grundton. Wenn es nach Blues riecht, die Blue Note dazu.",
        "Eindeutig Dur und fröhlich: Dur-Pentatonik auf dem Grundton.",
        "Funk, Soul, ein einzelner stehender Akkord: mixolydisch auf dem Grundton.",
      ],
    },
    {
      h: "Und jetzt nicht alles spielen",
      p: [
        "Zwei Takte spielen, zwei schweigen. Ein Motiv statt vieler Töne. Die Eins mitzählen.",
        "Wenn du dich verlierst: einen einzigen Ton nehmen und ihn im Rhythmus des Songs wiederholen, bis du die Form wiederhast. Das klingt absichtlich, solange du es im Takt machst.",
      ],
    },
  ],
  hinweis: "Die App kann dabei nicht mithören: aus deinem Kopfhörer kommt der Song, und das Mikrofon würde ihn statt dich verfolgen. Nutz stattdessen den Griffrechner unten — du sagst, welche Tonart du gehört hast, und bekommst deine Griffe dazu.",
};
