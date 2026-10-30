"""Tạo CSDL demo SẠCH (farm_demo.db) chỉ từ bộ seed chuẩn của dự án.

Khác với farm.db (có thể chứa lô thử do người dùng tạo tay như "al", "lol",
"1", "chì chì" hoặc lô đất "66", "chì"), file này được dựng mới từ đầu bằng
``scripts/demo_data.py`` nên chỉ có dữ liệu demo có cấu trúc.

Cách dùng (chạy tại thư mục gốc dự án):

    python scripts/seed_clean_demo.py
    python scripts/seed_clean_demo.py --force   # ghi đè file demo đã có

Sau đó trỏ ứng dụng sang file demo:

    set DATABASE_URL=sqlite:///./farm_demo.db     # Windows (cmd)
    export DATABASE_URL=sqlite:///./farm_demo.db  # macOS/Linux

Script KHÔNG bao giờ mở hay sửa farm.db và không in mật khẩu ra màn hình.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from sqlalchemy import func
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import CareLog, CropBatch, HarvestLog, Plot, User
from scripts.demo_data import DEMO_USERS, build_engine, seed_demo_data

DEFAULT_OUTPUT = PROJECT_ROOT / "farm_demo.db"
JUNK_BATCH_NAMES = {"al", "lol", "1", "chì chì"}
JUNK_PLOT_NAMES = {"66", "chì"}
PROTECTED_FILES = {(PROJECT_ROOT / "farm.db").resolve()}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dựng farm_demo.db sạch từ seed chuẩn (không đụng farm.db)."
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Đường dẫn file SQLite đầu ra (mặc định: farm_demo.db).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ghi đè file demo đã tồn tại. Không áp dụng cho farm.db.",
    )
    return parser.parse_args()


def _remove_sqlite_files(path: Path) -> None:
    for candidate in (path, path.with_suffix(path.suffix + "-wal"), path.with_suffix(path.suffix + "-shm")):
        if candidate.exists():
            candidate.unlink()


def _assert_clean(session) -> tuple[dict[str, int], list[str]]:
    """Kiểm tra không còn lô/lô đất thử; trả về số đếm và danh sách lỗi."""
    problems: list[str] = []

    batches = session.query(CropBatch).all()
    for batch in batches:
        for value in (batch.batch_code, batch.name):
            if str(value or "").strip().lower() in JUNK_BATCH_NAMES:
                problems.append(f"Lô trồng còn dữ liệu thử: {value!r}")

    plots = session.query(Plot).all()
    for plot in plots:
        for value in (plot.code, plot.name):
            if str(value or "").strip().lower() in JUNK_PLOT_NAMES:
                problems.append(f"Lô đất còn dữ liệu thử: {value!r}")

    counts = {
        "users": session.query(func.count(User.id)).scalar() or 0,
        "plots": len(plots),
        "batches": len(batches),
        "care_logs": session.query(func.count(CareLog.id)).scalar() or 0,
        "harvests": session.query(func.count(HarvestLog.id)).scalar() or 0,
    }
    return counts, problems


def main() -> None:
    args = parse_args()
    if not os.getenv("DEMO_PASSWORD", "").strip():
        raise SystemExit(
            "Thiếu DEMO_PASSWORD. Đặt biến môi trường DEMO_PASSWORD trước khi "
            "dựng CSDL demo (xem .env.example)."
        )
    output = Path(args.output)
    if not output.is_absolute():
        output = (PROJECT_ROOT / output).resolve()
    else:
        output = output.resolve()

    if output in PROTECTED_FILES:
        raise SystemExit("Từ chối ghi vào farm.db. Hãy chọn file demo riêng.")
    if output.exists() and not args.force:
        raise SystemExit(
            f"{output.name} đã tồn tại. Dùng --force để ghi đè file demo này."
        )
    if output.exists():
        _remove_sqlite_files(output)

    database_url = f"sqlite:///{output.as_posix()}"
    engine = build_engine(database_url)
    try:
        Base.metadata.create_all(bind=engine)
        session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

        # seed_demo_data in mật khẩu demo; chặn stdout để không lộ ra log.
        with contextlib.redirect_stdout(io.StringIO()):
            seed_demo_data(session_factory)

        with session_factory() as session:
            counts, problems = _assert_clean(session)
            qr_count = (
                session.query(func.count(HarvestLog.id))
                .filter(HarvestLog.qr_trace_code.like("DEMO-QR-%"))
                .scalar()
                or 0
            )
    finally:
        engine.dispose()

    if problems:
        for problem in problems:
            print(f"[LỖI] {problem}")
        raise SystemExit("CSDL demo chưa sạch; không hoàn tất.")

    print("Đã tạo CSDL demo sạch:", output)
    print(
        "  {users} tài khoản, {plots} lô đất, {batches} lô trồng, "
        "{care_logs} nhật ký, {harvests} thu hoạch".format(**counts)
    )
    print(f"  Mã QR demo: {qr_count} bản ghi (DEMO-QR-001/002)")
    print("  Không có lô thử 'al', 'lol', '1', 'chì chì' hay lô đất '66', 'chì'.")
    print("  Tài khoản demo:", ", ".join(item[1] for item in DEMO_USERS))
    print("  Mật khẩu: xem README mục dữ liệu demo (không in ra log).")
    print("  Trỏ ứng dụng: đặt DATABASE_URL=sqlite:///./farm_demo.db rồi khởi động lại backend.")


if __name__ == "__main__":
    main()
