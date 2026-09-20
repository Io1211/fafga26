# Hauspost

**Social-Media-Assistent für kleine Betriebe.** Der Betrieb wird *einmal* eingerichtet —
Hausfarbe, Logo und die echten Sätze, die er über sich sagen darf. Danach: Foto rein, ein Klick
auf *Für Gäste* oder *Für Mitarbeiter*, und es fällt ein fertiger Post im Hausstil heraus —
Grafik mit eingebranntem Overlay, Caption, Hashtags und eine getimte Untertitel-Spur fürs
Story-Video.

Kein Baukasten-Look, weil nichts aus einem Katalog kommt. Und kein erfundener Satz, weil jeder
Text auf einem hinterlegten Beleg steht.

> KI-Buildathon @ FAFGA 2026 · Case Study 06 — „Sichtbar werden: Gäste und Mitarbeiter finden, ohne Agentur"
> Konzept und Pitch-Ablauf: [KONZEPT.md](KONZEPT.md)

---

## Lokal starten

ES-Module brauchen einen echten Server — ein Doppelklick auf `index.html` funktioniert **nicht**
(`file://` blockiert Modul-Importe).

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

---

## Aufbau

```
index.html              Produkt. Nur Einhängepunkte — wird selten angefasst.
dev/                    Werkbänke: je Modul eine Seite zum Alleine-Arbeiten
styles/base.css         Farben, Schrift, Bedienelemente. GEMEINSAM.
assets/                 Demo-Fotos
src/
  core/state.js         DER VERTRAG zwischen den Modulen. GEMEINSAM.
  core/dom.js           Kleine Helfer. GEMEINSAM.
  main.js               Hängt die Module ein. GEMEINSAM.

  editor/               MODUL 1 — Foto- und Video-Editor
  dashboard/            MODUL 2 — Der Weg von vorne bis zum Posten
  ai/                   MODUL 3 — KI-Assistent
```

**Eine Seite, drei Modulordner.** Jedes Modul baut sein eigenes Markup und bringt seine eigene
CSS-Datei mit, deshalb muss niemand `index.html` anfassen. Zum isolierten Arbeiten gibt es je
Modul eine Werkbank unter `dev/`, die nur dieses Modul lädt.

## Die drei Module

| Modul | Ordner | Aufgabe | Strategie |
|---|---|---|---|
| **1 · Editor** | `src/editor/` | Canvas-Renderer mit Overlays (`image.js`), Story-Video (`video.js`), Bühne und Export (`editor.js`) | Schritt 1 + 2 |
| **2 · Dashboard** | `src/dashboard/` | Einrichtungs-Assistent, Hausgedächtnis, Studio, Prüfliste, Posten | Der Rahmen |
| **3 · KI-Assistent** | `src/ai/` | `frage({prompt, bild})` → JSON. Mistral per Token, Haus-Muster als Rückfallebene, Captions und Hashtags | Schritt 3 + 4 |

**Modul 2 blockiert nicht auf Modul 3:** `postAusMuster()` erzeugt auch ohne KI einen
vollständigen Vorschlag aus den Belegen des Hauses.

Schnittstellen, Dateibesitz und Git-Regeln: [CONTRIBUTING.md](CONTRIBUTING.md)

## Sicherheitshinweis zum API-Key

Der Mistral-Key darf **niemals** in dieses Repo. Sobald es für GitHub Pages öffentlich ist,
wird es nach Schlüsseln durchsucht — Mistral sperrt ihn binnen Minuten, und laut Handout hängt
eine Zahlungsmethode daran. Der Key kommt aus dem Feld hinter dem **Key**-Knopf und liegt nur
im `localStorage` des jeweiligen Browsers.

Im Browser blockiert außerdem oft CORS den direkten Zugriff auf `api.mistral.ai`. Falls das
passiert, braucht es einen kleinen Proxy — bis dahin greifen die Haus-Muster.

---

## Stand

- [x] Foto-Pipeline mit Overlays
- [x] Video-Pipeline mit Overlays (webm, Ken-Burns, animierte Untertitel-Karten)
- [x] Onboarding-Assistent
- [x] Haus-Muster als Textmotor ohne KI
- [ ] Mistral-Anbindung produktiv (Gerüst steht in `src/ai/client.js`)
- [ ] Dashboard bis zum Posten durchziehen
- [ ] Posting-Vorschläge über den Einzelpost hinaus
- [ ] Ganzer Kameraordner auf einmal
- [ ] Übergabe direkt an Instagram
