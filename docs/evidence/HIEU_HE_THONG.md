# Hiểu hệ thống GreenFarm AI

**Tài liệu dành cho người mới, viết để chuẩn bị bảo vệ đồ án môn "Ứng dụng trí tuệ nhân tạo"**

- Tên đề tài: *Hệ thống quản lý trang trại rau sạch tích hợp AI*
- Ngày đối chiếu và chạy kiểm chứng: **29/10/2026**
- Phạm vi: toàn bộ mã nguồn trong thư mục `farm_backend/` (backend FastAPI) và `farm_backend/frontend/` (Next.js).
- Cách làm: đọc mã nguồn, chạy thử API, chạy test, đọc trực tiếp cơ sở dữ liệu `farm.db`. Mọi con số trong tài liệu này đều lấy từ lần chạy thật ngày 29/10/2026, không phải ước lượng.

**Quy ước đọc tài liệu**

| Ký hiệu | Nghĩa |
|---|---|
| **[Đã chạy thật]** | Có lệnh chạy và kết quả cụ thể, xem file `KIEM_CHUNG_THUC_TE.md` cùng thư mục |
| **[Chưa có]** | Trong mã nguồn không có, hoặc có nhưng chưa hoạt động. Luôn kèm lý do |
| **API** | Địa chỉ backend mà frontend gọi, ví dụ `POST /api/care-logs` |
| **Bảng** | Bảng trong cơ sở dữ liệu SQLite `farm.db` |

---

## 1. Hệ thống làm gì, cho ai dùng?

### 1.1. Giải thích bằng một câu

Đây là **cuốn sổ tay điện tử của một trang trại rau sạch**, ghi lại mọi việc từ lúc gieo hạt đến lúc bán rau, và có thêm **một trợ lý AI** đọc cuốn sổ đó để nhắc việc, tóm tắt tình hình và trả lời câu hỏi.

### 1.2. Hãy tưởng tượng như sau

Một trang trại có nhiều **thửa đất**. Trên mỗi thửa, người ta trồng một **lô rau** (ví dụ "Cà chua - Nhà kính 1 - 10/2026"). Mỗi ngày, nhân viên tưới nước, bón phân, phun thuốc, kiểm tra sâu bệnh... Tất cả được ghi vào **nhật ký chăm sóc**. Khi thu hoạch, người ta ghi sản lượng. Cuối cùng, khách hàng quét **mã QR** trên tem rau để xem rau đó được trồng ở đâu, chăm sóc thế nào.

Nếu làm bằng giấy, sẽ có 3 vấn đề:

1. Quên lịch chăm sóc, nhất là khi có nhiều lô.
2. Không biết vật tư nào sắp hết, lô nào lâu chưa được kiểm tra.
3. Khi khách hỏi "rau này trồng thế nào?", không có bằng chứng rõ ràng.

Hệ thống này giải quyết 3 vấn đề đó bằng phần mềm web. AI không thay người quyết định, AI chỉ **đọc dữ liệu thật trong hệ thống** rồi gợi ý, và mọi câu trả lời AI đều kèm câu cảnh báo "chỉ mang tính tham khảo".

### 1.3. Ai dùng hệ thống?

Hệ thống có 4 vai trò. Vai trò được lưu trong bảng `users`, cột `role`.

| Vai trò | Là ai trong thực tế | Được làm gì trong hệ thống |
|---|---|---|
| **ADMIN** (Quản trị viên) | Người cài đặt, quản lý hệ thống | Toàn quyền. Ma trận phân quyền trong `app/core/permissions.py` cho ADMIN bỏ qua mọi kiểm tra quyền |
| **MANAGER** (Quản lý trang trại) | Chủ trang trại / quản lý | Quản lý đất, giống, lô trồng, vật tư, tài khoản nhân viên; không tạo được tài khoản ADMIN/MANAGER qua màn hình này; xem báo cáo, dùng AI |
| **TECHNICIAN** (Kỹ thuật viên) | Người phụ trách kỹ thuật canh tác | Tạo/sửa/xóa lô trồng, ghi nhật ký, xóa nhật ký, dùng AI sinh lịch và cảnh báo. **Không** được tạo đất/giống/vật tư mới (theo ma trận quyền) |
| **STAFF** (Nhân viên) | Người trực tiếp làm vườn | Chỉ thấy và ghi nhật ký cho **lô đất được phân công** (`users.plot_id`). Được dùng tab "Hỏi đáp AI" và bị giới hạn theo lô; riêng tab "Tóm tắt nhật ký" hiện **chưa lọc theo lô ở backend** (xem 6.3). Không dùng tab lịch chăm sóc / cảnh báo AI |

> **Điểm đáng chú ý:** phân quyền không chỉ ẩn nút trên giao diện. Backend kiểm tra lại ở các API nghiệp vụ chính bằng `require_permission(...)`, `require_roles(...)` và `get_current_user(...)`. Nếu tự gọi API bằng Postman với token của STAFF, backend vẫn chặn ở phần lớn API. Ngoại lệ đã kiểm tra: `GET /api/notifications`, `GET /search` chưa gắn xác thực; hai API trace công khai thì cố ý mở. Đây là điểm mạnh khi bảo vệ, nhưng phải nói kèm ngoại lệ để không bị bắt lỗi.

### 1.4. Chín màn hình chính

Menu được khai báo trong `frontend/lib/nav.ts`.

| Đường dẫn | Tên trên menu | Người dùng làm gì ở đây |
|---|---|---|
| `/` | Tổng quan | Xem tổng diện tích, số lô, số lô đang trồng, sản lượng đã ghi nhận và biểu đồ sản lượng |
| `/varieties` | Giống cây | Xem/thêm/sửa/xóa giống: thời gian sinh trưởng, năng suất, mùa vụ, pH, nhiệt độ |
| `/crop-lots` | Lô đất | Quản lý thửa đất: mã, diện tích, loại đất, vị trí, trạng thái |
| `/batches` | Lô trồng | Tạo lô trồng từ một thửa đất + một giống; theo dõi trạng thái, sửa nhanh tại chỗ |
| `/care-logs` | Nhật ký & Trợ lý AI | Ghi tưới nước / bón phân / phun thuốc / bệnh hại / thu hoạch; đính ảnh; gọi AI sinh lịch, hỏi AI |
| `/supplies` | Vật tư nông nghiệp | Xem tồn kho, nhập kho, cảnh báo sắp hết / sắp hết hạn |
| `/traceability` | Truy xuất nguồn gốc | Chọn lô, xem hành trình, tạo mã QR, tải ảnh QR, in tem |
| `/data-reports` | Dữ liệu & Báo cáo | Nhập Excel/CSV cho vật tư, giống, đất; xuất báo cáo Excel |
| `/users` | Quản lý tài khoản | Thêm/sửa/khóa/xóa tài khoản, gán lô đất cho nhân viên (chỉ ADMIN/MANAGER) |

Ngoài menu còn có:

- `/login`: trang đăng nhập.
- `/trace/[mã lô]`: trang **công khai**, khách quét QR mở trang này, không cần đăng nhập.
- Một cửa sổ chat AI nổi ở góc phải, có 4 tab: Hỏi đáp AI, Lịch chăm sóc, Tóm tắt nhật ký, Cảnh báo AI (`frontend/components/ai/GlobalAIChatbot.tsx`).

### 1.5. AI làm gì và không làm gì

**AI thật sự làm (gọi Gemini):**

| Chức năng | Người dùng bấm gì | Kết quả |
|---|---|---|
| Sinh lịch chăm sóc | Tab "Lịch chăm sóc" hoặc nút trong trang nhật ký | Danh sách việc: ngày, tưới/bón/kiểm tra sâu bệnh, mô tả |
| Tóm tắt nhật ký | Tab "Tóm tắt nhật ký" | 3–4 câu tóm tắt + vấn đề phát hiện + khuyến nghị + ID nhật ký đã dùng |
| Cảnh báo lô cần kiểm tra | Tab "Cảnh báo AI" | Tối đa 5 lô, xếp hạng 1–5 kèm lý do |
| Hỏi đáp tự do | Tab "Hỏi đáp AI", hoặc nút "Hỏi AI" ở từng nhật ký | Câu trả lời dựa trên dữ liệu thật của lô đang chọn |

**Không phải AI (chỉ là quy tắc lập trình):**

- Khi ghi nhật ký có chữ "sâu", "bệnh", "rệp", "nấm", "héo", "vàng lá", "bọ trĩ", hệ thống tự tạo thông báo cảnh báo. Đây là `if` trong code, không gọi Gemini.
- Khi vật tư xuống dưới ngưỡng tối thiểu, hệ thống tự tạo thông báo.
- Ngày thu hoạch dự kiến: người dùng nhập khi tạo lô; nếu để trống, backend tự tính `ngày gieo + growth_days` khi hiển thị (`normalize_batch`), không phải AI dự đoán.

**AI KHÔNG làm (cần nói thật nếu bị hỏi):**

| Việc | Tình trạng | Lý do |
|---|---|---|
| Gợi ý thời điểm thu hoạch bằng AI (đề bài có nhắc) | **[Chưa có]** | Chỉ có ngày dự kiến do người dùng nhập hoặc backend tự cộng `ngày gieo + growth_days`; không có endpoint AI riêng cho việc này |
| Chẩn đoán sâu bệnh qua ảnh | **[Chưa có]** | Có API upload ảnh (`POST /api/care-logs/upload`) nhưng ảnh chỉ được lưu, không gửi cho AI. Hàm `call_gemini` có hỗ trợ ảnh nhưng không nơi nào gọi |
| Bán sản phẩm | **[Chưa có]** | Có bảng `sales` và dữ liệu mẫu, có file `app/routers/sale.py` nhưng **không được gắn** vào `app/main.py`; frontend không có trang bán hàng |
| Ghi thu hoạch đầy đủ | **[Chưa có]** | Giao diện chỉ ghi "Thu hoạch" dưới dạng nhật ký. API `POST /api/harvests` đang lỗi (xem mục 4.4) |
| RAG / tìm kiếm tri thức nông nghiệp | **[Chưa có]** | Không có vector database, không có tài liệu nạp thêm. AI chỉ đọc dữ liệu trong prompt |
| Ghi nhớ hội thoại | **[Chưa có]** | Mỗi lần chat gửi một câu độc lập, không lưu lịch sử chat vào CSDL |
| Đánh dấu tất cả thông báo đã đọc | **[Chưa có]** | Frontend gọi `PUT /api/notifications/read-all`, backend chỉ có `GET /api/notifications` |
| So sánh nhiều phiên bản prompt | **[Chưa có]** | Trong repo không có thư mục thí nghiệm/ghi lại kết quả so sánh prompt |

---

## 2. Sơ đồ thư mục

Chỉ liệt kê các thư mục/file quan trọng. Mỗi dòng là việc của file đó.

