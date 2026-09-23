/* ==========================================================================
   Vibrato-Analyse

   Aus dem Tonhöhenverlauf eines gehaltenen Tons: wie schnell (Wellen je
   Sekunde), wie tief (Cent von oben bis unten), wie gleichmäßig, ab wann —
   und wo die Welle liegt. Das Saxophon-Vibrato liegt unter dem Ton und kehrt
   auf ihn zurück; eines, das über den Ton hinausgeht, klingt verstimmt,
   auch wenn die Mitte stimmt.

   Das Urteil hängt am Stil. Klassisch: gleichmäßig, eher schmal, vom
   Ansatz an oder bald danach. Pop: langsamer bis ähnlich, breiter, und
   spät — erst gerade, dann Vibrato. Dazu die Metronom-Übung aus dem
   Wissensteil (zwei, drei, vier Wellen je Schlag) und der Shake, der
   eigentlich ein sehr breites, schnelles Vibrato ist.

   Die Zahlen sind Richtwerte aus der Unterrichtspraxis, keine Norm. Tempo,
   Charakter und Lage eines Stücks verschieben sie, und das Ohr entscheidet.
   Deshalb stehen alle Grenzen gesammelt oben, und jedes Urteil sagt, was
   zu ändern wäre — nicht nur, dass etwas außerhalb liegt.

   Gerechnet wird mit Rohwerten der Tonhöhenerkennung. Der Median, den das
   Stimmgerät benutzt, würde genau das glätten, was hier gemessen wird.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

export const STILE = [
  { id: "klassik", name: "Klassisch",
    was: "Gleichmäßig, eher schmal, auf langen Tönen. Richtwert etwa fünf bis sechs Wellen je Sekunde, 15 bis 45 Cent tief." },
  { id: "pop", name: "Pop",
    was: "Erst gerade, dann Vibrato, breiter als klassisch. Richtwert vier bis sechs Wellen je Sekunde, 25 bis 90 Cent, Einsatz nach einer Viertelsekunde oder später." },
  { id: "metronom", name: "Metronom-Übung",
    was: "Eine feste Zahl Wellen je Schlag, zum Metronom. So lernt man die Geschwindigkeit bewusst zu steuern, statt sie dem Zufall zu überlassen." },
  { id: "shake", name: "Shake",
    was: "Schnelles, breites Zittern, im Pop und Funk auf hohen Tönen. Mindestens einen Ganzton breit und fünf bis zwölf Wechsel je Sekunde." },
];

export const GRENZEN = {
  klassik: { rate: [4.5, 6.5], tiefe: [15, 45], gleich: 0.75, oben: 12 },
  pop:     { rate: [4, 6.5], tiefe: [25, 90], gleich: 0.65, oben: 15, einsatz: 250 },
  metronom: { toleranz: 0.08, gleich: 0.7 },
  shake:   { rate: [5, 12], tiefe: [120, 800] },
  vibratoAb: 8,        // darunter ist es Schwanken, kein Vibrato
  mindestDauer: 1000,  // ms
};

const median = xs => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mittel = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const streuung = xs => { const m = mittel(xs); return Math.sqrt(mittel(xs.map(x => (x - m) ** 2))); };

/**
 * Entfernt einzelne Ausreißer: Punkte, die mehr als 150 Cent von ihren
 * Nachbarn abweichen — ein Metronomklick, ein Oktavsprung der Erkennung.
 * Beim Shake nicht, dort sind große Sprünge das, was gemessen wird.
 */
/** Anblasen und Absetzen abschneiden: dort springt die Tonhöhe, und das
    ist weder Vibrato noch Fehler. */
export const ohneRaender = punkte => {
  if (!punkte.length) return punkte;
  const ende = punkte[punkte.length - 1].t;
  return punkte.filter(p => p.t - punkte[0].t > 120 && p.t < ende - 80);
};

export function ohneAusreisser(punkte) {
  return punkte.filter((p, i) => {
    const nachbarn = punkte.slice(Math.max(0, i - 2), i + 3).filter((_, k) => k !== Math.min(i, 2)).map(q => q.midi);
    return !nachbarn.length || Math.abs(p.midi - median(nachbarn)) * 100 <= 150;
  });
}

