# Nhật ký kiểm chứng thực tế

**Ngày chạy:** 29/10/2026
**Máy:** Windows, chạy trong thư mục `D:\Project AI SChoool\farm_backend`
**Mục đích:** ghi lại các lệnh và kết quả thật để đối chiếu với tài liệu `HIEU_HE_THONG.md`. Không có số liệu nào trong tài liệu chính là số ước lượng.

> Nguyên tắc: chỉ ghi những gì đã chạy. Phần nào chưa chạy được thì ghi "Chưa có" và nêu lý do. Không chụp/in giá trị `GEMINI_API_KEY` hay mật khẩu.

---

## 1. Phiên bản môi trường

### 1.1. Backend

Lệnh:

```bash
venv/Scripts/python.exe -c "import sys, importlib.metadata as md; ..."
```

Kết quả:

```text
PYTHON 3.12.10
fastapi 0.141.1
starlette 1.6.0
sqlalchemy 2.0.52
pydantic 2.13.4
PyJWT 2.13.0
google-genai 2.18.1
passlib 1.7.4
uvicorn 0.52.3
pytest 9.2.0
httpx 0.28.1
python-multipart 0.0.32
alembic 1.20.0
```

### 1.2. Frontend

Lệnh:

```bash
cd frontend
node -e "console.log(require('./node_modules/next/package.json').version) ..."
```

Kết quả:

```text
next 16.4.3
react 19.2.8
swr 2.5.1
typescript 5.7.3
tailwindcss 4.3.3
recharts 3.10.1
motion 12.43.0
qrcode.react 4.2.0
exceljs 4.4.0
```

### 1.3. Cấu hình

| Mục | Kết quả | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | **Có tồn tại** trong môi trường chạy (độ dài 53 ký tự) | Không in giá trị |
| `GEMINI_MODEL` trong môi trường | `gemini-flash-lite-latest` | **Không có tác dụng** vì `app/core/ai_client.py` viết cứng `gemini-2.5-flash` |
| `SECRET_KEY` | **Đang là giá trị mặc định** `your-super-secret-key-change-this-in-production` | Rủi ro nếu deploy thật |
| `requirements.txt` | **Rỗng, 0 byte** | Không tái lập được môi trường chỉ từ file này |

---

## 2. Chạy test backend

Lệnh:

```bash
venv/Scripts/python.exe -m pytest tests -q
```

Kết quả (lần chạy 29/10/2026; chạy lại sau khi hoàn thiện tài liệu vẫn 18 passed, 4.80s):

```text
18 passed, 77 warnings in 4.57s
```

Phân bố test (đếm `def test_`):

| File | Số bài |
|---|---|
| `tests/test_auth.py` | 7 |
| `tests/test_crop_batch.py` | 4 |
| `tests/test_care_log.py` | 3 |
| `tests/test_supply.py` | 2 |
| `tests/test_traceability.py` | 1 |
| `tests/test_ai_service.py` | 1 |
| **Tổng** | **18** |

Lưu ý: `test_ai_service.py` **mock** hàm gọi Gemini, không gọi API thật. Vì vậy 18 bài test chứng minh luồng/validate, **không** chứng minh chất lượng câu trả lời AI thật.

---

## 3. Kiểm tra kiểu frontend

Lệnh:

```bash
cd frontend
npx tsc --noEmit
```

Kết quả:

```text
TSC_EXIT=0
```

Không có lỗi TypeScript.

---

## 4. Đọc trực tiếp cơ sở dữ liệu `farm.db`

Lệnh (Python + sqlite3, chỉ đọc):

```python
import sqlite3
con = sqlite3.connect("farm.db")
cur = con.cursor()
```

Kết quả:

```text
TABLES 13 ['ai_suggestions', 'alembic_version', 'care_logs', 'crop_batches',
'harvest_logs', 'notifications', 'plant_varieties', 'plots', 'sales',
'supplies', 'supply_imports', 'supply_usage', 'users']

users 9
plots 7
plant_varieties 10
crop_batches 19
care_logs 63
harvest_logs 12
supplies 6
supply_imports 14
supply_usage 24
ai_suggestions 36
notifications 2
sales 12

IX_INDEXES 37
HARVEST_WITH_QR 12
ROLES [('ADMIN', 2), ('MANAGER', 3), ('STAFF', 2), ('TECHNICIAN', 2)]
```

