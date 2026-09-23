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

  // Synkope: Achtel, Viertel, Achtel, Achtel. Der dritte Ton beginnt auf
  // Zählzeit 2,5, der vierte auf 3 — sie gehören zu verschiedenen
  // Zählzeiten und dürfen deshalb nicht zusammengebalkt werden.
  const synk = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { pitch: P(1,0,5), dur: 1 },
    { pitch: P(2,0,5), dur: .5 }, { pitch: P(3,0,5), dur: .5 },
  ], 1);
  ok(synk[2].beam == null && synk[3].beam == null,
     "nach einer Synkope wird nicht über die Zählzeit hinweg gebalkt");

  // Derselbe Überhang, aber danach vier Sechzehntel: die ersten zwei liegen
  // noch in Zählzeit 3, die letzten zwei schon in Zählzeit 4.
  const nach = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { pitch: P(1,0,5), dur: 1 },
    { pitch: P(2,0,5), dur: .25 }, { pitch: P(3,0,5), dur: .25 },
    { pitch: P(4,0,5), dur: .25 }, { pitch: P(5,0,5), dur: .25 },
  ], 1);
  eq(nach[2].beam, nach[3].beam, "die zwei Sechzehntel vor dem Schlag hängen zusammen");
  ok(nach[3].beam !== nach[4].beam, "auf der Zählzeit beginnt eine neue Balkengruppe");
  eq(nach[4].beam, nach[5].beam, "und die zwei danach hängen wieder zusammen");

  // Der Taktstrich setzt die Zählung zurück, auch wenn der Takt nicht aufgeht.
  const takt = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { barline: true },
    { pitch: P(1,0,5), dur: .5 }, { pitch: P(2,0,5), dur: .5 },
  ], 1);
  eq(takt[2].beam, takt[3].beam, "nach dem Taktstrich wird wieder von der Eins gezählt");

  // Pausen trennen, zählen aber mit.
  const pause = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { dur: .5 },
    { pitch: P(1,0,5), dur: .5 }, { pitch: P(2,0,5), dur: .5 },
  ], 1);
  ok(pause[0].beam == null, "ein einzelnes Achtel vor einer Pause bleibt ohne Balken");
  eq(pause[2].beam, pause[3].beam, "die zweite Zählzeit wird wieder gebalkt");

  // Zwei Zählzeiten je Gruppe, wie es im Zweiertakt üblich ist.
  const zwei = N.autoBeam([
    { pitch: P(0,0,5), dur: .5 }, { pitch: P(1,0,5), dur: .5 },
    { pitch: P(2,0,5), dur: .5 }, { pitch: P(3,0,5), dur: .5 },
  ], 2);
  eq(zwei[0].beam, zwei[3].beam, "bei zwei Zählzeiten je Gruppe hängen alle vier zusammen");

  // Punktierte Achtel plus Sechzehntel füllen die Zählzeit genau.
  const punkt = N.autoBeam([
    { pitch: P(0,0,5), dur: .5, dots: 1 }, { pitch: P(1,0,5), dur: .25 },
    { pitch: P(2,0,5), dur: .5 }, { pitch: P(3,0,5), dur: .5 },
  ], 1);
  eq(punkt[0].beam, punkt[1].beam, "punktiertes Achtel und Sechzehntel bilden eine Gruppe");
  ok(punkt[1].beam !== punkt[2].beam, "danach beginnt die nächste Zählzeit");
}

console.log("\nAbstand wächst mit dem Notenwert");
ok(N.spacingFor(4) > N.spacingFor(1), "ganze Note bekommt mehr Platz als Viertel");
ok(N.spacingFor(1) > N.spacingFor(0.25), "Viertel mehr als Sechzehntel");
ok(N.spacingFor(4) < 4 * N.spacingFor(1), "aber nicht proportional");

