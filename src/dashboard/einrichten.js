/**
 * MODUL 1 · Onboarding & Hausgedächtnis
 * =====================================
 * Der Einrichtungs-Assistent: sechs Schritte, die den Betrieb einmal
 * beschreiben — und dabei nebenbei erklären, warum das jeweilige Feld
 * für Social Media zählt. Danach die Schublade "Mein Haus" zum Ändern.
 *
 * Dieses Modul baut sein eigenes Markup. Wer hier arbeitet, fasst
 * index.html nicht an.
 *
 * Schreibt:  state.haus (über setzeHaus), state.ansicht
 * Liest:     nichts von anderen Modulen
 */

import { state, setzeHaus, setzeAnsicht, VORGABE_HAUS, sichern } from "../core/state.js";
import { $, $$, esc, toast } from "../core/dom.js";

const LETZTER = 6;
let schritt = 0;

const BELEG_VORSCHLAEGE = [
  "Das Haus gibt es seit …",
  "… kommt von einem Hof, den wir kennen.",
  "… arbeitet seit … Jahren bei uns.",
  "Wir haben … Zimmer / … Plätze.",
  "Im Winter / Sommer ist bei uns …",
  "Das kocht bei uns seit jeher …"
];

const ARTEN = ["Berggasthof", "Wirtshaus", "Hotel", "Restaurant", "Café", "Hütte", "Handwerksbetrieb"];

const artOptionen = () => ARTEN.map(a =>
  `<option${a === state.haus.art ? " selected" : ""}>${a}</option>`).join("");

/* ------------------------------------------------------------------ *
 *  Markup
 * ------------------------------------------------------------------ */

