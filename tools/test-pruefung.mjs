/* Prüft js/data/pruefung.js: die Anforderungen der Zulassungsprüfung und
   den Zeitplan rückwärts vom Prüfungstag. Läuft mit
   `node tools/test-pruefung.mjs`. */

import * as P from "../js/data/pruefung.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

console.log("Die Anforderungen sind vollständig");
{
  eq(P.TEILE.map(t => t.id), ["sax", "klavier", "hoeren"], "drei Prüfungsteile");
  const sax = P.TEILE[0].punkte;
  eq(sax.filter(p => p.art === "stueck").length, 3, "drei Stücke mit Improvisation");
  eq(sax.filter(p => p.art === "etuede").length, 2, "zwei Etüden, oder eine und eine Transkription");
  ok(sax.some(p => p.id === "tonleitern" && p.art === "abdeckung"), "Tonleitern zählt die App selbst");
  ok(sax.some(p => p.id === "blattlesen"), "Blattlesen am Saxophon");
  const kl = P.TEILE[1].punkte;
  eq(kl.filter(p => p.art === "klavier").length, 2, "zwei Klavierstücke");
  ok(kl.some(p => p.id === "kadenzen" && /II–V–I/.test(p.was)), "Kadenzen mit II–V–I");
  ok(P.TEILE[2].punkte.some(p => /Umkehrungen/.test(p.was)), "Akkorde mit Umkehrungen im Hörtest");
  ok(P.ALLE_PUNKTE.every(p => P.STUFEN[p.art] || p.art === "abdeckung"), "jede Art hat Stufen");
  ok(Object.values(P.STUFEN).flat().every(s => s.label && s.fertig), "jede Stufe hat ein „fertig, wenn“");
  ok(P.QUELLEN.every(q => q.url.startsWith("https://")), "Quellen sind verlinkt");
}

console.log("\nTermin");
{
  eq(P.termin({}), { datum: P.TERMIN_GESCHAETZT, geschaetzt: true }, "ohne Eintrag geschätzt");
  eq(P.termin({ "pruefung:termin": { datum: "2027-06-14" } }), { datum: "2027-06-14", geschaetzt: false }, "eingetragen");
  eq(P.termin({ "pruefung:termin": { datum: "quatsch" } }).geschaetzt, true, "Unsinn fällt auf die Schätzung zurück");
  eq(P.tageBis("2026-09-22", "2027-06-01"), 252, "Tage bis zur Prüfung");
  eq(P.tageBis("2027-03-27", "2027-03-29"), 2, "über die Zeitumstellung hinweg");
}

console.log("\nZeitplan rückwärts");
{
  const m = P.meilensteine("2027-06-01");
  ok(m.every((x, i) => i === 0 || m[i - 1].datum <= x.datum), "zeitlich sortiert");
  ok(m.every(x => x.datum < "2027-06-01"), "alles vor dem Prüfungstag");
  eq(m[0].titel, "Programm steht", "zuerst wird gewählt");
  eq(m[0].datum, "2026-10-01", "acht Monate vorher");
  ok(m.some(x => x.titel === "Anmeldung" && x.datum === "2027-03-01"), "die Anmeldung steht im März");
  eq(m[m.length - 1].datum, "2027-05-25", "eine Woche vorher nichts Neues mehr");
  const soll = m.filter(x => x.soll !== null).map(x => x.soll);
  ok(soll.every((s, i) => i === 0 || soll[i - 1] <= s), "die Soll-Stufe steigt nur");

  // Monatsende: vom 31. zurück landet man nicht im Folgemonat.
  const ende = P.meilensteine("2027-05-31");
  ok(ende.some(x => x.datum === "2027-02-28"), "31. Mai minus drei Monate ist der 28. Februar");

  eq(P.sollStufe("2027-06-01", "2026-09-22"), -1, "heute ist noch nichts fällig");
  eq(P.sollStufe("2027-06-01", "2026-10-01"), 0, "ab Oktober: gewählt");
  eq(P.sollStufe("2027-06-01", "2027-02-15"), 3, "Mitte Februar: Solo über die Form");
  eq(P.sollStufe("2027-06-01", "2027-05-20"), 5, "im Mai: prüfungsreif");
  eq(P.naechsterMeilenstein("2027-06-01", "2026-09-22").titel, "Programm steht", "als Nächstes: das Programm");
  eq(P.naechsterMeilenstein("2027-06-01", "2027-06-02"), null, "nach der Prüfung nichts mehr");
}

console.log("\nHinweise zum Programm");
{
  const d = (stuecke) => Object.fromEntries(stuecke.map((s, i) => [`pruefung:stueck${i + 1}`, s]));
  eq(P.hinweise({}, "2026-09-22"), [], "leer, solange nichts eingetragen ist");

  const swing = P.hinweise(d([
    { titel: "Oleo", stil: "Bebop" },
    { titel: "There Will Never Be Another You", stil: "Swing" },
    { titel: "Straight, No Chaser", stil: "Blues" },
  ]), "2026-09-22");
  ok(swing.some(h => /nach einer Stilrichtung/.test(h)), "drei Swing-Stücke werden angemerkt");
  ok(swing.some(h => /Ballade/.test(h)), "und die fehlende Ballade");

  const doppelt = P.hinweise(d([{ titel: "A", stil: "Swing" }, { titel: "B", stil: "Swing" }]), "2026-09-22");
  ok(doppelt.some(h => /dieselbe Stilrichtung/.test(h)), "doppelte Stilrichtung");

  const gut = P.hinweise(d([
    { titel: "Oleo", stil: "Bebop" },
    { titel: "Body and Soul", stil: "Ballade" },
    { titel: "Chameleon", stil: "Funk / Soul" },
  ]), "2026-09-22");
  eq(gut, [], "ein gemischtes Programm mit Ballade braucht keinen Hinweis");

  const spaet = P.hinweise(d([{ titel: "Oleo", stil: "Bebop", stufe: 0 }]), "2027-01-15");
  ok(spaet.some(h => /hinter dem Zeitplan/.test(h) && /Oleo/.test(h)), "was hinterherhängt, wird genannt");
}

console.log("\nProgrammtitel");
{
  eq(P.programmTitel({}), [], "leer");
  eq(P.programmTitel({ "pruefung:stueck1": { titel: "Oleo" }, "pruefung:klavier1": { titel: "Menuett" },
    "pruefung:kadenzen": { titel: "zählt nicht" } }), ["Oleo", "Menuett"], "nur Stücke, Etüden und Klavierstücke");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
