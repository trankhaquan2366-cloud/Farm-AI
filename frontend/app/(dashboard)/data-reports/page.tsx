'use client'

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { Select } from '@base-ui/react/select'
import useSWR from 'swr'
import ExcelJS from 'exceljs'
import {
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Package,
  Sprout,
  TableProperties,
  Upload,
  X,
} from 'lucide-react'
import { api, ApiError, fetcher } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getUserRole } from '@/lib/utils'

type ImportKind = 'supplies' | 'devices' | 'varieties' | 'plots'
type ApiRecord = Record<string, unknown>
type ReportKey = 'inventory' | 'logs' | 'forecast'
type ReportRange = { from: string; to: string }
type ForecastCycle = 'all' | '30' | '60' | '90' | '180'

interface MockPreviewData {
  id: number
  values: Record<string, string>
  valid: boolean
  error?: string
}

type ImportRow = MockPreviewData & { saved?: boolean }

const IMPORT_OPTIONS: Array<{ value: ImportKind; label: string; icon: typeof Package }> = [
  { value: 'supplies', label: 'Vật tư nông nghiệp', icon: Package },
  { value: 'devices', label: 'Thiết bị IoT', icon: CircleHelp },
  { value: 'varieties', label: 'Giống cây', icon: Sprout },
  { value: 'plots', label: 'Lô đất', icon: BarChart3 },
]

const TEMPLATE_HEADERS: Record<ImportKind, string[]> = {
  supplies: [
    'code', 'name', 'category', 'unit', 'initial_stock', 'min_threshold',
    'initial_expiry_date', 'location', 'usage_notes', 'storage_notes',
  ],
  devices: ['device_code', 'name', 'device_type', 'plot_code', 'location'],
  varieties: [
    'code', 'name', 'category', 'supplier', 'stock_quantity', 'unit',
    'growth_days', 'description',
  ],
  plots: [
    'code', 'name', 'area', 'soil_type', 'location', 'status',
    'cultivation_model', 'irrigation_systems', 'ph_current', 'ec_ms_cm',
    'previous_crop', 'description',
  ],
}

const IMPORT_ENDPOINT: Record<Exclude<ImportKind, 'devices'>, string> = {
  supplies: '/api/supplies',
  varieties: '/api/varieties',
  plots: '/api/plots',
}

const REPORTS: Array<{
  key: ReportKey
  title: string
  description: string
  icon: typeof Package
  tone: string
  source: string
  dateFields: string[]
}> = [
  {
    key: 'inventory',
    title: 'Báo cáo Tồn kho Vật tư',
    description: 'Ảnh chụp tồn kho hiện tại: phân bón, thuốc và hạt giống.',
    icon: Package,
    tone: 'bg-emerald-50 text-emerald-800',
    source: '/api/supplies',
    dateFields: [],
  },
  {
    key: 'logs',
    title: 'Tổng hợp Nhật ký Canh tác',
    description: 'Lịch sử chăm sóc trên các lô trồng trong khoảng thời gian chọn.',
    icon: FileText,
    tone: 'bg-sky-50 text-sky-800',
    source: '/api/care-logs',
    dateFields: ['log_date', 'created_at', 'date'],
  },
  {
    key: 'forecast',
    title: 'Dự báo Năng suất Thu hoạch',
    description: 'Các mẻ gieo dự kiến đến kỳ thu hoạch trong khoảng thời gian chọn.',
    icon: Sprout,
    tone: 'bg-amber-50 text-amber-800',
    source: '/api/crop-batches',
    dateFields: ['expected_harvest_date', 'harvest_date'],
  },
]

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'
const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-slate-700'

function unwrapRecords(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is ApiRecord => typeof item === 'object' && item !== null && !Array.isArray(item),
    )
  }
  if (!data || typeof data !== 'object') return []
  for (const key of ['data', 'items', 'results', 'logs', 'batches', 'supplies']) {
    const value = (data as ApiRecord)[key]
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is ApiRecord =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      )
    }
  }
  return []
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function getValue(row: Record<string, string>, ...aliases: string[]) {
  const keys = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]))
  for (const alias of aliases) {
    const value = keys.get(normalizeHeader(alias))
    if (value !== undefined && value.trim() !== '') return value.trim()
  }
  return ''
}

