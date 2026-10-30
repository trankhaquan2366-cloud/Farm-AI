# Báo cáo quét bảo mật

- **Ngày quét đầu:** 2026-10-30 (trước khi sửa Prompt 1–4).
- **Ngày quét lại:** 2026-10-30 (sau khi sửa Prompt 1–5).
- **Phạm vi:** mã nguồn backend, frontend, cấu hình Docker, `.gitignore`, `.env.example`, lịch sử Git, các tệp đang được Git theo dõi.
- **Cách quét:** `docs/evidence/scripts/security_check.py` (không in giá trị bí mật, chỉ in tên biến, độ dài, 8 ký tự hash) + kiểm tra thủ công các tệp cấu hình.
- **Nguyên tắc:** báo cáo này **không chứa giá trị khóa API, mật khẩu hay token**.

## 1. Cảnh báo còn hiệu lực: khóa Gemini từng bị commit

`GEMINI_API_KEY` thật đã từng nằm trong file `.env` được commit lên Git.

| Thông tin | Giá trị |
|---|---|
| Số commit chứa khóa cũ | 3 |
| SHA-256 rút gọn của khóa cũ | `950605f5` |
| File `.env` được sửa trong bao nhiêu commit | 5 (`27dfcdca`, `a6cb3bd2`, `6d2831f9`, `5cbc4c2e`, `18ba4e0b`) |
| Khóa đang dùng trong `.env` hiện tại | Khác khóa cũ (sha8 `54171914`), **không** xuất hiện trong lịch sử Git |
| `.env` hiện có đang bị Git theo dõi? | **Không** |

**Kết luận:** khóa cũ vẫn nằm trong lịch sử Git của repo. Nếu repo đã được đẩy lên GitHub (kể cả private), phải coi khóa này là **đã lộ**.

**Việc cần làm ngay:**

1. Vào Google AI Studio → API Keys → **thu hồi (revoke)** khóa cũ.
2. Tạo khóa mới, chỉ đặt trong `.env` local hoặc biến môi trường của nền tảng triển khai.
3. Nếu muốn xóa khỏi lịch sử: dùng `git filter-repo --path .env --invert-paths` (hoặc BFG), sau đó force-push và thông báo cho mọi thành viên clone lại. Việc xóa lịch sử **không thay thế** việc thu hồi khóa.
4. Bật cảnh báo chi tiêu/giới hạn quota cho khóa mới.

> Ghi chú trung thực: Prompt 5 **không chạy** `git filter-repo`, `force-push` hay bất kỳ lệnh xóa lịch sử nào. Các lệnh trong mục này chỉ là đề xuất để nhóm thực hiện sau khi thống nhất và sao lưu.

## 2. Bảng phát hiện và trạng thái sau khắc phục