/**
 * Die Analyse. `punkte` sind `{ t, midi }`, t in Millisekunden, midi als
 * Kommazahl. Gibt null, wenn der Ton zu kurz war.
 */
export function analysiere(punkte, { hysterese = 4 } = {}) {
  if (punkte.length < 20) return null;
  const t0 = punkte[0].t;
  const dauer = punkte[punkte.length - 1].t - t0;
  if (dauer < GRENZEN.mindestDauer) return null;

  const ref = median(punkte.map(p => p.midi));
  const note = Math.round(ref);
  const c = punkte.map(p => (p.midi - ref) * 100);

  // Langsame Drift abziehen: gleitendes Mittel über eine Sekunde. Eine
  // Sekunde, weil ein kürzeres Fenster einen Teil des Vibratos selbst
  // mitnimmt und es dann tiefer aussehen lässt, als es ist.
  const x = c.map((_, i) => {
    const ti = punkte[i].t;
    const fenster = [];
    for (let j = 0; j < punkte.length; j++) if (Math.abs(punkte[j].t - ti) <= 500) fenster.push(c[j]);
    return c[i] - mittel(fenster);
  });

  // Umkehrpunkte mit Hysterese: erst wenn die Kurve um `hysterese` Cent
  // zurückgeht, war das vorige Extrem echt. Sonst zählt jedes Zittern der
  // Erkennung als Welle.
  const ext = [];
  let richtung = 0, maxI = 0, minI = 0;
  for (let i = 1; i < x.length; i++) {
    if (richtung !== -1 && x[i] > x[maxI]) maxI = i;
    if (richtung !== 1 && x[i] < x[minI]) minI = i;
    if (richtung !== -1 && x[maxI] - x[i] > hysterese) {
      ext.push({ i: maxI, typ: 1 });            // es geht abwärts: das war ein Gipfel
      richtung = -1; minI = i;
    } else if (richtung !== 1 && x[i] - x[minI] > hysterese) {
      ext.push({ i: minI, typ: -1 });           // es geht aufwärts: das war ein Tal
      richtung = 1; maxI = i;
    }
  }

  // Die Messpunkte liegen im Raster von etwa 17 ms; ein Umkehrpunkt liegt
  // fast nie genau darauf. Eine Parabel durch den Punkt und seine Nachbarn
  // findet die Spitze dazwischen — ohne das würden 4,8 Wellen je Sekunde
  // als 5,0 gelesen.
  const zeit = i => {
    if (i <= 0 || i >= x.length - 1) return punkte[i].t;
    const a = x[i - 1], b = x[i], d = x[i + 1];
    const nenner = a - 2 * b + d;
    const off = nenner === 0 ? 0 : Math.max(-0.5, Math.min(0.5, 0.5 * (a - d) / nenner));
    const dt = off >= 0 ? punkte[i + 1].t - punkte[i].t : punkte[i].t - punkte[i - 1].t;
    return punkte[i].t + off * dt;
  };
  for (const e of ext) e.t = zeit(e.i);

  const halbe = [];
  for (let k = 1; k < ext.length; k++) {
    const a = ext[k - 1], b = ext[k];
    if (a.typ === b.typ) continue;
    halbe.push({ ab: a.t - t0, bis: b.t - t0, dt: b.t - a.t, tiefe: Math.abs(c[b.i] - c[a.i]) });
  }
  const tragend = halbe.filter(h => h.tiefe >= GRENZEN.vibratoAb);

  if (tragend.length < 4) {
    const schwankung = Math.round(Math.max(...c) - Math.min(...c));
    return { vibrato: false, dauer, schwankung, note, ext: [], kurve: c,
             zeiten: punkte.map(p => p.t - t0), tonLinie: Math.round((note - ref) * 100) };
  }

  // Wo beginnt das Vibrato? Nur dort, wo halbe Wellen tragen und ungefähr
  // so lang sind wie die anderen. Vor einem späten Vibrato findet
  // die Suche im geraden Ton oft einen winzigen Umkehrpunkt; die „halbe
  // Welle“ von dort bis zum ersten echten Gipfel ist dann doppelt so lang
  // und würde Einsatz, Geschwindigkeit und Gleichmäßigkeit verfälschen.
  const typisch = median(tragend.map(h => h.dt));
  const echt = h => h.tiefe >= GRENZEN.vibratoAb && Math.abs(h.dt - typisch) <= typisch * 0.5;

  // Einsatz: die erste Stelle, ab der drei echte halbe Wellen hintereinander
  // kommen. Ein einzelner Wackler am Anfang ist noch kein Vibrato.
  let einsatzIdx = halbe.findIndex(echt);
  for (let k = 0; k + 2 < halbe.length; k++) {
    if (halbe.slice(k, k + 3).every(echt)) { einsatzIdx = k; break; }
  }
  const einsatz = Math.round(halbe[einsatzIdx].ab);
  // Die letzte halbe Welle schneidet das Absetzen ab — sie ist kürzer und
  // flacher als die anderen und würde die Gleichmäßigkeit verfälschen.
  // Ab dem Einsatz zählt jede tragende Welle, auch eine unregelmäßige —
  // genau die soll die Gleichmäßigkeit ja zeigen. Der Dauer-Filter oben
  // dient nur dazu, den Anfang zu finden.
  const alle = halbe.slice(einsatzIdx).filter(h => h.tiefe >= GRENZEN.vibratoAb);
  const ab = alle.length > 5 ? alle.slice(0, -1) : alle;

  // Eine volle Welle sind zwei halbe. Die Geschwindigkeit kommt aus der
  // ganzen Spanne — Zahl der halben Wellen durch ihre Dauer —, das mittelt
  // das Messraster heraus. Die einzelnen Perioden braucht es nur für die
  // Gleichmäßigkeit.
  const perioden = [];
  for (let k = 1; k < ab.length; k++) perioden.push(ab[k].dt + ab[k - 1].dt);
  const spanne = ab[ab.length - 1].bis - ab[0].ab;
  const rate = 1000 * ab.length / 2 / spanne;
  const tiefe = median(ab.map(h => h.tiefe));
  const cvTempo = streuung(perioden) / mittel(perioden);
  const cvTiefe = streuung(ab.map(h => h.tiefe)) / mittel(ab.map(h => h.tiefe));
  // Gleichmäßig heißt: gleich schnell und gleich tief. Wackelt eines von
  // beiden, ist das Vibrato unruhig — deshalb die Summe, nicht das Mittel.
  const gleich = Math.max(0, Math.min(1, 1 - (cvTempo + cvTiefe)));

  // Wo liegt die Welle? Die obere Kante gegen den nächsten Halbton: liegt
  // sie auf ihm, ist das Vibrato darunter; liegt sie deutlich darüber, geht
  // es über den Ton hinaus.
  const abCent = punkte.map(p => (p.midi - note) * 100);
  const nachEinsatz = ext.filter(e => e.t - t0 >= einsatz - 1);
  const oben = median(nachEinsatz.filter(e => e.typ === 1).map(e => abCent[e.i]));
  const unten = median(nachEinsatz.filter(e => e.typ === -1).map(e => abCent[e.i]));

  return {
    vibrato: true, dauer, note,
    rate: Math.round(rate * 10) / 10,
    tiefe: Math.round(tiefe),
    gleich: Math.round(gleich * 100) / 100,
    cvTempo, cvTiefe,
    einsatz,
    oben: Math.round(oben), unten: Math.round(unten),
    wellen: Math.round(ab.length / 2),
    ext: ext.map(e => ({ t: e.t - t0, c: c[e.i], typ: e.typ })),
    kurve: c,
    zeiten: punkte.map(p => p.t - t0),
    // Wo der nächste Halbton in der Kurve liegt: die Linie, unter der ein
    // Saxophon-Vibrato bleiben soll.
    tonLinie: Math.round((note - ref) * 100),
  };
}

