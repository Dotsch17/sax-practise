/* ==========================================================================
   Pop-Saxophon-Vokabular

   Was ein Pop- und Soul-Saxophon nach Pop klingen lässt, sind nicht die
   Töne, sondern was zwischen und an den Tönen passiert: wie ein Ton
   beginnt (Scoop), wie er endet (Fall), was er unterwegs tut (Bend,
   Shake, Vibrato), und welche Farbe er hat (Subtone, Growl). Auf einer
   Hochzeit mit DJ ist das der Unterschied zwischen „da spielt jemand
   Saxophon“ und „da spielt ein Saxophonist“.

   Die Reihenfolge ist die, in der man es lernt: Subtone zuerst, weil er
   Ansatzkontrolle verlangt und alles andere leichter macht; Growl und
   Altissimo-Schrei zuletzt, weil sie ohne Kontrolle nur laut sind.

   Eine Warnung, die für alles hier gilt und deshalb oben steht: Das sind
   Gewürze. Ein Solo, in dem jeder Ton gebogen wird, klingt nach Karikatur.
   Die Stufe „im eigenen Spiel“ heißt deshalb nicht „oft“, sondern
   „bewusst, an der richtigen Stelle“.

   Und: Diese Klangmittel widersprechen teils dem klassischen Unterricht —
   ein Ton darf hier mit der Zunge enden, ein Ton darf absichtlich unsauber
   anfangen. Das ist kein Widerspruch im Üben, sondern zwei Sprachen. Der
   klassische Ton bleibt die Grundlage; ohne ihn klingen diese Mittel nach
   Unvermögen statt nach Absicht.

   Reiner Inhalt, kein Code außer den Tabellen.
   ========================================================================== */

"use strict";

/* Vier Stufen, für jede Technik dieselben. Jede mit einem „fertig, wenn“. */
export const STUFEN = [
  { label: "ausprobiert",       fertig: "Du hast es gemacht, weißt, wie es sich anfühlt, und erkennst es, wenn du es hörst." },
  { label: "geht auf Ansage",   fertig: "Allein, ohne Band: vier von fünf Versuchen klingen wie gewollt." },
  { label: "sitzt im Groove",   fertig: "In der Übung über die Band, an der verabredeten Stelle, im Takt, ohne dass der Rest leidet." },
  { label: "im eigenen Spiel",  fertig: "Es taucht beim freien Spielen auf, ohne dass du es planst — und nicht öfter, als es die Musik verträgt." },
];

/* `wo` sagt, wo sich die Technik üben lässt. Der Travel Sax kann keine
   davon: es gibt dort kein Blatt, das auf Lippe und Luft reagiert.
   `messung` nennt die Messung, die das Mikrofon dafür machen kann.
   `uebung.prog` ist eine Folge aus harmonie.js, `tonart` klingend. */
