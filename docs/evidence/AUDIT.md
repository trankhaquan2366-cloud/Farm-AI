# AUDIT — Đối chiếu GreenFarm AI với đề bài và 5 tiêu chí chấm

**Ngày kiểm tra:** 29/10/2026  
**Đề bài:** `D:\Project AI SChoool\de_tai_26.md` — “Hệ thống quản lý trang trại rau sạch có tích hợp AI”  
**Tiêu chí chấm:** `D:\Project AI SChoool\Tiêu chí chấm K23.K1.KTPM K23A, B.docx` — 5 tiêu chí × 2,0 điểm  
**Phạm vi:** mã nguồn backend/frontend, CSDL `farm.db`, bộ test `tests/`, tài liệu trong `docs/evidence/` và tài liệu KT1 ngoài repo.  
**Nguyên tắc:** chỉ kết luận khi có file/hàm/endpoint hoặc kết quả chạy thật; không suy đoán chất lượng AI; không in khóa bí mật.

**Cách xếp trạng thái**

| Trạng thái | Nghĩa trong báo cáo này |
|---|---|
| **Đủ** | Có chức năng chạy được từ đầu đến cuối, có bằng chứng trong mã nguồn và/hoặc lần chạy thật; vẫn có thể còn lỗi nhỏ đã ghi chú. |
| **Một phần** | Có code/CSDL/giao diện nhưng thiếu một mắt xích, chạy sai trên dữ liệu thật, hoặc mới có tài liệu mà chưa có kiểm chứng. |
| **Thiếu** | Không có, không được gắn vào hệ thống, hoặc không dùng được; nếu chỉ có tên trong tài liệu thì ghi rõ. |

**Mức ưu tiên:** `P0` = phải sửa trước khi demo/nộp; `P1` = nên sửa nếu còn thời gian; `P2` = cải thiện để tăng điểm.

---

## 0. Kết luận nhanh

Hệ thống có nền tảng kỹ thuật tốt hơn mức “bài tập CRUD”: **12 bảng nghiệp vụ**, **197 route entry nhưng chỉ 55 handler** (phần lớn là alias), **4 vai trò**, **18 test pass**, **3 chức năng AI theo đề + 1 trợ lý hỏi đáp**, **disclaimer có trên giao diện**, **README và `.env.example` có**. Tuy nhiên, có 5 điểm chặn điểm rõ ràng:

1. **Tạo thu hoạch qua API đang lỗi 500** — `HarvestCreate` và `services/harvest.py` lệch trường; giao diện không có màn hình ghi thu hoạch.
2. **AI gợi ý lô cần kiểm tra trả 0 lô** trên dữ liệu thật vì bộ lọc trạng thái không khớp `Đang sinh trưởng`.
3. **Khóa Gemini từng nằm trong lịch sử Git** (file `.env` ở 5 commit); `SECRET_KEY` vẫn là giá trị mặc định; CSDL và thư viện ảo bị track.
4. **Không có rào chắn chống AI đưa liều thuốc/phân bón cụ thể hoặc cam kết sản lượng** — đây là yêu cầu “AI có trách nhiệm” của đề và tiêu chí 5.2.
5. **Thiếu test cho thu hoạch và 3 chức năng AI**; không có so sánh phiên bản prompt; chưa có báo cáo kỹ thuật cuối kỳ trong repo.

**Thống kê trạng thái**

| Phần | Đủ | Một phần | Thiếu | Tổng |
|---|---:|---:|---:|---:|
| A. Theo từng ý của đề bài | 13 | 6 | 4 | 23 |
| B. Theo 5 tiêu chí và 20 tiêu chí con | 5 | 10 | 5 | 20 |

---

## A. Đối chiếu theo từng ý của đề bài

### A.1. Chức năng quản lý (mục 3.1)

| # | Mục yêu cầu | Đã có chưa | Bằng chứng (file, hàm, endpoint) | Việc cần làm | Mức ưu tiên |
|---|---|---|---|---|---|
| A1 | 3.1.1 Đăng nhập và phân quyền quản lý, kỹ thuật viên, nhân viên | **Đủ** | `app/routers/auth.py` (prefix `/api/auth`); `app/core/deps.py` (`get_current_user`, `RequireRole`, admin bypass); `app/core/permissions.py` (36 khóa); `tests/test_auth.py` 7 test pass; trang `frontend/app/login/page.tsx` | Giữ nguyên; bổ sung kiểm thử token hết hạn và 403 theo từng role nếu còn thời gian | P2 |
| A2 | 3.1.2 Quản lý lô đất/khu trồng và giống cây | **Đủ** | `app/routers/plot.py`; `app/routers/plant_variety.py`; trang `/crop-lots`, `/varieties`; dữ liệu thật 7 lô đất, 10 giống | Giữ nguyên; kiểm tra lại ràng buộc xóa lô đất khi còn lô trồng | P2 |
| A3 | 3.1.3 Lập kế hoạch gieo trồng | **Một phần** | `app/routers/crop_batch.py` + `app/services/crop_batch_service.py` + `frontend/components/batches/create-batch-modal.tsx` tạo lô trồng có `sow_date`, `expected_harvest_date`, phương thức, chứng nhận; 4 test pass. **Nhưng** `app/routers/plot.py::start_planting` (dòng 168–220) chỉ đổi `plot.status`; model `Plot` không có cột `seed_id`, `planting_date`, `expected_harvest_date`, nên các nhánh `hasattr` đều sai và ngày gieo không được lưu | Chọn một luồng chuẩn: dùng tạo lô trồng (crop batch) làm kế hoạch; sửa hoặc bỏ endpoint `start-planting`; thêm test xác nhận ngày được lưu | P1 |
| A4 | 3.1.4 Ghi nhật ký chăm sóc: tưới, bón phân, kiểm tra sâu bệnh | **Đủ** | `app/routers/care_log.py` (tạo, đọc, xóa, upload ảnh, trừ vật tư cùng transaction, cảnh báo sâu bệnh/tồn kho); trang `/care-logs`; 63 bản ghi thật; 3 test pass | Thêm `PUT` cập nhật nhật ký nếu muốn đủ CRUD; hiện ma trận có quyền `care_logs:update` nhưng chưa có route | P1 |
| A5 | 3.1.5 Quản lý vật tư nông nghiệp | **Đủ** | `app/routers/supply.py`; `app/services/supply.py`; trang `/supplies`; 6 vật tư, 14 phiếu nhập, 24 lượt dùng; 2 test pass; cảnh báo tồn thấp/hạn dùng | Bổ sung API tổng hợp vật tư theo tháng/khoản mục để phục vụ “thống kê vật tư” | P2 |
| A6 | 3.1.6 Ghi nhận thu hoạch và sản lượng | **Một phần** | `app/models/harvest.py`; `app/routers/harvest.py`; `app/schemas/harvest.py`; `app/services/harvest.py`. **Đã gọi thật:** `POST /api/harvests` trả **500** `'HarvestCreate' object has no attribute 'harvest_date'`; 0 dòng được ghi (`KIEM_CHUNG_THUC_TE.md` mục 6). Không có màn hình ghi thu hoạch; `harvest_logs` có 12 dòng đều là dữ liệu seed. UI đang ghi tạm qua nhật ký loại “Thu hoạch” | Sửa đồng bộ schema–service–repository; tạo `HarvestLog`, sinh `qr_trace_code`, cập nhật trạng thái lô, liên kết bán hàng; thêm modal ghi thu hoạch; thêm test API | P0 |
| A7 | 3.1.7 Truy xuất nguồn gốc theo lô trồng | **Đủ** | `app/routers/traceability.py` (`GET /api/traceability/{batch_code}`); `app/routers/crop_batch.py` (`GET /api/batches/trace/{batch_code}`, `GET /api/batches/code/{code}/trace`); trang nội bộ `/traceability`; trang công khai `/trace/[batch_code]`; **đã chạy thật 2 endpoint → 200**; 12/12 `harvest_logs` có `qr_trace_code` | Bỏ chứng nhận viết cứng `VietGAP`/`Cảnh báo dư lượng` trong `crop_batch.py`; chỉ hiển thị dữ liệu có thật | P1 |
| A8 | 3.1.8 Thống kê sản lượng, vật tư, lịch chăm sóc | **Một phần** | `app/routers/dashboard.py` (`/api/dashboard/harvest-chart`); `frontend/components/dashboard/harvest-yield-chart.tsx`; trang `/data-reports` xuất Excel phía client; `GET /api/supplies/alerts`; không có endpoint báo cáo tổng hợp phía backend | Thêm API báo cáo sản lượng/vật tư/lịch chăm sóc; thống nhất nguồn sản lượng (hiện dashboard cộng cả `HarvestLog` và `CareLog` loại “Thu hoạch”, có nguy cơ cộng trùng) | P1 |

