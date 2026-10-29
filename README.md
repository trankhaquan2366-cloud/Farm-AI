# GreenFarm AI

## Hệ thống Quản trị Nông nghiệp Thông minh

> Tài liệu này giới thiệu sản phẩm, hướng dẫn chạy dự án và cung cấp nội dung nền để nhóm phát triển báo cáo đồ án cuối kỳ. Các mô tả về kiến trúc triển khai cần được phân biệt với cấu hình hiện có trong mã nguồn; mục **Trạng thái triển khai và phạm vi** ghi rõ những điểm chưa được cấu hình trong repository.

## 1. Giới thiệu

GreenFarm AI là hệ thống quản trị nông nghiệp hướng đến việc số hóa quy trình sản xuất tại trang trại. Ứng dụng tập trung dữ liệu về tài khoản, lô đất, giống cây, lô trồng, nhật ký chăm sóc, vật tư và thu hoạch; cung cấp báo cáo phục vụ quản lý; hỗ trợ tra cứu hành trình nông sản bằng mã QR; đồng thời tích hợp trợ lý AI để khai thác thông tin canh tác và đưa ra gợi ý tham khảo.

Mục tiêu của dự án là giúp dữ liệu vận hành được ghi nhận nhất quán, dễ kiểm tra và có thể truy xuất theo từng lô trồng. GreenFarm AI là công cụ hỗ trợ quản lý và ra quyết định, không thay thế chuyên gia nông học, quy trình kiểm định chất lượng hoặc các chứng nhận sản xuất.

## 2. Bối cảnh và lý do chọn đề tài

### 2.1. Bối cảnh

Ở nhiều cơ sở sản xuất, thông tin về gieo trồng, tưới tiêu, phân bón, thuốc bảo vệ thực vật và thu hoạch được lưu trên giấy hoặc nhiều bảng tính riêng lẻ. Cách làm này có thể phù hợp ở quy mô nhỏ, nhưng khó đáp ứng yêu cầu theo dõi liên tục khi số lượng lô trồng, nhân sự và chủng loại vật tư tăng lên.

### 2.2. Những vấn đề cần giải quyết

- **Ghi chép phân tán:** Nhật ký giấy dễ thất lạc, khó chuẩn hóa và tốn thời gian tổng hợp.
- **Khó theo dõi vật tư:** Việc đối chiếu nhập, xuất, tồn và mức tồn tối thiểu thường cần thao tác thủ công.
- **Thiếu liên kết dữ liệu:** Thông tin giống cây, lô đất, lô trồng và hoạt động chăm sóc không phải lúc nào cũng được liên kết thành một hồ sơ hoàn chỉnh.
- **Khó đánh giá tiến độ:** Người quản lý khó có cái nhìn nhanh về trạng thái canh tác, lịch chăm sóc và kế hoạch thu hoạch.
- **Khó chứng minh nguồn gốc:** Người mua và đối tác cần thông tin rõ ràng hơn về quá trình sản xuất và nguồn gốc lô hàng.
- **Báo cáo tốn thời gian:** Số liệu phục vụ quản trị hoặc đánh giá quy trình thường phải lọc và tổng hợp lại từ nhiều nguồn.

### 2.3. Giải pháp và giá trị kỳ vọng

GreenFarm AI hướng đến một nền tảng quản lý tập trung, trong đó các nghiệp vụ chính được ghi nhận qua giao diện web và API. Hệ thống hỗ trợ tra cứu dữ liệu vận hành, cập nhật nhật ký, theo dõi tồn kho, hiển thị chỉ số tổng quan, xuất dữ liệu phục vụ báo cáo và cung cấp trang tra cứu công khai theo mã lô.

Thiết kế API và mô hình dữ liệu tạo nền tảng để có thể tích hợp thiết bị IoT trong các giai đoạn sau. Việc thu thập dữ liệu cảm biến tự động không được xem là đã hoàn tất nếu chưa có thiết bị, gateway và pipeline tương ứng được triển khai.

## 3. Mục tiêu, đối tượng và phạm vi

### 3.1. Mục tiêu

