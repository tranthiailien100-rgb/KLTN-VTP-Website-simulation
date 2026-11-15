// Hàm hình học dùng cho bản đồ & mô phỏng di chuyển.
const R = 6371000; // bán kính Trái Đất (m)
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function segmentLengths(points) {
  const lens = [];
  for (let i = 1; i < points.length; i++) lens.push(haversine(points[i - 1], points[i]));
  return lens;
}

export function pathLength(points) {
  return segmentLengths(points).reduce((a, b) => a + b, 0);
}

/** Điểm nằm tại tỉ lệ f (0..1) dọc đường gấp khúc. */
export function pointAlong(points, f) {
  const lens = segmentLengths(points);
  const total = lens.reduce((a, b) => a + b, 0);
  const target = Math.max(0, Math.min(1, f)) * total;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target || i === lens.length - 1) {
      const local = lens[i] === 0 ? 0 : (target - acc) / lens[i];
      const a = points[i];
      const b = points[i + 1];
      return {
        lat: a.lat + (b.lat - a.lat) * local,
        lng: a.lng + (b.lng - a.lng) * local,
        segment: i,
        distance: target,
        total,
      };
    }
    acc += lens[i];
  }
  const last = points[points.length - 1];
  return { lat: last.lat, lng: last.lng, segment: lens.length - 1, distance: total, total };
}

/** Tách đường đi thành phần đã qua và phần còn lại tại tỉ lệ f. */
export function splitAlong(points, f) {
  const p = pointAlong(points, f);
  const done = points.slice(0, p.segment + 1).concat([{ lat: p.lat, lng: p.lng }]);
  const rest = [{ lat: p.lat, lng: p.lng }].concat(points.slice(p.segment + 1));
  return { done, rest, point: p };
}

/** Tên mốc có tên gần nhất (dùng cho "hiện ở gần ..."). */
export function nearestNamed(points, pos) {
  let best = null;
  for (const pt of points) {
    if (!pt.name) continue;
    const d = haversine(pt, pos);
    if (!best || d < best.d) best = { name: pt.name, d };
  }
  return best ? best.name : null;
}
