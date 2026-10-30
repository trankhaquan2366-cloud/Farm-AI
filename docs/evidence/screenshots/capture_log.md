# Nhật ký chụp ảnh giao diện

- Frontend: http://127.0.0.1:3002
- Backend chính: http://127.0.0.1:8001 (farm_demo.db)
- Backend dự phòng: http://127.0.0.1:8003 (GEMINI_API_KEY rỗng)
- Thời điểm chạy: 2026-10-30 12:05:39

| # | Ảnh | Thời điểm | Tài khoản | Bước | Trạng thái | Ghi chú |
|---|-----|-----------|-----------|------|------------|---------|
| 1 | 01-login.png | 2026-10-30 11:58:16 | khách | Mở trang đăng nhập | OK |  |
| 2 | 02-login-error.png | 2026-10-30 11:58:40 | khách | Đăng nhập bằng mật khẩu sai | OK |  |
| 3 | 03-admin-dashboard.png | 2026-10-30 11:59:20 | admin | Mở dashboard sau đăng nhập | OK |  |
| 4 | 04-admin-batches.png | 2026-10-30 11:59:26 | admin | Danh sách lô trồng | OK |  |
| 5 | 05-batches-create-success.png | 2026-10-30 11:59:59 | admin | Tạo lô thử trong farm_demo.db và chụp banner thành công | OK |  |
| 6 | 06-care-logs.png | 2026-10-30 12:00:22 | admin | Nhật ký của lô DEMO-BATCH-CHERRY-ACTIVE | OK |  |
| 7 | 07-supplies-before-import.png | 2026-10-30 12:00:28 | admin | Danh sách vật tư trước khi nhập kho | OK |  |
| 8 | 08-supplies-import-success.png | 2026-10-30 12:00:31 | admin | Nhập 5 kg NPK vào kho trong farm_demo.db | OK |  |
| 9 | 09-supplies-alerts.png | 2026-10-30 12:00:35 | admin | Bảng cảnh báo tồn kho/hạn dùng | OK |  |
| 10 | 10-traceability-internal.png | 2026-10-30 12:00:44 | admin | Trang truy xuất nội bộ của lô DEMO-BATCH-CHERRY-ACTIVE | OK |  |
| 11 | 11-trace-public-no-cert.png | 2026-10-30 12:00:53 | khách | Trang công khai /trace/CB-EC4089614175 (lô chưa có chứng nhận) | OK |  |
| 12 | 12-harvest-form.png | 2026-10-30 12:00:59 | admin | Nhập sản lượng/chất lượng thu hoạch cho lô CB-EC4089614175 | OK |  |
| 13 | 13-harvest-success.png | 2026-10-30 12:01:04 | admin | Lưu thật lượt thu hoạch 2,5 kg / 92% — banner có mã truy xuất | OK |  |
| 14 | 14-harvest-trace-public.png | 2026-10-30 12:01:09 | khách | Trang công khai của lô vừa thu hoạch (Đã lưu lượt thu hoạch 2.5 kg. Mã truy xuất: GF-CB-EC4089614175-20261030120100-E8A5.) | OK |  |
| 15 | 15-ai-chat.png | 2026-10-30 12:01:14 | admin | Mở panel Cố vấn AI | OK |  |
| 16 | 16-ai-chat-answer.png | 2026-10-30 12:01:42 | admin | Hỏi AI về lô đang sinh trưởng (AI thật) | OK | reply=Theo dữ liệu ghi nhận, các công việc chăm sóc gần đây bao gồm tưới nước, bón phân và thu hoạch. Về việc tuần tới cần kiểm tra gì, vui lòng hỏi kỹ thuật viên nôn |
| 17 | 17-ai-schedule.png | 2026-10-30 12:01:47 | admin | Tab Lịch chăm sóc (AI thật) | OK |  |
| 18 | 18-ai-summary.png | 2026-10-30 12:01:50 | admin | Tab Tóm tắt nhật ký (AI thật) | OK |  |
| 19 | 19-ai-alert.png | 2026-10-30 12:01:54 | admin | Tab Cảnh báo AI (AI thật) | OK |  |
| 20 | 20-ai-missing-sow-date.png | 2026-10-30 12:02:25 | admin | Hỏi AI về lô thiếu ngày gieo | OK | reply=Chưa đủ dữ liệu ghi nhận |
| 21 | 21-ai-missing-nonexistent.png | 2026-10-30 12:03:03 | admin | Hỏi AI về mã lô không tồn tại | OK | reply=Chưa đủ dữ liệu ghi nhận |
| 22 | 22-ai-prompt-injection.png | 2026-10-30 12:03:30 | admin | Ghi chú chèn lệnh — kiểm tra guard | OK | reply=Trang trại GreenFarm ghi nhận lô cây trồng của bạn có hoạt động tưới nước, bón phân và thu hoạch theo lịch sử chăm sóc. Về việc bón phân, xin lưu ý không nêu liều lượng cụ thể; vui lòng kiểm tra loại việc cần làm và hỏi  |
| 23 | 23-ai-fallback.png | 2026-10-30 12:04:02 | admin | Backend 8003 không có GEMINI_API_KEY — nhãn kết quả dự phòng | OK |  |
| 24 | 24-manager-dashboard.png | 2026-10-30 12:04:27 | manager | Dashboard của quản lý | OK |  |
| 25 | 25-technician-dashboard.png | 2026-10-30 12:04:48 | technician | Dashboard của kỹ thuật viên | OK |  |
| 26 | 26-staff-dashboard.png | 2026-10-30 12:05:12 | staff | Dashboard của nhân viên | OK |  |
| 27 | 27-staff-forbidden-users.png | 2026-10-30 12:05:17 | staff | Truy cập /users — bị chặn và hiện banner từ chối | OK |  |
| 28 | 28-mobile-staff-dashboard.png | 2026-10-30 12:05:38 | staff | Dashboard trên màn hình 390x844 | OK |  |
