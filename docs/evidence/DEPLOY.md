# DEPLOY.md — Hướng dẫn triển khai GreenFarm AI

> **Trạng thái kiểm chứng (2026-10-30): CHƯA TRIỂN KHAI THẬT.**
> Repository có sẵn `vercel.json`, `app/Dockerfile`, `frontend/Dockerfile` và `docker-compose.yml`, nhưng trong đợt kiểm chứng này nhóm **chưa chạy** `vercel deploy`, `vercel dev` hay `docker compose up`. Mọi mục ghi “Chưa chạy” dưới đây là việc phải làm khi triển khai, không phải kết quả đã đạt được.
> Tài liệu này chỉ mô tả cấu hình đọc được từ mã nguồn và tài liệu chính thức của Vercel; không có URL production nào được ghi nhận.

---

## 1. Kiến trúc mục tiêu

Nền tảng dự định: **Vercel Services** (một project chứa cả backend FastAPI và frontend Next.js), với phương án dự phòng **Render (backend) + Vercel (frontend)** và **Docker Compose** khi demo cục bộ.

```
Trình duyệt
   │
   ├── GET /api/...        → rewrite → service "backend"  (FastAPI, app.main:app)
   ├── GET /_next/...      → rewrite → service "frontend" (Next.js)
   └── GET /...            → rewrite → service "frontend" (Next.js App Router)
```

