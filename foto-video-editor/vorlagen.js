/**
 * MODUL 1 · Eigene Vorlagen
 * =========================
 * Wer sich einen Look zurechtgeschoben hat, soll ihn nicht beim nächsten
 * Post wieder suchen müssen (K5: Wiedererkennung entsteht durch
 * Wiederholung). Gesicherte Vorlagen liegen im Browser des Betriebs,
 * neben den sechs eingebauten.
 *
 * Bewusst getrennt vom übrigen Zustand: das hier geht nur den Editor an.
 */

const SCHLUESSEL = "hauspost.vorlagen.v1";

/** Alle eigenen Vorlagen als { id: {name, stil} }. */
export function eigene() {
  try {
    return JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}");
  } catch (e) {
    return {};
  }
}

function schreiben(alle) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(alle));
  } catch (e) { /* privates Fenster, voller Speicher */ }
}

/**
 * Den aktuellen Stil unter einem Namen sichern.
 * Gleicher Name überschreibt — sonst sammeln sich "Mein Stil 1..7" an.
 * @returns {string} die id
 */
export function sichern(name, stil) {
  const alle = eigene();
  const id = "eigen-" + name.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "eigen-" + Date.now();
  alle[id] = { name: name.trim(), stil: { ...stil } };
  schreiben(alle);
  return id;
}

export function loeschen(id) {
  const alle = eigene();
  delete alle[id];
  schreiben(alle);
}
