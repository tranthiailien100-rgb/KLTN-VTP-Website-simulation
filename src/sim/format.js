// Định dạng thời gian mô phỏng. Đồng hồ mô phỏng đo bằng "phút kể từ lúc tạo đơn".
const pad = (n) => String(n).padStart(2, '0');

/** Mốc bắt đầu mô phỏng: 07:30 sáng hôm nay (giờ máy người dùng). */
export function makeSimStart() {
  const d = new Date();
  d.setHours(7, 30, 0, 0);
  return d.getTime();
}

export function simDate(startMs, minutes) {
  return new Date(startMs + minutes * 60000);
}

export function fmtClock(startMs, minutes) {
  const d = simDate(startMs, minutes);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDay(startMs, minutes) {
  const d = simDate(startMs, minutes);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function fmtDateTime(startMs, minutes) {
  return `${fmtClock(startMs, minutes)} ${fmtDay(startMs, minutes)}`;
}

/** "2 giờ 30 phút" */
export function fmtDuration(minutes) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h} giờ ${r} phút`;
  if (h) return `${h} giờ`;
  return `${r} phút`;
}

export function fmtDistance(meters) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function fmtCoord(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
