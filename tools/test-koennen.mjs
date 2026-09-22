/* Prüft das Können-Profil: was als Schwäche zählt, was als zu dünne
   Datenlage durchgeht, und dass der Übe-Kontext filtert. */

import * as K from "../js/core/koennen.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} (war ${JSON.stringify(a)}, erwartet ${JSON.stringify(b)})`);
const hat = (liste, id) => liste.some(b => b.id === id);

const S = (drills = {}) => ({ drills });
const q = (right, wrong) => ({ right, wrong, streak: 0, bestStreak: 0 });

/* Ein Zustand, in dem überall genug und gut geübt wurde — die Grundlage, von
   der aus jeder einzelne Befund gezielt ausgelöst wird. */
function satt() {
  const d = {};
  for (const k of ["C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "H-Dur", "Fis-Dur",
                   "F-Dur", "B-Dur", "Es-Dur", "As-Dur", "Des-Dur", "Ges-Dur"]) {
    d[`skala:dur:${k}`] = q(20, 1);
  }
  d["gehoer:intervalle:leicht"] = q(20, 1);
  d["hoertest:melodie:tonal:1"] = q(20, 1);
  d["nachspielen:3"] = q(20, 1);
  d["rhythmus:2"] = q(20, 1);
  d["blattspiel:3"] = q(20, 1);
  d["obertoene:58"] = { hoechster: 7 };
  d["tonartfinden:mittel"] = { ...q(20, 1), schnellste: 6 };
  d["songmitspielen:liste"] = { songs: [{ id: "a", titel: "x" }] };
  d["stimmgeraet:noten"] = { "60": { n: 10, mean: 2, m2: 400, min: -5, max: 8 } };
  return d;
}

console.log("Ein satter Zustand meldet nichts");
{
  const b = K.befunde(S(satt()));
  eq(b.length, 0, "keine Befunde, wenn überall gut und genug geübt wurde");
  eq(K.naechsterSchritt(S(satt())), null, "und damit auch kein nächster Schritt");
}

console.log("\nHörtest und Tonleitern, wie die Werkzeuge sie speichern");
{
  const d = satt();
  delete d["hoertest:melodie:tonal:1"];
  d["hoertest:fehler:akkorde"] = { "dur:1": 4 };
  const b = K.befunde(S(d));
  ok(hat(b, "hoertest:nie"), "ohne einen einzigen Hörtest meldet sich der Prüfungsteil");
  eq(b.find(x => x.id === "hoertest:nie").ziel.tool, "hoertest", "und führt in den Hörtest");

  d["hoertest:rhythmus:2"] = q(2, 9);
  const b2 = K.befunde(S(d));
  ok(!hat(b2, "hoertest:nie"), "nach dem ersten Versuch nicht mehr");
  ok(/Rhythmusdiktate/.test(b2.find(x => x.id === "gehoer:schwach")?.titel || ""),
     "ein schwaches Rhythmusdiktat wird beim Namen genannt");

  // Das Tonleiter-Werkzeug speichert count und bestBpm, nicht richtig und
  // falsch. Abgehakt heißt geübt.
  const t = satt();
  t["skala:dur:Ges-Dur"] = { count: 2, bestBpm: 80 };
  ok(!hat(K.befunde(S(t)), "skalen:fehlen"), "eine abgehakte Tonleiter gilt als geübt");
  t["skala:dur:Ges-Dur"] = { count: 0 };
  ok(hat(K.befunde(S(t)), "skalen:fehlen"), "eine mit null Mal abgehakt nicht");
  const alle = K.befunde(S({}));
  ok(alle.every(x => x.ziel.tool !== "gehoer"), "kein Vorschlag führt auf die alte Werkzeug-id");
}

console.log("\nZu dünne Datenlage ist kein Urteil");
{
  const d = satt();
  d["gehoer:intervalle:leicht"] = q(0, 3);        // 0 %, aber nur drei Versuche
  const b = K.befunde(S(d));
  ok(!hat(b, "gehoer:schwach"), "drei Fehlversuche sind noch keine Schwäche");

  d["gehoer:intervalle:leicht"] = q(1, 9);        // zehn Versuche, 10 %
  const b2 = K.befunde(S(d));
  ok(hat(b2, "gehoer:schwach"), "bei genug Versuchen wird daraus ein Befund");
  eq(K.GENUG, 6, "die Schwelle steht an einer Stelle");
}

