# Den Editor einbinden

Der Ordner `foto-video-editor/` ist **in sich geschlossen**. Er hängt an keiner Datei
außerhalb, bringt seinen eigenen Zustand mit und funktioniert auch ohne Backend.
Zum Ausprobieren: `foto-video-editor/foto-video-editor.html` öffnen (über einen Server,
ES-Module laufen nicht über `file://`).

## In `app/studio.html` einhängen

```html
<link rel="stylesheet" href="../foto-video-editor/basis.css">
<link rel="stylesheet" href="../foto-video-editor/editor.css">

<section class="stage" id="editor-slot"></section>
<section id="editor-bedienung"></section>

<script type="module">
  import * as editor from "../foto-video-editor/editor.js";
  import { hausLaden, uebernehmeCopy, laden } from "../foto-video-editor/zustand.js";

  laden();                       // gesicherte Vorlage und Stil
  await hausLaden();             // holt GET /api/house, still wenn kein Server da ist

  editor.aufbauen(
    document.querySelector("#editor-slot"),
    document.querySelector("#editor-bedienung")
  );

  // Wenn ein Post vom Backend kommt (POST /api/posts → PostOut.text):
  uebernehmeCopy(antwort.text);
</script>
```

`aufbauen()` ersetzt den Inhalt beider Elemente selbst. Das erste bekommt die Vorschau
samt Sicherungsknöpfen, das zweite die Bedienung (Vorlage, Format, Motiv, Feineinstellungen).

## Der Vertrag

`zustand.js` spricht die Feldnamen aus `backend/app/schemas.py` und rechnet um:

| Backend | im Editor |
|---|---|
| `sperrliste` | `state.haus.sperrliste` |
| `cta_gast` / `cta_team` | `ctaGast` / `ctaTeam` |
| `hashtags: List[str]` | `post.tags` als eine Zeile |
| `focal_x` / `focal_y` | `state.focalX` / `focalY` |

- `uebernehmeHaus(h)` — ein `House` aus `GET /api/house` übernehmen
- `alsHouse()` — zurück in die Form für `PUT /api/house`
- `uebernehmeCopy(c)` — ein `Copy` aus `PostOut.text` übernehmen
- `hausLaden(basis?)` — holt das Haus, liefert `false` statt zu werfen, wenn kein Server da ist

Die Formate sind dieselben wie in `backend/app/render.py`: `story` 1080×1920,
`post` 1080×1350, `square` 1080×1080.

## Verhältnis zu `backend/app/render.py`

Beide rendern nach denselben Regeln. Der Unterschied ist, wofür:

| | `render.py` (Server) | dieser Editor (Browser) |
|---|---|---|
| Vorschau | ein Request je Änderung | sofort, während man schiebt |
| Braucht Server | ja | nein |
| Video | bräuchte ffmpeg | läuft über MediaRecorder |
| Stapelverarbeitung | ja | nein |

Sie schließen sich nicht aus: `render.py` kann weiter die Bilder erzeugen, die über die
API entstehen, und der Editor ist das, was die Wirtin bedient. **Wichtig ist nur, dass die
Regeln gleich bleiben** — Grundlinie 0,72, Overlay im 4:5-Feld, Kontur in zwei Durchgängen,
Foto nie beschnitten. Ändert sich eine davon, muss sie an beiden Stellen geändert werden.

## Was der Editor kann

Vorlagen (6 eingebaute, eigene sicherbar) · drei Schriftcharaktere · Textrand als Kontur,
Farbfläche, Schatten oder ohne · Logo in sechs Positionen mit Feinversatz · Textblock in
drei Höhen mit Ausrichtung, Zeilenabstand und Feinversatz · drei Bildpassungen · Farben
aus dem Logo · JPEG-Export · Story-Video mit Untertitel-Karten.

Die Kriterien dahinter stehen in [KRITERIEN.md](KRITERIEN.md).
