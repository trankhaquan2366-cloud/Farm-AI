"""Giới hạn số lần đăng nhập theo IP (bộ đếm trong bộ nhớ, không cần Redis).

Mặc định 5 lần/phút/IP, cấu hình bằng LOGIN_RATE_LIMIT_PER_MINUTE.
Bộ đếm chỉ dùng cho một tiến trình; nếu chạy nhiều worker/instance thì mỗi
tiến trình đếm riêng (ghi rõ trong tài liệu).
"""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

LOGIN_RATE_LIMIT = max(1, int(os.getenv("LOGIN_RATE_LIMIT_PER_MINUTE", "5")))
WINDOW_SECONDS = 60
_attempts: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Chỉ dùng địa chỉ kết nối thực tế; không tin X-Forwarded-For vì client
    # có thể tự đặt header này để né giới hạn.
    return request.client.host if request.client else "unknown"


def enforce_login_rate_limit(request: Request) -> None:
    """Ghi nhận một lần thử đăng nhập; vượt ngưỡng thì trả 429."""
    ip = _client_ip(request)
    now = time.monotonic()
    bucket = _attempts[ip]
    while bucket and now - bucket[0] >= WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= LOGIN_RATE_LIMIT:
        retry_after = max(1, int(WINDOW_SECONDS - (now - bucket[0])) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều lần đăng nhập. Vui lòng thử lại sau ít phút.",
            headers={"Retry-After": str(retry_after)},
        )
    bucket.append(now)


def reset_login_rate_limit() -> None:
    """Xóa bộ đếm (dùng trong test)."""
    _attempts.clear()
