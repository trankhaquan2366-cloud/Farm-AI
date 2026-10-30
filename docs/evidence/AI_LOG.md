# AI_LOG.md — Nhật ký sử dụng AI trong đồ án GreenFarm AI

Ngày tổng hợp: **2026-10-30**. Nguyên tắc: chỉ ghi những gì có đầu ra hoặc lệnh chạy thật trong repository; phần không có bằng chứng ghi rõ **“Chưa có bằng chứng”**, không suy đoán.

---

## 1. Phạm vi bằng chứng

| Nguồn | Nội dung dùng được | Hạn chế |
|---|---|---|
| Git | 11 commit trên `main`, một tác giả; nội dung thay đổi | Không có log prompt, không ghi công cụ AI |
| `docs/evidence/COMPARISON.md` + `prompt_runs/` | 30 lần gọi AI thật, 2 phiên bản prompt, 5 kịch bản | Model phải đổi sang bản lite do hạn mức |
| `docs/evidence/TEST_EVIDENCE.md` | 62 test, 47 pass, 15 xfail, lỗi P0–P2 | Một số lỗi chưa được sửa |
| `docs/evidence/SECURITY_SCAN.md` + `scripts/security_check.py` | Kết quả quét khóa, Git, frontend | Không thay thế pentest |
| `docs/evidence/INSTALL_VERIFY.md` | Cài lại backend/frontend, build, type check | Chưa deploy thật |
| `docs/evidence/screenshots/` | 26 ảnh chụp giao diện thật ngày 2026-10-30 | Ảnh AI thể hiện lỗi 429 (15, 16, 19), fallback cục bộ (17) và danh sách cảnh báo rỗng (18), không có kết quả AI thành công |
| `docs/evidence/scripts/` | `check_ai.py`, `prompt_comparison.py`, `security_check.py`, `capture_ui.py` | Script do phiên hỗ trợ tạo, không có log hội thoại |

Không có trong repository: lịch sử chat với công cụ AI, tên/phiên bản công cụ theo từng giai đoạn, prompt gốc của các giai đoạn trước, biên bản họp nhóm. Vì vậy các phần dưới đây **không quy công** cho AI khi thiếu bằng chứng.

---

## 2. Nhật ký theo giai đoạn SDLC

| Giai đoạn | AI hỗ trợ (theo bằng chứng) | Đầu ra | Lỗi AI ghi nhận | Kiểm chứng | Cách sửa | Kết quả |
|---|---|---|---|---|---|---|
| Khảo sát yêu cầu, đặc tả | Có tài liệu `HIEU_HE_THONG.md`, `FACT_SHEET.md`, `AUDIT.md` trong `docs/evidence/` | Tài liệu mô tả hệ thống, fact sheet, audit | **Chưa có bằng chứng** về prompt/công cụ/phiên | Đối chiếu chéo với mã nguồn khi viết tài liệu | Không có | Tài liệu tồn tại; không chứng minh được phần nào do AI viết |
| Thiết kế CSDL và API | Mã nguồn `app/models/*`, `app/routers/*`; 7 migration Alembic | Mô hình quan hệ, endpoint | **Chưa có bằng chứng** về công cụ | `pytest`, import app, đọc schema | Không có | Mã chạy được; không quy công AI |
| Lập trình backend | 12 router, service, repository | API nghiệp vụ | **Chưa có bằng chứng** | 47 test pass; nhiều lỗi P0–P2 | Sửa một phần | Chạy được nhưng còn lỗi đã ghi |
| Lập trình frontend | 14 route Next.js, component dashboard/AI | Giao diện quản trị | **Chưa có bằng chứng** | `tsc --noEmit` exit 0; build 15/15 trang; 26 ảnh chụp | Sửa 5 lỗi nhỏ | Build và giao diện chạy được |
| Tích hợp AI | `app/core/ai_client.py`, `ai_advisor`, `ai_summary`, `ai_alert`, `ai_schedule`, chatbot | 4 tab AI trên giao diện | Model bị hard-code `gemini-2.5-flash`; hết hạn mức 20 request/ngày → 429 | `scripts/check_ai.py`: 2.5-flash lỗi 429; lite OK 2.287 ms | Chưa sửa mã nguồn; đề xuất đọc `settings.GEMINI_MODEL` | AI trên UI hiện báo “quá tải/giới hạn”, không demo được kết quả bình thường |
| Thiết kế prompt V1/V2 | Harness so sánh, 5 kịch bản × 2 bản × 3 lần | `COMPARISON.md`, 30 file JSON | V2 sai năm, bỏ sót chèn 1/3, không nêu thiếu dữ liệu/mâu thuẫn | 30 lần chạy thật, đọc từng JSON | Ghi nhận, chưa sửa prompt | V2 **chưa chứng minh** tốt hơn V1 ở chống bịa |
| Kiểm thử | Bổ sung ma trận test, sửa lý do xfail | 8 file test, 62 ca | Lý do xfail ban đầu sai (đổ cho validate số lượng, thực tế 500) | `pytest -q`: 47 passed, 15 xfailed | Sửa reason theo lỗi thật | 15 lỗi thật được tài liệu hóa, không che |
| Quét bảo mật | Script quét `.env`, Git, frontend, file tracked | `SECURITY_SCAN.md` | Không phát hiện sai; giới hạn: chỉ quét mẫu, không pentest | `security_check.py` in hash 8 ký tự, không in khóa | Đề xuất thu hồi khóa, đổi secret | Phát hiện khóa cũ trong 3 commit |
| Rà giao diện | Chụp 26 ảnh thật bằng Playwright; đối chiếu role | `screenshots/`, `UI_REVIEW.md` | Ảnh đầu tiên bị lỗi CSS do server cũ; đã khởi động lại | Playwright + Chrome headless, đăng nhập 4 vai trò | Khởi động lại frontend; sửa 5 lỗi nhỏ | 26 ảnh hợp lệ; còn 3 vấn đề chưa sửa |
| Tài liệu, triển khai | README, `DEPLOY.md`, `INSTALL_VERIFY.md` | Hướng dẫn cài và deploy | `DEPLOY.md` ban đầu chưa nêu login dùng base URL khác `api.ts` | Đọc mã nguồn, chạy cài sạch | Bổ sung cảnh báo | Chưa deploy thật; tài liệu nêu rõ |
| Quản lý mã nguồn | Kiểm tra Git, phát hiện file cache/venv | `GIT_HISTORY.md` | Ban đầu đếm 38 commit do `git log --all` gồm ref agent | `git shortlog`, `git rev-list` | Sửa còn 11 commit trên `main` | Không có bằng chứng đóng góp từng thành viên |

