/* Prüft js/music/leadsheet.js und die Schlag-Rechnung der Begleitung in
   js/music/harmonie.js. Läuft mit `node tools/test-leadsheet.mjs`.

   Was hier unter Schutz steht: jedes übliche Akkordsymbol wird richtig
   gelesen oder ausdrücklich abgelehnt, klingend und gegriffen werden nie
   verwechselt, und zwei Akkorde in einem Takt teilen ihn wirklich. */

import * as L from "../js/music/leadsheet.js";
import * as H from "../js/music/harmonie.js";
import * as T from "../js/music/theory.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const DE = T.NAMING.DE, EN = T.NAMING.EN;
const kurz = a => a.fehler ? "FEHLER" : `${T.spell(a)} ${a.q}`;

console.log("Grundtöne");
{
  const g = (t, nm = DE) => { const x = L.leseGrundton(t, nm); return x ? T.spell(x) : null; };
  eq(g("C"), "C", "C");
  eq(g("Cis"), "Cis", "deutsch Cis");
  eq(g("C#"), "Cis", "C#");
  eq(g("Db"), "Des", "Db");
  eq(g("Des"), "Des", "deutsch Des");
  eq(g("Es"), "Es", "Es");
  eq(g("Eb"), "Es", "Eb");
  eq(g("As"), "As", "As");
  eq(g("Ab"), "As", "Ab");
  eq(g("H"), "H", "H");
  eq(g("B"), "B", "B heißt deutsch B♭");
  eq(g("Bb"), "B", "Bb ist auch im deutschen Modus B♭, nicht Heses");
  eq(g("B", EN), "H", "B heißt englisch H");
  eq(g("Bb", EN), "B", "Bb englisch ist B♭");
  eq(g("Fis"), "Fis", "Fis");
  eq(g("F♯"), "Fis", "F♯");
  eq(g("Ges"), "Ges", "Ges");
  eq(g("x"), null, "kein Ton");
}

console.log("\nAkkordarten");
{
  const tab = {
    "Cm7": "C m7", "C-7": "C m7", "Cmin7": "C m7", "Cmi7": "C m7", "Cm9": "C m7",
    "Cmaj7": "C maj7", "CΔ": "C maj7", "CΔ7": "C maj7", "CM7": "C maj7", "Cma7": "C maj7", "Cmaj9": "C maj7",
    "C7": "C dom7", "C9": "C dom7", "C13": "C dom7",
    "C7b9": "C dom7_alt", "C7#9": "C dom7_alt", "C7alt": "C dom7_alt", "C7#5": "C dom7_alt", "C7b9b13": "C dom7_alt",
    "C7#11": "C dom7_11", "Cmaj7#11": "C maj7_11",
    "Cm7b5": "C m7b5", "Cø": "C m7b5", "Cø7": "C m7b5", "C-7b5": "C m7b5", "Cm7(b5)": "C m7b5",
    "C°7": "C dim7", "Co7": "C dim7", "Cdim7": "C dim7",
    "CmMaj7": "C mMaj7", "Cm(maj7)": "C mMaj7", "C-Δ7": "C mMaj7",
    "Cm6": "C m6", "C6": "C dur6", "C69": "C dur6", "C6/9": "C dur6",
    "C": "C dur", "Cm": "C moll", "C-": "C moll",
    "C7sus4": "C sus7", "Csus": "C sus7", "C9sus": "C sus7",
    "Asus4": "A sus7", "Esus": "E sus7",
    "Bbmaj7": "B maj7", "Ebm7": "Es m7", "F#m7b5": "Fis m7b5", "Hm7b5": "H m7b5", "Esm7": "Es m7",
  };
  for (const [s, erwartet] of Object.entries(tab)) eq(kurz(L.leseAkkord(s)), erwartet, s);

  ok(L.leseAkkord("Cxyz").fehler, "unbekannt wird abgelehnt, nicht geraten");
  ok(L.leseAkkord("Q7").fehler, "unbekannter Grundton wird abgelehnt");
  ok(/Bass/.test(L.leseAkkord("C/E").hinweise[0]), "Slash-Akkord: der Bass wird erwähnt");
  eq(L.leseAkkord("C/E").q, "dur", "und der Akkord trotzdem gespielt");
  ok(L.leseAkkord("Cdim").hinweise.length === 1, "verminderter Dreiklang bekommt einen Hinweis");
}

