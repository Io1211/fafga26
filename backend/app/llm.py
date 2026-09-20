"""Mistral-Anbindung plus deterministischer Rueckfall.

Der Rueckfall ist kein Notnagel, sondern Teil des Produkts: die Haus-Muster
bauen ihre Saetze ausschliesslich aus den Belegen. Faellt die API aus, schreibt
das System weiter - nur ohne das Foto anzusehen.
"""
from __future__ import annotations

import base64, hashlib, json, random, re
from datetime import date
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

from . import belegung, signale
from .config import API_URL, DATA, HAS_KEY, LAND, MISTRAL_KEY, MODEL_TEXT, MODEL_VISION
from .schemas import Copy, Empfehlung, House, Idea

CACHE = DATA / "cache"
CACHE.mkdir(exist_ok=True)
MAX_ZEILE = 15


def _b64(path: Path, max_kante: int = 1100) -> str:
    img = Image.open(path).convert("RGB")
    k = min(1, max_kante / max(img.width, img.height))
    if k < 1:
        img = img.resize((int(img.width * k), int(img.height * k)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, "JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _call(model: str, messages: list, schema: dict | None = None) -> dict:
    body = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 1200}
    if schema:
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "antwort", "schema": schema, "strict": True},
        }
    headers = {"Authorization": f"Bearer {MISTRAL_KEY}", "Content-Type": "application/json"}
    with httpx.Client(timeout=60) as c:
        r = c.post(API_URL, json=body, headers=headers)
        if r.status_code in (400, 422) and schema:
            body["response_format"] = {"type": "json_object"}
            r = c.post(API_URL, json=body, headers=headers)
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"]
    m = re.search(r"\{.*\}", txt, re.S)
    return json.loads(m.group(0) if m else txt)


# ---------------------------------------------------------------- Prompt

def _prompt(house: House, ziel: str, notiz: str) -> str:
    belege = "\n".join("- " + b for b in house.belege if b.strip()) or "- (keine hinterlegt)"
    sperr = ", ".join(house.sperrliste) or "-"
    zg = ("Gaeste. Sie entscheiden online, ob sie herkommen. Nicht verkaufen, sondern zeigen."
          if ziel == "gast" else
          "Moegliche Mitarbeitende. Sie sehen dasselbe Profil wie die Gaeste. "
          "Nicht ueber die Firma reden, sondern ueber sie.")
    cta = house.cta_gast if ziel == "gast" else house.cta_team
    return f"""Du schreibst Social-Media-Texte fuer einen kleinen Betrieb in Oesterreich.

BETRIEB: {house.name}, {house.ort} - {house.art}

DIE EINZIGEN ZULAESSIGEN FAKTEN. Nichts darf darueber hinausgehen:
{belege}

NIE BEHAUPTEN, auch nicht sinngemaess: {sperr}

ZIELGRUPPE: {zg}
AUFFORDERUNG woertlich ans Ende der Caption: {cta}
{('ZUSATZ VOM BETRIEB: ' + notiz) if notiz else ''}

TON: oesterreichisches Deutsch, direkt, persoenlich, kein Marketingdeutsch,
keine Superlative, hoechstens ein Emoji.

OVERLAY - Text, der ins Bild gebrannt wird:
- 2 bis 4 Zeilen, jede HOECHSTENS {MAX_ZEILE} Zeichen inklusive Leerzeichen
- Grossbuchstaben, zusammen ergeben sie einen Satz
- genau eine Zeile ist das Schluesselwort

focal_x und focal_y geben an, wo das Hauptmotiv im Bild liegt (0 bis 1).

Antworte nur mit JSON."""


_COPY_SCHEMA = {
    "type": "object",
    "properties": {
        "kicker": {"type": "string"},
        "head": {"type": "array", "items": {"type": "string"}},
        "key": {"type": "string"},
        "caption": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "quellen": {"type": "array", "items": {"type": "string"}},
        "focal_x": {"type": "number"},
        "focal_y": {"type": "number"},
    },
    "required": ["kicker", "head", "key", "caption", "hashtags", "quellen", "focal_x", "focal_y"],
    "additionalProperties": False,
}


