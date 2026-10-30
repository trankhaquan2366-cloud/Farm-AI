# UI_REVIEW.md — Rà giao diện theo vai trò

Ngày rà: **2026-10-30**. Công cụ: Chrome headless qua Playwright, đăng nhập thật bằng 4 tài khoản demo; ảnh lưu tại `docs/evidence/screenshots/`. Backend và frontend chạy cục bộ trên `127.0.0.1:8000` / `127.0.0.1:3000`.

---

## 1. Kết quả chung

| Hạng mục | Kết quả thật |
|---|---|
| Số ảnh chụp | **26** ảnh PNG (xem `SCREENSHOT_LIST.md`) |
| Vai trò đăng nhập được | admin, manager, technician, staff — đều trả HTTP 200, role trong JWT chữ thường |
| Build production | Exit code 0; `Compiled successfully in 73s`; 15/15 trang static |
| Type check | `npx tsc --noEmit` → `TSC_EXIT=0` |
| Lỗi chặn giao diện | Không còn sau khi khởi động lại frontend đúng build |
| Số lỗi nhỏ đã sửa | 5 |
| Số vấn đề còn tồn tại | 8 (mục 4) |

Ảnh đầu tiên bị mất toàn bộ CSS vì server frontend đang phục vụ build cũ trong lúc `.next` vừa được build lại. Đã dừng server, khởi động lại; toàn bộ ảnh sau đó hiển thị đúng. Đây là lỗi vận hành khi chụp, không phải lỗi sản phẩm.

---

## 2. Hành vi theo vai trò (đã kiểm tra bằng ảnh)

| Vai trò | Sidebar | Quyền thao tác quan sát được | Ảnh |
|---|---|---|---|
| Admin | Đủ 9 mục, gồm “Quản lý tài khoản” | Thấy nút thêm/sửa/xóa lô, vật tư, nhật ký, tài khoản | `03-admin-dashboard.png`, `04-admin-batches.png`, `06-admin-supplies.png` |
| Manager | Đủ 9 mục | Truy cập `/users`, thấy nút quản lý tài khoản | `22-manager-users.png` |
| Technician | Không có “Quản lý tài khoản” | Thấy “Tạo Lô Trồng Mới”, sửa lô, thêm nhật ký; không thấy quản lý tài khoản | `23-technician-batches.png`, `24-technician-care-logs.png` |
| Staff | Không có “Quản lý tài khoản” | Vào `/batches` chỉ đọc; nhưng dashboard vẫn hiện nút “Tạo Lô trồng mới” (lỗi UI, backend chặn 403) | `25-staff-dashboard.png`, `26-staff-forbidden.png` |

Kiểm tra quyền phía backend bằng `TestClient`:

```
POST /api/supplies          (staff) → 403 "Tài khoản không có quyền thực hiện thao tác này"
DELETE /api/batches/1       (staff) → 403 "Tài khoản không có quyền thực hiện thao tác 'crop_batches:delete'"
```

Như vậy backend có kiểm soát; lỗi chỉ nằm ở việc hiển thị nút phía client.

---

## 3. Lỗi nhỏ đã sửa trong đợt này

| # | Lỗi | Trước khi sửa | Cách sửa | Kiểm chứng |
|---|---|---|---|---|
| 1 | Trang vật tư quay vô hạn khi API lỗi | Chỉ có spinner, không có thông báo | Hiển thị “Không tải được danh sách vật tư. Vui lòng thử lại.” khi `suppliesError` | `tsc` + build pass |
| 2 | Chatbot bỏ mất disclaimer của từng câu trả lời | Chỉ hiện disclaimer chung cuối khung | Lưu `disclaimer` vào từng message và render dưới câu trả lời | `tsc` + build pass |
| 3 | Biểu đồ dùng dữ liệu minh họa khi API lỗi nhưng không nói | Người xem tưởng là số liệu thật | Thêm nhãn “Dữ liệu minh họa (API lỗi)” | `tsc` + build pass |
| 4 | Thẻ “Đang sinh trưởng” luôn bằng 0 | Bộ lọc chỉ nhận `growing/planting/đang trồng`, dữ liệu dùng “Đang sinh trưởng” | Thêm `đang sinh trưởng` vào danh sách trạng thái | Ảnh sau sửa + build |
| 5 | Tồn kho hiển thị `0.6000000000000005` | In trực tiếp số thực sau khi trừ kho | Hàm `formatQuantity` làm tròn 2 chữ số | Ảnh sau sửa + build |

