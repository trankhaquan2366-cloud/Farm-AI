import { ApiError } from '@/lib/api'

/**
 * Nhãn hiển thị khi backend trả kết quả dự phòng (ai_available === false)
 * thay vì nội dung do mô hình AI sinh ra.
 */
export const AI_FALLBACK_LABEL = 'Kết quả dự phòng, không do AI sinh'

/**
 * Phân loại lỗi khi gọi các API AI để hiển thị thông báo đúng bản chất:
 * - 429: hết hạn mức gọi AI (quota), khác với lỗi mạng.
 * - 5xx của AI (502/503/504): dịch vụ AI tạm thời không khả dụng.
 * - Lỗi mạng (TypeError khi fetch, AbortError): không kết nối được máy chủ.
 * - Các lỗi khác: giữ nguyên thông điệp backend trả về.
 */
export function describeAiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Đã hết hạn mức gọi AI. Vui lòng chờ hạn mức được làm mới rồi thử lại.'
    }
    if (error.status === 503 || error.status === 504) {
      return 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.'
    }
    return error.message || 'Không thể tải kết quả AI. Vui lòng thử lại.'
  }
  if (error instanceof TypeError) {
    return 'Không kết nối được máy chủ. Hãy kiểm tra kết nối mạng rồi thử lại.'
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Yêu cầu AI bị hủy do quá thời gian chờ. Vui lòng thử lại.'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Không thể tải kết quả AI. Vui lòng thử lại.'
}
