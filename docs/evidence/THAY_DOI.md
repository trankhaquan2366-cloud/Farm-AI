# THAY_DOI.md — Nhật ký sửa lỗi và kiểm chứng

Nhánh làm việc: `fix/pre-report` (tạo từ `main` ngày 2026-10-30, không tác động `main`).
Database trước khi sửa: `docs/evidence/backup/farm_before_fix.db` (bản sao của `farm.db`, 300 KB).
Mọi kết quả dưới đây là kết quả chạy thật trên máy, không suy diễn.

## 0. Baseline trước khi sửa

Lệnh: `venv/Scripts/python.exe -m pytest -q`

Kết quả: **47 passed, 15 xfailed, 131 warnings in 12.89s** (exit code 0).

Danh sách 15 xfail được ghi trong `TEST_EVIDENCE.md`; các mục sẽ xử lý theo từng prompt bên dưới.

---

## 1. Prompt 1 — AI chạy được trên giao diện

### 1.1. Kế hoạch ngắn

- Đọc model AI từ biến môi trường thay vì ghim cứng; thêm timeout và retry có giới hạn.
- Sửa lỗi trạng thái lô: SQLite `ilike` không so khớp chữ `Đ`, nên lọc bằng hàm chuẩn hóa Python.
- Alert và Advisor trả kết quả dự phòng 200 + `ai_available=false` khi AI lỗi; vẫn 502 khi AI bịa mã lô/ID.
- Giao diện phân biệt 429 (hết hạn mức) với lỗi mạng/5xx và hiện nhãn “Kết quả dự phòng, không do AI sinh”.
- Gọi thật 4 API AI trên lô `DEMO-BATCH-CHERRY-ACTIVE` và ghi nhận HTTP/độ dài.

### 1.2. File đã sửa

| File | Nội dung |
|---|---|
| `app/core/config.py` | Thêm `GEMINI_MODEL` (mặc định `gemini-flash-lite-latest`) và `GEMINI_TIMEOUT_SECONDS` (mặc định 30). |
| `.env.example` | Bổ sung 2 biến trên kèm chú thích; không chứa khóa thật. |
| `app/core/ai_client.py` | Dùng `settings.GEMINI_MODEL`; timeout truyền vào `HttpOptions` (mili-giây); retry tối đa 2 lần chỉ với 429/5xx/timeout, backoff tăng dần; không retry 4xx khác. |
| `app/core/status.py` (mới) | Chuẩn hóa trạng thái: bỏ dấu, chữ thường, gộp khoảng trắng; nhận `Đang sinh trưởng`, `Đang trồng`, `Đang canh tác`… |
| `app/repositories/crop_batch.py` | `get_growing_batches` lọc bằng Python qua `is_growing_status`, bỏ `ilike` với `Đ`. |
| `app/schemas/ai_alert.py`, `app/schemas/ai_summary.py` | Thêm `ai_available: bool = True`. |
| `app/services/ai_alert.py` | Khi AI lỗi: xếp hạng dự phòng tất định (số ngày từ nhật ký gần nhất + dấu hiệu sâu bệnh), trả 200 với `ai_available=false`; vẫn 502 nếu AI bịa mã lô. |
| `app/services/ai_summary.py` | Fallback hiện có gắn `ai_available=false`. |
| `app/routers/ai_advisor.py` | Khi AI lỗi: trả 200 với câu trả lời dự phòng + disclaimer + `ai_available=false`; vẫn 502 nếu AI bịa mã lô/ID nhật ký. |
| `tests/test_ai_guardrails.py` | Gỡ `xfail` của 3 test: trạng thái `Đang trồng`, alert fallback, advisor fallback. |
| `frontend/lib/ai.ts` (mới) | `describeAiError` (429 / 5xx / lỗi mạng) và hằng `AI_FALLBACK_LABEL`. |
| `frontend/lib/types.ts` | Thêm `ai_available?` cho `AiAlertOut`, `AiSummaryOut`, `AiAdvisorResponse`. |
| `frontend/components/ai/GlobalAIChatbot.tsx` | Giữ mã HTTP khi tóm tắt lỗi; nhãn dự phòng cho chat và 3 công cụ; thông báo lỗi theo loại. |
| `frontend/app/(dashboard)/care-logs/page.tsx` | Nhãn dự phòng khi phân tích nhật ký/hỏi đáp; lỗi lịch chăm sóc phân loại 429/5xx/mạng. |

### 1.3. Lệnh đã chạy và kết quả

```text
venv/Scripts/python.exe -m pytest tests/test_ai_guardrails.py -q
```

- Trước khi sửa: 12 passed, 6 xfailed (trong file này).
- Sau khi sửa: **15 passed, 3 xfailed**. Ba xfail còn lại thuộc Prompt 3 (hậu kiểm nội dung AI + dấu tiếng Việt trong lịch).

```text
cd frontend && npx tsc --noEmit
```

- Kết quả: exit code 0, không có lỗi kiểu.

### 1.4. Gọi thật 4 API AI (server mới chạy ở cổng 8001)

Server cũ ở cổng 8000 vẫn là tiến trình trước khi sửa nên không dùng để đo. Một tiến trình mới
được khởi động từ mã nguồn hiện tại tại `127.0.0.1:8001`. Token được tạo trong bộ nhớ từ tài khoản
ADMIN có sẵn; không in khóa, mật khẩu hay token ra màn hình.