### A.2. Chức năng AI (mục 3.2)

| # | Mục yêu cầu | Đã có chưa | Bằng chứng (file, hàm, endpoint) | Việc cần làm | Mức ưu tiên |
|---|---|---|---|---|---|
| A9 | 3.2.1 AI sinh lịch chăm sóc tham khảo theo giống cây và ngày gieo | **Đủ** | `app/services/ai_schedule.py`; `app/routers/ai_schedule.py` (`POST /api/ai-schedule/batches/{batch_id}/schedule`); prompt System/User; backend tự tính ngày từ `day_offset`; kiểm tra `day_offset ≤ growth_days`, tối thiểu 1 tưới/2 bón/2 sâu bệnh; UI tab “Lịch chăm sóc” | Sửa đoạn kiểm tra dấu tiếng Việt đang nằm sau `raise` (dòng 103–111); thêm test cho lịch hợp lệ/không hợp lệ | P1 |
| A10 | 3.2.2 AI tóm tắt nhật ký trồng trọt của từng lô | **Đủ** | `app/services/ai_summary.py`; `app/routers/ai_summary.py`; `POST /api/ai-summary/batches/{id}/summary` và `/api/v1/ai-summary/...`; đã gọi thật trả 200; bắt buộc `referenced_log_ids` là ID thật; fallback khi lô không có nhật ký | Giới hạn lô theo `current_user.plot_id` cho STAFF (xem C4); thêm test cho trường hợp thiếu dữ liệu | P1 |
| A11 | 3.2.3 AI gợi ý lô cần kiểm tra dựa trên nhật ký và lịch chăm sóc | **Một phần** | `app/services/ai_alert.py`; `app/routers/ai_alert.py` (`POST /api/ai-alert/alerts`); dùng `days_since_last_log` + dấu hiệu sâu bệnh 14 ngày; prompt giới hạn mã lô có thật. **Nhưng** `app/repositories/crop_batch.py::get_growing_batches` lọc `growing`, `planting`, `đang trồng`, `đang canh tác`, trong khi dữ liệu thật dùng `Đang sinh trưởng` → **đã chạy hàm, trả 0 lô** dù có 1 lô đang sinh trưởng | Chuẩn hóa trạng thái lô trồng (thêm `Đang sinh trưởng`/`đang sinh trưởng`), hoặc lưu trạng thái chuẩn `growing`; thêm test với dữ liệu thật; kiểm tra lại kết quả endpoint | P0 |
| A12 | Mục tiêu: AI gợi ý thời điểm thu hoạch | **Thiếu** | Không tìm thấy endpoint/service AI nào cho việc này. `expected_harvest_date` hiện được tính từ `growth_days` khi tạo lô trồng, và `ai_schedule` chỉ trả lại ngày dự kiến lấy từ CSDL, không phải AI dự đoán | Hoặc triển khai chức năng AI gợi ý thời điểm thu hoạch (dựa trên giống, ngày gieo, nhật ký), hoặc ghi rõ trong báo cáo đây là “ngày dự kiến theo quy tắc”, không phải AI | P1 |
| A13 | Mục tiêu: bán sản phẩm | **Thiếu** | `app/models/sale.py`, `app/services/sale.py`, `app/routers/sale.py` có code nhưng `app/main.py` **không** `include_router(sale.router)`; không có trang bán hàng; 12 dòng `sales` là seed | Gắn router, thêm UI bán hàng gắn với lô thu hoạch, hoặc bỏ tuyên bố “bán sản phẩm” khỏi phần đã hoàn thiện | P1 |

### A.3. Yêu cầu kỹ thuật và dữ liệu

