/* Prüft js/music/vibrato.js. Läuft mit `node tools/test-vibrato.mjs`.

   Die Analyse wird mit gebauten Tonhöhenverläufen geprüft, so wie die
   Tonhöhenerkennung sie liefert: ungleichmäßiges Raster, etwas Rauschen,
   manchmal eine Drift. Geschwindigkeit und Tiefe müssen dabei stimmen, und
   jedes Urteil muss sagen, was zu ändern ist. */

import * as V from "../js/music/vibrato.js";

let n = 0, fail = 0;
const ok = (b, m) => { n++; if (!b) { fail++; console.log("  FAIL " + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b),
  `${m}\n         erwartet ${JSON.stringify(b)}\n         bekommen ${JSON.stringify(a)}`);

let seed = 11;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/**
 * Ein Vibrato unter dem Ton: die obere Kante liegt auf `versatz` Cent, die
 * Welle geht `tiefe` Cent darunter. `raster` ist der Abstand der
 * Messpunkte, mit Zittern wie bei requestAnimationFrame.
 */
function ton({ hz = 5, tiefe = 30, dauer = 2500, einsatz = 0, versatz = 0, rauschen = 2, raster = 16.7,
               drift = 0, taumel = 0 } = {}) {
  const p = [];
  let phase = 0, tAlt = 0;
  for (let t = 0; t <= dauer; t += raster + (rng() - 0.5) * raster * 0.2) {
    const f = hz * (1 + taumel * Math.sin(t / 170));
    phase += 2 * Math.PI * f * (t - tAlt) / 1000;
    tAlt = t;
    const a = t < einsatz ? 0 : tiefe / 2;
    const c = versatz - a + a * Math.cos(phase) + drift * t / dauer + (rng() - 0.5) * rauschen;
    p.push({ t, midi: 67 + c / 100 });
  }
  return p;
}

console.log("Geschwindigkeit und Tiefe");
{
  for (const hz of [3.5, 4.2, 4.8, 5.5, 6.3, 7.5, 9]) {
    for (const tiefe of [12, 25, 45, 80]) {
      const a = V.analysiere(ton({ hz, tiefe }));
      ok(a && a.vibrato, `${hz} Hz, ${tiefe} Cent: erkannt`);
      if (!a?.vibrato) continue;
      ok(Math.abs(a.rate - hz) <= 0.15, `${hz} Hz, ${tiefe} Cent: Geschwindigkeit ${a.rate}`);
      ok(Math.abs(a.tiefe - tiefe) <= Math.max(4, tiefe * 0.12), `${hz} Hz, ${tiefe} Cent: Tiefe ${a.tiefe}`);
      ok(a.gleich >= (tiefe < 20 ? 0.7 : 0.85), `${hz} Hz, ${tiefe} Cent: gleichmäßig ${a.gleich}`);
    }
  }
  // Mit dem langsameren Raster des Stimmgeräts: schlechter, aber brauchbar.
  const langsam = V.analysiere(ton({ hz: 5, tiefe: 35, raster: 33.3 }));
  ok(langsam.vibrato && Math.abs(langsam.rate - 5) <= 0.25, `bei 30 Messungen je Sekunde noch ${langsam.rate} Hz`);
}

console.log("\nKein Vibrato, zu kurz, Störungen");
{
  const gerade = V.analysiere(ton({ tiefe: 0, rauschen: 4 }));
  eq(gerade.vibrato, false, "ein gerader Ton mit Messrauschen ist kein Vibrato");
  eq(V.analysiere(ton({ dauer: 600 })), null, "unter einer Sekunde wird nicht geurteilt");
  const drift = V.analysiere(ton({ hz: 5, tiefe: 30, drift: 40 }));
  ok(drift.vibrato && Math.abs(drift.rate - 5) <= 0.15 && Math.abs(drift.tiefe - 30) <= 5,
     `ein Ton, der dabei 40 Cent steigt, stört die Messung nicht (${drift.rate} Hz, ${drift.tiefe} Cent)`);
  const unruhig = V.analysiere(ton({ hz: 5, tiefe: 30, taumel: 0.35 }));
  const ruhig = V.analysiere(ton({ hz: 5, tiefe: 30 }));
  ok(unruhig.gleich < V.GRENZEN.klassik.gleich && ruhig.gleich >= 0.9,
     `schwankende Geschwindigkeit senkt die Gleichmäßigkeit unter die Grenze (${unruhig.gleich} gegen ${ruhig.gleich})`);
  ok(!V.urteil(unruhig, "klassik").gut, "und das Urteil sagt es");

  const mitKlick = ton({ hz: 5, tiefe: 30 });
  mitKlick[40] = { ...mitKlick[40], midi: mitKlick[40].midi + 12 };
  mitKlick[80] = { ...mitKlick[80], midi: mitKlick[80].midi - 5 };
  const gereinigt = V.ohneAusreisser(mitKlick);
  eq(mitKlick.length - gereinigt.length, 2, "ein Oktavsprung und ein Klick werden entfernt");
  const sauber = ton({ hz: 5, tiefe: 30 });
  eq(V.ohneAusreisser(sauber).length, sauber.length, "ein sauberes Vibrato bleibt vollständig");
}

console.log("\nEinsatz und Lage");
{
  const spaet = V.analysiere(ton({ hz: 5, tiefe: 50, einsatz: 700 }));
  ok(Math.abs(spaet.einsatz - 700) <= 120, `spätes Vibrato: Einsatz nach ${spaet.einsatz} ms`);
  const frueh = V.analysiere(ton({ hz: 5, tiefe: 50 }));
  ok(frueh.einsatz <= 120, `sofortiges Vibrato: Einsatz ${frueh.einsatz} ms`);

  const unter = V.analysiere(ton({ hz: 5, tiefe: 30, versatz: 0 }));
  ok(Math.abs(unter.oben) <= 6, `Vibrato unter dem Ton: obere Kante auf dem Ton (${unter.oben})`);
  const um = V.analysiere(ton({ hz: 5, tiefe: 40, versatz: 20 }));
  ok(um.oben >= 15, `Vibrato um den Ton herum: obere Kante darüber (${um.oben})`);
}

console.log("\nSpätes Vibrato nach geradem Ton");
{
  // So sah es mit echter Tonhöhenerkennung aus: im geraden Teil findet die
  // Suche einen winzigen Umkehrpunkt, und die „halbe Welle“ bis zum ersten
  // echten Gipfel ist doppelt so lang. Sie darf nicht mitzählen.
  const p = [];
  for (let t = 0; t <= 2900; t += 16.7) {
    const imVibrato = t >= 700;
    const zappel = t > 240 && t < 260 ? -3 : 0;
    const c = imVibrato ? 28 * Math.cos(2 * Math.PI * 5 * (t - 700) / 1000) : zappel + (rng() - 0.5) * 1;
    p.push({ t, midi: 67 + c / 100 });
  }
  const a = V.analysiere(p);
  ok(Math.abs(a.rate - 5) <= 0.15, `Geschwindigkeit bleibt bei 5 (${a.rate})`);
  ok(a.gleich >= 0.85, `gleichmäßig (${a.gleich})`);
  ok(a.einsatz >= 600 && a.einsatz <= 800, `Einsatz beim ersten echten Gipfel (${a.einsatz} ms)`);
}

console.log("\nUrteile");
{
  const gut = V.urteil(V.analysiere(ton({ hz: 5.5, tiefe: 30 })), "klassik");
  ok(gut.gut && /Sitzt/.test(gut.text), `klassisch sauber: ${gut.text}`);
  const schnell = V.urteil(V.analysiere(ton({ hz: 7.5, tiefe: 30 })), "klassik");
  ok(!schnell.gut && /Schnell/.test(schnell.text) && /Metronom/.test(schnell.text), "zu schnell: mit Weg zurück");
  const breit = V.urteil(V.analysiere(ton({ hz: 5.5, tiefe: 70 })), "klassik");
  ok(!breit.gut && /Breit/.test(breit.text), "zu breit für klassisch");
  const breitPop = V.urteil(V.analysiere(ton({ hz: 5, tiefe: 70, einsatz: 600 })), "pop");
  ok(breitPop.gut, `dasselbe breite, späte Vibrato ist im Pop richtig (${breitPop.text})`);
  const sofortPop = V.urteil(V.analysiere(ton({ hz: 5, tiefe: 60 })), "pop");
  ok(!sofortPop.gut && sofortPop.hinweise.concat(sofortPop.text).some(h => /sofort/.test(h)), "im Pop: sofortiges Vibrato wird angemerkt");
  const ueber = V.urteil(V.analysiere(ton({ hz: 5.5, tiefe: 30, versatz: 20 })), "klassik");
  ok(!ueber.gut && [ueber.text, ...ueber.hinweise].some(h => /über den Ton/.test(h)), "Vibrato über dem Ton wird angemerkt");

  // Metronom: 72 bpm, vier Wellen je Schlag sind 4,8 Hz.
  const takt = V.urteil(V.analysiere(ton({ hz: 4.8, tiefe: 30 })), "metronom", { bpm: 72, proSchlag: 4 });
  ok(takt.gut && /genau 4 je Schlag/.test(takt.text), `Metronom getroffen: ${takt.text}`);
  const daneben = V.urteil(V.analysiere(ton({ hz: 5.6, tiefe: 30 })), "metronom", { bpm: 72, proSchlag: 4 });
  ok(!daneben.gut && /zu schnell/.test(daneben.text), `Metronom verfehlt: ${daneben.text}`);

  const shake = V.urteil(V.analysiere(ton({ hz: 8, tiefe: 300 })), "shake");
  ok(shake.gut && /Shake/.test(shake.text), `Shake: ${shake.text}`);
  const kleinShake = V.urteil(V.analysiere(ton({ hz: 8, tiefe: 40 })), "shake");
  ok(!kleinShake.gut && /schmal/.test(kleinShake.text), "ein schmales schnelles Vibrato ist kein Shake");

  ok(/kurz/i.test(V.urteil(null, "klassik").text), "zu kurz hat eine eigene Meldung");
  ok(/Kein Vibrato/.test(V.urteil(V.analysiere(ton({ tiefe: 0 })), "klassik").text), "kein Vibrato hat eine eigene Meldung");
  ok(V.STILE.every(s => s.name && s.was), "jeder Stil erklärt sich");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen` : `\nAlle ${n} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