**Diễn giải:**

- 13 bảng gồm 12 bảng nghiệp vụ + `alembic_version`.
- 37 index có tiền tố `ix_` (index do code tạo, không tính index tự động của khóa chính).
- 12/12 dòng `harvest_logs` có `qr_trace_code` — đây là dữ liệu seed, không phải do API tạo.
- 36 bản ghi `ai_suggestions` là bằng chứng các lần gọi AI đã được lưu prompt + kết quả.

---

## 5. Đo hiệu năng API đọc

### 5.1. Cách đo

- Dùng `fastapi.testclient.TestClient` chạy **trong cùng tiến trình** Python.
- CSDL thật `farm.db`.
- Token ADMIN tự sinh bằng `create_access_token({"sub": "admin@farm.com", "role": "admin"})`.
- Mỗi endpoint gọi 1 lần làm nóng, sau đó đo **5 lần**, lấy **trung vị**.
- Đếm số câu SQL bằng event `before_cursor_execute` của SQLAlchemy.

**Giới hạn:** đây không phải đo qua mạng LAN/internet hay trình duyệt. Lần gọi đầu tiên có thể chậm hơn nhiều (đã quan sát `GET /api/plots` khoảng 136 ms ở lần đầu do khởi tạo model). Khi báo cáo phải nói rõ phương pháp.

### 5.2. Kết quả

```text
/api/plots -> 200 median=9.1ms min=7.2 max=12.1 sql=2
/api/batches -> 200 median=14.8ms min=12.9 max=17.6 sql=4
/api/varieties -> 200 median=8.7ms min=6.8 max=14.8 sql=2
/api/care-logs -> 200 median=13.3ms min=10.8 max=18.0 sql=2
/api/supplies -> 200 median=8.7ms min=6.5 max=17.6 sql=2
/api/supplies/alerts -> 200 median=12.3ms min=7.3 max=18.5 sql=3
/api/harvests -> 200 median=10.2ms min=7.9 max=18.5 sql=2
/api/dashboard/harvest-chart?view=month -> 200 median=10.8ms min=8.6 max=13.3 sql=3
/api/batches/code/CB-1789654127/trace -> 200 median=11.3ms min=7.1 max=14.1 sql=3
/api/crop-batches/trace/CB-1789654127 -> 200 median=10.2ms min=9.4 max=12.6 sql=3
```

**Kết luận có thể nói:** các API đọc chính trả lời trong khoảng **8,7–14,8 ms** (trung vị, sau làm nóng), số câu SQL 2–4, không có dấu hiệu N+1.

---

## 6. Kiểm chứng lỗi API tạo thu hoạch

### 6.1. Lý do kiểm tra

Đọc code thấy `app/services/harvest.py` gọi repository với 6 tham số, trong khi `app/repositories/harvest.py` chỉ nhận 2 tham số và khuôn `HarvestCreate` không có `harvest_date`. Cần chạy thật để xác nhận, nhưng **không được làm bẩn `farm.db`**.

### 6.2. Cách làm

- Tạo CSDL SQLite **trong RAM**, tạo bảng bằng `Base.metadata.create_all`.
- Thêm 1 lô thử.
- Ghi đè dependency `get_db` và `get_current_user` (giả lập ADMIN).
- Gọi `POST /api/harvests` với `{batch_id, quantity}`.
- Không kết nối tới `farm.db` cho request này.

### 6.3. Kết quả

```text
STATUS: 500
BODY: {"status":"error","message":"Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
       "detail":"'HarvestCreate' object has no attribute 'harvest_date'"}
HARVEST_ROWS: 0
```

**Kết luận:** API tạo thu hoạch **đang lỗi thật**, không ghi được dòng nào. Giao diện hiện không gọi API này; thu hoạch trên UI được ghi qua nhật ký loại "Thu hoạch".

---

## 7. Các điểm đã đối chiếu trong mã nguồn

