/** Typen für editor.js — die Oberfläche des Editors. */

/**
 * Den Editor in zwei Elemente einhängen. Beide bekommen die Kapselklasse
 * `fve` und werden vollständig neu befüllt; von außen darf danach nichts
 * mehr hineingerendert werden.
 *
 * @param buehne    Vorschau, Raster und die Sicherungsknöpfe
 * @param bedienung Vorlage, Bildpassung, Logo, Format, Motive, Feineinstellungen
 */
export function aufbauen(buehne: HTMLElement, bedienung: HTMLElement): void;

/** Die Vorschau neu zeichnen. Läuft sonst über die Horcher von selbst. */
export function neuZeichnen(): void;
