/* ==========================================================================
   Können — was die App über den Spieler weiß

   Die App misst seit Monaten mit: Trefferquoten, Serien, Intonation je Ton,
   den höchsten sicheren Teilton, welche Tonart nie drankam, welcher Block
   regelmäßig ausfällt. Bisher lag das alles in `drills` herum und wurde nur
   dort angezeigt, wo es entstanden ist. Wer es sehen wollte, musste wissen,
   wo er suchen soll — und wer weiß, wo seine Schwäche liegt, hat sie zur
   Hälfte schon behoben.

   Dieses Modul dreht das um: es liest den gesamten Datenbestand und sagt,
   woran heute zu arbeiten ist. Jeder Befund trägt seinen Grund mit, denn ein
   Vorschlag ohne Begründung wird weggetippt.

   Zwei Regeln, die das Ergebnis brauchbar halten:

   - **Wenig Daten heißt kein Urteil.** Drei Versuche sind keine Quote. Was
     zu dünn ist, wird als „noch nicht gemessen“ geführt und nicht als
     Schwäche — sonst ist die schlechteste Übung immer die neueste.
   - **Der Übe-Kontext filtert.** Obertöne am Travel Sax vorzuschlagen ist
     Unsinn, und zuhause um zehn Uhr abends ist es das Metronom im
     Fortissimo auch.

   Reine Rechnung auf dem Zustandsobjekt. Kein DOM, keine Speicherzugriffe,
   damit es ohne Browser prüfbar bleibt.
   ========================================================================== */

"use strict";

/** Mindestanzahl Versuche, bevor aus einer Quote ein Urteil wird. */
export const GENUG = 6;

/* Wohin ein Vorschlag führt. Absichtlich als nackte Zeichenketten und nicht
   über `views.js`: dieses Modul darf nichts importieren, was ein DOM anfasst. */
const ZIEL = {
  tonleitern:   { tab: "technik", tool: "tonleitern",   name: "Tonleitern" },
  rhythmus:     { tab: "technik", tool: "rhythmus",     name: "Rhythmus" },
  blattspiel:   { tab: "technik", tool: "blattspiel",   name: "Blattspiel" },
  gehoer:       { tab: "gehoer",  tool: "gehoerbildung", name: "Gehörbildung" },
  hoertest:     { tab: "gehoer",  tool: "hoertest",     name: "Hörtest" },
  nachspielen:  { tab: "gehoer",  tool: "nachspielen",  name: "Nachspielen" },
  stimmgeraet:  { tab: "ton",     tool: "stimmgeraet",  name: "Stimmgerät" },
  obertoene:    { tab: "ton",     tool: "obertoene",    name: "Obertöne" },
  tonanalyse:   { tab: "ton",     tool: "tonanalyse",   name: "Tonanalyse" },
  bordun:       { tab: "ton",     tool: "bordun",       name: "Bordun" },
  grundlagen:   { tab: "impro",   tool: "grundlagen",   name: "Grundlagen" },
  improvisation:{ tab: "impro",   tool: "improvisation",name: "Begleitband" },
  tonartfinden: { tab: "impro",   tool: "tonartfinden", name: "Tonart finden" },
  callresponse: { tab: "impro",   tool: "callresponse", name: "Call and Response" },
  gigtraining:  { tab: "impro",   tool: "gigtraining",  name: "Gig-Training" },
  songmitspielen:{tab: "impro",   tool: "songmitspielen",name:"Zum Song spielen" },
};

/* Was in welchem Kontext überhaupt geht. Am Travel Sax fehlt der Luftstrom
   durch ein Rohr — Ansatz, Voicing, Klangfarbe und Intonation lassen sich
   dort nicht üben, und ein Vorschlag, der das ignoriert, ist schlechter als
   gar keiner. */
const NICHT_IM_KONTEXT = {
  travelsax: new Set(["obertoene", "stimmgeraet", "tonanalyse", "bordun"]),
  leise:     new Set(["gigtraining"]),
  probelokal: new Set(),
  tonplan:    new Set(),
  // Am Klavier ist kein Saxophon in der Hand. Was bleibt, ist das Gehör.
  klavier:    new Set(["obertoene", "stimmgeraet", "tonanalyse", "bordun", "tonleitern",
                       "rhythmus", "blattspiel", "improvisation", "tonartfinden", "callresponse",
                       "gigtraining", "songmitspielen", "nachspielen"]),
};