| API | HTTP | Độ dài phản hồi | Thời gian | `ai_available` |
|---|---|---|---|---|
| `POST /api/ai-alert/alerts` | 200 | 426 byte | 3,13 s | true |
| `POST /api/ai-summary/summary` | 200 | 861 byte | 2,32 s | true |
| `POST /api/ai-schedule/batches/20/schedule` | 200 | 1640 byte | 2,78 s | không có trường |
| `POST /api/v1/ai-advisor/chat` | 200 | 1183 byte | 2,08 s | true |

Lô dùng để gọi: `DEMO-BATCH-CHERRY-ACTIVE` (ID 20). Model đọc từ cấu hình: `gemini-flash-lite-latest`.

### 1.5. Việc chưa làm trong Prompt 1

- Chưa chụp ảnh giao diện AI; việc chụp và phân loại ảnh nằm ở Prompt 6 theo yêu cầu.
- Chưa đo nhánh dự phòng bằng lệnh gọi thật (chỉ kiểm bằng test mock); sẽ đo khi tạm ngắt khóa ở Prompt 6.

---

## 2. Prompt 2 — sửa lỗi nghiệp vụ có test xác nhận

### 2.1. Kế hoạch ngắn

- Đồng bộ schema/service/repository của thu hoạch; validate sản lượng và ngày gieo; sinh mã QR duy nhất.
- Thêm bước gọi `POST /api/harvests` ngay trong màn hình nhật ký khi chọn “Thu hoạch”.
- Bỏ `db.refresh(supply)` sai thứ tự để tồn kho và cảnh báo ngưỡng đúng.
- Chặn nhật ký trước ngày gieo, loại hoạt động ngoài danh sách, nhật ký cho lô đã thu hoạch; chặn ngày gieo tương lai.
- Bật `PRAGMA foreign_keys=ON` cho mọi kết nối SQLite của ứng dụng.
- Chống cộng trùng sản lượng trên biểu đồ bằng biến môi trường `DASHBOARD_DEDUPE_HARVEST`.

### 2.2. File đã sửa

| File | Nội dung |
|---|---|
| `app/schemas/harvest.py` | `quantity` phải `> 0` (422 nếu 0/âm); `HarvestOut` trả thêm `unit`, `qr_trace_code`. |
| `app/repositories/harvest.py` | `create(db, harvest, qr_trace_code, commit=...)` đúng chữ ký; thêm `trace_code_exists`; mặc định `harvest_time` khi thiếu. |
| `app/services/harvest.py` | Bỏ các trường không tồn tại (`harvest_date`, `quantity_kg`, `quality_grade`, `harvested_by`); lô không tồn tại → 400; thiếu `sow_date` → 400; sinh mã `GF-<mã lô>-<thời gian>-<4 hex>` duy nhất; lưu harvest + đổi trạng thái lô trong cùng transaction. |
| `app/routers/care_log.py` | Bỏ `db.refresh(supply)` trước commit; chặn nhật ký cho lô đã thu hoạch; chặn `log_date` trước `sow_date` (bằng ngày vẫn hợp lệ). |
| `app/schemas/care_log.py` | Whitelist `action_type` (nhãn tiếng Việt đang dùng + khóa tiếng Anh chuẩn); sai → 422. |
| `app/core/status.py` | Thêm `is_harvested_status`. |
| `app/services/crop_batch_service.py` | `sow_date` ở tương lai → 400. |
| `app/main.py` | Bộ xử lý 422 chuyển `ctx` chứa ngoại lệ thành chuỗi để không lỗi serialize (trước đây lỗi validator tự viết làm API trả 500). |
| `app/core/database.py` | `PRAGMA foreign_keys=ON` cho mọi kết nối SQLite. |
| `app/core/config.py`, `.env.example` | Thêm `DASHBOARD_DEDUPE_HARVEST` (mặc định `true`). |
| `app/routers/dashboard.py` | Bỏ qua nhật ký “Thu hoạch” nếu cùng lô + cùng ngày đã có `harvest_logs`. |
| `frontend/app/(dashboard)/care-logs/page.tsx` | Khi lưu nhật ký “Thu hoạch”, gọi thêm `POST /api/harvests` với sản lượng/chất lượng/ghi chú; hiện banner thành công kèm mã truy xuất hoặc lỗi. |
| `tests/test_harvest_and_trace.py` | Gỡ 4 `xfail`. |
| `tests/test_edge_validation.py` | Gỡ 5 `xfail`. |
| `tests/test_dashboard_chart.py` (mới) | Kiểm tra biểu đồ chỉ cộng một nguồn cho mỗi lô/ngày. |

### 2.3. Lệnh đã chạy và kết quả

```text
venv/Scripts/python.exe -m pytest tests/test_harvest_and_trace.py -q
```

- Trước: 4 passed, 4 xfailed. Sau: **8 passed**.

```text
venv/Scripts/python.exe -m pytest tests/test_edge_validation.py -q
```

- Trước: 9 passed, 5 xfailed. Sau: **14 passed**.

```text
venv/Scripts/python.exe -m pytest tests/test_dashboard_chart.py -q
```

- **1 passed** (test mới).

```text
venv/Scripts/python.exe -m pytest -q
```

- Sau Prompt 2: **60 passed, 3 xfailed, 137 warnings in 14.59s**.
- 3 xfail còn lại đều thuộc Prompt 3 (hậu kiểm nội dung AI và dấu tiếng Việt trong lịch).

