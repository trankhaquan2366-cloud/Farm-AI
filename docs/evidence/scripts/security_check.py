"""Quét bảo mật cục bộ: khóa bị lộ trong .env / lịch sử Git / frontend.

Nguyên tắc: KHÔNG in giá trị bí mật ra màn hình. Chỉ in tên biến, độ dài,
mã băm rút gọn (8 ký tự) và kết luận.

Chạy: venv/Scripts/python.exe docs/evidence/scripts/security_check.py
"""
from __future__ import annotations

import hashlib
import re
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

ROOT = Path(__file__).resolve().parents[3]
SECRET_NAMES = (
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "SECRET_KEY",
    "NEXTAUTH_SECRET",
    "DATABASE_URL",
)
PLACEHOLDER = re.compile(
    r"your_|change_me|changeme|example|placeholder|xxx|sk-xxx|^<.*>$", re.IGNORECASE
)


def parse_env(text: str) -> dict[str, str]:
    result = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        result[name.strip()] = value.strip().strip('"').strip("'")
    return result


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:8]


def git_env_history() -> list[dict]:
    """Lấy các dòng KEY=VALUE đã từng xuất hiện trong lịch sử file .env."""
    try:
        log = subprocess.run(
            ["git", "log", "--all", "--format=__COMMIT__%h", "-p", "--", ".env"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
    except Exception as exc:  # noqa: BLE001
        return [{"error": f"{type(exc).__name__}: {exc}"}]

    entries: list[dict] = []
    commit = None
    for line in log.stdout.splitlines():
        if line.startswith("__COMMIT__"):
            commit = line.replace("__COMMIT__", "")
            continue
        if line.startswith("+") and not line.startswith("+++") and "=" in line:
            name, value = line[1:].split("=", 1)
            name = name.strip()
            value = value.strip().strip('"').strip("'")
            if name in SECRET_NAMES and value:
                entries.append({"commit": commit, "name": name, "value": value})
    return entries


def main() -> None:
    print("== 1. File .env hiện tại ==")
    env_path = ROOT / ".env"
    current: dict[str, str] = {}
    if env_path.exists():
        current = parse_env(env_path.read_text(encoding="utf-8", errors="replace"))
        for name in SECRET_NAMES:
            if name not in current:
                continue
            value = current[name]
            real = bool(value) and not PLACEHOLDER.search(value)
            print(
                f"{name}: present=yes len={len(value)} real_value={'YES' if real else 'no'} "
                f"sha8={digest(value) if real else '-'}"
            )
    else:
        print(".env: KHONG TON TAI")

    print("\n== 2. .env.example ==")
    example = ROOT / ".env.example"
    if example.exists():
        values = parse_env(example.read_text(encoding="utf-8", errors="replace"))
        for name in SECRET_NAMES:
            if name in values:
                value = values[name]
                print(
                    f"{name}: placeholder={'yes' if not value or PLACEHOLDER.search(value) else 'NO'} len={len(value)}"
                )
    else:
        print(".env.example: KHONG TON TAI")

    print("\n== 3. Lịch sử Git của .env ==")
    history = git_env_history()
    if history and "error" in history[0]:
        print("Loi doc lich su:", history[0]["error"])
    else:
        unique = {}
        for item in history:
            unique.setdefault((item["name"], digest(item["value"])), []).append(item["commit"])
        for (name, sha8), commits in unique.items():
            same_as_current = (
                name in current
                and current[name]
                and digest(current[name]) == sha8
            )
            print(
                f"{name}: sha8={sha8} commits={len(set(commits))} "
                f"current_env_match={'YES' if same_as_current else 'no'}"
            )

    print("\n== 4. Tệp nhạy cảm đang được Git theo dõi ==")
    tracked = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    ).stdout.splitlines()
    sensitive = [
        f for f in tracked
        if f.endswith((".db", ".sqlite", ".sqlite3"))
        or f == ".env"
        or f.startswith(("venv/", ".venv/", "node_modules/", "app/venv/"))
    ]
    top_dirs = sorted({f.split("/")[0] for f in sensitive})
    print(f"Tong so file bi theo doi: {len(tracked)}")
    print(f"So file nhay cam/di ung dung bi theo doi: {len(sensitive)}")
    for d in top_dirs:
        count = sum(1 for f in sensitive if f.split("/")[0] == d)
        print(f"  {d}: {count} file")
    for f in sensitive:
        if f.endswith((".db", ".sqlite", ".sqlite3")) or f == ".env":
            print(f"  DB/ENV: {f}")

    print("\n== 5. Quét frontend (ma nguon) tim khoa ==")
    patterns = {
        "google_key": re.compile(r"AIza[0-9A-Za-z_\-]{30,}"),
        "gemini_aq": re.compile(r"AQ\.[0-9A-Za-z_\-]{40,}"),
        "openai_sk": re.compile(r"sk-[A-Za-z0-9]{20,}"),
        "gemini_env": re.compile(r"GEMINI_API_KEY"),
    }
    hits = 0
    for base in ("frontend/app", "frontend/lib", "frontend/services", "frontend/components"):
        folder = ROOT / base
        if not folder.exists():
            continue
        for path in folder.rglob("*"):
            if not path.is_file() or path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            for name, pattern in patterns.items():
                if pattern.search(text):
                    print(f"  HIT {name}: {path.relative_to(ROOT)}")
                    hits += 1
    print(f"Tong hit frontend: {hits}")

    print("\n== 6. Mat khau mac dinh trong ma nguon ==")
    for rel in ("create_admin.py", "seed.py", "seed_db.py"):
        path = ROOT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        found = re.findall(r'hash_password\("([^"]+)"\)', text)
        if found:
            print(f"  {rel}: {len(found)} mat khau mac dinh (demo), do dai: {[len(x) for x in found]}")


if __name__ == "__main__":
    main()