| # | Mục yêu cầu | Đã có chưa | Bằng chứng (file, hàm, endpoint) | Việc cần làm | Mức ưu tiên |
|---|---|---|---|---|---|
| A14 | Backend FastAPI/Flask/Django | **Đủ** | FastAPI 0.141.1, Uvicorn 0.52.3; `app/main.py`; 55 handler | Giữ nguyên | — |
| A15 | Frontend React/Vue/HTML | **Đủ** | Next.js 16.4.3, React 19.2.8, TypeScript 5.7.3; 12 trang trong `frontend/app` | Giữ nguyên | — |
| A16 | CSDL SQLite/MySQL/PostgreSQL | **Đủ** | SQLite `farm.db`; 12 bảng nghiệp vụ; 7 migration Alembic; `PRAGMA integrity_check = ok` | Bật `PRAGMA foreign_keys=ON` khi khởi tạo kết nối để ràng buộc FK có hiệu lực | P1 |
| A17 | AI engine OpenAI/Gemini/Claude/Hugging Face/Ollama | **Đủ** | `google-genai` 2.18.1; `app/core/ai_client.py` (`call_gemini`, `call_gemini_structured`); model `gemini-2.5-flash`; đã gọi thật ở chức năng tóm tắt | Đọc `GEMINI_MODEL` từ biến môi trường thay vì viết cứng; ghi rõ model trong báo cáo | P2 |
| A18 | Cảnh báo AI chỉ đưa gợi ý tham khảo, cần chuyên gia nông nghiệp kiểm chứng | **Một phần** | `app/core/ai_client.py::DISCLAIMER_TEXT`; hiển thị ở `GlobalAIChatbot.tsx` (dòng 772, 810, 837), `care-logs/page.tsx` (dòng 849, 597); API trả `disclaimer` trong 3 schema AI. **Nhưng** chỉ là câu chữ, chưa có quy trình/bảng trạng thái “chuyên gia đã kiểm chứng” | Giữ disclaimer; bổ sung trường “người kiểm chứng/trạng thái” nếu muốn đáp ứng mức cao hơn; nói rõ trong báo cáo đây là cảnh báo, không phải chứng nhận | P2 |
| A19 | Có test cho lô trồng, nhật ký, thu hoạch và AI | **Một phần** | 18 test pass: lô trồng 4, nhật ký 3, AI 1 (mock Gemini), auth 7, vật tư 2, truy xuất 1. **Không có test API thu hoạch**, không có test AI schedule/summary/alert thật, không có test biên | Thêm test cho thu hoạch, 3 chức năng AI, biên ngày/pH/EC/nhiệt độ, 403 của STAFF với AI summary, endpoint công khai | P0 |
| A20 | Dữ liệu đầu vào/đầu ra AI | **Đủ** | `app/services/ai_schedule.py`, `ai_summary.py`, `ai_alert.py`, `app/routers/ai_advisor.py` (`build_system_context`); schema `ScheduleAIRaw`, `SummaryAIRaw`, `AlertAIRaw`, `AdvisorResponse`; lưu `ai_suggestions` (37 bản ghi) | Ghi rõ trong báo cáo rằng dữ liệu vào là CSDL thật, không phải văn bản người dùng tự nhập | — |
| A21 | Prompt mẫu trong đề bài | **Đủ** | Đề bài mẫu System + User; implementation tương đương trong `ai_summary.py` (System + User + ID nhật ký); KT1 có 3 prompt template chi tiết | Đồng bộ lại prompt KT1 với code hiện tại (model, tên trường, vai trò) để tránh trích dẫn sai khi bảo vệ | P2 |
| A22 | Sử dụng AI trong SDLC (KT1–KT3, cuối kỳ) | **Thiếu** | Có `Tai_lieu_KT1_He_thong_trang_trai_rau_sach_AI.docx` (phân tích, ERD, prompt) nhưng **không có nhật ký AI trong SDLC**: không có prompt đã dùng, đầu ra AI, chỗ sửa, so sánh trước/sau | Tạo `docs/evidence/AI_SDLC_LOG.md`: từng giai đoạn, prompt, kết quả, lỗi AI phát hiện, cách sửa; kèm ảnh chụp/commit | P1 |
| A23 | Mức độ khó: AI tránh cam kết chuyên môn | **Thiếu** | Không có câu cấm liều lượng/cam kết sản lượng trong 4 prompt; `description` và `reply` là văn bản tự do; không có post-filter. Xem C2 | Thêm quy tắc “không nêu liều cụ thể, không cam kết năng suất”; thêm kiểm tra hậu xử lý và test đối kháng | P0 |

---

## B. Đối chiếu theo 5 tiêu chí chấm

### B.1. Bảng tổng hợp 20 tiêu chí con

