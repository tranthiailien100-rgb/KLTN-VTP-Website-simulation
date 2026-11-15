// ============================================================================
// DỮ LIỆU HÀNH TRÌNH GIẢ — toàn bộ nhân vật, địa điểm, mốc thời gian đều là dữ liệu mô phỏng.
// Đơn vị `gap` = số PHÚT mô phỏng kể từ mốc trước (đồng hồ mô phỏng chạy nhanh, xem engine.js).
// ============================================================================

export const ORDER_INFO = {
  sender: { name: 'Nguyễn Minh Anh', phone: '09xx xxx 123', address: 'Số 12 ngõ 34 Trần Thái Tông, Cầu Giấy, Hà Nội' },
  receiver: { name: 'Trần Thu Hà', phone: '09xx xxx 456', address: '45 Nguyễn Thị Thập, P. Tân Phong, Quận 7, TP.HCM' },
  parcel: { desc: 'Quần áo (1 kiện)', weightKg: 1.2, service: 'Chuyển phát nhanh' },
};

// ---------- Địa điểm ----------
export const PLACES = {
  sender: { key: 'sender', kind: 'address', name: 'Địa chỉ người gửi (Cầu Giấy, Hà Nội)', short: 'Địa chỉ người gửi', lat: 21.0342, lng: 105.7893 },
  poA: { key: 'poA', kind: 'hub', name: 'Bưu cục Cầu Giấy (Hà Nội)', short: 'BC Cầu Giấy', lat: 21.0368, lng: 105.7945 },
  ttkt_hn: { key: 'ttkt_hn', kind: 'hub', name: 'Trung tâm khai thác Hà Nội', short: 'TTKT Hà Nội', lat: 21.0301, lng: 105.9312 },
  ttkt_dn: { key: 'ttkt_dn', kind: 'hub', name: 'Trung tâm khai thác Đà Nẵng', short: 'TTKT Đà Nẵng', lat: 16.0455, lng: 108.1923 },
  ttkt_hcm: { key: 'ttkt_hcm', kind: 'hub', name: 'Trung tâm khai thác TP.HCM', short: 'TTKT TP.HCM', lat: 10.8014, lng: 106.6526 },
  poB: { key: 'poB', kind: 'hub', name: 'Bưu cục Tân Thuận (Quận 7, TP.HCM)', short: 'BC Tân Thuận', lat: 10.7385, lng: 106.7205 },
  recipient: { key: 'recipient', kind: 'address', name: 'Địa chỉ người nhận (Quận 7, TP.HCM)', short: 'Địa chỉ người nhận', lat: 10.7420, lng: 106.7050 },
  // Kịch bản "giao sai": nơi bưu tá bấm "giao thành công", cách địa chỉ người nhận khoảng 1,3 km
  offsite: { key: 'offsite', kind: 'address', name: 'Đường Lê Văn Lương (cách địa chỉ người nhận ~1,3 km)', short: 'Lê Văn Lương', lat: 10.7318, lng: 106.6985 },
};

const P = PLACES;
const pt = (place, name) => ({ lat: place.lat, lng: place.lng, name: name || place.short });

