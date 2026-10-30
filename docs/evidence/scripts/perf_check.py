"""Đo hiệu năng API đọc trên CSDL demo (không ghi dữ liệu).

Phương pháp giống KIEM_CHUNG_THUC_TE.md mục 5:
- TestClient chạy trong cùng tiến trình
- 1 lần làm nóng, đo 5 lần, lấy trung vị
- đếm số câu SQL bằng event before_cursor_execute

Chạy: DATABASE_URL=sqlite:///./farm_demo.db venv/Scripts/python.exe docs/evidence/scripts/perf_check.py
"""
from __future__ import annotations

import os
import statistics
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("SECRET_KEY", "perf-check-only-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite:///./farm_demo.db")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import event  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.main import app  # noqa: E402
from app.models import CropBatch  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402


class SqlCounter:
    def __init__(self) -> None:
        self.count = 0

    def reset(self) -> None:
        self.count = 0


counter = SqlCounter()


@event.listens_for(engine, "before_cursor_execute")
def _count_sql(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
    counter.count += 1


def main() -> None:
    token = create_access_token({"sub": "demo_admin@greenfarm.local", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}

    with Session(engine) as session:
        batch = (
            session.query(CropBatch)
            .filter(CropBatch.batch_code.isnot(None))
            .order_by(CropBatch.id)
            .first()
        )
        if batch is None:
            print("KHÔNG CÓ LÔ TRỒNG TRONG CSDL")
            raise SystemExit(1)
        batch_code = batch.batch_code

    paths = [
        "/api/plots",
        "/api/batches",
        "/api/varieties",
        "/api/care-logs",
        "/api/supplies",
        "/api/supplies/alerts",
        "/api/harvests",
        "/api/dashboard/harvest-chart?view=month",
        f"/api/batches/code/{batch_code}/trace",
        f"/api/crop-batches/trace/{batch_code}",
    ]

    print(f"DATABASE_URL={os.environ['DATABASE_URL']}")
    print(f"BATCH_CODE={batch_code}")

    with TestClient(app) as client:
        for path in paths:
            warm = client.get(path, headers=headers)
            durations: list[float] = []
            sql_counts: list[int] = []
            for _ in range(5):
                counter.reset()
                started = time.perf_counter()
                response = client.get(path, headers=headers)
                elapsed_ms = (time.perf_counter() - started) * 1000
                durations.append(elapsed_ms)
                sql_counts.append(counter.count)
                if response.status_code != 200:
                    break
            status = response.status_code
            median = statistics.median(durations)
            print(
                f"{path} -> {status} median={median:.1f}ms "
                f"min={min(durations):.1f} max={max(durations):.1f} "
                f"sql={int(statistics.median(sql_counts))} "
                f"(warm={warm.status_code})"
            )


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass
    main()