console.log("\nKlingend und gegriffen");
{
  const P = (step, alter, octave = 4) => ({ step, alter, octave });
  eq(T.spell(L.zuKlingend(P(0, 0))), "Es", "gegriffen C klingt Es");
  eq(T.spell(L.zuKlingend(P(4, 0))), "B", "gegriffen G klingt B");
  eq(T.spell(L.zuKlingend(P(3, 1))), "A", "gegriffen Fis klingt A");
  eq(T.spell(L.zuGegriffen(P(6, -1))), "G", "klingend B wird gegriffen G");
  eq(T.spell(L.zuGegriffen(P(2, -1))), "C", "klingend Es wird gegriffen C");
  eq(T.spell(L.zuGegriffen(P(1, -1))), "B", "klingend Des wird gegriffen B, nicht Ais");
  for (let pc = 0; pc < 12; pc++) {
    const p = T.fromMidi(60 + pc, "flat");
    const hin = L.zuGegriffen(p), zurueck = L.zuKlingend(hin);
    ok(T.toMidi(hin) - T.toMidi(p) === 9, `${T.spell(p)}: gegriffen neun Halbtöne höher`);
    eq([zurueck.step, zurueck.alter], [p.step, p.alter], `${T.spell(p)}: hin und zurück bleibt dieselbe Schreibweise`);
  }

  const klingend = L.leseLeadsheet("| Bb7 | Eb7 |", { eingabe: "klingend" });
  const es = L.leseLeadsheet("| G7 | C7 |", { eingabe: "es" });
  eq(klingend.akkorde.map(a => T.toMidi(a.root) % 12), es.akkorde.map(a => T.toMidi(a.root) % 12),
     "Blues in B klingend und derselbe Blues gegriffen in G ergeben dieselbe Band");
  eq(es.akkorde.map(a => L.gegriffenSymbol(a)), ["G7", "C7"], "und werden gegriffen wieder so angezeigt");
  eq(klingend.akkorde.map(a => a.symbol), ["B7", "Es7"], "gespeichert wird klingend");
}

console.log("\nTakte lesen");
{
  const r = L.leseLeadsheet("| Dm7 G7 | Cmaj7 | % | C7 F7 Bb7 | A7 D7 G7 C7 |");
  eq(r.taktzahl, 5, "fünf Takte, % zählt als Takt");
  eq(r.fehler, [], "ohne Fehler");
  eq(r.akkorde.map(a => [a.symbol, a.abTakt, a.takte]),
     [["Dm7", 0, 0.5], ["G7", 0.5, 0.5], ["Cmaj7", 1, 2], ["C7", 3, 0.5], ["F7", 3.5, 0.25], ["B7", 3.75, 0.25],
      ["A7", 4, 0.25], ["D7", 4.25, 0.25], ["G7", 4.5, 0.25], ["C7", 4.75, 0.25]],
     "zwei teilen in Hälften, drei in 2+1+1, vier in Viertel; gleiche Takte werden zusammengefasst");
  eq(H.progressionTakte(r.akkorde), 5, "die Summe geht auf");

  const m = L.leseLeadsheet("[A] | Cmaj7 | Dm7 G7 |\n[B] | Em7 | A7 ||: Dm7 :| G7 |");
  eq(m.abschnitte, [{ label: "A", abTakt: 0 }, { label: "B", abTakt: 2 }], "Abschnittsmarken");
  eq(m.taktzahl, 6, "Zeilenumbrüche und Wiederholungszeichen als Taktstriche");
  eq(L.leseLeadsheet("A: | C | F |").abschnitte[0], { label: "A", abTakt: 0 }, "A: geht auch");

  const f = L.leseLeadsheet("| Cm7 | Fxx7 | Bbmaj7 |");
  eq(f.fehler.length, 1, "ein unbekannter Akkord ist ein Fehler");
  eq(f.fehler[0].takt, 2, "mit Taktnummer");
  ok(L.leseLeadsheet("| % | C |").fehler.length === 1, "% am Anfang ist ein Fehler");
  ok(L.leseLeadsheet("| C D E F G |").fehler.length === 1, "fünf Akkorde in einem Takt sind ein Fehler");
  eq(L.leseLeadsheet("").akkorde, [], "leer ist leer");
  eq(L.leseLeadsheet("| C/E |").hinweise.length, 1, "Hinweise kommen mit Taktnummer heraus");
  ok(/^Takt 1/.test(L.leseLeadsheet("| C/E |").hinweise[0]), "und nennen den Takt");
}