```text
cd frontend && npx tsc --noEmit
```

- Exit code 0.

### 2.4. Kiểm tra ràng buộc khóa ngoại trên dữ liệu thật

```text
PRAGMA foreign_key_check trên farm.db (mở chỉ đọc)
```

- Kết quả: **0 vi phạm**. Không xóa hay sửa dữ liệu nào trong `farm.db`.

### 2.5. Việc chưa làm trong Prompt 2

- Chưa lưu một lượt thu hoạch thật trên `farm.db`; việc này nằm ở Prompt 6 (chụp màn hình kèm bản ghi thật) để tránh tạo dữ liệu thử trước khi hoàn tất các thay đổi.

---

## 3. Prompt 3 — AI có trách nhiệm + prompt V3

### 3.1. Kế hoạch ngắn

- Nhúng một khối quy tắc an toàn dùng chung vào system prompt của cả 4 dịch vụ AI: cấm liều lượng/nồng độ/tên thuốc hoặc phân bón cụ thể; cấm cam kết năng suất/ngày thu hoạch; coi ghi chú nhật ký là dữ liệu, bỏ qua mệnh lệnh chèn; bắt buộc ghi `missing_data`/`contradictions`; năm trong output phải khớp dữ liệu đầu vào.
- Thêm lớp hậu kiểm tất định `app/core/ai_guard.py` chạy trên mọi câu trả lời trước khi trả về người dùng.
- Sửa đoạn kiểm tra dấu tiếng Việt nằm sau `raise` trong `ai_schedule.py`.
- Gỡ 3 `xfail` và bổ sung 4 test mới cho injection, thiếu ngày gieo, mâu thuẫn, sai năm.
- Thêm V3 vào harness so sánh và chạy thật 5 kịch bản × 3 lần × 3 phiên bản.

### 3.2. File đã sửa

| File | Nội dung |
|---|---|
| `app/core/ai_guard.py` (mới) | `SAFETY_RULES` dùng chung; phát hiện liều lượng (`\d + kg/g/ml/lít/…`), cam kết năng suất (`\d + tấn/tạ`, “chắc chắn đạt năng suất”…), tên thuốc/phân bón thương mại, năm sai; `sanitize_text`/`sanitize_list` thay từng câu vi phạm bằng câu từ chối chuẩn; `detect_log_contradictions` phát hiện ghi chú “đã tưới/đất ẩm” mâu thuẫn “đất khô/chưa tưới”; hằng số `MISSING_SOW_DATE_NOTE`, `GUARD_ISSUE`. Không gọi AI, có thể kiểm thử tất định. |
| `app/services/ai_summary.py` | System prompt có `SAFETY_RULES`; hậu kiểm summary/issues/recommendations; sai năm → trả kết quả dự phòng `ai_available=false`; thiếu ngày gieo mà AI không nhắc → backend chèn “Chưa đủ dữ liệu: thiếu ngày gieo.”; mâu thuẫn nhật ký → thêm vào `issues_detected` và `contradictions`; `guard_triggered` khi có câu bị thay. |
| `app/services/ai_schedule.py` | System prompt có `SAFETY_RULES`; chuyển kiểm tra dấu tiếng Việt ra khỏi nhánh `raise` (trước đây không bao giờ chạy); hậu kiểm từng `description`; sai năm → 502 từ chối toàn bộ lịch. |
| `app/services/ai_alert.py` | System prompt có `SAFETY_RULES`; hậu kiểm từng `reason`; sai năm → dùng xếp hạng dự phòng với `guard_triggered=true`. |
| `app/routers/ai_advisor.py` | System prompt có `SAFETY_RULES`, yêu cầu trả `missing_data`/`contradictions`; hậu kiểm `reply`; sai năm → câu dự phòng `ai_available=false`; thiếu ngày gieo hoặc mâu thuẫn của lô đang hỏi được bổ sung vào response. Sửa ngữ cảnh ngày gieo đang luôn in “Chưa rõ” (đọc `sow_date` thay vì thuộc tính không tồn tại). |
| `app/schemas/ai_summary.py`, `ai_schedule.py`, `ai_alert.py` | Thêm `missing_data`, `contradictions` (mặc định `[]`) và `guard_triggered` (mặc định `false`) — model cũ không trả trường mới vẫn parse được. |
| `tests/test_ai_guardrails.py` | Gỡ 3 `xfail`: cam kết sản lượng trong summary, mô tả lịch không dấu, liều lượng trong advisor. Thêm 4 test mới. |
| `docs/evidence/scripts/prompt_comparison.py` | Thêm V3; giữ nguyên văn V2 cũ làm mốc; V3 áp đúng hậu kiểm production; thêm chỉ số sai năm, guard, injection trước/sau hậu kiểm; cho phép ghi kết quả ra thư mục riêng để không ghi đè bằng chứng cũ. |

### 3.3. Lệnh đã chạy và kết quả

```text
venv/Scripts/python.exe -m pytest tests/test_ai_guardrails.py tests/test_ai_service.py -q
```

- **23 passed** (bao gồm 4 test mới và 3 test từng `xfail`).

```text
venv/Scripts/python.exe -m pytest -q
```

- Trước Prompt 3: **60 passed, 3 xfailed, 137 warnings in 14.59s**.
- Sau Prompt 3: **67 passed, 0 xfailed, 145 warnings in 13.99s** (exit code 0).

