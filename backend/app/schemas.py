from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Ziel = Literal["gast", "team"]
Format = Literal["story", "post", "square"]
Prioritaet = Literal["zimmer", "restaurant", "veranstaltung", "tagesgericht", "sichtbarkeit"]


class House(BaseModel):
    name: str = "Aurora Lodge"
    ort: str = "Salzburg"
    art: str = "Hotel & Restaurant"
    farbe: str = "#0E7C66"
    logo: Optional[str] = None
    belege: List[str] = Field(default_factory=list)
    sperrliste: List[str] = Field(default_factory=list)
    cta_gast: str = "Jetzt Tisch reservieren."
    cta_team: str = "Schreib uns einfach."


class Copy(BaseModel):
    """Was das Modell liefern darf. Kein Layout, nur Text und Fokuspunkt."""
    kicker: str = Field(max_length=30)
    head: List[str]
    key: str
    caption: str
    hashtags: List[str] = Field(default_factory=list)
    quellen: List[str] = Field(default_factory=list)
    focal_x: float = 0.5
    focal_y: float = 0.5


class PostOut(BaseModel):
    id: str
    ziel: Ziel
    text: Copy
    renders: dict
    source_url: str
    engine: str
    warnungen: List[str] = Field(default_factory=list)


class Idea(BaseModel):
    titel: str
    ziel: Ziel
    anlass: str
    quelle: str
    hook: str
    szenen: List[str] = Field(default_factory=list)
    warum: str = ""


class IdeaRequest(BaseModel):
    anzahl: int = 6
    ziel: Optional[Ziel] = None


class Empfehlung(BaseModel):
    """Datenbasierte Tagesempfehlung: worauf sich der Post heute stuetzt."""
    prioritaet: Prioritaet
    anlass: str
    text: str
    quellen: List[str] = Field(default_factory=list)


class AssistentPost(BaseModel):
    """Ergebnis des Ideen-Assistenten: Empfehlung plus alle vier Ausgabeformen."""
    id: str
    prioritaet: Prioritaet
    empfehlung: Empfehlung
    text: Copy
    caption_en: str
    szenen: List[str] = Field(default_factory=list)
    renders: dict
    source_url: str
    engine: str
    warnungen: List[str] = Field(default_factory=list)
