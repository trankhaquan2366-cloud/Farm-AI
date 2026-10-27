from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import UserRole
from app.schemas.ai_schedule import AiScheduleOut
from app.services import ai_schedule as service

router = APIRouter(
    prefix="/api/ai-schedule", # Hoặc prefix tương ứng của bạn
    tags=["AI Schedule"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN]))]
)


@router.post("/batches/{batch_id}/schedule", response_model=AiScheduleOut)
def generate_schedule(batch_id: int, db: Session = Depends(get_db)):
    """
    Sinh lịch chăm sóc tham khảo cho 1 lô trồng, dựa trên giống cây + ngày gieo.
    Ngày thực tế của từng mốc do backend tự tính (không tin AI tính ngày).
    """
    return service.generate_schedule(db, batch_id)