def _pruefen(c: Copy, house: House) -> list[str]:
    warn = []
    c.head = [z.upper().strip() for z in c.head if str(z).strip()][:4]
    lang = [z for z in c.head if len(z) > MAX_ZEILE]
    if lang:
        warn.append(f"{len(lang)} Zeile(n) ueber {MAX_ZEILE} Zeichen - gekuerzt")
        c.head = [z[:MAX_ZEILE].strip() for z in c.head]
    if c.key.upper().strip() not in c.head:
        c.key = c.head[-1] if c.head else ""
    text = (c.caption + " " + " ".join(c.head)).lower()
    for s in house.sperrliste:
        if s.strip() and s.lower() in text:
            warn.append(f"Sperrliste beruehrt: {s}")
    return warn


# ---------------------------------------------------------------- Haus-Muster

_MUSTER = [
    (["DAS HIER", "MACHT", "DEN UNTERSCHIED"], "DEN UNTERSCHIED"),
    (["NICHT NEU.", "NUR", "EHRLICH."], "EHRLICH."),
    (["BEI UNS", "SEIT", "IMMER SCHON"], "IMMER SCHON"),
    (["KOMM", "VORBEI.", "EINFACH SO."], "EINFACH SO."),
]


def haus_muster(house: House, ziel: str, notiz: str = "") -> Copy:
    belege = [b for b in house.belege if b.strip()] or ["Wir sind da."]
    beleg = random.choice(belege)
    head, key = random.choice(_MUSTER)
    cta = house.cta_gast if ziel == "gast" else house.cta_team
    einstieg = ("Was viele nicht wissen:" if ziel == "gast" else "Falls du bei uns anfangen willst:")
    tags = (["#{}".format(house.ort.lower()), "#gastgeber", "#tirol", "#regional"]
            if ziel == "gast" else
            ["#jobs{}".format(house.ort.lower()), "#gastronomiejobs", "#team", "#karriere"])
    return Copy(
        kicker=f"{house.name} · {house.ort}"[:30],
        head=head, key=key,
        caption=f"{einstieg}\n\n{beleg}\n\n{cta}",
        hashtags=tags, quellen=[beleg], focal_x=.5, focal_y=.5,
    )


# ---------------------------------------------------------------- oeffentlich

def copy_fuer_foto(photo: Path, house: House, ziel: str, notiz: str = "") -> tuple[Copy, str, list[str]]:
    key = hashlib.sha1((photo.name + ziel + notiz + house.model_dump_json()).encode()).hexdigest()[:16]
    cached = CACHE / f"{key}.json"

    if HAS_KEY:
        try:
            data = _call(MODEL_VISION, [{"role": "user", "content": [
                {"type": "text", "text": _prompt(house, ziel, notiz)},
                {"type": "image_url", "image_url": f"data:image/jpeg;base64,{_b64(photo)}"},
            ]}], _COPY_SCHEMA)
            c = Copy(**data)
            warn = _pruefen(c, house)
            cached.write_text(c.model_dump_json(), encoding="utf-8")
            return c, "mistral", warn
        except Exception as e:
            if cached.exists():
                c = Copy(**json.loads(cached.read_text(encoding="utf-8")))
                return c, "cache", [f"API nicht erreichbar ({type(e).__name__}) - gespeicherte Fassung"]
            c = haus_muster(house, ziel, notiz)
            return c, "haus-muster", [f"API nicht erreichbar ({type(e).__name__})"]

    if cached.exists():
        return Copy(**json.loads(cached.read_text(encoding="utf-8"))), "cache", []
    c = haus_muster(house, ziel, notiz)
    return c, "haus-muster", ["Kein API-Schluessel hinterlegt - Haus-Muster"]


_ANLAESSE = [
    ("Erntezeit", "Saison"), ("Herbstkueche", "Saison"), ("Sonnenterrasse", "Wetter"),
    ("Offene Stelle", "Personal"), ("Hinter den Kulissen", "Team"),
    ("Neue Karte", "Betrieb"), ("Stammgaeste", "Gaeste"),
]


