/**
 * MODUL 1 · Farben aus einem Bild ziehen
 * ======================================
 * Wird das Logo hochgeladen, soll die Hausfarbe nicht geraten, sondern
 * aus dem Logo kommen. Das ist der Unterschied zwischen "sieht aus wie
 * eine Vorlage" und "sieht aus wie dieser Betrieb".
 *
 * Verfahren: Bild klein rechnen, Pixel in grobe Farbtöpfe einsortieren,
 * die häufigsten zurückgeben. Grau, fast-Weiß und fast-Schwarz fliegen
 * raus — die sind in fast jedem Logo drin und taugen nicht als Akzent.
 */

const hex = (r, g, b) =>
  "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

function nachHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

/**
 * Die kräftigsten Farben eines Bildes.
 *
 * @param {HTMLImageElement|ImageBitmap} bild
 * @param {number} anzahl wie viele Farben zurückkommen sollen
 * @returns {string[]} Hex-Werte, häufigste zuerst
 */
export function farbenAus(bild, anzahl = 5) {
  const gr = 90;
  const cv = document.createElement("canvas");
  const verh = (bild.height || 1) / (bild.width || 1);
  cv.width = gr;
  cv.height = Math.max(1, Math.round(gr * verh));
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.drawImage(bild, 0, 0, cv.width, cv.height);

  let daten;
  try {
    daten = c.getImageData(0, 0, cv.width, cv.height).data;
  } catch (e) {
    return [];   // fremde Herkunft — Canvas gesperrt
  }

  const toepfe = new Map();
  for (let i = 0; i < daten.length; i += 4) {
    const a = daten[i + 3];
    if (a < 160) continue;                       // durchsichtig überspringen
    const r = daten[i], g = daten[i + 1], b = daten[i + 2];
    const { s, l } = nachHsl(r, g, b);
    if (s < 0.18) continue;                      // grau
    if (l < 0.12 || l > 0.93) continue;          // fast schwarz oder weiß
    // Grob einsortieren, damit Nuancen desselben Tons zusammenfallen
    const k = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const t = toepfe.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    t.n++; t.r += r; t.g += g; t.b += b;
    toepfe.set(k, t);
  }

  return [...toepfe.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, anzahl)
    .map(t => hex(t.r / t.n, t.g / t.n, t.b / t.n));
}

/**
 * Taugt die Farbe als Schlüsselwort-Farbe auf dunklem Grund?
 * Sehr dunkle Töne verschwinden im Scrim.
 */
export function gutAufDunkel(hexfarbe) {
  const n = parseInt(hexfarbe.slice(1), 16);
  const { l, s } = nachHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return l > 0.32 && s > 0.25;
}
