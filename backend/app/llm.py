"""Mistral-Anbindung plus deterministischer Rueckfall.

Der Rueckfall ist kein Notnagel, sondern Teil des Produkts: die Haus-Muster
bauen ihre Saetze ausschliesslich aus den Belegen. Faellt die API aus, schreibt
das System weiter - nur ohne das Foto anzusehen.
"""
from __future__ import annotations

import base64, hashlib, json, random, re
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

from .config import API_URL, DATA, HAS_KEY, MISTRAL_KEY, MODEL_TEXT, MODEL_VISION
from .schemas import Copy, House, Idea

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


def ideen(house: House, anzahl: int = 6, ziel: str | None = None) -> tuple[list[Idea], str]:
    if HAS_KEY:
        try:
            belege = "\n".join("- " + b for b in house.belege if b.strip())
            p = (f"Betrieb: {house.name}, {house.ort} ({house.art}).\n"
                 f"Belege:\n{belege}\nNie behaupten: {', '.join(house.sperrliste)}\n\n"
                 f"Schlage {anzahl} konkrete Post-Ideen vor. "
                 f"{'Nur fuer ' + ('Gaeste' if ziel=='gast' else 'Mitarbeitende') + '.' if ziel else 'Gemischt fuer Gaeste und Mitarbeitende.'}\n"
                 "Jede Idee: titel, ziel (gast oder team), anlass, quelle (welcher Beleg oder "
                 "welcher Anlass), hook (ein Satz), szenen (3 bis 4 Kameraeinstellungen fuer ein "
                 "kurzes Video, je eine kurze Anweisung), warum (ein Satz).\n"
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
    out = []
    for i in range(anzahl):
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