// ---------- Tuyến đường (đường gấp khúc, có tên mốc để báo "hiện ở gần ...") ----------
export const ROUTES = {
  sender_poA: [pt(P.sender), { lat: 21.0355, lng: 105.7915 }, pt(P.poA)],
  poA_ttkt_hn: [pt(P.poA), { lat: 21.0402, lng: 105.8301, name: 'Hồ Tây' }, { lat: 21.0356, lng: 105.8802, name: 'Long Biên' }, pt(P.ttkt_hn)],
  hn_dn: [
    pt(P.ttkt_hn),
    { lat: 20.2539, lng: 105.975, name: 'Ninh Bình' },
    { lat: 19.8067, lng: 105.7766, name: 'Thanh Hóa' },
    { lat: 18.6735, lng: 105.6923, name: 'Vinh' },
    { lat: 18.356, lng: 105.8877, name: 'Hà Tĩnh' },
    { lat: 16.4637, lng: 107.5909, name: 'Huế' },
    pt(P.ttkt_dn),
  ],
  dn_hcm: [
    pt(P.ttkt_dn),
    { lat: 15.1214, lng: 108.8044, name: 'Quảng Ngãi' },
    { lat: 13.7829, lng: 109.2196, name: 'Quy Nhơn' },
    { lat: 12.2388, lng: 109.1967, name: 'Nha Trang' },
    { lat: 10.9289, lng: 108.1021, name: 'Phan Thiết' },
    pt(P.ttkt_hcm),
  ],
  hcm_poB: [pt(P.ttkt_hcm), { lat: 10.7812, lng: 106.6798, name: 'Quận 10' }, { lat: 10.7598, lng: 106.7005, name: 'Quận 4' }, pt(P.poB)],
  lastmile: [
    pt(P.poB),
    { lat: 10.7385, lng: 106.716, name: 'đường Huỳnh Tấn Phát' },
    { lat: 10.7402, lng: 106.712, name: 'đường Lâm Văn Bền' },
    { lat: 10.7414, lng: 106.7082, name: 'đường Nguyễn Thị Thập' },
    pt(P.recipient),
  ],
  // kịch bản "giao sai": bưu tá rẽ khỏi tuyến và bấm "giao thành công" ở chỗ khác
  lastmile_wrong: [
    pt(P.poB),
    { lat: 10.7385, lng: 106.716, name: 'đường Huỳnh Tấn Phát' },
    { lat: 10.7352, lng: 106.7075, name: 'cầu Kênh Tẻ' },
    pt(P.offsite),
  ],
  // bưu tá quay lại giao đúng địa chỉ sau khi CSKH xác minh
  offsite_recipient: [pt(P.offsite), { lat: 10.7372, lng: 106.7022, name: 'đường Nguyễn Thị Thập' }, pt(P.recipient)],
};

// ---------- Nhân vật giả ----------
export const SYSTEM = { type: 'system', role: 'Hệ thống', name: 'Viettel Post (mô phỏng)', code: null };
export const SENDER = { type: 'sender', role: 'Người gửi', name: ORDER_INFO.sender.name, code: null };
export const SHIPPER = { type: 'shipper', role: 'Bưu tá', name: 'Lê Văn Tuấn', code: 'BT-2041' };
export const COUNTER = { type: 'hub', role: 'Nhân viên quầy', name: 'Nguyễn Thị Lan', code: 'NV-0318' };
export const SORTER = { type: 'hub', role: 'Nhân viên khai thác', name: 'Tổ khai thác', code: null };
export const COURIER = { type: 'courier', role: 'Bưu tá giao hàng', name: 'Phạm Quốc Bảo', code: 'BT-7712' };
export const RECIPIENT = { type: 'recipient', role: 'Người nhận', name: ORDER_INFO.receiver.name, code: null };

// ---------- Các giai đoạn hiển thị trên thanh tiến trình ----------
export const STAGES = {
  A: ['Tạo đơn', 'Lấy hàng', 'Nhập bưu cục', 'Trung chuyển', 'Đang giao', 'Hoàn tất'],
  B: ['Tạo đơn', 'Gửi tại quầy', 'Nhập bưu cục', 'Trung chuyển', 'Đang giao', 'Hoàn tất'],
};

