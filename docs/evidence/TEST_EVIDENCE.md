# Bằng chứng kiểm thử backend

- **Ngày chạy:** 2026-10-30.
- **Môi trường:** Windows, Python 3.12.10 (`venv`), pytest 9.2.0, FastAPI TestClient, SQLite in-memory + `PRAGMA foreign_keys=ON`.
- **Lệnh chạy toàn bộ:**
  ```bash
  venv/Scripts/python.exe -m pytest -q
  ```
- **Kết quả cuối:** `47 passed, 15 xfailed, 131 warnings in 13.88s` — tổng **62 test**.
- **Nhật ký đầy đủ:** `docs/evidence/test_verbose.txt`, `docs/evidence/test_run_latest.txt`.

## 1. Vì sao có 15 `xfail`

15 test được đánh dấu `pytest.mark.xfail(strict=True)`. Đây **không phải test đạt**: chúng mô tả hành vi đúng mong đợi nhưng hệ thống hiện **chưa làm đúng**, nên test thất bại và được ghi nhận là “lỗi đã biết”. `strict=True` bảo đảm khi nào lỗi được sửa, test sẽ chuyển thành `XPASS` và làm bộ test **fail**, buộc người sửa phải cập nhật lại tài liệu/test.

Để xem hành vi thật của các ca này, chạy:

```bash
venv/Scripts/python.exe -m pytest --runxfail -q --tb=line
```

## 2. Ma trận kiểm thử theo yêu cầu

Ký hiệu: **Đ** = đạt, **X** = chưa đạt, lỗi đã biết (xfail). Cột “Thực tế” lấy từ lần chạy thật, không suy đoán.