console.log("\nEin leerer Eintrag ist kein geübter Ton");
{
  // Das Öffnen eines Werkzeugs legt Einträge an, ohne dass etwas gespielt
  // wurde. Wer das als geübt zählt, meldet nie wieder eine Lücke.
  const d = satt();
  d["skala:dur:Ges-Dur"] = {};
  d["skala:dur:Des-Dur"] = q(0, 0);
  const b = K.befunde(S(d));
  ok(hat(b, "skalen:fehlen"), "leere Einträge gelten weiter als ungeübt");
  ok(/2 Tonarten/.test(b.find(x => x.id === "skalen:fehlen").titel), "und zwar beide");

  const e = satt();
  e["obertoene:58"] = { hoechster: 0 };
  ok(hat(K.befunde(S(e)), "obertoene:nie"),
     "ein Obertoneintrag ohne erreichten Teilton zählt als nie geübt");
}

console.log("\nNie geübte Tonarten wiegen schwerer als mäßige Quoten");
{
  const d = satt();
  delete d["skala:dur:Ges-Dur"];
  delete d["skala:dur:Des-Dur"];
  const b = K.befunde(S(d));
  ok(hat(b, "skalen:fehlen"), "fehlende Tonarten werden gemeldet");
  const f = b.find(x => x.id === "skalen:fehlen");
  ok(/2 Tonarten/.test(f.titel), "die Anzahl steht im Titel: " + f.titel);
  ok(/Des-Dur|Ges-Dur/.test(f.grund), "und eine davon wird beim Namen genannt");
}

console.log("\nIntonation: Richtung und Streuung sind zwei Befunde");
{
  const d = satt();
  d["stimmgeraet:noten"] = { "62": { n: 12, mean: -18.4, m2: 12 * 25, min: -30, max: -6 } };
  const b = K.befunde(S(d));
  const i = b.find(x => x.id === "intonation:ton");
  ok(!!i, "eine systematische Abweichung wird gemeldet");
  ok(/18 Cent zu tief/.test(i.titel), "Betrag und Richtung stehen im Titel: " + i.titel);
  eq(i.midi, 62, "der Griff wird mitgegeben");

  // Kleine Abweichung, aber grosse Streuung: das ist der andere Fall.
  d["stimmgeraet:noten"] = { "62": { n: 12, mean: 1, m2: 11 * 30 * 30, min: -40, max: 45 } };
  const b2 = K.befunde(S(d));
  ok(!hat(b2, "intonation:ton"), "ein Mittelwert um null ist kein Befund");
  ok(hat(b2, "intonation:streuung"), "die Streuung dagegen schon");
  eq(b2.find(x => x.id === "intonation:streuung").ziel.tool, "bordun",
     "gegen Streuung hilft der Bordun, nicht das Stimmgerät");

  // Zwei Messungen reichen fuer kein Urteil.
  d["stimmgeraet:noten"] = { "62": { n: 2, mean: -40, m2: 100, min: -45, max: -35 } };
  ok(K.befunde(S(d)).every(x => !x.id.startsWith("intonation")),
     "unter drei Messungen wird nichts über einen Ton gesagt");
}

console.log("\nObertöne");
{
  const d = satt();
  delete d["obertoene:58"];
  ok(hat(K.befunde(S(d)), "obertoene:nie"), "nie geübt wird gemeldet");

  d["obertoene:58"] = { hoechster: 3 };
  const b = K.befunde(S(d));
  const o = b.find(x => x.id === "obertoene:hoeher");
  ok(!!o && /Teilton 4/.test(o.titel), "der nächste Teilton steht im Titel: " + o?.titel);

  d["obertoene:58"] = { hoechster: 6 };
  ok(!hat(K.befunde(S(d)), "obertoene:hoeher"), "ab Teilton 6 ist Ruhe");
}

console.log("\nImprovisation: erst richtig, dann schnell");
{
  const d = satt();
  d["tonartfinden:mittel"] = { ...q(5, 10), schnellste: 4 };
  const b = K.befunde(S(d));
  ok(hat(b, "impro:tonart-quote"), "eine schlechte Quote wird gemeldet");
  ok(!hat(b, "impro:tonart-zeit"), "über die Zeit wird dann noch nicht geredet");

  d["tonartfinden:mittel"] = { ...q(18, 2), schnellste: 31 };
  const b2 = K.befunde(S(d));
  ok(!hat(b2, "impro:tonart-quote"), "eine gute Quote ist kein Befund");
  ok(hat(b2, "impro:tonart-zeit"), "die Zeit wird erst danach zum Thema");
  ok(/31 Sekunden/.test(b2.find(x => x.id === "impro:tonart-zeit").titel), "mit der echten Zahl");
}

