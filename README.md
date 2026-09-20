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
index.html              Schale. Nur Einhängepunkte — wird selten angefasst.
styles/base.css         Farben, Schrift, Bedienelemente. GEMEINSAM.
assets/                 Demo-Fotos
src/
  core/state.js         DER VERTRAG zwischen den Modulen. GEMEINSAM.
  core/dom.js           Kleine Helfer. GEMEINSAM.
  main.js               Hängt die Module ein. Wird selten angefasst.

  onboarding/           MODUL 1 — Onboarding & Hausgedächtnis
  editor/               MODUL 2 — Foto- und Video-Pipeline
  ai/                   MODUL 3 — KI-Dienst
  post/                 MODUL 4 — Text & Ausgabe
```

**Die Regel:** Jeder arbeitet nur in seinem Modulordner. Wer `core/state.js`, `styles/base.css`,
`index.html` oder `main.js` ändern muss, sagt es kurz im Team — das sind die einzigen Dateien,
in denen Konflikte entstehen können.

---

## Die vier Module

| Modul | Ordner | Aufgabe | Strategie |
|---|---|---|---|
| **1 · Onboarding** | `src/onboarding/` | Einrichtungs-Assistent in sechs Schritten, Hausgedächtnis, Schublade „Mein Haus" | Fundament |
| **2 · Editor** | `src/editor/` | Canvas-Renderer mit Overlays (`image.js`), Story-Video (`video.js`), Bühne und Export (`editor.js`) | Schritt 1 + 2 |
| **3 · KI-Dienst** | `src/ai/` | `frage({prompt, bild})` → JSON. Mistral per Token, Claude als Rückfallebene, Key-Handling | Schritt 3 |
| **4 · Text & Ausgabe** | `src/post/` | Haus-Muster, Captions, Hashtags, Untertitel-Karten, Prüfliste, der Prompt an die KI | Schritt 4 |

**Modul 3 und 4 blockieren sich nicht:** Modul 3 ist reiner Dienst, Modul 4 der Verbraucher.
Modul 4 arbeitet gegen die deterministischen Haus-Muster und funktioniert vollständig, auch
wenn in Modul 3 noch nichts fertig ist.

Details und Schnittstellen: [CONTRIBUTING.md](CONTRIBUTING.md)

---

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
- [ ] Posting-Vorschläge über den Einzelpost hinaus
- [ ] Ganzer Kameraordner auf einmal
- [ ] Übergabe direkt an Instagram