1. Tập trung thông tin quản trị nông trại vào một hệ thống có cấu trúc.
2. Theo dõi vòng đời canh tác từ danh mục giống và lô đất đến lô trồng, nhật ký và thu hoạch.
3. Hỗ trợ phân quyền theo vai trò cho các thao tác quản trị và nghiệp vụ.
4. Cung cấp dữ liệu dễ tra cứu, tổng hợp và xuất báo cáo.
5. Tạo trải nghiệm truy xuất nguồn gốc dễ sử dụng cho người tiêu dùng thông qua QR.
6. Khai thác AI theo hướng trợ lý tham khảo, có giới hạn và gắn với dữ liệu nghiệp vụ.

### 3.2. Đối tượng sử dụng

- **Quản trị viên (Admin):** Quản lý hệ thống và tài khoản.
- **Quản lý (Manager):** Theo dõi hoạt động trang trại, nhân sự, danh mục và vật tư theo quyền được cấp.
- **Kỹ thuật viên (Technician):** Theo dõi lô trồng, nhật ký và hoạt động chuyên môn.
- **Nhân viên (Worker/Staff):** Ghi nhận hoạt động và báo cáo nghiệp vụ được phân công.
- **Người tiêu dùng/đối tác:** Tra cứu thông tin công khai của lô nông sản qua mã QR, không cần đăng nhập.

Trong backend hiện tại, vai trò nhân viên được lưu bằng giá trị `staff` (`UserRole.STAFF`); tên “Worker” được dùng như cách gọi nghiệp vụ ở tài liệu và giao diện.

### 3.3. Phạm vi hiện tại

Repository hiện có frontend Next.js và backend FastAPI với các mô-đun quản lý tài khoản, dashboard, danh mục, lô trồng, nhật ký, vật tư, thu hoạch, báo cáo, AI và truy xuất. Một số phạm vi như tích hợp IoT thực tế, phân cấp quản lý nhân sự đầy đủ, PostgreSQL production và cấu hình triển khai Vercel/Render cần được xem là định hướng hoặc công việc cần xác nhận thêm, không mặc định đã được triển khai.

## 4. Kiến trúc hệ thống và công nghệ

### 4.1. Kiến trúc logic

```text
Người dùng / Trình duyệt
        |
        v
Frontend Next.js (App Router, React, TypeScript)
        |  HTTP/JSON, JWT authorization header when authenticated
        v
Backend FastAPI (routers -> services/repositories -> SQLAlchemy)
        |
        v
Cơ sở dữ liệu quan hệ

Backend AI service ----> Google Gemini API (khi đã cấu hình khóa API)
QR scanner -----------> Public traceability endpoint / public trace page
```

Frontend chịu trách nhiệm hiển thị giao diện và gọi API. Backend xác thực yêu cầu, kiểm tra dữ liệu, áp dụng quyền và thực hiện nghiệp vụ. SQLAlchemy ánh xạ các model Python với dữ liệu quan hệ. Các lời gọi AI được thực hiện từ backend để giữ khóa API ở phía máy chủ.

### 4.2. Công nghệ và vai trò

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Frontend | Next.js App Router | Routing, render trang và tổ chức giao diện theo route. |
| Frontend | React 19, TypeScript | Xây dựng component tương tác, quản lý trạng thái giao diện và kiểm tra kiểu ở thời điểm phát triển. |
| Giao diện | Tailwind CSS, Shadcn UI/Base UI, Lucide | Tạo bố cục responsive, thành phần giao diện và biểu tượng. |
| Biểu đồ | Recharts | Hiển thị các biểu đồ tổng quan và báo cáo. |
| Tương tác | Motion | Hỗ trợ chuyển động và micro-interactions trong giao diện. |
| Nhập/xuất | ExcelJS | Đọc tệp bảng tính và tạo workbook Excel cho các luồng dữ liệu/báo cáo có hỗ trợ. |
| Backend | Python 3.12, FastAPI | Xây dựng REST API bất đồng bộ/đồng bộ, tài liệu OpenAPI và xử lý yêu cầu. |
| Validation | Pydantic v2 | Kiểm tra và chuyển đổi dữ liệu request/response. |
| ORM | SQLAlchemy 2 | Ánh xạ model, truy vấn và quản lý session với cơ sở dữ liệu. |
| Xác thực | JWT và thư viện bảo mật Python | Xác thực phiên truy cập API và bảo vệ thông tin đăng nhập. |
| AI | Google Gen AI SDK / Gemini | Tạo gợi ý, lịch chăm sóc hoặc tóm tắt nghiệp vụ tùy theo chức năng và cấu hình API key. |
| Đóng gói | Docker, Docker Compose | Đóng gói frontend/backend và chạy các dịch vụ cục bộ trong môi trường thống nhất. |
| Quản lý mã nguồn | Git, GitHub | Theo dõi lịch sử thay đổi, cộng tác và review mã nguồn. |