/* --- Urteil ----------------------------------------------------------------- */

const komma = x => String(x).replace(".", ",");

/**
 * Urteil für einen Stil. `ziel` ist bei der Metronom-Übung
 * `{ bpm, proSchlag }`. Gibt `{ gut, text, hinweise }`: der Text ist das
 * Wichtigste, die Hinweise alles Weitere, jeweils mit dem, was zu ändern ist.
 */
export function urteil(a, stil, ziel = null) {
  if (!a) return { gut: false, text: "Zu kurz. Halte den Ton mindestens zwei Sekunden.", hinweise: [] };
  if (!a.vibrato) {
    return stil === "shake"
      ? { gut: false, text: `Kein Shake erkannt: die Tonhöhe schwankt nur um ${a.schwankung} Cent. Der Kiefer muss locker und schnell arbeiten, bis der Ton springt.`, hinweise: [] }
      : { gut: false, text: `Kein Vibrato erkannt: die Tonhöhe schwankt um weniger als ${GRENZEN.vibratoAb} Cent je Welle. Die Kieferbewegung darf größer werden.`, hinweise: [] };
  }
  const h = [];
  const r = `${komma(a.rate)} Wellen je Sekunde`;

  if (stil === "metronom" && ziel) {
    const soll = ziel.bpm / 60 * ziel.proSchlag;
    const abw = a.rate / soll - 1;
    const G = GRENZEN.metronom;
    if (a.gleich < G.gleich) h.push(`Ungleichmäßig (${Math.round(a.gleich * 100)} %). Langsamer werden, bis jede Welle gleich ist.`);
    if (Math.abs(abw) > G.toleranz) {
      return { gut: false, text: `${r} statt ${komma(Math.round(soll * 10) / 10)} — ${abw > 0 ? "zu schnell" : "zu langsam"}. ${ziel.proSchlag} Wellen auf jeden Klick, nicht mehr und nicht weniger.`, hinweise: h };
    }
    return { gut: h.length === 0, text: `${r}, genau ${ziel.proSchlag} je Schlag.`, hinweise: h };
  }

  if (stil === "shake") {
    const G = GRENZEN.shake;
    if (a.tiefe < G.tiefe[0]) return { gut: false, text: `Zu schmal für einen Shake: ${a.tiefe} Cent. Er springt zum nächsten Teilton oder Ton, mindestens einen Ganzton.`, hinweise: h };
    if (a.rate < G.rate[0]) return { gut: false, text: `Zu langsam für einen Shake: ${r}. Lockerer, schneller.`, hinweise: h };
    return { gut: true, text: `Shake: ${r}, ${a.tiefe} Cent breit.`, hinweise: h };
  }

  const G = GRENZEN[stil] || GRENZEN.klassik;
  if (a.rate > G.rate[1]) h.push(`Schnell: ${r}. Das klingt nervös; die Bewegung ruhiger machen, mit dem Metronom bei vier je Schlag auf 72 anfangen.`);
  if (a.rate < G.rate[0]) h.push(`Langsam: ${r}. Das klingt nach Schwanken statt nach Vibrato.`);
  if (a.tiefe > G.tiefe[1]) h.push(`Breit: ${a.tiefe} Cent. Kleiner werden — ${stil === "pop" ? "sonst klingt es nach Jammern" : "im klassischen Spiel ist das zu viel"}.`);
  if (a.tiefe < G.tiefe[0]) h.push(`Schmal: ${a.tiefe} Cent. Man hört es kaum; die Kieferbewegung darf größer werden.`);
  if (a.gleich < G.gleich) h.push(`Ungleichmäßig (${Math.round(a.gleich * 100)} %). Gleichmäßigkeit vor Geschwindigkeit — zurück zur Metronom-Übung.`);
  if (a.oben > G.oben) h.push(`Die Welle geht ${a.oben} Cent über den Ton hinaus. Das Saxophon-Vibrato liegt unter dem Ton und kehrt auf ihn zurück.`);
  if (stil === "pop" && a.einsatz < G.einsatz) h.push(`Beginnt sofort. Im Pop erst gerade ansetzen, das Vibrato kommt dazu.`);

  const kern = `${r}, ${a.tiefe} Cent tief, ${Math.round(a.gleich * 100)} % gleichmäßig${a.einsatz ? `, Einsatz nach ${a.einsatz} ms` : ""}.`;
  return { gut: h.length === 0, text: h.length ? h[0] : `Sitzt: ${kern}`, hinweise: h.length ? [kern, ...h.slice(1)] : [] };
}