const ALLE_DUR = [
  "C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "H-Dur", "Fis-Dur",
  "F-Dur", "B-Dur", "Es-Dur", "As-Dur", "Des-Dur", "Ges-Dur",
];

/* --- Kleine Helfer ---------------------------------------------------------- */

const versuche = d => (d?.right || 0) + (d?.wrong || 0);
const quote = d => { const n = versuche(d); return n ? (d.right || 0) / n : null; };

/** Alle Drills, deren Schlüssel mit `praefix:` beginnt. */
function mitPraefix(drills, praefix) {
  const out = [];
  for (const [id, d] of Object.entries(drills || {})) {
    if (id === praefix || id.startsWith(praefix + ":")) out.push({ id, d });
  }
  return out;
}

const prozent = q => Math.round(q * 100);

/* --- Einzelne Befunde ------------------------------------------------------- */

/**
 * Tonleitern: zuerst zählt, was **nie** drankam. Eine Tonart mit sechs
 * Vorzeichen, die man nie gespielt hat, ist in der Prüfung teurer als eine,
 * die man zu siebzig Prozent trifft.
 */
function tonleitern(drills) {
  // Nur ein wirklich gespielter Durchgang zählt. Das bloße Öffnen des
  // Werkzeugs legt für jede Tonart einen leeren Eintrag an; wer den als
  // „geübt“ liest, meldet nach dem ersten Blick in die Liste nie wieder
  // eine fehlende Tonart.
  // Das Tonleiter-Werkzeug zählt Abhaken (`count`), nicht richtig und
  // falsch. Beides gilt als gespielt.
  const geuebt = new Set(mitPraefix(drills, "skala")
    .filter(x => versuche(x.d) > 0 || (x.d?.count || 0) > 0)
    .map(x => x.id.split(":")[2]));
  const fehlen = ALLE_DUR.filter(k => !geuebt.has(k));
  const befunde = [];

  if (fehlen.length) {
    befunde.push({
      id: "skalen:fehlen", bereich: "Technik", ziel: ZIEL.tonleitern,
      titel: fehlen.length === 1
        ? `${fehlen[0]} war noch nie dran`
        : `${fehlen.length} Tonarten waren noch nie dran`,
      grund: `Angefangen bei ${fehlen[0]}. Eine ungeübte Tonart kostet in der Prüfung mehr als eine, die zu siebzig Prozent sitzt.`,
      gewicht: 0.55 + Math.min(0.3, fehlen.length * 0.03),
      messbar: false,
    });
  }

  const schwach = mitPraefix(drills, "skala")
    .map(x => ({ name: x.id.split(":")[2], q: quote(x.d), n: versuche(x.d) }))
    .filter(x => x.n >= GENUG && x.q != null)
    .sort((a, b) => a.q - b.q)[0];
  if (schwach && schwach.q < 0.8) {
    befunde.push({
      id: "skalen:schwach", bereich: "Technik", ziel: ZIEL.tonleitern,
      titel: `${schwach.name} sitzt noch nicht`,
      grund: `${prozent(schwach.q)} % getroffen aus ${schwach.n} Durchgängen. Langsam und fehlerfrei schlägt schnell und ungefähr.`,
      gewicht: 0.9 - schwach.q,
      messbar: true,
    });
  }
  return befunde;
}

