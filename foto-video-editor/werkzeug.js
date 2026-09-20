/**
 * Kleine Helfer, die alle Module benutzen. Absichtlich winzig —
 * hier kommt kein Framework rein.
 */

export const $  = (s, wurzel = document) => wurzel.querySelector(s);
export const $$ = (s, wurzel = document) => [...wurzel.querySelectorAll(s)];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** HTML-Sonderzeichen entschärfen, bevor Text per innerHTML gesetzt wird. */
export const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/** Satzzeichen ergänzen, wenn keines da ist. */
export const satz = s => {
  const t = String(s).trim();
  return !t ? "" : (/[.!?…]$/.test(t) ? t : t + ".");
};

/**
 * Umlaute VOR dem Entfernen der Diakritika ersetzen — sonst wird aus
 * "Küche" ein "kuche" statt "kueche". Für Hashtags und Dateinamen.
 */
export const slug = s => String(s).toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]/g, "");

let toastTimer;
/** Kurze Rückmeldung unten am Bildschirm. */
export function toast(text) {
  let el = $(".fve-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "fve-toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3800);
}

/** Bilder einmal laden und merken. */
const bilder = new Map();
export function bildHolen(src) {
  if (bilder.has(src)) return Promise.resolve(bilder.get(src));
  return new Promise(res => {
    const im = new Image();
    im.onload  = () => { bilder.set(src, im); res(im); };
    im.onerror = () => res(null);
    im.src = src;
  });
}
