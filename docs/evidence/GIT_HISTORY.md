# GIT_HISTORY.md — Kiểm tra lịch sử Git

Ngày kiểm tra: **2026-10-30**. Lệnh dùng: `git log`, `git shortlog`, `git for-each-ref`, `git status`, `git ls-files`.

---

## 1. Kết quả tổng quan

| Chỉ số | Giá trị thật |
|---|---|
| Nhánh hiện tại | `main` |
| Remote | `https://github.com/trankhaquan2366-cloud/Farm-AI.git` (đã ẩn thông tin đăng nhập nếu có) |
| Số commit trên `main` | **11** |
| Số tác giả | **1** — `Tran Kha Quan <DTC245350005@ictu.edu.vn>` |
| Tag | 0 |
| Merge commit | 0 |
| Nhánh remote | `origin/main` cùng 11 commit, không có nhánh thành viên |
| File đang được Git theo dõi | Khoảng 18.400+ file, phần lớn là `venv/`, `app/venv/`, `.venv/` (xem `SECURITY_SCAN.md`) |
| Working tree tại thời điểm kiểm tra | 77 mục thay đổi chưa commit (gồm mã nguồn, cache, `farm.db`) |

Ghi chú: `git log --all` đếm 38 commit vì ngoài `main` còn **16 ref nội bộ** dạng `refs/agents/<uuid>/checkpoints/turn/N` do công cụ hỗ trợ tạo ra, cùng các commit checkpoint có message `Agent host session ...`. Đây **không phải** commit của thành viên và không nằm trên nhánh `main`; không dùng để tính đóng góp.

---

## 2. Danh sách commit trên `main`

| # | Hash | Thời điểm | Message | Số file thay đổi |
|---|---|---|---|---|
| 1 | `27dfcdca` | 2026-10-28 00:43 | Initial commit: GreenFarm AI system structure and backend/frontend setup | 8.560 |
| 2 | `ea4af789` | 2026-10-29 07:08 | feat: Hoàn thiện module Dữ liệu & Báo cáo, cập nhật UI và chuẩn bị Docker | 10.405 |
| 3 | `6767ae38` | 2026-10-29 07:28 | feat: Hoàn thiện module Dữ liệu & Báo cáo, cập nhật UI và chuẩn bị Docker | 1 |
| 4 | `143502f0` | 2026-10-29 07:40 | add vercel config | 1 |
| 5 | `5cbc4c2e` | 2026-10-29 11:55 | chore: prepare greenfarm ai for vercel deployment | 3 |
| 6 | `1243d4b0` | 2026-10-29 12:07 | fix: reset root directory and update vercel routing | 1 |
| 7 | `25d8bcbb` | 2026-10-29 12:14 | fix: resolve axios typescript types in api.ts | 3 |
| 8 | `455fc0b1` | 2026-10-29 12:20 | fix: update next.js version to solve deployment patch issue | 2 |
| 9 | `b2a68eb5` | 2026-10-29 12:42 | fix: restore static assets routing for next.js css | 1 |
| 10 | `ffb64898` | 2026-10-29 12:57 | fix: refactor vercel monorepo config to resolve static assets 404 | 3 |
| 11 | `45b600f5` | 2026-10-29 19:13 | feat: cập nhật tính năng và sửa lỗi hệ thống | 104 |

---

## 3. Đánh giá mức độ rõ ràng

### Điểm đạt

- Có commit khởi tạo và các commit sửa lỗi triển khai với message mô tả đúng việc đã làm (Vercel routing, static assets, axios types).
- Các commit sửa lỗi nhỏ được tách riêng, dễ lần theo lịch sử.
- Không có merge phức tạp, lịch sử tuyến tính, dễ đọc.

### Điểm chưa đạt

1. **Không có bằng chứng đóng góp của từng thành viên.** Cả 11 commit đều cùng một tác giả/email. Không có commit mang tên thành viên khác, không có nhánh cá nhân, không có pull request. Vì vậy không thể dùng Git để chứng minh phân công nhóm.
2. **Hai commit đầu quá lớn** (8.560 và 10.405 file) vì đưa cả `venv/`, `app/venv/`, `node_modules`, `__pycache__`, database vào Git. Điều này làm lịch sử khó review và làm repository nặng.
3. **Commit cuối gom nhiều thay đổi không liên quan**: sửa AI summary, thêm `scripts/demo_data.py`, sửa README, cập nhật `farm.db`, kèm nhiều file cache. Message “cập nhật tính năng và sửa lỗi hệ thống” quá chung, không nêu phạm vi.
4. **Không có commit nào ghi rõ phần kiểm thử** (tests, pytest) dù repository có thư mục `tests/`.
5. **Working tree còn 77 thay đổi chưa commit** tại thời điểm kiểm tra, gồm cả mã nguồn backend/frontend và `farm.db`. Nếu nộp bài ở trạng thái này, người chấm clone repository sẽ **không thấy** các thay đổi đó.

---

## 4. Liên hệ với yêu cầu “commit rõ ràng của từng thành viên”

**Kết luận: Chưa đạt.** Không thể chứng minh từ Git rằng mỗi thành viên đã đóng góp phần nào, vì:

- Chỉ có một danh tính commit.
- Không có nhánh/tag/PR theo thành viên.
- Không có commit message nêu tên hoặc vai trò.

Nếu cần bổ sung, nên làm trước khi nộp:

1. Mỗi thành viên cấu hình `user.name` và `user.email` của mình, commit phần mình phụ trách với message dạng `feat(batches): thêm validate ngày gieo` và phần cơ thể nêu rõ phạm vi.
2. Tạo nhánh riêng cho từng phần, mở pull request vào `main`, để lại review/comment.
3. Tách commit theo module: backend API, test, frontend UI, tài liệu, cấu hình triển khai.
4. Không commit `venv/`, `node_modules/`, `__pycache__/`, `farm.db`, file `.env`.
5. Commit các thay đổi đang có trong working tree sau khi rà soát, hoặc ghi rõ chúng là phần chưa hoàn tất.

---

## 5. Bằng chứng dạng văn bản

```text
$ git shortlog -sne HEAD
    11  Tran Kha Quan <DTC245350005@ictu.edu.vn>

$ git tag | wc -l
0

$ git log --merges --oneline | wc -l
0

$ git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main

$ git ls-files | grep -c "^venv/\|^app/venv/\|\.venv/"
18429

$ git status --short | wc -l
77
```

Các con số trên được lấy trực tiếp từ repository ngày 2026-10-30; nếu nhóm commit thêm, cần chạy lại lệnh và cập nhật bảng.
