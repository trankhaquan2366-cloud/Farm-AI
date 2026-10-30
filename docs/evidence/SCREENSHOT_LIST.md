# SCREENSHOT_LIST.md — Danh mục ảnh chụp giao diện

Ngày chụp: **2026-10-30** (00:18–02:25 giờ máy). Ảnh lưu tại `docs/evidence/screenshots/`, định dạng PNG, khung nhìn **1440×900** (một số ảnh dùng chế độ full-page nên cao hơn).

## 1. Cách chụp và môi trường

- Backend: `uvicorn` tại `http://127.0.0.1:8000`, dùng `farm.db` hiện có.
- Frontend: bản build production (`next start`) tại `http://127.0.0.1:3000`.
- Trình duyệt: Chrome do máy cài sẵn, chạy headless qua Playwright Python; script `docs/evidence/scripts/capture_ui.py` (và `capture_harvest_form.py` cho ảnh 12).
- Mật khẩu 4 tài khoản demo giống README; không ghi lại trong tài liệu này.
- Toàn bộ ảnh là giao diện thật, đăng nhập thật, dữ liệu thật trong `farm.db`. Không dùng ảnh mockup.

Tài khoản dùng trong ảnh:

| Vai trò | Email |
|---|---|
| Admin | `demo_admin@greenfarm.local` |
| Manager | `demo_manager@greenfarm.local` |
| Technician | `demo_technician@greenfarm.local` |
| Staff | `demo_staff@greenfarm.local` |
| Khách (chưa đăng nhập) | — |

## 2. Điều cần biết trước khi đọc ảnh

1. **Ảnh 14–19 được chụp lúc 02:19–02:21, trước khi sửa 2 lỗi giao diện.** Vì vậy thẻ “Đang sinh trưởng” trong các ảnh này vẫn hiện **0**. Ảnh 03 và 06 đã được chụp lại lúc 02:25 sau khi sửa, hiện **1** và số tồn kho đã làm tròn.
2. **Không có ảnh AI trả lời bình thường.** Ngày chụp, model hard-code `gemini-2.5-flash` (`app/core/ai_client.py:16`) trả lỗi 429 do hết hạn mức. Ảnh 15, 16, 19 là bằng chứng lỗi thật; ảnh 17 là fallback cục bộ, không phải AI sinh; ảnh 18 là danh sách rỗng do lỗi trạng thái ở mục 4.8 của `UI_REVIEW.md`. Bằng chứng nội dung AI bình thường chỉ có trong `COMPARISON.md` (harness gọi model lite, không qua UI).
3. **Không có ảnh AI nêu “Chưa đủ dữ liệu ghi nhận” trên UI.** Ảnh 19 gửi câu hỏi về lô không tồn tại nhưng vẫn nhận 429, nên không quan sát được hành vi thiếu dữ liệu. Hành vi này chỉ được kiểm bằng harness trong `COMPARISON.md`.
4. Ảnh 05, 07, 12, 24 đang chọn lô legacy **“al”** (CB-1789654127) — đây là dữ liệu thử còn sót, không phải dữ liệu seed demo. Đã ghi nhận ở `UI_REVIEW.md` mục 4.5.
5. Ảnh 12 có nhập thử 85 kg / 92% để thấy đủ trường, **không bấm lưu**, nên không tạo bản ghi mới.
6. Ảnh 13 chụp trước khi sửa lỗi số thực, nên bảng mờ phía sau vẫn có `0.6000000000000005`; ảnh 06 là trạng thái sau sửa.

## 3. Danh mục ảnh chính (26 ảnh)

