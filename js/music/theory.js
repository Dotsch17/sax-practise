/* ==========================================================================
   Musiktheorie — das Fundament für Tonleitern, Gehör, Notensatz und Stimmgerät

   Konventionen, die im ganzen Projekt gelten:

   - Tonhöhen sind intern MIDI-Zahlen. A4 = 69 = 440 Hz. Das ist die einzige
     Zahl, gegen die gerechnet wird; alles andere ist Darstellung.
   - Eine geschriebene Tonhöhe ist ein Tripel {step, alter, octave}. step ist
     0..6 für C D E F G A H, alter ist die Vorzeichenstufe. Ohne dieses Tripel
     liesze sich Fis nicht von Ges unterscheiden, und genau das braucht der
     Notensatz.
   - Deutsche Tonnamen sind der Standard, weil die Aufnahmeprüfung deutsch
     geprüft wird: H ist der Ton unter C, B ist H erniedrigt. Wer international
     lesen will, stellt in den Einstellungen um.
   - Das Altsaxophon ist in Es. Der Griff ist die klingende Tonhöhe plus neun
     Halbtöne. Hier heiszt das durchgehend `written` und `sounding`, nie „Ton“
     ohne Zusatz — diese Verwechslung ist die häufigste Fehlerquelle.
   ========================================================================== */

"use strict";

export const A4 = 69;          // MIDI-Nummer des Kammertons
export const TRANSPOSE_ALTO = 9;   // Griff = klingend + grosze Sexte

/* --- Tonnamen ---------------------------------------------------------- */

// Stufe 0..6 -> Grundbuchstabe. Index 6 ist H, nicht B: das ist der
// deutsche Unterschied und der Grund für die Sonderfälle weiter unten.
const LETTERS_DE = ["C", "D", "E", "F", "G", "A", "H"];
const LETTERS_EN = ["C", "D", "E", "F", "G", "A", "B"];

// Halbtonabstand jeder Stufe vom C
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// Deutsche Vorzeichensilben. -is für erhöht, -es für erniedrigt, mit den
// bekannten Ausnahmen: E+es = Es (nicht Ees), A+es = As, H+es = B.
const SHARP_DE = ["", "is", "isis"];
const FLAT_DE  = ["", "es", "eses"];

export const NAMING = { DE: "de", EN: "en" };

/** Schreibweise eines Tripels als Text, z. B. {3,-1,4} -> "Fes" bzw. "Fb". */
export function spell({ step, alter }, naming = NAMING.DE) {
  if (naming === NAMING.EN) {
    const acc = alter > 0 ? "♯".repeat(alter) : "♭".repeat(-alter);
    return LETTERS_EN[step] + acc;
  }
  const letter = LETTERS_DE[step];
  if (alter === 0) return letter;
  if (alter > 0) return letter + SHARP_DE[Math.min(alter, 2)];

  const n = Math.min(-alter, 2);
  // E und A verschlucken das e, H wird zu B.
  if (step === 6) return n === 1 ? "B" : "Heses";
  if (step === 2 || step === 5) return letter + (n === 1 ? "s" : "ses");
  return letter + FLAT_DE[n];
}

/** Mit Oktavziffer, z. B. "A3". Die Ziffer folgt der wissenschaftlichen Zählung. */
export function spellWithOctave(p, naming = NAMING.DE) {
  return spell(p, naming) + p.octave;
}

/* --- Umrechnungen ------------------------------------------------------- */

export function toMidi({ step, alter, octave }) {
  return (octave + 1) * 12 + STEP_SEMITONES[step] + alter;
}

export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - A4) / 12);
}

export function freqToMidi(freq, a4 = 440) {
  return A4 + 12 * Math.log2(freq / a4);
}

/** Abweichung in Cent zwischen gemessener Frequenz und nächstem Halbton. */
export function centsOff(freq, a4 = 440) {
  const exact = freqToMidi(freq, a4);
  const nearest = Math.round(exact);
  return { midi: nearest, cents: Math.round((exact - nearest) * 100) };
}