---

## 3. Lỗi AI cụ thể và cách xử lý

| Mã | Lỗi | Bằng chứng | Ảnh hưởng | Đã sửa? |
|---|---|---|---|---|
| AI-E01 | V2 bịa sai năm: ghi “2024-10-24” trong khi nhật ký là 2026-10-24 | `prompt_runs/02_nhat_ky_thua/V2_run2.json`; `COMPARISON.md` mục 5.3 | Nội dung sai năm, có thể làm sai quyết định | Chưa; cần prompt/hậu kiểm ngày |
| AI-E02 | V2 bỏ sót câu lệnh chèn ở nhật ký 9001 trong 1/3 lần, còn kết luận “đúng quy trình” | `COMPARISON.md` mục 5.4; scenario 04 | Bỏ qua dấu hiệu bất thường | Chưa |
| AI-E03 | Cả V1 và V2 không nêu “thiếu ngày gieo” ở lô có `sow_date=NULL` (0/3) | `COMPARISON.md` mục 5.1; scenario 03 | Người dùng không biết dữ liệu thiếu | Chưa |
| AI-E04 | Cả hai không gọi hai nhật ký trái nhau là “mâu thuẫn” (0/3) | `COMPARISON.md` mục 5.2; scenario 05 | Tóm tắt che mất xung đột dữ liệu | Chưa |
| AI-E05 | Model `gemini-2.5-flash` hết hạn mức 20 request/ngày, trả 429 | `scripts/check_ai.py`; 7 run lưu trong `prompt_runs/_partial_gemini_2.5_flash/` | Không demo được AI trên UI | Chưa; phải đổi model/hạn mức |
| AI-E06 | Lý do `xfail` cho test số lượng 0/âm ban đầu ghi sai: cho rằng endpoint chấp nhận số 0, thực tế lỗi 500 do `HarvestCreate` thiếu `harvest_date` | `TEST_EVIDENCE.md` mục 4.1; `tests/test_harvest_and_trace.py` | Che mất lỗi P0 thật | Đã sửa reason |
| AI-E07 | Đếm sai lịch sử Git: `git log --all` cho 38 commit, nhưng chỉ 11 commit trên `main`; 27 còn lại là ref checkpoint của agent | `GIT_HISTORY.md` mục 1 | Có thể báo sai số commit/đóng góp | Đã sửa tài liệu |
| AI-E08 | Bản kiểm kê UI cáo buộc sidebar có thể ẩn mục do role viết hoa; kiểm tra lại JWT dùng `user.role.value` (chữ thường) nên không xảy ra | `app/routers/auth.py:95-98`; `app/models/user.py:5-9` | Có thể sửa nhầm chỗ không lỗi | Đã bác bỏ, không đưa vào tài liệu |
| AI-E09 | Ảnh chụp đầu tiên không có CSS do frontend đang phục vụ build cũ sau khi rebuild | `screenshots/` lần chạy đầu; log Playwright | Ảnh không dùng được | Đã khởi động lại server, chụp lại |
| AI-E10 | Khi AI lỗi 429, UI chỉ hiện thông báo chung “quá tải hoặc đã đạt giới hạn”, không phân biệt hạn mức với lỗi mạng | `screenshots/15-ai-chat-answer.png`, `16-ai-schedule.png` | Người dùng khó chẩn đoán | Chưa; đề xuất thông báo cụ thể |

