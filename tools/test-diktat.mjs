/* Prüft js/music/diktat.js: die Aufgaben für den schriftlichen Hörtest.
   Läuft mit `node tools/test-diktat.mjs`.

   Was hier unter Schutz steht: Diktate sind lösbar (im System, in der
   Tonart, auf dem Grundton endend), die Auswertung sagt genau, was falsch
   war, und Umkehrungen liegen wirklich in der Lage, die sie behaupten. */

import * as D from "../js/music/diktat.js";
import * as T from "../js/music/theory.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);
const P = (step, alter, octave) => ({ step, alter, octave });
const rng = D.mulberry32(20260922);
const pc = m => ((m % 12) + 12) % 12;
const summe = noten => noten.filter(x => !x.barline).reduce((s, x) => s + x.dur * (x.dots ? 1.5 : 1), 0);

console.log("Tonhöhen eingeben");
{
  eq(D.vorzeichnungFuer(3, 2), 1, "F in D-Dur ist Fis");
  eq(D.vorzeichnungFuer(0, 2), 1, "C in D-Dur ist Cis");
  eq(D.vorzeichnungFuer(4, 2), 0, "G in D-Dur bleibt G");
  eq(D.vorzeichnungFuer(6, -1), -1, "H in F-Dur ist B");
  eq(D.vorzeichnungFuer(6, 0), 0, "ohne Vorzeichnung nichts");

  eq(D.naechsteLage(0, 0, P(2, 0, 4)), P(0, 0, 4), "von E4 aus ist C das C4, nicht C5");
  eq(D.naechsteLage(1, 0, P(5, 0, 4)), P(1, 0, 5), "von A4 aus ist D das D5");
  eq(D.naechsteLage(4, 0, P(4, 0, 4)), P(4, 0, 4), "derselbe Ton bleibt in derselben Oktave");
  eq(T.toMidi(D.naechsteLage(0, 0, null)), 72, "ohne Vorgänger zur Mitte des Systems");
}

console.log("\nAuswertung der Tonhöhen");
{
  const soll = [P(5, 0, 4), P(6, 0, 4), P(0, 0, 5), P(4, 1, 4)];
  eq(D.vergleicheTonhoehen(soll, soll).alles, true, "gleich ist richtig");
  eq(D.vergleicheTonhoehen(soll, [P(5, 0, 4), P(6, 0, 4), P(0, 0, 5), P(5, -1, 4)]).einzeln[3],
     "enharmonisch", "As statt Gis wird als Schreibfehler erkannt");
  eq(D.vergleicheTonhoehen(soll, [P(5, 0, 4), P(6, 0, 4), P(0, 0, 5), P(5, -1, 4)], { enharmonischOk: true }).alles,
     true, "freitonal ist As so gut wie Gis");
  eq(D.vergleicheTonhoehen(soll, [P(5, 0, 4), P(6, 0, 4), P(0, 0, 4), P(4, 1, 4)]).einzeln[2],
     "oktave", "C4 statt C5 ist ein Oktavfehler");
  eq(D.vergleicheTonhoehen(soll, [P(5, 0, 4), P(1, 0, 5)]).einzeln, ["richtig", "falsch", "fehlt", "fehlt"],
     "falsch und fehlend werden unterschieden");
  eq(D.vergleicheTonhoehen(soll, [P(5, 0, 4)]).richtig, 1, "gezählt wird, was stimmt");
}

console.log("\nMelodiediktate sind lösbar");
{
  let n_ = 0, ausserhalb = 0, zuKurz = 0, nichtGrundton = 0, leiterfremd = 0, wiederholt = 0, krumm = 0;
  for (const art of ["tonal", "frei"]) {
    for (const st of D.MELODIE_STUFEN) {
      for (let i = 0; i < 150; i++) {
        const m = D.melodieDiktat({ art, stufe: st.id, rng });
        n_++;
        const midis = m.pitches.map(T.toMidi);
        if (midis.some(x => x < D.TIEF || x > D.HOCH)) ausserhalb++;
        if (m.pitches.length < st.mindestens) zuKurz++;
        if (Math.abs(summe(m.noten) - 4 * st.takte) > 1e-6) krumm++;
        const klingend = m.noten.filter(x => !x.barline && x.pitch).map(x => x.pitch);
        ok(JSON.stringify(klingend) === JSON.stringify(m.pitches), "Noten und Tonhöhen passen zusammen");
        if (art === "tonal") {
          if (pc(midis[midis.length - 1]) !== pc(T.toMidi(m.tonart.tonic))) nichtGrundton++;
          const leiter = T.buildScale(m.tonart.tonic, m.moll ? "moll_harmonisch" : "dur", 1)
            .map(p => `${p.step}:${p.alter}`);
          if (m.pitches.some(p => !leiter.includes(`${p.step}:${p.alter}`))) leiterfremd++;
          ok(Math.abs(m.keySig) <= (st.id >= 3 ? 3 : 2), "Tonart mit wenigen Vorzeichen");
          ok(m.kadenz && m.kadenz.length === 4, "tonal kommt mit Kadenz");
        } else {
          if (midis.some((x, j) => j && x === midis[j - 1])) wiederholt++;
          ok(m.keySig === 0 && !m.kadenz, "freitonal ohne Vorzeichnung und Kadenz");
        }
      }
    }
  }
  eq(ausserhalb, 0, `alle ${n_} Diktate liegen zwischen G3 und A5`);
  eq(zuKurz, 0, "keines ist kürzer als für die Stufe vorgesehen");
  eq(krumm, 0, "jeder Takt geht auf");
  eq(nichtGrundton, 0, "tonale Diktate enden auf dem Grundton");
  eq(leiterfremd, 0, "tonale Diktate bleiben in ihrer Leiter, richtig buchstabiert");
  eq(wiederholt, 0, "freitonale Diktate wiederholen keinen Ton direkt");
}

