"""Belegungs- und Kalender-Stub: Zimmer, Restaurant, Tagesgericht, eigene Termine.

Keine PMS-Anbindung. Feste, nachvollziehbare Demo-Werte je Wochentag, damit
die Empfehlung im Ideen-Assistenten reproduzierbar bleibt - dieselbe Anfrage
am selben Tag liefert immer dieselbe Zahl.
"""
from __future__ import annotations

from datetime import date, timedelta

_ZIMMER_GESAMT = 14
_ZIMMER_FREI = [5, 9, 11, 7, 4, 3, 8]  # Montag .. Sonntag

_RESTAURANT_PLAETZE = 48
_RESTAURANT_FREI = [30, 22, 18, 14, 8, 5, 20]  # Montag .. Sonntag

_TAGESGERICHTE = [
    "Kaesespaetzle mit Roestzwiebeln",
    "Tiroler Groestl",
    "Kuerbisrisotto mit Kernoel",
    "Wildragout mit Serviettenknoedel",
    "Zwiebelrostbraten",
    "Schweinsbraten mit Kraut",
    "Kuerbiscremesuppe mit Kernoel",
]

# Spiegelt einen Ausschnitt der Termine aus dem Jahreskalender (siehe
# main.py, kennzahlen()) - eigener Betriebskalender als Stub, noch nicht
# an ein echtes Buchungssystem angebunden.
_EIGENE_TERMINE = [
    {"datum": "2026-09-20", "titel": "Fafga Messe - Familientag"},
    {"datum": "2026-09-26", "titel": "Hochzeit"},
    {"datum": "2026-10-04", "titel": "Kuerbisfest"},
    {"datum": "2026-10-18", "titel": "Erntedank-Brunch"},
]


def zimmer(tage: int = 4) -> list[dict]:
    heute = date.today()
    return [{
        "datum": (heute + timedelta(days=i)).isoformat(),
        "frei": _ZIMMER_FREI[(heute + timedelta(days=i)).weekday()],
        "gesamt": _ZIMMER_GESAMT,
    } for i in range(tage)]


def restaurant(tage: int = 4) -> list[dict]:
    heute = date.today()
    return [{
        "datum": (heute + timedelta(days=i)).isoformat(),
        "frei": _RESTAURANT_FREI[(heute + timedelta(days=i)).weekday()],
        "gesamt": _RESTAURANT_PLAETZE,
    } for i in range(tage)]


def tagesgericht(tag: date | None = None) -> dict:
    tag = tag or date.today()
    return {"datum": tag.isoformat(), "gericht": _TAGESGERICHTE[tag.weekday()]}


def eigene_termine(tage: int = 14) -> list[dict]:
    heute = date.today().isoformat()
    grenze = (date.today() + timedelta(days=tage)).isoformat()
    return [t for t in _EIGENE_TERMINE if heute <= t["datum"] <= grenze]


def alle() -> dict:
    return {
        "zimmer": zimmer(),
        "restaurant": restaurant(),
        "tagesgericht": tagesgericht(),
        "termine": eigene_termine(),
    }