/* --- Tonhöhen buchstabieren -------------------------------------------- */

// Für jede Halbtonstufe die Vorzugsschreibweise, einmal mit Kreuzen und
// einmal mit Ben. Welche gilt, entscheidet die Tonart.
const SHARP_SPELLING = [[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]];
const FLAT_SPELLING  = [[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]];

/**
 * MIDI-Zahl zu einem Tripel. `prefer` steuert die enharmonische Wahl:
 * "sharp", "flat", oder eine Vorzeichenzahl aus keySignature().
 */
export function fromMidi(midi, prefer = "sharp") {
  const pc = ((midi % 12) + 12) % 12;
  const useFlat = prefer === "flat" || (typeof prefer === "number" && prefer < 0);
  const [step, alter] = (useFlat ? FLAT_SPELLING : SHARP_SPELLING)[pc];
  // Oktave aus der Stufe zurückrechnen, damit Ces4 nicht in der falschen landet.
  const octave = Math.floor((midi - alter - STEP_SEMITONES[step]) / 12) - 1;
  return { step, alter, octave };
}

/**
 * Die übliche Schreibweise eines Tons ohne Tonartzusammenhang: Des, Es, As
 * und B mit Be, nur Fis mit Kreuz. So sagen es Bläser, so steht es auf
 * Griffbildern, und so hiesz es schon in der ersten Fassung der App.
 * Ohne diese Festlegung stünde in der Gehörbildung "Dis – Ais" statt
 * "Es – B", und das liest sich falsch.
 */
const FLAT_PCS = new Set([1, 3, 8, 10]);
export const chromatic = midi =>
  fromMidi(midi, FLAT_PCS.has(((midi % 12) + 12) % 12) ? "flat" : "sharp");

/* --- Tonarten ----------------------------------------------------------- */

// Reihenfolge der Kreuze: Fis Cis Gis Dis Ais Eis His  (Stufen F C G D A E H)
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
// Reihenfolge der Ben: B Es As Des Ges Ces Fes  (Stufen H E A D G C F)
const FLAT_ORDER  = [6, 2, 5, 1, 4, 0, 3];

/** Welche Stufen trägt die Vorzeichnung? count > 0 Kreuze, < 0 Ben. */
export function keySignatureSteps(count) {
  return count >= 0 ? SHARP_ORDER.slice(0, count) : FLAT_ORDER.slice(0, -count);
}

/** Vorzeichenzahl einer Durtonart, angegeben als Grundton-Pitchclass. */
const MAJOR_SIGNATURES = {
  0: 0,   // C
  7: 1,   // G
  2: 2,   // D
  9: 3,   // A
  4: 4,   // E
  11: 5,  // H
  6: 6,   // Fis
  5: -1,  // F
  10: -2, // B
  3: -3,  // Es
  8: -4,  // As
  1: -5,  // Des
};

// Stellung der Stammtöne im Quintenzirkel: F C G D A E H.
const CIRCLE = [0, 2, 4, -1, 1, 3, 5];   // Index ist die Stufe C D E F G A H

/**
 * Vorzeichnung aus dem buchstabierten Grundton. Das ist die genaue Variante:
 * Ges-Dur und Fis-Dur klingen gleich, haben aber sechs Ben gegen sechs
 * Kreuze. Aus der Tonhöhenklasse allein ist das nicht zu entscheiden.
 */
export function majorKeySignature({ step, alter }) {
  return CIRCLE[step] + alter * 7;
}

/**
 * Dasselbe für Moll. Die Durparallele liegt drei Quintenschritte abwärts:
 * a-Moll teilt die Vorzeichnung mit C-Dur, nicht mit A-Dur.
 */
export function minorKeySignature(tonic) {
  return majorKeySignature(tonic) - 3;
}

/**
 * Vorzeichnung einer Tonart aus der Tonhöhenklasse. Ungenau bei den
 * enharmonischen Grenzfällen — dort majorKeySignature() nehmen.
 * `mode` ist "major" oder "minor"; Moll wird über die Parallele gerechnet.
 */
