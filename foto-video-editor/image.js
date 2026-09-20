/**
 * MODUL 2 · Bild-Pipeline — Strategie-Schritt 1
 * =============================================
 * Zeichnet einen fertigen Post auf ein Canvas. Eine einzige Funktion,
 * damit die Video-Pipeline exakt dasselbe Bild erzeugen kann.
 *
 * Die Regeln hier stammen aus laufender Reel- und Post-Produktion für
 * Tiroler Betriebe, nicht aus einer Design-Vorlage:
 *
 *   · Fotos werden NIE beschnitten. Den Rand füllt ein Unschärfe-
 *     Hintergrund aus demselben Bild. Bei einem Post, der ein Zimmer
 *     verkauft, ist Anschneiden der falsche Kompromiss.
 *   · Overlays sitzen im mittleren 4:5-Feld. Instagram beschneidet das
 *     Profilraster genau darauf — Text am unteren 1920er-Rand wäre dort weg.
 *     Auch die Verläufe sind am Feld verankert, nicht am Vollbild, sonst
 *     ist der obere Verlauf auf Logo-Höhe schon ausgelaufen.
 *   · Die Grundlinie der Schlagzeile liegt bei 0,72 der Bildhöhe.
 *   · Kontur in ZWEI Durchgängen (siehe textMitKontur).
 */

import { state } from "../src/core/state.js";
import { bildHolen } from "../src/core/dom.js";

export const MASSE = {
  story: { w: 1080, h: 1920 },
  post:  { w: 1080, h: 1350 }
};

/**
 * Wo der Textblock sitzt. `grund` ist die Grundlinie der UNTERSTEN Zeile,
 * als Anteil der Bildhöhe.
 *
 * "unten" ist die Vorgabe und stammt aus der Praxis: 0,72 statt ganz unten,
 * weil darunter noch die Aufforderung Platz braucht und Instagram in der
 * Story unten eigene Bedienelemente einblendet.
 */
export const LAYOUTS = {
  unten: { grund: 0.72, ausricht: "left"   },
  mitte: { grund: 0.56, ausricht: "left"   },
  oben:  { grund: 0.34, ausricht: "left"   }
};

/**
 * Kontur in zwei Durchgängen: erst nur die Kontur, dann die Füllung darüber.
 * Canvas legt die Kontur MITTIG auf die Glyphenkante — ein einzelner
 * Durchgang frisst also die halbe Strichstärke von innen weg und fette
 * Schrift sieht plötzlich dünn und hohl aus.
 */
export function textMitKontur(c, txt, x, y, size, farbe) {
  c.lineJoin = "round";
  c.miterLimit = 2;               // sonst schießen Zacken aus M, W, A
  c.lineWidth = size * 0.17;
  c.strokeStyle = "rgba(0,0,0,.92)";
  c.strokeText(txt, x, y);
  c.fillStyle = farbe;
  c.fillText(txt, x, y);
}

/**
 * Die größte Schriftgröße finden, bei der die längste Zeile noch in die
 * Breite passt. Ohne das läuft eine zu lange Zeile einfach aus dem Bild —
 * und das fällt erst im Export auf.
 */
function passendeGroesse(c, zeilen, maxBreite, start) {
  let size = start;
  while (size > start * 0.45) {
    c.font = `800 ${Math.round(size)}px Inter, sans-serif`;
    const breiteste = Math.max(...zeilen.map(z => c.measureText(z || "").width));
    if (breiteste <= maxBreite) break;
    size -= 2;
  }
  return Math.round(size);
}

/**
 * Den Post zeichnen.
 *
 * @param {HTMLCanvasElement} canvas Ziel. Größe wird hier gesetzt.
 * @param {object} opts
 *   opts.push      0…1  Ken-Burns-Fortschritt (die Video-Pipeline nutzt das)
 *   opts.nurKarte  Zahl Nur diese eine Overlay-Zeile zeigen (Video)
 *   opts.pop       Zahl Skalierung der Zeile beim Einblenden (Video)
 *   opts.raster    bool Hilfslinien einzeichnen
 */