Ảnh trước khi sửa được giữ tại `screenshots/before-fix/` để đối chiếu.

---

## 4. Vấn đề còn tồn tại (chưa sửa)

### 4.1. Trang đăng nhập công bố số liệu không có căn cứ — mức ưu tiên cao

`frontend/app/login/page.tsx:272-280` hiển thị:

- “Lô đất quản lý: **100+**”
- “Độ chính xác AI: **99.8%**”
- “Tiêu chuẩn canh tác: **GlobalGAP**”

Trong repository **không có** phép đo độ chính xác, không có 100+ lô đất (database demo có 7 lô), và không có chứng nhận GlobalGAP. Đây là tuyên bố marketing không kiểm chứng được, có thể bị phản biện trực tiếp khi bảo vệ. Ảnh: `01-login.png`.

**Đề xuất:** thay bằng mô tả chức năng (“Quản lý lô trồng”, “Gợi ý AI tham khảo”, “Truy xuất QR”) hoặc xóa số liệu.

### 4.2. Trang truy xuất công khai gắn nhãn VietGAP cố định

`app/routers/crop_batch.py:386` trả:

```python
"safety_certifications": ["VietGAP", "Cảnh báo dư lượng"],
```

Mọi lô đều hiện “VietGAP” và “Cảnh báo dư lượng”, kể cả khi không có dữ liệu chứng nhận. Ảnh: `20-trace-public.png`. Đây là rủi ro về tính xác thực, đã ghi trong `SECURITY_SCAN.md` mục S4.

### 4.3. Staff thấy nút tạo lô trồng trên dashboard

`frontend/app/(dashboard)/page.tsx:76-83` không kiểm tra quyền. Staff bấm vào sẽ được đưa tới `/batches?create=1`, nhưng trang batches ẩn nút với staff; nếu gọi API trực tiếp thì nhận 403. Ảnh: `25-staff-dashboard.png`.

**Đề xuất:** bọc nút bằng `hasPermission(userRole, PERMISSIONS.BATCH_CREATE)` giống trang batches.

### 4.4. Chuyển hướng khi thiếu quyền không có thông báo

`frontend/middleware.ts` chặn `/users` và `/accounts`; staff bị chuyển tới `/?forbidden=1`. Trang chủ **không đọc** tham số `forbidden`, nên người dùng chỉ thấy dashboard bình thường, không hiểu vì sao bị chặn. Ảnh: `26-staff-forbidden.png` (URL có `?forbidden=1`).

### 4.5. Dữ liệu legacy lẫn với dữ liệu demo

Các ảnh `04-admin-batches.png`, `07-admin-traceability.png` cho thấy lô tên “al”, “1”, “lol”, “chì chì”, lô đất “66”, “chì”, “Nội thành” nằm cạnh dữ liệu demo. Đây là bản ghi thử từ quá trình phát triển, không phải dữ liệu seed. Khi demo nên lọc hoặc dùng database sạch; không nên xóa mù quáng vì có thể mất dữ liệu cần đối chiếu.

### 4.6. Ba trong bốn tab AI không trả được kết quả do hạn mức; tab Tóm tắt chỉ hiện fallback

Model bị hard-code là `gemini-2.5-flash` (`app/core/ai_client.py:16`). Ngày chụp, model này trả 429:

