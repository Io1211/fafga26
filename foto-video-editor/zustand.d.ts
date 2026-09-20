/** Typen für zustand.js. Die Feldnamen folgen backend/app/schemas.py. */

export interface EditorHaus {
  modus: "betrieb" | "event";
  datum: string;
  ortDetail: string;
  name: string;
  ort: string;
  art: string;
  farbe: string;
  logo: string | null;
  logoFarben: string[];
  belege: string[];
  sperrliste: string[];
  ctaGast: string;
  ctaTeam: string;
}

/** Eine Untertitel-Karte: eine Overlay-Zeile mit Dauer fürs Video. */
export interface Karte { text: string; dur: number; key: boolean }

/** Der Textvorschlag. Entspricht `Copy` aus schemas.py, Hashtags als Zeile. */
export interface EditorPost {
  kicker: string;
  head: string[];
  key: string;
  caption: string;
  tags: string;
  quellen: string[];
  cards: Karte[];
}

export interface EditorMotiv { src: string; label: string; datei?: string; blob?: Blob }

export interface EditorStil {
  schrift: "grotesk" | "serif" | "kondensiert";
  groesse: number;
  ausricht: "links" | "mitte" | "rechts";
  textPos: "oben" | "mitte" | "unten";
  textRand: "kontur" | "flaeche" | "schatten" | "ohne";
  logoAn: boolean;
  logoGroesse: number;
  logoPos: "oben-links" | "oben-mitte" | "oben-rechts"
         | "unten-links" | "unten-mitte" | "unten-rechts";
  unschaerfe: number;
  abdunkeln: number;
  zeilenabstand: number;
  textX: number; textY: number;
  logoX: number; logoY: number;
}

export interface EditorState {
  haus: EditorHaus;
  post: EditorPost | null;
  motive: EditorMotiv[];
  motiv: number;
  ziel: "gast" | "team";
  format: "story" | "post" | "square";
  passung: "unschaerfe" | "fuellend" | "rand";
  randfarbe: string;
  raster: boolean;
  vorlage: string;
  focalX: number;
  focalY: number;
  stil: EditorStil;
}

export const state: EditorState;

export function on(thema: "haus" | "post" | "motiv", fn: (s: EditorState) => void): () => void;
export function melden(thema: string): void;

export function setzeHaus(teil: Partial<EditorHaus>): void;
export function setzePost(post: EditorPost): void;
export function setzeStil(teil: Partial<EditorStil>): void;
export function setzeOption(teil: Partial<EditorState>): void;
export function setzeMotiv(i: number): void;
export function motivHinzu(m: EditorMotiv): void;

/** Ein House aus GET /api/house übernehmen (rechnet die Feldnamen um). */
export function uebernehmeHaus(h: unknown): void;
/** Zurück in die Form für PUT /api/house. */
export function alsHouse(): Record<string, unknown>;
/** Ein Copy aus PostOut.text übernehmen. */
export function uebernehmeCopy(copy: unknown): void;
/** Untertitel-Karten aus den Overlay-Zeilen bauen. */
export function kartenAus(zeilen: string[], key: string): Karte[];

/** Holt GET /api/house. Liefert false statt zu werfen, wenn kein Server da ist. */
export function hausLaden(basis?: string): Promise<boolean>;

export function sichern(): void;
export function laden(): void;
export function zuruecksetzen(): void;
