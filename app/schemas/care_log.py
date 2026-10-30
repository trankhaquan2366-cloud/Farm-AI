from datetime import date, datetime
from typing import Any, List, Optional, Union

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    field_validator,
    model_validator,
)

# Danh sách loại hoạt động được phép ghi nhật ký.
# Chấp nhận cả nhãn tiếng Việt đang dùng trên giao diện và khóa tiếng Anh chuẩn.
ALLOWED_ACTION_TYPES = {
    # Tiếng Việt (giao diện hiện tại)
    "tưới nước",
    "bón phân",
    "phun thuốc",
    "kiểm tra sâu bệnh",
    "bệnh hại",
    "thu hoạch",
    "khác",
    # Khóa chuẩn tiếng Anh / không dấu
    "watering",
    "fertilizing",
    "fertilising",
    "pest_check",
    "pest check",
    "harvest",
    "other",
    "tuoi",
    "bon_phan",
    "kiem_tra_sau_benh",
    "thu_hoach",
    "khac",
}


def validate_action_type(value: str) -> str:
    cleaned = value.strip()
    if cleaned.lower() not in ALLOWED_ACTION_TYPES:
        raise ValueError(
            "action_type không hợp lệ. Chỉ chấp nhận: tưới nước, bón phân, "
            "phun thuốc/kiểm tra sâu bệnh, thu hoạch, khác."
        )
    return cleaned


class CareLogSupplyUsage(BaseModel):
    supply_id: int = Field(gt=0)
    quantity_used: float = Field(gt=0, allow_inf_nan=False)
    notes: Optional[str] = Field(default=None, max_length=2000)

    model_config = ConfigDict(strict=True, extra="forbid")


class CareLogCreate(BaseModel):
    batch_id: Union[StrictInt, StrictStr] = Field(
        validation_alias=AliasChoices("batch_id", "crop_batch_id")
    )
    log_date: Optional[date] = Field(default=None, strict=False)
    action_type: str = Field(min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=2000)
    quantity: Optional[float] = Field(
        default=None,
        gt=0,
        allow_inf_nan=False,
    )
    quality_percent: Optional[float] = Field(default=None, ge=0, le=100)
    image_url: Optional[str] = Field(default=None, max_length=255)
    supply_usages: List[CareLogSupplyUsage] = Field(default_factory=list)

    model_config = ConfigDict(strict=True, extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if "batch_id" not in normalized and "crop_batch_id" in normalized:
            normalized["batch_id"] = normalized.pop("crop_batch_id")

        for alias in ("activity_type", "action", "actionType", "activity"):
            if alias in normalized:
                if "action_type" not in normalized:
                    normalized["action_type"] = normalized[alias]
                normalized.pop(alias)

        if "notes" not in normalized:
            for alias in ("description", "note"):
                if alias in normalized:
                    normalized["notes"] = normalized[alias]
                    break
        normalized.pop("description", None)
        normalized.pop("note", None)

        if "log_date" not in normalized and "date" in normalized:
            normalized["log_date"] = normalized["date"]
        normalized.pop("date", None)
        return normalized

    @field_validator("action_type")
    @classmethod
    def check_action_type(cls, value: str) -> str:
        return validate_action_type(value)


class CareLogUpdate(BaseModel):
    batch_id: Optional[int] = Field(
        default=None,
        gt=0,
        validation_alias=AliasChoices("batch_id", "crop_batch_id"),
    )
    log_date: Optional[date] = Field(default=None, strict=False)
    action_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=2000)
    quantity: Optional[float] = Field(
        default=None,
        gt=0,
        allow_inf_nan=False,
    )
    quality_percent: Optional[float] = Field(default=None, ge=0, le=100)
    image_url: Optional[str] = Field(default=None, max_length=255)

    model_config = ConfigDict(strict=True, extra="forbid")

    @field_validator("action_type")
    @classmethod
    def check_action_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return validate_action_type(value)


class CareLogResponse(BaseModel):
    id: int
    batch_id: int
    action_type: str
    log_date: Optional[date] = None
    notes: Optional[str] = None
    quantity: Optional[float] = None
    quality_percent: Optional[float] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(strict=True, extra="forbid", from_attributes=True)
