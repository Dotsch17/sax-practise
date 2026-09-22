/* ==========================================================================
   Die Zulassungsprüfung als Daten

   IGP Bachelor, zentrales künstlerisches Fach Saxophon **Popularmusik**,
   mdw Wien. Stand der Anforderungen: Studienjahr 2026/27. Nicht Klassik —
   das ist eine andere Prüfung mit Ferling, Mule und einer Sonate, und wer
   die beiden verwechselt, übt ein Jahr lang an der falschen vorbei.

   Drei Teile, und alle drei müssen bestanden werden:

   1. Saxophon: Tonleitern und Akkorde theoretisch und am Instrument, zwei
      Jazzetüden oder eine Etüde und eine Transkription, drei Stücke
      verschiedener Stilrichtungen mit Improvisation, Blattlesen.
   2. Klavier, Grundkenntnisse: zwei Stücke verschiedener Epochen (eines
      darf aus der Popularmusik sein), Blattspiel, Kadenzen.
   3. Hören, schriftlich: Diktate, Fehler erkennen, Notiertes wiedererkennen.

   Wenn die mdw die Anforderungen ändert, wird nur diese Datei angefasst.
   Die Quellen stehen unten; vor der Anmeldung einmal gegenlesen.

   Reiner Inhalt plus ein paar Rechnungen darauf, kein DOM.
   ========================================================================== */

"use strict";

export const QUELLEN = [
  { titel: "Anforderungen zkF Saxophon Popularmusik 2026/27 (ipop)",
    url: "https://www.ipop.at/wp-content/uploads/IGP_Saxophon_Popularmusik.pdf" },
  { titel: "Zulassungsprüfung IGP Bachelor (mdw), mit Zugang zu MusicCoach",
    url: "https://www.mdw.ac.at/stdmp/igp-ba-zulassung/" },
  { titel: "Grundkenntnisse Klavier (mdw)",
    url: "https://www.mdw.ac.at/lvb/studium/igp-bachelorstudium-grundkenntnisse-klavier-zulassungspruefung/" },
  { titel: "Beiblatt Kadenzen",
    url: "https://www.mdw.ac.at/upload/MDWeb/tip/downloads/BeiblattKadenzenIGPPFZuLa2023.pdf" },
];

/* Solange kein Termin eingetragen ist, wird mit Anfang Juni gerechnet. Die
   Zulassungsprüfungen lagen bisher im Juni; der genaue Tag kommt mit der
   Einladung. */
export const TERMIN_GESCHAETZT = "2027-06-01";

/* --- Fortschrittsstufen ------------------------------------------------------ */

/* Jede Stufe hat ein „fertig, wenn“. Ohne das hakt man nach Gefühl ab, und
   Gefühl ist vor einer Prüfung ein schlechter Maßstab. */
export const STUFEN = {
  stueck: [
    { label: "gewählt",           fertig: "Leadsheet liegt vor, Originalaufnahme gehört." },
    { label: "Thema auswendig",   fertig: "Du spielst das Thema ohne Blatt, mit der Phrasierung der Aufnahme." },
    { label: "Changes sitzen",    fertig: "Grundtöne, dann Terzen und Septimen über die ganze Form, ohne zu suchen." },
    { label: "Solo über die Form",fertig: "Zwei Chorusse, ohne die Form zu verlieren. Die Eins jedes Formteils triffst du." },
    { label: "mit Begleitung",    fertig: "Mit Pianist, Band oder Playalong gespielt, Einzählen und Schluss abgesprochen." },
    { label: "prüfungsreif",      fertig: "Zweimal hintereinander aufgenommen, ohne Abbruch, und die Aufnahme hält am nächsten Tag stand." },
  ],
  etuede: [
    { label: "gewählt",           fertig: "Noten und, wenn es eine gibt, die Aufnahme dazu." },
    { label: "Noten langsam",     fertig: "Alles richtig in halbem Tempo, ohne Stocken." },
    { label: "Stil",              fertig: "Artikulation und Phrasierung klingen nach Jazz, nicht nach Etüde: Offbeats angestoßen, Ghost Notes, Swing." },
    { label: "Zieltempo",         fertig: "Im Tempo der Vorlage, mit Metronom auf 2 und 4." },
    { label: "Durchlauf",         fertig: "Von vorn bis hinten ohne Anhalten, aufgenommen." },
    { label: "prüfungsreif",      fertig: "Zweimal hintereinander sauber, und die Aufnahme hält am nächsten Tag stand." },
  ],
  klavier: [
    { label: "gewählt",           fertig: "Noten liegen vor, Niveau mit der Lehrerin oder dem Lehrer abgesprochen." },
    { label: "Hände einzeln",     fertig: "Jede Hand für sich im halben Tempo sicher." },
    { label: "zusammen langsam",  fertig: "Beide Hände zusammen, langsam, ohne anzuhalten." },
    { label: "im Tempo",          fertig: "Im Zieltempo, mit Dynamik." },
    { label: "Durchlauf",         fertig: "Von vorn bis hinten ohne Anhalten, auch vor jemandem." },
    { label: "prüfungsreif",      fertig: "Zweimal hintereinander sauber, auch kalt ohne Einspielen." },
  ],
  pruefpunkt: [
    { label: "angefangen",        fertig: "Du weißt, wie die Aufgabe aussieht, und hast sie einmal gemacht." },
    { label: "regelmäßig",        fertig: "Mehrmals pro Woche, seit mindestens einem Monat." },
    { label: "sitzt",             fertig: "Unter Zeitdruck und ohne Hilfe, auch an einem schlechten Tag." },
  ],
};