function markup() {
  return `
  <div class="introbar">
    <div class="brand">
      <span class="word">Hauspost</span>
      <span class="tag">Der Social-Media-Assistent fürs eigene Haus</span>
    </div>
    <div class="dots" id="obDots" aria-hidden="true"></div>
  </div>

  <section class="card" data-step="0">
    <div><span class="eyebrow">Schritt 1 von 6 · Worum es geht</span>
    <h2 style="margin-top:10px">Die meisten Betriebe scheitern nicht an der Idee. Sondern an den 40 Minuten danach.</h2></div>
    <p class="lede">Das Foto vom neuen Zimmer ist schnell gemacht. Danach beginnt die Arbeit: Vorlage suchen,
    Text tippen, Schrift setzen, Hashtags zusammensuchen, erklären wer man überhaupt ist. Jedes Mal von vorn.
    Genau deshalb hört man nach drei Posts wieder auf — nicht aus Faulheit, sondern weil es jedes Mal gleich
    viel kostet.</p>
    <div class="peek">
      <canvas id="obPeek" width="1080" height="1920" aria-label="Beispiel eines fertigen Posts"></canvas>
      <div class="txt">
        <p class="lede" style="font-size:14px"><strong>Hauspost dreht das um.</strong> Wir richten Ihren Betrieb
        jetzt <strong>einmal</strong> ein — das dauert etwa fünf Minuten. Danach kostet ein Post drei Klicks:
        Foto wählen, Zielgruppe wählen, fertig.</p>
        <p class="hint">Alles bleibt auf diesem Gerät. Es wird nichts hochgeladen und kein Konto gebraucht.</p>
      </div>
    </div>
    <div class="why">
      <div><span class="n">Einmal</span><h4>Das Hausgedächtnis</h4>
        <p>Farbe, Logo und die echten Sätze, die über Ihr Haus gesagt werden dürfen.</p></div>
      <div><span class="n">Je Post</span><h4>Foto und Zielgruppe</h4>
        <p>Für Gäste oder für Mitarbeiter — dasselbe Bild, zwei völlig verschiedene Posts.</p></div>
      <div><span class="n">Ergebnis</span><h4>Fertig zum Posten</h4>
        <p>Grafik im Hausstil, Text, Hashtags und ein Story-Video mit Untertiteln.</p></div>
    </div>
    <div class="nav">
      <button class="btn primary" data-go="1">Betrieb einrichten</button>
      <div class="spacer"></div>
      <button class="ghost" data-skip>Erst einmal ansehen</button>
    </div>
  </section>

  <section class="card" data-step="1" hidden>
    <div><span class="eyebrow">Schritt 2 von 6 · Der Betrieb</span>
    <h2 style="margin-top:10px">Wer sind Sie, und wo stehen Sie?</h2></div>
    <p class="teach"><b>Warum der Ort wichtig ist:</b> Wer in Tirol etwas sucht, sucht fast immer nach einem
    Ort — nicht nach einem Betriebsnamen. Der Ortsname gehört deshalb in jeden Post und in die Hashtags.</p>
    <div class="row">
      <label class="f grow" style="min-width:230px"><span>Name des Betriebs</span>
        <input type="text" id="obName" value="${esc(state.haus.name)}"></label>
      <label class="f grow" style="min-width:140px"><span>Ort</span>
        <input type="text" id="obOrt" value="${esc(state.haus.ort)}"></label>
      <label class="f grow" style="min-width:160px"><span>Art</span>
        <select id="obArt">${artOptionen()}</select></label>
    </div>
    <div class="nav"><button class="ghost" data-go="0">Zurück</button><div class="spacer"></div>
      <button class="btn primary" data-go="2">Weiter</button></div>
  </section>

  <section class="card" data-step="2" hidden>
    <div><span class="eyebrow">Schritt 3 von 6 · Die Optik</span>
    <h2 style="margin-top:10px">Eine Farbe reicht.</h2></div>
    <p class="teach"><b>Wiedererkennung entsteht durch Wiederholung, nicht durch Auswahl.</b> Deshalb gibt es
    hier keine Vorlagen-Galerie. Eine Hausfarbe, ein Logo — und jeder Post sieht danach automatisch nach
    Ihrem Haus aus statt nach Baukasten.</p>
    <div class="swatch">
      <input type="color" id="obFarbe" value="${esc(state.haus.farbe)}" aria-label="Hausfarbe">
      <input type="text" id="obFarbeHex" value="${esc(state.haus.farbe)}"
             style="width:110px;font-family:var(--mono);font-size:13px" aria-label="Hausfarbe als Hex-Wert">
      <button class="btn" id="obLogoBtn">Logo wählen</button>
      <input type="file" id="obLogoFile" accept="image/*" hidden>
      <span class="hint" id="obLogoName">Ohne Logo wird der Name als Wortmarke gesetzt.</span>
    </div>
    <p class="hint">Keine Firmenfarbe zur Hand? Nehmen Sie die kräftigste Farbe, die am Haus vorkommt —
    Fensterläden, Schild, Logo auf dem Auto.</p>
    <div class="nav"><button class="ghost" data-go="1">Zurück</button><div class="spacer"></div>
      <button class="btn primary" data-go="3">Weiter</button></div>
  </section>

  <section class="card" data-step="3" hidden>
    <div><span class="eyebrow">Schritt 4 von 6 · Die Belege</span>
    <h2 style="margin-top:10px">Was stimmt wirklich über Ihr Haus?</h2></div>
    <p class="teach"><b>Das ist der wichtigste Schritt.</b> Jeder Text, den dieser Assistent später schreibt,
    wird ausschließlich aus diesen Sätzen gebaut. Nichts wird dazuerfunden. Schreiben Sie keine Werbesätze,
    sondern Tatsachen — je konkreter, desto besser. „Gemütliche Atmosphäre" hilft niemandem.
    „Die Köchin steht seit 19 Jahren in derselben Küche" ist ein Post.</p>
    <div id="obBelege"></div>
    <div class="row tight"><button class="btn" id="obBelegPlus">+ Satz hinzufügen</button></div>
    <div><p class="hint" style="margin-bottom:7px">Zum Anklicken, wenn Ihnen die Form hilft:</p>
      <div class="vorschlaege" id="obVorschlaege"></div></div>
    <div class="nav"><button class="ghost" data-go="2">Zurück</button><div class="spacer"></div>
      <button class="btn primary" data-go="4">Weiter</button></div>
  </section>

  <section class="card" data-step="4" hidden>
    <div><span class="eyebrow">Schritt 5 von 6 · Die Sperrliste</span>
    <h2 style="margin-top:10px">Und was darf nie über Sie behauptet werden?</h2></div>
    <p class="teach"><b>Ein falsches Wort kostet mehr, als zehn gute Posts bringen.</b> „Bio-zertifiziert",
    „Haubenküche", „Fünf Sterne" — solche Begriffe rutschen automatisch erzeugten Texten leicht durch und
    sind im schlimmsten Fall rechtlich heikel. Was hier steht, kommt in keinem Post vor. Der Assistent prüft
    jede Ausgabe dagegen.</p>
    <div class="sperr" id="obSperr"></div>
    <div class="row tight">
      <input type="text" id="obSperrNeu" placeholder="z. B. Haubenküche" class="grow" style="max-width:280px">
      <button class="btn" id="obSperrPlus">Hinzufügen</button>
    </div>
    <div class="nav"><button class="ghost" data-go="3">Zurück</button><div class="spacer"></div>
      <button class="btn primary" data-go="5">Weiter</button></div>
  </section>

  <section class="card" data-step="5" hidden>
    <div><span class="eyebrow">Schritt 6 von 6 · Die zwei Zielgruppen</span>
    <h2 style="margin-top:10px">Sie suchen Gäste. Und Sie suchen Leute.</h2></div>
    <p class="teach"><b>Beide schauen auf dasselbe Profil</b> — und beide entscheiden online, bevor sie
    anrufen. Deshalb kann dieser Assistent aus jedem Foto zwei verschiedene Posts bauen. Was unterschiedlich
    sein muss, ist die Aufforderung am Schluss.</p>
    <div class="zus">
      <div><h4>Wenn der Post für Gäste ist</h4>
        <p class="hint">Was sollen sie tun? So konkret wie möglich — mit Telefonnummer oder Link.</p>
        <input type="text" id="obCtaGast" value="${esc(state.haus.ctaGast)}"></div>
      <div><h4>Wenn der Post für Mitarbeiter ist</h4>
        <p class="hint">Die niedrigste Hürde gewinnt. Ein Schnuppertag schlägt jedes Bewerbungsformular.</p>
        <input type="text" id="obCtaTeam" value="${esc(state.haus.ctaTeam)}"></div>
    </div>
    <div class="nav"><button class="ghost" data-go="4">Zurück</button><div class="spacer"></div>
      <button class="btn primary" data-go="6">Fertig</button></div>
  </section>

  <section class="card" data-step="6" hidden>
    <div><span class="eyebrow">Eingerichtet</span>
    <h2 style="margin-top:10px">Das ist Ihr Hausgedächtnis.</h2></div>
    <p class="lede">Ab jetzt weiß der Assistent, wer Sie sind. Sie müssen es nie wieder erklären —
    und können es jederzeit oben rechts über <strong>Mein Haus</strong> ändern.</p>
    <div class="summary" id="obSummary"></div>
    <div class="nav"><button class="ghost" data-go="3">Belege noch einmal ansehen</button>
      <div class="spacer"></div>
      <button class="btn primary" id="obFertig">Studio öffnen</button></div>
  </section>`;
}