### 4.3. Cơ sở dữ liệu và trạng thái triển khai

Các mô hình SQLAlchemy hiện mô tả dữ liệu quan hệ như `User`, `Plot`, `PlantVariety`, `CropBatch`, `CareLog`, `Supply`, `SupplyUsage`, `HarvestLog`, `Sale`, `Notification` và dữ liệu AI. Khóa ngoại được sử dụng để liên kết hoạt động canh tác với lô trồng, giống cây, lô đất và vật tư.

**Lưu ý quan trọng:** backend trong repository hiện khởi tạo SQLite tại `farm.db`; `docker-compose.yml` cũng mount tệp SQLite. PostgreSQL là lựa chọn phù hợp cho môi trường triển khai mục tiêu, nhưng để sử dụng cần cấu hình URL kết nối, driver PostgreSQL, schema/migration, backup và biến môi trường phù hợp. Không nên mô tả PostgreSQL là database đang chạy mặc định nếu chưa thực hiện cấu hình và kiểm thử chuyển đổi.

### 4.4. Mục tiêu triển khai

- **Vercel:** Nền tảng triển khai frontend Next.js được định hướng trong yêu cầu sản phẩm.
- **Render:** Nền tảng có thể dùng để triển khai backend FastAPI.
- **PostgreSQL managed:** Lựa chọn database production được khuyến nghị khi chuyển từ SQLite.

Repository hiện chưa có `vercel.json` hoặc `render.yaml`; do đó cần hoàn thiện biến môi trường, cấu hình build/start, CORS, domain, database production, logging và health checks trước khi kết luận các dịch vụ đã được triển khai trên những nền tảng này.

## 5. Chức năng cốt lõi

### 5.1. Xác thực và quản lý tài khoản

- Đăng nhập bằng thông tin tài khoản; backend cung cấp endpoint xác thực và thông tin người dùng hiện tại.
- Hỗ trợ đổi mật khẩu và thao tác quản lý người dùng theo API.
- Phân quyền theo vai trò Admin, Manager, Technician và Staff/Worker.
- Ma trận quyền được áp dụng ở backend; giao diện có thể ẩn hoặc hiện thao tác tương ứng nhằm cải thiện UX. Quyền ở giao diện không thay thế kiểm tra quyền phía server.
- Trang đăng nhập sử dụng bố cục split-screen, giới thiệu sản phẩm và form đăng nhập responsive.
- Các giới hạn phân công hiện tại phụ thuộc vào trường liên kết đang có trong model. Backend có `User.plot_id`; chưa có quan hệ quản lý phân cấp Manager → Technician → Worker.

### 5.2. Dashboard tổng quan

- Tập trung các chỉ số phục vụ theo dõi hoạt động trang trại.
- Hỗ trợ biểu đồ thu hoạch theo thời gian thông qua API dashboard.
- Là điểm vào chính cho các khu vực quản lý nghiệp vụ.
- Số liệu, trạng thái và phạm vi lọc phụ thuộc dữ liệu hiện có trong database và quyền người dùng.

### 5.3. Quản lý danh mục và hoạt động canh tác

