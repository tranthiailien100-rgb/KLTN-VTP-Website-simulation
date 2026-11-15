import { useEffect, useRef } from 'react';
import { useSim } from '../../state/SimContext.jsx';
import { useToast } from '../../state/ToastContext.jsx';
import { fmtDateTime } from '../../sim/format.js';
import { toastPolicy } from '../../sim/toastPolicy.js';
import { describe } from '../../sim/engine.js';
import { TOAST } from '../../config/pacing.js';

/**
 * Biến thông báo mới của engine thành toast ở góc màn hình (chỉ ở chế độ tracking mới).
 * Không phải thông báo nào cũng bật toast — xem sim/toastPolicy.js; chuông vẫn giữ đủ.
 *
 * Nhắc định kỳ: đồng hồ demo chạy rất nhanh nên lời nhắc hay rơi ngay sau một mốc vừa báo.
 * Lời nhắc khi đó được GIỮ CHỜ; khi đã yên TOAST.reminderQuietMs mà chưa có toast nào khác,
 * bật một toast nhắc với vị trí MỚI NHẤT của đơn (tính lại lúc bật, không dùng nội dung cũ).
 * Có mốc mới được báo thì bỏ lời nhắc đang chờ (vị trí trong đó đã cũ).
 */
export function NotificationBridge({ active: activeProp }) {
  const active = activeProp && TOAST.enabled; // TOAST.enabled = false → không bật toast nào (chuông vẫn đủ)
  const { state, runKey } = useSim();
  const { pushNotif } = useToast();
  // số thông báo đã xử lý của TỪNG bản mô phỏng (mỗi đơn một bản) → quay lại đơn cũ không bắn lại toast cũ
  const seen = useRef({});
  const lastToast = useRef(0); // thời điểm (thực) bật toast gần nhất
  const pending = useRef(null); // lời nhắc đang chờ khoảng lặng: { runKey, channel }
  const stateRef = useRef(state);
  stateRef.current = state;
  const count = state ? state.notifications.length : 0;

  useEffect(() => {
    if (!state) return;
    const done = seen.current[runKey] || 0;
    const fresh = state.notifications.slice(done);
    seen.current[runKey] = state.notifications.length;
    if (!active) return;
    fresh.forEach((n) => {
      const policy = toastPolicy(n);
      if (policy === 'skip') return; // chỉ vào chuông
      const now = Date.now();
      if (policy === 'reminder' && now - lastToast.current < TOAST.reminderQuietMs) {
        pending.current = { runKey, channel: n.channel }; // chờ khoảng lặng
        return;
      }
      lastToast.current = now;
      if (policy === 'show') pending.current = null; // mốc mới → lời nhắc đang chờ đã cũ
      pushNotif({
        id: `${runKey}-${n.id}`,
        slot: policy === 'reminder' ? 'reminder' : undefined,
        kind: n.kind,
        title: n.title,
        body: n.body,
        channel: n.channel,
        timeLabel: fmtDateTime(state.startMs, n.t),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, runKey, active]);

  // Đủ khoảng lặng → bật lời nhắc đang chờ với vị trí hiện tại của đơn
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      const p = pending.current;
      const st = stateRef.current;
      if (!p || !st || st.finished || p.runKey !== st.runId || st.freq === 'status') return;
      const now = Date.now();
      if (now - lastToast.current < TOAST.reminderQuietMs) return;
      pending.current = null;
      lastToast.current = now;
      pushNotif({
        id: `${st.runId}-reminder-${now}`,
        slot: 'reminder',
        kind: 'reminder',
        title: 'Cập nhật vị trí đơn hàng',
        body: describe(st).sentence,
        channel: p.channel,
        timeLabel: fmtDateTime(st.startMs, st.t),
      });
    }, 300);
    return () => clearInterval(id);
  }, [active, pushNotif]);

  // Đổi đơn → bỏ lời nhắc của đơn cũ
  useEffect(() => {
    pending.current = null;
  }, [runKey]);

  return null;
}