console.log("\nKadenz");
{
  const c = T.MAJOR_KEYS.find(k => k.name === "C-Dur");
  const k = D.kadenz(c, false);
  eq(k.length, 4, "vier Akkorde");
  eq(k[0], k[3], "sie beginnt und endet auf der Tonika");
  eq(k.map(a => pc(a[0])), [0, 5, 7, 0], "Bass C, F, G, C");
  const a = T.MINOR_KEYS.find(x => x.name === "a-Moll");
  const km = D.kadenz(a, true);
  ok(km[2].some(m => pc(m) === 8), "in Moll hat die Dominante das Gis");
  ok(km[0].some(m => pc(m) === 0) && !km[0].some(m => pc(m) === 1), "die Tonika ist Moll");
}

console.log("\nRhythmusdiktat");
{
  const pal1 = D.palette(1);
  ok(pal1.every(b => b.stufe === 1), "Stufe 1 bietet nur Viertel, Halbe, Ganze und Pause");
  const pal4 = D.palette(4);
  eq(new Set(pal4.map(b => JSON.stringify(b.teile))).size, pal4.length, "kein Baustein doppelt");
  ok(pal4.every((b, i) => i === 0 || pal4[i - 1].laenge <= b.laenge), "nach Länge sortiert");

  const viertel = pal1.find(b => b.laenge === 1 && !b.teile[0].pause).id;
  const halbe = pal1.find(b => b.laenge === 2).id;
  const achtel = D.palette(2).find(b => b.teile.length === 2 && b.teile.every(t => t.dur === 0.5 && !t.pause)).id;

  const drei = D.bausteineZuNoten([viertel, viertel, viertel]);
  eq(drei.rest, 1, "nach drei Vierteln ist noch einer frei");
  ok(!D.passt(D.bausteinVon(halbe), drei.rest), "eine Halbe passt nicht mehr in den Takt");
  const vier = D.bausteineZuNoten([viertel, viertel, viertel, viertel, viertel]);
  ok(vier.noten.some(x => x.barline === true), "nach vier Vierteln kommt ein Taktstrich");
  const acht = D.bausteineZuNoten(Array(8).fill(viertel));
  ok(acht.voll && acht.noten[acht.noten.length - 1].barline === "end", "nach zwei Takten ist Schluss");

  const soll = D.bausteineZuNoten([achtel, ...Array(7).fill(viertel)]).noten;
  const r = D.vergleicheRhythmus(soll, acht.noten, 8);
  eq(r.einzeln, [false, true, true, true, true, true, true, true], "genau der erste Schlag ist falsch");
  eq(D.vergleicheRhythmus(soll, soll, 8).alles, true, "gleich ist richtig");

  // Eine Halbe gegen zwei Viertel: der zweite Schlag unterscheidet sich,
  // obwohl in der Halben nichts Neues beginnt.
  const mitHalber = D.bausteineZuNoten([halbe, viertel, viertel, ...Array(4).fill(viertel)]).noten;
  eq(D.vergleicheRhythmus(mitHalber, acht.noten, 8).einzeln.slice(0, 2), [false, false],
     "Halbe gegen zwei Viertel fällt auf beiden Schlägen auf");

  for (let i = 0; i < 100; i++) {
    const d = D.rhythmusDiktat({ stufe: 1 + (i % 4), rng });
    ok(Math.abs(summe(d.noten) - 8) < 1e-6, "zwei Takte zu vier Vierteln");
    ok(D.vergleicheRhythmus(d.noten, d.noten, 8).alles, "ein Rhythmus ist sich selbst gleich");
  }
}

