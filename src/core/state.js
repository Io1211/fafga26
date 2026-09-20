/**
 * Gemeinsamer Zustand — DER VERTRAG ZWISCHEN DEN VIER MODULEN.
 *
 * Diese Datei ist die einzige, die alle vier Module gemeinsam benutzen.
 * Änderungen hier bitte im Team absprechen, alles andere gehört jeweils
 * genau einer Person.
 *
 *   state.haus   Modul 1 (Onboarding) schreibt · alle lesen
 *   state.post   Modul 4 (Text & Ausgabe) schreibt · Modul 2 rendert es
 *   state.motiv  Modul 2 (Editor) schreibt
 *   state.ki     Modul 3 (KI-Dienst) schreibt
 *
 * Gelesen wird direkt (state.haus.ort). Geschrieben wird NUR über die
 * setzen-Funktionen, sonst erfährt niemand davon.
 */

const HORCHER = new Map();

/** Auf Änderungen horchen. Themen: "haus", "post", "motiv", "ki", "ansicht" */
export function on(thema, fn) {
  if (!HORCHER.has(thema)) HORCHER.set(thema, new Set());
  HORCHER.get(thema).add(fn);
  return () => HORCHER.get(thema).delete(fn);
}

/** Alle Horcher eines Themas benachrichtigen. */
export function melden(thema) {
  (HORCHER.get(thema) || []).forEach(fn => {
    try { fn(state); } catch (e) { console.error(`Horcher für "${thema}" fehlgeschlagen:`, e); }
  });
}

/* ------------------------------------------------------------------ *
 *  Vorgabe — der Demo-Betrieb aus Case Study 06
 * ------------------------------------------------------------------ */

export const VORGABE_HAUS = {
  name: "Berggasthof Wildeben",
  ort: "Navis",
  art: "Berggasthof",
  farbe: "#d72229",
  logo: null,
  belege: [
    "Der Großvater hat das Haus 1934 gebaut, wir führen es in dritter Generation.",
    "Das Fleisch kommt vom Nachbarhof, 400 Meter Luftlinie.",
    "Unsere Köchin Marlies steht seit 19 Jahren in derselben Küche.",
    "Acht Zimmer, alle mit Blick nach Süden.",
    "Im Winter kommt man nur zu Fuß oder mit der Rodel herauf."
  ],
  sperr: ["Haubenküche", "Bio-zertifiziert", "Fünf Sterne", "Wellnesstempel"],
  ctaGast: "Tisch reservieren: 05278 / 2043",
  ctaTeam: "Komm einen Tag mit — eine Nachricht genügt"
};

/* ------------------------------------------------------------------ *
 *  Der Zustand
 * ------------------------------------------------------------------ */

export const state = {
  /** MODUL 1 — Das Hausgedächtnis. Einmal eingerichtet, von allen gelesen. */
  haus: { ...VORGABE_HAUS, belege: [...VORGABE_HAUS.belege], sperr: [...VORGABE_HAUS.sperr] },

  /**
   * MODUL 4 — Der fertige Textvorschlag. Modul 2 rendert genau das.
   *   kicker   string   kleine Zeile über der Schlagzeile
   *   head     string[] Overlay-Zeilen, je höchstens 15 Zeichen
   *   key      string   welche Zeile farbig gesetzt wird
   *   caption  string   Text für die Bildunterschrift
   *   tags     string   Hashtags als eine Zeile
   *   quellen  string[] welche Belege verwendet wurden (für die Prüfliste)
   *   cards    {text,dur,key}[]  Untertitel-Karten fürs Video
   */
  post: null,

  /** MODUL 2 — Welches Foto gerade bearbeitet wird. */
  motive: [
    { src: "assets/motiv-haus.jpg", label: "Das Haus von außen" },
    { src: "assets/motiv-arbeit.jpg", label: "Bei der Arbeit" }
  ],
  motiv: 0,

  /** MODUL 3 — Zustand des KI-Dienstes. */
  ki: { anbieter: "keiner", bereit: false, laeuft: false },

  /** Gemeinsame Einstellungen des aktuellen Posts. */
  ziel: "gast",       // "gast" | "team"
  format: "story",    // "story" (1080×1920) | "post" (1080×1350)
  raster: false,      // Hilfslinien im Editor
  ansicht: "onboarding", // "onboarding" | "studio"
  eingerichtet: false
};

/* ------------------------------------------------------------------ *
 *  Schreiben
 * ------------------------------------------------------------------ */

export function setzeHaus(teil) {
  Object.assign(state.haus, teil);
  sichern();
  melden("haus");
}

export function setzePost(post) {
  state.post = post;
  melden("post");
}

export function setzeMotiv(i) {
  state.motiv = Math.max(0, Math.min(state.motive.length - 1, i));
  melden("motiv");
}

export function motivHinzu(m) {
  state.motive.push(m);
  state.motiv = state.motive.length - 1;
  melden("motiv");
}

export function setzeKi(teil) {
  Object.assign(state.ki, teil);
  melden("ki");
}

/** Ziel, Format, Raster — alles, was den Post betrifft, aber keinem Modul allein gehört. */
export function setzeOption(teil) {
  Object.assign(state, teil);
  sichern();
  melden("post");
}

export function setzeAnsicht(a) {
  state.ansicht = a;
  if (a === "studio") { state.eingerichtet = true; sichern(); }
  melden("ansicht");
}

/* ------------------------------------------------------------------ *
 *  Speichern — bleibt im Browser des Betriebs, geht nirgends hin
 * ------------------------------------------------------------------ */

const SCHLUESSEL = "hauspost.v3";

export function sichern() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({
      haus: { ...state.haus, logo: null },  // Objekt-URLs überleben den Neustart nicht
      ziel: state.ziel,
      format: state.format,
      eingerichtet: state.eingerichtet
    }));
  } catch (e) { /* privates Fenster, gesperrter Speicher — egal */ }
}

export function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return;
    const d = JSON.parse(roh);
    if (d.haus) Object.assign(state.haus, d.haus);
    if (d.ziel) state.ziel = d.ziel;
    if (d.format) state.format = d.format;
    state.eingerichtet = !!d.eingerichtet;
    state.ansicht = state.eingerichtet ? "studio" : "onboarding";
  } catch (e) { /* kaputter Eintrag — mit der Vorgabe weitermachen */ }
}