Cấu hình hiện có — `vercel.json` (nguyên văn):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "./",
      "framework": "fastapi",
      "entrypoint": "app.main:app"
    },
    "frontend": {
      "root": "frontend/",
      "framework": "nextjs"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

Điểm cần biết từ tài liệu Vercel (đã đọc ngày 2026-10-30):

- `services` đang ở trạng thái **Beta** trên mọi gói; cấu hình có thể thay đổi.
- Để service nhận traffic công khai, **bắt buộc** khai báo `rewrites` trỏ tới `{ "service": "<tên>" }`; service không tự động có URL riêng.
- Các khóa cấp cao nhất như `functions`, `installCommand`, `buildCommand`, `devCommand`, `outputDirectory`, `framework` phải đặt **bên trong** từng service, không đặt ở gốc.
- Chạy cục bộ bằng `vercel dev`; thêm `-L` để dùng phiên bản local.
- Nguồn: [Vercel Services](https://vercel.com/docs/services), [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi).

---

## 2. Hiện trạng repository (đã đối chiếu mã nguồn)

| Thành phần | Đường dẫn | Trạng thái thực tế |
|---|---|---|
| Cấu hình Vercel Services | `vercel.json` | Có, đúng 2 service + 2 rewrite như trên |
| Backend container | `app/Dockerfile` | Có; `python:3.12-slim`, chạy `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Frontend container | `frontend/Dockerfile` | Có; 3 stage `node:22-alpine`, build với `NEXT_PUBLIC_API_URL`, chạy `npm run start` |
| Docker Compose | `docker-compose.yml` | Có; backend mount `./farm.db`, frontend build arg `http://localhost:8000/api/v1`, healthcheck `/health` |
| Biến môi trường mẫu | `.env.example` | Có; chứa cả `DATABASE_URL` và `CORS_ORIGINS` |
| Dependency backend | `requirements.txt` | Có, 12 gói pin phiên bản (đã cài sạch và chạy test — xem `INSTALL_VERIFY.md`) |
| Migration | `alembic/versions/` | 7 file migration; nhưng app đang dùng `Base.metadata.create_all` + `ensure_legacy_schema`, không chạy Alembic khi khởi động |
| Thư mục `.vercel` | — | **Không có** → chưa từng `vercel link`/deploy trên máy này |
| Vercel CLI | — | **Chưa cài**: `vercel --version` trả `command not found` |
| Docker | — | Có CLI: `Docker version 29.6.2, build dfc4efb`; **chưa chạy** `docker compose up` trong đợt này |

Lịch sử Git có 11 commit trên `main` (tất cả cùng một tác giả `Tran Kha Quan`), trong đó 4 commit gần nhất xử lý lỗi static assets 404 khi cấu hình Vercel:

```
ffb64898 fix: refactor vercel monorepo config to resolve static assets 404
b2a68eb5 fix: restore static assets routing for next.js css
455fc0b1 fix: update next.js version to solve deployment patch issue
25d8bcbb fix: resolve axios typescript types in api.ts
1243d4b0 fix: reset root directory and update vercel routing
```

Việc từng có commit sửa static assets cho thấy cấu hình Vercel đã từng được thử, nhưng **không có bằng chứng deploy thành công** trong repo (không URL, không log Vercel, không thư mục `.vercel`).

---

## 3. Các điểm chặn phải xử lý trước khi deploy

### 3.1. P0 — Database đang hard-code SQLite

`app/core/database.py:5`:

```python
SQLALCHEMY_DATABASE_URL = "sqlite:///./farm.db"
```

Hệ quả:

- Biến `DATABASE_URL` trong `.env.example` **không được đọc** ở bất kỳ đâu trong `app/` (đã grep: chỉ `app/core/database.py` chứa chuỗi này, dạng hard-code).
- Trên Vercel, filesystem của function **không bền vững** (chỉ `/tmp` ghi được, mất khi cold start). Ghi `farm.db` vào thư mục triển khai sẽ lỗi hoặc mất dữ liệu.
- `PRAGMA journal_mode=WAL` và các PRAGMA SQLite được gắn vô điều kiện vào `engine`; nếu đổi sang PostgreSQL mà không sửa listener, kết nối sẽ lỗi.

**Bắt buộc trước khi deploy thật:**

1. Đọc `DATABASE_URL` từ môi trường, fallback SQLite cho local:

   ```python
   import os
   SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./farm.db")
   ```

2. Chỉ gắn listener PRAGMA khi URL bắt đầu bằng `sqlite`.
3. Thêm driver PostgreSQL vào `requirements.txt` (ví dụ `psycopg[binary]`) — hiện **chưa có**.
4. Tạo schema trên database mới bằng `alembic upgrade head` (7 migration có sẵn) hoặc `Base.metadata.create_all` một lần, rồi seed dữ liệu demo.
5. Cập nhật `alembic/env.py` nếu muốn migration đọc cùng `DATABASE_URL` (hiện `env.py:17` lấy `engine.url` từ `database.py`).

> Các thay đổi trên **chưa được thực hiện** trong đợt này vì yêu cầu “không sửa mã nguồn trừ khi prompt yêu cầu rõ”. Đây là điều kiện tiên quyết, không phải tùy chọn.

### 3.2. P0 — SECRET_KEY và CORS

| Vấn đề | Bằng chứng | Cách xử lý |
|---|---|---|
| SECRET_KEY có giá trị mặc định công khai | `app/core/security.py:9` — `os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")`; `.env` hiện không có `SECRET_KEY` | Đặt biến môi trường `SECRET_KEY` riêng cho production, tối thiểu 32 byte ngẫu nhiên (`openssl rand -hex 32`). Nếu không, token có thể bị giả mạo. |
| CORS mở toàn bộ kèm credentials | `app/main.py:62-63` — `allow_origins=["*"], allow_credentials=True`; `CORS_ORIGINS` trong `.env.example` **không được đọc** | Nếu frontend và backend cùng domain qua rewrite của Vercel, CORS gần như không cần thiết. Nếu tách domain, sửa `allow_origins` thành danh sách domain thật và bỏ `*`. |
| `DEBUG=True` trong mẫu | `.env.example` | Đặt `DEBUG=False` trên production. |

### 3.3. P1 — AI key, model và hạn mức

- `GEMINI_API_KEY` được đọc đúng từ env (`app/core/config.py:11`). Phải thêm vào Environment Variables của Vercel; không commit vào repo.
- `GEMINI_MODEL` trong config **bị bỏ qua** vì `app/core/ai_client.py:16` hard-code `GEMINI_MODEL = "gemini-2.5-flash"`. Trên gói miễn phí, model này đã bị chặn 429 sau khi hết hạn mức 20 request/ngày (bằng chứng: `prompt_runs/_partial_gemini_2.5_flash/`, `COMPARISON.md`). Khi deploy thật, cần sửa hard-code hoặc nâng hạn mức.
- Không đặt key trong `NEXT_PUBLIC_*` — key chỉ tồn tại ở backend.

### 3.4. P1 — Upload và file tĩnh

`app/main.py` mount `app/uploads` bằng `StaticFiles`. Trên Vercel, thư mục này không ghi bền vững. Ảnh nhật ký chăm sóc tải lên sẽ mất sau cold start. Phương án: dùng object storage (Vercel Blob/S3) hoặc chấp nhận giới hạn khi demo.

### 3.5. P1 — Biến môi trường frontend là build-time

`frontend/lib/api.ts` đọc `NEXT_PUBLIC_API_URL` hoặc `NEXT_PUBLIC_API_BASE_URL`, mặc định `http://localhost:8000`, rồi tự thêm `/api`. Giá trị `NEXT_PUBLIC_*` được **nhúng lúc build**, không đọc lại lúc chạy. Vì vậy phải đặt biến trước khi build/deploy; đổi sau đó phải redeploy.

**Lưu ý quan trọng:** trang đăng nhập (`frontend/app/login/page.tsx`) **không dùng** `api.ts`; nó gọi trực tiếp `${NEXT_PUBLIC_API_URL}/api/auth/login`. Vì vậy `NEXT_PUBLIC_API_URL` phải là **gốc domain, không kèm `/api` hay `/api/v1`**. Nếu đặt `http://localhost:8000/api/v1` (như `docker-compose.yml` hiện tại), login sẽ gọi `/api/v1/api/auth/login` và thất bại, trong khi các trang khác có thể vẫn gọi đúng.

Với kiến trúc rewrite cùng domain, có thể đặt:

```
NEXT_PUBLIC_API_URL=https://<ten-mien-trien-khai>
```

`api.ts` sẽ gọi `https://<ten-mien>/api/...`, login gọi `https://<ten-mien>/api/auth/login`, và rewrite `/api/(.*)` chuyển tiếp sang backend.

### 3.6. P2 — Vercel Services Beta và rủi ro static assets

- `services` là beta; hành vi định tuyến có thể thay đổi. Cần deploy preview và kiểm tra `/_next/static/*.css`, `/_next/static/*.js` trước khi promote production — đây chính là lỗi mà 4 commit gần nhất cố sửa, nhưng **chưa có bằng chứng đã hết**.
- Rewrite `/(.*)` → frontend là catch-all; nếu thứ tự rewrite sai, `/api` có thể bị nuốt bởi frontend. Giữ `/api/(.*)` **trước** catch-all như file hiện tại.
- Không có `installCommand`/`buildCommand` tùy chỉnh; Vercel tự nhận diện FastAPI/Next.js. Nếu build backend thất bại, kiểm tra `requirements.txt` ở root (đã có) và entrypoint `app.main:app`.

---

## 4. Biến môi trường

### 4.1. Backend

| Biến | Bắt buộc | Được đọc ở đâu | Giá trị mẫu | Ghi chú |
|---|---|---|---|---|
| `SECRET_KEY` | **Có** | `app/core/security.py:9` | chuỗi 64 hex ký tự | Không dùng giá trị mặc định |
| `ALGORITHM` | Không | `security.py:10` | `HS256` | Mặc định HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Không | `security.py:11` | `1440` | Mặc định 24 giờ |
| `GEMINI_API_KEY` | Có nếu dùng AI | `app/core/config.py:11` | `AIza...` | Không commit |
| `GEMINI_MODEL` | Không | `config.py:14` | `gemini-flash-lite-latest` | **Hiện bị bỏ qua** do hard-code `ai_client.py:16` |
| `GEMINI_MAX_PROMPT_CHARS` | Không | `config.py:15` | `24000` | Giới hạn độ dài prompt |
| `DATABASE_URL` | **Có nếu dùng Postgres** | **Chưa được đọc** | `postgresql://...` | Phải sửa `database.py` trước |
| `CORS_ORIGINS` | Không | **Chưa được đọc** | danh sách domain | Phải sửa `main.py` nếu cần |

### 4.2. Frontend

| Biến | Bắt buộc | Được đọc ở đâu | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Có khi deploy | `frontend/lib/api.ts` | Ưu tiên cao nhất; tự thêm `/api` nếu thiếu |
| `NEXT_PUBLIC_API_BASE_URL` | Không | `frontend/lib/api.ts` | Phương án dự phòng |

### 4.3. Lệnh đặt biến bằng Vercel CLI

```bash
vercel env add SECRET_KEY production
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_API_URL production
# nhập giá trị khi được hỏi; không dán key vào shell history nếu máy dùng chung
```

Với Preview/Development, lặp lại với `preview`/`development`. Sau khi thêm biến `NEXT_PUBLIC_*`, phải redeploy để build lại.

---

## 5. Kịch bản A — Triển khai Vercel Services

### Bước 0 — Điều kiện

- Tài khoản Vercel và quyền tạo project.
- Đã xử lý mục 3.1 (PostgreSQL) — nếu chưa, chỉ nên deploy **preview để kiểm tra giao diện**, không dùng cho dữ liệu thật.
- Node.js đã cài (máy kiểm chứng: Node 24.18.1, npm 11.16.0).
- Vercel CLI: **chưa cài** trên máy này (`vercel --version` → `command not found`).

### Bước 1 — Cài và đăng nhập CLI

```bash
npm install -g vercel
vercel --version
vercel login
```

### Bước 2 — Liên kết project

Chạy tại thư mục gốc repository (nơi có `vercel.json`):

```bash
vercel link
```

Chọn tạo project mới. Vercel đọc `services` trong `vercel.json`. **Chưa chạy** trong đợt kiểm chứng này.

### Bước 3 — Cấu hình database (bắt buộc nếu dùng dữ liệu thật)

1. Tạo PostgreSQL managed (Neon, Supabase, Vercel Postgres…).
2. Sửa `app/core/database.py` đọc `DATABASE_URL`, thêm driver, guard PRAGMA (mục 3.1).
3. Chạy migration/khởi tạo schema trên database đích.
4. Seed dữ liệu demo bằng `scripts/demo_data.py` nếu cần.
5. Đặt `DATABASE_URL` trên Vercel cho cả Preview và Production.

Nếu bỏ qua bước này, backend sẽ cố ghi SQLite vào filesystem chỉ đọc/không bền vững và dữ liệu sẽ mất.

### Bước 4 — Chạy thử cục bộ bằng Vercel

```bash
vercel dev -L
```

Kiểm tra:

- `http://localhost:3000/` — trang đăng nhập.
- `http://localhost:3000/health` — phải trả `{"status":"ok"}` (rewrite `/health` rơi vào catch-all frontend, nên kiểm tra trực tiếp backend nếu cần).
- `http://localhost:3000/api/...` — gọi API qua rewrite.
- Đăng nhập bằng tài khoản seed.

**Chưa chạy** — không có log `vercel dev` trong repo.

### Bước 5 — Deploy preview

```bash
vercel
```

Vercel trả về Preview URL. Kiểm tra theo checklist mục 7 trước khi promote.

### Bước 6 — Deploy production

```bash
vercel --prod
```

Ghi lại URL và thời điểm deploy vào mục 9 khi thực hiện thật. Hiện **chưa có**.

### Bước 7 — Kiểm tra sau deploy

```bash
curl -i https://<domain>/health
curl -i https://<domain>/api/v1/...
curl -I https://<domain>/_next/static/<file>.css
```

Mở trình duyệt, đăng nhập, kiểm tra Console/Network không có 404 static, không có lỗi CORS.

---

## 6. Kịch bản B — Docker Compose (demo cục bộ)

Phù hợp khi trình diễn trên máy có Docker; không phải phương án production vì vẫn dùng SQLite và mật khẩu mẫu.

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:8000/health
# mở http://localhost:3000
docker compose logs -f backend
docker compose down
```

Lưu ý từ `docker-compose.yml`:

- Backend build từ `app/Dockerfile`, mount `./farm.db:/app/farm.db` — dữ liệu nằm trên máy host.
- `SECRET_KEY` mặc định là `replace-this-secret-before-deployment` nếu không truyền env.
- Frontend build với `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`; `api.ts` sẽ chuẩn hóa thành `.../api/v1/api`? **Không** — xem cảnh báo dưới.
- Healthcheck gọi `/health` mỗi 15 giây.

> **Cảnh báo cấu hình:** `NEXT_PUBLIC_API_URL` trong Compose có đuôi `/api/v1`, trong khi trang đăng nhập gọi thêm `/api/auth/login` (`frontend/app/login/page.tsx`) và `frontend/lib/api.ts` cũng tự nối `/api`. Với giá trị này, login có thể thành `http://localhost:8000/api/v1/api/auth/login` và thất bại. Cần đổi thành `http://localhost:8000` trước khi demo. **Chưa chạy Compose** trong đợt này nên chưa xác nhận hành vi thực tế.

Docker CLI có sẵn (`Docker version 29.6.2`), nhưng chưa xác minh daemon đang chạy. Nếu `docker compose up` báo không kết nối được daemon, mở Docker Desktop rồi chạy lại.

---

## 7. Kịch bản C — Render (backend) + Vercel (frontend)

Phương án này tách riêng hai dịch vụ, tránh beta `services`:

1. **Backend trên Render**
   - Tạo Web Service từ repo, root directory là thư mục gốc.
   - Build: `pip install -r requirements.txt`.
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   - Health check path: `/health`.
   - Thêm `SECRET_KEY`, `GEMINI_API_KEY`, `DATABASE_URL` (sau khi sửa code) trong Environment.
   - Gắn Persistent Disk nếu vẫn dùng SQLite (không khuyến nghị).
2. **Frontend trên Vercel**
   - Import repo, root directory `frontend/`.
   - `NEXT_PUBLIC_API_URL=https://<backend>.onrender.com`.
   - Build mặc định `npm run build`.
3. **CORS**: sửa `app/main.py` cho phép đúng domain frontend, bỏ `*` khi dùng credentials.
4. **Kiểm tra**: gọi `/health`, đăng nhập, tải danh sách lô, gọi một chức năng AI.

Toàn bộ kịch bản này **chưa chạy**; không có bằng chứng deploy Render trong repo.

---

## 8. Checklist trước khi công bố

| # | Hạng mục | Điều kiện đạt | Trạng thái |
|---|---|---|---|
| 1 | `SECRET_KEY` mạnh, không mặc định | Biến môi trường production tồn tại, khác giá trị trong code | Chưa |
| 2 | Database bền vững | PostgreSQL được cấu hình, schema tạo xong, ghi/đọc qua restart | Chưa |
| 3 | `GEMINI_API_KEY` chỉ ở backend | Không xuất hiện trong bundle frontend/Git | Chưa |
| 4 | CORS đúng domain | Không còn `*` + credentials khi tách domain | Chưa |
| 5 | Rewrite `/api` hoạt động | `POST /api/auth/login` trả token | Chưa |
| 6 | Static assets | `/_next/static/*.css|js` trả 200, không 404 | Chưa |
| 7 | Health check | `/health` trả `{"status":"ok"}` | Chưa |
| 8 | Upload bền vững | Ảnh nhật ký còn sau restart (object storage) | Chưa |
| 9 | AI hoạt động | Một chức năng AI trả kết quả thật, có disclaimer | Chưa |
| 10 | Tài khoản demo | Đổi mật khẩu/xóa tài khoản mẫu trước khi public | Chưa |
| 11 | Log/backup | Có nơi xem log và lịch backup DB | Chưa |
| 12 | HTTPS | Domain có TLS hợp lệ | Chưa |

---

## 9. Nhật ký triển khai (chỉ ghi khi đã chạy thật)

| Ngày | Môi trường | Hành động | Kết quả | URL/Log |
|---|---|---|---|---|
| — | — | Chưa triển khai | — | — |

> Không điền dòng nào vào bảng này nếu chưa có lệnh chạy và đầu ra thật.

---

## 10. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân khả dĩ | Cách kiểm tra/sửa |
|---|---|---|
| Trang trắng, CSS 404 | Rewrite catch-all nuốt `/_next/static` hoặc service frontend sai root | Kiểm tra Network; đảm bảo `frontend` service `root: "frontend/"`; thử deploy preview mới |
| `/api/...` trả HTML của Next.js | Thứ tự rewrite sai hoặc backend service không nhận path | Đặt `/api/(.*)` trước `/(.*)`; kiểm tra service `backend` |
| 500 khi gọi API | Thiếu `SECRET_KEY`/`GEMINI_API_KEY`, DB không ghi được, thiếu bảng | Xem function log; kiểm tra biến môi trường và schema |
| 429 từ Gemini | Hết hạn mức model | Đổi model/hạn mức; lưu ý `GEMINI_MODEL` đang bị hard-code |
| Dữ liệu mất sau vài phút | SQLite trên filesystem tạm | Chuyển PostgreSQL |
| CORS error | Frontend khác origin, backend `*` + credentials | Cấu hình allowlist đúng domain |
| `vercel dev` lỗi | Chưa login/link, CLI cũ | `vercel login`, `vercel link`, cập nhật CLI |

---

## 11. Bảo mật khi triển khai

- Không đưa `.env`, key, token vào repo hoặc ảnh chụp màn hình.
- Key Gemini cũ từng xuất hiện trong lịch sử Git (xem `SECURITY_SCAN.md` mục S1) — **phải thu hồi và tạo key mới** trước khi public.
- Bật rate limit ở tầng gateway cho `/api/auth/login` và các endpoint AI.
- Giới hạn dữ liệu trả về của endpoint truy xuất công khai (`/api/traceability/...`, `/api/harvests/trace/...`) — hiện trả cả ghi chú và URL ảnh.
- Dùng HTTPS, cookie `HttpOnly`/`Secure` nếu chuyển token khỏi localStorage.

---

## 12. Phụ lục — Bằng chứng đã dùng để viết tài liệu này

| Nội dung | Nguồn |
|---|---|
| Cấu hình service/rewrite | `vercel.json` |
| Cổng, entrypoint backend | `app/Dockerfile` |
| Build frontend, Node 22 | `frontend/Dockerfile` |
| SQLite hard-code, PRAGMA | `app/core/database.py:5-29` |
| SECRET_KEY mặc định | `app/core/security.py:9` |
| CORS `*` + credentials | `app/main.py:62-63` |
| Model AI hard-code | `app/core/ai_client.py:16` |
| Biến frontend | `frontend/lib/api.ts` |
| 7 migration | `alembic/versions/*.py` |
| Trạng thái Git | `git log --oneline` → 11 commit, một tác giả |
| Chưa có `.vercel` | `ls -d .vercel frontend/.vercel` → không tồn tại |
| CLI chưa cài | `vercel --version` → `command not found` |
| Docker CLI | `docker --version` → `Docker version 29.6.2` |
| Tài liệu Vercel Services | https://vercel.com/docs/services (đọc 2026-10-30) |
| Hạn mức Gemini 429 | `docs/evidence/COMPARISON.md`, `docs/evidence/prompt_runs/` |
| Cài đặt sạch + test | `docs/evidence/INSTALL_VERIFY.md` |

---

**Kết luận thẳng thắn:** repo đã có khung cấu hình để thử Vercel, nhưng chưa đủ điều kiện để gọi là “đã triển khai”. Hai việc chặn lớn nhất là database SQLite hard-code và các secret mặc định. Khi bảo vệ, nên trình bày đây là **phương án triển khai dự kiến**, kèm checklist và các rủi ro đã nhận diện — không tuyên bố đã có URL production.
