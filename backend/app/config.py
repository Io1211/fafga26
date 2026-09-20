import os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# Auf Vercel ist das Deployment-Dateisystem read-only, nur /tmp ist beschreibbar
# (und nur fuer die Lebensdauer der Serverless-Instanz - reicht fuer eine Demo).
RUNTIME = Path("/tmp/hauspost") if os.getenv("VERCEL") else BASE

DATA = RUNTIME / "data"
STATIC = RUNTIME / "static"
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

TICKETMASTER_KEY = os.getenv("TICKETMASTER_API_KEY", "").strip()
LAND = os.getenv("LAND", "AT")
