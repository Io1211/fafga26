# HAUSPOST — Konzept

**KI-Buildathon @ FAFGA 2026 · Case Study 06 — „Sichtbar werden: Gäste und Mitarbeiter finden, ohne Agentur"**
Prototyp: https://claude.ai/artifact/X3eLCgn1FWohpg9Kj9Az7W

---

## Kurzbeschreibung (für die Jury-Vorauswahl, 13:30)

> Hauspost ist ein Social-Media-Assistent für kleine Betriebe. Der Betrieb wird **einmal** eingerichtet —
> Hausfarbe, Logo und die echten Sätze, die er über sich sagen darf. Danach: Foto rein, ein Klick auf
> *Für Gäste* oder *Für Mitarbeiter*, und es fällt ein fertiger Post im Hausstil heraus — Grafik mit
> eingebranntem Overlay, Caption, Hashtags und eine getimte Untertitel-Spur fürs Story-Video.
> Kein Baukasten-Look, weil nichts aus einem Katalog kommt. Und kein erfundener Satz, weil jeder Text
> auf einem hinterlegten Beleg steht.

---

## 1. Das Problem, präzise

Die Case Study beschreibt den Berggasthof: Website von 2016, 240 Follower, letztes Posting vom Kirchtag.
Die Wirtin fotografiert das neue Zimmer selbst — gegen das Licht, Handtuch im Bild. Agentur wäre 3.000 €.

Der übliche Schluss daraus wäre „sie braucht bessere Fotos" oder „sie braucht einen Textgenerator".
Beides ist falsch.

**Das Foto ist nicht das Problem. Es sind die 40 Minuten danach.**

Canva, Later, ChatGPT — die können alles. Aber sie **entscheiden nichts**. Bei jedem Post fängt die Wirtin
wieder bei null an: Vorlage wählen, Text tippen, Schrift setzen, Hashtags suchen, erklären wer sie ist.
Genau deshalb hört sie nach drei Posts auf. Nicht aus Faulheit — weil es jedes Mal gleich viel kostet.

Und: die Case Study nennt **zwei** Zielgruppen in einem Satz — *„Gäste und um Mitarbeiter — beide
entscheiden online, bevor sie anrufen."* Kein Tool am Markt behandelt das als eine Aufgabe.

---

## 2. Die Idee

Zwei Umkehrungen gegenüber allem, was es schon gibt:

### a) Gedächtnis statt Prompt
Der Betrieb wird **einmal** beschrieben, nicht bei jedem Post. Im Hausgedächtnis stehen:

| | |
|---|---|
| Identität | Name, Ort, Art des Betriebs |
| Optik | Hausfarbe, Logo |
| **Belege** | Die echten Sätze: *„Der Großvater hat das Haus 1934 gebaut."* · *„Das Fleisch kommt vom Nachbarhof, 400 Meter Luftlinie."* · *„Marlies steht seit 19 Jahren in derselben Küche."* |
| **Sperrliste** | Was nie behauptet werden darf: *Haubenküche, Bio-zertifiziert, 5 Sterne* |
| CTA | je einer für Gäste und für Bewerber |

Jeder Text wird **ausschließlich** daraus gebaut. Das ist gleichzeitig die Qualität *und* die Sicherheit:
Ein Betrieb, der einmal eingerichtet ist, wird mit jedem Post besser statt jedes Mal gleich generisch.
Und es kann nichts dazuerfunden werden — der häufigste und teuerste Fehler, wenn KI über einen echten
Betrieb schreibt.

### b) Ein Motiv, zwei Zielgruppen
Dasselbe Foto erzeugt auf Klick einen **Gäste-Post** oder einen **Mitarbeiter-Post**. Andere Hooks,
andere Sprache, andere Hashtags, anderer CTA — gleiches Material.

Das ist Case 06 wörtlich beantwortet und der Punkt, an dem sich Hauspost von jedem Post-Generator trennt.

---

## 3. Was der Prototyp heute kann

1. **Hausgedächtnis** anlegen und ändern — Belege, Sperrliste, Hausfarbe, Logo, CTAs. Bleibt im Browser gespeichert.
2. **Motive**: zwei Demo-Fotos, eigene per Drag & Drop. Nichts wird hochgeladen, alles bleibt am Gerät.
3. **Ziel + Format** wählen: Gäste / Mitarbeiter · Story 9:16 / Post 4:5.
4. **Textvorschlag** aus zwei Motoren:
   - **Haus-Muster** — deterministisch, ohne KI-Zugang, funktioniert immer. Die Muster ziehen ihre Slots
     aus den Belegen; findet ein Muster keinen passenden Beleg, fällt es aus, statt zu erfinden.
   - **Claude** — sieht das Foto wirklich an und schreibt darauf, im selben Rahmen (Belege + Sperrliste
     stehen im Prompt).
5. **Canvas-Rendering** live: Overlay im Hausstil, Schlüsselwort in der Hausfarbe.
6. **Untertitel-Spur**: Wortgruppen-Karten mit Timing, Schlüsselwort per Klick setzbar.
7. **Export**: PNG und Story-Video (webm, Ken-Burns + animierte Untertitel-Karten).
8. **Prüfliste** — kontrolliert die Ausgabe gegen die Regeln und zeigt, auf welchen Belegen der Text steht.

---

## 4. Das Handwerk im Bild (warum es nicht nach Baukasten aussieht)

