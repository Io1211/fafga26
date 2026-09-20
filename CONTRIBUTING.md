# Arbeiten im Team

Vier Leute, drei Module, **ein** Produkt.

| Modul | Ordner | Wer |
|---|---|---|
| **1 · Foto- und Video-Editor** | `foto-video-editor/` | Elias |
| **2 · Dashboard** — der Weg von vorne bis zum Posten | `src/dashboard/` | zwei Personen |
| **3 · KI-Assistent** | `src/ai/` | eine Person |

---

## Die wichtigste Entscheidung: eine Seite, nicht drei

**Eigene Ordner: ja. Eigene HTML-Seiten als Produkt: nein.**

Getrennte Produktseiten klingen konfliktfrei, kosten aber genau das, was am Ende fehlt:

- **Hochgeladene Fotos überleben keinen Seitenwechsel.** Ein Foto aus dem Dateidialog lebt als
  `blob:`-URL im Speicher der Seite. Wechselt man auf eine andere HTML-Seite, ist es weg. Wir
  müssten Bilder in IndexedDB zwischenlagern, nur damit die Navigation funktioniert — ein halber
  Tag Arbeit für nichts.
- **„Am Ende zusammenführen" ist nie eine halbe Stunde.** Drei getrennte Seiten haben drei
  Zustände, drei Navigationen und drei Kopfzeilen. Das Zusammenführen ist die riskanteste
  Stunde des Tages, und sie fällt genau dann an, wenn keine Zeit mehr ist.

Stattdessen: **eine `index.html`, drei Modulordner.** Jedes Modul baut sein eigenes Markup und
bringt seine eigene CSS-Datei mit — deshalb muss niemand `index.html` anfassen, um etwas
anzuzeigen. Genau dort entstehen sonst die Konflikte.

## Trotzdem allein arbeiten: die Werkbänke

Damit niemand darauf warten muss, dass ein anderes Modul fertig ist, hat jedes Modul eine
eigene Entwicklungsseite unter `dev/`. Die lädt **nur** dieses Modul, mit erfundenen Daten.

| Seite | Lädt | Für |
|---|---|---|
| `foto-video-editor/foto-video-editor.html` | nur `foto-video-editor/` | Renderer, Video und Interface, mit einstellbarem Beispiel-Post |
| `dev/ki.html` | nur `src/ai/` | Anbindung, Prompt, Antwortauswertung |

Das ist die Antwort auf „eigene HTML-Seiten": **ja zum Entwickeln, nein als Produkt.**
Legt gerne weitere an — `dev/` gehört niemandem und kann nicht kaputtgehen.

---

## Lokal starten

ES-Module laufen **nicht** über `file://`. Doppelklick auf `index.html` zeigt eine leere Seite.

```bash
python3 -m http.server 8000
```

Produkt: <http://localhost:8000> · Werkbänke: <http://localhost:8000/dev/editor.html>

---

## Wem gehört was

```
index.html                  Schale. Nur Einhängepunkte.          GEMEINSAM
styles/base.css             Farben, Schrift, Bedienelemente.     GEMEINSAM
src/core/state.js           DER VERTRAG.                         GEMEINSAM
src/core/dom.js             Kleine Helfer.                       GEMEINSAM
src/main.js                 Hängt die Module ein.                GEMEINSAM

foto-video-editor/          MODUL 1 — Elias (eigener Ordner, oberste Ebene)
  foto-video-editor.html    Werkbank: das Interface wird hier ausgearbeitet
  image.js                  Canvas-Renderer, zeichnePost()
  video.js                  Story-Video, baueVideo()
  editor.js                 Bühne, Motivauswahl, Export
  editor.css

src/dashboard/              MODUL 2 — zwei Personen
  einrichten.js             Einrichtungs-Assistent (6 Schritte), Hausgedächtnis
  studio.js                 Studio-Spalte: Zielgruppe, Vorschlag, Karten
  pruefen.js                Prüfliste — das Tor vor dem Posten
  dashboard.css, studio.css

src/ai/                     MODUL 3 — eine Person
  client.js                 frage({prompt, bild}) → JSON. Mistral, Key-Handling
  muster.js                 Haus-Muster: der Textmotor ohne KI
  text.js                   Captions, Hashtags, Untertitel-Karten, Prompt
```

**Die fünf gemeinsamen Dateien sind die einzigen, in denen Konflikte entstehen können.**
Wer dort etwas ändern muss, sagt es kurz — sonst gilt: nur im eigenen Ordner.