| # | Tệp | Tài khoản | Các bước thao tác | Nội dung ảnh thật | Đáp ứng yêu cầu |
|---|---|---|---|---|---|
| 1 | `01-login.png` | Khách | Mở `/login` | Form đăng nhập, cột phải có 3 chip “Quản lý canh tác / Cố vấn AI 24/7 / Truy xuất QR” và 3 số liệu **100+ lô**, **99.8%**, **GlobalGAP**. Ba số liệu này không có căn cứ trong mã nguồn/dữ liệu (xem UI_REVIEW 4.1) | Đạt (ảnh đăng nhập) |
| 2 | `02-login-error.png` | Khách | Nhập `demo_admin@greenfarm.local` + mật khẩu sai, Enter | Banner đỏ `role="alert"`: “Email hoặc mật khẩu không chính xác” | Đạt (validation đăng nhập) |
| 3 | `03-admin-dashboard.png` | Admin | Đăng nhập admin, ở trang `/` | 4 thẻ: Tổng diện tích **56.834 m²**, Số lô trồng **19**, Đang sinh trưởng **1**, Sản lượng đã ghi nhận **600 kg**; biểu đồ sản lượng; sidebar đủ 9 mục gồm “Quản lý tài khoản” | Đạt (tổng quan + thống kê) |
| 4 | `04-admin-batches.png` | Admin | Menu “Lô trồng” | Bảng lô trồng: tên/mã, lô đất, giống cây, ngày gieo, dự kiến thu hoạch, trạng thái, thao tác; nút “Tạo Lô Trồng Mới”; bộ lọc trạng thái/giống/đất. Có lẫn lô legacy “al”, “1”, “lol”, “chì chì” | Đạt (lô trồng) |
| 5 | `05-admin-care-logs.png` | Admin | Menu “Nhật ký & Trợ lý AI” | Dòng thời gian nhật ký của lô “al”: 5 ghi chép (tưới nước 30 l, thu hoạch 500 kg, bệnh hại…), mỗi dòng có “Phân tích bằng AI” và biểu tượng xóa; nút “Thêm ghi chép mới”; bộ lọc lô/loại hoạt động/khoảng ngày | Đạt (nhật ký chăm sóc) |
| 6 | `06-admin-supplies.png` | Admin | Menu “Vật tư nông nghiệp” | 6 loại vật tư, 3 tồn kho thấp, 0 sắp hết hạn; banner cảnh báo; bảng tồn kho. Bảng đã làm tròn “0.60 lít”, “Tối thiểu: 3.50”, nhưng **banner vẫn in `0.6000000000000005` lít** (lỗi còn tồn tại) | Đạt (vật tư) |
| 7 | `07-admin-traceability.png` | Admin | Menu “Truy xuất nguồn gốc” | Chọn mẹ trồng, danh sách 12 mẹ đã thu hoạch; xem trước nhãn có mã `CB-1789654127`, QR, dòng “Tiêu chuẩn **VietGAP**” in cố định; phần “Nội dung trên tem” | Đạt (truy xuất nội bộ) |
| 8 | `08-admin-data-reports.png` | Admin | Menu “Dữ liệu & Báo cáo” | Tab “Nhập dữ liệu”: chọn “Vật tư nông nghiệp”, tải file mẫu `.xlsx`, vùng kéo-thả CSV/Excel tối đa 10 MB, nút “Chọn tệp từ thiết bị”; badge “Kết nối dữ liệu hệ thống” | Đạt (nhập/xuất báo cáo) |
| 9 | `09-admin-users.png` | Admin | Menu “Quản lý tài khoản” | Bảng 9 tài khoản: nhân sự, email, vai trò (Quản trị viên/Quản lý/Kỹ thuật viên/Nhân viên), trạng thái, lô đất phụ trách; bộ lọc vai trò/trạng thái; nút “Thêm tài khoản” | Đạt (quản trị người dùng) |
| 10 | `10-dashboard-chart.png` | Admin | Về `/`, cuộn xuống 420 px | Biểu đồ “Sản lượng thu hoạch”, bộ lọc Ngày/Tháng/Năm (đang chọn Tháng); trục kg | Đạt (thống kê) |
| 11 | `11-batch-create-modal.png` | Admin | Trang Lô trồng → “Tạo Lô Trồng Mới” | Modal 2 tab; tab “Lịch gieo & thông tin chính”: tên lô, lô đất, giống cây, số lượng + đơn vị, ngày giao trồng (30/10/2026), ngày dự kiến thu hoạch; nút “Tự động đặt tên” | Đạt (form lô trồng) |
| 12 | `12-harvest-form.png` | Admin | Trang Nhật ký → “Thêm ghi chép mới” → chọn loại hoạt động **“Thu hoạch”** | Modal “Ghi chép mới”, lô “al”, ngày 30/10/2026, trường **Sản lượng thu được (Kg)** = 85, **Tỷ lệ đạt chuẩn (%)** = 92, ghi chú, ảnh minh họa, nút “Lưu ghi chép”. Giá trị chỉ nhập thử, không lưu | Đạt (thu hoạch) |
| 13 | `13-supply-import-modal.png` | Admin | Trang Vật tư → “Nhập kho” ở dòng Dầu neem sinh học | Modal “Nhập kho: Dầu neem sinh học” với số lượng, nhà cung cấp, số lô, ngày; nền mờ cho thấy 6 vật tư và bảng tồn kho (còn số thực chưa làm tròn do chụp trước khi sửa) | Đạt (nhập kho) |
| 14 | `14-ai-chat.png` | Admin | Nút nổi “Cố vấn AI GreenFarm” ở dashboard | Panel chat mở: tab Hỏi đáp AI / Lịch chăm sóc / Tóm tắt nhật ký / Cảnh báo AI; ô chọn ngữ cảnh “Không chọn lô”; gợi ý câu hỏi; ô nhập; dòng disclaimer “AI hỗ trợ tham khảo; hãy kiểm tra trước khi áp dụng” | Đạt (mở 3 chức năng AI + disclaimer) |
| 15 | `15-ai-chat-answer.png` | Admin | Tab Hỏi đáp, hỏi “Lô DEMO-BATCH-CHERRY-ACTIVE tuần tới cần kiểm tra gì?” | Câu hỏi của người dùng + banner đỏ **“Dịch vụ AI đang quá tải hoặc đã đạt giới hạn. Vui lòng thử lại sau.”**; không có câu trả lời AI. Disclaimer khung chat vẫn hiện ở đáy | **Chưa đạt** phần “AI bình thường” (lỗi 429) |
| 16 | `16-ai-schedule.png` | Admin | Tab “Lịch chăm sóc”, chọn lô “Cà chua Cherry – đang sinh trưởng”, bấm “Sinh lịch” | Banner đỏ 429 + nút “Thử lại”; không có lịch do AI tạo | **Chưa đạt** (lỗi 429) |
| 17 | `17-ai-summary.png` | Admin | Tab “Tóm tắt nhật ký”, chọn cùng lô, bấm “Tóm tắt lại” | Hiện “2 ghi chép · DEMO-BATCH-CHERRY-ACTIVE”, mục Tóm tắt “Đã ghi nhận các hoạt động chăm sóc gần đây…”, Vấn đề “**Dịch vụ AI tạm thời gián đoạn**”, Đề xuất kiểm tra nhật ký thủ công; disclaimer “Thông tin do AI tạo ra chỉ mang tính chất tham khảo…” | Một phần: có disclaimer, nhưng là **fallback cục bộ**, không phải AI trả lời |
| 18 | `18-ai-alert.png` | Admin | Tab “Cảnh báo AI”, chọn lô, bấm “Quét cảnh báo” | Khung mô tả cách xếp hạng (số ngày chưa ghi chép + dấu hiệu sâu bệnh; không gồm cảm biến thời tiết), kết quả “**Chưa có lô nào được xếp vào danh sách cần kiểm tra ưu tiên**”, disclaimer đầy đủ | Một phần: có disclaimer; danh sách rỗng do lỗi trạng thái backend (UI_REVIEW 4.8) |
| 19 | `19-ai-missing-data.png` | Admin | Tab Hỏi đáp, lần lượt hỏi lô Cherry và lô **`DEMO-KHONG-TON-TAI`** | Hai câu hỏi trong khung chat; câu trả lời duy nhất là banner đỏ 429 | **Chưa đạt** phần “AI khi thiếu dữ liệu” (bị 429 trước khi xử lý) |
| 20 | `20-trace-public.png` | Khách | Mở công khai `/trace/DEMO-BATCH-2026-10` | Trang “Hành trình sản phẩm”: trạng thái Đã thu hoạch, giống Cà chua Cherry, lô Nhà màng số 1, ngày gieo 6/8/2026, dự kiến thu 20/10/2026; QR; timeline nhật ký; khối “An toàn: **VietGAP · Cảnh báo dư lượng**” và “Chứng nhận và thu hoạch” có 2 dấu tích, dù thời gian cách ly ghi “Chưa đủ dữ liệu ghi nhận”. Nhãn này do backend gán cố định (`crop_batch.py:386`) | Đạt (truy xuất công khai) + ghi nhận rủi ro nhãn cố định |
| 21 | `21-trace-not-found.png` | Khách | Mở `/trace/KHONG-TON-TAI` | Thẻ lỗi “Chưa thể xác minh lô trồng”, “Không tìm thấy lô trồng với mã: KHONG-TON-TAI”, “Mã đã tra: KHONG-TON-TAI” | Đạt (xử lý mã sai) |
| 22 | `22-manager-users.png` | Manager | Đăng nhập manager → `/users` | Manager **truy cập được** “Quản lý tài khoản”, thấy 9 tài khoản và nút “Thêm tài khoản”; header “Trần Quốc Bảo – Quản lý”; sidebar đủ 9 mục | Đạt (vai trò manager) |
| 23 | `23-technician-batches.png` | Technician | Đăng nhập technician → `/batches` | Header “Lê Thu Hà – Kỹ thuật viên”; sidebar **không có** “Quản lý tài khoản”; có nút “Tạo Lô Trồng Mới”; bảng lô trồng đầy đủ, thao tác dạng “…” | Đạt (vai trò technician) |
| 24 | `24-technician-care-logs.png` | Technician | Technician → `/care-logs` | Cùng bố cục nhật ký như admin nhưng **không có biểu tượng xóa**; vẫn có “Thêm ghi chép mới” và “Phân tích bằng AI”; đang lọc lô legacy “al” | Đạt (phân quyền hiển thị) |
| 25 | `25-staff-dashboard.png` | Staff | Đăng nhập staff, ở `/` | Header “Phạm Văn Nam – Nhân viên”; sidebar không có Quản lý tài khoản; 1.200 m², 7 lô, 0 đang sinh trưởng, 600 kg; **vẫn hiện nút “Tạo Lô trồng mới”** dù backend chặn (UI_REVIEW 4.3) | Đạt (vai trò staff) + ghi nhận lỗi UI |
| 26 | `26-staff-forbidden.png` | Staff | Staff mở trực tiếp `/users` | Bị middleware chuyển về `/?forbidden=1`; ảnh là dashboard bình thường, **không có thông báo “không có quyền”** (URL có tham số nhưng trang không đọc). Script đã in URL sau chuyển hướng khi chụp | Đạt (lỗi phân quyền bị chặn) + ghi nhận thiếu thông báo |

