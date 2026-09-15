/* Prüft js/music/notation.js strukturell. Wie es aussieht, zeigt
   tools/notation-preview.html — das kann nur ein Mensch beurteilen.
   Hier geht es um das, was stumm kaputtgehen kann: falsche Tonhöhen-Lage,
   NaN in Koordinaten, fehlende Zeichen, kaputtes SVG. */
import * as N from "../js/music/notation.js";
import * as T from "../js/music/theory.js";
import { GLYPH, ADVANCE } from "../js/music/glyphs.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);

const P = (step, alter, octave = 4) => ({ step, alter, octave });

console.log("\nZeichenvorrat vollständig");
for (const g of ["gClef","fClef","noteheadWhole","noteheadHalf","noteheadBlack",
                 "flag8thUp","flag8thDown","flag16thUp","flag16thDown",
                 "accFlat","accNatural","accSharp","accDoubleSharp","accDoubleFlat",
                 "restWhole","restHalf","restQuarter","rest8th","rest16th",
                 "augmentationDot","fermataAbove","staccatoAbove","tenutoAbove",
                 "accentAbove","marcatoAbove","dynP","dynM","dynF"]) {
  ok(typeof GLYPH[g] === "string" && GLYPH[g].length > 10, "Zeichen vorhanden: " + g);
  ok(typeof ADVANCE[g] === "number" && ADVANCE[g] > 0, "Vorschub vorhanden: " + g);
}
for (let d = 0; d <= 9; d++) ok(GLYPH["timeSig" + d], "Taktzahl " + d);

console.log("\nLage im Violinschlüssel");
eq(N.noteY(P(2, 0, 4)), 40, "E4 liegt auf der untersten Linie");
eq(N.noteY(P(3, 0, 5)), 0, "F5 liegt auf der obersten Linie");
eq(N.noteY(P(6, 0, 4)), 20, "H4 liegt auf der Mittellinie");
eq(N.noteY(P(0, 0, 4)), 50, "C4 liegt eine Hilfslinie unter dem System");
eq(N.noteY(P(0, 0, 5)), 15, "C5 liegt im dritten Zwischenraum");
ok(N.noteY(P(3, 1, 5)) === N.noteY(P(3, 0, 5)), "Fis5 liegt genau so hoch wie F5");
ok(N.noteY(P(6, -1, 4)) === N.noteY(P(6, 0, 4)), "B4 liegt genau so hoch wie H4");
console.log("\nLage im Bassschlüssel");
eq(N.noteY(P(4, 0, 2), "f"), 40, "G2 liegt auf der untersten Linie");
eq(N.noteY(P(5, 0, 3), "f"), 0, "A3 liegt auf der obersten Linie");

console.log("\nErzeugtes SVG ist sauber");
const cases = {
  "leeres System": N.renderStaff({ notes: [] }),
  "alle Tonarten": T.MAJOR_KEYS.map(k => N.renderStaff({
      keySig: k.sig,
      notes: N.pitchesToNotes(T.buildScale(k.tonic, "dur"), N.DUR.viertel, { accidentalsFor: k.sig }),
    })).join(""),
  "alle Notenwerte": N.renderStaff({
      timeSig: [4, 4],
      notes: Object.values(N.DUR).flatMap(d => [
        { pitch: P(4, 0, 4), dur: d }, { pitch: P(4, 0, 4), dur: d, dots: 1 }, { dur: d },
      ]).concat([{ barline: "end" }]),
    }),
  "ganzer Umfang": N.renderStaff({
      notes: Array.from({ length: 44 }, (_, i) =>
        ({ pitch: T.fromMidi(58 + i, "sharp"), dur: N.DUR.viertel,
           accidental: true, label: "x" })),
    }),
  "Balken, Artikulation, Dynamik": N.renderStaff({
      notes: N.autoBeam([
        { pitch: P(0,0,5), dur: .5, artic: "staccato", dynamic: "pp" },
        { pitch: P(1,0,5), dur: .5, artic: "tenuto" },
        { pitch: P(2,0,5), dur: .25, artic: "akzent" },
        { pitch: P(3,0,5), dur: .25 },
        { barline: true },
        { pitch: P(4,0,5), dur: 4, fermata: true, label: "Ende" },
      ]),
    }),
};
for (const [name, svg] of Object.entries(cases)) {
  ok(!/NaN|undefined|Infinity/.test(svg), name + ": keine NaN oder undefined im SVG");
  ok(svg.startsWith("<svg") && svg.trim().endsWith("</svg>"), name + ": SVG ist geschlossen");
  const open = (svg.match(/<(?!\/)[a-z]+/g) || []).length;
  const close = (svg.match(/<\/[a-z]+>/g) || []).length + (svg.match(/\/>/g) || []).length;
  eq(open, close, name + ": jedes Element ist geschlossen");
  ok(!/viewBox="[^"]*(NaN|-?\d{6,})/.test(svg), name + ": viewBox ist plausibel");
}

console.log("\nVorzeichen werden gesetzt, wenn sie nötig sind");
{
  // Es-Dur: das B steht in der Vorzeichnung, also kein Vorzeichen davor.
  const es = T.buildScale(P(2, -1), "dur");
  const notes = N.pitchesToNotes(es, N.DUR.viertel, { accidentalsFor: -3 });
  ok(notes.every(x => !x.accidental), "Es-Dur braucht keine einzigen Vorzeichen im Notentext");
}
{
  // a-Moll harmonisch: das Gis ist nicht in der Vorzeichnung, also muss es stehen.
  const am = T.buildScale(P(5, 0), "moll_harmonisch");
  const notes = N.pitchesToNotes(am, N.DUR.viertel, { accidentalsFor: 0 });
  const gis = notes.find(x => x.pitch.step === 4 && x.pitch.alter === 1);
  ok(gis && gis.accidental, "das Gis bekommt ein Kreuz");
  eq(notes.filter(x => x.accidental).length, 1, "und sonst steht nichts");
}
{
  // Ein Ton, der von der Vorzeichnung abweicht, braucht die Auflösung.
  const notes = N.pitchesToNotes([P(3, 0, 5)], N.DUR.viertel, { accidentalsFor: 1 });
  ok(notes[0].accidental, "F in G-Dur bekommt ein Auflösungszeichen");
}

console.log("\nBalkengruppen");
{
  const notes = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { pitch: P(1,0,5), dur: .5 },
    { pitch: P(2,0,5), dur: .5 }, { pitch: P(3,0,5), dur: .5 },
  ], 1);
  eq(notes[0].beam, notes[1].beam, "erste zwei Achtel bilden eine Gruppe");
  ok(notes[1].beam !== notes[2].beam, "die zweite Zählzeit beginnt eine neue Gruppe");
  const viertel = N.autoBeam([{ pitch: P(0,0,5), dur: 1 }, { pitch: P(1,0,5), dur: 1 }]);
  ok(viertel.every(x => x.beam == null), "Viertel werden nicht gebalkt");
}

console.log("\nAbstand wächst mit dem Notenwert");
ok(N.spacingFor(4) > N.spacingFor(1), "ganze Note bekommt mehr Platz als Viertel");
ok(N.spacingFor(1) > N.spacingFor(0.25), "Viertel mehr als Sechzehntel");
ok(N.spacingFor(4) < 4 * N.spacingFor(1), "aber nicht proportional");

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