- **Lô đất (Plots):** Quản lý mã lô, tên, diện tích, loại đất, vị trí và thông tin môi trường có hỗ trợ.
- **Giống cây (Plant Varieties):** Quản lý tên, nhóm cây, chu kỳ sinh trưởng/thu hoạch và thông tin kỹ thuật liên quan.
- **Lô trồng (Crop Batches):** Liên kết giống cây và lô đất, lưu ngày gieo, ngày thu hoạch dự kiến, số lượng và trạng thái sinh trưởng.
- **Nhật ký chăm sóc (Care Logs):** Ghi nhận các hoạt động như tưới nước, bón phân, phun thuốc và ghi chú tình trạng cây.
- **Thu hoạch:** Quản lý bản ghi thu hoạch gắn với lô trồng; dữ liệu này hỗ trợ tổng hợp và truy xuất hành trình sản phẩm.
- **Vật tư nông nghiệp:** Quản lý danh mục, tồn kho, ngưỡng cảnh báo, nhập kho và lịch sử sử dụng vật tư.
- Khi nghiệp vụ có hỗ trợ, việc sử dụng vật tư được lưu thành bản ghi liên quan và cập nhật số lượng tồn. Cần kiểm tra từng luồng cụ thể trước khi khẳng định mọi thao tác hủy đều hoàn trả kho tự động.

### 5.4. Trợ lý AI và cảnh báo

- Cung cấp giao diện trợ lý để đặt câu hỏi theo ngữ cảnh canh tác.
- Backend có các mô-đun liên quan đến tư vấn, lịch chăm sóc, tóm tắt và cảnh báo AI.
- Khi được cấu hình Gemini API key, backend có thể gọi dịch vụ AI để tạo nội dung tham khảo.
- Câu trả lời AI cần được xem là gợi ý; người dùng phải đối chiếu với quy trình canh tác, nhãn sản phẩm và chuyên gia có thẩm quyền.
- Thông tin AI nên gắn với dữ liệu thực tế của lô trồng; không dùng nội dung sinh tự động làm bằng chứng chứng nhận chất lượng.

### 5.5. Truy xuất nguồn gốc và QR

- Tạo mã/đường dẫn tra cứu cho lô trồng hoặc lô nông sản.
- Cung cấp trang truy xuất công khai tại route frontend `/trace/[batch_code]`.
- Backend có endpoint tra cứu công khai theo mã lô; endpoint công khai không yêu cầu JWT để người tiêu dùng có thể quét QR.
- Có giao diện công cụ tạo/xem trước nhãn QR và luồng in tem.
- Trang public chỉ nên trình bày dữ liệu được phép công khai; không đưa thông tin cá nhân hoặc dữ liệu nội bộ lên nhãn.

### 5.6. Dữ liệu và báo cáo

- Hỗ trợ luồng nhập dữ liệu bảng tính cho các loại dữ liệu mà giao diện/backend hiện hỗ trợ.
- Kiểm tra dữ liệu đầu vào và hiển thị kết quả xem trước trước khi người dùng xác nhận.
- Cung cấp các báo cáo quản trị như tồn kho, nhật ký canh tác và dự báo thu hoạch theo dữ liệu sẵn có.
- Hỗ trợ xuất Excel qua ExcelJS và in trang báo cáo bằng chức năng in của trình duyệt ở các luồng tương ứng.
- Việc xuất PDF có thể dựa trên hộp thoại in của trình duyệt; không đồng nghĩa hệ thống có dịch vụ tạo PDF server-side.

## 6. Mô hình dữ liệu khái quát

| Thực thể | Vai trò |
|---|---|
| `User` | Tài khoản, mã nhân viên, vai trò, trạng thái hoạt động và thông tin phân công hiện có. |
| `Plot` | Khu vực/lô đất canh tác, diện tích, đất và thông tin môi trường. |
| `PlantVariety` | Danh mục giống cây và chu kỳ sinh trưởng dự kiến. |
| `CropBatch` | Một mẻ/lô trồng cụ thể, liên kết `Plot` và `PlantVariety`. |
| `CareLog` | Nhật ký hoạt động gắn với `CropBatch` và người ghi nhận. |
| `Supply` | Danh mục vật tư, đơn vị, số lượng tồn và ngưỡng tối thiểu. |
| `SupplyUsage` | Chi tiết vật tư tiêu thụ, liên kết nhật ký chăm sóc và vật tư. |
| `HarvestLog` | Sự kiện thu hoạch gắn với lô trồng. |
| `Sale` | Thông tin bán hàng liên quan đến sản phẩm thu hoạch nếu nghiệp vụ được sử dụng. |
| `Notification` / AI models | Thông báo và dữ liệu phản hồi/gợi ý AI. |

