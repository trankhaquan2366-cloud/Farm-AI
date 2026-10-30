"""Chuẩn hóa trạng thái tiếng Việt để so sánh không phụ thuộc dấu/hoa thường.

SQLite `ilike` không xử lý đúng chữ "Đ" trong dữ liệu tiếng Việt, nên các bộ
lọc trạng thái được thực hiện ở Python sau khi chuẩn hóa. Hàm này chỉ dùng cho
so sánh nội bộ, không ghi đè giá trị trạng thái đang lưu trong CSDL.
"""
from __future__ import annotations

import re
import unicodedata

# Tập trạng thái được coi là "đang canh tác", đã chuẩn hóa (bỏ dấu, chữ thường).
GROWING_STATUS_KEYS = frozenset(
    {
        "dang sinh truong",
        "dang trong",
        "dang canh tac",
        "dang cham soc",
        "growing",
        "planting",
        "active",
    }
)


def normalize_status(value: object) -> str:
    """Bỏ dấu, hạ chữ thường, gộp khoảng trắng và chuẩn hóa 'đ' thành 'd'."""
    text = str(value or "").strip().lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"\s+", " ", text).strip()


# Tập trạng thái được coi là "đã thu hoạch", đã chuẩn hóa.
HARVESTED_STATUS_KEYS = frozenset(
    {
        "da thu hoach",
        "thu hoach",
        "harvested",
        "harvest",
    }
)


def is_growing_status(value: object) -> bool:
    return normalize_status(value) in GROWING_STATUS_KEYS


def is_harvested_status(value: object) -> bool:
    return normalize_status(value) in HARVESTED_STATUS_KEYS