| Mã | Tiêu chí con | Đã có chưa | Bằng chứng chính | Việc cần làm | Mức ưu tiên |
|---|---|---|---|---|---|
| 1.1 | Phân tích đúng nghiệp vụ | **Một phần** | KT1 có nhóm chức năng, vai trò, quan hệ; README mục 1–3; FACT_SHEET mục 1, 6. **Nhưng** KT1 ghi 3 vai trò, code có 4 (`admin`, `manager`, `technician`, `staff`); KT1 ghi bảng `HARVESTS`, code dùng `harvest_logs` | Cập nhật KT1/báo cáo theo code thật; thêm sơ đồ use case/activity nếu giáo viên yêu cầu | P1 |
| 1.2 | Yêu cầu chức năng đầy đủ | **Một phần** | FACT_SHEET có FR-01…FR-18; README mục 7.1. **Nhưng** thiếu AI gợi ý thu hoạch, bán sản phẩm, báo cáo tổng hợp; một số FR ghi “một phần” | Bổ sung FR cho 3 mục còn thiếu hoặc ghi rõ ngoài phạm vi; đối chiếu lại trạng thái từng FR | P1 |
| 1.3 | Kiến trúc, CSDL hợp lý | **Đủ** | Kiến trúc 3 lớp trong FACT_SHEET mục 4; 12 bảng, quan hệ, ERD Mermaid mục 5; migration Alembic 7 file | Bật FK; vẽ ERD/sơ đồ lớp vào báo cáo; ghi rõ alias route để không nhầm 197 entry là 197 chức năng | P1 |
| 1.4 | Lý giải vị trí AI | **Một phần** | KT1 mục 3 (luồng 5 bước cho 3 chức năng AI); FACT_SHEET 8.11 giải thích vì sao đặt AI ở lịch/tóm tắt/cảnh báo/hỏi đáp. **Nhưng** chưa có đo lường “AI tốt hơn quy tắc ở đâu”, chưa có so sánh trước/sau | Thêm bảng “bước nghiệp vụ – vì sao cần AI – nếu không dùng AI thì sao”; nêu rõ AI chỉ hỗ trợ ra quyết định | P1 |
| 2.1 | Nghiệp vụ chính chạy đúng | **Một phần** | Đăng nhập, lô đất, giống, lô trồng, nhật ký, vật tư, truy xuất chạy; test 18 pass. **Nhưng** tạo thu hoạch 500; AI alert trả 0; bán hàng không mount; `start-planting` không lưu ngày | Ưu tiên sửa 3 lỗi P0 ở A6, A11, A3; demo bằng dữ liệu seed và luồng đã chạy được | P0 |
| 2.2 | Đăng nhập và phân quyền | **Đủ** | `get_current_user` + `RequireRole` + 36 khóa quyền; STAFF bị giới hạn lô ở `plots`, `crop_batches`, `care_logs`, `ai_advisor/chat`; 7 test auth pass | Giữ nguyên; vá các endpoint công khai/không scope ở C4 | P1 |
| 2.3 | AI phục vụ nghiệp vụ | **Một phần** | 3 chức năng AI + advisor có route/UI; tóm tắt đã chạy thật 200; lịch có kiểm chứng; cảnh báo có prompt riêng. **Nhưng** cảnh báo sai bộ lọc; chưa có AI gợi ý thu hoạch | Sửa cảnh báo; thêm AI thu hoạch hoặc ghi rõ ngoài phạm vi; thêm test từng chức năng | P0 |
| 2.4 | Kết nối API và prompt | **Đủ** | `app/core/ai_client.py` gọi Gemini, structured output, prompt System/User, mapping lỗi 429/504/502/503; UI gọi đúng endpoint; 37 bản ghi `ai_suggestions` | Đọc model từ env; thêm timeout/retry; ghi lại prompt version | P2 |
| 3.1 | Kiểm thử đúng, sai, biên | **Một phần** | 18 test pass (4,33 s lần chạy lại); có ca sai: sai mật khẩu, thiếu tồn kho, tồn âm, file không phải ảnh, STAFF xem lô khác. **Thiếu** ca biên (0, max, đúng ngưỡng), test thu hoạch, test 3 AI | Bổ sung bảng test theo loại đúng/sai/biên; viết test cho các khoảng giá trị trong schema | P0 |
| 3.2 | So sánh các phiên bản prompt | **Thiếu** | Không có prompt v1/v2, không có log kết quả, không có bảng chấm điểm trong repo | Tạo `docs/evidence/PROMPT_COMPARISON.md`: 2 phiên bản, cùng 3–5 lô, cùng tiêu chí, ghi output và nhận xét | P1 |
| 3.3 | Xử lý lỗi AI | **Đủ** | `_raise_gemini_error` map 429/504/502; thiếu key 503; summary fallback 200; validate citations; schedule từ chối kết quả vượt `growth_days`/thiếu mốc | Thêm retry có giới hạn, timeout cấu hình; sửa kiểm tra dấu tiếng Việt | P2 |
| 3.4 | Bảo mật dữ liệu, API key | **Thiếu** | Không có key trong source/frontend; `.env` hiện untracked; `.env.example` dùng placeholder. **Nhưng** `.env` chứa key `AQ.` dài 53 ký tự trong lịch sử Git ở 5 commit; `SECRET_KEY` mặc định; CORS `*` + credentials; `/search`, `/api/notifications` không auth; AI summary không scope; `farm.db`/`app.db` bị track | Rotate key, purge history, đặt SECRET_KEY mạnh, vá CORS, scope endpoint, bỏ DB/venv khỏi Git (xem C5, C8) | P0 |
| 4.1 | Giao diện dễ sử dụng | **Đủ** | 12 trang; sidebar; responsive; dashboard thẻ số liệu + biểu đồ; disclaimer trên các tab AI; nút hành động theo quyền frontend | Thêm màn hình ghi thu hoạch; kiểm tra khả năng truy cập bàn phím và màn hình nhỏ | P1 |
| 4.2 | Triển khai, README, Git | **Một phần** | README 17 mục, 505 dòng, có giới hạn trung thực; `.env.example` có; Docker Compose có backend/frontend. **Nhưng** `requirements.txt` 0 byte; `app/Dockerfile` không cài được gì; URL API trong README/Compose là `/api/v1` nhưng `lib/api.ts` thêm `/api` → `/api/v1/api/...`; repo track 18.951 file, phần lớn là venv; DB bị track | Sửa requirements, Docker, URL; dọn repo; thêm CI thật (xem C8) | P0 |
| 4.3 | Báo cáo kỹ thuật đầy đủ | **Một phần** | Có KT1 (phân tích, ERD dạng bảng, luồng, 3 prompt); có README và 3 file evidence. **Nhưng** chưa có báo cáo cuối kỳ đầy đủ trong repo: chưa có sơ đồ use case/activity/sequence/state, chưa có chương kiểm thử/đánh giá, chưa có kết luận | Viết báo cáo từ FACT_SHEET; chèn ERD Mermaid, sơ đồ luồng, bảng test, bảng so sánh prompt, phần hạn chế | P1 |
| 4.4 | Demo trực tiếp thành công | **Một phần** | Health check, đăng nhập, đọc dữ liệu, trace, AI tóm tắt có thể chạy; test pass; frontend type-check pass | Chuẩn bị kịch bản demo tránh nút thu hoạch lỗi và cảnh báo AI 0 lô; sửa 2 lỗi P0 trước demo; có phương án dự phòng nếu mạng/Gemini lỗi | P0 |
| 5.1 | Minh chứng AI trong SDLC | **Thiếu** | Không có nhật ký prompt/đầu ra AI theo KT1–KT3; KT1 là tài liệu thiết kế, không phải bằng chứng dùng AI | Tạo log AI theo giai đoạn, kèm prompt, output, lỗi và cách sửa; liên kết commit | P1 |
| 5.2 | Kiểm chứng, sửa lỗi AI | **Một phần** | Có kiểm chứng citations, `day_offset`, số mốc tối thiểu, fallback; tài liệu evidence đã chỉ ra lỗi. **Nhưng** chưa có nhật ký “AI trả sai gì – sửa prompt/code thế nào – kết quả sau sửa”; chưa có test đối kháng | Ghi lại 3–5 lỗi AI thật (bịa ID, thiếu mốc, vượt ngày, không dấu), cách sửa, bằng chứng trước/sau | P1 |
| 5.3 | Vấn đáp độc lập từng người | **Thiếu** | Không có phân công module/QA theo thành viên trong repo; không có bằng chứng từng người hiểu phần mình làm | Lập bảng phân công; mỗi người chuẩn bị 5 câu hỏi về module mình; tập trả lời không đọc code | P1 |
| 5.4 | Cải tiến, đóng góp riêng | **Thiếu** | README có mục đóng góp chung, nhưng không có changelog/commit attribution/đóng góp riêng | Tạo `CONTRIBUTIONS.md`: việc làm, commit, phần sở hữu, cải tiến riêng (ví dụ tối ưu N+1, sửa trace, thêm test) | P1 |

### B.2. Nhận xét theo từng tiêu chí lớn

