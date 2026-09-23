/* Prüft js/core/abgleich.js und js/audio/verzug.js.
   Läuft mit `node tools/test-abgleich.mjs`.

   Beim Zusammenführen zählt vor allem eines: zweimal abgleichen ergibt
   dasselbe wie einmal, in beide Richtungen. Beim Verzug: ein bekannter
   Versatz mit menschlichem Zittern kommt heraus, und Unsinn wird
   abgelehnt statt gespeichert. */

import { fuehreZusammen, fuehreWert, behalteGeraet } from "../js/core/abgleich.js";
import { verzugAusTipps, MESSUNG } from "../js/audio/verzug.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

let seed = 7;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

console.log("Zusammenführen");
{
  const ipad = {
    v: 2, kontext: "probelokal", week: 1,
    day: { date: "2026-09-23", done: ["p_ton"], spent: {} },
    settings: { a4: 442, ausgabeVerzug: 0 },
    log: [{ date: "2026-09-20", minutes: 40, blocks: ["Ton"] }, { date: "2026-09-22", minutes: 30, blocks: ["Skalen"] }],
    drills: {
      "skala:dur:C-Dur": { right: 5, wrong: 2, last: "2026-09-20", abgehakt: false },
      "vibrato:klassik": { messungen: [{ am: "2026-09-22", rate: 5.1 }] },
      "songmitspielen:liste": [{ id: "s1", titel: "Lovely Day", tonart: "D", notiz: "hier" }],
    },
    repertoire: [{ id: "r1", titel: "Oleo", status: "üben" }],
    read: ["vibrato"],
    griffe: { "91": "hier" },
  };
  const iphone = {
    v: 2, kontext: "travelsax", week: 3,
    day: { date: "2026-09-23", done: ["t_skalen"], spent: {} },
    settings: { a4: 440, ausgabeVerzug: 210 },
    log: [{ date: "2026-09-21", minutes: 20, blocks: ["Travel Sax"] }, { date: "2026-09-22", minutes: 30, blocks: ["Skalen"] }],
    drills: {
      "skala:dur:C-Dur": { right: 3, wrong: 4, last: "2026-09-21", abgehakt: true },
      "tonartfinden:zeiten": { liste: [12, 8] },
      "songmitspielen:liste": [{ id: "s1", titel: "Lovely Day", tonart: "D", notiz: "dort", bpm: 98 }, { id: "s2", titel: "Careless Whisper" }],
    },
    repertoire: [{ id: "r1", titel: "Oleo", status: "üben" }, { id: "r2", titel: "Parker's Mood" }],
    read: ["vibrato", "subtone"],
    griffe: { "92": "dort" },
  };

  const { zustand: z, bilanz } = fuehreZusammen(ipad, iphone);
  eq(z.settings, ipad.settings, "Einstellungen bleiben die dieses Geräts, samt Verzug");
  eq([z.kontext, z.week, z.day], [ipad.kontext, ipad.week, ipad.day], "Kontext und Tag bleiben");
  eq(z.log.map(e => e.date), ["2026-09-20", "2026-09-21", "2026-09-22"], "Protokoll vereinigt, gleiche Session einmal, nach Datum");
  eq(z.drills["skala:dur:C-Dur"], { right: 5, wrong: 4, last: "2026-09-21", abgehakt: true }, "Zähler: das Größere, Datum: das Spätere, abgehakt bleibt abgehakt");
  ok(z.drills["tonartfinden:zeiten"], "Übung nur vom anderen Gerät kommt dazu");
  const songs = z.drills["songmitspielen:liste"];
  eq(songs.map(s => s.id), ["s1", "s2"], "Songs mit derselben id sind derselbe Song");
  eq([songs[0].notiz, songs[0].bpm], ["hier", 98], "Text von hier, fehlende Felder von dort");
  eq(z.repertoire.map(r => r.id), ["r1", "r2"], "Repertoire vereinigt");
  eq(z.read, ["vibrato", "subtone"], "gelesene Artikel vereinigt");
  eq(z.griffe, { "91": "hier", "92": "dort" }, "Griffe beider Geräte");
  eq(bilanz, { sessions: 1, uebungen: 1, stuecke: 1 }, "Bilanz zählt, was neu ist");

  const zwei = fuehreZusammen(z, iphone).zustand;
  eq(zwei, z, "zweimal zusammenführen ergibt dasselbe wie einmal");
  const zurueck = fuehreZusammen(iphone, z).zustand;
  const hin = fuehreZusammen(z, zurueck).zustand;
  eq(hin.drills, z.drills, "hin und zurück: die Übungen bleiben stabil");
  eq(hin.log.length, z.log.length, "hin und zurück: keine doppelten Sessions");
  eq(zurueck.settings.ausgabeVerzug, 210, "das iPhone behält seinen Verzug");
  eq(ipad.drills["skala:dur:C-Dur"].right, 5, "der hiesige Zustand wird nicht verändert");

  let wurf = null;
  try { fuehreZusammen(ipad, null); } catch (e) { wurf = e; }
  ok(wurf, "keine Datei, kein stilles Ergebnis");

  eq(fuehreWert(null, 3), 3, "null wird aufgefüllt");
  eq(fuehreWert([1, 2], [2, 3]), [1, 2, 3], "einfache Listen: Vereinigung");
}

