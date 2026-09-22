/* Prüft js/music/popmessung.js und js/data/popvokabular.js.
   Läuft mit `node tools/test-popvokabular.mjs`.

   Die Messungen werden mit gebauten Tonhöhenverläufen geprüft: ein
   sauberer Scoop muss „gut“ heißen, ein zu langsamer „zu langsam“ — und
   jede Ablehnung muss sagen, was zu ändern ist. */

import * as M from "../js/music/popmessung.js";
import * as V from "../js/data/popvokabular.js";
import { PROGRESSIONS } from "../js/music/harmonie.js";
import { GROOVES } from "../js/music/grooves.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

/** Ein Verlauf aus Stützstellen [ms, Cent relativ zu 67], alle 33 ms. */
function verlauf(stuetzen, dauer, rauschen = 0) {
  const out = [];
  for (let t = 0; t <= dauer; t += 33) {
    let i = stuetzen.findIndex(([ts]) => ts > t);
    if (i < 0) i = stuetzen.length;
    const [t0, c0] = stuetzen[Math.max(0, i - 1)];
    const [t1, c1] = stuetzen[Math.min(stuetzen.length - 1, i)];
    const c = t1 === t0 ? c0 : c0 + (c1 - c0) * (t - t0) / (t1 - t0);
    out.push({ t, midi: 67 + (c + (Math.sin(t) * rauschen)) / 100 });
  }
  return out;
}

console.log("Scoop");
{
  const gut = M.scoop(verlauf([[0, -100], [120, 0], [800, 0]], 800));
  ok(gut.gut, `ein Halbton von unten in 120 ms ist sauber (${gut.text})`);
  // Der Anfang ist das Mittel der ersten beiden Punkte: ein einzelner
  // Messpunkt beim Anblasen zappelt oft.
  ok(gut.werte.tiefe <= -80 && gut.werte.tiefe >= -110, `Tiefe gemessen (${gut.werte.tiefe})`);
  ok(gut.werte.dauer <= 150, "Dauer gemessen");

  const flach = M.scoop(verlauf([[0, -20], [100, 0], [800, 0]], 800));
  ok(!flach.gut && /Kaum/.test(flach.text) && /Kiefer/.test(flach.text), "zu flach: sagt, was zu tun ist");
  const langsam = M.scoop(verlauf([[0, -120], [600, 0], [1200, 0]], 1200));
  ok(!langsam.gut && /langsam/.test(langsam.text), "zu langsam");
  const tief = M.scoop(verlauf([[0, -500], [150, 0], [800, 0]], 800));
  ok(!tief.gut && /tief/.test(tief.text), "zu tief angesetzt");
  const ueber = M.scoop(verlauf([[0, -100], [100, 0], [150, 60], [250, 0], [900, 0]], 900));
  ok(!ueber.gut && /über/.test(ueber.text), "schießt über");
  const daneben = M.scoop(verlauf([[0, -130], [120, -30], [800, -30]], 800));
  ok(!daneben.gut && /neben/.test(daneben.text), "landet neben der Mitte");
  ok(!M.scoop([{ t: 0, midi: 67 }]).gut, "zu kurz gemessen ist kein Urteil");
}

console.log("\nFall");
{
  const gut = M.fall(verlauf([[0, 0], [500, 0], [700, -500]], 700));
  ok(gut.gut, `Ton steht, dann fünf Halbtöne hinunter (${gut.text})`);
  const kaum = M.fall(verlauf([[0, 0], [600, 0], [700, -50]], 700));
  ok(!kaum.gut && /Kaum/.test(kaum.text), "kaum gefallen");
  const frueh = M.fall(verlauf([[0, 0], [60, 0], [300, -600]], 300));
  ok(!frueh.gut && /früh/.test(frueh.text), "Fall zu früh");
}