| Tiêu chí | Điểm mạnh đã có bằng chứng | Điểm dễ mất điểm | Kết luận |
|---|---|---|---|
| 1. Phân tích và thiết kế (1.1–1.4) | KT1 có nghiệp vụ, ERD, luồng AI; FACT_SHEET có 12 bảng, ERD, FR/NFR; kiến trúc rõ | Tài liệu KT1 lệch code (3 vs 4 vai trò, `HARVESTS` vs `harvest_logs`, model 2.0 vs 2.5); thiếu sơ đồ use case/activity chính thức | **Một phần** |
| 2. Hệ thống và AI (2.1–2.4) | 4 vai trò, 36 quyền, backend kiểm tra quyền; 3 AI + advisor; prompt có cấu trúc; test pass | Thu hoạch 500; AI alert 0; bán hàng không mount; AI thu hoạch thiếu | **Một phần** |
| 3. Thực nghiệm, kiểm thử, đánh giá (3.1–3.4) | 18 test pass; có ca sai; xử lý lỗi AI; fallback; validate citation | Không test thu hoạch/3 AI; không so sánh prompt; key trong lịch sử Git; CORS mở; endpoint công khai | **Một phần** |
| 4. Sản phẩm, báo cáo, demo (4.1–4.4) | UI 12 trang, responsive, disclaimer; README tốt; trace QR chạy | Requirements rỗng, Docker lỗi, URL lệch; báo cáo cuối kỳ chưa có; demo có 2 lỗi chặn | **Một phần** |
| 5. Tư duy phản biện, AI có trách nhiệm (5.1–5.4) | Có disclaimer; có kiểm chứng output; tài liệu hạn chế trung thực | Không có log AI SDLC; không có so sánh prompt; không có phân công/vấn đáp; chưa có rào chắn liều lượng/cam kết | **Một phần** |

---

## C. Kiểm tra đặc biệt 8 mục dễ bị trừ điểm

### C1. Cảnh báo “AI chỉ mang tính tham khảo” đã hiển thị ở giao diện chưa?

**Kết luận: Đã có, ở các màn hình đang dùng.**

Bằng chứng:

| Vị trí | Nội dung | Ghi chú |
|---|---|---|
| `app/core/ai_client.py::DISCLAIMER_TEXT` | “Lưu ý: Thông tin do AI tạo ra chỉ mang tính chất tham khảo. Vui lòng tham khảo ý kiến chuyên gia nông nghiệp trước khi ứng dụng thực tế.” | Backend gắn vào `AiScheduleOut`, `AiSummaryOut`, `AiAlertOut` |
| `frontend/components/ai/GlobalAIChatbot.tsx` dòng 772, 810, 837 | Hiển thị `result.disclaimer` ở tab lịch, tóm tắt, cảnh báo | Đây là các tab đang dùng |
| `frontend/components/ai/GlobalAIChatbot.tsx` dòng 646 | “AI hỗ trợ tham khảo; hãy kiểm tra trước khi áp dụng.” | Câu tĩnh dưới ô chat |
| `frontend/app/(dashboard)/care-logs/page.tsx` dòng 849 | Hiển thị `schedule.disclaimer` | Tab lịch trong trang nhật ký |
| `frontend/app/(dashboard)/care-logs/page.tsx` dòng 597 | `chatDisclaimer` lấy từ API hoặc câu mặc định | Chat trong trang nhật ký |
| `frontend/components/dashboard/ai-alert-card.tsx` dòng 113–115 | Cảnh báo tham khảo | Component có code nhưng hiện không được import ở đâu; không tính là màn hình đang dùng |
| `frontend/components/layout/notification-dropdown.tsx` dòng 245–248 | Cảnh báo AI | Tương tự, component không được import; header dùng dropdown nội bộ khác |

**Rủi ro còn lại:** disclaimer chỉ là câu chữ, không có bước “chuyên gia đã kiểm chứng” và không có log ai đã xem/duyệt. Nếu giáo viên hỏi “làm sao biết chuyên gia đã kiểm chứng?”, hiện chưa có bằng chứng.

---

### C2. AI có thể đưa liều thuốc/phân bón cụ thể hoặc cam kết sản lượng không?

**Kết luận: Có khả năng, vì chưa có rào chắn nào. Đây là lỗi thiết kế prompt cần sửa trước khi bảo vệ.**

Bằng chứng:

- `app/services/ai_schedule.py::SYSTEM_PROMPT` yêu cầu “nêu việc cần làm cụ thể”, “Bón”, “Tưới”, nhưng **không cấm** ghi “bón 5 kg”, “phun 20 ml”, “năng suất đạt 3 tấn”.
- `ScheduleItemOut.description` là `str` tự do; backend chỉ kiểm tra `day_offset`, số mốc tối thiểu, không kiểm tra nội dung liều lượng.
- `ai_summary.py` trả `recommendations: list[str]` tự do; prompt không cấm dự báo sản lượng.
- `ai_advisor.py` trả `reply: str` tự do; prompt chỉ yêu cầu dùng dữ liệu thật, không cấm khuyến nghị liều lượng/cam kết.
- Không có regex/post-filter nào trong `app/` chặn các mẫu số + đơn vị (kg, ml, lít, tấn/ha) hoặc từ “cam kết”, “chắc chắn”, “đảm bảo năng suất”.
- Test AI duy nhất (`tests/test_ai_service.py`) chỉ kiểm tra disclaimer, không kiểm tra nội dung nguy hiểm.

**Cách sửa đề xuất:**

1. Thêm vào cả 4 prompt quy tắc: “Không nêu liều lượng thuốc/phân bón cụ thể; không cam kết năng suất/sản lượng; chỉ nêu việc cần làm và khuyến nghị hỏi chuyên gia.”
2. Thêm post-filter: nếu `description`/`reply`/`recommendations` khớp mẫu số + đơn vị hoặc từ cam kết, thay bằng câu an toàn và ghi log.
3. Thêm test đối kháng: mock Gemini trả “bón 10 kg urê” và “cam kết 5 tấn/ha”, assert hệ thống chặn/cảnh báo.
4. Ghi vào báo cáo phần “AI có trách nhiệm”: rủi ro, cách kiểm soát, bằng chứng test.

---

### C3. Khi nhật ký thiếu dữ liệu, AI xử lý thế nào?

**Kết luận: Xử lý khá tốt ở tóm tắt và lịch; cảnh báo có xử lý nhưng đang sai bộ lọc trạng thái.**

