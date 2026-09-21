/* ==========================================================================
   Zum Song spielen — die sieben Schritte

   Der Nutzer übt Improvisation so: Travel Sax ans Handy, Spotify an, und
   dann wird mitgespielt, was gerade läuft. Das ist die richtige Übung, aber
   ohne Reihenfolge wird daraus Suchen. Diese sieben Schritte sind die
   Reihenfolge, in der ein Studiomusiker ein unbekanntes Stück aufmacht: erst
   der Grundton, dann das Geschlecht, dann die Form, dann Zeit, dann Farbe,
   dann Melodie, und ganz zuletzt das Eigene.

   Jeder Schritt hat ein Abbruchkriterium. „Fertig, wenn …“ ist wichtiger als
   die Aufgabe selbst — ohne das übt man jeden Schritt entweder zu kurz oder
   endlos.

   Reiner Inhalt, kein Code.
   ========================================================================== */

"use strict";

export const SCHRITTE = [
  {
    id: "grundton",
    titel: "Den Grundton finden",
    was: "Spiel lange Töne über den laufenden Song, einen nach dem anderen. Such den, bei dem nichts mehr zieht — auf dem du liegen bleiben kannst, solange du willst.",
    warum: "Alles andere hängt daran. Wer den Grundton nicht hat, spielt eine Tonleiter, die zufällig manchmal passt, und hört selbst nicht, warum es mal gut und mal schlecht klingt.",
    fertig: "Du kannst den Ton über einen ganzen Refrain halten, ohne dass es nach Fehler klingt.",
    tipp: "Der Bass spielt ihn fast immer auf der Eins. Hör nach unten, nicht nach oben.",
    eingabe: "grundton",
  },
  {
    id: "geschlecht",
    titel: "Dur oder Moll",
    was: "Spiel vom Grundton aus die große Terz, dann die kleine. Eine der beiden passt, die andere reibt hörbar.",
    warum: "Das ist die halbe Tonart, und es ist die Hälfte, die man am schnellsten prüfen kann. Zwei Töne, zwei Sekunden.",
    fertig: "Du kannst sagen, welche Terz passt, ohne zu raten.",
    tipp: "Wenn beide zu gehen scheinen, ist es oft ein Vamp ohne Terz — dann entscheidet der Gesang, nicht die Begleitung.",
    eingabe: "geschlecht",
  },
  {
    id: "form",
    titel: "Die Form hören",
    was: "Zähl mit, bis sich die Harmonie wiederholt. Vier Takte, acht, sechzehn. Zähl laut mit, bis du die Eins nicht mehr verlierst.",
    warum: "Auf dem Gig weißt du dadurch, wann der Refrain kommt — und damit, wann du aufhören musst zu spielen. Wer die Form nicht hat, spielt über den Einsatz der Sängerin.",
    fertig: "Du triffst die Eins des nächsten Durchgangs, ohne hinzuhören.",
    tipp: "Die meiste Tanzmusik hat vier oder acht Takte und wechselt alle vier Takte den Akkord. Fang damit an und prüfe, ob es aufgeht.",
    eingabe: "form",
  },
  {
    id: "zeit",
    titel: "Nur Grundtöne, eine ganze Strophe",
    was: "Spiel eine komplette Strophe lang nichts als den Grundton. Kurz, lang, auf die Zwei, auf die Vier — aber nur diesen einen Ton.",
    warum: "Das ist die Übung, die keiner machen will und die den größten Unterschied macht. Solange du mit einem Ton nicht groovst, hilft dir der zweite nicht. Auf einem DJ-Set ist Time alles: die Maschine wackelt nicht, du schon.",
    fertig: "Es klingt absichtlich, nicht arm.",
    tipp: "Nimm dir vor, auf die Zwei und die Vier zu spielen statt auf die Eins. Sofort klingt es nach Musik statt nach Übung.",
  },
  {
    id: "farbe",
    titel: "Terz und Septime dazu",
    was: "Jetzt drei Töne: Grundton, Terz, Septime oder Sexte. Mehr nicht. Wechsle zwischen ihnen, und hör, wie sie sich beim Akkordwechsel anfühlen.",
    warum: "Diese Töne tragen die Harmonie. Wer sie trifft, klingt richtig, auch wenn er die Skala nicht kennt. Wer nur Skalen läuft, klingt nach Übezimmer.",
    fertig: "Du landest beim Akkordwechsel auf einem dieser Töne, ohne vorher zu planen.",
    tipp: "Wenn der Song die Akkorde wechselt, bleibt der Grundton oft gleich, die Terz nicht. Genau da hört man den Wechsel.",
  },
  {
    id: "hook",
    titel: "Den Hook mitnehmen",
    was: "Die Melodie, die jeder mitsingt: sing sie mit, dann spiel sie. Notiere dir hinterher, wo sie anfängt — auf der Eins, oder davor.",
    warum: "Auf einer Hochzeit ist das der Moment, in dem der Raum reagiert. Ein Solo hört man höflich an; den Hook singen die Leute mit.",
    fertig: "Du triffst sie zweimal hintereinander ohne Suchen.",
    tipp: "Die meisten Hooks fangen vor der Eins an. Wer auf der Eins beginnt, kommt schon beim ersten Ton zu spät.",
  },
  {
    id: "luecke",
    titel: "Nur in die Lücken spielen",
    was: "Ein ganzer Durchgang, in dem du ausschließlich spielst, wenn gerade niemand singt. Solange Gesang da ist: Instrument runter.",
    warum: "Das ist die Regel Nummer eins auf dem Gig und der Unterschied zwischen einem Saxophonisten, den man wieder bucht, und einem, den man nicht wieder bucht. Der DJ hat den Raum, du hast die Lücken.",
    fertig: "Du hast einen ganzen Durchgang durchgehalten, ohne einmal über den Gesang zu spielen.",
    tipp: "Die Lücken sind kurz: zwei Takte am Ende der Zeile. Zwei Takte sind genug für eine Antwort — eine Antwort ist keine Kaskade.",
  },
];

export const schrittOf = id => SCHRITTE.find(s => s.id === id) || SCHRITTE[0];

/* Was nach den sieben Schritten kommt, falls der Song bleibt. */
export const DANACH = [
  "Spiel dieselbe Nummer eine Terz tiefer im Kopf — auf dem Gig kommt sie irgendwann in einer anderen Tonart.",
  "Nimm einen Durchgang auf und hör ihn dir am nächsten Tag an. Nicht am selben.",
  "Streich die Hälfte deiner Töne. Was übrig bleibt, ist meistens das Stück, das getragen hat.",
];
