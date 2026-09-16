/* ==========================================================================
   Harmonielehre für die Improvisation

   Die wichtigste Entscheidung in dieser Datei: Akkordfolgen werden
   **klingend** gespeichert und **gegriffen** angezeigt. Ein Es-Instrument
   liest über einem klingenden C7 ein A7. Wer das verwechselt, übt über die
   falschen Töne — und merkt es nicht, weil die Begleitung ja richtig klingt.

   Zweitwichtigste Entscheidung: zu jedem Akkord stehen hier nicht nur die
   Akkordtöne, sondern die **Zieltöne** — Terz und Septime. Sie tragen die
   Harmonie, und wer beim Üben nur sie spielt, klingt schon nach Musik, lange
   bevor Skalen sitzen. Deshalb sind sie hier eine eigene Größe und nicht
   etwas, das man sich aus der Akkordtabelle zusammensucht.

   Reine Daten und Rechnung, kein DOM, kein Audio.
   ========================================================================== */

"use strict";

import { spellOnStep, toMidi, chromatic, spell, NAMING } from "./theory.js";

/* --- Akkordarten -----------------------------------------------------------
   `steps` sind die Halbtöne über dem Grundton.
   `stufen` sind die Stufenschritte für die Schreibweise: 0,2,4,6 heiszt
   Grundton, Terz, Quinte, Septime — daraus folgt, ob ein Ton als Es oder als
   Dis geschrieben wird.
   `skala` ist die naheliegende Tonleiter, `farbe` die kurze Ansage, was den
   Akkord ausmacht. */

export const QUALITIES = {
  maj7: {
    symbol: "maj7", lang: "Major 7",
    steps: [0, 4, 7, 11], stufen: [0, 2, 4, 6],
    skala: [0, 2, 4, 5, 7, 9, 11], skalaName: "Ionisch",
    ziel: [4, 11],
    farbe: "Ruhepunkt. Die große Septime ist der Klang — spiel sie, statt sie zu meiden.",
  },
  maj7_11: {
    symbol: "maj7♯11", lang: "Major 7 mit erhöhter Quarte",
    steps: [0, 4, 7, 11], stufen: [0, 2, 4, 6],
    skala: [0, 2, 4, 6, 7, 9, 11], skalaName: "Lydisch",
    ziel: [4, 11],
    farbe: "Wie maj7, aber die Quarte ist hoch. Der schwebende Klang.",
  },
  dom7: {
    symbol: "7", lang: "Dominantseptakkord",
    steps: [0, 4, 7, 10], stufen: [0, 2, 4, 6],
    skala: [0, 2, 4, 5, 7, 9, 10], skalaName: "Mixolydisch",
    ziel: [4, 10],
    farbe: "Will weiter. Terz und kleine Septime sind der Tritonus, der zieht.",
  },
  dom7_alt: {
    symbol: "7alt", lang: "Alterierter Dominantseptakkord",
    steps: [0, 4, 8, 10], stufen: [0, 2, 4, 6],
    skala: [0, 1, 3, 4, 6, 8, 10], skalaName: "Alteriert",
    ziel: [4, 10],
    farbe: "Maximale Spannung vor der Auflösung. Alles auszer Grundton, Terz und Septime ist verbogen.",
  },
  dom7_11: {
    symbol: "7♯11", lang: "Dominantseptakkord mit erhöhter Quarte",
    steps: [0, 4, 7, 10], stufen: [0, 2, 4, 6],
    skala: [0, 2, 4, 6, 7, 9, 10], skalaName: "Mixolydisch ♯11",
    ziel: [4, 10],
    farbe: "Dominante ohne Zugkraft — steht oft für sich statt aufzulösen.",
  },
  m7: {
    symbol: "m7", lang: "Moll-Septakkord",
    steps: [0, 3, 7, 10], stufen: [0, 2, 4, 6],
    skala: [0, 2, 3, 5, 7, 9, 10], skalaName: "Dorisch",
    ziel: [3, 10],
    farbe: "Die große Sexte macht dorisch aus moll. Sie ist der Ton, der es hell hält.",
  },
  m7b5: {
    symbol: "m7♭5", lang: "Halbverminderter Septakkord",
    steps: [0, 3, 6, 10], stufen: [0, 2, 4, 6],
    skala: [0, 2, 3, 5, 6, 8, 10], skalaName: "Lokrisch ♮2",
    ziel: [3, 10],
    farbe: "Die zweite Stufe in Moll. Die verminderte Quinte ist der Kern.",
  },
  dim7: {
    symbol: "°7", lang: "Verminderter Septakkord",
    steps: [0, 3, 6, 9], stufen: [0, 2, 4, 6],
    skala: [0, 2, 3, 5, 6, 8, 9, 11], skalaName: "Vermindert, ganz-halb",
    ziel: [3, 9],
    farbe: "Symmetrisch. Alles wiederholt sich nach einer kleinen Terz — das gilt auch für deine Linien.",
  },
  mMaj7: {
    symbol: "m maj7", lang: "Moll mit großer Septime",
    steps: [0, 3, 7, 11], stufen: [0, 2, 4, 6],
    skala: [0, 2, 3, 5, 7, 9, 11], skalaName: "Melodisch Moll",
    ziel: [3, 11],
    farbe: "Die Tonika in Moll. Kleine Terz gegen große Septime ist die Reibung.",
  },
  m6: {
    symbol: "m6", lang: "Moll mit Sexte",
    steps: [0, 3, 7, 9], stufen: [0, 2, 4, 5],
    skala: [0, 2, 3, 5, 7, 9, 11], skalaName: "Melodisch Moll",
    ziel: [3, 9],
    farbe: "Klingt wie eine Tonika, nicht wie ein Zwischenschritt.",
  },
  dur6: {
    symbol: "6", lang: "Dur mit Sexte",
    steps: [0, 4, 7, 9], stufen: [0, 2, 4, 5],
    skala: [0, 2, 4, 5, 7, 9, 11], skalaName: "Ionisch",
    ziel: [4, 9],
    farbe: "Ruhiger Schluss, älter klingend als maj7.",
  },
  sus7: {
    symbol: "7sus4", lang: "Dominante mit Quarte statt Terz",
    steps: [0, 5, 7, 10], stufen: [0, 3, 4, 6],
    skala: [0, 2, 4, 5, 7, 9, 10], skalaName: "Mixolydisch",
    ziel: [5, 10],
    farbe: "Offen. Ohne Terz gibt es keine Dur-Moll-Aussage.",
  },
};