---

## 4. Việc AI làm được, có kiểm chứng

1. **So sánh prompt có số liệu thật**: 30 lần gọi, 5 kịch bản, xuất JSON/CSV; kết luận trung thực rằng V2 không vượt V1 ở chống bịa.
2. **Phát hiện lỗi qua test**: 15 ca xfail đại diện 15 lỗ hổng thật, gồm P0 thu hoạch 500 và P1 không trừ tồn kho.
3. **Phát hiện rò rỉ khóa**: script chỉ in hash 8 ký tự, xác định khóa Gemini cũ nằm trong 3 commit; không làm lộ thêm khóa.
4. **Rà giao diện có ảnh thật**: 26 ảnh, đăng nhập 4 vai trò, xác nhận redirect `/?forbidden=1` cho staff và lỗi 429 của AI.
5. **Sửa lỗi nhỏ có kiểm chứng**: spinner vật tư, disclaimer chatbot, nhãn dữ liệu minh họa, đếm “Đang sinh trưởng”, định dạng tồn kho; build và type check lại đều đạt.

---

## 5. Việc không được phép khẳng định

- Không được nói “AI chạy đúng 99,8%” hoặc “đã đạt GlobalGAP”. Đây là chữ trên trang đăng nhập, **không có phép đo hay chứng nhận** trong repo.
- Không được nói “V2 tốt hơn V1 toàn diện”. Kết quả 30 lần chạy nói ngược lại ở một số tiêu chí.
- Không được nói “62/62 test đạt”. Thực tế 47 pass, 15 xfail có chủ đích.
- Không được nói “đã deploy Vercel”. Chưa có URL, chưa có `.vercel`, chưa cài CLI.
- Không được nói “PostgreSQL đã chạy”. `database.py` vẫn hard-code SQLite.
- Không được quy công từng phần mã nguồn cho AI hoặc cho thành viên khi Git chỉ có một tác giả.

---

## 6. Phần bạn cần bổ sung từ ký ức nhóm

Những mục sau **không thể lấy từ repository**, bạn tự điền nếu muốn AI_LOG đầy đủ:

1. Tên công cụ AI đã dùng ở từng giai đoạn (ChatGPT, Claude, Copilot, Gemini, Qoder…), phiên bản nếu nhớ.
2. Ngày/giờ và người thực hiện từng phiên hỏi AI.
3. Prompt gốc (dán nguyên văn) cho các phần: phân tích yêu cầu, thiết kế CSDL, sinh API, sinh giao diện, viết test, sửa lỗi.
4. Những câu trả lời AI đã bị nhóm **bác bỏ** hoặc sửa tay, kèm lý do.
5. Ảnh chụp cửa sổ chat AI (nếu còn) để đối chiếu với đầu ra trong repo.
6. Phân công thành viên: ai phụ trách phần nào, ai dùng AI nhiều/ít.
7. Các lỗi AI từng gây ra mà nhóm đã sửa nhưng không còn dấu vết trong Git.
8. Phản hồi của giảng viên/mentor về việc dùng AI (nếu có).

Gợi ý cách điền: thêm bảng `Ngày | Người | Công cụ | Prompt | Kết quả | Đã kiểm chứng | Ghi chú` vào mục 2, chỉ điền dòng nào có ảnh chụp hoặc file log thật.

---

## 7. Kết luận

AI đã hỗ trợ thật ở các phần **đo lường được**: so sánh prompt, sinh và chạy test, quét bảo mật, rà giao diện, viết tài liệu. Các kết quả này đều có file hoặc lệnh chạy kèm theo.

Tuy nhiên, bằng chứng hiện có **không đủ** để dựng một nhật ký AI đầy đủ cho toàn bộ vòng đời dự án, và càng không đủ để nói AI đã làm đúng mọi thứ. Ba lỗi nội dung của AI (sai năm, bỏ sót chèn, không nêu thiếu dữ liệu) và việc AI trên UI không chạy được do hạn mức là những điểm phải trình bày trung thực khi bảo vệ.