export const STILE = [
  "Swing", "Bebop", "Ballade", "Blues", "Latin / Bossa", "Funk / Soul", "Pop", "Modern / Fusion",
];

/* Vorschläge, wenn ein Platz noch leer ist. Keine Pflichtliste — eine
   Erinnerung daran, dass „verschiedene Stilrichtungen“ mehr heißt als drei
   Swing-Standards in drei Tempi. */
export const VORSCHLAEGE = {
  stueck: [
    { titel: "There Will Never Be Another You", stil: "Swing" },
    { titel: "Have You Met Miss Jones", stil: "Swing" },
    { titel: "Oleo", stil: "Bebop" },
    { titel: "Straight, No Chaser", stil: "Blues" },
    { titel: "Body and Soul", stil: "Ballade" },
    { titel: "In a Sentimental Mood", stil: "Ballade" },
    { titel: "My Funny Valentine", stil: "Ballade" },
    { titel: "Blue Bossa", stil: "Latin / Bossa" },
    { titel: "Recorda Me", stil: "Latin / Bossa" },
    { titel: "Song for My Father", stil: "Latin / Bossa" },
    { titel: "Chameleon", stil: "Funk / Soul" },
    { titel: "Pick Up the Pieces", stil: "Funk / Soul" },
    { titel: "Cantaloupe Island", stil: "Funk / Soul" },
  ],
  etuede: [
    { titel: "Niehaus, Jazz Conception for Saxophone" },
    { titel: "Snidero, Jazz Conception" },
    { titel: "Mintzer, 15 Easy Jazz, Blues & Funk Etudes" },
    { titel: "Lipsius, Reading Key Jazz Rhythms" },
    { titel: "Transkription: Parker's Mood (Charlie Parker Omnibook)" },
  ],
  klavier: [
    { titel: "Bach, Menuett aus dem Notenbüchlein für Anna Magdalena" },
    { titel: "Bartók, Mikrokosmos" },
    { titel: "Corea, Children's Songs" },
    { titel: "Moser, Rock Piano" },
    { titel: "Norton, Microjazz" },
  ],
};

/* --- Die Prüfungspunkte ------------------------------------------------------- */

/* `art` sagt, wie ein Punkt gemessen wird:
   - "stueck", "etuede", "klavier": Titel, Stufe, Tempo, Aufnahmen.
   - "abdeckung": zählt die App selbst, aus dem Tonleiter-Werkzeug.
   - "pruefpunkt": eine Fähigkeit ohne Stück, grob selbst eingeschätzt.
   `werkzeug` ist das, womit man in der App daran arbeitet. */
