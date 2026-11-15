// ============================================================================
// MÃ ĐƠN DEMO — sửa file này để thêm / đổi / xóa mã.
//
//  code      : mã phiếu gửi người dùng nhập — CHỈ GỒM CHỮ SỐ, giống mã vận đơn thật.
//              Đây là số tự đặt cho bản demo, không phải mã của một đơn hàng thật.
//  flow      : 'A' = shipper đến lấy hàng, 'B' = người gửi tự mang ra bưu cục
//  scenario  : 'normal'   = chạy bình thường
//              'forgot'   = shipper quên xác nhận lấy hàng (chỉ dùng với flow 'A')
//              'misdeliver' = bưu tá báo "giao thành công" nhưng người nhận chưa nhận được hàng
//  title     : tên ngắn hiện trên thẻ gợi ý
//  story     : một câu giải thích tình huống (hiện dưới tên thẻ)
// ============================================================================
export const CODE_LENGTH = 12;

export const DEMO_CODES = [
  {
    code: '183920475610',
    flow: 'A',
    scenario: 'normal',
    title: 'Đơn 1 – Shipper đến lấy hàng',
    story: 'Bưu tá đến tận nhà lấy hàng, đơn đi Hà Nội → TP.HCM suôn sẻ.',
  },
  {
    code: '183920475627',
    flow: 'B',
    scenario: 'normal',
    title: 'Đơn 2 – Tự mang ra bưu cục',
    story: 'Bạn mang hàng ra quầy, nhân viên quét QR và cân hàng; giữa đường gặp mưa nên giao chậm.',
  },
  {
    code: '183920475634',
    flow: 'A',
    scenario: 'forgot',
    title: 'Đơn 3 – Sự cố lúc lấy hàng',
    story: 'Bưu tá lấy hàng xong nhưng quên chụp ảnh xác nhận — bạn sẽ được hỏi lại.',
  },
  {
    code: '183920475641',
    flow: 'A',
    scenario: 'misdeliver',
    title: 'Đơn 4 – Sự cố lúc giao hàng',
    story: 'Bưu tá báo “giao thành công” khi người nhận chưa nhận được hàng.',
  },
];

export const NOT_FOUND_MESSAGE = 'Không tìm thấy, hãy dùng một mã đơn demo ở trên.';

/** Bỏ mọi ký tự không phải chữ số (mã phiếu gửi chỉ gồm số). */
export function normalizeCode(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Trả về cấu hình mã demo nếu hợp lệ, ngược lại trả về null. */
export function findDemoCode(value) {
  const code = normalizeCode(value);
  return DEMO_CODES.find((d) => d.code === code) || null;
}

