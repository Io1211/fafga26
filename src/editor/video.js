/**
 * MODUL 2 · Video-Pipeline — Strategie-Schritt 2
 * ==============================================
 * Nimmt dasselbe Canvas-Bild wie die Foto-Pipeline auf und schneidet es
 * zu einem Story-Video: langsamer Ken-Burns über das Foto, dazu die
 * Untertitel-Karten aus post.cards, eine nach der anderen.
 *
 * Untertitel-Regeln aus der Praxis:
 *   · Eine Wortgruppe pro Karte, 0,8–1,2 s, höchstens 15 Zeichen.
 *     Ganze Sätze, die vier Sekunden stehen bleiben, wirken tot —
 *     das ist der häufigste Fehler.
 *   · Pop beim Einblenden: 80 % → 105 % → 100 % in 180 ms. Das ist der
 *     Unterschied zwischen "Text liegt drauf" und "Text gehört dazu".
 *   · Die Untertitel dürfen nie über das Videoende hinauslaufen.
 */

import { state } from "../core/state.js";
import { zeichnePost, MASSE } from "./image.js";

const FPS = 30;

/** Den besten Container wählen, den dieser Browser aufnehmen kann. */
function besterTyp() {
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
    .find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
}

/** Welche Karte läuft zum Zeitpunkt t, und wie weit ist sie? */
function karteBei(cards, t) {
  let akk = 0;
  for (let i = 0; i < cards.length; i++) {
    if (t >= akk && t < akk + cards[i].dur) return { idx: i, seit: t - akk };
    akk += cards[i].dur;
  }
  return { idx: -1, seit: 0 };
}

/** Pop beim Einblenden: 80 % → 105 % → 100 % in 180 ms. */
function popFaktor(seit) {
  if (seit >= 0.18) return 1;
  const p = seit / 0.18;
  return p < 0.55
    ? 0.8 + (1.05 - 0.8) * (p / 0.55)
    : 1.05 - 0.05 * ((p - 0.55) / 0.45);
}

/**
 * Story-Video bauen.
 * @param {(anteil:number)=>void} [fortschritt] 0…1, für einen Fortschrittsbalken
 * @returns {Promise<Blob>}
 */
export async function baueVideo(fortschritt) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Dieser Browser kann kein Video aufnehmen.");
  }
  const cards = state.post?.cards || [];
  if (!cards.length) throw new Error("Es gibt keine Untertitel-Karten.");

  const mass = MASSE[state.format] || MASSE.story;
  const cv = document.createElement("canvas");
  cv.width = mass.w;
  cv.height = mass.h;

  // Nach der letzten Karte kurz stehen lassen, damit das Schlussbild wirkt.
  const gesamt = Math.max(4, cards.reduce((s, k) => s + k.dur, 0) + 0.7);

  const stream = cv.captureStream(FPS);
  const typ = besterTyp();
  const rec = new MediaRecorder(stream, { mimeType: typ, videoBitsPerSecond: 6_000_000 });
  const teile = [];
  rec.ondataavailable = e => { if (e.data.size) teile.push(e.data); };
  const fertig = new Promise(r => { rec.onstop = r; });
  rec.start();

  const frames = Math.round(gesamt * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    const { idx, seit } = karteBei(cards, t);
    await zeichnePost(cv, {
      push: t / gesamt,
      nurKarte: idx >= 0 ? idx : undefined,
      pop: idx >= 0 ? popFaktor(seit) : undefined,
      raster: false
    });
    if (fortschritt) fortschritt(f / frames);
    // Dem Recorder Zeit geben, den Frame abzuholen.
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }

  rec.stop();
  await fertig;
  if (fortschritt) fortschritt(1);
  return new Blob(teile, { type: typ });
}