```text
farm_backend/
├── app/                          # TOÀN BỘ BACKEND (Python + FastAPI)
│   ├── main.py                   # Tạo app, khai báo CORS, gắn tất cả router, chặn lỗi toàn cục
│   ├── seed_data.py              # Dữ liệu mẫu (đất, giống, lô, nhật ký...)
│   ├── mock_data.py              # Dữ liệu giả dùng cho demo
│   │
│   ├── core/                     # "Bộ phận nền" dùng chung
│   │   ├── config.py             # Đọc biến môi trường: GEMINI_API_KEY, GEMINI_MODEL, giới hạn prompt
│   │   ├── database.py           # Kết nối SQLite farm.db, PRAGMA tăng tốc, tạo index, tạo bảng thiếu cột
│   │   ├── security.py           # Băm mật khẩu (PBKDF2), tạo/đọc JWT
│   │   ├── deps.py               # get_current_user: giải mã token rồi hỏi lại bảng users
│   │   ├── permissions.py        # Bảng ma trận quyền + hàm require_permission
│   │   └── ai_client.py          # Gọi Gemini: prompt, JSON schema, xử lý lỗi 429/504/502/503, disclaimer
│   │
│   ├── models/                   # Mô tả bảng CSDL bằng class Python (SQLAlchemy)
│   │   ├── user.py               # users: tài khoản, vai trò, lô được phân công
│   │   ├── plot.py               # plots: thửa đất
│   │   ├── plant_variety.py      # plant_varieties: giống cây, thời gian sinh trưởng, tồn kho giống
│   │   ├── crop_batch.py         # crop_batches: lô trồng
│   │   ├── care_log.py           # care_logs: nhật ký chăm sóc
│   │   ├── harvest.py            # harvest_logs: lượt thu hoạch + mã QR
│   │   ├── supply.py             # supplies, supply_imports: vật tư và lô nhập kho
│   │   ├── supply_usage.py       # supply_usage: vật tư đã dùng cho nhật ký nào
│   │   ├── notification.py       # notifications: thông báo trong app
│   │   ├── ai_suggestion.py      # ai_suggestions: lưu lại prompt + kết quả AI (nhật ký kiểm toán)
│   │   └── sale.py               # sales: bảng bán hàng (chưa dùng ở API/UI)
│   │
│   ├── schemas/                  # "Khuôn" dữ liệu vào/ra, kiểm tra kiểu và giới hạn
│   │   ├── user.py               # Khuôn đăng nhập, tạo tài khoản
│   │   ├── crop_batch.py         # Khuôn tạo/sửa lô trồng
│   │   ├── care_log.py           # Khuôn nhật ký + danh sách vật tư sử dụng
│   │   ├── harvest.py            # Khuôn thu hoạch cũ (đang lệch với service)
│   │   ├── ai_summary.py         # Khuôn AI tóm tắt (SummaryAIRaw, AiSummaryOut)
│   │   ├── ai_schedule.py        # Khuôn AI lịch (ScheduleAIRaw, AiScheduleOut)
│   │   └── ai_alert.py           # Khuôn AI cảnh báo (AlertAIRaw, AiAlertOut)
│   │
│   ├── routers/                  # "Quầy tiếp nhận" HTTP: nhận request, trả response
│   │   ├── auth.py               # /api/auth: đăng nhập, /me, quản lý tài khoản
│   │   ├── plot.py               # /api/plots: CRUD thửa đất
│   │   ├── plant_variety.py      # /api/varieties: CRUD giống
│   │   ├── crop_batch.py         # /api/batches: CRUD lô + 2 API truy xuất công khai
│   │   ├── care_log.py           # /api/care-logs: nhật ký, upload ảnh, xóa, tóm tắt AI cũ
│   │   ├── harvest.py            # /api/harvests: danh sách, tạo (đang lỗi), tra theo mã QR
│   │   ├── supply.py             # /api/supplies: tồn kho, nhập kho, cảnh báo
│   │   ├── dashboard.py          # /api/dashboard/harvest-chart: biểu đồ sản lượng
│   │   ├── notification.py       # /api/notifications: đọc thông báo
│   │   ├── search.py             # /search: tìm trong ghi chú thu hoạch
│   │   ├── traceability.py       # /api/traceability/{mã}: truy xuất công khai (bản 2)
│   │   ├── ai_schedule.py        # POST /api/ai-schedule/...: sinh lịch
│   │   ├── ai_summary.py         # POST /api/ai-summary/...: tóm tắt nhật ký
│   │   ├── ai_alert.py           # POST /api/ai-alert/alerts: xếp hạng lô cần kiểm tra
│   │   └── ai_advisor.py         # POST /api/v1/ai-advisor/chat: hỏi đáp + tóm tắt alias
│   │
│   ├── services/                 # "Bộ não nghiệp vụ": tính toán, gọi AI, kiểm tra kết quả
│   │   ├── crop_batch_service.py # Tạo/sửa/xóa lô, trừ và hoàn kho giống
│   │   ├── supply.py             # Trừ kho vật tư, tạo bản ghi sử dụng
│   │   ├── harvest.py            # Tạo lượt thu hoạch (đang lệch schema -> lỗi)
│   │   ├── ai_schedule.py        # Prompt + kiểm chứng lịch AI
│   │   ├── ai_summary.py         # Tìm lô, dựng prompt, kiểm chứng trích dẫn, fallback
│   │   ├── ai_alert.py           # Tính chỉ số từng lô, prompt, kiểm chứng mã lô
│   │   ├── gemini_advisor.py     # Code AI cũ, import module không tồn tại, KHÔNG được dùng
│   │   └── traceability.py       # Code truy xuất cũ, dùng sai tên cột, KHÔNG được dùng
│   │
│   └── repositories/             # Các hàm truy vấn CSDL ngắn, dùng lại nhiều nơi
│       ├── crop_batch.py         # Lấy lô theo id/mã, lấy lô đang trồng
│       ├── care_log.py           # Lấy nhật ký theo lô
│       ├── plant_variety.py      # Lấy giống theo id
│       ├── plot.py               # Lấy thửa đất theo id/mã
│       ├── ai_suggestion.py      # Ghi/lấy lịch sử gợi ý AI
│       └── harvest.py            # Truy vấn thu hoạch
│
├── frontend/                     # TOÀN BỘ GIAO DIỆN (Next.js + React + TypeScript)
│   ├── app/
│   │   ├── layout.tsx            # Khung HTML gốc, font, metadata
│   │   ├── login/page.tsx        # Trang đăng nhập, lưu token, chuyển trang
│   │   ├── (dashboard)/          # Nhóm trang sau khi đăng nhập (dùng chung layout)
│   │   │   ├── layout.tsx        # Bọc SWRProvider + AppShell cho mọi trang con
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── varieties/        # Trang giống cây
│   │   │   ├── crop-lots/        # Trang lô đất
│   │   │   ├── batches/          # Trang lô trồng
│   │   │   ├── care-logs/        # Trang nhật ký + AI
│   │   │   ├── supplies/         # Trang vật tư
│   │   │   ├── traceability/     # Trang truy xuất nội bộ
│   │   │   ├── data-reports/     # Trang nhập/xuất Excel
│   │   │   └── users/            # Trang tài khoản
│   │   └── trace/[batch_code]/   # Trang công khai cho khách quét QR
│   ├── components/
│   │   ├── layout/               # Sidebar, Header, AppShell (khung trang)
│   │   ├── ai/GlobalAIChatbot.tsx# Cửa sổ chat AI 4 tab
│   │   ├── batches/              # Modal tạo lô, huy hiệu trạng thái
│   │   ├── dashboard/            # Biểu đồ, thẻ số liệu (có file widget thời tiết nhưng chưa gắn vào trang)
│   │   ├── effects/              # Hiệu ứng chuyển động (SplitText, CountUp...)
│   │   └── traceability/         # Báo cáo truy xuất, huy hiệu loại nhật ký
│   ├── lib/
│   │   ├── api.ts                # Hàm gọi API chung: gắn token, chuẩn hóa URL, bắt lỗi
│   │   ├── nav.ts                # Danh sách menu + vai trò được thấy
│   │   ├── types.ts              # Kiểu dữ liệu TypeScript dùng chung
│   │   └── auth/permissions.ts   # Chuẩn hóa role và kiểm tra quyền ở giao diện
│   └── middleware.ts             # Chặn /users và /accounts nếu không phải ADMIN/MANAGER
│
├── tests/                        # 18 bài test backend (pytest)
│   ├── conftest.py               # Tạo CSDL tạm trong RAM + dữ liệu mẫu cho test
│   ├── test_auth.py              # 7 bài: đăng nhập, token, phân quyền, phạm vi lô
│   ├── test_crop_batch.py        # 4 bài: tạo lô, trừ kho, xóa hoàn kho, thiếu kho
│   ├── test_care_log.py          # 3 bài: lưu nhật ký, upload ảnh, chặn file giả
│   ├── test_supply.py            # 2 bài: tạo vật tư, chặn tồn âm
│   ├── test_traceability.py      # 1 bài: truy xuất đủ lô/giống/nhật ký/thu hoạch
│   └── test_ai_service.py        # 1 bài: mock AI, kiểm tra reply + disclaimer
│
├── alembic/versions/             # 7 file migration (lịch sử thay đổi CSDL)
├── scripts/                      # seed_data.py, demo_data.py (dữ liệu mẫu)
├── seed.py, seed_db.py           # Script nạp dữ liệu mẫu
├── create_admin.py               # Script tạo tài khoản admin
├── farm.db                       # CSDL SQLite thật đang dùng
├── requirements.txt              # Danh sách thư viện backend (file đang RỖNG - xem mục 3.4)
├── Dockerfile, docker-compose.yml# Đóng gói chạy bằng Docker
├── vercel.json                   # Cấu hình deploy frontend/backend lên Vercel
├── README.md                     # Hướng dẫn chung của repo
└── docs/evidence/                # Thư mục chứa tài liệu kiểm chứng (file này nằm ở đây)
```

**Cách đọc nhanh:** một request đi theo đường

```text
Người dùng bấm
   -> frontend/app/(dashboard)/.../page.tsx
   -> lib/api.ts (gắn token)
   -> app/routers/<tên>.py (nhận request, kiểm tra quyền)
   -> app/services/<tên>.py (xử lý nghiệp vụ, gọi AI nếu cần)
   -> app/models/<tên>.py (SQLAlchemy) -> farm.db
```

---

## 3. Công nghệ dùng và vì sao

### 3.1. Backend

| Công nghệ | Phiên bản đang cài **[Đã chạy thật]** | Dùng để làm gì | Vì sao chọn |
|---|---|---|---|
| Python | 3.12.10 | Ngôn ngữ backend | Dễ đọc, nhiều thư viện AI/CSDL |
| FastAPI | 0.141.1 | Tạo API HTTP | Viết API nhanh, tự sinh tài liệu `/docs`, tự kiểm tra dữ liệu |
| Uvicorn | 0.52.3 | Máy chủ chạy FastAPI | Chạy được trên Windows, khởi động nhanh |
| SQLAlchemy | 2.0.52 | ORM: viết Python thay cho SQL | Tránh viết SQL thủ công, đổi CSDL dễ hơn |
| SQLite (`farm.db`) | Có sẵn trong Python | Lưu dữ liệu | Không cần cài server CSDL, phù hợp đồ án, dễ nộp kèm dữ liệu |
| Pydantic | 2.13.4 | Kiểm tra dữ liệu vào/ra | Chặn dữ liệu sai ngay cửa ngõ, tự trả lỗi 422 rõ ràng |
| PyJWT | 2.13.0 | Tạo/đọc token đăng nhập | Chuẩn phổ biến, không cần session server |
| passlib | 1.7.4 | Băm mật khẩu PBKDF2-SHA256 | Không lưu mật khẩu thô; có hỗ trợ xác thực hash bcrypt cũ |
| google-genai | 2.18.1 | Gọi Gemini | SDK chính thức của Google, hỗ trợ ép JSON theo schema |
| Alembic | 1.20.0 | Quản lý thay đổi CSDL | Có 7 migration; tuy nhiên lúc chạy app dùng `ensure_legacy_schema()` để tự thêm cột/index |
| pytest | 9.2.0 | Chạy test | 18 bài test đang pass |