// ============================================================================
// CÁC MỐC (steps)
//  id/tag   : tag dùng để bảng điều khiển tìm mốc ('arrived' | 'pickup' | 'hubin')
//  gap      : phút mô phỏng sau mốc trước
//  stage    : chỉ số giai đoạn (0..5)
//  place    : khóa địa điểm
//  travel   : khóa tuyến — hàng DI CHUYỂN trên tuyến này trong khoảng `gap` TRƯỚC khi mốc này xảy ra
//  departure: mốc "xuất kho" (dùng cho thông báo "giờ xuất kho dự kiến")
//  major    : mốc đổi trạng thái chính (chế độ "chỉ khi đổi trạng thái" chỉ báo các mốc này)
//  legacy   : {text, lag, place?} dòng hiển thị ở giao diện tra cứu CŨ, lag = phút chậm so với mốc thật,
//             place = địa điểm ghi ở giao diện cũ nếu khác mốc thật
//  fx       : hiệu ứng đặc biệt — 'pickup_confirm' | 'open_prompt' | 'check_pickup'
//             | 'send_otp' (gửi mã nhận hàng cho người nhận) | 'delivery_confirm' (OTP khớp + GPS khớp)
//             | 'open_delivery_prompt' (hỏi người nhận) | 'finish'
//  needs    : 'delivery' = chỉ được phát hành khi đã có xác nhận nhận hàng (khóa bước ở đầu nhận)
//  delay    : {min, reason} chậm trễ có lý do, được báo khi bắt đầu chặng
// ============================================================================
const created = (flow) => ({
  id: 'created',
  gap: 0,
  stage: 0,
  status: 'Đã tạo đơn',
  title: flow === 'B' ? 'Đã tạo đơn — mã QR để gửi tại quầy' : 'Đã tạo đơn hàng',
  detail:
    flow === 'B'
      ? 'Đơn được tạo trước. Mang hàng và mã QR đến bưu cục để nhân viên quét.'
      : 'Đơn đã được ghi nhận, hệ thống đang tìm bưu tá gần bạn.',
  place: 'sender',
  actor: SYSTEM,
  major: true,
  legacy: { text: 'Tạo đơn hàng thành công', lag: 0 },
});

const flowAHead = () => [
  created('A'),
  {
    id: 'assigned', gap: 40, stage: 1, status: 'Shipper đang đến lấy hàng', title: 'Shipper đã nhận đơn',
    detail: 'Bưu tá Lê Văn Tuấn sẽ đến lấy hàng trong khoảng 1 giờ.',
    place: 'sender', actor: SHIPPER, major: true,
  },
  {
    id: 'arrived', tag: 'arrived', gap: 55, stage: 1, status: 'Shipper đã đến lấy hàng', title: 'Shipper đã đến điểm lấy hàng',
    detail: 'Vị trí GPS của bưu tá trùng với địa chỉ người gửi.',
    place: 'sender', actor: SHIPPER,
  },
  {
    id: 'pickup_photo', tag: 'pickup', gap: 40, stage: 1, status: 'Đã lấy hàng', title: 'Shipper đã lấy hàng — có ảnh và chữ ký người gửi',
    detail: 'Bưu tá chụp ảnh hàng tại địa chỉ người gửi; người gửi ký xác nhận bàn giao trên máy của bưu tá.',
    place: 'sender', actor: SHIPPER, photo: { kind: 'pickup', signature: 'sender' }, handover: true, major: true, fx: ['pickup_confirm'],
  },
  {
    id: 'hub_in_a', tag: 'hubin', gap: 60, stage: 2, status: 'Đã nhập bưu cục gửi', title: 'Hàng đã nhập Bưu cục Cầu Giấy',
    detail: 'Nhân viên bưu cục quét nhập và chụp ảnh hàng.',
    place: 'poA', actor: COUNTER, photo: { kind: 'hub_in' }, handover: true, major: true, travel: 'sender_poA',
    fx: ['check_pickup'], legacy: { text: 'Nhận hàng tại bưu cục gửi', lag: 60 },
  },
];

// Biến thể "shipper quên xác nhận": thay mốc chụp ảnh bằng mốc shipper rời đi mà chưa có ảnh.
export const forgotPickupStep = () => ({
  id: 'departed_no_photo', tag: 'pickup', gap: 40, stage: 1, status: 'Shipper rời điểm lấy hàng', title: 'Shipper rời địa chỉ người gửi nhưng chưa cập nhật ảnh lấy hàng',
  detail: 'GPS cho thấy bưu tá đã rời đi, hệ thống chưa nhận được ảnh và chữ ký người gửi xác nhận lấy hàng.',
  place: 'sender', actor: SHIPPER, tone: 'warn', fx: ['open_prompt'],
});

