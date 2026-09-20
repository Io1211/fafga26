/**
 * MODUL 1 · Bild-Pipeline
 * =======================
 * Zeichnet einen fertigen Post auf ein Canvas. Eine einzige Funktion, damit
 * Vorschau, PNG-Export und jeder Videoframe garantiert gleich aussehen (K10).
 *
 * Die Regeln stammen aus laufender Post- und Reel-Produktion für Tiroler
 * Betriebe, nicht aus einer Design-Vorlage. Die Kriterien, gegen die hier
 * gebaut wird, stehen in KRITERIEN.md.
 */

import { state } from "../src/core/state.js";
import { bildHolen } from "../src/core/dom.js";

export const MASSE = {
  story: { w: 1080, h: 1920 },
  post:  { w: 1080, h: 1350 }
};

/** Wie das Foto ins Format kommt (K3). */
export const PASSUNGEN = ["unschaerfe", "fuellend", "rand"];

/**
 * Drei Schriftcharaktere (K6). Mehr Auswahl heißt nur längere Entscheidung.
 *   grotesk     — sachlich, neutral. Handwerk, Dienstleistung.
 *   serif       — warm, redaktionell. Gasthof, Hotel, alles Persönliche.
 *   kondensiert — laut, plakativ. Events, Ankündigungen.
 */
export const SCHRIFTEN = {
  grotesk:     { name: "Grotesk",     stapel: "Inter, sans-serif",   gewicht: 800, groesse: 0.086, hoehe: 1.14, sperrung: 0 },
  serif:       { name: "Serif",       stapel: "Fraunces, Georgia, serif", gewicht: 800, groesse: 0.082, hoehe: 1.10, sperrung: -0.5 },
  kondensiert: { name: "Kondensiert", stapel: "Oswald, Inter, sans-serif", gewicht: 600, groesse: 0.104, hoehe: 1.06, sperrung: 1 }
};

/** Höhe der Grundlinie der UNTERSTEN Textzeile, als Anteil der Bildhöhe (K7). */
export const TEXTHOEHEN = { oben: 0.34, mitte: 0.56, unten: 0.72 };

/** Logo-Positionen, verankert am 4:5-Feld (K2, K7). */
export const LOGOPOSITIONEN = {
  "oben-links":   { x: "links",  y: "oben"  },
  "oben-mitte":   { x: "mitte",  y: "oben"  },
  "oben-rechts":  { x: "rechts", y: "oben"  },
  "unten-links":  { x: "links",  y: "unten" },
  "unten-mitte":  { x: "mitte",  y: "unten" },
  "unten-rechts": { x: "rechts", y: "unten" }
};

/** Wie der Text vom Bild getrennt wird (K1). */
export const TEXTRAENDER = {
  kontur:   "Kontur",
  flaeche:  "Farbfläche",
  schatten: "Schatten",
  ohne:     "Ohne"
};

/**
 * Vorlagen (K5, K9). Sie unterscheiden sich STRUKTURELL — wo was steht und
 * wie es vom Bild getrennt wird —, nicht dekorativ. Deshalb sind es sechs
 * und nicht zweihundert.
 */
export const VORLAGEN = {
  klassisch: {
    name: "Klassisch",
    hinweis: "Logo oben links, Aussage unten. Der sichere Standard für fast jeden Post.",
    stil: { schrift: "grotesk", groesse: 1, ausricht: "links", textPos: "unten",
            textRand: "kontur", logoAn: true, logoGroesse: 1, logoPos: "oben-links",
            unschaerfe: 26, abdunkeln: 1 }
  },
  banderole: {
    name: "Banderole",
    hinweis: "Jede Zeile auf einem farbigen Balken. Trägt auch auf sehr unruhigen Fotos.",
    stil: { schrift: "grotesk", groesse: 0.92, ausricht: "links", textPos: "unten",
            textRand: "flaeche", logoAn: true, logoGroesse: 0.9, logoPos: "oben-links",
            unschaerfe: 22, abdunkeln: 0.5 }
  },
  plakat: {
    name: "Plakat",
    hinweis: "Kondensiert, zentriert, groß. Für Ankündigungen und Events.",
    stil: { schrift: "kondensiert", groesse: 1.12, ausricht: "mitte", textPos: "mitte",
            textRand: "kontur", logoAn: true, logoGroesse: 1, logoPos: "oben-mitte",
            unschaerfe: 30, abdunkeln: 1.2 }
  },
  editorial: {
    name: "Editorial",
    hinweis: "Serifen, ruhig, ohne Kontur. Wirkt wie eine Reportage statt wie Werbung.",
    stil: { schrift: "serif", groesse: 0.94, ausricht: "links", textPos: "unten",
            textRand: "ohne", logoAn: true, logoGroesse: 0.8, logoPos: "oben-links",
            unschaerfe: 26, abdunkeln: 1.3 }
  },
  zurueckhaltend: {
    name: "Zurückhaltend",
    hinweis: "Kleines Logo, wenig Abdunklung. Lässt das Foto arbeiten.",
    stil: { schrift: "grotesk", groesse: 0.74, ausricht: "links", textPos: "unten",
            textRand: "schatten", logoAn: true, logoGroesse: 0.65, logoPos: "unten-rechts",
            unschaerfe: 20, abdunkeln: 0.55 }
  },
  schild: {
    name: "Schild",
    hinweis: "Alles zentriert auf einer Fläche. Für Öffnungszeiten, Absagen, Hinweise.",
    stil: { schrift: "grotesk", groesse: 0.95, ausricht: "mitte", textPos: "mitte",
            textRand: "flaeche", logoAn: true, logoGroesse: 0.85, logoPos: "oben-mitte",
            unschaerfe: 34, abdunkeln: 1.5 }
  }
};

