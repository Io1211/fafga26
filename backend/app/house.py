import json
from .config import DATA
from .schemas import House

PATH = DATA / "house.json"


def load() -> House:
    if PATH.exists():
        return House(**json.loads(PATH.read_text(encoding="utf-8")))
    h = House()
    save(h)
    return h


def save(h: House) -> House:
    PATH.write_text(json.dumps(h.model_dump(), indent=2, ensure_ascii=False), encoding="utf-8")
    return h