### 3.2. Frontend

| Công nghệ | Phiên bản đang cài **[Đã chạy thật]** | Dùng để làm gì | Vì sao chọn |
|---|---|---|---|
| Next.js | 16.4.3 | Framework React, định tuyến trang | Có sẵn routing, middleware, tối ưu ảnh, deploy Vercel |
| React | 19.2.8 | Xây giao diện theo component | Phổ biến, dễ tách nhỏ trang |
| TypeScript | 5.7.3 | Thêm kiểu cho JavaScript | Bắt lỗi sai tên trường trước khi chạy; `npx tsc --noEmit` đang pass |
| Tailwind CSS | 4.3.3 | Viết giao diện bằng class | Nhanh, không phải viết file CSS riêng cho từng trang |
| SWR | 2.5.1 | Gọi API + cache dữ liệu | Tự cache, tự gộp request trùng, chuyển tab không phải tải lại |
| Recharts | 3.10.1 | Vẽ biểu đồ sản lượng | Biểu đồ đẹp, dễ gắn dữ liệu JSON |
| motion | 12.43.0 | Hiệu ứng chuyển động | Hiệu ứng chữ, đếm số, chuyển tab mượt |
| qrcode.react | 4.2.0 | Sinh mã QR | Sinh QR ngay trên trình duyệt, không cần server |
| ExcelJS | 4.4.0 | Đọc/ghi Excel | Nhập danh mục và xuất báo cáo; chỉ tải khi cần (dynamic import) |
| lucide-react | 1.31.0 | Bộ icon | Nhẹ, thống nhất giao diện |
| Base UI | 1.7.0 | Thành phần giao diện nền | Modal, tab, nút có sẵn hành vi truy cập |

### 3.3. AI

| Thành phần | Giá trị thật trong code | Ý nghĩa |
|---|---|---|
| Nhà cung cấp | Google Gemini qua SDK `google-genai` | Dịch vụ AI bên ngoài |
| Model | **`gemini-2.5-flash` viết cứng** trong `app/core/ai_client.py` | Model nhanh, rẻ, đủ cho tác vụ tóm tắt/lập lịch |
| Temperature | `0.3` | Nhiệt độ thấp để câu trả lời ổn định, ít sáng tạo ngẫu nhiên |
| Định dạng trả về | JSON ép theo `response_schema` (Pydantic) | Backend nhận đúng cấu trúc, không phải đoán chuỗi |
| Giới hạn prompt | 24.000 ký tự (`GEMINI_MAX_PROMPT_CHARS`) | Chặn prompt quá dài, tự cắt và ghi chú |
| Disclaimer | Câu cố định trong `ai_client.py` | Luôn gắn vào kết quả, không phụ thuộc AI có tự viết hay không |

> **Cần biết khi bảo vệ:** biến môi trường `GEMINI_MODEL` có trong `config.py` (mặc định `gemini-flash-lite-latest`) nhưng **không được dùng**, vì `ai_client.py` viết cứng `gemini-2.5-flash`. Đây là điểm lệch cấu hình, không phải model tự đổi.

### 3.4. Những điểm chưa hoàn chỉnh về công nghệ

| Điểm | Thực tế | Ảnh hưởng |
|---|---|---|
| `requirements.txt` | **File rỗng (0 byte)** | Người khác clone repo không biết cài thư viện gì. Cần tạo lại bằng `pip freeze` trước khi nộp |
| `SECRET_KEY` | Đang dùng giá trị mặc định `"your-super-secret-key-change-this-in-production"` | Nếu deploy thật, người biết khóa có thể tự tạo token. Cần đổi trong `.env` |
| CORS | `allow_origins=["*"]`, `allow_credentials=True` | Mở cho mọi nguồn; phù hợp demo, chưa phù hợp production |
| Alembic | Có 7 migration nhưng app tự tạo bảng/cột bằng `ensure_legacy_schema()` | Hai cơ chế cùng tồn tại; dễ hiểu nhầm migration là nguồn chính |
| Code cũ | `app/services/gemini_advisor.py`, `app/services/traceability.py` import module không tồn tại | Không được import ở đâu nên app vẫn chạy; nên xóa để tránh hiểu nhầm |
| Router không gắn | `sale.py`, `user.py`, `seeds.py` không được include trong `main.py` | API bán hàng/quản lý người dùng kiểu cũ không tồn tại trên thực tế |

---

## 4. Đi theo từng luồng

Phần này trả lời đúng câu hỏi: **bấm gì → gọi API nào → file backend nào xử lý → lưu vào bảng nào.**

### 4.1. Luồng đăng nhập

**Người dùng thấy:** mở trang `/login`, nhập email (hoặc tên đăng nhập, hoặc mã nhân viên) và mật khẩu, bấm "Đăng nhập".

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Form gửi `POST /api/auth/login`, kiểu `application/x-www-form-urlencoded`, hai trường `username` và `password` | `frontend/app/login/page.tsx` |
| 2 | Backend tìm user theo **email HOẶC username HOẶC employee_code** | `app/routers/auth.py` → hàm `login` |
| 3 | So mật khẩu bằng `verify_password` (PBKDF2-SHA256; hỗ trợ hash bcrypt cũ) | `app/core/security.py` |
| 4 | Nếu sai: trả **401** "Email hoặc mật khẩu không chính xác". Nếu `is_active = false`: trả **403** "Tài khoản đã bị khóa" | `app/routers/auth.py` |
| 5 | Tạo JWT HS256, hạn 1.440 phút (24 giờ), chứa `sub = email` và `role` | `app/core/security.py` |
| 6 | Trả `{access_token, token_type, user:{id, employee_code, username, full_name, email, role, plot_id}}` | `app/routers/auth.py` |
| 7 | Frontend lưu token vào **localStorage** (`token`, `access_token`), **sessionStorage**, và **cookie** `token`/`access_token` (24 giờ), lưu `user`, rồi chuyển về `/` | `frontend/app/login/page.tsx` |
| 8 | Mọi API sau đó gửi header `Authorization: Bearer <token>` | `frontend/lib/api.ts` |
| 9 | Backend giải mã token, **hỏi lại bảng `users`**, kiểm tra còn active, rồi cập nhật lại `role`/`plot_id` từ CSDL | `app/core/deps.py` → `get_current_user` |
| 10 | Nếu vào `/users` hoặc `/accounts`, middleware Next.js kiểm tra cookie và gọi `/api/auth/me`; chỉ ADMIN/MANAGER được vào | `frontend/middleware.ts` |

**Bảng được đọc:** `users`. **Bảng được ghi:** không ghi gì khi đăng nhập.

**Vì sao bước 9 quan trọng:** nếu quản lý khóa tài khoản, token cũ vẫn bị từ chối ngay vì backend kiểm tra lại `is_active` trong CSDL, không tin token 100%.

**Ghi chú thẳng thắn:** nếu không đọc được role từ token, trang login có đoán vai trò theo chuỗi email (`admin`, `manager`, `technician`). Đây chỉ là suy đoán phía giao diện; quyền thật vẫn do backend quyết định.

### 4.2. Luồng tạo lô trồng

**Người dùng thấy:** vào `/batches`, bấm "Tạo lô trồng", chọn thửa đất, chọn giống, nhập số lượng giống, ngày gieo, ngày dự kiến thu hoạch, phương pháp trồng, tiêu chuẩn, ghi chú.

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Modal kiểm tra phía giao diện: đủ tên/lô/giống/số lượng/ngày; ngày thu hoạch phải sau ngày gieo; số lượng không vượt tồn kho giống | `frontend/components/batches/create-batch-modal.tsx` |
| 2 | Gửi `POST /api/batches` với JSON: `batch_name`, `plot_id`, `variety_id`, `quantity_used`, `sow_date`, `seeding_date`, `expected_harvest_date`, `planting_method`, `certification_standard`, `notes` | cùng file trên |
| 3 | Backend nhận vào khuôn `CropBatchCreate`: `strict=True`, `extra="forbid"`, kiểm tra ngày thu hoạch > ngày gieo | `app/schemas/crop_batch.py` |
| 4 | Kiểm tra quyền `crop_batches:create` (ADMIN/MANAGER/TECHNICIAN) | `app/routers/crop_batch.py` → `create_batch` |
| 5 | Mở transaction, khóa dòng giống bằng `with_for_update()`, kiểm tra tồn kho, trừ kho | `app/services/crop_batch_service.py` |
| 6 | Sinh mã lô nếu người dùng không nhập: `CB-<12 ký tự ngẫu nhiên>` | cùng file |
| 7 | Lưu lô với trạng thái mặc định "Đang trồng" | cùng file |
| 8 | Trả về JSON đã chuẩn hóa (thêm `plot_name`, `variety_name`, `status` tiếng Việt, ngày dạng `YYYY-MM-DD`) | `app/routers/crop_batch.py` → `normalize_batch` |
| 9 | Giao diện gọi lại danh sách lô và giống để cập nhật số liệu | `frontend/components/batches/create-batch-modal.tsx` |

**Bảng ghi:** `crop_batches` (thêm 1 dòng), `plant_varieties` (giảm `stock_quantity`).
**Bảng đọc:** `plots`, `plant_varieties`, `crop_batches`.

**Khi lỗi:**

- Thiếu trường / sai kiểu / gửi trường lạ → **422** (Pydantic chặn).
- Ngày thu hoạch không sau ngày gieo → **422**.
- Không đủ tồn kho giống → **400** kèm số còn lại.
- Sai quyền → **403**.

**Vì sao trừ kho ngay khi tạo lô:** số lượng giống đã dùng là thật, cần trừ để không tạo thêm lô vượt quá số hạt đang có. Khi xóa lô (và lô chưa bị hủy), service hoàn lại kho. Khi sửa số lượng, service hoàn số cũ rồi trừ số mới.

### 4.3. Luồng ghi nhật ký chăm sóc

**Người dùng thấy:** vào `/care-logs`, chọn lô, chọn hoạt động (Tưới nước / Bón phân / Phun thuốc / Bệnh hại / Thu hoạch / Khác), nhập ngày, mô tả, số lượng; nếu bón phân/phun thuốc thì chọn vật tư; có thể đính ảnh.

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Nếu có ảnh: gửi `POST /api/care-logs/upload` dạng `multipart/form-data` | `frontend/app/(dashboard)/care-logs/page.tsx` |
| 2 | Backend kiểm tra loại ảnh bằng **chữ ký byte đầu file** (JPEG `FF D8 FF`, PNG, WebP), không tin đuôi file; giới hạn **5 MB**; lưu file tên ngẫu nhiên vào `app/uploads/care-logs/`; trả `image_url` | `app/routers/care_log.py` → `upload_care_log_image` |
| 3 | Gửi `POST /api/care-logs` với `batch_id`, `log_date`, `action_type`, `notes`, `quantity`, `quality_percent`, `image_url`, `supply_usages` | `frontend/app/(dashboard)/care-logs/page.tsx` |
| 4 | Backend kiểm tra quyền `care_logs:create` (cả 4 vai trò) | `app/routers/care_log.py` |
| 5 | Tìm lô theo **ID số hoặc mã lô**; nếu là STAFF thì lô phải đúng `plot_id` được phân công, sai trả **403** | cùng file |
| 6 | Tạo dòng nhật ký, `flush()` để có `id` nhưng chưa commit | cùng file |
| 7 | Với từng vật tư: đọc dòng `supplies` kèm `with_for_update()` (SQLite bỏ qua khóa này), kiểm tra tồn, trừ kho, tạo dòng `supply_usage` gắn với nhật ký | `app/services/supply.py` → `deduct_supply_stock` |
| 8 | Nếu tồn sau khi trừ thấp hơn `min_threshold`: tạo thông báo "Cảnh báo tồn kho vật tư thấp" | `app/routers/care_log.py` |
| 9 | Đồng bộ trạng thái lô: nếu hoạt động là "Thu hoạch" → lô thành "Đã thu hoạch"; nếu lô đang "Kế hoạch" → thành "Đang trồng" | cùng file |
| 10 | Nếu hoạt động là "Bệnh hại"/"Phun thuốc"/"Kiểm tra sâu bệnh" hoặc ghi chú có từ khóa sâu bệnh → tạo thông báo `ai_warning`; nếu là "Tưới nước" → tạo thông báo `info` | cùng file |
| 11 | Commit toàn bộ; nếu có lỗi thì rollback (không lưu nửa chừng) | cùng file |
| 12 | Trả nhật ký đã chuẩn hóa; giao diện tải lại nhật ký, lô, vật tư | `frontend/app/(dashboard)/care-logs/page.tsx` |