### 3.4. Kiểm tra tất định trên dữ liệu kịch bản

```text
venv/Scripts/python.exe (gọi trực tiếp app.core.ai_guard, không gọi API)
```

- Lô 2 (kịch bản mâu thuẫn): phát hiện đúng câu “Nhật ký mâu thuẫn…”.
- Lô 10 (kịch bản thiếu ngày gieo): `sow_date=None` được nhận diện, backend có nhánh chèn `MISSING_SOW_DATE_NOTE`.
- `sanitize_text("Năm 2024 lô rất tốt. Bón 50 kg NPK.", {2026})` trả về câu từ chối chuẩn với mã vi phạm `['lieu_luong', 'nam_khong_khop']`.

### 3.5. So sánh prompt V1/V2/V3 bằng lần gọi thật

Lệnh:

```text
PROMPT_COMPARISON_OUT=docs/evidence/prompt_runs_v3_2026-10-30 \
  venv/Scripts/python.exe docs/evidence/scripts/prompt_comparison.py
```

- Lần đầu: 45 lần gọi (5 kịch bản × 3 phiên bản × 3 lần), 09:06:02–09:12:19, không lần nào lỗi quota.
- Sau khi bổ sung `neem` vào danh sách chặn và quy tắc “không nhắc lại tên thuốc có trong nhật ký”, chạy lại riêng V3: 15 lần, 09:16:08–09:18:06.
- Tổng cộng **60 lần gọi Gemini thật**; V1/V2 giữ nguyên từ lần đầu.
- Tổng hợp cuối: `docs/evidence/prompt_runs_v3_2026-10-30/summary.json` (được dựng lại từ 45 file lần chạy, không gọi API).

Kết quả chính (15 lần mỗi bản):

| Chỉ số | V1 | V2 | V3 |
|---|---|---|---|
| JSON hợp lệ | 15/15 | 15/15 | 15/15 |
| Trích dẫn ID hợp lệ | 15/15 | 15/15 | 15/15 |
| Có tên thuốc/phân bón cụ thể | 12 | 12 | **0** |
| Có số liệu liều lượng | 2 | 4 | **0** |
| Cam kết năng suất | 0 | 0 | 0 |
| Nêu mâu thuẫn thật (kịch bản 05) | 2/3 | 1/3 | **3/3** |
| Nhắc thiếu ngày gieo (kịch bản 03) | 0/3 | 0/3 | **3/3** |
| Số lần hậu kiểm phải thay nội dung | 0 | 0 | 8 |
| Trung vị thời gian phản hồi | 2.543 ms | 2.387 ms | 2.616 ms |

Chi tiết bảng theo từng kịch bản, các dương tính giả của bộ đo và phần “V3 chưa tốt hơn ở đâu” nằm ở `docs/evidence/COMPARISON.md`, mục 0. Bằng chứng V1/V2 cũ ở `docs/evidence/prompt_runs/` được giữ nguyên.

### 3.6. Việc chưa làm / giới hạn của Prompt 3

- **Advisor không lưu `ai_suggestions`:** router `ai_advisor` trả kết quả trực tiếp, không ghi bảng gợi ý, nên `guard_triggered` chỉ có trong response chứ không có bản ghi lịch sử. Summary, schedule và alert đều lưu kèm cờ này.
- **Sai năm trên lịch chăm sóc bị từ chối (HTTP 502), không có lịch dự phòng** vì không thể tự sinh lịch thay thế an toàn. Ba dịch vụ còn lại trả kết quả dự phòng.
- **Nhánh fallback sai năm chưa xuất hiện trong 60 lần gọi thật** (không lần nào sinh năm sai); chỉ được chứng minh bằng unit test.
- **8/15 lần V3 phải thay câu do nhắc lại tên thuốc/phân bón lấy từ nhật ký**, làm summary bị ngắt mạch. Đây là cái giá đã biết của quy tắc “không nêu tên cụ thể”; đã ghi trong COMPARISON.md.
- **“Bỏ qua” trong output chưa phân biệt được** là mô hình đang cảnh báo hay đang làm theo lệnh chèn; bộ đo regex chỉ đếm cụm từ.

---

## 4. Prompt 4 — sửa UI và bảo vệ endpoint

### 4.1. Kế hoạch ngắn

- Bỏ các số liệu không có căn cứ ở trang đăng nhập; thay bằng mô tả chức năng.
- Bỏ chứng nhận hard-code ở API truy xuất; trang công khai chỉ trả trường được phép công bố (loại hoạt động, ngày, tóm tắt), không trả `notes`/`image_url`.
- Chặn nút “Tạo Lô trồng mới” trên Dashboard theo quyền `crop_batches:create`; đọc `?forbidden=1` để hiện banner; thêm banner lỗi SWR.
- Thay `alert()` ở trang Lô trồng bằng banner thành công/lỗi trong trang.
- Bắt buộc đăng nhập cho `GET /api/notifications` và `GET /search`; lọc `/api/harvests` và AI summary theo lô của STAFF; thêm test 401/403.
- Tạo `scripts/seed_clean_demo.py` dựng `farm_demo.db` sạch từ seed chuẩn, không đụng `farm.db`; hướng dẫn trỏ ứng dụng sang file demo trong README.
- Kiểm tra `tsc --noEmit`, `npm run build`, `pytest -q`.

