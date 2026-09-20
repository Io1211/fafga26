/**
 * MODUL 4 · Text — Captions, Hashtags, Untertitel-Karten, Prüfliste
 * =================================================================
 * Baut aus einem Muster (oder aus einer KI-Antwort) das fertige
 * post-Objekt, das Modul 2 rendert.
 */

import { state } from "../core/state.js";
import { satz, slug, clamp } from "../core/dom.js";
import { musterWaehlen } from "./muster.js";

/* ------------------------------------------------------------------ *
 *  Caption — Hook → Inhalt aus den Belegen → Aufforderung
 * ------------------------------------------------------------------ */

export function captionBauen(muster) {
  const belege = state.haus.belege.filter(b => b.trim());
  const weitere = belege.filter(b => !muster.quellen.includes(b));
  const inhalt = [...muster.quellen, ...weitere].slice(0, 3).map(satz).join(" ");
  const cta = state.ziel === "gast" ? state.haus.ctaGast : state.haus.ctaTeam;
  return [satz(muster.hook), inhalt, satz(cta)].filter(Boolean).join("\n\n");
}

/* ------------------------------------------------------------------ *
 *  Hashtags — regional zuerst, dann thematisch, höchstens sieben
 * ------------------------------------------------------------------ */

const NACH_ART = {
  "Berggasthof":      ["berggasthof", "tiroleressen"],
  "Wirtshaus":        ["wirtshaus", "tiroleressen"],
  "Hotel":            ["hotel", "urlaubintirol"],
  "Restaurant":       ["restaurant", "essengehen"],
  "Café":             ["cafe", "kaffeehaus"],
  "Hütte":            ["huette", "almhuette"],
  "Handwerksbetrieb": ["handwerk", "handwerkskunst"]
};

export function hashtags() {
  const art = NACH_ART[state.haus.art] || ["tirol"];
  const ziel = state.ziel === "team" ? ["jobintirol", "wirsuchendich"] : ["ausflugstipp"];
  const roh = [slug(state.haus.name), slug(state.haus.ort), "tirol", ...art, ...ziel];
  return [...new Set(roh)].filter(Boolean).slice(0, 7).map(t => "#" + t).join(" ");
}

/* ------------------------------------------------------------------ *
 *  Untertitel-Karten
 *  Eine Wortgruppe pro Karte, höchstens 15 Zeichen, 0,8–1,2 Sekunden.
 * ------------------------------------------------------------------ */

export function kartenAus(zeilen, key) {
  const teile = String(key || "").split(/\s+/).filter(Boolean);
  return zeilen.map(z => ({
    text: z,
    dur: clamp(0.55 + z.length * 0.045, 0.8, 1.25),
    key: teile.length > 0 && teile.some(k => z.includes(k))
  }));
}

/* ------------------------------------------------------------------ *
 *  Ein fertiges post-Objekt bauen
 * ------------------------------------------------------------------ */

/** Aus einem Haus-Muster (ohne KI). */
export function postAusMuster(ab = 0) {
  const { muster, index } = musterWaehlen(ab);
  return {
    post: {
      kicker: muster.kicker,
      head: muster.head,
      key: muster.key,
      caption: captionBauen(muster),
      tags: hashtags(),
      quellen: muster.quellen,
      cards: kartenAus(muster.head, muster.key),
      motor: "muster"
    },
    index
  };
}

/** Aus einer KI-Antwort. Wird streng normalisiert — die KI liefert Vorschläge, keine Wahrheit. */
export function postAusKi(d) {
  const head = (Array.isArray(d.head) ? d.head : [])
    .map(z => String(z).toUpperCase().trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!head.length) throw { code: "invalid_json", message: "Die Antwort enthielt keine Zeilen." };

  const key = String(d.key || head[head.length - 1]).toUpperCase();
  return {
    kicker: String(d.kicker || state.haus.name),
    head,
    key,
    caption: String(d.caption || ""),
    tags: String(d.hashtags || hashtags()),
    quellen: Array.isArray(d.quellen) ? d.quellen : [],
    cards: kartenAus(head, key),
    motor: "ki"
  };
}

/* ------------------------------------------------------------------ *
 *  Der Auftrag an die KI — Modul 3 schickt ihn nur weiter
 * ------------------------------------------------------------------ */

export function promptBauen() {
  const h = state.haus;
  return `Du schreibst Social-Media-Texte für einen kleinen Betrieb in Tirol. Du bekommst ein Foto und das Gedächtnis des Hauses.

BETRIEB
Name: ${h.name}
Ort: ${h.ort} (Tirol)
Art: ${h.art}

DIE EINZIGEN ZULÄSSIGEN FAKTEN — nichts darf darüber hinausgehen:
${h.belege.filter(b => b.trim()).map(b => "· " + b).join("\n")}

NIE BEHAUPTEN, auch nicht sinngemäß: ${h.sperr.join(", ") || "—"}

ZIELGRUPPE: ${state.ziel === "gast"
    ? "Gäste. Sie entscheiden online, ob sie herkommen. Nicht verkaufen, sondern zeigen, was das Haus hat."
    : "Mögliche Mitarbeiter. Sie schauen auf dasselbe Profil wie die Gäste. Nicht über die Firma reden, sondern über sie."}

AUFFORDERUNG, wörtlich ans Ende der Caption: ${state.ziel === "gast" ? h.ctaGast : h.ctaTeam}

TON: österreichisches Deutsch, direkt, persönlich, kein Marketingdeutsch, keine Superlative, höchstens ein Emoji.

OVERLAY — das ist Text, der ins Bild gebrannt wird:
· 2 bis 5 Zeilen, jede HÖCHSTENS 15 Zeichen inklusive Leerzeichen
· Großbuchstaben
· Zusammen ergeben die Zeilen einen Satz oder zwei kurze
· Genau eine Zeile ist das Schlüsselwort und wird farbig gesetzt
· Der Einstieg darf kurz irritieren, muss aber danach aufgelöst werden

Schau dir das Foto an und schreibe für das, was darauf zu sehen ist.

Antworte NUR mit JSON in genau dieser Form:
{"kicker":"kurze Zeile, höchstens 30 Zeichen","head":["ZEILE 1","ZEILE 2"],"key":"exakt eine der Zeilen aus head","caption":"Hook\\n\\nInhalt in zwei bis drei Sätzen\\n\\nAufforderung","hashtags":"#tag #tag","quellen":["welche Belege du verwendet hast"]}`;
}
