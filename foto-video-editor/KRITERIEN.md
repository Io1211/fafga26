# Kriterien für den Editor

Woran sich der Foto- und Video-Editor messen lassen muss. Nicht „welche Knöpfe gibt es",
sondern: **kann ein Betrieb damit einen Post machen, den man ohne Zögern veröffentlicht?**

Geprüft an drei Fällen, die bewusst unterschiedlich sind:
**Gasthof** (warm, persönlich) · **Event** (laut, datiert, kurzlebig) · **Handwerksbetrieb**
(sachlich, technisch).

---

## K1 · Lesbarkeit auf jedem Foto

Der Text muss auf einem weißen Winterhimmel genauso stehen wie auf einer dunklen Werkstatt
oder einem unruhigen Menschenbild. Ein Editor, der nur auf ruhigen Motiven funktioniert,
ist im Alltag wertlos — die Wirtin fotografiert nicht nach Lichtsituation.

**Erfüllt durch:** vier Arten, den Text vom Bild zu trennen — Kontur, Farbfläche, Schatten,
oder nichts (wenn der Verlauf reicht). Dazu eine regelbare Abdunklung des Hintergrunds.

## K2 · Nichts Wichtiges wird abgeschnitten

Instagram beschneidet das Profilraster auf 4:5 und legt in der Story eigene Bedienelemente
über den oberen und unteren Rand. Wer das nicht sieht, merkt es erst nach dem Posten.

**Erfüllt durch:** das 4:5-Feld als Anker für Logo, Badge und Verläufe; ein Raster, das
Beschnitt und Story-Bedienzonen einblendet; die Grundlinie bei 0,72 statt am unteren Rand.

## K3 · Das Foto wird nicht beschädigt

Ein Post, der ein Zimmer oder ein fertiges Bad verkauft, darf das Motiv nicht anschneiden.
Es muss aber auch formatfüllend gehen, wenn der Rand nichts hergibt.

**Erfüllt durch:** drei Passungen — vollständig mit Unschärfe-Rand, vollständig mit farbigem
Rand, oder formatfüllend. Bei farbigem Rand bleibt die Farbe rein, die Verläufe enden am Foto.

## K4 · Hierarchie: drei Ebenen, nicht fünf

Ein Post hat höchstens drei Textebenen — Einordnung (Kicker), Aussage (Schlagzeile),
Aufforderung. Wer mehr anbietet, bekommt Zettelwirtschaft.

**Erfüllt durch:** genau diese drei, plus **ein** farbiges Schlüsselwort. Mehr geht nicht,
und das ist Absicht.

## K5 · Markentreue statt Vorlagenkatalog

Wiedererkennung entsteht durch Wiederholung. Ein Katalog mit 200 Vorlagen erzeugt das
Gegenteil: jeder Post sieht anders aus, keiner nach dem Betrieb.

**Erfüllt durch:** eine Hausfarbe, ein Logo, sechs Vorlagen, die sich **strukturell**
unterscheiden (wo steht was) statt dekorativ. Die Farben kommen aus dem Logo, nicht aus
einer Palette.

## K6 · Drei Betriebe, drei Handschriften

Ein Gasthof darf nicht aussehen wie ein Techno-Event. Die Schrift trägt davon den größten Teil.

**Erfüllt durch:** drei Schriftcharaktere — Grotesk (sachlich), Serif (warm, redaktionell),
Kondensiert (laut, plakativ). Jeweils mit passender Standardgröße und Laufweite.

## K7 · Alles, was gesetzt wird, ist auch verschiebbar

Ein Designer akzeptiert keine festgenagelten Positionen. Logo und Text müssen unabhängig
voneinander positioniert, ausgerichtet und skaliert werden können.

**Erfüllt durch:** Logo in sechs Positionen mit stufenloser Größe und Abschaltung;
Textblock in drei Höhen mit drei Ausrichtungen und stufenloser Größe.

## K8 · Nichts läuft aus dem Bild

Egal wie lang die Zeile, wie groß die Schrift, wie groß das Logo — es muss im Rahmen bleiben.

**Erfüllt durch:** automatische Verkleinerung, bis die längste Zeile passt; das Logo wird in
eine Box eingepasst statt nur in der Breite begrenzt.

## K9 · Zehn Minuten, nicht vierzig

Jede Einstellung, die niemand versteht, kostet mehr als sie bringt. Eine Vorlage muss einen
fertigen Post liefern, ohne dass jemand etwas nachstellt.

**Erfüllt durch:** Vorlage wählen ist ein Klick und setzt alles. Die Feineinstellungen sind
eingeklappt und müssen nicht angefasst werden.

## K10 · Was man sieht, kommt auch heraus

Die Vorschau muss der Exportdatei entsprechen — dieselbe Zeichenroutine, nicht zwei.

**Erfüllt durch:** `zeichnePost()` rendert Vorschau, PNG-Export und jeden Videoframe. Es gibt
keinen zweiten Pfad.

---

## Was der Editor bewusst NICHT kann

- **Freies Verschieben per Maus.** Klingt nach Freiheit, erzeugt aber schiefe Ergebnisse und
  kostet bei jedem Post Zeit. Raster schlägt Pixelschieben.
- **Beliebig viele Textfelder.** Siehe K4.
- **Filter und Effekte.** Das Foto soll aussehen wie das Haus, nicht wie eine App.
- **Schriftarten hochladen.** Drei Charaktere decken den Bedarf; mehr Auswahl heißt nur
  längere Entscheidung.

## Offen

- Bildausschnitt verschieben, wenn das Motiv nicht mittig sitzt (K3)
- Zweites Logo für Partner und Förderer — bei Events der Normalfall (K5)
- Kontrast automatisch messen und die Abdunklung selbst setzen (K1)
