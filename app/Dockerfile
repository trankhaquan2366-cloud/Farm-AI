FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Chạy bằng người dùng không phải root để giảm thiệt hại nếu container bị chiếm.
RUN useradd --create-home --uid 10001 appuser     && mkdir -p /app/app/uploads     && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]