| Mã | Tình huống | Mong đợi | Thực tế | Kết luận |
|---|---|---|---|---|
| LT-01 | Tạo lô trồng trùng `batch_code` | 400 | 400 | Đ |
| LT-02 | Diện tích lô = 0 | 422 | 422 | Đ |
| LT-03 | Diện tích lô âm | 422 | 422 | Đ |
| LT-04 | Diện tích lô rất nhỏ 0,01 | 201 | 201 | Đ |
| LT-05 | Ngày gieo ở tương lai (2027-06-01) | 400/422 | **201, lưu vào CSDL** | X |
| LT-06 | `variety_id` không tồn tại | 400 | 400 | Đ |
| LT-07 | Số lượng giống = 0 | 422 | 422 | Đ |
| LT-08 | Xuất giống vượt tồn kho (hồi quy) | 400 | 400 | Đ |
| NK-01 | Nhật ký có ngày **trước** ngày gieo (2026-09-30 so với 2026-10-01) | 400 | **201, lưu vào CSDL** | X |
| NK-02 | Nhật ký đúng **ngày gieo** | 201 | 201 | Đ |
| NK-03 | `action_type = "bay_luon"` (không hợp lệ) | 422 | **201, lưu vào CSDL** | X |
| NK-04 | Ghi nhật ký cho lô **đã thu hoạch** | 400 | **201, lưu vào CSDL** | X |
| NK-05 | `quality_percent = 101` | 422 | 422 | Đ |
| NK-06 | Ảnh không phải ảnh (magic bytes sai) | 400 | 400 | Đ |
| VT-01 | Xuất vật tư **đúng bằng** tồn (100 → 0) | 200, tồn = 0 | **200 nhưng tồn vẫn 100** | X |
| VT-02 | Xuất vật tư **vượt** tồn | 400, rollback | 400, rollback | Đ |
| VT-03 | Tạo vật tư với tồn ban đầu âm | 422 | 422 | Đ |
| TH-01 | Tạo thu hoạch hợp lệ | 201 + mã QR | **500** | X |
| TH-02 | Thu hoạch sản lượng = 0 | 422 | **500** (lỗi P0 che mất kiểm tra) | X |
| TH-03 | Thu hoạch sản lượng âm | 422 | **500** (lỗi P0 che mất kiểm tra) | X |
| TH-04 | Thu hoạch lô chưa gieo (`sow_date = NULL`) | 400 | **500** | X |
| TH-05 | Thu hoạch lô không tồn tại | 400 | 400 | Đ |
| TX-01 | Truy xuất mã lô không tồn tại | 404 | 404 | Đ |
| TX-02 | Truy xuất lô đủ chuỗi dữ liệu | 200, có batch + logs + harvests | 200, đủ dữ liệu | Đ |
| TX-03 | Truy xuất công khai bằng mã QR | 200, không cần token | 200 | Đ |
| PQ-01 | Token hết hạn | 401 | 401, thông báo “hết hạn” | Đ |
| PQ-02 | Token sai cấu trúc | 401 | 401 | Đ |
| PQ-03 | Không gửi token | 401 | 401 | Đ |
| PQ-04 | Technician tạo vật tư (sai vai trò) | 403 | 403 | Đ |
| PQ-05 | Manager nâng tài khoản thành Admin | 403 | 403 | Đ |
| PQ-06 | Staff bị giới hạn theo lô được phân công (hồi quy) | Chỉ thấy lô của mình | Đúng | Đ |
| AI-01 | Tóm tắt lô **không có nhật ký** | Không gọi AI, trả thông báo + disclaimer | Đúng | Đ |
| AI-02 | Tóm tắt lô **thiếu ngày gieo** | Prompt ghi “chưa rõ”, không bịa ngày | Đúng | Đ |
| AI-03 | Ghi chú chứa **câu lệnh chèn** | Bỏ qua lệnh, không cam kết sản lượng | Không lọc hậu kiểm: nếu AI trả “10 tấn” thì vẫn trả cho người dùng | X |
| AI-04 | Hỏi **liều thuốc cụ thể** | Không trả liều cụ thể | AI trả “Phun 50 ml…” và backend không chặn | X |
| AI-05 | AI trả **mã lô không tồn tại** (advisor) | 502 | 502 | Đ |
| AI-06 | AI trả **ID nhật ký không tồn tại** (advisor) | 502 | 502 | Đ |
| AI-07 | AI trả mã lô sai (alert) | 502 | 502 | Đ |
| AI-08 | AI trả **JSON sai** / lỗi API (summary) | 200 + fallback + disclaimer | 200 + “gián đoạn” + disclaimer | Đ |
| AI-09 | Alert lô có trạng thái “Đang trồng” (chữ hoa Đ) | Nhận là đang canh tác | **0 lô** do `ilike` SQLite không khớp `Đ` | X |
| AI-10 | Alert gặp AI timeout | 200 + fallback + disclaimer | **504**, không disclaimer | X |
| AI-11 | Advisor gặp AI timeout | 200 + fallback + disclaimer | **504**, không disclaimer | X |
| AI-12 | Lịch chăm sóc thiếu ngày gieo | 400 | 400 | Đ |
| AI-13 | Lịch chăm sóc có offset quá lớn | 502 | 502 | Đ |
| AI-14 | Lịch chăm sóc trả quá ít việc | 502 | 502 | Đ |
| AI-15 | Mô tả lịch chăm sóc **không dấu** | 502 (từ chối) | **200**, đoạn kiểm tra dấu không chạy | X |
| AI-16 | Ngày lịch chăm sóc được tính từ ngày gieo | Đúng `sow_date + offset` | Đúng | Đ |

Ghi chú: AI-03 và AI-04 được kiểm chứng bằng mock AI trả nội dung xấu; đây là test hành vi hậu kiểm của backend, không phải gọi Gemini thật. Các ca gọi Gemini thật nằm trong `COMPARISON.md`.

## 3. Phân bổ 62 test theo tệp

| Tệp | Số test | Nội dung |
|---|---|---|
| `tests/test_ai_guardrails.py` | 18 | Chốt chặn AI: rỗng, thiếu ngày, chèn lệnh, liều thuốc, mã giả, JSON sai, timeout, lịch, cảnh báo |
| `tests/test_ai_service.py` | 1 | Hồi quy: advisor trả JSON + disclaimer |
| `tests/test_auth.py` | 7 | Đăng nhập, đổi mật khẩu, quản lý tài khoản, phân lô, chặn nâng quyền |
| `tests/test_auth_edges.py` | 4 | Token hết hạn/sai, sai vai trò, manager nâng admin |
| `tests/test_care_log.py` | 3 | Tạo nhật ký thu hoạch, upload ảnh hợp lệ/không hợp lệ |
| `tests/test_crop_batch.py` | 4 | Tạo/xóa lô trồng, trừ/hoàn kho giống, thiếu tồn |
| `tests/test_edge_validation.py` | 14 | Biên lô đất, lô trồng, nhật ký, vật tư |
| `tests/test_harvest_and_trace.py` | 8 | Thu hoạch, truy xuất, QR công khai |
| `tests/test_supply.py` | 2 | Tạo vật tư, tồn âm |
| `tests/test_traceability.py` | 1 | Truy xuất công khai đủ dữ liệu |