console.log("\nAkkorde mit Umkehrungen");
{
  let falscheLage = 0, ausserhalb = 0, ungeordnet = 0;
  for (const art of D.AKKORD_ARTEN) {
    const zahl = art.toene;
    for (let u = 0; u < zahl; u++) {
      for (let i = 0; i < 25; i++) {
        const a = D.baueAkkord(art.id, u, rng);
        ok(a.toene.length === zahl, `${art.label}: ${zahl} Töne`);
        const grund = T.buildChord({ ...a.root, octave: 4 }, art.id);
        // Im Bass liegt der u-te Akkordton der Grundstellung.
        const bass = a.toene[0];
        if (bass.step !== grund[u].step || bass.alter !== grund[u].alter) falscheLage++;
        if (a.midis.some((m, j) => j && m <= a.midis[j - 1])) ungeordnet++;
        if (a.midis[0] < 53 || a.midis[0] > 64 || Math.max(...a.midis) > 84) ausserhalb++;
        const pcs = new Set(a.midis.map(pc));
        ok(grund.every(p => pcs.has(pc(T.toMidi(p)))), `${art.label}: alle Akkordtöne da`);
      }
    }
  }
  eq(falscheLage, 0, "der Bass ist der Ton, den die Umkehrung verlangt");
  eq(ungeordnet, 0, "enge Lage, von unten nach oben");
  eq(ausserhalb, 0, "Bass zwischen F3 und E4");
  eq(D.UMKEHRUNGEN[3], ["Grundstellung", "Sextakkord", "Quartsextakkord"], "Namen der Dreiklangslagen");
  eq(D.UMKEHRUNGEN[4][3], "Sekundakkord", "die dritte Umkehrung des Septakkords");
}

console.log("\nFehler erkennen");
{
  let ohne = 0, n_ = 400;
  for (let i = 0; i < n_; i++) {
    const f = D.fehlerMelodie({ rng });
    const notiert = f.notiert.map(T.toMidi);
    const unterschiede = notiert.map((m, j) => m !== f.gespielt[j] ? j : -1).filter(j => j >= 0);
    if (f.antwort === -1) { ohne++; eq(unterschiede, [], "ohne Fehler ist alles gleich"); }
    else eq(unterschiede, [f.antwort], "genau der eine Ton ist anders");
    ok(f.antwort !== 0, "der erste Ton bleibt der Bezug");
    ok(notiert.every(m => m >= D.TIEF && m <= D.HOCH), "im System");
  }
  ok(ohne > n_ * 0.1 && ohne < n_ * 0.3, `etwa jede fünfte Aufgabe hat keinen Fehler (${ohne} von ${n_})`);

  for (let i = 0; i < 300; i++) {
    const f = D.fehlerAkkord({ rng });
    const notiert = f.notiert.map(T.toMidi);
    const unterschiede = notiert.map((m, j) => m !== f.gespielt[j] ? j : -1).filter(j => j >= 0);
    eq(unterschiede, f.antwort === -1 ? [] : [f.antwort], "Akkord: höchstens ein Ton anders, und der genannte");
    eq(new Set(f.gespielt).size, f.gespielt.length, "kein Ton fällt auf einen anderen");
    if (f.antwort >= 0) eq(Math.abs(f.gespielt[f.antwort] - notiert[f.antwort]), 1, "um einen Halbton");
  }
}

console.log("\nWiedererkennen");
{
  for (let i = 0; i < 200; i++) {
    const w = D.wiedererkennen({ rng });
    eq(w.varianten.length, 3, "drei Beispiele");
    const keys = w.varianten.map(v => v.map(T.toMidi).join(","));
    eq(new Set(keys).size, 3, "alle verschieden");
    eq(w.gespielt, w.varianten[w.antwort].map(T.toMidi), "gespielt wird das genannte");
    // Ähnlich genug, dass man hinhören muss: höchstens zwei Töne anders
    // als irgendein anderes Beispiel.
    const diff = (a, b) => a.filter((m, j) => m !== b[j]).length;
    const midis = w.varianten.map(v => v.map(T.toMidi));
    ok(midis.every(a => midis.some(b => b !== a && diff(a, b) <= 2)), "jedes Beispiel hat einen nahen Verwandten");
    ok(midis.every(v => v[0] === midis[0][0]), "alle beginnen auf demselben Ton");
  }
}

console.log("\nZeitplan");
{
  const noten = [
    { pitch: P(0, 0, 4), dur: 1 }, { pitch: null, dur: 1 }, { pitch: P(2, 0, 4), dur: 2 },
    { barline: true }, { pitch: P(4, 0, 4), dur: 1, dots: 1 }, { pitch: P(4, 0, 4), dur: 0.5 }, { pitch: P(0, 0, 4), dur: 2 },
    { barline: "end" },
  ];
  const z = D.zeitplan(noten, 60, 0);
  eq(z.noten.map(x => x.zeit), [0, 2, 4, 5.5, 6], "Pausen rücken die Zeit weiter, punktierte Noten dauern länger");
  eq(z.ende, 8, "zwei Takte bei 60 sind acht Sekunden");
  ok(z.noten.every(x => x.dauer > 0), "jede Note klingt");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
