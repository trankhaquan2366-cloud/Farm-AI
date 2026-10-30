# INSTALL_VERIFY.md — Kiểm chứng cài đặt sạch

Ngày chạy: **2026-10-30** (giờ máy). Môi trường: Windows, Git Bash; Python 3.12.10; pip 26.2.2; Node.js v24.18.1; npm 11.16.0.

Mục đích: kiểm tra lại quy trình cài đặt trong README bằng một môi trường mới, không dùng lại `venv/` hay `node_modules/` sẵn có, và ghi lại đúng kết quả.

---

## 1. Backend — virtualenv mới

### Lệnh đã chạy

```bash
rm -rf /tmp/gf_venv_verify
"C:/Users/ADMIN/AppData/Local/Programs/Python/Python312/python.exe" -m venv /tmp/gf_venv_verify
/tmp/gf_venv_verify/Scripts/python.exe -m pip install --upgrade pip -q
/tmp/gf_venv_verify/Scripts/python.exe -m pip install -r requirements.txt -r requirements-dev.txt
/tmp/gf_venv_verify/Scripts/python.exe -c "import app.main; print('IMPORT_OK')"
/tmp/gf_venv_verify/Scripts/python.exe -m pytest -q
```

### Kết quả thật

| Bước | Kết quả |
|---|---|
| Tạo venv | Thành công, `Python 3.12.10`, `pip 26.2.2` |
| Cài dependency | `Successfully installed` 48 gói, không có lỗi build |
| Import ứng dụng | In ra `IMPORT_OK` |
| Chạy test | `47 passed, 15 xfailed, 131 warnings in 24.12s` |
| Exit code tổng | `0` |

Các phiên bản chính được cài (trích từ output):

```
fastapi-0.141.1  starlette-1.6.0  uvicorn-0.52.3  pydantic-2.13.4
SQLAlchemy-2.0.52  PyJWT-2.13.0  passlib-1.7.4  bcrypt-4.0.1
google-genai-2.18.1  pytest-9.2.0  httpx-0.28.1  requests-2.34.2
```

### Ghi chú trung thực

- `requirements.txt` tại thời điểm chạy là bản đã được khôi phục trong working tree (12 gói runtime). Trong commit gần nhất trên `main`, file này từng bị rút còn 0 dòng — đây là lý do phải kiểm chứng lại.
- Venv mới vẫn đọc file `.env` có sẵn ở thư mục dự án. Vì vậy bước này xác nhận **dependency và mã nguồn** cài sạch, không xác nhận việc tạo `.env` từ đầu.
- 15 test `xfail(strict=True)` là các lỗi thật đã biết, không phải test bị bỏ qua tùy tiện. Chi tiết trong `TEST_EVIDENCE.md`.

---

## 2. Frontend — `npm ci` từ lockfile

### Lệnh đã chạy

```bash
# trong thư mục tạm chỉ có package.json + package-lock.json
npm ci
```

### Kết quả thật

```
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Old versions of glob are not supported...
npm warn deprecated fstream@1.0.12: This package is no longer supported.
added 584 packages in 9m
```

Exit code: `0`. Ba cảnh báo deprecated đến từ dependency gián tiếp, không chặn cài đặt.

### Ghi chú

- Lệnh chạy trong thư mục tạm `/tmp/gf_frontend_verify`, tách khỏi `frontend/node_modules` của repo.
- Chưa chạy `npm run build` **trong thư mục tạm** vì thư mục này chỉ dùng để xác nhận lockfile cài được. Build được chạy trong repo (mục 3).

---

## 3. Frontend — type check và production build

### Lệnh đã chạy

```bash
cd frontend
npx tsc --noEmit
npm run build
```

### Kết quả thật

| Bước | Kết quả |
|---|---|
| `tsc --noEmit` | `TSC_EXIT=0`, không có lỗi type |
| `npm run build` | Exit code `0`; `Compiled successfully in 73s`; `Generating static pages (15/15) in 5.2s` |
| Cảnh báo | `The "middleware" file convention is deprecated. Please use "proxy" instead.` (Next.js 16) |
| Cảnh báo | `Skipping validation of types` trong build — nên type check được chạy riêng bằng `tsc` |

Danh sách route do Next.js in ra:

```
○ /                    ○ /batches          ○ /care-logs
○ /crop-lots           ○ /data-reports     ○ /login
○ /supplies            ○ /traceability     ○ /users
○ /varieties           ○ /ai-advisor       ○ /_not-found
○ /apple-icon          ○ /icon.svg
ƒ /trace/[batch_code]
ƒ Proxy (Middleware)
```

---

## 4. Kiểm tra đăng nhập bằng tài khoản seed

Dùng `TestClient` gọi thẳng `POST /api/auth/login` với mật khẩu `GreenFarmDemo2026!`:

| Email | HTTP | Role trong JWT |
|---|---|---|
| `demo_admin@greenfarm.local` | 200 | `admin` |
| `demo_manager@greenfarm.local` | 200 | `manager` |
| `demo_technician@greenfarm.local` | 200 | `technician` |
| `demo_staff@greenfarm.local` | 200 | `staff` |

Kết quả này xác nhận 4 tài khoản demo đăng nhập được và token mang role chữ thường, khớp với bộ lọc sidebar (`lib/nav.ts`).

---

## 5. Những gì chưa kiểm chứng

| Hạng mục | Lý do |
|---|---|
| Cài trên máy khác hoàn toàn | Chỉ chạy trên máy hiện tại, dùng Windows + Git Bash |
| PostgreSQL | `app/core/database.py` hard-code SQLite; chưa sửa mã nguồn |
| Docker Compose | Có Docker CLI nhưng chưa chạy `docker compose up` trong đợt này |
| Vercel deploy | Chưa cài Vercel CLI, chưa có `.vercel`; xem `DEPLOY.md` |
| Gọi AI thật trong lúc cài sạch | Phụ thuộc `GEMINI_API_KEY` và hạn mức; đã có 30 run thật trong `COMPARISON.md` |
| `npm ci` rồi build trong cùng thư mục tạm | Chưa chạy; build được xác nhận trong repo |

---

## 6. Kết luận

Quy trình cài đặt backend trong README **chạy được** trên môi trường sạch: cài đủ dependency, import app thành công, toàn bộ 62 test có kết quả xác định (47 pass, 15 xfail). Frontend cài từ lockfile thành công và build production thành công, type check sạch.

Điều kiện để một người khác lặp lại: dùng Python 3.12 và Node 22+; chép `.env.example` thành `.env`; chạy seed bằng `scripts/demo_data.py`. Các bước này chưa được kiểm chứng trọn gói từ máy trắng, nên khi báo cáo chỉ nên nói “đã cài lại trong venv mới trên máy kiểm chứng”, không nói “đã kiểm chứng trên mọi môi trường”.