| Mã | Mức | Phát hiện | Bằng chứng ban đầu | Trạng thái 2026-10-30 |
|---|---|---|---|---|
| S1 | **Nghiêm trọng** | Khóa Gemini thật trong lịch sử Git | Mục 1; `security_check.py` mục 3 | **Chưa xử lý được bằng code** — cần thu hồi khóa và (tùy chọn) xóa lịch sử; chưa chạy lệnh phá hủy lịch sử |
| S2 | **Nghiêm trọng** | `SECRET_KEY` JWT dùng giá trị mặc định công khai | `app/core/security.py` (bản cũ) | **Đã sửa**: không còn giá trị mặc định dùng được; thiếu `SECRET_KEY` thì dừng khởi động khi `DEBUG=False`; chỉ dùng khóa tạm khi `DEBUG=True`; hạn token mặc định 60 phút |
| S3 | Cao | 18.431 tệp thư viện và 2 CSDL bị Git theo dõi | `security_check.py` mục 4 (bản cũ) | **Đã sửa một phần**: đã `git rm -r --cached` cho `venv`, `.venv`, `app/venv`, `__pycache__`, `*.pyc`, `farm.db`, `app.db`; quét lại còn **0 tệp nhạy cảm** trong index. Lịch sử Git vẫn còn các blob cũ |
| S4 | Cao | Trang truy xuất công khai tự gắn nhãn “VietGAP”, “Cảnh báo dư lượng” | `app/routers/crop_batch.py` (bản cũ) | **Đã sửa** ở Prompt 4: `safety_certifications` chỉ trả dữ liệu thật, danh sách rỗng khi không có |
| S5 | Trung bình | JWT lưu trong `localStorage` và cookie do JavaScript tạo, không `HttpOnly`/`Secure` | `frontend/app/login/page.tsx`, `frontend/lib/api.ts` | **Chưa sửa** — cần đổi kiến trúc phiên đăng nhập, ngoài phạm vi Phase B |
| S6 | Trung bình | CORS cho phép mọi origin kèm credentials | `app/main.py` (bản cũ) | **Đã sửa**: đọc `CORS_ORIGINS` (mặc định `http://localhost:3000`), không dùng `*` |
| S7 | Trung bình | Không có giới hạn số lần đăng nhập | Không tìm thấy rate limit | **Đã sửa**: giới hạn 5 lần/phút/IP cho `POST /api/auth/login`, trả 429 kèm `Retry-After`; có test |
| S8 | Trung bình | Mật khẩu demo hard-code và script tự đặt lại mật khẩu | `create_admin.py`, `scripts/demo_data.py` (bản cũ) | **Đã sửa**: mật khẩu lấy từ `DEMO_PASSWORD`; khi `DEBUG=False` không đặt lại mật khẩu tài khoản đã tồn tại; không in mật khẩu ra log |
| S9 | Trung bình | API truy xuất công khai trả cả `notes` và `image_url` | `app/routers/crop_batch.py` (bản cũ) | **Đã sửa** ở Prompt 4: lịch sử chăm sóc công khai chỉ còn `action_type`, `summary`, `logged_at`; QR công khai dùng whitelist trường |
| S10 | Thấp | Container backend chạy bằng root | `app/Dockerfile` (bản cũ) | **Đã sửa**: tạo `appuser` UID 10001, `chown` thư mục uploads, `USER appuser` |
| S11 | Thấp | `.gitignore` thiếu mẫu cho thư mục gốc | `.gitignore` (bản cũ) | **Đã sửa**: bổ sung `__pycache__/`, `*.pyc`, `venv/`, `.venv/`, `*.db`, `*.sqlite3`, `.pytest_cache/`, `frontend/.next/`, `frontend/tsconfig.tsbuildinfo`, `app/uploads/` |
| S12 | Thấp | `DEBUG=True` trong `.env.example` | `.env.example` (bản cũ) | **Đã sửa**: `DEBUG=False`; `SECRET_KEY` ghi rõ bắt buộc; thêm `DEMO_PASSWORD`, `LOGIN_RATE_LIMIT_PER_MINUTE`, `CORS_ORIGINS` |

### Phát hiện mới ghi nhận trong Prompt 5 (chưa sửa)

| Mã | Mức | Phát hiện | Bằng chứng | Xử lý đề xuất |
|---|---|---|---|---|
| N1 | Trung bình | `create_admin.py` có câu `UPDATE users SET role = 'MANAGER' WHERE role = 'ADMIN'` — chạy script này trên CSDL thật sẽ **hạ quyền toàn bộ tài khoản ADMIN cũ** | Chạy thử trên bản sao CSDL: hash mật khẩu giữ nguyên `24b03b07`, nhưng role đếm được đổi từ `ADMIN 2 / MANAGER 3` sang `ADMIN 1 / MANAGER 4` | Chỉ chạy migration role khi `DEBUG=True`, hoặc bỏ hẳn câu lệnh; nằm ngoài phạm vi Prompt 5 nên **chưa sửa** |
| N2 | Thấp | Rate limit lưu trong bộ nhớ từng tiến trình | `app/core/rate_limit.py` dùng `dict` + `deque` | Nếu chạy nhiều worker (`uvicorn --workers N`) thì mỗi worker đếm riêng; production nên dùng Redis hoặc slowapi có backend dùng chung |

## 3. Kết quả quét lại (số liệu thật)

Lệnh đã chạy:

```bash
venv/Scripts/python.exe docs/evidence/scripts/security_check.py
```

Kết quả rút gọn (không có giá trị bí mật):

```text
== 1. File .env hiện tại ==
GEMINI_API_KEY: present=yes len=53 real_value=YES sha8=54171914
== 2. .env.example ==
GEMINI_API_KEY: placeholder=yes len=24
OPENAI_API_KEY: placeholder=yes len=24
SECRET_KEY: placeholder=yes len=45
DATABASE_URL: placeholder=NO len=19          # sqlite:///./farm.db, không phải bí mật
== 3. Lịch sử Git của .env ==
GEMINI_API_KEY: sha8=950605f5 commits=3 current_env_match=no
== 4. Tệp nhạy cảm đang được Git theo dõi ==
Tong so file bi theo doi: 187
So file nhay cam/di ung dung bi theo doi: 0
== 5. Quét frontend (ma nguon) tim khoa ==
Tong hit frontend: 0
== 6. Mat khau mac dinh trong ma nguon ==
(không còn mẫu hash_password("...") trong create_admin.py, seed.py, seed_db.py)
```

