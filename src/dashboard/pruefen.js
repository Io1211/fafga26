/**
 * MODUL 2 · Dashboard — Prüfliste
 * ===============================
 * Das Tor vor dem Posten. Kontrolliert die Ausgabe gegen die Regeln des
 * Hauses und zeigt, worauf der Text steht.
 *
 * Bewusst HIER und nicht beim KI-Assistenten: Wer den Text erzeugt, soll
 * ihn nicht selbst freigeben.
 */

import { state } from "../core/state.js";
import { esc } from "../core/dom.js";

export function pruefen() {
  const post = state.post;
  if (!post) return [];

  const lang = post.cards.filter(k => k.text.length > 15).length;
  const dauer = post.cards.reduce((s, k) => s + k.dur, 0);
  const text = (post.head.join(" ") + " " + post.caption).toLowerCase();
  const treffer = state.haus.sperr.filter(s => s.trim() && text.includes(s.toLowerCase()));
  const belegt = (post.quellen || []).length;

  return [
    treffer.length
      ? { art: "bad",  text: `<b>Sperrliste verletzt:</b> „${treffer.map(esc).join("“, „")}“ steht im Text.` }
      : { art: "ok",   text: `<b>Sperrliste eingehalten.</b> ${state.haus.sperr.length} Begriffe geprüft, keiner verwendet.` },

    belegt
      ? { art: "ok",   text: `<b>Auf Belegen gebaut.</b> ${belegt === 1 ? "Ein Satz" : belegt + " Sätze"} aus dem Hausgedächtnis verwendet.` }
      : { art: "warn", text: `<b>Kein Beleg verknüpft.</b> Der Text ist eine Einladung, keine Tatsachenbehauptung — das ist hier in Ordnung.` },

    lang
      ? { art: "warn", text: `<b>${lang} ${lang === 1 ? "Karte" : "Karten"} über 15 Zeichen.</b> Wird kleiner gesetzt und bricht den Rhythmus — besser aufteilen.` }
      : { art: "ok",   text: `<b>Kartenlänge passt.</b> Alle unter 15 Zeichen.` },

    (dauer >= 4 && dauer <= 30)
      ? { art: "ok",   text: `<b>Videolänge ${dauer.toFixed(1)} Sekunden.</b> Im Story-Fenster.` }
      : { art: "warn", text: `<b>Videolänge ${dauer.toFixed(1)} Sekunden.</b> Für eine Story zu ${dauer < 4 ? "kurz" : "lang"}.` },

    { art: "ok", text: `<b>Overlay im 4:5-Feld.</b> Bleibt im Profilraster sichtbar.` }
  ];
}
