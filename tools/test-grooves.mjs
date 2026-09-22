/* Prüft js/music/grooves.js. Läuft mit `node tools/test-grooves.mjs`.

   Ein Groove ist nur dann einer, wenn er dort schlägt, wo sein Stil es
   verlangt: House hat die Bassdrum auf jedem Schlag, Funk den Backbeat auf
   zwei und vier, Bossa den Bass auf eins und drei, Swing den Walking Bass
   auf jedem Viertel. Genau das steht hier unter Schutz — ohne Audio. */

import * as G from "../js/music/grooves.js";
import * as H from "../js/music/harmonie.js";
import * as L from "../js/music/leadsheet.js";
import { toMidi } from "../js/music/theory.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

let seed = 5;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** Spielt `takte` Takte eines Grooves durch und sammelt die Ereignisse
    mit ihrer Position in Sechzehnteln. */
function durchlauf(grooveId, text = "| C7 | F7 | Dm7 G7 | Cmaj7 |", takte = 4) {
  const akkorde = L.leseLeadsheet(text).akkorde;
  const zustand = {};
  const out = [];
  for (let t = 0; t < takte; t++) {
    for (let v = 0; v < 4; v++) {
      const hier = H.akkordAufSchlag(akkorde, t % H.progressionTakte(akkorde), v);
      for (let sub = 0; sub < 4; sub++) {
        for (const e of G.ereignisse(grooveId, { viertel: v, sub, taktImLoop: t, hier }, zustand, rng)) {
          out.push({ ...e, pos: t * 16 + v * 4 + sub, takt: t, viertel: v, sub, akkord: hier.akkord });
        }
      }
    }
  }
  return out;
}
const positionen = (evs, typ, takt = 0) => evs.filter(e => e.typ === typ && e.takt === takt).map(e => e.pos - takt * 16);

console.log("Jeder Groove");
{
  eq(G.GROOVES.map(g => g.id), ["swing", "ballade", "bossa", "funk", "pop", "house"], "sechs Grooves");
  for (const g of G.GROOVES) {
    const evs = durchlauf(g.id);
    ok(evs.some(e => e.typ === "bass"), `${g.name}: hat Bass`);
    ok(evs.some(e => e.typ === "comp"), `${g.name}: hat Akkorde`);
    ok(evs.every(e => e.amp > 0 && e.amp < 0.5), `${g.name}: Lautstärken im Rahmen`);
    ok(evs.filter(e => e.typ === "bass").every(e => e.midi >= 28 && e.midi <= 64), `${g.name}: Bass im Bassbereich`);
    ok(evs.filter(e => e.typ === "bass" || e.typ === "comp").every(e => e.dauer > 0), `${g.name}: jede Note hat Dauer`);
    ok(g.was && g.tempo > 40, `${g.name}: Beschreibung und Tempo`);
    if (!g.gerade) ok(evs.every(e => e.sub === 0 || e.sub === 2), `${g.name}: geswingt nur auf Viertel und „und“`);
    // Auf jeder Eins klingt ein Grundton — sonst hört man den Akkord nicht.
    // House spielt den Bass bewusst auf den Offbeat; dort ist es der erste
    // Basston des Takts.
    for (let t = 0; t < 4; t++) {
      const ersterBass = evs.find(e => e.typ === "bass" && e.takt === t);
      ok(ersterBass && ((ersterBass.midi - toMidi(ersterBass.akkord.root)) % 12 + 12) % 12 === 0,
         `${g.name}, Takt ${t + 1}: der erste Basston ist der Grundton`);
    }
  }
  eq(G.grooveOf("gibtsnicht").id, "swing", "Unbekanntes fällt auf Swing zurück");
}