## 4. Ảnh trước khi sửa (đối chiếu)

| Tệp | Tài khoản | Nội dung | Dùng để |
|---|---|---|---|
| `before-fix/03-admin-dashboard-g0.png` | Admin | Thẻ “Đang sinh trưởng” hiện **0** dù dữ liệu có 1 lô “Đang sinh trưởng” | Chứng minh lỗi trước khi thêm từ vựng trạng thái vào frontend |
| `before-fix/06-admin-supplies-float.png` | Admin | Bảng tồn kho in `0.6000000000000005 lít` | Chứng minh lỗi số thực trước khi thêm `formatQuantity` |

## 5. Đối chiếu với yêu cầu bắt buộc

| Yêu cầu | Ảnh | Trạng thái |
|---|---|---|
| Ảnh đăng nhập | 01, 02 | Đạt |
| Mỗi vai trò | 03 (admin), 22 (manager), 23–24 (technician), 25–26 (staff) | Đạt |
| Lô trồng | 04, 11 | Đạt |
| Nhật ký chăm sóc | 05, 24 | Đạt |
| Vật tư | 06, 13 | Đạt |
| Thu hoạch | 12 (form nhập sản lượng/tỷ lệ đạt chuẩn), 20 (kết quả thu hoạch trên trang công khai) | Đạt |
| Truy xuất | 07 (nội bộ), 20 (công khai), 21 (mã sai) | Đạt |
| Thống kê | 03, 10 | Đạt |
| 3 chức năng AI — trạng thái bình thường | 15, 16, 19 | **Chưa có** — tất cả nhận 429; nội dung AI bình thường chỉ có trong `COMPARISON.md` |
| 3 chức năng AI — khi thiếu dữ liệu | 19 (lô không tồn tại) | **Chưa có** — bị 429 trước khi xử lý; hành vi “Chưa đủ dữ liệu” chỉ kiểm bằng harness |
| Disclaimer AI | 14 (khung chat), 17, 18 (kết quả), 20 (ghi chú cách ly) | Đạt một phần: có ở khung chat và tab Tóm tắt/Cảnh báo; **không có** dưới câu trả lời thành công vì chưa có câu trả lời thành công trên UI. Disclaimer từng câu đã được sửa ở mã nguồn (UI_REVIEW mục 3.2) nhưng chưa có ảnh chứng minh do 429 |
| Lỗi phân quyền | 26 (staff bị chặn `/users`), 24 (technician không có nút xóa) | Đạt |

## 6. Giới hạn của bộ ảnh

- Không có ảnh AI thành công hoặc AI báo thiếu dữ liệu trên UI do hạn mức 429; không thể dùng ảnh 15–19 để tuyên bố “AI hoạt động tốt”.
- Ảnh 17 và 18 là kết quả **không do AI sinh** (fallback và danh sách rỗng), cần nói rõ khi trình bày.
- Ảnh 26 không nhìn thấy thanh địa chỉ; bằng chứng URL `/?forbidden=1` nằm trong log chạy script và mã `frontend/middleware.ts`.
- Dữ liệu legacy “al/lol/chì chì/66” xuất hiện trong nhiều ảnh; khi bảo vệ nên dùng database sạch hoặc giải thích trước.
- Không chụp màn hình di động; toàn bộ ảnh là desktop 1440×900.