export function keySignature(tonicPc, mode = "major") {
  const pc = mode === "minor" ? (((tonicPc + 3) % 12) + 12) % 12 : ((tonicPc % 12) + 12) % 12;
  const sig = MAJOR_SIGNATURES[pc];
  // Fis-Dur und Ges-Dur sind derselbe Klang; ohne Eintrag nehmen wir Ben.
  return sig === undefined ? (pc === 6 ? 6 : -6) : sig;
}

/* --- Skalen und Akkorde -------------------------------------------------- */

// Halbtonschritte ab dem Grundton. Bewusst als reine Daten, damit später
// weitere Skalen dazukommen können, ohne Code anzufassen.
export const SCALES = {
  dur:            { name: "Dur",                    steps: [0,2,4,5,7,9,11], group: "Grundlagen" },
  moll_natur:     { name: "Moll, natürlich",        steps: [0,2,3,5,7,8,10], group: "Grundlagen" },
  moll_harmonisch:{ name: "Moll, harmonisch",       steps: [0,2,3,5,7,8,11], group: "Grundlagen" },
  moll_melodisch: { name: "Moll, melodisch",        steps: [0,2,3,5,7,9,11], group: "Grundlagen" },
  chromatisch:    { name: "Chromatisch",            steps: [0,1,2,3,4,5,6,7,8,9,10,11], group: "Grundlagen" },
  ganzton:        { name: "Ganzton",                steps: [0,2,4,6,8,10], group: "Moderne" },
  dorisch:        { name: "Dorisch",                steps: [0,2,3,5,7,9,10], group: "Kirchentonarten" },
  phrygisch:      { name: "Phrygisch",              steps: [0,1,3,5,7,8,10], group: "Kirchentonarten" },
  lydisch:        { name: "Lydisch",                steps: [0,2,4,6,7,9,11], group: "Kirchentonarten" },
  mixolydisch:    { name: "Mixolydisch",            steps: [0,2,4,5,7,9,10], group: "Kirchentonarten" },
  aeolisch:       { name: "Äolisch",                steps: [0,2,3,5,7,8,10], group: "Kirchentonarten" },
  lokrisch:       { name: "Lokrisch",               steps: [0,1,3,5,6,8,10], group: "Kirchentonarten" },
  blues:          { name: "Blues",                  steps: [0,3,5,6,7,10], group: "Moderne" },
  pentatonik_dur: { name: "Pentatonik, Dur",        steps: [0,2,4,7,9], group: "Moderne" },
  pentatonik_moll:{ name: "Pentatonik, Moll",       steps: [0,3,5,7,10], group: "Moderne" },
  vermindert:     { name: "Vermindert, ganz-halb",  steps: [0,2,3,5,6,8,9,11], group: "Moderne" },
};

export const CHORDS = {
  dur:          { name: "Dur",                  steps: [0,4,7] },
  moll:         { name: "Moll",                 steps: [0,3,7] },
  vermindert:   { name: "Vermindert",           steps: [0,3,6] },
  uebermaessig: { name: "Übermäßig",            steps: [0,4,8] },
  dur7:         { name: "Dur-Septakkord",       steps: [0,4,7,11] },
  dom7:         { name: "Dominantseptakkord",   steps: [0,4,7,10] },
  moll7:        { name: "Moll-Septakkord",      steps: [0,3,7,10] },
  halbvermindert:{ name: "Halbvermindert",      steps: [0,3,6,10] },
  vermindert7:  { name: "Verminderter Septakkord", steps: [0,3,6,9] },
};