Luồng dữ liệu tiêu biểu:

```text
Plot + PlantVariety
        |
        v
    CropBatch
        |
        +----> CareLog ----> SupplyUsage ----> cập nhật tồn kho Supply
        |
        +----> HarvestLog ----> Traceability / QR
```

Mô hình thực tế có thể mở rộng theo các migration và thay đổi schema. Trước khi dùng sơ đồ này trong báo cáo như ERD chính thức, nhóm nên xác minh lại quan hệ, cardinality và ràng buộc từ các model/migration ở phiên bản cuối.

## 7. Yêu cầu và quy tắc nghiệp vụ

### 7.1. Yêu cầu chức năng

1. Người dùng có thể đăng nhập và sử dụng chức năng trong phạm vi vai trò được cấp.
2. Người có quyền có thể quản lý tài khoản, danh mục, lô trồng và vật tư.
3. Người dùng có thể ghi nhật ký chăm sóc cho lô trồng phù hợp.
4. Hệ thống ghi nhận hoạt động tiêu thụ vật tư và phản ánh thay đổi tồn kho theo nghiệp vụ đã triển khai.
5. Người dùng có thể theo dõi dữ liệu tổng quan và tra cứu các báo cáo được cung cấp.
6. Người tiêu dùng có thể mở trang truy xuất công khai bằng mã QR mà không cần đăng nhập.
7. Người dùng có thể sử dụng chức năng AI khi cấu hình tích hợp AI hợp lệ.

### 7.2. Yêu cầu phi chức năng

- **Bảo mật:** Không lưu khóa API trong frontend; xác thực và kiểm tra quyền ở backend; không commit `.env` chứa bí mật.
- **Tính toàn vẹn:** Dữ liệu liên kết bằng khóa và được kiểm tra đầu vào trước khi ghi.
- **Khả năng sử dụng:** Giao diện responsive, trạng thái lỗi/thành công rõ ràng, luồng nghiệp vụ dễ hiểu.
- **Khả năng bảo trì:** Tách frontend, routers, services, repositories, schemas và models theo trách nhiệm.
- **Khả năng mở rộng:** Thiết kế API và mô hình dữ liệu có thể mở rộng cho thiết bị IoT và lưu lượng lớn hơn.
- **Tính truy xuất:** Gắn các nhật ký và sự kiện thu hoạch với mã lô có thể tra cứu.

## 8. API và giao tiếp

Frontend gọi backend qua HTTP/JSON. API client phía frontend lấy base URL từ `NEXT_PUBLIC_API_URL` hoặc `NEXT_PUBLIC_API_BASE_URL`; nếu không khai báo, giá trị mặc định là `http://localhost:8000`. Với request đã đăng nhập, client gửi access token trong header xác thực.

Các nhóm endpoint chính gồm:

- Xác thực và tài khoản: đăng nhập, thông tin tài khoản hiện tại, đổi mật khẩu và quản lý người dùng.
- Dashboard và tìm kiếm.
- Lô đất, giống cây, lô trồng và nhật ký chăm sóc.
- Vật tư, nhập kho, cảnh báo tồn kho và sử dụng vật tư.
- Thu hoạch và bán hàng.
- Trợ lý AI, lịch chăm sóc, tóm tắt và cảnh báo.
- Thông báo.
- Truy xuất nguồn gốc công khai.

FastAPI cung cấp tài liệu OpenAPI tự động. Khi backend đang chạy cục bộ, có thể mở `/docs` để xem schema API và thử các endpoint. Các route nghiệp vụ được đăng ký dưới một số prefix tương thích như `/api/...` và `/api/v1/...`; nên kiểm tra OpenAPI của bản chạy hiện tại để xác nhận chính xác đường dẫn trước khi tích hợp client ngoài.

## 9. Cài đặt và chạy dự án

### 9.1. Yêu cầu môi trường

- Git.
- Python 3.12 khuyến nghị theo Dockerfile backend.
- Node.js 22 khuyến nghị theo Dockerfile frontend.
- npm.
- Docker Desktop nếu chạy bằng Docker Compose.

### 9.2. Cấu hình môi trường

