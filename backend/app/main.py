import json, shutil, uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import house as house_store
from . import llm, render, signale
from .config import DATA, STATIC, UPLOADS, HAS_KEY, LAND, MODEL_TEXT, MODEL_VISION
from .schemas import AssistentPost, Empfehlung, House, IdeaRequest, PostOut

app = FastAPI(title="Hauspost API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
    allow_headers=["*"], allow_credentials=False,
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")

ERLAUBT = {"image/jpeg", "image/png", "image/webp"}
PRIORITAETEN = ("zimmer", "restaurant", "veranstaltung", "tagesgericht", "sichtbarkeit")


@app.get("/api/health")
def health():
    return {"ok": True, "mistral": HAS_KEY,
            "modelle": {"vision": MODEL_VISION, "text": MODEL_TEXT}}


@app.get("/api/house", response_model=House)
def house_get():
    return house_store.load()


@app.put("/api/house", response_model=House)
def house_put(h: House):
    return house_store.save(h)


@app.post("/api/house/logo")
async def house_logo(file: UploadFile = File(...)):
    if file.content_type not in ERLAUBT:
        raise HTTPException(415, "Nur JPEG, PNG oder WebP.")
    ziel = UPLOADS / f"logo-{uuid.uuid4().hex[:8]}{Path(file.filename or '').suffix or '.png'}"
    with ziel.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    h = house_store.load()
    h.logo = str(ziel)
    house_store.save(h)
    return {"logo_url": f"/static/uploads/{ziel.name}"}


@app.post("/api/posts", response_model=PostOut)
async def post_erstellen(
    file: UploadFile = File(...),
    ziel: str = Form("gast"),
    notiz: str = Form(""),
):
    if file.content_type not in ERLAUBT:
        raise HTTPException(415, "Nur JPEG, PNG oder WebP.")
    if ziel not in ("gast", "team"):
        raise HTTPException(400, "ziel muss gast oder team sein.")

    pid = uuid.uuid4().hex[:10]
    pfad = UPLOADS / f"{pid}{Path(file.filename or '').suffix or '.jpg'}"
    with pfad.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    h = house_store.load()
    copy, engine, warn = llm.copy_fuer_foto(pfad, h, ziel, notiz)
    renders = {fmt: render.render(pfad, copy, h, fmt, pid) for fmt in render.FORMATS}

    out = PostOut(id=pid, ziel=ziel, text=copy, renders=renders,
                  source_url=f"/static/uploads/{pfad.name}", engine=engine, warnungen=warn)
    (DATA / f"post-{pid}.json").write_text(out.model_dump_json(), encoding="utf-8")
    return out


@app.post("/api/posts/{pid}/variante", response_model=PostOut)
def variante(pid: str, ziel: str = Form("gast")):
    """Dasselbe Foto, andere Zielgruppe. Der Moment in der Demo."""
    alt = DATA / f"post-{pid}.json"
    if not alt.exists():
        raise HTTPException(404, "Post nicht gefunden.")
    quelle = json.loads(alt.read_text(encoding="utf-8"))
    pfad = UPLOADS / Path(quelle["source_url"]).name
    h = house_store.load()
    copy, engine, warn = llm.copy_fuer_foto(pfad, h, ziel)
    npid = uuid.uuid4().hex[:10]
    renders = {fmt: render.render(pfad, copy, h, fmt, npid) for fmt in render.FORMATS}
    out = PostOut(id=npid, ziel=ziel, text=copy, renders=renders,
                  source_url=quelle["source_url"], engine=engine, warnungen=warn)
    (DATA / f"post-{npid}.json").write_text(out.model_dump_json(), encoding="utf-8")
    return out


@app.post("/api/ideas")
def ideen(req: IdeaRequest):
    h = house_store.load()
    items, engine = llm.ideen(h, req.anzahl, req.ziel)
    return {"engine": engine, "ideen": [i.model_dump() for i in items]}


@app.get("/api/empfehlung", response_model=Empfehlung)
def empfehlung_get(prioritaet: str = "sichtbarkeit"):
    """Datenbasierte Tagesempfehlung fuer den Ideen-Assistenten - vor dem Foto,
    damit der Anlass feststeht, bevor irgendein Text geschrieben wird."""
    if prioritaet not in PRIORITAETEN:
        raise HTTPException(400, "Ungueltige Prioritaet.")
    h = house_store.load()
    return llm.empfehlung(h, prioritaet)


@app.post("/api/assistent", response_model=AssistentPost)
async def assistent_post(
    file: UploadFile = File(...),
    prioritaet: str = Form(...),
    notiz: str = Form(""),
):
    """Ideen-Assistent: Foto plus Prioritaet ergeben Empfehlung, Post-Caption,
    Story-Format, Reel-Drehplan und eine englische Caption - alles auf einmal."""
    if file.content_type not in ERLAUBT:
        raise HTTPException(415, "Nur JPEG, PNG oder WebP.")
    if prioritaet not in PRIORITAETEN:
        raise HTTPException(400, "Ungueltige Prioritaet.")

    h = house_store.load()
    empf = llm.empfehlung(h, prioritaet)

    pid = uuid.uuid4().hex[:10]
    pfad = UPLOADS / f"{pid}{Path(file.filename or '').suffix or '.jpg'}"
    with pfad.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    basis_kontext = llm.assistent_kontext(h, empf)
    kontext = basis_kontext + (f"\nWunsch vom Betrieb: {notiz}" if notiz else "")
    copy, engine, warn = llm.copy_fuer_foto(pfad, h, "gast", kontext)
    caption_en, _ = llm.uebersetzen(copy, h)
    szenen, _ = llm.reel_drehplan(h, prioritaet, notiz, basis_kontext)
    renders = {fmt: render.render(pfad, copy, h, fmt, pid) for fmt in render.FORMATS}

    out = AssistentPost(
        id=pid, prioritaet=prioritaet, empfehlung=empf, text=copy, caption_en=caption_en,
        szenen=szenen, renders=renders, source_url=f"/static/uploads/{pfad.name}",
        engine=engine, warnungen=warn,
    )
    (DATA / f"assistent-{pid}.json").write_text(out.model_dump_json(), encoding="utf-8")
    return out


@app.get("/api/signale")
def signale_get():
    """Wetter, Feiertage, Events in der Naehe - Kontext fuer die Ideen."""
    h = house_store.load()
    return signale.alle(h.ort, LAND)


@app.get("/api/kennzahlen")
def kennzahlen():
    """Demo-Kennzahlen. Im UI als Beispieldaten gekennzeichnet."""
    return {
        "beispieldaten": True,
        "kacheln": [
            {"label": "Reichweite", "wert": "148,2 k", "delta": 8.4},
            {"label": "Interaktionen", "wert": "9.340", "delta": 12.1},
            {"label": "Neue Gaeste", "wert": "217", "delta": -2.3},
            {"label": "Geplante Posts", "wert": "84", "hinweis": "12 in Freigabe"},
        ],
        "kanaele": [
            {"name": "Instagram", "kuerzel": "IG", "delta": 9.1, "anteil": 0.82},
            {"name": "Facebook", "kuerzel": "FB", "delta": 3.4, "anteil": 0.58},
            {"name": "TikTok", "kuerzel": "TT", "delta": 21.7, "anteil": 0.91},
            {"name": "LinkedIn", "kuerzel": "LI", "delta": -1.2, "anteil": 0.41},
        ],
        "monate": [
            {"monat": "Januar", "thema": "Winter & Wellness", "posts": 14, "kanaele": ["IG", "FB"]},
            {"monat": "Februar", "thema": "Valentinstag", "posts": 10, "kanaele": ["IG", "TT"]},
            {"monat": "Maerz", "thema": "Fruehlingskueche", "posts": 8, "kanaele": ["IG", "LI"]},
            {"monat": "April", "thema": "Ostern", "posts": 12, "kanaele": ["IG", "FB"],
             "termine": [
                 {"titel": "Ostersonntag", "datum": "05.04."},
                 {"titel": "Osterbrunch", "datum": "05.04."},
             ]},
            {"monat": "Mai", "thema": "Terrassensaison", "posts": 9, "kanaele": ["IG", "TT"]},
            {"monat": "Juni", "thema": "Sommerstart", "posts": 7, "kanaele": ["IG", "FB"]},
            {"monat": "Juli", "thema": "Genussmomente", "posts": 6, "kanaele": ["IG", "TT"]},
            {"monat": "August", "thema": "Local Stories", "posts": 5, "kanaele": ["IG", "LI"]},
            {"monat": "September", "thema": "Erntezeit", "posts": 4, "kanaele": ["IG", "FB"], "aktiv": True,
             "termine": [
                 {"titel": "Törggelen", "datum": "12.09."},
                 {"titel": "Fafga Messe – Eröffnung", "datum": "19.09."},
                 {"titel": "Fafga Messe – Livekochen am Stand", "datum": "19.09."},
                 {"titel": "Fafga Messe – Familientag", "datum": "20.09."},
                 {"titel": "Hochzeit", "datum": "26.09."},
             ]},
            {"monat": "Oktober", "thema": "Herbst-Retreat", "posts": 3, "kanaele": ["IG", "TT"],
             "termine": [
                 {"titel": "Kürbisfest", "datum": "04.10."},
                 {"titel": "Erntedank-Brunch", "datum": "18.10."},
             ]},
            {"monat": "November", "thema": "Advent Teaser", "posts": 2, "kanaele": ["IG", "FB"],
             "termine": [
                 {"titel": "Martinigansl-Essen", "datum": "11.11."},
             ]},
            {"monat": "Dezember", "thema": "Festtage", "posts": 4, "kanaele": ["IG", "LI"],
             "termine": [
                 {"titel": "Christkindlmarkt-Eröffnung", "datum": "01.12."},
                 {"titel": "Heiligabend", "datum": "24.12."},
                 {"titel": "Silvesterfeier", "datum": "31.12."},
             ]},
        ],
    }
