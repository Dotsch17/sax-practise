/* ==========================================================================
   Messungen für das Pop-Vokabular

   Was das Mikrofon an Scoop, Fall, Bend, Subtone, Pop-Vibrato und Shake
   wirklich messen kann — und nur das. Growl und Ghost Notes stehen hier
   nicht: dafür gäbe es Zahlen, aber keine, die ein Urteil tragen. Lieber
   keine Messung als eine, die „gut“ sagt, wenn es schlecht klang.

   Eingabe ist ein Versuch als Folge von Messpunkten, wie sie die
   Tonhöhenerkennung liefert: `{ t }` in Millisekunden ab Versuchsbeginn,
   `midi` als Kommazahl, bei Subtone dazu `centroid` und `rms`. Ausgabe
   ist ein Urteil mit Begründung — die Begründung sagt, was zu ändern ist,
   nicht nur, dass es falsch war.

   Die Schwellen sind Richtwerte aus der Praxis, keine Norm. Sie stehen
   hier gesammelt, damit man sie an einer Stelle anpassen kann.

   Kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { analysiere, urteil as vibratoUrteil, ohneAusreisser, ohneRaender } from "./vibrato.js";

export const SCHWELLEN = {
  scoop: { minTiefe: 40, maxTiefe: 300, maxDauer: 350, landen: 20, ueber: 25 },
  fall:  { minTiefe: 100, minStehen: 200 },
  bend:  { minTiefe: 30, maxTiefe: 250, zurueck: 20 },
  subtone: { minDunkler: 0.10, maxAbsacken: 15, maxWackeln: 15 },
};

export const MINDEST_PUNKTE = 6;

const median = xs => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const teil = (xs, von, bis) => xs.slice(Math.floor(xs.length * von), Math.max(Math.floor(xs.length * von) + 1, Math.ceil(xs.length * bis)));
const cent = (a, b) => Math.round((a - b) * 100);

/**
 * Ein Scoop: der Ton beginnt tiefer und gleitet in den Zielton. Gemessen
 * wird, wo er anfängt, wie schnell er ankommt und ob er sauber landet.
 */
export function scoop(punkte) {
  if (punkte.length < MINDEST_PUNKTE) return zuKurz();
  const S = SCHWELLEN.scoop;
  const ziel = median(teil(punkte, 0.5, 1).map(p => p.midi));
  const anfang = median(punkte.slice(0, 2).map(p => p.midi));
  const tiefe = cent(anfang, ziel);
  const idx = punkte.findIndex(p => Math.abs(p.midi - ziel) * 100 < S.landen);
  const dauer = idx < 0 ? Infinity : punkte[idx].t - punkte[0].t;
  const ueber = idx < 0 ? 0 : Math.max(...punkte.slice(idx).map(p => cent(p.midi, ziel)));
  const daneben = cent(ziel, Math.round(ziel));
  const werte = { tiefe, dauer: Number.isFinite(dauer) ? Math.round(dauer) : null, ueber, daneben };

  if (tiefe > -S.minTiefe) return urteil(false, `Kaum ein Scoop: er beginnt nur ${-tiefe} Cent unter dem Ziel. Den Kiefer vor dem Ansetzen weiter fallen lassen — ein halber Ton ist das Ziel.`, werte);
  if (tiefe < -S.maxTiefe) return urteil(false, `Zu tief angesetzt: ${-tiefe} Cent unter dem Ziel. Das klingt nach Sirene; ein halber bis ganzer Ton reicht.`, werte);
  if (dauer > S.maxDauer) return urteil(false, `Zu langsam: ${werte.dauer ?? "über 1000"} ms bis zum Ziel. Ein Scoop ist ein Sechzehntel bis ein Achtel, sonst klingt er wie ein Stöhnen.`, werte);
  if (ueber > S.ueber) return urteil(false, `Schießt ${ueber} Cent über das Ziel hinaus. Der Kiefer geht über die normale Stellung — er soll dorthin zurück, nicht weiter.`, werte);
  if (Math.abs(daneben) > S.landen) return urteil(false, `Der Scoop ist gut, aber der Ton landet ${daneben > 0 ? "+" : ""}${daneben} Cent neben der Mitte.`, werte);
  return urteil(true, `Sauberer Scoop: ${-tiefe} Cent von unten, in ${werte.dauer} ms angekommen, sauber gelandet.`, werte);
}

/**
 * Ein Fall: erst steht der Ton, dann fällt er. Gemessen wird, wie lange er
 * stand und wie tief er fiel. Bei schnellen Falls verliert die Erkennung
 * den Ton oft unterwegs; gemessen wird deshalb „mindestens so tief“.
 */
