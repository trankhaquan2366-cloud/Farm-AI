from datetime import date, datetime
from typing import Any, List, Optional, Union

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    model_validator,
)


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