Tạo file `.env` ở thư mục gốc khi cần dùng chức năng AI:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest
GEMINI_MAX_PROMPT_CHARS=24000
```

Không commit giá trị thật của API key. Có thể bỏ qua `GEMINI_API_KEY` khi chỉ muốn chạy các chức năng không phụ thuộc AI; ứng dụng sẽ cảnh báo và các endpoint AI cần khóa sẽ không hoạt động đầy đủ.

Frontend có thể cấu hình file `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

`NEXT_PUBLIC_*` được đưa vào bundle phía trình duyệt; chỉ đặt URL/API endpoint công khai tại đây, không đặt mật khẩu, khóa bí mật hoặc thông tin kết nối database.

### 9.3. Chạy backend cục bộ

Từ thư mục gốc repository:

```bash
python -m venv .venv
```

Kích hoạt môi trường ảo:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Cài dependencies và khởi động API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend hiện tạo/sử dụng SQLite `farm.db` theo cấu hình trong `app/core/database.py`. Khi chạy lần đầu, hãy để ứng dụng tạo schema hoặc khởi tạo theo hướng dẫn của nhóm. Không dùng chung tệp database development với production.

Kiểm tra:

- Health check: `http://localhost:8000/health`
- OpenAPI Swagger UI: `http://localhost:8000/docs`

### 9.4. Chạy frontend cục bộ

Mở terminal thứ hai:

```bash
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:3000`. Nếu backend chạy ở địa chỉ khác, cập nhật `NEXT_PUBLIC_API_URL` trong `frontend/.env.local` rồi khởi động lại frontend.

### 9.5. Chạy bằng Docker Compose

Từ thư mục gốc:

```bash
docker compose up --build
```

Các dịch vụ mặc định:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Health check backend: `http://localhost:8000/health`

Chạy nền và dừng dịch vụ:

```bash
docker compose up --build -d
docker compose down
```

Compose hiện mount `farm.db` để lưu database SQLite cục bộ. Hãy sao lưu dữ liệu cần thiết trước khi thay đổi hoặc xóa file này. Không xem cấu hình Compose hiện tại là cấu hình PostgreSQL production.

## 10. Dữ liệu mẫu (Seed)

Để demo sản phẩm, dùng `scripts/demo_data.py`. Bộ dữ liệu gồm đủ vai trò Admin/Manager/Technician/Staff, lô đất và giống cây, lô đang canh tác cùng các vụ đã thu hoạch, nhật ký chăm sóc, vật tư và lịch sử nhập kho, cảnh báo tồn thấp, thu hoạch, bán hàng, thông báo, gợi ý AI mẫu và mã QR truy xuất. Hoạt động được phân bổ đều trên 12 tháng gần nhất tính từ ngày chạy seed: mỗi tháng có 4 nhật ký, một lượt thu hoạch và một giao dịch bán; các đợt nhập kho và gợi ý chăm sóc cũng có ngày tháng phù hợp. Mọi ngày nghiệp vụ đều không nằm trong tương lai. Chạy lại script sẽ thay thế các bản ghi demo, không xóa dữ liệu khác và không tạo bản ghi trùng.

Chạy ở thư mục gốc trên Windows:

```powershell
python scripts\demo_data.py
```

Tài khoản demo dùng chung mật khẩu `GreenFarmDemo2026!`:

| Vai trò | Tài khoản |
|---|---|
| Admin | `demo_admin@greenfarm.local` |
| Manager | `demo_manager@greenfarm.local` |
| Technician | `demo_technician@greenfarm.local` |
| Staff | `demo_staff@greenfarm.local` |

Mã QR mẫu: `DEMO-QR-001` và `DEMO-QR-002`. Các endpoint AI cần `GEMINI_API_KEY` để gọi mô hình thật; gợi ý đã seed chỉ là dữ liệu minh họa.

Reset toàn bộ dữ liệu ứng dụng về trắng, giữ nguyên cấu trúc bảng và lịch sử migration:

```powershell
python scripts\demo_data.py --reset
```

Lệnh reset sẽ yêu cầu nhập `RESET`. Khi chạy trong script/terminal không tương tác, dùng:

```powershell
python scripts\demo_data.py --reset --yes
```