So sánh trước/sau khi dọn index Git:

| Chỉ số | Trước Prompt 5 | Sau Prompt 5 |
|---|---|---|
| Tệp đang bị Git theo dõi | 18.951 | 187 |
| Tệp nhạy cảm/không cần theo dõi | 18.764 (3 venv, `__pycache__`, `farm.db`, `app.db`, bản sao `.next`) | 0 |
| `.env` bị theo dõi | Không | Không |
| Tệp CSDL bị theo dõi | `farm.db`, `app.db` | Không |

Xác nhận không xóa dữ liệu trên đĩa: sau `git rm -r --cached`, các thư mục `venv/`, `.venv/`, `app/venv/`, `farm_backend/` và hai tệp `farm.db` (307.200 byte), `app.db` vẫn còn nguyên trên đĩa; `farm.db` giữ nguyên mtime.

## 4. Những điểm đã kiểm tra và **không** phát hiện vấn đề

| Hạng mục | Kết quả |
|---|---|
| Khóa API trong mã nguồn frontend (`frontend/app`, `lib`, `services`, `components`) | 0 hit với mẫu `AIza...`, `AQ....`, `sk-...`, `GEMINI_API_KEY` |
| `frontend/.env.local` | Không bị Git theo dõi; không chứa bí mật |
| `.env.example` | Các giá trị đều là placeholder |
| Mật khẩu trong CSDL | Lưu bằng PBKDF2-SHA256/bcrypt qua `passlib`, không lưu mật khẩu thô |
| Phân quyền | Kiểm tra role ở server qua `RequireRole`, role đọc lại từ DB; có test 403 cho staff ngoài lô và endpoint quản trị |
| Upload ảnh | Kiểm tra MIME, magic bytes và giới hạn 5 MB, có test ảnh giả |
| SQL injection | Dùng SQLAlchemy ORM, không nối chuỗi SQL thủ công trong `app/` |
| `SECRET_KEY` khi khởi động | Kiểm chứng bằng subprocess: thiếu khóa + `DEBUG=False` → exit 1; `DEBUG=True` → import được và in cảnh báo (mã hóa UTF-8 an toàn trên console Windows) |

## 5. Cách khắc phục còn lại (đề xuất, chưa chạy)

### 5.1. Thu hồi khóa và đặt `SECRET_KEY`

```bash
# 1. Thu hồi khóa cũ trên Google AI Studio (thao tác trên web, không phải lệnh)
# 2. Sinh SECRET_KEY mạnh và thêm vào .env local / biến môi trường deploy
openssl rand -hex 32
```

Thêm vào `.env` (không commit):

```dotenv
SECRET_KEY=<chuỗi 64 ký tự vừa sinh>
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 5.2. Xóa `.env` khỏi lịch sử Git (chỉ chạy khi đã sao lưu và thống nhất nhóm)

```bash
# ĐỀ XUẤT — KHÔNG chạy trong Prompt 5
git filter-repo --path .env --invert-paths
# sau đó: force-push và thông báo mọi thành viên clone lại
```

Việc xóa lịch sử **không thay thế** việc thu hồi khóa. Nếu chưa thu hồi, khóa vẫn dùng được dù đã xóa khỏi lịch sử.

### 5.3. Phiên đăng nhập (S5)

- Chuyển sang cookie `HttpOnly; Secure; SameSite=Strict` do backend đặt, hoặc giữ token trong bộ nhớ và dùng refresh token.
- Thêm CSP cho frontend.

### 5.4. Rate limit phân tán (N2)

- Nếu chạy nhiều worker/instance, thay bộ đếm trong bộ nhớ bằng Redis hoặc slowapi với storage dùng chung.

## 6. Kết luận

Sau Prompt 5, các lỗi có thể sửa bằng mã nguồn/cấu hình trong repo (S2, S4, S6, S7, S8, S9, S10, S11, S12) đã được xử lý và có kiểm chứng lại. Hai việc **không thể hoàn tất bằng commit**: thu hồi khóa Gemini cũ (S1) và xóa blob khóa khỏi lịch sử Git. Repo hiện không còn theo dõi `.env`, CSDL hay thư viện cài đặt (0 tệp nhạy cảm trong index), nhưng lịch sử cũ vẫn chứa dữ liệu nhạy cảm.

Chi tiết máy đọc: chạy lại `venv/Scripts/python.exe docs/evidence/scripts/security_check.py`.