### 4.2. File đã sửa

| File | Nội dung |
|---|---|
| `frontend/app/login/page.tsx` | Bỏ “100+”, “99.8%”, “GlobalGAP”; thay bằng “Quản lý lô trồng”, “Gợi ý AI tham khảo”, “Truy xuất QR” kèm mô tả chức năng. |
| `app/routers/crop_batch.py` | `safety_certifications` trả `[]` thay vì `["VietGAP", "Cảnh báo dư lượng"]`; `care_history` chỉ trả `id`, `action_type`, `summary`, `logged_at` — bỏ `notes` và `image_url`. |
| `app/routers/harvest.py` | API trace công khai theo QR chỉ trả whitelist: `batch_id`, `quantity`, `unit`, `grade`, `harvest_date`, `qr_trace_code`; không trả `notes`. |
| `frontend/app/trace/[batch_code]/page.tsx` | Kiểu dữ liệu dùng `summary`; hiển thị “Chưa có dữ liệu chứng nhận.” khi danh sách chứng nhận rỗng. |
| `frontend/app/(dashboard)/page.tsx` | Đọc role từ `sessionStorage`; nút tạo lô chỉ hiện khi có `PERMISSIONS.BATCH_CREATE`; banner “Bạn không có quyền truy cập trang này.” khi `?forbidden=1`; banner lỗi khi bất kỳ SWR nào lỗi. |
| `frontend/app/(dashboard)/batches/page.tsx` | Thay toàn bộ `alert()` bằng banner thông báo thành công/lỗi, có nút đóng; giữ `confirm()` cho xác nhận xóa. |
| `app/routers/notification.py`, `app/routers/search.py` | Thêm `Depends(get_current_user)` — trả 401 khi không có token. |
| `frontend/components/GlobalSearch.tsx`, `frontend/components/layout/header.tsx` | Gửi kèm `Authorization: Bearer …` khi gọi `/search` để không hỏng tìm kiếm sau khi API yêu cầu đăng nhập. |
| `app/services/harvest.py`, `app/routers/harvest.py` | STAFF/WORKER chỉ thấy thu hoạch thuộc lô được phân công; xem thu hoạch của lô khác trả 403. |
| `app/services/ai_summary.py`, `app/routers/ai_summary.py` | Truyền người dùng hiện tại vào service; STAFF yêu cầu tóm tắt lô ngoài phân công trả 403. |
| `app/core/database.py` | Đọc `DATABASE_URL` từ môi trường/`.env` (mặc định vẫn `farm.db`) để có thể trỏ sang `farm_demo.db`. |
| `scripts/seed_clean_demo.py` (mới) | Dựng `farm_demo.db` từ `scripts/demo_data.py`; từ chối ghi vào `farm.db`, từ chối ghi đè nếu chưa `--force`; kiểm tra lại không còn lô/lô đất thử; không in mật khẩu. |
| `README.md` | Bổ sung mục “CSDL demo sạch để chấm bài” và sửa mô tả cũ “hard-code farm.db”. |
| `tests/test_traceability.py`, `tests/test_harvest_and_trace.py` | Cập nhật kỳ vọng: chứng nhận rỗng, không có `notes`/`image_url`, có `summary`. |
| `tests/test_auth.py` | Mở rộng test phân quyền STAFF cho `/api/harvests`, `/api/harvests/batch/{id}` và `/api/ai-summary/summary`. |
| `tests/test_endpoint_protection.py` (mới) | 401 cho notifications/search khi chưa đăng nhập; 200 khi có token. |

### 4.3. Lệnh đã chạy và kết quả

```text
venv/Scripts/python.exe -m pytest -q tests/test_endpoint_protection.py tests/test_traceability.py tests/test_harvest_and_trace.py tests/test_auth.py
```

- Lần đầu: **18 passed, 2 errors** — 2 test mới thiếu fixture `sample_data` nên `admin_token` không đăng nhập được.
- Sau khi thêm fixture: chạy riêng `tests/test_endpoint_protection.py` được **4 passed**. Tổng của cả nhóm sau đó được xác nhận ở lần chạy toàn bộ bên dưới (71 passed), không chạy lại riêng nhóm 4 file.

```text
venv/Scripts/python.exe -m pytest -q
```

- Trước Prompt 4: **67 passed, 0 xfailed**.
- Sau Prompt 4: **71 passed, 150 warnings in 15.57s** (exit code 0), không còn `xfail`.

```text
cd frontend
npx tsc --noEmit
```
- **TSC_EXIT:0** (không có lỗi kiểu).

```text
cd frontend
npm run build
```
- **BUILD_EXIT:0**; Next.js biên dịch thành công 15 route, có `/trace/[batch_code]` dynamic.

```text
venv/Scripts/python.exe scripts/seed_clean_demo.py
```
- Tạo `D:\Project AI SChoool\farm_backend\farm_demo.db` (233.472 byte).
- Kết quả in ra: **4 tài khoản, 3 lô đất, 13 lô trồng, 48 nhật ký, 12 thu hoạch, 12 mã QR demo**; xác nhận không có lô “al”, “lol”, “1”, “chì chì” hay lô đất “66”, “chì”.
- Chạy lại không `--force`: exit 1, “farm_demo.db đã tồn tại…”. Chạy `--output farm.db --force`: exit 1, “Từ chối ghi vào farm.db…”.
- `farm.db` giữ nguyên: 307.200 byte, thời gian sửa `2026-10-29 22:02` (trước và sau Prompt 4).