Mặc định seed/reset dùng SQLite `farm.db` của ứng dụng. Có thể chỉ định database khác; hãy kiểm tra URL trước khi reset:

```powershell
python scripts\demo_data.py --database-url "sqlite:///./farm_demo_test.db"
python scripts\demo_data.py --database-url "sqlite:///./farm_demo_test.db" --reset --yes
```

Để sinh dữ liệu tải kiểm thử quy mô lớn (50 user, 30 giống, 80 vật tư, 40 lô đất, 120 mẻ trồng và ít nhất 5.000 nhật ký), dùng script riêng:

```powershell
pip install -r requirements-seed.txt
python scripts\seed_data.py
```

Script tải kiểm thử hỗ trợ `--database-url` và biến môi trường `DATABASE_URL`. Không dùng seed demo hoặc seed tải kiểm thử trên production.

## 11. Kiểm thử và kiểm tra chất lượng

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm exec tsc -- --noEmit
```

Backend:

```bash
python -m compileall app scripts
```

Các lệnh trên kiểm tra lint/build/kiểu và cú pháp Python; chúng không thay thế kiểm thử tích hợp với database, xác thực, phân quyền hoặc dịch vụ Gemini. Trước khi phát hành, cần bổ sung/chạy test tự động cho:

- Đăng nhập, token hết hạn và quyền truy cập theo role.
- Tạo/cập nhật/xóa danh mục và ràng buộc dữ liệu.
- Nhật ký chăm sóc, ghi nhận sử dụng vật tư và tính đúng tồn kho.
- Tạo/đọc lô trồng và dữ liệu truy xuất công khai.
- Nhập file sai định dạng, thiếu cột hoặc giá trị không hợp lệ.
- Hành vi lỗi khi AI/database/API bên ngoài không khả dụng.

## 12. Cấu trúc repository

```text
.
├── app/                         # Backend FastAPI
│   ├── core/                    # Database, security, dependencies, permissions, AI config
│   ├── models/                  # SQLAlchemy ORM models
│   ├── repositories/            # Lớp truy vấn dữ liệu
│   ├── routers/                 # HTTP API endpoints
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── services/                # Nghiệp vụ ứng dụng
│   └── main.py                  # Khởi tạo FastAPI và đăng ký routers
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # Giao diện và layout components
│   ├── lib/                     # API client, navigation, types, permissions
│   └── package.json             # Dependencies và scripts frontend
├── scripts/
│   ├── demo_data.py             # Tạo/reset bộ dữ liệu demo
│   └── seed_data.py             # Sinh dữ liệu tải kiểm thử quy mô lớn
├── docker-compose.yml
├── requirements.txt
└── requirements-seed.txt
```

## 13. Gợi ý bố cục báo cáo đồ án

### Chương 1 — Tổng quan đề tài

- Bối cảnh sản xuất nông nghiệp và các vấn đề ghi chép, kiểm soát vật tư, báo cáo, truy xuất.
- Lý do chọn đề tài và ý nghĩa thực tiễn.
- Mục tiêu, đối tượng sử dụng, phạm vi và giới hạn.
- Phương pháp thực hiện và bố cục báo cáo.

### Chương 2 — Cơ sở lý thuyết và công nghệ

- Mô hình ứng dụng web client-server và REST API.
- Next.js App Router, React, TypeScript và Tailwind CSS.
- FastAPI, Pydantic và SQLAlchemy.
- Cơ sở dữ liệu quan hệ; mô tả SQLite hiện tại và phương án PostgreSQL mục tiêu.
- JWT/RBAC, bảo mật API, QR truy xuất và tích hợp mô hình ngôn ngữ.
- Docker và quy trình cộng tác Git/GitHub.

### Chương 3 — Phân tích và thiết kế hệ thống

- Khảo sát bài toán, yêu cầu chức năng và phi chức năng.
- Tác nhân và use case: Admin, Manager, Technician, Worker/Staff, người tiêu dùng.
- Ma trận phân quyền và luồng nghiệp vụ.
- Sơ đồ kiến trúc, sơ đồ hoạt động, sequence diagram và ERD.
- Thiết kế giao diện: đăng nhập, dashboard, danh mục, nhật ký, vật tư, truy xuất, báo cáo.
- Thiết kế API và quy tắc kiểm tra dữ liệu.

### Chương 4 — Cài đặt và kiểm thử

- Môi trường và cấu hình cài đặt.
- Cài đặt frontend/backend, xác thực, dữ liệu, báo cáo, AI và QR.
- Kịch bản kiểm thử theo vai trò và nghiệp vụ.
- Kết quả kiểm thử, ảnh chụp giao diện, lỗi đã khắc phục và giới hạn đã biết.
- Đánh giá hiệu năng và an toàn nếu nhóm đã thực hiện đo đạc.

### Chương 5 — Kết luận và hướng phát triển

- Đánh giá mục tiêu đạt được dựa trên sản phẩm thực tế.
- Hạn chế còn tồn tại: dữ liệu mẫu, nền tảng database, tích hợp IoT, kiểm thử và triển khai.
- Hướng phát triển: PostgreSQL production, migration/backup, phân cấp tổ chức, IoT, audit log, phân tích dự báo, giám sát và kiểm thử tự động.

Không nên ghi nhận số liệu hiệu năng, tỷ lệ chính xác AI, chứng nhận tiêu chuẩn, quy mô người dùng hoặc triển khai production nếu nhóm chưa đo lường hay xác minh được.

## 14. Trạng thái triển khai và giới hạn cần lưu ý

- Database mặc định hiện là SQLite; PostgreSQL cần được cấu hình và kiểm thử riêng trước khi sử dụng production.
- Compose hiện chạy frontend và backend, không khởi tạo dịch vụ PostgreSQL.
- Vercel và Render là mục tiêu triển khai có thể lựa chọn; repository hiện không chứa cấu hình triển khai riêng cho hai nền tảng.
- AI phụ thuộc API key, hạn mức, khả năng truy cập dịch vụ bên ngoài và chất lượng dữ liệu đầu vào.
- QR chỉ giúp mở trang tra cứu; độ tin cậy của nội dung phụ thuộc dữ liệu được ghi nhận và quy trình kiểm chứng.
- Quan hệ phân công hiện tại không đồng nghĩa đã có mô hình quản lý nhân sự nhiều cấp.
- Dữ liệu seed là dữ liệu giả lập, không phản ánh một trang trại thật và không dùng cho báo cáo kết quả sản xuất thực tế.

## 15. Bảo mật và quyền riêng tư

- Không đưa `.env`, mật khẩu, secret key, token hoặc Gemini API key lên Git.
- Đặt `SECRET_KEY` mạnh, riêng cho môi trường triển khai; không dùng giá trị mẫu trong `docker-compose.yml` ở production.
- Bảo vệ API bằng xác thực và kiểm tra role ở backend; không dựa vào việc ẩn nút trên frontend.
- Hạn chế dữ liệu hiển thị ở endpoint truy xuất công khai.
- Dùng HTTPS, quản lý CORS theo domain tin cậy và cấu hình giới hạn truy cập khi triển khai thật.
- Thay mật khẩu demo và xóa tài khoản seed trước khi đưa hệ thống ra môi trường công khai.
- Tư vấn AI chỉ có tính tham khảo, cần được con người đánh giá trước khi áp dụng vào hoạt động nông nghiệp.

## 16. Đóng góp

1. Tạo nhánh riêng cho mỗi tính năng hoặc bản sửa lỗi.
2. Giữ thay đổi tập trung, mô tả rõ mục đích và các bước kiểm tra.
3. Không commit dữ liệu cá nhân, thông tin bí mật hoặc database phát sinh.
4. Cập nhật tài liệu khi thay đổi API, biến môi trường, schema hoặc quy trình chạy.
5. Mở Pull Request để review trước khi hợp nhất vào nhánh chính.

## 17. Giấy phép và lưu ý sử dụng

Nếu dự án được phát hành hoặc sử dụng ngoài phạm vi học tập, nhóm cần bổ sung giấy phép phần mềm, điều khoản sử dụng, chính sách quyền riêng tư và thông tin liên hệ của đơn vị vận hành. Các nội dung nông học do AI sinh ra không phải hướng dẫn chuyên môn được chứng nhận.
