/** Typen für video.js — die Video-Pipeline. */

/**
 * Story-Video bauen: Ken-Burns über das Foto, dazu die Untertitel-Karten
 * nacheinander. Nutzt dieselbe Zeichenroutine wie die Vorschau.
 *
 * @param fortschritt wird mit 0…1 aufgerufen
 */
export function baueVideo(fortschritt?: (anteil: number) => void): Promise<Blob>;
