// Quyết định thông báo nào của engine được bật thành TOAST (giao diện mới).
// Mọi thông báo vẫn nằm đầy đủ trong chuông; toast chỉ dành cho việc đáng chú ý để người xem kịp đọc.
//   'show'     — bật toast riêng
//   'reminder' — chỉ bật khi đã lâu không có toast nào (đúng ý "báo khi lâu không có mốc mới"),
//                dùng chung một ô, cập nhật tại chỗ
//   'skip'     — chỉ vào chuông (mốc nhỏ: đến / xuất kho trung chuyển…)
// Mã nhận hàng (otp) bật toast: nó báo đúng khoảnh khắc bưu tá đã đứng ở địa chỉ người nhận.
export function toastPolicy(n) {
  if (n.kind === 'reminder') return 'reminder';
  if (n.kind === 'event') return n.major ? 'show' : 'skip';
  return 'show'; // confirm, warning, alert, cskh, delay, otp
}