export function fall(punkte) {
  if (punkte.length < MINDEST_PUNKTE) return zuKurz();
  const S = SCHWELLEN.fall;
  const ton = median(teil(punkte, 0, 0.4).map(p => p.midi));
  const tiefster = Math.min(...teil(punkte, 0.4, 1).map(p => p.midi));
  const tiefe = cent(tiefster, ton);
  const beginn = punkte.findIndex(p => (ton - p.midi) * 100 > 30);
  const stehen = beginn < 0 ? punkte[punkte.length - 1].t - punkte[0].t : punkte[beginn].t - punkte[0].t;
  const werte = { tiefe, stehen: Math.round(stehen) };

  if (tiefe > -S.minTiefe) return urteil(false, `Kaum ein Fall: nur ${-tiefe} Cent nach unten. Am Ende Kiefer und Luft gleichzeitig loslassen, für den langen Fall die Finger mitlaufen lassen.`, werte);
  if (stehen < S.minStehen) return urteil(false, `Der Fall kommt zu früh: der Ton stand nur ${werte.stehen} ms. Erst den Ton, dann die Geste.`, werte);
  return urteil(true, `Fall über mindestens ${(-tiefe / 100).toFixed(1).replace(".", ",")} Halbtöne, nachdem der Ton ${werte.stehen} ms stand.`, werte);
}

/**
 * Ein Bend: der Ton steht, wird hinuntergebogen und kommt zurück. Gemessen
 * wird die Tiefe und ob er wieder ankommt — die Rückkehr ist der schwere
 * Teil.
 */
export function bend(punkte) {
  if (punkte.length < MINDEST_PUNKTE) return zuKurz();
  const S = SCHWELLEN.bend;
  const ton = median(teil(punkte, 0, 0.25).map(p => p.midi));
  const tiefster = Math.min(...punkte.map(p => p.midi));
  const tiefe = cent(tiefster, ton);
  const ende = median(teil(punkte, 0.8, 1).map(p => p.midi));
  const zurueck = cent(ende, ton);
  const werte = { tiefe, zurueck };

  if (tiefe > -S.minTiefe) return urteil(false, `Kaum gebogen: ${-tiefe} Cent. Mehr über den Mundraum — „oh“ — als über den Kiefer.`, werte);
  if (tiefe < -S.maxTiefe) return urteil(false, `Sehr tief gebogen: ${-tiefe} Cent. So bricht der Ton leicht ab; ein Viertel- bis Halbton reicht.`, werte);
  if (Math.abs(zurueck) > S.zurueck) return urteil(false, `Der Bend ist da (${-tiefe} Cent), aber der Ton kommt ${zurueck < 0 ? "nicht ganz zurück" : "zu hoch zurück"}: ${zurueck > 0 ? "+" : ""}${zurueck} Cent. Langsamer zurückführen.`, werte);
  return urteil(true, `Bend um ${-tiefe} Cent und sauber zurück.`, werte);
}

/**
 * Subtone gegen normalen Ton auf derselben Note. Subtone heißt: deutlich
 * dunkler, und die Tonhöhe hält. Der häufigste Fehler ist nicht zu wenig
 * Subtone, sondern ein Ton, der dabei absackt.
 */
export function subtone(normal, sub) {
  if (normal.length < MINDEST_PUNKTE * 2 || sub.length < MINDEST_PUNKTE * 2) return zuKurz();
  const S = SCHWELLEN.subtone;
  const cN = median(normal.map(p => p.centroid).filter(x => x > 0));
  const cS = median(sub.map(p => p.centroid).filter(x => x > 0));
  const dunkler = cN > 0 ? 1 - cS / cN : 0;
  const hN = median(normal.map(p => p.midi));
  const hS = median(sub.map(p => p.midi));
  const absacken = cent(hS, hN);
  const s = sub.map(p => p.midi * 100);
  const mittel = s.reduce((a, b) => a + b, 0) / s.length;
  const wackeln = Math.round(Math.sqrt(s.reduce((a, b) => a + (b - mittel) ** 2, 0) / s.length));
  const werte = { dunkler: Math.round(dunkler * 100), absacken, wackeln };

  if (absacken < -S.maxAbsacken) return urteil(false, `Der Subtone sackt ${-absacken} Cent ab. Der Kiefer ist gefallen, die Luft nicht mitgekommen — etwas mehr Luftstrom, nicht mehr Druck.`, werte);
  if (dunkler < S.minDunkler) return urteil(false, `Kaum dunkler als dein normaler Ton (${werte.dunkler} %). Mehr Unterlippe aufs Blatt, Mundraum auf „oh“, Luft langsamer.`, werte);
  if (wackeln > S.maxWackeln) return urteil(false, `Dunkler, aber unruhig: die Tonhöhe schwankt um ${wackeln} Cent. Luft gleichmäßiger, der Ansatz bleibt still.`, werte);
  return urteil(true, `${werte.dunkler} % dunkler als dein normaler Ton, und die Tonhöhe hält.`, werte);
}

function urteil(gut, text, werte) { return { gut, text, werte }; }
function zuKurz() { return { gut: false, text: "Zu kurz gemessen. Länger spielen, und näher ans Telefon.", werte: {} }; }

/* Pop-Vibrato und Shake misst die Vibrato-Analyse; hier nur das Urteil
   im Stil des Pop-Lehrgangs. */
function mitVibrato(stil) {
  return punkte => {
    const kern = ohneRaender(punkte);
    const a = analysiere(stil === "shake" ? kern : ohneAusreisser(kern));
    const u = vibratoUrteil(a, stil);
    return { gut: u.gut, text: u.text, werte: a?.vibrato ? { rate: a.rate, tiefe: a.tiefe, einsatz: a.einsatz } : {} };
  };
}

export const MESSUNGEN = { scoop, fall, bend, vibrato: mitVibrato("pop"), shake: mitVibrato("shake") };