function numberValue(value: string, fallback = 0) {
  if (!value) return fallback
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function supplyCategory(value: string) {
  const category = normalizeHeader(value)
  const categories: Record<string, string> = {
    phan_bon: 'phan_bon',
    phan_huu_co: 'phan_bon',
    thuoc_bvtv: 'thuoc_bvtv',
    thuoc_bao_ve_thuc_vat: 'thuoc_bvtv',
    giong: 'giong',
    hat_giong: 'giong',
    dung_cu: 'dung_cu',
    may_moc: 'dung_cu',
    khac: 'khac',
    nhien_lieu: 'khac',
  }
  return categories[category] ?? category
}

function validateImportRow(kind: ImportKind, row: Record<string, string>) {
  if (kind === 'devices') {
    const code = getValue(row, 'device_code', 'ma_thiet_bi', 'code')
    const name = getValue(row, 'name', 'ten_thiet_bi')
    return code && name ? '' : 'Thiếu mã thiết bị hoặc tên thiết bị.'
  }
  if (kind === 'supplies') {
    const name = getValue(row, 'name', 'ten_vat_tu', 'ten')
    const unit = getValue(row, 'unit', 'don_vi', 'don_vi_tinh')
    const category = supplyCategory(getValue(row, 'category', 'phan_loai'))
    const stock = numberValue(getValue(row, 'initial_stock', 'quantity', 'ton_kho'), 0)
    const threshold = numberValue(getValue(row, 'min_threshold', 'minimum_stock', 'ton_toi_thieu'), 0)
    if (!name || !unit) return 'Cần có tên vật tư và đơn vị tính.'
    if (category && !['phan_bon', 'thuoc_bvtv', 'giong', 'dung_cu', 'khac'].includes(category)) {
      return 'Phân loại vật tư không hợp lệ. Dùng phan_bon, thuoc_bvtv, giong, dung_cu hoặc khac.'
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(threshold) || threshold < 0) {
      return 'Tồn kho và mức tối thiểu phải là số không âm.'
    }
  }
  if (kind === 'varieties') {
    const name = getValue(row, 'name', 'ten_giong', 'ten')
    const growth = getValue(row, 'growth_days', 'growth_duration_days', 'chu_ky_sinh_truong')
    if (!name) return 'Cần có tên giống cây.'
    if (growth && (!Number.isFinite(numberValue(growth)) || numberValue(growth) <= 0)) {
      return 'Chu kỳ sinh trưởng phải là số ngày lớn hơn 0.'
    }
  }
  if (kind === 'plots') {
    const code = getValue(row, 'code', 'ma_lo_dat')
    const name = getValue(row, 'name', 'ten_lo_dat', 'ten')
    const area = numberValue(getValue(row, 'area', 'dien_tich'))
    if (!code || !name) return 'Cần có mã lô đất và tên lô đất.'
    if (!Number.isFinite(area) || area <= 0) return 'Diện tích phải là số lớn hơn 0.'
    const ph = getValue(row, 'ph_current', 'ph')
    if (ph && (!Number.isFinite(numberValue(ph)) || numberValue(ph) < 1 || numberValue(ph) > 14)) {
      return 'pH phải nằm trong khoảng 1 đến 14.'
    }
  }
  return ''
}

function mapImportPayload(kind: Exclude<ImportKind, 'devices'>, row: Record<string, string>) {
  if (kind === 'supplies') {
    return {
      code: getValue(row, 'code', 'ma_vat_tu') || null,
      name: getValue(row, 'name', 'ten_vat_tu', 'ten'),
      category: supplyCategory(getValue(row, 'category', 'phan_loai') || 'khac'),
      unit: getValue(row, 'unit', 'don_vi', 'don_vi_tinh'),
      initial_stock: numberValue(getValue(row, 'initial_stock', 'quantity', 'ton_kho'), 0),
      min_threshold: numberValue(getValue(row, 'min_threshold', 'minimum_stock', 'ton_toi_thieu'), 0),
      initial_expiry_date: getValue(row, 'initial_expiry_date', 'expiry_date', 'han_su_dung') || null,
      location: getValue(row, 'location', 'vi_tri_kho') || null,
      usage_notes: getValue(row, 'usage_notes', 'ghi_chu_su_dung') || null,
      storage_notes: getValue(row, 'storage_notes', 'ghi_chu_bao_quan') || null,
    }
  }
  if (kind === 'varieties') {
    const growthDays = getValue(row, 'growth_days', 'growth_duration_days', 'chu_ky_sinh_truong')
    const stock = getValue(row, 'stock_quantity', 'quantity', 'ton_kho')
    return {
      code: getValue(row, 'code', 'ma_giong') || null,
      name: getValue(row, 'name', 'ten_giong', 'ten'),
      category: getValue(row, 'category', 'phan_loai') || null,
      supplier: getValue(row, 'supplier', 'nha_cung_cap') || null,
      stock_quantity: stock ? numberValue(stock) : 0,
      unit: getValue(row, 'unit', 'don_vi', 'don_vi_tinh') || 'kg',
      growth_days: growthDays ? numberValue(growthDays) : null,
      description: getValue(row, 'description', 'mo_ta') || null,
    }
  }
  const irrigation = getValue(row, 'irrigation_systems', 'he_thong_tuoi')
  const ph = getValue(row, 'ph_current', 'ph')
  const ec = getValue(row, 'ec_ms_cm', 'ec')
  return {
    code: getValue(row, 'code', 'ma_lo_dat'),
    name: getValue(row, 'name', 'ten_lo_dat', 'ten'),
    area: numberValue(getValue(row, 'area', 'dien_tich')),
    soil_type: getValue(row, 'soil_type', 'loai_dat') || 'Đất thịt',
    location: getValue(row, 'location', 'vi_tri') || null,
    status: getValue(row, 'status', 'trang_thai') || 'Đang nghỉ',
    cultivation_model: getValue(row, 'cultivation_model', 'mo_hinh_canh_tac') || null,
    irrigation_systems: irrigation ? irrigation.split(/[|;,]/).map((value) => value.trim()).filter(Boolean) : [],
    ph_current: ph ? numberValue(ph) : null,
    ec_ms_cm: ec ? numberValue(ec) : null,
    previous_crop: getValue(row, 'previous_crop', 'cay_trong_truoc') || null,
    description: getValue(row, 'description', 'ghi_chu') || null,
  }
}

function cellToString(value: ExcelJS.CellValue | undefined): string {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join('')
    }
  }
  return String(value)
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

