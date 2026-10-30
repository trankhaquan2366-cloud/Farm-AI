#!/bin/bash
# Chạy trọn gói: backend 8001 (farm_demo.db) + backend dự phòng 8003 (không khóa AI)
# + frontend production 3002 + chụp ảnh. Mật khẩu demo đọc từ biến môi trường
# DEMO_PASSWORD, không in ra màn hình.
set -u
cd "/d/Project AI SChoool/farm_backend"
export PYTHONIOENCODING=utf-8 PYTHONUTF8=1
CORS="http://127.0.0.1:3002,http://localhost:3002"
SK1=$(./.venv/Scripts/python.exe -c "import secrets;print(secrets.token_hex(32))")
SK2=$(./.venv/Scripts/python.exe -c "import secrets;print(secrets.token_hex(32))")

cleanup() {
  for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null; done
}
PIDS=()
trap cleanup EXIT

DATABASE_URL="sqlite:///./farm_demo.db" CORS_ORIGINS="$CORS" SECRET_KEY="$SK1" DEBUG=true \
  ./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 >/tmp/gf8001.log 2>&1 &
PIDS+=($!)

GEMINI_API_KEY="" DATABASE_URL="sqlite:///./farm_demo.db" CORS_ORIGINS="$CORS" SECRET_KEY="$SK2" DEBUG=true \
  ./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8003 >/tmp/gf8003.log 2>&1 &
PIDS+=($!)

cd frontend
npm run start -- --port 3002 >/tmp/gf3002.log 2>&1 &
PIDS+=($!)
cd ..

c1=000; c2=000; c3=000
for i in $(seq 1 90); do
  c1=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/health)
  c2=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8003/health)
  c3=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/login)
  if [ "$c1" = "200" ] && [ "$c2" = "200" ] && [ "$c3" = "200" ]; then break; fi
  sleep 2
done
echo "HEALTH 8001=$c1 8003=$c2 3002=$c3"
if [ "$c3" != "200" ]; then
  echo "Frontend chưa sẵn sàng, xem /tmp/gf3002.log"
  tail -20 /tmp/gf3002.log
  exit 1
fi

export DEMO_PASSWORD="$(grep -m1 '^PASSWORD = ' /tmp/greenfarm_cu_old.py | cut -d'"' -f2)"
python docs/evidence/scripts/capture_ui.py
echo "CAPTURE_EXIT=$?"
