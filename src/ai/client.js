/**
 * MODUL 3 · KI-Dienst — Strategie-Schritt 3
 * =========================================
 * Ein Dienst, EINE Funktion nach außen: frage({prompt, bild}) → Objekt.
 *
 * Alles andere im Projekt darf nicht wissen, welches Modell antwortet.
 * Modul 4 baut gegen diese Schnittstelle und funktioniert auch dann,
 * wenn hier noch gar nichts fertig ist — dann greifen die Haus-Muster.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  ZUM API-KEY — BITTE LESEN, BEVOR IHR ETWAS EINCHECKT            │
 * │                                                                  │
 * │  Der Mistral-Key darf NIEMALS in diesem Repo landen. Sobald das  │
 * │  Repo für GitHub Pages öffentlich ist, wird es nach Schlüsseln    │
 * │  durchsucht — Mistral sperrt ihn binnen Minuten, und laut         │
 * │  Handout hängt eine Zahlungsmethode daran.                       │
 * │                                                                  │
 * │  Der Key kommt deshalb aus einem Eingabefeld im UI und liegt nur  │
 * │  im localStorage des jeweiligen Browsers. Kein .env, kein         │
 * │  Hardcoding, kein "nur kurz zum Testen".                          │
 * └──────────────────────────────────────────────────────────────────┘
 */

import { setzeKi } from "../core/state.js";

const KEY_SPEICHER = "hauspost.mistralKey";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

/* ------------------------------------------------------------------ *
 *  Key-Verwaltung — nur im Browser, nie im Repo
 * ------------------------------------------------------------------ */

export function keyLesen() {
  try { return localStorage.getItem(KEY_SPEICHER) || ""; } catch (e) { return ""; }
}

export function keySetzen(k) {
  try {
    if (k) localStorage.setItem(KEY_SPEICHER, k.trim());
    else localStorage.removeItem(KEY_SPEICHER);
  } catch (e) { /* privates Fenster */ }
  pruefen();
}

/* ------------------------------------------------------------------ *
 *  Anbieter
 * ------------------------------------------------------------------ */

let claudeSample = null;   // im Claude-Artifact verfügbar, sonst null

/**
 * Welcher Anbieter steht zur Verfügung?
 * Reihenfolge: Mistral (eigener Key) → Claude (im Artifact) → keiner.
 */
export async function pruefen() {
  if (keyLesen()) {
    setzeKi({ anbieter: "mistral", bereit: true });
    return "mistral";
  }
  if (claudeSample === null) {
    try { claudeSample = await window.claude?.use?.("sample") ?? false; }
    catch (e) { claudeSample = false; }
  }
  if (claudeSample) {
    setzeKi({ anbieter: "claude", bereit: true });
    return "claude";
  }
  setzeKi({ anbieter: "keiner", bereit: false });
  return "keiner";
}

/* ------------------------------------------------------------------ *
 *  Die eine Schnittstelle nach außen
 * ------------------------------------------------------------------ */

/**
 * Die KI um ein JSON-Objekt bitten.
 *
 * @param {object} o
 *   o.prompt  string  Der vollständige Auftrag (Modul 4 baut ihn)
 *   o.bild    Blob    Optional: das Foto, über das geschrieben wird
 *   o.signal  AbortSignal  Optional: zum Abbrechen
 * @returns {Promise<object>} Das geparste JSON der Antwort
 * @throws  {{code:string, message:string}}
 */
export async function frage({ prompt, bild, signal }) {
  const anbieter = await pruefen();
  setzeKi({ laeuft: true });
  try {
    if (anbieter === "mistral") return await frageMistral({ prompt, bild, signal });
    if (anbieter === "claude")  return await frageClaude({ prompt, bild, signal });
    throw { code: "kein_anbieter", message: "Keine KI verfügbar." };
  } finally {
    setzeKi({ laeuft: false });
  }
}

/* ---------------- Mistral ---------------- */

async function frageMistral({ prompt, bild, signal }) {
  const key = keyLesen();
  // Pixtral versteht Bilder, mistral-large ist stärker im Text.
  const modell = bild ? "pixtral-12b-2409" : "mistral-large-latest";

  const inhalt = bild
    ? [{ type: "text", text: prompt },
       { type: "image_url", image_url: await alsDataUrl(bild) }]
    : prompt;

  let antwort;
  try {
    antwort = await fetch(MISTRAL_URL, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: modell,
        messages: [{ role: "user", content: inhalt }],
        response_format: { type: "json_object" },
        max_tokens: 900,
        temperature: 0.7
      })
    });
  } catch (e) {
    if (e.name === "AbortError") throw { code: "cancelled", message: "Abgebrochen." };
    // Häufigster Fall: CORS oder kein Netz.
    throw { code: "netz", message: "Mistral war nicht erreichbar." };
  }

  if (antwort.status === 401) throw { code: "key_falsch", message: "Der Mistral-Key wurde abgelehnt." };
  if (antwort.status === 429) throw { code: "rate_limited", message: "Zu viele Anfragen." };
  if (!antwort.ok) throw { code: "upstream", message: "Mistral antwortete mit " + antwort.status + "." };

  const daten = await antwort.json();
  const text = daten?.choices?.[0]?.message?.content ?? "";
  return jsonAus(text);
}

function alsDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej({ code: "bild", message: "Das Bild konnte nicht gelesen werden." });
    r.readAsDataURL(blob);
  });
}

/* ---------------- Claude (nur im Artifact-Viewer) ---------------- */

async function frageClaude({ prompt, bild, signal }) {
  const grenzen = await claudeSample.limits().catch(() => null);
  return claudeSample.json(prompt, {
    images: (grenzen?.images && bild) ? bild : undefined,
    signal,
    modelTier: "default",
    cache: false
  });
}

/* ---------------- Antwort auswerten ---------------- */

/** Tolerant lesen: ganzes JSON, Code-Zaun, oder der Teil zwischen { und }. */
function jsonAus(text) {
  const versuche = [
    text,
    (text.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1],
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  ];
  for (const v of versuche) {
    if (!v) continue;
    try { return JSON.parse(v); } catch (e) { /* nächster Versuch */ }
  }
  throw { code: "invalid_json", message: "Die Antwort war kein verwertbares JSON." };
}

/** Fehlercode → Satz, den man einem Wirt zeigen kann. */
export const FEHLERTEXT = {
  cancelled:      "Abgebrochen.",
  kein_anbieter:  "Keine KI hinterlegt. Die Haus-Muster schreiben weiter.",
  key_falsch:     "Der Mistral-Key wurde abgelehnt. Bitte prüfen.",
  netz:           "Mistral war nicht erreichbar — im Browser blockiert CORS den Zugriff oft. Die Haus-Muster schreiben weiter.",
  rate_limited:   "Zu viele Anfragen. In ein paar Minuten noch einmal.",
  invalid_json:   "Die Antwort kam nicht im erwarteten Format. Noch einmal versuchen.",
  not_granted:    "Claude wurde für diese Seite nicht erlaubt.",
  refused:        "Die Eingabe wurde abgelehnt.",
  upstream:       "Der Dienst hat einen Fehler gemeldet.",
  bild:           "Das Bild konnte nicht gelesen werden."
};