Diese Regeln stammen aus realen Kundenprojekten, nicht aus einem Design-Template:

- **Fotos werden nie beschnitten.** Der Rand kommt als Unschärfe-Hintergrund aus dem Bild selbst.
  Bei einem Post, der ein Zimmer verkauft, ist Anschneiden der falsche Kompromiss.
- **Overlays sitzen im mittleren 4:5-Feld** — Instagram beschneidet das Profilraster genau darauf.
  Text am unteren 1920er-Rand wäre im Grid abgeschnitten. Auch die Scrim-Verläufe sind am Feld verankert,
  nicht am Vollbild, sonst ist der obere Verlauf auf Logo-Höhe schon ausgelaufen.
- **Grundlinie der Headline bei 0,72** der Bildhöhe, nicht am unteren Rand.
- **Untertitel:** eine Wortgruppe pro Karte, 0,8–1,2 s, max. 15 Zeichen, Großbuchstaben,
  **Kontur statt Box**, ein Schlüsselwort in der Hausfarbe, Pop beim Einblenden (80 % → 105 % → 100 %).
  Ganze Sätze, die vier Sekunden stehen bleiben, wirken tot — das ist der häufigste Fehler.
- **Kontur in zwei Durchgängen** gezeichnet: erst Kontur, dann Füllung darüber. Ein einzelner Durchgang
  frisst die halbe Strichstärke von innen weg und fette Schrift sieht plötzlich hohl aus.

---

## 5. Gegen die Jury-Kriterien

| Kriterium | Gewicht | Antwort |
|---|---|---|
| **Problem-Solution Fit** | 30 % | Nicht „noch ein Textgenerator". Der Engpass ist der Weg vom Foto zum fertigen Post — und dass zwei Zielgruppen aus demselben Material bedient werden müssen. Genau das löst es. |
| **Alltagstauglichkeit** | 30 % | Einrichtung 5 Minuten, einmal. Danach drei Klicks pro Post. Läuft im Browser, kein Konto, keine Installation, Fotos bleiben am Gerät. Funktioniert auch ohne KI-Zugang. |
| **Umsetzungspotenzial** | 20 % | Das Hausgedächtnis ist ein verkaufbares Produkt: Einrichtung durch einen Foto/Videografen, danach bedient der Betrieb es selbst. Nächste Schritte unten. |
| **Neuartigkeit & Impact** | 20 % | Gedächtnis statt Prompt, und ein Motiv → zwei Zielgruppen. Beides gibt es am Markt nicht. Die Sperrliste als ausgeführte Regel, nicht als Notiz. |
| **Demo & Klarheit** | Finale | In drei Minuten zeigbar: Foto rein → Gäste-Post → ein Klick → Mitarbeiter-Post → Video. |

---

## 6. Demo-Ablauf (3 Minuten, kein Q&A)

| Zeit | Was |
|---|---|
| 0:00–0:25 | Das Problem: Zimmer fotografiert, Geschichten da, 40 Minuten fehlen. 3.000 € für die Agentur sind nicht drin. |
| 0:25–0:55 | Hausgedächtnis zeigen — besonders **Belege** und **Sperrliste**. „Das ist die Einrichtung. Einmal." |
| 0:55–1:35 | Foto ziehen → fertiger Gäste-Post. Caption und Hashtags mitlesen. |
| 1:35–2:05 | **Derselbe Klick auf „Für Mitarbeiter"** — der Post dreht sich komplett. Das ist der Moment. |
| 2:05–2:35 | Story-Video bauen lassen, Untertitel-Karten laufen. |
| 2:35–3:00 | Prüfliste: „Sperrliste sauber, auf 2 Belegen gebaut." Schluss: *Das Haus erzählt sich selbst — es braucht nur einmal jemanden, der ihm zuhört.* |

**Notfall:** Der Textmotor „Haus-Muster" läuft ohne Netz und ohne KI. Wenn Claude auf der Bühne nicht
antwortet, merkt es niemand — auf „Anderes Muster" klicken und weitermachen.

---

## 7. Nächste Schritte (falls jemand fragt)

- **Motiv-Erkennung über den ganzen Kameraordner**: 300 Handyfotos rein, die App schlägt die 12 vor,
  die einen Post wert sind, und sortiert sie nach Gäste-/Mitarbeiter-Eignung.
- **Direkte Übergabe an Meta** (Instagram + Facebook) statt Download — der Post geht aus der App raus.
- **Wochenplan**: das Hausgedächtnis weiß, was schon gepostet wurde, und schlägt vor, was fehlt.
- **Einrichtung als Dienstleistung**: der Fotograf legt das Hausgedächtnis an und macht die Basisbilder,
  der Betrieb bedient es danach selbst. Retainer statt Einzelauftrag.

---

## 8. Herkunft

Der Ablauf ist kein Entwurf am Reißbrett. Er ist aus der laufenden Betreuung von
**Huter Haustechnik** (Matrei am Brenner) abgezogen — Basisstrategie als Betriebs-Gedächtnis,
Hook → Inhalt → CTA, Ankersätze für Kurzvarianten, die Untertitel- und Overlay-Regeln aus der
Reel-Produktion. Hauspost ist dieser Prozess als Werkzeug, das ein Betrieb selbst bedienen kann.

*Elias Lechner · @eliaslechnerphoto*