function recordsFromRows(rows: string[][], kind: ImportKind): ImportRow[] {
  if (rows.length < 2) throw new Error('Tệp cần có dòng tiêu đề và ít nhất một dòng dữ liệu.')
  if (rows.length > 5001) throw new Error('Tệp vượt giới hạn 5.000 dòng dữ liệu mỗi lần nhập.')
  const headers = rows[0].map((header) => header.trim())
  if (headers.some((header) => !header)) throw new Error('Tệp có tiêu đề cột bị trống.')
  if (headers.length > 100) throw new Error('Tệp vượt giới hạn 100 cột dữ liệu.')
  return rows.slice(1).map((cells, index) => {
    const values = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? '']))
    const error = validateImportRow(kind, values)
    return { id: index + 1, values, valid: !error, ...(error ? { error } : {}) }
  })
}

function dateForRecord(record: ApiRecord, fields: string[]) {
  for (const field of fields) {
    const value = record[field]
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    }
  }
  return ''
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function filterByRange(records: ApiRecord[], fields: string[], range: ReportRange) {
  if (!range.from && !range.to) return records
  return records.filter((record) => {
    const date = dateForRecord(record, fields)
    if (!date) return false
    return (!range.from || date >= range.from) && (!range.to || date <= range.to)
  })
}

