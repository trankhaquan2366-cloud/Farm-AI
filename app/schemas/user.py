from pydantic import BaseModel, Field
from typing import Literal

Role = Literal["quan_ly", "ky_thuat_vien", "nhan_vien"]


class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    full_name: str = Field(..., min_length=1)
    role: Role


class UserCreate(UserBase):
    # Nhận password thô từ client, sẽ băm (hash) ở Service trước khi lưu -
    # Repository/Model KHÔNG BAO GIỜ được thấy password dạng chữ thường.
    password: str = Field(..., min_length=6)


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True
        # Cố tình KHÔNG có password / password_hash trong UserOut
        # -> đảm bảo API không bao giờ trả mật khẩu ra ngoài, dù đã hash.