| Tình huống | Cách xử lý | Bằng chứng |
|---|---|---|
| Lô không có nhật ký nào | **Không gọi AI**; trả `summary = "Lô đất hiện chưa ghi nhận nhật ký chăm sóc nào."`, `issues = ["Chưa có dữ liệu nhật ký chăm sóc"]`, khuyến nghị thêm nhật ký | `app/services/ai_summary.py` nhánh `len(logs) == 0` |
| Lô không tồn tại | Trả 200 + “Không tìm thấy lô trồng tương ứng để phân tích.”, không gọi AI | `_fallback_summary(..., unavailable_batch=True)` |
| AI tóm tắt lỗi/không trích ID | Trả 200 + fallback “Đã ghi nhận các hoạt động chăm sóc gần đây trên lô đất.”; không lưu suggestion | `_summarize_resolved_batch` |
| Giống chưa có `growth_days` | Trả 400 “Giống cây chưa có thời gian sinh trưởng hợp lệ.” | `ai_schedule.py` |
| Lô chưa có ngày gieo | Trả 400 “Lô trồng chưa có ngày gieo hợp lệ.” | `ai_schedule.py` |
| Lô chưa từng có nhật ký (cảnh báo) | `days_since_last_log = None`, vẫn đưa vào dữ liệu để AI xếp hạng; prompt yêu cầu chỉ dùng chỉ số được cung cấp | `ai_alert.py::_compute_batch_facts` |
| Không có lô đang trồng | Trả 0 lô, không gọi AI, vẫn lưu suggestion | `ai_alert.py::suggest_batches_to_check` |
| Advisor thiếu dữ liệu | Prompt yêu cầu trả đúng “Chưa đủ dữ liệu ghi nhận” | `ai_advisor.py` system prompt |

**Rủi ro:** chưa có test tự động cho các nhánh trên; cảnh báo trả 0 vì `get_growing_batches` không khớp trạng thái `Đang sinh trưởng`, không phải vì thiếu dữ liệu.

---

### C4. Phân quyền có kiểm tra ở backend hay chỉ ẩn menu ở frontend?

**Kết luận: Phần lớn kiểm tra ở backend, nhưng còn 6 lỗ hổng cần vá.**

Đã kiểm tra ở backend:

- `app/core/deps.py::get_current_user` giải mã JWT, kiểm tra user còn active.
- `app/core/deps.py::RequireRole` kiểm tra role, admin bypass.
- `app/core/permissions.py::require_permission` kiểm tra 36 khóa quyền.
- `app/routers/plot.py`, `crop_batch.py`, `care_log.py` lọc `plot_id` cho `staff`/`worker`.
- `app/routers/ai_advisor.py::chat_with_advisor` chặn STAFF hỏi lô khác.
- 7 test auth pass, gồm test STAFF bị giới hạn lô và MANAGER không tạo được tài khoản quyền cao.

Lỗ hổng:

| Endpoint/hàm | Vấn đề | Bằng chứng |
|---|---|---|
| `GET /search` | Không dùng `get_current_user`; ai cũng gọi được, chỉ tìm trong `HarvestLog.notes` | `app/routers/search.py` |
| `GET /api/notifications` | Không auth, trả 20 thông báo mới nhất, không lọc người nhận | `app/routers/notification.py` |
| `GET /api/harvests` | Chỉ kiểm tra quyền `harvests:read`, không lọc `plot_id` cho STAFF | `app/routers/harvest.py::list_all_harvests` |
| `POST /api/ai-summary/...` | Router không nhận `current_user`; STAFF biết ID lô vẫn tóm tắt được lô khác | `app/routers/ai_summary.py` |
| `POST /api/v1/ai-advisor/summary` | Alias gọi thẳng `summary_service.summarize_batch`, không scope | `app/routers/ai_advisor.py` dòng 120–130 |
| `GET /api/traceability/{code}`, `/api/batches/.../trace` | Công khai có chủ đích cho QR; cần cân nhắc dữ liệu nhạy cảm | `traceability.py`, `crop_batch.py` |

Ngoài ra, `frontend/lib/nav.ts` chỉ khai báo `roles` cho 2 mục (vật tư, tài khoản); nhiều mục còn lại hiện cho mọi người đã đăng nhập. Đây là ẩn menu, **không thay thế** kiểm tra backend. Khi bảo vệ, nên nói rõ: backend là lớp kiểm soát chính; frontend chỉ hỗ trợ trải nghiệm.

---

### C5. API key có nằm trong code, lịch sử Git hoặc frontend không?

**Kết luận: Không nằm trong source/frontend hiện tại, nhưng đã từng nằm trong lịch sử Git. Phải rotate và purge trước khi nộp public.**

Đã kiểm tra:

- `grep` trong `app/` (trừ `app/venv`) và `frontend/` không thấy literal key; chỉ thấy `settings.GEMINI_API_KEY`.
- `.env` hiện không bị track (`git ls-files .env` = 0) và đã nằm trong `.gitignore`.
- `.env.example` dùng placeholder `your_gemini_api_key_here`.
- Nhưng `git log --all -S "AQ." -- .env` cho thấy file `.env` chứa key dạng `AQ.` dài 53 ký tự trong **5 commit**: `27dfcdca`, `a6cb3bd2`, `6d2831f9`, `5cbc4c2e`, `18ba4e0b`.
- `app/core/security.py` dùng `SECRET_KEY` mặc định `your-super-secret-key-change-this-in-production` nếu không có env.
- `app/main.py` CORS `allow_origins=["*"]` kèm `allow_credentials=True`.
- `farm.db` và `app.db` bị track, chứa hash mật khẩu/email/dữ liệu demo.
- Frontend chỉ dùng `NEXT_PUBLIC_*` cho URL, không chứa khóa AI.

**Việc phải làm ngay:**

1. Thu hồi (revoke) key cũ trên Google AI Studio và tạo key mới; cập nhật `.env` cục bộ và biến môi trường khi deploy.
2. Purge lịch sử: `git filter-repo --path .env --invert-paths` (hoặc BFG), sau đó force-push có phối hợp; thông báo cho nhóm clone lại repo.
3. Đặt `SECRET_KEY` mạnh, riêng cho từng môi trường; không dùng giá trị mặc định/Compose.
4. Thu hẹp CORS theo domain thật; bỏ `allow_credentials=True` nếu không cần.
5. Bỏ `farm.db`, `app.db`, `venv/`, `.venv/`, `app/venv/`, `__pycache__/` khỏi Git; sửa `.gitignore` dùng đường dẫn gốc.
6. Thêm secret scanning (GitHub secret scanning hoặc `gitleaks`) vào CI.

---

### C6. Có test cho lô trồng, nhật ký, thu hoạch, AI chưa? Có ca đúng/sai/biên không?

**Kết luận: Có test cho lô trồng, nhật ký, AI (mock), vật tư, auth, trace; thiếu test thu hoạch và 3 chức năng AI; ca biên còn mỏng.**

Kết quả chạy lại ngày 29/10/2026:

```text
venv/Scripts/python.exe -m pytest tests -q
18 passed, 77 warnings in 4.33s
```