const flowBHead = () => [
  created('B'),
  {
    id: 'qr_scanned', gap: 60, stage: 1, status: 'Đã quét QR tại quầy', title: 'Nhân viên đã quét mã QR tại quầy',
    detail: 'Bưu cục Cầu Giấy tiếp nhận đơn của bạn.',
    place: 'poA', actor: COUNTER, photo: { kind: 'qr' }, major: true, handover: true,
  },
  {
    id: 'weigh_photo', tag: 'pickup', gap: 10, stage: 1, status: 'Đã cân hàng', title: 'Ảnh hàng trên cân — 1,2 kg, người gửi đã ký',
    detail: 'Nhân viên cân hàng và chụp ảnh kèm cân nặng; người gửi ký xác nhận bàn giao trên màn hình ký tại quầy.',
    place: 'poA', actor: COUNTER, photo: { kind: 'weigh', weight: 1.2, signature: 'sender' }, handover: true, fx: ['pickup_confirm'],
  },
  {
    id: 'e_receipt', tag: 'hubin', gap: 5, stage: 2, status: 'Đã nhập bưu cục gửi', title: 'Đã phát hành biên nhận điện tử',
    detail: 'Biên nhận điện tử đã gửi cho người gửi. Hàng được nhập bưu cục.',
    place: 'poA', actor: COUNTER, photo: { kind: 'receipt' }, major: true, handover: true,
    fx: ['check_pickup'], legacy: { text: 'Nhận hàng tại bưu cục gửi', lag: 60 },
  },
];

const flowCommonTail = (flow) => [
  {
    id: 'ttkt_hn', gap: 100, stage: 3, status: 'Đang xử lý tại TTKT Hà Nội', title: 'Hàng đến Trung tâm khai thác Hà Nội',
    detail: 'Hàng được phân loại để trung chuyển đi Đà Nẵng.',
    place: 'ttkt_hn', actor: SORTER, travel: 'poA_ttkt_hn',
  },
  {
    id: 'depart_hn', gap: 140, stage: 3, status: 'Đang trung chuyển Hà Nội → Đà Nẵng', title: 'Hàng xuất kho — trung chuyển Hà Nội → Đà Nẵng',
    detail: 'Hàng đã lên xe trung chuyển liên tỉnh.',
    place: 'ttkt_hn', actor: SORTER, major: true, departure: true, handover: true,
    legacy: { text: 'Đang vận chuyển', lag: 90 },
  },
  {
    id: 'arrive_dn', gap: 520, stage: 3, status: 'Đã đến TTKT Đà Nẵng', title: 'Hàng đến Trung tâm khai thác Đà Nẵng',
    detail: 'Xe trung chuyển đã đến, hàng được quét nhập kho.',
    place: 'ttkt_dn', actor: SORTER, travel: 'hn_dn', handover: true,
  },
  {
    id: 'depart_dn', gap: 160, stage: 3, status: 'Đang trung chuyển Đà Nẵng → TP.HCM', title: 'Hàng xuất kho — trung chuyển Đà Nẵng → TP.HCM',
    detail: 'Hàng đã lên xe trung chuyển đi TP.HCM.',
    place: 'ttkt_dn', actor: SORTER, major: true, departure: true, handover: true,
  },
  {
    id: 'arrive_hcm', gap: 560, stage: 3, status: 'Đã đến TTKT TP.HCM', title: 'Hàng đến Trung tâm khai thác TP.HCM',
    detail: 'Hàng được quét nhập kho và phân về bưu cục phát.',
    place: 'ttkt_hcm', actor: SORTER, travel: 'dn_hcm', handover: true,
    ...(flow === 'B'
      ? { delay: { min: 90, reason: 'Mưa lớn trên tuyến Đà Nẵng – TP.HCM, xe trung chuyển chạy chậm hơn dự kiến' } }
      : {}),
  },
  {
    id: 'arrive_pob', gap: 120, stage: 4, status: 'Đã đến bưu cục phát', title: 'Hàng đến Bưu cục Tân Thuận',
    detail: 'Bưu cục phát đã nhận hàng, chuẩn bị giao.',
    place: 'poB', actor: COUNTER, travel: 'hcm_poB', major: true, handover: true,
    legacy: { text: 'Đã đến bưu cục phát', lag: 60 },
  },
  {
    id: 'out_for_delivery', gap: 150, stage: 4, status: 'Đang giao hàng', title: 'Bưu tá đang giao hàng',
    detail: 'Bưu tá Phạm Quốc Bảo xuất phát từ bưu cục. Theo dõi vị trí trên bản đồ chặng cuối.',
    place: 'poB', actor: COURIER, major: true, departure: true, handover: true,
    legacy: { text: 'Đang giao hàng', lag: 45 },
  },
  // Mã nhận hàng CHỈ được gửi khi bưu tá đã đứng đúng địa chỉ người nhận (GPS trùng địa chỉ)
  arrivedRecipientStep(),
  {
    // 30 phút mô phỏng (~1,5 giây ở nhịp chậm) để người xem kịp thấy bước "đã đến nơi, chờ người nhận cung cấp mã"
    id: 'delivered', gap: 30, stage: 4, status: 'Đã giao hàng — đang hoàn tất', title: 'Giao hàng thành công — mã nhận hàng khớp',
    detail: 'Người nhận cung cấp mã nhận hàng, bưu tá nhập vào app và mã khớp. Ảnh giao hàng và chữ ký người nhận được lưu làm bằng chứng.',
    place: 'recipient', actor: COURIER, photo: { kind: 'delivery', signature: 'recipient' },
    major: true, handover: true, fx: ['delivery_confirm'], confirmBy: 'otp',
    legacy: { text: 'Giao hàng thành công', lag: 30 },
  },
  completedStep(),
];

