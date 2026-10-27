from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.schemas.ai_summary import AiSummaryOut
from app.services import ai_summary as service
from app.models.user import UserRole
router = APIRouter(prefix="/api/ai", tags=["AI - Tóm tắt nhật ký"])

router = APIRouter(
    prefix="/api/ai-summary",
    tags=["AI Summary"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN]))] # 👈 THÊM DÒNG NÀY
)
@router.post("/batches/{batch_id}/summary", response_model=AiSummaryOut)
def summarize_batch(batch_id: int, db: Session = Depends(get_db)):
    """
    Sinh tóm tắt tham khảo cho nhật ký chăm sóc của 1 lô trồng.
    Luôn trả kèm disclaimer bắt buộc theo yêu cầu đề bài.
    """
    return service.summarize_batch(db, batch_id)
