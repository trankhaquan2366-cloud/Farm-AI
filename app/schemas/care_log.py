from datetime import date, datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict, model_validator


class CareLogBase(BaseModel):
    batch_id: Optional[int] = None
    crop_batch_id: Optional[int] = None
    log_date: Optional[str] = None
    action_type: Optional[str] = None
    activity_type: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = 0
    image_url: Optional[str] = None


class CareLogSupplyUsage(BaseModel):
    supply_id: int
    quantity_used: float
    notes: Optional[str] = None


class CareLogCreate(CareLogBase):
    supply_usages: List[CareLogSupplyUsage] = []
    @model_validator(mode='before')
    @classmethod
    def normalize_data(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Đồng bộ batch_id & crop_batch_id
            raw_batch_id = data.get("batch_id") or data.get("crop_batch_id")
            if raw_batch_id is not None:
                try:
                    parsed_id = int(raw_batch_id)
                    data["batch_id"] = parsed_id
                    data["crop_batch_id"] = parsed_id
                except (ValueError, TypeError):
                    pass

            # 2. Map tất cả tên trường hành động về cả action_type và activity_type
            action_val = (
                data.get("action_type")
                or data.get("activity_type")
                or data.get("action")
                or data.get("actionType")
                or data.get("activity")
            )
            final_action = str(action_val) if action_val else "Tưới nước"
            data["action_type"] = final_action
            data["activity_type"] = final_action

            # 3. Map các dạng tên ghi chú (description / note / notes)
            note_val = (
                data.get("notes")
                or data.get("description")
                or data.get("note")
            )
            final_notes = str(note_val) if note_val is not None else ""
            data["notes"] = final_notes
            data["description"] = final_notes

            # 4. Map date -> log_date (gán ngày hiện tại nếu trống)
            date_val = data.get("log_date") or data.get("date")
            data["log_date"] = str(date_val) if date_val else date.today().isoformat()

            # 5. Đảm bảo có trường quantity (tránh lỗi validation nếu DB bắt buộc)
            if "quantity" in data and data["quantity"] is not None:
                try:
                    data["quantity"] = int(data["quantity"])
                except (ValueError, TypeError):
                    data["quantity"] = 0
            else:
                data["quantity"] = 0

        return data


class CareLogUpdate(BaseModel):
    batch_id: Optional[int] = None
    log_date: Optional[str] = None
    action_type: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[int] = None
    image_url: Optional[str] = None


class CareLogResponse(BaseModel):
    id: int
    batch_id: int
    action_type: str
    log_date: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[int] = 0
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)