/* ------------------------------------------------------------------ *
 *  Listen (in Assistent und Schublade identisch)
 * ------------------------------------------------------------------ */

export function belegeRendern(wrapSel, praefix) {
  const wrap = $(wrapSel);
  if (!wrap) return;
  wrap.innerHTML = "";
  state.haus.belege.forEach((b, i) => {
    const d = document.createElement("div");
    d.className = "beleg";
    const ta = document.createElement("textarea");
    ta.value = b; ta.rows = 2; ta.id = praefix + i;
    ta.setAttribute("aria-label", `Beleg ${i + 1}`);
    ta.oninput  = () => { state.haus.belege[i] = ta.value; };
    ta.onchange = () => { setzeHaus({}); zusammenfassung(); };
    const rm = document.createElement("button");
    rm.textContent = "×";
    rm.setAttribute("aria-label", `Beleg ${i + 1} entfernen`);
    rm.onclick = () => {
      state.haus.belege.splice(i, 1);
      alleListen();
      setzeHaus({});
      zusammenfassung();
    };
    d.append(ta, rm);
    wrap.append(d);
  });
}

export function sperrRendern(wrapSel) {
  const wrap = $(wrapSel);
  if (!wrap) return;
  wrap.innerHTML = "";
  state.haus.sperr.forEach((s, i) => {
    const t = document.createElement("span");
    t.className = "tag";
    t.append(document.createTextNode(s));
    const b = document.createElement("button");
    b.textContent = "×";
    b.setAttribute("aria-label", `${s} entfernen`);
    b.onclick = () => {
      state.haus.sperr.splice(i, 1);
      alleListen();
      setzeHaus({});
      zusammenfassung();
    };
    t.append(b);
    wrap.append(t);
  });
}

/** Beide Ansichten auf einmal — der Assistent und die Schublade teilen sich die Daten. */
export function alleListen() {
  belegeRendern("#obBelege", "obbel");
  belegeRendern("#hsBelege", "hsbel");
  sperrRendern("#obSperr");
  sperrRendern("#hsSperr");
}

/* ------------------------------------------------------------------ *
 *  Schritte
 * ------------------------------------------------------------------ */