/** Intonation: der Ton mit der größten systematischen Abweichung. */
function intonation(drills) {
  const karte = drills?.["stimmgeraet:noten"];
  if (!karte) return [];
  const zeilen = Object.entries(karte)
    .filter(([k, v]) => /^\d+$/.test(k) && v && v.n >= 3)
    .map(([k, v]) => ({ midi: Number(k), mean: v.mean, n: v.n,
                        sd: v.n > 1 ? Math.sqrt(v.m2 / (v.n - 1)) : 0 }));
  if (!zeilen.length) return [];

  const schlimm = [...zeilen].sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean))[0];
  const befunde = [];
  if (Math.abs(schlimm.mean) >= 10) {
    const abw = Math.round(schlimm.mean);
    befunde.push({
      id: "intonation:ton", bereich: "Ton", ziel: ZIEL.stimmgeraet,
      titel: `Ein Griff liegt ${Math.abs(abw)} Cent zu ${abw > 0 ? "hoch" : "tief"}`,
      grund: `Gemessen über ${schlimm.n} Messungen, und zwar immer in dieselbe Richtung. Das ist kein Zufall, sondern dein Instrument oder dein Ansatz in dieser Lage.`,
      gewicht: 0.5 + Math.min(0.35, Math.abs(abw) / 60),
      messbar: true, midi: schlimm.midi, cents: abw,
    });
  }

  // Streuung ist das andere Problem, und das schlimmere: wer mal zu hoch und
  // mal zu tief liegt, kann nichts einstellen, sondern muss hören lernen.
  const wackelig = [...zeilen].sort((a, b) => b.sd - a.sd)[0];
  if (wackelig.sd >= 18) {
    befunde.push({
      id: "intonation:streuung", bereich: "Ton", ziel: ZIEL.bordun,
      titel: "Ein Ton streut stark",
      grund: `Mal zu hoch, mal zu tief, ${Math.round(wackelig.sd)} Cent Streuung. Dagegen hilft kein Mundstückzug, sondern der Bordun: gegen einen liegenden Ton hört man sich selbst.`,
      gewicht: 0.55 + Math.min(0.3, wackelig.sd / 120),
      messbar: true, midi: wackelig.midi,
    });
  }
  return befunde;
}

/** Obertöne: wie weit hinauf die Reihe verlässlich steht. */
function obertoene(drills) {
  // Auch hier gilt: ein Eintrag entsteht schon beim Öffnen. Gemessen ist
  // erst, was wirklich geklungen hat.
  const eintraege = mitPraefix(drills, "obertoene")
    .map(x => ({ griff: Number(x.id.split(":")[1]), hoechster: x.d?.hoechster || 0 }))
    .filter(x => Number.isFinite(x.griff) && x.hoechster > 0);
  if (!eintraege.length) {
    return [{
      id: "obertoene:nie", bereich: "Ton", ziel: ZIEL.obertoene,
      titel: "Obertöne waren noch nie dran",
      grund: "An ihnen hängen Altissimo, die Ansprache im pp und saubere Registerwechsel. Kein anderer Block zahlt auf so viel gleichzeitig ein.",
      gewicht: 0.8, messbar: false,
    }];
  }
  const beste = Math.max(...eintraege.map(x => x.hoechster));
  if (beste < 6) {
    return [{
      id: "obertoene:hoeher", bereich: "Ton", ziel: ZIEL.obertoene,
      titel: beste < 2 ? "Die Naturtonreihe steht noch nicht"
                       : `Teilton ${beste + 1} steht noch nicht`,
      grund: beste < 2
        ? "Noch kein Teilton sicher. Fang beim zweiten an, und hör ihn dir vorher an — ein Ton, den man im Ohr hat, kommt."
        : `Sicher bis Teilton ${beste}. Der nächste kommt nicht über mehr Druck, sondern über engeres Voicing.`,
      gewicht: 0.45 + (6 - beste) * 0.05, messbar: true, hoechster: beste,
    }];
  }
  return [];
}

