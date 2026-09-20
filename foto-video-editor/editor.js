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

import { state, setzeMotiv, motivHinzu, setzeOption, setzeHaus, setzeStil, on } from "../src/core/state.js";
import { $, $$, toast, slug, bildHolen } from "../src/core/dom.js";
import { farbenAus, gutAufDunkel } from "./farben.js";
import { zeichnePost, alsPng, VORLAGEN, SCHRIFTEN, TEXTRAENDER, LOGOPOSITIONEN } from "./image.js";
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
    <h3>Vorlage</h3>
    <div class="vorlagen" id="edVorlagen"></div>
    <p class="hint" id="edVorlageHint"></p>
  </div>

  <div class="block">
    <h3>Bild im Format</h3>
    <div class="seg" id="edSegPassung" role="group" aria-label="Wie das Foto ins Format kommt">
      <button data-v="unschaerfe" aria-pressed="true">Unschärfe</button>
      <button data-v="fuellend">Füllend</button>
      <button data-v="rand">Rand</button>
    </div>
    <div class="row tight" id="edRandfarben" hidden>
      <button class="btn swatchbtn" data-f="#ffffff" style="--s:#ffffff">Weiß</button>
      <button class="btn swatchbtn" data-f="#0e0e0c" style="--s:#0e0e0c">Schwarz</button>
      <button class="btn swatchbtn" data-f="__haus" style="--s:var(--hausfarbe)">Hausfarbe</button>
      <input type="color" id="edRandPicker" value="#ffffff" aria-label="Randfarbe frei wählen">
    </div>
    <p class="hint" id="edPassungHint"></p>
  </div>

  <div class="block">
    <h3>Logo &amp; Farbe</h3>
    <div class="row tight">
      <button class="btn" id="edLogoBtn">Logo wählen</button>
      <input type="file" id="edLogoFile" accept="image/*" hidden>
      <button class="btn" id="edLogoWeg" hidden>Entfernen</button>
      <input type="color" id="edFarbe" aria-label="Hausfarbe">
    </div>
    <div class="palette" id="edPalette" hidden></div>
    <p class="hint" id="edFarbeHint">Beim Hochladen eines Logos werden dessen Farben vorgeschlagen.</p>
  </div>

  <details class="fein" id="edFein">
    <summary>Feineinstellungen</summary>
    <div class="feininhalt">

      <div class="block">
        <h3>Schrift</h3>
        <div class="seg" id="edSegSchrift" role="group" aria-label="Schriftcharakter"></div>
        <label class="regler"><span>Textgröße <b id="edGroesseWert">100 %</b></span>
          <input type="range" id="edGroesse" min="60" max="150" step="2"></label>
        <div class="seg" id="edSegAusricht" role="group" aria-label="Ausrichtung">
          <button data-v="links">Links</button>
          <button data-v="mitte">Mitte</button>
          <button data-v="rechts">Rechts</button>
        </div>
      </div>

      <div class="block">
        <h3>Text vom Bild trennen</h3>
        <div class="seg" id="edSegRand" role="group" aria-label="Textrand"></div>
        <p class="hint" id="edRandHint"></p>
      </div>

      <div class="block">
        <h3>Textblock</h3>
        <div class="seg" id="edSegLayout" role="group" aria-label="Wo der Text sitzt">
          <button data-v="oben">Oben</button>
          <button data-v="mitte">Mitte</button>
          <button data-v="unten">Unten</button>
        </div>
        <p class="hint">„Unten“ ist die Vorgabe: die Grundlinie liegt bei 0,72 statt ganz unten,
        weil darunter die Aufforderung Platz braucht und Instagram in der Story eigene
        Bedienelemente einblendet.</p>
      </div>

      <div class="block">
        <h3>Logo</h3>
        <label class="schalter"><input type="checkbox" id="edLogoAn"> <span>Logo zeigen</span></label>
        <div class="posgitter" id="edLogoPos"></div>
        <label class="regler"><span>Logogröße <b id="edLogoGrWert">100 %</b></span>
          <input type="range" id="edLogoGr" min="40" max="160" step="5"></label>
      </div>

      <div class="block">
        <h3>Hintergrund</h3>
        <label class="regler"><span>Unschärfe <b id="edBlurWert">26</b></span>
          <input type="range" id="edBlur" min="0" max="60" step="2"></label>
        <label class="regler"><span>Abdunkeln <b id="edDunkelWert">100 %</b></span>
          <input type="range" id="edDunkel" min="0" max="180" step="5"></label>
      </div>

    </div>
  </details>

  <div class="block">
    <h3>Motiv</h3>
    <div class="motive" id="edMotive"></div>
    <div class="drop" id="edDrop">Fotos hierher ziehen oder klicken</div>
    <div class="row tight">
      <button class="btn" id="edOrdner">Ganzen Ordner wählen</button>
      <button class="btn" id="edLeeren" hidden>Eigene entfernen</button>
    </div>
    <input type="file" id="edOrdnerFile" accept="image/*" multiple webkitdirectory directory hidden>
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