export async function zeichnePost(canvas, opts = {}) {
  const post = state.post;
  if (!canvas || !post) return;

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

  const motiv = state.motive[state.motiv] || state.motive[0];
  const im = motiv ? await bildHolen(motiv.datei || motiv.src) : null;

  c.save();
  c.fillStyle = "#0d0e12";
  c.fillRect(0, 0, W, H);

  if (im) {
    // Hintergrund: dasselbe Bild, formatfüllend, unscharf, abgedunkelt.
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
    c.filter = "blur(26px) brightness(.5) saturate(.8)";
    c.drawImage(kl, -W * 0.06, -H * 0.06, W * 1.12, H * 1.12);
    c.filter = "none";

    // Vordergrund: Foto vollständig sichtbar, nie beschnitten.
    const z = 1 + push * 0.09;
    const fit = Math.min(W / im.width, H / im.height) * z;
    const w = im.width * fit, h = im.height * fit;
    c.drawImage(im, (W - w) / 2, (H - h) / 2 - H * 0.02 * push, w, h);
  }

  // Verläufe am mittleren 4:5-Feld verankert
  const feldH = W * 1.25, feldY = (H - feldH) / 2;
  const gTop = c.createLinearGradient(0, feldY, 0, feldY + feldH * 0.34);
  gTop.addColorStop(0, "rgba(8,9,11,.66)");
  gTop.addColorStop(1, "rgba(8,9,11,0)");
  c.fillStyle = gTop;
  c.fillRect(0, 0, W, feldY + feldH * 0.34);

  const gBot = c.createLinearGradient(0, feldY + feldH * 0.42, 0, H);
  gBot.addColorStop(0, "rgba(8,9,11,0)");
  gBot.addColorStop(0.72, "rgba(8,9,11,.80)");
  gBot.addColorStop(1, "rgba(8,9,11,.92)");
  c.fillStyle = gBot;
  c.fillRect(0, feldY + feldH * 0.42, W, H - (feldY + feldH * 0.42));

  const pad = Math.round(W * 0.072);

  // Logo bzw. Wortmarke, ebenfalls im 4:5-Feld verankert
  const logoY = feldY + pad;
  let logoGesetzt = false;
  if (haus.logo) {
    const lg = await bildHolen(haus.logo);
    if (lg) {
      const lw = Math.min(W * 0.34, lg.width);
      c.drawImage(lg, pad, logoY, lw, lw * lg.height / lg.width);
      logoGesetzt = true;
    }
  }
  if (!logoGesetzt) {
    c.font = `600 ${Math.round(W * 0.031)}px Inter, sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    c.fillStyle = "rgba(255,255,255,.94)";
    c.fillText(haus.name.toUpperCase(), pad, logoY);
    c.fillStyle = haus.farbe;
    c.fillRect(pad, logoY + W * 0.048, W * 0.055, W * 0.007);
  }

  // Event-Badge: Datum und Ort, wenn es kein Betrieb, sondern ein Event ist.
  // Sitzt direkt unter dem Logo, damit beides als Kopf zusammenwirkt.
  if (haus.modus === "event" && (haus.datum || haus.ortDetail)) {
    const txt = [haus.datum, haus.ortDetail].filter(Boolean).join("  ·  ").toUpperCase();
    const bs = Math.round(W * 0.024);
    c.font = `700 ${bs}px Inter, sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    const bx = pad, by = logoY + W * 0.082;
    const bw = c.measureText(txt).width + bs * 1.5;
    const bh = bs * 2.1;
    c.fillStyle = haus.farbe;
    if (c.roundRect) { c.beginPath(); c.roundRect(bx, by, bw, bh, bh / 2); c.fill(); }
    else c.fillRect(bx, by, bw, bh);
    c.fillStyle = "#ffffff";
    c.fillText(txt, bx + bs * 0.75, by + bh / 2 - bs * 0.6);
  }

  const lay = LAYOUTS[state.layout] || LAYOUTS.unten;
  const grundY = H * lay.grund;

  // Schlagzeile — Größe so, dass die längste Zeile in die Breite passt
  const zeilen = nurKarte !== undefined ? [post.head[nurKarte]] : post.head;
  const maxBreite = W - pad * 2;
  const gross = passendeGroesse(c, zeilen, maxBreite, W * 0.086);
  const zh = gross * 1.14;
  const start = grundY - (zeilen.length - 1) * zh;
  const keyTeile = String(post.key || "").split(/\s+/).filter(Boolean);

  // Kicker — sitzt über der obersten Zeile
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.font = `500 ${Math.round(W * 0.0245)}px Inter, sans-serif`;
  c.fillStyle = "rgba(255,255,255,.74)";
  c.save();
  c.letterSpacing = "2px";
  c.fillText(String(post.kicker || "").toUpperCase(), pad, start - gross - W * 0.028);
  c.restore();
  c.font = `800 ${gross}px Inter, sans-serif`;

  zeilen.forEach((z, i) => {
    if (!z) return;
    const istKey = keyTeile.length > 0 && keyTeile.some(k => z.includes(k));
    const sc = (nurKarte !== undefined && opts.pop !== undefined) ? opts.pop : 1;
    c.save();
    c.translate(pad, start + i * zh);
    c.scale(sc, sc);
    textMitKontur(c, z, 0, 0, gross, istKey ? haus.farbe : "#ffffff");
    c.restore();
  });

  // Aufforderung
  const cta = state.ziel === "gast" ? haus.ctaGast : haus.ctaTeam;
  if (cta && nurKarte === undefined) {
    c.font = `600 ${Math.round(W * 0.026)}px Inter, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.9)";
    c.fillText(cta, pad, grundY + W * 0.075);
  }

  // Hilfslinien
  if (opts.raster && nurKarte === undefined) {
    c.strokeStyle = "rgba(255,255,255,.45)";
    c.lineWidth = 2;
    c.setLineDash([14, 12]);
    c.strokeRect(1, feldY, W - 2, feldH);
    c.setLineDash([]);
    c.font = `600 ${Math.round(W * 0.019)}px Inter, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.66)";
    c.fillText("4:5 — was im Profilraster übrig bleibt", pad, feldY - W * 0.014);
    c.strokeStyle = haus.farbe;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.moveTo(0, grundY);
    c.lineTo(W, grundY);
    c.stroke();
    c.fillStyle = haus.farbe;
    c.font = `600 ${Math.round(W * 0.017)}px Inter, sans-serif`;
    c.fillText(`Grundlinie · Layout „${state.layout}“ · Schrift ${gross} px`, pad, grundY - W * 0.009);
    c.setLineDash([]);
  }

  c.restore();
}

/** Den aktuellen Post in voller Auflösung als PNG-Blob. */
export async function alsPng() {
  const mass = MASSE[state.format] || MASSE.story;
  const gross = document.createElement("canvas");
  gross.width = mass.w;
  gross.height = mass.h;
  await zeichnePost(gross, { raster: false });
  return new Promise(r => gross.toBlob(r, "image/png"));
}