export const TEILE = [
  {
    id: "sax",
    titel: "Saxophon",
    punkte: [
      { id: "tonleitern", art: "abdeckung", titel: "Tonleitern und Akkorde",
        was: "Dur, Moll äolisch, harmonisch, melodisch, die Modi dorisch bis lokrisch, Drei- und Vierklänge — alle Tonarten, theoretisch und am Instrument.",
        werkzeug: { tab: "technik", tool: "tonleitern", name: "Tonleitern" } },
      { id: "etuede1", art: "etuede", titel: "Jazzetüde",
        was: "Freie Wahl, zum Beispiel Niehaus, Lipsius, Mintzer, Snidero." },
      { id: "etuede2", art: "etuede", titel: "Zweite Etüde oder Transkription",
        was: "Eine weitere Etüde oder ein transkribiertes Solo, zum Beispiel von Parker." },
      { id: "stueck1", art: "stueck", titel: "Stück 1", stil: true,
        was: "Jazz oder Popularmusik mit Improvisation. Leadsheet für die Begleitung mitbringen." },
      { id: "stueck2", art: "stueck", titel: "Stück 2", stil: true,
        was: "Eine andere Stilrichtung als Stück 1." },
      { id: "stueck3", art: "stueck", titel: "Stück 3", stil: true,
        was: "Noch eine andere Stilrichtung. Eine Ballade zeigt den Ton wie nichts sonst." },
      { id: "blattlesen", art: "pruefpunkt", titel: "Blattlesen",
        was: "Einfache Stücke vom Blatt, mit Swing-Achteln und Synkopen.",
        werkzeug: { tab: "technik", tool: "blattspiel", name: "Blattspiel" } },
    ],
  },
  {
    id: "klavier",
    titel: "Klavier",
    punkte: [
      { id: "klavier1", art: "klavier", titel: "Klavierstück 1",
        was: "Originalliteratur für Klavier, eine Epoche. Auch ein Einzelsatz." },
      { id: "klavier2", art: "klavier", titel: "Klavierstück 2",
        was: "Eine andere Epoche — oder aus der Popularmusik: Corea, Children's Songs; Moser, Rock Piano; ein Standard." },
      { id: "kadenzen", art: "pruefpunkt", titel: "Kadenzen",
        was: "Einfache Kadenz in Quint-, Oktav- und Terzlage, Dur und Moll bis zwei Kreuze und zwei Be. Dazu II–V–I in Dur bis zwei Vorzeichen." },
      { id: "klavierblatt", art: "pruefpunkt", titel: "Blattspiel am Klavier",
        was: "Leichte Stücke: einfache barocke Tänze, Bartók Mikrokosmos Ende Band 1, Norton Microjazz." },
    ],
  },
  {
    id: "hoeren",
    titel: "Hören",
    punkte: [
      { id: "diktat", art: "pruefpunkt", titel: "Melodie- und Rhythmusdiktat",
        was: "Tonale und freitonale Melodien und Rhythmen vom Klavier aufschreiben. Zur Vorbereitung gibt die mdw zusätzlich das Programm MusicCoach frei.",
        werkzeug: { tab: "gehoer", tool: "hoertest", modus: "melodie", name: "Hörtest: Diktat" } },
      { id: "akkorde", art: "pruefpunkt", titel: "Intervalle und Akkorde",
        was: "Intervalle, Dur- und Molldreiklänge, Septakkorde, jeweils mit Umkehrungen.",
        werkzeug: { tab: "gehoer", tool: "hoertest", modus: "akkorde", name: "Hörtest: Akkorde" } },
      { id: "fehler", art: "pruefpunkt", titel: "Fehler erkennen",
        was: "Einen veränderten Ton im Akkord hören, Gehörtes mit Notiertem vergleichen und zuordnen.",
        werkzeug: { tab: "gehoer", tool: "hoertest", modus: "fehler", name: "Hörtest: Fehler finden" } },
    ],
  },
];

export const ALLE_PUNKTE = TEILE.flatMap(t => t.punkte.map(p => ({ ...p, teil: t.id })));
export const punktOf = id => ALLE_PUNKTE.find(p => p.id === id) || null;

const schluessel = id => "pruefung:" + id;

/** Der gespeicherte Stand eines Punkts. Leer, solange nichts eingetragen ist. */
export const eintrag = (drills, id) => drills?.[schluessel(id)] || {};
export const eintragSchluessel = schluessel;

/** Die Titel des Programms, für die Aufnahme und die Vorschlagsliste. */
export function programmTitel(drills) {
  return ALLE_PUNKTE
    .filter(p => ["stueck", "etuede", "klavier"].includes(p.art))
    .map(p => eintrag(drills, p.id).titel)
    .filter(Boolean);
}

/* --- Termin und Zeitplan ------------------------------------------------------ */

const TAG = 86400000;
const utc = iso => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const iso = t => new Date(t).toISOString().slice(0, 10);
export const tageBis = (von, bis) => Math.round((utc(bis) - utc(von)) / TAG);

function monateVor(termin, monate) {
  const [y, m, d] = termin.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 - monate, 1));
  const letzter = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, letzter)));
}

export function termin(drills) {
  const t = eintrag(drills, "termin").datum;
  return /^\d{4}-\d{2}-\d{2}$/.test(t || "") ? { datum: t, geschaetzt: false }
    : { datum: TERMIN_GESCHAETZT, geschaetzt: true };
}

/**
 * Der Zeitplan rückwärts vom Prüfungstag. `soll` ist die Stufe, auf der
 * Stücke, Etüden und Klavierstücke zu diesem Zeitpunkt mindestens stehen
 * sollten (Index in der Stufenliste, 0 heißt „gewählt“).
 *
 * Die Abstände sind keine Vorschrift, sondern das, was in neun Monaten neben
 * einem Studium realistisch ist: früh wählen, im Winter auswendig, im
 * Frühjahr mit Begleitung, und die letzten Wochen nur noch vorspielen.
 */
