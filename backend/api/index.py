import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402  (Vercel's Python runtime looks for this ASGI `app`)
