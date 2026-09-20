# Postify — Social-Media-Assistent für Hotellerie und Gastronomie

KI-Buildathon @ FAFGA 2026 · Case Study 06 — „Sichtbar werden: Gäste und
Mitarbeiter finden, ohne Agentur"

Foto rein, fertiger Post raus: gebrandetes Overlay in drei Formaten, Caption,
Hashtags — und derselbe Klick erzeugt aus demselben Foto einen Mitarbeiter-Post.
Jeder Satz steht auf einem hinterlegten Beleg. Nichts wird dazuerfunden.

## Starten

Zwei Terminals.

**Backend** (Python 3.10+)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Unter macOS/Linux: `./backend/run.sh`

**Frontend** (Node 18+)

```bash
cd frontend
npm install
npm run dev
```

Dann http://localhost:5173 öffnen. Vite leitet `/api` und `/static` auf Port 8000
weiter — deshalb gibt es kein CORS-Problem.

## Mistral anbinden

`backend/.env` anlegen:

```
MISTRAL_API_KEY=...
MISTRAL_MODEL_VISION=mistral-medium-latest
MISTRAL_MODEL_TEXT=ministral-8b-latest
```

Der Schlüssel darf auch als `MISTRAL_API` in der `.env` im Projektstamm stehen.
Hat der Schlüssel für ein Modell kein Kontingent (Mistral antwortet dann mit
429 und `x-ratelimit-limit-req-minute: 0`, etwa für `mistral-medium` im
Gratis-Tarif), weicht das Backend von selbst aus: Vision auf `pixtral-12b-latest`,
Text auf `ministral-8b-latest` bzw. `open-mistral-nemo`. `/api/health` zeigt
unter `modelle`, was gerade tatsächlich antwortet. Fehlermeldungen von Mistral
landen mit Statuscode in den `warnungen` der Antwort.

Ohne Schlüssel läuft alles weiter — dann schreiben die **Haus-Muster**:
deterministische Textbausteine, die ihre Sätze ausschließlich aus den Belegen
ziehen. Das ist kein Notnagel, sondern der Notfallplan für die Bühne. Die
Oberfläche zeigt oben rechts, welcher Motor gerade arbeitet.

Jede erfolgreiche Antwort wird unter `backend/data/cache/` abgelegt. Was einmal
funktioniert hat, funktioniert beim Vortrag wieder, auch ohne Netz.

## Wetter, Feiertage, Events anbinden

`backend/.env` um folgende Zeilen ergänzen:

```
TICKETMASTER_API_KEY=...
LAND=AT
```

Wetter (Open-Meteo) und Feiertage (Nager.Date) brauchen keinen Schlüssel und
laufen sofort. Events in der Nähe brauchen einen kostenlosen Ticketmaster-Key
von [developer.ticketmaster.com](https://developer.ticketmaster.com/) — ohne
Key liefert `/api/signale` einfach eine leere Event-Liste, der Rest
funktioniert weiter. Alle drei Quellen sind pro Tag und Ort gecacht und werden
in die Post-Ideen eingewoben (`POST /api/ideas`): passt das Wetter, ein
Feiertag oder ein Event zum Betrieb, taucht das als eigener Vorschlag samt
Quellenangabe auf.

## Was drin ist

| Bereich | Stand |
|---|---|
| Foto-Upload, Overlay-Rendering in 9:16, 4:5, 1:1 | echt, deterministisch (Pillow) |
| Caption, Hashtags, Overlay-Text | Mistral Vision, Rückfall Haus-Muster |
| Gäste-Post ↔ Mitarbeiter-Post aus demselben Foto | echt |
| Post-Ideen mit Drehplan | Mistral Text, Rückfall Haus-Muster |
| Wetter, Feiertage, Events in der Nähe | echt (Open-Meteo, Nager.Date, Ticketmaster) |
| Hausgedächtnis (Belege, Sperrliste, Farbe, CTAs) | `backend/data/house.json` |
| Prüfliste gegen die Sperrliste | echt, serverseitig |
| Kennzahlen, Kanäle, Jahreskalender | **Stub für die Demo**, nicht angebunden |

Die Kennzahlen sind bewusst Beispieldaten und im UI als solche gekennzeichnet.
Produktiv kämen sie aus den Kanal-APIs.

## Wie das Bild entsteht

Regeln aus der Praxis, nicht aus einem Template-Katalog:

- Fotos werden **nie beschnitten**. Der Rand entsteht als Unschärfe aus dem Bild
  selbst, mit weichem Schatten an der Kante.
- Overlays sitzen im mittleren **4:5-Feld**, weil Instagram das Profilraster
  genau darauf beschneidet. Auch die Verläufe sind am Feld verankert, nicht am
  Vollbild.
- Grundlinie der Headline bei **0,72** der Feldhöhe.
- Kontur in zwei Durchgängen, sonst sieht fette Schrift hohl aus.
- Overlay-Zeilen maximal **15 Zeichen**. Das prüft der Server nach; zu lange
  Zeilen werden gekürzt und im UI als Warnung angezeigt.

Das Modell liefert **nur Text und den Bildschwerpunkt**, nie Koordinaten. Fällt
die KI aus, ist die Headline schlechter — das Bild bleibt sauber gesetzt.

## API

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/health` | läuft das Backend, ist ein Schlüssel hinterlegt |
| GET/PUT | `/api/house` | Hausgedächtnis lesen und speichern |
| POST | `/api/house/logo` | Logo hochladen |
| POST | `/api/posts` | Foto + Ziel + Notiz → Copy und drei Renders |
| POST | `/api/posts/{id}/variante` | dasselbe Foto, andere Zielgruppe |
| POST | `/api/ideas` | Post-Ideen mit Drehplan |
| GET | `/api/kennzahlen` | Stub-Kennzahlen für die Demo |
| GET | `/api/signale` | Wetter, Feiertage, Events in der Nähe |

## Struktur

```
backend/app/
  main.py      Endpunkte
  schemas.py   Pydantic — treibt API und LLM-Schema zugleich
  llm.py       Mistral + Haus-Muster + Cache
  render.py    Overlay-Rendering, ohne KI
  house.py     Hausgedächtnis
frontend/src/
  App.tsx      Shell, Sidebar, Ansichtswechsel
  Studio.tsx   Upload → Post
  Ideen.tsx    Ideen mit Drehplan
  Uebersicht.tsx  Cockpit (Kennzahlen als Stub)
```