/* --- Akkordtöne ------------------------------------------------------------ */

/** Buchstabiert die Akkordtöne richtig: in Es7 steht ein Ges, kein Fis. */
export function chordPitches(root, qualityId) {
  const q = QUALITIES[qualityId];
  if (!q) throw new Error("Unbekannte Akkordart: " + qualityId);
  const base = toMidi(root);
  return q.steps.map((s, i) => spellOnStep(base + s, (root.step + q.stufen[i]) % 7));
}

/** Terz und Septime — die Töne, die die Harmonie tragen. */
export function guidePitches(root, qualityId) {
  const q = QUALITIES[qualityId];
  const base = toMidi(root);
  return q.ziel.map(s => {
    const i = q.steps.indexOf(s);
    return spellOnStep(base + s, (root.step + q.stufen[i]) % 7);
  });
}

/** Die naheliegende Skala als buchstabierte Tonhöhen, eine Oktave. */
export function scalePitches(root, qualityId) {
  const q = QUALITIES[qualityId];
  const base = toMidi(root);
  const siebenstufig = q.skala.length === 7;
  return q.skala.map((s, i) => siebenstufig
    ? spellOnStep(base + s, (root.step + i) % 7)
    : chromatic(base + s));
}

/** Akkordsymbol als Text, etwa „B♭7" oder „F♯m7♭5". */
export function chordSymbol(root, qualityId, naming = NAMING.DE) {
  return spell(root, naming) + QUALITIES[qualityId].symbol;
}

/* --- Akkordfolgen -----------------------------------------------------------
   Gespeichert wird **klingend**, als Stufen über einem Grundton, damit
   dieselbe Folge in jede Tonart versetzt werden kann. `grad` ist der
   Halbtonabstand zur Tonika, `takte` die Länge.

   Die Auswahl ist die eines Lehrers, nicht die einer Datenbank: was man
   wirklich übt, bevor man Standards spielt. */