export const TECHNIKEN = [
  {
    id: "subtone",
    name: "Subtone",
    kurz: "Leise, luftig, warm — der Ton aus Balladen und späten Stunden.",
    wo: ["probelokal", "leise"],
    messung: "subtone",
    warum: "Subtone ist der Klang, bei dem ein Raum leise wird. In einer Ballade, beim ersten Tanz, am Anfang eines Solos, bevor es wächst. Und er ist die beste Ansatzübung, die es gibt: ohne kontrollierte Luft bricht er sofort ab.",
    wie: [
      "Nimm ein tiefes D, gegriffen. Spiel es normal und leise.",
      "Jetzt den Unterkiefer ein kleines Stück fallen lassen, so dass die Unterlippe mehr vom Blatt bedeckt und es dämpft. Nicht beißen — eher weniger Druck als sonst.",
      "Mundraum auf „oh“, Luft langsam und warm, wie beim Anhauchen einer Brille. Nicht schnell, nicht viel.",
      "Der Ton wird dunkler und bekommt Luft im Klang. Das Luftgeräusch gehört dazu.",
      "Dann dasselbe auf tief C, H, B, und hinauf bis A. Oberhalb davon wird es schwer; im Pop wird Subtone fast nur unten gespielt.",
    ],
    fehler: [
      "Der Ton sackt nach unten. Der Kiefer ist gefallen, aber die Luft nicht mitgekommen — ein bisschen mehr Luftstrom, nicht mehr Druck.",
      "Er bricht ab oder springt in die Oktave. Zu viel Luft auf einmal. Weniger, und der Ansatz bleibt locker.",
      "Nur Luft, kein Ton. Zu viel Blatt gedämpft. Den Kiefer ein wenig zurück.",
      "Jeder Ton im Subtone. Er ist eine Farbe, kein Dauerzustand — in einer Ballade eine Phrase, nicht das ganze Stück.",
    ],
    fertig: "Tief D bis A gegriffen im Subtone, jeder Ton vier Sekunden ruhig, und auf Wunsch ohne Absetzen in den normalen Ton und zurück.",
    uebung: { groove: "ballade", prog: "ballade", tonart: 3, tempo: 64,
      text: "Über die Balladenwendung: auf jedem Akkordwechsel einen langen Ton im Subtone, am besten den Grundton oder die Terz. Zwei Takte halten, zwei Takte Pause." },
    hoeren: [
      { wer: "Ben Webster", was: "Tenor; der Subtone schlechthin, in jeder Ballade." },
      { wer: "Stan Getz", was: "Tenor; leiser, luftiger Ton, besonders in den Bossa-Aufnahmen." },
      { wer: "Paul Desmond", was: "Alt; kein Subtone im engen Sinn, aber der leichte, luftige Altklang, der dorthin zeigt." },
    ],
  },
  {
    id: "scoop",
    name: "Scoop",
    kurz: "Von unten in den Ton hineinschleifen.",
    wo: ["probelokal", "leise"],
    messung: "scoop",
    warum: "Der Scoop ist das häufigste Pop-Ornament überhaupt. Ein Ton, der von unten kommt, klingt gesungen statt gegriffen — genau das, was über einer Stimme oder einem DJ-Track funktioniert. Er ist auch das leichteste Ornament, deshalb kommt er früh.",
    wie: [
      "Greif den Zielton, etwa ein G in der Mitte.",
      "Lass den Unterkiefer vor dem Ansetzen ein wenig fallen — der Ton wird etwa einen Halbton tiefer anfangen.",
      "Beim Anblasen den Kiefer zurück in die normale Stellung führen. Der Ton gleitet hinauf in die richtige Höhe.",
      "Kurz halten: der ganze Scoop dauert etwa ein Sechzehntel bis ein Achtel. Länger klingt wie ein Stöhnen.",
      "Dann auf verschiedenen Tönen, und im Tempo: jeden Einsatz einer einfachen Phrase mit Scoop.",
    ],
    fehler: [
      "Er ist kaum zu hören. Zu wenig Kiefer — ein Viertelton unten ist zu wenig, ein halber bis ganzer Ton ist das Ziel.",
      "Er kommt zu spät an und klingt verschmiert. Der Scoop gehört vor die Zählzeit oder genau auf sie, nicht in sie hinein.",
      "Der Ton landet zu hoch. Der Kiefer geht über die normale Stellung hinaus und beißt nach.",
      "Jeder Ton mit Scoop. Auf dem ersten Ton einer Phrase oder einem betonten Ton — nicht auf allen.",
    ],
    fertig: "Die Messung zeigt vier von fünf Scoops, die einen halben bis ganzen Ton unten beginnen, in unter einer Viertelsekunde ankommen und sauber auf dem Zielton landen.",
    uebung: { groove: "pop", prog: "vier_akkorde", tonart: 10, tempo: 92,
      text: "Über die vier Akkorde: auf jedem Akkordwechsel den Grundton gegriffen, mit Scoop hinein, eine Halbe lang. Dann dieselbe Übung mit der Terz." },
    hoeren: [
      { wer: "David Sanborn", was: "Alt; Scoops und Bends sind das halbe Vokabular, besonders in den Balladen." },
      { wer: "Candy Dulfer", was: "Alt; „Lily Was Here“ — Pop-Saxophon, wie es auf Hochzeiten gewünscht wird." },
    ],
  },
  {
    id: "fall",
    name: "Fall",
    kurz: "Das Ende eines Tons fallen lassen.",
    wo: ["probelokal"],
    messung: "fall",
    warum: "Ein Fall beendet eine Phrase mit einer Geste statt mit einem Punkt. In Soul und Funk ist er das Satzzeichen am Ende, und auf einem lauten Gig hört man ihn noch, wenn der Ton selbst schon im Bass verschwindet.",
    wie: [
      "Einen Ton voll ansetzen, etwa ein hohes D.",
      "Am Ende den Kiefer loslassen und gleichzeitig mit der Luft nachlassen: der Ton fällt nach unten ab.",
      "Für den langen Fall zusätzlich die Finger schnell chromatisch nach unten laufen lassen, während die Luft ausgeht. Die Finger müssen nicht sauber sein — man hört ein Gleiten, keine Töne.",
      "Kurzer Fall: eine Terz, ein Achtel lang. Langer Fall: eine Oktave, eine Halbe lang.",
    ],
    fehler: [
      "Man hört einzelne Töne statt eines Gleitens. Die Finger zu langsam oder die Luft zu fest; beim Fall darf der Ton schmutzig sein.",
      "Der Fall kommt zu früh. Erst den Ton in voller Länge, dann fallen lassen — sonst fehlt der Ton, an den er sich hängt.",
      "Er klingt schwach. Falls brauchen am Anfang Luft; der Ton vorher muss stehen.",
    ],
    fertig: "Kurzer und langer Fall auf Ansage, und über die Band genau am Phrasenende, ohne die nächste Eins zu verpassen.",
    uebung: { groove: "funk", prog: "dorisch_vamp", tonart: 5, tempo: 96,
      text: "Über den dorischen Vamp: eine zweitaktige Phrase aus der Moll-Pentatonik, der letzte Ton mit Fall. Zwei Takte Pause. Abwechselnd kurzer und langer Fall." },
    hoeren: [
      { wer: "Maceo Parker", was: "Alt; Falls als Satzzeichen in den Funk-Linien." },
      { wer: "Soul-Bläsersätze", was: "Tower of Power, Stax-Aufnahmen — Falls am Ende fast jeder Phrase." },
    ],
  },
  {
    id: "bend",
    name: "Bend",
    kurz: "Einen gehaltenen Ton nach unten biegen und zurück.",
    wo: ["probelokal", "leise"],
    messung: "bend",
    warum: "Der Bend ist der Blues im Saxophon: eine Terz, die zwischen Moll und Dur hängt, ein hoher Ton, der weint. Er klingt nach Stimme, und das ist, was auf einer Hochzeit trägt.",
    wie: [
      "Einen Ton halten, etwa ein hohes C.",
      "Ohne die Finger zu bewegen den Unterkiefer ein wenig fallen lassen und den Mundraum weiten, als würdest du „oh“ sagen: der Ton sinkt.",
      "Zurück in die normale Stellung: der Ton kommt wieder. Das ist ein Bend.",
      "Tiefe: ein Viertel- bis ein Halbton. In der Höhe geht es weiter und leichter als in der Tiefe.",
      "Der „Cry“: einen hohen Ton von oben anblasen, sofort nach unten biegen und langsam wieder hinauf.",
    ],
    fehler: [
      "Der Ton bricht ab. Der Kiefer hat zu viel losgelassen, und das Blatt schwingt nicht mehr. Kleinere Bewegung, mehr über den Mundraum.",
      "Er kommt nicht zurück auf die Höhe. Die Rückkehr ist der schwierige Teil; langsam üben, bis der Ton sicher wieder ankommt.",
      "Das Obertonziel stimmt nicht. Genau dafür sind die Obertonübungen: wer den Mundraum kontrolliert, kontrolliert den Bend.",
    ],
    fertig: "Auf C, D und E in der Mitte: Bend um einen Halbton hinunter und sauber zurück, vier von fünf Mal laut Messung.",
    uebung: { groove: "swing", prog: "blues", tonart: 10, tempo: 96,
      text: "Über den Blues: die kleine Terz des Grundtons gegriffen, lang, mit einem Bend hinauf Richtung große Terz und zurück. Einmal pro Chorus an einer anderen Stelle." },
    hoeren: [
      { wer: "David Sanborn", was: "Alt; der „Cry“ in der Höhe ist sein Markenzeichen." },
      { wer: "Cannonball Adderley", was: "Alt; Bends und Blue Notes im Soul-Jazz." },
    ],
  },
  {
    id: "artikulation",
    name: "Ghost Notes und Pop-Artikulation",
    kurz: "Manche Töne kaum spielen, damit die anderen knallen.",
    wo: ["probelokal", "leise"],
    messung: null,
    warum: "Funk und Soul leben vom Unterschied zwischen laut und fast nichts. Eine Linie, in der jeder Ton gleich laut ist, groovt nicht. Dazu kommt eine Artikulation, die der klassischen widerspricht: hier darf ein Ton mit der Zunge enden — „dat“ statt „daa“ — weil das der Klang des Stils ist.",
    wie: [
      "Eine Achtellinie aus der Pentatonik, gerade Achtel, langsam.",
      "Die Töne auf den Zählzeiten normal, die dazwischen halb gestoßen und fast ohne Luft — „du-dn-du-dn“. Das sind Ghost Notes.",
      "Die Akzente auf die Offbeats legen: „du-DAT-du-DAT“. Das DAT endet mit der Zunge.",
      "Mit Metronom auf zwei und vier, und dann über den Funk-Groove.",
    ],
    fehler: [
      "Die Ghost Notes sind zu laut. Man soll sie eher ahnen als hören — lieber zu leise als zu laut.",
      "Die Achtel swingen. Funk hat gerade Achtel; wer aus dem Jazz kommt, swingt ungewollt. Genau darauf hören.",
      "Die kurzen Töne klingen dünn. Kurz heißt nicht schwach: die Luft bleibt voll, nur die Zunge beendet den Ton.",
    ],
    fertig: "Eine Funk-Linie über zwei Takte, gerade Achtel, Ghost Notes klar leiser, Akzente klar lauter — und auf der Aufnahme hört man den Unterschied.",
    uebung: { groove: "funk", prog: "dorisch_vamp", tonart: 5, tempo: 92,
      text: "Über den dorischen Vamp: eine einzige zweitaktige Linie aus der Moll-Pentatonik, immer wieder, bis die Lautstärken stimmen. Dann aufnehmen und anhören." },
    hoeren: [
      { wer: "Maceo Parker", was: "Alt; die Referenz für Funk-Artikulation." },
      { wer: "Tower of Power", was: "Bläsersatz; gerade Achtel, harte Akzente, Ghost Notes." },
    ],
  },
  {
    id: "growl",
    name: "Growl",
    kurz: "Ein raues Knurren im Ton — Rock'n'Roll und Soul.",
    wo: ["probelokal"],
    messung: null,
    warum: "Der Growl ist das lauteste Ausdrucksmittel, das ein Saxophon hat, ohne höher zu werden. Auf einem Fest ist er der Moment, in dem die Leute sich umdrehen. Genau deshalb sparsam: er nutzt sich schneller ab als jedes andere Mittel.",
    wie: [
      "Ohne Saxophon: einen Ton summen, mit geschlossenem Mund. Dann den Mund öffnen und weitersummen, während du ausatmest.",
      "Mit Saxophon: einen mittleren Ton spielen, zum Beispiel ein A, und gleichzeitig in der Kehle einen Ton summen. Die beiden Töne reiben sich, und das Reiben ist der Growl.",
      "Welche Summhöhe am besten klingt, ist verschieden; viele summen tiefer, als sie spielen. Ein anderer Abstand klingt anders, nicht falsch.",
      "Wer nicht summen kann, versucht ein kehliges Gurgeln, ein „rrr“ weit hinten. Das klingt anders, aber auch nach Growl.",
      "Dann an- und ausschalten: zwei Schläge Growl, zwei Schläge sauber, auf demselben Ton.",
    ],
    fehler: [
      "Der gespielte Ton sackt ab. Das Summen hat den Luftstrom geschwächt; mehr Luft, Ansatz ruhig.",
      "Es kratzt im Hals. Nicht pressen — das Summen kommt locker, wie beim Summen eines Lieds.",
      "Nur Summen, kein Saxophonton. Der Summton ist zu laut; er soll mitschwingen, nicht übernehmen.",
      "Growl auf jedem lauten Ton. Einmal pro Solo an der Spitze, nicht öfter.",
    ],
    fertig: "Auf Ansage an- und ausschaltbar, auf mehreren Tönen, und über die Band an der Spitze einer Phrase, ohne dass die Tonhöhe leidet.",
    uebung: { groove: "pop", prog: "blues", tonart: 10, tempo: 120,
      text: "Über den Blues im Pop-Groove: in jedem Chorus genau ein langer Ton mit Growl, an der lautesten Stelle, sonst sauber." },
    hoeren: [
      { wer: "Clarence Clemons", was: "Tenor, E Street Band; der Rock-Growl." },
      { wer: "Junior Walker", was: "Tenor; „Shotgun“ — Growl und Soul." },
      { wer: "King Curtis", was: "Tenor; der raue Rhythm-and-Blues-Ton." },
    ],
  },
  {
    id: "vibrato",
    name: "Pop-Vibrato",
    kurz: "Erst gerade, dann breit — das Vibrato am Ende eines Tons.",
    wo: ["probelokal", "leise"],
    messung: "vibrato",
    warum: "Im Pop wird ein langer Ton gerade angesetzt und bekommt erst gegen Ende ein Vibrato, breiter und langsamer als im klassischen Spiel. So klingt es gesungen — ein Vibrato vom ersten Moment an klingt nach Tanzorchester.",
    wie: [
      "Das Vibrato kommt aus einer kleinen, regelmäßigen Auf- und Abbewegung des Unterkiefers, die man in der Unterlippe spürt. Nicht aus dem Hals, nicht aus dem Bauch.",
      "Mit Metronom auf 60: zuerst zwei Wellen je Schlag, dann drei. Gleichmäßigkeit vor Geschwindigkeit.",
      "Dann einen langen Ton: zwei Schläge gerade, dann das Vibrato dazu, zum Ende hin etwas breiter.",
      "Über eine Ballade: nur auf den langen Tönen am Phrasenende.",
    ],
    fehler: [
      "Das Vibrato ist vom ersten Moment an da. Erst der Ton, dann das Vibrato.",
      "Es wird schneller, je lauter du wirst. Die Geschwindigkeit bleibt, nur die Breite darf wachsen.",
      "Die Tonhöhe geht über die Mitte hinaus nach oben. Ein Saxophon-Vibrato liegt unter der Tonhöhe und kommt auf sie zurück.",
    ],
    fertig: "Lange Töne mit spätem Vibrato über die Ballade, gleichmäßig, und die Aufnahme klingt gesungen, nicht zittrig.",
    uebung: { groove: "ballade", prog: "ballade", tonart: 3, tempo: 66,
      text: "Über die Balladenwendung: je zwei Takte eine kurze Phrase, deren letzter Ton lang ist — gerade anfangen, Vibrato ab der Mitte." },
    hoeren: [
      { wer: "David Sanborn", was: "Alt; spätes, breites Vibrato auf langen Tönen." },
      { wer: "Grover Washington Jr.", was: "Sopran, Alt und Tenor; der Smooth-Soul-Ton." },
    ],
  },
  {
    id: "shake",
    name: "Shake",
    kurz: "Ein schnelles Zittern zwischen zwei Tönen, meist hoch.",
    wo: ["probelokal"],
    messung: "shake",
    warum: "Der Shake ist das Ausrufezeichen am Ende eines Riffs oder auf dem höchsten Ton einer Phrase. In Soul- und Funk-Bläsersätzen steht er ständig; im Solo einmal gesetzt, reißt er eine Stelle nach oben.",
    wie: [
      "Die leichte Form mit Fingern: ein Triller zum nächsthöheren Ton, aber schneller und unregelmäßiger, als ein klassischer Triller es wäre — etwa ein hohes D mit schnellem Wechsel zum F.",
      "Die Pop-Form mit dem Ansatz: einen hohen Ton halten und den Unterkiefer schnell locker auf und ab bewegen, so dass der Ton zwischen zwei Teiltönen springt.",
      "Anfangen mit fünf, sechs Wechseln je Sekunde, dann schneller.",
    ],
    fehler: [
      "Man hört einen sauberen Triller. Im Pop darf der Shake rau sein; er ist ein Effekt, keine Verzierung.",
      "Er beginnt sofort. Wie beim Vibrato: erst der Ton, dann der Shake.",
      "Der Ansatz verkrampft. Die Bewegung kommt locker aus dem Kiefer, die Lippe drückt nicht mehr als sonst.",
    ],
    fertig: "Auf den hohen Tönen D bis F gegriffen, auf Ansage, und über die Band am Ende eines zweitaktigen Riffs.",
    uebung: { groove: "funk", prog: "house_vamp", tonart: 5, tempo: 100,
      text: "Über den Vamp im Funk-Groove: ein kurzes Riff von zwei Takten, der letzte hohe Ton mit Shake. Zwei Takte Pause. Das Riff bleibt gleich, bis der Shake sitzt." },
    hoeren: [
      { wer: "Tower of Power", was: "Bläsersatz; Shakes am Ende der Riffs." },
      { wer: "Soul-Bläsersätze", was: "Memphis- und Stax-Aufnahmen — der Shake als Ausrufezeichen." },
    ],
  },
  {
    id: "schrei",
    name: "Altissimo-Schrei",
    kurz: "Der eine hohe Ton an der Spitze des Solos.",
    wo: ["probelokal"],
    messung: null,
    warum: "Auf einem Gig ist ein sicherer hoher Ton an der Spitze eines Solos der Moment, an den sich die Leute erinnern. Ein unsicherer ist der Moment, an den sie sich auch erinnern. Deshalb gehört er ans Ende dieser Liste: erst wenn der Ton zehnmal von zehn kommt, gehört er auf die Bühne.",
    wie: [
      "Den Altissimo-Ton nehmen, der gerade am sichersten geht — bei dir G, Gis oder A.",
      "Aus dem Nichts anblasen, ohne Anlauf über einen anderen Ton. Zehnmal hintereinander. Das ist die Vorarbeit, und sie steht im Wissensteil unter Altissimo.",
      "Dann von unten anspielen: eine kurze Phrase, die auf ihn zuläuft, und dort landen. Scoop in den Ton hinein ist erlaubt und klingt nach Pop.",
      "Über die Band: acht Takte aufbauen, im siebten den hohen Ton, im achten auflösen.",
    ],
    fehler: [
      "Er kommt nur manchmal. Dann ist er noch nicht bühnenreif; zurück zu Obertönen und zum Anblasen aus dem Nichts.",
      "Mehr Druck, damit er kommt. Druck schließt das Blatt; der Ton kommt aus dem Voicing und der Luft.",
      "Er klingt dünn. Hohe Töne brauchen die volle Luft des normalen Registers, nicht weniger.",
      "Zu früh im Solo. Der höchste Ton gehört an die Spitze; wer dort anfängt, hat nichts mehr zu sagen.",
    ],
    fertig: "Ein Altissimo-Ton zehnmal von zehn aus dem Nichts, und über die Band an der Spitze einer achttaktigen Phrase, laut und sauber.",
    uebung: { groove: "pop", prog: "vier_akkorde", tonart: 10, tempo: 96,
      text: "Über die vier Akkorde, acht Takte: zwei Takte tief anfangen, vier Takte steigen, im siebten der hohe Ton, im achten zurück auf den Grundton." },
    hoeren: [
      { wer: "David Sanborn", was: "Alt; Altissimo als Ausdruck, nicht als Kunststück." },
      { wer: "Candy Dulfer", was: "Alt; der hohe Ton an der richtigen Stelle im Pop-Solo." },
    ],
  },
];

export const technikOf = id => TECHNIKEN.find(t => t.id === id) || null;
export const drillId = id => `pop:${id}`;