**Bảng ghi:** `care_logs`, `supplies` (giảm tồn), `supply_usage`, `notifications`, `crop_batches` (đổi trạng thái).
**Bảng đọc:** `crop_batches`, `supplies`, `notifications` (khi hiển thị).

**Chi tiết đáng nhớ:** giao diện **gộp số liệu vào một trường `notes`** dạng nhiều dòng, ví dụ:

```text
Lô có hiện tượng vàng lá
Lượng nước tưới: 120 lít
```

Vì vậy khi AI đọc nhật ký, nó đọc `notes`; còn `quantity` vẫn được lưu riêng để vẽ biểu đồ.

### 4.4. Luồng thu hoạch (cần nói thật)

Có **hai cách** ghi thu hoạch trong mã nguồn, nhưng chỉ một cách đang hoạt động.

**Cách 1 (đang dùng thật trên giao diện): ghi nhật ký "Thu hoạch"**

- Người dùng chọn hoạt động "Thu hoạch", nhập sản lượng kg và tỷ lệ đạt chuẩn.
- Gửi `POST /api/care-logs` như mục 4.3.
- Backend lưu `care_logs.quantity`, `care_logs.quality_percent`, đổi trạng thái lô thành "Đã thu hoạch".
- Biểu đồ sản lượng `GET /api/dashboard/harvest-chart` đọc **cả** bảng `harvest_logs` **và** các nhật ký có `action_type` là "Thu hoạch"/"Thu hoach"/"Harvest" (`app/routers/dashboard.py`).

**Cách 2 (API có nhưng đang lỗi): `POST /api/harvests`**

- Router: `app/routers/harvest.py` → `create_harvest`.
- Service: `app/services/harvest.py` gọi `repo.create(db, data.batch_id, data.harvest_date, data.quantity_kg, data.quality_grade, data.harvested_by)`.
- Nhưng khuôn `HarvestCreate` chỉ có `batch_id`, `quantity`, `grade`, `notes`, `harvest_time`; repository chỉ nhận `(db, harvest)`.
- **Đã chạy thử trên CSDL tạm [Đã chạy thật]:** `POST /api/harvests` trả **500**, nội dung `'HarvestCreate' object has no attribute 'harvest_date'`, không có dòng nào được ghi vào `harvest_logs`.

**Hệ quả cần biết:**

1. Giao diện hiện **không có form thu hoạch riêng**; bảng `harvest_logs` đang có 12 dòng là dữ liệu mẫu được nạp sẵn.
2. 12/12 dòng mẫu có `qr_trace_code`, nhưng nếu tạo mới qua API (sau khi sửa lỗi) thì repository **chưa sinh mã QR**, dù chú thích trong router nói "tự động sinh".
3. Biểu đồ có thể **cộng trùng** nếu một lô vừa có dòng trong `harvest_logs` vừa có nhật ký "Thu hoạch", vì code cộng cả hai nguồn.

**Nếu bị hỏi "hệ thống ghi nhận thu hoạch ở đâu?":** trả lời đúng thực tế: "Hiện ghi qua nhật ký chăm sóc loại Thu hoạch; API thu hoạch riêng đã có khung nhưng đang lỗi lệch schema, chưa dùng trên giao diện."

### 4.5. Luồng truy xuất nguồn gốc

Có **hai giao diện** và **ba API** liên quan.

**A. Trang nội bộ `/traceability` (nhân viên đăng nhập)**

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Tải danh sách lô `GET /api/batches` và danh sách thu hoạch `GET /api/harvests` | `frontend/app/(dashboard)/traceability/page.tsx` |
| 2 | Chọn một lô → gọi `GET /api/batches/code/{mã_lô}/trace` | cùng file |
| 3 | Backend trả thông tin lô, giống, thửa đất, danh sách nhật ký theo thời gian, danh sách thu hoạch kèm mã QR | `app/routers/crop_batch.py` → `get_batch_trace_by_code` |
| 4 | Giao diện hiển thị timeline, nút tải QR (`QRCodeCanvas` 512px, thư viện tải động), nút in, liên kết công khai `/trace/{mã}` | `frontend/app/(dashboard)/traceability/page.tsx` |

**B. Trang công khai `/trace/[mã_lô]` (khách quét QR, không cần đăng nhập)**

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Gọi `GET /api/crop-batches/trace/{mã_lô}` | `frontend/app/trace/[batch_code]/page.tsx` |
| 2 | Backend trả `batch_info`, `plot_info`, `variety_info`, `care_history`, `harvest_history`, `safety_certifications` | `app/routers/crop_batch.py` → `get_batch_trace` |
| 3 | Trang hiển thị hành trình, cho in tem | cùng file frontend |

**C. API công khai thứ ba:** `GET /api/traceability/{mã_lô}` trong `app/routers/traceability.py`, dùng eager-load để tránh N+1. API này trả cấu trúc khác (`batch_code`, `variety_name`, `care_logs`...) và **không được trang công khai gọi**; nó tồn tại như một biến thể.

**D. API tra theo mã QR của lượt thu hoạch:** `GET /api/harvests/trace/{trace_code}` (`app/routers/harvest.py`) trả về một dòng `HarvestLog` khớp `qr_trace_code`, hoặc 404. API này **không được giao diện hiện tại gọi**.

**Bảng đọc:** `crop_batches`, `plant_varieties`, `plots`, `care_logs`, `harvest_logs`.

**Cảnh báo quan trọng khi bảo vệ:** trường `safety_certifications` đang được **viết cứng** là `["VietGAP", "Cảnh báo dư lượng"]` cho mọi lô (`app/routers/crop_batch.py`), và trang công khai hiển thị nguyên văn. Đây **không phải** dữ liệu chứng nhận thật. Nếu bị hỏi, phải nói rõ: "Đây là dữ liệu minh họa, chưa lấy từ bảng chứng nhận; cần bổ sung bảng và API thật trước khi dùng thực tế." Tương tự, dòng "Thời gian cách ly" đang ghi cứng "Chưa đủ dữ liệu ghi nhận".

### 4.6. Luồng từng chức năng AI

Tất cả chức năng AI đều dùng chung một "đường ống" trong `app/core/ai_client.py`:

```text
Service dựng prompt
  -> call_gemini_structured()
  -> Gemini trả JSON
  -> Pydantic model_validate() kiểm tra cấu trúc
  -> Service kiểm tra nghiệp vụ (ID/mã lô/ngày)
  -> Trả JSON cho frontend
```

#### 4.6.1. AI sinh lịch chăm sóc

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Người dùng chọn lô, bấm tạo lịch (tab "Lịch chăm sóc" hoặc nút trong trang nhật ký) | `GlobalAIChatbot.tsx`, `care-logs/page.tsx` |
| 2 | Gọi `POST /api/ai-schedule/batches/{batch_id}/schedule` | cả hai file trên |
| 3 | Router chỉ cho TECHNICIAN/MANAGER/ADMIN | `app/routers/ai_schedule.py` |
| 4 | Service lấy lô + giống; bắt buộc giống có `growth_days > 0` và lô có `sow_date` | `app/services/ai_schedule.py` |
| 5 | Gọi Gemini, kiểm tra kết quả, tự tính ngày thật | cùng file |
| 6 | Lưu prompt + kết quả vào `ai_suggestions` loại `schedule` | `app/repositories/ai_suggestion.py` |
| 7 | Trả `AiScheduleOut`; giao diện hiển thị bảng lịch, cho sao chép/tải CSV | `GlobalAIChatbot.tsx` |

**Bảng đọc:** `crop_batches`, `plant_varieties`. **Bảng ghi:** `ai_suggestions`.

#### 4.6.2. AI tóm tắt nhật ký

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Người dùng mở tab "Tóm tắt nhật ký", chọn lô | `GlobalAIChatbot.tsx` |
| 2 | Gọi `POST /api/ai-summary/summary` với `{lot_id, batch_id}` | cùng file |
| 3 | Router cho cả 4 vai trò; chọn định danh theo thứ tự `lot_id` → `crop_batch_id` → `batch_id` | `app/routers/ai_summary.py` |
| 4 | Service tìm lô theo 4 cách: ID số → mã lô → tên lô → mã thửa đất (lấy lô đang canh tác mới nhất) | `app/services/ai_summary.py` → `resolve_batch` |
| 5 | Lấy tối đa 100 nhật ký gần nhất, dựng prompt, gọi Gemini | cùng file |
| 6 | Kiểm chứng ID nhật ký AI trích dẫn; nếu sai/không trích dẫn → dùng câu trả lời dự phòng | cùng file |
| 7 | Lưu vào `ai_suggestions` loại `summary` (nếu lưu lỗi vẫn trả kết quả) | cùng file |
| 8 | Trả `AiSummaryOut` đầy đủ trường, không bao giờ gây lỗi 500 do thiếu trường | `app/schemas/ai_summary.py` |

**Bảng đọc:** `crop_batches`, `plant_varieties`, `care_logs`. **Bảng ghi:** `ai_suggestions`.

#### 4.6.3. AI cảnh báo lô cần kiểm tra

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Người dùng mở tab "Cảnh báo AI" | `GlobalAIChatbot.tsx` |
| 2 | Gọi `POST /api/ai-alert/alerts` | cùng file |
| 3 | Router chỉ cho TECHNICIAN/MANAGER/ADMIN | `app/routers/ai_alert.py` |
| 4 | Service lấy các lô đang trồng; nếu **không có lô nào** thì trả danh sách rỗng, **không gọi AI** | `app/services/ai_alert.py` |
| 5 | Với mỗi lô, tính 2 chỉ số: số ngày chưa có nhật ký mới, có cảnh báo sâu bệnh trong 14 ngày hay không | cùng file |
| 6 | Gọi Gemini, kiểm tra mã lô có thật và tối đa 5 lô | cùng file |
| 7 | Lưu `ai_suggestions` loại `alert` | `app/repositories/ai_suggestion.py` |
| 8 | Trả danh sách xếp hạng | `app/schemas/ai_alert.py` |

**Bảng đọc:** `crop_batches`, `care_logs`. **Bảng ghi:** `ai_suggestions`.

#### 4.6.4. AI hỏi đáp tự do