### Wie sich die zwei Dashboard-Leute aufteilen

Nach **Datei**, nicht nach Zeile. Vorschlag:

- **Person A:** `einrichten.js` — der Assistent, das Hausgedächtnis, die Schublade „Mein Haus"
- **Person B:** `studio.js` + `pruefen.js` — Zielgruppe, Vorschlag, Untertitel-Karten,
  Prüfliste und der Schritt „Posten"

Wächst das, wird pro Bildschirm eine Datei daraus (`schritte/01-…js`) — dann hat jeder Schritt
genau einen Besitzer.

---

## Der Vertrag: `src/core/state.js`

Alles, was zwischen Modulen fließt, steht dort. Gelesen wird direkt, geschrieben **nur** über
die `setze…`-Funktionen — sonst erfährt kein anderes Modul davon.

```js
import { state, setzePost, on } from "../core/state.js";

state.haus.ort            // lesen
setzePost({ ... });       // schreiben → alle Horcher werden benachrichtigt
on("haus", () => { ... }) // auf Änderungen anderer Module reagieren
```

Themen für `on()`: `"haus"` · `"post"` · `"motiv"` · `"ki"` · `"ansicht"`

### Das `post`-Objekt — die wichtigste Schnittstelle

Modul 3 erzeugt es, Modul 2 gibt es frei, Modul 1 rendert genau das:

```js
{
  kicker:  "Navis · Berggasthof",        // kleine Zeile darüber
  head:    ["SEIT 1934", "AM SELBEN"],   // Overlay-Zeilen, je ≤ 15 Zeichen
  key:     "SEIT 1934",                  // welche Zeile farbig wird
  caption: "Hook\n\nInhalt\n\nCTA",
  tags:    "#navis #tirol",
  quellen: ["Der Großvater hat …"],      // verwendete Belege, für die Prüfliste
  cards:   [{ text: "SEIT 1934", dur: 0.9, key: true }]   // Untertitel fürs Video
}
```

### Das `haus`-Objekt

Modul 2 schreibt es, alle lesen:

```js
{ name, ort, art, farbe, logo, belege[], sperr[], ctaGast, ctaTeam }
```

### Was die Module voneinander aufrufen dürfen

```js
// Modul 2 und 3 dürfen beim Editor (Modul 1):
import { zeichnePost, alsPng } from "../../foto-video-editor/image.js";
import { baueVideo }           from "../../foto-video-editor/video.js";

// Modul 2 darf beim KI-Assistenten (Modul 3):
import { frage, FEHLERTEXT }   from "../ai/client.js";
import { postAusMuster, postAusKi, promptBauen } from "../ai/text.js";
```

**Modul 1 und 3 importieren nichts aus `dashboard/`.** Wer etwas nach oben melden will, benutzt
`melden("…")` aus `state.js`. So bleibt die Richtung der Abhängigkeiten eindeutig.

**Modul 2 blockiert nicht auf Modul 3:** `postAusMuster()` erzeugt auch ohne KI einen
vollständigen Vorschlag aus den Belegen.

---

## Git

```bash
git checkout -b editor/uebergaenge        # ein Branch je Feature
git pull --rebase origin main             # vor dem Push
git push -u origin editor/uebergaenge     # dann Pull Request
```

Branch-Namen: `editor/…` · `dashboard/…` · `ki/…`

## Der Platzhalter für den Editor

`index.html` enthält `<section class="stage" id="editor-slot">` mit einem Ersatzkasten.
Das Dashboard rendert dort **nichts** hinein. `src/main.js` ruft
`editor.aufbauen(el, bedienungsElement)` auf, und der Editor ersetzt den Inhalt selbst.

So kann Elias das Interface in `foto-video-editor/foto-video-editor.html` fertig ausarbeiten,
während das Dashboard danebenher gebaut wird. Weil beide Seiten dieselben Moduldateien
importieren, ist das Zusammenführen am Ende kein Portieren, sondern nur das Einhängen.

Briefing zum Weitergeben an die KI-Assistenten der Dashboard-Leute:
[BRIEFING-DASHBOARD.md](BRIEFING-DASHBOARD.md)

## Vor jedem Commit

- Läuft das Produkt noch? `python3 -m http.server 8000`, einmal durchklicken.
- Konsole ohne Fehler?
- Umlaute richtig? Alles UTF-8, `index.html` trägt `<meta charset="utf-8">`.
- **Kein API-Key im Code.** Niemals, auch nicht kurz zum Testen. Das Repo ist öffentlich.