/** Bưu tá đến đúng địa chỉ người nhận (GPS trùng) → hệ thống mới gửi mã nhận hàng. */
function arrivedRecipientStep() {
  return {
    id: 'arrived_recipient', gap: 40, stage: 4, status: 'Bưu tá đã đến — chờ mã nhận hàng', title: 'Bưu tá đã đến địa chỉ người nhận',
    detail: 'GPS của bưu tá trùng địa chỉ người nhận. Hệ thống gửi mã nhận hàng tới điện thoại người nhận.',
    place: 'recipient', actor: COURIER, travel: 'lastmile', fx: ['send_otp'],
  };
}

/**
 * Mốc cuối "đóng vòng": chỉ phát hành khi đã có xác nhận nhận hàng (needs: 'delivery').
 * Nội dung biên nhận ghi đúng CÁCH đã xác thực (detailBy theo deliverySource).
 */
function completedStep(gap = 10) {
  return {
    id: 'completed', gap, stage: 5, status: 'Hoàn tất — người nhận đã nhận hàng', title: 'Hoàn tất — người nhận đã nhận hàng',
    detail: 'Biên nhận giao hàng đã gửi cho cả người gửi và người nhận.',
    detailBy: {
      otp: 'Biên nhận giao hàng (mã nhận hàng đã khớp, ảnh giao hàng, chữ ký người nhận, giờ giao) đã gửi cho cả người gửi và người nhận.',
      recipient: 'Biên nhận giao hàng (người nhận tự xác nhận đã nhận, ảnh giao hàng, chữ ký người nhận, giờ giao) đã gửi cho cả người gửi và người nhận.',
    },
    place: 'recipient', actor: SYSTEM, photo: { kind: 'receipt', delivered: true }, major: true, final: true,
    needs: 'delivery', fx: ['finish'],
  };
}

// Biến thể "giao sai": bưu tá bấm "giao thành công" ở chỗ khác → GPS lệch nên KHÔNG gửi mã, hỏi người nhận.
export const misdeliverStep = () => ({
  id: 'delivered_mismatch', gap: 50, stage: 4, status: 'Bưu tá báo đã giao — chờ người nhận xác nhận',
  title: 'Bưu tá báo “giao thành công” nhưng không ở địa chỉ người nhận',
  detail: 'GPS của bưu tá cách địa chỉ người nhận khoảng 1,3 km nên hệ thống không gửi mã nhận hàng. Hệ thống hỏi lại người nhận.',
  place: 'offsite', actor: COURIER, travel: 'lastmile_wrong', tone: 'warn', fx: ['open_delivery_prompt'],
  // giao diện cũ không có GPS: chỉ ghi tên bưu cục phát, nên không ai thấy điểm bất thường
  legacy: { text: 'Giao hàng thành công', lag: 30, place: 'poB' },
});

/**
 * Giao lại sau khi CSKH xác minh (người nhận báo chưa nhận hoặc không phản hồi):
 * đi lại ĐÚNG trình tự — đến nơi (GPS trùng) → gửi mã mới → khớp mã + ảnh + chữ ký.
 */
