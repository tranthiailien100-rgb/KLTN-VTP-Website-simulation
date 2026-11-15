// ============================================================================
// NHỊP ĐỘ DEMO — sửa file này để chỉnh tốc độ tua nhanh và lượng toast thông báo.
//
// Đồng hồ cơ bản: 1 giây thực = DEFAULT_SPEED phút mô phỏng (bên dưới, mặc định 50).
// Mỗi mốc trong src/config/journeys.js có thể khai báo `pace` cho KHOẢNG CHỜ TRƯỚC mốc đó:
//   'slow'   — khoảnh khắc đáng xem (bưu tá đến nhà, lấy hàng, chặng cuối, giao hàng)
//   'fast'   — nằm kho, trung chuyển liên tỉnh (không có gì để xem, nhất là ở giao diện cũ)
//   không ghi — 'normal'
// Hai giao diện dùng CHUNG đồng hồ này nên vẫn so sánh công bằng.
// ============================================================================
// Tốc độ cơ bản: 1 giây thực = 50 phút mô phỏng (nút 0,5×–4× của bảng điều khiển nhân với số này).
export const DEFAULT_SPEED = 50;

export const PACE = {
  slow: 0.4, // ≈ 20 phút mô phỏng / giây thực
  normal: 1, // ≈ 50 phút / giây
  fast: 4, // ≈ 200 phút / giây
};

// Lúc CSKH đang xử lý (giữ đơn) chạy ở nhịp thường để người xem kịp đọc cảnh báo.
export const HOLD_PACE = PACE.normal;

// ---------------------------------------------------------------------------
// TOAST THÔNG BÁO (chỉ giao diện mới). Chuông thông báo vẫn giữ ĐẦY ĐỦ mọi thông báo.
// ---------------------------------------------------------------------------
export const TOAST = {
  // TẠM TẮT toast bật lên (người dùng thấy rối mắt, đè lên phần hành trình cạnh bản đồ).
  // Thông báo vẫn đầy đủ trong CHUÔNG ở header và trên dòng thời gian. Đổi thành true để bật lại.
  enabled: false,
  durationMs: 5000, // mỗi toast đứng bao lâu
  maxDesktop: 2, // tối đa bao nhiêu toast cùng lúc trên máy tính
  maxMobile: 1, // ... trên điện thoại
  reminderQuietMs: 4000, // toast "nhắc định kỳ" chỉ bật khi đã 4 giây thực không có toast nào
};