def _signal_ideen(sig: dict, ziel: str | None) -> list[Idea]:
    """Ideen direkt aus Wetter, Feiertag, Event - fuer den Haus-Muster-Fallback."""
    if ziel and ziel != "gast":
        return []
    out: list[Idea] = []

    w = sig["wetter"]
    if w["kurz"] and w["tage"]:
        sonnig = w["tage"][0]["beschreibung"] in ("klarer Himmel", "ueberwiegend klar", "teils bewoelkt")
        out.append(Idea(
            titel="Terrasse & Wetter" if sonnig else "Gemuetlich drinnen", ziel="gast", anlass="Wetter",
            quelle=w["kurz"],
            hook=("Nutzt das Wetter, zeigt die Terrasse." if sonnig
                  else "Zeigt, wie gemuetlich es drinnen bei diesem Wetter ist."),
            szenen=["Aussenaufnahme mit aktuellem Wetter, 3 Sek", "Detail vom Angebot, 3 Sek",
                    "Gaeste im Moment, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
            warum="Baut auf der aktuellen Wetterlage auf, nichts dazuerfunden.",
        ))

    f = sig["feiertage"]
    if f["kurz"]:
        name = f["liste"][0]["name"]
        out.append(Idea(
            titel=name, ziel="gast", anlass="Feiertag", quelle=f["kurz"],
            hook=f"Passend zu {name} zeigen, was es bei euch dazu gibt.",
            szenen=["Totale vom festlich vorbereiteten Haus, 3 Sek", "Detail vom passenden Angebot, 3 Sek",
                    "Person erzaehlt kurz, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
            warum="Baut auf dem anstehenden Feiertag auf, nichts dazuerfunden.",
        ))

    e = sig["events"]
    if e["kurz"]:
        name = e["liste"][0]["name"]
        out.append(Idea(
            titel=name, ziel="gast", anlass="Event in der Naehe", quelle=e["kurz"],
            hook=f"Gaeste, die zu {name} kommen, auf euch aufmerksam machen.",
            szenen=["Aussenaufnahme mit Naehe zum Event, 3 Sek", "Detail vom Angebot, 3 Sek",
                    "Person laedt ein, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
            warum="Baut auf einem realen Event in der Naehe auf, nichts dazuerfunden.",
        ))
    return out


def _anlaesse_block(sig: dict) -> str:
    zeilen = [
        "Wetter: " + (sig["wetter"]["kurz"] or "unbekannt"),
        "Naechster Feiertag: " + (sig["feiertage"]["kurz"] or "keiner in Sicht"),
        "Event in der Naehe: " + (sig["events"]["kurz"] or "keins gefunden"),
    ]
    return "\n".join("- " + z for z in zeilen)


def ideen(house: House, anzahl: int = 6, ziel: str | None = None) -> tuple[list[Idea], str]:
    sig = signale.alle(house.ort, LAND)

    if HAS_KEY:
        try:
            belege = "\n".join("- " + b for b in house.belege if b.strip())
            p = (f"Betrieb: {house.name}, {house.ort} ({house.art}).\n"
                 f"Belege:\n{belege}\nNie behaupten: {', '.join(house.sperrliste)}\n\n"
                 f"AKTUELLE ANLAESSE (nutze sie nur, wenn sie zum Betrieb passen, erfinde nichts dazu):\n"
                 f"{_anlaesse_block(sig)}\n\n"
                 f"Schlage {anzahl} konkrete Post-Ideen vor. "
                 f"{'Nur fuer ' + ('Gaeste' if ziel=='gast' else 'Mitarbeitende') + '.' if ziel else 'Gemischt fuer Gaeste und Mitarbeitende.'}\n"
                 "Jede Idee: titel, ziel (gast oder team), anlass, quelle (welcher Beleg oder "
                 "welcher Anlass - auch ein Anlass von oben zaehlt als Quelle), hook (ein Satz), "
                 "szenen (3 bis 4 Kameraeinstellungen fuer ein kurzes Video, je eine kurze "
                 "Anweisung), warum (ein Satz).\n"
                 'Antworte als JSON: {"ideen": [...]}')
            data = _call(MODEL_TEXT, [{"role": "user", "content": p}])
            roh = data.get("ideen", data if isinstance(data, list) else [])
            out = []
            for d in roh[:anzahl]:
                try:
                    out.append(Idea(**d))
                except Exception:
                    continue
            if out:
                return out, "mistral"
        except Exception:
            pass

    belege = [b for b in house.belege if b.strip()] or ["Wir sind da."]
    out = _signal_ideen(sig, ziel)[:anzahl]
    for i in range(anzahl - len(out)):
        titel, anlass = _ANLAESSE[i % len(_ANLAESSE)]
        z = ziel or ("team" if i % 3 == 2 else "gast")
        b = belege[i % len(belege)]
        out.append(Idea(
            titel=titel, ziel=z, anlass=anlass, quelle=b,
            hook=("Zeig, was heute frisch ist." if z == "gast" else "Lass jemanden aus dem Team erzaehlen."),
            szenen=["Totale vom Haus, 3 Sek", "Detail, Haende bei der Arbeit, 3 Sek",
                    "Person schaut in die Kamera, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
            warum="Baut auf einem hinterlegten Beleg auf, nichts dazuerfunden.",
        ))
    return out, "haus-muster"


# ---------------------------------------------------------------- Ideen-Assistent

_WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
_REGENARTIG = {
    "leichter Nieselregen", "Nieselregen", "starker Nieselregen",
    "leichter Regen", "Regen", "starker Regen",
    "Regenschauer", "kraeftige Regenschauer", "heftige Regenschauer",
    "Gewitter", "Gewitter mit Hagel", "schweres Gewitter mit Hagel",
}

_REEL_VORLAGEN = {
    "zimmer": ["Zimmer bei natuerlichem Licht zeigen, 3 Sek", "Blick aus Fenster oder Balkon, 2 Sek",
               "Detail Bett oder Bad, 3 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
    "restaurant": ["Gedeckter Tisch oder Gaeste, 3 Sek", "Teller in Nahaufnahme, 3 Sek",
                   "Kueche oder Service in Aktion, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
    "veranstaltung": ["Ort oder Anlass zeigen, 3 Sek", "Vorbereitung oder Deko im Detail, 3 Sek",
                       "Person laedt ein, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
    "tagesgericht": ["Teller von oben, 3 Sek", "Zubereitung in der Kueche, 3 Sek",
                      "Erste Gabel, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
    "sichtbarkeit": ["Totale vom Haus, 3 Sek", "Ein Moment aus dem Alltag, 3 Sek",
                      "Person schaut in die Kamera, 2 Sek", "Schlussbild mit Schriftzug, 2 Sek"],
}


def _wochentag(iso_datum: str) -> str:
    return _WOCHENTAGE[date.fromisoformat(iso_datum).weekday()]


def _kurzdatum(iso_datum: str) -> str:
    d = date.fromisoformat(iso_datum)
    if d == date.today():
        return "heute"
    return f"{d.day:02d}.{d.month:02d}."


def _naechstes_wochenende(tage: list[dict]) -> dict | None:
    for t in tage:
        if date.fromisoformat(t["datum"]).weekday() in (5, 6):
            return t
    return tage[0] if tage else None


_REEL_SCHEMA = {
    "type": "object",
    "properties": {"szenen": {"type": "array", "items": {"type": "string"}}},
    "required": ["szenen"],
    "additionalProperties": False,
}


def reel_drehplan(house: House, prioritaet: str, wunsch: str = "", kontext: str = "") -> tuple[list[str], str]:
    """Drehplan fuers Reel. Ohne eigenen Wunsch bleibt es bei der festen
    Vorlage je Prioritaet - mit Wunsch und Kontext schreibt Mistral einen
    Drehplan, der genau auf diesen Post zugeschnitten ist."""
    vorlage = list(_REEL_VORLAGEN.get(prioritaet, _REEL_VORLAGEN["sichtbarkeit"]))
    if not HAS_KEY or not wunsch.strip():
        return vorlage, "haus-muster"
    try:
        p = (f"Betrieb: {house.name}, {house.ort} ({house.art}).\n"
             f"Prioritaet heute: {prioritaet}.\n"
             f"Kontext:\n{kontext}\n"
             f"Wunsch vom Betrieb fuer diesen Post: {wunsch}\n\n"
             "Schlage einen kurzen Drehplan fuer ein Reel vor: 3 bis 4 Kameraeinstellungen, "
             "je eine kurze Anweisung inklusive ungefaehrer Laenge in Sekunden.\n"
             'Antworte als JSON: {"szenen": ["...", "..."]}')
        data = _call(MODEL_TEXT, [{"role": "user", "content": p}], _REEL_SCHEMA)
        szenen = [str(s).strip() for s in data.get("szenen", []) if str(s).strip()]
        if szenen:
            return szenen[:5], "mistral"
    except Exception:
        pass
    return vorlage, "haus-muster"


def empfehlung(house: House, prioritaet: str) -> Empfehlung:
    """Datenbasierte Tagesempfehlung - deterministisch. Hier zaehlt die Zahl
    aus dem Belegungs-Stub, keine kreative Formulierung ohne Grundlage."""
    sig = signale.alle(house.ort, LAND)
    wetter = sig["wetter"]

    if prioritaet == "zimmer":
        tag = _naechstes_wochenende(belegung.zimmer(4))
        if tag:
            w = next((t for t in wetter["tage"] if t["datum"] == tag["datum"]), None)
            zusatz = ""
            if w:
                zusatz = (" und Regen ist angekuendigt" if w["beschreibung"] in _REGENARTIG
                          else f", {w['beschreibung']}")
            text = (f"Fuer {_wochentag(tag['datum'])} sind noch {tag['frei']} von {tag['gesamt']} "
                    f"Zimmern frei{zusatz}. Wir empfehlen einen einladenden Zimmer-Post fuers Wochenende.")
            quellen = [f"Zimmer frei: {tag['frei']}/{tag['gesamt']} am {tag['datum']}"] + \
                      ([f"Wetter: {w['beschreibung']}"] if w else [])
        else:
            text = "Keine Belegungsdaten verfuegbar. Ein allgemeiner Zimmer-Post ist trotzdem moeglich."
            quellen = []
        return Empfehlung(prioritaet=prioritaet, anlass="Zimmerauslastung", text=text, quellen=quellen)

    if prioritaet == "restaurant":
        heute = belegung.restaurant(1)[0]
        tg = belegung.tagesgericht()
        text = (f"Im Restaurant sind heute noch {heute['frei']} von {heute['gesamt']} Plaetzen frei. "
                f"Zeigt das Tagesgericht „{tg['gericht']}“ und ladet zum Reinschauen ein.")
        quellen = [f"Plaetze frei: {heute['frei']}/{heute['gesamt']}", f"Tagesgericht: {tg['gericht']}"]
        return Empfehlung(prioritaet=prioritaet, anlass="Restaurantauslastung", text=text, quellen=quellen)

    if prioritaet == "veranstaltung":
        termine = belegung.eigene_termine()
        events = sig["events"]
        if termine and events["kurz"]:
            t = termine[0]
            wann = "Heute steht" if t["datum"] == date.today().isoformat() else f"Am {_kurzdatum(t['datum'])} steht"
            text = (f"{wann} bei euch {t['titel']} an, und in der Naehe laeuft ausserdem {events['kurz']}. "
                    f"Kombiniert das: eigener Anlass plus Gaeste, die ohnehin wegen {events['kurz'].split(' am ')[0]} "
                    f"unterwegs sind.")
            quellen = [f"Eigener Termin: {t['titel']} ({t['datum']})", f"Event in der Naehe: {events['kurz']}"]
        elif termine:
            t = termine[0]
            wann = "Heute steht" if t["datum"] == date.today().isoformat() else f"Am {_kurzdatum(t['datum'])} steht"
            text = f"{wann} bei euch {t['titel']} an. Nutzt das fuer einen Ankuendigungspost."
            quellen = [f"Eigener Termin: {t['titel']} ({t['datum']})"]
        elif events["kurz"]:
            text = f"In der Naehe: {events['kurz']}. Zeigt Gaesten, die deswegen unterwegs sind, dass es euch gibt."
            quellen = [f"Event in der Naehe: {events['kurz']}"]
        else:
            text = "Aktuell ist kein Termin hinterlegt. Ein Post ohne festen Anlass haelt euch trotzdem sichtbar."
            quellen = []
        return Empfehlung(prioritaet=prioritaet, anlass="Veranstaltung", text=text, quellen=quellen)

    if prioritaet == "tagesgericht":
        tg = belegung.tagesgericht()
        text = f"Heute gibt es {tg['gericht']}. Ein Foto direkt vom Teller wirkt am besten kurz vor der Mittagszeit."
        quellen = [f"Tagesgericht: {tg['gericht']} ({_kurzdatum(tg['datum'])})"]
        return Empfehlung(prioritaet=prioritaet, anlass="Tagesgericht", text=text, quellen=quellen)

    # sichtbarkeit
    zusatz = f" Draussen ist es {wetter['kurz']}." if wetter["kurz"] else ""
    text = ("Kein akuter Anlass, dann zaehlt Kontinuitaet. Ein Bild aus eurem Alltag haelt euch "
            "sichtbar, ganz ohne Verkaufsdruck." + zusatz)
    quellen = [f"Wetter: {wetter['kurz']}"] if wetter["kurz"] else []
    return Empfehlung(prioritaet=prioritaet, anlass="Sichtbarkeit", text=text, quellen=quellen)


def assistent_kontext(house: House, empf: Empfehlung) -> str:
    """Kombinierter Kontext fuer den Foto-Prompt: Wetter-API, Event-API und der
    eigene Terminplan des Hotels nebeneinander, nicht nur die eine Empfehlungs-
    zeile - damit Mistral beim Schreiben dieselbe Grundlage sieht wie die
    Empfehlung selbst."""
    sig = signale.alle(house.ort, LAND)
    zeilen = [f"Empfehlung: {empf.text}"]
    if sig["wetter"]["kurz"]:
        zeilen.append(f"Wetter (Wetter-API): {sig['wetter']['kurz']}")
    if sig["events"]["kurz"]:
        zeilen.append(f"Event in der Naehe (Event-API): {sig['events']['kurz']}")
    termine = belegung.eigene_termine()
    if termine:
        t = termine[0]
        zeilen.append(f"Eigener Termin (Terminplan des Hauses): {t['titel']} am {t['datum']}")
    return "\n".join(zeilen)


_UEBERSETZUNG_SCHEMA = {
    "type": "object",
    "properties": {"caption_en": {"type": "string"}},
    "required": ["caption_en"],
    "additionalProperties": False,
}


def uebersetzen(copy: Copy, house: House) -> tuple[str, str]:
    """Englische Fassung der Caption. Ohne Schluessel keine Erfindung - die
    deutsche Caption bleibt stehen, das UI markiert das transparent."""
    if HAS_KEY:
        try:
            data = _call(MODEL_TEXT, [{"role": "user", "content":
                "Uebersetze diese Social-Media-Caption fuer einen Hotel-/Gastro-Betrieb "
                "ins natuerliche Englisch. Ton, Zeilenumbrueche und Fakten beibehalten, "
                f"nichts hinzufuegen:\n\n{copy.caption}\n\n"
                'Antworte als JSON: {"caption_en": "..."}'
            }], _UEBERSETZUNG_SCHEMA)
            return data["caption_en"], "mistral"
        except Exception:
            pass
    return copy.caption, "unuebersetzt"