export const PROGRESSIONS = [
  {
    id: "dur251", name: "II–V–I in Dur", takt: 4, tempo: 120,
    was: "Die Grundformel des Jazz. Kann sie jeder Ton in jeder Tonart, ist die halbe Arbeit getan.",
    akkorde: [
      { grad: 2, q: "m7", takte: 1 },
      { grad: 7, q: "dom7", takte: 1 },
      { grad: 0, q: "maj7", takte: 2 },
    ],
  },
  {
    id: "moll251", name: "II–V–I in Moll", takt: 4, tempo: 110,
    was: "Dieselbe Formel, dunkler. Der alterierte Akkord in der Mitte ist der Punkt, an dem es interessant wird.",
    akkorde: [
      { grad: 2, q: "m7b5", takte: 1 },
      { grad: 7, q: "dom7_alt", takte: 1 },
      { grad: 0, q: "mMaj7", takte: 2 },
    ],
  },
  {
    id: "blues", name: "Blues, einfach", takt: 4, tempo: 100,
    was: "Zwölf Takte, drei Akkorde. Das Übungsfeld, auf dem alles andere wächst.",
    akkorde: [
      { grad: 0, q: "dom7", takte: 4 },
      { grad: 5, q: "dom7", takte: 2 },
      { grad: 0, q: "dom7", takte: 2 },
      { grad: 7, q: "dom7", takte: 1 },
      { grad: 5, q: "dom7", takte: 1 },
      { grad: 0, q: "dom7", takte: 2 },
    ],
  },
  {
    id: "jazzblues", name: "Jazz-Blues", takt: 4, tempo: 130,
    was: "Der Blues mit Zwischendominanten und II–V. So wird er auf der Session gespielt.",
    akkorde: [
      { grad: 0, q: "dom7", takte: 1 },
      { grad: 5, q: "dom7", takte: 1 },
      { grad: 0, q: "dom7", takte: 1 },
      { grad: 0, q: "m7", takte: 1 },
      { grad: 5, q: "dom7", takte: 2 },
      { grad: 0, q: "dom7", takte: 2 },
      { grad: 2, q: "m7", takte: 1 },
      { grad: 7, q: "dom7", takte: 1 },
      { grad: 0, q: "dom7", takte: 1 },
      { grad: 7, q: "dom7", takte: 1 },
    ],
  },
  {
    id: "dorisch_vamp", name: "Dorischer Vamp", takt: 4, tempo: 120,
    was: "Ein Akkord, acht Takte. Kein Harmoniewechsel, an dem man sich festhalten kann — hier zeigt sich, ob du eine Linie bauen kannst.",
    akkorde: [{ grad: 0, q: "m7", takte: 8 }],
  },
  {
    id: "modal_zwei", name: "Modal, zwei Zentren", takt: 4, tempo: 130,
    was: "Acht Takte, dann einen Halbton höher und zurück. Der Wechsel ist der ganze Reiz.",
    akkorde: [
      { grad: 0, q: "m7", takte: 8 },
      { grad: 1, q: "m7", takte: 8 },
      { grad: 0, q: "m7", takte: 8 },
    ],
  },
  {
    id: "rhythm_a", name: "Rhythm Changes, A-Teil", takt: 4, tempo: 160,
    was: "Schnelle Wechsel über I–VI–II–V. Übt das Denken in Zweitaktgruppen.",
    akkorde: [
      { grad: 0, q: "maj7", takte: 1 }, { grad: 9, q: "m7", takte: 1 },
      { grad: 2, q: "m7", takte: 1 }, { grad: 7, q: "dom7", takte: 1 },
      { grad: 0, q: "maj7", takte: 1 }, { grad: 9, q: "m7", takte: 1 },
      { grad: 2, q: "m7", takte: 1 }, { grad: 7, q: "dom7", takte: 1 },
    ],
  },
  {
    id: "quintfall", name: "Quintfall", takt: 4, tempo: 120,
    was: "Sieben Dominanten hintereinander, jede eine Quinte tiefer. Die beste Übung für Zieltöne überhaupt.",
    akkorde: [
      { grad: 2, q: "dom7", takte: 1 }, { grad: 7, q: "dom7", takte: 1 },
      { grad: 0, q: "dom7", takte: 1 }, { grad: 5, q: "dom7", takte: 1 },
      { grad: 10, q: "dom7", takte: 1 }, { grad: 3, q: "dom7", takte: 1 },
      { grad: 8, q: "dom7", takte: 1 }, { grad: 1, q: "dom7", takte: 1 },
    ],
  },
  {
    id: "ballade", name: "Balladenwendung", takt: 4, tempo: 68,
    was: "Langsam, viel Platz. Hier hört man jeden Ton — und jede Intonation.",
    akkorde: [
      { grad: 0, q: "maj7", takte: 2 },
      { grad: 9, q: "m7", takte: 1 }, { grad: 2, q: "m7", takte: 1 },
      { grad: 7, q: "dom7", takte: 2 },
      { grad: 0, q: "maj7", takte: 2 },
    ],
  },
];