console.log("\nDer Übe-Kontext filtert");
{
  const d = satt();
  delete d["obertoene:58"];
  d["stimmgeraet:noten"] = { "62": { n: 12, mean: -25, m2: 300, min: -30, max: -20 } };

  const laut = K.befunde(S(d), "probelokal");
  ok(hat(laut, "obertoene:nie"), "im Probelokal stehen Obertöne zur Debatte");
  ok(hat(laut, "intonation:ton"), "und die Intonation auch");

  const ts = K.befunde(S(d), "travelsax");
  ok(!hat(ts, "obertoene:nie"), "am Travel Sax nicht — dort gehen sie schlicht nicht");
  ok(ts.every(x => x.ziel.tool !== "stimmgeraet"), "und das Stimmgerät ebenso wenig");
  ok(ts.length < laut.length, "es bleibt weniger übrig, aber nicht nichts");
}

console.log("\nDie Reihenfolge stimmt");
{
  const d = satt();
  delete d["obertoene:58"];                        // Gewicht 0.8
  d["rhythmus:2"] = q(14, 6);                      // 70 %, Gewicht 0.15
  const b = K.befunde(S(d));
  ok(b.length >= 2, "beide Befunde sind da");
  eq(b[0].id, "obertoene:nie", "das Schwerere steht vorn");
  eq(K.naechsterSchritt(S(d)).id, "obertoene:nie", "und ist der nächste Schritt");
  ok(b.every((x, i) => i === 0 || b[i - 1].gewicht >= x.gewicht), "absteigend sortiert");
}

console.log("\nJeder Befund ist vollständig");
{
  const d = satt();
  delete d["obertoene:58"];
  delete d["skala:dur:Ges-Dur"];
  d["gehoer:intervalle:leicht"] = q(2, 10);
  d["tonartfinden:mittel"] = { ...q(3, 9), schnellste: 40 };
  const b = K.befunde(S(d));
  ok(b.length >= 4, `mehrere Befunde (${b.length})`);
  for (const x of b) {
    ok(!!x.id && !!x.titel && !!x.grund, "id, Titel und Grund sind da: " + x.id);
    ok(!!x.ziel && !!x.ziel.tab && !!x.ziel.tool, "ein Ziel zum Hinspringen: " + x.id);
    ok(x.gewicht > 0 && x.gewicht <= 1, `Gewicht im Bereich 0 bis 1: ${x.id} = ${x.gewicht}`);
    ok(x.grund.length > 40, "der Grund ist ein Satz, kein Etikett: " + x.id);
  }
}

console.log("\nAusgelassene Blöcke");
{
  const bloecke = [{ name: "Obertöne" }, { name: "Lange Töne" }, { name: "Etüde" }];
  const log = Array.from({ length: 10 }, (_, i) => ({
    blocks: i < 9 ? ["Lange Töne", "Etüde"] : ["Lange Töne", "Etüde", "Obertöne"],
  }));
  const aus = K.ausgelasseneBloecke(log, bloecke);
  eq(aus.length, 1, "genau ein Block fällt auf");
  eq(aus[0].name, "Obertöne", "und zwar der richtige");
  eq(aus[0].ausgelassen, 9, "neunmal von zehn ausgelassen");
  eq(K.ausgelasseneBloecke([], bloecke).length, 0, "ohne Protokoll keine Aussage");
  eq(K.ausgelasseneBloecke(log, []).length, 0, "ohne Blöcke auch nicht");
}

console.log("\nDatenlage ist Datenlage, kein Können");
{
  const leer = K.datenlage(S({}));
  eq(leer.length, 4, "vier Bereiche");
  ok(leer.every(x => x.stand === 0), "ohne Daten steht überall null");
  const voll = K.datenlage(S(satt()));
  ok(voll.find(x => x.id === "technik").stand > 0.5, "viel geübte Technik schlägt durch");
  ok(voll.every(x => x.stand <= 1), "und bleibt bei eins gedeckelt");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