| File | Số bài | Nội dung chính | Loại ca |
|---|---:|---|---|
| `tests/test_auth.py` | 7 | Đăng nhập đúng/sai, thiếu token, đổi mật khẩu, quản lý tài khoản, STAFF bị scope lô, MANAGER không tạo quyền cao | Đúng + sai |
| `tests/test_crop_batch.py` | 4 | Tạo lô trừ tồn giống, lưu ngày/phương thức/chứng nhận, xóa hoàn tồn, thiếu tồn | Đúng + sai |
| `tests/test_care_log.py` | 3 | Ghi nhật ký thu hoạch, upload ảnh PNG, từ chối file không phải ảnh | Đúng + sai |
| `tests/test_supply.py` | 2 | Tạo vật tư có tồn/hạn/ghi chú, từ chối tồn âm | Đúng + sai |
| `tests/test_traceability.py` | 1 | Trace công khai trả dữ liệu liên quan | Đúng |
| `tests/test_ai_service.py` | 1 | Advisor trả JSON + disclaimer, mock Gemini | Đúng (mock) |

Thiếu:

- **Thu hoạch:** không có test cho `POST /api/harvests` (chính là endpoint đang 500).
- **AI:** không test `ai_schedule`, `ai_summary`, `ai_alert`; test duy nhất mock Gemini và chỉ kiểm tra disclaimer.
- **Biên:** chưa test đúng ngưỡng `growth_days = 1/2000`, pH `0/14`, nhiệt độ `-20/60`, độ ẩm `0/100`, `quantity = 0`, `quality_percent = 0/100`, ngày gieo = hôm nay, `expected_harvest_date = sow_date`.
- **Phân quyền:** chưa test STAFF gọi AI summary lô khác phải 403; chưa test `/search`/`/notifications` công khai.
- **Frontend:** không có test; `package.json` chỉ có `dev`, `build`, `start`, `lint`.
- **CI:** `.github/workflows/playwright.yml` có nhưng repo không có `playwright.config.*` và không có test Playwright; `requirements.txt` rỗng nên bước cài Python không có tác dụng.

---

### C7. Thu hoạch/gợi ý thu hoạch, bán sản phẩm, thống kê vật tư có chưa?

**Kết luận: Thu hoạch ghi nhận được qua nhật ký nhưng API chuyên dụng lỗi; gợi ý thu hoạch bằng AI chưa có; bán sản phẩm chưa chạy; thống kê vật tư chỉ ở mức cảnh báo/xuất Excel.**

| Mục | Trạng thái | Bằng chứng | Ghi chú |
|---|---|---|---|
| Ghi nhận thu hoạch | **Một phần** | `POST /api/harvests` 500; UI không có modal thu hoạch; trang nhật ký có loại “Thu hoạch” ghi `quantity`/`quality_percent` | Dữ liệu `harvest_logs` 12 dòng là seed, không do API tạo |
| Nhiều đợt thu hoạch trên một lô | **Một phần** | Model `HarvestLog` quan hệ 1-N với `CropBatch`; nhưng API tạo lỗi | Sửa API là có thể dùng |
| Gợi ý thời điểm thu hoạch | **Thiếu** | Không có service/endpoint AI; `expected_harvest_date` tính từ `growth_days` khi tạo lô | Cần phân biệt “ngày dự kiến theo quy tắc” và “AI gợi ý” |
| Bán sản phẩm | **Thiếu** | `models/sale.py`, `services/sale.py`, `routers/sale.py`; `main.py` không mount; không có UI; 12 dòng `sales` seed | Nếu không làm kịp, bỏ khỏi phần “đã hoàn thiện” |
| Thống kê sản lượng | **Một phần** | `dashboard.py` + `HarvestYieldChart`; có nguy cơ cộng trùng `HarvestLog` và `CareLog` loại “Thu hoạch” | Hiện 9 care log “Thu hoạch” có `quantity = 0` nên chưa cộng trùng, nhưng logic vẫn rủi ro |
| Thống kê vật tư | **Một phần** | `GET /api/supplies/alerts` (tồn thấp/hạn 30 ngày); `/data-reports` xuất Excel phía client; không có API tổng hợp | Thêm endpoint báo cáo nhập–xuất–tồn theo kỳ |
| Thống kê lịch chăm sóc | **Một phần** | Danh sách nhật ký + lịch AI; không có bảng tổng hợp theo tuần/tháng | Có thể dùng dữ liệu `care_logs` để tổng hợp |

---

### C8. README, `.env.example`, Git có đủ không?

**Kết luận: README và `.env.example` khá tốt; Git và khả năng cài đặt lại chưa đạt.**

| Mục | Trạng thái | Bằng chứng | Vấn đề |
|---|---|---|---|
| README | **Đủ nội dung** | `README.md` 505 dòng, 17 mục: giới thiệu, kiến trúc, công nghệ, CSDL, chức năng, API, cài đặt, seed, kiểm thử, cấu trúc, gợi ý báo cáo, giới hạn, bảo mật | Mục 11 chỉ hướng dẫn `compileall`, không hướng dẫn `pytest`; hướng dẫn `pip install -r requirements.txt` không chạy được vì file rỗng |
| `.env.example` | **Một phần** | 1.163 byte; có `PROJECT_NAME`, `DEBUG`, `HOST`, `PORT`, `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, `GEMINI_API_KEY`, `OPENAI_API_KEY` | Thiếu `GEMINI_MODEL`, `GEMINI_MAX_PROMPT_CHARS` dù README có nhắc; `OPENAI_API_KEY` không dùng |
| `.gitignore` | **Một phần** | Có `.env`, `node_modules`, `frontend/.next`, `farm_backend/venv/`, `farm_backend/.venv/` | Đường dẫn `farm_backend/...` không khớp thư mục gốc; không ignore `farm.db`, `app.db`, `app/venv/`, `__pycache__/` gốc |
| Git sạch | **Thiếu** | `git ls-files` = 18.951 file; trong đó `venv/` 11.516, `.venv/` 6.052, `app/venv/` 861; `farm.db`, `app.db` bị track; `.env` từng nằm trong 5 commit | Repo nặng, lộ dữ liệu, khó clone/chấm |
| Khả năng cài đặt lại | **Thiếu** | `requirements.txt` 0 byte; `app/Dockerfile` `COPY requirements.txt` rồi `pip install` nhưng file rỗng; `docker-compose.yml` build backend từ `app/Dockerfile` | Không thể dựng lại môi trường chỉ từ repo |
| URL API | **Thiếu** | README và Compose dùng `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`; `frontend/lib/api.ts` thêm `/api` nếu URL không kết thúc bằng `/api` → `http://localhost:8000/api/v1/api/...` | Sai đường dẫn khi chạy Docker/production |
| CI | **Một phần** | `.github/workflows/playwright.yml` | Không có test Playwright; `pip install -r requirements.txt` rỗng; workflow sẽ không kiểm tra được gì |

---

## D. 10 việc nên làm trước để tăng điểm nhiều nhất

