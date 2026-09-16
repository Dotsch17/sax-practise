/* Prüft den YIN-Detektor mit gerechneten Signalen. Das Mikrofon braucht es
   dafür nicht — und genau die Fälle, die am Gerät schwer zu provozieren
   sind, lassen sich hier gezielt bauen: ein Ton, dessen zweiter Teilton
   lauter ist als der Grundton, ist beim Saxophon der Normalfall und bringt
   einfache Autokorrelation zuverlässig zum Oktavsprung. */

import { yin, rmsOf, spektrum } from "../js/audio/pitch.js";
import { midiToFreq, freqToMidi } from "../js/music/theory.js";

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { console.log("  FAIL " + m); fail++; } };
const eq = (a, b, m) => ok(a === b, `${m} (erwartet ${b}, bekommen ${a})`);

const SR = 48000;
const LEN = 2048;

/** Baut ein Fenster aus Teiltönen: partials = [[Vielfaches, Amplitude], ...] */
function signal(f0, partials, opts = {}) {
  const { noise = 0, phase = 0.3, sr = SR, len = LEN } = opts;
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (const [mult, amp] of partials) {
      v += amp * Math.sin(2 * Math.PI * f0 * mult * (i / sr) + phase * mult);
    }
    if (noise) v += noise * (Math.random() * 2 - 1);
    x[i] = v * 0.3;
  }
  return x;
}

function detect(x, sr = SR) {
  const { tau, clarity } = yin(x, sr);
  return { freq: tau > 0 ? sr / tau : null, clarity };
}

const centsBetween = (a, b) => 1200 * Math.log2(a / b);

console.log("\nReine Sinustöne über den ganzen Umfang");
// Klingend Des3 bis A5, plus Altissimo darüber.
for (let midi = 49; midi <= 93; midi += 2) {
  const f = midiToFreq(midi);
  const { freq, clarity } = detect(signal(f, [[1, 1]]));
  ok(freq !== null, `MIDI ${midi} (${f.toFixed(1)} Hz) wird erkannt`);
  if (freq) {
    const err = Math.abs(centsBetween(freq, f));
    ok(err < 5, `MIDI ${midi}: Abweichung ${err.toFixed(2)} Cent unter 5`);
    ok(clarity > 0.8, `MIDI ${midi}: clarity ${clarity.toFixed(2)} über 0,8`);
  }
}

console.log("\nSaxophonähnliches Spektrum");
// Viele Teiltöne, wie sie ein kräftig geblasener Ton hat.
const SAX = [[1, 1], [2, 0.8], [3, 0.6], [4, 0.45], [5, 0.3], [6, 0.2], [7, 0.12]];
for (const midi of [49, 55, 61, 67, 73, 79, 85]) {
  const f = midiToFreq(midi);
  const { freq } = detect(signal(f, SAX));
  ok(freq !== null && Math.abs(centsBetween(freq, f)) < 8,
     `MIDI ${midi}: Grundton gefunden (${freq ? freq.toFixed(1) : "nichts"} statt ${f.toFixed(1)} Hz)`);
}

console.log("\nDer kritische Fall: zweiter Teilton lauter als der Grundton");
// Genau hier springt einfache Autokorrelation in die Oktave.
for (const midi of [49, 53, 58, 63, 68]) {
  const f = midiToFreq(midi);
  const { freq } = detect(signal(f, [[1, 0.35], [2, 1.0], [3, 0.7], [4, 0.5]]));
  ok(freq !== null, `MIDI ${midi}: überhaupt erkannt`);
  if (freq) {
    const err = centsBetween(freq, f);
    ok(Math.abs(err) < 15,
       `MIDI ${midi}: kein Oktavsprung (${err.toFixed(0)} Cent daneben, ${freq.toFixed(1)} statt ${f.toFixed(1)} Hz)`);
  }
}

console.log("\nGrundton fast weg, wie im flachen pp");
for (const midi of [55, 62, 70]) {
  const f = midiToFreq(midi);
  const { freq } = detect(signal(f, [[1, 0.08], [2, 1.0], [3, 0.8], [4, 0.6], [5, 0.4]]));
  ok(freq !== null && Math.abs(centsBetween(freq, f)) < 20,
     `MIDI ${midi}: Grundton auch bei schwachem ersten Teilton (${freq ? freq.toFixed(1) : "nichts"} statt ${f.toFixed(1)})`);
}

console.log("\nVerstimmte Töne werden als verstimmt gemessen");
for (const cents of [-40, -25, -12, 12, 25, 40]) {
  const f = midiToFreq(69) * Math.pow(2, cents / 1200);
  const { freq } = detect(signal(f, SAX));
  const gemessen = Math.round(centsBetween(freq, midiToFreq(69)));
  ok(Math.abs(gemessen - cents) < 5,
     `${cents} Cent werden als ${gemessen} Cent gemessen`);
}

console.log("\nRauschen und Stille");
{
  const noise = new Float32Array(LEN);
  for (let i = 0; i < LEN; i++) noise[i] = (Math.random() * 2 - 1) * 0.3;
  const { freq, clarity } = detect(noise);
  ok(freq === null || clarity < 0.75, `reines Rauschen liefert keine sichere Tonhöhe (clarity ${clarity.toFixed(2)})`);

  const still = new Float32Array(LEN);
  ok(rmsOf(still) === 0, "Stille hat den Pegel 0");
  ok(rmsOf(signal(440, [[1, 1]])) > 0.1, "ein Ton hat einen messbaren Pegel");
}