function reportRows(key: ReportKey, records: ApiRecord[]) {
  if (key === 'inventory') {
    return records.map((record) => ({
      'Mã vật tư': record.code ?? '',
      'Tên vật tư': record.name ?? '',
      'Phân loại': record.category ?? '',
      'Tồn kho': record.quantity ?? record.stock_quantity ?? '',
      'Đơn vị': record.unit ?? '',
      'Mức tối thiểu': record.min_threshold ?? '',
      'Vị trí': record.location ?? '',
    }))
  }
  if (key === 'logs') {
    return records.map((record) => ({
      'Ngày ghi': record.log_date ?? record.created_at ?? record.date ?? '',
      'Mẻ gieo': record.batch_name ?? record.batch_code ?? record.crop_batch_id ?? '',
      'Hoạt động': record.action_type ?? record.activity_type ?? '',
      'Nội dung': record.description ?? record.notes ?? '',
      'Số lượng': record.quantity ?? '',
      'Người ghi': record.created_by ?? '',
    }))
  }
  return records.map((record) => ({
    'Mã lô trồng': record.batch_code ?? record.code ?? '',
    'Tên mẻ': record.batch_name ?? record.name ?? '',
    'Giống cây': record.variety_name ?? record.variety_id ?? '',
    'Lô đất': record.plot_name ?? record.plot_id ?? '',
    'Ngày gieo': record.sow_date ?? record.planting_date ?? '',
    'Ngày thu hoạch dự kiến': record.expected_harvest_date ?? '',
    'Số lượng giống': record.quantity_used ?? '',
    'Trạng thái': record.status ?? '',
  }))
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function DataReportsPage() {
  const [importKind, setImportKind] = useState<ImportKind>('supplies')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [exportMessage, setExportMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const [forecastCycle, setForecastCycle] = useState<ForecastCycle>('all')
  const [printReportKey, setPrintReportKey] = useState<ReportKey | null>(null)
  const [ranges, setRanges] = useState<Record<ReportKey, ReportRange>>({
    inventory: { from: '', to: '' },
    logs: { from: '', to: '' },
    forecast: { from: '', to: '' },
  })
  const fileInput = useRef<HTMLInputElement>(null)
  const suppliesResult = useSWR<unknown>('/api/supplies', fetcher)
  const logsResult = useSWR<unknown>('/api/care-logs', fetcher)
  const batchesResult = useSWR<unknown>('/api/crop-batches', fetcher)

  const canImport = hasPermission(role, PERMISSIONS.SUPPLY_CREATE)
  const validCount = rows.filter((row) => row.valid && !row.saved).length
  const reportRecords = useMemo(
    () => ({
      inventory: unwrapRecords(suppliesResult.data),
      logs: unwrapRecords(logsResult.data),
      forecast: unwrapRecords(batchesResult.data),
    }),
    [suppliesResult.data, logsResult.data, batchesResult.data],
  )

  useEffect(() => {
    setRole(getUserRole())
  }, [])

  useEffect(() => {
    if (!printReportKey) return
    const resetPrint = () => setPrintReportKey(null)
    window.addEventListener('afterprint', resetPrint)
    const timeoutId = window.setTimeout(() => window.print(), 0)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('afterprint', resetPrint)
    }
  }, [printReportKey])

  async function readFile(file: File) {
    setImportError('')
    setImportMessage('')
    setRows([])
    setFileName('')
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setImportError('Chỉ nhận tệp .xlsx hoặc .csv.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('Tệp vượt quá giới hạn 10 MB.')
      return
    }

    setIsReading(true)
    try {
      let rawRows: string[][]
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text()
        rawRows = parseCsv(text.replace(/^\uFEFF/, ''))
      } else {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(await file.arrayBuffer())
        const sheet = workbook.worksheets[0]
        if (!sheet) throw new Error('Không tìm thấy trang tính trong tệp.')
        rawRows = []
        sheet.eachRow({ includeEmpty: false }, (excelRow) => {
          const cells: string[] = []
          excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            cells[columnNumber - 1] = cellToString(cell.value)
          })
          rawRows.push(cells)
        })
      }
      const parsed = recordsFromRows(rawRows, importKind)
      setRows(parsed)
      setFileName(file.name)
      setImportMessage(`Đã đọc ${parsed.length} dòng. Kiểm tra dữ liệu trước khi lưu.`)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Không thể đọc nội dung tệp.')
    } finally {
      setIsReading(false)
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void readFile(file)
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void readFile(file)
  }

  async function downloadTemplate() {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Mau nhap')
    sheet.addRow(TEMPLATE_HEADERS[importKind])
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }
    const examples: Record<ImportKind, string[]> = {
      supplies: ['VT-001', 'Phân hữu cơ', 'phan_bon', 'kg', '25', '5', '', 'Kho A', '', 'Để nơi khô ráo'],
      devices: ['IOT-001', 'Cảm biến độ ẩm', 'soil_moisture', 'LO-001', 'Khu A'],
      varieties: ['GIONG-001', 'Cải ngọt', 'Rau ăn lá', '', '0', 'gram', '35', 'Giống sinh trưởng nhanh'],
      plots: ['LO-001', 'Lô rau A', '1200', 'Đất thịt', 'Khu A', 'Đang canh tác', 'Đất ngoài trời', 'Nhỏ giọt', '6.5', '1.2', 'Cải xanh', ''],
    }
    sheet.addRow(examples[importKind])
    sheet.columns.forEach((column) => {
      column.width = Math.min(Math.max(column.header?.toString().length ?? 14, 16), 28)
    })
    const buffer = await workbook.xlsx.writeBuffer()
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `mau-nhap-${importKind}.xlsx`,
    )
  }

  async function saveImport() {
    if (importKind === 'devices') {
      setImportError('Hệ thống chưa có API lưu thiết bị IoT. Dữ liệu đã được đọc nhưng chưa thể ghi vào hệ thống.')
      return
    }
    if (!canImport) {
      setImportError('Vai trò hiện tại không có quyền nhập dữ liệu danh mục.')
      return
    }
    const failedRows: ImportRow[] = []
    let savedCount = 0
    setIsSaving(true)
    setImportError('')
    setImportMessage('')
    try {
      const candidates = rows.filter((candidate) => candidate.valid && !candidate.saved)
      for (let offset = 0; offset < candidates.length; offset += 10) {
        const results = await Promise.all(candidates.slice(offset, offset + 10).map(async (row) => {
          try {
            await api(IMPORT_ENDPOINT[importKind], {
              method: 'POST',
              body: mapImportPayload(importKind, row.values),
            })
            return { row, reason: '' }
          } catch (error) {
            const reason = error instanceof ApiError ? error.message : 'Không thể lưu dòng dữ liệu này.'
            return { row, reason }
          }
        }))
        for (const result of results) {
          if (result.reason) failedRows.push({ ...result.row, valid: false, error: result.reason })
          else savedCount += 1
        }
      }
      const invalidRows = rows.filter((row) => !row.valid)
      if (failedRows.length || invalidRows.length) {
        setRows([...invalidRows, ...failedRows])
        setImportMessage(
          savedCount
            ? `Đã lưu ${savedCount} dòng. Còn ${invalidRows.length + failedRows.length} dòng cần xử lý.`
            : '',
        )
        if (failedRows.length) setImportError(`${failedRows.length} dòng không lưu được. Xem chi tiết trong bảng.`)
      } else {
        if (importKind === 'supplies') await suppliesResult.mutate()
        setRows([])
        setFileName('')
        setImportMessage(`Đã lưu thành công ${savedCount} dòng vào hệ thống.`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  function updateRange(key: ReportKey, field: keyof ReportRange, value: string) {
    setRanges((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))
    setExportMessage('')
    setExportError('')
  }

  function getReportData(key: ReportKey) {
    if (key === 'inventory') return reportRecords.inventory
    if (key === 'forecast') {
      if (forecastCycle === 'all') return reportRecords.forecast
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + Number(forecastCycle))
      const startDate = formatLocalDate(start)
      const endDate = formatLocalDate(end)
      return reportRecords.forecast.filter((record) => {
        const harvestDate = dateForRecord(record, ['expected_harvest_date', 'harvest_date'])
        return harvestDate >= startDate && harvestDate <= endDate
      })
    }
    const report = REPORTS.find((item) => item.key === key)
    if (!report) return []
    return filterByRange(reportRecords[key], report.dateFields, ranges[key])
  }

  async function downloadReportExcel(key: ReportKey) {
    const report = REPORTS.find((item) => item.key === key)
    if (!report) return
    setExportError('')
    setExportMessage('')
    try {
      const data = reportRows(key, getReportData(key))
      if (!data.length) {
        setExportMessage('Không có dữ liệu phù hợp để xuất trong khoảng thời gian này.')
        return
      }
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Bao cao')
      const headers = Object.keys(data[0])
      sheet.addRow(headers)
      data.forEach((record) =>
        sheet.addRow(headers.map((header) => String(record[header as keyof typeof record] ?? ''))),
      )
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }
      sheet.columns.forEach((column) => { column.width = 22 })
      const buffer = await workbook.xlsx.writeBuffer()
      downloadBlob(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${key}-greenfarm-${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
      setExportMessage('Đã tải báo cáo Excel.')
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không thể tạo tệp Excel.')
    }
  }

  function downloadReportPdf(key: ReportKey) {
    const report = REPORTS.find((item) => item.key === key)
    if (!report) return
    if (!getReportData(key).length) {
      setExportMessage('Không có dữ liệu phù hợp để in trong khoảng thời gian này.')
      return
    }
    setExportError('')
    setExportMessage('Hộp thoại in đang mở. Chọn “Lưu dưới dạng PDF” để lưu báo cáo.')
    setPrintReportKey(key)
  }

  function reportError(key: ReportKey) {
    if (key === 'inventory') return suppliesResult.error
    if (key === 'logs') return logsResult.error
    return batchesResult.error
  }

  function reportLoading(key: ReportKey) {
    if (key === 'inventory') return suppliesResult.isLoading
    if (key === 'logs') return logsResult.isLoading
    return batchesResult.isLoading
  }

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-800">
            <FileSpreadsheet className="size-4" />
            Nghiệp vụ dữ liệu trang trại
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Trung tâm Dữ liệu &amp; Báo cáo
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Nhập danh mục theo lô và xuất dữ liệu phục vụ vận hành, kiểm kê, đánh giá mùa vụ.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 sm:self-auto">
          <CheckCircle2 className="size-4" />
          Kết nối dữ liệu hệ thống
        </div>
      </header>

      <Tabs.Root defaultValue="import" className="space-y-6">
        <Tabs.List className="flex gap-6 border-b border-slate-200">
          <Tabs.Tab
            value="import"
            className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 data-[selected]:border-emerald-700 data-[selected]:text-emerald-900"
          >
            <Upload className="size-4" /> Nhập dữ liệu
          </Tabs.Tab>
          <Tabs.Tab
            value="export"
            className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 data-[selected]:border-emerald-700 data-[selected]:text-emerald-900"
          >
            <FileDown className="size-4" /> Báo cáo xuất ra
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="import" className="space-y-6 outline-none">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
            <div>
              <div className="max-w-xl">
                <Select.Root
                  value={importKind}
                  disabled={isReading || isSaving}
                  items={IMPORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  onValueChange={(value) => {
                    if (typeof value !== 'string') return
                    setImportKind(value as ImportKind)
                    setRows([])
                    setFileName('')
                    setImportMessage('')
                    setImportError('')
                  }}
                >
                  <Select.Label className={LABEL_CLASS}>Loại dữ liệu cần nhập</Select.Label>
                  <Select.Trigger
                    id="import-kind"
                    className={`${FIELD_CLASS} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Select.Value />
                    <Select.Icon className="ml-3 text-slate-500">
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner alignItemWithTrigger={false} className="z-50">
                      <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl outline-none">
                        <Select.List>
                          {IMPORT_OPTIONS.map((option) => (
                            <Select.Item
                              key={option.value}
                              value={option.value}
                              className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-900 data-[selected]:font-semibold data-[selected]:text-emerald-900"
                            >
                              <Select.ItemText>{option.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Tải mẫu trước để dùng đúng tên cột và định dạng dữ liệu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void downloadTemplate()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <ArrowDownToLine className="size-4" /> Tải file mẫu (.xlsx)
            </button>
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors sm:px-8 ${
              isDragging ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-slate-50/80 hover:border-emerald-500 hover:bg-emerald-50/40'
            }`}
          >
            <input ref={fileInput} type="file" accept=".xlsx,.csv" className="sr-only" onChange={onFileChange} />
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200">
              {isReading ? <LoaderCircle className="size-6 animate-spin" /> : <CloudUpload className="size-6" />}
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {fileName || 'Thả tệp Excel hoặc CSV vào đây'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Tệp tối đa 10 MB · Hỗ trợ .xlsx và .csv</p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={isReading}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
            >
              <Upload className="size-4" /> Chọn tệp từ thiết bị
            </button>
          </div>

          {importKind === 'devices' && (
            <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Hệ thống đang cập nhật API thiết bị IoT. Bạn có thể tải mẫu và xem trước dữ liệu, nhưng chưa thể lưu vào hệ thống.
            </p>
          )}
          {importMessage && <p className="flex items-center gap-2 text-sm text-emerald-800" role="status"><Check className="size-4" />{importMessage}</p>}
          {importError && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert"><AlertCircle className="size-4 shrink-0" />{importError}</p>}

          {rows.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="font-semibold text-slate-900">Kiểm tra dữ liệu trước khi nhập</h2>
                  <p className="mt-1 text-xs text-slate-500">{fileName} · {rows.length} dòng · {validCount} dòng hợp lệ</p>
                </div>
                <span className="text-xs text-slate-600">Hiển thị tối đa 5 dòng đầu tiên</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th scope="col" className="px-4 py-3">Dòng</th>
                      {Object.keys(rows[0].values).slice(0, 5).map((header) => <th scope="col" key={header} className="px-4 py-3">{header}</th>)}
                      <th scope="col" className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 5).map((row) => (
                      <tr key={row.id} className="align-top">
                        <th scope="row" className="px-4 py-3 font-medium text-slate-600">{row.id + 1}</th>
                        {Object.keys(rows[0].values).slice(0, 5).map((header) => (
                          <td key={header} className="max-w-64 truncate px-4 py-3 text-slate-700">{row.values[header] || '—'}</td>
                        ))}
                        <td className="px-4 py-3">
                          {row.saved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><Check className="size-3" />Đã lưu</span>
                          ) : row.valid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><CheckCircle2 className="size-3" />Hợp lệ</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800" title={row.error}><X className="size-3" />{row.error || 'Lỗi định dạng'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <button type="button" onClick={() => { setRows([]); setFileName(''); setImportError(''); setImportMessage('') }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <X className="size-4" /> Bỏ tệp
                </button>
                <button
                  type="button"
                  onClick={() => void saveImport()}
                  disabled={isSaving || isReading || validCount === 0 || importKind === 'devices' || !canImport}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!canImport ? 'Vai trò hiện tại không có quyền nhập dữ liệu.' : undefined}
                >
                  {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {isSaving ? 'Đang lưu…' : 'Xác nhận & lưu hệ thống'}
                </button>
              </div>
              {!canImport && <p className="border-t border-slate-100 px-5 py-3 text-xs text-amber-800">Chỉ quản trị viên hoặc quản lý được nhập dữ liệu danh mục.</p>}
            </section>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="export" className="space-y-5 outline-none">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <TableProperties className="mt-0.5 size-4 shrink-0 text-emerald-800" />
            Chọn khoảng ngày cho nhật ký và lịch thu hoạch. Báo cáo tồn kho phản ánh số liệu hiện tại, không phải lịch sử giao dịch.
          </div>
          {exportMessage && <p className="text-sm text-emerald-800" role="status">{exportMessage}</p>}
          {exportError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{exportError}</p>}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {REPORTS.map((report) => {
              const Icon = report.icon
              const error = reportError(report.key)
              const loading = reportLoading(report.key)
              const count = getReportData(report.key).length
              const invalidDateRange =
                report.key === 'logs' &&
                Boolean(ranges.logs.from && ranges.logs.to && ranges.logs.from > ranges.logs.to)
              return (
                <article key={report.key} className="data-reports-screen-only flex min-h-[330px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-200">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex size-11 items-center justify-center rounded-xl ${report.tone}`}><Icon className="size-5" /></span>
                    {loading ? <LoaderCircle className="size-4 animate-spin text-slate-400" aria-label="Đang tải dữ liệu" /> : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{count} dòng</span>
                    )}
                  </div>
                  <h2 className="mt-5 text-base font-semibold text-slate-900">{report.title}</h2>
                  <p className="mt-2 min-h-10 text-sm leading-5 text-slate-600">{report.description}</p>
                  {error ? (
                    <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
                      Không tải được dữ liệu báo cáo. Kiểm tra kết nối hoặc quyền truy cập.
                    </p>
                  ) : null}
                  {report.key === 'logs' && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLASS} htmlFor="logs-from">Từ ngày</label>
                        <input id="logs-from" type="date" value={ranges.logs.from} onChange={(event) => updateRange('logs', 'from', event.target.value)} className={FIELD_CLASS} />
                      </div>
                      <div>
                        <label className={LABEL_CLASS} htmlFor="logs-to">Đến ngày</label>
                        <input id="logs-to" type="date" value={ranges.logs.to} onChange={(event) => updateRange('logs', 'to', event.target.value)} className={FIELD_CLASS} />
                      </div>
                    </div>
                  )}
                  {report.key === 'forecast' && (
                    <div className="mt-5">
                      <label className={LABEL_CLASS} htmlFor="forecast-cycle">Chu kỳ dự báo</label>
                      <select
                        id="forecast-cycle"
                        value={forecastCycle}
                        onChange={(event) => setForecastCycle(event.target.value as ForecastCycle)}
                        className={FIELD_CLASS}
                      >
                        <option value="30">30 ngày tới</option>
                        <option value="60">60 ngày tới</option>
                        <option value="90">90 ngày tới</option>
                        <option value="180">180 ngày tới</option>
                        <option value="all">Tất cả mẻ gieo</option>
                      </select>
                    </div>
                  )}
                  {invalidDateRange && (
                    <p className="mt-2 text-xs text-rose-700">Ngày bắt đầu phải trước ngày kết thúc.</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <button
                      type="button"
                      disabled={loading || Boolean(error) || invalidDateRange}
                      onClick={() => void downloadReportExcel(report.key)}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="size-4" /> Tải Excel
                    </button>
                    <button
                      type="button"
                      disabled={loading || Boolean(error) || invalidDateRange}
                      onClick={() => downloadReportPdf(report.key)}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileDown className="size-4" /> In PDF
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </Tabs.Panel>
      </Tabs.Root>

      {printReportKey && (() => {
        const report = REPORTS.find((item) => item.key === printReportKey)
        const data = reportRows(printReportKey, getReportData(printReportKey))
        if (!report || data.length === 0) return null
        const headers = Object.keys(data[0])
        const rangeLabel = printReportKey === 'logs'
          ? `${ranges.logs.from || 'Từ đầu'} – ${ranges.logs.to || 'hiện tại'}`
          : printReportKey === 'forecast'
            ? forecastCycle === 'all' ? 'Tất cả mẻ gieo' : `${forecastCycle} ngày tới`
            : 'Ảnh chụp tồn kho hiện tại'
        return (
          <section className="data-reports-print-only" aria-label="Bản in báo cáo">
            <h1>{report.title}</h1>
            <p>GreenFarm AI · {rangeLabel} · {data.length} dòng</p>
            <table>
              <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>
                {data.map((record, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header) => <td key={header}>{String(record[header as keyof typeof record] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })()}
    </main>
  )
}
