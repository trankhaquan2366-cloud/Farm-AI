from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import UserRole
from app.schemas.ai_alert import AiAlertOut
from app.services import ai_alert as service

router = APIRouter(
    prefix="/api/ai-alert",
    tags=["AI Alert"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN]))]
)

@router.post("/alerts", response_model=AiAlertOut)
def suggest_batches_to_check(db: Session = Depends(get_db)):
    """
    Xếp hạng tối đa 5 lô đang trồng cần kiểm tra ưu tiên nhất, dựa trên
    2 chỉ số khách quan: số ngày chưa chăm sóc + có cảnh báo sâu bệnh gần đây.
    """
    return service.suggest_batches_to_check(db)