console.log("\nWo die Stile schlagen");
{
  const house = durchlauf("house");
  eq(positionen(house, "kick"), [0, 4, 8, 12], "House: Bassdrum auf jedem Schlag");
  eq(positionen(house, "clap"), [4, 12], "House: Clap auf zwei und vier");
  eq(positionen(house, "openhat"), [2, 6, 10, 14], "House: offene Hi-Hat auf den Offbeats");
  eq(positionen(house, "bass"), [2, 6, 10, 14], "House: Bass auf den Offbeats");

  const funk = durchlauf("funk");
  eq(positionen(funk, "hihat").length, 16, "Funk: Hi-Hat in Sechzehnteln");
  const backbeat = funk.filter(e => e.typ === "snare" && e.takt === 0 && e.amp > 0.1).map(e => e.pos);
  eq(backbeat, [4, 12], "Funk: Backbeat auf zwei und vier");
  ok(funk.some(e => e.typ === "snare" && e.amp < 0.05), "Funk: dazu leise Ghost Notes");
  ok(positionen(funk, "bass").length < 8, "Funk: der Bass lässt Löcher");

  const bossa = durchlauf("bossa");
  const bossaBass = bossa.filter(e => e.typ === "bass" && e.takt === 0).map(e => e.pos);
  eq(bossaBass, [0, 6, 8, 14], "Bossa: Bass auf 1, 2-und, 3, 4-und");
  eq(positionen(bossa, "rim", 0), [0, 6, 12], "Bossa: Clave im ersten Takt 1, 2-und, 4");
  eq(positionen(bossa, "rim", 1), [4, 10], "Bossa: und im zweiten 2, 3-und");

  const pop = durchlauf("pop");
  eq(positionen(pop, "snare"), [4, 12], "Pop: Backbeat");
  eq(positionen(pop, "bass").length, 8, "Pop: Achtel im Bass");

  const swing = durchlauf("swing");
  eq(positionen(swing, "bass"), [0, 4, 8, 12], "Swing: Walking Bass auf jedem Viertel");
  eq(positionen(swing, "hihat"), [4, 12], "Swing: Hi-Hat auf zwei und vier");

  const ballade = durchlauf("ballade");
  eq(positionen(ballade, "bass"), [0, 8], "Ballade: Halbe im Bass");
  ok(ballade.some(e => e.typ === "besen"), "Ballade: mit Besen");
}

console.log("\nAkkordwechsel im Takt");
{
  // Takt 3 ist | Dm7 G7 |: auf der Drei muss der Bass den G-Grundton spielen.
  for (const g of ["swing", "ballade", "bossa", "pop"]) {
    const evs = durchlauf(g);
    const aufDrei = evs.find(e => e.typ === "bass" && e.takt === 2 && e.viertel === 2 && e.sub === 0);
    ok(aufDrei && ((aufDrei.midi - 43) % 12 + 12) % 12 === 0, `${g}: in | Dm7 G7 | liegt auf der Drei G im Bass`);
  }
  const swing = durchlauf("swing");
  const wechsel = swing.filter(e => e.typ === "comp" && e.takt === 2 && e.dauer > 1).map(e => e.viertel);
  eq(wechsel, [0, 2], "Swing: die Akkorde schlagen bei jedem Wechsel an");
}

console.log("\nTiming");
{
  eq([0, 1, 2, 3].map(s => G.subAnteil(s, true, 0.62)), [0, 0.25, 0.5, 0.75], "gerade: gleichmäßige Sechzehntel");
  eq(G.subAnteil(2, false, 0.5), 0.5, "Swing 0,5 ist gerade");
  eq(Math.round(G.subAnteil(2, false, 2 / 3) * 1000), 667, "voller Swing: Triolen-Achtel");
  ok(G.subAnteil(3, false, 0.62) > G.subAnteil(2, false, 0.62), "Reihenfolge bleibt erhalten");
}

console.log("\nFeste Folgen bringen ihren Groove mit");
{
  const g = id => H.PROGRESSIONS.find(p => p.id === id).groove || "swing";
  eq(g("house_vamp"), "house", "House-Vamp spielt House");
  eq(g("bossa"), "bossa", "Bossa spielt Bossa");
  eq(g("vier_akkorde"), "pop", "die vier Akkorde spielen Pop");
  eq(g("ballade"), "ballade", "die Balladenwendung spielt Ballade");
  eq(g("dur251"), "swing", "II–V–I bleibt Swing");
  ok(H.PROGRESSIONS.every(p => !p.groove || G.GROOVES.some(x => x.id === p.groove)), "nur bekannte Grooves");
}

console.log("\nUmschalten mitten im Takt");
{
  // Wer während des Laufens den Groove wechselt, landet mit leerem
  // Zustand irgendwo im Takt. Kein Groove darf dann abstürzen.
  const akkorde = L.leseLeadsheet("| Cm7 | Fm7 |").akkorde;
  for (const g of G.GROOVES) {
    for (let v = 0; v < 4; v++) {
      for (let sub = 0; sub < 4; sub++) {
        let evs = null;
        try {
          evs = G.ereignisse(g.id, { viertel: v, sub, taktImLoop: 1, hier: H.akkordAufSchlag(akkorde, 1, v) }, {}, rng);
        } catch (e) { evs = null; }
        ok(Array.isArray(evs), `${g.name}: Einstieg auf Schlag ${v + 1}, Sechzehntel ${sub + 1} ohne Absturz`);
        ok(!evs || evs.filter(e => e.typ === "bass").every(e => Number.isFinite(e.midi)), `${g.name}: und mit echtem Basston`);
      }
    }
  }
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
