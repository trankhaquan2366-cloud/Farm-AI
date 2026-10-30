from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.crop_batch import CropBatch
from app.models.harvest import HarvestLog

router = APIRouter()

MAX_RESULTS = 20
MAX_TITLE_LENGTH = 80


def _short_title(harvest: HarvestLog) -> str:
    """Tiêu đề ngắn, không chứa ghi chú tự do của bản ghi gốc."""
    quantity = float(harvest.quantity or 0)
    unit = harvest.unit or "kg"
    title = f"Thu hoạch {quantity:g} {unit}"
    if harvest.grade:
        title = f"{title} - {harvest.grade}"
    return title[:MAX_TITLE_LENGTH]


@router.get("/search")
def global_search(
    q: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    keyword = (q or "").strip()
    if not keyword:
        return {"results": []}

    like = f"%{keyword}%"
    query = (
        db.query(HarvestLog, CropBatch)
        .join(CropBatch, HarvestLog.batch_id == CropBatch.id)
        .filter(
            or_(
                HarvestLog.notes.ilike(like),
                CropBatch.batch_code.ilike(like),
                CropBatch.name.ilike(like),
            )
        )
    )

    # STAFF chỉ tìm trong lô được phân công; không có lô thì không trả kết quả.
    role = str(current_user.get("role", "")).strip().lower()
    if role in {"staff", "worker"}:
        plot_id = current_user.get("plot_id")
        if plot_id is None:
            return {"results": []}
        query = query.filter(CropBatch.plot_id == plot_id)

    rows = query.order_by(HarvestLog.harvest_time.desc()).limit(MAX_RESULTS).all()

    # Chỉ trả trường tối thiểu: id, loại, tiêu đề ngắn, mã lô.
    # Không trả notes, qr_trace_code hay toàn bộ bản ghi.
    return {
        "results": [
            {
                "id": harvest.id,
                "type": "harvest",
                "title": _short_title(harvest),
                "batch_code": batch.batch_code,
            }
            for harvest, batch in rows
        ]
    }