44 test mới được bổ sung trong đợt này: `test_ai_guardrails.py` (18), `test_auth_edges.py` (4), `test_edge_validation.py` (14), `test_harvest_and_trace.py` (8).

## 4. Lỗi thật phát hiện trong quá trình kiểm thử

### 4.1. P0 – API tạo thu hoạch luôn 500

- **Bằng chứng:** `test_create_harvest_persists_and_generates_trace_code` chạy `--runxfail` báo:
  ```text
  AttributeError: 'HarvestCreate' object has no attribute 'harvest_date'.
  Did you mean: 'harvest_time'?
  ```
- **Nguyên nhân:** `app/services/harvest.py` đọc `data.harvest_date`, nhưng schema `HarvestCreate` chỉ có `harvest_time`. Cả 4 ca thu hoạch đều 500, kể cả ca hợp lệ.
- **Ảnh hưởng:** không thể tạo bản ghi thu hoạch qua API; chức năng thu hoạch trên UI chỉ là nhật ký, không ghi vào bảng `harvests`.
- **Cách sửa đề xuất:** dùng `data.harvest_time` hoặc thêm trường `harvest_date` vào schema; bổ sung `quantity > 0`; kiểm tra `batch.sow_date` trước khi tạo; sinh `qr_trace_code`.
- **Trạng thái:** **chưa sửa** (ngoài phạm vi “chỉ sửa lỗi nhỏ” của đợt này).

### 4.2. P1 – Xuất vật tư không trừ tồn kho

- **Bằng chứng:** `VT-01` mong đợi tồn 100 → 0, thực tế vẫn 100; test xfail tại `tests/test_edge_validation.py:224`.
- **Nguyên nhân:** `app/routers/care_log.py` gọi `deduct_supply_stock()` (trừ trong bộ nhớ), sau đó gọi `db.refresh(supply)` **trước** `db.commit()`. `refresh` đọc lại giá trị cũ từ CSDL và ghi đè phần vừa trừ.
- **Ảnh hưởng:** tồn kho không bao giờ giảm khi ghi nhật ký sử dụng vật tư; báo cáo tồn sai.
- **Cách sửa:** bỏ `db.refresh(supply)` trước commit, hoặc commit rồi mới refresh.
- **Trạng thái:** **chưa sửa**.

### 4.3. P1 – Cảnh báo AI bỏ sót lô “Đang trồng”

- **Bằng chứng:** `AI-09` trả 0 lô dù dữ liệu có lô trạng thái “Đang trồng”.
- **Nguyên nhân:** `app/repositories/crop_batch.py` dùng `CropBatch.status.ilike("đang trồng")`. SQLite `ILIKE` chỉ không phân biệt hoa/thường với ASCII, không xử lý được `Đ`/`đ`.
- **Ảnh hưởng:** cảnh báo AI ưu tiên sai/không có lô nào.
- **Cách sửa:** chuẩn hóa trạng thái khi lưu (dùng enum `planned/growing/harvested`), hoặc lọc bằng `func.lower()` kết hợp xử lý Unicode, hoặc so sánh tập giá trị đã chuẩn hóa ở Python.
- **Trạng thái:** **chưa sửa**.

### 4.4. P1 – Không có hậu kiểm liều thuốc và cam kết sản lượng

- **Bằng chứng:** `AI-03` (AI trả “10 tấn”) và `AI-04` (AI trả “50 ml”) đều được backend trả nguyên cho người dùng.
- **Ảnh hưởng:** trái với mục tiêu an toàn nông học; người dùng có thể áp dụng liều sai.
- **Cách sửa:** thêm bộ lọc/biểu thức phát hiện liều lượng, tên thuốc, cam kết năng suất; thay bằng câu từ chối + disclaimer.
- **Trạng thái:** **chưa sửa**.

### 4.5. P2 – Thiếu kiểm tra ngày/loại nhật ký/trạng thái lô

- **Bằng chứng:** `NK-01`, `NK-03`, `NK-04` đều trả 201 và ghi vào CSDL.
- **Ảnh hưởng:** dữ liệu nhật ký không hợp lệ, sai thứ tự thời gian.
- **Cách sửa:** so `log_date` với `sow_date`; whitelist `action_type`; chặn lô đã thu hoạch.
- **Trạng thái:** **chưa sửa**.

