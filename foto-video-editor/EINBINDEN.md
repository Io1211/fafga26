# Den Editor einbinden

Der Ordner `foto-video-editor/` ist **in sich geschlossen**. Er hängt an keiner Datei
außerhalb, bringt seinen eigenen Zustand mit und funktioniert auch ohne Backend.
Zum Ausprobieren: `foto-video-editor/foto-video-editor.html` öffnen (über einen Server,
ES-Module laufen nicht über `file://`).

## In die React-App einhängen

`frontend/src/FotoVideoEditor.tsx` ist die Brücke. Sie ist die einzige Stelle, an der React
vom Editor weiß. In `App.tsx` reicht der Austausch einer Zeile:

```tsx
import FotoVideoEditor from "./FotoVideoEditor";

// bisher:  {view === "studio" && <Studio />}
{view === "studio" && <FotoVideoEditor house={house} />}
```

Die linke Übersicht bleibt unverändert. `house` kommt schon aus `api.house()` in `App.tsx`
und wird durchgereicht — mehr braucht es nicht.

Kommt später ein Textvorschlag vom Backend dazu:

```tsx
const post = await api.post(datei, ziel, notiz);
<FotoVideoEditor house={house} copy={post.text} />
```

Das fertige Bild holt man über `aktuellesBild()` aus derselben Datei — dieselbe
Zeichenroutine wie die Vorschau, also kein Auseinanderlaufen.

### Was schon vorbereitet ist

- **Typdeklarationen** (`*.d.ts` neben den JS-Dateien), damit `tsc -b` im Build durchläuft
- **`vite.config.ts`**: `server.fs.allow` erlaubt dem Entwicklungsserver den Ordner außerhalb
  von `frontend/`; beim Bauen folgt Rollup dem relativen Pfad ohnehin
- **`.fve-raum`** in `styles.css` legt Vorschau und Bedienung nebeneinander
- Geprüft: `tsc -b` und `vite build` laufen durch, der Editor landet im Bündel
  (CSS 9,98 → 20,14 kB, JS 162 → 190 kB)

### Kapselung

Alles Editor-CSS hängt unter `.fve`, auch die Gestaltungsmerkmale. Ohne diese Klasse greift
kein einziger Stil. Das ist nötig, weil es `.panel`, `.studio`, `.chip`, `.brand`, `.drop`
und `.eyebrow` in beiden Projekten gibt — ohne Kapselung überschreiben sie sich gegenseitig.
`aufbauen()` setzt die Klasse selbst, im Markup muss nichts vorbereitet werden.

## Ohne Build

`foto-video-editor/foto-video-editor.html` ist die Werkbank: reines JavaScript, kein Bündel,
kein Server nötig außer einem, der Dateien ausliefert.

```bash
python3 serve.py
```

Dann <http://localhost:8000/foto-video-editor/foto-video-editor.html>. ES-Module laufen nicht
über `file://`, ein Doppelklick zeigt eine leere Seite.

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
