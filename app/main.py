from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.routers import dashboard, traceability
from app.core.database import Base, engine, ensure_legacy_schema

# Import các router bắt buộc
from app.routers import (
    ai_advisor,
    ai_alert,
    ai_schedule,
    ai_summary,
    auth,
    crop_batch,
    harvest,
    notification,
    plant_variety,
    plot,
    search,
    supply,
)

# Safe Import cho Care Log (Xử lý cả care_log và care_logs)
try:
    from app.routers import care_log
except ImportError:
    from app.routers import care_logs as care_log

# Safe Import cho Farm / Farms (Khắc phục triệt để lỗi 404 /api/v1/farms)
farm_module = None
try:
    from app.routers import farm as farm_module
except ImportError:
    try:
        from app.routers import farms as farm_module
    except ImportError:
        farm_module = None

# 1. Khởi tạo bảng CSDL
ensure_legacy_schema()
Base.metadata.create_all(bind=engine)

# 2. Khởi tạo Ứng dụng FastAPI
app = FastAPI(
    title="GreenFarm AI API",
    version="1.0.0",
    description="Hệ thống Backend Quản lý Nông trại & Trợ lý AI",
    redirect_slashes=True,
)
upload_dir = Path(__file__).resolve().parent / "uploads"
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# 3. Cấu hình CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Health Check Endpoints
@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "message": "GreenFarm AI API đang chạy thành công"}

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "ok"}

# 5. Đăng ký các Router Cố định
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(notification.router)
app.include_router(ai_advisor.router)
app.include_router(ai_alert.router)
app.include_router(ai_schedule.router)
app.include_router(ai_summary.router)
app.include_router(traceability.router)
app.include_router(supply.router)
app.include_router(dashboard.router)

# 6. Đăng ký Router Quản lý kèm toàn bộ Alias Prefix (Xử lý dứt điểm 404)

# --- Thu hoạch (Harvests) ---
for prefix in ["/api/harvests", "/api/v1/harvests"]:
    app.include_router(harvest.router, prefix=prefix, tags=["Harvests"])

# --- Trang trại (Farms) ---
if farm_module and hasattr(farm_module, "router"):
    for prefix in ["/api/farms", "/api/v1/farms"]:
        app.include_router(farm_module.router, prefix=prefix, tags=["Farms"])

# --- Giống cây trồng (Plant Varieties) ---
for prefix in ["/api/varieties", "/api/v1/varieties", "/api/crop-varieties", "/api/v1/crop-varieties", "/api/plant-varieties", "/api/v1/plant-varieties"]:
    app.include_router(plant_variety.router, prefix=prefix, tags=["Plant Varieties"])

# --- Thửa đất (Land Plots) ---
for prefix in ["/api/plots", "/api/v1/plots", "/api/land-plots", "/api/v1/land-plots"]:
    app.include_router(plot.router, prefix=prefix, tags=["Plots"])

# --- Lô trồng (Crop Batches / Lots) ---
for prefix in [
    "/api/batches",
    "/api/v1/batches",
    "/api/crop-batches",
    "/api/v1/crop-batches",
    "/api/crop-lots",
    "/api/v1/crop-lots",
]:
    app.include_router(crop_batch.router, prefix=prefix, tags=["Crop Batches"])

# --- Nhật ký chăm sóc (Care Logs) ---
for prefix in ["/api/logs", "/api/v1/logs", "/api/care-logs", "/api/v1/care-logs"]:
    app.include_router(care_log.router, prefix=prefix, tags=["Care Logs"])

# 7. Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail or "Tài nguyên không tồn tại hoặc không có quyền truy cập.",
            "path": str(request.url.path),
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "fail",
            "message": "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.",
            "errors": exc.errors(),
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
            "detail": str(exc),
        },
    )