| Tab | Ảnh | Kết quả thật trên UI |
|---|---|---|
| Hỏi đáp AI | `15-ai-chat-answer.png`, `19-ai-missing-data.png` | Banner đỏ “Dịch vụ AI đang quá tải hoặc đã đạt giới hạn. Vui lòng thử lại sau.” — không có câu trả lời |
| Lịch chăm sóc | `16-ai-schedule.png` | Cùng banner đỏ kèm nút “Thử lại” |
| Tóm tắt nhật ký | `17-ai-summary.png` | Hiện nội dung fallback của `app/services/ai_summary.py:179` với mục “Dịch vụ AI tạm thời gián đoạn”. Đây **không phải** nội dung do AI sinh; disclaimer vẫn ghi “Thông tin do AI tạo ra” |
| Cảnh báo AI | `18-ai-alert.png` | Không gọi AI: backend thấy 0 lô đang trồng nên trả danh sách rỗng (xem 4.8) |

Hệ quả: **không có ảnh AI trả lời bình thường** và **không có ảnh AI nêu “Chưa đủ dữ liệu ghi nhận”** trên UI. Bằng chứng nội dung AI chỉ có từ harness `COMPARISON.md` với model lite.

### 4.7. Thông báo lỗi thao tác ở trang lô trồng dùng `alert()`

`frontend/app/(dashboard)/batches/page.tsx:214,237,258` dùng `alert()` thay vì banner lỗi trong trang. Không chặn chức năng nhưng trải nghiệm kém và khó chụp làm bằng chứng.

### 4.8. Backend không nhận trạng thái “Đang sinh trưởng” nên cảnh báo AI luôn rỗng

`app/repositories/crop_batch.py:22` chỉ coi các trạng thái `growing`, `planting`, `đang trồng`, `đang canh tác` là đang trồng. Kiểm tra trực tiếp `farm.db`:

```
'Đang sinh trưởng' 1 lô
'Đã thu hoạch'    18 lô
```

Vì vậy `get_growing_batches()` trả 0 lô, và `POST /api/ai-alert/alerts` trả danh sách rỗng mà không gọi AI — đúng như ảnh `18-ai-alert.png` (“Chưa có lô nào được xếp vào danh sách cần kiểm tra ưu tiên”). Đây là lỗi lệch từ vựng trạng thái giữa dữ liệu và backend (frontend đã được sửa ở mục 3, backend thì chưa).

**Đề xuất:** thêm `đang sinh trưởng` vào danh sách, hoặc chuẩn hóa trạng thái về một mã duy nhất khi lưu.

---

## 5. Trạng thái loading / lỗi / thành công

| Trang | Loading | Lỗi | Thành công |
|---|---|---|---|
| Đăng nhập | Nút “Đang xác thực...”, spinner | `role="alert"` đỏ | Không có toast; chuyển trang |
| Tổng quan | Skeleton cho thẻ số liệu | **Không hiện lỗi SWR**; biểu đồ có nhãn dữ liệu minh họa | Không áp dụng |
| Lô trồng | Dòng “Đang tải...” | `alert()` | Không có banner |
| Nhật ký | Dòng trống/loading | Lỗi form, lỗi lịch, lỗi chat | Đóng form, không thông báo |
| Vật tư | Spinner (đã sửa để có lỗi) | Banner đỏ khi tải bảng thất bại | Banner xanh sau thao tác |
| Truy xuất | “Đang tải...” | Lỗi danh sách lô, lỗi truy xuất | Nút xem/in |
| Dữ liệu & Báo cáo | Loading đọc file/lưu | Thông báo lỗi nhập | Thông báo thành công |
| Tài khoản | Loading bảng | Banner lỗi | Banner thành công |

---

## 6. Kết luận

Giao diện chạy được, build và type check sạch, phân quyền backend đúng. Năm lỗi nhỏ đã được sửa và kiểm chứng lại. Tuy nhiên, ba điểm **không nên đưa vào bài bảo vệ như sự thật** là: “99.8%”, “100+ lô”, “GlobalGAP” trên trang đăng nhập; nhãn VietGAP cố định ở trang truy xuất; và việc AI chưa demo được do hạn mức. Các điểm này đã có ảnh và đường dẫn mã nguồn để đối chiếu.