| Bước | Việc xảy ra | File |
|---|---|---|
| 1 | Người dùng nhập câu hỏi ở tab chat, hoặc bấm "Hỏi AI" ở một nhật ký | `GlobalAIChatbot.tsx`, `care-logs/page.tsx` |
| 2 | Gọi `POST /api/v1/ai-advisor/chat` với `{message, batch_id}` | cả hai file |
| 3 | Router cho cả 4 vai trò; nếu là STAFF thì bắt buộc có `plot_id` và `batch_id` phải thuộc lô của mình | `app/routers/ai_advisor.py` |
| 4 | Dựng "ngữ cảnh" từ CSDL: lô đang chọn + 10 nhật ký gần nhất, hoặc 10 lô đầu tiên nếu không chọn lô | cùng file → `build_system_context` |
| 5 | Gọi Gemini, nhận `reply` + `citations` | cùng file |
| 6 | Kiểm tra mọi mã lô/ID nhật ký AI trích dẫn có thật trong CSDL (và thuộc lô của STAFF) | cùng file |
| 7 | Trả `{reply, response, disclaimer}` | cùng file |

**Bảng đọc:** `crop_batches`, `care_logs`. **Bảng ghi:** không ghi (chat không được lưu vào `ai_suggestions`).

#### 4.6.5. Tóm tắt AI "kiểu cũ" trong trang nhật ký

- Endpoint: `POST /api/care-logs/{batch_id}/ai-summary` (`app/routers/care_log.py`).
- Có kiểm tra quyền, lấy toàn bộ nhật ký, gọi Gemini, kiểm tra mã lô/ID, nếu AI lỗi thì **dùng quy tắc đếm** (đếm số lần tưới, tìm từ khóa sâu bệnh) để trả câu tóm tắt.
- **Giao diện hiện tại không gọi endpoint này** (đã kiểm tra toàn bộ frontend); nó là API dự phòng/legacy. Cần nói rõ nếu bị hỏi để không nhận "có 2 chức năng tóm tắt" một cách sai.

---

## 5. Chức năng AI: dữ liệu, prompt, đầu ra, kiểm tra, xử lý lỗi

### 5.1. Lớp chung: `app/core/ai_client.py`

Mọi chức năng AI đều đi qua đây, nên các đặc điểm sau áp dụng chung:

**a) Câu cảnh báo cố định**

```text
Lưu ý: Thông tin do AI tạo ra chỉ mang tính chất tham khảo.
Vui lòng tham khảo ý kiến chuyên gia nông nghiệp trước khi ứng dụng thực tế.
```

Câu này do backend gắn vào kết quả, **không phụ thuộc AI có tự viết hay không**. Với tóm tắt, backend còn **ghi đè** trường `disclaimer` AI trả về bằng câu cố định.

**b) Chỉ dẫn chống bịa, nối vào mọi system prompt**

```text
Chỉ phân tích dữ liệu thực tế được cung cấp từ cơ sở dữ liệu SQLite trong ngữ cảnh.
Không suy đoán, không tạo dữ liệu, mã lô, ID hoặc lịch sử không có trong dữ liệu.
Nếu dữ liệu không đủ để trả lời, hãy ghi chính xác: "Chưa đủ dữ liệu ghi nhận".
```

**c) Ép JSON theo khuôn**

- Lấy `model_json_schema()` của Pydantic.
- Xóa các khóa Gemini không hỗ trợ: `additionalProperties`, `title`, `$schema`.
- Gửi kèm `response_mime_type="application/json"` và `response_schema`.
- Khi nhận về: ưu tiên `response.parsed`; nếu không có thì `json.loads(response.text)`; cuối cùng `model_validate()`.

**d) Cắt prompt quá dài**

- Giới hạn 24.000 ký tự. Nếu dài hơn, cắt và chèn câu: `[Hệ thống đã cắt bớt dữ liệu đầu vào vì vượt giới hạn kích thước.]`

**e) Bảng lỗi chung**

| Tình huống | Mã HTTP | Câu báo |
|---|---|---|
| Chưa cấu hình `GEMINI_API_KEY` | **503** | "Chưa cấu hình GEMINI_API_KEY - không thể gọi chức năng AI." |
| Gemini báo quá tải / hết hạn mức (429, rate limit, resource exhausted) | **429** | "Dịch vụ AI đang quá tải hoặc đã đạt giới hạn. Vui lòng thử lại sau." |
| Quá thời gian chờ | **504** | "Dịch vụ AI phản hồi quá lâu. Vui lòng thử lại." |
| Lỗi khác từ Gemini | **502** | "Dịch vụ AI tạm thời không khả dụng." |
| AI trả JSON hỏng | **502** | "AI trả về dữ liệu không đúng định dạng JSON." |
| JSON đúng cú pháp nhưng sai khuôn | **502** | "AI trả về dữ liệu không khớp định dạng hệ thống yêu cầu." |
| AI trả rỗng | **502** | "AI không trả về nội dung." / "AI không trả về dữ liệu JSON." |

> Đây là "phân loại lỗi" thay vì trả 500 chung chung. Khi bảo vệ, có thể nói: "Hệ thống phân biệt lỗi quá tải, hết giờ, lỗi dịch vụ và lỗi định dạng để người dùng biết nên thử lại hay báo kỹ thuật."

### 5.2. AI sinh lịch chăm sóc

**File:** `app/services/ai_schedule.py`, khuôn `app/schemas/ai_schedule.py`.

**Dữ liệu gửi cho AI:**

- Tên giống, nhóm giống.
- Thời gian sinh trưởng tối đa (`variety.growth_days`).
- Ngày gieo (`batch.sow_date`).
- Không gửi danh sách nhật ký, không gửi vật tư.

**System prompt (nguyên văn trong code):**

```text
Bạn là trợ lý nông nghiệp của trang trại rau sạch, chuyên lập lịch chăm sóc
tham khảo theo dữ liệu thật của lô trồng.
QUY TẮC BẮT BUỘC:
1) Chỉ trả về JSON đúng theo schema đã cung cấp.
2) Tất cả nội dung trong trường description phải viết bằng tiếng Việt có dấu,
đúng chính tả, đúng ngữ pháp, ngắn gọn và dễ hiểu. Không dùng tiếng Việt
không dấu, không viết tắt và không dùng thuật ngữ mơ hồ.
3) Mỗi description phải bắt đầu bằng động từ rõ ràng như 'Tưới', 'Bón',
'Kiểm tra' hoặc 'Theo dõi', đồng thời nêu việc cần làm cụ thể.
4) day_offset là số ngày kể từ ngày gieo, phải nằm trong khoảng từ 0 đến
số ngày sinh trưởng tối đa được cung cấp. Không tự tính hoặc trả về trường date.
5) Lịch phải có ít nhất một lần tưới nước, hai lần bón phân và hai lần kiểm
tra sâu bệnh. Chỉ dựa trên dữ liệu được cung cấp, không tự bịa thông tin.
6) Đây là lịch tham khảo, không thay thế đánh giá của chuyên gia nông nghiệp.
```

**User prompt (dựng theo đúng mẫu trong code, dữ liệu minh họa):**

```text
Giống cây: Cà chua (nhóm: Rau ăn quả)
Thời gian sinh trưởng tối đa: 90 ngày (day_offset phải từ 0 đến 90)
Ngày gieo: 2026-09-17

Hãy đề xuất lịch chăm sóc tham khảo gồm tưới nước định kỳ, ít nhất hai
lần bón phân và ít nhất hai lần kiểm tra sâu bệnh. Mỗi mô tả phải viết
bằng tiếng Việt có dấu, đúng chính tả, đúng ngữ pháp và hướng dẫn rõ
người làm vườn cần thực hiện việc gì.
```

**AI bắt buộc trả JSON dạng:**

```json
{
  "schedule": [
    {"day_offset": 1, "task_type": "tuoi", "description": "Tưới 2 lít nước cho mỗi cây vào sáng sớm."},
    {"day_offset": 7, "task_type": "bon_phan", "description": "Bón phân hữu cơ..."}
  ],
  "disclaimer": "..."
}
```

Trong đó `task_type` chỉ được là một trong ba giá trị: `tuoi`, `bon_phan`, `kiem_tra_sau_benh`. `description` dài 10–300 ký tự.

**Backend kiểm tra gì:**

| Kiểm tra | Nếu sai |
|---|---|
| Lô tồn tại | **404** "Không tìm thấy lô trồng" |
| Giống của lô tồn tại | **400** "Không tìm thấy giống cây của lô này" |
| `growth_days > 0` | **400** "Giống cây chưa có thời gian sinh trưởng hợp lệ." |
| Có `sow_date` | **400** "Lô trồng chưa có ngày gieo hợp lệ." |
| Mọi `day_offset <= growth_days` | **502** "AI đề xuất mốc chăm sóc vượt quá thời gian sinh trưởng thật..." |
| Có ít nhất 1 tưới, 2 bón phân, 2 kiểm tra sâu bệnh | **502** "AI trả về lịch không đủ tối thiểu..." |
| `task_type` đúng 3 giá trị, `description` 10–300 ký tự | **502** do Pydantic/schema |

**Điểm rất đáng nói khi bảo vệ:** AI **không được phép tính ngày**. AI chỉ trả `day_offset` (số ngày kể từ khi gieo). Backend tự tính:

```python
date = seeding_date + timedelta(days=item.day_offset)
```

Ngày thu hoạch dự kiến lấy từ **CSDL** (`batch.expected_harvest_date`), không lấy từ AI. Nhờ vậy, kể cả AI tính sai lịch, ngày hiển thị vẫn đúng.

**Khi AI lỗi:**

- Lỗi mạng/hết hạn mức/JSON hỏng → trả 429/504/502/503 như bảng chung.
- AI trả lịch vượt quá số ngày sinh trưởng → chặn, trả 502, **không** hiển thị kết quả sai.
- Lưu `ai_suggestions` lỗi → lỗi lan ra ngoài (không có fallback riêng cho lịch).

**Hạn chế trong code (nên biết):** có một đoạn kiểm tra "mô tả phải có dấu tiếng Việt", nhưng do thụt lề, nó nằm **sau** lệnh `raise` nên **không bao giờ chạy**. Nói cách khác, hiện chỉ kiểm tra được độ dài mô tả (10–300 ký tự), chưa kiểm tra được dấu tiếng Việt.

### 5.3. AI tóm tắt nhật ký

**File:** `app/services/ai_summary.py`, khuôn `app/schemas/ai_summary.py`.

**Dữ liệu gửi cho AI:**

- Mã lô, tên giống, ngày gieo.
- Tối đa **100 nhật ký gần nhất** (nếu nhiều hơn, cắt bớt).
- Mỗi nhật ký một dòng, có **ID thật** để AI trích dẫn:

```text
- [ID 12] [2026-10-20] Tưới nước: Lượng nước tưới: 120 lít
- [ID 13] [2026-10-21] Kiểm tra sâu bệnh: Phát hiện vàng lá, cần theo dõi
```

**System prompt (nguyên văn, lưu ý code viết không dấu):**

```text
Ban la tro ly quan ly trang trai. QUY TAC BAT BUOC:
1) CHI duoc su dung thong tin co trong du lieu nhat ky duoc cung cap o
phan USER. TUYET DOI khong duoc suy dien, gia dinh, hay bo sung bat ky
chi tiet nao khong co trong du lieu (vi du: khong tu bia ngay thang,
khong tu bia loai sau benh neu nhat ky khong ghi ro).
2) Voi MOI nhat ky ban su dung de dua ra tom tat hoac phat hien van de,
BAT BUOC phai dua ID cua nhat ky do vao truong referenced_log_ids.
Neu ban khong the tim thay ID cho 1 nhan dinh nao do, KHONG duoc dua
nhan dinh do vao ket qua.
3) Day la tom tat tham khao, khong thay the danh gia cua chuyen gia
nong nghiep.
```