// `steps` ist die Stufenzahl, also um wieviele Buchstaben es weitergeht.
// Sie und nicht die Halbtonzahl entscheidet, wie der zweite Ton geschrieben
// wird: eine grosze Terz über Fis ist Ais und nicht B, auch wenn beides
// gleich klingt. Der Tritonus ist von Natur aus zweideutig; hier gilt er als
// übermäszige Quarte, also drei Stufen.
export const INTERVALS = [
  { semitones: 0,  steps: 0, short: "r1",  name: "Reine Prime" },
  { semitones: 1,  steps: 1, short: "kl2", name: "Kleine Sekunde" },
  { semitones: 2,  steps: 1, short: "gr2", name: "Große Sekunde" },
  { semitones: 3,  steps: 2, short: "kl3", name: "Kleine Terz" },
  { semitones: 4,  steps: 2, short: "gr3", name: "Große Terz" },
  { semitones: 5,  steps: 3, short: "r4",  name: "Reine Quarte" },
  { semitones: 6,  steps: 3, short: "TT",  name: "Tritonus" },
  { semitones: 7,  steps: 4, short: "r5",  name: "Reine Quinte" },
  { semitones: 8,  steps: 5, short: "kl6", name: "Kleine Sexte" },
  { semitones: 9,  steps: 5, short: "gr6", name: "Große Sexte" },
  { semitones: 10, steps: 6, short: "kl7", name: "Kleine Septime" },
  { semitones: 11, steps: 6, short: "gr7", name: "Große Septime" },
  { semitones: 12, steps: 7, short: "r8",  name: "Reine Oktave" },
];

/**
 * Legt ein Tripel auf eine vorgegebene Stufe. Der Buchstabe steht fest, die
 * Vorzeichenstufe ergibt sich aus der Ziel-Tonhöhe. Das ist der Kern des
 * richtigen Buchstabierens: in a-Moll harmonisch muss die siebte Stufe ein
 * G sein, also wird sie zu Gis und nicht zu As.
 */
export function spellOnStep(midi, step) {
  const octave = Math.floor(midi / 12) - 1;
  // Drei Kandidaten prüfen, weil der Buchstabe über eine Oktavgrenze
  // rutschen kann: His4 klingt wie C5, Ces5 klingt wie H4.
  for (const o of [octave, octave - 1, octave + 1]) {
    const alter = midi - ((o + 1) * 12 + STEP_SEMITONES[step]);
    if (alter >= -2 && alter <= 2) return { step, alter, octave: o };
  }
  return fromMidi(midi, "sharp");   // unbuchstabierbar, etwa bei Dreifachkreuz
}

/**
 * Baut eine Skala als Folge von Tripeln auf, ausgehend von einem
 * buchstabierten Grundton. Siebenstufige Skalen bekommen aufsteigende
 * Buchstaben, alles andere wird nach Kreuz- oder B-Vorliebe geschrieben.
 */
export function buildScale(tonic, scaleKey, octaves = 1) {
  const def = SCALES[scaleKey];
  if (!def) throw new Error("Unbekannte Skala: " + scaleKey);
  const root = toMidi(tonic);
  const diatonic = def.steps.length === 7;
  const prefer = tonic.alter < 0 ? "flat" : "sharp";

  const at = (semitones, degree) => diatonic
    ? spellOnStep(root + semitones, (tonic.step + degree) % 7)
    : fromMidi(root + semitones, prefer);

  const out = [];
  for (let o = 0; o < octaves; o++) {
    def.steps.forEach((s, i) => out.push(at(s + o * 12, i)));
  }
  out.push(at(octaves * 12, 0));
  return out;
}

/**
 * Buchstabiert den zweiten Ton eines Intervalls richtig. `richtung` ist 1
 * für aufwärts und -1 für abwärts.
 */
export function intervalFrom(root, semitones, richtung = 1) {
  const iv = INTERVALS.find(i => i.semitones === semitones);
  const steps = iv ? iv.steps : Math.round(semitones * 7 / 12);
  const midi = toMidi(root) + richtung * semitones;
  const step = (((root.step + richtung * steps) % 7) + 7) % 7;
  return spellOnStep(midi, step);
}

/** Akkorde sind Terzschichtungen, die Buchstaben springen also um zwei. */
export function buildChord(root, chordKey) {
  const def = CHORDS[chordKey];
  if (!def) throw new Error("Unbekannter Akkord: " + chordKey);
  const base = toMidi(root);
  return def.steps.map((s, i) =>
    spellOnStep(base + s, (root.step + 2 * i) % 7));
}