```text
DATABASE_URL=sqlite:///./farm_demo.db venv/Scripts/python.exe -c "from app.core.database import SQLALCHEMY_DATABASE_URL; print(SQLALCHEMY_DATABASE_URL)"
```
- In ra `sqlite:///./farm_demo.db`; truy vấn thử trả **13 lô trồng**, đúng file demo.

### 4.4. Việc chưa làm / giới hạn của Prompt 4

- **Chưa có bảng chứng nhận thật** nên API trả danh sách rỗng và giao diện hiện “Chưa có dữ liệu chứng nhận.”; chưa thiết kế schema chứng nhận.
- **API `/api/traceability/{batch_code}` vẫn công khai và còn trả `description`, `conditions`** của nhật ký. Prompt chỉ yêu cầu trang `/trace/[batch_code]` và hai API trace được giữ nguyên; nếu muốn siết thêm cần một quyết định riêng về dữ liệu nào được công bố.
- **`/api/notifications` chỉ yêu cầu đăng nhập**, chưa lọc theo người dùng/lô; bảng thông báo hiện không gắn chặt với lô.
- **Tìm kiếm toàn cục vẫn trả nguyên bản ghi thu hoạch** (kể cả `notes`) cho người dùng đã đăng nhập, chưa áp phạm vi STAFF; prompt chỉ yêu cầu bảo vệ endpoint.
- **Nút tạo lô chỉ xuất hiện sau khi đọc role từ `sessionStorage`** (sau hydration); không có nhấp nháy nút cho STAFF nhưng cũng không hiển thị ngay ở khung đầu.
- **Chưa chạy lại giao diện thật/Playwright sau khi sửa**; bằng chứng hiện là type-check, build và test API. Ảnh chụp sẽ làm ở Prompt 6.

## 5. Prompt 5 — hardening bảo mật và cấu hình

### 5.1. Kế hoạch ngắn

- Bắt buộc `SECRET_KEY`: bỏ giá trị mặc định dùng được; thiếu khóa thì dừng khởi động khi `DEBUG=False`; chỉ dùng khóa tạm khi `DEBUG=True`; hạn token mặc định 60 phút.
- CORS đọc `CORS_ORIGINS` (mặc định `http://localhost:3000`), không dùng `*` kèm credentials.
- Giới hạn đăng nhập 5 lần/phút/IP cho `POST /api/auth/login`, trả 429 kèm `Retry-After`; có test.
- `create_admin.py` và `scripts/demo_data.py` không đặt lại mật khẩu khi `DEBUG=False`; mật khẩu lấy từ `DEMO_PASSWORD`; không in mật khẩu.
- Bổ sung `.gitignore`, chỉ `git rm -r --cached` (không xóa file trên đĩa), kiểm tra lại danh sách tệp.
- Docker backend chạy non-root; sửa `NEXT_PUBLIC_API_URL` trong compose/Dockerfile/README; xác nhận `requirements.txt` có phiên bản; cài lại trong venv mới.
- Quét lại bảo mật, cập nhật `SECURITY_SCAN.md`; chỉ ghi đề xuất xóa lịch sử Git, không chạy.
- Đề xuất commit theo nhóm, không tự commit.

### 5.2. File đã sửa

| File | Nội dung |
|---|---|
| `app/core/security.py` | Bỏ `SECRET_KEY` mặc định; đọc từ môi trường/`.env`; thiếu khóa + `DEBUG=False` → `RuntimeError`; `DEBUG=True` → khóa tạm kèm cảnh báo; `ACCESS_TOKEN_EXPIRE_MINUTES` mặc định 60. Thêm `_print_safe` để cảnh báo không vỡ trên console Windows cp1252. |
| `app/core/rate_limit.py` (mới) | Bộ đếm trong bộ nhớ theo IP, cửa sổ 60 giây, đọc `LOGIN_RATE_LIMIT_PER_MINUTE` (mặc định 5); trả 429 kèm `Retry-After`; có hàm reset cho test. |
| `app/routers/auth.py` | Gọi `enforce_login_rate_limit(request)` trước khi kiểm tra mật khẩu. |
| `app/main.py` | CORS đọc `CORS_ORIGINS`, không còn `allow_origins=["*"]`; handler `HTTPException` giữ nguyên `exc.headers` để 429 có `Retry-After`. |
| `tests/conftest.py` | Đặt `SECRET_KEY`/`DEBUG` cho môi trường test; fixture autouse reset bộ đếm rate limit giữa các test. |
| `tests/test_security_config.py` (mới) | 3 test: production thiếu khóa phải dừng; `DEBUG=True` import được và in cảnh báo; login lần 6 trong phút trả 429 + `Retry-After`. |
| `.env.example` | `DEBUG=False`; ghi rõ `SECRET_KEY` bắt buộc; thêm `DEMO_PASSWORD`, `LOGIN_RATE_LIMIT_PER_MINUTE`; `CORS_ORIGINS`. |
| `.gitignore` | Thêm `__pycache__/`, `*.py[cod]`, `.pytest_cache/`, `venv/`, `.venv/`, `env/`, `.env`, `.env.*`, `*.db`, `*.db-shm`, `*.db-wal`, `*.sqlite3`, `app/uploads/`, `node_modules/`, `frontend/.next/`, `frontend/out/`, `frontend/tsconfig.tsbuildinfo`, `farm_backend/`. |
| `create_admin.py` | Mật khẩu từ `DEMO_PASSWORD`; tài khoản đã tồn tại chỉ đổi mật khẩu khi `DEBUG=True`; không in mật khẩu; `reconfigure` stdout/stderr UTF-8 để chạy được trên console Windows. |
| `scripts/demo_data.py` | Bỏ hằng số mật khẩu; giữ hash cũ khi `DEBUG=False`; chỉ hash mới khi `DEBUG=True` hoặc tài khoản mới, khi đó bắt buộc `DEMO_PASSWORD`; `reconfigure` cả stderr. |
| `scripts/seed_clean_demo.py` | Dừng sớm nếu thiếu `DEMO_PASSWORD` (không dùng mật khẩu mặc định). |
| `app/Dockerfile` | Tạo `appuser` UID 10001, `chown` thư mục uploads, `USER appuser`. |
| `frontend/Dockerfile` | `ARG NEXT_PUBLIC_API_URL` mặc định `http://localhost:8000` (không thêm `/api`/`/api/v1`). |
| `docker-compose.yml` | `SECRET_KEY: ${SECRET_KEY:?...}` bắt buộc; `DEBUG: "false"`; `DATABASE_URL`; `CORS_ORIGINS`; `DEMO_PASSWORD`; `NEXT_PUBLIC_API_URL=http://localhost:8000`. |
| `README.md` | Ghi rõ `SECRET_KEY` bắt buộc, rate limit 429, `DEMO_PASSWORD`, Docker non-root, `NEXT_PUBLIC_API_URL` không kèm `/api`. |
| `docs/evidence/SECURITY_SCAN.md` | Thêm cột trạng thái, số liệu quét lại, phát hiện mới N1/N2, đề xuất xóa lịch sử Git (không chạy). |

