/**
 * MODUL FOTO- UND VIDEO-EDITOR · Zustand
 * ======================================
 * Der Editor bringt seinen eigenen Zustand mit und hängt an keiner
 * gemeinsamen Datei. So lässt er sich einbinden, ohne dass am Dashboard
 * oder am Backend etwas geändert werden muss.
 *
 * Die Feldnamen folgen dem Backend-Vertrag aus backend/app/schemas.py:
 * dort heißt es `sperrliste`, `cta_gast`, `cta_team`, und `hashtags` ist
 * eine Liste. `uebernehmeHaus()` und `uebernehmeCopy()` rechnen um, damit
 * im Editor durchgehend dieselben Namen gelten.
 */

const HORCHER = new Map();

export function on(thema, fn) {
  if (!HORCHER.has(thema)) HORCHER.set(thema, new Set());
  HORCHER.get(thema).add(fn);
  return () => HORCHER.get(thema).delete(fn);
}

export function melden(thema) {
  (HORCHER.get(thema) || []).forEach(fn => {
    try { fn(state); } catch (e) { console.error(`Horcher "${thema}":`, e); }
  });
}

/* ------------------------------------------------------------------ *
 *  Zustand
 * ------------------------------------------------------------------ */

export const state = {
  /** Das Haus. Feldnamen wie im Editor, Umrechnung siehe uebernehmeHaus(). */
  haus: {
    modus: "betrieb",          // "betrieb" | "event"
    datum: "", ortDetail: "",  // nur bei Events
    name: "Aurora Lodge",
    ort: "Salzburg",
    art: "Hotel & Restaurant",
    farbe: "#0E7C66",
    logo: null,
    logoFarben: [],
    belege: [],
    sperrliste: [],
    ctaGast: "Tisch gibt es unter der Nummer im Profil.",
    ctaTeam: "Melde dich einfach — wir zeigen dir das Haus."
  },

  /** Der Textvorschlag. Entspricht `Copy` aus schemas.py. */
  post: null,

  motive: [],
  motiv: 0,

  ziel: "gast",            // "gast" | "team"
  format: "story",         // "story" | "post" | "square"
  passung: "unschaerfe",   // "unschaerfe" | "fuellend" | "rand"
  randfarbe: "#ffffff",
  raster: false,
  vorlage: "klassisch",

  /** Bildausschnitt, wenn das Motiv nicht mittig sitzt. 0…1, wie focal_x/y. */
  focalX: 0.5,
  focalY: 0.5,

  stil: {
    schrift: "grotesk", groesse: 1, ausricht: "links", textPos: "unten",
    textRand: "kontur", logoAn: true, logoGroesse: 1, logoPos: "oben-links",
    unschaerfe: 26, abdunkeln: 1,
    zeilenabstand: 1, textX: 0, textY: 0, logoX: 0, logoY: 0
  }
};

/* ------------------------------------------------------------------ *
 *  Schreiben
 * ------------------------------------------------------------------ */

export function setzeHaus(teil)  { Object.assign(state.haus, teil); sichern(); melden("haus"); }
export function setzePost(post)  {
  state.post = post;
  // Muss mitgesichert werden: sonst holt laden() beim nächsten Einhängen der
  // Studio-Ansicht einen alten Textstand zurück und überschreibt den neuen.
  sichern();
  melden("post");
}
export function setzeStil(teil)  { Object.assign(state.stil, teil); sichern(); melden("post"); }
export function setzeOption(t)   { Object.assign(state, t); sichern(); melden("post"); }
export function setzeMotiv(i)    { state.motiv = Math.max(0, Math.min(state.motive.length - 1, i)); melden("motiv"); }
export function motivHinzu(m)    { state.motive.push(m); state.motiv = state.motive.length - 1; melden("motiv"); }

/* ------------------------------------------------------------------ *
 *  Umrechnung Backend ↔ Editor
 * ------------------------------------------------------------------ */

/** Was der Benutzer selbst gesetzt hat. Das überschreibt das Backend nicht. */
const selbstGesetzt = new Set();
export function merkeEigene(feld) { selbstGesetzt.add(feld); }

/**
 * Ein House-Objekt aus /api/house übernehmen.
 *
 * Läuft bei jedem Einhängen der Studio-Ansicht. Früher setzte es dabei
 * `logo: h.logo ?? null` — und weil das Backend kein Logo kennt, war das
 * hochgeladene Logo nach einem Wechsel auf den Jahreskalender und zurück
 * weg. Dasselbe galt für eine selbst gewählte Hausfarbe. Was der Benutzer
 * im Editor gesetzt hat, gewinnt deshalb gegen das Backend.
 */
