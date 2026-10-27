from typing import Optional, Union
from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.ai_client import call_gemini, DISCLAIMER_TEXT
from app.models.user import UserRole
from app.models.crop_batch import CropBatch
from app.models.care_log import CareLog

router = APIRouter(
    prefix="/api/v1/ai-advisor",
    tags=["AI Advisor"],
    dependencies=[Depends(require_roles([UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.MANAGER]))]
)

class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    batch_id: Optional[Union[int, str]] = None  # Chấp nhận cả int, string hoặc null

    @field_validator("batch_id", mode="before")
    @classmethod
    def sanitize_batch_id(cls, v):
        """Tự động chuyển chuỗi rỗng "" hoặc "1" về int/None để tránh lỗi 422"""
        if v == "" or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

def build_system_context(db: Session, batch_id: Optional[int] = None) -> str:
    """Truy vấn CSDL để lấy bối cảnh dữ liệu thực tế của trang trại."""
    context_lines = ["Dưới đây là thông tin thực tế từ hệ thống quản lý trang trại:"]

    if batch_id:
        batch = db.query(CropBatch).filter(CropBatch.id == batch_id).first()
        if batch:
            batch_name = getattr(batch, "name", f"Lô {batch.id}")
            planting_date = getattr(batch, "planting_date", "Chưa rõ")
            context_lines.append(
                f"- Lô đang chọn: ID {batch.id}, Tên/Mã lô: {batch_name}, Ngày gieo: {planting_date}"
            )

            # Xác định cột sắp xếp an toàn cho CareLog
            if hasattr(CareLog, "batch_id"):
                order_col = getattr(
                    CareLog, "log_date", 
                    getattr(CareLog, "logged_at", getattr(CareLog, "created_at", CareLog.id))
                )
                logs = (
                    db.query(CareLog)
                    .filter(CareLog.batch_id == batch_id)
                    .order_by(order_col.desc())
                    .limit(3)
                    .all()
                )
                if logs:
                    context_lines.append("  + Hoạt động chăm sóc gần đây:")
                    for log in logs:
                        log_date = getattr(
                            log, "log_date",
                            getattr(log, "logged_at", getattr(log, "created_at", "N/A"))
                        )
                        action = getattr(log, "action_type", "Chăm sóc")
                        notes = getattr(log, "notes", "")
                        context_lines.append(f"    * Ngày {log_date}: {action} - {notes}")
    else:
        batches = db.query(CropBatch).all()
        if batches:
            context_lines.append("- Danh sách các lô hiện có trong hệ thống:")
            for b in batches[:10]:
                b_name = getattr(b, "name", f"Lô {b.id}")
                b_status = getattr(b, "status", "Đang hoạt động")
                context_lines.append(f"  + {b_name} (ID: {b.id}): Trạng thái {b_status}")
        else:
            context_lines.append("- Hiện chưa có dữ liệu lô trồng trong hệ thống.")

    return "\n".join(context_lines)

@router.post("/chat")
def chat_with_advisor(payload: ChatRequest, db: Session = Depends(get_db)):
    user_prompt = payload.message or payload.prompt or ""

    if not user_prompt.strip():
        return {
            "reply": "Vui lòng nhập câu hỏi.",
            "response": "Vui lòng nhập câu hỏi.",
            "disclaimer": DISCLAIMER_TEXT
        }

    # 1. Trích xuất dữ liệu từ Database làm ngữ cảnh
    db_context = build_system_context(db, batch_id=payload.batch_id)

    # 2. Ghép dữ liệu CSDL vào System Prompt
    system_prompt = (
        "Bạn là chuyên gia cố vấn nông nghiệp thông minh của trang trại GreenFarm.\n"
        "Hãy dựa vào dữ liệu hệ thống được cung cấp dưới đây để trả lời chính xác câu hỏi của người dùng.\n"
        "Nếu người dùng hỏi về lô cây cụ thể, hãy kiểm tra danh sách bên dưới trước khi trả lời.\n\n"
        f"{db_context}"
    )

    # 3. Gửi sang Gemini
    ai_reply = call_gemini(
        system_prompt=system_prompt,
        user_prompt=user_prompt
    )

    return {
        "reply": ai_reply,
        "response": ai_reply,
        "disclaimer": DISCLAIMER_TEXT
    }