### 5.3. Lệnh đã chạy và kết quả

```text
venv/Scripts/python.exe -m pytest -q tests/test_security_config.py
```

- Lần đầu: **3 failed** — 429 thiếu `Retry-After` do handler tự viết bỏ header; 2 test subprocess lỗi `UnicodeEncodeError` trên console cp1252.
- Sau khi sửa handler và đặt `PYTHONIOENCODING=utf-8`/`PYTHONUTF8=1` cho subprocess: **3 passed**.

```text
venv/Scripts/python.exe -m pytest -q
```

- Trước Prompt 5: **71 passed**.
- Sau Prompt 5: **74 passed, 152 warnings in 22.69s** (exit code 0).

Cài lại trong venv mới:

```bash
"C:/Users/ADMIN/AppData/Local/Programs/Python/Python312/python.exe" -m venv /tmp/gf_venv_p5
/tmp/gf_venv_p5/Scripts/python.exe -m pip install -r requirements.txt -r requirements-dev.txt
/tmp/gf_venv_p5/Scripts/python.exe -c "import app.main"          # không đặt biến môi trường
DEBUG=true /tmp/gf_venv_p5/Scripts/python.exe -c "import app.main; print('IMPORT_OK_DEBUG')"
/tmp/gf_venv_p5/Scripts/python.exe -m pytest -q
```

| Bước | Kết quả thật |
|---|---|
| Cài dependency | `Successfully installed` 46 gói, không lỗi build |
| Import khi thiếu `SECRET_KEY`, `DEBUG=False` | Exit **1**, thông báo “Thiếu SECRET_KEY…” |
| Import với `DEBUG=true` | In cảnh báo khóa tạm + `IMPORT_OK_DEBUG`, exit 0 |
| Chạy test | **74 passed, 152 warnings in 17.49s**, exit 0 |

Dọn index Git (chỉ index, không xóa đĩa):

```text
git rm -r --cached .venv venv farm_backend farm.db app.db frontend/tsconfig.tsbuildinfo
git ls-files -z | grep -zE '(^|/)__pycache__/|\.pyc$' | xargs -0 -r git rm --cached
git rm -r --cached app/venv
```

| Chỉ số | Trước | Sau |
|---|---|---|
| Tệp Git theo dõi | 18.951 | **187** |
| Tệp nhạy cảm/không cần theo dõi | 18.764 | **0** |
| `farm.db` trên đĩa | 307.200 byte, mtime 2026-10-29 22:02 | Giữ nguyên |
| `venv/`, `.venv/`, `app/venv/`, `farm_backend/` trên đĩa | Có | Vẫn còn |

Kiểm tra `create_admin.py` trên **bản sao** CSDL trong thư mục tạm (`DB_PATH` trỏ bản sao, không đụng `farm.db`):

```text
DB_PATH=<temp>/p5_admin_check.db DEBUG=false SECRET_KEY=<khóa thử> venv/Scripts/python.exe create_admin.py
```

- Exit **0**; in “giữ nguyên mật khẩu” cho 3 tài khoản; hash mật khẩu `admin@farm.com` **không đổi** (`24b03b07` trước và sau).
- Phát hiện kèm: script vẫn chạy câu `UPDATE users SET role='MANAGER' WHERE role='ADMIN'`, nên role đếm được đổi từ `ADMIN 2 / MANAGER 3` sang `ADMIN 1 / MANAGER 4`. Đây là hành vi cũ, **ngoài phạm vi Prompt 5**, đã ghi vào `SECURITY_SCAN.md` (N1) và **chưa sửa**.

