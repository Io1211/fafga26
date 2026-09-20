/** Typen für image.js — die Zeichenroutine. */

export const MASSE: Record<"story" | "post" | "square", { w: number; h: number }>;
export const PASSUNGEN: readonly string[];
export const SCHRIFTEN: Record<string, { name: string; stapel: string; gewicht: number;
  groesse: number; hoehe: number; sperrung: number }>;
export const TEXTHOEHEN: Record<"oben" | "mitte" | "unten", number>;
export const LOGOPOSITIONEN: Record<string, { x: string; y: string }>;
export const TEXTRAENDER: Record<string, string>;
export const VORLAGEN: Record<string, { name: string; hinweis: string; stil: Record<string, unknown> }>;
export const STANDARDSTIL: Record<string, unknown>;

export interface ZeichenOptionen {
  push?: number;       // 0…1 Ken-Burns-Fortschritt (Video)
  nurKarte?: number;   // nur diese eine Overlay-Zeile zeigen (Video)
  pop?: number;        // Skalierung beim Einblenden (Video)
  raster?: boolean;    // Hilfslinien einzeichnen
}

export function zeichnePost(canvas: HTMLCanvasElement, opts?: ZeichenOptionen): Promise<void>;

/** Der aktuelle Post in voller Auflösung als JPEG. */
export function alsBild(qualitaet?: number): Promise<Blob | null>;