export const redeliverSteps = () => [
  {
    id: 'redeliver_arrived', gap: 30, stage: 4, status: 'Bưu tá quay lại — chờ mã nhận hàng', title: 'Bưu tá quay lại, đã đến đúng địa chỉ người nhận',
    detail: 'Sau khi CSKH liên hệ, bưu tá quay lại. GPS trùng địa chỉ người nhận — hệ thống gửi mã nhận hàng mới.',
    place: 'recipient', actor: COURIER, travel: 'offsite_recipient', fx: ['send_otp'],
  },
  {
    id: 'redelivered', gap: 30, stage: 4, status: 'Đã giao lại — đang hoàn tất', title: 'Giao lại thành công — mã nhận hàng khớp',
    detail: 'Người nhận cung cấp mã nhận hàng, bưu tá nhập vào app và mã khớp. Ảnh giao hàng và chữ ký người nhận được lưu.',
    place: 'recipient', actor: COURIER, photo: { kind: 'delivery', signature: 'recipient' },
    major: true, handover: true, fx: ['delivery_confirm'], confirmBy: 'otp',
  },
];

/**
 * Người nhận xác nhận "Đã nhận" dù không có mã → bưu tá vẫn phải TẢI LÊN ảnh + chữ ký đã lấy lúc bàn giao
 * (bưu tá có giao nhưng không cập nhật — đúng vấn đề cần chống) rồi mới "Hoàn tất".
 */
export const deliveryEvidenceStep = () => ({
  id: 'delivery_evidence', gap: 20, stage: 4, status: 'Đã giao — đang hoàn tất', title: 'Bưu tá tải lên muộn ảnh giao hàng và chữ ký người nhận',
  detail: 'Ảnh bàn giao và chữ ký người nhận đã lấy lúc giao nhưng bưu tá chưa cập nhật; nay tải lên để hoàn tất bằng chứng.',
  place: 'offsite', actor: COURIER, photo: { kind: 'delivery', signature: 'recipient' },
  major: true, handover: true, fx: ['delivery_confirm'], confirmBy: 'recipient',
});

/**
 * Người gửi xác nhận "Đã giao" (bưu tá có lấy nhưng không cập nhật) → bưu tá vẫn phải TẢI LÊN
 * ảnh lấy hàng + chữ ký người gửi đã lấy lúc bàn giao — đối xứng với đầu giao hàng.
 */
export const pickupEvidenceStep = () => ({
  id: 'pickup_evidence', gap: 20, stage: 1, status: 'Đã lấy hàng', title: 'Bưu tá tải lên muộn ảnh lấy hàng và chữ ký người gửi',
  detail: 'Ảnh hàng và chữ ký người gửi đã lấy lúc bàn giao nhưng bưu tá chưa cập nhật; nay tải lên để hoàn tất bằng chứng.',
  place: 'sender', actor: SHIPPER, photo: { kind: 'pickup', signature: 'sender' }, handover: true,
});

/**
 * Người gửi báo "Chưa giao" → hàng VẪN Ở NHÀ người gửi: CSKH liên hệ, bưu tá quay lại lấy hàng
 * (GPS trùng địa chỉ → ảnh + chữ ký người gửi), rồi hàng mới vào bưu cục.
 */
export const repickupSteps = () => [
  {
    id: 'repickup_arrived', gap: 40, stage: 1, status: 'Bưu tá quay lại lấy hàng', title: 'Bưu tá quay lại, đã đến địa chỉ người gửi',
    detail: 'Sau khi CSKH liên hệ, bưu tá quay lại. GPS của bưu tá trùng địa chỉ người gửi.',
    place: 'sender', actor: SHIPPER,
  },
  {
    id: 'repickup_photo', gap: 20, stage: 1, status: 'Đã lấy hàng', title: 'Shipper đã lấy hàng — có ảnh và chữ ký người gửi',
    detail: 'Bưu tá chụp ảnh hàng tại địa chỉ người gửi; người gửi ký xác nhận bàn giao trên máy của bưu tá.',
    place: 'sender', actor: SHIPPER, photo: { kind: 'pickup', signature: 'sender' }, handover: true, major: true, fx: ['pickup_confirm'],
  },
];