| Nội dung | File | Kết quả |
|---|---|---|
| Danh sách router được gắn | `app/main.py` | Có `auth, search, notification, ai_advisor, ai_alert, ai_schedule, ai_summary, traceability, supply, dashboard, harvest, plant_variety, plot, crop_batch, care_log` |
| Router **không** được gắn | `app/main.py` | `sale.py`, `user.py`, `seeds.py` không xuất hiện |
| Endpoint đánh dấu đã đọc | `app/routers/notification.py` | Chỉ có `GET /api/notifications`; không có `PUT /read-all` dù frontend gọi |
| Chứng nhận truy xuất | `app/routers/crop_batch.py` | Viết cứng `["VietGAP", "Cảnh báo dư lượng"]` |
| Thời gian cách ly | `frontend/app/trace/[batch_code]/page.tsx` | Viết cứng "Chưa đủ dữ liệu ghi nhận" |
| Kiểm tra dấu tiếng Việt | `app/services/ai_schedule.py` | Đoạn kiểm tra nằm sau `raise` trong khối `if`, không bao giờ chạy |
| Model AI | `app/core/ai_client.py` | Viết cứng `GEMINI_MODEL = "gemini-2.5-flash"` |
| Disclaimer | `app/core/ai_client.py` | `DISCLAIMER_TEXT` cố định; service tóm tắt ghi đè disclaimer của AI |
| Chat lưu lịch sử | `app/routers/ai_advisor.py` | Không ghi CSDL |
| Ảnh gửi AI | Toàn bộ `app/` | Không nơi nào gọi `call_gemini(..., image_bytes=...)`; upload chỉ lưu file |
| Biểu đồ cộng hai nguồn | `app/routers/dashboard.py` | Đọc `HarvestLog` và `CareLog` có `action_type` "Thu hoạch"; có nguy cơ cộng trùng |
| Biến môi trường `GEMINI_MODEL` | `app/core/config.py` vs `ai_client.py` | Có khai báo nhưng không dùng |
| Migration | `alembic/versions/` | 7 file |
| Xác thực ở API đọc | `app/routers/notification.py`, `app/routers/search.py` | `GET /api/notifications` và `GET /search` **không** dùng `get_current_user`; hai API trace thì cố ý công khai |
| Phạm vi lô của tóm tắt AI | `app/routers/ai_summary.py`, `app/services/ai_summary.py` | Router chỉ kiểm tra vai trò, không nhận `current_user`; service không lọc `plot_id` → STAFF tóm tắt được lô khác nếu biết ID |
| Test | `tests/` | 18 bài, tất cả pass |

---

## 8. Những gì CHƯA kiểm chứng được

| Nội dung | Lý do |
|---|---|
| Chất lượng thật của câu trả lời Gemini | Cần gọi API thật với nhiều lô và chấm điểm thủ công; repo không có bộ đánh giá |
| So sánh phiên bản prompt | Không có prompt v1/v2 và không có kết quả ghi lại |
| Đo hiệu năng qua trình duyệt/Internet | Mới đo trong tiến trình bằng TestClient |
| Chạy `next build` trong lần kiểm chứng này | Đã chạy trước đó và pass, nhưng lần này chỉ chạy `tsc --noEmit` |
| Đăng nhập bằng tài khoản demo | Mật khẩu seed không khớp với mật khẩu thử; dùng token ADMIN tự sinh để đo API đọc |
| API tạo thu hoạch hoạt động | Đã chứng minh là **lỗi 500** |
| Bán hàng | Không có router được gắn, không có UI |
| Chứng nhận VietGAP thật | Dữ liệu đang viết cứng, không có bảng chứng nhận |

---

## 9. Lệnh tái lập nhanh

```bash
# 1. Kích hoạt môi trường (Windows Git Bash)
source venv/Scripts/activate

# 2. Chạy test
python -m pytest tests -q

# 3. Chạy backend
uvicorn app.main:app --reload

# 4. Kiểm tra sức khỏe
curl http://127.0.0.1:8000/health

# 5. Chạy frontend
cd frontend
npm run dev

# 6. Kiểm tra kiểu
npx tsc --noEmit

# 7. Xem số dòng từng bảng
python - <<'EOF'
import sqlite3
con = sqlite3.connect("farm.db")
for (t,) in con.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'"):
    print(t, con.execute(f"select count(*) from {t}").fetchone()[0])
EOF
```

---

*File này chỉ ghi kết quả quan sát, không chứa khóa bí mật. Nếu chạy lại sau khi sửa code, cần cập nhật số liệu thay vì dùng lại số cũ.*