export const STANDARDSTIL = { ...VORLAGEN.klassisch.stil };

/* ------------------------------------------------------------------ *
 *  Hilfen
 * ------------------------------------------------------------------ */

const stil = () => ({ ...STANDARDSTIL, ...(state.stil || {}) });

/**
 * Kontur in ZWEI Durchgängen: erst nur die Kontur, dann die Füllung darüber.
 * Canvas legt die Kontur mittig auf die Glyphenkante — ein einzelner
 * Durchgang frisst die halbe Strichstärke von innen weg, und fette Schrift
 * sieht plötzlich dünn und hohl aus.
 */
function mitKontur(c, txt, x, y, size, farbe) {
  c.lineJoin = "round";
  c.miterLimit = 2;               // sonst schießen Zacken aus M, W, A
  c.lineWidth = size * 0.17;
  c.strokeStyle = "rgba(0,0,0,.92)";
  c.strokeText(txt, x, y);
  c.fillStyle = farbe;
  c.fillText(txt, x, y);
}

/** Die größte Schrift finden, bei der die längste Zeile noch passt (K8). */
function passendeGroesse(c, zeilen, maxBreite, start, schrift) {
  let size = start;
  while (size > start * 0.42) {
    c.font = `${schrift.gewicht} ${Math.round(size)}px ${schrift.stapel}`;
    const breiteste = Math.max(...zeilen.map(z => c.measureText(z || "").width));
    if (breiteste <= maxBreite) break;
    size -= 2;
  }
  return Math.round(size);
}

/** x-Anker und Canvas-Ausrichtung für eine Ausrichtung. */
function anker(ausricht, W, pad) {
  if (ausricht === "mitte")  return { x: W / 2,     align: "center" };
  if (ausricht === "rechts") return { x: W - pad,   align: "right"  };
  return { x: pad, align: "left" };
}

/** Eine Textzeile in der gewählten Trennungsart zeichnen (K1). */
function zeileZeichnen(c, txt, x, y, size, farbe, art, align, hausfarbe) {
  if (!txt) return;

  if (art === "flaeche") {
    const b = c.measureText(txt).width;
    const px = size * 0.30, py = size * 0.24;
    let bx = x - px;
    if (align === "center") bx = x - b / 2 - px;
    if (align === "right")  bx = x - b - px;
    const by = y - size * 0.80 - py;
    const bw = b + px * 2, bh = size * 1.02 + py * 2;
    c.fillStyle = farbe === hausfarbe ? hausfarbe : "rgba(12,13,16,.86)";
    if (c.roundRect) { c.beginPath(); c.roundRect(bx, by, bw, bh, size * 0.08); c.fill(); }
    else c.fillRect(bx, by, bw, bh);
    // Auf der Hausfarbe steht dunkler Text besser als weißer
    c.fillStyle = farbe === hausfarbe ? "#0c0d10" : "#ffffff";
    c.fillText(txt, x, y);
    return;
  }

  if (art === "schatten") {
    c.save();
    c.shadowColor = "rgba(0,0,0,.8)";
    c.shadowBlur = size * 0.36;
    c.shadowOffsetY = size * 0.05;
    c.fillStyle = farbe;
    c.fillText(txt, x, y);
    c.restore();
    return;
  }

  if (art === "ohne") {
    c.fillStyle = farbe;
    c.fillText(txt, x, y);
    return;
  }

  mitKontur(c, txt, x, y, size, farbe);
}

