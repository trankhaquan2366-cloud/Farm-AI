"""Kiểm tra nhanh khả năng gọi Gemini với từng model. Không in cấu hình/khóa.

Chạy: venv/Scripts/python.exe docs/evidence/scripts/check_ai.py
"""
import sys
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

import app.core.ai_client as client_module  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402,F401

for model in ("gemini-2.5-flash", "gemini-flash-lite-latest"):
    client_module.GEMINI_MODEL = model
    started = time.time()
    try:
        text = client_module.call_gemini("Tra loi ngan gon.", "Tra loi dung mot tu: OK")
        print("OK", model, text[:40], int((time.time() - started) * 1000), "ms")
    except Exception as exc:  # noqa: BLE001
        print("FAIL", model, type(exc).__name__, str(exc)[:200], int((time.time() - started) * 1000), "ms")
