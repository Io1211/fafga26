import os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
STATIC = BASE / "static"
UPLOADS = STATIC / "uploads"
RENDERS = STATIC / "renders"
for p in (DATA, UPLOADS, RENDERS):
    p.mkdir(parents=True, exist_ok=True)

def _load_env():
    f = BASE / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

MISTRAL_KEY = os.getenv("MISTRAL_API_KEY", "").strip()
MODEL_VISION = os.getenv("MISTRAL_MODEL_VISION", "mistral-medium-latest")
MODEL_TEXT = os.getenv("MISTRAL_MODEL_TEXT", "ministral-8b-latest")
API_URL = "https://api.mistral.ai/v1/chat/completions"
HAS_KEY = bool(MISTRAL_KEY)
