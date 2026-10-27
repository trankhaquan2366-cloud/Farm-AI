import random
from datetime import datetime, timedelta

# ==========================================
# 1. DỮ LIỆU GỐC (MASTER DATA)
# ==========================================

PLOTS = [
    {"id": 1, "name": "Khu A - Canh tác ngoài trời", "area_m2": 1000, "soil_type": "Đất phù sa"},
    {"id": 2, "name": "Khu B - Canh tác ngoài trời", "area_m2": 1200, "soil_type": "Đất thịt nhẹ"},
    {"id": 3, "name": "Nhà màng công nghệ cao 1", "area_m2": 500, "soil_type": "Giá thể xơ dừa"},
    {"id": 4, "name": "Nhà màng công nghệ cao 2", "area_m2": 500, "soil_type": "Giá thể xơ dừa"}
]

VARIETIES = [
    {"id": 1, "name": "Bắp cải trái vụ", "type": "Rau ăn lá", "growth_days": 75, "yield_per_m2": 3.5},
    {"id": 2, "name": "Cà chua Beef", "type": "Rau ăn quả", "growth_days": 90, "yield_per_m2": 5.0},
    {"id": 3, "name": "Dưa lưới Ichiba", "type": "Trái cây", "growth_days": 70, "yield_per_m2": 2.5}
]

# ==========================================
# 2. HÀM TẠO LỊCH SỬ 3 NĂM (TRANSACTION DATA)
# ==========================================

def generate_farm_history():
    batches = []
    harvests = []
    batch_id_counter = 1
    harvest_id_counter = 1
    
    # Mốc thời gian bắt đầu từ 01/01/2024 đến hiện tại (Tháng 8/2026)
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 8, 22) 
    
    for plot in PLOTS:
        current_date = start_date
        
        while current_date < end_date:
            # Chọn giống cây ngẫu nhiên hoặc theo logic (Nhà màng thường trồng Dưa lưới/Cà chua)
            if "Nhà màng" in plot["name"]:
                variety = random.choice([v for v in VARIETIES if v["id"] in [2, 3]])
            else:
                variety = random.choice([v for v in VARIETIES if v["id"] in [1, 2]])
                
            # Tính toán ngày gieo và dự kiến thu hoạch
            seeding_date = current_date
            expected_harvest = seeding_date + timedelta(days=variety["growth_days"])
            
            # Nếu ngày thu hoạch dự kiến vượt quá hiện tại, lô này đang "growing"
            if expected_harvest > end_date:
                status = "growing"
                actual_harvest_date = None
                harvested_amount = 0
            else:
                status = "harvested"
                # Có thể thu hoạch sớm hoặc trễ 1-3 ngày
                actual_harvest_date = expected_harvest + timedelta(days=random.randint(-3, 3))
                # Sản lượng thực tế (có sai số +- 15% so với lý thuyết)
                base_yield = plot["area_m2"] * variety["yield_per_m2"]
                harvested_amount = round(base_yield * random.uniform(0.85, 1.15), 1)

            # Tạo record lô trồng (CropBatch)
            batch = {
                "id": batch_id_counter,
                "batch_code": f"B{seeding_date.strftime('%y%m')}-{plot['id']}-{variety['id']}",
                "batch_name": f"{variety['name']} vụ {seeding_date.month}/{seeding_date.year}",
                "plot_id": plot["id"],
                "variety_id": variety["id"],
                "seeding_date": seeding_date.strftime("%Y-%m-%d"),
                "expected_harvest_date": expected_harvest.strftime("%Y-%m-%d"),
                "status": status
            }
            batches.append(batch)
            
            # Tạo record thu hoạch nếu đã thu hoạch
            if status == "harvested":
                harvests.append({
                    "id": harvest_id_counter,
                    "batch_id": batch_id_counter,
                    "harvest_date": actual_harvest_date.strftime("%Y-%m-%d"),
                    "amount_kg": harvested_amount,
                    "quality": random.choices(["Tốt", "Khá", "Trung bình"], weights=[70, 20, 10])[0]
                })
                harvest_id_counter += 1
                
            batch_id_counter += 1
            
            # Thời gian nghỉ giữa các vụ (cải tạo đất 10-20 ngày)
            rest_days = random.randint(10, 20)
            current_date = (actual_harvest_date if status == "harvested" else expected_harvest) + timedelta(days=rest_days)

    return {
        "plots": PLOTS,
        "varieties": VARIETIES,
        "batches": batches,
        "harvests": harvests
    }

# Biến global lưu trữ data giả lập để import vào các Router
FARM_DATA = generate_farm_history()