/**
 * Setzt eine Folge auf eine klingende Tonika und gibt die Akkorde mit
 * absoluten, buchstabierten Grundtönen zurück — plus die Taktposition, damit
 * die Begleitung und die Anzeige dieselbe Rechnung benutzen.
 */
export function buildProgression(prog, tonikaPc, oktave = 3) {
  let takt = 0;
  return prog.akkorde.map(a => {
    const pc = (((tonikaPc + a.grad) % 12) + 12) % 12;
    const root = { ...chromatic(pc + (oktave + 1) * 12), octave: oktave };
    const eintrag = {
      root, q: a.q, takte: a.takte, abTakt: takt,
      symbol: chordSymbol(root, a.q),
    };
    takt += a.takte;
    return eintrag;
  });
}

export const progressionTakte = akkorde =>
  akkorde.reduce((a, x) => a + x.takte, 0);

/** Welcher Akkord liegt auf einem gegebenen Takt? */
export function chordAtBar(akkorde, takt) {
  const gesamt = progressionTakte(akkorde);
  const t = ((takt % gesamt) + gesamt) % gesamt;
  for (const a of akkorde) {
    if (t >= a.abTakt && t < a.abTakt + a.takte) return a;
  }
  return akkorde[0];
}

/* --- Bausteine für Linien ---------------------------------------------------
   Muster in Stufen der jeweiligen Skala, nicht in Halbtönen. So passen sie
   auf jeden Akkord, ohne dass man sie zwölfmal auswendig lernt. */

export const PATTERNS = [
  { id: "auf1234", name: "1 2 3 4", stufen: [0, 1, 2, 3],
    was: "Der einfachste Baustein. Klingt schon musikalisch, weil er der Skala folgt." },
  { id: "akkord1357", name: "1 3 5 7", stufen: [0, 2, 4, 6],
    was: "Reine Akkordtöne. Damit triffst du immer richtig, egal wie schnell die Akkorde wechseln." },
  { id: "1235", name: "1 2 3 5", stufen: [0, 1, 2, 4],
    was: "Die Quarte ausgelassen — die ist über Dur der einzige wirklich heikle Ton." },
  { id: "dreiklang_ab", name: "7 5 3 1", stufen: [6, 4, 2, 0],
    was: "Akkord abwärts. Klingt sofort nach Bebop-Vokabular." },
  { id: "umspielung", name: "Umspielung", stufen: [0, 1, -1, 0],
    was: "Zielton von oben und unten einkreisen. Der wichtigste Trick, um Zieltöne zu treffen." },
  { id: "terzen", name: "Terzen", stufen: [0, 2, 1, 3],
    was: "Sprung und Schritt im Wechsel. Bricht die Tonleiterlangeweile auf." },
];

/**
 * Setzt ein Muster auf eine Skala. Stufen dürfen negativ sein oder über die
 * Oktave hinausgehen; gerechnet wird mit Übertrag in die nächste Oktave.
 */
export function applyPattern(scale, stufen, startStufe = 0) {
  const n = scale.length;
  return stufen.map(s => {
    const idx = startStufe + s;
    const okt = Math.floor(idx / n);
    const p = scale[((idx % n) + n) % n];
    return { ...p, octave: p.octave + okt };
  });
}