export function meilensteine(terminDatum) {
  const jahr = Number(terminDatum.slice(0, 4));
  return [
    { datum: monateVor(terminDatum, 8), soll: 0, titel: "Programm steht",
      was: "Alle drei Stücke, beide Etüden und beide Klavierstücke gewählt, Leadsheets und Noten liegen vor. Die Stilrichtungen unterscheiden sich." },
    { datum: monateVor(terminDatum, 6), soll: 1, titel: "Themen auswendig",
      was: "Alle Themen ohne Blatt, Etüden langsam sicher, Klavier Hände einzeln. Tonleitern: jede Art in jeder Tonart mindestens einmal." },
    { datum: monateVor(terminDatum, 4), soll: 3, titel: "Über jede Form improvisieren",
      was: "Zwei Chorusse über jedes Stück, ohne die Form zu verlieren. Kadenzen am Klavier sitzen." },
    { datum: `${jahr}-03-01`, soll: null, titel: "Anmeldung",
      was: "Online in mdwOnline. 2026 lief die Frist vom 2. März bis 6. Mai — den Termin für dieses Jahr auf der mdw-Seite prüfen. Werke und Korrepetition werden dort angegeben." },
    { datum: monateVor(terminDatum, 3), soll: 4, titel: "Mit Begleitung",
      was: "Jedes Stück regelmäßig mit Pianist, Band oder Playalong. Einzählen, Formabsprache, Schluss." },
    { datum: iso(utc(terminDatum) - 42 * TAG), soll: 5, titel: "Probevorspiel",
      was: "Das ganze Programm vor Publikum, am Stück, aufgenommen. Danach nur noch Stellen, keine neuen Stücke." },
    { datum: iso(utc(terminDatum) - 7 * TAG), soll: 5, titel: "Nichts Neues mehr",
      was: "Kein neues Blatt, kein neues Setup. Leadsheets in Kopie für die Begleitung. Täglich einmal kalt durchspielen." },
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Auf welcher Stufe die Stücke heute mindestens stehen sollten, oder -1. */
export function sollStufe(terminDatum, heute) {
  let soll = -1;
  for (const m of meilensteine(terminDatum)) {
    if (m.soll !== null && m.datum <= heute) soll = Math.max(soll, m.soll);
  }
  return soll;
}

/** Der nächste Meilenstein, der noch vor einem liegt. */
export const naechsterMeilenstein = (terminDatum, heute) =>
  meilensteine(terminDatum).find(m => m.datum >= heute) || null;

/* --- Prüfen, was fehlt --------------------------------------------------------- */

/**
 * Hinweise zum Programm als Ganzes. Das ist, was ein Lehrer beim ersten
 * Blick auf die Liste sagen würde.
 */
export function hinweise(drills, heute) {
  const out = [];
  const stuecke = TEILE[0].punkte.filter(p => p.art === "stueck").map(p => eintrag(drills, p.id));
  const stile = stuecke.map(s => s.stil).filter(Boolean);
  const swingig = new Set(["Swing", "Bebop", "Blues"]);
  if (stile.length >= 2 && new Set(stile).size < stile.length) {
    out.push("Zwei Stücke haben dieselbe Stilrichtung. Verlangt sind verschiedene.");
  } else if (stile.length === 3 && stile.every(s => swingig.has(s))) {
    out.push("Swing, Bebop und Swing-Blues klingen für eine Kommission nach einer Stilrichtung. Nimm eine Ballade oder ein Stück mit geradem Groove dazu — Latin, Funk oder Pop.");
  }
  if (stuecke.some(s => s.titel) && !stile.includes("Ballade")) {
    out.push("Keine Ballade im Programm. Nirgends hört man den Ton so deutlich, und frühere Ausschreibungen haben ausdrücklich eine verlangt.");
  }
  const t = termin(drills);
  const soll = sollStufe(t.datum, heute);
  if (soll >= 0) {
    const hinten = ALLE_PUNKTE
      .filter(p => ["stueck", "etuede", "klavier"].includes(p.art))
      .filter(p => (eintrag(drills, p.id).stufe ?? -1) < soll);
    if (hinten.length) {
      out.push(`${hinten.length} ${hinten.length === 1 ? "Punkt liegt" : "Punkte liegen"} hinter dem Zeitplan: ${hinten.map(p => eintrag(drills, p.id).titel || p.titel).join(", ")}.`);
    }
  }
  return out;
}
