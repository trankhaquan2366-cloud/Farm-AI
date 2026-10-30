"""Cấu hình bảo mật: SECRET_KEY bắt buộc và giới hạn đăng nhập."""
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _subprocess_env(**overrides: str) -> dict[str, str]:
    env = {key: value for key, value in os.environ.items() if key != "SECRET_KEY"}
    env.pop("DEBUG", None)
    # Tránh lỗi UnicodeEncodeError trên console Windows (cp1252) khi in thông báo tiếng Việt.
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    env.update(overrides)
    return env


def test_app_refuses_to_start_without_secret_key_in_production() -> None:
    result = subprocess.run(
        [sys.executable, "-c", "import app.core.security"],
        cwd=PROJECT_ROOT,
        env=_subprocess_env(DEBUG="false"),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )
    assert result.returncode != 0
    assert "Thiếu SECRET_KEY" in (result.stderr + result.stdout)


def test_debug_mode_allows_temporary_secret_key() -> None:
    result = subprocess.run(
        [sys.executable, "-c", "import app.core.security; print('IMPORT_OK')"],
        cwd=PROJECT_ROOT,
        env=_subprocess_env(DEBUG="true"),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert "IMPORT_OK" in result.stdout
    assert "DEBUG=True" in result.stdout


def test_missing_gemini_key_warns_without_crashing_on_cp1252(
    tmp_path: Path,
) -> None:
    """Backend không có khóa AI vẫn khởi động được trên console cp1252."""
    env = {key: value for key, value in os.environ.items() if key != "GEMINI_API_KEY"}
    env["GEMINI_API_KEY"] = ""
    env["PYTHONIOENCODING"] = "cp1252"
    env.pop("PYTHONUTF8", None)
    result = subprocess.run(
        [sys.executable, "-c", "import app.core.config; print('IMPORT_OK')"],
        cwd=tmp_path,
        env={**env, "PYTHONPATH": str(PROJECT_ROOT)},
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert "IMPORT_OK" in result.stdout


def test_login_is_rate_limited_per_ip(
    client: TestClient, sample_data: dict[str, object]
) -> None:
    statuses = []
    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            data={"username": "admin@test.local", "password": "wrong-password"},
        )
        statuses.append(response.status_code)

    blocked = client.post(
        "/api/auth/login",
        data={"username": "admin@test.local", "password": "wrong-password"},
    )

    assert statuses == [401, 401, 401, 401, 401]
    assert blocked.status_code == 429, blocked.text
    assert blocked.headers.get("Retry-After")
