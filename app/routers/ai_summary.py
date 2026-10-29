from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import UserRole
from app.schemas.ai_summary import AiSummaryOut, BatchSummaryRequest
from app.services import ai_summary as service

ROLE_DEPENDENCIES = [
    Depends(
        require_roles(
            [UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF]
        )
    )
]


def _extract_identifier(request: BatchSummaryRequest):
    """Ưu tiên lot_id, sau đó crop_batch_id, cuối cùng là batch_id."""
    for value in (request.lot_id, request.crop_batch_id, request.batch_id):
        if value is not None and str(value).strip() != "":
            return value
    return ""


def summarize_by_path(
    batch_id: str,
    db: Session = Depends(get_db),
) -> AiSummaryOut:
    """Nhận ID số (2) hoặc mã/tên lô ("a1", "LO-309", "CB-1789654127")."""
    return service.summarize_batch(db, batch_id)


def summarize_by_body(
    request: BatchSummaryRequest,
    db: Session = Depends(get_db),
) -> AiSummaryOut:
    return service.summarize_batch(db, _extract_identifier(request))


def _register_routes(target: APIRouter) -> APIRouter:
    target.add_api_route(
        "/batches/{batch_id}/summary",
        summarize_by_path,
        methods=["POST"],
        response_model=AiSummaryOut,
        summary="Tóm tắt nhật ký theo batch id trong URL",
    )
    target.add_api_route(
        "/summary",
        summarize_by_body,
        methods=["POST"],
        response_model=AiSummaryOut,
        summary="Tóm tắt nhật ký theo body {lot_id | crop_batch_id | batch_id}",
    )
    return target


# Giữ nguyên prefix cũ (/api/ai-summary) và bổ sung alias /api/v1/ai-summary
router = _register_routes(
    APIRouter(prefix="/api/ai-summary", tags=["AI Summary"], dependencies=ROLE_DEPENDENCIES)
)
router_v1 = _register_routes(
    APIRouter(prefix="/api/v1/ai-summary", tags=["AI Summary"], dependencies=ROLE_DEPENDENCIES)
)
