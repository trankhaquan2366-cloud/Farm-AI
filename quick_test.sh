#!/bin/bash
# Chạy sau khi server đã bật (uvicorn app.main:app --reload)
# Mục đích: đi qua toàn bộ luồng nghiệp vụ 1 lần, kết thúc bằng truy xuất nguồn gốc.
set -e
BASE="http://127.0.0.1:8000"

echo "1) Tạo giống cây..."
VARIETY_ID=$(curl -s -X POST $BASE/api/varieties -H "Content-Type: application/json" \
  -d '{"name":"Cai chip","category":"Rau an la","growth_duration_days":30}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> variety_id=$VARIETY_ID"

echo "2) Tạo lô đất..."
PLOT_ID=$(curl -s -X POST $BASE/api/plots -H "Content-Type: application/json" \
  -d '{"name":"Lo A1","area_m2":100,"location":"Khu 1","soil_type":"Dat thit"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> plot_id=$PLOT_ID"

echo "3) Tạo vật tư..."
SUPPLY_ID=$(curl -s -X POST $BASE/api/supplies -H "Content-Type: application/json" \
  -d '{"name":"Phan huu co","type":"phan_bon","unit":"kg","stock_quantity":100}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> supply_id=$SUPPLY_ID"

echo "4) Tạo lô trồng (batch_code + expected_harvest_date sẽ tự sinh)..."
BATCH_JSON=$(curl -s -X POST $BASE/api/batches -H "Content-Type: application/json" \
  -d "{\"plot_id\":$PLOT_ID,\"variety_id\":$VARIETY_ID,\"seeding_date\":\"2026-08-01\"}")
echo "  -> $BATCH_JSON"
BATCH_CODE=$(echo $BATCH_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['batch_code'])")
BATCH_ID=$(echo $BATCH_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "5) Ghi nhật ký chăm sóc kèm dùng vật tư..."
curl -s -X POST $BASE/api/care-logs -H "Content-Type: application/json" \
  -d "{\"batch_id\":$BATCH_ID,\"log_type\":\"bon_phan\",\"description\":\"Bon phan dot 1\",\"conditions\":\"Nang nhe\",\"performed_at\":\"2026-08-05T08:00:00\",\"supplies_used\":[{\"supply_id\":$SUPPLY_ID,\"quantity_used\":5}]}" | python3 -m json.tool

echo "6) Ghi nhận thu hoạch..."
HARVEST_ID=$(curl -s -X POST $BASE/api/harvests -H "Content-Type: application/json" \
  -d "{\"batch_id\":$BATCH_ID,\"harvest_date\":\"2026-08-31\",\"quantity_kg\":20,\"quality_grade\":\"A\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  -> harvest_id=$HARVEST_ID"

echo "7) Ghi nhận bán hàng..."
curl -s -X POST $BASE/api/sales -H "Content-Type: application/json" \
  -d "{\"harvest_id\":$HARVEST_ID,\"customer_name\":\"Sieu thi Xanh\",\"quantity_kg\":15,\"unit_price\":25000,\"sale_date\":\"2026-09-01\"}" | python3 -m json.tool

echo "8) TRUY XUẤT NGUỒN GỐC theo batch_code=$BATCH_CODE ..."
curl -s $BASE/api/batches/code/$BATCH_CODE/trace | python3 -m json.tool

echo "9) [KT3] Gọi AI tóm tắt nhật ký cho batch_id=$BATCH_ID ..."
curl -s -X POST $BASE/api/ai/batches/$BATCH_ID/summary | python3 -m json.tool

echo "10) Tạo thêm 1 lô thứ 2 KHÔNG có nhật ký nào (để test xếp hạng có ý nghĩa)..."
BATCH2_JSON=$(curl -s -X POST $BASE/api/batches -H "Content-Type: application/json" \
  -d "{\"plot_id\":$PLOT_ID,\"variety_id\":$VARIETY_ID,\"seeding_date\":\"2026-08-01\"}")
echo "  -> $BATCH2_JSON"
BATCH2_ID=$(echo $BATCH2_JSON | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

echo "10b) Chuyển cả 2 lô sang status=growing (mặc định là planned, hàm gợi ý chỉ xét lô đang trồng)..."
curl -s -X PUT $BASE/api/batches/$BATCH_ID -H "Content-Type: application/json" -d '{"status":"growing"}' > /dev/null
curl -s -X PUT $BASE/api/batches/$BATCH2_ID -H "Content-Type: application/json" -d '{"status":"growing"}' > /dev/null
echo "  -> đã chuyển status"

echo "11) [KT3] Gọi AI gợi ý lô cần kiểm tra (toàn hệ thống) ..."
curl -s -X POST $BASE/api/ai/alerts | python3 -m json.tool

echo "12) [KT3] Gọi AI sinh lịch chăm sóc tham khảo cho batch_id=$BATCH_ID ..."
curl -s -X POST $BASE/api/ai/batches/$BATCH_ID/schedule | python3 -m json.tool

echo ""
echo "=== XONG - kiểm tra bước 9, 11, 12 (đủ 3 chức năng AI) có trả JSON hợp lệ, có disclaimer không ==="