console.log("\nBassschlüssel und Akkorde");
{
  // Wo stehen die Glyphen? translate(x,y) aus dem SVG lesen.
  const lage = (svg, glyph) => [...svg.matchAll(new RegExp(`<path d="${GLYPH[glyph].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" transform="translate\\(([-\\d.]+),([-\\d.]+)\\)`, "g"))]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
  // Vorzeichnung: im Bassschlüssel an derselben Stelle im System wie im
  // Violinschlüssel, also zwei Oktaven tiefer. Fis steht auf der vierten
  // Linie von unten (F3), B auf der zweiten (B2).
  const fis = lage(N.renderStaff({ clef: "f", keySig: 1, notes: [] }), "accSharp");
  eq(fis[0]?.y, N.noteY({ step: 3, octave: 3 }, "f"), "Bassschlüssel: Fis auf der F-Linie");
  eq(fis[0]?.y, 10, "das ist die vierte Linie von unten");
  const b = lage(N.renderStaff({ clef: "f", keySig: -1, notes: [] }), "accFlat");
  eq(b[0]?.y, 30, "Bassschlüssel: B auf der zweiten Linie von unten");
  const vier = lage(N.renderStaff({ clef: "f", keySig: 4, notes: [] }), "accSharp").map(x => x.y);
  const vierG = lage(N.renderStaff({ clef: "g", keySig: 4, notes: [] }), "accSharp").map(x => x.y);
  // Dieselben Töne zwei Oktaven tiefer — im System eine Linie tiefer als
  // im Violinschlüssel (Fis auf der vierten statt der obersten Linie).
  eq(JSON.stringify(vier), JSON.stringify(vierG.map(y => y + 10)), "vier Kreuze: im Bassschlüssel je eine Stufe tiefer im System, Fis C G D");

  // Akkorde: Köpfe übereinander, bei Sekunden versetzt.
  const P = (step, alter, octave) => ({ step, alter, octave });
  const akk = (...ps) => N.renderStaff({ notes: [{ chord: ps.map(p => ({ pitch: p, accidental: p.alter !== 0 })), dur: 4 }] });
  const cdur = lage(akk(P(0, 0, 4), P(2, 0, 4), P(4, 0, 4)), "noteheadWhole");
  eq(cdur.length, 3, "C-Dur: drei Köpfe");
  eq(new Set(cdur.map(x => x.x)).size, 1, "Terzen stehen genau übereinander");
  const sek = lage(akk(P(4, 0, 4), P(5, 0, 4), P(0, 0, 5)), "noteheadWhole");
  eq(new Set(sek.map(x => x.x)).size, 2, "G–A: die Sekunde wird versetzt");
  const g = sek.find(x => x.y === N.noteY(P(4, 0, 4))), a = sek.find(x => x.y === N.noteY(P(5, 0, 4)));
  ok(a.x > g.x, "der obere Ton der Sekunde steht rechts");
  const cluster = lage(akk(P(2, 0, 4), P(3, 0, 4), P(4, 0, 4)), "noteheadWhole").sort((x, y) => y.y - x.y);
  ok(cluster[0].x === cluster[2].x && cluster[1].x > cluster[0].x, "E–F–G: nur der mittlere Ton ausgelagert");
  // Vorzeichen: näher als eine Sexte beieinander → versetzt.
  const vz = lage(akk(P(4, 1, 4), P(6, 0, 4), P(1, 1, 5), P(3, 1, 5)), "accSharp");
  eq(vz.length, 3, "Gis–H–Dis–Fis: drei Kreuze");
  const fisX = vz.find(x => x.y === N.noteY(P(3, 1, 5))).x, disX = vz.find(x => x.y === N.noteY(P(1, 1, 5))).x, gisX = vz.find(x => x.y === N.noteY(P(4, 1, 4))).x;
  ok(disX < fisX, "Dis kommt eine Terz unter Fis: weiter links");
  eq(gisX, fisX, "Gis liegt eine Septime unter Fis: wieder in der ersten Spalte");
  const kopf = N.renderStaff({ notes: [{ pitch: P(5, 0, 4), dur: 1, kopf: true }] });
  ok(!/<line[^>]*y2="-?[\d.]+"[^>]*stroke-width="1\.2"/.test(kopf.replace(/<line x1="0"[^>]*>/g, "")), "Notenkopf ohne Hals hat keinen Hals");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