const GRENZE = 60;   // ein Kameraordner kann tausende Bilder haben

function dateienNehmen(files) {
  if (!files || !files.length) return;
  const bilder = [...files]
    .filter(f => f.type.startsWith("image/") && !f.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  if (!bilder.length) return toast("Keine Bilder gefunden.");

  const nehmen = bilder.slice(0, GRENZE);
  nehmen.forEach(f => {
    const url = URL.createObjectURL(f);
    motivHinzu({ src: url, datei: url, label: f.name, blob: f });
  });
  const el = $("#edLeeren");
  if (el) el.hidden = false;

  toast(bilder.length > GRENZE
    ? `${GRENZE} von ${bilder.length} Bildern geladen — mehr zeigt die Übersicht nicht sinnvoll an.`
    : (nehmen.length === 1 ? "Motiv geladen." : `${nehmen.length} Motive geladen.`));
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

/**
 * Canvas greift NICHT auf das CSS-Laden zurück: ist die Schrift beim
 * Zeichnen noch nicht da, nimmt es stillschweigend die Ersatzschrift und
 * niemand merkt es. Deshalb alle drei Charaktere vorher anfordern.
 */
async function schriftenLaden() {
  const wunsch = [
    '800 100px "Inter"', '600 100px "Inter"', '500 100px "Inter"',
    '800 100px "Fraunces"',
    '600 100px "Oswald"', '700 100px "Oswald"'
  ];
  try {
    await Promise.all(wunsch.map(f => document.fonts.load(f)));
    await document.fonts.ready;
  } catch (e) { /* ohne Webfonts sieht es anders aus, funktioniert aber */ }
}

export function aufbauen(buehne, bedienung) {
  // Ersetzt auch den Platzhalter, den das Dashboard vorhält.
  buehne.innerHTML = markup();
  bedienung.innerHTML = bedienungMarkup();
  stageCanvas = $("#edCanvas");

  $("#edRaster").onclick = () => {
    setzeOption({ raster: !state.raster });
    $("#edRaster").setAttribute("aria-pressed", String(state.raster));
  };


  /* ================= Vorlagen (K5, K9) ================= */
  const vw = $("#edVorlagen");
  Object.entries(VORLAGEN).forEach(([id, v]) => {
    const b = document.createElement("button");
    b.className = "vorlage";
    b.dataset.v = id;
    b.textContent = v.name;
    b.onclick = () => {
      setzeOption({ vorlage: id });
      setzeStil({ ...v.stil });
      vorlagenZeigen();
      reglerZeigen();
    };
    vw.append(b);
  });
  function vorlagenZeigen() {
    $$("#edVorlagen .vorlage").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.v === state.vorlage)));
    $("#edVorlageHint").textContent = VORLAGEN[state.vorlage]?.hinweis || "";
  }

  /* ================= Schrift ================= */
  const sw = $("#edSegSchrift");
  Object.entries(SCHRIFTEN).forEach(([id, f]) => {
    const b = document.createElement("button");
    b.dataset.v = id;
    b.textContent = f.name;
    b.onclick = () => { setzeStil({ schrift: id }); reglerZeigen(); };
    sw.append(b);
  });

  /* ================= Textrand ================= */
  const randHint = {
    kontur:   "Schwarze Kontur um jede Glyphe. Trägt auf jedem Untergrund und ist der sichere Standard.",
    flaeche:  "Jede Zeile bekommt einen Balken. Das Schlüsselwort läuft auf der Hausfarbe.",
    schatten: "Weicher Schatten. Dezent, braucht aber ein halbwegs ruhiges Motiv.",
    ohne:     "Nichts. Nur sinnvoll, wenn die Abdunklung reicht — mit dem Raster kontrollieren."
  };
  const rw = $("#edSegRand");
  Object.entries(TEXTRAENDER).forEach(([id, name]) => {
    const b = document.createElement("button");
    b.dataset.v = id;
    b.textContent = name;
    b.onclick = () => { setzeStil({ textRand: id }); reglerZeigen(); };
    rw.append(b);
  });

  /* ================= Logo-Position als Gitter (K7) ================= */
  const pw = $("#edLogoPos");
  Object.keys(LOGOPOSITIONEN).forEach(id => {
    const b = document.createElement("button");
    b.dataset.v = id;
    b.className = "pos " + id;
    b.title = id.replace("-", " ");
    b.setAttribute("aria-label", "Logo " + id.replace("-", " "));
    b.onclick = () => { setzeStil({ logoPos: id }); reglerZeigen(); };
    pw.append(b);
  });

  /* ================= Ausrichtung und Textblock ================= */
  $$("#edSegAusricht button").forEach(b => b.onclick = () => {
    setzeStil({ ausricht: b.dataset.v }); reglerZeigen();
  });
  $$("#edSegLayout button").forEach(b => b.onclick = () => {
    setzeStil({ textPos: b.dataset.v }); reglerZeigen();
  });

  /* ================= Regler ================= */
  $("#edGroesse").oninput = e => {
    setzeStil({ groesse: e.target.value / 100 });
    $("#edGroesseWert").textContent = e.target.value + " %";
  };
  $("#edLogoAn").onchange = e => { setzeStil({ logoAn: e.target.checked }); };
  $("#edLogoGr").oninput = e => {
    setzeStil({ logoGroesse: e.target.value / 100 });
    $("#edLogoGrWert").textContent = e.target.value + " %";
  };
  $("#edBlur").oninput = e => {
    setzeStil({ unschaerfe: Number(e.target.value) });
    $("#edBlurWert").textContent = e.target.value;
  };
  $("#edDunkel").oninput = e => {
    setzeStil({ abdunkeln: e.target.value / 100 });
    $("#edDunkelWert").textContent = e.target.value + " %";
  };

  /** Alle Bedienelemente auf den aktuellen Stil setzen. */
  function reglerZeigen() {
    const st = state.stil;
    const setz = (sel, wert) => $$(sel + " button").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.v === wert)));
    setz("#edSegSchrift", st.schrift);
    setz("#edSegRand", st.textRand);
    setz("#edSegAusricht", st.ausricht);
    setz("#edSegLayout", st.textPos);
    $$("#edLogoPos .pos").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.v === st.logoPos)));
    $("#edGroesse").value = Math.round(st.groesse * 100);
    $("#edGroesseWert").textContent = Math.round(st.groesse * 100) + " %";
    $("#edLogoAn").checked = st.logoAn !== false;
    $("#edLogoGr").value = Math.round(st.logoGroesse * 100);
    $("#edLogoGrWert").textContent = Math.round(st.logoGroesse * 100) + " %";
    $("#edBlur").value = st.unschaerfe;
    $("#edBlurWert").textContent = st.unschaerfe;
    $("#edDunkel").value = Math.round(st.abdunkeln * 100);
    $("#edDunkelWert").textContent = Math.round(st.abdunkeln * 100) + " %";
    $("#edRandHint").textContent = randHint[st.textRand] || "";
  }

  /* --- Passung --- */
  const passungHint = {
    unschaerfe: "Das Foto bleibt vollständig sichtbar, der Rand wird aus dem eigenen Bild unscharf gefüllt.",
    fuellend:   "Das Foto füllt das Format und wird dafür beschnitten. Gut bei Motiven ohne wichtige Ränder.",
    rand:       "Das Foto bleibt im Originalformat, der Rand bekommt eine feste Farbe."
  };
  function passungZeigen() {
    $("#edRandfarben").hidden = state.passung !== "rand";
    $("#edPassungHint").textContent = passungHint[state.passung] || "";
    $$("#edSegPassung button").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.v === state.passung)));
  }
  $$("#edSegPassung button").forEach(b => b.onclick = () => {
    setzeOption({ passung: b.dataset.v });
    passungZeigen();
  });
  $$("#edRandfarben .swatchbtn").forEach(b => b.onclick = () => {
    const f = b.dataset.f === "__haus" ? state.haus.farbe : b.dataset.f;
    $("#edRandPicker").value = f;
    setzeOption({ randfarbe: f });
  });
  $("#edRandPicker").oninput = e => setzeOption({ randfarbe: e.target.value });

  /* --- Logo und Farben --- */
  $("#edFarbe").value = state.haus.farbe;
  $("#edFarbe").oninput = e => {
    setzeHaus({ farbe: e.target.value });
    document.documentElement.style.setProperty("--hausfarbe", e.target.value);
  };
  $("#edLogoBtn").onclick = () => $("#edLogoFile").click();
  $("#edLogoWeg").onclick = () => {
    setzeHaus({ logo: null });
    $("#edLogoWeg").hidden = true;
    $("#edPalette").hidden = true;
    $("#edFarbeHint").textContent = "Logo entfernt. Ohne Logo wird der Name als Wortmarke gesetzt.";
  };
  $("#edLogoFile").onchange = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setzeHaus({ logo: url });
    $("#edLogoWeg").hidden = false;

    // Farben aus dem Logo ziehen und zur Auswahl anbieten
    const im = await bildHolen(url);
    const farben = im ? farbenAus(im, 6) : [];
    const brauchbar = farben.filter(gutAufDunkel);
    const palette = $("#edPalette");
    palette.innerHTML = "";
    if (!brauchbar.length) {
      palette.hidden = true;
      $("#edFarbeHint").textContent =
        "Im Logo war keine kräftige Farbe zu finden — Hausfarbe bitte selbst wählen.";
      return;
    }
    brauchbar.forEach((hexf, i) => {
      const b = document.createElement("button");
      b.className = "farbtupfer";
      b.style.background = hexf;
      b.title = hexf;
      b.setAttribute("aria-label", "Hausfarbe " + hexf);
      b.onclick = () => {
        setzeHaus({ farbe: hexf });
        $("#edFarbe").value = hexf;
        document.documentElement.style.setProperty("--hausfarbe", hexf);
        $$("#edPalette .farbtupfer").forEach(x => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
      };
      palette.append(b);
      if (i === 0) b.click();     // kräftigste Farbe direkt übernehmen
    });
    palette.hidden = false;
    $("#edFarbeHint").textContent =
      `${brauchbar.length} Farben aus dem Logo. Die kräftigste ist übernommen — anklicken zum Wechseln.`;
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

  $("#edOrdner").onclick = () => $("#edOrdnerFile").click();
  $("#edOrdnerFile").onchange = e => dateienNehmen(e.target.files);
  $("#edLeeren").onclick = () => {
    state.motive = state.motive.filter(m => !m.datei);
    state.motiv = 0;
    $("#edLeeren").hidden = true;
    motiveRendern();
    neuZeichnen();
    toast("Eigene Motive entfernt.");
  };

  $("#edPng").onclick = pngSichern;
  $("#edVideoBtn").onclick = videoBauen;

  // Auf Änderungen der anderen Module reagieren
  on("post",  neuZeichnen);
  on("haus",  neuZeichnen);
  on("motiv", () => { motiveRendern(); neuZeichnen(); });

  // Segmente auf den gespeicherten Zustand setzen
  vorlagenZeigen();
  reglerZeigen();
  passungZeigen();
  $$("#edSegFormat button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.v === state.format)));

  motiveRendern();
  neuZeichnen();
  // Nach dem Laden der Schriften noch einmal — sonst steht die erste
  // Vorschau in der Ersatzschrift.
  schriftenLaden().then(neuZeichnen);
}