/* Zwei Zeichenvorgänge auf demselben Canvas können sich überlagern: beide
   löschen, beide warten auf das Bild, beide malen — das Ergebnis ist ein
   Übereinander aus altem und neuem Stand. Jeder Aufruf zieht deshalb eine
   Nummer; wer beim Malen nicht mehr der Neueste ist, bricht ab. */
const laufend = new WeakMap();

/* ------------------------------------------------------------------ *
 *  Zeichnen
 * ------------------------------------------------------------------ */

/**
 * @param {HTMLCanvasElement} canvas Ziel. Die Größe wird hier gesetzt.
 * @param {object} opts
 *   opts.push      0…1  Ken-Burns-Fortschritt (Video)
 *   opts.nurKarte  Zahl Nur diese eine Overlay-Zeile zeigen (Video)
 *   opts.pop       Zahl Skalierung beim Einblenden (Video)
 *   opts.raster    bool Hilfslinien einzeichnen
 */
export async function zeichnePost(canvas, opts = {}) {
  const post = state.post;
  if (!canvas || !post) return;

  const nummer = (laufend.get(canvas) || 0) + 1;
  laufend.set(canvas, nummer);
  const veraltet = () => laufend.get(canvas) !== nummer;

  const mass = MASSE[state.format] || MASSE.story;
  if (canvas.width !== mass.w || canvas.height !== mass.h) {
    canvas.width = mass.w;
    canvas.height = mass.h;
  }

  const c = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const push = opts.push ?? 0;
  const nurKarte = opts.nurKarte;
  const haus = state.haus;
  const s = stil();
  const schrift = SCHRIFTEN[s.schrift] || SCHRIFTEN.grotesk;

  const motiv = state.motive[state.motiv] || state.motive[0];
  const im = motiv ? await bildHolen(motiv.datei || motiv.src) : null;
  if (veraltet()) return;

  /* Bei farbigem Rand darf der Verlauf das Foto nicht verlassen — sonst ist
     der Rand nicht die gewählte Farbe, sondern eine abgedunkelte. */
  let fotoRect = null;

  c.save();
  c.fillStyle = "#0d0e12";
  c.fillRect(0, 0, W, H);

  /* ---- Das Foto (K3) ---- */
  if (im) {
    const passung = state.passung || "unschaerfe";
    const z = 1 + push * 0.09;

    if (passung === "fuellend") {
      const cov = Math.max(W / im.width, H / im.height) * z;
      const w = im.width * cov, h = im.height * cov;
      c.drawImage(im, (W - w) / 2, (H - h) / 2 - H * 0.02 * push, w, h);

    } else {
      if (passung === "rand") {
        c.fillStyle = state.randfarbe || "#ffffff";
        c.fillRect(0, 0, W, H);
      } else {
        // Klein rechnen und hochskalieren — Blur auf dem großen Canvas ist zäh.
        const kl = document.createElement("canvas");
        kl.width = 90;
        kl.height = Math.max(1, Math.round(90 * H / W));
        const kc = kl.getContext("2d");
        const cov = Math.max(kl.width / im.width, kl.height / im.height);
        kc.drawImage(im,
          (kl.width  - im.width  * cov) / 2,
          (kl.height - im.height * cov) / 2,
          im.width * cov, im.height * cov);
        c.filter = `blur(${s.unschaerfe}px) brightness(.5) saturate(.8)`;
        c.drawImage(kl, -W * 0.06, -H * 0.06, W * 1.12, H * 1.12);
        c.filter = "none";
      }
      const fit = Math.min(W / im.width, H / im.height) * z;
      const w = im.width * fit, h = im.height * fit;
      const fx = (W - w) / 2, fy = (H - h) / 2 - H * 0.02 * push;
      c.drawImage(im, fx, fy, w, h);
      if (passung === "rand") fotoRect = { x: fx, y: fy, w, h };
    }
  }

  /* ---- Verläufe, am mittleren 4:5-Feld verankert (K1, K2) ---- */
  const dunkel = (state.passung === "rand" ? 0.34 : 1) * (s.abdunkeln ?? 1);
  const feldH = W * 1.25, feldY = (H - feldH) / 2;

  c.save();
  if (fotoRect) { c.beginPath(); c.rect(fotoRect.x, fotoRect.y, fotoRect.w, fotoRect.h); c.clip(); }
  const gTop = c.createLinearGradient(0, feldY, 0, feldY + feldH * 0.34);
  gTop.addColorStop(0, `rgba(8,9,11,${Math.min(0.9, 0.66 * dunkel)})`);
  gTop.addColorStop(1, "rgba(8,9,11,0)");
  c.fillStyle = gTop;
  c.fillRect(0, 0, W, feldY + feldH * 0.34);

  const gBot = c.createLinearGradient(0, feldY + feldH * 0.42, 0, H);
  gBot.addColorStop(0, "rgba(8,9,11,0)");
  gBot.addColorStop(0.72, `rgba(8,9,11,${Math.min(0.94, 0.80 * dunkel)})`);
  gBot.addColorStop(1, `rgba(8,9,11,${Math.min(0.97, 0.92 * dunkel)})`);
  c.fillStyle = gBot;
  c.fillRect(0, feldY + feldH * 0.42, W, H - (feldY + feldH * 0.42));
  c.restore();

  const pad = Math.round(W * 0.072);

  /* ---- Logo, am 4:5-Feld verankert (K2, K7) ---- */
  let logoKasten = null;
  if (s.logoAn !== false) {
    const pos = LOGOPOSITIONEN[s.logoPos] || LOGOPOSITIONEN["oben-links"];
    const gr = s.logoGroesse ?? 1;

    if (haus.logo) {
      const lg = await bildHolen(haus.logo);
      if (veraltet()) { c.restore(); return; }
      if (lg) {
        // In eine Box einpassen. Nur die Breite zu begrenzen geht schief,
        // sobald das Logo quadratisch ist — dann wird es turmhoch (K8).
        const f = Math.min((W * 0.26 * gr) / lg.width, (W * 0.105 * gr) / lg.height);
        const lw = lg.width * f, lh = lg.height * f;
        const lx = pos.x === "mitte" ? (W - lw) / 2 : pos.x === "rechts" ? W - pad - lw : pad;
        const ly = pos.y === "unten" ? feldY + feldH - pad - lh : feldY + pad;
        c.drawImage(lg, lx, ly, lw, lh);
        logoKasten = { x: lx, y: ly, w: lw, h: lh, mitte: pos.x === "mitte" };
      }
    }
    if (!logoKasten) {
      // Ohne Logo: der Name als Wortmarke, mit Strich in der Hausfarbe
      const ws = Math.round(W * 0.031 * gr);
      c.font = `600 ${ws}px Inter, sans-serif`;
      c.textBaseline = "top";
      const tb = c.measureText(haus.name.toUpperCase()).width;
      const lx = pos.x === "mitte" ? (W - tb) / 2 : pos.x === "rechts" ? W - pad - tb : pad;
      const ly = pos.y === "unten" ? feldY + feldH - pad - ws * 2.2 : feldY + pad;
      c.textAlign = "left";
      c.fillStyle = "rgba(255,255,255,.94)";
      c.fillText(haus.name.toUpperCase(), lx, ly);
      c.fillStyle = haus.farbe;
      c.fillRect(lx, ly + ws * 1.55, W * 0.055 * gr, W * 0.007);
      logoKasten = { x: lx, y: ly, w: tb, h: ws * 2.0, mitte: pos.x === "mitte" };
    }
  }

  /* ---- Event-Badge: Datum und Ort, direkt unter dem Logo ---- */
  let badgeGesetzt = false;
  if (haus.modus === "event" && (haus.datum || haus.ortDetail)) {
    badgeGesetzt = true;
    const txt = [haus.datum, haus.ortDetail].filter(Boolean).join("  ·  ").toUpperCase();
    const bs = Math.round(W * 0.024);
    c.font = `700 ${bs}px Inter, sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    const bw = c.measureText(txt).width + bs * 1.5;
    const bh = bs * 2.1;
    const obenLinks = logoKasten
      ? { x: logoKasten.mitte ? (W - bw) / 2 : logoKasten.x, y: logoKasten.y + logoKasten.h + W * 0.030 }
      : { x: pad, y: feldY + pad };
    c.fillStyle = haus.farbe;
    if (c.roundRect) { c.beginPath(); c.roundRect(obenLinks.x, obenLinks.y, bw, bh, bh / 2); c.fill(); }
    else c.fillRect(obenLinks.x, obenLinks.y, bw, bh);
    c.fillStyle = "#0c0d10";
    c.fillText(txt, obenLinks.x + bs * 0.75, obenLinks.y + bh / 2 - bs * 0.6);
  }

  /* ---- Schlagzeile (K4, K7, K8) ---- */
  const grundY = H * (TEXTHOEHEN[s.textPos] ?? TEXTHOEHEN.unten);
  const zeilen = nurKarte !== undefined ? [post.head[nurKarte]] : post.head;
  const basis = W * schrift.groesse * (s.groesse ?? 1);
  const gross = passendeGroesse(c, zeilen, W - pad * 2, basis, schrift);
  const zh = gross * schrift.hoehe;
  const start = grundY - (zeilen.length - 1) * zh;
  const keyTeile = String(post.key || "").split(/\s+/).filter(Boolean);
  const { x: ax, align } = anker(s.ausricht, W, pad);

  c.textBaseline = "alphabetic";
  c.textAlign = align;

  /* Kicker — sitzt über der obersten Zeile.
     Trägt das Badge bereits Datum und Ort, wäre der Kicker eine Wiederholung
     derselben Angabe im selben Bild. Dann fällt er weg: nichts zweimal sagen. */
  const kick = String(post.kicker || "");
  const doppelt = badgeGesetzt && [haus.datum, haus.ortDetail]
    .filter(Boolean)
    .some(t => kick.toLowerCase().includes(String(t).toLowerCase().split(" ")[0]));
  if (kick && !doppelt) {
    c.save();
    c.font = `500 ${Math.round(W * 0.0245)}px Inter, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.76)";
    c.letterSpacing = "2px";
    c.fillText(kick.toUpperCase(), ax, start - gross - W * 0.028);
    c.restore();
  }

  c.font = `${schrift.gewicht} ${gross}px ${schrift.stapel}`;
  if (schrift.sperrung) c.letterSpacing = `${schrift.sperrung}px`;

  zeilen.forEach((z, i) => {
    if (!z) return;
    const istKey = keyTeile.length > 0 && keyTeile.some(k => z.includes(k));
    const sc = (nurKarte !== undefined && opts.pop !== undefined) ? opts.pop : 1;
    c.save();
    c.translate(ax, start + i * zh);
    c.scale(sc, sc);
    zeileZeichnen(c, z, 0, 0, gross, istKey ? haus.farbe : "#ffffff",
                  s.textRand, align, haus.farbe);
    c.restore();
  });
  c.letterSpacing = "0px";

  /* ---- Aufforderung ---- */
  const cta = state.ziel === "gast" ? haus.ctaGast : haus.ctaTeam;
  if (cta && nurKarte === undefined) {
    c.font = `600 ${Math.round(W * 0.026)}px Inter, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.9)";
    c.fillText(cta, ax, grundY + W * 0.075);
  }

  /* ---- Hilfslinien (K2) ---- */
  if (opts.raster && nurKarte === undefined) {
    // Story-Bedienzonen von Instagram
    if (state.format === "story") {
      c.fillStyle = "rgba(216,34,41,.14)";
      c.fillRect(0, 0, W, H * 0.13);
      c.fillRect(0, H * 0.84, W, H * 0.16);
      c.fillStyle = "rgba(255,255,255,.55)";
      c.font = `600 ${Math.round(W * 0.016)}px Inter, sans-serif`;
      c.textAlign = "left";
      c.fillText("Story-Bedienelemente", pad, H * 0.13 - W * 0.012);
    }
    c.strokeStyle = "rgba(255,255,255,.45)";
    c.lineWidth = 2;
    c.setLineDash([14, 12]);
    c.strokeRect(1, feldY, W - 2, feldH);
    c.setLineDash([]);
    c.textAlign = "left";
    c.font = `600 ${Math.round(W * 0.019)}px Inter, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.66)";
    c.fillText("4:5 — was im Profilraster übrig bleibt", pad, feldY - W * 0.014);
    c.strokeStyle = haus.farbe;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.moveTo(0, grundY);
    c.lineTo(W, grundY);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = haus.farbe;
    c.font = `600 ${Math.round(W * 0.017)}px Inter, sans-serif`;
    c.fillText(`Grundlinie · ${schrift.name} ${gross} px · ${s.textRand}`, pad, grundY - W * 0.009);
  }

  c.restore();
}

/** Den aktuellen Post in voller Auflösung als PNG-Blob (K10). */
export async function alsPng() {
  const mass = MASSE[state.format] || MASSE.story;
  const gross = document.createElement("canvas");
  gross.width = mass.w;
  gross.height = mass.h;
  await zeichnePost(gross, { raster: false });
  return new Promise(r => gross.toBlob(r, "image/png"));
}