**User prompt (dựng theo đúng mẫu trong code, dữ liệu minh họa):**

```text
Lô trồng: CB-1789654127 - giống Cà chua, gieo ngày 2026-09-17.
Nhat ky cham soc (12 ban ghi, sap xep theo thoi gian, moi dong co ID rieng
o dau - hay dung dung ID nay khi trich dan):
- [ID 41] [2026-10-01] Tưới nước: ...
- [ID 42] [2026-10-03] Bón phân: ...

Hay tom tat tinh trang hien tai cua lo trong 3-4 cau, neu ro neu co dau hieu
bat thuong (sau benh, thieu cham soc keo dai). Hay de xuat cac buoc tiep theo
chi dua tren du lieu da ghi. Dien ro recommendations va referenced_log_ids.
```

**AI trả JSON:**

```json
{
  "summary": "Lô đang sinh trưởng...",
  "issues_detected": ["..."],
  "referenced_log_ids": [41, 42],
  "disclaimer": "...",
  "recommendations": ["..."]
}
```

**Backend kiểm tra gì:**

1. `referenced_log_ids` phải là **tập con** của ID nhật ký thật đã gửi. Nếu AI bịa ID → lỗi.
2. Danh sách trích dẫn **không được rỗng**. Nếu AI không trích dẫn gì → lỗi.
3. Nếu lô chưa có nhật ký → **không gọi AI**, trả ngay câu "Lô đất hiện chưa ghi nhận nhật ký chăm sóc nào."
4. Nếu không tìm thấy lô → trả câu "Không tìm thấy lô trồng tương ứng để phân tích.", kèm gợi ý chọn lại.
5. **Chưa kiểm tra phạm vi lô:** router `ai_summary.py` chỉ kiểm tra vai trò (cả 4 vai trò), không nhận `current_user`, nên STAFF vẫn có thể gọi tóm tắt cho lô khác nếu biết ID. Giao diện có lọc dropdown nhưng backend chưa chặn. Đây là lỗ hổng đã ghi ở mục 6.3.

**Khi AI lỗi:** đây là chức năng duy nhất có **fallback mềm**:

- Mọi lỗi (Gemini lỗi, AI bịa ID, JSON hỏng, CSDL lỗi bất ngờ) đều được bắt.
- Trả HTTP **200** với nội dung:

```text
Đã ghi nhận các hoạt động chăm sóc gần đây trên lô đất.
issues_detected: ["Dịch vụ AI tạm thời gián đoạn"]
recommendations: ["Vui lòng kiểm tra lại nhật ký chăm sóc thủ công trong danh sách."]
```

- Nhờ vậy, tab tóm tắt không bị trắng/500 khi Gemini hết hạn mức, nhưng người dùng **biết** AI đang gián đoạn.

Đây chính là cách xử lý lỗi đã dùng để sửa lỗi "Không thể tải phân tích AI" trước đây: API luôn trả đủ trường, không để lỗi validate response làm hỏng giao diện.

### 5.4. AI cảnh báo lô cần kiểm tra

**File:** `app/services/ai_alert.py`, khuôn `app/schemas/ai_alert.py`.

**Dữ liệu gửi cho AI:**

- Danh sách lô đang trồng (trạng thái khớp một trong bốn giá trị: `growing`, `planting`, `đang trồng`, `đang canh tác`, không phân biệt hoa/thường).
- Với mỗi lô chỉ gửi **2 chỉ số đã tính sẵn**:
  - `days_since_last_log`: bao nhiêu ngày chưa có nhật ký mới (hoặc "chưa có nhật ký nào").
  - `has_recent_pest`: có từ khóa sâu bệnh trong 14 ngày hay không.

**System prompt (nguyên văn, không dấu):**

```text
Ban la tro ly phan tich uu tien cong viec trang trai. QUY TAC BAT BUOC:
1) CHI duoc chon batch_code TRONG danh sach duoc cung cap o phan USER.
TUYET DOI khong duoc bia them batch_code khong co trong danh sach.
2) Chi dua tren 2 chi so da duoc tinh san cho moi lo (so ngay chua co
nhat ky, co canh bao sau benh gan day hay khong) - khong tu suy dien
them thong tin khac.
3) Xep hang toi da 5 lo uu tien nhat, priority_score tu 1 (khan cap
nhat) den 5 (it khan cap nhat trong danh sach duoc chon).
4) Day chi la goi y tham khao dua tren du lieu he thong, khong phai
chan doan chuyen mon ve sau benh hay cay trong.
```

**User prompt (mẫu):**

```text
Danh sach 6 lo dang trong (status=growing):
- batch_code=CB-1789654127: 12 ngay chua co nhat ky moi, CO canh bao sau benh gan day
- batch_code=CB-1789654602: chua co nhat ky nao, khong co canh bao sau benh

Hay xep hang toi da 5 lo can kiem tra uu tien nhat, kem ly do ngan gon
dua tren 2 chi so da cho.
```

**AI trả JSON:**

```json
{
  "priority_batches": [
    {"batch_code": "CB-1789654127", "priority_score": 1, "reason": "12 ngày chưa chăm sóc và có cảnh báo sâu bệnh gần đây."}
  ],
  "disclaimer": "..."
}
```

**Backend kiểm tra gì:**

- Mọi `batch_code` AI trả phải nằm trong danh sách lô đang trồng thật; nếu không → **502**.
- Tối đa 5 lô; nếu nhiều hơn → **502**.
- Nếu **không có lô đang trồng** → trả kết quả rỗng, **không gọi AI** (tiết kiệm chi phí, tránh AI bịa).

**Khi AI lỗi:** trả 429/504/502/503; không có fallback. Giao diện hiện thông báo lỗi và cho thử lại.

**Điểm mạnh:** chỉ số do backend tính từ CSDL, AI chỉ **xếp hạng**. AI không được tự nghĩ thêm "lô này thiếu nước" nếu dữ liệu không nói vậy.

### 5.5. AI hỏi đáp tự do

**File:** `app/routers/ai_advisor.py`.

**Dữ liệu gửi cho AI:**

- Câu hỏi của người dùng.
- "Ngữ cảnh" do backend dựng:
  - Nếu chọn lô: ID, mã lô, tên lô, ngày gieo + **10 nhật ký gần nhất** (ID, ngày, hoạt động, ghi chú).
  - Nếu không chọn lô: **10 lô đầu tiên** trong hệ thống (tên, ID, mã lô, trạng thái).
- Với STAFF: chỉ dữ liệu thuộc `plot_id` được phân công.

**System prompt (nguyên văn):**

```text
Bạn là chuyên gia cố vấn nông nghiệp thông minh của trang trại GreenFarm.
Chỉ sử dụng dữ liệu thực tế SQLite dưới đây. Không suy đoán hoặc tự tạo mã lô/ID.
Nếu dữ liệu không đủ, hãy trả lời chính xác 'Chưa đủ dữ liệu ghi nhận'.
Không ghi mã lô hoặc ID nhật ký trong nội dung reply; chỉ đưa mã lô và ID đã thấy
vào mảng citations.
Trả về JSON có reply và citations; citations gồm batch_codes và care_log_ids.

<ngữ cảnh CSDL được ghép vào đây>
```

**AI trả JSON:**

```json
{
  "reply": "Lô của bạn đã được tưới...",
  "citations": {"batch_codes": ["CB-1789654127"], "care_log_ids": [41, 42]}
}
```

**Backend kiểm tra gì:**

- Mọi `batch_code` trong citations phải tồn tại; với STAFF phải thuộc lô được phân công.
- Mọi `care_log_ids` phải tồn tại; với STAFF phải thuộc lô được phân công.
- Nếu câu hỏi rỗng → trả ngay "Vui lòng nhập câu hỏi.", không gọi AI.
- STAFF chưa được gán `plot_id` → **403** "Tài khoản chưa được phân công lô đất."
- STAFF hỏi lô không phải của mình → **403**.

**Khi AI lỗi:** trả lỗi 429/504/502/503; nếu AI trích dẫn sai → **502** "AI đã tham chiếu mã lô/nhật ký không tồn tại trong cơ sở dữ liệu." Không có fallback.

**Hạn chế:** không có bộ nhớ hội thoại. Mỗi câu hỏi là một lần gọi độc lập; AI không nhớ câu trước. Không lưu lịch sử chat vào CSDL.

### 5.6. Tóm tắt AI kiểu cũ trong trang nhật ký

**File:** `app/routers/care_log.py` → `generate_ai_care_summary`.

- Input: toàn bộ nhật ký của lô, mỗi dòng có `care_log_id`.
- Output khuôn: `{summary, recommendation, batch_codes, care_log_ids}`.
- Kiểm tra: mã lô phải đúng lô đang xét; ID nhật ký phải có thật.
- Nếu AI lỗi: **fallback bằng quy tắc**:
  - Đếm số lượt chăm sóc, số lần tưới.
  - Nếu ghi chú có "sâu/bệnh/vàng lá/rệp/nấm" → cảnh báo sâu bệnh và khuyến nghị kiểm tra mặt dưới lá.
  - Nếu không → "Tình trạng sinh trưởng bình thường..." và khuyến nghị duy trì lịch tưới.
- Không lưu vào `ai_suggestions`.
- **Không được giao diện hiện tại gọi.**

### 5.7. Bảng tổng hợp: AI lỗi thì chuyện gì xảy ra?

| Chức năng | AI lỗi mạng/hết hạn mức | AI trả sai nghiệp vụ | Không có dữ liệu | Người dùng thấy gì |
|---|---|---|---|---|
| Lịch chăm sóc | 429/504/502/503 | 502 (vượt ngày, thiếu mục) | 400 nếu thiếu ngày gieo/sinh trưởng | Báo lỗi, không hiện lịch sai |
| Tóm tắt nhật ký | **200 + câu fallback** | 200 + fallback | 200 + "chưa có nhật ký" | Vẫn thấy nội dung, biết AI gián đoạn |
| Cảnh báo AI | 429/504/502/503 | 502 (mã lô bịa, >5 lô) | 200 + danh sách rỗng, không gọi AI | Báo lỗi hoặc "không có lô" |
| Hỏi đáp | 429/504/502/503 | 502 (citation bịa) | Prompt yêu cầu trả "Chưa đủ dữ liệu ghi nhận" (backend không kiểm tra lại câu này) | Báo lỗi/không đủ dữ liệu |
| Tóm tắt kiểu cũ | Fallback quy tắc, 200 | Chặn 502 rồi fallback | 200 + "Chưa đủ dữ liệu ghi nhận" | Luôn có câu trả lời |

### 5.8. Những điều cần nói thật về phần AI

1. **Không có RAG.** AI không tra cứu tài liệu nông nghiệp; chỉ đọc dữ liệu trong prompt. Vì vậy câu trả lời phụ thuộc hoàn toàn vào nhật ký và thông tin lô.
2. **Không có so sánh phiên bản prompt.** Trong repo không có file/thư mục ghi kết quả thử prompt v1, v2. Nếu đề bài yêu cầu, cần bổ sung.
3. **Không có đánh giá tự động chất lượng AI.** Không có bộ test chấm điểm câu trả lời; test `test_ai_service.py` chỉ mock AI và kiểm tra API trả đủ trường + disclaimer.
4. **Không có thống kê chi phí/token.** Không lưu số token, không log thời gian gọi Gemini.
5. **Prompt tóm tắt và cảnh báo viết không dấu.** Đây là lỗi chất lượng prompt (không phải lỗi chức năng), nên sửa để đồng bộ với prompt lịch.
6. **Kiểm tra dấu tiếng Việt trong lịch không chạy** do thụt lề (đã nêu ở 5.2).
7. **Model viết cứng**, biến `GEMINI_MODEL` không có tác dụng.
8. **Chat không lưu lịch sử**, nên không thể xem lại hội thoại sau khi đóng cửa sổ.

