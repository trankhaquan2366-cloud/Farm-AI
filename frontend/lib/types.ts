// Khớp 1-1 với các Pydantic schema trong farm_backend/app/schemas/*.py
// LƯU Ý: bản trước đó của file này đã bị ghi đè theo 1 backend giả
// (dùng field growth_days, area_sqm, planted_at...) - đã khôi phục đúng
// theo backend SQLAlchemy thật (growth_duration_days, area_m2, seeding_date...).

export type BatchStatus = 'planned' | 'growing' | 'harvested'

export interface PlantVariety {
  id: number;
  name: string;
  stock_quantity: number; // Số lượng còn trong kho
  unit: string;           // Đơn vị: kg, khay, bao...
}

export interface Plot {
  id: number
  name: string
  area_m2: number | null
  location: string | null
  soil_type: string | null
}

export interface CropBatch {
  id: number; // hoặc string tùy vào DB của bạn
  batch_code: string;  // THÊM DÒNG NÀY: khai báo thuộc tính batch_code
  batch_name?: string; // THÊM DÒNG NÀY (nếu cần): dấu ? nghĩa là có thể null/undefined
  plot_id: number;
  variety_id: number;
  seeding_date: string;
  expected_harvest_date?: string;
  status: BatchStatus;
  // ... (giữ nguyên các thuộc tính khác bạn đang có)
}

export interface Supply {
  id: number
  name: string
  type: 'phan_bon' | 'thuoc_bvtv' | 'giong' | 'khac' | null
  unit: string
  stock_quantity: number
}

export type CareLogType = 'tuoi' | 'bon_phan' | 'sau_benh' | 'khac'

export interface SupplyUsageItem {
  supply_id: number
  quantity_used: number
}

export interface CareLog {
  id: number
  batch_id: number
  log_type: CareLogType
  description: string | null
  conditions: string | null
  performed_at: string
  performed_by: number | null
  supplies_used: { id: number; supply_id: number; quantity_used: number }[]
}

export interface Harvest {
  id: number
  batch_id: number
  harvest_date: string
  quantity_kg: number
  quality_grade: string | null
  harvested_by: number | null
}

export interface Sale {
  id: number
  harvest_id: number
  customer_name: string | null
  quantity_kg: number
  unit_price: number
  sale_date: string
  total_amount: number
}

export interface AiAlertBatchItem {
  batch_code: string
  priority_score: number
  reason: string
}

export interface AiAlertOut {
  total_growing_batches: number
  priority_batches: AiAlertBatchItem[]
  disclaimer: string
  created_at: string
}

export interface AiSummaryOut {
  batch_code: string
  log_count: number
  summary: string
  issues_detected: string[]
  referenced_log_ids: number[]
  disclaimer: string
  created_at: string
}

export interface AiScheduleItem {
  day_offset: number
  date: string
  task_type: 'tuoi' | 'bon_phan' | 'kiem_tra_sau_benh'
  description: string
}

export interface AiScheduleOut {
  batch_code: string
  seeding_date: string
  expected_harvest_date: string | null
  schedule: AiScheduleItem[]
  disclaimer: string
  created_at: string
}

export type FarmingLogActivity =
  | 'Tưới nước'
  | 'Bón phân'
  | 'Phun thuốc'
  | 'Bệnh hại'
  | 'Thu hoạch'
  | 'Khác'

export interface FarmingLog {
  id: number
  batch_id: number
  log_date: string
  activity_type: FarmingLogActivity
  description: string
  image_url: string | null
}

export interface AiAdvisorResponse {
  answer: string
  disclaimer: string
  generated_at: string
}
// ============================================================
// BỔ SUNG: Truy xuất nguồn gốc — khớp 1-1 với app/schemas/traceability.py
// Dán khối này vào cuối file frontend/lib/types.ts hiện có.
// ============================================================

export interface TraceSupplyUsed {
  supply_name: string
  quantity_used: number
  unit: string
}

export interface TraceCareLog {
  log_type: CareLogType
  description: string | null
  conditions: string | null
  performed_at: string
  supplies_used: TraceSupplyUsed[]
}

export interface TraceSale {
  customer_name: string | null
  quantity_kg: number
  unit_price: number
  sale_date: string
}

export interface TraceHarvest {
  harvest_date: string
  quantity_kg: number
  quality_grade: string | null
  sales: TraceSale[]
}

export interface TraceabilityOut {
  batch_code: string
  status: BatchStatus
  seeding_date: string
  expected_harvest_date: string | null
  plot_name: string
  variety_name: string
  care_logs: TraceCareLog[]
  harvests: TraceHarvest[]
}

export interface PlantVariety {
  id: number
  name: string
  category?: string
  growth_duration_days: number
  stock_quantity: number // Thêm số lượng tồn kho
  unit: string           // Thêm đơn vị (kg, khay, bao...)
}