function schrittZeigen(n) {
  schritt = Math.max(0, Math.min(LETZTER, n));
  $$("[data-step]").forEach(s => { s.hidden = Number(s.dataset.step) !== schritt; });
  $("#obDots").innerHTML = Array.from({ length: LETZTER + 1 }, (_, i) =>
    `<i class="${i === schritt ? "on" : (i < schritt ? "done" : "")}"></i>`).join("");
  if (schritt === LETZTER) zusammenfassung();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function zusammenfassung() {
  const el = $("#obSummary");
  if (!el) return;
  const h = state.haus;
  const n = h.belege.filter(b => b.trim()).length;
  const rows = [
    ["Betrieb", `${h.name}, ${h.ort}`],
    ["Art", h.art],
    ["Hausfarbe", h.farbe],
    ["Belege", `${n} ${n === 1 ? "Satz" : "Sätze"}`],
    ["Sperrliste", `${h.sperr.length} Begriffe`],
    ["Für Gäste", h.ctaGast || "—"],
    ["Für Mitarbeiter", h.ctaTeam || "—"]
  ];
  el.innerHTML = rows.map(([k, v]) =>
    `<div><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("");
}

/** Eingaben des Assistenten in den Zustand übernehmen. */
function uebernehmen() {
  const wert = (sel, ersatz) => {
    const el = $(sel);
    return el && el.value.trim() ? el.value.trim() : ersatz;
  };
  const belege = state.haus.belege.filter(b => b.trim());
  setzeHaus({
    name:    wert("#obName", VORGABE_HAUS.name),
    ort:     wert("#obOrt", VORGABE_HAUS.ort),
    art:     $("#obArt")?.value || state.haus.art,
    ctaGast: wert("#obCtaGast", VORGABE_HAUS.ctaGast),
    ctaTeam: wert("#obCtaTeam", VORGABE_HAUS.ctaTeam),
    belege:  belege.length ? belege : [...VORGABE_HAUS.belege]
  });
}

/** Hausfarbe überall synchron halten — Assistent, Schublade, CSS, Canvas. */
export function farbeSetzen(v, quelle) {
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
  const farbe = v.toLowerCase();
  setzeHaus({ farbe });
  ["#obFarbe", "#obFarbeHex", "#hsFarbe", "#hsFarbeHex"].forEach(s => {
    const el = $(s);
    if (el && el !== quelle) el.value = farbe;
  });
  document.documentElement.style.setProperty("--hausfarbe", farbe);
}

/* ------------------------------------------------------------------ *
 *  Aufbau
 * ------------------------------------------------------------------ */

export function aufbauen(wurzel, aufPeek) {
  wurzel.innerHTML = markup();

  $$("[data-go]", wurzel).forEach(b => b.onclick = () => {
    const ziel = Number(b.dataset.go);
    if (ziel > schritt) uebernehmen();
    schrittZeigen(ziel);
  });
  $("[data-skip]", wurzel).onclick = () => setzeAnsicht("studio");
  $("#obFertig", wurzel).onclick = () => { uebernehmen(); setzeAnsicht("studio"); };

  ["#obName", "#obOrt"].forEach(s => $(s, wurzel).oninput = () => { uebernehmen(); aufPeek?.(); });
  $("#obArt", wurzel).onchange = () => { uebernehmen(); aufPeek?.(); };
  $("#obCtaGast", wurzel).oninput = uebernehmen;
  $("#obCtaTeam", wurzel).oninput = uebernehmen;

  $("#obFarbe", wurzel).oninput    = e => { farbeSetzen(e.target.value, e.target); aufPeek?.(); };
  $("#obFarbeHex", wurzel).oninput = e => { farbeSetzen(e.target.value.trim(), e.target); aufPeek?.(); };

  $("#obLogoBtn", wurzel).onclick = () => $("#obLogoFile", wurzel).click();
  $("#obLogoFile", wurzel).onchange = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setzeHaus({ logo: URL.createObjectURL(f) });
    $("#obLogoName", wurzel).textContent = "Logo übernommen: " + f.name;
    aufPeek?.();
  };

  $("#obBelegPlus", wurzel).onclick = () => {
    state.haus.belege.push("");
    alleListen();
    $("#obbel" + (state.haus.belege.length - 1))?.focus();
  };

  const vor = $("#obVorschlaege", wurzel);
  BELEG_VORSCHLAEGE.forEach(v => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = v;
    b.onclick = () => {
      state.haus.belege.push(v);
      alleListen();
      const t = $("#obbel" + (state.haus.belege.length - 1));
      if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
      sichern();
    };
    vor.append(b);
  });

  $("#obSperrPlus", wurzel).onclick = () => {
    const el = $("#obSperrNeu", wurzel);
    const v = el.value.trim();
    if (!v) return;
    state.haus.sperr.push(v);
    el.value = "";
    alleListen();
    setzeHaus({});
  };
  $("#obSperrNeu", wurzel).onkeydown = e => {
    if (e.key === "Enter") { e.preventDefault(); $("#obSperrPlus", wurzel).click(); }
  };

  alleListen();
  schrittZeigen(0);
  document.documentElement.style.setProperty("--hausfarbe", state.haus.farbe);
}

/** Von außen (Schublade) aufrufbar: Einrichtung noch einmal durchgehen. */
export function neuStarten() {
  setzeAnsicht("onboarding");
  schrittZeigen(0);
}
