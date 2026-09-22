/* ==========================================================================
   Licks für den Anfang

   Sechs kurze Phrasen, jede für eine Sache, die man danach in jeder Tonart
   kann. Keine Transkriptionen: die gehören aus der Aufnahme gelernt, nach
   Gehör, und dann hier eingetragen — das ist die eigentliche Übung, und
   dafür ist das Werkzeug gebaut. Diese hier sind das Gerüst, an dem man den
   Ablauf lernt, bevor man ihn mit einer echten Aufnahme macht.

   `groove` ist der Stil der Band beim Einsetzen; ohne Angabe Swing.

   Alle gegriffen notiert. `bezug` ist der Grundton, auf den sich der Lick
   bezieht: bei einem Vamp der Akkordgrundton, bei II–V–I und Blues die
   Tonika. Die Tests prüfen, dass jeder Ton zum Akkord gehört oder ein
   chromatischer Durchgang ist, der sich einen Halbton weiter auflöst.

   Reiner Inhalt.
   ========================================================================== */

"use strict";

export const LICKS = [
  {
    id: "penta_blue",
    titel: "Pentatonik mit Blue Note",
    ueber: "m7", bezug: { step: 5, alter: 0 }, groove: "funk",
    noten: "A4:8 C5:8 D5:8 Es5:8 D5:8 C5:8 A4:4",
    was: "Die Moll-Pentatonik hinauf, die verminderte Quinte als Durchgang, zurück auf den Grundton. Der Klang jedes Soul- und Funk-Solos.",
    anwenden: "Über einen Moll-Vamp einmal pro vier Takte — und dann einmal eine Oktave höher.",
  },
  {
    id: "umspielung",
    titel: "Umspielung auf die Terz",
    ueber: "maj7", bezug: { step: 0, alter: 0 },
    noten: "G4:8 F4:8 Dis4:8 E4:4. r:4",
    was: "Die Terz von oben und von unten einkreisen, bevor man auf ihr landet. So klingt ein Zielton absichtlich statt zufällig.",
    anwenden: "Auf jedem Akkordwechsel eines Standards: die neue Terz einkreisen. Das ist der Bebop-Trick schlechthin.",
  },
  {
    id: "leitlinie",
    titel: "Terzen und Septimen durch II–V–I",
    ueber: "251", bezug: { step: 0, alter: 0 },
    noten: "F4:4 A4:4 C5:2 H4:4 D5:4 F5:2 E5:1 r:1",
    was: "Jeder Akkord von der Terz aus, und die Septime löst sich einen Halbton abwärts in die nächste Terz auf: C nach H, F nach E. Das ist Stimmführung, und man hört den Akkordwechsel, ohne dass die Band spielt.",
    anwenden: "In Another You, Miss Jones und jedem anderen Standard steckt diese Folge dutzendfach. Such sie im Leadsheet und spiel dort diesen Lick.",
  },
  {
    id: "blues_terz",
    titel: "Blues: von der kleinen zur großen Terz",
    ueber: "blues", bezug: { step: 4, alter: 0 },
    noten: "G4:8 B4:8 H4:4 D5:8 F5:8 D5:8 G4:8",
    was: "Die kleine Terz reibt, die große löst auf — genau zwischen beiden lebt der Blues. Die kleine Terz gern mit einem Scoop in die große hinein.",
    anwenden: "Im ersten Takt jedes Blues-Chorus. Straight, No Chaser und Parker's Mood sind voll davon.",
  },
  {
    id: "bebop_dom",
    titel: "Bebop-Dominante abwärts",
    ueber: "dom7", bezug: { step: 4, alter: 0 },
    noten: "G5:8 Fis5:8 F5:8 E5:8 D5:8 C5:8 H4:8 A4:8 G4:2 r:2",
    was: "Die mixolydische Leiter abwärts, mit einem chromatischen Durchgang zwischen Grundton und Septime. So landen die Akkordtöne auf den Zählzeiten — der Grund, warum Bebop-Linien nie holpern.",
    anwenden: "Über jede Dominante, die einen ganzen Takt lang steht. In Oleo über die Bridge.",
  },
  {
    id: "pop_motiv",
    titel: "Pop-Motiv mit Synkope",
    ueber: "maj7", bezug: { step: 0, alter: 0 }, groove: "pop",
    noten: "r:8 E5:8 G5:8 E5:4 D5:8 C5:4",
    was: "Drei Töne, vorgezogen vor die Zählzeit. Ein Motiv, das man mitsingen kann, schlägt jede Tonleiter — auf einer Hochzeit sowieso.",
    anwenden: "Über die vier Pop-Akkorde: das Motiv viermal, jedes Mal ein wenig anders. Wiederholung ist die Idee.",
  },
];

export const lickOf = id => LICKS.find(l => l.id === id) || null;
