/**
 * MODUL 4 · Text & Ausgabe — Oberfläche
 * =====================================
 * Zielgruppe, Vorschlag, Untertitel-Karten, Prüfliste.
 * Ruft für die KI nur client.frage() auf und weiß nicht, welches Modell
 * dahinter steckt — so bleiben Modul 3 und 4 unabhängig.
 *
 * Schreibt:  state.post, state.ziel
 * Liest:     state.haus (Modul 1), state.ki (Modul 3)
 */

import { state, setzePost, setzeOption, on } from "../core/state.js";
import { $, $$, esc, toast, bildHolen } from "../core/dom.js";
import { postAusMuster, postAusKi, pruefen, promptBauen } from "./text.js";
import { frage, FEHLERTEXT } from "../ai/client.js";

let musterIndex = 0;
let abbruch = null;

function markup() {
  return `
  <div class="block">
    <h3>Wofür ist der Post?</h3>
    <div class="seg" id="poSegZiel" role="group" aria-label="Zielgruppe">
      <button data-v="gast" aria-pressed="true">Für Gäste</button>
      <button data-v="team" aria-pressed="false">Für Mitarbeiter</button>
    </div>
    <p class="hint" id="poZielHint"></p>
  </div>

  <div id="poEditorSlot"></div>

  <div class="block">
    <h3>Der Vorschlag</h3>
    <div class="out">
      <div class="kicker" id="poKicker"></div>
      <div class="headline" id="poHead"></div>
      <div class="caption" id="poCaption"></div>
      <div class="tags" id="poTags"></div>
    </div>
    <div class="row">
      <button class="btn primary grow" id="poKi">KI schreiben lassen</button>
      <button class="btn" id="poWuerfeln">Anderer Ansatz</button>
    </div>
    <div class="row" style="justify-content:space-between;align-items:center">
      <button class="ghost" id="poCopy" style="font-size:12px">Text kopieren</button>
      <button class="ghost" id="poStop" style="font-size:12px" hidden>Abbrechen</button>
    </div>
  </div>

  <div class="block">
    <h3>Untertitel fürs Video <span class="eyebrow" id="poCardsLbl" style="font-weight:400"></span></h3>
    <div class="cards" id="poCards"></div>
    <p class="hint">Eine Wortgruppe pro Karte, 0,8 bis 1,2 Sekunden. Ein Klick setzt das farbige
    Schlüsselwort — eines pro Aussage, nicht mehr.</p>
  </div>

  <div class="block">
    <h3>Prüfliste</h3>
    <div class="checks" id="poChecks"></div>
  </div>`;
}

/* ------------------------------------------------------------------ *
 *  Anzeigen
 * ------------------------------------------------------------------ */

function vorschlagRendern() {
  const p = state.post;
  if (!p) return;
  $("#poKicker").textContent = p.kicker;
  const teile = String(p.key || "").split(/\s+/).filter(Boolean);
  $("#poHead").innerHTML = p.head.map(z => {
    const istKey = teile.length > 0 && teile.some(k => z.includes(k));
    return istKey ? `<em>${esc(z)}</em>` : esc(z);
  }).join("<br>");
  $("#poCaption").textContent = p.caption;
  $("#poTags").textContent = p.tags;
}

function kartenRendern() {
  const wrap = $("#poCards");
  const p = state.post;
  if (!wrap || !p) return;
  wrap.innerHTML = "";
  p.cards.forEach(k => {
    const d = document.createElement("div");
    d.className = "kcard" + (k.text.length > 15 ? " lang" : "");
    d.title = "Klick: Schlüsselwort ein- oder ausschalten";
    const t = document.createElement("div");
    t.className = "t";
    if (k.key) { const em = document.createElement("em"); em.textContent = k.text; t.append(em); }
    else t.textContent = k.text;
    const m = document.createElement("div");
    m.className = "m";
    m.textContent = `${k.dur.toFixed(2)} s · ${k.text.length} Z.`;
    d.append(t, m);
    d.onclick = () => { k.key = !k.key; setzePost(p); };
    wrap.append(d);
  });
  const n = p.cards.length;
  $("#poCardsLbl").textContent = n ? `· ${n} ${n === 1 ? "Karte" : "Karten"}` : "";
}

