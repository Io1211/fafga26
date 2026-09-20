Set-Location $PSScriptRoot
if (-Not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\pip install -q -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