/** Gehörbildung und Nachspielen: reine Trefferquoten. */
function gehoer(drills) {
  const befunde = [];
  const teile = [
    ...mitPraefix(drills, "gehoer").map(x => ({ ...x, ziel: ZIEL.gehoer,
      was: x.id.split(":")[1], stufe: x.id.split(":")[2] })),
    ...mitPraefix(drills, "nachspielen").map(x => ({ ...x, ziel: ZIEL.nachspielen,
      was: "nachspielen", stufe: x.id.split(":")[1] })),
  ];
  // Der Hörtest ist der schriftliche Prüfungsteil. Seine Fehlerzähler
  // stehen unter hoertest:fehler und sind keine Trefferquote.
  const hoertest = mitPraefix(drills, "hoertest")
    .filter(x => x.id.split(":")[1] !== "fehler")
    .map(x => ({ ...x, ziel: ZIEL.hoertest, was: "ht-" + x.id.split(":")[1], stufe: x.id.split(":")[2] }));
  teile.push(...hoertest);
  const NAME = { intervalle: "Intervalle", akkorde: "Akkorde", skalen: "Skalen",
                 nachspielen: "Nachspielen", "ht-melodie": "Melodiediktate", "ht-rhythmus": "Rhythmusdiktate",
                 "ht-akkorde": "Akkorde mit Lage", "ht-fehler": "Fehler finden", "ht-wieder": "Wiedererkennen" };

  const schwach = teile
    .map(x => ({ ...x, q: quote(x.d), n: versuche(x.d) }))
    .filter(x => x.n >= GENUG && x.q != null && x.q < 0.75)
    .sort((a, b) => a.q - b.q)[0];
  if (schwach) {
    befunde.push({
      id: "gehoer:schwach", bereich: "Gehör", ziel: schwach.ziel,
      titel: `${NAME[schwach.was] || schwach.was} treffen nur ${prozent(schwach.q)} %`,
      grund: schwach.was === "nachspielen"
        ? "Beim Nachspielen zählt nicht Wissen, sondern die Verbindung zwischen Ohr und Griff. Kürzere Phrasen, dafür fehlerfrei."
        : "Unter drei von vier heißt raten. Geh eine Stufe zurück, bis es über neunzig Prozent steht, dann wieder hoch.",
      gewicht: 0.85 - schwach.q, messbar: true,
    });
  }
  if (!hoertest.some(x => versuche(x.d) > 0)) {
    befunde.push({
      id: "hoertest:nie", bereich: "Gehör", ziel: ZIEL.hoertest,
      titel: "Der Hörtest war noch nie dran",
      grund: "Der schriftliche Hörtest ist ein eigener Prüfungsteil und muss bestanden werden: Melodie- und Rhythmusdiktat, Akkorde mit Umkehrungen, Fehler finden. Aufschreiben ist eine andere Fähigkeit als Benennen.",
      gewicht: 0.72, messbar: false,
    });
  }
  if (!teile.length) {
    befunde.push({
      id: "gehoer:nie", bereich: "Gehör", ziel: ZIEL.nachspielen,
      titel: "Nach Gehör nachspielen war noch nie dran",
      grund: "Das ist die Übung, die am schnellsten aufs Improvisieren durchschlägt: die App spielt eine Phrase, du spielst sie nach, das Mikrofon prüft.",
      gewicht: 0.7, messbar: false,
    });
  }
  return befunde;
}

/** Improvisation: gefunden wird die Tonart schnell genug? */
function improvisation(drills) {
  const befunde = [];
  const tf = mitPraefix(drills, "tonartfinden")
    .map(x => ({ ...x, q: quote(x.d), n: versuche(x.d), schnellste: x.d?.schnellste }));
  const gesamtN = tf.reduce((s, x) => s + x.n, 0);

  if (!gesamtN) {
    befunde.push({
      id: "impro:tonart", bereich: "Impro", ziel: ZIEL.tonartfinden,
      titel: "Tonart nach Gehör finden war noch nie dran",
      grund: "Auf dem Gig sagt dir niemand die Tonart. Das ist die eine Fähigkeit, ohne die alles andere im Improvisieren nichts nützt.",
      gewicht: 0.75, messbar: false,
    });
  } else {
    const treffer = tf.reduce((s, x) => s + (x.d.right || 0), 0) / gesamtN;
    const schnellste = tf.map(x => x.schnellste).filter(x => x > 0).sort((a, b) => a - b)[0];
    if (treffer < 0.7) {
      befunde.push({
        id: "impro:tonart-quote", bereich: "Impro", ziel: ZIEL.tonartfinden,
        titel: `Die Tonart sitzt erst zu ${prozent(treffer)} %`,
        grund: "Fang beim Bass an, nicht bei der Melodie. Und geh eine Stufe zurück, solange es unter achtzig Prozent steht.",
        gewicht: 0.9 - treffer, messbar: true,
      });
    } else if (schnellste && schnellste > 20) {
      befunde.push({
        id: "impro:tonart-zeit", bereich: "Impro", ziel: ZIEL.tonartfinden,
        titel: `Die Tonart braucht noch ${Math.round(schnellste)} Sekunden`,
        grund: "Richtig ist sie, schnell noch nicht. Auf einem DJ-Set hast du acht Takte, nicht zwanzig Sekunden.",
        gewicht: 0.45, messbar: true,
      });
    }
  }

  const songs = drills?.["songmitspielen:liste"]?.songs || [];
  if (gesamtN && songs.length === 0) {
    befunde.push({
      id: "impro:song", bereich: "Impro", ziel: ZIEL.songmitspielen,
      titel: "Noch kein Song aufgemacht",
      grund: "Die Tonart zu finden übst du am Gerät, das Mitspielen nur am echten Stück. Sieben Schritte, und der Song bleibt gespeichert.",
      gewicht: 0.5, messbar: false,
    });
  }
  return befunde;
}