console.log("\nEinlesen behält das Gerät");
{
  const hier = { settings: { ausgabeVerzug: 210, a4: 440 } };
  const dort = { settings: { ausgabeVerzug: 0, a4: 442 }, log: [] };
  const neu = behalteGeraet(hier, dort);
  eq([neu.settings.ausgabeVerzug, neu.settings.a4], [210, 442], "Verzug von hier, der Rest von dort");
  eq(behalteGeraet({ settings: {} }, dort).settings.ausgabeVerzug, undefined, "ohne eigenen Verzug fällt der fremde weg");
}

console.log("\nVerzug messen");
{
  const spb = 60 / MESSUNG.bpm;
  const klicks = Array.from({ length: MESSUNG.klicks }, (_, i) => 1 + i * spb);
  const tippe = (verzug, zittern, fehlend = 0) => klicks
    .filter((_, i) => i >= fehlend)
    .map(k => k + verzug + (rng() - 0.5) * 2 * zittern);

  for (const v of [0.12, 0.2, 0.25, 0.3]) {
    const r = verzugAusTipps(klicks, tippe(v, 0.025));
    ok(r.ok && Math.abs(r.ms - v * 1000) <= 15, `Bluetooth ${v * 1000} ms wird gefunden (${r.ms})`);
  }
  const finger = verzugAusTipps(klicks, tippe(0.015, 0.02));
  ok(finger.ok && finger.ms === 0, `15 ms sind der Finger, kein Verzug (${finger.ms})`);
  const eilig = verzugAusTipps(klicks, tippe(-0.05, 0.02));
  ok(eilig.ok && eilig.ms === 0, "wer vor dem Klick tippt, bekommt keinen negativen Verzug");
  const wild = verzugAusTipps(klicks, tippe(0.2, 0.15));
  ok(!wild.ok && wild.grund === "unruhig", `wildes Tippen wird abgelehnt (${wild.grund})`);
  const wenig = verzugAusTipps(klicks, tippe(0.2, 0.02, 8));
  ok(!wenig.ok && wenig.grund === "zu wenig", "vier Tipps sind keine Messung");
  const doppelt = [...tippe(0.2, 0.02), ...klicks.slice(0, 4).map(k => k + 0.26)];
  const d = verzugAusTipps(klicks, doppelt);
  ok(d.ok && Math.abs(d.ms - 200) <= 20, `Doppeltipps verfälschen nicht (${d.ms})`);
  const streu = [...tippe(0.2, 0.02), 0.3, 5.9, 9];
  ok(verzugAusTipps(klicks, streu).ok, "Tipps außerhalb jedes Fensters stören nicht");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
