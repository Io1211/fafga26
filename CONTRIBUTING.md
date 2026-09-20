# Arbeiten im Team

Vier Leute, vier Module, ein Produkt. Damit das ohne Merge-Konflikte geht:

## 1. Nur im eigenen Ordner arbeiten

| Wer | Ordner | Darf dort alles ändern |
|---|---|---|
| Modul 1 | `src/onboarding/` | ✔ |
| Modul 2 | `src/editor/` | ✔ |
| Modul 3 | `src/ai/` | ✔ |
| Modul 4 | `src/post/` | ✔ |

**Gemeinsame Dateien** — vor einer Änderung kurz Bescheid sagen:
`src/core/state.js` · `src/core/dom.js` · `src/main.js` · `index.html` · `styles/base.css`

Jedes Modul baut sein eigenes Markup und bringt seine eigene CSS-Datei mit. Deshalb muss
niemand `index.html` anfassen, um etwas anzuzeigen.

## 2. Der Vertrag: `src/core/state.js`

Alles, was zwischen Modulen fließt, steht dort. Gelesen wird direkt, geschrieben **nur** über
die `setze…`-Funktionen — sonst erfährt kein anderes Modul davon.

```js
import { state, setzePost, on } from "../core/state.js";

state.haus.ort            // lesen
setzePost({ ... });       // schreiben → alle Horcher werden benachrichtigt
on("haus", () => { ... }) // auf Änderungen anderer Module reagieren
```

Themen für `on()`: `"haus"`, `"post"`, `"motiv"`, `"ki"`, `"ansicht"`.

### Das `post`-Objekt — die wichtigste Schnittstelle

Modul 4 schreibt es, Modul 2 rendert genau das:

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

Modul 1 schreibt es, alle lesen:

```js
{ name, ort, art, farbe, logo, belege[], sperr[], ctaGast, ctaTeam }
```

## 3. Git

```bash
git checkout -b modul2/video-uebergaenge    # eigener Branch je Feature
# arbeiten, committen
git push -u origin modul2/video-uebergaenge  # dann Pull Request
```

Branch-Namen: `modul<nr>/<was>`. Vor dem Push einmal `git pull --rebase origin main`.

## 4. Vor jedem Commit

- Läuft die Seite noch? `python3 -m http.server 8000` und durchklicken.
- Konsole ohne Fehler?
- Umlaute richtig? Alle Dateien sind UTF-8, `index.html` trägt `<meta charset="utf-8">`.
- **Kein API-Key im Code.** Niemals, auch nicht kurz zum Testen.

## 5. Nächste Schritte je Modul

**Modul 1 — Onboarding**
Mehrere Betriebe verwalten · Hausgedächtnis exportieren und importieren ·
Belege aus einer bestehenden Website vorschlagen lassen

**Modul 2 — Editor**
Mehrere Layout-Varianten je Format · Übergänge zwischen Untertitel-Karten ·
Mehrere Fotos in einem Video · MP4 statt webm

**Modul 3 — KI-Dienst**
Mistral produktiv anbinden (CORS prüfen, ggf. kleiner Proxy) · Tokenverbrauch anzeigen ·
Modellwahl je Aufgabe (Pixtral fürs Bild, mistral-large für Text)

**Modul 4 — Text & Ausgabe**
Wochenplan: was wurde schon gepostet, was fehlt · mehrere Vorschläge nebeneinander ·
Karussell-Posts · Übergabe an die Meta-API
