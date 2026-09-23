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

console.log("\nMelodie ergänzen");
{
  const laengeVon = x => x.dur * (x.dots ? 1.5 : 1);
  const takteVon = noten => {
    const out = [[]];
    for (const x of noten) { if (x.barline) { if (x.barline !== "end") out.push([]); continue; } out[out.length - 1].push(x); }
    return out.filter(t => t.length);
  };
  const toene = noten => noten.filter(x => !x.barline && x.pitch).map(x => x.pitch);
  const zaehl = { takt: new Set(), moll: 0, abweichung: 0 };
  for (let i = 0; i < 400; i++) {
    const stufe = 1 + (i % 3);
    const a = D.melodieErgaenzen({ stufe, rng });
    const wo = `Stufe ${stufe}, ${a.tonart.name}, ${a.schlaege}/4`;
    const takte = takteVon(a.noten);
    eq(takte.length, 8, `${wo}: acht Takte`);
    ok(takte.every(t => Math.abs(t.reduce((s, x) => s + laengeVon(x), 0) - a.schlaege) < 1e-6), `${wo}: jeder Takt geht auf`);
    eq(takteVon(a.vorgabe).length, 4, `${wo}: vier Takte vorgegeben`);
    eq(takteVon(a.gesucht).length, 4, `${wo}: vier Takte gesucht`);
    eq(JSON.stringify(takteVon(a.gesucht)), JSON.stringify(takte.slice(4)), `${wo}: gesucht sind genau die Takte 5 bis 8`);
    const rh = t => t.map(x => laengeVon(x)).join();
    ok(rh(takte[4]) === rh(takte[0]) && rh(takte[5]) === rh(takte[1]), `${wo}: der Nachsatz beginnt im Rhythmus des Vordersatzes`);
    const alle = toene(a.noten);
    ok(alle.every(p => T.toMidi(p) >= D.TIEF && T.toMidi(p) <= D.HOCH), `${wo}: alles im Violinschlüssel-Rahmen`);
    const tonika = T.toMidi(a.tonart.tonic);
    ok(pc(T.toMidi(alle[alle.length - 1])) === pc(tonika), `${wo}: endet auf dem Grundton`);
    const t4 = takte[3], schluss4 = t4[t4.length - 1];
    const stufeVon = p => pc(T.toMidi(p) - tonika);
    const halbschluss = a.moll ? [2, 7] : [2, 7];
    ok(halbschluss.includes(stufeVon(schluss4.pitch)), `${wo}: Takt 4 endet auf der zweiten oder fünften Stufe`);
    ok(laengeVon(schluss4) >= 1, `${wo}: Takt 4 endet auf einem langen Ton`);
    ok(takte.flat().every(x => x.pitch), `${wo}: keine Pausen`);
    // Schreibweise: jeder Ton aus der Leiter der Tonart.
    const leiter = T.buildScale(a.tonart.tonic, a.moll ? "moll_harmonisch" : "dur", 1).slice(0, 7);
    ok(alle.every(p => leiter.some(l => l.step === p.step && l.alter === p.alter)), `${wo}: jeder Ton in der Tonart buchstabiert`);
    // Keine übermäßige Sekunde im harmonischen Moll.
    if (a.moll) {
      zaehl.moll++;
      const m = alle.map(T.toMidi);
      const sekunde = j => [1, 6].includes((((alle[j].step - alle[j - 1].step) % 7) + 7) % 7);
      ok(m.every((x, j) => j === 0 || !(sekunde(j) && Math.abs(x - m[j - 1]) === 3)), `${wo}: keine übermäßige Sekunde`);
    }
    const v12 = toene(takte.slice(0, 2).flat().map(x => x)), n12 = toene(takte.slice(4, 6).flat());
    if (JSON.stringify(v12) !== JSON.stringify(n12)) zaehl.abweichung++;
    zaehl.takt.add(a.schlaege);
    // Wer genau das Gesuchte einträgt, bekommt alle vier Punkte.
    const ein = a.gesucht.filter(x => !x.barline).map(x => ({ pitch: x.pitch, dur: x.dur, dots: x.dots }));
    const e = D.vergleicheErgaenzung(a.gesucht, D.eingabeZuNoten(ein, a.schlaege).noten, a.schlaege);
    ok(e.alles && e.punkte === 4, `${wo}: die Lösung selbst ergibt vier Punkte`);
  }
  eq([...zaehl.takt].sort(), [2, 3, 4], "Zwei-, Drei- und Vierviertel kommen vor");
  ok(zaehl.moll > 40, `auch Moll (${zaehl.moll})`);
  ok(zaehl.abweichung > 40, `Takt 5 und 6 weichen manchmal vom Anfang ab (${zaehl.abweichung})`);

  // Auswertung an einem festen Beispiel: 2/4, vier Takte.
  const n = (step, dur, dots = 0, alter = 0, octave = 4) => ({ pitch: { step, alter, octave }, dur, dots });
  const soll = D.eingabeZuNoten([n(4, 1), n(2, 1), n(3, 0.5), n(2, 0.5), n(1, 1), n(2, 1), n(4, 1), n(0, 2)], 2).noten;
  const ist = (xs) => D.eingabeZuNoten(xs, 2).noten;
  const r1 = D.vergleicheErgaenzung(soll, ist([n(4, 1), n(2, 1), n(3, 0.5), n(2, 0.5), n(1, 1), n(2, 1), n(4, 1), n(0, 2)]), 2);
  eq([r1.punkte, r1.alles], [4, true], "alles richtig: vier Punkte");
  const r2 = D.vergleicheErgaenzung(soll, ist([n(4, 1), n(2, 1), n(3, 0.5), n(1, 0.5), n(1, 1), n(2, 1), n(4, 1), n(0, 2)]), 2);
  eq(r2.punkte, 3.5, "ein falscher Ton, Rhythmus richtig: halber Punkt weg");
  eq(D.ergaenzungsHinweise(r2), ["Takt 6: Rhythmus stimmt, Töne nicht."], "und der Hinweis nennt den Takt");
  const r3 = D.vergleicheErgaenzung(soll, ist([n(4, 1), n(2, 1), n(3, 1), n(1, 1), n(2, 1), n(4, 1), n(0, 2)]), 2);
  ok(r3.takte[1].toene === false && r3.takte[1].rhythmus === false, "Achtel als Viertel: Rhythmus falsch, und ein Ton fehlt");
  const r4 = D.vergleicheErgaenzung(soll, ist([n(4, 1), n(2, 1), n(3, 1, 0), n(2, 1), n(1, 1), n(2, 1), n(4, 1), n(0, 2)]), 2);
  eq(r4.punkte, 1.5, "zwei Achtel als zwei Viertel verschiebt alles danach");
  const r5 = D.vergleicheErgaenzung(soll, ist([n(4, 1, 0, 0, 5), n(2, 1, 0, 0, 5), n(3, 0.5), n(2, 0.5), n(1, 1), n(2, 1), n(4, 1), n(0, 2)]), 2);
  eq(D.ergaenzungsHinweise(r5)[0], "Takt 5: richtige Töne, falsche Oktave.", "Oktave wird eigens genannt");
  const r6 = D.vergleicheErgaenzung(soll, ist([n(4, 1), n(2, 1), n(3, 0.5), n(2, 0.5), n(1, 1), n(2, 1), n(4, 1), n(1, 2, 0, -2)]), 2);
  eq(D.ergaenzungsHinweise(r6)[0], "Takt 8: klingt richtig, ist aber anders geschrieben.", "Deses statt C wird als Schreibfehler erkannt");
  eq(D.vergleicheErgaenzung(soll, ist([]), 2).punkte, 0, "leer: null Punkte");
  eq(r2.einzeln, ["richtig", "richtig", "richtig", "falsch", "richtig", "richtig", "richtig", "richtig"], "je Note markiert");

  const e1 = D.eingabeZuNoten([n(0, 1)], 3);
  eq([e1.rest, e1.takt, e1.schlag, e1.voll], [2, 1, 2, false], "nach einer Viertel im Dreiviertel sind noch zwei frei");
  const e2 = D.eingabeZuNoten([n(0, 2, 1)], 3);
  eq([e2.rest, e2.takt, e2.schlag], [3, 2, 1], "nach einem vollen Takt beginnt der nächste");
  eq(D.notenwerte(1, 4).map(w => w.laenge), [4, 3, 2, 1], "Stufe 1: Ganze, punktierte Halbe, Halbe, Viertel");
  eq(D.notenwerte(3, 2).map(w => w.laenge), [2, 1.5, 1, 0.75, 0.5, 0.25], "Stufe 3 im Zweiviertel: nichts über zwei Schläge");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
