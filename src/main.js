/**
 * Schale — hängt die drei Module ein. Sonst nichts.
 *
 * Diese Datei wird selten angefasst. Wer ein Modul baut, arbeitet in
 * seinem eigenen Ordner unter src/ und ändert hier höchstens eine Zeile.
 */

import { state, laden, on, setzeAnsicht, setzeHaus } from "./core/state.js";
import { $, esc, toast } from "./core/dom.js";
import * as einrichten from "./dashboard/einrichten.js";
import * as editor from "./editor/editor.js";
import * as post from "./dashboard/studio.js";
import { zeichnePost } from "./editor/image.js";
import { pruefen as kiPruefen, keyLesen, keySetzen } from "./ai/client.js";

laden();

/* ---------------- MODUL 2 · Dashboard — Einrichtungs-Assistent ---------------- */
einrichten.aufbauen($("#mount-einrichten"), () => {
  const peek = $("#obPeek");
  if (peek) zeichnePost(peek, { raster: false });
});

/* ---------------- MODUL 2 · Dashboard — Studio ---------------- */
// Baut zuerst auf, weil es den Einhängepunkt für die Editor-Bedienung liefert.
const editorSlot = post.aufbauen($("#mount-post"));

/* ---------------- MODUL 1 · Editor (Elias) ---------------- */
editor.aufbauen($("#mount-stage"), editorSlot);

/* ---------------- MODUL 3 · KI-Assistent — Statusanzeige ---------------- */
function kiAnzeige() {
  const chip = $("#mount-ki");
  if (!chip) return;
  const { anbieter, bereit } = state.ki;
  const namen = { mistral: "Mistral", claude: "Claude", keiner: "keine KI" };
  chip.textContent = bereit ? `KI: ${namen[anbieter]}` : "KI: nicht hinterlegt";
  chip.className = "chip " + (bereit ? "live" : "off");
}
on("ki", kiAnzeige);
kiPruefen().then(kiAnzeige);

$("#kiKeyBtn").onclick = () => {
  const jetzt = keyLesen();
  const eingabe = prompt(
    "Mistral API-Key (bleibt nur in diesem Browser, kommt nie ins Repo).\n" +
    "Leer lassen und OK drücken entfernt den Key.",
    jetzt
  );
  if (eingabe === null) return;
  keySetzen(eingabe);
  toast(eingabe.trim() ? "Key hinterlegt." : "Key entfernt.");
};

/* ---------------- Ansicht umschalten ---------------- */
function ansicht() {
  const imStudio = state.ansicht === "studio";
  $("#mount-einrichten").hidden = imStudio;
  $("#mount-studio").hidden = !imStudio;
  if (imStudio) {
    $("#topHaus").textContent = `${state.haus.name} · ${state.haus.ort}`;
    window.scrollTo({ top: 0 });
  }
}
on("ansicht", ansicht);
on("haus", () => {
  $("#topHaus").textContent = `${state.haus.name} · ${state.haus.ort}`;
  document.documentElement.style.setProperty("--hausfarbe", state.haus.farbe);
});

/* ---------------- Haus-Schublade (gehört Modul 2) ---------------- */
const drawer = $("#drawer");
$("#btnHaus").onclick = () => {
  schubladeFuellen();
  drawer.setAttribute("open", "");
};
$("#drawerZu").onclick = () => drawer.removeAttribute("open");
$("#drawerVeil").onclick = () => drawer.removeAttribute("open");
document.addEventListener("keydown", e => {
  if (e.key === "Escape") drawer.removeAttribute("open");
});

function schubladeFuellen() {
  const h = state.haus;
  $("#hsName").value = h.name;
  $("#hsOrt").value = h.ort;
  $("#hsArt").value = h.art;
  $("#hsFarbe").value = h.farbe;
  $("#hsFarbeHex").value = h.farbe;
  $("#hsCtaGast").value = h.ctaGast;
  $("#hsCtaTeam").value = h.ctaTeam;
  einrichten.alleListen();
}

$("#hsName").oninput     = e => setzeHaus({ name: e.target.value });
$("#hsOrt").oninput      = e => setzeHaus({ ort: e.target.value });
$("#hsArt").onchange     = e => setzeHaus({ art: e.target.value });
$("#hsCtaGast").oninput  = e => setzeHaus({ ctaGast: e.target.value });
$("#hsCtaTeam").oninput  = e => setzeHaus({ ctaTeam: e.target.value });
$("#hsFarbe").oninput    = e => einrichten.farbeSetzen(e.target.value, e.target);
$("#hsFarbeHex").oninput = e => einrichten.farbeSetzen(e.target.value.trim(), e.target);
$("#hsLogoBtn").onclick  = () => $("#hsLogoFile").click();
$("#hsLogoFile").onchange = e => {
  const f = e.target.files?.[0];
  if (!f) return;
  setzeHaus({ logo: URL.createObjectURL(f) });
  toast("Logo übernommen.");
};
$("#hsBelegPlus").onclick = () => {
  state.haus.belege.push("");
  einrichten.alleListen();
  $("#hsbel" + (state.haus.belege.length - 1))?.focus();
};
$("#hsSperrPlus").onclick = () => {
  const el = $("#hsSperrNeu");
  const v = el.value.trim();
  if (!v) return;
  state.haus.sperr.push(v);
  el.value = "";
  einrichten.alleListen();
  setzeHaus({});
};
$("#hsSperrNeu").onkeydown = e => {
  if (e.key === "Enter") { e.preventDefault(); $("#hsSperrPlus").click(); }
};
$("#hsNeu").onclick = () => {
  drawer.removeAttribute("open");
  einrichten.neuStarten();
};

/* ---------------- Start ---------------- */
post.neuBauen();
ansicht();
schubladeFuellen();

document.fonts?.ready?.then(() => {
  editor.neuZeichnen();
  const peek = $("#obPeek");
  if (peek) zeichnePost(peek, { raster: false });
});
const peek = $("#obPeek");
if (peek) zeichnePost(peek, { raster: false });