---

## 6. Những điểm hệ thống làm tốt hơn cách làm thông thường

Phần này dùng để trả lời câu hỏi "đồ án của em có gì hơn một bài CRUD?".

### 6.1. Mười hai điểm mạnh có bằng chứng trong code

| # | Điểm mạnh | Bằng chứng cụ thể | Vì sao đáng khen |
|---|---|---|---|
| 1 | **Phân quyền tập trung, kiểm tra ở backend** | `app/core/permissions.py` có `PERMISSIONS_MATRIX` cho 36 quyền; các router nghiệp vụ dùng `require_permission` hoặc `require_roles`. Ngoại lệ: `GET /api/notifications` và `GET /search` chưa gắn xác thực (xem 6.3) | Không thể lách bằng cách gọi API trực tiếp; dễ sửa quyền ở một chỗ |
| 2 | **Nhân viên bị giới hạn theo lô đất** | `get_current_user` trả `plot_id`; router lô/lô trồng/nhật ký và AI chat lọc theo `plot_id` cho STAFF. Riêng AI tóm tắt chưa lọc (xem 6.3) | Đúng nghiệp vụ trang trại: người làm vườn chỉ thấy việc của mình; phần còn thiếu đã ghi rõ |
| 3 | **Token được kiểm tra lại với CSDL** | `get_current_user` giải mã JWT rồi query lại `users`, chặn nếu `is_active = false` | Khóa tài khoản có hiệu lực ngay, không chờ token hết hạn |
| 4 | **AI bị "trói" bằng schema và kiểm chứng** | `response_schema` Pydantic; kiểm tra ID nhật ký, mã lô, số ngày, số mục tối thiểu | Không tin AI nói suông; AI bịa là bị chặn |
| 5 | **Ngày do backend tính, không do AI** | `date = seeding_date + timedelta(days=day_offset)`; `expected_harvest_date` lấy từ CSDL | Loại bỏ hoàn toàn rủi ro AI tính sai lịch |
| 6 | **Disclaimer cố định, không phụ thuộc AI** | `DISCLAIMER_TEXT` trong `ai_client.py`; service ghi đè disclaimer AI | Đáp ứng yêu cầu đề bài "AI chỉ tham khảo" một cách chắc chắn |
| 7 | **Fallback cho tóm tắt AI** | `_fallback_summary` trả 200 + câu an toàn khi mọi lỗi | Giao diện không chết khi Gemini hết hạn mức |
| 8 | **Giao dịch kho có khóa dòng** | `with_for_update()` khi trừ giống/vật tư; mọi thay đổi nằm trong một transaction, lỗi thì rollback. Lưu ý: SQLite **bỏ qua** `FOR UPDATE`, nên trên SQLite câu lệnh này không khóa thật; an toàn hiện tại đến từ việc SQLite chỉ cho một tiến trình ghi tại một thời điểm | Code đã sẵn sàng cho PostgreSQL/MySQL nơi khóa dòng có tác dụng thật; trên SQLite vẫn tránh được âm kho nhờ transaction |
| 9 | **Kiểm tra ảnh bằng chữ ký byte** | `IMAGE_SIGNATURES` + giới hạn 5 MB + tên file UUID | Chặn file giả đuôi ảnh; không cho ghi đè file |
| 10 | **Truy vết AI để kiểm toán** | Mỗi lần lịch/tóm tắt/cảnh báo lưu `input_data` (prompt) và `output_text` vào `ai_suggestions` | Giảng viên có thể hỏi "AI nhận gì, trả gì?" và có bằng chứng trong CSDL (36 bản ghi hiện có) |
| 11 | **Tối ưu hiệu năng có số đo** | 20 index khai báo thêm trong `LEGACY_INDEXES`, tổng 37 index `ix_`; eager-load `selectinload`/`joinedload`; SQLite WAL | Các API đọc chính chạy trung vị **8,7–14,8 ms** trên máy kiểm tra |
| 12 | **Test và kiểm tra kiểu** | 18 bài pytest pass; `npx tsc --noEmit` exit 0 | Có bằng chứng không vỡ chức năng khi sửa |

### 6.2. Số đo thực tế

**Test backend [Đã chạy thật]:** `18 passed, 77 warnings` (4,57 giây lần đầu; chạy lại cuối buổi 4,80 giây).

**Kiểm tra kiểu frontend [Đã chạy thật]:** `npx tsc --noEmit` → exit 0.

**Hiệu năng API đọc (TestClient, sau khi làm nóng, trung vị 5 lần) [Đã chạy thật]:**

| API | Trung vị | Số câu SQL |
|---|---|---|
| `GET /api/plots` | 9,1 ms | 2 |
| `GET /api/batches` | 14,8 ms | 4 |
| `GET /api/varieties` | 8,7 ms | 2 |
| `GET /api/care-logs` | 13,3 ms | 2 |
| `GET /api/supplies` | 8,7 ms | 2 |
| `GET /api/supplies/alerts` | 12,3 ms | 3 |
| `GET /api/harvests` | 10,2 ms | 2 |
| `GET /api/dashboard/harvest-chart?view=month` | 10,8 ms | 3 |
| `GET /api/batches/code/.../trace` | 11,3 ms | 3 |
| `GET /api/crop-batches/trace/...` | 10,2 ms | 3 |

**Cách đo và giới hạn:** dùng `fastapi.testclient.TestClient` chạy trong cùng tiến trình Python, CSDL thật `farm.db`, token ADMIN tự sinh. Đây **không phải** đo qua mạng/thực tế trình duyệt; lần gọi đầu tiên có thể chậm hơn (ví dụ 100+ ms) do khởi tạo model. Khi báo cáo, nên nói "đo trong tiến trình, sau khi làm nóng" để trung thực.

**Dữ liệu thật trong `farm.db` [Đã chạy thật]:**

| Bảng | Số dòng |
|---|---|
| `users` | 9 (ADMIN 2, MANAGER 3, STAFF 2, TECHNICIAN 2) |
| `plots` | 7 |
| `plant_varieties` | 10 |
| `crop_batches` | 19 |
| `care_logs` | 63 |
| `harvest_logs` | 12 (12/12 có `qr_trace_code`) |
| `supplies` | 6 |
| `supply_imports` | 14 |
| `supply_usage` | 24 |
| `ai_suggestions` | 36 |
| `notifications` | 2 |
| `sales` | 12 (chưa có API/UI dùng) |

Tổng cộng **13 bảng** (12 bảng nghiệp vụ + `alembic_version`), **37 index** có tiền tố `ix_`.

### 6.3. Những điểm chưa tốt, phải nói thật

Nếu giảng viên hỏi "hệ thống còn yếu ở đâu?", đây là danh sách đã kiểm chứng. Nói thẳng sẽ được điểm cao hơn là che giấu.

| Vấn đề | Bằng chứng | Mức độ | Hướng sửa |
|---|---|---|---|
| `POST /api/harvests` lỗi 500 | Chạy thử: `'HarvestCreate' object has no attribute 'harvest_date'` | **Cao** (chức năng thu hoạch chưa hoàn chỉnh) | Đồng bộ schema/service/repository; sinh `qr_trace_code` |
| Chưa có AI gợi ý thời điểm thu hoạch | Không có endpoint/service nào | **Cao** so với đề bài | Thêm service dùng `growth_days`, nhật ký, thời tiết (nếu có) |
| Chứng nhận trong truy xuất bị viết cứng | `["VietGAP", "Cảnh báo dư lượng"]` trong router | **Cao** (sai sự thật nếu demo) | Tạo bảng chứng nhận, API thật; hoặc ghi "Chưa có dữ liệu" |
| Bán sản phẩm chưa có API/UI | `sale.py` không được include; không có trang | Trung bình (đề bài có nhắc) | Gắn router + trang bán hàng |
| Không đánh dấu đã đọc thông báo | Frontend gọi `PUT /api/notifications/read-all`; backend không có route | Thấp | Thêm endpoint |
| Hai API đọc thiếu xác thực | `GET /api/notifications` và `GET /search` không có `get_current_user` | Trung bình (lộ dữ liệu nếu deploy) | Gắn xác thực + lọc theo vai trò |
| Tóm tắt AI chưa lọc theo lô cho STAFF | `app/routers/ai_summary.py` không nhận `current_user`; service không lọc `plot_id` | Trung bình (STAFF tóm tắt được lô khác nếu biết ID) | Truyền user vào service và lọc như AI chat |
| `requirements.txt` rỗng | File 0 byte | Trung bình (không tái lập được) | `pip freeze > requirements.txt` |
| `SECRET_KEY` mặc định | `app/core/security.py` | **Cao** nếu deploy | Đổi trong `.env`, không commit |
| CORS mở `*` | `app/main.py` | Trung bình | Giới hạn domain frontend |
| Prompt tóm tắt/cảnh báo không dấu | `ai_summary.py`, `ai_alert.py` | Thấp (chất lượng) | Viết lại có dấu |
| Kiểm tra dấu tiếng Việt không chạy | Thụt lề sau `raise` trong `ai_schedule.py` | Thấp | Sửa vị trí |
| `GEMINI_MODEL` bị bỏ qua | `ai_client.py` hardcode | Thấp | Đọc từ `settings` |
| Chat không có bộ nhớ/lưu lịch sử | `ai_advisor.py` không ghi CSDL | Thấp | Thêm bảng `chat_messages` |
| Biểu đồ có thể cộng trùng | Đọc cả `harvest_logs` và nhật ký "Thu hoạch" | Trung bình | Chọn một nguồn hoặc chống trùng |
| Tìm kiếm rất hẹp | `/search` chỉ tìm trong `HarvestLog.notes` | Thấp | Tìm cả lô, nhật ký, vật tư |
| Code cũ không dùng | `gemini_advisor.py`, `traceability.py`, `ai-alert-card.tsx` | Thấp | Xóa hoặc đánh dấu deprecated |
| Không có migration là nguồn chính | App dùng `ensure_legacy_schema()` | Thấp | Chuyển hẳn sang Alembic |

---

## 7. Từ điển thuật ngữ

### 7.1. Web và API

| Thuật ngữ | Nghĩa đơn giản | Trong dự án này |
|---|---|---|
| **API** | "Quầy giao dịch" giữa frontend và backend. Frontend gửi yêu cầu, backend trả dữ liệu | Ví dụ `POST /api/care-logs` |
| **Endpoint** | Một địa chỉ API cụ thể (đường dẫn + phương thức) | `GET /api/batches`, `POST /api/auth/login` |
| **REST** | Cách đặt tên API theo tài nguyên: GET đọc, POST tạo, PUT sửa, DELETE xóa | Các router trong `app/routers/` |
| **JSON** | Định dạng dữ liệu dạng `{ "khóa": "giá trị" }` | Mọi API trả JSON |
| **HTTP status** | Mã số cho biết kết quả | 200 OK, 201 tạo mới, 400 sai dữ liệu, 401 chưa đăng nhập, 403 không có quyền, 404 không thấy, 422 sai khuôn, 429 quá tải, 500 lỗi server, 502 AI lỗi, 503 chưa cấu hình, 504 hết giờ |
| **Payload** | Phần dữ liệu gửi kèm request | Body JSON khi tạo lô/nhật ký |
| **CORS** | Cơ chế cho phép trình duyệt ở địa chỉ này gọi API ở địa chỉ khác | `allow_origins=["*"]` trong `main.py` |
| **Middleware** | Lớp chạy trước khi request vào trang/API | `frontend/middleware.ts` chặn `/users` |
| **Cookie** | Mẩu dữ liệu nhỏ trình duyệt lưu và tự gửi kèm request | Lưu token để middleware đọc |
| **localStorage / sessionStorage** | Bộ nhớ trong trình duyệt | Lưu token và thông tin user |
| **Bearer token** | Cách gửi token: `Authorization: Bearer <chuỗi>` | `lib/api.ts` tự gắn |
| **Dynamic import** | Chỉ tải thư viện khi thật sự cần | ExcelJS, QRCode được tải khi bấm xuất/tải QR |
| **SWR** | Thư viện cache dữ liệu API phía client | `useSWR('/api/batches', fetcher)` |
| **SSR / CSR** | Render ở server / render ở trình duyệt | Trang dùng `'use client'` là CSR |
| **Component** | Khối giao diện tái sử dụng | `GlobalAIChatbot`, `Sidebar` |
| **TypeScript** | JavaScript có kiểu dữ liệu | `lib/types.ts` |