/* --- Übbare Tonarten ----------------------------------------------------- */

// Grundton als Tripel plus Vorzeichenzahl. Die Reihenfolge ist der
// Quintenzirkel ab C, weil Tonleitern so geübt und geprüft werden.
const K = (step, alter) => ({ step, alter, octave: 4 });
export const MAJOR_KEYS = [
  { tonic: K(0, 0),  sig:  0, name: "C-Dur" },
  { tonic: K(4, 0),  sig:  1, name: "G-Dur" },
  { tonic: K(1, 0),  sig:  2, name: "D-Dur" },
  { tonic: K(5, 0),  sig:  3, name: "A-Dur" },
  { tonic: K(2, 0),  sig:  4, name: "E-Dur" },
  { tonic: K(6, 0),  sig:  5, name: "H-Dur" },
  { tonic: K(3, 1),  sig:  6, name: "Fis-Dur" },
  { tonic: K(3, 0),  sig: -1, name: "F-Dur" },
  { tonic: K(6, -1), sig: -2, name: "B-Dur" },
  { tonic: K(2, -1), sig: -3, name: "Es-Dur" },
  { tonic: K(5, -1), sig: -4, name: "As-Dur" },
  { tonic: K(1, -1), sig: -5, name: "Des-Dur" },
  { tonic: K(4, -1), sig: -6, name: "Ges-Dur" },
];

export const MINOR_KEYS = [
  { tonic: K(5, 0),  sig:  0, name: "a-Moll" },
  { tonic: K(2, 0),  sig:  1, name: "e-Moll" },
  { tonic: K(6, 0),  sig:  2, name: "h-Moll" },
  { tonic: K(3, 1),  sig:  3, name: "fis-Moll" },
  { tonic: K(0, 1),  sig:  4, name: "cis-Moll" },
  { tonic: K(4, 1),  sig:  5, name: "gis-Moll" },
  { tonic: K(1, 1),  sig:  6, name: "dis-Moll" },
  { tonic: K(1, 0),  sig: -1, name: "d-Moll" },
  { tonic: K(4, 0),  sig: -2, name: "g-Moll" },
  { tonic: K(0, 0),  sig: -3, name: "c-Moll" },
  { tonic: K(3, 0),  sig: -4, name: "f-Moll" },
  { tonic: K(6, -1), sig: -5, name: "b-Moll" },
  { tonic: K(2, -1), sig: -6, name: "es-Moll" },
];

/* --- Transposition ------------------------------------------------------- */

/** Klingende Tonhöhe -> Griff am Alt. Beides als MIDI-Zahl. */
export const toWritten  = soundingMidi => soundingMidi + TRANSPOSE_ALTO;
/** Griff am Alt -> klingende Tonhöhe. */
export const toSounding = writtenMidi  => writtenMidi  - TRANSPOSE_ALTO;

/**
 * Tonart des Griffs zur klingenden Tonart. Neun Halbtöne höher sind drei
 * Quinten aufwärts, also drei Kreuze mehr: klingend Es-Dur liest sich als
 * C-Dur, klingend C-Dur liest sich als A-Dur.
 */
export function writtenKeySignature(soundingSignature) {
  let sig = soundingSignature + 3;
  while (sig > 7) sig -= 12;
  while (sig < -7) sig += 12;
  return sig;
}

/* --- Umfang des Altsaxophons -------------------------------------------- */

// Notierter Umfang: B3 bis Fis6 am modernen Alt, Altissimo darüber.
export const RANGE = {
  writtenLow:  58,   // notiert B3  (klingend Des3)
  writtenHigh: 90,   // notiert Fis6 (klingend A5)
  altissimoTo: 101,  // notiert F7, realistische Obergrenze
};

export const inRange = writtenMidi =>
  writtenMidi >= RANGE.writtenLow && writtenMidi <= RANGE.writtenHigh;

export const isAltissimo = writtenMidi => writtenMidi > RANGE.writtenHigh;