/** Technik: Rhythmus und Blattspiel. */
function technik(drills) {
  const befunde = [];
  for (const [praefix, ziel, name, satz] of [
    ["rhythmus", ZIEL.rhythmus, "Der Rhythmus",
     "Gleichmäßig daneben ist ein anderes Problem als zufällig daneben — die Auswertung im Werkzeug sagt dir, welches von beiden."],
    ["blattspiel", ZIEL.blattspiel, "Das Blattspiel",
     "Blattspiel wird nicht besser, indem man dasselbe zweimal spielt. Jedes Mal etwas Neues, und lieber langsamer."],
  ]) {
    const teile = mitPraefix(drills, praefix)
      .map(x => ({ q: quote(x.d), n: versuche(x.d) }))
      .filter(x => x.n >= GENUG && x.q != null);
    if (!teile.length) continue;
    const gesamtN = teile.reduce((s, x) => s + x.n, 0);
    const q = teile.reduce((s, x) => s + x.q * x.n, 0) / gesamtN;
    if (q < 0.75) {
      befunde.push({
        id: praefix + ":schwach", bereich: "Technik", ziel,
        titel: `${name} steht bei ${prozent(q)} %`,
        grund: satz, gewicht: 0.85 - q, messbar: true,
      });
    }
  }
  return befunde;
}

/** Welcher Block fällt im Protokoll regelmäßig aus? */
export function ausgelasseneBloecke(log, bloecke) {
  if (!log?.length || !bloecke?.length) return [];
  const letzte = log.slice(-10);
  const zaehler = new Map(bloecke.map(b => [b.name, 0]));
  for (const e of letzte) {
    for (const b of bloecke) {
      if (!(e.blocks || []).includes(b.name)) zaehler.set(b.name, zaehler.get(b.name) + 1);
    }
  }
  return [...zaehler.entries()]
    .filter(([, n]) => n >= Math.ceil(letzte.length * 0.6))
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, ausgelassen: n, von: letzte.length }));
}

/* --- Das Gesamtbild --------------------------------------------------------- */

/**
 * Alle Befunde, das Wichtigste zuerst. `kontext` ist der Übe-Kontext
 * (`probelokal`, `leise`, `travelsax`); was dort nicht geht, fliegt raus.
 */
export function befunde(S, kontext = "probelokal") {
  const drills = S?.drills || {};
  const gesperrt = NICHT_IM_KONTEXT[kontext] || NICHT_IM_KONTEXT.probelokal;

  const alle = [
    ...tonleitern(drills), ...intonation(drills), ...obertoene(drills),
    ...gehoer(drills), ...improvisation(drills), ...technik(drills),
  ];
  return alle
    .filter(b => !gesperrt.has(b.ziel.tool))
    .sort((a, b) => b.gewicht - a.gewicht);
}

/** Der eine Vorschlag für jetzt, oder null, wenn nichts ansteht. */
export const naechsterSchritt = (S, kontext) => befunde(S, kontext)[0] || null;

/**
 * Wie viel die App überhaupt über einen Bereich weiß, von 0 bis 1. Das ist
 * ausdrücklich **kein** Können, sondern Datenlage — und genau so wird es
 * angezeigt, damit aus „wenig geübt“ nicht „schlecht“ wird.
 */
export function datenlage(S) {
  const drills = S?.drills || {};
  const zaehl = p => mitPraefix(drills, p).reduce((s, x) => s + versuche(x.d), 0);
  const karte = Object.keys(drills["stimmgeraet:noten"] || {}).length;
  return [
    { id: "ton", name: "Ton", n: karte * 3 +
      mitPraefix(drills, "obertoene").reduce((s, x) => s + (x.d?.hoechster || 0), 0) * 4 },
    { id: "technik", name: "Technik", n: zaehl("skala") + zaehl("rhythmus") + zaehl("blattspiel") },
    { id: "gehoer", name: "Gehör", n: zaehl("gehoer") + zaehl("nachspielen") },
    { id: "impro", name: "Impro", n: zaehl("tonartfinden") + zaehl("callresponse") +
      ((drills["songmitspielen:liste"]?.songs || []).length * 10) +
      ((drills["gigtraining"]?.laeufe || 0) * 5) },
  ].map(b => ({ ...b, stand: Math.min(1, b.n / 60) }));
}