| # | Việc nên làm | Tiêu chí tác động | Vì sao / bằng chứng | Cách làm gợi ý | Công sức | Ưu tiên |
|---:|---|---|---|---|---|---|
| 1 | **Sửa thu hoạch end-to-end + thêm màn hình ghi thu hoạch** | 2.1, 3.1, 4.1, 4.4 | `POST /api/harvests` đang 500; không có UI; `harvest_logs` chỉ có seed | Đồng bộ `HarvestCreate` (`batch_id`, `quantity`, `grade`, `notes`, `harvest_time`) với service/repository; tạo `HarvestLog`, sinh `qr_trace_code`, cập nhật trạng thái lô, liên kết bán hàng; thêm modal; test API + UI | 1–2 ngày | P0 |
| 2 | **Sửa bộ lọc trạng thái của AI cảnh báo** | 2.3, 4.4 | `get_growing_batches` trả 0 dù có 1 lô `Đang sinh trưởng`; đã chạy hàm xác nhận | Thêm `Đang sinh trưởng`/`đang sinh trưởng` hoặc chuẩn hóa trạng thái về `growing`; test với dữ liệu thật; kiểm tra endpoint trả đúng lô | 1–2 giờ | P0 |
| 3 | **Rotate khóa Gemini, purge lịch sử Git, đặt SECRET_KEY mạnh, dọn repo** | 3.4, 4.2 | Key `AQ.` 53 ký tự trong `.env` ở 5 commit; `SECRET_KEY` mặc định; CORS `*`; 18.951 file tracked | Revoke/tạo key mới; `git filter-repo` xóa `.env` khỏi lịch sử; force-push có phối hợp; đặt secret mạnh; bỏ DB/venv khỏi Git; sửa `.gitignore`; thêm secret scanning | 2–4 giờ | P0 |
| 4 | **Thêm rào chắn AI không đưa liều cụ thể/cam kết sản lượng** | 1.4, 3.1, 5.2 | 4 prompt không cấm; output là text tự do; không post-filter; test AI chỉ kiểm disclaimer | Thêm quy tắc vào System prompt; post-filter regex số + đơn vị/từ cam kết; test đối kháng; ghi vào báo cáo phần AI có trách nhiệm | 1 ngày | P0 |
| 5 | **Bổ sung test còn thiếu** | 3.1, 3.3 | 18 test pass nhưng 0 test thu hoạch, 0 test AI schedule/summary/alert thật, thiếu biên | Thêm test cho thu hoạch; mock Gemini cho 3 AI; test biên schema; test STAFF 403 với AI summary; test endpoint công khai; thêm `pytest` vào README/CI | 1–2 ngày | P0 |
| 6 | **Vá phân quyền và phạm vi dữ liệu** | 2.2, 3.4 | `/search`, `/api/notifications` không auth; `/api/harvests` không scope; AI summary/alias không scope | Thêm `get_current_user`/`require_permission`; lọc `plot_id` cho STAFF; thêm test 401/403; giữ trace công khai nhưng giới hạn trường nhạy cảm | 1 ngày | P1 |
| 7 | **Sửa cài đặt/triển khai: requirements, Docker, URL API** | 4.2, 4.4 | `requirements.txt` 0 byte; Docker backend không cài gì; README/Compose URL lệch `lib/api.ts` | Xuất `pip freeze` (hoặc requirements tối thiểu có phiên bản); sửa Dockerfile copy đúng; đổi URL thành `http://localhost:8000` hoặc sửa `lib/api.ts` hiểu `/api/v1`; chạy `docker compose up --build` kiểm tra | 1 ngày | P1 |
| 8 | **Hoàn thiện 2 mục tiêu còn thiếu: AI gợi ý thu hoạch + bán sản phẩm** | 1.2, 2.1, 2.3 | Không có service AI thu hoạch; `sale.router` không mount; không UI bán hàng; 12 sales seed | Nếu kịp: thêm endpoint AI gợi ý thời điểm thu hoạch dựa trên giống/ngày gieo/nhật ký; mount sale router + UI gắn lô thu hoạch. Nếu không kịp: ghi rõ ngoài phạm vi, không tuyên bố đã có | 1–2 ngày | P1 |
| 9 | **Tạo so sánh prompt v1/v2 và nhật ký AI trong SDLC** | 3.2, 5.1, 5.2 | Không có prompt v1/v2; không có log AI theo KT1–KT3 | Chọn 3–5 lô; chạy 2 phiên bản prompt; chấm cùng tiêu chí (đúng dữ liệu, có dẫn nguồn, không bịa, an toàn); ghi output + nhận xét; log prompt/code AI đã dùng ở từng giai đoạn | 1–2 ngày | P1 |
| 10 | **Hoàn thiện báo cáo, sơ đồ, phân công và kịch bản demo** | 4.3, 5.3, 5.4 | Chưa có báo cáo cuối kỳ; chưa có use case/activity/sequence/state; chưa có phân công/đóng góp | Dùng FACT_SHEET làm nguồn; vẽ ERD + use case + activity + sequence + state; thêm bảng test, bảng so sánh prompt, phần hạn chế; lập `CONTRIBUTIONS.md`; viết kịch bản demo tránh nút lỗi | 2–3 ngày | P1 |

---

## E. Ghi chú khi bảo vệ

- **Không nói “đã test toàn bộ”**: 18 test pass nhưng thiếu thu hoạch và 3 AI; nói đúng phạm vi đã test.
- **Không demo nút tạo thu hoạch** khi chưa sửa: API trả 500; có thể demo dữ liệu thu hoạch seed và trang trace.
- **Không demo tab cảnh báo AI** khi chưa sửa bộ lọc: endpoint trả 0 lô dù có lô đang sinh trưởng.
- **Disclaimer có, nhưng chưa có chuyên gia kiểm chứng**: nói rõ đây là cảnh báo tham khảo, không phải chứng nhận.
- **AI có thể đưa liều cụ thể**: chủ động nêu là hạn chế đã biết và trình bày cách sửa (prompt + post-filter + test), thay vì để giáo viên phát hiện.
- **Khóa API từng nằm trong Git**: chủ động nêu đã rotate/purge; nếu chưa làm, đây là rủi ro lớn nhất về bảo mật.
- **197 route entry không phải 197 chức năng**: giải thích alias `/api`, `/api/v1`, `/api/batches`/`/api/crop-batches`/`/api/crop-lots`; con số handler thật là 55.

---

*File này chỉ đối chiếu và đề xuất, không sửa mã nguồn. Các số liệu test/CSDL được lấy từ lần chạy ngày 29/10/2026; nếu sửa code, cần chạy lại và cập nhật thay vì dùng lại số cũ.*