export function uebernehmeHaus(h) {
  if (!h) return;
  const teil = {
    name: h.name ?? state.haus.name,
    ort: h.ort ?? state.haus.ort,
    art: h.art ?? state.haus.art,
    belege: h.belege ?? [],
    sperrliste: h.sperrliste ?? [],
    ctaGast: h.cta_gast ?? state.haus.ctaGast,
    ctaTeam: h.cta_team ?? state.haus.ctaTeam
  };
  if (!selbstGesetzt.has("farbe") && h.farbe) teil.farbe = h.farbe;
  if (!selbstGesetzt.has("logo") && h.logo) teil.logo = h.logo;
  setzeHaus(teil);
}

/** Zurück in die Form, die PUT /api/house erwartet. */
export function alsHouse() {
  const h = state.haus;
  return {
    name: h.name, ort: h.ort, art: h.art, farbe: h.farbe, logo: h.logo,
    belege: h.belege, sperrliste: h.sperrliste,
    cta_gast: h.ctaGast, cta_team: h.ctaTeam
  };
}

/** Ein Copy-Objekt aus /api/posts übernehmen. */
export function uebernehmeCopy(copy) {
  if (!copy) return;
  const head = (copy.head || []).map(z => String(z).toUpperCase().trim()).filter(Boolean);
  setzeOption({
    focalX: typeof copy.focal_x === "number" ? copy.focal_x : 0.5,
    focalY: typeof copy.focal_y === "number" ? copy.focal_y : 0.5
  });
  setzePost({
    kicker: copy.kicker || "",
    head,
    key: String(copy.key || head[head.length - 1] || "").toUpperCase(),
    caption: copy.caption || "",
    tags: Array.isArray(copy.hashtags) ? copy.hashtags.join(" ") : (copy.hashtags || ""),
    quellen: copy.quellen || [],
    cards: kartenAus(head, copy.key)
  });
}

/** Untertitel-Karten: eine Wortgruppe, höchstens 15 Zeichen, 0,8–1,2 s. */
export function kartenAus(zeilen, key) {
  const teile = String(key || "").split(/\s+/).filter(Boolean);
  return zeilen.map(z => ({
    text: z,
    dur: Math.max(0.8, Math.min(1.25, 0.55 + z.length * 0.045)),
    key: teile.length > 0 && teile.some(k => z.includes(k))
  }));
}

/* ------------------------------------------------------------------ *
 *  KI-Brücke
 * ------------------------------------------------------------------ *
 * Der Editor soll nichts über das Backend wissen. Die Gastseite hinterlegt
 * hier eine Funktion; ist keine da, bleibt das Feld im Editor ausgeblendet.
 *
 *   setzeKiHandler(async (anweisung, foto) => copyObjekt)
 */

let kiHandler = null;
export function setzeKiHandler(fn) { kiHandler = fn; melden("ki"); }
export function hatKi() { return typeof kiHandler === "function"; }
export async function kiFragen(anweisung, foto) {
  if (!kiHandler) throw new Error("Keine KI hinterlegt.");
  return kiHandler(anweisung, foto);
}

/* ------------------------------------------------------------------ *
 *  Backend — arbeitet auch ohne
 * ------------------------------------------------------------------ */

/**
 * Das Haus vom Backend holen. Läuft der Editor ohne Server (GitHub Pages,
 * Datei direkt geöffnet), passiert nichts und die Vorgabe bleibt stehen.
 * @returns {Promise<boolean>} ob es geklappt hat
 */
export async function hausLaden(basis = "") {
  try {
    const a = await fetch(basis + "/api/house", { headers: { Accept: "application/json" } });
    if (!a.ok) return false;
    uebernehmeHaus(await a.json());
    return true;
  } catch (e) {
    return false;   // kein Backend erreichbar — kein Fehler, nur kein Haus
  }
}

/* ------------------------------------------------------------------ *
 *  Speichern im Browser
 * ------------------------------------------------------------------ */

const SCHLUESSEL = "hauspost.editor.v1";

export function sichern() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({
      format: state.format, passung: state.passung, randfarbe: state.randfarbe,
      vorlage: state.vorlage, stil: state.stil,
      // Der Textvorschlag und das gewählte Haus überleben den Wechsel der
      // Ansicht und das Neuladen der Seite.
      post: state.post,
      haus: { ...state.haus, logo: null }   // Objekt-URLs überleben nicht
    }));
  } catch (e) { /* privates Fenster */ }
}

export function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}");
    if (d.format) state.format = d.format;
    if (d.passung) state.passung = d.passung;
    if (d.randfarbe) state.randfarbe = d.randfarbe;
    if (d.vorlage) state.vorlage = d.vorlage;
    if (d.stil) Object.assign(state.stil, d.stil);
    if (d.post) state.post = d.post;
    if (d.haus) Object.assign(state.haus, d.haus);
  } catch (e) { /* kaputter Eintrag */ }
}

export function zuruecksetzen() {
  try {
    localStorage.removeItem(SCHLUESSEL);
    localStorage.removeItem("hauspost.vorlagen.v1");
  } catch (e) { /* egal */ }
}