console.log("\nEin verrauschter Ton bleibt erkennbar");
for (const noise of [0.05, 0.12, 0.25]) {
  const f = midiToFreq(64);
  const { freq } = detect(signal(f, SAX, { noise }));
  ok(freq !== null && Math.abs(centsBetween(freq, f)) < 15,
     `bei Rauschanteil ${noise} noch erkannt`);
}

console.log("\nAndere Abtastraten");
for (const sr of [44100, 48000]) {
  const f = midiToFreq(69);
  const x = signal(f, SAX, { sr });
  const { freq } = detect(x, sr);
  ok(freq !== null && Math.abs(centsBetween(freq, f)) < 5, `${sr} Hz Abtastrate`);
}

console.log("\nVibrato wird nicht als Fehler gewertet");
{
  // 5 Hz Vibrato mit 30 Cent Tiefe — die Messung soll in der Nähe der Mitte
  // landen, nicht wild springen.
  const f0 = midiToFreq(69);
  const x = new Float32Array(LEN);
  for (let i = 0; i < LEN; i++) {
    const t = i / SR;
    const dev = 30 * Math.sin(2 * Math.PI * 5 * t) / 1200;
    x[i] = 0.3 * Math.sin(2 * Math.PI * f0 * Math.pow(2, dev) * t);
  }
  const { freq } = detect(x);
  ok(freq !== null && Math.abs(centsBetween(freq, f0)) < 35,
     `Vibrato bleibt in der Nähe des Mittelwerts (${freq ? Math.round(centsBetween(freq, f0)) : "nichts"} Cent)`);
}

console.log("\nGeschwindigkeit");
{
  const x = signal(midiToFreq(60), SAX);
  const t0 = performance.now();
  const runs = 60;
  for (let i = 0; i < runs; i++) yin(x, SR);
  const ms = (performance.now() - t0) / runs;
  console.log(`  ${ms.toFixed(2)} ms je Durchlauf`);
  ok(ms < 25, `unter 25 ms je Durchlauf, sonst ruckelt die Anzeige (${ms.toFixed(1)} ms)`);
}

console.log("\nSpektrum");
{
  // Ein gerechnetes Spektrum bauen: Bins in dB, mit Teiltoenen auf k*f0.
  const BINS = 1024, SR = 48000;
  const binHz = SR / 2 / BINS;
  const baue = (f0, staerken, rauschDb = -120) => {
    const dB = new Float32Array(BINS).fill(rauschDb);
    staerken.forEach((amp, k) => {
      if (amp <= 0) return;
      const bin = Math.round((k + 1) * f0 / binHz);
      if (bin < BINS) dB[bin] = 20 * Math.log10(amp);
    });
    return dB;
  };

  // Nur der Grundton: der Schwerpunkt muss bei f0 liegen.
  let r = spektrum(baue(440, [1]), SR, 440);
  ok(Math.abs(r.centroid - 440) < binHz * 2,
     `reiner Grundton: Schwerpunkt bei ${r.centroid.toFixed(0)} statt 440 Hz`);
  ok(Math.abs(r.harmonische[0] - 1) < 0.01, "der Grundton ist der Bezug, also 1");
  ok(r.harmonische[1] < 0.01, "kein zweiter Teilton");

  // Teiltonverhaeltnisse werden richtig gemessen.
  r = spektrum(baue(220, [1, 0.5, 0.25]), SR, 220);
  ok(Math.abs(r.harmonische[1] - 0.5) < 0.05, `zweiter Teilton halb so stark (${r.harmonische[1].toFixed(2)})`);
  ok(Math.abs(r.harmonische[2] - 0.25) < 0.05, `dritter Teilton viertel (${r.harmonische[2].toFixed(2)})`);
  eq(r.harmonische.length, 8, "acht Teiltoene werden gemessen");

  // Ein hellerer Klang hat einen hoeheren Schwerpunkt -- das ist die
  // eigentliche Aussage dieser Zahl.
  const dumpf = spektrum(baue(220, [1, 0.2, 0.05]), SR, 220);
  const hell  = spektrum(baue(220, [1, 0.9, 0.8, 0.7, 0.6]), SR, 220);
  ok(hell.centroid > dumpf.centroid * 1.5,
     `heller Klang hat hoeheren Schwerpunkt (${hell.centroid.toFixed(0)} gegen ${dumpf.centroid.toFixed(0)} Hz)`);

  // Der Pegel darf den Schwerpunkt nicht verschieben: leiser gespielt ist
  // nicht dumpfer.
  const laut  = spektrum(baue(220, [1, 0.5, 0.25]), SR, 220);
  const leise = spektrum(baue(220, [0.05, 0.025, 0.0125]), SR, 220);
  ok(Math.abs(laut.centroid - leise.centroid) < binHz * 2,
     "der Schwerpunkt haengt nicht am Pegel");
  ok(Math.abs(laut.harmonische[1] - leise.harmonische[1]) < 0.05,
     "die Teiltonverhaeltnisse haengen nicht am Pegel");

  // Stille darf keine Zahl erfinden.
  r = spektrum(new Float32Array(BINS).fill(-140), SR, 0);
  eq(r.centroid, 0, "reine Stille hat keinen Schwerpunkt");

  // Rauschen unter der Schwelle darf den Schwerpunkt nicht hochziehen.
  const mitRauschen = spektrum(baue(220, [1, 0.5], -95), SR, 220);
  const ohne = spektrum(baue(220, [1, 0.5], -130), SR, 220);
  ok(Math.abs(mitRauschen.centroid - ohne.centroid) < binHz * 3,
     "Rauschen unter -90 dB wird ignoriert");
}

console.log(fail ? `\n${fail} von ${n} Prüfungen fehlgeschlagen\n` : `\nAlle ${n} Prüfungen bestanden\n`);
process.exit(fail ? 1 : 0);
