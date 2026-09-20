# Briefing für das Dashboard-Team

> Diesen Text komplett eurem KI-Assistenten geben, bevor ihr anfangt.

---

Wir bauen zu viert am Repo `Io1211/fafga26` ("Hauspost", KI-Buildathon FAFGA 2026,
Case Study 06). Eine statische Seite, reines HTML/CSS/JS mit ES-Modulen, kein
Framework, kein Build-Schritt.

**Du hilfst beim MODUL DASHBOARD.** Zwei weitere Module gehören anderen Leuten und
werden von uns NICHT angefasst.

## Aufteilung

| Modul | Ordner | Wer |
|---|---|---|
| Foto- und Video-Editor | `foto-video-editor/` | Elias — **nicht anfassen** |
| KI-Assistent | `src/ai/` | ein Teammitglied — **nicht anfassen** |
| **Dashboard** | `src/dashboard/` | **wir** |

Gemeinsame Dateien, nur nach Absprache im Team ändern:
`index.html` · `src/main.js` · `src/core/state.js` · `src/core/dom.js` · `styles/base.css`

## Unsere Aufgabe

Das Dashboard ist der Weg des Nutzers von vorne bis hinten: Einrichtung des Betriebs,
Material wählen, Textvorschlag ansehen, prüfen, posten. Dateien:

- `src/dashboard/einrichten.js` — Einrichtungs-Assistent in sechs Schritten, Hausgedächtnis,
  Schublade "Mein Haus"
- `src/dashboard/studio.js` — Zielgruppe, Vorschlag, Untertitel-Karten
- `src/dashboard/pruefen.js` — Prüfliste, das Tor vor dem Posten
- `src/dashboard/dashboard.css`, `src/dashboard/studio.css`

## Der Editor ist ein Platzhalter

In `index.html` steht `<section class="stage" id="editor-slot">` mit einem Ersatzkasten darin.
**Wir rendern dort nichts hinein und ändern den Kasten nicht.** `src/main.js` ruft

```js
editor.aufbauen(document.querySelector("#editor-slot"), bedienungsElement);
```

auf, und der Editor ersetzt den Inhalt selbst. Der zweite Parameter ist ein Element aus
unserem Studio-Markup — dort hängt der Editor seine eigene Bedienung (Format, Motivauswahl)
ein. Wir stellen das Element bereit und lassen es sonst leer.

## Der Vertrag: `src/core/state.js`

Alles, was zwischen Modulen fließt, steht dort. Gelesen wird direkt, geschrieben **nur** über
die `setze…`-Funktionen — sonst erfahren die anderen Module nichts davon.

```js
import { state, setzeHaus, setzePost, setzeOption, on } from "../core/state.js";

state.haus.ort                  // lesen
setzeHaus({ ort: "Navis" });    // schreiben
on("post", () => { ... });      // auf Änderungen reagieren
```

Themen für `on()`: `"haus"` · `"post"` · `"motiv"` · `"ki"` · `"ansicht"`

**`state.haus`** — wir schreiben es, alle lesen es:
```js
{ name, ort, art, farbe, logo, belege[], sperr[], ctaGast, ctaTeam }
```
`belege` sind die einzigen Fakten, die über den Betrieb behauptet werden dürfen.
`sperr` ist die Sperrliste: Begriffe, die in keinem Text vorkommen dürfen.

**`state.post`** — der Textvorschlag. Der Editor rendert genau das:
```js
{
  kicker:  "Navis · Berggasthof",
  head:    ["SEIT 1934", "AM SELBEN", "FLECK."],  // je höchstens 15 Zeichen
  key:     "SEIT 1934",                           // diese Zeile wird farbig
  caption: "Hook\n\nInhalt\n\nAufforderung",
  tags:    "#navis #tirol",
  quellen: ["Der Großvater hat das Haus 1934 gebaut."],
  cards:   [{ text: "SEIT 1934", dur: 0.9, key: true }]
}
```

## Den Textvorschlag holen

```js
import { postAusMuster, postAusKi, promptBauen } from "../ai/text.js";
import { frage, FEHLERTEXT } from "../ai/client.js";

setzePost(postAusMuster(0).post);          // ohne KI — funktioniert immer
const d = await frage({ prompt: promptBauen(), bild });   // mit KI
setzePost(postAusKi(d));
```

`postAusMuster()` baut den Vorschlag deterministisch aus den Belegen. **Das Dashboard darf
nie auf die KI warten müssen** — ohne KI muss alles funktionieren.

## Regeln

- Nur in `src/dashboard/` arbeiten. Eigenes Markup per JavaScript bauen, eigene CSS-Datei
  benutzen — dann muss `index.html` nicht angefasst werden.
- Deutsch in Oberfläche, Code-Kommentaren und Commits. Österreichisches Deutsch im
  Nutzertext, direkt und ohne Marketingsprache.
- Alle Dateien UTF-8. Umlaute prüfen.
- **Kein API-Key im Code.** Das Repo ist öffentlich.
- Starten: `python3 -m http.server 8000`, dann <http://localhost:8000>.
  ES-Module laufen nicht über `file://` — Doppelklick auf `index.html` zeigt eine leere Seite.
- Eigener Branch je Feature: `dashboard/<was>`, dann Pull Request.

## Zum Schritt "Posten"

Direkt auf Instagram posten geht heute **nicht**: die Graph API braucht Server,
Business-Konto und App-Review von Meta. Nicht versuchen.

Realistisch und für die Demo besser: `navigator.share()` mit der Bilddatei — das öffnet am
Handy das Teilen-Menü inklusive Instagram. Dazu Caption und Hashtags in die Zwischenablage.
Am Rechner als Rückfall: Datei sichern und Text kopieren.

## Wenn etwas fehlt

Lieber im Team kurz fragen als eine gemeinsame Datei ändern. Konflikte in
`state.js` oder `index.html` kosten uns heute mehr Zeit als jedes Feature.