### 7.2. Đăng nhập và bảo mật

| Thuật ngữ | Nghĩa đơn giản | Trong dự án này |
|---|---|---|
| **JWT** | "Thẻ ra vào" có chữ ký số, chứa thông tin người dùng | Tạo trong `app/core/security.py` |
| **HS256** | Thuật toán ký JWT bằng một khóa bí mật chung | `ALGORITHM = "HS256"` |
| **`sub`** | Trường chuẩn trong JWT chỉ "chủ thể" | Đang lưu email |
| **Hash mật khẩu** | Biến mật khẩu thành chuỗi không thể dịch ngược | PBKDF2-SHA256 |
| **PBKDF2 / bcrypt** | Hai thuật toán băm mật khẩu phổ biến | PBKDF2 để tạo; bcrypt để xác thực hash cũ |
| **Role** | Vai trò người dùng | ADMIN, MANAGER, TECHNICIAN, STAFF |
| **Permission matrix** | Bảng ai được làm gì | `PERMISSIONS_MATRIX` |
| **Phân quyền theo phạm vi (scoping)** | Giới hạn dữ liệu theo lô được giao | STAFF chỉ thấy `plot_id` của mình |
| **Magic bytes** | Các byte đầu file dùng để nhận đúng loại file | Chặn ảnh giả đuôi |
| **UUID** | Chuỗi định danh gần như không trùng | Tên file ảnh |
| **Rate limit (429)** | Giới hạn số lần gọi dịch vụ | Gemini hết hạn mức |

### 7.3. Cơ sở dữ liệu

| Thuật ngữ | Nghĩa đơn giản | Trong dự án này |
|---|---|---|
| **CSDL / Database** | Nơi lưu dữ liệu có cấu trúc | SQLite `farm.db` |
| **Bảng (table)** | Một "trang tính" dữ liệu | `crop_batches`, `care_logs`... |
| **Khóa chính (primary key)** | Cột định danh duy nhất mỗi dòng | `id` |
| **Khóa ngoại (foreign key)** | Cột trỏ sang bảng khác | `care_logs.crop_batch_id` → `crop_batches.id` |
| **ORM** | Viết class Python thay cho câu SQL | SQLAlchemy |
| **Model** | Class mô tả bảng | `app/models/*.py` |
| **Schema (Pydantic)** | Khuôn kiểm tra dữ liệu vào/ra | `app/schemas/*.py` |
| **`strict=True`** | Không tự đổi kiểu (chuỗi `"1"` không thành số `1`) | Các schema chính |
| **`extra="forbid"`** | Gửi trường lạ là báo lỗi | Chặn dữ liệu rác |
| **Migration** | Kịch bản thay đổi cấu trúc bảng theo phiên bản | 7 file trong `alembic/versions/` |
| **Alembic** | Công cụ migration của SQLAlchemy | Có, nhưng app còn tự `ensure_legacy_schema()` |
| **Seed** | Nạp dữ liệu mẫu | `seed.py`, `seed_db.py` |
| **Transaction** | Nhóm thao tác "được hết hoặc không được gì" | Tạo nhật ký + trừ kho + thông báo |
| **Rollback** | Hủy transaction khi lỗi | Bắt lỗi trong `create_care_log` |
| **Row lock** | Khóa dòng đang đọc để người khác không sửa cùng lúc | `with_for_update()` |
| **Index** | "Mục lục" giúp tìm nhanh | 37 index `ix_` |
| **N+1 query** | Lỗi hiệu năng: 1 truy vấn danh sách + N truy vấn con | Đã sửa bằng `selectinload`/`joinedload` |
| **WAL** | Chế độ SQLite cho phép đọc/ghi song song tốt hơn | PRAGMA trong `database.py` |
| **Eager loading** | Lấy dữ liệu liên quan ngay trong 1–2 truy vấn | `selectinload(CropBatch.variety)` |

### 7.4. Trí tuệ nhân tạo

| Thuật ngữ | Nghĩa đơn giản | Trong dự án này |
|---|---|---|
| **LLM** | Mô hình ngôn ngữ lớn (như Gemini) | Gemini 2.5 Flash |
| **Prompt** | Câu lệnh hướng dẫn AI | `system_prompt` + `user_prompt` |
| **System prompt** | "Luật chơi" cố định cho AI | Quy tắc chỉ dùng dữ liệu thật |
| **Temperature** | Độ "sáng tạo" của AI | 0.3 (ổn định) |
| **Structured output** | Ép AI trả JSON đúng khuôn | `response_schema` |
| **Schema validation** | Kiểm tra JSON AI trả có đúng khuôn | `model_validate()` |
| **Hallucination (ảo giác)** | AI bịa thông tin không có thật | Chống bằng prompt + kiểm tra ID/mã lô |
| **Grounding / citation** | Bắt AI chỉ rõ nó dựa vào dữ liệu nào | `referenced_log_ids`, `citations` |
| **Fallback** | Phương án dự phòng khi AI lỗi | Tóm tắt trả câu an toàn; tóm tắt cũ dùng quy tắc |
| **Disclaimer** | Câu miễn trừ trách nhiệm | "Chỉ mang tính chất tham khảo..." |
| **RAG** | Kỹ thuật cho AI tra cứu tài liệu bên ngoài trước khi trả lời | **Chưa có** trong dự án |
| **Vector database** | CSDL lưu embedding cho RAG | **Chưa có** |
| **Token (AI)** | Đơn vị đo độ dài văn bản gửi/nhận AI | Không thống kê |
| **429 / quota** | Hết hạn mức gọi AI | Được bắt và báo người dùng |

### 7.5. Công cụ và triển khai

| Thuật ngữ | Nghĩa đơn giản | Trong dự án này |
|---|---|---|
| **FastAPI** | Framework backend Python | `app/main.py` |
| **Uvicorn** | Chương trình chạy FastAPI | `uvicorn app.main:app` |
| **Next.js** | Framework React | `frontend/` |
| **Vercel** | Dịch vụ deploy | `vercel.json` |
| **Docker** | Đóng gói app vào "hộp" chạy được mọi nơi | `Dockerfile`, `docker-compose.yml` |
| **pytest** | Công cụ chạy test Python | 18 bài test |
| **Mock** | Giả lập thành phần bên ngoài khi test | `test_ai_service.py` giả lập AI |
| **Fixture** | Dữ liệu/tiện ích chuẩn bị trước cho test | `tests/conftest.py` |
| **`.env`** | File chứa biến môi trường, không commit | `GEMINI_API_KEY`, `SECRET_KEY` |
| **CSV / Excel** | Định dạng bảng tính | Nhập/xuất ở `/data-reports` |
| **QR code** | Mã vuông chứa đường dẫn | `/trace/{mã_lô}` |

---

## Phụ lục: 12 câu hỏi – trả lời ngắn khi bảo vệ

**1. Hệ thống của em giải quyết vấn đề gì?**
Quản lý tập trung lô trồng, nhật ký, vật tư, thu hoạch và truy xuất nguồn gốc; AI đọc dữ liệu thật để gợi ý lịch, tóm tắt và cảnh báo.

**2. AI có tự quyết định thay người nông dân không?**
Không. AI chỉ gợi ý; mọi kết quả có disclaimer cố định; ngày tháng do backend tính; dữ liệu AI trích dẫn được kiểm tra lại.

**3. Làm sao biết AI không bịa?**
Ba lớp: prompt cấm bịa, ép JSON theo schema, và kiểm tra ID nhật ký/mã lô có thật trong CSDL. Sai là bị chặn hoặc fallback.

**4. Nếu Gemini hết hạn mức thì sao?**
Tóm tắt trả câu an toàn 200; lịch/cảnh báo/chat báo lỗi 429 kèm hướng dẫn thử lại. Không hiển thị kết quả sai.

**5. Phân quyền có thật hay chỉ ẩn nút?**
Thật, ở phần lớn API. Backend kiểm tra `require_permission`/`require_roles` và `plot_id` ở lô, lô trồng, nhật ký, AI chat; token được đối chiếu lại với bảng `users`. Hai ngoại lệ chưa làm: `GET /api/notifications`, `GET /search` thiếu xác thực; tóm tắt AI chưa lọc theo lô cho STAFF.

**6. Vì sao dùng SQLite?**
Phù hợp đồ án: không cần cài server, dễ nộp kèm dữ liệu, đủ nhanh với quy mô hiện tại. Có thể đổi sang PostgreSQL nhờ SQLAlchemy.

**7. Vì sao dùng Gemini?**
Có SDK chính thức, hỗ trợ ép JSON schema, tiếng Việt tốt, có gói miễn phí phù hợp sinh viên.

**8. Điểm mạnh nhất về kỹ thuật?**
Kiểm chứng đầu ra AI + transaction kho (có `with_for_update()`, hiện SQLite bỏ qua khóa dòng) + phân quyền backend + đo hiệu năng thực tế (8,7–14,8 ms cho API đọc chính).

**9. Điểm yếu nhất?**
API tạo thu hoạch đang lỗi lệch schema; chưa có AI gợi ý thời điểm thu hoạch; chứng nhận truy xuất đang viết cứng.

**10. Em đã dùng AI trong quá trình làm đồ án thế nào?**
Dùng AI để đọc/hiểu code, gợi ý thiết kế prompt, tìm lỗi và viết tài liệu; sau đó tự chạy test, tự đối chiếu mã nguồn và sửa lại. Bằng chứng: các file trong `docs/evidence/` và kết quả test/kiểm tra thật.

**11. Nếu có thêm thời gian, em làm gì?**
Sửa API thu hoạch + sinh QR; thêm AI gợi ý thu hoạch; bỏ chứng nhận giả; thêm bảng chứng nhận thật; so sánh 2 phiên bản prompt; thêm nhật ký chat.

**12. Vì sao gọi là "trang trại rau sạch"?**
Hệ thống ghi lại toàn bộ hoạt động (tưới, bón, phun, bệnh hại), cho phép truy xuất công khai và cảnh báo sâu bệnh, giúp minh bạch quy trình. Tuy nhiên chưa có chứng nhận VietGAP thật trong dữ liệu, nên không được tuyên bố quá mức.

---

*Tài liệu này chỉ mô tả hệ thống tại thời điểm 29/10/2026. Nếu mã nguồn thay đổi, cần đối chiếu lại. Các số liệu đo đạc nằm trong `KIEM_CHUNG_THUC_TE.md`.*
