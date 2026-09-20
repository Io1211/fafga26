/**
 * MODUL 2 · Editor-Oberfläche
 * ===========================
 * Bühne, Motivauswahl, Format, Export. Die eigentliche Zeichenarbeit
 * steckt in image.js, die Videoaufnahme in video.js — diese Datei ist
 * nur die Bedienung drumherum.
 *
 * Schreibt:  state.motiv, state.format, state.raster
 * Liest:     state.post (von Modul 4), state.haus (von Modul 1)
 */

import { state, setzeMotiv, motivHinzu, setzeOption, on } from "../src/core/state.js";
import { $, $$, toast, slug } from "../src/core/dom.js";
import { zeichnePost, alsPng } from "./image.js";
import { baueVideo } from "./video.js";

let stageCanvas = null;
let downloads = null;

(async () => {
  try { downloads = await window.claude?.use?.("downloads") ?? null; } catch (e) { downloads = null; }
})();

const dateiname = ext =>
  `${slug(state.haus.name)}-${state.ziel === "gast" ? "gaeste" : "team"}-${state.format}.${ext}`;

function markup() {
  return `
  <div class="stagehead">
    <span class="eyebrow">Vorschau · <span id="edFormatLbl">1080 × 1920</span></span>
    <button class="btn" id="edRaster" aria-pressed="false"
      title="Zeigt den 4:5-Ausschnitt, auf den Instagram das Profilraster beschneidet">Raster</button>
  </div>
  <div class="canvaswrap"><canvas id="edCanvas" width="1080" height="1920"></canvas></div>
  <p class="stagenote">Das Foto wird nie beschnitten — den Rand füllt der eigene Unschärfe-Hintergrund.</p>
  <div class="videowrap" id="edVideoWrap" hidden><video id="edVideo" controls playsinline></video></div>
  <div class="row" style="justify-content:center">
    <button class="btn primary" id="edPng">Bild sichern</button>
    <button class="btn" id="edVideoBtn">Story-Video bauen</button>
  </div>`;
}

/** Die Bedienelemente, die in die rechte Spalte gehören. */
export function bedienungMarkup() {
  return `
  <div class="block">
    <h3>Format</h3>
    <div class="seg" id="edSegFormat" role="group" aria-label="Format">
      <button data-v="story" aria-pressed="true">Story 9:16</button>
      <button data-v="post" aria-pressed="false">Beitrag 4:5</button>
    </div>
  </div>
  <div class="block">
    <h3>Motiv</h3>
    <div class="motive" id="edMotive"></div>
    <div class="drop" id="edDrop">Eigene Fotos hierher ziehen oder klicken</div>
  </div>`;
}

function motiveRendern() {
  const wrap = $("#edMotive");
  if (!wrap) return;
  wrap.innerHTML = "";
  state.motive.forEach((m, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-pressed", String(i === state.motiv));
    b.title = m.label;
    const im = document.createElement("img");
    im.src = m.datei || m.src;
    im.alt = m.label;
    b.append(im);
    b.onclick = () => setzeMotiv(i);
    wrap.append(b);
  });
}

function dateienNehmen(files) {
  if (!files || !files.length) return;
  const bilder = [...files].filter(f => f.type.startsWith("image/"));
  if (!bilder.length) return toast("Das war kein Bild.");
  bilder.forEach(f => {
    const url = URL.createObjectURL(f);
    motivHinzu({ src: url, datei: url, label: f.name, blob: f });
  });
  toast(bilder.length === 1 ? "Motiv geladen." : `${bilder.length} Motive geladen.`);
}

export function neuZeichnen() {
  if (!stageCanvas) return;
  zeichnePost(stageCanvas, { raster: state.raster });
  const lbl = $("#edFormatLbl");
  if (lbl) lbl.textContent = state.format === "story" ? "1080 × 1920" : "1080 × 1350";
}

/* ------------------------------------------------------------------ *
 *  Sichern
 * ------------------------------------------------------------------ */

async function pngSichern() {
  const blob = await alsPng();
  if (!blob) return toast("Das Bild konnte nicht erzeugt werden.");
  if (downloads) {
    try {
      await downloads.save({ filename: dateiname("png"), data: blob });
      return toast("Gesichert.");
    } catch (e) {
      if (e?.code === "declined") return toast("Abgebrochen.");
    }
  }
  toast("Rechtsklick auf die Vorschau, dann „Bild sichern unter“.");
}

async function videoBauen() {
  const btn = $("#edVideoBtn");
  btn.disabled = true;
  btn.textContent = "Baut … 0 %";
  try {
    const blob = await baueVideo(a => { btn.textContent = `Baut … ${Math.round(a * 100)} %`; });
    $("#edVideo").src = URL.createObjectURL(blob);
    $("#edVideoWrap").hidden = false;
    if (downloads) {
      try {
        await downloads.save({ filename: dateiname("webm"), data: blob });
        return toast("Video gesichert.");
      } catch (e) { /* abgelehnt — Vorschau bleibt */ }
    }
    toast("Das Video steht in der Vorschau — Rechtsklick, „Video speichern unter“.");
  } catch (e) {
    toast(e?.message || "Die Videoaufnahme hat nicht funktioniert.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Story-Video bauen";
  }
}

/* ------------------------------------------------------------------ *
 *  Aufbau
 * ------------------------------------------------------------------ */

export function aufbauen(buehne, bedienung) {
  // Ersetzt auch den Platzhalter, den das Dashboard vorhält.
  buehne.innerHTML = markup();
  bedienung.innerHTML = bedienungMarkup();
  stageCanvas = $("#edCanvas");

  $("#edRaster").onclick = () => {
    setzeOption({ raster: !state.raster });
    $("#edRaster").setAttribute("aria-pressed", String(state.raster));
  };

  $$("#edSegFormat button").forEach(b => b.onclick = () => {
    $$("#edSegFormat button").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    setzeOption({ format: b.dataset.v });
  });

  const drop = $("#edDrop");
  drop.onclick = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.multiple = true;
    inp.onchange = () => dateienNehmen(inp.files);
    inp.click();
  };
  ["dragenter", "dragover"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => dateienNehmen(e.dataTransfer?.files));

  $("#edPng").onclick = pngSichern;
  $("#edVideoBtn").onclick = videoBauen;

  // Auf Änderungen der anderen Module reagieren
  on("post",  neuZeichnen);
  on("haus",  neuZeichnen);
  on("motiv", () => { motiveRendern(); neuZeichnen(); });

  motiveRendern();
  neuZeichnen();
}