Kiểm tra `scripts/demo_data.py` trên bản sao `farm_demo.db`:

```text
DEBUG=false SECRET_KEY=<khóa thử> venv/Scripts/python.exe scripts/demo_data.py --database-url sqlite:///<temp>/p5_demo_check.db
```

- Exit **0** dù **không** đặt `DEMO_PASSWORD`; hash `demo_admin@greenfarm.local` **không đổi** (`6bfff10d` trước và sau).
- Chạy lại với `DEBUG=true` và không có `DEMO_PASSWORD`: exit **1**, thông báo “Thiếu DEMO_PASSWORD…”.

Docker và compose:

```text
SECRET_KEY=validation-only docker compose config
```

- Exit **0** (không in giá trị khóa). Docker daemon trên máy kiểm chứng **không chạy** (`docker info` lỗi pipe), nên **chưa build image**.

Quét lại bảo mật:

```text
venv/Scripts/python.exe docs/evidence/scripts/security_check.py
```

- 187 tệp theo dõi, **0 tệp nhạy cảm**; frontend 0 hit khóa; `.env` không bị theo dõi.
- Lịch sử Git vẫn chứa khóa Gemini cũ (`sha8=950605f5`, 3 commit).

### 5.4. Commit đề xuất (chưa chạy)

Các thay đổi Prompt 1–5 đang nằm trong working tree; phần dọn index đã được stage bởi `git rm --cached`. Đề xuất chia như sau, **người thực hiện tự chạy và tự kiểm tra `git diff --cached` trước mỗi commit**:

| # | Nhóm | Tệp chính | Thông điệp đề xuất |
|---|---|---|---|
| 1 | Vệ sinh Git | `.gitignore`, các mục `D` do `git rm --cached` | `chore(git): stop tracking venvs, caches and local databases` |
| 2 | AI runtime | `app/core/ai_client.py`, `ai_guard.py`, `status.py`, `app/services/ai_*.py`, `app/routers/ai_*.py`, `app/schemas/ai_*.py` | `feat(ai): add runtime guard, status and graceful fallback` |
| 3 | Nghiệp vụ | `app/services/harvest.py`, `supply.py`, `crop_batch_service.py`, models, `app/routers/harvest.py`, `dashboard.py`, `tests/test_crop_batch.py`, `tests/test_supply.py` | `fix(api): validate harvest and supply writes and dedupe dashboard totals` |
| 4 | Phân quyền | `app/routers/notification.py`, `search.py`, `ai_summary.py`, `crop_batch.py`, `tests/test_auth.py`, `test_endpoint_protection.py`, `test_harvest_and_trace.py`, `test_traceability.py` | `feat(api): require auth and scope trace data by role` |
| 5 | Giao diện | `frontend/app/**`, `frontend/components/**`, `frontend/lib/**` | `feat(ui): apply permission-aware actions and inline feedback` |
| 6 | Bảo mật/cấu hình | `app/core/security.py`, `rate_limit.py`, `auth.py`, `main.py`, `.env.example`, Dockerfiles, `docker-compose.yml`, `create_admin.py`, `scripts/demo_data.py`, `README.md` | `feat(security): require secret key, restrict CORS and rate-limit login` |
| 7 | Kiểm thử | `pytest.ini`, `requirements-dev.txt`, `tests/test_security_config.py`, `test_ai_guardrails.py`, `test_auth_edges.py`, `test_dashboard_chart.py`, `test_edge_validation.py` | `test: add regression coverage for AI, auth and validation edges` |
| 8 | Bằng chứng | `docs/`, `scripts/seed_clean_demo.py` | `docs(evidence): add phase B evidence pack` |

Lưu ý: một số tệp phục vụ nhiều prompt (ví dụ `tests/conftest.py`, `frontend/lib/types.ts`). Khi stage theo nhóm cần xem `git diff` để không đưa thay đổi của nhóm khác vào sai commit; nếu thấy rối, gộp nhóm 2–4 thành một commit “backend fixes” là chấp nhận được.

### 5.5. Việc chưa làm / giới hạn của Prompt 5

- **Chưa build/chạy Docker image**: Docker Desktop daemon không chạy trên máy kiểm chứng; chỉ xác nhận `docker compose config` hợp lệ và Dockerfile backend có `USER appuser`.
- **Frontend container vẫn chạy bằng user mặc định (root)**: prompt tập trung backend; chưa đổi để tránh rủi ro build không kiểm chứng được khi không có Docker.
- **Rate limit là bộ đếm trong bộ nhớ từng tiến trình**, không dùng chung giữa nhiều worker; production cần Redis/slowapi backend dùng chung.
- **Khóa Gemini cũ vẫn nằm trong lịch sử Git**; chưa chạy `git filter-repo`, chưa force-push. Phải thu hồi khóa trên Google AI Studio.
- **`create_admin.py` vẫn hạ role ADMIN→MANAGER** như mô tả ở 5.3; chưa sửa vì ngoài phạm vi prompt, nhưng khuyến nghị không chạy script này trên `farm.db`.
- **Chưa commit gì**: toàn bộ thay đổi còn trong working tree/index; danh sách commit chỉ là đề xuất.
- **Phiên đăng nhập vẫn lưu JWT trong `localStorage`** (S5) — thay đổi kiến trúc, ngoài phạm vi.