### 4.6. P2 – Nhận ngày gieo tương lai

- **Bằng chứng:** `LT-05` trả 201 với `sow_date = 2027-06-01`.
- **Cách sửa:** kiểm tra `sow_date <= hôm nay` trong schema/service.
- **Trạng thái:** **chưa sửa**.

### 4.7. P2 – Alert và Advisor không có fallback

- **Bằng chứng:** `AI-10`, `AI-11` trả 504 trực tiếp; không có disclaimer.
- **So sánh:** Summary có fallback 200 + disclaimer (`AI-08` đạt).
- **Cách sửa:** bọc lời gọi AI trong try/except, trả kết quả rỗng + disclaimer như summary.
- **Trạng thái:** **chưa sửa**.

### 4.8. P3 – Đoạn kiểm tra dấu tiếng Việt không bao giờ chạy

- **Bằng chứng:** `AI-15` trả 200 với mô tả không dấu.
- **Nguyên nhân:** `app/services/ai_schedule.py` đặt đoạn kiểm tra dấu **sau** lệnh `raise`, nên không thể chạy tới.
- **Cách sửa:** di chuyển kiểm tra lên trước `raise` hoặc bỏ hẳn nếu không cần.
- **Trạng thái:** **chưa sửa**.

## 5. Lỗi công cụ đã sửa trong đợt này

| Lỗi | Bằng chứng | Cách sửa | Kết quả |
|---|---|---|---|
| `pytest` gom nhầm 3 script gọi HTTP ở thư mục gốc (`test_batch.py`, `test_batch2.py`, `test_list_batches.py`) | `pytest -q` báo 2 collection error `ConnectionError` | Thêm `pytest.ini` với `testpaths = tests` | `pytest -q` chạy sạch 62 test |
| `requirements.txt` rỗng 0 dòng | `wc -l requirements.txt` = 0; cài theo README không có dependency | Ghi lại 12 gói runtime đúng phiên bản đang chạy | Cài mới trong venv sạch thành công (xem mục 6) |
| Thiếu dependency kiểm thử | Không có tệp dev requirements | Thêm `requirements-dev.txt` (`pytest`, `httpx`, `requests`) | Cài mới thành công |

## 6. Kiểm chứng cài đặt lại

Tạo venv hoàn toàn mới trong thư mục tạm, cài đúng theo `requirements.txt` + `requirements-dev.txt`:

```text
python -m venv <temp>/gf_verify
pip install -r requirements.txt -r requirements-dev.txt
python -c "import fastapi, sqlalchemy, jwt, google.genai, pytest; print('IMPORT_OK')"
```

Kết quả: **exit code 0**. Chi tiết trong `docs/evidence/INSTALL_VERIFY.md`.

## 7. Phần chưa kiểm thử được

- **Gọi Gemini thật trong test tự động:** bị chặn bởi quota và để test không phụ thuộc mạng; các test AI dùng mock. Hành vi thật được đo riêng trong `COMPARISON.md` (30 lần gọi thật).
- **Test giao diện tự động:** repo có `.github/workflows/playwright.yml` nhưng **không có thư mục test Playwright** trong mã nguồn; chưa có test E2E chạy được.
- **Đo độ phủ (coverage):** chưa cấu hình `pytest-cov`, nên không có số % phủ. Không được ghi số liệu phủ khi chưa đo.
- **Kiểm thử tải/đồng thời:** chưa thực hiện.
- **PostgreSQL:** toàn bộ test chạy SQLite; chưa kiểm thử trên PostgreSQL.

## 8. Nhận xét trung thực

Bộ test hiện đạt 47/62, nhưng 15 ca thất bại có chủ đích đại diện cho **15 lỗ hổng nghiệp vụ thật**, trong đó có 1 lỗi P0 (thu hoạch 500), 3 lỗi P1 (trừ tồn, trạng thái chữ hoa, hậu kiểm AI). Vì vậy không nên trình bày “62/62 đạt”; nên trình bày đúng: **47 ca đạt, 15 ca chưa đạt đã được ghi nhận và tài liệu hóa**, kèm danh sách lỗi và hướng sửa. Cách này phù hợp với yêu cầu không bịa kết quả và thể hiện quá trình kiểm thử thật.
