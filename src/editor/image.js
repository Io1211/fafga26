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

import { state } from "../core/state.js";
import { bildHolen } from "../core/dom.js";

export const MASSE = {
  story: { w: 1080, h: 1920 },
  post:  { w: 1080, h: 1350 }
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

  // Kicker
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  c.font = `500 ${Math.round(W * 0.0245)}px Inter, sans-serif`;
  c.fillStyle = "rgba(255,255,255,.74)";
  const kickerY = H * 0.72 - (post.head.length * W * 0.098) - W * 0.05;
  c.save();
  c.letterSpacing = "2px";
  c.fillText(String(post.kicker || "").toUpperCase(), pad, kickerY);
  c.restore();

  // Schlagzeile — Unterkante auf 0,72 der Bildhöhe
  const zeilen = nurKarte !== undefined ? [post.head[nurKarte]] : post.head;
  const gross = Math.round(W * 0.086);
  c.font = `800 ${gross}px Inter, sans-serif`;
  const zh = gross * 1.14;
  const start = H * 0.72 - (zeilen.length - 1) * zh;
  const keyTeile = String(post.key || "").split(/\s+/).filter(Boolean);

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
    c.fillText(cta, pad, H * 0.72 + W * 0.075);
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
    c.moveTo(0, H * 0.72);
    c.lineTo(W, H * 0.72);
    c.stroke();
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