// ============================================================================
// NHỊP ĐỘ (xem src/config/pacing.js): tốc độ đồng hồ trong KHOẢNG CHỜ TRƯỚC mỗi mốc.
// Mốc không có trong bảng chạy nhịp 'normal'.
// ============================================================================
export const STEP_PACE = {
  // đầu gửi — chậm để xem bưu tá đến nhà, lấy hàng, hộp hỏi xác nhận
  assigned: 'slow',
  arrived: 'slow',
  pickup_photo: 'slow',
  departed_no_photo: 'slow',
  weigh_photo: 'slow',
  weigh_skipped: 'slow',
  pickup_evidence: 'slow',
  repickup_arrived: 'slow',
  repickup_photo: 'slow',
  // trung chuyển liên tỉnh — tua nhanh
  ttkt_hn: 'fast',
  depart_hn: 'fast',
  arrive_dn: 'fast',
  depart_dn: 'fast',
  arrive_hcm: 'fast',
  // chặng cuối — chậm để xem bưu tá chạy trên bản đồ, đến nơi, nhập mã và giao hàng
  arrived_recipient: 'slow',
  delivered: 'slow',
  delivered_mismatch: 'slow',
  redeliver_arrived: 'slow',
  redelivered: 'slow',
  delivery_evidence: 'slow',
  completed: 'slow',
};

/** Dựng danh sách mốc cho một đơn. */
export function buildScript(flow, scenario) {
  const head = flow === 'B' ? flowBHead() : flowAHead();
  let script = head.concat(flowCommonTail(flow));
  if (scenario === 'forgot') script = applyForgot(script);
  if (scenario === 'misdeliver') script = applyMisdeliver(script);
  return script;
}

/** Biến kịch bản bình thường thành kịch bản "bưu tá báo giao nhưng người nhận chưa nhận". */
export function applyMisdeliver(script) {
  return script
    .filter((s) => s.id !== 'delivered') // không có bàn giao bằng mã ở chỗ lệch
    .map((s) => {
      if (s.id === 'arrived_recipient') return misdeliverStep();
      // cho người dùng vài giây trả lời (khi bấm "Để sau") trước khi khóa bước ở đầu nhận kích hoạt
      if (s.id === 'completed') return completedStep(150);
      return s;
    });
}

/** Mốc "đến nơi" + "giao thành công" của kịch bản bình thường (dùng khi bảng điều khiển tua "Giao thành công"). */
export function normalDeliverySteps() {
  return flowCommonTail('A').filter((s) => s.id === 'arrived_recipient' || s.id === 'delivered');
}

// Biến thể luồng B: quầy nhận hàng nhưng bỏ qua bước cân + chụp ảnh.
const counterSkippedStep = () => ({
  id: 'weigh_skipped', tag: 'pickup', gap: 40, stage: 1, status: 'Quầy đã nhận hàng', title: 'Quầy nhận hàng nhưng chưa có ảnh cân hàng và chữ ký',
  detail: 'Nhân viên quầy chưa cân, chụp ảnh hàng và lấy chữ ký người gửi — thiếu bằng chứng bàn giao tại quầy.',
  place: 'poA', actor: COUNTER, tone: 'warn',
});

/** Biến một kịch bản bình thường thành kịch bản quên xác nhận (luồng A: shipper; luồng B: quầy). */
export function applyForgot(script) {
  return script.map((s) => {
    if (s.id === 'weigh_photo') return counterSkippedStep();
    // thiếu ảnh cân thì không phát hành biên nhận — chỉ quét nhập kho (và bị khóa bước)
    if (s.id === 'e_receipt') {
      return { ...s, id: 'hub_in_b', title: 'Hàng đã nhập Bưu cục Cầu Giấy', detail: 'Nhân viên quét nhập kho.', photo: { kind: 'hub_in' } };
    }
    if (s.id === 'pickup_photo') return forgotPickupStep();
    // Cho người gửi vài giây để phản hồi trước khi bưu cục quét nhập; và giao diện cũ không báo mốc này (khoảng mù).
    if (s.id === 'hub_in_a') return { ...s, gap: 150, legacy: null };
    return s;
  });
}
