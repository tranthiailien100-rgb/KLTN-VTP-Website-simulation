// Gửi kết quả đánh giá vào Google Sheet qua Google Apps Script Web App.
// URL đặt trong biến môi trường VITE_APPS_SCRIPT_URL (xem README).
const URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const LOCAL_KEY = 'vtp-demo-results-local';

export const hasSheetEndpoint = Boolean(URL);

/**
 * Apps Script Web App không trả header CORS cho request từ domain khác, nên dùng
 * `mode: 'no-cors'` + Content-Type text/plain (request "đơn giản", không cần preflight).
 * Hệ quả: không đọc được phản hồi; chỉ biết request đã được gửi đi hay chưa.
 */
export async function submitResult(payload) {
  if (!URL) {
    // Chưa cấu hình: lưu tạm trong trình duyệt để không mất dữ liệu khi thử nghiệm.
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      list.push(payload);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    } catch {
      /* bỏ qua */
    }
    console.warn('[demo] Chưa đặt VITE_APPS_SCRIPT_URL — kết quả chỉ lưu tạm trong localStorage:', payload);
    return { ok: true, local: true };
  }

  await fetch(URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return { ok: true, local: false };
}