function checksRendern() {
  const el = $("#poChecks");
  if (!el) return;
  el.innerHTML = pruefen().map(i =>
    `<div class="check ${i.art === "ok" ? "" : i.art}"><span class="dot"></span><span>${i.text}</span></div>`
  ).join("");
}

function zielHint() {
  $("#poZielHint").textContent = state.ziel === "gast"
    ? "Gäste entscheiden online, bevor sie anrufen. Der Post verkauft nicht, er zeigt, was das Haus hat."
    : "Dieselben Fotos, andere Zielgruppe. Wer sich bewirbt, schaut vorher auf dasselbe Profil.";
}

function alles() {
  vorschlagRendern();
  kartenRendern();
  checksRendern();
  zielHint();
}

/* ------------------------------------------------------------------ *
 *  Neu bauen
 * ------------------------------------------------------------------ */

export function neuBauen(naechstes = false) {
  if (naechstes) musterIndex++;
  const { post, index } = postAusMuster(musterIndex);
  musterIndex = index;
  setzePost(post);
}

/* ------------------------------------------------------------------ *
 *  KI
 * ------------------------------------------------------------------ */

async function kiFragen() {
  const btn = $("#poKi"), stop = $("#poStop");
  abbruch = new AbortController();
  btn.disabled = true;
  btn.textContent = "Denkt …";
  stop.hidden = false;

  try {
    // Das Foto mitschicken, damit die KI über das schreibt, was zu sehen ist.
    const m = state.motive[state.motiv];
    let bild = m?.blob;
    if (!bild && m) {
      const im = await bildHolen(m.datei || m.src);
      if (im) {
        const tmp = document.createElement("canvas");
        const k = Math.min(1, 1100 / Math.max(im.width, im.height));
        tmp.width = Math.round(im.width * k);
        tmp.height = Math.round(im.height * k);
        tmp.getContext("2d").drawImage(im, 0, 0, tmp.width, tmp.height);
        bild = await new Promise(r => tmp.toBlob(r, "image/jpeg", 0.85));
      }
    }

    const antwort = await frage({ prompt: promptBauen(), bild, signal: abbruch.signal });
    setzePost(postAusKi(antwort));
    toast("Geschrieben — die Prüfliste hat mitgelesen.");

  } catch (e) {
    toast(FEHLERTEXT[e?.code] || "Hat nicht geklappt. Die Haus-Muster schreiben weiter.");
    if (!state.post) neuBauen();
  } finally {
    btn.disabled = false;
    btn.textContent = "KI schreiben lassen";
    stop.hidden = true;
    abbruch = null;
  }
}

/* ------------------------------------------------------------------ *
 *  Aufbau
 * ------------------------------------------------------------------ */

export function aufbauen(wurzel) {
  wurzel.innerHTML = markup();

  $$("#poSegZiel button").forEach(b => b.onclick = () => {
    $$("#poSegZiel button").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    setzeOption({ ziel: b.dataset.v });
    musterIndex = 0;
    neuBauen();
  });

  $("#poWuerfeln").onclick = () => neuBauen(true);
  $("#poKi").onclick = kiFragen;
  $("#poStop").onclick = () => abbruch?.abort();
  $("#poCopy").onclick = async () => {
    const p = state.post;
    if (!p) return;
    try {
      await navigator.clipboard.writeText(`${p.caption}\n\n${p.tags}`);
      toast("Text kopiert.");
    } catch (e) {
      toast("Kopieren ging nicht — Text markieren und kopieren.");
    }
  };

  on("post", alles);
  on("haus", () => neuBauen());
  on("ki", () => {
    const btn = $("#poKi");
    if (btn) btn.disabled = !state.ki.bereit || state.ki.laeuft;
  });

  // Der Editor hängt seine Format- und Motivauswahl hier ein.
  return $("#poEditorSlot");
}