console.log("\nBend");
{
  const gut = M.bend(verlauf([[0, 0], [300, 0], [500, -100], [800, 0], [1300, 0]], 1300, 3));
  ok(gut.gut, `Halbton hinunter und zurück (${gut.text})`);
  const kaum = M.bend(verlauf([[0, 0], [400, -15], [900, 0]], 900));
  ok(!kaum.gut && /Kaum/.test(kaum.text), "kaum gebogen");
  const nichtZurueck = M.bend(verlauf([[0, 0], [300, 0], [500, -120], [900, -60], [1300, -60]], 1300));
  ok(!nichtZurueck.gut && /zurück/.test(nichtZurueck.text), "kommt nicht zurück");
  const zuTief = M.bend(verlauf([[0, 0], [300, 0], [500, -400], [900, 0], [1300, 0]], 1300));
  ok(!zuTief.gut && /tief/.test(zuTief.text), "zu tief gebogen");
}

console.log("\nSubtone");
{
  const reihe = (midi, centroid, n_ = 60, wackel = 0) =>
    Array.from({ length: n_ }, (_, i) => ({ t: i * 33, midi: midi + Math.sin(i) * wackel / 100, centroid, rms: 0.05 }));
  const gut = M.subtone(reihe(62, 1400), reihe(61.98, 900));
  ok(gut.gut, `deutlich dunkler, Tonhöhe hält (${gut.text})`);
  eq(gut.werte.dunkler, 36, "36 % dunkler");
  const sackt = M.subtone(reihe(62, 1400), reihe(61.7, 900));
  ok(!sackt.gut && /sackt/.test(sackt.text) && /Luft/.test(sackt.text), "sackt ab: der häufigste Fehler zuerst");
  const hell = M.subtone(reihe(62, 1400), reihe(62, 1350));
  ok(!hell.gut && /Kaum dunkler/.test(hell.text), "kaum dunkler");
  const wackelt = M.subtone(reihe(62, 1400), reihe(62, 900, 60, 40));
  ok(!wackelt.gut && /unruhig/.test(wackelt.text), "wackelt");
  ok(!M.subtone(reihe(62, 1400, 5), reihe(62, 900, 5)).gut, "zu kurz gemessen");
}

console.log("\nDer Lehrgang");
{
  eq(V.TECHNIKEN.map(t => t.id),
     ["subtone", "scoop", "fall", "bend", "artikulation", "growl", "vibrato", "shake", "schrei"],
     "neun Techniken in Lernreihenfolge: Subtone zuerst, der Schrei zuletzt");
  for (const t of V.TECHNIKEN) {
    ok(t.name && t.kurz && t.warum, `${t.name}: Name, Kurzform, Warum`);
    ok(t.wie.length >= 3, `${t.name}: mindestens drei Schritte`);
    ok(t.fehler.length >= 3, `${t.name}: mindestens drei typische Fehler`);
    ok(/./.test(t.fertig), `${t.name}: ein „fertig, wenn“`);
    ok(t.hoeren.length >= 2, `${t.name}: mindestens zwei Hörbeispiele`);
    ok(!t.wo.includes("travelsax"), `${t.name}: nicht am Travel Sax`);
    ok(GROOVES.some(g => g.id === t.uebung.groove), `${t.name}: die Übung hat einen bekannten Groove`);
    ok(PROGRESSIONS.some(p => p.id === t.uebung.prog), `${t.name}: und eine bekannte Folge`);
    ok(t.uebung.tonart >= 0 && t.uebung.tonart < 12, `${t.name}: klingende Tonart`);
    ok(!t.messung || t.messung === "subtone" || M.MESSUNGEN[t.messung], `${t.name}: Messung gibt es wirklich`);
  }
  eq(V.STUFEN.length, 4, "vier Stufen");
  ok(V.STUFEN.every(s => s.fertig), "jede Stufe mit „fertig, wenn“");
  ok(V.TECHNIKEN.filter(t => t.messung).length === 4, "vier Techniken lassen sich messen");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
