"""Externe Signale: Wetter, Feiertage, Events in der Naehe.

Jede Quelle ist unabhaengig und faellt bei Fehlern (kein Netz, kein Key,
API down) auf eine leere Antwort zurueck - eine tote Quelle darf die
Ideen-Generierung nie blockieren. Pro Tag und Ort wird einmal gecacht.
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import httpx

from .config import DATA, TICKETMASTER_KEY

CACHE = DATA / "cache"
CACHE.mkdir(exist_ok=True)

_WETTERCODES = {
    0: "klarer Himmel", 1: "ueberwiegend klar", 2: "teils bewoelkt", 3: "bedeckt",
    45: "Nebel", 48: "gefrierender Nebel",
    51: "leichter Nieselregen", 53: "Nieselregen", 55: "starker Nieselregen",
    61: "leichter Regen", 63: "Regen", 65: "starker Regen",
    71: "leichter Schneefall", 73: "Schneefall", 75: "starker Schneefall",
    80: "Regenschauer", 81: "kraeftige Regenschauer", 82: "heftige Regenschauer",
    95: "Gewitter", 96: "Gewitter mit Hagel", 99: "schweres Gewitter mit Hagel",
}


def _slug(ort: str) -> str:
    return ort.lower().strip().replace(" ", "_")


def _tagescache(art: str, ort: str) -> Path:
    return CACHE / f"signal-{art}-{_slug(ort)}-{date.today().isoformat()}.json"


def _geocode(ort: str) -> tuple[float, float] | None:
    cp = CACHE / f"geocode-{_slug(ort)}.json"
    if cp.exists():
        d = json.loads(cp.read_text(encoding="utf-8"))
        return (d["lat"], d["lon"]) if d else None
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get("https://geocoding-api.open-meteo.com/v1/search",
                       params={"name": ort, "count": 1, "language": "de"})
            r.raise_for_status()
            treffer = r.json().get("results") or []
        if not treffer:
            cp.write_text("null", encoding="utf-8")
            return None
        lat, lon = treffer[0]["latitude"], treffer[0]["longitude"]
        cp.write_text(json.dumps({"lat": lat, "lon": lon}), encoding="utf-8")
        return lat, lon
    except Exception:
        return None


def wetter(ort: str) -> dict:
    """Naechste drei Tage: {kurz, tage: [...]}. Leer bei Fehler."""
    cp = _tagescache("wetter", ort)
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))

    out = {"kurz": "", "tage": []}
    geo = _geocode(ort)
    if geo:
        try:
            lat, lon = geo
            with httpx.Client(timeout=10) as c:
                r = c.get("https://api.open-meteo.com/v1/forecast", params={
                    "latitude": lat, "longitude": lon,
                    "daily": "weathercode,temperature_2m_max,temperature_2m_min",
                    "timezone": "auto", "forecast_days": 3,
                })
                r.raise_for_status()
                d = r.json()["daily"]
            tage = [{
                "datum": tag,
                "beschreibung": _WETTERCODES.get(d["weathercode"][i], "wechselhaft"),
                "max": round(d["temperature_2m_max"][i]),
                "min": round(d["temperature_2m_min"][i]),
            } for i, tag in enumerate(d["time"])]
            out["tage"] = tage
            if tage:
                h = tage[0]
                out["kurz"] = f"heute {h['beschreibung']}, {h['min']} bis {h['max']} Grad"
        except Exception:
            pass

    cp.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


def feiertage(land: str = "AT") -> dict:
    """Naechste anstehende Feiertage: {kurz, liste: [...]}. Leer bei Fehler."""
    cp = _tagescache("feiertage", land)
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))

    out = {"kurz": "", "liste": []}
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get(f"https://date.nager.at/api/v3/NextPublicHolidays/{land}")
            r.raise_for_status()
            daten = r.json()
        liste = [{"datum": d["date"], "name": d["localName"]} for d in daten[:3]]
        out["liste"] = liste
        if liste:
            naechster = liste[0]
            tage_bis = (date.fromisoformat(naechster["datum"]) - date.today()).days
            wann = "heute" if tage_bis == 0 else f"in {tage_bis} Tagen"
            out["kurz"] = f"{naechster['name']} ({wann})"
    except Exception:
        pass

    cp.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


def events(ort: str, radius_km: int = 25) -> dict:
    """Events in der Naehe ueber Ticketmaster. Leer ohne Key oder bei Fehler."""
    cp = _tagescache("events", ort)
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))

    out = {"kurz": "", "liste": []}
    if not TICKETMASTER_KEY:
        return out

    geo = _geocode(ort)
    if geo:
        try:
            lat, lon = geo
            with httpx.Client(timeout=10) as c:
                r = c.get("https://app.ticketmaster.com/discovery/v2/events.json", params={
                    "apikey": TICKETMASTER_KEY, "latlong": f"{lat},{lon}",
                    "radius": radius_km, "unit": "km", "sort": "date,asc", "size": 5,
                })
                r.raise_for_status()
                d = r.json()
            roh = (d.get("_embedded") or {}).get("events", [])
            liste = []
            for e in roh:
                venue = ((e.get("_embedded") or {}).get("venues") or [{}])[0]
                liste.append({
                    "name": e.get("name", ""),
                    "datum": ((e.get("dates") or {}).get("start") or {}).get("localDate", ""),
                    "ort": venue.get("name", ""),
                })
            out["liste"] = liste
            if liste:
                e0 = liste[0]
                out["kurz"] = f"{e0['name']} am {e0['datum']}" + (f" ({e0['ort']})" if e0["ort"] else "")
        except Exception:
            pass

    cp.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


def alle(ort: str, land: str = "AT") -> dict:
    return {"wetter": wetter(ort), "feiertage": feiertage(land), "events": events(ort)}