console.log("\nVorlagen");
{
  const F = { step: 3, alter: 0 }, B = { step: 6, alter: -1 }, C = { step: 0, alter: 0 };
  eq(L.vorlageText("jazzblues", F), "| F7 | B7 | F7 | Cm7 F7 | B7 | H°7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |",
     "Jazz-Blues in F");
  eq(L.vorlageText("jazzblues", F, EN), "| F7 | B♭7 | F7 | Cm7 F7 | B♭7 | B°7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |",
     "und international");
  eq(L.vorlageText("mollblues", C), "| Cm7 | Cm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | As7 | G7 | Cm7 | G7 |",
     "Moll-Blues mit As7 auf der sechsten Stufe");
  for (const v of L.VORLAGEN) {
    for (const t of [F, B, C, { step: 4, alter: 0 }, { step: 2, alter: -1 }]) {
      for (const nm of [DE, EN]) {
        const r = L.leseLeadsheet(L.vorlageText(v.id, t, nm), { naming: nm });
        eq(r.fehler, [], `${v.name} auf ${T.spell(t)} (${nm}) liest sich fehlerfrei zurück`);
        eq(r.taktzahl, v.takte, `${v.name}: ${v.takte} Takte`);
      }
    }
  }
  const rc = L.leseLeadsheet(L.vorlageText("rhythm", B));
  eq(rc.abschnitte.map(a => a.label).join(""), "AABA", "Rhythm Changes als AABA");
  eq(H.chordAtBar(rc.akkorde, 16).symbol, "D7", "die Bridge beginnt in B mit D7");
}

console.log("\nAkkord auf dem Schlag");
{
  const r = L.leseLeadsheet("| Dm7 G7 | Cmaj7 | C7 F7 Bb7 |").akkorde;
  const s = (t, b) => { const x = H.akkordAufSchlag(r, t, b); return [x.akkord.symbol, x.beginnt, x.schlaege, x.danach.symbol]; };
  eq(s(0, 0), ["Dm7", true, 2, "G7"], "Takt 1, Eins: Dm7 für zwei Schläge, dann G7");
  eq(s(0, 1), ["Dm7", false, 1, "G7"], "Takt 1, Zwei: noch Dm7");
  eq(s(0, 2), ["G7", true, 2, "Cmaj7"], "Takt 1, Drei: G7 beginnt");
  eq(s(1, 0), ["Cmaj7", true, 4, "C7"], "Takt 2: ein Akkord, vier Schläge");
  eq(s(2, 2), ["F7", true, 1, "B7"], "drei Akkorde: F7 auf Drei, ein Schlag");
  eq(s(2, 3), ["B7", true, 1, "Dm7"], "und zurück zum Anfang der Form");
  const lang = L.leseLeadsheet("| C7 | % | % | % |").akkorde;
  eq(H.akkordAufSchlag(lang, 2, 0).beginnt, false, "ein Akkord über vier Takte beginnt nur einmal");
  eq(H.akkordAufSchlag(lang, 2, 0).schlaege, 4, "und wird taktweise gespielt");
  eq(H.akkordeImTakt(r, 0).map(a => a.symbol), ["Dm7", "G7"], "Akkorde im Takt, für die Anzeige");
  // Die festen Folgen bleiben, was sie waren.
  const blues = H.buildProgression(H.PROGRESSIONS.find(p => p.id === "blues"), 10);
  for (let t = 0; t < 12; t++) {
    eq(H.akkordAufSchlag(blues, t, 0).akkord, H.chordAtBar(blues, t), `Blues Takt ${t + 1}: wie bisher`);
  }
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
